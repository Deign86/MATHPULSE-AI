"""Backend runtime performance contracts: retries, routing, verification, executor, durable jobs, roles."""
from __future__ import annotations

import asyncio
import json
import os
import threading
import time
from types import SimpleNamespace
from typing import Callable
from unittest.mock import MagicMock, patch

import anthropic
import httpx2
import pytest

os.environ.setdefault("ANTHROPIC_API_KEY", "mock-key-for-testing")

import main as main_module
from routes import rag_routes
from services import ai_client
from services import inference_client as inference_module
from services.inference_client import (
    InferenceAuthError,
    InferenceClient,
    InferenceConnectionError,
    InferenceRequest,
)

API_REQUEST = httpx2.Request("POST", "https://api.anthropic.com/v1/messages")


def _status_error(error_class: type[anthropic.APIStatusError], status: int) -> anthropic.APIStatusError:
    return error_class("request failed", response=httpx2.Response(status, request=API_REQUEST), body=None)


def _timeout_error() -> Exception:
    return ai_client.APITimeoutError(request=API_REQUEST)


class _AlwaysFailing:
    """Stands in for create_message: every call raises the error `make_error` builds, and calls are counted."""

    def __init__(self, make_error: Callable[[], Exception]) -> None:
        self.make_error = make_error
        self.calls = 0

    def __call__(self, *_args: object, **_kwargs: object) -> object:
        self.calls += 1
        raise self.make_error()


def _chat_request(max_retries: int | None = None, task_type: str = "chat") -> InferenceRequest:
    return InferenceRequest(
        messages=[{"role": "user", "content": "hi"}],
        model=ai_client.CHAT_MODEL,
        task_type=task_type,
        max_retries=max_retries,
    )


def _run_failing_call(make_error: Callable[[], Exception], max_retries: int | None) -> tuple[int, Exception]:
    """Run one call whose every attempt fails; return how many attempts were made and the error it raised."""
    failing = _AlwaysFailing(make_error)
    with patch.object(inference_module, "create_message", failing), patch.object(
        inference_module.time, "sleep", lambda _s: None
    ):
        with pytest.raises(Exception) as raised:
            InferenceClient()._call_claude(_chat_request(max_retries), 0)
    return failing.calls, raised.value


def _call_with_max_retries(max_retries: int | None) -> int:
    attempts, _error = _run_failing_call(_timeout_error, max_retries)
    return attempts


def _reply(text: str) -> SimpleNamespace:
    """The parts of a Claude message that InferenceClient reads."""
    return SimpleNamespace(
        stop_reason="end_turn",
        content=[SimpleNamespace(type="text", text=text)],
        usage=SimpleNamespace(input_tokens=12, output_tokens=34),
    )


def test_retries_shared_client_disables_sdk_retries():
    ai_client.get_anthropic_client.cache_clear()
    try:
        assert ai_client.get_anthropic_client().max_retries == 0
    finally:
        ai_client.get_anthropic_client.cache_clear()


def test_retries_request_override_limits_attempts():
    assert _call_with_max_retries(1) == 1
    assert _call_with_max_retries(2) == 2


def test_retries_profile_used_when_request_has_no_override():
    inference = InferenceClient()
    expected, _ = inference._retry_profile("chat")
    assert _call_with_max_retries(None) == expected


def test_retries_override_survives_fallback_copy():
    seen: list[int | None] = []
    inference = InferenceClient()

    def _capture(request: InferenceRequest, _depth: int) -> str:
        seen.append(request.max_retries)
        return "ok"

    with patch.object(inference, "_call_claude", _capture):
        inference.generate_from_messages(
            InferenceRequest(messages=[{"role": "user", "content": "x"}], task_type="chat", max_retries=1)
        )
    assert seen == [1]


@pytest.mark.parametrize(
    "make_error",
    [
        _timeout_error,
        lambda: _status_error(ai_client.RateLimitError, 429),
        lambda: _status_error(anthropic.InternalServerError, 500),
    ],
    ids=["timeout", "rate_limit", "server_error"],
)
def test_retries_transient_errors_use_every_attempt_then_raise_runtime_error(make_error):
    attempts, error = _run_failing_call(make_error, 3)
    assert attempts == 3
    assert type(error) is RuntimeError


