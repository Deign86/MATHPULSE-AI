from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_quiz_cap():
    response = client.post("/api/quiz/generate", json={
        "topic": "Math",
        "subject": "Math",
        "questionCount": 15
    })
    assert response.status_code == 400
    assert "capped at 10 items" in response.json()["detail"]
    print("Test passed!")

if __name__ == "__main__":
    test_quiz_cap()
