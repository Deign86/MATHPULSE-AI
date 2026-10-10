"""Regression guards for the perf/ai-latency fixes.

Each test here pins one performance bug that was fixed and must not come back:
blocking LLM/RAG calls on the event loop, stacked SDK retries, model routing,
repeated chunk re-encoding, unbounded prompt context, and lost async jobs.
Lesson-pipeline (rag_routes) guards live in test_regression_rag_lesson.py.
"""
from __future__ import annotations

import ast
import asyncio
import json
import os
import time
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import httpx
import numpy as np
import pytest
import yaml

os.environ.setdefault("DEEPSEEK_API_KEY", "mock-key-for-testing")

import main as main_module
from rag import curriculum_rag
from services import ai_client

BACKEND_DIR = Path(__file__).resolve().parents[1]
MODELS_YAML = BACKEND_DIR / "config" / "models.yaml"


# ─── 1. Static guard: no blocking LLM / RAG / embedding call directly inside an async def ────────

BLOCKING_CALLEES = frozenset(
    {
        "chat.completions.create",
        "generate_from_messages",
        "retrieve_curriculum_context",
        "retrieve_lesson_pdf_context",
        "rag_grounded_completion",
        "get_vectorstore_health",
        "encode",
    }
)

SCAN_EXCLUDED_FILES: frozenset[str] = frozenset()

# (file name, enclosing async def, callee) -> reason. Keyed by function, not line, so edits elsewhere
# in the file do not churn it. A stale entry (site fixed or removed) fails test_ast_guard_allowlist_is_not_stale.
BLOCKING_CALL_ALLOWLIST: dict[tuple[str, str, str], str] = {}


def _callee_name(call: ast.Call) -> str | None:
    func = call.func
    if isinstance(func, ast.Name):
        return func.id
    if isinstance(func, ast.Attribute):
        if func.attr == "create" and isinstance(func.value, ast.Attribute) and func.value.attr == "completions":
            return "chat.completions.create"
        return func.attr
    return None


def _is_blocking_call(call: ast.Call) -> str | None:
    name = _callee_name(call)
    if name not in BLOCKING_CALLEES:
        return None
    if name == "encode":
        # str.encode("utf-8") / str.encode() are not embedding calls; embedders always get the texts.
        if not call.args or isinstance(call.args[0], ast.Constant):
            return None
    return name


def find_blocking_calls_in_async_defs(source: str, file_name: str) -> list[tuple[str, int, str, str]]:
    """Return (file, line, async def name, callee) for every blocking call made directly in an async def.

    Calls that are awaited (async clients) are fine. Code inside a nested def/lambda is skipped: that is
    the shape of work handed to asyncio.to_thread / run_in_executor. Passing the function object itself
    (to_thread(retrieve_curriculum_context, ...)) is not a call and is never flagged.
    """
    tree = ast.parse(source)
    found: list[tuple[str, int, str, str]] = []
    for async_fn in ast.walk(tree):
        if not isinstance(async_fn, ast.AsyncFunctionDef):
            continue
        pending: list[tuple[ast.AST, bool]] = [(node, False) for node in async_fn.body]
        while pending:
            node, awaited = pending.pop()
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda)):
                continue
            if isinstance(node, ast.Call) and not awaited:
                callee = _is_blocking_call(node)
                if callee:
                    found.append((file_name, node.lineno, async_fn.name, callee))
            for child in ast.iter_child_nodes(node):
                pending.append((child, isinstance(node, ast.Await) and child is node.value))
    return sorted(found)


def _scanned_files() -> list[Path]:
    routes = sorted(p for p in (BACKEND_DIR / "routes").glob("*.py") if p.name not in SCAN_EXCLUDED_FILES)
    return [BACKEND_DIR / "main.py", *routes]


def _all_blocking_calls() -> list[tuple[str, int, str, str]]:
    sites: list[tuple[str, int, str, str]] = []
    for path in _scanned_files():
        sites.extend(find_blocking_calls_in_async_defs(path.read_text(encoding="utf-8-sig"), path.name))
    return sites


