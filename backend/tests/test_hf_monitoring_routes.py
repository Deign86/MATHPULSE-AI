"""
Route-level tests for /api/hf/monitoring endpoint.

Follows the auth mock pattern from test_api.py.
All external HF API calls mocked.
"""

import os
from unittest.mock import MagicMock, Mock, patch

import pytest
from fastapi.testclient import TestClient

import main as main_module
from main import app

main_module._firebase_ready = True
main_module._init_firebase_admin = lambda: None
main_module.firebase_firestore = None
if getattr(main_module, "firebase_auth", None) is None:
    main_module.firebase_auth = MagicMock()
main_module.firebase_auth.verify_id_token = MagicMock(return_value={
    "uid": "admin-uid",
    "email": "admin@example.com",
    "role": "admin",
})

admin_client = TestClient(app, headers={"Authorization": "Bearer admin-token"})

EXPECTED_MONITORING_FIELDS = {
    "modelId", "modelStatus", "avgResponseTimeMs",
    "embeddingModelId", "embeddingModelStatus",
    "inferenceBalance", "totalPeriodCost",
    "hubApiCallsUsed", "hubApiCallsLimit",
    "zeroGpuMinutesUsed", "zeroGpuMinutesLimit",
    "publicStorageUsedTB", "publicStorageLimitTB",
    "lastChecked", "periodStart", "periodEnd",
    "activeProfile", "runtimeOverridesActive", "resolvedModels",
}


def _build_mock_billing():
    mock = Mock()
    mock.status_code = 200
    mock.json.return_value = {
        "usage": {"inferenceCreditsBilled": 1.23, "cost": 4.56},
        "active_period": {"start": "2026-01-01", "end": "2026-02-01"},
        "services": {
            "hfcompute": {"usage": [5], "limit": 25},
            "storage": {"usage": 0.5, "limit": 11.2},
        },
    }
    return mock


def _build_mock_model_ok():
    mock = Mock()
    mock.status_code = 200
    mock.json.return_value = {"state": "LoadComplete"}
    return mock


def _build_mock_emb_ok():
    mock = Mock()
    mock.status_code = 200
    mock.json.return_value = {}
    return mock


def _build_mock_latency_ok():
    mock = Mock()
    mock.status_code = 200
    return mock


@pytest.fixture(autouse=True)
def _mock_env():
    with patch.object(main_module, "HF_TOKEN", "hf_test_token"):
        yield


# ─── Auth Enforcement ────────────────────────────────────────


class TestHFMonitoringAuth:
    def test_rejects_bad_token(self):
        main_module.firebase_auth.verify_id_token = MagicMock(side_effect=Exception("bad"))
        c = TestClient(app, headers={"Authorization": "Bearer bad-token"})
        response = c.get("/api/hf/monitoring")
        main_module.firebase_auth.verify_id_token = MagicMock(return_value={
            "uid": "admin-uid", "email": "admin@example.com", "role": "admin",
        })
        assert response.status_code in {401, 403}


# ─── Response Shape ───────────────────────────────────────────


class TestHFMonitoringResponseShape:
    @patch("main.http_requests.get")
    @patch("main.http_requests.post")
    @patch("main.time.time")
    def test_success_response_contains_all_expected_fields(self, mock_time, mock_post, mock_get):
        mock_time.return_value = 1000.0
        mock_get.side_effect = [
            _build_mock_billing(),
            _build_mock_model_ok(),
            _build_mock_emb_ok(),
        ]
        mock_post.return_value = _build_mock_latency_ok()

        response = admin_client.get("/api/hf/monitoring")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        payload = data["data"]
        for field in EXPECTED_MONITORING_FIELDS:
            assert field in payload, f"Missing field: {field}"

    @patch("main.http_requests.get")
    @patch("main.http_requests.post")
    @patch("main.time.time")
    def test_all_billing_calls_fail_gracefully(self, mock_time, mock_post, mock_get):
        mock_time.return_value = 1000.0
        mock_get.side_effect = Exception("network down")
        mock_post.side_effect = Exception("network down")

        response = admin_client.get("/api/hf/monitoring")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True


# ─── Response Values ──────────────────────────────────────────


class TestHFMonitoringResponseValues:
    @patch("main.http_requests.get")
    @patch("main.http_requests.post")
    @patch("main.time.time")
    def test_default_model_status_is_unknown_when_api_fails(self, mock_time, mock_post, mock_get):
        mock_time.return_value = 1000.0
        mock_get.side_effect = Exception("billing down")
        mock_post.side_effect = Exception("probe down")

        response = admin_client.get("/api/hf/monitoring")
        data = response.json()
        assert data["success"] is True
        assert data["data"]["modelStatus"] == "Unknown"

    @patch("main.http_requests.get")
    @patch("main.http_requests.post")
    @patch("main.time.time")
    def test_embedding_model_id_is_returned(self, mock_time, mock_post, mock_get):
        mock_time.return_value = 1000.0
        mock_get.side_effect = [
            _build_mock_billing(),
            _build_mock_model_ok(),
            _build_mock_emb_ok(),
        ]
        mock_post.return_value = _build_mock_latency_ok()

        response = admin_client.get("/api/hf/monitoring")
        data = response.json()
        assert data["success"] is True
        assert "bge-small" in data["data"]["embeddingModelId"].lower()

    @patch("main.http_requests.get")
    @patch("main.http_requests.post")
    @patch("main.time.time")
    def test_resolved_models_contains_task_keys(self, mock_time, mock_post, mock_get):
        mock_time.return_value = 1000.0
        mock_get.side_effect = [
            _build_mock_billing(),
            _build_mock_model_ok(),
            _build_mock_emb_ok(),
        ]
        mock_post.return_value = _build_mock_latency_ok()

        response = admin_client.get("/api/hf/monitoring")
        data = response.json()
        resolved = data["data"].get("resolvedModels", {})
        expected_tasks = {"chat", "rag_lesson", "rag_problem", "quiz_generation"}
        for task in expected_tasks:
            assert task in resolved, f"Missing task: {task}"
            assert isinstance(resolved[task], str) and len(resolved[task]) > 0

    @patch("main.http_requests.get")
    @patch("main.http_requests.post")
    @patch("main.time.time")
    def test_active_profile_returned(self, mock_time, mock_post, mock_get):
        mock_time.return_value = 1000.0
        mock_get.side_effect = [
            _build_mock_billing(),
            _build_mock_model_ok(),
            _build_mock_emb_ok(),
        ]
        mock_post.return_value = _build_mock_latency_ok()

        response = admin_client.get("/api/hf/monitoring")
        data = response.json()
        assert data["success"] is True
        assert data["data"]["activeProfile"] in {"dev", "budget", "prod", ""}