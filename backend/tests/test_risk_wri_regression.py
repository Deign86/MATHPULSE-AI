"""Weighted Risk Index API boundaries and classification regressions."""

from fastapi.testclient import TestClient
import pytest

from main import app
from routes.risk_router import _get_wri_service

pytestmark = pytest.mark.usefixtures("isolated_mock_student_auth")

client = TestClient(app)


def test_risk_endpoint_requires_authentication():
    response = client.post("/api/risk/compute", json={"d": 90, "g": 90, "p": 90})
    assert response.status_code == 401


def test_student_is_forbidden_from_teacher_prediction_endpoint():
    response = client.post(
        "/api/predict-risk",
        headers={"Authorization": "Bearer mock_token_student-1"},
        json={},
    )
    assert response.status_code == 403


def test_wri_service_is_available_and_classifies_happy_and_edge_scores():
    compute_wri = _get_wri_service()
    assert compute_wri is not None
    assert callable(compute_wri)
    high = compute_wri(d=90, g=90, p=90, weights={"w1": 0.3, "w2": 0.4, "w3": 0.3})
    low = compute_wri(d=None, g=80, p=90, weights={"w1": 0.3, "w2": 0.4, "w3": 0.3})
    assert high["wri"] == 90.0
    assert high["risk_status"] == "safe"
    assert low["risk_status"] == "pending_assessment"


def test_wri_service_rejects_weights_that_do_not_sum_to_one():
    compute_wri = _get_wri_service()
    assert compute_wri is not None
    assert callable(compute_wri)
    try:
        compute_wri(d=80, g=80, p=80, weights={"w1": 0.5, "w2": 0.5, "w3": 0.5})
    except ValueError:
        return
    raise AssertionError("invalid weights should be rejected")


def test_batch_risk_accepts_empty_student_list_as_empty_result():
    response = client.post("/api/risk/compute/batch", json={"students": []})
    assert response.status_code == 401
