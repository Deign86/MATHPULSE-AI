"""Regression guards for the lesson pipeline in routes/rag_routes.py (contracts C1 and C4).

Edge cases on top of test_rag_lesson_stream.py: the recorded SSE contract fixture shared with the frontend,
per-student cache isolation on every route (stream, prefetch, forceRefresh), prefetch never blocking
interactive lessons, and the one-repair / one-fallback limits of the foolproof lesson path.
"""
from __future__ import annotations

import asyncio
import json
import os
import threading
import time
from pathlib import Path
from types import SimpleNamespace
from typing import Callable, Dict, List, Optional, Tuple

import httpx
import pytest
from fastapi import FastAPI, Request

os.environ.setdefault("DEEPSEEK_API_KEY", "mock-key-for-testing")

from routes import rag_routes  # noqa: E402

REASONER = "deepseek-v4-pro"
REAL_STREAM_REASONER_LESSON = rag_routes._stream_reasoner_lesson
SSE_FIXTURE = Path(__file__).resolve().parents[2] / "src" / "services" / "__tests__" / "fixtures" / "ragLessonStream.sse"
CHUNKS = [
    {
        "content": "A rational function is a quotient of two polynomial functions.",
        "source_file": "SHS_GM_Q1.pdf",
        "score": 0.95,
        "content_domain": "general",
    }
]
PAYLOAD = {
    "topic": "Rational Functions",
    "subject": "General Mathematics",
    "quarter": 1,
    "lessonTitle": "Introduction to Rational Functions",
    "lessonId": "gm-q1-rational",
}
VIDEOS = [{"videoId": "abc123", "title": "Rational Functions", "channelTitle": "Math PH", "thumbnailUrl": "t.jpg"}]


