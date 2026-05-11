import json
import os
import sys
from unittest.mock import MagicMock, patch

# Mock Firebase admin before importing app
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Mock firebase_admin to bypass initialization
mock_firebase_admin = MagicMock()
mock_firebase_admin.initialize_app = MagicMock()
mock_firebase_admin.get_app = MagicMock()
sys.modules["firebase_admin"] = mock_firebase_admin
sys.modules["firebase_admin.credentials"] = MagicMock()
sys.modules["firebase_admin.firestore"] = MagicMock()

os.environ["HF_TOKEN"] = "test-token-for-testing"
os.environ["DEEPSEEK_API_KEY"] = "test-ds-key-for-testing"

from fastapi.testclient import TestClient
import main as main_module

# Mock Firebase auth verification so protected endpoints can run in tests
main_module._firebase_ready = True
main_module._init_firebase_admin = lambda: None
main_module.firebase_firestore = None
main_module.firebase_auth = MagicMock()
main_module.firebase_auth.verify_id_token = MagicMock(
    return_value={
        "uid": "test-teacher-uid",
        "email": "teacher@example.com",
        "role": "teacher",
    }
)

app = main_module.app
# Pass Authorization header at client level so it propagates to all requests
client = TestClient(app, headers={"Authorization": "Bearer test-auth-token"})


def test_quiz_cap():
    """Test that quiz generation with numQuestions below limit succeeds."""
    quiz_json = json.dumps([
        {
            "questionType": "multiple_choice",
            "question": "What is 2+2?",
            "correctAnswer": "4",
            "options": ["A) 3", "B) 4", "C) 5", "D) 6"],
            "bloomLevel": "remember",
            "difficulty": "easy",
            "topic": "Arithmetic",
            "points": 1,
            "explanation": "2+2=4",
        }
    ])

    with patch("main.call_hf_chat", return_value=quiz_json):
        response = client.post("/api/quiz/generate", json={
            "topics": ["Algebra"],
            "subject": "Mathematics",
            "gradeLevel": "Grade 11",
            "numQuestions": 15,
        })

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert len(data["questions"]) >= 1
    print("Test passed!")


if __name__ == "__main__":
    test_quiz_cap()