def test_ast_guard_no_blocking_ai_calls_on_event_loop():
    offending = [
        (file, line, fn, callee)
        for file, line, fn, callee in _all_blocking_calls()
        if (file, fn, callee) not in BLOCKING_CALL_ALLOWLIST
    ]
    report = "\n".join(f"  {file}:{line} in async def {fn}(): {callee}(...)" for file, line, fn, callee in offending)
    assert not offending, (
        "Blocking LLM/RAG call made directly inside an async def (freezes every request on the event loop). "
        "Wrap it in asyncio.to_thread(...) with an explicit timeout:\n" + report
    )


def test_ast_guard_allowlist_is_not_stale():
    present = {(file, fn, callee) for file, _line, fn, callee in _all_blocking_calls()}
    stale = sorted(set(BLOCKING_CALL_ALLOWLIST) - present)
    assert not stale, f"Allowlisted blocking sites no longer exist; delete them from BLOCKING_CALL_ALLOWLIST: {stale}"


def test_ast_guard_scans_expected_files():
    names = {path.name for path in _scanned_files()}
    assert {"main.py", "diagnostic.py", "practice.py", "quiz_generation_routes.py", "try_it_yourself.py",
            "deepseek_rag_routes.py", "rag_routes.py", "fun_modules_routes.py"} <= names


@pytest.mark.parametrize(
    ("snippet", "expected_callees"),
    [
        ("async def h(q):\n    return retrieve_curriculum_context(q)\n", ["retrieve_curriculum_context"]),
        ("async def h(c):\n    return c.chat.completions.create(model='m')\n", ["chat.completions.create"]),
        ("async def h(m, t):\n    return m.encode(t)\n", ["encode"]),
        ("async def h(c, r):\n    return get_client().generate_from_messages(r)\n", ["generate_from_messages"]),
        ("async def h(q):\n    return await asyncio.to_thread(retrieve_curriculum_context, q)\n", []),
        ("async def h(c, r):\n    return await asyncio.to_thread(c.generate_from_messages, r)\n", []),
        ("async def h(q):\n    return await asyncio.to_thread(lambda: rag_grounded_completion(q))\n", []),
        ("async def h(q):\n    def work():\n        return get_vectorstore_health()\n    return await asyncio.to_thread(work)\n", []),
        ("async def h(c):\n    return await c.chat.completions.create(model='m')\n", []),
        ("async def h(s):\n    return s.encode('utf-8')\n", []),
        ("def h(q):\n    return retrieve_curriculum_context(q)\n", []),
    ],
)
def test_ast_guard_detector_flags_only_direct_blocking_calls(snippet, expected_callees):
    found = [callee for _f, _l, _fn, callee in find_blocking_calls_in_async_defs(snippet, "snippet.py")]
    assert found == expected_callees


# ─── 2. Config guards ────────────────────────────────────────────────────────────────────────────


def test_config_guard_shared_deepseek_client_has_no_sdk_retries(monkeypatch):
    monkeypatch.setenv("DEEPSEEK_API_KEY", "sk-regression-fake")
    ai_client.get_deepseek_client.cache_clear()
    try:
        client = ai_client.get_deepseek_client()
        assert client.max_retries == 0, "SDK retries stack under InferenceClient retries and the fallback chain"
    finally:
        ai_client.get_deepseek_client.cache_clear()


def test_config_guard_task_model_routing():
    task_models = yaml.safe_load(MODELS_YAML.read_text(encoding="utf-8"))["routing"]["task_model_map"]
    assert task_models["rag_lesson"] == "deepseek-v4-pro", "lessons keep full reasoning depth (user requirement)"
    assert task_models["chat"] == "deepseek-flash", "chat prefers speed (user requirement)"
    assert task_models["verify_solution"] == "deepseek-flash", "chat verification prefers speed (user requirement)"


# ─── 3. Retrieval guards ─────────────────────────────────────────────────────────────────────────

LESSON_PATH = "curriculum/gen_math/SHS_GM_Q1.pdf"


@pytest.fixture
def fresh_retrieval_cache():
    curriculum_rag.reset_exact_file_cache()
    yield
    curriculum_rag.reset_exact_file_cache()


