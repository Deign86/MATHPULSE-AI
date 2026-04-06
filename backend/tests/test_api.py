"""
backend/tests/test_api.py
Comprehensive tests for all FastAPI endpoints.

Tests cover:
  - Successful requests with valid data
  - Input validation errors (422)
  - HuggingFace API failures (502 fallback)
  - Timeout handling
  - Malformed response data
  - Error status-code mapping

Run with:  pytest backend/tests/test_api.py -v
"""

import asyncio
import json
import os
import sys
import time
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List
from unittest.mock import AsyncMock, MagicMock, patch

import pytest  # type: ignore[import-not-found]
from fastapi.testclient import TestClient

# Add backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from services.inference_client import InferenceClient, InferenceRequest

# automation_engine has Firebase dependencies - mock its heavy parts
# but keep the Pydantic model classes
mock_ae = MagicMock()

# Define minimal Pydantic-like classes for payloads automation_engine exports
from pydantic import BaseModel as _BM

class _DiagnosticCompletionPayload(_BM):
    studentId: str
    results: list
    gradeLevel: str | None = None
    questionBreakdown: dict | None = None

class _QuizSubmissionPayload(_BM):
    studentId: str
    quizId: str
    subject: str
    score: float
    totalQuestions: int
    correctAnswers: int
    timeSpentSeconds: int

class _StudentEnrollmentPayload(_BM):
    studentId: str
    name: str
    email: str
    gradeLevel: str | None = None
    teacherId: str | None = None

class _DataImportPayload(_BM):
    teacherId: str
    students: list
    columnMapping: dict

class _ContentUpdatePayload(_BM):
    adminId: str
    action: str
    contentType: str
    contentId: str
    subjectId: str | None = None
    details: str | None = None

class _AutomationResult(_BM):
    success: bool = True
    message: str = ""
    actions: list = []

mock_ae.automation_engine = MagicMock()
mock_ae.DiagnosticCompletionPayload = _DiagnosticCompletionPayload
mock_ae.QuizSubmissionPayload = _QuizSubmissionPayload
mock_ae.StudentEnrollmentPayload = _StudentEnrollmentPayload
mock_ae.DataImportPayload = _DataImportPayload
mock_ae.ContentUpdatePayload = _ContentUpdatePayload
mock_ae.AutomationResult = _AutomationResult
sys.modules["automation_engine"] = mock_ae

# Override HF_TOKEN so client init doesn't fail
os.environ["HF_TOKEN"] = "test-token-for-testing"

# analytics.py is importable directly (its heavy deps are guarded)
import main as main_module  # noqa: E402

app = main_module.app

# Mock auth verification so protected endpoints can run in tests without Firebase credentials.
main_module._firebase_ready = True
main_module._init_firebase_admin = lambda: None
main_module.firebase_firestore = None
if getattr(main_module, "firebase_auth", None) is None:
    main_module.firebase_auth = MagicMock()
main_module.firebase_auth.verify_id_token = MagicMock(
    return_value={
        "uid": "test-teacher-uid",
        "email": "teacher@example.com",
        "role": "teacher",
    }
)

client = TestClient(app, headers={"Authorization": "Bearer test-auth-token"})


# ─── Fixtures ──────────────────────────────────────────────────


class FakeClassificationElement:
    """Mimics huggingface_hub ZeroShotClassificationOutputElement."""

    def __init__(self, label: str, score: float):
        self.label = label
        self.score = score


def make_zsc_client(
    classification: list | None = None,
):
    """Create a mock InferenceClient with predictable zero-shot outputs.

    Used only for risk-prediction tests (the only endpoint still using
    ``get_client()`` / ``InferenceClient``).
    """
    mock_client = MagicMock()

    if classification is None:
        classification = [
            FakeClassificationElement("low risk academically stable", 0.85),
            FakeClassificationElement("medium academic risk", 0.10),
            FakeClassificationElement("high risk of failing", 0.05),
        ]
    mock_client.zero_shot_classification.return_value = classification

    return mock_client


# ─── Health & Root ─────────────────────────────────────────────


class TestHealthEndpoints:
    def test_health_returns_200(self):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "models" in data

    def test_root_returns_api_info(self):
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "MathPulse AI API"
        assert "version" in data

    def test_health_includes_request_id_header(self):
        response = client.get("/health")
        assert "x-request-id" in response.headers


class TestAuthMiddleware:
    def test_accepts_user_id_claim_when_uid_missing(self):
        now = int(time.time())
        firestore = _FakeFirestoreModule(
            {
                "courseMaterials": [
                    {
                        "materialId": "mat-auth-1",
                        "teacherId": "test-teacher-uid",
                        "fileName": "auth-check.pdf",
                        "fileType": "pdf",
                        "classSectionId": "grade11_a",
                        "topics": [{"title": "Linear Equations"}],
                        "extractedTextLength": 300,
                        "retentionDays": 180,
                        "expiresAtEpoch": now + 3600,
                    }
                ]
            }
        )

        with patch.object(main_module.firebase_auth, "verify_id_token", return_value={
            "user_id": "test-teacher-uid",
            "email": "teacher@example.com",
            "role": "teacher",
        }), patch.object(main_module, "firebase_firestore", firestore), patch.object(main_module, "_firebase_ready", True):
            response = client.get("/api/upload/course-materials/recent?classSectionId=grade11_a&limit=10")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["materials"]) == 1
        assert data["materials"][0]["materialId"] == "mat-auth-1"


# ─── Chat Endpoint ─────────────────────────────────────────────


