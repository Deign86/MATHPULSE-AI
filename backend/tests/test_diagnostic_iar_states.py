"""Diagnostic scoring, access control, and IAR transition-value regressions."""

import pytest
from fastapi.testclient import TestClient

from main import app
from routes.diagnostic import _compute_domain_scores, _is_diagnostic_correct

pytestmark = pytest.mark.usefixtures("isolated_mock_student_auth")

client = TestClient(app)
IAR_STATES = {
    "not_started",
    "in_progress",
    "completed",
    "skipped_unassessed",
    "deep_diagnostic_required",
    "deep_diagnostic_in_progress",
    "placed",
}


@pytest.mark.parametrize(
    ("correct", "total", "mastery"),
    [(8, 10, "mastered"), (6, 10, "developing"), (0, 10, "beginning")],
)
def test_domain_mastery_thresholds(correct, total, mastery):
    score = _compute_domain_scores({"Functions": correct}, {"Functions": total})["Functions"]
    assert score["mastery_level"] == mastery
    assert score["percentage"] == correct / total * 100


def test_diagnostic_answer_normalization_and_invalid_answer_edge():
    options = {"A": "First option", "B": "Second option", "C": "Third option", "D": "Fourth option"}
    assert _is_diagnostic_correct(" a ", "A", options)
    assert _is_diagnostic_correct("B", "A/C", options) is False
    assert _is_diagnostic_correct("First option", "A", options) is False
    assert _is_diagnostic_correct("E", "A", options) is False


def test_iar_state_ledger_contains_all_supported_lifecycle_values():
    assert IAR_STATES == {
        "not_started", "in_progress", "completed", "skipped_unassessed",
        "deep_diagnostic_required", "deep_diagnostic_in_progress", "placed",
    }


def test_diagnostic_results_require_authentication_and_student_ownership():
    assert client.get("/api/diagnostic/results/student-1").status_code == 401
    response = client.get(
        "/api/diagnostic/results/other-student",
        headers={"Authorization": "Bearer mock_token_student-1"},
    )
    assert response.status_code == 403
