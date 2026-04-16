import base64
import logging
import os
import smtplib
import json
from dataclasses import dataclass
from email.message import EmailMessage
from typing import Optional, Protocol

import requests


logger = logging.getLogger("mathpulse")


def _first_nonempty_env(*names: str) -> str:
    for name in names:
        value = os.getenv(name, "")
        if value and value.strip():
            return value.strip()
    return ""


def _parse_int_env(value: str, default: int, *, env_name: str) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        logger.warning("Invalid %s value '%s'; using default %s", env_name, value, default)
        return default

    if parsed <= 0:
        logger.warning("Invalid %s value '%s'; using default %s", env_name, value, default)
        return default

    return parsed


def _extract_brevo_api_key(raw_value: str) -> str:
    value = (raw_value or "").strip()
    if not value:
        return ""

    # Standard Brevo transactional API key format.
    if value.startswith("xkeysib-"):
        return value

    parse_candidates = [value]

    # Brevo MCP token is often base64-encoded JSON containing {"api_key": "xkeysib-..."}.
    try:
        padded = value + ("=" * (-len(value) % 4))
        decoded = base64.urlsafe_b64decode(padded.encode("utf-8"))
        decoded_text = decoded.decode("utf-8").strip()
        if decoded_text:
            parse_candidates.append(decoded_text)
    except (ValueError, UnicodeDecodeError):
        pass

    for candidate in parse_candidates:
        try:
            payload = json.loads(candidate)
        except json.JSONDecodeError:
            continue

        if isinstance(payload, dict):
            api_key = str(
                payload.get("api_key") or payload.get("apiKey") or payload.get("api-key") or ""
            ).strip()
            if api_key:
                return api_key

    return ""


def _resolve_brevo_api_key_from_env() -> str:
    configured_value = _first_nonempty_env("BREVO_API_KEY", "BREVO_API_TOKEN")
    configured_key = _extract_brevo_api_key(configured_value)
    if configured_key:
        if configured_value and configured_value != configured_key:
            logger.info("Resolved Brevo API key from BREVO_API_KEY/BREVO_API_TOKEN payload.")
        return configured_key

    mcp_token_value = _first_nonempty_env("BREVO_MCP_TOKEN")
    mcp_key = _extract_brevo_api_key(mcp_token_value)
    if mcp_key:
        logger.info("Resolved Brevo API key from BREVO_MCP_TOKEN.")
        return mcp_key

    if mcp_token_value:
        logger.warning("BREVO_MCP_TOKEN is set but did not contain a usable API key payload.")

    return ""


@dataclass
class EmailMessagePayload:
    to_name: str
    to_email: str
    subject: str
    html_content: str
    text_content: str


@dataclass
class EmailSendResult:
    success: bool
    provider: str
    message_id: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    retryable: bool = False


class EmailProvider(Protocol):
    def send_transactional_email(self, message: EmailMessagePayload) -> EmailSendResult:
        ...


class BrevoApiEmailProvider:
    def __init__(self, api_key: str, from_address: str, from_name: str, timeout_sec: int = 15) -> None:
        self._api_key = api_key
        self._from_address = from_address
        self._from_name = from_name
        self._timeout_sec = timeout_sec

    def send_transactional_email(self, message: EmailMessagePayload) -> EmailSendResult:
        try:
            response = requests.post(
                "https://api.brevo.com/v3/smtp/email",
                headers={
                    "accept": "application/json",
                    "content-type": "application/json",
                    "api-key": self._api_key,
                },
                json={
                    "sender": {
                        "name": self._from_name,
                        "email": self._from_address,
                    },
                    "to": [
                        {
                            "name": message.to_name,
                            "email": message.to_email,
                        }
                    ],
                    "subject": message.subject,
                    "htmlContent": message.html_content,
                    "textContent": message.text_content,
                },
                timeout=self._timeout_sec,
            )

            if 200 <= response.status_code < 300:
                payload = response.json() if response.content else {}
                message_id = str(payload.get("messageId") or payload.get("message_id") or "").strip() or None
                return EmailSendResult(success=True, provider="brevo_api", message_id=message_id)

            error_message = response.text[:400]
            retryable = response.status_code in {408, 429, 500, 502, 503, 504}
            logger.warning(
                "Brevo API email send failed (status=%s, retryable=%s)",
                response.status_code,
                retryable,
            )
            return EmailSendResult(
                success=False,
                provider="brevo_api",
                error_code=f"http_{response.status_code}",
                error_message=error_message,
                retryable=retryable,
            )
        except requests.RequestException as exc:
            logger.warning("Brevo API email send request exception: %s", exc)
            return EmailSendResult(
                success=False,
                provider="brevo_api",
                error_code="request_exception",
                error_message=str(exc),
                retryable=True,
            )


