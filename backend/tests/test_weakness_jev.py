import asyncio
import json
import re

import pytest

from routes import ai_insight_routes
from services.ai_client import CHAT_MODEL

# How assessmentService.ts reads the Bloom level back out of the reasoning summary.
FRONTEND_BLOOM_PATTERN = re.compile(r"Bloom Mastery:\s*(remember|understand|apply|analyze)", re.IGNORECASE)


def _request(*questions: tuple[str, bool]) -> ai_insight_routes.WeaknessDetectionRequest:
    return ai_insight_routes.WeaknessDetectionRequest(
        student_id="student-1",
        questions=[
            ai_insight_routes.QuestionResult(
                question_id=f"question-{index}",
                topic_id=topic,
                quarter=1,
                is_correct=is_correct,
            )
            for index, (topic, is_correct) in enumerate(questions)
        ],
    )


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("level", "label"), [(0, "remember"), (1, "understand"), (2, "apply"), (3, "analyze")]
)
async def test_weak_topic_receives_bloom_mastery_annotation(
    monkeypatch: pytest.MonkeyPatch, level: int, label: str
) -> None:
    monkeypatch.setattr(ai_insight_routes, "is_enabled", lambda: False)
    calls: list[tuple[list[dict], str]] = []

    async def score(student_answers: list[dict], topic: str) -> dict:
        calls.append((student_answers, topic))
        return {"level": level}

    monkeypatch.setattr(ai_insight_routes, "score_student_mastery", score)

    response = await ai_insight_routes.detect_weaknesses(
        _request(("algebra", False), ("algebra", True))
    )

    assert response.flagged_topics == ["algebra"]
    assert f"algebra [Bloom Mastery: {label}]" in response.reasoning_summary
    frontend_match = FRONTEND_BLOOM_PATTERN.search(response.reasoning_summary)
    assert frontend_match is not None and frontend_match.group(1) == label
    assert calls[0][1] == "algebra"
    assert calls[0][0][0]["topic_id"] == "algebra"


