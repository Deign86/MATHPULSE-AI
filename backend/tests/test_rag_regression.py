"""RAG request validation and public/protected boundary regressions."""

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from main import app
from routes.rag_routes import RagLessonRequest, _strip_thinking_and_parse

pytestmark = pytest.mark.usefixtures("isolated_mock_student_auth")

client = TestClient(app)


@pytest.mark.parametrize(("quarter", "expected"), [(1, 1), (4, 4), ("Q2", 2), (" Quarter 3 ", 3)])
def test_rag_lesson_accepts_supported_quarter_forms(quarter, expected):
    request = RagLessonRequest(topic="Functions", subject="General Mathematics", quarter=quarter)
    assert request.quarter == expected


@pytest.mark.parametrize("quarter", [0, 5, "Q5", "first", True])
def test_rag_lesson_rejects_invalid_quarter(quarter):
    with pytest.raises(ValidationError):
        RagLessonRequest(topic="Functions", subject="General Mathematics", quarter=quarter)


def test_rag_json_parser_accepts_json_and_preserves_non_json_fallback():
    assert _strip_thinking_and_parse("<think>work</think>{\"lesson\": \"linear\"}") == {"lesson": "linear"}
    assert _strip_thinking_and_parse("not structured") == {"explanation": "not structured"}


def test_public_rag_health_and_protected_lesson_access():
    assert client.get("/api/rag/health").status_code == 200
    assert client.post("/api/rag/lesson", json={"topic": "Functions", "subject": "Math", "quarter": 1}).status_code == 401


def test_student_is_forbidden_from_teacher_only_rag_problem_endpoint():
    response = client.post(
        "/api/rag/generate-problem",
        headers={"Authorization": "Bearer mock_token_student-1"},
        json={"topic": "Functions", "subject": "Math", "quarter": 1},
    )
    assert response.status_code == 403
