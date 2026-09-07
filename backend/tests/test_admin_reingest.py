"""
Tests for Admin Curriculum Reingest & Upload Endpoints.

Validates:
1. POST /api/admin/reingest-pdf non-blocking execution with BackgroundTasks
   (returns 200 OK, success=True, execution_mode="background_tasks", schedules run_cloud_ingestion_and_upload).
2. POST /api/admin/reingest-pdf with GitHub workflow dispatch
   (mocking urllib.request.urlopen returning HTTP 204 when GITHUB_PAT or GITHUB_TOKEN is set;
   returns execution_mode="github_actions").
3. POST /api/admin/upload-pdf non-blocking behavior
   (re-ingestion scheduled via BackgroundTasks rather than running synchronously).
4. GET /api/admin/reingest-status returns current REINGESTION_STATUS.
5. Role-based access control (RBAC) enforcement on all endpoints.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import BackgroundTasks
from fastapi.testclient import TestClient

import main as main_module
from main import app
from routes.admin_routes import PDF_METADATA, REINGESTION_STATUS


@pytest.fixture
def admin_auth():
    orig_ready = getattr(main_module, "_firebase_ready", False)
    orig_init = getattr(main_module, "_init_firebase_admin", None)
    orig_auth = main_module.firebase_auth
    orig_verify = getattr(main_module.firebase_auth, "verify_id_token", None) if main_module.firebase_auth else None

    main_module._firebase_ready = True
    main_module._init_firebase_admin = lambda: None
    if not main_module.firebase_auth:
        main_module.firebase_auth = MagicMock()
    main_module.firebase_auth.verify_id_token = MagicMock(return_value={
        "uid": "admin-test-uid",
        "email": "admin@test.mathpulse.ai",
        "name": "Admin Tester",
        "role": "admin",
    })

    yield

    main_module._firebase_ready = orig_ready
    main_module._init_firebase_admin = orig_init
    main_module.firebase_auth = orig_auth
    if orig_verify and main_module.firebase_auth:
        main_module.firebase_auth.verify_id_token = orig_verify


@pytest.fixture
def client(admin_auth):
    return TestClient(app, headers={"Authorization": "Bearer admin-token"})


@pytest.fixture(autouse=True)
def reset_reingestion_state():
    REINGESTION_STATUS.clear()
    REINGESTION_STATUS.update({
        "status": "idle",
        "last_run": None,
        "message": None,
        "mode": None,
    })
    yield
    REINGESTION_STATUS.clear()
    REINGESTION_STATUS.update({
        "status": "idle",
        "last_run": None,
        "message": None,
        "mode": None,
    })


@pytest.fixture(autouse=True)
def mock_audit_logger():
    mock_logger = AsyncMock()
    with patch("routes.admin_routes._get_audit_logger", return_value=mock_logger):
        yield mock_logger


# ─────────────────────────────────────────────────────────────
# 1. POST /api/admin/reingest-pdf tests
# ─────────────────────────────────────────────────────────────


class TestReingestPdf:
    """Tests for POST /api/admin/reingest-pdf endpoint."""

    def test_reingest_pdf_background_tasks_execution(self, client, monkeypatch):
        """Verify non-blocking execution with BackgroundTasks when no GitHub token is present."""
        monkeypatch.delenv("GITHUB_PAT", raising=False)
        monkeypatch.delenv("GITHUB_TOKEN", raising=False)

        with patch.object(BackgroundTasks, "add_task") as mock_add_task, \
             patch("routes.admin_routes.run_cloud_ingestion_and_upload") as mock_ingest:
            response = client.post("/api/admin/reingest-pdf", json={})

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["execution_mode"] == "background_tasks"
            assert "Remote re-ingestion started in the cloud." in data["message"]

            mock_add_task.assert_called_once()
            assert mock_add_task.call_args[0][0] == mock_ingest

            assert REINGESTION_STATUS["status"] == "running"
            assert REINGESTION_STATUS["mode"] == "background_tasks"
            assert REINGESTION_STATUS["last_run"] is not None

    def test_reingest_pdf_background_tasks_invokes_task(self, client, monkeypatch):
        """Verify that run_cloud_ingestion_and_upload is scheduled and invoked by BackgroundTasks."""
        monkeypatch.delenv("GITHUB_PAT", raising=False)
        monkeypatch.delenv("GITHUB_TOKEN", raising=False)

        with patch("routes.admin_routes.run_cloud_ingestion_and_upload") as mock_ingest:
            response = client.post("/api/admin/reingest-pdf", json={"subjectId": "general_mathematics"})

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["execution_mode"] == "background_tasks"
            mock_ingest.assert_called_once()

    def test_reingest_pdf_github_actions_dispatch_with_pat(self, client, monkeypatch):
        """Verify GitHub Actions workflow dispatch when GITHUB_PAT is set and HTTP 204 returned."""
        monkeypatch.setenv("GITHUB_PAT", "ghp_mock_pat_token_test_12345")
        monkeypatch.delenv("GITHUB_TOKEN", raising=False)

        mock_response = MagicMock()
        mock_response.status = 204
        mock_cm = MagicMock()
        mock_cm.__enter__.return_value = mock_response
        mock_cm.__exit__.return_value = None

        with patch("urllib.request.urlopen", return_value=mock_cm) as mock_urlopen, \
             patch("routes.admin_routes.run_cloud_ingestion_and_upload") as mock_ingest:
            response = client.post("/api/admin/reingest-pdf", json={})

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["execution_mode"] == "github_actions"
            assert "dispatched to GitHub Actions runner" in data["message"]

            mock_ingest.assert_not_called()
            mock_urlopen.assert_called_once()
            req = mock_urlopen.call_args[0][0]
            assert "workflows/ingest-curriculum.yml/dispatches" in req.full_url
            assert req.headers.get("Authorization") == "Bearer ghp_mock_pat_token_test_12345"

            assert REINGESTION_STATUS["status"] == "running"
            assert REINGESTION_STATUS["mode"] == "github_actions"
            assert REINGESTION_STATUS["last_run"] is not None

    def test_reingest_pdf_github_actions_dispatch_with_token(self, client, monkeypatch):
        """Verify GitHub Actions workflow dispatch when GITHUB_TOKEN is set."""
        monkeypatch.delenv("GITHUB_PAT", raising=False)
        monkeypatch.setenv("GITHUB_TOKEN", "ghs_mock_token_test_67890")

        mock_response = MagicMock()
        mock_response.status = 204
        mock_cm = MagicMock()
        mock_cm.__enter__.return_value = mock_response
        mock_cm.__exit__.return_value = None

        with patch("urllib.request.urlopen", return_value=mock_cm) as mock_urlopen, \
             patch("routes.admin_routes.run_cloud_ingestion_and_upload") as mock_ingest:
            response = client.post("/api/admin/reingest-pdf", json={})

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["execution_mode"] == "github_actions"
            mock_ingest.assert_not_called()

            req = mock_urlopen.call_args[0][0]
            assert req.headers.get("Authorization") == "Bearer ghs_mock_token_test_67890"

    def test_reingest_pdf_fallback_to_background_tasks_on_dispatch_failure(self, client, monkeypatch):
        """Verify graceful fallback to background_tasks if GitHub Actions dispatch returns non-204."""
        monkeypatch.setenv("GITHUB_PAT", "ghp_mock_pat_token_test_12345")

        mock_response = MagicMock()
        mock_response.status = 500
        mock_cm = MagicMock()
        mock_cm.__enter__.return_value = mock_response
        mock_cm.__exit__.return_value = None

        with patch("urllib.request.urlopen", return_value=mock_cm), \
             patch("routes.admin_routes.run_cloud_ingestion_and_upload") as mock_ingest:
            response = client.post("/api/admin/reingest-pdf", json={})

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["execution_mode"] == "background_tasks"
            mock_ingest.assert_called_once()
            assert REINGESTION_STATUS["mode"] == "background_tasks"


# ─────────────────────────────────────────────────────────────
# 2. POST /api/admin/upload-pdf tests
# ─────────────────────────────────────────────────────────────


class TestUploadPdf:
    """Tests for POST /api/admin/upload-pdf endpoint non-blocking behavior."""

    def test_upload_pdf_non_blocking_background_task(self, client):
        """Verify PDF upload writes to Firebase Storage and schedules ingestion via BackgroundTasks."""
        mock_blob = MagicMock()
        mock_bucket = MagicMock()
        mock_bucket.name = "mathpulse-ai-2026.firebasestorage.app"
        mock_bucket.blob.return_value = mock_blob

        with patch("routes.admin_routes._init_firebase_storage", return_value=(None, mock_bucket)), \
             patch("routes.admin_routes.run_cloud_ingestion_and_upload") as mock_ingest:
            form_data = {
                "subjectId": "general_mathematics",
                "subjectName": "General Mathematics",
                "semester": 1,
                "quarter": 1,
            }
            files = {
                "file": ("SSHS_GM_Q1_Module1.pdf", b"%PDF-1.4 test module content binary stream", "application/pdf")
            }

            response = client.post("/api/admin/upload-pdf", data=form_data, files=files)

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["chunkCount"] == 0
            assert data["subjectId"] == "general_mathematics"
            expected_storage_path = "curriculum/general_mathematics/SSHS_GM_Q1_Module1.pdf"
            assert data["storageUrl"] == f"gs://mathpulse-ai-2026.firebasestorage.app/{expected_storage_path}"

            mock_bucket.blob.assert_called_once_with(expected_storage_path)
            mock_blob.upload_from_string.assert_called_once_with(
                b"%PDF-1.4 test module content binary stream",
                content_type="application/pdf",
            )
            mock_ingest.assert_called_once()

            assert expected_storage_path in PDF_METADATA
            assert PDF_METADATA[expected_storage_path] == {
                "subject": "General Mathematics",
                "subjectId": "general_mathematics",
                "type": "uploaded_module",
                "semester": 1,
                "quarter": 1,
            }

    def test_upload_pdf_rejects_non_pdf_file(self, client):
        """Verify rejection of non-PDF files with 400 Bad Request."""
        form_data = {
            "subjectId": "general_mathematics",
            "subjectName": "General Mathematics",
            "semester": 1,
            "quarter": 1,
        }
        files = {
            "file": ("curriculum_guide.docx", b"PK\x03\x04 mock docx data", "application/vnd.openxmlformats")
        }

        response = client.post("/api/admin/upload-pdf", data=form_data, files=files)
        assert response.status_code == 400
        assert "Only PDF files are allowed." in response.json()["detail"]

    def test_upload_pdf_storage_not_initialized(self, client):
        """Verify 500 error when Firebase storage is unavailable."""
        with patch("routes.admin_routes._init_firebase_storage", return_value=(None, None)):
            form_data = {
                "subjectId": "general_mathematics",
                "subjectName": "General Mathematics",
                "semester": 1,
                "quarter": 1,
            }
            files = {
                "file": ("test.pdf", b"%PDF-1.4 sample", "application/pdf")
            }
            response = client.post("/api/admin/upload-pdf", data=form_data, files=files)
            assert response.status_code == 500
            assert "Firebase storage is not initialized." in response.json()["detail"]


# ─────────────────────────────────────────────────────────────
# 3. GET /api/admin/reingest-status tests
# ─────────────────────────────────────────────────────────────


class TestReingestStatus:
    """Tests for GET /api/admin/reingest-status endpoint."""

    def test_get_reingest_status_idle(self, client):
        """Verify initial/idle status is returned accurately."""
        response = client.get("/api/admin/reingest-status")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "idle"
        assert data["last_run"] is None
        assert data["message"] is None
        assert data["mode"] is None

    def test_get_reingest_status_reflects_active_reingestion(self, client):
        """Verify that updated reingestion status is reflected in GET response."""
        REINGESTION_STATUS["status"] = "running"
        REINGESTION_STATUS["mode"] = "github_actions"
        REINGESTION_STATUS["message"] = "Dispatched workflow to GitHub Actions"
        REINGESTION_STATUS["last_run"] = "2026-09-07T13:00:00+00:00"

        response = client.get("/api/admin/reingest-status")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "running"
        assert data["mode"] == "github_actions"
        assert data["message"] == "Dispatched workflow to GitHub Actions"
        assert data["last_run"] == "2026-09-07T13:00:00+00:00"


# ─────────────────────────────────────────────────────────────
# 4. Authentication & RBAC Enforcement tests
# ─────────────────────────────────────────────────────────────


class TestAdminReingestAuth:
    """Tests role-based access control (RBAC) on admin reingestion endpoints."""

    def test_reingest_pdf_unauthorized(self):
        """Missing auth header returns 401."""
        unauth_client = TestClient(app)
        response = unauth_client.post("/api/admin/reingest-pdf", json={})
        assert response.status_code in {401, 403}

    def test_reingest_pdf_forbidden_for_student(self):
        """Student role returns 403 Forbidden."""
        main_module._firebase_ready = True
        main_module._init_firebase_admin = lambda: None
        if not main_module.firebase_auth:
            main_module.firebase_auth = MagicMock()
        mock_claims = {
            "uid": "student-uid",
            "email": "student@mathpulse.ai",
            "role": "student",
        }
        with patch.object(main_module.firebase_auth, "verify_id_token", return_value=mock_claims):
            student_client = TestClient(app, headers={"Authorization": "Bearer student-token"})
            response = student_client.post("/api/admin/reingest-pdf", json={})
            assert response.status_code == 403

    def test_upload_pdf_unauthorized(self):
        """Upload without token returns 401."""
        unauth_client = TestClient(app)
        response = unauth_client.post("/api/admin/upload-pdf")
        assert response.status_code in {401, 403}

    def test_upload_pdf_forbidden_for_student(self):
        """Upload with student token returns 403."""
        main_module._firebase_ready = True
        main_module._init_firebase_admin = lambda: None
        if not main_module.firebase_auth:
            main_module.firebase_auth = MagicMock()
        mock_claims = {
            "uid": "student-uid",
            "email": "student@mathpulse.ai",
            "role": "student",
        }
        with patch.object(main_module.firebase_auth, "verify_id_token", return_value=mock_claims):
            student_client = TestClient(app, headers={"Authorization": "Bearer student-token"})
            response = student_client.post("/api/admin/upload-pdf")
            assert response.status_code == 403

    def test_get_reingest_status_forbidden_for_student(self):
        """Status endpoint with student token returns 403."""
        main_module._firebase_ready = True
        main_module._init_firebase_admin = lambda: None
        if not main_module.firebase_auth:
            main_module.firebase_auth = MagicMock()
        mock_claims = {
            "uid": "student-uid",
            "email": "student@mathpulse.ai",
            "role": "student",
        }
        with patch.object(main_module.firebase_auth, "verify_id_token", return_value=mock_claims):
            student_client = TestClient(app, headers={"Authorization": "Bearer student-token"})
            response = student_client.get("/api/admin/reingest-status")
            assert response.status_code == 403

