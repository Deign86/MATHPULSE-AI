"""
Route-level tests for /api/hf/monitoring endpoint.
Updated for DeepSeek AI monitoring.
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
    "provider", "apiBaseUrl",
}

EXPECTED_FIELDS_AFTER_DS_REPLACEMENT = EXPECTED_MONITORING_FIELDS


@pytest.fixture(autouse=True)
def _mock_env():
    with patch.dict(os.environ, {"DEEPSEEK_API_KEY": "test-ds-monitoring-key"}):
        yield


# ─── Auth Enforcement ────────────────────────────────────────


class TestMonitoringAuth:
    def test_rejects_bad_token(self):
        main_module.firebase_auth.verify_id_token = MagicMock(side_effect=Exception("bad"))
        c = TestClient(app, headers={"Authorization": "Bearer bad-token"})
        response = c.get("/api/hf/monitoring")
        main_module.firebase_auth.verify_id_token = MagicMock(return_value={
            "uid": "admin-uid", "email": "admin@example.com", "role": "admin",
        })
        assert response.status_code in {401, 403}


# ─── Response Shape ───────────────────────────────────────────


class TestMonitoringResponseShape:
    @patch("main.time.time")
    def test_success_response_contains_all_expected_fields(self, mock_time):
        mock_time.return_value = 1000.0

        response = admin_client.get("/api/hf/monitoring")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        payload = data["data"]
        for field in EXPECTED_FIELDS_AFTER_DS_REPLACEMENT:
            assert field in payload, f"Missing field: {field}"

    @patch("main.time.time")
    @patch("services.ai_client.get_deepseek_client")
    def test_all_probes_fail_gracefully(self, mock_ds_client_fn, mock_time):
        mock_time.return_value = 1000.0
        mock_client = MagicMock()
        mock_client.chat.completions.create.side_effect = Exception("network down")
        mock_ds_client_fn.return_value = mock_client

        response = admin_client.get("/api/hf/monitoring")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True


# ─── Response Values ──────────────────────────────────────────


class TestMonitoringResponseValues:
    @patch("services.ai_client.get_deepseek_client")
    @patch("main.time.time")
    def test_model_status_is_degraded_when_probe_fails(self, mock_time, mock_ds_client_fn):
        mock_time.return_value = 1000.0
        mock_client = MagicMock()
        mock_client.chat.completions.create.side_effect = Exception("probe down")
        mock_ds_client_fn.return_value = mock_client

        response = admin_client.get("/api/hf/monitoring")
        data = response.json()
        assert data["success"] is True
        assert data["data"]["modelStatus"] == "Degraded"

    @patch("main.time.time")
    def test_embedding_model_id_is_returned(self, mock_time):
        mock_time.return_value = 1000.0

        response = admin_client.get("/api/hf/monitoring")
        data = response.json()
        assert data["success"] is True
        assert "bge-small" in data["data"]["embeddingModelId"].lower()

    @patch("main.time.time")
    def test_resolved_models_contains_task_keys(self, mock_time):
        mock_time.return_value = 1000.0

        response = admin_client.get("/api/hf/monitoring")
        data = response.json()
        resolved = data["data"].get("resolvedModels", {})
        expected_tasks = {"chat", "rag_lesson", "rag_problem", "quiz_generation"}
        for task in expected_tasks:
            assert task in resolved, f"Missing task: {task}"
            assert isinstance(resolved[task], str) and len(resolved[task]) > 0

    @patch("main.time.time")
    def test_active_profile_returned(self, mock_time):
        mock_time.return_value = 1000.0

        response = admin_client.get("/api/hf/monitoring")
        data = response.json()
        assert data["success"] is True
        assert data["data"]["activeProfile"] in {"dev", "budget", "prod", ""}

    @patch("main.time.time")
    def test_provider_and_api_base_url_present(self, mock_time):
        mock_time.return_value = 1000.0

        response = admin_client.get("/api/hf/monitoring")
        data = response.json()
        assert data["success"] is True
        assert data["data"]["provider"] == "deepseek"
        assert "api.deepseek.com" in data["data"]["apiBaseUrl"]