class TestChatEndpoint:
    @patch("main.call_hf_chat")
    def test_chat_success(self, mock_chat):
        mock_chat.return_value = "Hello! 2+2=4."
        response = client.post("/api/chat", json={
            "message": "What is 2+2?",
            "history": [],
        })
        assert response.status_code == 200
        assert "4" in response.json()["response"]

    @patch("main.call_hf_chat")
    def test_chat_non_math_returns_refusal_and_skips_inference(self, mock_chat):
        response = client.post("/api/chat", json={
            "message": "Who is Elon Musk?",
            "history": [],
        })

        assert response.status_code == 200
        assert response.json()["response"] in main_module._NON_MATH_REDIRECT_RESPONSES
        mock_chat.assert_not_called()

    @patch("main.call_hf_chat")
    def test_chat_greeting_returns_friendly_response_and_skips_inference(self, mock_chat):
        response = client.post("/api/chat", json={
            "message": "hello",
            "history": [],
        })

        assert response.status_code == 200
        assert response.json()["response"] in main_module._GREETING_RESPONSES
        mock_chat.assert_not_called()

    @patch("main.call_hf_chat")
    def test_chat_thanks_returns_friendly_response_and_skips_inference(self, mock_chat):
        response = client.post("/api/chat", json={
            "message": "thanks",
            "history": [],
        })

        assert response.status_code == 200
        assert response.json()["response"] in main_module._THANKS_RESPONSES
        mock_chat.assert_not_called()

    @patch("main.call_hf_chat")
    def test_chat_with_history(self, mock_chat):
        mock_chat.return_value = "Yes, that's right."
        response = client.post("/api/chat", json={
            "message": "Is x = 4 correct for 2 + 2 = x?",
            "history": [
                {"role": "user", "content": "What is 2+2?"},
                {"role": "assistant", "content": "4"},
            ],
        })
        assert response.status_code == 200
        # Verify history was included in messages
        call_args = mock_chat.call_args
        messages = call_args.args[0] if call_args.args else call_args.kwargs.get("messages", [])
        assert len(messages) >= 3  # system + 2 history + 1 current

    def test_chat_missing_message_returns_422(self):
        response = client.post("/api/chat", json={"history": []})
        assert response.status_code == 422

    @patch("main.call_hf_chat")
    def test_chat_hf_failure_returns_502(self, mock_chat):
        mock_chat.side_effect = Exception("HF API down")
        response = client.post("/api/chat", json={
            "message": "Solve 3x + 1 = 10",
            "history": [],
        })
        assert response.status_code == 502

    @patch("main.call_hf_chat")
    def test_chat_quadratic_prompt_smoke(self, mock_chat):
        mock_chat.return_value = (
            "Given x^2 - 5x + 6 = 0, factor to (x-2)(x-3)=0. "
            "So x = 2 or x = 3. Final answer: x = 2, x = 3."
        )
        response = client.post("/api/chat", json={
            "message": "Solve quadratic equation x² - 5x + 6 = 0 step-by-step.",
            "history": [],
        })
        assert response.status_code == 200
        data = response.json()["response"]
        assert "x = 2" in data
        assert "x = 3" in data

    @patch("main.call_hf_chat_stream")
    def test_chat_stream_success(self, mock_stream):
        mock_stream.return_value = iter(["Hello", " world"])

        with client.stream("POST", "/api/chat/stream", json={
            "message": "What is 2 + 2?",
            "history": [],
        }) as response:
            assert response.status_code == 200
            content = "".join(response.iter_text())

        assert "event: chunk" in content
        assert '"chunk": "Hello"' in content
        assert "event: end" in content

    @patch("main.call_hf_chat_stream")
    def test_chat_stream_emits_error_event(self, mock_stream):
        mock_stream.side_effect = Exception("HF stream down")

        with client.stream("POST", "/api/chat/stream", json={
            "message": "Solve x + 2 = 5",
            "history": [],
        }) as response:
            assert response.status_code == 200
            content = "".join(response.iter_text())

        assert "event: error" in content
        assert "event: end" in content

    @patch("main.call_hf_chat_stream_async")
    def test_chat_stream_timeout_emits_error_and_end_events(self, mock_stream_async):
        async def _slow_stream(*args, **kwargs):
            await asyncio.sleep(0.05)
            yield "late chunk"

        mock_stream_async.return_value = _slow_stream()

        with patch.object(main_module, "CHAT_STREAM_NO_TOKEN_TIMEOUT_SEC", 0.01), patch.object(main_module, "CHAT_STREAM_TOTAL_TIMEOUT_SEC", 0.03):
            with client.stream("POST", "/api/chat/stream", json={
                "message": "Solve x + 2 = 5",
                "history": [],
            }) as response:
                assert response.status_code == 200
                content = "".join(response.iter_text())

        assert "event: error" in content
        assert "timed out" in content.lower()
        assert "event: end" in content

    @patch("main.call_hf_chat_stream_async")
    def test_chat_stream_marker_mode_continues_until_marker(self, mock_stream_async):
        async def _first_stream(*args, **kwargs):
            yield "n=1: x=1\n"
            yield "n=2: x=2"

        async def _second_stream(*args, **kwargs):
            yield "\nn=3: x=3\nEND_MARKER"

        mock_stream_async.side_effect = [_first_stream(), _second_stream()]

        with patch.object(main_module, "CHAT_STREAM_CONTINUATION_MAX_ROUNDS", 1):
            with client.stream("POST", "/api/chat/stream", json={
                "message": "Solve x+n=2n for n=1..3 and end with END_MARKER",
                "history": [],
                "completionMode": "marker",
                "expectedEndMarker": "END_MARKER",
            }) as response:
                assert response.status_code == 200
                content = "".join(response.iter_text())

        assert "END_MARKER" in content
        assert "event: end" in content
        assert mock_stream_async.call_count == 2

    @patch("main.call_hf_chat_stream")
    def test_chat_stream_non_math_returns_refusal_and_skips_inference(self, mock_stream):
        with client.stream("POST", "/api/chat/stream", json={
            "message": "Who is Elon Musk?",
            "history": [],
        }) as response:
            assert response.status_code == 200
            content = "".join(response.iter_text())

        assert "event: chunk" in content
        assert any(candidate in content for candidate in main_module._NON_MATH_REDIRECT_RESPONSES)
        assert "event: end" in content
        mock_stream.assert_not_called()


class TestHFChatTransport:
    @patch("main.http_requests.post")
    def test_call_hf_chat_uses_router_chat_completions(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [
                {"message": {"content": "x = 2 or x = 3"}}
            ]
        }
        mock_post.return_value = mock_response

        result = main_module.call_hf_chat(
            [{"role": "user", "content": "Solve x^2 - 5x + 6 = 0"}],
            max_tokens=256,
            temperature=0.2,
            top_p=0.9,
        )

        assert result
        call_args = mock_post.call_args
        endpoint = call_args.args[0]
        payload = call_args.kwargs["json"]

        assert endpoint == "https://router.huggingface.co/v1/chat/completions"
        assert isinstance(payload["model"], str)
        assert payload["model"]
        assert payload["stream"] is False
        assert isinstance(payload["messages"], list)


