import pytest

from services import jev_client


@pytest.mark.asyncio
async def test_missing_key_uses_deterministic_fallbacks(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("TYPESAFE_API_KEY", raising=False)

    assert await jev_client.route_student_intent("I am stuck") == {
        "action": "fallback_disabled",
        "choice": "conceptual_confusion",
    }
    assert await jev_client.verify_lesson_factuality("x", "y") == {
        "action": "fallback_disabled",
        "verified": True,
    }
    assert await jev_client.score_student_mastery([], "algebra") == {
        "action": "fallback_disabled",
        "pCorrect": 1.0,
        "level": 0,
    }
    assert await jev_client.verify_solution_safety("x", "y") == {
        "action": "fallback_disabled",
        "pLeak": 0.0,
        "safe": True,
    }


@pytest.mark.asyncio
async def test_empty_key_is_treated_as_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("TYPESAFE_API_KEY", "   ")

    response = await jev_client.route_student_intent("hello")

    assert response["action"] == "fallback_disabled"
    assert response["choice"] == "conceptual_confusion"


@pytest.mark.asyncio
async def test_sdk_failure_returns_fallback(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("TYPESAFE_API_KEY", "test-key")

    async def fail_system_one(state: dict[str, object], questions: dict[str, object]) -> object:
        raise TimeoutError("network timeout")

    monkeypatch.setattr(jev_client, "_system_one", fail_system_one)

    response = await jev_client.verify_solution_safety("reference", "student")

    assert response == {"action": "fallback_disabled", "pLeak": 0.0, "safe": True}
