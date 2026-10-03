"""Regression matrix for the public surface and route role policies."""

import pytest

from main import (
    ADMIN_ONLY,
    ALL_APP_ROLES,
    PUBLIC_API_PATHS,
    PUBLIC_PATHS,
    ROLE_POLICIES,
    TEACHER_OR_ADMIN,
    resolve_required_roles,
)
from tests.role_policy_expectations import EXPECTED_ROLE_POLICIES


@pytest.mark.parametrize("path", ["/", "/health", "/docs", "/redoc", "/openapi.json"])
def test_root_public_path_manifest(path):
    assert path in PUBLIC_PATHS


@pytest.mark.parametrize("path", ["/api/quiz/topics", "/api/rag/health", "/api/templates/class-records", "/api/jev/verify"])
def test_public_api_path_manifest(path):
    assert path in PUBLIC_API_PATHS


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
    ],
)
def test_role_policy_allow_and_forbid_roles(path, allowed, denied):
    required = resolve_required_roles(path)
    assert required is not None
    assert required == allowed
    assert required.isdisjoint(denied)


def test_unmatched_path_has_no_implicit_role_policy():
    assert resolve_required_roles("/api/admin/users/unlisted-action") is None