@pytest.mark.parametrize(
    ("make_error", "expected_error", "expected_status"),
    [
        (lambda: _status_error(anthropic.AuthenticationError, 401), InferenceAuthError, 401),
        (lambda: _status_error(anthropic.PermissionDeniedError, 403), InferenceAuthError, 403),
        (lambda: anthropic.APIConnectionError(request=API_REQUEST), InferenceConnectionError, None),
    ],
    ids=["unauthorized", "forbidden", "connection"],
)
def test_retries_auth_and_connection_failures_fail_fast(make_error, expected_error, expected_status):
    attempts, error = _run_failing_call(make_error, 3)
    assert attempts == 1
    assert isinstance(error, expected_error)
    assert error.status_code == expected_status


def test_retries_refusal_fails_without_retry():
    refusal = SimpleNamespace(
        stop_reason="refusal",
        stop_details=SimpleNamespace(category="cyber"),
        content=[],
        usage=SimpleNamespace(input_tokens=5, output_tokens=0),
    )
    attempts: list[int] = []

    def _refuse(*_args: object, **_kwargs: object) -> SimpleNamespace:
        attempts.append(1)
        return refusal

    with patch.object(inference_module, "create_message", _refuse), patch.object(
        inference_module.time, "sleep", lambda _s: None
    ):
        with pytest.raises(ai_client.AIRefusalError):
            InferenceClient()._call_claude(_chat_request(max_retries=3), 0)
    assert len(attempts) == 1


def test_call_claude_logs_real_token_usage():
    with patch.object(inference_module, "create_message", lambda *_a, **_k: _reply("done")), patch.object(
        inference_module, "log_model_call"
    ) as log_call:
        text = InferenceClient()._call_claude(_chat_request(), 0)
    assert text == "done"
    logged = log_call.call_args.kwargs
    assert (logged["status"], logged["input_tokens"], logged["output_tokens"]) == ("ok", 12, 34)
    assert logged["provider"] == "anthropic"


@pytest.mark.parametrize(
    ("task_type", "json_output"),
    [("chat", False), ("quiz_generation", True)],
)
def test_call_claude_asks_for_json_only_for_quiz_generation(task_type, json_output):
    seen: dict[str, object] = {}

    def _create(messages: object, **options: object) -> SimpleNamespace:
        seen.update(options)
        return _reply('```json\n{"questions": []}\n```')

    with patch.object(inference_module, "create_message", _create):
        text = InferenceClient()._call_claude(_chat_request(task_type=task_type), 0)

    assert seen["json_output"] is json_output
    assert seen["model"] == ai_client.CHAT_MODEL
    assert text == ('{"questions": []}' if json_output else '```json\n{"questions": []}\n```')


def test_rag_completion_returns_reply_text_and_logs_token_usage():
    sent: dict[str, object] = {}

    def _create(messages: object, **options: object) -> SimpleNamespace:
        sent.update(messages=messages, options=options)
        return _reply("grounded answer")

    with patch.object(inference_module, "create_message", _create), patch.object(inference_module, "LOGGER") as log:
        text = inference_module.rag_grounded_completion(
            ai_client.REASONER_MODEL, "Be precise.", "What is 2 + 2?", timeout_sec=12.0, max_tokens=999
        )

    assert text == "grounded answer"
    assert sent["messages"] == [
        {"role": "system", "content": "Be precise."},
        {"role": "user", "content": "What is 2 + 2?"},
    ]
    assert sent["options"] == {"model": ai_client.REASONER_MODEL, "max_tokens": 999, "timeout": 12.0}
    assert log.info.call_args.args[2:] == (12, 34, 46)


def test_rag_completion_skips_the_call_when_ai_is_disabled():
    with patch.object(inference_module, "AI_ENABLED", False), patch.object(
        inference_module, "create_message"
    ) as create:
        assert inference_module.rag_grounded_completion(ai_client.CHAT_MODEL, "system", "user") is None
    create.assert_not_called()