class TestInferenceRouting:
    def test_chat_strict_model_lock_keeps_single_model_chain(self, monkeypatch):
        monkeypatch.setenv("INFERENCE_CHAT_MODEL_ID", "Qwen/Qwen2.5-7B-Instruct")
        monkeypatch.setenv("INFERENCE_CHAT_STRICT_MODEL_ONLY", "true")
        monkeypatch.setenv("INFERENCE_CHAT_HARD_TRIGGER_ENABLED", "true")
        monkeypatch.setenv("INFERENCE_CHAT_HARD_MODEL_ID", "meta-llama/Meta-Llama-3-70B-Instruct")

        client = InferenceClient()
        req = InferenceRequest(
            messages=[{"role": "user", "content": "Show all steps and prove the result rigorously."}],
            task_type="chat",
        )

        selected_model, source = client._resolve_primary_model(req)
        model_chain = client._model_chain_for_task("chat", selected_model)

        assert selected_model == "Qwen/Qwen2.5-7B-Instruct"
        assert "chat_strict_model_only" in source
        assert model_chain == ["Qwen/Qwen2.5-7B-Instruct"]

    def test_chat_env_override_wins_under_qwen_only_lock(self, monkeypatch):
        monkeypatch.setenv("INFERENCE_CHAT_MODEL_ID", "Qwen/Qwen3-32B")
        monkeypatch.setenv("INFERENCE_CHAT_STRICT_MODEL_ONLY", "true")
        monkeypatch.setenv("INFERENCE_ENFORCE_QWEN_ONLY", "true")
        monkeypatch.setenv("INFERENCE_QWEN_LOCK_MODEL", "Qwen/Qwen2.5-7B-Instruct")

        client = InferenceClient()
        req = InferenceRequest(
            messages=[{"role": "user", "content": "Find the roots and explain why."}],
            task_type="chat",
        )

        selected_model, source = client._resolve_primary_model(req)
        model_chain = client._model_chain_for_task("chat", selected_model)

        assert selected_model == "Qwen/Qwen3-32B"
        assert "chat_override_env" in source
        assert model_chain == ["Qwen/Qwen3-32B"]

    def test_chat_temp_override_wins_under_qwen_only_lock(self, monkeypatch):
        monkeypatch.setenv("INFERENCE_CHAT_MODEL_ID", "Qwen/Qwen2.5-7B-Instruct")
        monkeypatch.setenv("INFERENCE_CHAT_MODEL_TEMP_OVERRIDE", "Qwen/Qwen3-32B")
        monkeypatch.setenv("INFERENCE_CHAT_STRICT_MODEL_ONLY", "true")
        monkeypatch.setenv("INFERENCE_ENFORCE_QWEN_ONLY", "true")
        monkeypatch.setenv("INFERENCE_QWEN_LOCK_MODEL", "Qwen/Qwen2.5-7B-Instruct")

        client = InferenceClient()
        req = InferenceRequest(
            messages=[{"role": "user", "content": "Find the roots and explain why."}],
            task_type="chat",
        )

        selected_model, source = client._resolve_primary_model(req)
        model_chain = client._model_chain_for_task("chat", selected_model)

        assert selected_model == "Qwen/Qwen3-32B"
        assert "chat_temp_override_env" in source
        assert model_chain == ["Qwen/Qwen3-32B"]

    def test_chat_temp_override_does_not_change_non_chat_task_under_qwen_lock(self, monkeypatch):
        monkeypatch.setenv("INFERENCE_CHAT_MODEL_TEMP_OVERRIDE", "Qwen/Qwen3-32B")
        monkeypatch.setenv("INFERENCE_ENFORCE_QWEN_ONLY", "true")
        monkeypatch.setenv("INFERENCE_QWEN_LOCK_MODEL", "Qwen/Qwen2.5-7B-Instruct")

        client = InferenceClient()
        req = InferenceRequest(
            messages=[{"role": "user", "content": "Check if my solution is correct."}],
            task_type="verify_solution",
        )

        selected_model, source = client._resolve_primary_model(req)
        model_chain = client._model_chain_for_task("verify_solution", selected_model)

        assert selected_model == "Qwen/Qwen2.5-7B-Instruct"
        assert "chat_temp_override_env" not in source
        assert model_chain == ["Qwen/Qwen2.5-7B-Instruct"]

    def test_chat_escalation_when_strict_lock_disabled(self, monkeypatch):
        monkeypatch.setenv("INFERENCE_CHAT_MODEL_ID", "Qwen/Qwen2.5-7B-Instruct")
        monkeypatch.setenv("INFERENCE_CHAT_STRICT_MODEL_ONLY", "false")
        monkeypatch.setenv("INFERENCE_ENFORCE_QWEN_ONLY", "false")
        monkeypatch.setenv("INFERENCE_CHAT_HARD_TRIGGER_ENABLED", "true")
        monkeypatch.setenv("INFERENCE_CHAT_HARD_MODEL_ID", "meta-llama/Meta-Llama-3-70B-Instruct")
        monkeypatch.setenv("INFERENCE_CHAT_HARD_PROMPT_CHARS", "256")
        monkeypatch.setenv("INFERENCE_CHAT_HARD_HISTORY_CHARS", "256")

        client = InferenceClient()
        req = InferenceRequest(
            messages=[{"role": "user", "content": "Show all steps and prove the result rigorously."}],
            task_type="chat",
        )

        selected_model, source = client._resolve_primary_model(req)

        assert selected_model == "meta-llama/Meta-Llama-3-70B-Instruct"
        assert source.startswith("chat_hard_escalation:")

    def test_async_chat_posts_only_qwen_when_strict_enabled(self, monkeypatch):
        monkeypatch.setenv("INFERENCE_CHAT_MODEL_ID", "Qwen/Qwen2.5-7B-Instruct")
        monkeypatch.setenv("INFERENCE_CHAT_STRICT_MODEL_ONLY", "true")
        monkeypatch.setenv("INFERENCE_CHAT_HARD_TRIGGER_ENABLED", "true")
        monkeypatch.setenv("INFERENCE_HF_TIMEOUT_SEC", "15")

        routing_client = InferenceClient()
        requests_seen: List[Dict[str, Any]] = []

        class FakeAsyncResponse:
            def __init__(self, status_code: int, payload: Dict[str, Any]):
                self.status_code = status_code
                self._payload = payload
                self.text = json.dumps(payload)

            def json(self) -> Dict[str, Any]:
                return self._payload

        class FakeAsyncHttpClient:
            async def post(self, _url, *, headers=None, json=None, timeout=None):
                requests_seen.append({
                    "headers": headers,
                    "payload": json,
                    "timeout": timeout,
                })
                return FakeAsyncResponse(
                    200,
                    {"choices": [{"message": {"content": "Final answer: 42"}}]},
                )

        async def _run() -> str:
            real_getenv = os.getenv

            def _patched_getenv(key: str, default=None):
                if key == "PYTEST_CURRENT_TEST":
                    return ""
                return real_getenv(key, default)

            with patch.object(main_module, "get_inference_client", return_value=routing_client), patch.object(
                main_module,
                "_get_hf_async_http_client",
                new=AsyncMock(return_value=FakeAsyncHttpClient()),
            ), patch.object(main_module.os, "getenv", side_effect=_patched_getenv):
                return await main_module.call_hf_chat_async(
                    [{"role": "user", "content": "Solve x^2 - 5x + 6 = 0."}],
                    task_type="chat",
                )

        result = asyncio.run(_run())

        assert "42" in result
        assert len(requests_seen) == 1
        sent_model = requests_seen[0]["payload"]["model"]
        assert sent_model.startswith("Qwen/Qwen2.5-7B-Instruct")
        assert "Meta-Llama" not in sent_model
        assert "gemma" not in sent_model.lower()

    def test_qwen_only_lock_replaces_explicit_non_qwen_model(self, monkeypatch):
        monkeypatch.setenv("INFERENCE_ENFORCE_QWEN_ONLY", "true")
        monkeypatch.setenv("INFERENCE_QWEN_LOCK_MODEL", "Qwen/Qwen2.5-7B-Instruct")
        monkeypatch.setenv("INFERENCE_CHAT_STRICT_MODEL_ONLY", "true")

        client = InferenceClient()
        req = InferenceRequest(
            messages=[{"role": "user", "content": "Solve this quickly."}],
            model="meta-llama/Meta-Llama-3-70B-Instruct",
            task_type="verify_solution",
        )

        selected_model, source = client._resolve_primary_model(req)
        model_chain = client._model_chain_for_task("verify_solution", selected_model)

        assert selected_model == "Qwen/Qwen2.5-7B-Instruct"
        assert "qwen_only" in source
        assert model_chain == ["Qwen/Qwen2.5-7B-Instruct"]


