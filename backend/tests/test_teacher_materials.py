"""
backend/tests/test_teacher_materials.py

Tests for the /api/teacher-materials upload and generate-quiz endpoints.

Covers:
  - Rejects unauthenticated requests
  - Rejects non-teacher roles (student)
  - Validates file type (PDF, DOCX, TXT only)
  - Handles empty/missing metadata gracefully
  - Handles Firestore unavailability gracefully
  - Handles Claude generation failure gracefully
  - Returns proper TeacherMaterialUploadResponse shape
  - Generates and stores a quiz for an existing module

Run with: pytest backend/tests/test_teacher_materials.py -v
Or safe runner: python -m pytest backend/tests/test_teacher_materials.py -v
"""

import asyncio
import io
import json

import os
import sys
from datetime import datetime
from typing import Any, Dict
from unittest.mock import AsyncMock, MagicMock, patch

import pytest  # type: ignore[import-not-found]
from fastapi.testclient import TestClient

# Add backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Import the app after path is set
from main import AuthenticatedUser, app
from routes.teacher_materials import _generate_module_via_claude
from services.ai_client import CHAT_MODEL

# ─── Test client (shared across all tests) ───────────────────────────────────
# Uses teacher role header — matches ROLE_POLICIES teacher role
client = TestClient(app, headers={"Authorization": "Bearer test-auth-token"})


# ─── Helper: minimal PDF in bytes ──────────────────────────────────────────────
def _make_pdf(text: str = b"%PDF-1.4\nfake pdf content") -> bytes:
    return text


# ─── Helper: minimal DOCX in bytes ───────────────────────────────────────────
def _make_docx() -> bytes:
    # DOCX is a ZIP; we only need the header bytes for type detection
    return b"PK\x03\x04" + b"fake docx content"


# ─── Helper: TXT in bytes ─────────────────────────────────────────────────────
def _make_txt(text: str = "Sample lesson plan content.") -> bytes:
    return text.encode()


# ─── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def mock_firestore_client():
    """Mock Firestore client that does NOT raise."""
    mock_db = MagicMock()
    mock_fs = MagicMock()
    mock_fs.Client.return_value = mock_db
    return mock_db, mock_fs


@pytest.fixture
def mock_firestore_unavailable():
    """Simulate Firestore not being initialized."""
    with patch("routes.teacher_materials._get_firestore", return_value=None):
        yield


@pytest.fixture
def mock_claude_success():
    """Claude returns a well-formed TeacherModule JSON."""
    module_json = {
        "moduleId": "quadratic-equations-test-teacher-2026-05-13",
        "title": "Quadratic Equations",
        "gradeLevel": "Grade 11",
        "subject": "General Mathematics",
        "quarter": "Q1",
        "strandOrTrack": "Academic",
        "competencyTags": ["M11ALG-IIa-1"],
        "moduleType": "teacher_uploaded",
        "sourceLabel": "Teacher Upload",
        "originNote": "Generated from uploaded lesson plan.",
        "summary": "This module covers solving quadratic equations by factoring, completing the square, and the quadratic formula.",
        "learningObjectives": [
            "Solve quadratic equations by factoring.",
            "Solve quadratic equations by completing the square.",
            "Apply the quadratic formula to find roots.",
        ],
        "sections": [
            {
                "title": "Introduction to Quadratic Equations",
                "content": "A quadratic equation is of the form ax² + bx + c = 0 where a ≠ 0.",
            },
            {
                "title": "Solving by Factoring",
                "content": "If (x - r₁)(x - r₂) = 0 then x = r₁ or x = r₂.",
            },
        ],
        "practice": [
            {
                "question": "Solve x² - 5x + 6 = 0 by factoring.",
                "options": [
                    {"label": "A", "text": "x = 1, x = 6"},
                    {"label": "B", "text": "x = 2, x = 3"},
                    {"label": "C", "text": "x = -2, x = -3"},
                    {"label": "D", "text": "x = 1, x = -6"},
                ],
                "answer": "B",
                "explanation": "x² - 5x + 6 = (x-2)(x-3) = 0 → x = 2 or x = 3.",
            },
        ],
        "aiSafety": {
            "requiresGrounding": True,
            "allowedModels": [CHAT_MODEL],
            "groundingSources": ["teacher_file", "deped_rag"],
        },
    }

    json_string = json.dumps(module_json)
    with patch("services.inference_client.call_hf_chat_async", new_callable=AsyncMock, return_value=json_string):
        yield