def _chunk_metadata() -> dict[str, object]:
    return {
        "subject": "general_mathematics",
        "quarter": 1,
        "content_domain": "general",
        "chunk_type": "concept",
        "source_file": "SHS_GM_Q1.pdf",
        "storage_path": LESSON_PATH,
    }


def _low_score_embedder() -> MagicMock:
    """Query vector [1,0]; every chunk vector [0,1] -> score 0.5, below the 0.65 'exact' bar, so the
    retrieve_lesson_pdf_context ladder walks every rung (1 -> 1b -> 1c -> general)."""
    embedder = MagicMock()

    def encode(value: object, **_kwargs: object) -> np.ndarray:
        if isinstance(value, str):
            return np.array([1.0, 0.0], dtype=np.float32)
        return np.array([[0.0, 1.0] for _ in value], dtype=np.float32)

    embedder.encode.side_effect = encode
    return embedder


def _vector_collection(total_ids: int, indexed_ids: int) -> MagicMock:
    collection = MagicMock()
    collection.count.return_value = total_ids
    collection.get.return_value = {
        "ids": ["c1", "c2", "c3"],
        "documents": ["chunk one", "chunk two", "chunk three"],
        "metadatas": [_chunk_metadata(), _chunk_metadata(), _chunk_metadata()],
    }
    collection.query.return_value = {
        "ids": [[f"id{i}" for i in range(indexed_ids)]],
        "documents": [["general chunk"]],
        "metadatas": [[_chunk_metadata()]],
        "distances": [[0.9]],
    }
    return collection


def _run_lesson_ladder(collection: MagicMock, embedder: MagicMock) -> tuple[list[dict], str]:
    with patch("rag.vectorstore_loader.get_vectorstore_components", return_value=(MagicMock(), collection, embedder)):
        return curriculum_rag.retrieve_lesson_pdf_context(
            topic="Rational Functions",
            subject="General Mathematics",
            quarter=1,
            lesson_title="Introduction to Rational Functions",
            storage_path=LESSON_PATH,
            top_k=5,
        )


def _chunk_batch_encodes(embedder: MagicMock) -> int:
    return sum(1 for call in embedder.encode.call_args_list if isinstance(call.args[0], list))


def test_retrieval_guard_ladder_encodes_file_chunks_once(fresh_retrieval_cache):
    collection, embedder = _vector_collection(total_ids=3, indexed_ids=1), _low_score_embedder()
    _chunks, mode = _run_lesson_ladder(collection, embedder)

    exact_rung_queries = [call for call in embedder.encode.call_args_list if isinstance(call.args[0], str)]
    assert len(exact_rung_queries) >= 3, "ladder should have run rungs 1, 1b and 1c"
    assert mode == "hybrid"
    assert _chunk_batch_encodes(embedder) == 1, "file chunks re-encoded per ladder rung (49s per encode in prod)"
    assert collection.get.call_count == 1

    _run_lesson_ladder(collection, embedder)
    assert _chunk_batch_encodes(embedder) == 1, "second lesson for the same file re-encoded its chunks"


def test_retrieval_guard_broken_index_never_issues_filtered_query(fresh_retrieval_cache):
    collection, embedder = _vector_collection(total_ids=3, indexed_ids=1), _low_score_embedder()
    _run_lesson_ladder(collection, embedder)
    _run_lesson_ladder(collection, embedder)
    filtered = [call for call in collection.query.call_args_list if "where" in call.kwargs]
    assert filtered == [], "query(where=...) raises 'Error finding id' on the broken HNSW index"


def test_retrieval_guard_healthy_index_ladder_never_encodes_chunks(fresh_retrieval_cache):
    collection, embedder = _vector_collection(total_ids=3, indexed_ids=3), _low_score_embedder()
    _run_lesson_ladder(collection, embedder)
    assert _chunk_batch_encodes(embedder) == 0
    collection.get.assert_not_called()