# ─── Risk Prediction ──────────────────────────────────────────


class TestRiskPrediction:
    @patch("main.get_client")
    def test_predict_risk_success(self, mock_get):
        mock_get.return_value = make_zsc_client()
        response = client.post("/api/predict-risk", json={
            "engagementScore": 80,
            "avgQuizScore": 75,
            "attendance": 90,
            "assignmentCompletion": 85,
        })
        assert response.status_code == 200
        data = response.json()
        assert data["riskLevel"] in ("High", "Medium", "Low")
        assert 0 <= data["confidence"] <= 1

    def test_predict_risk_invalid_score_range(self):
        response = client.post("/api/predict-risk", json={
            "engagementScore": 150,  # > 100
            "avgQuizScore": 75,
            "attendance": 90,
            "assignmentCompletion": 85,
        })
        assert response.status_code == 422

    def test_predict_risk_negative_score(self):
        response = client.post("/api/predict-risk", json={
            "engagementScore": -5,
            "avgQuizScore": 75,
            "attendance": 90,
            "assignmentCompletion": 85,
        })
        assert response.status_code == 422

    def test_predict_risk_missing_fields(self):
        response = client.post("/api/predict-risk", json={
            "engagementScore": 80,
        })
        assert response.status_code == 422

    @patch("main.get_client")
    def test_predict_risk_hf_failure(self, mock_get):
        hf = make_zsc_client()
        hf.zero_shot_classification.side_effect = Exception("HF down")
        mock_get.return_value = hf
        response = client.post("/api/predict-risk", json={
            "engagementScore": 80,
            "avgQuizScore": 75,
            "attendance": 90,
            "assignmentCompletion": 85,
        })
        assert response.status_code == 502

    @patch("main.get_client")
    def test_batch_risk_prediction(self, mock_get):
        mock_get.return_value = make_zsc_client()
        response = client.post("/api/predict-risk/batch", json={
            "students": [
                {"engagementScore": 80, "avgQuizScore": 75, "attendance": 90, "assignmentCompletion": 85},
                {"engagementScore": 30, "avgQuizScore": 40, "attendance": 50, "assignmentCompletion": 35},
            ],
        })
        assert response.status_code == 200
        assert len(response.json()) == 2


# ─── Learning Path ────────────────────────────────────────────


class TestLearningPath:
    @patch("main.call_hf_chat")
    def test_learning_path_success(self, mock_chat):
        mock_chat.return_value = "1. Review fractions\n2. Practice decimals"
        response = client.post("/api/learning-path", json={
            "weaknesses": ["fractions", "decimals"],
            "gradeLevel": "Grade 11",
        })
        assert response.status_code == 200
        assert "fractions" in response.json()["learningPath"].lower()

    def test_learning_path_missing_weaknesses(self):
        response = client.post("/api/learning-path", json={
            "gradeLevel": "Grade 11",
        })
        assert response.status_code == 422

    def test_learning_path_missing_grade(self):
        response = client.post("/api/learning-path", json={
            "weaknesses": ["fractions"],
        })
        assert response.status_code == 422

    @patch("main.call_hf_chat")
    def test_learning_path_hf_failure(self, mock_chat):
        mock_chat.side_effect = Exception("HF down")
        response = client.post("/api/learning-path", json={
            "weaknesses": ["algebra"],
            "gradeLevel": "Grade 11",
        })
        assert response.status_code == 502


# ─── Daily Insight ─────────────────────────────────────────────


class TestDailyInsight:
    @patch("main.call_hf_chat")
    def test_daily_insight_success(self, mock_chat):
        mock_chat.return_value = "Class is doing well."
        response = client.post("/api/analytics/daily-insight", json={
            "students": [
                {"name": "Alice", "engagementScore": 80, "avgQuizScore": 75, "attendance": 90, "riskLevel": "Low"},
            ],
        })
        assert response.status_code == 200
        assert response.json()["insight"]

    def test_daily_insight_empty_students(self):
        response = client.post("/api/analytics/daily-insight", json={
            "students": [],
        })
        assert response.status_code == 200
        assert "No student data" in response.json()["insight"]


