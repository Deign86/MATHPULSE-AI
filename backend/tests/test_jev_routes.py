from __future__ import annotations

import os
import sys

from fastapi import FastAPI
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from routes import jev_routes


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
