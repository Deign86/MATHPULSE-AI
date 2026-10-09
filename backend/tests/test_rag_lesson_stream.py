"""Lesson pipeline: per-student cache (memory + Firestore), in-flight dedupe, concurrent video lookup,
SSE stream, reasoner fallback, richness validation + repair, learner profile, prefetch."""
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
from fastapi.testclient import TestClient

os.environ.setdefault("DEEPSEEK_API_KEY", "mock-key-for-testing")

from routes import rag_routes  # noqa: E402

REASONER = "deepseek-reasoner"
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
PROFILE = "Initial assessment: placed, starting quarter Q1\nWeak topics: Functions"
SAMPLE_SSE_PATH = Path(__file__).resolve().parents[2] / ".unlazy" / "rag-lesson-stream.sample.sse"


def _pad(text: str, length: int) -> str:
    return (text + " ") * (length // (len(text) + 1) + 1)


def _lesson_dict(marker: str, rich: bool = True) -> Dict[str, object]:
    if not rich:
        return {"sections": [{"type": "introduction", "content": f"{marker} introduction."}]}
    return {
        "sections": [
            {"type": "introduction", "title": "Introduction", "content": _pad(f"{marker} introduction.", 420)},
            {
                "type": "key_concepts",
                "title": "Key Concepts",
                "content": _pad(f"{marker} concepts $f(x)=\\frac{{p(x)}}{{q(x)}}$.", 620),
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
            {"type": "summary", "title": "Summary", "content": _pad(f"{marker} summary.", 260)},
        ]
    }


def _lesson_json(marker: str, rich: bool = True) -> str:
    return json.dumps(_lesson_dict(marker, rich))


def _intro(response_json: Dict[str, object]) -> str:
    return str(response_json["sections"][0]["content"])


class Pipeline:
    """Test doubles for every external seam in rag_routes; counts calls."""

    def __init__(self) -> None:
        self.stream_calls = 0
        self.retrieval_calls = 0
        self.inference_requests: List[SimpleNamespace] = []
        self.stream_delay = 0.0
        self.video_delay = 0.0
        self.stream_outputs: List[str] = []
        self.repair_output = _lesson_json("Repaired")
        self.stream_error: Optional[Exception] = None
        self.video_error: Optional[Exception] = None
        self.retrieval_error: Optional[Exception] = None
        self.chunks = CHUNKS
        self.verification: Dict[str, object] = {"verified": True, "pCorrect": 0.95}
        self.events: List[Tuple[str, float]] = []
        self.store: Dict[Tuple[str, str], Dict[str, object]] = {}
        self.writes: List[Tuple[str, str, Dict[str, object]]] = []
        self.profile: Callable[[str, rag_routes.RagLessonRequest], str] = lambda uid, payload: PROFILE

    def retrieve(self, **_kwargs: object) -> Tuple[List[Dict[str, object]], str]:
        self.retrieval_calls += 1
        if self.retrieval_error is not None:
            raise self.retrieval_error
        return self.chunks, "exact_file"

    def stream(
        self,
        _messages: List[Dict[str, str]],
        model: str,
        report_progress: Callable[[str, int], None],
        _stop: threading.Event,
    ) -> str:
        assert model == REASONER
        self.stream_calls += 1
        call_number = self.stream_calls
        self.events.append(("generate_start", time.perf_counter()))
        report_progress("thinking", 120)
        time.sleep(self.stream_delay)
        if self.stream_error is not None:
            raise self.stream_error
        report_progress("writing", 480)
        self.events.append(("generate_end", time.perf_counter()))
        if self.stream_outputs:
            return self.stream_outputs[min(call_number, len(self.stream_outputs)) - 1]
        return _lesson_json(f"Generated{call_number}")

    async def verify(self, reference_text: str, generated_text: str) -> Dict[str, object]:
        return self.verification

    def videos(self, *_args: object, **_kwargs: object) -> List[Dict[str, str]]:
        self.events.append(("video_start", time.perf_counter()))
        time.sleep(self.video_delay)
        if self.video_error is not None:
            raise self.video_error
        return VIDEOS

    def inference_client(self) -> SimpleNamespace:
        def generate_from_messages(request: SimpleNamespace) -> str:
            self.inference_requests.append(request)
            if request.max_new_tokens == 8192:
                return self.repair_output
            return _lesson_json("Fallback")

        return SimpleNamespace(generate_from_messages=generate_from_messages)

    def read_lesson(self, uid: str, key: str) -> Optional[Dict[str, object]]:
        return self.store.get((uid, key))

    def write_lesson(self, uid: str, key: str, payload: object, lesson: Dict[str, object], profile_summary: str) -> None:
        self.writes.append((uid, key, lesson))
        self.store[(uid, key)] = lesson


@pytest.fixture
def pipeline(monkeypatch: pytest.MonkeyPatch) -> Pipeline:
    fake = Pipeline()
    for store in (rag_routes._lesson_memory, rag_routes._retrieval_memory, rag_routes._lesson_jobs, rag_routes._prefetch_uids):
        store.clear()
    monkeypatch.setattr(rag_routes, "_prefetch_semaphore", asyncio.Semaphore(2))
    monkeypatch.setattr(rag_routes, "retrieve_lesson_pdf_context", fake.retrieve)
    monkeypatch.setattr(rag_routes, "_stream_reasoner_lesson", fake.stream)
    monkeypatch.setattr(rag_routes, "verify_lesson_factuality", fake.verify)
    monkeypatch.setattr(rag_routes, "_fetch_youtube_videos", fake.videos)
    monkeypatch.setattr(rag_routes, "_log_rag_usage", lambda *args, **kwargs: None)
    monkeypatch.setattr(rag_routes, "_lesson_primary_model", lambda: REASONER)
    monkeypatch.setattr(rag_routes, "_get_inference_client", fake.inference_client)
    monkeypatch.setattr(rag_routes, "_read_student_lesson", fake.read_lesson)
    monkeypatch.setattr(rag_routes, "_write_student_lesson", fake.write_lesson)
    monkeypatch.setattr(rag_routes, "_load_learner_profile", lambda uid, payload: fake.profile(uid, payload))
    # Keyword-capturing stand-in so the fallback contract (max_retries=1) is asserted without the real dataclass.
    monkeypatch.setattr(rag_routes, "InferenceRequest", SimpleNamespace)
    yield fake
    for store in (rag_routes._lesson_memory, rag_routes._retrieval_memory, rag_routes._lesson_jobs, rag_routes._prefetch_uids):
        store.clear()


def _app() -> FastAPI:
    """Router under a stand-in for main.py AuthMiddleware: X-Test-Uid becomes request.state.user."""
    app = FastAPI()

    @app.middleware("http")
    async def fake_auth(request: Request, call_next: Callable) -> object:
        uid = request.headers.get("X-Test-Uid")
        request.state.user = SimpleNamespace(uid=uid, role=request.headers.get("X-Test-Role", "student")) if uid else None
        return await call_next(request)

    app.include_router(rag_routes.router)
    return app


def _as(uid: str) -> Dict[str, str]:
    return {"X-Test-Uid": uid}


@pytest.fixture
def client(pipeline: Pipeline) -> TestClient:
    with TestClient(_app()) as test_client:
        yield test_client


def _key() -> str:
    return rag_routes._lesson_cache_key(rag_routes.RagLessonRequest(**PAYLOAD))


def wait_for_writes(pipeline: "Pipeline", count: int) -> None:
    """Firestore writes are fire-and-forget after the response; wait for them to land."""
    deadline = time.monotonic() + 3.0
    while len(pipeline.writes) < count and time.monotonic() < deadline:
        time.sleep(0.01)


def parse_sse(body: str) -> List[Tuple[str, object]]:
    """Return [(event, data)] in order; comment lines become ("comment", text)."""
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


# ─── cache ─────────────────────────────────────────────────────────────────────

def test_cache_serves_same_student_from_memory_without_regenerating(client: TestClient, pipeline: Pipeline) -> None:
    first = client.post("/api/rag/lesson", json=PAYLOAD, headers=_as("alice"))
    second = client.post("/api/rag/lesson", json={**PAYLOAD, "userId": "whatever"}, headers=_as("alice"))

    assert first.status_code == second.status_code == 200
    assert pipeline.stream_calls == 1
    assert second.json() == first.json()
    assert first.json()["activeModel"] == REASONER
    assert first.json()["personalized"] is True


def test_cache_is_isolated_per_student(client: TestClient, pipeline: Pipeline) -> None:
    alice = client.post("/api/rag/lesson", json=PAYLOAD, headers=_as("alice")).json()
    bob = client.post("/api/rag/lesson", json=PAYLOAD, headers=_as("bob")).json()

    assert pipeline.stream_calls == 2
    assert _intro(alice).startswith("Generated1")
    assert _intro(bob).startswith("Generated2")
    wait_for_writes(pipeline, 2)
    assert {(uid, key) for uid, key, _ in pipeline.writes} == {("alice", _key()), ("bob", _key())}


def test_cache_payload_user_id_cannot_select_another_students_lesson(client: TestClient, pipeline: Pipeline) -> None:
    client.post("/api/rag/lesson", json=PAYLOAD, headers=_as("alice"))
    mallory = client.post("/api/rag/lesson", json={**PAYLOAD, "userId": "alice"}, headers=_as("mallory")).json()

    assert pipeline.stream_calls == 2
    assert _intro(mallory).startswith("Generated2")
    wait_for_writes(pipeline, 2)
    assert ("mallory", _key()) in pipeline.store


def test_cache_anonymous_requests_are_not_cached_or_personalized(client: TestClient, pipeline: Pipeline) -> None:
    first = client.post("/api/rag/lesson", json=PAYLOAD).json()
    client.post("/api/rag/lesson", json=PAYLOAD)

    assert pipeline.stream_calls == 2
    assert first["personalized"] is False
    assert pipeline.writes == []


def test_cache_firestore_hit_returns_without_generating(client: TestClient, pipeline: Pipeline) -> None:
    stored = {**_lesson_dict("Stored"), "activeModel": REASONER}
    pipeline.store[("alice", _key())] = stored

    plain = client.post("/api/rag/lesson", json=PAYLOAD, headers=_as("alice"))
    rag_routes._lesson_memory.clear()
    events = parse_sse(client.post("/api/rag/lesson/stream", json=PAYLOAD, headers=_as("alice")).text)

    assert plain.json() == stored
    assert events == [("stage", {"stage": "cached"}), ("lesson", stored)]
    assert pipeline.stream_calls == 0
    assert pipeline.retrieval_calls == 0


def test_cache_firestore_write_happens_after_success(client: TestClient, pipeline: Pipeline) -> None:
    response = client.post("/api/rag/lesson", json=PAYLOAD, headers=_as("alice")).json()

    wait_for_writes(pipeline, 1)
    assert pipeline.writes == [("alice", _key(), response)]
    rag_routes._lesson_memory.clear()
    assert client.post("/api/rag/lesson", json=PAYLOAD, headers=_as("alice")).json() == response
    assert pipeline.stream_calls == 1


def test_cache_key_includes_prompt_version(monkeypatch: pytest.MonkeyPatch) -> None:
    before = _key()
    monkeypatch.setattr(rag_routes, "LESSON_PROMPT_VERSION", "next")
    assert _key() != before


def test_cache_skips_grounded_default_replacement(client: TestClient, pipeline: Pipeline) -> None:
    pipeline.verification = {"verified": False, "pCorrect": 0.2}

    first = client.post("/api/rag/lesson", json=PAYLOAD, headers=_as("alice"))
    client.post("/api/rag/lesson", json=PAYLOAD, headers=_as("alice"))

    assert first.status_code == 200
    assert "Generated" not in str(first.json()["sections"])
    assert pipeline.stream_calls == 2
    assert pipeline.writes == []


def test_cache_skips_errors(client: TestClient, pipeline: Pipeline) -> None:
    pipeline.retrieval_error = RuntimeError("chroma down")

    assert client.post("/api/rag/lesson", json=PAYLOAD, headers=_as("alice")).status_code == 503
    pipeline.retrieval_error = None
    assert client.post("/api/rag/lesson", json=PAYLOAD, headers=_as("alice")).status_code == 200
    assert pipeline.stream_calls == 1
    wait_for_writes(pipeline, 1)
    assert len(pipeline.writes) == 1


def test_cache_force_refresh_regenerates_only_own_lesson(client: TestClient, pipeline: Pipeline) -> None:
    alice_first = client.post("/api/rag/lesson", json=PAYLOAD, headers=_as("alice")).json()
    bob_first = client.post("/api/rag/lesson", json=PAYLOAD, headers=_as("bob")).json()
    alice_refreshed = client.post("/api/rag/lesson", json={**PAYLOAD, "forceRefresh": True}, headers=_as("alice")).json()
    alice_after = client.post("/api/rag/lesson", json=PAYLOAD, headers=_as("alice")).json()
    bob_after = client.post("/api/rag/lesson", json=PAYLOAD, headers=_as("bob")).json()

    assert pipeline.stream_calls == 3
    wait_for_writes(pipeline, 3)
    assert alice_refreshed != alice_first
    assert alice_after == alice_refreshed == pipeline.store[("alice", _key())]
    assert bob_after == bob_first


def test_cache_retrieval_is_shared_across_students(client: TestClient, pipeline: Pipeline) -> None:
    client.post("/api/rag/lesson", json=PAYLOAD, headers=_as("alice"))
    client.post("/api/rag/lesson", json=PAYLOAD, headers=_as("bob"))

    assert pipeline.retrieval_calls == 1
    assert pipeline.stream_calls == 2


# ─── dedupe ────────────────────────────────────────────────────────────────────

def _run_concurrently(*calls: Tuple[str, Dict[str, object], Dict[str, str]]) -> List[httpx.Response]:
    async def run() -> List[httpx.Response]:
        transport = httpx.ASGITransport(app=_app())
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as http:
            return await asyncio.gather(*(http.post(path, json=body, headers=headers) for path, body, headers in calls))

    return asyncio.run(run())


def test_dedupe_concurrent_identical_requests_share_one_generation(pipeline: Pipeline) -> None:
    pipeline.stream_delay = 0.3

    plain_a, plain_b, streamed = _run_concurrently(
        ("/api/rag/lesson", PAYLOAD, _as("alice")),
        ("/api/rag/lesson", {**PAYLOAD, "userId": "x"}, _as("alice")),
        ("/api/rag/lesson/stream", PAYLOAD, _as("alice")),
    )

    assert pipeline.stream_calls == 1
    assert plain_a.json() == plain_b.json()
    lesson_events = [data for event, data in parse_sse(streamed.text) if event == "lesson"]
    assert lesson_events == [plain_a.json()]


def test_dedupe_is_per_student(pipeline: Pipeline) -> None:
    pipeline.stream_delay = 0.2

    alice, bob = _run_concurrently(("/api/rag/lesson", PAYLOAD, _as("alice")), ("/api/rag/lesson", PAYLOAD, _as("bob")))

    assert pipeline.stream_calls == 2
    assert alice.json() != bob.json()


def test_dedupe_generation_survives_stream_client_disconnect(pipeline: Pipeline) -> None:
    pipeline.stream_delay = 0.4

    async def run() -> Tuple[httpx.Response, int]:
        transport = httpx.ASGITransport(app=_app())
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as http:
            abandoned = asyncio.create_task(http.post("/api/rag/lesson/stream", json=PAYLOAD, headers=_as("alice")))
            await asyncio.sleep(0.1)
            abandoned.cancel()
            await asyncio.gather(abandoned, return_exceptions=True)
            await asyncio.sleep(0.6)
            calls_before = pipeline.stream_calls
            return await http.post("/api/rag/lesson", json=PAYLOAD, headers=_as("alice")), calls_before

    response, calls_before = asyncio.run(run())

    assert calls_before == 1
    assert response.status_code == 200
    assert pipeline.stream_calls == 1
    assert len(pipeline.writes) == 1


# ─── video ─────────────────────────────────────────────────────────────────────

def test_video_lookup_runs_concurrently_with_generation(client: TestClient, pipeline: Pipeline) -> None:
    pipeline.stream_delay = 0.5
    pipeline.video_delay = 0.5

    started = time.perf_counter()
    response = client.post("/api/rag/lesson", json=PAYLOAD, headers=_as("alice"))
    elapsed = time.perf_counter() - started

    assert response.status_code == 200
    moments = dict(pipeline.events)
    assert moments["video_start"] < moments["generate_end"]
    assert elapsed < 0.9, f"video lookup was serialized after generation ({elapsed:.2f}s)"
    video = next(s for s in response.json()["sections"] if s["type"] == "video")
    assert video["videoId"] == "abc123"
    assert video["embedUrl"] == "https://www.youtube.com/embed/abc123"
    assert video["videos"] == VIDEOS


def test_video_failure_still_yields_lesson(client: TestClient, pipeline: Pipeline) -> None:
    pipeline.video_error = RuntimeError("quota exceeded")

    response = client.post("/api/rag/lesson", json=PAYLOAD, headers=_as("alice"))

    assert response.status_code == 200
    video = next(s for s in response.json()["sections"] if s["type"] == "video")
    assert video.get("videoId", "") == ""
    assert "videos" not in video
    assert len(response.json()["sections"]) == 7


def test_video_slow_lookup_is_capped(client: TestClient, pipeline: Pipeline, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(rag_routes, "_LESSON_VIDEO_CAP_SEC", 0.2)
    pipeline.video_delay = 1.5

    started = time.perf_counter()
    response = client.post("/api/rag/lesson", json=PAYLOAD, headers=_as("alice"))

    assert response.status_code == 200
    assert time.perf_counter() - started < 1.0
    assert next(s for s in response.json()["sections"] if s["type"] == "video").get("videoId", "") == ""


# ─── stream ────────────────────────────────────────────────────────────────────

def test_stream_emits_stages_progress_and_lesson_matching_post(client: TestClient, pipeline: Pipeline) -> None:
    pipeline.stream_delay = 0.1

    streamed = client.post("/api/rag/lesson/stream", json=PAYLOAD, headers=_as("alice"))

    assert streamed.status_code == 200
    assert streamed.headers["content-type"].startswith("text/event-stream")
    events = parse_sse(streamed.text)
    stages = [data["stage"] for event, data in events if event == "stage"]
    assert stages == ["retrieving", "generating", "verifying", "finalizing"]
    progress = [data for event, data in events if event == "progress"]
    assert {"phase": "thinking", "chars": 120} in progress
    assert {"phase": "writing", "chars": 480} in progress
    assert events[-1][0] == "lesson"
    plain = client.post("/api/rag/lesson", json=PAYLOAD, headers=_as("alice")).json()
    assert events[-1][1] == plain
    assert set(plain) >= {
        "sections", "retrievalConfidence", "retrievalBand", "retrievalMode",
        "needsReview", "sources", "activeModel", "jevVerification", "personalized",
    }
    SAMPLE_SSE_PATH.parent.mkdir(parents=True, exist_ok=True)
    SAMPLE_SSE_PATH.write_text(streamed.text, encoding="utf-8", newline="")


def test_stream_memory_cache_hit_emits_cached_stage(client: TestClient, pipeline: Pipeline) -> None:
    plain = client.post("/api/rag/lesson", json=PAYLOAD, headers=_as("alice")).json()

    events = parse_sse(client.post("/api/rag/lesson/stream", json=PAYLOAD, headers=_as("alice")).text)

    assert events == [("stage", {"stage": "cached"}), ("lesson", plain)]
    assert pipeline.stream_calls == 1


def test_stream_error_event_carries_status_and_detail(client: TestClient, pipeline: Pipeline) -> None:
    pipeline.chunks = []

    plain = client.post("/api/rag/lesson", json=PAYLOAD, headers=_as("alice"))
    events = parse_sse(client.post("/api/rag/lesson/stream", json=PAYLOAD, headers=_as("alice")).text)

    assert plain.status_code == 404
    assert events[-1] == ("error", {"status": 404, "detail": plain.json()["detail"]})
    assert [event for event, _ in events].count("lesson") == 0


def test_stream_inference_failure_maps_to_error_event(client: TestClient, pipeline: Pipeline, monkeypatch: pytest.MonkeyPatch) -> None:
    pipeline.stream_error = RuntimeError("reasoner down")

    def broken_client() -> SimpleNamespace:
        def generate_from_messages(_request: SimpleNamespace) -> str:
            raise rag_routes.InferenceConnectionError("chat down")

        return SimpleNamespace(generate_from_messages=generate_from_messages)

    monkeypatch.setattr(rag_routes, "_get_inference_client", broken_client)

    events = parse_sse(client.post("/api/rag/lesson/stream", json=PAYLOAD, headers=_as("alice")).text)

    assert events[-1][0] == "error"
    assert events[-1][1]["status"] == 502
    assert events[-1][1]["detail"]["error"] == "inference_connection_failed"


def test_stream_validation_error_is_plain_http_status(client: TestClient) -> None:
    response = client.post("/api/rag/lesson/stream", json={**PAYLOAD, "quarter": "Q9"}, headers=_as("alice"))

    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/json")


def test_stream_pings_while_work_is_in_progress(client: TestClient, pipeline: Pipeline, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(rag_routes, "_LESSON_PING_INTERVAL_SEC", 0.05)
    pipeline.stream_delay = 0.4

    body = client.post("/api/rag/lesson/stream", json=PAYLOAD, headers=_as("alice")).text

    assert ": ping\n\n" in body
    assert parse_sse(body)[-1][0] == "lesson"


# ─── fallback ──────────────────────────────────────────────────────────────────

def test_fallback_to_chat_once_when_reasoner_stream_fails(client: TestClient, pipeline: Pipeline) -> None:
    pipeline.stream_error = RuntimeError("stream reset")

    response = client.post("/api/rag/lesson", json=PAYLOAD, headers=_as("alice"))

    assert response.status_code == 200
    assert response.json()["activeModel"] == rag_routes.CHAT_MODEL
    assert _intro(response.json()).startswith("Fallback")
    assert len(pipeline.inference_requests) == 1
    fallback = pipeline.inference_requests[0]
    assert fallback.model == rag_routes.CHAT_MODEL
    assert fallback.task_type == "rag_lesson"
    assert fallback.max_new_tokens == 4096
    assert fallback.timeout_sec == 120
    assert fallback.max_retries == 1
    # A chat fallback is not persisted indefinitely: the next open retries the reasoner.
    assert pipeline.writes == []


def test_fallback_when_stream_exceeds_overall_cap(client: TestClient, pipeline: Pipeline, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(rag_routes, "_LESSON_GENERATION_CAP_SEC", 0.2)
    pipeline.stream_delay = 1.0

    started = time.perf_counter()
    response = client.post("/api/rag/lesson", json=PAYLOAD, headers=_as("alice"))

    assert response.status_code == 200
    assert time.perf_counter() - started < 0.9
    assert response.json()["activeModel"] == rag_routes.CHAT_MODEL
    assert len(pipeline.inference_requests) == 1


def _chunk(content: Optional[str] = None, reasoning: Optional[str] = None, finish: Optional[str] = None) -> SimpleNamespace:
    delta = SimpleNamespace(content=content, reasoning_content=reasoning)
    return SimpleNamespace(choices=[SimpleNamespace(delta=delta, finish_reason=finish)])


class FakeDeepSeek:
    def __init__(self, chunks: List[SimpleNamespace]) -> None:
        self.chunks = chunks
        self.options: Dict[str, object] = {}
        self.create_kwargs: Dict[str, object] = {}
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self.create))

    def with_options(self, **options: object) -> "FakeDeepSeek":
        self.options = options
        return self

    def create(self, **kwargs: object) -> List[SimpleNamespace]:
        self.create_kwargs = kwargs
        return self.chunks


def test_fallback_contract_reasoner_stream_request_shape(monkeypatch: pytest.MonkeyPatch) -> None:
    fake = FakeDeepSeek([_chunk(reasoning="think " * 10), _chunk(content='{"sections": '), _chunk(content="[]}", finish="stop")])
    monkeypatch.setattr(rag_routes, "get_deepseek_client", lambda: fake)
    monkeypatch.setattr(rag_routes, "_LESSON_PROGRESS_INTERVAL_SEC", 0.0)
    progress: List[Tuple[str, int]] = []

    text = rag_routes._stream_reasoner_lesson(
        [{"role": "user", "content": "x"}], REASONER, lambda phase, chars: progress.append((phase, chars)), threading.Event()
    )

    assert text == '{"sections": []}'
    assert fake.options == {"max_retries": 0}
    assert fake.create_kwargs["stream"] is True
    assert fake.create_kwargs["max_tokens"] == 8192
    assert fake.create_kwargs["model"] == REASONER
    assert "temperature" not in fake.create_kwargs and "top_p" not in fake.create_kwargs
    timeout = fake.create_kwargs["timeout"]
    assert isinstance(timeout, httpx.Timeout) and timeout.read == 60.0 and timeout.connect == 10.0
    assert progress[0] == ("thinking", 60)
    assert progress[-1] == ("writing", len('{"sections": []}'))


def test_fallback_triggered_by_truncated_or_empty_stream(monkeypatch: pytest.MonkeyPatch) -> None:
    for chunks in ([_chunk(content='{"sections": [', finish="length")], [_chunk(reasoning="only thinking", finish="stop")]):
        monkeypatch.setattr(rag_routes, "get_deepseek_client", lambda chunks=chunks: FakeDeepSeek(chunks))
        with pytest.raises(RuntimeError):
            rag_routes._stream_reasoner_lesson([], REASONER, lambda phase, chars: None, threading.Event())


# ─── validate / repair ─────────────────────────────────────────────────────────

def test_validate_accepts_rich_lesson() -> None:
    assert rag_routes._lesson_deficits(_lesson_dict("Rich")) == []


def test_validate_reports_each_specific_deficit() -> None:
    thin = _lesson_dict("Thin")
    sections = {s["type"]: s for s in thin["sections"]}
    sections["introduction"]["content"] = "Short."
    sections["key_concepts"]["callouts"] = []
    sections["worked_examples"]["examples"][0]["steps"] = ["Step 1: only one"]
    sections["important_notes"]["bulletPoints"] = ["one"]
    sections["try_it_yourself"]["practiceProblems"][0]["solution"] = ""
    sections["summary"]["content"] = "Short."

    deficits = " | ".join(rag_routes._lesson_deficits(thin))

    for fragment in ("introduction", "callout", "worked_examples", "found 2", "important_notes", "try_it_yourself", "found 4", "summary"):
        assert fragment in deficits
    assert "key_concepts.content" not in deficits
    assert rag_routes._lesson_deficits({"explanation": "not json"}) == [
        "The response was not valid lesson JSON with a 'sections' array."
    ]


def test_repair_pass_fixes_thin_lesson_and_result_is_cached(client: TestClient, pipeline: Pipeline) -> None:
    pipeline.stream_outputs = [_lesson_json("Thin", rich=False)]

    response = client.post("/api/rag/lesson", json=PAYLOAD, headers=_as("alice")).json()

    assert _intro(response).startswith("Repaired")
    assert response["activeModel"] == REASONER
    assert len(pipeline.inference_requests) == 1
    repair = pipeline.inference_requests[0]
    assert repair.model == rag_routes.CHAT_MODEL
    assert repair.timeout_sec == 120 and repair.max_retries == 1
    repair_prompt = repair.messages[-1]["content"]
    assert "[YOUR PREVIOUS OUTPUT]" in repair_prompt and "Thin introduction." in repair_prompt
    assert "worked_examples needs at least 3 examples" in repair_prompt
    wait_for_writes(pipeline, 1)
    assert len(pipeline.writes) == 1


def test_repair_runs_when_output_is_not_json(client: TestClient, pipeline: Pipeline) -> None:
    pipeline.stream_outputs = ["Sorry, here is a lesson in prose."]

    response = client.post("/api/rag/lesson", json=PAYLOAD, headers=_as("alice")).json()

    assert _intro(response).startswith("Repaired")
    assert "not valid lesson JSON" in pipeline.inference_requests[0].messages[-1]["content"]


def test_repair_failure_falls_back_to_grounded_defaults_uncached(client: TestClient, pipeline: Pipeline) -> None:
    pipeline.stream_outputs = [_lesson_json("Thin", rich=False)]
    pipeline.repair_output = _lesson_json("StillThin", rich=False)

    response = client.post("/api/rag/lesson", json=PAYLOAD, headers=_as("alice")).json()

    assert "Thin" not in str(response["sections"])
    assert CHUNKS[0]["content"] in str(response["sections"])
    assert len(response["sections"]) == 7
    assert response["needsReview"] is True
    assert pipeline.writes == []
    assert rag_routes._lesson_memory == {}


# ─── profile ───────────────────────────────────────────────────────────────────

def test_profile_loader_fail_open_uses_generic_profile(client: TestClient, pipeline: Pipeline, monkeypatch: pytest.MonkeyPatch) -> None:
    prompts: List[str] = []
    real_build = rag_routes.build_lesson_prompt

    def capture(**kwargs: object) -> str:
        prompts.append(str(kwargs["learner_profile"]))
        return real_build(**kwargs)

    def broken(uid: str, payload: object) -> str:
        raise RuntimeError("firestore unavailable")

    monkeypatch.setattr(rag_routes, "build_lesson_prompt", capture)
    pipeline.profile = broken

    response = client.post("/api/rag/lesson", json=PAYLOAD, headers=_as("alice"))

    assert response.status_code == 200
    assert response.json()["personalized"] is False
    assert prompts == [rag_routes.GENERIC_LEARNER_PROFILE]


def test_profile_loader_timeout_is_capped(client: TestClient, pipeline: Pipeline, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(rag_routes, "_LEARNER_PROFILE_CAP_SEC", 0.1)

    def slow(uid: str, payload: object) -> str:
        time.sleep(1.0)
        return PROFILE

    pipeline.profile = slow
    started = time.perf_counter()
    response = client.post("/api/rag/lesson", json=PAYLOAD, headers=_as("alice"))

    assert response.json()["personalized"] is False
    assert time.perf_counter() - started < 0.9


class _Doc:
    def __init__(self, fields: Optional[Dict[str, object]]) -> None:
        self.exists = fields is not None
        self._fields = fields

    def to_dict(self) -> Optional[Dict[str, object]]:
        return self._fields


class _FakeDb:
    """collection/document chains resolve to a slash path looked up in `docs`."""

    def __init__(self, docs: Dict[str, Dict[str, object]], path: str = "") -> None:
        self.docs = docs
        self.path = path

    def collection(self, name: str) -> "_FakeDb":
        return _FakeDb(self.docs, f"{self.path}/{name}".lstrip("/"))

    document = collection

    def get(self) -> _Doc:
        return _Doc(self.docs.get(self.path))


def test_profile_loader_builds_compact_profile_without_pii(monkeypatch: pytest.MonkeyPatch) -> None:
    docs = {
        "users/alice": {
            "name": "Alice Santos",
            "email": "alice@example.com",
            "grade": "Grade 11",
            "track": "STEM",
            "iarAssessmentState": "placed",
            "startingQuarterG11": "Q1",
            "iarTopicClassifications": {"Functions": "NeedsReview"},
            "topicScores": {"Functions": 45},
            "assessmentResults": {"weakTopics": ["Domain and range"], "strongTopics": ["Logic"]},
            "recommendedPace": "support_intensive",
            "overallRisk": "High",
            "atRiskSubjects": ["General Mathematics"],
        },
        "studentProgress/alice/topics/gm-q1-rational": {"mastery_level": "developing", "best_score": 60},
    }
    monkeypatch.setattr(rag_routes, "_firestore_db", lambda: _FakeDb(docs))
    import services.memory_service as memory_service

    tutor = SimpleNamespace(weak_topics=["asymptotes"], recurring_mistakes=["divides by zero"], explanation_depth="basic")
    monkeypatch.setattr(memory_service, "load_profile", lambda uid: tutor)

    profile = rag_routes._load_learner_profile("alice", rag_routes.RagLessonRequest(**PAYLOAD))

    for fragment in ("STEM", "placed", "Functions=NeedsReview", "Domain and range", "support_intensive",
                     "at risk in General Mathematics", "mastery developing", "divides by zero", "basic"):
        assert fragment in profile
    assert "Alice" not in profile and "alice@" not in profile
    assert len(profile) <= rag_routes._LEARNER_PROFILE_MAX_CHARS


def test_profile_prompt_contains_learner_profile_section() -> None:
    prompt = rag_routes.build_lesson_prompt(
        lesson_title="Rational Functions", competency="M11GM-Ib-1", grade_level="Grade 11",
        subject="General Mathematics", quarter=1, learner_level=None, module_unit=None,
        curriculum_chunks=CHUNKS, learner_profile=PROFILE,
    )

    assert "[LEARNER PROFILE]\n" + PROFILE in prompt
    assert "pesos" in prompt and "$...$" in prompt and "7 sections" in prompt


# ─── prefetch ──────────────────────────────────────────────────────────────────

def test_prefetch_returns_cached_without_generating(client: TestClient, pipeline: Pipeline) -> None:
    pipeline.store[("alice", _key())] = _lesson_dict("Stored")

    response = client.post("/api/rag/lesson/prefetch", json=PAYLOAD, headers=_as("alice"))

    assert response.status_code == 202
    assert response.json() == {"status": "cached"}
    assert pipeline.stream_calls == 0


def test_prefetch_anonymous_is_skipped(client: TestClient, pipeline: Pipeline) -> None:
    assert client.post("/api/rag/lesson/prefetch", json=PAYLOAD).json() == {"status": "skipped"}
    assert pipeline.stream_calls == 0


def test_prefetch_queued_generates_once_and_stream_joins_in_flight(pipeline: Pipeline) -> None:
    pipeline.stream_delay = 0.4

    async def run() -> Tuple[httpx.Response, httpx.Response, httpx.Response, httpx.Response]:
        transport = httpx.ASGITransport(app=_app())
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as http:
            queued = await http.post("/api/rag/lesson/prefetch", json=PAYLOAD, headers=_as("alice"))
            again = await http.post("/api/rag/lesson/prefetch", json=PAYLOAD, headers=_as("alice"))
            await asyncio.sleep(0.1)
            streamed = await http.post("/api/rag/lesson/stream", json=PAYLOAD, headers=_as("alice"))
            await asyncio.sleep(0.05)
            after = await http.post("/api/rag/lesson/prefetch", json=PAYLOAD, headers=_as("alice"))
            return queued, again, streamed, after

    queued, again, streamed, after = asyncio.run(run())

    assert queued.status_code == 202 and queued.json() == {"status": "queued"}
    assert again.json() == {"status": "in_progress"}
    events = parse_sse(streamed.text)
    assert events[0] == ("stage", {"stage": "generating"})
    assert events[-1][0] == "lesson"
    assert after.json() == {"status": "cached"}
    assert pipeline.stream_calls == 1
    assert len(pipeline.writes) == 1
    assert rag_routes._prefetch_uids == set()


def test_prefetch_per_student_limit_returns_skipped(pipeline: Pipeline) -> None:
    pipeline.stream_delay = 0.3
    other_lesson = {**PAYLOAD, "lessonTitle": "Graphs of Rational Functions", "lessonId": "gm-q1-graphs"}

    async def run() -> Tuple[httpx.Response, httpx.Response, httpx.Response]:
        transport = httpx.ASGITransport(app=_app())
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as http:
            first = await http.post("/api/rag/lesson/prefetch", json=PAYLOAD, headers=_as("alice"))
            second = await http.post("/api/rag/lesson/prefetch", json=other_lesson, headers=_as("alice"))
            other_student = await http.post("/api/rag/lesson/prefetch", json=other_lesson, headers=_as("bob"))
            await asyncio.sleep(0.6)
            return first, second, other_student

    first, second, other_student = asyncio.run(run())

    assert first.json() == {"status": "queued"}
    assert second.json() == {"status": "skipped"}
    assert other_student.json() == {"status": "queued"}
    assert pipeline.stream_calls == 2


def test_prefetch_global_limit_returns_skipped(pipeline: Pipeline, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(rag_routes, "_prefetch_semaphore", asyncio.Semaphore(1))
    pipeline.stream_delay = 0.3

    async def run() -> Tuple[httpx.Response, httpx.Response, httpx.Response]:
        transport = httpx.ASGITransport(app=_app())
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as http:
            first = await http.post("/api/rag/lesson/prefetch", json=PAYLOAD, headers=_as("alice"))
            await asyncio.sleep(0.05)
            second = await http.post("/api/rag/lesson/prefetch", json=PAYLOAD, headers=_as("bob"))
            interactive = await http.post("/api/rag/lesson", json=PAYLOAD, headers=_as("carol"))
            await asyncio.sleep(0.4)
            return first, second, interactive

    first, second, interactive = asyncio.run(run())

    assert first.json() == {"status": "queued"}
    assert second.json() == {"status": "skipped"}
    assert interactive.status_code == 200


# ─── timings ───────────────────────────────────────────────────────────────────

def test_lesson_logs_stage_timings_once_per_lesson(client: TestClient, pipeline: Pipeline, caplog: pytest.LogCaptureFixture) -> None:
    with caplog.at_level("INFO", logger="mathpulse.rag"):
        client.post("/api/rag/lesson", json=PAYLOAD, headers=_as("alice"))
        client.post("/api/rag/lesson", json=PAYLOAD, headers=_as("alice"))

    lines = [r.getMessage() for r in caplog.records if r.getMessage().startswith("rag_lesson timings")]
    assert len(lines) == 2
    assert "cache=miss" in lines[0]
    for stage in ("retrieve_ms=", "generate_ms=", "verify_ms=", "video_ms=", "total_ms="):
        assert stage in lines[0]
    assert "cache=hit" in lines[1]
    print(lines[0])
