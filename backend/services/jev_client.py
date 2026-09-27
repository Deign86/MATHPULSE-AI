"""Small, fail-open TypeSafe adapters for student-learning judgments."""

from __future__ import annotations

import asyncio
import logging
import os
from typing import Any, Callable, Mapping, TypedDict

logger = logging.getLogger(__name__)

CLIENT_TIMEOUT_SECONDS = 5.0
_REQUEST_LIMIT = asyncio.Semaphore(10)


class IntentSuccess(TypedDict):
    choice: Any
    confidence: Any
    probabilities: Any


class IntentFallback(TypedDict):
    action: Any
    choice: Any


class FactualitySuccess(TypedDict):
    verified: bool
    confidence: float


class FactualityFallback(TypedDict):
    action: str
    verified: bool


class MasterySuccess(TypedDict):
    level: Any
    pCorrect: Any


class MasteryFallback(TypedDict):
    action: Any
    pCorrect: Any
    level: Any


class SafetySuccess(TypedDict):
    pLeak: Any
    safe: Any


class SafetyFallback(TypedDict):
    action: Any
    pLeak: Any
    safe: Any

try:
    from typesafe_sdk import Choice, Noul, Score, TypeSafeClient
except ImportError:  # Optional dependency: the backend remains usable offline.
    Choice = None  # type: ignore[assignment,misc]
    Noul = None  # type: ignore[assignment,misc]
    Score = None  # type: ignore[assignment,misc]
    TypeSafeClient = None  # type: ignore[assignment,misc]


def _build_choice() -> Any:
    if Choice is None:
        return None
    return Choice(
        instructions="Classify the student's tutoring intent.",
        criteria={
            "direct_answer_request": "The student asks for a direct answer.",
            "conceptual_confusion": "The student needs an explanation of a concept.",
            "calculation_error": "The student made or reports a calculation error.",
            "off_topic_or_frustrated": "The message is off-topic or expresses frustration.",
        },
    )


def _build_noul(instructions: str, true_criteria: str, false_criteria: str) -> Any:
    if Noul is None:
        return None
    return Noul(
        instructions=instructions,
        criteria={"true": true_criteria, "false": false_criteria},
    )


def _build_score() -> Any:
    if Score is None:
        return None
    return Score(
        instructions="Score the student's demonstrated Bloom mastery level.",
        criteria=[
            "0 Recall: remembers definitions or facts.",
            "1 Procedural: follows a familiar procedure.",
            "2 Conceptual Transfer: applies concepts to a new problem.",
            "3 Metacognitive: explains and evaluates their own reasoning.",
        ],
    )


INTENT_ROUTING = _build_choice()
FACTUAL_ALIGNMENT = _build_noul(
    "Is the generated lesson supported by the reference text?",
    "The generated lesson is factually aligned with the reference.",
    "The generated lesson contains an unsupported or hallucinated claim.",
)
PEDAGOGICAL_LEAK = _build_noul(
    "Does the response reveal the final solution instead of giving a Socratic hint?",
    "The response leaks the final solution.",
    "The response gives a Socratic hint without revealing the final solution.",
)
BLOOM_MASTERY_SCORE = _build_score()


def _fallback_intent() -> IntentFallback:
    return {"action": "fallback_disabled", "choice": "conceptual_confusion"}


def _fallback_factuality() -> FactualityFallback:
    return {"action": "fallback_disabled", "verified": True}


def _fallback_mastery() -> MasteryFallback:
    return {"action": "fallback_disabled", "pCorrect": 1.0, "level": 0}


def _fallback_safety() -> SafetyFallback:
    return {"action": "fallback_disabled", "pLeak": 0.0, "safe": True}


def _api_key() -> str | None:
    key = os.getenv("TYPESAFE_API_KEY", "").strip()
    return key or None


def _answer_field(answer: object, field_name: str, default: Any) -> Any:
    if isinstance(answer, Mapping):
        return answer.get(field_name, default)
    return getattr(answer, field_name, default)


def _answers(response: object) -> Mapping[str, object]:
    response_answers = getattr(response, "answers", {})
    return response_answers if isinstance(response_answers, Mapping) else {}


