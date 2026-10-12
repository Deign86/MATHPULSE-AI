"""Regression matrix for the public surface and route role policies."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

import main as main_module
from main import (
    ADMIN_ONLY,
    ALL_APP_ROLES,
    PUBLIC_API_PATHS,
    PUBLIC_PATHS,
    ROLE_POLICIES,
    TEACHER_OR_ADMIN,
    app,
    resolve_required_roles,
)
from routes import jev_routes
from tests.role_policy_expectations import EXPECTED_ROLE_POLICIES


@pytest.mark.parametrize("path", ["/", "/health", "/docs", "/redoc", "/openapi.json"])
def test_root_public_path_manifest(path):
    assert path in PUBLIC_PATHS


@pytest.mark.parametrize("path", ["/api/quiz/topics", "/api/rag/health", "/api/templates/class-records"])
def test_public_api_path_manifest(path):
    assert path in PUBLIC_API_PATHS


def test_jev_verify_is_not_public():
    # Every request spends a Claude call, so an anonymous caller must not be able to drain credits through it.
    assert "/api/jev/verify" not in PUBLIC_API_PATHS


def test_expected_role_sets_are_exact():
    assert ALL_APP_ROLES == {"student", "teacher", "admin"}
    assert TEACHER_OR_ADMIN == {"teacher", "admin"}
    assert ADMIN_ONLY == {"admin"}
    assert ROLE_POLICIES == EXPECTED_ROLE_POLICIES


@pytest.mark.parametrize("path,roles", EXPECTED_ROLE_POLICIES.items())
def test_role_policy_role_matrix(path, roles):
    assert resolve_required_roles(path) == roles
    assert roles <= ALL_APP_ROLES
    assert "student" not in roles or roles == ALL_APP_ROLES


@pytest.mark.parametrize(
    ("path", "allowed", "denied"),
    [
        ("/api/quiz/generate", ALL_APP_ROLES, set()),
        ("/api/predict-risk", TEACHER_OR_ADMIN, {"student"}),
        ("/api/admin/users", ADMIN_ONLY, {"student", "teacher"}),
        ("/api/jev/verify", TEACHER_OR_ADMIN, {"student"}),
    ],
)
def test_role_policy_allow_and_forbid_roles(path, allowed, denied):
    required = resolve_required_roles(path)
    assert required is not None
    assert required == allowed
    assert required.isdisjoint(denied)


def test_unmatched_path_has_no_implicit_role_policy():
    assert resolve_required_roles("/api/admin/users/unlisted-action") is None


JEV_VERIFY_BODY = {"referenceText": "A line has one slope.", "generatedText": "A line has one slope."}


@pytest.fixture
def judged_lesson(monkeypatch):
    """Replace the Claude judgment behind /api/jev/verify; the access tests only care who reaches it."""
    verdict = AsyncMock(return_value={"verified": True, "confidence": 0.8})
    monkeypatch.setattr(jev_routes, "verify_lesson_factuality", verdict)
    return verdict


@pytest.fixture
def token_is_role(monkeypatch):
    """Firebase stub for the auth middleware: a bearer token is a user whose role is the token's text."""
    monkeypatch.setattr(main_module, "_firebase_ready", True)
    monkeypatch.setattr(main_module, "_init_firebase_admin", lambda: None)
    monkeypatch.setattr(
        main_module,
        "firebase_auth",
        SimpleNamespace(verify_id_token=lambda token: {"uid": f"{token}-1", "role": token}),
    )


def _post_jev_verify(token=None):
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    return TestClient(app).post("/api/jev/verify", json=JEV_VERIFY_BODY, headers=headers)


def test_jev_verify_rejects_an_anonymous_caller_before_spending_a_judgment(token_is_role, judged_lesson):
    response = _post_jev_verify()

    assert response.status_code == 401
    judged_lesson.assert_not_called()


def test_jev_verify_forbids_students_before_spending_a_judgment(token_is_role, judged_lesson):
    response = _post_jev_verify("student")

    assert response.status_code == 403
    judged_lesson.assert_not_called()


@pytest.mark.parametrize("role", ["teacher", "admin"])
def test_jev_verify_serves_teachers_and_admins(token_is_role, judged_lesson, role):
    response = _post_jev_verify(role)

    assert response.status_code == 200
    assert response.json()["action"] == "judged"
    judged_lesson.assert_awaited_once_with(
        JEV_VERIFY_BODY["referenceText"], JEV_VERIFY_BODY["generatedText"]
    )
