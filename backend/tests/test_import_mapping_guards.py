"""Group A guards: MI columns never map to names, compound names join,
grade-level columns never score, duplicate identities rejected (TCH-043/045/074)."""

import io
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from main import (
    _fallback_column_mapping,
    _sanitize_column_mapping,
    app,
)

pytestmark = pytest.mark.usefixtures("isolated_mock_student_auth")

client = TestClient(app)

TEACHER_HEADERS = {"Authorization": "Bearer mock_token_teacher-1"}


def test_mi_columns_never_map_to_name_in_fallback_mapper():
    mapping = _fallback_column_mapping(["Surname", "First Name", "M.I.", "LRN", "Q1"])
    assert mapping.get("M.I.") != "name"
    assert mapping.get("First Name") == "name"
    assert mapping.get("Surname") == "name"


def test_mi_columns_dropped_from_ai_mapping_to_name():
    sanitized = _sanitize_column_mapping({"M.I.": "name", "Name": "name", "MI": "name"})
    assert sanitized.get("Name") == "name"
    assert "M.I." not in sanitized
    assert "MI" not in sanitized


def test_grade_level_columns_excluded_from_scoring_fields():
    mapping = _fallback_column_mapping(["Name", "LRN", "Grade Level", "Grade 11", "Final Grade"])
    assert mapping.get("Grade Level") not in {"engagementScore", "avgQuizScore", "attendance", "assignmentCompletion"}
    assert mapping.get("Grade 11") not in {"engagementScore", "avgQuizScore", "attendance", "assignmentCompletion"}
    assert mapping.get("Final Grade") == "avgQuizScore"


def test_compound_name_columns_join_in_order():
    from main import _normalize_class_records

    import pandas as pd

    df = pd.DataFrame(
        [
            {"Surname": "Dela Cruz", "First Name": "Juan", "M.I.": "B", "LRN": "123456789012"},
        ]
    )
    mapping = {"Surname": "name", "First Name": "name", "M.I.": "m i", "LRN": "lrn"}
    result = _normalize_class_records(df, file_name="t.csv", file_hash="h", column_mapping=mapping)
    assert result["rows"][0]["name"] == "Dela Cruz Juan"


@patch("main.call_hf_chat", side_effect=Exception("mapper unavailable"))
def test_duplicate_identity_rows_rejected_naming_both_rows(_mock_chat):
    csv_body = (
        "Name,LRN\n"
        "Dela Cruz Juan,123456789012\n"
        "Dela Cruz Juan,123456789012\n"
    )
    response = client.post(
        "/api/upload/class-records",
        headers=TEACHER_HEADERS,
        files={"files": ("students.csv", io.BytesIO(csv_body.encode("utf-8")).getvalue(), "text/csv")},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is False
    details = str(payload.get("rejectedRowDetails") or "")
    assert "Row 3" in details and "duplicates Row 2" in details
