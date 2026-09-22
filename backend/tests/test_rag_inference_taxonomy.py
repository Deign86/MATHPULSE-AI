"""Tests for RAG lesson inference error taxonomy mapping.

TASK: Prove that POST /api/rag/lesson currently maps all inference failures
to blanket 502 {"error": "inference_failed"}.

Test cases:
(a) Mock DeepSeek client to raise 401-style APIError (openai.APIError with status_code 401)
    -> assert response body error == "inference_auth_failed" (FAILS in RED state: currently "inference_failed")
(b) Mock openai.APIConnectionError
    -> assert response body error == "inference_connection_failed" (FAILS in RED state: currently "inference_failed")
(c) Mock generic Exception
    -> assert response body error == "inference_failed" (PASSES in RED state: pins fallback)

Status codes remain 502 for all three cases.
"""

from __future__ import annotations

import os
from unittest.mock import MagicMock, patch

import httpx
import openai
import pytest
from fastapi.testclient import TestClient

# Ensure test env vars are configured before importing application modules
os.environ["DEEPSEEK_API_KEY"] = "mock-key-for-testing"
os.environ["INFERENCE_MAX_RETRIES"] = "1"
os.environ["INFERENCE_BACKGROUND_MAX_RETRIES"] = "1"
os.environ["INFERENCE_INTERACTIVE_MAX_RETRIES"] = "1"
os.environ["INFERENCE_BACKOFF_SEC"] = "0"
os.environ["INFERENCE_BACKGROUND_BACKOFF_SEC"] = "0"

import main as main_module
from main import app

# We hit the HTTP endpoint via FastAPI TestClient (following test_api.py / test_audit_remediation.py).
# We authenticate with a teacher mock token and bypass vectorstore retrieval with minimal mock chunks.
client = TestClient(app, headers={"Authorization": "Bearer mock_token_teacher_T"})

MOCK_CHUNKS = [
    {
        "content": "Functions and equations for Senior High School STEM.",
        "source_file": "SHS_GM_Q1.pdf",
        "score": 0.95,
        "content_domain": "general",
    }
]

LESSON_PAYLOAD = {
    "topic": "Rational Functions",
    "subject": "General Mathematics",
    "quarter": 1,
    "lessonTitle": "Introduction to Rational Functions",
}


@pytest.fixture(autouse=True)
def _setup_rag_mocks():
    """Bypass Firebase token verification, time.sleep backoff, and curriculum retrieval."""
    with patch.object(
        main_module.firebase_auth,
        "verify_id_token",
        return_value={"uid": "teacher_T", "role": "teacher"},
    ), patch(
        "routes.rag_routes.retrieve_lesson_pdf_context",
        return_value=(MOCK_CHUNKS, "exact_file"),
    ), patch(
        "time.sleep",
        return_value=None,
    ):
        yield


def _extract_error(response_json: dict) -> str | None:
    """Extract error code from response whether in detail dict or top-level."""
    detail = response_json.get("detail")
    if isinstance(detail, dict):
        return detail.get("error")
    return response_json.get("error")


class TestRagInferenceTaxonomy:
    """Taxonomy mapping tests for POST /api/rag/lesson inference failures."""

    def test_rag_lesson_inference_auth_failed_maps_to_taxonomy(self):
        """(a) 401 APIError should map to 502 with error='inference_auth_failed'."""
        req = httpx.Request("POST", "https://api.deepseek.com")
        api_error_401 = openai.APIError(
            "Authentication failed",
            request=req,
            body={"error": {"message": "Invalid API key"}},
        )
        api_error_401.status_code = 401

        mock_ds = MagicMock()
        mock_ds.chat.completions.create.side_effect = api_error_401

        with patch("services.inference_client.get_deepseek_client", return_value=mock_ds):
            response = client.post("/api/rag/lesson", json=LESSON_PAYLOAD)

        assert response.status_code == 502
        body = response.json()
        assert _extract_error(body) == "inference_auth_failed"

    def test_rag_lesson_inference_connection_failed_maps_to_taxonomy(self):
        """(b) APIConnectionError should map to 502 with error='inference_connection_failed'."""
        req = httpx.Request("POST", "https://api.deepseek.com")
        conn_error = openai.APIConnectionError(request=req)

        mock_ds = MagicMock()
        mock_ds.chat.completions.create.side_effect = conn_error

        with patch("services.inference_client.get_deepseek_client", return_value=mock_ds):
            response = client.post("/api/rag/lesson", json=LESSON_PAYLOAD)

        assert response.status_code == 502
        body = response.json()
        assert _extract_error(body) == "inference_connection_failed"

    def test_rag_lesson_inference_generic_exception_fallback(self):
        """(c) Generic Exception should map to 502 with error='inference_failed'."""
        generic_error = RuntimeError("Unexpected model engine crash")

        mock_ds = MagicMock()
        mock_ds.chat.completions.create.side_effect = generic_error

        with patch("services.inference_client.get_deepseek_client", return_value=mock_ds):
            response = client.post("/api/rag/lesson", json=LESSON_PAYLOAD)

        assert response.status_code == 502
        body = response.json()
        assert _extract_error(body) == "inference_failed"
