import os
import sys
from unittest.mock import MagicMock

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
client = TestClient(app, headers={"Authorization": "Bearer test-auth-token"})


def test_quiz_cap():
    """Test that quiz generation capped at 10 items returns 400."""
    response = client.post("/api/quiz/generate", json={
        "topics": ["Algebra"],
        "subject": "Mathematics",
        "gradeLevel": "Grade 11",
        "numQuestions": 15,
    })
    assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
    assert "capped at 10 items" in response.json()["detail"]
    print("Test passed!")


if __name__ == "__main__":
    test_quiz_cap()