def test_retrieval_guard_context_budget_holds_for_twenty_huge_chunks():
    chunks = [
        {
            "content": f"chunk-{i} " + "z" * 50_000,
            "source_file": f"SHS_GM_Q{i % 4 + 1}_very_long_module_name.pdf",
            "page": i,
            "content_domain": "general",
            "chunk_type": "concept",
            "score": 0.9,
        }
        for i in range(20)
    ]
    text = curriculum_rag.format_retrieved_chunks(chunks)
    assert len(text) <= curriculum_rag._MAX_CONTEXT_CHARS + len(curriculum_rag._TRUNCATED)
    assert curriculum_rag._MAX_CONTEXT_CHARS <= 9000
    assert "z" * (curriculum_rag._MAX_EXCERPT_CHARS + 1) not in text


# ─── shared HTTP harness for main.app ────────────────────────────────────────────────────────────


def _claims_for(token: str) -> dict[str, str]:
    uid, _, role = token.partition(":")
    return {"uid": uid, "sub": uid, "role": role or "student", "email": f"{uid}@test.mathpulse.ai"}


@pytest.fixture
def app_auth(monkeypatch):
    """Bearer '<uid>:<role>' authenticates as that user without Firebase."""
    monkeypatch.setattr(main_module, "_firebase_ready", True)
    monkeypatch.setattr(main_module, "_init_firebase_admin", lambda: None)
    monkeypatch.setattr(
        main_module, "firebase_auth", SimpleNamespace(verify_id_token=lambda token, **_kw: _claims_for(token))
    )


def _app_client(uid: str, role: str) -> httpx.AsyncClient:
    return httpx.AsyncClient(
        transport=httpx.ASGITransport(app=main_module.app),
        base_url="http://test",
        headers={"Authorization": f"Bearer {uid}:{role}"},
        timeout=30.0,
    )


# ─── 4. Event-loop responsiveness ────────────────────────────────────────────────────────────────

LLM_BLOCK_SECONDS = 1.5


class _BlockingInference:
    def __init__(self) -> None:
        self.calls = 0

    def generate_from_messages(self, _request: object) -> str:
        self.calls += 1
        time.sleep(LLM_BLOCK_SECONDS)
        return json.dumps({"sections": [{"title": "Intro", "content": "x"}], "suggested_exercises": []})


async def _poll_health_while_lesson_blocks() -> tuple[int, float, float, int]:
    """Poll /health for as long as the lesson runs; return the longest wait for any answer.

    The longest gap between consecutive answered polls bounds how long the event loop was frozen;
    a single probe could land before or after the block and prove nothing.
    """
    async with _app_client("student-1", "student") as client:
        started = time.perf_counter()
        lesson = asyncio.create_task(
            client.post("/api/lesson/personalized", json={"topic": "Functions", "student_uid": "student-1"})
        )
        answered_at = [time.perf_counter()]
        while not lesson.done():
            health = await client.get("/health")
            assert health.status_code == 200
            answered_at.append(time.perf_counter())
            await asyncio.sleep(0.02)
        lesson_response = await lesson
        longest_gap = max(later - earlier for earlier, later in zip(answered_at, answered_at[1:]))
        return lesson_response.status_code, longest_gap, time.perf_counter() - started, len(answered_at) - 1


def test_event_loop_guard_health_answers_while_ai_endpoint_blocks(app_auth, monkeypatch):
    inference = _BlockingInference()
    monkeypatch.setattr(main_module, "firebase_firestore", None)
    monkeypatch.setattr(main_module, "retrieve_curriculum_context", lambda **_kw: [])
    monkeypatch.setattr(main_module, "get_inference_client", lambda: inference)

    lesson_status, longest_gap, lesson_seconds, health_answers = asyncio.run(_poll_health_while_lesson_blocks())

    assert lesson_status == 200
    assert inference.calls == 1
    assert lesson_seconds >= LLM_BLOCK_SECONDS
    assert longest_gap < 0.5, f"/health went unanswered for {longest_gap:.2f}s behind a blocked LLM call"
    assert health_answers >= 5, "too few /health answers to say anything about the event loop"


# ─── 5. Durable async jobs (contract C3) edge cases ──────────────────────────────────────────────


