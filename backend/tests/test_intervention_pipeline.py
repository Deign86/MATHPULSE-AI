"""Intervention and student intelligence pipeline authorization regressions."""

from unittest.mock import patch

from fastapi.testclient import TestClient
from pydantic import ValidationError
import pytest

from main import app
from routes.intervention_routes import CompleteStepRequest, GenerateRequest
from routes.pipeline_routes import PipelineEventPayload
import services.student_intelligence_pipeline as pipeline_service

pytestmark = pytest.mark.usefixtures("isolated_mock_student_auth")

client = TestClient(app)


def test_intervention_request_models_accept_happy_values_and_default_metrics():
    assert GenerateRequest(student_id="s1").student_id == "s1"
    completion = CompleteStepRequest()
    assert completion.score == 0.0 and completion.time_spent_minutes == 0


def test_intervention_step_requires_authentication_and_student_cannot_recompute():
    assert client.post("/api/intervention/s1/step/1/complete", json={}).status_code == 401
    response = client.post(
        "/api/pipeline/profile/s2/recompute",
        headers={"Authorization": "Bearer mock_token_student-1"},
    )
    assert response.status_code == 403


def test_pipeline_event_happy_path_accepts_own_event():
    response = client.post(
        "/api/pipeline/event",
        headers={"Authorization": "Bearer mock_token_student-1"},
        json={"student_id": "student-1", "event_type": "diagnostic", "event_data": {}, "occurred_at": "2026-01-01T00:00:00Z"},
    )
    assert response.status_code == 202
    assert response.json()["status"] == "accepted"


def test_pipeline_blocks_cross_student_event_and_rejects_unknown_event_type():
    response = client.post(
        "/api/pipeline/event",
        headers={"Authorization": "Bearer mock_token_student-1"},
        json={"student_id": "student-2", "event_type": "quiz", "occurred_at": "2026-01-01T00:00:00Z"},
    )
    assert response.status_code == 403
    with pytest.raises(ValidationError):
        PipelineEventPayload.model_validate({"student_id": "student-1", "event_type": "unknown", "occurred_at": "now"})


def test_pipeline_recompute_requires_staff_and_intervention_bad_step_is_rejected():
    assert client.post("/api/pipeline/profile/s1/recompute").status_code == 401
    response = client.post(
        "/api/intervention/s1/step/not-an-integer/complete",
        headers={"Authorization": "Bearer mock_token_student-1"},
        json={},
    )
    assert response.status_code == 422


@pytest.mark.parametrize(
    ("staff_uid", "role"),
    [("teacher-1", "teacher"), ("admin-1", "admin")],
)
def test_staff_recompute_queues_one_force_recompute_event(monkeypatch, staff_uid, role):
    events = []

    class PipelineBoundary:
        async def process_event(self, event):
            events.append(event)

    monkeypatch.setattr(pipeline_service, "get_pipeline", lambda: PipelineBoundary())
    response = client.post(
        "/api/pipeline/profile/student-42/recompute",
        headers={"Authorization": f"Bearer mock_token_{staff_uid}"},
    )

    assert response.status_code == 200
    assert response.json() == {"status": "recompute_queued", "student_id": "student-42"}
    assert len(events) == 1
    assert events[0].student_id == "student-42"
    assert events[0].event_type == "force_recompute"
    assert events[0].teacher_id == staff_uid
