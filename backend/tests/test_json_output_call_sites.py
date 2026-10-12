"""Claude call sites that expect JSON ask for JSON mode, and every converted call carries an explicit timeout.

json_output=True is what makes the helper demand a JSON-only reply and recover it from fences or prose, so a
site that drops it starts failing on the first reply that opens with a sentence. The SDK's own timeout is 600 s,
so a call without `timeout` can hold a worker thread (and the request behind it) for ten minutes. Each test
replaces the helper a call site goes through and asserts on the request that reaches it.
"""
from __future__ import annotations

import asyncio
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from rag import pdf_ingestion
from routes import diagnostic, try_it_yourself
from services import (
    class_analytics_engine,
    intervention_engine,
    student_intelligence_pipeline,
    tutor_nudge_service,
    variance_engine,
)
from services.ai_client import CHAT_MODEL

PIPELINE_EVENT = student_intelligence_pipeline.StudentActivityEvent(
    student_id="student-1", event_type="quiz", occurred_at="2026-01-01T00:00:00Z"
)

# Each case: how to trigger the site, the reply the site can parse, and the timeout it must pass.
# services.ai_client.complete_text is looked up at call time inside these modules, so patching it there reaches them.
LAZY_IMPORT_SITES = [
    pytest.param(
        lambda: intervention_engine.InterventionEngine()._generate_insights(
            grade_level="11",
            section="A",
            risk_level="high",
            avg_score=45.0,
            engagement="Low",
            strong_topics=[],
            weak_topics=["Factoring"],
            quiz_count=3,
        ),
        '{"learning_strengths": "Persistent.", "next_steps_summary": "Practice factoring."}',
        id="intervention-insights",
    ),
    pytest.param(
        lambda: intervention_engine.InterventionEngine()._generate_learning_path(
            student_id="student-1",
            weak_topics=["Factoring"],
            weakest_topic="Factoring",
            engagement="Low",
            risk_level="high",
            grade_level="11",
            topic_avgs={"Factoring": 40},
        ),
        '{"steps": [], "ai_rationale": "Start with factoring."}',
        id="intervention-learning-path",
    ),
    pytest.param(
        lambda: intervention_engine.InterventionEngine()._generate_recommendations(
            grade_level="11", risk_level="high", weak_topics=["Factoring"], avg_score=45.0
        ),
        '["Review factoring in a one-on-one session."]',
        id="intervention-recommendations",
    ),
    pytest.param(
        lambda: class_analytics_engine.ClassAnalyticsEngine()._generate_insights(
            class_id="class-1",
            class_name="Newton",
            grade_level="11",
            section="A",
            student_count=30,
            class_average=70.0,
            completion_rate=80.0,
            participation_rate=90.0,
            risk_dist={},
            topic_perf=[],
        ),
        '{"class_summary": "Steady progress."}',
        id="class-analytics",
    ),
    pytest.param(
        lambda: student_intelligence_pipeline.StudentIntelligencePipeline()._generate_ai_context({}, PIPELINE_EVENT),
        '{"ai_summary": "On track."}',
        id="student-intelligence-pipeline",
    ),
]


@pytest.mark.parametrize(("trigger", "reply"), LAZY_IMPORT_SITES)
def test_engine_sites_request_json_output_with_a_60_second_timeout(trigger, reply) -> None:
    with patch("services.ai_client.complete_text", return_value=reply) as complete_text:
        asyncio.run(trigger())

    sent = complete_text.call_args.kwargs
    assert sent["json_output"] is True
    assert sent["timeout"] == 60.0
    assert sent["model"] == CHAT_MODEL


def test_intervention_learning_path_leaves_room_for_a_six_step_plan() -> None:
    reply = '{"steps": []}'
    with patch("services.ai_client.complete_text", return_value=reply) as complete_text:
        asyncio.run(
            intervention_engine.InterventionEngine()._generate_learning_path(
                student_id="student-1",
                weak_topics=["Factoring"],
                weakest_topic="Factoring",
                engagement="Low",
                risk_level="high",
                grade_level="11",
                topic_avgs={"Factoring": 40},
            )
        )

    assert complete_text.call_args.kwargs["max_tokens"] == 1500


def test_diagnostic_questions_request_json_output_with_a_90_second_timeout() -> None:
    with patch.object(diagnostic, "complete_text", return_value="[]") as complete_text:
        assert asyncio.run(diagnostic._call_claude("system prompt", "user message")) == "[]"

    sent = complete_text.call_args.kwargs
    assert sent["json_output"] is True
    assert sent["timeout"] == 90.0


def test_variance_engine_requests_json_output_with_a_120_second_timeout() -> None:
    question = {
        "question": "What is 2+2?",
        "choices": ["A) 3", "B) 4", "C) 5", "D) 6"],
        "correct_answer": "B",
        "topic": "math",
        "grade_level": 8,
    }
    varied = [{**question, "variance_applied": ["paraphrase"]}]
    with (
        patch.object(variance_engine, "get_cached_session", new=AsyncMock(return_value=None)),
        patch.object(variance_engine, "cache_session_questions", new=AsyncMock()),
        patch.object(variance_engine, "complete_text", return_value=json.dumps(varied)) as complete_text,
    ):
        asyncio.run(variance_engine.apply_variance([question], "session-1"))

    sent = complete_text.call_args.kwargs
    assert sent["json_output"] is True
    assert sent["timeout"] == 120.0


def test_chunk_question_generation_requests_json_output_with_a_120_second_timeout() -> None:
    with patch.object(pdf_ingestion, "complete_text", return_value="[]") as complete_text:
        asyncio.run(pdf_ingestion._generate_questions_for_chunk("chunk text", "chunk-1", "linear_equations", 8))

    sent = complete_text.call_args.kwargs
    assert sent["json_output"] is True
    assert sent["timeout"] == 120.0


def test_tutor_nudge_call_has_a_60_second_timeout() -> None:
    firestore = MagicMock()
    with (
        patch.object(tutor_nudge_service, "_get_db", return_value=firestore),
        patch.object(tutor_nudge_service, "_has_recent_nudge", return_value=False),
        patch("services.ai_client.complete_text", return_value="Try five factoring problems today.") as complete_text,
    ):
        nudge = asyncio.run(tutor_nudge_service.generate_tutor_nudge_for_student("student-1", ["Factoring"]))

    assert nudge["message"] == "Try five factoring problems today."
    assert complete_text.call_args.kwargs["timeout"] == 60.0


def test_shadow_retry_leaves_room_for_five_variants() -> None:
    """Five questions with three hints each do not fit the old 2000-token budget."""
    seen_requests = []

    class RecordingClient:
        def generate_from_messages(self, inference_request: object) -> str:
            seen_requests.append(inference_request)
            return "[]"

    request = SimpleNamespace(state=SimpleNamespace(user=SimpleNamespace(uid="student-1")))
    body = try_it_yourself.ShadowRetryRequest(
        userId="student-1", sessionId="session-1", struggleTopics=["Factoring"], subject="General Mathematics", count=5
    )
    with (
        patch("routes.quiz_generation_routes._get_inference_client", return_value=RecordingClient()),
        patch("routes.quiz_generation_routes._parse_quiz_response", return_value=[]),
        patch("rag.curriculum_rag.retrieve_curriculum_context", return_value=[]),
    ):
        asyncio.run(try_it_yourself.generate_shadow_retries(request, body))

    (inference_request,) = seen_requests
    assert inference_request.max_new_tokens == 4096