async def _system_one(state: dict[str, Any], questions: dict[str, Any]) -> object:
    if TypeSafeClient is None:
        raise ImportError("typesafe_sdk is not installed")

    async with _REQUEST_LIMIT:
        client = TypeSafeClient(api_key=_api_key(), timeout=CLIENT_TIMEOUT_SECONDS)
        call = asyncio.to_thread(client.system_one, state=state, questions=questions)
        return await asyncio.wait_for(call, timeout=CLIENT_TIMEOUT_SECONDS)


async def _call_or_fallback(
    state: dict[str, Any],
    questions: dict[str, Any],
    fallback: Callable[[], object],
) -> object | dict[str, Any]:
    if _api_key() is None:
        return fallback()
    try:
        return await _system_one(state, questions)
    except (ImportError, asyncio.TimeoutError, OSError) as exc:
        logger.warning("TypeSafe request unavailable: %s", exc)
    except Exception as exc:
        logger.warning("TypeSafe request failed: %s", exc)
    return fallback()


async def route_student_intent(
    message: str,
) -> IntentSuccess | IntentFallback | dict[str, Any]:
    """Classify a student's message into the tutoring intent taxonomy."""
    response = await _call_or_fallback(
        {"message": message}, {"intent": INTENT_ROUTING}, _fallback_intent
    )
    if isinstance(response, dict):
        return response
    answer = _answers(response).get("intent")
    success: IntentSuccess = {
        "choice": _answer_field(answer, "choice", "conceptual_confusion"),
        "confidence": _answer_field(answer, "confidence", 0.0),
        "probabilities": _answer_field(answer, "probabilities", {}),
    }
    return success


async def verify_lesson_factuality(
    reference_text: str, generated_text: str
) -> FactualitySuccess | FactualityFallback | dict[str, Any]:
    """Check generated lesson claims against the supplied reference."""
    response = await _call_or_fallback(
        {"reference_text": reference_text, "generated_text": generated_text},
        {"factual_alignment": FACTUAL_ALIGNMENT},
        _fallback_factuality,
    )
    if isinstance(response, dict):
        return response
    answer = _answers(response).get("factual_alignment")
    alignment_probability = _answer_field(answer, "noul", 1.0)
    success: FactualitySuccess = {
        "verified": float(alignment_probability) >= 0.5,
        "confidence": abs(float(alignment_probability) - 0.5) * 2,
    }
    return success


async def score_student_mastery(
    student_answers: list[dict[str, Any]], topic: str
) -> MasterySuccess | MasteryFallback | dict[str, Any]:
    """Estimate mastery from answers using four Bloom levels."""
    response = await _call_or_fallback(
        {"student_answers": student_answers, "topic": topic},
        {"bloom_mastery_score": BLOOM_MASTERY_SCORE},
        _fallback_mastery,
    )
    if isinstance(response, dict):
        return response
    answer = _answers(response).get("bloom_mastery_score")
    level = _answer_field(answer, "score", _answer_field(answer, "level", 0))
    success: MasterySuccess = {
        "level": level,
        "pCorrect": _answer_field(answer, "confidence", 0.0),
    }
    return success


async def verify_solution_safety(
    reference_steps: str, student_steps: str
) -> SafetySuccess | SafetyFallback | dict[str, Any]:
    """Check whether student-facing steps reveal the final solution."""
    response = await _call_or_fallback(
        {"reference_steps": reference_steps, "student_steps": student_steps},
        {"pedagogical_leak": PEDAGOGICAL_LEAK},
        _fallback_safety,
    )
    if isinstance(response, dict):
        return response
    answer = _answers(response).get("pedagogical_leak")
    leak_probability = _answer_field(answer, "noul", 0.0)
    success: SafetySuccess = {
        "pLeak": leak_probability,
        "safe": not bool(leak_probability),
    }
    return success


__all__ = [
    "BLOOM_MASTERY_SCORE",
    "FACTUAL_ALIGNMENT",
    "INTENT_ROUTING",
    "PEDAGOGICAL_LEAK",
    "route_student_intent",
    "score_student_mastery",
    "verify_lesson_factuality",
    "verify_solution_safety",
]