class _Snapshot:
    def __init__(self, doc_id: str, store: dict[str, dict]) -> None:
        self.id = doc_id
        self._store = store
        self.exists = doc_id in store
        self.reference = _DocRef(doc_id, store)

    def to_dict(self) -> dict | None:
        return dict(self._store[self.id]) if self.exists else None


class _DocRef:
    def __init__(self, doc_id: str, store: dict[str, dict]) -> None:
        self.doc_id = doc_id
        self.store = store

    def set(self, fields: dict, merge: bool = False) -> None:
        current = self.store.get(self.doc_id, {}) if merge else {}
        self.store[self.doc_id] = {**current, **fields}

    def get(self) -> _Snapshot:
        return _Snapshot(self.doc_id, self.store)


class _JobsCollection:
    def __init__(self, store: dict[str, dict], filters: tuple[tuple[str, str, object], ...] = ()) -> None:
        self.store = store
        self.filters = filters

    def document(self, doc_id: str) -> _DocRef:
        return _DocRef(doc_id, self.store)

    def where(self, field: str, op: str, value: object) -> "_JobsCollection":
        return _JobsCollection(self.store, (*self.filters, (field, op, value)))

    def stream(self) -> list[_Snapshot]:
        def matches(fields: dict) -> bool:
            for field, op, value in self.filters:
                if op == "==" and fields.get(field) != value:
                    return False
                if op == "in" and fields.get(field) not in value:
                    return False
            return True

        return [_Snapshot(doc_id, self.store) for doc_id, fields in list(self.store.items()) if matches(fields)]


class _JobsFirestore:
    def __init__(self) -> None:
        self.store: dict[str, dict] = {}

    def collection(self, name: str) -> _JobsCollection:
        assert name == "aiJobs", f"unexpected collection {name}"
        return _JobsCollection(self.store)


@pytest.fixture
def jobs_db(monkeypatch):
    db = _JobsFirestore()
    monkeypatch.setattr(main_module, "get_firestore_client", lambda: db)
    return db


def _drain_job_mirror() -> None:
    main_module._ai_job_mirror_executor.submit(lambda: None).result(timeout=5)


LESSON_PLAN_RESULT = {"title": "Plan", "objectives": [["nested", "list"], ["ok"]], "score": 0.9}


async def _submit_lesson_plan_and_wait(jobs_db: _JobsFirestore) -> tuple[str, dict]:
    async with _app_client("teacher-1", "teacher") as client:
        submit = await client.post("/api/lesson/generate-async", json={"gradeLevel": "Grade 11"})
        assert submit.status_code == 200, submit.text
        task_id = submit.json()["taskId"]
        deadline = time.perf_counter() + 10
        while time.perf_counter() < deadline:
            _drain_job_mirror()
            if jobs_db.store.get(task_id, {}).get("status") == "completed":
                break
            await asyncio.sleep(0.05)
        return task_id, jobs_db.store.get(task_id, {})


def test_jobs_guard_async_submit_mirrors_completed_result_as_json_string(app_auth, jobs_db, monkeypatch):
    async def _fake_generate_lesson_plan(_http_request: object, _request: object) -> dict:
        return LESSON_PLAN_RESULT

    monkeypatch.setattr(main_module, "generate_lesson_plan", _fake_generate_lesson_plan)
    task_id, doc = asyncio.run(_submit_lesson_plan_and_wait(jobs_db))

    assert doc.get("status") == "completed", f"aiJobs/{task_id} never reached completed: {doc}"
    assert isinstance(doc["resultJson"], str), "Firestore rejects nested arrays; result must be stored as a string"
    assert json.loads(doc["resultJson"]) == LESSON_PLAN_RESULT
    assert "result" not in doc and "request" not in doc
    assert doc["ownerUid"] == "teacher-1"
    assert doc["taskKind"] == "lesson_generation"
    assert doc["backendId"] == main_module._AI_JOB_BACKEND_ID