def _padded(text: str, length: int) -> str:
    return (text + " ") * (length // (len(text) + 1) + 1)


def _rich_lesson(marker: str) -> Dict[str, object]:
    return {
        "sections": [
            {"type": "introduction", "title": "Introduction", "content": _padded(f"{marker} introduction.", 420)},
            {
                "type": "key_concepts",
                "title": "Key Concepts",
                "content": _padded(f"{marker} concepts $f(x)=\\frac{{p(x)}}{{q(x)}}$.", 620),
                "callouts": [{"type": "warning", "text": "q(x) cannot be zero."}],
            },
            {"type": "video", "title": "Video Lesson", "content": "Watch the video."},
            {
                "type": "worked_examples",
                "title": "Worked Examples",
                "examples": [
                    {"problem": f"{marker} example {i}.", "steps": ["Step 1: a", "Step 2: b", "Step 3: c"], "answer": "x = 2"}
                    for i in range(3)
                ],
            },
            {"type": "important_notes", "title": "Important Notes", "bulletPoints": [f"{marker} note {i}." for i in range(4)]},
            {
                "type": "try_it_yourself",
                "title": "Try It Yourself",
                "practiceProblems": [{"question": f"{marker} practice {i}.", "solution": "Solve step by step."} for i in range(5)],
            },
            {"type": "summary", "title": "Summary", "content": _padded(f"{marker} summary.", 260)},
        ]
    }


def _intro(lesson: Dict[str, object]) -> str:
    return str(lesson["sections"][0]["content"])


class LessonSeams:
    """Doubles for every external seam of the lesson pipeline; records calls."""

    def __init__(self) -> None:
        self.stream_calls = 0
        self.stream_delay = 0.0
        self.stream_outputs: List[str] = []
        self.repair_output = json.dumps(_rich_lesson("Repaired"))
        self.inference_requests: List[SimpleNamespace] = []
        self.verification: Dict[str, object] = {"verified": True, "pCorrect": 0.95}
        self.chunks = CHUNKS
        self.store: Dict[Tuple[str, str], Dict[str, object]] = {}
        self.reads: List[Tuple[str, str]] = []
        self.writes: List[Tuple[str, str]] = []

    def retrieve(self, **_kwargs: object) -> Tuple[List[Dict[str, object]], str]:
        return self.chunks, "exact_file"

    def stream(self, _messages: object, model: str, report_progress: Callable[[str, int], None], _stop: object) -> str:
        assert model == REASONER
        self.stream_calls += 1
        report_progress("thinking", 120)
        time.sleep(self.stream_delay)
        report_progress("writing", 480)
        if self.stream_outputs:
            return self.stream_outputs[min(self.stream_calls, len(self.stream_outputs)) - 1]
        return json.dumps(_rich_lesson(f"Generated{self.stream_calls}"))

    async def verify(self, reference_text: str, generated_text: str) -> Dict[str, object]:
        return self.verification

    def inference_client(self) -> SimpleNamespace:
        def generate_from_messages(request: SimpleNamespace) -> str:
            self.inference_requests.append(request)
            if request.max_new_tokens == 8192:
                return self.repair_output
            return json.dumps(_rich_lesson("Fallback"))

        return SimpleNamespace(generate_from_messages=generate_from_messages)

    def read_lesson(self, uid: str, key: str) -> Optional[Dict[str, object]]:
        self.reads.append((uid, key))
        return self.store.get((uid, key))

    def write_lesson(self, uid: str, key: str, _payload: object, lesson: Dict[str, object], _profile: str) -> None:
        self.writes.append((uid, key))
        self.store[(uid, key)] = lesson


def _clear_lesson_state() -> None:
    for state in (rag_routes._lesson_memory, rag_routes._retrieval_memory, rag_routes._lesson_jobs, rag_routes._prefetch_uids):
        state.clear()


@pytest.fixture
def seams(monkeypatch: pytest.MonkeyPatch) -> LessonSeams:
    fake = LessonSeams()
    _clear_lesson_state()
    monkeypatch.setattr(rag_routes, "_prefetch_semaphore", asyncio.Semaphore(2))
    monkeypatch.setattr(rag_routes, "retrieve_lesson_pdf_context", fake.retrieve)
    monkeypatch.setattr(rag_routes, "_stream_reasoner_lesson", fake.stream)
    monkeypatch.setattr(rag_routes, "verify_lesson_factuality", fake.verify)
    monkeypatch.setattr(rag_routes, "_fetch_youtube_videos", lambda *_a, **_k: VIDEOS)
    monkeypatch.setattr(rag_routes, "_log_rag_usage", lambda *_a, **_k: None)
    monkeypatch.setattr(rag_routes, "_lesson_primary_model", lambda: REASONER)
    monkeypatch.setattr(rag_routes, "_get_inference_client", fake.inference_client)
    monkeypatch.setattr(rag_routes, "_read_student_lesson", fake.read_lesson)
    monkeypatch.setattr(rag_routes, "_write_student_lesson", fake.write_lesson)
    monkeypatch.setattr(rag_routes, "_load_learner_profile", lambda _uid, _payload: "Weak topics: Functions")
    # Keyword-capturing stand-in so fallback/repair request fields can be asserted.
    monkeypatch.setattr(rag_routes, "InferenceRequest", SimpleNamespace)
    yield fake
    _clear_lesson_state()


def _router_app() -> FastAPI:
    """rag_routes under a stand-in for main.py AuthMiddleware: X-Test-Uid becomes request.state.user."""
    app = FastAPI()

    @app.middleware("http")
    async def fake_auth(request: Request, call_next: Callable) -> object:
        uid = request.headers.get("X-Test-Uid")
        request.state.user = SimpleNamespace(uid=uid, role="student") if uid else None
        return await call_next(request)

    app.include_router(rag_routes.router)
    return app


def _as(uid: str) -> Dict[str, str]:
    return {"X-Test-Uid": uid}


def _lesson_key(**overrides: object) -> str:
    return rag_routes._lesson_cache_key(rag_routes.RagLessonRequest(**{**PAYLOAD, **overrides}))


def parse_sse(body: str) -> List[Tuple[str, object]]:
    """[(event, data)] in order; comment lines become ("comment", text)."""
    events: List[Tuple[str, object]] = []
    for block in body.replace("\r\n", "\n").split("\n\n"):
        if not block.strip():
            continue
        event, data_lines = "message", []
        for line in block.split("\n"):
            if line.startswith(":"):
                events.append(("comment", line[1:].strip()))
            elif line.startswith("event:"):
                event = line[len("event:"):].strip()
            elif line.startswith("data:"):
                data_lines.append(line[len("data:"):].strip())
        if data_lines:
            events.append((event, json.loads("\n".join(data_lines))))
    return events


async def _in_app(scenario: Callable[[httpx.AsyncClient], "asyncio.Future"]) -> object:
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=_router_app()), base_url="http://test", timeout=10) as http:
        return await scenario(http)


def _run(scenario: Callable[[httpx.AsyncClient], "asyncio.Future"]) -> object:
    return asyncio.run(_in_app(scenario))


