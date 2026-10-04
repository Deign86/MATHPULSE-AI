"""Group B gate: quiz generation fails loudly below the acceptance floor (TCH-051/070)."""

import json
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

import main as main_module

main_module.firebase_firestore = None
main_module.firebase_auth = MagicMock()
main_module.firebase_auth.verify_id_token = MagicMock(
    return_value={
        "uid": "test-teacher-uid",
        "email": "teacher@example.com",
        "role": "teacher",
    }
)

client = TestClient(app=main_module.app, headers={"Authorization": "Bearer mock_token"})

ONE_QUESTION_JSON = json.dumps(
    [
        {
            "questionType": "identification",
            "question": "Define slope.",
            "correctAnswer": "Rise over run",
            "bloomLevel": "remember",
            "difficulty": "easy",
            "topic": "Financial Mathematics",
            "points": 1,
            "explanation": "Slope = rise/run.",
        }
    ]
)


def test_generate_quiz_shortfall_below_floor_fails_loudly():
    """1 of 5 requested (< 70% floor) must 500 with an exact shortfall message."""
    with patch(
        "main.call_hf_chat_async",
        new=AsyncMock(return_value=ONE_QUESTION_JSON),
    ):
        response = client.post(
            "/api/quiz/generate",
            json={
                "topics": ["Financial Mathematics"],
                "gradeLevel": "Grade 11",
                "numQuestions": 5,
            },
        )
    assert response.status_code == 500, f"Expected 500, got {response.status_code}: {response.text}"
    assert "only 1 of 5" in response.json()["detail"]
