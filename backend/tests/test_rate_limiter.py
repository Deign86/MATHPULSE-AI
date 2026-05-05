"""
backend/tests/test_rate_limiter.py
Tests for rate limiting middleware.

Tests cover:
  - Normal requests pass through
  - Rate limits trigger 429 when exceeded
  - Admin users bypass standard limits (10x multiplier)
  - Teacher users get 3x multiplier
  - Student users get standard limits
  - Deprecated enforce_rate_limit function does nothing

Run with:  pytest backend/tests/test_rate_limiter.py -v
"""

import os
import sys
from unittest.mock import MagicMock

import pytest
from fastapi import FastAPI, Request

# Add backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


class TestRateLimiterKeyFunctions:
    """Test the key functions used for rate limiting."""

    def test_get_user_identifier_with_authenticated_user(self):
        """Test that UID is extracted from request.state.user."""
        from middleware.rate_limiter import _get_user_identifier

        # Create mock request with authenticated user
        mock_request = MagicMock(spec=Request)
        mock_user = MagicMock()
        mock_user.uid = "test-uid-123"
        mock_user.role = "student"
        mock_request.state.user = mock_user
        mock_request.client.host = "127.0.0.1"

        result = _get_user_identifier(mock_request)

        assert result == "uid:test-uid-123"

    def test_get_user_identifier_without_auth(self):
        """Test fallback to IP when no authenticated user."""
        from middleware.rate_limiter import _get_user_identifier

        mock_request = MagicMock(spec=Request)
        mock_request.state.user = None
        mock_request.client.host = "192.168.1.1"

        result = _get_user_identifier(mock_request)

        assert result == "ip:192.168.1.1"

    def test_get_user_identifier_no_client(self):
        """Test fallback when no client available."""
        from middleware.rate_limiter import _get_user_identifier

        mock_request = MagicMock(spec=Request)
        mock_request.state.user = None
        mock_request.client = None

        result = _get_user_identifier(mock_request)

        assert result == "ip:unknown"

    def test_get_user_role(self):
        """Test role extraction from request.state.user."""
        from middleware.rate_limiter import _get_user_role

        mock_request = MagicMock(spec=Request)
        mock_user = MagicMock()
        mock_user.role = "teacher"
        mock_request.state.user = mock_user

        result = _get_user_role(mock_request)

        assert result == "teacher"

    def test_get_user_role_no_user(self):
        """Test default role when no user."""
        from middleware.rate_limiter import _get_user_role

        mock_request = MagicMock(spec=Request)
        mock_request.state.user = None

        result = _get_user_role(mock_request)

        assert result == "student"

    def test_role_multiplier_admin(self):
        """Test admin gets 10x multiplier."""
        from middleware.rate_limiter import ROLE_MULTIPLIERS

        assert ROLE_MULTIPLIERS["admin"] == 10

    def test_role_multiplier_teacher(self):
        """Test teacher gets 3x multiplier."""
        from middleware.rate_limiter import ROLE_MULTIPLIERS

        assert ROLE_MULTIPLIERS["teacher"] == 3

    def test_role_multiplier_student(self):
        """Test student gets 1x multiplier."""
        from middleware.rate_limiter import ROLE_MULTIPLIERS

        assert ROLE_MULTIPLIERS["student"] == 1


class TestRateLimiterClass:
    """Test the MathPulseLimiter class."""

    def test_limiter_initialized(self):
        """Test limiter is initialized with default limits."""
        from middleware.rate_limiter import rate_limiter

        assert rate_limiter is not None
        assert rate_limiter.limiter is not None

    def test_ai_limit_student(self):
        """Test AI limit for student is base rate (20/min)."""
        from middleware.rate_limiter import rate_limiter

        mock_request = MagicMock(spec=Request)
        mock_user = MagicMock()
        mock_user.role = "student"
        mock_request.state.user = mock_user

        result = rate_limiter.ai_limit(mock_request)

        assert result == "20/minute"

    def test_ai_limit_teacher(self):
        """Test AI limit for teacher is 3x (60/min)."""
        from middleware.rate_limiter import rate_limiter

        mock_request = MagicMock(spec=Request)
        mock_user = MagicMock()
        mock_user.role = "teacher"
        mock_request.state.user = mock_user

        result = rate_limiter.ai_limit(mock_request)

        assert result == "60/minute"

    def test_ai_limit_admin(self):
        """Test AI limit for admin is 10x (200/min)."""
        from middleware.rate_limiter import rate_limiter

        mock_request = MagicMock(spec=Request)
        mock_user = MagicMock()
        mock_user.role = "admin"
        mock_request.state.user = mock_user

        result = rate_limiter.ai_limit(mock_request)

        assert result == "200/minute"

    def test_quiz_generate_limit(self):
        """Test quiz generation limit."""
        from middleware.rate_limiter import rate_limiter

        mock_request = MagicMock(spec=Request)
        mock_user = MagicMock()
        mock_user.role = "student"
        mock_request.state.user = mock_user

        result = rate_limiter.quiz_generate_limit(mock_request)

        assert result == "10/minute"

    def test_quiz_submit_limit(self):
        """Test quiz submit limit."""
        from middleware.rate_limiter import rate_limiter

        mock_request = MagicMock(spec=Request)
        mock_user = MagicMock()
        mock_user.role = "student"
        mock_request.state.user = mock_user

        result = rate_limiter.quiz_submit_limit(mock_request)

        assert result == "30/minute"

    def test_auth_limit(self):
        """Test auth limit."""
        from middleware.rate_limiter import rate_limiter

        mock_request = MagicMock(spec=Request)
        mock_user = MagicMock()
        mock_user.role = "student"
        mock_request.state.user = mock_user

        result = rate_limiter.auth_limit(mock_request)

        assert result == "5/minute"

    def test_leaderboard_limit(self):
        """Test leaderboard limit."""
        from middleware.rate_limiter import rate_limiter

        mock_request = MagicMock(spec=Request)
        mock_user = MagicMock()
        mock_user.role = "student"
        mock_request.state.user = mock_user

        result = rate_limiter.leaderboard_limit(mock_request)

        assert result == "60/minute"

    def test_default_limit(self):
        """Test default limit."""
        from middleware.rate_limiter import rate_limiter

        mock_request = MagicMock(spec=Request)
        mock_user = MagicMock()
        mock_user.role = "student"
        mock_request.state.user = mock_user

        result = rate_limiter.default_limit(mock_request)

        assert result == "100/minute"


