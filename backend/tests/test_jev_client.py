from __future__ import annotations

import asyncio
import json
import logging
import threading
import time
from typing import Any, Awaitable, Callable, Mapping

import anthropic
import httpx2
import pytest

from services import jev_client
from services.ai_client import CHAT_MODEL, AIRefusalError

REQUEST = httpx2.Request("POST", "https://api.anthropic.com/v1/messages")

INTENT_CATEGORIES = (
    "direct_answer_request",
    "conceptual_confusion",
    "calculation_error",
    "off_topic_or_frustrated",
)

JudgmentCall = Callable[[], Awaitable[Any]]

FALLBACK_CASES = [
    pytest.param(
        lambda: jev_client.route_student_intent("I am stuck"),
        {"action": "fallback_disabled", "choice": "conceptual_confusion"},
        id="intent",
    ),
    pytest.param(
        lambda: jev_client.verify_lesson_factuality("x", "y"),
        {"action": "fallback_disabled", "verified": True},
        id="factuality",
    ),
    pytest.param(
        lambda: jev_client.score_student_mastery([], "algebra"),
        {"action": "fallback_disabled", "pCorrect": 1.0, "level": 0},
        id="mastery",
    ),
    pytest.param(
        lambda: jev_client.verify_solution_safety("x", "y"),
        {"action": "fallback_disabled", "pLeak": 0.0, "safe": True},
        id="safety",
    ),
]

# A reply every judgment maps to a success shape, so a fallback can only come from the failure under test.
REPLY_FOR_ANY_JUDGMENT = {
    "direct_answer_request": 0.9,
    "conceptual_confusion": 0.05,
    "calculation_error": 0.03,
    "off_topic_or_frustrated": 0.02,
    "supported_probability": 0.9,
    "level": 1,
    "confidence": 0.9,
    "leak_probability": 0.9,
}

CLAUDE_FAILURES = [
    pytest.param(TimeoutError("network timeout"), id="timeout"),
    pytest.param(anthropic.APITimeoutError(request=REQUEST), id="api-timeout"),
    pytest.param(anthropic.APIConnectionError(request=REQUEST), id="connection"),
    pytest.param(
        anthropic.AuthenticationError(
            "invalid x-api-key", response=httpx2.Response(401, request=REQUEST), body=None
        ),
        id="authentication",
    ),
    pytest.param(AIRefusalError("Claude declined the request"), id="refusal"),
    pytest.param(json.JSONDecodeError("Expecting value", "", 0), id="malformed-json"),
    pytest.param(RuntimeError("unexpected"), id="unexpected"),
]


class FakeClaude:
    """Stands in for services.ai_client.complete_json where jev_client looks it up."""

    def __init__(self) -> None:
        self.reply: Any = None
        self.error: Exception | None = None
        self.delay_seconds = 0.0
        self.calls: list[dict[str, Any]] = []

    def __call__(self, messages: list[dict[str, str]], **options: Any) -> Any:
        self.calls.append({"messages": messages, "thread": threading.get_ident(), **options})
        time.sleep(self.delay_seconds)
        if self.error is not None:
            raise self.error
        return self.reply


@pytest.fixture
def claude(monkeypatch: pytest.MonkeyPatch) -> FakeClaude:
    fake = FakeClaude()
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    monkeypatch.setattr(jev_client, "is_enabled", lambda: True)
    monkeypatch.setattr(jev_client, "complete_json", fake)
    return fake


def assert_strict_schema(schema: Mapping[str, Any]) -> None:
    """Structured outputs reject open objects and numeric range keywords."""
    assert schema["type"] == "object"
    assert schema["additionalProperties"] is False
    assert schema["required"] == list(schema["properties"])
    assert '"minimum"' not in json.dumps(schema)
    assert '"maximum"' not in json.dumps(schema)


def assert_one_judgment_request(claude: FakeClaude, *, schema_keys: list[str], user_text: list[str]) -> None:
    (request,) = claude.calls
    system, user = request["messages"]
    assert (system["role"], user["role"]) == ("system", "user")
    for text in user_text:
        assert text in user["content"]
    assert list(request["schema"]["properties"]) == schema_keys
    assert_strict_schema(request["schema"])
    assert request["model"] == CHAT_MODEL
    assert request["timeout"] == jev_client.CLIENT_TIMEOUT_SECONDS
    assert request["thread"] != threading.get_ident()