async def _settle(seams: LessonSeams, writes: int) -> None:
    """Firestore writes are fire-and-forget after the response; give them a moment to land."""
    deadline = time.monotonic() + 3
    while len(seams.writes) < writes and time.monotonic() < deadline:
        await asyncio.sleep(0.01)
    await asyncio.sleep(0.05)


# ─── 10. Contract C1: recorded stream fixture shared with the frontend ───────────────────────────


def test_contract_c1_stream_matches_shared_fixture(seams: LessonSeams) -> None:
    fixture_events = parse_sse(SSE_FIXTURE.read_text(encoding="utf-8"))

    async def scenario(http: httpx.AsyncClient) -> httpx.Response:
        return await http.post("/api/rag/lesson/stream", json=PAYLOAD, headers=_as("alice"))

    response = _run(scenario)
    live_events = parse_sse(response.text)

    assert response.headers["content-type"].startswith("text/event-stream")
    assert [name for name, _ in live_events if name != "comment"] == [name for name, _ in fixture_events]
    assert [frame for name, frame in live_events if name == "stage"] == [frame for name, frame in fixture_events if name == "stage"]
    live_lesson, fixture_lesson = live_events[-1][1], fixture_events[-1][1]
    assert sorted(live_lesson) == sorted(fixture_lesson), "lesson payload keys drifted from the frontend fixture"
    assert [s["type"] for s in live_lesson["sections"]] == [s["type"] for s in fixture_lesson["sections"]]
    assert sorted(live_lesson["sections"][2]) == sorted(fixture_lesson["sections"][2]), "video section keys drifted"


# ─── 11. Per-student isolation ───────────────────────────────────────────────────────────────────


def test_isolation_cache_key_ignores_user_id_and_force_refresh() -> None:
    assert _lesson_key(userId="someone-else", forceRefresh=True) == _lesson_key()
    assert _lesson_key(lessonId="another-lesson") != _lesson_key()


def test_isolation_stream_never_serves_another_students_memory_cache(seams: LessonSeams) -> None:
    async def scenario(http: httpx.AsyncClient) -> Tuple[Dict[str, object], List[Tuple[str, object]]]:
        alice = (await http.post("/api/rag/lesson", json=PAYLOAD, headers=_as("alice"))).json()
        bob = await http.post("/api/rag/lesson/stream", json={**PAYLOAD, "userId": "alice"}, headers=_as("bob"))
        return alice, parse_sse(bob.text)

    alice, bob_events = _run(scenario)

    assert ("stage", {"stage": "cached"}) not in bob_events
    assert bob_events[0] == ("stage", {"stage": "retrieving"})
    assert _intro(bob_events[-1][1]).startswith("Generated2")
    assert _intro(alice).startswith("Generated1")


def test_isolation_firestore_layer_reads_only_the_callers_doc(seams: LessonSeams) -> None:
    seams.store[("alice", _lesson_key())] = {**_rich_lesson("AliceStored"), "activeModel": REASONER}

    async def scenario(http: httpx.AsyncClient) -> List[Tuple[str, object]]:
        response = await http.post("/api/rag/lesson/stream", json={**PAYLOAD, "userId": "alice"}, headers=_as("bob"))
        return parse_sse(response.text)

    bob_events = _run(scenario)

    assert "AliceStored" not in json.dumps(bob_events)
    assert seams.stream_calls == 1
    assert {uid for uid, _ in seams.reads} == {"bob"}


def test_isolation_prefetch_user_id_cannot_select_another_students_cache(seams: LessonSeams) -> None:
    async def scenario(http: httpx.AsyncClient) -> Dict[str, object]:
        await http.post("/api/rag/lesson", json=PAYLOAD, headers=_as("alice"))
        mallory = await http.post("/api/rag/lesson/prefetch", json={**PAYLOAD, "userId": "alice"}, headers=_as("mallory"))
        await _settle(seams, 2)
        return mallory.json()

    assert _run(scenario) == {"status": "queued"}
    assert seams.stream_calls == 2
    assert ("mallory", _lesson_key()) in seams.store


