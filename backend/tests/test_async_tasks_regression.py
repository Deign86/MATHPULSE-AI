"""Mounted HTTP regressions for async task ownership and response defaults."""

from copy import deepcopy
from datetime import datetime, timezone
from fastapi.testclient import TestClient
import pytest

import main as main_module
from main import app

pytestmark = pytest.mark.usefixtures("isolated_mock_student_auth")

client = TestClient(app)


@pytest.fixture
def seeded_tasks():
    created_at = datetime.now(timezone.utc).isoformat()
    seeded = {
        f"phase3-owner-task-{index}": {
            "taskId": f"phase3-owner-task-{index}", "taskKind": "quiz", "ownerUid": "student-1",
            "status": "completed", "createdAt": created_at, "progressPercent": 100,
            "progressStage": "completed", "result": {"answer": 42},
        }
        for index in range(51)
    }
    seeded["phase3-other-task"] = {
            "taskId": "phase3-other-task", "taskKind": "quiz", "ownerUid": "student-2",
            "status": "queued", "createdAt": "2099-01-01T00:00:00+00:00", "progressPercent": 5,
            "progressStage": "queued", "result": {"answer": 7},
    }
    with main_module._async_tasks_lock:
        previous = deepcopy(main_module._async_tasks)
        main_module._async_tasks.clear()
        main_module._async_tasks.update(deepcopy(seeded))
    try:
        yield seeded
    finally:
        with main_module._async_tasks_lock:
            main_module._async_tasks.clear()
            main_module._async_tasks.update(previous)


def test_async_task_endpoints_require_authentication(seeded_tasks):
    assert client.get("/api/tasks/phase3-owner-task").status_code == 401
    assert client.get("/api/tasks").status_code == 401
    assert client.post("/api/tasks/phase3-owner-task/cancel").status_code == 401


def test_cross_tenant_poll_and_cancel_are_denied_without_registry_changes(seeded_tasks):
    with main_module._async_tasks_lock:
        before = deepcopy(main_module._async_tasks)
    headers = {"Authorization": "Bearer mock_token_student-1"}

    assert client.get("/api/tasks/phase3-other-task", headers=headers).status_code == 403
    assert client.post("/api/tasks/phase3-other-task/cancel", headers=headers).status_code == 403

    with main_module._async_tasks_lock:
        assert main_module._async_tasks == before


def test_async_task_missing_ids_return_not_found(seeded_tasks):
    headers = {"Authorization": "Bearer mock_token_student-1"}
    assert client.get("/api/tasks/phase3-missing", headers=headers).status_code == 404
    assert client.post("/api/tasks/phase3-missing/cancel", headers=headers).status_code == 404


def test_list_defaults_filtering_opt_in_results_and_admin_visibility(seeded_tasks):
    owner_headers = {"Authorization": "Bearer mock_token_student-1"}
    default_response = client.get("/api/tasks", headers=owner_headers)
    assert default_response.status_code == 200
    default_payload = default_response.json()
    assert default_payload["count"] == 50
    assert all(task["taskId"].startswith("phase3-owner-task-") for task in default_payload["tasks"])
    assert all(task["result"] is None for task in default_payload["tasks"])

    filtered_response = client.get("/api/tasks?status=queued", headers=owner_headers)
    assert filtered_response.status_code == 200
    assert filtered_response.json()["count"] == 0

    opt_in_response = client.get("/api/tasks?include_results=true", headers=owner_headers)
    assert opt_in_response.status_code == 200
    assert all(task["result"] == {"answer": 42} for task in opt_in_response.json()["tasks"])

    admin_response = client.get(
        "/api/tasks?limit=200",
        headers={"Authorization": "Bearer mock_token_admin-1"},
    )
    assert admin_response.status_code == 200
    assert admin_response.json()["count"] == 52
    assert any(task["taskId"] == "phase3-other-task" for task in admin_response.json()["tasks"])