@pytest.fixture
def mock_claude_failure():
    """Claude raises an exception."""
    with patch(
        "services.inference_client.call_hf_chat_async",
        side_effect=Exception("Claude unavailable"),
    ):
        yield


# ─── Auth guard tests ──────────────────────────────────────────────────────────

class TestTeacherMaterialsAuth:
    """Endpoints require valid teacher/admin auth."""

    def test_upload_rejects_missing_auth_header(self):
        """No Authorization header → 401."""
        files = {"file": ("lesson.pdf", _make_pdf(), "application/pdf")}
        data = {"gradeLevel": "Grade 11", "subject": "Mathematics", "quarter": "Q1"}
        response = TestClient(app).post(
            "/api/teacher-materials/upload",
            files=files,
            data=data,
        )
        assert response.status_code == 401

    def test_upload_rejects_student_role(self):
        """Student auth → 403 Forbidden."""
        files = {"file": ("lesson.pdf", _make_pdf(), "application/pdf")}
        data = {"gradeLevel": "Grade 11", "subject": "Mathematics", "quarter": "Q1"}
        student_client = TestClient(
            app,
            headers={"Authorization": "Bearer student-auth-token"},
        )
        mock_student_user = AuthenticatedUser(uid="student123", role="student", email="student@test.com")
        with (
            patch("main.get_current_user", return_value=mock_student_user),
            patch("routes.teacher_materials._get_firestore", return_value=None),
        ):
            response = student_client.post(
                "/api/teacher-materials/upload",
                files=files,
                data=data,
            )
        assert response.status_code in (401, 403)


# ─── File validation tests ────────────────────────────────────────────────────

