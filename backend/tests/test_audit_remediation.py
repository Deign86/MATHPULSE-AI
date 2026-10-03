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
from backend.tests.role_policy_expectations import (
    EXPECTED_REGISTERED_ROUTE_METHODS,
    EXPECTED_ROLE_POLICIES,
    AUTHENTICATED_ROUTE_EXCEPTIONS,
    HANDLER_GUARDED_ROUTE_EXCEPTIONS,
    PUBLIC_ROUTE_EXCEPTIONS,
)


class TestRolePolicyMatching:
    """Verify independently reviewed policy and route classification contracts."""

    def test_production_role_policies_match_reviewed_expected_table(self):
        assert ROLE_POLICIES == EXPECTED_ROLE_POLICIES

    def test_registered_route_methods_match_reviewed_manifest(self):
        discovered = {}
        for registered in app.routes:
            route_collection = getattr(registered, "original_router", None)
            candidates = route_collection.routes if route_collection is not None else [registered]
            for route in candidates:
                path = getattr(route, "path", None)
                methods = getattr(route, "methods", None)
                if path and methods:
                    discovered.setdefault(path, set()).update(methods)

        actual = {path: frozenset(methods) for path, methods in discovered.items()}
        assert actual == EXPECTED_REGISTERED_ROUTE_METHODS

    def test_every_registered_method_has_policy_or_reviewed_exception(self):
        registered_methods = {
            (method, path)
            for path, methods in EXPECTED_REGISTERED_ROUTE_METHODS.items()
            for method in methods
        }
        policy_methods = {
            (method, path)
            for path, methods in EXPECTED_REGISTERED_ROUTE_METHODS.items()
            if path in EXPECTED_ROLE_POLICIES
            for method in methods
        }
        reviewed_exceptions = (
            set(PUBLIC_ROUTE_EXCEPTIONS)
            | set(AUTHENTICATED_ROUTE_EXCEPTIONS)
            | set(HANDLER_GUARDED_ROUTE_EXCEPTIONS)
        )
        unclassified = sorted(registered_methods - policy_methods - reviewed_exceptions)

        assert not unclassified, f"Registered routes lack a role policy or reviewed exception: {unclassified}"
        assert not (set(PUBLIC_ROUTE_EXCEPTIONS) & set(HANDLER_GUARDED_ROUTE_EXCEPTIONS))
        assert not (set(PUBLIC_ROUTE_EXCEPTIONS) & set(AUTHENTICATED_ROUTE_EXCEPTIONS))
        assert not (set(AUTHENTICATED_ROUTE_EXCEPTIONS) & set(HANDLER_GUARDED_ROUTE_EXCEPTIONS))
        assert all(PUBLIC_ROUTE_EXCEPTIONS.values())
        assert all(AUTHENTICATED_ROUTE_EXCEPTIONS.values())
        assert all(HANDLER_GUARDED_ROUTE_EXCEPTIONS.values())

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

    def test_missing_bearer_is_denied_before_handler(self):
        client = TestClient(app)
        with patch.object(main_module, "_firebase_ready", True), \
             patch.object(main_module, "_init_firebase_admin"):
            response = client.get("/api/admin/model-config")

        assert response.status_code == 401
        assert response.json()["detail"] == "Missing or invalid Authorization bearer token"


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


class TestRagAdminPolicy:
    @pytest.mark.parametrize(
        "path",
        [
            "/api/rag/documents/all",
            "/api/rag/documents/by-source?source_file=curriculum.pdf",
            "/api/rag/documents/by-subject/General%20Mathematics",
        ],
    )
    def test_student_cannot_delete_rag_documents(self, path):
        client = TestClient(app, headers={"Authorization": "Bearer mock_token_student_A"})
        with patch.object(main_module, "_firebase_ready", True), \
             patch.object(main_module, "_init_firebase_admin"), \
             patch.object(main_module.firebase_auth, "verify_id_token", return_value={"uid": "student_A", "role": "student"}), \
             patch("routes.rag_routes.get_vectorstore_components") as vectorstore_components:
            response = client.delete(path)

        assert response.status_code == 403
        vectorstore_components.assert_not_called()


class TestAtRiskOwnership:
    @pytest.mark.parametrize(
        ("method", "path", "payload"),
        [
            (
                "post",
                "/api/at-risk/resolve",
                {"uid": "student_B", "flagged_topics": []},
            ),
            ("get", "/api/at-risk/fallback/student_B/algebra", None),
        ],
    )
    def test_student_cannot_access_other_student_at_risk_data(self, method, path, payload):
        client = TestClient(app, headers={"Authorization": "Bearer mock_token_student_A"})
        with patch.object(main_module, "_firebase_ready", True), \
             patch.object(main_module, "_init_firebase_admin"), \
             patch.object(main_module.firebase_auth, "verify_id_token", return_value={"uid": "student_A", "role": "student"}), \
             patch("routes.at_risk_resolution.fs.client") as firestore_client:
            response = getattr(client, method)(path, json=payload) if payload is not None else getattr(client, method)(path)

        assert response.status_code == 403
        firestore_client.assert_not_called()

    @pytest.mark.parametrize(
        ("method", "path", "payload"),
        [
            ("post", "/api/at-risk/resolve", {"uid": "student_A", "flagged_topics": []}),
            ("get", "/api/at-risk/fallback/student_A/algebra", None),
        ],
    )
    def test_student_can_access_own_at_risk_data(self, method, path, payload):
        client = TestClient(app, headers={"Authorization": "Bearer mock_token_student_A"})
        firestore = MagicMock()
        fallback_doc = firestore.collection.return_value.document.return_value.collection.return_value.document.return_value.get.return_value
        fallback_doc.exists = True
        fallback_doc.to_dict.return_value = {"summary": "Owned fallback"}
        with patch.object(main_module, "_firebase_ready", True), \
             patch.object(main_module, "_init_firebase_admin"), \
             patch.object(main_module.firebase_auth, "verify_id_token", return_value={"uid": "student_A", "role": "student"}), \
             patch("routes.at_risk_resolution.fs.client", return_value=firestore):
            response = getattr(client, method)(path, json=payload) if payload is not None else getattr(client, method)(path)

        assert response.status_code == 200

    def test_teacher_can_access_another_students_at_risk_data(self):
        client = TestClient(app, headers={"Authorization": "Bearer mock_token_teacher_T"})
        firestore = MagicMock()
        fallback_doc = firestore.collection.return_value.document.return_value.collection.return_value.document.return_value.get.return_value
        fallback_doc.exists = False
        with patch.object(main_module, "_firebase_ready", True), \
             patch.object(main_module, "_init_firebase_admin"), \
             patch.object(main_module.firebase_auth, "verify_id_token", return_value={"uid": "teacher_T", "role": "teacher"}), \
             patch("routes.at_risk_resolution.fs.client", return_value=firestore) as firestore_client:
            response = client.get("/api/at-risk/fallback/student_B/algebra")

        assert response.status_code == 404
        firestore_client.assert_called_once()


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