def test_jobs_guard_interrupted_sweep_only_touches_live_jobs_of_this_backend(jobs_db):
    mine = main_module._AI_JOB_BACKEND_ID
    untouched = {
        "other_running": {"backendId": "other-space", "status": "running"},
        "other_queued": {"backendId": "other-space", "status": "queued"},
        "no_backend": {"status": "running"},
        "mine_failed": {"backendId": mine, "status": "failed", "error": {"code": "generation_failed"}},
        "mine_cancelled": {"backendId": mine, "status": "cancelled"},
        "mine_completed": {"backendId": mine, "status": "completed", "resultJson": "{}"},
    }
    jobs_db.store.update({doc_id: dict(fields) for doc_id, fields in untouched.items()})
    jobs_db.store["mine_running"] = {"backendId": mine, "status": "running"}

    assert main_module._mark_interrupted_async_jobs() == 1
    assert jobs_db.store["mine_running"]["status"] == "failed"
    assert jobs_db.store["mine_running"]["error"]["code"] == "interrupted"
    for doc_id, fields in untouched.items():
        assert jobs_db.store[doc_id] == fields, f"{doc_id} was modified by the interrupted-job sweep"


def test_jobs_guard_interrupted_sweep_is_fail_open(monkeypatch):
    def _unavailable() -> object:
        raise RuntimeError("Firestore is not initialized")

    monkeypatch.setattr(main_module, "get_firestore_client", _unavailable)
    assert main_module._mark_interrupted_async_jobs() == 0


def _firestore_only_job(task_id: str, **fields: object) -> dict:
    job = {
        "taskId": task_id,
        "taskKind": "quiz_generation",
        "ownerUid": "teacher-1",
        "status": "completed",
        "createdAt": "2026-10-09T00:00:00+00:00",
        "progressPercent": 100.0,
        "progressStage": "completed",
        "backendId": "previous-process",
    }
    job.update(fields)
    return job


async def _get_task(uid: str, role: str, task_id: str) -> httpx.Response:
    async with _app_client(uid, role) as client:
        return await client.get(f"/api/tasks/{task_id}")


def test_jobs_guard_status_fallback_forbids_non_owner(app_auth, jobs_db):
    jobs_db.store["task_fs_owned"] = _firestore_only_job("task_fs_owned", resultJson=json.dumps({"questions": []}))
    assert asyncio.run(_get_task("teacher-2", "teacher", "task_fs_owned")).status_code == 403
    assert asyncio.run(_get_task("student-9", "student", "task_fs_owned")).status_code == 403
    owner = asyncio.run(_get_task("teacher-1", "teacher", "task_fs_owned"))
    assert owner.status_code == 200
    assert owner.json()["result"] == {"questions": []}


def test_jobs_guard_status_fallback_survives_unparseable_result_json(app_auth, jobs_db):
    jobs_db.store["task_fs_corrupt"] = _firestore_only_job("task_fs_corrupt", resultJson="{not json")
    response = asyncio.run(_get_task("teacher-1", "teacher", "task_fs_corrupt"))
    assert response.status_code == 200
    assert response.json()["result"] is None
    assert response.json()["status"] == "completed"


def test_jobs_guard_status_fallback_passes_interrupted_code_to_client(app_auth, jobs_db):
    interrupted = {"code": "interrupted", "message": "Generation was interrupted by a server restart."}
    jobs_db.store["task_fs_lost"] = _firestore_only_job("task_fs_lost", status="failed", error=interrupted)
    body = asyncio.run(_get_task("teacher-1", "teacher", "task_fs_lost")).json()
    assert body["status"] == "failed"
    assert body["error"] == interrupted, "frontend resubmits only when error.code == 'interrupted'"


def test_jobs_guard_in_memory_task_does_not_read_firestore(app_auth, monkeypatch):
    def _firestore_must_not_be_read() -> object:
        raise AssertionError("status of an in-memory task must not hit Firestore")

    task_id = main_module._create_async_task("teacher-1", "quiz_generation", {})
    _drain_job_mirror()
    monkeypatch.setattr(main_module, "get_firestore_client", _firestore_must_not_be_read)
    try:
        response = asyncio.run(_get_task("teacher-1", "teacher", task_id))
        assert response.status_code == 200
        assert response.json()["status"] == "queued"
    finally:
        with main_module._async_tasks_lock:
            main_module._async_tasks.pop(task_id, None)