def test_rag_completion_retries_a_rate_limit_then_returns_text():
    outcomes = iter([_status_error(ai_client.RateLimitError, 429), _reply("recovered")])

    def _create(*_args: object, **_options: object) -> SimpleNamespace:
        outcome = next(outcomes)
        if isinstance(outcome, Exception):
            raise outcome
        return outcome

    with patch.object(inference_module, "create_message", _create), patch.object(
        inference_module.time, "sleep", lambda _s: None
    ):
        assert inference_module.rag_grounded_completion(ai_client.CHAT_MODEL, "system", "user") == "recovered"


def test_rag_completion_gives_up_after_repeated_rate_limits():
    failing = _AlwaysFailing(lambda: _status_error(ai_client.RateLimitError, 429))
    with patch.object(inference_module, "create_message", failing), patch.object(
        inference_module.time, "sleep", lambda _s: None
    ):
        assert inference_module.rag_grounded_completion(ai_client.CHAT_MODEL, "system", "user") is None
    assert failing.calls == inference_module._MAX_RETRIES


@pytest.mark.parametrize(
    "make_error",
    [
        _timeout_error,
        lambda: _status_error(anthropic.AuthenticationError, 401),
        lambda: ai_client.AIRefusalError("declined"),
    ],
    ids=["timeout", "unauthorized", "refusal"],
)
def test_rag_completion_returns_none_on_other_failures_without_retry(make_error):
    failing = _AlwaysFailing(make_error)
    with patch.object(inference_module, "create_message", failing), patch.object(
        inference_module.time, "sleep", lambda _s: None
    ):
        assert inference_module.rag_grounded_completion(ai_client.CHAT_MODEL, "system", "user") is None
    assert failing.calls == 1


def test_prod_profile_keeps_verification_on_the_chat_model_and_lessons_on_the_reasoner(monkeypatch):
    """The HF Space runs MODEL_PROFILE=prod: that profile, not models.yaml, decides what these tasks run on."""
    monkeypatch.delenv("INFERENCE_ENFORCE_LOCK_MODEL", raising=False)
    monkeypatch.setattr(inference_module, "_RUNTIME_OVERRIDES", {})
    monkeypatch.setattr(inference_module, "_RUNTIME_PROFILE", "")
    monkeypatch.setattr(rag_routes, "_inference_client", None)
    for key in inference_module._MODEL_PROFILES["prod"]:
        monkeypatch.setenv(key, "")
    monkeypatch.setenv("MODEL_PROFILE", "prod")
    inference_module._apply_model_profile()

    verification_model, _source = InferenceClient()._resolve_primary_model(
        InferenceRequest(messages=[], task_type="verify_solution")
    )

    assert verification_model == ai_client.CHAT_MODEL
    assert rag_routes._lesson_primary_model() == ai_client.REASONER_MODEL


def test_verification_samples_run_concurrently_with_same_voting():
    active = 0
    peak = 0
    guard = threading.Lock()
    answers = iter(["42", "42", "7"])

    async def _slow_chat(*_args: object, **_kwargs: object) -> str:
        nonlocal active, peak
        with guard:
            active += 1
            peak = max(peak, active)
        await asyncio.sleep(0.05)
        with guard:
            active -= 1
        return f"The final answer is {next(answers)}"

    with patch.object(main_module, "call_hf_chat_async", _slow_chat), patch.object(
        main_module, "_extract_final_answer", lambda text: text.rsplit(" ", 1)[-1]
    ):
        result = asyncio.run(main_module.verify_math_response("2*21", [{"role": "user", "content": "2*21"}]))

    assert peak == main_module.VERIFICATION_SAMPLES
    assert result["verified"] is True
    assert result["confidence"] == "medium"
    assert result["response"].endswith("42")


def test_verification_failed_sample_is_ignored_like_before():
    calls = iter([RuntimeError("boom"), "x 5", "x 5"])

    async def _chat(*_args: object, **_kwargs: object) -> str:
        item = next(calls)
        if isinstance(item, Exception):
            raise item
        return item

    with patch.object(main_module, "call_hf_chat_async", _chat), patch.object(
        main_module, "_extract_final_answer", lambda text: text.rsplit(" ", 1)[-1]
    ):
        result = asyncio.run(main_module.verify_math_response("p", [{"role": "user", "content": "p"}]))
    assert result["verified"] is True
    assert result["confidence"] == "high"