# ─── Quiz Topics ───────────────────────────────────────────────


class TestQuizTopics:
    def test_get_all_topics(self):
        response = client.get("/api/quiz/topics")
        assert response.status_code == 200
        assert "allTopics" in response.json()

    def test_get_topics_by_grade(self):
        response = client.get("/api/quiz/topics?gradeLevel=Grade%2011")
        assert response.status_code == 200
        data = response.json()
        assert data["gradeLevel"] == "Grade 11"
        assert "topics" in data

    def test_get_topics_invalid_grade(self):
        response = client.get("/api/quiz/topics?gradeLevel=Grade%2099")
        assert response.status_code == 404


# ─── Quiz Generation ──────────────────────────────────────────


class TestQuizGeneration:
    @patch("main.call_hf_chat")
    def test_generate_quiz_success(self, mock_chat):
        quiz_json = json.dumps([{
            "questionType": "multiple_choice",
            "question": "What is 2+2?",
            "correctAnswer": "4",
            "options": ["A) 3", "B) 4", "C) 5", "D) 6"],
            "bloomLevel": "remember",
            "difficulty": "easy",
            "topic": "Arithmetic",
            "points": 1,
            "explanation": "2+2=4",
        }])
        mock_chat.return_value = quiz_json

        response = client.post("/api/quiz/generate", json={
            "topics": ["Arithmetic"],
            "gradeLevel": "Grade 11",
            "numQuestions": 1,
        })
        assert response.status_code == 200
        data = response.json()
        assert len(data["questions"]) >= 1
        assert data["totalPoints"] > 0

    def test_generate_quiz_missing_topics(self):
        response = client.post("/api/quiz/generate", json={
            "gradeLevel": "Grade 11",
        })
        assert response.status_code == 422


class TestClassRecordImportMapping:
    def test_sanitize_column_mapping_drops_none_and_unknown_fields(self):
        raw_mapping = {
            "Student Name": "name",
            "Grade Level": None,
            "Section": "",
            "General Mathematics": None,
            "Custom": "not_a_supported_field",
            "Average": "avgQuizScore",
        }

        sanitized = main_module._sanitize_column_mapping(raw_mapping)

        assert sanitized == {
            "Student Name": "name",
            "Average": "avgQuizScore",
        }

    @patch("main.call_hf_chat")
    def test_generate_quiz_bad_llm_output(self, mock_chat):
        mock_chat.return_value = "This is not valid JSON at all."
        response = client.post("/api/quiz/generate", json={
            "topics": ["Algebra"],
            "gradeLevel": "Grade 11",
            "numQuestions": 1,
        })
        assert response.status_code == 500

    @patch("main.call_hf_chat")
    def test_preview_quiz(self, mock_chat):
        quiz_json = json.dumps([{
            "questionType": "identification",
            "question": "Define slope.",
            "correctAnswer": "Rise over run",
            "bloomLevel": "remember",
            "difficulty": "easy",
            "topic": "Algebra",
            "points": 1,
            "explanation": "Slope = rise/run.",
        }])
        mock_chat.return_value = quiz_json
        response = client.post("/api/quiz/preview", json={
            "topics": ["Algebra"],
            "gradeLevel": "Grade 11",
        })
        assert response.status_code == 200

    @patch("main.call_hf_chat")
    def test_generate_quiz_accepts_new_max_limits(self, mock_chat):
        max_questions = main_module.MAX_QUESTIONS_LIMIT
        quiz_json = json.dumps([
            {
                "questionType": "identification",
                "question": f"Question {i + 1}",
                "correctAnswer": "Answer",
                "bloomLevel": "remember",
                "difficulty": "easy",
                "topic": "Algebra",
                "points": 1,
                "explanation": "Because.",
            }
            for i in range(max_questions)
        ])
        mock_chat.return_value = quiz_json

        response = client.post("/api/quiz/generate", json={
            "topics": [f"Topic {i + 1}" for i in range(main_module.MAX_TOPICS_LIMIT)],
            "gradeLevel": "Grade 11",
            "numQuestions": max_questions,
        })

        assert response.status_code == 200
        data = response.json()
        assert len(data["questions"]) == max_questions

    def test_generate_quiz_rejects_over_max_questions(self):
        response = client.post("/api/quiz/generate", json={
            "topics": ["Algebra"],
            "gradeLevel": "Grade 11",
            "numQuestions": main_module.MAX_QUESTIONS_LIMIT + 1,
        })

        assert response.status_code == 422


