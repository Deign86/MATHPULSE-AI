"""Tests for DeepSeek startup authentication validation and health visibility.

These tests define the contract for startup credential validation and health visibility
before production implementation exists (RED state).

Contract under test:
(a) validate_deepseek_auth(timeout_s=5.0) when DeepSeek returns HTTP 401:
    - returns a status representation with status == 'auth_failed'
    - logs/captures key suffix in '****last4' format
    - ensures the full fake key string never appears in logs or output
(b) GET /health when injected with cached auth state:
    - returns additive dictionary under 'deepseek' key: {status, key_suffix, checked_at}
    - contains only masked key suffix (e.g. '****1234')
    - ensures full fake key string never appears in response body
(c) validate_deepseek_auth(timeout_s=5.0) when DeepSeek returns HTTP 200 / successful probe:
    - returns status == 'ok'
"""

from __future__ import annotations

import logging
import os
from unittest.mock import MagicMock, patch

import httpx
import openai
import pytest
from fastapi.testclient import TestClient

# Ensure test env vars match existing test harness conventions
os.environ["DEEPSEEK_API_KEY"] = "mock-key-for-testing"
os.environ["INFERENCE_MAX_RETRIES"] = "1"
os.environ["INFERENCE_BACKGROUND_MAX_RETRIES"] = "1"
os.environ["INFERENCE_INTERACTIVE_MAX_RETRIES"] = "1"
os.environ["INFERENCE_BACKOFF_SEC"] = "0"
os.environ["INFERENCE_BACKGROUND_BACKOFF_SEC"] = "0"

import main as main_module
from main import app

# Test client configured following existing backend test patterns
client = TestClient(app, headers={"Authorization": "Bearer mock_token_teacher_T"})

FAKE_DEEPSEEK_KEY = "sk-fake-test-key-1234"
EXPECTED_MASKED_SUFFIX = "****1234"


@pytest.fixture(autouse=True)
def _setup_common_mocks():
    """Bypass Firebase token verification, time.sleep backoff, and curriculum retrieval."""
    with patch.object(
        main_module.firebase_auth,
        "verify_id_token",
        return_value={"uid": "teacher_T", "role": "teacher"},
    ), patch(
        "routes.rag_routes.retrieve_lesson_pdf_context",
        return_value=([], "mock_file"),
    ), patch(
        "time.sleep",
        return_value=None,
    ):
        yield


class TestStartupAuthVisibility:
    """Contract tests for DeepSeek auth-visibility at startup and /health."""

    def test_mocked_401_startup_auth_check_yields_auth_failed_and_redacts_key(
        self, caplog: pytest.LogCaptureFixture
    ):
        """(a) Mocked-401 startup auth check yields 'auth_failed' with masked suffix and no raw key."""
        from startup_validation import (
            compute_key_fingerprint,
            validate_deepseek_auth,
        )

        req = httpx.Request("POST", "https://api.deepseek.com")
        api_error_401 = openai.APIError(
            f"Authentication failed for key {EXPECTED_MASKED_SUFFIX}",
            request=req,
            body={"error": {"message": f"Invalid API key {EXPECTED_MASKED_SUFFIX}"}},
        )
        api_error_401.status_code = 401

        mock_client = MagicMock()
        mock_client.models.list.side_effect = api_error_401
        mock_client.chat.completions.create.side_effect = api_error_401

        fingerprint = compute_key_fingerprint(FAKE_DEEPSEEK_KEY)
        assert EXPECTED_MASKED_SUFFIX in fingerprint
        assert FAKE_DEEPSEEK_KEY not in fingerprint

        caplog.clear()
        with caplog.at_level(logging.DEBUG), patch.dict(
            os.environ, {"DEEPSEEK_API_KEY": FAKE_DEEPSEEK_KEY}
        ), patch(
            "services.inference_client.get_deepseek_client",
            return_value=mock_client,
        ):
            auth_status = validate_deepseek_auth(timeout_s=5.0)

        status_value = (
            auth_status.get("status")
            if isinstance(auth_status, dict)
            else getattr(auth_status, "status", None)
        )
        assert status_value == "auth_failed"

        captured_logs = caplog.text
        assert EXPECTED_MASKED_SUFFIX in captured_logs
        assert FAKE_DEEPSEEK_KEY not in captured_logs

    def test_health_endpoint_returns_additive_cached_deepseek_auth_state(self):
        """(b) GET /health returns additive deepseek: {status, key_suffix, checked_at} with masked key."""
        import startup_validation

        cached_state_holder = getattr(
            startup_validation, "cached_deepseek_auth_state"
        )

        injected_state = {
            "status": "auth_failed",
            "key_suffix": EXPECTED_MASKED_SUFFIX,
            "checked_at": "2026-09-22T00:00:00Z",
        }

        with patch.object(
            startup_validation,
            "cached_deepseek_auth_state",
            injected_state,
        ), patch.dict(
            os.environ, {"DEEPSEEK_API_KEY": FAKE_DEEPSEEK_KEY}
        ):
            response = client.get("/health")

        assert response.status_code == 200
        response_body = response.json()

        assert "deepseek" in response_body
        deepseek_info = response_body["deepseek"]
        assert deepseek_info.get("status") == "auth_failed"
        assert deepseek_info.get("key_suffix") == EXPECTED_MASKED_SUFFIX
        assert "checked_at" in deepseek_info

        raw_response_text = response.text
        assert EXPECTED_MASKED_SUFFIX in raw_response_text
        assert FAKE_DEEPSEEK_KEY not in raw_response_text

    def test_mocked_ok_startup_auth_check_yields_ok_status(self):
        """(c) Mocked-OK startup auth check yields status 'ok'."""
        from startup_validation import validate_deepseek_auth

        mock_client = MagicMock()
        mock_client.models.list.return_value = MagicMock()
        mock_client.chat.completions.create.return_value = MagicMock()

        with patch.dict(
            os.environ, {"DEEPSEEK_API_KEY": FAKE_DEEPSEEK_KEY}
        ), patch(
            "services.inference_client.get_deepseek_client",
            return_value=mock_client,
        ):
            auth_status = validate_deepseek_auth(timeout_s=5.0)

        status_value = (
            auth_status.get("status")
            if isinstance(auth_status, dict)
            else getattr(auth_status, "status", None)
        )
        assert status_value == "ok"