def test_executor_lifespan_installs_large_default_pool():
    captured: dict[str, int] = {}
    loop_holder: dict[str, asyncio.AbstractEventLoop] = {}

    async def _run() -> None:
        loop = asyncio.get_running_loop()
        loop_holder["loop"] = loop
        original = loop.set_default_executor

        def _spy(executor: object) -> None:
            captured["workers"] = executor._max_workers  # SAFETY: ThreadPoolExecutor exposes its size only here
            original(executor)

        loop.set_default_executor = _spy  # type: ignore[method-assign]
        with patch.object(main_module, "_init_firebase_admin", lambda: None), patch.object(
            main_module, "_mark_interrupted_async_jobs", lambda: 0
        ), patch.object(main_module, "validate_anthropic_auth", lambda *_a, **_k: {"status": "ok", "key_suffix": "x"}), patch.object(
            main_module, "get_inference_client", lambda: None
        ), patch(
            "rag.vectorstore_loader.get_vectorstore_health", lambda: {"chunkCount": 1, "subjects": {}}
        ):
            async with main_module.app_lifespan(main_module.app):
                pass

    with patch.dict(os.environ, {"BLOCKING_IO_THREADS": "32"}):
        asyncio.run(_run())
    assert captured["workers"] >= 32


class _FakeSnapshot:
    def __init__(self, doc_id: str, data: dict | None, store: dict) -> None:
        self.id = doc_id
        self._data = data
        self.exists = data is not None
        self.reference = _FakeDocRef(doc_id, store)

    def to_dict(self) -> dict | None:
        return dict(self._data) if self._data is not None else None


class _FakeDocRef:
    def __init__(self, doc_id: str, store: dict) -> None:
        self.doc_id = doc_id
        self.store = store

    def set(self, data: dict, merge: bool = False) -> None:
        for value in data.values():
            _assert_no_nested_list(value)
        current = self.store.get(self.doc_id, {}) if merge else {}
        self.store[self.doc_id] = {**current, **data}

    def get(self) -> _FakeSnapshot:
        return _FakeSnapshot(self.doc_id, self.store.get(self.doc_id), self.store)


def _assert_no_nested_list(value: object) -> None:
    if isinstance(value, list):
        assert not any(isinstance(item, list) for item in value), "Firestore rejects nested arrays"
        for item in value:
            _assert_no_nested_list(item)
    elif isinstance(value, dict):
        for item in value.values():
            _assert_no_nested_list(item)


class _FakeQuery:
    def __init__(self, store: dict) -> None:
        self.store = store
        self.filters: list[tuple[str, str, object]] = []

    def where(self, field: str, op: str, value: object) -> "_FakeQuery":
        self.filters.append((field, op, value))
        return self

    def stream(self) -> list[_FakeSnapshot]:
        def _match(data: dict) -> bool:
            for field, op, value in self.filters:
                if op == "==" and data.get(field) != value:
                    return False
                if op == "in" and data.get(field) not in value:
                    return False
            return True

        return [_FakeSnapshot(doc_id, data, self.store) for doc_id, data in list(self.store.items()) if _match(data)]


class _FakeCollection(_FakeQuery):
    def document(self, doc_id: str) -> _FakeDocRef:
        return _FakeDocRef(doc_id, self.store)


class _FakeFirestore:
    def __init__(self) -> None:
        self.store: dict[str, dict] = {}

    def collection(self, name: str) -> _FakeCollection:
        assert name == "aiJobs"
        return _FakeCollection(self.store)


def _drain_mirror() -> None:
    main_module._ai_job_mirror_executor.submit(lambda: None).result(timeout=5)


@pytest.fixture
def fake_db():
    db = _FakeFirestore()
    with patch.object(main_module, "get_firestore_client", return_value=db):
        yield db


