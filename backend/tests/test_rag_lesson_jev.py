from __future__ import annotations

import os
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

os.environ["DEEPSEEK_API_KEY"] = "mock-key-for-testing"

import main as main_module
from main import app
from routes import rag_routes


client = TestClient(app, headers={"Authorization": "Bearer mock_token_teacher_T"})
CHUNKS = [
    {
        "content": "A rational function is a quotient of two polynomial functions.",
        "source_file": "SHS_GM_Q1.pdf",
        "score": 0.95,
        "content_domain": "general",
    }
]
PAYLOAD = {
    "topic": "Rational Functions",
    "subject": "General Mathematics",
    "quarter": 1,
    "lessonTitle": "Introduction to Rational Functions",
}


# Rich enough to pass the lesson richness validator, so only the Jev check decides the outcome.
GENERATED_INTRO = "Generated introduction hallucination. " * 12


def _generated_lesson() -> str:
    sections = [
        {"type": "introduction", "content": GENERATED_INTRO},
        {"type": "key_concepts", "content": "Generated concepts hallucination. " * 20,
         "callouts": [{"type": "warning", "text": "Generated misconception."}]},
        {"type": "video", "content": "Generated video description."},
        {"type": "worked_examples", "examples": [
            {"problem": f"Generated example hallucination {i}.", "steps": ["Step 1", "Step 2", "Step 3"], "answer": "x"}
            for i in range(3)
        ]},
        {"type": "important_notes", "bulletPoints": [f"Generated note hallucination {i}." for i in range(4)]},
        {"type": "try_it_yourself", "practiceProblems": [
            {"question": f"Generated practice hallucination {i}.", "solution": "Generated solution."} for i in range(5)
        ]},
        {"type": "summary", "content": "Generated summary hallucination. " * 9},
    ]
    import json

    return json.dumps({"sections": sections})


@pytest.fixture(autouse=True)
def _setup_rag_mocks():
    rag_routes._lesson_memory.clear()
    rag_routes._retrieval_memory.clear()
    with patch.object(
        main_module.firebase_auth,
        "verify_id_token",
        return_value={"uid": "teacher_T", "role": "teacher"},
    ), patch(
        "routes.rag_routes.retrieve_lesson_pdf_context",
        return_value=(CHUNKS, "exact_file"),
    ), patch(
        "routes.rag_routes._stream_reasoner_lesson",
        return_value=_generated_lesson(),
    ), patch(
        "routes.rag_routes._fetch_youtube_videos",
        return_value=[],
    ), patch(
        "routes.rag_routes._log_rag_usage",
        return_value=None,
    ), patch(
        "routes.rag_routes._read_student_lesson",
        return_value=None,
    ), patch(
        "routes.rag_routes._write_student_lesson",
        return_value=None,
    ), patch(
        "routes.rag_routes._load_learner_profile",
        return_value="",
    ):
        yield
    rag_routes._lesson_memory.clear()
    rag_routes._retrieval_memory.clear()


def test_factuality_pass_retains_generated_lesson(monkeypatch) -> None:
    async def verify(reference_text: str, generated_text: str) -> dict[str, object]:
        assert CHUNKS[0]["content"] in reference_text
        assert "Generated introduction hallucination." in generated_text
        return {"verified": True, "pCorrect": 0.95}

    monkeypatch.setattr("routes.rag_routes.verify_lesson_factuality", verify)

    response = client.post("/api/rag/lesson", json=PAYLOAD)

    assert response.status_code == 200
    assert response.json()["sections"][0]["content"] == GENERATED_INTRO
    assert response.json()["jevVerification"] == {"verified": True, "pCorrect": 0.95}


def test_factuality_fail_replaces_all_sections_with_grounded_defaults(monkeypatch) -> None:
    async def verify(reference_text: str, generated_text: str) -> dict[str, object]:
        return {"verified": False, "pCorrect": 0.20}

    monkeypatch.setattr("routes.rag_routes.verify_lesson_factuality", verify)

    response = client.post("/api/rag/lesson", json=PAYLOAD)

    assert response.status_code == 200
    body = response.json()
    sections_text = str(body["sections"])
    assert "Generated" not in sections_text
    assert CHUNKS[0]["content"] in sections_text
    assert len(body["sections"]) == 7
    assert body["jevVerification"] == {"verified": False, "pCorrect": 0.20}


def test_jev_exception_fails_open_cleanly(monkeypatch) -> None:
    async def verify(reference_text: str, generated_text: str) -> dict[str, object]:
        raise RuntimeError("temporary Jev outage")

    monkeypatch.setattr("routes.rag_routes.verify_lesson_factuality", verify)

    response = client.post("/api/rag/lesson", json=PAYLOAD)

    assert response.status_code == 200
    assert response.json()["sections"][0]["content"] == GENERATED_INTRO
    assert response.json()["jevVerification"] is None


def test_empty_context_fails_closed_without_generated_grounding() -> None:
    with patch("routes.rag_routes.retrieve_lesson_pdf_context", return_value=([], "general")), \
         patch("routes.rag_routes._stream_reasoner_lesson") as generate_text:
        response = client.post("/api/rag/lesson", json=PAYLOAD)

    assert response.status_code == 404
    assert response.json()["detail"] == {
        "error": "no_curriculum_context",
        "message": "No curriculum content found for lesson 'Introduction to Rational Functions' (General Mathematics Q1). Please ensure the PDF has been ingested.",
        "retrievalBand": "low",
        "sources": [],
    }
    generate_text.assert_not_called()