@pytest.mark.asyncio
@pytest.mark.parametrize(("judge", "fallback"), FALLBACK_CASES)
async def test_missing_key_uses_deterministic_fallbacks(
    judge: JudgmentCall, fallback: dict[str, Any], claude: FakeClaude, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)

    assert await judge() == fallback
    assert claude.calls == []


@pytest.mark.asyncio
@pytest.mark.parametrize(("judge", "fallback"), FALLBACK_CASES)
async def test_blank_key_is_treated_as_missing(
    judge: JudgmentCall, fallback: dict[str, Any], claude: FakeClaude, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("ANTHROPIC_API_KEY", "   ")

    assert await judge() == fallback
    assert claude.calls == []


@pytest.mark.asyncio
@pytest.mark.parametrize(("judge", "fallback"), FALLBACK_CASES)
async def test_ai_kill_switch_uses_fallbacks(
    judge: JudgmentCall, fallback: dict[str, Any], claude: FakeClaude, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(jev_client, "is_enabled", lambda: False)

    assert await judge() == fallback
    assert claude.calls == []


@pytest.mark.asyncio
@pytest.mark.parametrize("error", CLAUDE_FAILURES)
@pytest.mark.parametrize(("judge", "fallback"), FALLBACK_CASES)
async def test_claude_failure_returns_fallback_and_warns(
    error: Exception,
    judge: JudgmentCall,
    fallback: dict[str, Any],
    claude: FakeClaude,
    caplog: pytest.LogCaptureFixture,
) -> None:
    claude.error = error
    caplog.set_level(logging.WARNING)

    assert await judge() == fallback
    assert "Claude judgment failed" in caplog.text or "Claude judgment timed out" in caplog.text


@pytest.mark.asyncio
@pytest.mark.parametrize(("judge", "fallback"), FALLBACK_CASES)
async def test_slow_claude_call_falls_back_when_the_timeout_fires(
    judge: JudgmentCall,
    fallback: dict[str, Any],
    claude: FakeClaude,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    monkeypatch.setattr(jev_client, "CLIENT_TIMEOUT_SECONDS", 0.02)
    claude.reply = REPLY_FOR_ANY_JUDGMENT
    claude.delay_seconds = 0.3
    caplog.set_level(logging.WARNING)

    assert await judge() == fallback
    assert "Claude judgment timed out" in caplog.text


@pytest.mark.asyncio
@pytest.mark.parametrize(("judge", "fallback"), FALLBACK_CASES)
async def test_waiting_for_a_request_slot_counts_against_the_deadline(
    judge: JudgmentCall,
    fallback: dict[str, Any],
    claude: FakeClaude,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    # The wait (0.2 s) and the call (0.2 s) each fit in the 0.3 s deadline on their own; together they do not.
    monkeypatch.setattr(jev_client, "CLIENT_TIMEOUT_SECONDS", 0.3)
    slots = asyncio.Semaphore(1)
    monkeypatch.setattr(jev_client, "_REQUEST_LIMIT", slots)
    claude.reply = REPLY_FOR_ANY_JUDGMENT
    claude.delay_seconds = 0.2
    caplog.set_level(logging.WARNING)
    await slots.acquire()
    asyncio.get_running_loop().call_later(0.2, slots.release)

    assert await judge() == fallback
    assert "Claude judgment timed out" in caplog.text


@pytest.mark.asyncio
async def test_saturated_request_limit_falls_back_at_the_deadline_without_calling_claude(
    claude: FakeClaude, monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    monkeypatch.setattr(jev_client, "CLIENT_TIMEOUT_SECONDS", 0.05)
    full = asyncio.Semaphore(1)
    monkeypatch.setattr(jev_client, "_REQUEST_LIMIT", full)
    await full.acquire()
    caplog.set_level(logging.WARNING)

    # The outer bound only turns an unbounded queue wait into a test failure instead of a hang.
    verdict = await asyncio.wait_for(jev_client.route_student_intent("I am stuck"), timeout=2)

    assert verdict == {"action": "fallback_disabled", "choice": "conceptual_confusion"}
    assert claude.calls == []
    assert "Claude judgment timed out" in caplog.text


@pytest.mark.asyncio
async def test_intent_is_the_most_probable_category(claude: FakeClaude) -> None:
    claude.reply = {
        "direct_answer_request": 0.93,
        "conceptual_confusion": 0.04,
        "calculation_error": 0.02,
        "off_topic_or_frustrated": 0.01,
    }

    verdict = await jev_client.route_student_intent("Give me the answer")

    assert verdict["choice"] == "direct_answer_request"
    assert verdict["confidence"] == pytest.approx(0.93)
    assert verdict["probabilities"] == pytest.approx(claude.reply)
    assert_one_judgment_request(claude, schema_keys=list(INTENT_CATEGORIES), user_text=["Give me the answer"])


@pytest.mark.asyncio
async def test_intent_probabilities_are_clamped_and_normalized(claude: FakeClaude) -> None:
    claude.reply = {
        "direct_answer_request": -0.4,
        "conceptual_confusion": 0.3,
        "calculation_error": 0.1,
        "off_topic_or_frustrated": 0.0,
    }

    verdict = await jev_client.route_student_intent("What is a limit?")

    assert verdict["choice"] == "conceptual_confusion"
    assert verdict["confidence"] == pytest.approx(0.75)
    assert verdict["probabilities"] == pytest.approx(
        {
            "direct_answer_request": 0.0,
            "conceptual_confusion": 0.75,
            "calculation_error": 0.25,
            "off_topic_or_frustrated": 0.0,
        }
    )
    assert sum(verdict["probabilities"].values()) == pytest.approx(1.0)


@pytest.mark.asyncio
async def test_intent_without_a_usable_probability_falls_back(claude: FakeClaude) -> None:
    claude.reply = {category: 0.0 for category in INTENT_CATEGORIES}

    assert await jev_client.route_student_intent("hello") == {
        "action": "fallback_disabled",
        "choice": "conceptual_confusion",
    }


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("supported", "verified", "confidence"),
    [
        (0.2, False, 0.6),
        (0.9, True, 0.8),
        (0.5, True, 0.0),
        (1.4, True, 1.0),
        (-0.3, False, 1.0),
    ],
)
async def test_factuality_verifies_a_lesson_supported_at_even_odds_or_better(
    supported: float, verified: bool, confidence: float, claude: FakeClaude
) -> None:
    claude.reply = {"supported_probability": supported}

    assert await jev_client.verify_lesson_factuality("reference text", "generated lesson") == {
        "verified": verified,
        "confidence": pytest.approx(confidence),
    }
    assert_one_judgment_request(
        claude, schema_keys=["supported_probability"], user_text=["reference text", "generated lesson"]
    )


@pytest.mark.asyncio
async def test_mastery_returns_level_and_confidence(claude: FakeClaude) -> None:
    claude.reply = {"level": 2, "confidence": 0.8}
    answers = [{"topic_id": "algebra", "is_correct": True}]

    assert await jev_client.score_student_mastery(answers, "algebra") == {"level": 2, "pCorrect": 0.8}
    assert_one_judgment_request(
        claude, schema_keys=["level", "confidence"], user_text=["algebra", json.dumps(answers)]
    )
    assert claude.calls[0]["schema"]["properties"]["level"]["enum"] == [0, 1, 2, 3]


@pytest.mark.asyncio
async def test_mastery_confidence_is_clamped(claude: FakeClaude) -> None:
    claude.reply = {"level": 3, "confidence": 1.5}

    assert await jev_client.score_student_mastery([], "algebra") == {"level": 3, "pCorrect": 1.0}


@pytest.mark.asyncio
@pytest.mark.parametrize("level", [4, -1])
async def test_mastery_with_an_unknown_level_falls_back(level: int, claude: FakeClaude) -> None:
    claude.reply = {"level": level, "confidence": 0.9}

    assert await jev_client.score_student_mastery([], "algebra") == {
        "action": "fallback_disabled",
        "pCorrect": 1.0,
        "level": 0,
    }


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("leak", "p_leak", "safe"),
    [
        (0.9, 0.9, False),
        (0.5, 0.5, False),
        (0.2, 0.2, True),
        (0.0, 0.0, True),
        (1.2, 1.0, False),
        (-0.1, 0.0, True),
    ],
)
async def test_solution_safety_is_safe_while_a_leak_is_less_likely_than_not(
    leak: float, p_leak: float, safe: bool, claude: FakeClaude
) -> None:
    claude.reply = {"leak_probability": leak}

    assert await jev_client.verify_solution_safety("x = 4", "Try isolating x first") == {
        "pLeak": p_leak,
        "safe": safe,
    }
    assert_one_judgment_request(
        claude, schema_keys=["leak_probability"], user_text=["x = 4", "Try isolating x first"]
    )
