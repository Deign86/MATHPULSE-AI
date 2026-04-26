import base64
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.email_service import (  # noqa: E402
    BrevoApiEmailProvider,
    EmailMessagePayload,
    create_email_service_from_env,
)


_EMAIL_ENV_KEYS = [
    "BREVO_API_KEY",
    "BREVO_API_TOKEN",
    "BREVO_MCP_TOKEN",
    "BREVO_SMTP_LOGIN",
    "BREVO_SMTP_USERNAME",
    "BREVO_SMTP_USER",
    "BREVO_SMTP_KEY",
    "BREVO_SMTP_PASSWORD",
    "BREVO_SMTP_PASS",
    "BREVO_SMTP_HOST",
    "BREVO_SMTP_PORT",
    "MAIL_FROM_ADDRESS",
    "MAIL_FROM",
    "BREVO_FROM_ADDRESS",
    "MAIL_FROM_NAME",
    "BREVO_FROM_NAME",
    "MAIL_SEND_TIMEOUT_SEC",
]


def _clear_email_env(monkeypatch) -> None:
    for key in _EMAIL_ENV_KEYS:
        monkeypatch.delenv(key, raising=False)


def _encode_mcp_payload(payload: dict) -> str:
    encoded = base64.urlsafe_b64encode(json.dumps(payload).encode("utf-8")).decode("utf-8")
    return encoded.rstrip("=")


def test_create_email_service_uses_mcp_token_when_api_key_missing(monkeypatch) -> None:
    _clear_email_env(monkeypatch)
    monkeypatch.setenv("BREVO_MCP_TOKEN", _encode_mcp_payload({"api_key": "xkeysib-test-from-mcp"}))

    service = create_email_service_from_env()

    assert isinstance(service._primary_provider, BrevoApiEmailProvider)
    assert service._fallback_provider is None


def test_create_email_service_prefers_direct_api_key_when_present(monkeypatch) -> None:
    _clear_email_env(monkeypatch)
    monkeypatch.setenv("BREVO_API_KEY", "xkeysib-direct")
    monkeypatch.setenv("BREVO_MCP_TOKEN", _encode_mcp_payload({"api_key": "xkeysib-from-mcp"}))

    service = create_email_service_from_env()

    assert isinstance(service._primary_provider, BrevoApiEmailProvider)
    assert getattr(service._primary_provider, "_api_key") == "xkeysib-direct"


def test_create_email_service_returns_not_configured_for_invalid_mcp_token(monkeypatch) -> None:
    _clear_email_env(monkeypatch)
    monkeypatch.setenv("BREVO_MCP_TOKEN", "not-a-valid-token")

    service = create_email_service_from_env()
    result = service.send_transactional_email(
        EmailMessagePayload(
            to_name="Test User",
            to_email="test@example.com",
            subject="subject",
            html_content="<p>hello</p>",
            text_content="hello",
        )
    )

    assert result.success is False
    assert result.provider == "none"
    assert result.error_code == "email_not_configured"