def test_jobs_create_and_update_mirror_to_firestore(fake_db):
    task_id = main_module._create_async_task("teacher-1", "quiz_generation", {"topic": "x"})
    main_module._update_async_task(task_id, progressPercent=40.0, progressStage="generating")
    _drain_mirror()

    doc = fake_db.store[task_id]
    assert doc["ownerUid"] == "teacher-1"
    assert doc["taskKind"] == "quiz_generation"
    assert doc["status"] == "queued"
    assert doc["progressStage"] == "generating"
    assert doc["backendId"] == main_module._AI_JOB_BACKEND_ID
    assert "updatedAt" in doc
    assert "request" not in doc


def test_jobs_completed_result_stored_as_json_string(fake_db):
    async def _runner() -> dict:
        return {"questions": [[1, 2], [3]]}

    task_id = main_module._create_async_task("teacher-1", "quiz_generation", {})
    asyncio.run(main_module._run_async_task(task_id, _runner))
    _drain_mirror()

    doc = fake_db.store[task_id]
    assert doc["status"] == "completed"
    assert json.loads(doc["resultJson"]) == {"questions": [[1, 2], [3]]}
    assert "result" not in doc


def test_jobs_mirror_is_fail_open_when_firestore_unavailable():
    with patch.object(main_module, "get_firestore_client", side_effect=RuntimeError("Firestore is not initialized")):
        task_id = main_module._create_async_task("u", "lesson_generation", {})
        main_module._update_async_task(task_id, progressPercent=50.0)
        _drain_mirror()
    assert main_module._async_tasks[task_id]["progressPercent"] == 50.0


def test_jobs_startup_marks_only_same_backend_running_jobs_failed(fake_db):
    mine = main_module._AI_JOB_BACKEND_ID
    fake_db.store.update(
        {
            "a": {"backendId": mine, "status": "running"},
            "b": {"backendId": mine, "status": "queued"},
            "c": {"backendId": mine, "status": "completed"},
            "d": {"backendId": "other-space", "status": "running"},
        }
    )
    assert main_module._mark_interrupted_async_jobs() == 2
    for doc_id in ("a", "b"):
        assert fake_db.store[doc_id]["status"] == "failed"
        assert fake_db.store[doc_id]["error"] == {
            "code": "interrupted",
            "message": "Generation was interrupted by a server restart.",
        }
    assert fake_db.store["c"]["status"] == "completed"
    assert fake_db.store["d"]["status"] == "running"


def _status_request(uid: str, role: str) -> SimpleNamespace:
    user = main_module.AuthenticatedUser(uid=uid, role=role)
    return SimpleNamespace(state=SimpleNamespace(user=user))


def test_jobs_status_falls_back_to_firestore_with_owner_check(fake_db):
    fake_db.store["task_gone"] = {
        "taskId": "task_gone",
        "taskKind": "quiz_generation",
        "ownerUid": "teacher-1",
        "status": "completed",
        "createdAt": "2026-01-01T00:00:00+00:00",
        "progressPercent": 100.0,
        "progressStage": "completed",
        "resultJson": json.dumps({"questions": [1]}),
        "backendId": "local",
    }

    owner = asyncio.run(main_module.get_async_task_status(_status_request("teacher-1", "teacher"), "task_gone"))
    assert owner.status == "completed"
    assert owner.result == {"questions": [1]}

    admin = asyncio.run(main_module.get_async_task_status(_status_request("root", "admin"), "task_gone"))
    assert admin.taskId == "task_gone"

    with pytest.raises(main_module.HTTPException) as forbidden:
        asyncio.run(main_module.get_async_task_status(_status_request("other", "teacher"), "task_gone"))
    assert forbidden.value.status_code == 403

    with pytest.raises(main_module.HTTPException) as missing:
        asyncio.run(main_module.get_async_task_status(_status_request("teacher-1", "teacher"), "task_nope"))
    assert missing.value.status_code == 404


@pytest.mark.parametrize("path", ["/api/rag/lesson/stream", "/api/rag/lesson/prefetch"])
def test_role_lesson_subroutes_allow_all_app_roles(path):
    assert main_module.ROLE_POLICIES[path] == main_module.ALL_APP_ROLES
    assert main_module.resolve_required_roles(path) == main_module.ALL_APP_ROLES
