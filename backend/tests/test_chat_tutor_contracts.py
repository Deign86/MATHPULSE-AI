"""Group C contracts: chat flood throttle + Socratic prompt pins (STU-016/019/033)."""

import pytest
from fastapi import HTTPException

import main
from middleware.rate_limiter import reset_chat_flood_state


@pytest.fixture(autouse=True)
def _clean_flood_state():
    reset_chat_flood_state()
    yield
    reset_chat_flood_state()


async def _eleven_rapid_calls(monkeypatch: pytest.MonkeyPatch):
    async def route_intent(_message: str) -> dict[str, object]:
        return {"choice": "conceptual_confusion", "confidence": 0.91}

    async def normal_llm_call(*_args: object, **_kwargs: object) -> str:
        return "A function maps each input to exactly one output."

    monkeypatch.setattr(main, "route_student_intent", route_intent)
    monkeypatch.setattr(main, "call_hf_chat_async", normal_llm_call)
    monkeypatch.setattr(main, "HAS_MEMORY_SERVICE", False)
    monkeypatch.setattr(main, "HAS_FIREBASE_ADMIN", False)
    outcomes = []
    for _ in range(11):
        try:
            await main.chat_tutor(main.ChatRequest(message="What is a function?", userId="flood-qa-student"))
            outcomes.append("ok")
        except HTTPException as exc:
            outcomes.append(exc.status_code)
    return outcomes


@pytest.mark.asyncio
async def test_eleventh_rapid_authenticated_message_is_throttled(monkeypatch: pytest.MonkeyPatch):
    outcomes = await _eleven_rapid_calls(monkeypatch)
    assert outcomes[:10] == ["ok"] * 10
    assert outcomes[10] == 429


@pytest.mark.asyncio
async def test_throttle_error_carries_retry_after_and_friendly_detail():
    from middleware.rate_limiter import check_chat_flood

    reset_chat_flood_state()
    for _ in range(10):
        check_chat_flood("retry-qa-student")
    try:
        check_chat_flood("retry-qa-student")
        raise AssertionError("expected HTTPException 429")
    except HTTPException as exc:
        assert exc.status_code == 429
        assert exc.headers is not None and exc.headers.get("Retry-After") == "60"
        assert "too fast" in str(exc.detail).lower()


@pytest.mark.asyncio
async def test_calls_without_user_id_never_throttle(monkeypatch: pytest.MonkeyPatch):
    async def route_intent(_message: str) -> dict[str, object]:
        return {"choice": "conceptual_confusion", "confidence": 0.91}

    async def normal_llm_call(*_args: object, **_kwargs: object) -> str:
        return "ok"

    monkeypatch.setattr(main, "route_student_intent", route_intent)
    monkeypatch.setattr(main, "call_hf_chat_async", normal_llm_call)
    monkeypatch.setattr(main, "HAS_MEMORY_SERVICE", False)
    monkeypatch.setattr(main, "HAS_FIREBASE_ADMIN", False)
    for _ in range(12):
        response = await main.chat_tutor(main.ChatRequest(message="What is a function?"))
        assert response.response == "ok"


def test_socratic_prompt_pins_present():
    prompt = main.MATH_TUTOR_SYSTEM_PROMPT
    assert "NEVER give direct answers to quiz or exam items" in prompt
    assert "ask one guiding question first" in prompt
    assert "Solve ONLY the problem the student actually asked" in prompt
    assert "never substitute your own numbers or equations" in prompt