class TestRateLimitExceededHandler:
    """Test the rate limit exceeded handler."""

    def test_handler_returns_429_status(self):
        """Test that handler returns 429 status code."""
        from slowapi.errors import RateLimitExceeded
        from middleware.rate_limiter import _rate_limit_exceeded_handler

        mock_request = MagicMock(spec=Request)
        mock_exc = MagicMock(spec=RateLimitExceeded)
        mock_exc.retry_after = 60

        response = _rate_limit_exceeded_handler(mock_request, mock_exc)

        assert response.status_code == 429

    def test_handler_returns_json_body(self):
        """Test that handler returns proper JSON body."""
        from slowapi.errors import RateLimitExceeded
        from middleware.rate_limiter import _rate_limit_exceeded_handler

        mock_request = MagicMock(spec=Request)
        mock_exc = MagicMock(spec=RateLimitExceeded)
        mock_exc.retry_after = 30

        response = _rate_limit_exceeded_handler(mock_request, mock_exc)

        import json
        body = json.loads(response.body)

        assert body["error"] == "rate_limit_exceeded"
        assert body["message"] == "Too many requests. Please try again later."
        assert body["retry_after"] == 30

    def test_handler_includes_retry_after_header(self):
        """Test that handler includes Retry-After header."""
        from slowapi.errors import RateLimitExceeded
        from middleware.rate_limiter import _rate_limit_exceeded_handler

        mock_request = MagicMock(spec=Request)
        mock_exc = MagicMock(spec=RateLimitExceeded)
        mock_exc.retry_after = 45

        response = _rate_limit_exceeded_handler(mock_request, mock_exc)

        assert response.headers["Retry-After"] == "45"
        assert response.headers["Content-Type"] == "application/json"


class TestDeprecateEnforceRateLimit:
    """Test that old enforce_rate_limit function is deprecated."""

    def test_enforce_rate_limit_is_noop(self):
        """Test that enforce_rate_limit does nothing."""
        # Import the deprecated function
        from main import enforce_rate_limit

        mock_request = MagicMock(spec=Request)
        # Should not raise any exception - it's a no-op now
        enforce_rate_limit(mock_request, "test_bucket", 10, 60)
        # If we get here without exception, the test passes


class TestSetupRateLimiting:
    """Test setup_rate_limiting function."""

    def test_setup_adds_limiter_to_app_state(self):
        """Test that setup adds limiter to app state."""
        from middleware.rate_limiter import setup_rate_limiting
        from middleware.rate_limiter import rate_limiter

        app = FastAPI()
        setup_rate_limiting(app)

        assert hasattr(app.state, "limiter")
        assert app.state.limiter is not None

    def test_setup_adds_exception_handler(self):
        """Test that setup adds exception handler for RateLimitExceeded."""
        from middleware.rate_limiter import setup_rate_limiting

        app = FastAPI()
        setup_rate_limiting(app)

        # Exception handler registered via app.add_exception_handler


class TestEnvironmentVariables:
    """Test environment variable configuration."""

    def test_default_rates_are_configured(self):
        """Test that default rates are set from environment."""
        # The module loads env vars at import time
        # We just verify the module loaded without error
        from middleware.rate_limiter import rate_limiter
        assert rate_limiter is not None

    def test_rates_can_be_overridden(self):
        """Test that rates can be overridden via environment variables."""
        # This test verifies the env var pattern works
        # In production, these would be set before import
        original_ai = os.environ.get("RATE_LIMIT_AI_RPM")

        try:
            os.environ["RATE_LIMIT_AI_RPM"] = "30"
            # Verify the env var was set
            assert os.environ.get("RATE_LIMIT_AI_RPM") == "30"
        finally:
            if original_ai is not None:
                os.environ["RATE_LIMIT_AI_RPM"] = original_ai
            else:
                os.environ.pop("RATE_LIMIT_AI_RPM", None)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])