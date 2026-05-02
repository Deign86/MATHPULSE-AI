"""
Route-level tests for the /api/admin/model-config endpoints.

Follows the auth mock pattern from test_api.py.
"""

import os
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

import main as main_module
from main import app
from services.inference_client import reset_runtime_overrides

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

_RESOLVED_KEYS = {
    "INFERENCE_MODEL_ID", "INFERENCE_CHAT_MODEL_ID",
    "HF_QUIZ_MODEL_ID", "HF_RAG_MODEL_ID", "INFERENCE_LOCK_MODEL_ID",
}
_KNOWN_PROFILES = {"dev", "budget", "prod"}
_BASE_CONFIG_KEYS = {"profile", "overrides", "resolved"}


@pytest.fixture(autouse=True)
def _mock_firestore():
    with patch("services.inference_client._save_runtime_config_to_firestore", side_effect=None):
        yield


@pytest.fixture(autouse=True)
def _reset_overrides():
    reset_runtime_overrides()
    yield
    reset_runtime_overrides()


# ─── Auth Enforcement ────────────────────────────────────────


class TestAuth:
    def test_get_rejects_bad_token(self):
        main_module.firebase_auth.verify_id_token = MagicMock(side_effect=Exception("bad"))
        c = TestClient(app, headers={"Authorization": "Bearer bad-token"})
        response = c.get("/api/admin/model-config")
        main_module.firebase_auth.verify_id_token = MagicMock(return_value={
            "uid": "admin-uid", "email": "admin@example.com", "role": "admin",
        })
        assert response.status_code in {401, 403}

    def test_get_rejects_student_role(self):
        main_module.firebase_auth.verify_id_token = MagicMock(return_value={
            "uid": "student-uid", "email": "s@example.com", "role": "student",
        })
        c = TestClient(app, headers={"Authorization": "Bearer student-token"})
        response = c.get("/api/admin/model-config")
        main_module.firebase_auth.verify_id_token = MagicMock(return_value={
            "uid": "admin-uid", "email": "admin@example.com", "role": "admin",
        })
        assert response.status_code == 403


# ─── GET Model Config ─────────────────────────────────────────


class TestGetModelConfig:
    def test_returns_base_keys(self):
        response = admin_client.get("/api/admin/model-config")
        assert response.status_code == 200
        data = response.json()
        for key in _BASE_CONFIG_KEYS:
            assert key in data

    def test_resolved_contains_expected_keys(self):
        response = admin_client.get("/api/admin/model-config")
        data = response.json()
        resolved = data.get("resolved", {})
        for key in _RESOLVED_KEYS:
            assert key in resolved

    def test_available_profiles_present(self):
        response = admin_client.get("/api/admin/model-config")
        data = response.json()
        profiles = data.get("availableProfiles", [])
        for p in _KNOWN_PROFILES:
            assert p in profiles

    def test_profile_descriptions_present(self):
        response = admin_client.get("/api/admin/model-config")
        data = response.json()
        descriptions = data.get("profileDescriptions", {})
        for p in _KNOWN_PROFILES:
            assert p in descriptions

    def test_resolved_models_are_non_empty_strings(self):
        admin_client.post("/api/admin/model-config/profile", json={"profile": "dev"})
        response = admin_client.get("/api/admin/model-config")
        data = response.json()
        resolved = data.get("resolved", {})
        for key, value in resolved.items():
            assert isinstance(value, str), f"{key} is not a string: {value}"
            assert len(value) > 0, f"Resolved key {key} is empty"


# ─── POST Profile Switch ─────────────────────────────────────


class TestPostProfileSwitch:
    def test_switch_to_dev_succeeds(self):
        response = admin_client.post("/api/admin/model-config/profile", json={"profile": "dev"})
        assert response.status_code == 200
        assert response.json()["success"] is True

    def test_switch_to_budget_succeeds(self):
        response = admin_client.post("/api/admin/model-config/profile", json={"profile": "budget"})
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["applied"]["profile"] == "budget"

    def test_switch_to_prod_succeeds(self):
        response = admin_client.post("/api/admin/model-config/profile", json={"profile": "prod"})
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["applied"]["profile"] == "prod"

    def test_switch_to_invalid_profile_returns_400(self):
        response = admin_client.post("/api/admin/model-config/profile", json={"profile": "nonexistent"})
        assert response.status_code == 400

    def test_switch_missing_profile_field(self):
        response = admin_client.post("/api/admin/model-config/profile", json={})
        assert response.status_code == 422


# ─── POST Override ───────────────────────────────────────────


class TestPostOverride:
    def test_set_valid_override_key_succeeds(self):
        response = admin_client.post(
            "/api/admin/model-config/override",
            json={"key": "INFERENCE_MODEL_ID", "value": "test/override-model"},
        )
        assert response.status_code == 200
        assert response.json()["success"] is True

    def test_set_invalid_override_key_returns_400(self):
        response = admin_client.post(
            "/api/admin/model-config/override",
            json={"key": "EMBEDDING_MODEL", "value": "test/emb"},
        )
        assert response.status_code == 400

    def test_override_is_visible_in_subsequent_get(self):
        admin_client.post(
            "/api/admin/model-config/override",
            json={"key": "INFERENCE_MODEL_ID", "value": "custom/model-v2"},
        )
        response = admin_client.get("/api/admin/model-config")
        data = response.json()
        overrides = data.get("overrides", {})
        assert "INFERENCE_MODEL_ID" in overrides
        assert overrides["INFERENCE_MODEL_ID"] == "custom/model-v2"


# ─── DELETE Reset ───────────────────────────────────────────


class TestDeleteReset:
    def test_reset_returns_success(self):
        response = admin_client.delete("/api/admin/model-config/reset")
        assert response.status_code == 200
        assert response.json()["success"] is True

    def test_reset_clears_override(self):
        admin_client.post(
            "/api/admin/model-config/override",
            json={"key": "INFERENCE_MODEL_ID", "value": "temp/model"},
        )
        response = admin_client.delete("/api/admin/model-config/reset")
        assert response.status_code == 200
        overrides = response.json()["current"]["overrides"]
        assert overrides == {}

    def test_reset_clears_profile(self):
        admin_client.post("/api/admin/model-config/profile", json={"profile": "budget"})
        response = admin_client.delete("/api/admin/model-config/reset")
        assert response.status_code == 200
        assert response.json()["current"]["profile"] == ""


# ─── Profile after switch ────────────────────────────────────


class TestProfileAfterSwitch:
    def test_switched_profile_visible_in_get(self):
        admin_client.post("/api/admin/model-config/profile", json={"profile": "dev"})
        response = admin_client.get("/api/admin/model-config")
        assert response.json()["profile"] == "dev"