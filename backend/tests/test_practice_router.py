"""Contract tests for Practice Center router endpoints."""

from __future__ import annotations

import json
import os
import sys
import uuid
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient

# We import the app via main to get router registered
from main import app


client = TestClient(app)


def _mock_user(uid: str):
    user = MagicMock()
    user.uid = uid
    return user


def _auth_header(uid: str):
    return {"Authorization": f"Bearer mock_token_{uid}"}


class TestPracticeGenerate:
    """POST /api/practice/generate"""

    @patch("routes.practice._call_deepseek")
    def test_generate_returns_session_and_questions(self, mock_call, monkeypatch):
        """Should return session_id, questions list, and generated_at."""
        mock_call.return_value = json.dumps({
            "questions": [
                {
                    "id": "q1",
                    "question": "What is 2+2?",
                    "options": ["3", "4", "5", "6"],
                    "correct_index": 1,
                    "explanation": "Basic addition",
                    "competency": "Arithmetic",
                    "difficulty": "Practice",
                    "bloomsLevel": "Remember",
                }
            ]
        })

        user_id = "test_user_123"
        response = client.post(
            "/api/practice/generate",
            json={
                "userId": user_id,
                "subject": "Algebra",
                "competency": "Linear Equations",
                "difficulty": "Practice",
                "count": 1,
            },
            headers=_auth_header(user_id),
        )

        assert response.status_code == 200
        data = response.json()
        assert "session_id" in data
        assert "questions" in data
        assert len(data["questions"]) == 1
        assert "generated_at" in data
        assert data["questions"][0]["id"] == "q1"

    def test_generate_rejects_mismatched_user(self):
        """Request with mismatched auth userId should return 403."""
        response = client.post(
            "/api/practice/generate",
            json={
                "userId": "user_a",
                "subject": "Algebra",
                "competency": "Linear Equations",
                "difficulty": "Practice",
                "count": 5,
            },
            headers=_auth_header("user_b"),  # mismatch
        )
        assert response.status_code == 403

    def test_generate_requires_auth(self):
        """Request without auth should return 401/403."""
        response = client.post(
            "/api/practice/generate",
            json={
                "userId": "user_a",
                "subject": "Algebra",
                "competency": "Linear Equations",
                "difficulty": "Practice",
                "count": 5,
            },
        )
        assert response.status_code in (401, 403)


class TestPracticeSubmit:
    """POST /api/practice/submit"""

    @patch("routes.practice._get_firestore")
    @patch("routes.practice._call_deepseek")
    def test_submit_scores_correctly(self, mock_call, mock_get_db, monkeypatch):
        """XP = correct*10 + 50 bonus if score>=80%."""
        mock_call.return_value = json.dumps({
            "questions": [
                {
                    "id": "q1", "question": "Q1", "options": ["A", "B", "C", "D"],
                    "correct_index": 1, "explanation": "Exp", "competency": "Arith",
                    "difficulty": "Practice", "bloomsLevel": "Remember",
                },
                {
                    "id": "q2", "question": "Q2", "options": ["A", "B", "C", "D"],
                    "correct_index": 2, "explanation": "Exp", "competency": "Arith",
                    "difficulty": "Practice", "bloomsLevel": "Remember",
                },
            ]
        })

        # First generate a session
        user_id = "test_user_123"
        gen_response = client.post(
            "/api/practice/generate",
            json={
                "userId": user_id,
                "subject": "Algebra",
                "competency": "Arithmetic",
                "difficulty": "Practice",
                "count": 2,
            },
            headers=_auth_header(user_id),
        )
        session_id = gen_response.json()["session_id"]

        # Mock DB: return session for generate, skip update for submit
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        mock_session_doc = MagicMock()
        mock_session_doc.exists = True
        mock_session_doc.to_dict.return_value = {
            "questions": [
                {"id": "q1", "correct_index": 1, "explanation": "Exp", "competency": "Arith", "difficulty": "Practice", "question": "Q1", "options": ["A", "B", "C", "D"], "bloomsLevel": "Remember"},
                {"id": "q2", "correct_index": 2, "explanation": "Exp", "competency": "Arith", "difficulty": "Practice", "question": "Q2", "options": ["A", "B", "C", "D"], "bloomsLevel": "Remember"},
            ],
            "subject": "Algebra",
            "competency": "Arithmetic",
            "difficulty": "Practice",
        }
        mock_db.collection.return_value.document.return_value.get.return_value = mock_session_doc
        mock_db.collection.return_value.document.return_value.set.return_value = None
        mock_db.collection.return_value.document.return_value.update.return_value = None
        mock_user_doc = MagicMock()
        mock_user_doc.exists = True
        mock_user_doc.to_dict.return_value = {"totalXP": 100, "quizzesCompleted": 5, "averageScore": 75.0}
        mock_db.collection.return_value.document.return_value.get.return_value = mock_session_doc

        # Submit: q1 correct (index 1), q2 wrong (index 0 vs correct 2)
        submit_response = client.post(
            "/api/practice/submit",
            json={
                "session_id": session_id,
                "userId": user_id,
                "answers": [
                    {"question_id": "q1", "selected_index": 1},
                    {"question_id": "q2", "selected_index": 0},
                ],
            },
            headers=_auth_header(user_id),
        )

        assert submit_response.status_code == 200
        data = submit_response.json()
        assert data["correct_count"] == 1  # 1 out of 2
        assert data["total"] == 2
        # XP: 1*10 + 0 (no bonus, score=50% < 80%)
        assert data["xp_earned"] == 10
        assert data["score_percent"] == 50.0
        assert "per_question_feedback" in data
        assert "updated_stats" in data

    def test_submit_rejects_mismatched_user(self):
        """Submit with auth userId != payload userId should return 403."""
        response = client.post(
            "/api/practice/submit",
            json={
                "session_id": "some_session",
                "userId": "user_a",
                "answers": [],
            },
            headers=_auth_header("user_b"),
        )
        assert response.status_code == 403


class TestPracticeStats:
    """GET /api/practice/stats/{userId}"""

    def test_stats_requires_auth(self):
        """Stats endpoint should require authentication."""
        response = client.get("/api/practice/stats/test_user")
        assert response.status_code in (401, 403)

    def test_stats_rejects_mismatched_user(self):
        """Getting stats for different user should return 403."""
        response = client.get(
            "/api/practice/stats/user_a",
            headers=_auth_header("user_b"),
        )
        assert response.status_code == 403


class TestPracticeHistory:
    """GET /api/practice/history/{userId}"""

    def test_history_requires_auth(self):
        """History endpoint should require authentication."""
        response = client.get("/api/practice/history/test_user")
        assert response.status_code in (401, 403)

    def test_history_pagination_params(self):
        """History should accept page and limit query params."""
        user_id = "test_user"
        response = client.get(
            f"/api/practice/history/{user_id}?page=2&limit=5",
            headers=_auth_header(user_id),
        )
        # Should not 422 (validation error) - params are optional ints
        assert response.status_code != 422

    def test_history_rejects_mismatched_user(self):
        """History for different user should return 403."""
        response = client.get(
            "/api/practice/history/user_a?page=1&limit=10",
            headers=_auth_header("user_b"),
        )
        assert response.status_code == 403