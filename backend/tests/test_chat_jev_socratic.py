from __future__ import annotations

import asyncio
import gc
import logging
import os
import sys
import time
from collections.abc import Awaitable
from unittest.mock import AsyncMock

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import main

# Bounds every wait on a fake, so a regression to a sequential flow fails the test instead of hanging it.
DEADLOCK_GUARD_SECONDS = 2


@pytest.fixture(autouse=True)
def isolate_chat_dependencies(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(main, "HAS_MEMORY_SERVICE", False)
    monkeypatch.setattr(main, "HAS_FIREBASE_ADMIN", False)
    monkeypatch.setattr(main, "retrieve_curriculum_context", lambda **_: [])


@pytest.mark.asyncio
async def test_direct_answer_request_returns_socratic_response_without_llm(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def route_intent(_message: str) -> dict[str, object]:
        return {"choice": "direct_answer_request", "confidence": 0.93}

    # A raising fake would prove nothing here: chat_tutor drops the failure of an answer it abandoned.
    llm_call = AsyncMock(return_value="x = -3")

    monkeypatch.setattr(main, "route_student_intent", route_intent)
    monkeypatch.setattr(main, "call_hf_chat_async", llm_call)

    response = await main.chat_tutor(main.ChatRequest(message="Just give me the answer"))

    assert response.response == (
        "I can guide you step-by-step, but I won't give the final answer directly! "
        "What is the governing formula or first step you think we should use here?"
    )
    assert response.sources == []
    assert response.suggestedFollowups == [
        "What is the first step?",
        "Can you explain the formula?",
        "Give me a hint",
    ]
    assert response.confidence == 0.93
    assert response.activeModel == "jev-socratic-router"
    llm_call.assert_not_awaited()


@pytest.mark.asyncio
async def test_conceptual_question_uses_normal_chat_generation(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def route_intent(_message: str) -> dict[str, object]:
        return {"choice": "conceptual_confusion", "confidence": 0.91}

    observed_messages: list[dict[str, str]] = []

    async def normal_llm_call(messages: list[dict[str, str]], **_kwargs: object) -> str:
        observed_messages.extend(messages)
        return "A function maps each input to exactly one output."

    monkeypatch.setattr(main, "route_student_intent", route_intent)
    monkeypatch.setattr(main, "call_hf_chat_async", normal_llm_call)

    response = await main.chat_tutor(main.ChatRequest(message="What is a function?"))

    assert response.response == "A function maps each input to exactly one output."
    assert response.activeModel is None
    system_prompt = observed_messages[0]["content"]
    assert "Write EVERYTHING in English" in system_prompt
    assert "Respond in the student's language" not in system_prompt
    assert "Use the SDO Navotas step-by-step method for ALL solutions" in system_prompt
    assert "Never complete the calculation or reveal the final answer" not in system_prompt
    assert "Given → Formula → Substitute → Compute → Conclude" in system_prompt


@pytest.mark.asyncio
async def test_chat_system_prompt_requires_guidance_before_final_numeric_answer(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured_messages: list[dict[str, str]] = []

    async def route_intent(_message: str) -> dict[str, object]:
        return {"choice": "conceptual_confusion", "confidence": 0.91}

    async def capture_llm(messages: list[dict[str, str]], **_kwargs: object) -> str:
        captured_messages.extend(messages)
        return "What operation would isolate x first?"

    monkeypatch.setattr(main, "route_student_intent", route_intent)
    monkeypatch.setattr(main, "call_hf_chat_async", capture_llm)

    await main.chat_tutor(main.ChatRequest(message="What is the answer to 3x+9=0?"))

    system_prompt = captured_messages[0]["content"].lower()
    assert "do not give the final answer" in system_prompt
    assert "ask a guiding question first" in system_prompt


@pytest.mark.asyncio
async def test_jev_failure_fails_open_to_normal_chat_generation(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def failed_route(_message: str) -> dict[str, object]:
        raise RuntimeError("Jev unavailable")

    async def normal_llm_call(*_args: object, **_kwargs: object) -> str:
        return "Start by identifying the known values."

    monkeypatch.setattr(main, "route_student_intent", failed_route)
    monkeypatch.setattr(main, "call_hf_chat_async", normal_llm_call)

    response = await main.chat_tutor(main.ChatRequest(message="How do I start this problem?"))

    assert response.response == "Start by identifying the known values."


@pytest.fixture
def instant_context(monkeypatch: pytest.MonkeyPatch) -> None:
    """Context building takes no variable time, so the event-ordered fakes below decide the timing."""
    monkeypatch.setattr(main, "retrieve_chat_context", lambda _message: "")


def expected_guided_hint_reply(confidence: float) -> main.ChatResponse:
    return main.ChatResponse(
        response=(
            "I can guide you step-by-step, but I won't give the final answer directly! "
            "What is the governing formula or first step you think we should use here?"
        ),
        sources=[],
        suggestedFollowups=["What is the first step?", "Can you explain the formula?", "Give me a hint"],
        confidence=confidence,
        activeModel="jev-socratic-router",
    )


@pytest.mark.asyncio
@pytest.mark.usefixtures("instant_context")
async def test_first_turn_runs_the_intent_check_while_the_answer_is_generated(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    answer_started = asyncio.Event()
    answer_had_started_when_intent_returned: list[bool] = []

    async def route_intent(_message: str) -> dict[str, object]:
        await asyncio.wait_for(answer_started.wait(), DEADLOCK_GUARD_SECONDS)
        answer_had_started_when_intent_returned.append(answer_started.is_set())
        return {"choice": "conceptual_confusion", "confidence": 0.91}

    async def answer(_messages: list[dict[str, str]], **_kwargs: object) -> str:
        answer_started.set()
        return "A function maps each input to exactly one output."

    monkeypatch.setattr(main, "route_student_intent", route_intent)
    monkeypatch.setattr(main, "call_hf_chat_async", answer)

    response = await asyncio.wait_for(
        main.chat_tutor(main.ChatRequest(message="What is a function?")), DEADLOCK_GUARD_SECONDS * 2
    )

    assert answer_had_started_when_intent_returned == [True]
    assert response.response == "A function maps each input to exactly one output."


@pytest.mark.asyncio
@pytest.mark.usefixtures("instant_context")
async def test_guided_hint_reply_wins_and_cancels_the_answer_already_in_flight(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    answer_started = asyncio.Event()
    answer_cancelled = asyncio.Event()

    async def route_intent(_message: str) -> dict[str, object]:
        await asyncio.wait_for(answer_started.wait(), DEADLOCK_GUARD_SECONDS)
        return {"choice": "direct_answer_request", "confidence": 0.93}

    async def unfinished_answer(_messages: list[dict[str, str]], **_kwargs: object) -> str:
        answer_started.set()
        try:
            await asyncio.sleep(3600)
        except asyncio.CancelledError:
            answer_cancelled.set()
            raise
        return "The reply of a task that was never cancelled."

    monkeypatch.setattr(main, "route_student_intent", route_intent)
    monkeypatch.setattr(main, "call_hf_chat_async", unfinished_answer)

    response = await asyncio.wait_for(
        main.chat_tutor(main.ChatRequest(message="Just give me the answer")), DEADLOCK_GUARD_SECONDS * 2
    )

    assert response == expected_guided_hint_reply(confidence=0.93)
    await asyncio.wait_for(answer_cancelled.wait(), DEADLOCK_GUARD_SECONDS)


@pytest.mark.asyncio
@pytest.mark.usefixtures("instant_context")
async def test_intent_failure_while_the_answer_is_in_flight_still_returns_the_answer(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    answer_started = asyncio.Event()
    intent_failed = asyncio.Event()

    async def failing_route(_message: str) -> dict[str, object]:
        await asyncio.wait_for(answer_started.wait(), DEADLOCK_GUARD_SECONDS)
        intent_failed.set()
        raise RuntimeError("Jev unavailable")

    async def answer_after_the_intent_failure(_messages: list[dict[str, str]], **_kwargs: object) -> str:
        answer_started.set()
        await asyncio.wait_for(intent_failed.wait(), DEADLOCK_GUARD_SECONDS)
        return "Start by identifying the known values."

    monkeypatch.setattr(main, "route_student_intent", failing_route)
    monkeypatch.setattr(main, "call_hf_chat_async", answer_after_the_intent_failure)
    caplog.set_level(logging.WARNING)

    response = await asyncio.wait_for(
        main.chat_tutor(main.ChatRequest(message="How do I start this problem?")), DEADLOCK_GUARD_SECONDS * 2
    )

    assert response.response == "Start by identifying the known values."
    assert "Jev intent routing failed; continuing with chat: Jev unavailable" in caplog.text


@pytest.mark.asyncio
@pytest.mark.usefixtures("instant_context")
async def test_guided_hint_reply_survives_a_failed_answer_without_a_leaked_task_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    answer_failed = asyncio.Event()
    unhandled_task_errors: list[dict[str, object]] = []
    loop = asyncio.get_running_loop()
    loop.set_exception_handler(lambda _loop, context: unhandled_task_errors.append(context))

    async def route_intent(_message: str) -> dict[str, object]:
        await asyncio.wait_for(answer_failed.wait(), DEADLOCK_GUARD_SECONDS)
        return {"choice": "direct_answer_request", "confidence": 0.93}

    async def failing_answer(_messages: list[dict[str, str]], **_kwargs: object) -> str:
        answer_failed.set()
        raise RuntimeError("model unavailable")

    monkeypatch.setattr(main, "route_student_intent", route_intent)
    monkeypatch.setattr(main, "call_hf_chat_async", failing_answer)

    try:
        response = await asyncio.wait_for(
            main.chat_tutor(main.ChatRequest(message="Just give me the answer")), DEADLOCK_GUARD_SECONDS * 2
        )
        # A finished task that still holds an error nobody read reports it when it is collected.
        gc.collect()
        await asyncio.sleep(0)
    finally:
        loop.set_exception_handler(None)

    assert response == expected_guided_hint_reply(confidence=0.93)
    assert unhandled_task_errors == []


@pytest.mark.asyncio
@pytest.mark.usefixtures("instant_context")
async def test_guided_reply_wins_over_an_answer_that_already_finished(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    answer_finished = asyncio.Event()

    async def route_intent(_message: str) -> dict[str, object]:
        await asyncio.wait_for(answer_finished.wait(), DEADLOCK_GUARD_SECONDS)
        return {"choice": "direct_answer_request", "confidence": 0.93}

    async def answer_that_finishes_first(_messages: list[dict[str, str]], **_kwargs: object) -> str:
        answer_finished.set()
        return "x = -3"

    monkeypatch.setattr(main, "route_student_intent", route_intent)
    monkeypatch.setattr(main, "call_hf_chat_async", answer_that_finishes_first)

    response = await asyncio.wait_for(
        main.chat_tutor(main.ChatRequest(message="Just give me the answer")), DEADLOCK_GUARD_SECONDS * 2
    )

    assert response == expected_guided_hint_reply(confidence=0.93)


@pytest.mark.asyncio
@pytest.mark.usefixtures("instant_context")
async def test_a_verdict_that_is_already_in_means_the_answer_is_never_created(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    answers_created: list[int] = []
    create_answer = main._timed_chat_answer

    def record_created_answer(messages: list[dict[str, str]]) -> Awaitable[str]:
        answers_created.append(len(messages))
        return create_answer(messages)

    async def route_intent(_message: str) -> dict[str, object]:
        return {"choice": "direct_answer_request", "confidence": 0.93}

    monkeypatch.setattr(main, "route_student_intent", route_intent)
    monkeypatch.setattr(main, "_timed_chat_answer", record_created_answer)

    response = await asyncio.wait_for(
        main.chat_tutor(main.ChatRequest(message="Just give me the answer")), DEADLOCK_GUARD_SECONDS
    )

    assert response == expected_guided_hint_reply(confidence=0.93)
    assert answers_created == []


class SteppedClock:
    """The `time` module as the chat route sees it: monotonic() moves only when a fake advances it."""

    def __init__(self) -> None:
        self.now = 1000.0

    def monotonic(self) -> float:
        return self.now

    def __getattr__(self, name: str) -> object:
        return getattr(time, name)


@pytest.mark.asyncio
@pytest.mark.usefixtures("instant_context")
async def test_model_call_timing_excludes_the_wait_for_the_intent_verdict(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    clock = SteppedClock()
    answer_finished = asyncio.Event()

    async def route_intent(_message: str) -> dict[str, object]:
        await asyncio.wait_for(answer_finished.wait(), DEADLOCK_GUARD_SECONDS)
        clock.now += 5.0
        return {"choice": "conceptual_confusion", "confidence": 0.91}

    async def answer_that_takes_a_second_and_a_quarter(_messages: list[dict[str, str]], **_kwargs: object) -> str:
        clock.now += 1.25
        answer_finished.set()
        return "A function maps each input to exactly one output."

    monkeypatch.setattr(main, "time", clock)
    monkeypatch.setattr(main, "route_student_intent", route_intent)
    monkeypatch.setattr(main, "call_hf_chat_async", answer_that_takes_a_second_and_a_quarter)
    caplog.set_level(logging.INFO, logger="mathpulse")

    response = await asyncio.wait_for(
        main.chat_tutor(main.ChatRequest(message="What is a function?")), DEADLOCK_GUARD_SECONDS * 2
    )

    assert response.response == "A function maps each input to exactly one output."
    assert "TIMING [model_call] 1250ms | messages=2" in caplog.text
