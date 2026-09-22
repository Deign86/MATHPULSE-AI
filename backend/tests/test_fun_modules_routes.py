from __future__ import annotations

import os
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient
import pytest
from services.inference_client import InferenceAuthError, InferenceConnectionError

import main as main_module
from main import app


client = TestClient(app, headers={"Authorization": "Bearer mock_token_fun_modules"})

MODULE_PAYLOAD = {
    "topic": "Rational Functions",
    "subject": "General Mathematics",
    "quarter": 1,
    "bloomLevel": "understand",
}

MODULE_CHUNKS = [{"content": "Rational functions", "source_file": "module.pdf"}]
MODULE_RESPONSE = '{"title":"Rational Functions","sections":[]}'


@pytest.fixture(autouse=True)
def _backend_mocks():
    with patch.object(
        main_module.firebase_auth,
        "verify_id_token",
        return_value={"uid": "student-1", "role": "student"},
    ), patch(
        "routes.fun_modules_routes.retrieve_lesson_pdf_context",
        return_value=(MODULE_CHUNKS, "exact"),
    ), patch(
        "routes.fun_modules_routes._generate_text",
        new=AsyncMock(return_value=MODULE_RESPONSE),
    ):
        yield


def test_generate_module_returns_contract():
    response = client.post("/api/curriculum/generate-module", json=MODULE_PAYLOAD)

    assert response.status_code == 200
    assert set(response.json()) == {"moduleId", "title", "cards", "sources"}
    assert len(response.json()["cards"]) == 7
    assert response.json()["sources"] == ["module.pdf"]


def test_generate_module_maps_missing_context():
    with patch("routes.fun_modules_routes.retrieve_lesson_pdf_context", return_value=([], "none")):
        response = client.post("/api/curriculum/generate-module", json=MODULE_PAYLOAD)

    assert response.status_code == 404
    assert response.json()["detail"]["error"] == "no_curriculum_context"


def test_generate_module_maps_retrieval_failure():
    with patch(
        "routes.fun_modules_routes.retrieve_lesson_pdf_context",
        side_effect=RuntimeError("retrieval secret should not leak"),
    ):
        response = client.post("/api/curriculum/generate-module", json=MODULE_PAYLOAD)

    assert response.status_code == 503
    assert response.json()["detail"]["error"] == "retrieval_failed"


def test_generate_module_maps_inference_failure():
    with patch("routes.fun_modules_routes.retrieve_lesson_pdf_context", return_value=(MODULE_CHUNKS, "exact")), patch(
        "routes.fun_modules_routes._generate_text",
        new=AsyncMock(side_effect=RuntimeError("inference secret should not leak")),
    ):
        response = client.post("/api/curriculum/generate-module", json=MODULE_PAYLOAD)

    assert response.status_code == 502
    assert response.json()["detail"]["error"] == "inference_failed"


@pytest.mark.parametrize(
    ("inference_error", "error_code"),
    [
        (InferenceAuthError("auth"), "inference_auth_failed"),
        (InferenceConnectionError("connection"), "inference_connection_failed"),
    ],
)
def test_generate_module_maps_typed_inference_failures(inference_error, error_code):
    with patch(
        "routes.fun_modules_routes._generate_text",
        new=AsyncMock(side_effect=inference_error),
    ):
        response = client.post("/api/curriculum/generate-module", json=MODULE_PAYLOAD)

    assert response.status_code == 502
    assert response.json()["detail"]["error"] == error_code
    assert set(response.json()["detail"]) == {"error", "message", "type"}


def test_generate_module_maps_parse_failure():
    with patch("routes.fun_modules_routes.retrieve_lesson_pdf_context", return_value=(MODULE_CHUNKS, "exact")), patch(
        "routes.fun_modules_routes._generate_text",
        new=AsyncMock(return_value="not-json"),
    ):
        response = client.post("/api/curriculum/generate-module", json=MODULE_PAYLOAD)

    assert response.status_code == 500
    assert response.json()["detail"]["error"] == "parse_failed"


def test_mastery_record_returns_contract():
    response = client.post(
        "/api/mastery/record",
        json={"userId": "student-1", "competencyCode": "RF-1", "correct": True, "score": 0.9},
    )

    assert response.status_code == 200
    assert set(response.json()) == {"masteryProbability", "unlockedModules", "xpAwarded"}


def test_mastery_record_handles_incorrect_answer():
    response = client.post(
        "/api/mastery/record",
        json={"userId": "student-1", "competencyCode": "RF-1", "correct": False, "score": 0.2},
    )

    assert response.status_code == 200
    assert response.json()["xpAwarded"] == 0


def test_jev_verify_returns_contract():
    response = client.post(
        "/api/jev/verify",
        json={
            "referenceText": "A linear function has a constant rate of change.",
            "generatedText": "A linear function has a constant rate of change.",
            "claimType": "definition",
        },
    )

    assert response.status_code == 200
    assert set(response.json()) == {"verified", "pCorrect", "pLeak", "action"}
    assert response.json()["verified"] is True


def test_jev_verify_fails_open_without_secret():
    with patch.dict(os.environ, {}, clear=False):
        os.environ.pop("TYPESAFE_API_KEY", None)
        response = client.post(
            "/api/jev/verify",
            json={"referenceText": "x", "generatedText": "y", "claimType": "claim"},
        )

    assert response.status_code == 200
    assert response.json()["action"] == "allow_with_fallback"


def test_jev_verify_marks_mismatched_claim_for_fallback():
    response = client.post(
        "/api/jev/verify",
        json={"referenceText": "linear function", "generatedText": "quadratic function", "claimType": "definition"},
    )

    assert response.status_code == 200
    assert response.json()["verified"] is False
    assert response.json()["pCorrect"] < 0.5


def test_errors_use_identical_keys_and_never_return_secret():
    secret = "typesafe-test-secret"
    with patch.dict(os.environ, {"TYPESAFE_API_KEY": secret}), patch(
        "routes.fun_modules_routes.retrieve_lesson_pdf_context",
        side_effect=RuntimeError(secret),
    ):
        response = client.post("/api/curriculum/generate-module", json=MODULE_PAYLOAD)

    assert response.status_code == 503
    assert set(response.json()["detail"]) == {"error", "message", "type"}
    assert secret not in response.text
