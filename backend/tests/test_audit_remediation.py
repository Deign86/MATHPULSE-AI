"""
backend/tests/test_audit_remediation.py

Regression test suite for all fixes from final-audit-report.md:
1. Dynamic role policies pattern matching in AuthMiddleware (GATE-01)
2. Pipeline profile ownership verification (GATE-02)
3. Diagnostic routes deduplication and results handler (GATE-04, GATE-05)
4. RAG signature acceptance of grade_level (GATE-06)
"""

import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

import main as main_module
from main import app, resolve_required_roles, ROLE_POLICIES


class TestRolePolicyMatching:
    """Verify GATE-01: parameterized route matching."""

    def test_literal_routes_resolve_correctly(self):
        assert resolve_required_roles("/api/chat") == {"student", "teacher", "admin"}
        assert resolve_required_roles("/api/predict-risk") == {"teacher", "admin"}
        assert resolve_required_roles("/api/admin/users") == {"admin"}

    def test_parameterized_routes_resolve_correctly(self):
        assert resolve_required_roles("/api/analytics/class/sec-grade11-stem") == {"teacher", "admin"}
        assert resolve_required_roles("/api/intervention/student-12345") == {"teacher", "admin"}
        assert resolve_required_roles("/api/intervention/student-12345/export-pdf") == {"teacher", "admin"}
        assert resolve_required_roles("/api/pipeline/profile/student-999") == {"student", "teacher", "admin"}
        assert resolve_required_roles("/api/pipeline/profile/student-999/recompute") == {"teacher", "admin"}

    def test_nonexistent_routes_return_none(self):
        assert resolve_required_roles("/api/nonexistent/unknown") is None
        assert resolve_required_roles("/some/random/path") is None


class TestPipelineProfileOwnership:
    """Verify GATE-02: student can only access own profile, teacher/admin can access any."""

    def test_student_cannot_access_other_student_profile(self):
        client = TestClient(app, headers={"Authorization": "Bearer mock_token_student_A"})
        # When token is mock_token_student_A, uid is "student_A" and role is "student"
        with patch.object(main_module.firebase_auth, "verify_id_token", return_value={"uid": "student_A", "role": "student"}):
            response = client.get("/api/pipeline/profile/student_B")
        assert response.status_code == 403
        assert "own profile" in response.json().get("detail", "").lower()

    def test_student_can_access_own_profile(self):
        client = TestClient(app, headers={"Authorization": "Bearer mock_token_student_A"})
        mock_doc = MagicMock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {"student_id": "student_A", "name": "Student A"}

        mock_db = MagicMock()
        mock_db.collection.return_value.document.return_value.get.return_value = mock_doc

        with patch.object(main_module, "firebase_firestore", object()), \
             patch.object(main_module, "_firebase_ready", True), \
             patch.object(main_module, "get_firestore_client", return_value=mock_db), \
             patch.object(main_module.firebase_auth, "verify_id_token", return_value={"uid": "student_A", "role": "student"}):
            response = client.get("/api/pipeline/profile/student_A")
            assert response.status_code == 200
            assert response.json()["student_id"] == "student_A"

    def test_teacher_can_access_any_student_profile(self):
        client = TestClient(app, headers={"Authorization": "Bearer mock_token_teacher_T"})
        mock_doc = MagicMock()
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {"student_id": "student_B", "name": "Student B"}

        mock_db = MagicMock()
        mock_db.collection.return_value.document.return_value.get.return_value = mock_doc

        with patch.object(main_module, "firebase_firestore", object()), \
             patch.object(main_module, "_firebase_ready", True), \
             patch.object(main_module, "get_firestore_client", return_value=mock_db), \
             patch.object(main_module.firebase_auth, "verify_id_token", return_value={"uid": "teacher_T", "role": "teacher"}):
            response = client.get("/api/pipeline/profile/student_B")
            assert response.status_code == 200
            assert response.json()["student_id"] == "student_B"


class TestDiagnosticResultsEndpoint:
    """Verify GATE-05: /api/diagnostic/results/{user_id} in canonical diagnostic router."""

    def test_diagnostic_results_rejects_other_student(self):
        client = TestClient(app, headers={"Authorization": "Bearer mock_token_student_1"})
        with patch.object(main_module.firebase_auth, "verify_id_token", return_value={"uid": "student_1", "role": "student"}):
            response = client.get("/api/diagnostic/results/student_2")
        assert response.status_code == 403

    def test_diagnostic_results_allows_own_student(self):
        client = TestClient(app, headers={"Authorization": "Bearer mock_token_student_1"})
        mock_doc = MagicMock()
        mock_doc.to_dict.return_value = {"testId": "DX-123", "takenAt": "2026-08-16T12:00:00Z"}

        mock_db = MagicMock()
        mock_db.collection.return_value.document.return_value.collection.return_value.stream.return_value = [mock_doc]

        with patch.object(main_module, "firebase_firestore", object()), \
             patch.object(main_module, "_firebase_ready", True), \
             patch.object(main_module, "get_firestore_client", return_value=mock_db), \
             patch.object(main_module.firebase_auth, "verify_id_token", return_value={"uid": "student_1", "role": "student"}):
            response = client.get("/api/diagnostic/results/student_1")
            assert response.status_code == 200
            assert response.json()["success"] is True
            assert len(response.json()["results"]) == 1

    def test_diagnostic_results_reports_firestore_outage(self):
        client = TestClient(app, headers={"Authorization": "Bearer mock_token_student_1"})

        with patch.object(main_module, "firebase_firestore", object()), \
             patch.object(main_module, "_firebase_ready", True), \
             patch.object(main_module, "get_firestore_client", side_effect=RuntimeError("unavailable")), \
             patch.object(main_module.firebase_auth, "verify_id_token", return_value={"uid": "student_1", "role": "student"}):
            response = client.get("/api/diagnostic/results/student_1")

        assert response.status_code == 503
        assert response.json()["detail"] == "Diagnostic results unavailable"


class TestCurriculumRAGSignature:
    """Verify GATE-06: retrieve_curriculum_context signature."""

    def test_retrieve_curriculum_context_accepts_grade_level(self):
        from rag.curriculum_rag import retrieve_curriculum_context
        
        mock_collection = MagicMock()
        mock_collection.query.return_value = {
            "documents": [["Quadratic functions concept"]],
            "metadatas": [[{"source_file": "GenMath_Q1.pdf", "subject": "General Mathematics", "quarter": 1}]],
            "distances": [[0.1]],
        }
        mock_embedder = MagicMock()
        mock_embedder.encode.return_value.tolist.return_value = [0.1] * 384

        with patch("rag.vectorstore_loader.get_vectorstore_components", return_value=(None, mock_collection, mock_embedder)):
            results = retrieve_curriculum_context(
                query="quadratic functions",
                grade_level="Grade 11",
                top_k=3,
                extra_future_param="ok",
            )
            assert len(results) == 1
            assert results[0]["source_file"] == "GenMath_Q1.pdf"
            assert "Quadratic functions" in results[0]["content"]
