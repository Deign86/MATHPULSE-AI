"""Blocking Claude, RAG and YouTube work reached from async endpoints runs on a worker thread.

These calls make network round trips and sleep between retries, so running them on the event loop's own
thread freezes every other request. Each test records the thread the blocking function ran on and compares
it with the thread that drives the loop (asyncio.run drives it on the calling test thread).

The last tests cover how _run_hf_blocking bounds those threads: a slot is held until its thread returns,
even when the caller that started the call has been cancelled.
"""
from __future__ import annotations

import asyncio
import gc
import importlib.util
import json
import threading
import time
from collections.abc import Callable
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

import main as main_module
from routes import at_risk_resolution, video_routes

BACKEND_DIR = Path(__file__).resolve().parents[1]


def _load_real_automation_engine():
    """test_api.py swaps sys.modules["automation_engine"] for a stub, so load the real file under its own name."""
    spec = importlib.util.spec_from_file_location("automation_engine_under_test", BACKEND_DIR / "automation_engine.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_at_risk_fallback_brief_is_generated_off_the_event_loop() -> None:
    loop_thread = threading.get_ident()
    ran_on: dict[str, int] = {}

    def retrieve(**_options: object) -> list[dict]:
        ran_on["retrieval"] = threading.get_ident()
        return []

    def complete(model: str, system_prompt: str, user_prompt: str, **_options: object) -> str:
        ran_on["completion"] = threading.get_ident()
        return json.dumps({"summary": "Quadratics review.", "key_concepts": ["factoring"]})

    resolved = at_risk_resolution.ResolvedTopic(
        topic_id="quadratics",
        subject="General Mathematics",
        quarter=1,
        confidence_score=0.0,
        resolution_state="coming_soon",
    )
    body = at_risk_resolution.ResolveRequest(
        uid="student-1",
        flagged_topics=[at_risk_resolution.FlaggedTopicInput(topic_id="quadratics", topic_name="Quadratic Equations")],
    )
    http_request = SimpleNamespace(state=SimpleNamespace(user=SimpleNamespace(role="teacher", uid="teacher-1")))

    with (
        patch.object(at_risk_resolution.fs, "client", return_value=MagicMock()),
        patch.object(at_risk_resolution, "_resolve_topic", return_value=resolved),
        patch.object(at_risk_resolution, "is_enabled", return_value=True),
        patch.object(at_risk_resolution, "retrieve_curriculum_context", retrieve),
        patch.object(at_risk_resolution, "rag_grounded_completion", complete),
    ):
        response = asyncio.run(at_risk_resolution.resolve_at_risk_topics(body, http_request))

    assert response.fallback_generated == 1
    assert ran_on.keys() == {"retrieval", "completion"}
    assert loop_thread not in ran_on.values()


@pytest.mark.parametrize(
    "generate",
    [
        lambda engine: engine._generate_learning_path(["Algebra"], [{"topic": "Factoring", "accuracy": 0.4}], "Grade 11"),
        lambda engine: engine._generate_teacher_interventions(
            {"Algebra": {"status": "At Risk"}}, [{"topic": "Factoring", "accuracy": 0.4}]
        ),
    ],
    ids=["learning-path", "teacher-interventions"],
)
def test_automation_engine_chat_calls_run_off_the_event_loop(generate) -> None:
    loop_thread = threading.get_ident()
    ran_on: list[int] = []

    def chat(*_args: object, **_options: object) -> str:
        ran_on.append(threading.get_ident())
        return "1. Review factoring."

    engine = _load_real_automation_engine().MathPulseAutomationEngine()
    with patch.object(main_module, "call_hf_chat", chat):
        reply = asyncio.run(generate(engine))

    assert reply == "1. Review factoring."
    assert ran_on
    assert loop_thread not in ran_on


def test_video_search_runs_the_blocking_lookup_off_the_event_loop() -> None:
    loop_thread = threading.get_ident()
    ran_on: list[int] = []

    def search(**_options: object) -> dict:
        ran_on.append(threading.get_ident())
        return {"videos": [], "cached": False}

    payload = video_routes.VideoSearchRequest(topic="quadratic equations")
    with patch.object(video_routes, "_get_youtube_service", return_value=(search, "test-key")):
        response = asyncio.run(video_routes.search_videos(None, payload))

    assert response.videos == []
    assert ran_on
    assert loop_thread not in ran_on


SLOTS = 2
# A worker thread the test never lets return, or a condition that never comes true, fails the test instead of hanging it.
THREAD_GUARD_SECONDS = 5
# How long a call that must stay queued is given to start anyway; the unbounded implementation starts it within a millisecond.
QUEUED_CALL_GRACE_SECONDS = 0.2


class HeldModelCalls:
    """A blocking model call whose worker thread stays busy until the test lets it return."""

    def __init__(self) -> None:
        self._may_return = threading.Event()
        self._failure: Exception | None = None
        self._lock = threading.Lock()
        self.started = 0
        self.running = 0
        self.peak_running = 0

    def __call__(self, reply: str) -> str:
        with self._lock:
            self.started += 1
            self.running += 1
            self.peak_running = max(self.peak_running, self.running)
        try:
            assert self._may_return.wait(THREAD_GUARD_SECONDS), "the test never let this model call return"
            if self._failure is not None:
                raise self._failure
            return reply
        finally:
            with self._lock:
                self.running -= 1

    def let_calls_return(self, failure: Exception | None = None) -> None:
        self._failure = failure
        self._may_return.set()


async def wait_until(condition: Callable[[], bool]) -> None:
    deadline = time.monotonic() + THREAD_GUARD_SECONDS
    while not condition():
        assert time.monotonic() < deadline, "the condition did not come true in time"
        await asyncio.sleep(0.005)


@pytest.fixture
def two_slot_pool(monkeypatch: pytest.MonkeyPatch) -> None:
    """_run_hf_blocking bounded to SLOTS threads, on a semaphore built fresh for this test's event loop."""
    monkeypatch.setattr(main_module, "HF_BLOCKING_CALL_CONCURRENCY", SLOTS)
    monkeypatch.setattr(main_module, "_hf_call_semaphore", None)
    monkeypatch.setattr(main_module, "_hf_call_semaphore_loop", None)


@pytest.mark.asyncio
@pytest.mark.usefixtures("two_slot_pool")
async def test_cancelled_model_calls_keep_their_slots_until_their_threads_return() -> None:
    model = HeldModelCalls()
    abandoned = [asyncio.create_task(main_module._run_hf_blocking(model, "abandoned")) for _ in range(SLOTS)]
    await wait_until(lambda: model.started == SLOTS)

    for call in abandoned:
        call.cancel()
    await asyncio.wait_for(asyncio.gather(*abandoned, return_exceptions=True), THREAD_GUARD_SECONDS)
    assert all(call.cancelled() for call in abandoned)

    replacement = asyncio.create_task(main_module._run_hf_blocking(model, "replacement"))
    await asyncio.sleep(QUEUED_CALL_GRACE_SECONDS)
    assert model.started == SLOTS, "a call started while every slot still belonged to a running thread"

    model.let_calls_return()
    assert await asyncio.wait_for(replacement, THREAD_GUARD_SECONDS) == "replacement"
    assert model.peak_running == SLOTS


@pytest.mark.asyncio
@pytest.mark.usefixtures("two_slot_pool")
async def test_a_caller_cancelled_while_queued_neither_leaks_nor_adds_a_slot() -> None:
    first_wave = HeldModelCalls()
    holders = [asyncio.create_task(main_module._run_hf_blocking(first_wave, "holder")) for _ in range(SLOTS)]
    await wait_until(lambda: first_wave.started == SLOTS)

    queued = [asyncio.create_task(main_module._run_hf_blocking(first_wave, "queued")) for _ in range(3)]
    await asyncio.sleep(0)
    assert not any(call.done() for call in queued), "the calls were meant to wait for a slot"
    for call in queued:
        call.cancel()
    await asyncio.wait_for(asyncio.gather(*queued, return_exceptions=True), THREAD_GUARD_SECONDS)
    assert first_wave.started == SLOTS

    first_wave.let_calls_return()
    assert await asyncio.wait_for(asyncio.gather(*holders), THREAD_GUARD_SECONDS) == ["holder"] * SLOTS

    second_wave = HeldModelCalls()
    later = [asyncio.create_task(main_module._run_hf_blocking(second_wave, "later")) for _ in range(SLOTS + 2)]
    await wait_until(lambda: second_wave.started == SLOTS)
    await asyncio.sleep(QUEUED_CALL_GRACE_SECONDS)
    assert second_wave.started == SLOTS, "the pool no longer holds exactly SLOTS slots"

    second_wave.let_calls_return()
    assert await asyncio.wait_for(asyncio.gather(*later), THREAD_GUARD_SECONDS) == ["later"] * (SLOTS + 2)


@pytest.mark.asyncio
@pytest.mark.usefixtures("two_slot_pool")
async def test_a_failure_after_its_caller_was_cancelled_is_not_left_unretrieved() -> None:
    model = HeldModelCalls()
    unretrieved_errors: list[dict[str, object]] = []
    loop = asyncio.get_running_loop()
    loop.set_exception_handler(lambda _loop, context: unretrieved_errors.append(context))

    try:
        call = asyncio.create_task(main_module._run_hf_blocking(model, "never delivered"))
        await wait_until(lambda: model.started == 1)
        call.cancel()
        await asyncio.gather(call, return_exceptions=True)
        # The cancelled call's traceback would keep the worker's task alive, and unreported, past the check below.
        del call

        model.let_calls_return(failure=RuntimeError("model unavailable"))
        await wait_until(lambda: model.running == 0)
        await asyncio.sleep(0.05)
        # A finished task that still holds an error nobody read reports it when it is collected.
        gc.collect()
        await asyncio.sleep(0)
    finally:
        loop.set_exception_handler(None)

    assert unretrieved_errors == []
