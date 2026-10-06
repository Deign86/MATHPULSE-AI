from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import main


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

    async def unexpected_llm_call(*_args: object, **_kwargs: object) -> str:
        raise AssertionError("DeepSeek must not run for a high-confidence direct request")

    monkeypatch.setattr(main, "route_student_intent", route_intent)
    monkeypatch.setattr(main, "call_hf_chat_async", unexpected_llm_call)

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