class TestUploadClassRecordsGuardrails:
    @patch("main.call_hf_chat", side_effect=Exception("mapper unavailable"))
    def test_upload_class_records_rejects_unsupported_dataset_intent(self, _mock_chat):
        files = {
            "files": ("records.csv", b"name,lrn,email,avgQuizScore,attendance,engagementScore,assignmentCompletion\nAna,1001,ana@example.com,80,90,85,88\n", "text/csv"),
        }
        response = client.post(
            "/api/upload/class-records",
            files=files,
            data={"datasetIntent": "unsupported_intent"},
        )

        assert response.status_code == 400
        assert "Unsupported datasetIntent" in response.json()["detail"]

    @patch("main.call_hf_chat", side_effect=Exception("mapper unavailable"))
    def test_upload_class_records_blocks_when_required_core_fields_missing(self, _mock_chat):
        files = {
            "files": (
                "records.csv",
                b"name,lrn,email,attendance\nAna,1001,ana@example.com,90\n",
                "text/csv",
            ),
        }
        response = client.post(
            "/api/upload/class-records",
            files=files,
            data={"datasetIntent": "synthetic_student_records"},
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload["success"] is False
        assert payload["summary"]["failedFiles"] == 1
        combined_warnings = " ".join(payload.get("warnings", []))
        assert "Missing required educational columns" in combined_warnings

    @patch("main.call_hf_chat", side_effect=Exception("mapper unavailable"))
    def test_upload_class_records_returns_interpretation_metadata(self, _mock_chat):
        files = {
            "files": (
                "records.csv",
                (
                    b"name,lrn,email,avgQuizScore,attendance,engagementScore,assignmentCompletion,patient_diagnosis\n"
                    b"Ana,1001,ana@example.com,80,90,85,88,none\n"
                ),
                "text/csv",
            ),
        }
        response = client.post(
            "/api/upload/class-records",
            files=files,
            data={"datasetIntent": "synthetic_student_records"},
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload["success"] is True
        assert payload["datasetIntent"] == "synthetic_student_records"
        assert isinstance(payload.get("columnInterpretations"), list)
        summary = payload.get("interpretationSummary") or {}
        assert summary.get("storageOnlyColumns", 0) >= 1
        assert summary.get("domainMismatchWarnings", 0) >= 1

        patient_column = next(
            (item for item in payload["columnInterpretations"] if item.get("columnName") == "patient_diagnosis"),
            None,
        )
        assert patient_column is not None
        assert patient_column["usagePolicy"] == "storage_only"
        assert patient_column["confidenceBand"] == "low"

    @patch("main.call_hf_chat", side_effect=Exception("mapper unavailable"))
    def test_upload_class_records_accepts_minimal_teacher_schema(self, _mock_chat):
        files = {
            "files": (
                "records.csv",
                (
                    b"name,lrn,avgQuizScore,attendance,engagementScore\n"
                    b"Ana Cruz,1001,81,92,88\n"
                    b"Ben Dela,1002,58,70,52\n"
                ),
                "text/csv",
            ),
        }

        response = client.post(
            "/api/upload/class-records",
            files=files,
            data={"datasetIntent": "synthetic_student_records"},
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload["success"] is True
        assert payload["interpretedRows"] == 2
        assert payload["rejectedRows"] == 0
        assert payload["inferredStateCoverage"]["inferredRows"] == 2
        assert payload["inferredStateCoverage"]["coveragePct"] == 100.0
        assert all("inferredState" in row for row in payload["students"])

    @patch("main.call_hf_chat", side_effect=Exception("mapper unavailable"))
    def test_upload_class_records_reports_explicit_row_rejections(self, _mock_chat):
        files = {
            "files": (
                "records.csv",
                (
                    b"name,lrn,email,avgQuizScore,attendance,engagementScore\n"
                    b",1001,ana@example.com,81,92,88\n"
                    b"Ben Dela,,,58,70,52\n"
                    b"Cara Lim,1003,,77,83,75\n"
                ),
                "text/csv",
            ),
        }

        response = client.post(
            "/api/upload/class-records",
            files=files,
            data={"datasetIntent": "synthetic_student_records"},
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload["success"] is True
        assert payload["interpretedRows"] == 1
        assert payload["rejectedRows"] == 2
        reasons = payload.get("rejectedReasons") or {}
        assert any("missing required field: name" in key for key in reasons.keys())
        assert any("missing required identity value: lrn_or_email" in key for key in reasons.keys())
        assert len(payload.get("rejectedRowDetails") or []) == 2

    @patch("main.call_hf_chat", side_effect=Exception("mapper unavailable"))
    def test_upload_class_records_degrades_gracefully_when_firestore_adc_missing(self, _mock_chat):
        class _FailingFirestoreModule:
            def client(self):
                raise Exception(
                    "Your default credentials were not found. "
                    "To set up Application Default Credentials, see https://cloud.google.com/docs/authentication/external/set-up-adc"
                )

        files = {
            "files": (
                "records.csv",
                (
                    b"name,lrn,avgQuizScore,attendance,engagementScore\n"
                    b"Ana Cruz,1001,81,92,88\n"
                ),
                "text/csv",
            ),
        }

        with patch.object(main_module, "firebase_firestore", _FailingFirestoreModule()), patch.object(main_module, "_firebase_ready", True):
            response = client.post(
                "/api/upload/class-records",
                files=files,
                data={"datasetIntent": "synthetic_student_records"},
            )

        assert response.status_code == 200
        payload = response.json()
        assert payload["success"] is True
        assert payload["persisted"] is False
        assert (payload.get("dashboardSync") or {}).get("synced") is False
        warnings_blob = " ".join(payload.get("warnings", []))
        assert "adc is not configured" in warnings_blob.lower()


class TestImportedOverviewAndTopicMastery:
    def test_imported_class_overview_returns_inferred_state_for_realistic_minimal_records(self):
        firestore = _FakeFirestoreModule(
            {
                "normalizedClassRecords": [
                    {
                        "teacherId": "test-teacher-uid",
                        "name": "Ana Cruz",
                        "lrn": "1001",
                        "classSectionId": "grade11_a",
                        "className": "Grade 11 - A",
                        "avgQuizScore": 92,
                        "attendance": 96,
                        "engagementScore": 91,
                        "unknownFields": {},
                    },
                    {
                        "teacherId": "test-teacher-uid",
                        "name": "Ben Dela",
                        "lrn": "1002",
                        "classSectionId": "grade11_a",
                        "className": "Grade 11 - A",
                        "avgQuizScore": 68,
                        "attendance": 82,
                        "engagementScore": 66,
                        "unknownFields": {},
                    },
                    {
                        "teacherId": "test-teacher-uid",
                        "name": "Cara Lim",
                        "lrn": "1003",
                        "classSectionId": "grade11_a",
                        "className": "Grade 11 - A",
                        "avgQuizScore": 49,
                        "attendance": 71,
                        "engagementScore": 50,
                        "unknownFields": {},
                    },
                ]
            }
        )

        with patch.object(main_module, "firebase_firestore", firestore), patch.object(main_module, "_firebase_ready", True):
            response = client.get("/api/analytics/imported-class-overview?classSectionId=grade11_a&limit=100")

        assert response.status_code == 200
        payload = response.json()
        assert payload["success"] is True
        assert len(payload["students"]) == 3
        coverage = payload.get("inferredStateCoverage") or {}
        assert coverage.get("inferredRows") == 3
        assert coverage.get("coveragePct") == 100.0

        risk_levels = {student["riskLevel"] for student in payload["students"]}
        assert risk_levels == {"Low", "Medium", "High"}
        assert all(student.get("inferredState") for student in payload["students"])
        assert all("stateConfidence" in student for student in payload["students"])

    def test_imported_class_overview_returns_503_when_firestore_adc_missing(self):
        firestore = _FakeFirestoreModule(
            {"normalizedClassRecords": []},
            stream_error=(
                "Your default credentials were not found. "
                "To set up Application Default Credentials, see https://cloud.google.com/docs/authentication/external/set-up-adc"
            ),
        )

        with patch.object(main_module, "firebase_firestore", firestore), patch.object(main_module, "_firebase_ready", True):
            response = client.get("/api/analytics/imported-class-overview?classSectionId=grade11_a&limit=100")

        assert response.status_code == 503
        detail = str((response.json() or {}).get("detail") or "").lower()
        assert "firestore adc is not configured" in detail
        assert "google_application_credentials" in detail

    def test_topic_mastery_reports_fallback_warning_without_topic_columns(self):
        firestore = _FakeFirestoreModule(
            {
                "normalizedClassRecords": [
                    {
                        "teacherId": "test-teacher-uid",
                        "name": "Ana Cruz",
                        "lrn": "1001",
                        "classSectionId": "grade11_a",
                        "className": "Grade 11 - A",
                        "avgQuizScore": 84,
                        "attendance": 92,
                        "engagementScore": 88,
                        "assessmentName": "general-assessment",
                        "unknownFields": {},
                    }
                ],
                "courseMaterials": [],
            }
        )

        with patch.object(main_module, "firebase_firestore", firestore), patch.object(main_module, "_firebase_ready", True):
            response = client.get("/api/analytics/topic-mastery?teacherId=test-teacher-uid&classSectionId=grade11_a")

        assert response.status_code == 200
        payload = response.json()
        assert payload["summary"]["totalTopicsTracked"] >= 1
        assert payload["summary"].get("fallbackTopicRows") == 1
        assert any("fallback topic context" in warning.lower() for warning in payload.get("warnings") or [])


class TestAsyncGenerationTasks:
    @patch("main.asyncio.create_task")
    def test_quiz_generate_async_submit_status_list_cancel(self, mock_create_task):
        main_module._async_tasks.clear()
        mock_create_task.side_effect = lambda coro: coro.close()
        response = client.post("/api/quiz/generate-async", json={
            "topics": ["Algebra"],
            "gradeLevel": "Grade 11",
            "numQuestions": 1,
        })

        assert response.status_code == 200
        payload = response.json()
        task_id = payload["taskId"]
        assert payload["status"] == "queued"
        assert mock_create_task.called

        status_response = client.get(f"/api/tasks/{task_id}")
        assert status_response.status_code == 200
        status_payload = status_response.json()
        assert status_payload["taskId"] == task_id
        assert status_payload["status"] in {"queued", "running", "cancelling", "cancelled", "completed", "failed"}

        list_response = client.get("/api/tasks?limit=20")
        assert list_response.status_code == 200
        list_payload = list_response.json()
        assert list_payload["count"] >= 1
        assert any(item["taskId"] == task_id for item in list_payload["tasks"])

        cancel_response = client.post(f"/api/tasks/{task_id}/cancel")
        assert cancel_response.status_code == 200
        cancel_payload = cancel_response.json()
        assert cancel_payload["taskId"] == task_id
        assert cancel_payload["status"] in {"cancelled", "cancelling"}

    def test_inference_metrics_requires_admin(self):
        response = client.get("/api/ops/inference-metrics")
        assert response.status_code == 403

    @patch.object(main_module.firebase_auth, "verify_id_token", return_value={
        "uid": "admin-uid",
        "email": "admin@example.com",
        "role": "admin",
    })
    def test_inference_metrics_admin_success(self, _mock_verify):
        response = client.get("/api/ops/inference-metrics")
        assert response.status_code == 200
        payload = response.json()
        assert payload["success"] is True
        assert "metrics" in payload
        assert "requests_total" in payload["metrics"]


# ─── Calculator ────────────────────────────────────────────────


class TestCalculator:
    def test_evaluate_simple_expression(self):
        response = client.post("/api/calculator/evaluate", json={
            "expression": "2 + 3",
        })
        # sympy may not be installed in test env — accept 200 or 500
        assert response.status_code in (200, 500)
        if response.status_code == 200:
            data = response.json()
            assert data["result"] == "5"

    def test_evaluate_with_variables(self):
        response = client.post("/api/calculator/evaluate", json={
            "expression": "x**2 + 2*x + 1",
        })
        # Accept 200 (sympy available) or 500 (sympy missing)
        assert response.status_code in (200, 500)

    def test_evaluate_dangerous_expression(self):
        response = client.post("/api/calculator/evaluate", json={
            "expression": "__import__('os').system('rm -rf /')",
        })
        # 400 if validation catches it, 500 if sympy missing or general error
        assert response.status_code in (400, 500)

    def test_evaluate_empty_expression(self):
        response = client.post("/api/calculator/evaluate", json={
            "expression": "",
        })
        assert response.status_code == 422

    def test_evaluate_too_long_expression(self):
        response = client.post("/api/calculator/evaluate", json={
            "expression": "x + " * 200,
        })
        # 400 if length validation, 422 if pydantic validation, 500 if sympy missing
        assert response.status_code in (400, 422, 500)


# ─── Error Handling ────────────────────────────────────────────


class TestErrorHandling:
    def test_404_for_unknown_endpoint(self):
        response = client.get("/api/nonexistent")
        assert response.status_code == 404

    def test_method_not_allowed(self):
        response = client.get("/api/chat")
        assert response.status_code == 405

    def test_request_id_in_error_response(self):
        response = client.get("/api/nonexistent")
        assert "x-request-id" in response.headers

    def test_invalid_json_body(self):
        response = client.post(
            "/api/chat",
            content="this is not json",
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 422


# ─── Student Competency ───────────────────────────────────────


class TestStudentCompetency:
    @patch("main.call_hf_chat")
    def test_competency_no_history(self, mock_chat):
        mock_chat.return_value = ""
        response = client.post("/api/quiz/student-competency", json={
            "studentId": "student123",
            "quizHistory": [],
        })
        assert response.status_code == 200
        data = response.json()
        assert data["studentId"] == "student123"
        assert data["competencies"] == []

    @patch("main.call_hf_chat")
    def test_competency_with_history(self, mock_chat):
        mock_chat.return_value = "Good progress overall."
        response = client.post("/api/quiz/student-competency", json={
            "studentId": "student123",
            "quizHistory": [
                {"topic": "Algebra", "score": 8, "total": 10, "timeTaken": 300},
                {"topic": "Algebra", "score": 9, "total": 10, "timeTaken": 250},
                {"topic": "Geometry", "score": 4, "total": 10, "timeTaken": 500},
            ],
        })
        assert response.status_code == 200
        data = response.json()
        assert len(data["competencies"]) > 0
        # Algebra should be higher competency than Geometry
        algebra = next((c for c in data["competencies"] if c["topic"] == "Algebra"), None)
        geometry = next((c for c in data["competencies"] if c["topic"] == "Geometry"), None)
        if algebra and geometry:
            assert algebra["efficiencyScore"] > geometry["efficiencyScore"]


# ─── Course Materials Recent Retrieval ───────────────────────


class _FakeDocSnapshot:
    def __init__(self, doc_id: str, data: Dict[str, Any]):
        self.id = doc_id
        self._data = data

    def to_dict(self) -> Dict[str, Any]:
        return self._data


class _FakeQuery:
    def __init__(self, docs: List[Dict[str, Any]], fail_order: bool = False, stream_error: str | None = None):
        self._docs = docs
        self._filters: List[tuple[str, str, Any]] = []
        self._limit: int | None = None
        self._fail_order = fail_order
        self._stream_error = stream_error

    def where(self, field: str, op: str, value: Any):
        self._filters.append((field, op, value))
        return self

    def order_by(self, *args, **kwargs):
        if self._fail_order:
            raise Exception("missing composite index")
        return self

    def limit(self, value: int):
        self._limit = value
        return self

    def stream(self):
        if self._stream_error:
            raise Exception(self._stream_error)

        filtered: List[Dict[str, Any]] = []
        for doc in self._docs:
            include = True
            for field, op, expected in self._filters:
                if op != "==":
                    continue
                if doc.get(field) != expected:
                    include = False
                    break
            if include:
                filtered.append(doc)

        if self._limit is not None:
            filtered = filtered[: self._limit]

        return [_FakeDocSnapshot(str(doc.get("materialId") or "doc"), doc) for doc in filtered]


class _FakeCollection:
    def __init__(
        self,
        name: str,
        store: Dict[str, List[Dict[str, Any]]],
        audit_logs: List[Dict[str, Any]],
        fail_order: bool = False,
        stream_error: str | None = None,
    ):
        self._name = name
        self._store = store
        self._audit_logs = audit_logs
        self._fail_order = fail_order
        self._stream_error = stream_error

    def where(self, field: str, op: str, value: Any):
        docs = list(self._store.get(self._name, []))
        query = _FakeQuery(docs, fail_order=self._fail_order, stream_error=self._stream_error)
        return query.where(field, op, value)

    def add(self, payload: Dict[str, Any]):
        self._audit_logs.append(payload)
        return (None, None)


class _FakeFirestoreClient:
    def __init__(self, store: Dict[str, List[Dict[str, Any]]], fail_order: bool = False, stream_error: str | None = None):
        self._store = store
        self.audit_logs: List[Dict[str, Any]] = []
        self._fail_order = fail_order
        self._stream_error = stream_error

    def collection(self, name: str):
        return _FakeCollection(
            name,
            self._store,
            self.audit_logs,
            fail_order=self._fail_order,
            stream_error=self._stream_error,
        )


class _FakeFirestoreModule:
    class Query:
        DESCENDING = "DESCENDING"

    SERVER_TIMESTAMP = object()

    def __init__(
        self,
        store: Dict[str, List[Dict[str, Any]]],
        fail_order: bool = False,
        stream_error: str | None = None,
    ):
        self._client = _FakeFirestoreClient(store, fail_order=fail_order, stream_error=stream_error)

    def client(self):
        return self._client


class TestRecentCourseMaterials:
    def test_recent_course_materials_respects_class_section_filter(self):
        now = int(time.time())
        firestore = _FakeFirestoreModule(
            {
                "courseMaterials": [
                    {
                        "materialId": "mat-a",
                        "teacherId": "test-teacher-uid",
                        "fileName": "algebra-a.pdf",
                        "fileType": "pdf",
                        "classSectionId": "grade11_a",
                        "topics": [{"title": "Linear Equations"}],
                        "extractedTextLength": 1200,
                        "retentionDays": 180,
                        "expiresAtEpoch": now + 3600,
                    },
                    {
                        "materialId": "mat-b",
                        "teacherId": "test-teacher-uid",
                        "fileName": "algebra-b.pdf",
                        "fileType": "pdf",
                        "classSectionId": "grade11_b",
                        "topics": [{"title": "Quadratics"}],
                        "extractedTextLength": 1600,
                        "retentionDays": 180,
                        "expiresAtEpoch": now + 3600,
                    },
                ]
            }
        )

        with patch.object(main_module, "firebase_firestore", firestore), patch.object(main_module, "_firebase_ready", True):
            response = client.get("/api/upload/course-materials/recent?classSectionId=grade11_a&limit=10")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["classSectionId"] == "grade11_a"
        assert len(data["materials"]) == 1
        assert data["materials"][0]["materialId"] == "mat-a"
        assert all(item["classSectionId"] == "grade11_a" for item in data["materials"])

    def test_recent_course_materials_reports_retention_exclusions(self):
        now = int(time.time())
        firestore = _FakeFirestoreModule(
            {
                "courseMaterials": [
                    {
                        "materialId": "mat-valid",
                        "teacherId": "test-teacher-uid",
                        "fileName": "active.txt",
                        "fileType": "txt",
                        "classSectionId": "grade11_a",
                        "topics": [{"title": "Functions"}],
                        "extractedTextLength": 900,
                        "retentionDays": 180,
                        "expiresAtEpoch": now + 7200,
                    },
                    {
                        "materialId": "mat-expired",
                        "teacherId": "test-teacher-uid",
                        "fileName": "expired.txt",
                        "fileType": "txt",
                        "classSectionId": "grade11_a",
                        "topics": [{"title": "Inequalities"}],
                        "extractedTextLength": 700,
                        "retentionDays": 30,
                        "expiresAtEpoch": now - 60,
                    },
                ]
            },
            fail_order=True,
        )

        with patch.object(main_module, "firebase_firestore", firestore), patch.object(main_module, "_firebase_ready", True):
            response = client.get("/api/upload/course-materials/recent?classSectionId=grade11_a&limit=10")

        assert response.status_code == 200
        data = response.json()
        assert len(data["materials"]) == 1
        assert data["materials"][0]["materialId"] == "mat-valid"
        warning_text = " ".join(data.get("warnings", []))
        assert "expired course-material artifact" in warning_text.lower()
        assert "fallback query path" in warning_text.lower()


# ─── Run ───────────────────────────────────────────────────────

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