def test_isolation_student_force_refresh_rewrites_only_own_doc(seams: LessonSeams) -> None:
    async def scenario(http: httpx.AsyncClient) -> List[Tuple[str, object]]:
        await http.post("/api/rag/lesson", json=PAYLOAD, headers=_as("alice"))
        await http.post("/api/rag/lesson", json=PAYLOAD, headers=_as("bob"))
        await _settle(seams, 2)
        refreshed = await http.post(
            "/api/rag/lesson/stream", json={**PAYLOAD, "forceRefresh": True, "userId": "bob"}, headers=_as("alice")
        )
        await _settle(seams, 3)
        return parse_sse(refreshed.text)

    bob_before = None

    def snapshot_bob() -> None:
        nonlocal bob_before
        bob_before = json.dumps(seams.store.get(("bob", _lesson_key())))

    events = _run(scenario)
    snapshot_bob()

    assert seams.writes == [("alice", _lesson_key()), ("bob", _lesson_key()), ("alice", _lesson_key())]
    assert _intro(events[-1][1]).startswith("Generated3")
    assert "Generated2" in str(bob_before), "bob's stored lesson was overwritten by alice's forceRefresh"


def test_isolation_stream_never_persists_grounded_defaults(seams: LessonSeams) -> None:
    seams.verification = {"verified": False, "pCorrect": 0.1}

    async def scenario(http: httpx.AsyncClient) -> List[Tuple[str, object]]:
        response = await http.post("/api/rag/lesson/stream", json=PAYLOAD, headers=_as("alice"))
        await _settle(seams, 1)
        return parse_sse(response.text)

    events = _run(scenario)

    assert events[-1][0] == "lesson"
    assert seams.writes == []
    assert rag_routes._lesson_memory == {}


def test_isolation_stream_errors_are_never_persisted(seams: LessonSeams) -> None:
    seams.chunks = []

    async def scenario(http: httpx.AsyncClient) -> List[Tuple[str, object]]:
        response = await http.post("/api/rag/lesson/stream", json=PAYLOAD, headers=_as("alice"))
        await _settle(seams, 1)
        return parse_sse(response.text)

    events = _run(scenario)

    assert events[-1][0] == "error"
    assert seams.writes == []
    assert rag_routes._lesson_memory == {}


def test_isolation_prompt_version_bump_misses_memory_and_firestore(seams: LessonSeams, monkeypatch: pytest.MonkeyPatch) -> None:
    async def first(http: httpx.AsyncClient) -> None:
        await http.post("/api/rag/lesson", json=PAYLOAD, headers=_as("alice"))
        await _settle(seams, 1)

    _run(first)
    old_key = _lesson_key()
    monkeypatch.setattr(rag_routes, "LESSON_PROMPT_VERSION", "regression-next")

    async def second(http: httpx.AsyncClient) -> Dict[str, object]:
        response = await http.post("/api/rag/lesson", json=PAYLOAD, headers=_as("alice"))
        await _settle(seams, 2)
        return response.json()

    lesson = _run(second)

    assert seams.stream_calls == 2, "a stale-prompt lesson was served after LESSON_PROMPT_VERSION changed"
    assert _intro(lesson).startswith("Generated2")
    assert seams.writes == [("alice", old_key), ("alice", _lesson_key())]
    assert old_key != _lesson_key()


# ─── 12. Prefetch guards ─────────────────────────────────────────────────────────────────────────


def test_prefetch_then_plain_post_generates_once(seams: LessonSeams) -> None:
    seams.stream_delay = 0.3

    async def scenario(http: httpx.AsyncClient) -> Tuple[Dict[str, object], Dict[str, object]]:
        queued = await http.post("/api/rag/lesson/prefetch", json=PAYLOAD, headers=_as("alice"))
        lesson = await http.post("/api/rag/lesson", json=PAYLOAD, headers=_as("alice"))
        await _settle(seams, 1)
        return queued.json(), lesson.json()

    queued, lesson = _run(scenario)

    assert queued == {"status": "queued"}
    assert seams.stream_calls == 1
    assert len(seams.writes) == 1
    assert lesson == seams.store[("alice", _lesson_key())]


def test_prefetch_slots_held_never_block_interactive_lessons(seams: LessonSeams) -> None:
    async def scenario(http: httpx.AsyncClient) -> Tuple[Dict[str, object], int, str]:
        semaphore = rag_routes._prefetch_semaphore
        await semaphore.acquire()
        await semaphore.acquire()
        try:
            prefetch = await asyncio.wait_for(
                http.post("/api/rag/lesson/prefetch", json=PAYLOAD, headers=_as("carol")), timeout=2
            )
            plain = await asyncio.wait_for(http.post("/api/rag/lesson", json=PAYLOAD, headers=_as("carol")), timeout=5)
            streamed = await asyncio.wait_for(
                http.post("/api/rag/lesson/stream", json={**PAYLOAD, "forceRefresh": True}, headers=_as("carol")), timeout=5
            )
            return prefetch.json(), plain.status_code, parse_sse(streamed.text)[-1][0]
        finally:
            semaphore.release()
            semaphore.release()

    prefetch, plain_status, last_stream_event = _run(scenario)

    assert prefetch == {"status": "skipped"}
    assert plain_status == 200
    assert last_stream_event == "lesson"