@pytest.mark.asyncio
async def test_topic_judgments_run_concurrently_and_keep_topic_order(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(ai_insight_routes, "is_enabled", lambda: False)
    topics = ["algebra", "geometry", "statistics"]
    all_in_flight = asyncio.Barrier(len(topics))
    finishes_after = {"algebra": 0.05, "geometry": 0.0, "statistics": 0.02}

    async def score(student_answers: list[dict], topic: str) -> dict:
        # Passes only once every topic's judgment is running at the same time; the delays finish them out of order.
        await all_in_flight.wait()
        await asyncio.sleep(finishes_after[topic])
        return {"level": topics.index(topic)}

    monkeypatch.setattr(ai_insight_routes, "score_student_mastery", score)

    response = await asyncio.wait_for(
        ai_insight_routes.detect_weaknesses(_request(*[(topic, False) for topic in topics])), timeout=2
    )

    assert response.reasoning_summary.endswith(
        "algebra [Bloom Mastery: remember]; geometry [Bloom Mastery: understand]; statistics [Bloom Mastery: apply]"
    )


@pytest.mark.asyncio
async def test_a_failed_topic_judgment_does_not_drop_the_other_topics(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(ai_insight_routes, "is_enabled", lambda: False)

    async def score(student_answers: list[dict], topic: str) -> dict:
        if topic == "geometry":
            raise TimeoutError("Jev timeout")
        if topic == "statistics":
            return {"action": "fallback_disabled"}
        return {"level": 3}

    monkeypatch.setattr(ai_insight_routes, "score_student_mastery", score)

    response = await ai_insight_routes.detect_weaknesses(
        _request(("algebra", False), ("geometry", False), ("statistics", False), ("calculus", False))
    )

    assert response.flagged_topics == ["algebra", "geometry", "statistics", "calculus"]
    assert response.reasoning_summary == (
        "Rule-based detection: topics below 60% accuracy threshold. "
        "algebra [Bloom Mastery: analyze]; calculus [Bloom Mastery: analyze]"
    )


@pytest.mark.asyncio
async def test_weakness_analysis_runs_on_the_chat_model(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(ai_insight_routes, "is_enabled", lambda: True)
    monkeypatch.setattr(ai_insight_routes, "build_analysis_curriculum_context", lambda **_: [])
    monkeypatch.setattr(ai_insight_routes, "retrieve_curriculum_context", lambda **_: [])
    models: list[str] = []

    def completion(model: str, system_prompt: str, user_prompt: str, **kwargs: object) -> str:
        models.append(model)
        return json.dumps({"flagged_topics": ["algebra"], "confidence": {"algebra": 0.9}, "reasoning_summary": "Review."})

    async def mastery_disabled(student_answers: list[dict], topic: str) -> dict:
        return {"action": "fallback_disabled"}

    monkeypatch.setattr(ai_insight_routes, "rag_grounded_completion", completion)
    monkeypatch.setattr(ai_insight_routes, "score_student_mastery", mastery_disabled)

    response = await ai_insight_routes.detect_weaknesses(_request(("algebra", False)))

    assert response.source == "ai"
    # The student's diagnostic submit waits on this call, so it uses the fast tier rather than the reasoner.
    assert models == [CHAT_MODEL]


@pytest.mark.asyncio
async def test_claude_answer_is_reported_as_ai_without_sampling_params(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(ai_insight_routes, "is_enabled", lambda: True)
    monkeypatch.setattr(ai_insight_routes, "build_analysis_curriculum_context", lambda **_: [])
    monkeypatch.setattr(ai_insight_routes, "retrieve_curriculum_context", lambda **_: [])
    completion_kwargs: dict[str, object] = {}

    def completion(model: str, system_prompt: str, user_prompt: str, **kwargs: object) -> str:
        completion_kwargs.update(kwargs)
        return json.dumps({
            "flagged_topics": ["algebra"],
            "confidence": {"algebra": 0.9},
            "reasoning_summary": "Factoring needs review.",
        })

    async def mastery_disabled(student_answers: list[dict], topic: str) -> dict:
        return {"action": "fallback_disabled"}

    monkeypatch.setattr(ai_insight_routes, "rag_grounded_completion", completion)
    monkeypatch.setattr(ai_insight_routes, "score_student_mastery", mastery_disabled)

    response = await ai_insight_routes.detect_weaknesses(
        _request(("algebra", False), ("algebra", True))
    )

    assert response.source == "ai"
    assert response.flagged_topics == ["algebra"]
    assert response.confidence == {"algebra": 0.9}
    assert response.reasoning_summary == "Factoring needs review."
    assert "temperature" not in completion_kwargs


@pytest.mark.asyncio
async def test_strong_topic_does_not_trigger_jev_or_flagging(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(ai_insight_routes, "is_enabled", lambda: False)

    async def fail_score(student_answers: list[dict], topic: str) -> dict:
        raise AssertionError("Jev must not score strong topics")

    monkeypatch.setattr(ai_insight_routes, "score_student_mastery", fail_score)

    response = await ai_insight_routes.detect_weaknesses(
        _request(("algebra", True), ("algebra", True), ("algebra", True))
    )

    assert response.flagged_topics == []
    assert "Bloom Mastery" not in response.reasoning_summary


@pytest.mark.asyncio
async def test_jev_failure_preserves_rule_based_response(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(ai_insight_routes, "is_enabled", lambda: False)

    async def fail_score(student_answers: list[dict], topic: str) -> dict:
        raise TimeoutError("Jev timeout")

    monkeypatch.setattr(ai_insight_routes, "score_student_mastery", fail_score)

    response = await ai_insight_routes.detect_weaknesses(
        _request(("geometry", False))
    )

    assert response.flagged_topics == ["geometry"]
    assert response.confidence == {"geometry": 1.0}
    assert response.reasoning_summary == (
        "Rule-based detection: topics below 60% accuracy threshold."
    )
    assert response.source == "rule_based"
