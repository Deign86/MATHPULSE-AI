"""Quiz Battle API auth, answer redaction, and empty-bank regressions."""

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from main import app

pytestmark = pytest.mark.usefixtures("isolated_mock_student_auth")

client = TestClient(app)


def test_battle_generate_requires_authentication():
    response = client.post(
        "/api/quiz-battle/generate",
        json={"grade_level": 11, "topic": "Functions", "question_count": 1, "session_id": "s1", "player_ids": ["p1"]},
    )
    assert response.status_code == 401


def test_battle_generate_hides_correct_answer_for_external_call():
    questions = [{"question": "2+2?", "choices": ["3", "4"], "correct_answer": "B"}]
    service_tuple = (AsyncMock(return_value=questions), AsyncMock(), AsyncMock(), AsyncMock(return_value=questions))
    with patch("routes.quiz_battle._get_quiz_battle_services", return_value=service_tuple):
        response = client.post(
            "/api/quiz-battle/generate",
            headers={"Authorization": "Bearer mock_token_student-1"},
            json={"grade_level": 11, "topic": "Functions", "question_count": 1, "session_id": "s1", "player_ids": ["p1"]},
        )
    assert response.status_code == 200
    assert "correct_answer" not in response.json()["questions"][0]


def test_battle_teacher_only_results_reject_student():
    response = client.get(
        "/api/quiz-battle/results",
        headers={"Authorization": "Bearer mock_token_student-1"},
    )
    assert response.status_code == 403


def test_battle_generate_returns_not_found_when_question_bank_empty():
    service_tuple = (AsyncMock(return_value=[]), AsyncMock(), AsyncMock(), AsyncMock())
    with patch("routes.quiz_battle._get_quiz_battle_services", return_value=service_tuple):
        response = client.post(
            "/api/quiz-battle/generate",
            headers={"Authorization": "Bearer mock_token_student-1"},
            json={"grade_level": 11, "topic": "Unknown", "question_count": 1, "session_id": "s2", "player_ids": ["p1"]},
        )
    assert response.status_code == 404