def test_prefetch_concurrent_burst_never_queues_interactive_behind_the_semaphore(seams: LessonSeams, monkeypatch: pytest.MonkeyPatch) -> None:
    """A prefetch accepted while the last slot is being taken must not leave a job waiting on the semaphore,
    because an interactive open of that lesson joins the job and would wait behind other students' prefetches."""
    monkeypatch.setattr(rag_routes, "_prefetch_semaphore", asyncio.Semaphore(1))
    seams.stream_delay = 0.8

    async def scenario(http: httpx.AsyncClient) -> Tuple[List[Dict[str, object]], float, int]:
        burst = await asyncio.gather(
            *(http.post("/api/rag/lesson/prefetch", json=PAYLOAD, headers=_as(uid)) for uid in ("alice", "bob"))
        )
        started = time.perf_counter()
        bob_open = await http.post("/api/rag/lesson", json=PAYLOAD, headers=_as("bob"))
        elapsed = time.perf_counter() - started
        await asyncio.sleep(0.9)
        return [r.json() for r in burst], elapsed, bob_open.status_code

    statuses, bob_open_seconds, bob_status = _run(scenario)

    assert bob_status == 200
    assert sorted(s["status"] for s in statuses) == ["queued", "skipped"], statuses
    assert bob_open_seconds < 1.4, (
        f"bob's interactive lesson waited {bob_open_seconds:.2f}s behind alice's prefetch slot (statuses={statuses})"
    )


# ─── 13. Foolproof lesson guards ─────────────────────────────────────────────────────────────────


def test_foolproof_non_json_twice_runs_exactly_one_repair(seams: LessonSeams) -> None:
    seams.stream_outputs = ["Here is your lesson in prose."]
    seams.repair_output = "Still prose, sorry."

    async def scenario(http: httpx.AsyncClient) -> Dict[str, object]:
        response = await http.post("/api/rag/lesson", json=PAYLOAD, headers=_as("alice"))
        await _settle(seams, 1)
        return response.json()

    lesson = _run(scenario)

    assert len(seams.inference_requests) == 1, "repair must run exactly once, never loop"
    assert seams.inference_requests[0].max_new_tokens == 8192
    assert lesson["needsReview"] is True
    assert seams.writes == [] and rag_routes._lesson_memory == {}


def _thin(mutate: Callable[[Dict[str, Dict[str, object]]], None]) -> str:
    lesson = _rich_lesson("Thin")
    mutate({section["type"]: section for section in lesson["sections"]})
    return json.dumps(lesson)


THIN_VARIANTS = {
    "two_worked_examples": lambda s: s["worked_examples"]["examples"].pop(),
    "four_practice_problems": lambda s: s["try_it_yourself"]["practiceProblems"].pop(),
    "three_notes": lambda s: s["important_notes"]["bulletPoints"].pop(),
    "example_with_two_steps": lambda s: s["worked_examples"]["examples"][0]["steps"].pop(),
    "short_introduction": lambda s: s["introduction"].update(content="Too short."),
    "short_summary": lambda s: s["summary"].update(content="Too short."),
}


@pytest.mark.parametrize("variant", sorted(THIN_VARIANTS))
def test_foolproof_lesson_below_minimums_is_never_cached(seams: LessonSeams, variant: str) -> None:
    thin_output = _thin(THIN_VARIANTS[variant])
    assert rag_routes._lesson_deficits(json.loads(thin_output)), f"{variant} should violate a lesson minimum"
    seams.stream_outputs = [thin_output]
    seams.repair_output = thin_output

    async def scenario(http: httpx.AsyncClient) -> Dict[str, object]:
        response = await http.post("/api/rag/lesson", json=PAYLOAD, headers=_as("alice"))
        await _settle(seams, 1)
        return response.json()

    lesson = _run(scenario)

    assert len(seams.inference_requests) == 1
    assert "Thin" not in json.dumps(lesson["sections"])
    assert seams.writes == [] and rag_routes._lesson_memory == {}