class BrevoSmtpEmailProvider:
    def __init__(
        self,
        smtp_host: str,
        smtp_port: int,
        smtp_login: str,
        smtp_key: str,
        from_address: str,
        from_name: str,
        timeout_sec: int = 15,
    ) -> None:
        self._smtp_host = smtp_host
        self._smtp_port = smtp_port
        self._smtp_login = smtp_login
        self._smtp_key = smtp_key
        self._from_address = from_address
        self._from_name = from_name
        self._timeout_sec = timeout_sec

    def send_transactional_email(self, message: EmailMessagePayload) -> EmailSendResult:
        mime = EmailMessage()
        mime["Subject"] = message.subject
        mime["From"] = f"{self._from_name} <{self._from_address}>"
        mime["To"] = f"{message.to_name} <{message.to_email}>" if message.to_name else message.to_email
        mime.set_content(message.text_content)
        mime.add_alternative(message.html_content, subtype="html")

        try:
            with smtplib.SMTP(self._smtp_host, self._smtp_port, timeout=self._timeout_sec) as smtp:
                smtp.ehlo()
                smtp.starttls()
                smtp.login(self._smtp_login, self._smtp_key)
                smtp.send_message(mime)
            return EmailSendResult(success=True, provider="brevo_smtp")
        except (smtplib.SMTPException, OSError) as exc:
            logger.warning("Brevo SMTP email send failed: %s", exc)
            return EmailSendResult(
                success=False,
                provider="brevo_smtp",
                error_code="smtp_error",
                error_message=str(exc),
                retryable=True,
            )


class EmailService:
    def __init__(self, primary_provider: Optional[EmailProvider], fallback_provider: Optional[EmailProvider] = None) -> None:
        self._primary_provider = primary_provider
        self._fallback_provider = fallback_provider

    def send_transactional_email(self, message: EmailMessagePayload) -> EmailSendResult:
        if not self._primary_provider and not self._fallback_provider:
            return EmailSendResult(
                success=False,
                provider="none",
                error_code="email_not_configured",
                error_message="Email sending is not configured in this environment.",
                retryable=False,
            )

        primary_result: Optional[EmailSendResult] = None
        if self._primary_provider:
            primary_result = self._primary_provider.send_transactional_email(message)
            if primary_result.success:
                return primary_result

        if self._fallback_provider:
            fallback_result = self._fallback_provider.send_transactional_email(message)
            if fallback_result.success:
                return fallback_result
            if primary_result:
                return EmailSendResult(
                    success=False,
                    provider=f"{primary_result.provider}+{fallback_result.provider}",
                    error_code=primary_result.error_code or fallback_result.error_code,
                    error_message=primary_result.error_message or fallback_result.error_message,
                    retryable=bool(primary_result.retryable or fallback_result.retryable),
                )
            return fallback_result

        return primary_result or EmailSendResult(
            success=False,
            provider="none",
            error_code="unknown_email_error",
            error_message="Email provider failed with unknown error.",
            retryable=False,
        )


def create_email_service_from_env() -> EmailService:
    from_address = _first_nonempty_env("MAIL_FROM_ADDRESS", "MAIL_FROM", "BREVO_FROM_ADDRESS") or "noreply@mathpulse.ai"
    from_name = _first_nonempty_env("MAIL_FROM_NAME", "BREVO_FROM_NAME") or "MathPulse AI"
    timeout_raw = _first_nonempty_env("MAIL_SEND_TIMEOUT_SEC") or "15"
    timeout_sec = max(5, _parse_int_env(timeout_raw, 15, env_name="MAIL_SEND_TIMEOUT_SEC"))

    brevo_api_key = _resolve_brevo_api_key_from_env()
    smtp_login = _first_nonempty_env("BREVO_SMTP_LOGIN", "BREVO_SMTP_USERNAME", "BREVO_SMTP_USER")
    smtp_key = _first_nonempty_env("BREVO_SMTP_KEY", "BREVO_SMTP_PASSWORD", "BREVO_SMTP_PASS")
    smtp_host = _first_nonempty_env("BREVO_SMTP_HOST") or "smtp-relay.brevo.com"
    smtp_port_raw = _first_nonempty_env("BREVO_SMTP_PORT") or "587"
    smtp_port = _parse_int_env(smtp_port_raw, 587, env_name="BREVO_SMTP_PORT")

    primary_provider: Optional[EmailProvider] = None
    fallback_provider: Optional[EmailProvider] = None

    if brevo_api_key:
        primary_provider = BrevoApiEmailProvider(
            api_key=brevo_api_key,
            from_address=from_address,
            from_name=from_name,
            timeout_sec=timeout_sec,
        )

    if smtp_login and smtp_key:
        smtp_provider = BrevoSmtpEmailProvider(
            smtp_host=smtp_host,
            smtp_port=smtp_port,
            smtp_login=smtp_login,
            smtp_key=smtp_key,
            from_address=from_address,
            from_name=from_name,
            timeout_sec=timeout_sec,
        )
        if primary_provider is None:
            primary_provider = smtp_provider
        else:
            fallback_provider = smtp_provider

    if smtp_login and not smtp_key:
        logger.warning("BREVO_SMTP_LOGIN is set but SMTP key/password is missing.")
    if smtp_key and not smtp_login:
        logger.warning("SMTP key/password is set but BREVO_SMTP_LOGIN is missing.")

    mode_parts = []
    if brevo_api_key:
        mode_parts.append("brevo_api")
    if smtp_login and smtp_key:
        mode_parts.append("brevo_smtp")

    if mode_parts:
        logger.info(
            "Email service configured (%s) from=%s smtp=%s:%s",
            "+".join(mode_parts),
            from_address,
            smtp_host,
            smtp_port,
        )
    else:
        logger.warning(
            "Email service is not configured. Set BREVO_API_KEY/BREVO_API_TOKEN, BREVO_MCP_TOKEN, or BREVO_SMTP_LOGIN + BREVO_SMTP_KEY/BREVO_SMTP_PASSWORD."
        )

    return EmailService(primary_provider=primary_provider, fallback_provider=fallback_provider)
