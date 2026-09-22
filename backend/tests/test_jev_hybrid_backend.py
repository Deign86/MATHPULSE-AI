from __future__ import annotations

import json
import os
import sys
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import main
from routes import deepseek_rag_routes, jev_routes
from services import jev_client


@pytest.mark.asyncio
async def test_jev_client_missing_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("TYPESAFE_API_KEY", raising=False)

    assert await jev_client.route_student_intent("I am stuck") == {
        "action": "fallback_disabled",
        "choice": "conceptual_confusion",
    }
    assert await jev_client.verify_lesson_factuality("reference", "lesson") == {
        "action": "fallback_disabled",
        "verified": True,
    }
    assert await jev_client.score_student_mastery([], "algebra") == {
        "action": "fallback_disabled",
        "pCorrect": 1.0,
        "level": 0,
    }


@pytest.mark.asyncio
async def test_jev_client_primitives(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("TYPESAFE_API_KEY", "test-key")

    response_by_question = {
        "intent": SimpleNamespace(
            choice="direct_answer_request",
            confidence=0.93,
            probabilities={"direct_answer_request": 0.93},
        ),
        "factual_alignment": SimpleNamespace(noul=0.2),
        "bloom_mastery_score": SimpleNamespace(score=2, confidence=0.8),
    }

    async def fake_system_one(state: dict[str, object], questions: dict[str, object]) -> object:
        assert state
        assert len(questions) == 1
        question_name = next(iter(questions))
        return SimpleNamespace(answers={question_name: response_by_question[question_name]})

    monkeypatch.setattr(jev_client, "_system_one", fake_system_one)

    assert await jev_client.route_student_intent("Give me the answer") == {
        "choice": "direct_answer_request",
        "confidence": 0.93,
        "probabilities": {"direct_answer_request": 0.93},
    }
    assert await jev_client.verify_lesson_factuality("reference", "lesson") == {
        "verified": False,
        "confidence": 0.6,
    }
    assert await jev_client.score_student_mastery([], "algebra") == {
        "level": 2,
        "pCorrect": 0.8,
    }


def test_jev_verify_endpoint(monkeypatch: pytest.MonkeyPatch) -> None:
    app = FastAPI()
    app.include_router(jev_routes.router)

    async def verify(reference_text: str, generated_text: str) -> dict[str, object]:
        assert (reference_text, generated_text) == ("Reference lesson", "Generated lesson")
        return {"verified": True, "pCorrect": 0.95, "pLeak": 0.05, "action": "allow"}

    monkeypatch.setattr(jev_routes, "verify_lesson_factuality", verify)

    with TestClient(app) as client:
        valid_response = client.post(
            "/api/jev/verify",
            json={"referenceText": "Reference lesson", "generatedText": "Generated lesson"},
        )
        oversized_response = client.post(
            "/api/jev/verify",
            json={"referenceText": "r" * 4001, "generatedText": "g" * 4000},
        )

    assert valid_response.status_code == 200
    assert valid_response.json() == {
        "verified": True,
        "pCorrect": 0.95,
        "pLeak": 0.05,
        "action": "allow",
    }
    assert oversized_response.status_code == 400
    assert oversized_response.json() == {
        "detail": "Combined text exceeds 8000 characters limit",
    }


CHUNKS = [
    {
        "content": "A rational function is a quotient of two polynomial functions.",
        "source_file": "SHS_GM_Q1.pdf",
        "score": 0.95,
        "content_domain": "general",
    }
]
LESSON_PAYLOAD = {
    "topic": "Rational Functions",
    "subject": "General Mathematics",
    "quarter": 1,
    "lessonTitle": "Introduction to Rational Functions",
}


def _generated_lesson() -> str:
    sections = [
        {"type": "introduction", "content": "Generated introduction hallucination."},
        {"type": "key_concepts", "content": "Generated concepts hallucination."},
        {"type": "video", "content": "Generated video description."},
        {"type": "worked_examples", "examples": [{"problem": "Generated example hallucination."}]},
        {"type": "important_notes", "bulletPoints": ["Generated note hallucination."]},
        {"type": "try_it_yourself", "practiceProblems": [{"question": "Generated practice hallucination."}]},
        {"type": "summary", "content": "Generated summary hallucination."},
    ]
    return json.dumps({"sections": sections})


@pytest.fixture
def rag_client() -> TestClient:
    with patch.object(
        main.firebase_auth,
        "verify_id_token",
        return_value={"uid": "teacher_T", "role": "teacher"},
    ), patch(
        "routes.rag_routes.retrieve_lesson_pdf_context",
        return_value=(CHUNKS, "exact_file"),
    ), patch(
        "routes.rag_routes._generate_text",
        return_value=_generated_lesson(),
    ), patch(
        "routes.rag_routes._fetch_youtube_videos",
        return_value=[],
    ), patch(
        "routes.rag_routes._log_rag_usage",
        return_value=None,
    ):
        yield TestClient(main.app, headers={"Authorization": "Bearer mock_token_teacher_T"})


def test_rag_lesson_with_jev_verification(
    rag_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def reject_factuality(reference_text: str, generated_text: str) -> dict[str, object]:
        assert CHUNKS[0]["content"] in reference_text
        assert "Generated introduction hallucination." in generated_text
        return {"verified": False, "pCorrect": 0.20}

    monkeypatch.setattr("routes.rag_routes.verify_lesson_factuality", reject_factuality)

    response = rag_client.post("/api/rag/lesson", json=LESSON_PAYLOAD)

    assert response.status_code == 200
    body = response.json()
    assert len(body["sections"]) == 7
    assert "Generated" not in str(body["sections"])
    assert CHUNKS[0]["content"] in str(body["sections"])
    assert body["jevVerification"] == {"verified": False, "pCorrect": 0.20}


@pytest.mark.asyncio
async def test_weakness_detection_with_jev_score(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(deepseek_rag_routes, "is_enabled", lambda: False)

    request = deepseek_rag_routes.WeaknessDetectionRequest(
        student_id="student-1",
        questions=[
            deepseek_rag_routes.QuestionResult(
                question_id="question-1",
                topic_id="algebra",
                quarter=1,
                is_correct=False,
            ),
            deepseek_rag_routes.QuestionResult(
                question_id="question-2",
                topic_id="algebra",
                quarter=1,
                is_correct=True,
            ),
        ],
    )

    async def score(student_answers: list[dict[str, object]], topic: str) -> dict[str, object]:
        assert topic == "algebra"
        assert student_answers[0]["topic_id"] == "algebra"
        return {"level": 2}

    monkeypatch.setattr(deepseek_rag_routes, "score_student_mastery", score)

    response = await deepseek_rag_routes.detect_weaknesses(request)

    assert response.flagged_topics == ["algebra"]
    assert response.confidence == {"algebra": 0.5}
    assert response.source == "rule_based"
    assert "algebra [Bloom Mastery: 2]" in response.reasoning_summary


@pytest.mark.asyncio
async def test_chat_direct_answer_socratic_short_circuit(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(main, "HAS_MEMORY_SERVICE", False)
    monkeypatch.setattr(main, "HAS_FIREBASE_ADMIN", False)
    monkeypatch.setattr(main, "retrieve_curriculum_context", lambda **_: [])

    async def route_intent(_message: str) -> dict[str, object]:
        return {"choice": "direct_answer_request", "confidence": 0.93}

    async def unexpected_llm_call(*_args: object, **_kwargs: object) -> str:
        raise AssertionError("DeepSeek must not run for a direct answer request")

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