class _TruncatingDeepSeek:
    """Streams a reasoner answer that stops at max_tokens mid-JSON."""

    def __init__(self) -> None:
        self.create_calls = 0
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self.create))

    def with_options(self, **_options: object) -> "_TruncatingDeepSeek":
        return self

    def create(self, **_kwargs: object) -> List[SimpleNamespace]:
        self.create_calls += 1
        delta = SimpleNamespace(content='{"sections": [{"type": "introduction", "content": "cut', reasoning_content=None)
        return [SimpleNamespace(choices=[SimpleNamespace(delta=delta, finish_reason="length")])]


def test_foolproof_truncated_reasoner_stream_falls_back_to_chat_exactly_once(
    seams: LessonSeams, monkeypatch: pytest.MonkeyPatch
) -> None:
    deepseek = _TruncatingDeepSeek()
    monkeypatch.setattr(rag_routes, "_stream_reasoner_lesson", REAL_STREAM_REASONER_LESSON)
    monkeypatch.setattr(rag_routes, "get_deepseek_client", lambda: deepseek)

    async def scenario(http: httpx.AsyncClient) -> Dict[str, object]:
        response = await http.post("/api/rag/lesson", json=PAYLOAD, headers=_as("alice"))
        await _settle(seams, 1)
        return response.json()

    lesson = _run(scenario)

    assert deepseek.create_calls == 1, "the truncated reasoner stream was retried"
    assert [request.model for request in seams.inference_requests] == [rag_routes.CHAT_MODEL]
    assert lesson["activeModel"] == rag_routes.CHAT_MODEL
    assert seams.writes == [], "a chat fallback must not be persisted as the student's lesson"


# ─── 2b. Config guard: lessons resolve to the reasoner with no env/profile configured ────────────

_MODEL_ENV_KEYS = ("MODEL_PROFILE", "HF_RAG_MODEL_ID", "INFERENCE_MODEL_ID", "INFERENCE_ENFORCE_LOCK_MODEL")


@pytest.fixture
def bare_model_env(monkeypatch: pytest.MonkeyPatch) -> None:
    """No model env, no runtime profile/overrides, and a freshly built inference client."""
    from services import inference_client as inference_module

    for env_key in _MODEL_ENV_KEYS:
        monkeypatch.delenv(env_key, raising=False)
    monkeypatch.setattr(inference_module, "_RUNTIME_OVERRIDES", {})
    monkeypatch.setattr(inference_module, "_RUNTIME_PROFILE", None)
    monkeypatch.setattr(rag_routes, "_inference_client", None)
    yield
    rag_routes._inference_client = None


def test_config_guard_lesson_primary_model_is_reasoner_without_env(bare_model_env: None) -> None:
    assert rag_routes._lesson_primary_model() == REASONER, (
        "rag_lesson must use full reasoner depth even when no MODEL_PROFILE/HF_RAG_MODEL_ID is set"
    )


def test_config_guard_prod_profile_routes_lessons_to_the_rag_model(
    bare_model_env: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    """The HF Space runs MODEL_PROFILE=prod, which exports INFERENCE_MODEL_ID=deepseek-flash (overriding every
    task in the inference client's map) and HF_RAG_MODEL_ID=deepseek-v4-pro. Lessons must follow the RAG model."""
    monkeypatch.setenv("INFERENCE_MODEL_ID", rag_routes.CHAT_MODEL)
    monkeypatch.setenv("HF_RAG_MODEL_ID", REASONER)
    assert rag_routes._lesson_primary_model() == REASONER


def test_config_guard_admin_rag_override_is_honored(bare_model_env: None, monkeypatch: pytest.MonkeyPatch) -> None:
    from services import inference_client as inference_module

    monkeypatch.setattr(inference_module, "_RUNTIME_OVERRIDES", {"HF_RAG_MODEL_ID": rag_routes.CHAT_MODEL})
    assert rag_routes._lesson_primary_model() == rag_routes.CHAT_MODEL


def test_config_guard_lesson_generation_streams_from_the_resolved_reasoner(
    bare_model_env: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    streamed_models: List[str] = []

    def capture_stream(_messages: object, model: str, _report: Callable[[str, int], None], _stop: object) -> str:
        streamed_models.append(model)
        return json.dumps(_rich_lesson("Reasoned"))

    monkeypatch.setattr(rag_routes, "_stream_reasoner_lesson", capture_stream)
    text, used_model = asyncio.run(rag_routes._generate_lesson_text("prompt", lambda _event, _frame: None))

    assert streamed_models == [REASONER]
    assert used_model == REASONER
    assert "Reasoned" in text
