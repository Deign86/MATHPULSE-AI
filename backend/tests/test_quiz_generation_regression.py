"""Quiz generation schema, prompt, and authorization regressions."""

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from main import app
from routes.quiz_generation_routes import QuizGenerationRequest, _build_quiz_generation_prompt

client = TestClient(app)


def test_quiz_request_defaults_and_happy_prompt_contract():
    request = QuizGenerationRequest(topic="Linear equations", subject="General Mathematics")
    assert request.questionCount == 6
    assert request.difficulty == "medium"
    prompt = _build_quiz_generation_prompt(
        request.topic, request.subject, request.lessonTitle, request.questionCount,
        request.questionTypes, request.difficulty, "curriculum context", variance_seed=12,
    )
    assert "Linear equations" in prompt and "curriculum context" in prompt
    assert "seed 12" in prompt


@pytest.mark.parametrize("fields", [{"topic": "", "subject": "Math"}, {"topic": "A", "subject": "Math", "questionCount": 0}, {"topic": "A", "subject": "Math", "questionCount": 21}, {"topic": "A", "subject": "Math", "difficulty": "extreme"}])
def test_quiz_request_rejects_invalid_boundaries(fields):
    with pytest.raises(ValidationError):
        QuizGenerationRequest(**fields)


def test_quiz_generation_requires_authentication():
    response = client.post("/api/quiz/generate", json={"topic": "Algebra", "subject": "Math"})
    assert response.status_code == 401


def test_student_is_forbidden_from_teacher_only_quiz_calibration():
    response = client.post(
        "/api/quiz/calibrate-difficulty",
        headers={"Authorization": "Bearer mock_token_student-1"},
        json={},
    )
    assert response.status_code == 403


def test_quiz_type_fallback_prompt_handles_empty_type_list():
    prompt = _build_quiz_generation_prompt(
        "Algebra", "Math", None, 1, [], "easy", "", grade_level="Grade 11"
    )
    assert "multiple_choice" in prompt
