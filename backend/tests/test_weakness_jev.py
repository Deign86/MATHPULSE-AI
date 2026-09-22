import pytest

from routes import deepseek_rag_routes


def _request(*questions: tuple[str, bool]) -> deepseek_rag_routes.WeaknessDetectionRequest:
    return deepseek_rag_routes.WeaknessDetectionRequest(
        student_id="student-1",
        questions=[
            deepseek_rag_routes.QuestionResult(
                question_id=f"question-{index}",
                topic_id=topic,
                quarter=1,
                is_correct=is_correct,
            )
            for index, (topic, is_correct) in enumerate(questions)
        ],
    )


@pytest.mark.asyncio
async def test_weak_topic_receives_bloom_mastery_annotation(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(deepseek_rag_routes, "is_enabled", lambda: False)
    calls: list[tuple[list[dict], str]] = []

    async def score(student_answers: list[dict], topic: str) -> dict:
        calls.append((student_answers, topic))
        return {"level": 2}

    monkeypatch.setattr(deepseek_rag_routes, "score_student_mastery", score)

    response = await deepseek_rag_routes.detect_weaknesses(
        _request(("algebra", False), ("algebra", True))
    )

    assert response.flagged_topics == ["algebra"]
    assert "[Bloom Mastery: 2]" in response.reasoning_summary
    assert calls[0][1] == "algebra"
    assert calls[0][0][0]["topic_id"] == "algebra"


@pytest.mark.asyncio
async def test_strong_topic_does_not_trigger_jev_or_flagging(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(deepseek_rag_routes, "is_enabled", lambda: False)

    async def fail_score(student_answers: list[dict], topic: str) -> dict:
        raise AssertionError("Jev must not score strong topics")

    monkeypatch.setattr(deepseek_rag_routes, "score_student_mastery", fail_score)

    response = await deepseek_rag_routes.detect_weaknesses(
        _request(("algebra", True), ("algebra", True), ("algebra", True))
    )

    assert response.flagged_topics == []
    assert "Bloom Mastery" not in response.reasoning_summary


@pytest.mark.asyncio
async def test_jev_failure_preserves_rule_based_response(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(deepseek_rag_routes, "is_enabled", lambda: False)

    async def fail_score(student_answers: list[dict], topic: str) -> dict:
        raise TimeoutError("Jev timeout")

    monkeypatch.setattr(deepseek_rag_routes, "score_student_mastery", fail_score)

    response = await deepseek_rag_routes.detect_weaknesses(
        _request(("geometry", False))
    )

    assert response.flagged_topics == ["geometry"]
    assert response.confidence == {"geometry": 1.0}
    assert response.reasoning_summary == (
        "Rule-based detection: topics below 60% accuracy threshold."
    )
    assert response.source == "rule_based"
