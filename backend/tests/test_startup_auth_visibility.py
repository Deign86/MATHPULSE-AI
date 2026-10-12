"""Tests for Anthropic startup authentication validation and health visibility.

These tests define the contract for startup credential validation and health visibility
before production implementation exists (RED state).

Contract under test:
(a) validate_anthropic_auth(timeout_s=5.0) when Anthropic returns HTTP 401:
    - returns a status representation with status == 'auth_failed'
    - logs/captures key suffix in '****last4' format
    - ensures the full fake key string never appears in logs or output
(b) GET /health when injected with cached auth state:
    - returns additive dictionary under 'anthropic' key: {status, key_suffix, checked_at}
    - contains only masked key suffix (e.g. '****1234')
    - ensures full fake key string never appears in response body
(c) validate_anthropic_auth(timeout_s=5.0) when Anthropic returns HTTP 200 / successful probe:
    - returns status == 'ok'
(d) validate_anthropic_auth(timeout_s=5.0) when the connection fails or times out:
    - returns status == 'connection_failed'
(e) validate_anthropic_auth(timeout_s=5.0) without a configured key:
    - returns status == 'unchecked' and does not contact Anthropic
"""

from __future__ import annotations

import logging
import os
from unittest.mock import MagicMock, patch

import anthropic
import httpx2
import pytest
from fastapi.testclient import TestClient

# Ensure test env vars match existing test harness conventions
os.environ["ANTHROPIC_API_KEY"] = "mock-key-for-testing"
os.environ["INFERENCE_MAX_RETRIES"] = "1"
os.environ["INFERENCE_BACKGROUND_MAX_RETRIES"] = "1"
os.environ["INFERENCE_INTERACTIVE_MAX_RETRIES"] = "1"
os.environ["INFERENCE_BACKOFF_SEC"] = "0"
os.environ["INFERENCE_BACKGROUND_BACKOFF_SEC"] = "0"

import main as main_module
from main import app

# Test client configured following existing backend test patterns
client = TestClient(app, headers={"Authorization": "Bearer mock_token_teacher_T"})

FAKE_API_KEY = "sk-fake-test-key-1234"
EXPECTED_MASKED_SUFFIX = "****1234"
PROBE_REQUEST = httpx2.Request("GET", "https://api.anthropic.com/v1/models")


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
    """Contract tests for Anthropic auth-visibility at startup and /health."""

    def test_mocked_401_startup_auth_check_yields_auth_failed_and_redacts_key(
        self, caplog: pytest.LogCaptureFixture
    ):
        """(a) Mocked-401 startup auth check yields 'auth_failed' with masked suffix and no raw key."""
        from startup_validation import (
            compute_key_fingerprint,
            validate_anthropic_auth,
        )

        api_error_401 = anthropic.AuthenticationError(
            f"Authentication failed for key {EXPECTED_MASKED_SUFFIX}",
            response=httpx2.Response(401, request=PROBE_REQUEST),
            body={"error": {"message": f"Invalid API key {EXPECTED_MASKED_SUFFIX}"}},
        )

        mock_client = MagicMock()
        mock_client.models.list.side_effect = api_error_401

        fingerprint = compute_key_fingerprint(FAKE_API_KEY)
        assert EXPECTED_MASKED_SUFFIX in fingerprint
        assert FAKE_API_KEY not in fingerprint

        caplog.clear()
        with caplog.at_level(logging.DEBUG), patch.dict(
            os.environ, {"ANTHROPIC_API_KEY": FAKE_API_KEY}
        ), patch(
            "services.ai_client.get_anthropic_client",
            return_value=mock_client,
        ):
            auth_status = validate_anthropic_auth(timeout_s=5.0)

        status_value = (
            auth_status.get("status")
            if isinstance(auth_status, dict)
            else getattr(auth_status, "status", None)
        )
        assert status_value == "auth_failed"

        captured_logs = caplog.text
        assert EXPECTED_MASKED_SUFFIX in captured_logs
        assert FAKE_API_KEY not in captured_logs

    def test_health_endpoint_returns_additive_cached_anthropic_auth_state(self):
        """(b) GET /health returns additive anthropic: {status, key_suffix, checked_at} with masked key."""
        import startup_validation

        injected_state = {
            "status": "auth_failed",
            "key_suffix": EXPECTED_MASKED_SUFFIX,
            "checked_at": "2026-09-22T00:00:00Z",
        }

        with patch.object(
            startup_validation,
            "cached_anthropic_auth_state",
            injected_state,
        ), patch.dict(
            os.environ, {"ANTHROPIC_API_KEY": FAKE_API_KEY}
        ):
            response = client.get("/health")

        assert response.status_code == 200
        response_body = response.json()

        assert "anthropic" in response_body
        anthropic_info = response_body["anthropic"]
        assert anthropic_info.get("status") == "auth_failed"
        assert anthropic_info.get("key_suffix") == EXPECTED_MASKED_SUFFIX
        assert "checked_at" in anthropic_info

        raw_response_text = response.text
        assert EXPECTED_MASKED_SUFFIX in raw_response_text
        assert FAKE_API_KEY not in raw_response_text

    def test_mocked_ok_startup_auth_check_yields_ok_status(self):
        """(c) Mocked-OK startup auth check yields status 'ok'."""
        from startup_validation import validate_anthropic_auth

        mock_client = MagicMock()
        mock_client.models.list.return_value = MagicMock()

        with patch.dict(
            os.environ, {"ANTHROPIC_API_KEY": FAKE_API_KEY}
        ), patch(
            "services.ai_client.get_anthropic_client",
            return_value=mock_client,
        ):
            auth_status = validate_anthropic_auth(timeout_s=5.0)

        status_value = (
            auth_status.get("status")
            if isinstance(auth_status, dict)
            else getattr(auth_status, "status", None)
        )
        assert status_value == "ok"
        mock_client.models.list.assert_called_once_with(limit=1, timeout=5.0)

    @pytest.mark.parametrize(
        "probe_error",
        [
            anthropic.APIConnectionError(request=PROBE_REQUEST),
            anthropic.APITimeoutError(request=PROBE_REQUEST),
            anthropic.InternalServerError(
                "overloaded", response=httpx2.Response(500, request=PROBE_REQUEST), body=None
            ),
        ],
        ids=["connection", "timeout", "server_error"],
    )
    def test_unreachable_api_yields_connection_failed(self, probe_error):
        """(d) A failing probe that is not an auth rejection reports 'connection_failed'."""
        from startup_validation import validate_anthropic_auth

        mock_client = MagicMock()
        mock_client.models.list.side_effect = probe_error

        with patch.dict(
            os.environ, {"ANTHROPIC_API_KEY": FAKE_API_KEY}
        ), patch(
            "services.ai_client.get_anthropic_client",
            return_value=mock_client,
        ):
            auth_status = validate_anthropic_auth(timeout_s=5.0)

        assert auth_status["status"] == "connection_failed"
        assert auth_status["key_suffix"] == EXPECTED_MASKED_SUFFIX

    def test_missing_key_yields_unchecked_without_probing(self):
        """(e) No configured key means nothing to probe: status 'unchecked'."""
        from startup_validation import validate_anthropic_auth

        with patch.dict(os.environ, {"ANTHROPIC_API_KEY": ""}), patch(
            "services.ai_client.get_anthropic_client"
        ) as get_client:
            auth_status = validate_anthropic_auth(timeout_s=5.0)

        assert auth_status["status"] == "unchecked"
        assert auth_status["key_suffix"] == "****"
        get_client.assert_not_called()
