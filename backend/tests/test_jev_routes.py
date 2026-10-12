from __future__ import annotations

import os
import sys

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from routes import jev_routes
from services import jev_client


app = FastAPI()
app.include_router(jev_routes.router)
client = TestClient(app)


def test_verify_returns_typed_schema(monkeypatch) -> None:
    async def fake_verify(reference_text: str, generated_text: str) -> dict[str, object]:
        assert reference_text == "Reference lesson"
        assert generated_text == "Generated lesson"
        return {
            "verified": True,
            "pCorrect": 0.95,
            "pLeak": 0.05,
            "action": "allow",
        }

    monkeypatch.setattr(jev_routes, "verify_lesson_factuality", fake_verify)

    response = client.post(
        "/api/jev/verify",
        json={
            "referenceText": "Reference lesson",
            "generatedText": "Generated lesson",
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "verified": True,
        "pCorrect": 0.95,
        "pLeak": 0.05,
        "action": "allow",
    }


def test_verify_rejects_oversized_request() -> None:
    response = client.post(
        "/api/jev/verify",
        json={
            "referenceText": "r" * 4001,
            "generatedText": "g" * 4000,
        },
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "Combined text exceeds 8000 characters limit",
    }


def test_verify_hides_service_failure_details(monkeypatch) -> None:
    async def failed_verify(reference_text: str, generated_text: str) -> dict[str, object]:
        raise RuntimeError("internal service secret")

    monkeypatch.setattr(jev_routes, "verify_lesson_factuality", failed_verify)

    response = client.post(
        "/api/jev/verify",
        json={
            "referenceText": "Reference lesson",
            "generatedText": "Generated lesson",
        },
    )

    assert response.status_code == 502
    assert response.json() == {"detail": "JEV verification service unavailable"}
    assert "internal service secret" not in response.text


def _enable_claude(monkeypatch) -> None:
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    monkeypatch.setattr(jev_client, "is_enabled", lambda: True)


@pytest.mark.parametrize(
    ("supported_probability", "verified", "p_correct"),
    [
        (0.1, False, 0.1),
        (0.9, True, 0.9),
        (0.5, True, 0.5),
        (1.4, True, 1.0),
        (-0.3, False, 0.0),
    ],
)
def test_verify_reports_the_probability_claude_judged(
    monkeypatch, supported_probability: float, verified: bool, p_correct: float
) -> None:
    _enable_claude(monkeypatch)
    monkeypatch.setattr(
        jev_client, "complete_json", lambda messages, **options: {"supported_probability": supported_probability}
    )

    response = client.post(
        "/api/jev/verify",
        json={"referenceText": "A line has one slope.", "generatedText": "A line has two slopes."},
    )

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"verified", "pCorrect", "pLeak", "action"}
    assert body["verified"] is verified
    assert body["pCorrect"] == pytest.approx(p_correct)
    assert body["pLeak"] == 0.0
    assert body["action"] == "judged"


def test_verify_keeps_fallback_values_when_the_service_reports_an_action(monkeypatch) -> None:
    async def fallback(reference_text: str, generated_text: str) -> dict[str, object]:
        return {"action": "fallback_disabled", "verified": False}

    monkeypatch.setattr(jev_routes, "verify_lesson_factuality", fallback)

    response = client.post(
        "/api/jev/verify",
        json={"referenceText": "Reference lesson", "generatedText": "Generated lesson"},
    )

    assert response.json() == {
        "verified": False,
        "pCorrect": 1.0,
        "pLeak": 0.0,
        "action": "fallback_disabled",
    }


def test_verify_fails_open_when_claude_is_unavailable(monkeypatch) -> None:
    _enable_claude(monkeypatch)

    def unavailable(messages, **options):
        raise TimeoutError("Claude did not answer")

    monkeypatch.setattr(jev_client, "complete_json", unavailable)

    response = client.post(
        "/api/jev/verify",
        json={"referenceText": "A line has one slope.", "generatedText": "A line has two slopes."},
    )

    assert response.status_code == 200
    assert response.json() == {
        "verified": True,
        "pCorrect": 1.0,
        "pLeak": 0.0,
        "action": "fallback_disabled",
    }
