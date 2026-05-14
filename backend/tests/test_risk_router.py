import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock

from backend import main as main_module
app = main_module.app

# Mock auth verification so protected endpoints can run in tests without Firebase credentials.
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

client = TestClient(app, headers={"Authorization": "Bearer test-auth-token"})

def test_compute_risk_safe():
    response = client.post("/api/risk/compute", json={
        "d": 90, "g": 85, "p": 80,
        "weights": {"w1": 0.30, "w2": 0.40, "w3": 0.30}
    })
    assert response.status_code == 200
    data = response.json()
    assert data["wri"] == 85.0
    assert data["risk_status"] == "safe"

def test_compute_risk_at_risk():
    response = client.post("/api/risk/compute", json={
        "d": 60, "g": 70, "p": 65
    })
    assert response.status_code == 200
    data = response.json()
    assert data["wri"] == 65.5
    assert data["risk_status"] == "at_risk"

def test_compute_risk_monitoring():
    response = client.post("/api/risk/compute", json={
        "d": 78, "g": 76, "p": 74
    })
    assert response.status_code == 200
    data = response.json()
    assert data["wri"] == 76.0
    assert data["risk_status"] == "monitoring"

def test_compute_risk_missing_g_uses_d():
    response = client.post("/api/risk/compute", json={
        "d": 70, "g": None, "p": 80
    })
    assert response.status_code == 200
    data = response.json()
    assert data["g_fallback"] is True
    # WRI = 0.3*70 + 0.4*70 + 0.3*80 = 21 + 28 + 24 = 73.0
    assert data["wri"] == 73.0
    assert data["risk_status"] == "at_risk"

def test_compute_risk_no_diagnostic_returns_pending():
    response = client.post("/api/risk/compute", json={
        "d": None, "g": 80, "p": 90
    })
    assert response.status_code == 200
    data = response.json()
    assert data["wri"] is None
    assert data["risk_status"] == "pending_assessment"

def test_compute_risk_invalid_weights():
    response = client.post("/api/risk/compute", json={
        "d": 80, "g": 80, "p": 80,
        "weights": {"w1": 0.5, "w2": 0.5, "w3": 0.5}
    })
    assert response.status_code == 400

def test_compute_risk_batch():
    response = client.post("/api/risk/compute/batch", json={
        "students": [
            {"id": "s1", "d": 90, "g": 85, "p": 80},
            {"id": "s2", "d": 60, "g": 70, "p": 65},
        ]
    })
    assert response.status_code == 200
    data = response.json()
    assert len(data["results"]) == 2
    assert data["results"][0]["id"] == "s1"
    assert data["results"][0]["risk_status"] == "safe"
    assert data["results"][1]["id"] == "s2"
    assert data["results"][1]["risk_status"] == "at_risk"