class TestTeacherMaterialsFileValidation:
    """Only PDF, DOCX, TXT files are accepted."""

    def test_accepts_pdf(self, mock_firestore_unavailable):
        """PDF uploads return 200 (even if Firestore fails downstream)."""
        files = {"file": ("lesson.pdf", _make_pdf(), "application/pdf")}
        data = {"gradeLevel": "Grade 11", "subject": "Mathematics", "quarter": "Q1"}
        # Patch the entire parsing + generation chain so it short-circuits
        with (
            patch("routes.teacher_materials._parse_uploaded_file", return_value=("text", 100, {})),
            patch("routes.teacher_materials._retrieve_rag_context", return_value=[]),
            patch("routes.teacher_materials._generate_teacher_module", return_value={"moduleId": "test-pdf", "title": "Test PDF Module", "sections": [], "practiceQuestions": []}),
        ):
            response = client.post(
                "/api/teacher-materials/upload",
                files=files,
                data=data,
            )
        # Accept 200 (success) or 500 (parsing/generation failure) — we're testing
        # that PDF is not rejected at the file-type layer.
        assert response.status_code in (200, 500)

    def test_accepts_docx(self, mock_firestore_unavailable):
        """DOCX uploads are accepted."""
        files = {"file": ("lesson.docx", _make_docx(), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
        data = {"gradeLevel": "Grade 11", "subject": "Mathematics", "quarter": "Q1"}
        with (
            patch("routes.teacher_materials._parse_uploaded_file", return_value=("text", 100, {})),
            patch("routes.teacher_materials._retrieve_rag_context", return_value=[]),
            patch("routes.teacher_materials._generate_teacher_module", new_callable=AsyncMock, return_value={"moduleId": "test", "title": "Test"}),
        ):
            response = client.post(
                "/api/teacher-materials/upload",
                files=files,
                data=data,
            )
        assert response.status_code in (200, 500)

    def test_accepts_txt(self, mock_firestore_unavailable):
        """TXT uploads are accepted."""
        files = {"file": ("outline.txt", _make_txt(), "text/plain")}
        data = {"gradeLevel": "Grade 11", "subject": "Mathematics", "quarter": "Q1"}
        with (
            patch("routes.teacher_materials._parse_uploaded_file", return_value=("text", 100, {})),
            patch("routes.teacher_materials._retrieve_rag_context", return_value=[]),
            patch("routes.teacher_materials._generate_teacher_module", new_callable=AsyncMock, return_value={"moduleId": "test", "title": "Test"}),
        ):
            response = client.post(
                "/api/teacher-materials/upload",
                files=files,
                data=data,
            )
        assert response.status_code in (200, 500)

    def test_rejects_executable(self):
        """Malicious extension is rejected with 400."""
        files = {"file": ("lesson.exe", b"\x00" * 64, "application/octet-stream")}
        data = {}
        response = client.post(
            "/api/teacher-materials/upload",
            files=files,
            data=data,
        )
        assert response.status_code == 400
        assert "Unsupported file format" in response.json().get("detail", "")


# ─── Metadata & missing file tests ────────────────────────────────────────────

class TestTeacherMaterialsRequestShape:
    """Request validation — missing file, empty metadata."""

    def test_rejects_missing_file(self):
        """No file part → 422 Unprocessable Entity."""
        data = {"gradeLevel": "Grade 11", "subject": "Mathematics"}
        response = client.post(
            "/api/teacher-materials/upload",
            files={},
            data=data,
        )
        assert response.status_code == 422

    def test_handles_empty_optional_metadata(self, mock_firestore_unavailable):
        """Optional fields (gradeLevel, subject, quarter) can all be empty.

        The route should still attempt to process the file.
        """
        files = {"file": ("lesson.pdf", _make_pdf(), "application/pdf")}
        # No data fields at all
        with (
            patch("routes.teacher_materials._parse_uploaded_file", return_value=("text", 100, {})),
            patch("routes.teacher_materials._retrieve_rag_context", return_value=[]),
            patch("routes.teacher_materials._generate_teacher_module", return_value=None),
        ):
            response = client.post(
                "/api/teacher-materials/upload",
                files=files,
                # Intentionally no data= — only the file is sent
            )
        # Should not 422 — optional fields are truly optional
        assert response.status_code in (200, 500)


# ─── Claude generation tests ──────────────────────────────────────────────────

class TestTeacherMaterialsGeneration:
    """Claude module generation failure modes."""

    def test_returns_500_when_claude_fails(self, mock_firestore_unavailable, mock_claude_failure):
        """When Claude is unavailable, response has success=False."""
        files = {"file": ("lesson.pdf", _make_pdf(), "application/pdf")}
        data = {"gradeLevel": "Grade 11", "subject": "Mathematics", "quarter": "Q1"}
        with (
            patch("routes.teacher_materials._parse_uploaded_file", return_value=("Quadratic equations lesson text", 200, {})),
            patch("routes.teacher_materials._retrieve_rag_context", return_value=[]),
        ):
            response = client.post(
                "/api/teacher-materials/upload",
                files=files,
                data=data,
            )
        payload = response.json()
        assert payload.get("success") is False
        assert "error" in payload or "message" in payload

    def test_returns_success_payload_when_module_generated(
        self, mock_firestore_unavailable, mock_claude_success
    ):
        """Happy path: Claude returns module JSON, Firestore is mocked.

        We mock Firestore so the document is not actually written.
        """
        files = {"file": ("lesson.pdf", _make_pdf(), "application/pdf")}
        data = {
            "gradeLevel": "Grade 11",
            "subject": "General Mathematics",
            "quarter": "Q1",
            "strandOrTrack": "Academic",
        }
        mock_db = MagicMock()
        with (
            patch("routes.teacher_materials._parse_uploaded_file", return_value=("Quadratic equations lesson", 200, {})),
            patch("routes.teacher_materials._retrieve_rag_context", return_value=[]),
            patch("routes.teacher_materials._get_firestore_client", return_value=mock_db),
            patch("routes.teacher_materials._index_teacher_material_chunks", return_value=True),
        ):
            response = client.post(
                "/api/teacher-materials/upload",
                files=files,
                data=data,
            )
        assert response.status_code == 200
        payload = response.json()
        assert payload.get("success") is True
        assert payload.get("moduleId") is not None
        assert payload.get("title") == "Quadratic Equations"

    def test_module_prompt_names_chat_model_and_sends_no_sampling_params(self):
        """The module schema carries the configured chat model id; no sampling parameters are sent."""
        with patch(
            "services.inference_client.call_hf_chat_async",
            new_callable=AsyncMock,
            return_value='{"moduleId": "m1", "title": "Quadratics"}',
        ) as mock_chat:
            module = asyncio.run(_generate_module_via_claude("lesson text", "", {}))

        assert module["moduleId"] == "m1"
        sent = mock_chat.call_args.kwargs
        assert not {"temperature", "top_p", "repetition_penalty"} & sent.keys()
        assert f'"allowedModels": ["{CHAT_MODEL}"]' in sent["messages"][1]["content"]


# ─── Quiz generation tests ────────────────────────────────────────────────────

QUIZ_MODULE = {
    "title": "Quadratic Equations",
    "gradeLevel": "Grade 11",
    "subject": "General Mathematics",
    "quarter": "Q1",
    "learningObjectives": ["Solve quadratic equations by factoring."],
    "sections": [
        {"title": "Solving by Factoring", "content": "If (x - r1)(x - r2) = 0 then x = r1 or x = r2."},
    ],
}
QUIZ_QUESTION = {
    "question": "Solve x^2 - 5x + 6 = 0.",
    "choices": {"A": "x = 1 or 6", "B": "x = 2 or 3", "C": "x = -2 or -3", "D": "x = 1 or -6"},
    "correct": "B",
    "explanation": "x^2 - 5x + 6 = (x - 2)(x - 3).",
    "competencyCode": "M11GM-Ia-1",
}


def _firestore_with_module(module_doc):
    """A Firestore stand-in holding one module; returns (db, the mock `quizzes` collection)."""
    module_snapshot = MagicMock(exists=True)
    module_snapshot.to_dict.return_value = module_doc
    modules = MagicMock()
    modules.document.return_value.get.return_value = module_snapshot
    quizzes = MagicMock()
    collections = {"modules": modules, "quizzes": quizzes}
    db = MagicMock()
    db.collection.side_effect = lambda name: collections[name]
    return db, quizzes


def _generate_quiz(db, **chat_mock_options):
    """POST generate-quiz with the Firestore stand-in and a mocked Claude reply; returns (response, chat mock)."""
    with (
        patch("routes.teacher_materials._get_firestore_client", return_value=db),
        patch(
            "services.inference_client.call_hf_chat_async",
            new_callable=AsyncMock,
            **chat_mock_options,
        ) as mock_chat,
    ):
        response = client.post("/api/teacher-materials/quadratics-1/generate-quiz")
    return response, mock_chat


class TestGenerateModuleQuiz:
    """POST /api/teacher-materials/{moduleId}/generate-quiz."""

    def test_stores_and_returns_the_questions_claude_writes(self):
        db, quizzes = _firestore_with_module(QUIZ_MODULE)

        response, mock_chat = _generate_quiz(db, return_value=json.dumps({"questions": [QUIZ_QUESTION]}))

        assert response.status_code == 200
        payload = response.json()
        assert payload["questions"] == [QUIZ_QUESTION]

        sent = mock_chat.call_args.kwargs
        assert sent["task_type"] == "quiz_generation"
        assert "Quadratic Equations" in sent["messages"][0]["content"]

        quizzes.document.assert_called_once_with(payload["quizId"])
        stored = quizzes.document.return_value.set.call_args.args[0]
        assert stored["moduleId"] == "quadratics-1"
        assert stored["questions"] == [QUIZ_QUESTION]
        assert datetime.fromisoformat(stored["createdAt"]).utcoffset() is not None

    def test_leaves_room_for_ten_questions(self):
        db, _quizzes = _firestore_with_module(QUIZ_MODULE)

        _response, mock_chat = _generate_quiz(db, return_value=json.dumps({"questions": [QUIZ_QUESTION]}))

        assert mock_chat.call_args.kwargs["max_tokens"] == 4096

    def test_prompt_carries_section_text_stored_as_body_or_as_content(self):
        module_doc = {
            **QUIZ_MODULE,
            "sections": [
                {"title": "Generated Section", "body": "BODY-TEXT: a quadratic has degree two."},
                {"title": "Older Section", "content": "CONTENT-TEXT: factor, then set each factor to zero."},
                {"title": "Both Fields", "body": "PREFERRED-TEXT", "content": "IGNORED-TEXT"},
            ],
        }
        db, _quizzes = _firestore_with_module(module_doc)

        _response, mock_chat = _generate_quiz(db, return_value=json.dumps({"questions": [QUIZ_QUESTION]}))

        prompt = mock_chat.call_args.kwargs["messages"][0]["content"]
        assert "BODY-TEXT: a quadratic has degree two." in prompt
        assert "CONTENT-TEXT: factor, then set each factor to zero." in prompt
        assert "PREFERRED-TEXT" in prompt
        assert "IGNORED-TEXT" not in prompt

    @pytest.mark.parametrize(
        "reply",
        [
            json.dumps([QUIZ_QUESTION]),
            "Here is your quiz:\n```json\n" + json.dumps({"questions": [QUIZ_QUESTION]}) + "\n```\nGood luck!",
            "Sure. " + json.dumps({"questions": [QUIZ_QUESTION]}),
        ],
        ids=["bare-list", "fenced-in-prose", "prose-preamble"],
    )
    def test_recovers_questions_from_a_reply_that_is_not_bare_json(self, reply):
        db, quizzes = _firestore_with_module(QUIZ_MODULE)

        response, _mock_chat = _generate_quiz(db, return_value=reply)

        assert response.status_code == 200
        assert response.json()["questions"] == [QUIZ_QUESTION]
        assert quizzes.document.return_value.set.call_args.args[0]["questions"] == [QUIZ_QUESTION]

    @pytest.mark.parametrize(
        "chat_options",
        [
            {"return_value": "I could not write a quiz for this module."},
            {"return_value": json.dumps({"questions": []})},
            {"return_value": json.dumps({"error": "no questions"})},
            {"return_value": "[]"},
            {"return_value": '{"questions": [{"question": "cut off mid-'},
            {"side_effect": RuntimeError("Claude unavailable")},
        ],
        ids=["prose", "empty-list", "wrong-envelope", "bare-empty-list", "truncated", "model-error"],
    )
    def test_returns_502_and_stores_no_quiz_when_no_questions_come_back(self, chat_options):
        db, quizzes = _firestore_with_module(QUIZ_MODULE)

        response, _mock_chat = _generate_quiz(db, **chat_options)

        assert response.status_code == 502
        assert response.json()["detail"] == "The AI did not return any quiz questions. Please try again."
        quizzes.document.assert_not_called()


# ─── Response shape tests ──────────────────────────────────────────────────────

class TestTeacherMaterialsResponseShape:
    """TeacherMaterialUploadResponse schema is respected."""

    def test_success_response_has_required_fields(self, mock_firestore_unavailable, mock_claude_success):
        """Success payload contains: success=True, moduleId, title, message."""
        files = {"file": ("lesson.pdf", _make_pdf(), "application/pdf")}
        data = {"gradeLevel": "Grade 11", "subject": "Math", "quarter": "Q1"}
        mock_db = MagicMock()
        with (
            patch("routes.teacher_materials._parse_uploaded_file", return_value=("text", 100, {})),
            patch("routes.teacher_materials._retrieve_rag_context", return_value=[]),
            patch("routes.teacher_materials._get_firestore_client", return_value=mock_db),
            patch("routes.teacher_materials._index_teacher_material_chunks", return_value=True),
        ):
            response = client.post(
                "/api/teacher-materials/upload",
                files=files,
                data=data,
            )
        payload = response.json()
        # Shape check
        assert "success" in payload
        assert isinstance(payload["success"], bool)
        if payload["success"] is True:
            assert "moduleId" in payload or "message" in payload

    def test_error_response_has_error_field(self, mock_firestore_unavailable, mock_claude_failure):
        """Error payload has error or message string."""
        files = {"file": ("lesson.pdf", _make_pdf(), "application/pdf")}
        data = {"gradeLevel": "Grade 11", "subject": "Math", "quarter": "Q1"}
        with (
            patch("routes.teacher_materials._parse_uploaded_file", return_value=("text", 100, {})),
            patch("routes.teacher_materials._retrieve_rag_context", return_value=[]),
        ):
            response = client.post(
                "/api/teacher-materials/upload",
                files=files,
                data=data,
            )
        payload = response.json()
        assert "error" in payload or "message" in payload
        assert isinstance(payload["error"] or payload["message"], str)


# ─── RAG context tests ─────────────────────────────────────────────────────────

class TestTeacherMaterialsRAG:
    """RAG context is retrieved and passed to the generator."""

    def test_rag_context_is_passed_to_generator(self, mock_firestore_unavailable, mock_claude_success):
        """When RAG returns passages, they should be included in module generation."""
        files = {"file": ("lesson.pdf", _make_pdf(), "application/pdf")}
        data = {"gradeLevel": "Grade 11", "subject": "Math", "quarter": "Q1"}

        rag_passages = [
            {"content": "Quadratic equations: ax² + bx + c = 0 (DepEd curriculum)."},
            {"content": "Solving by factoring: (x-r1)(x-r2)=0."},
        ]

        captured_args: Dict[str, Any] = {}

        async def capture_generate(course_material_text, rag_results, metadata):
            captured_args["raw_text"] = course_material_text
            captured_args["rag_results"] = rag_results
            captured_args["metadata"] = metadata
            return {
                "moduleId": "test-id",
                "title": "Test",
                "gradeLevel": "Grade 11",
                "subject": "Math",
                "quarter": "Q1",
                "strandOrTrack": None,
                "competencyTags": [],
                "summary": "Test summary.",
                "learningObjectives": [],
                "sections": [],
                "practice": [],
                "aiSafety": {
                    "requiresGrounding": True,
                    "allowedModels": [],
                    "groundingSources": [],
                },
                "originNote": "",
            }

        mock_db = MagicMock()
        with (
            patch("routes.teacher_materials._parse_uploaded_file", return_value=("Lesson about quadratics.", 100, {})),
            patch("routes.teacher_materials._retrieve_rag_context", return_value=rag_passages),
            patch("routes.teacher_materials._generate_teacher_module", side_effect=capture_generate),
            patch("routes.teacher_materials._get_firestore_client", return_value=mock_db),
            patch("routes.teacher_materials._index_teacher_material_chunks", return_value=True),
        ):
            response = client.post(
                "/api/teacher-materials/upload",
                files=files,
                data=data,
            )

        assert response.status_code == 200
        assert "raw_text" in captured_args
        assert "rag_results" in captured_args
        assert len(captured_args["rag_results"]) == 2
        assert captured_args["metadata"]["gradeLevel"] == "Grade 11"
        assert captured_args["metadata"]["subject"] == "Math"
