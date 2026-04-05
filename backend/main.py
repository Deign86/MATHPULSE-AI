"""
MathPulse AI - FastAPI Backend
AI-powered math tutoring backend using Hugging Face models.
- meta-llama/Llama-3.1-8B-Instruct for chat, learning paths, insights, and quiz generation
    (via Hugging Face Inference API)
- facebook/bart-large-mnli for student risk classification
- Multi-method verification system for math accuracy
- AI-powered Quiz Maker with Bloom's Taxonomy integration
- Symbolic math calculator via SymPy
- Analytics and automation engine modules

Auto-deployed to HuggingFace Spaces via GitHub Actions.
"""

import os
import io
import re
import json
import math
import hashlib
import logging
import traceback
import urllib.parse
import random
from typing import List, Optional, Dict, Any, Set, Tuple, Iterator, AsyncIterator, cast
from collections import Counter, defaultdict
from threading import Lock

# STARTUP VALIDATION - Run before anything else to prevent restart loops
try:
    from startup_validation import run_all_validations
    run_all_validations()  # Exits with error if any critical check fails
except ImportError as e:
    # If startup_validation module is not found, log warning but continue
    # This can happen if the module wasn't properly deployed
    print(f"⚠️  Warning: startup_validation module not found: {e}")
    print("   Continuing without startup validation checks...")
except BaseException as e:
    # Do not crash the container on validation issues unless explicitly configured.
    strict_startup_validation = os.getenv("STARTUP_VALIDATION_STRICT", "false").strip().lower() in {"1", "true", "yes", "on"}
    if strict_startup_validation:
        raise
    print(f"⚠️  Warning: startup validation failed but strict mode is disabled: {e}")
    print("   Continuing startup to avoid restart-loop crash.")

from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Request, Form
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response, StreamingResponse
from pydantic import BaseModel, Field, field_validator
from starlette.middleware.base import BaseHTTPMiddleware
import asyncio
import time
import uuid
import sys
from datetime import datetime, timezone, timedelta
import tempfile
import subprocess
import requests as http_requests
import httpx
import uvicorn
from services.inference_client import InferenceRequest, create_default_client
from services.logging_utils import log_model_call

try:
    import firebase_admin  # type: ignore[import-not-found]
    from firebase_admin import auth as firebase_auth  # type: ignore[import-not-found]
    from firebase_admin import firestore as firebase_firestore  # type: ignore[import-not-found]
    HAS_FIREBASE_ADMIN = True
except Exception:
    firebase_admin = None  # type: ignore[assignment]
    firebase_auth = None  # type: ignore[assignment]
    firebase_firestore = None  # type: ignore[assignment]
    HAS_FIREBASE_ADMIN = False

try:
    from google.oauth2 import id_token as google_id_token  # type: ignore[import-not-found]
    from google.auth.transport import requests as google_auth_requests  # type: ignore[import-not-found]
    HAS_GOOGLE_AUTH = True
except Exception:
    google_id_token = None  # type: ignore[assignment]
    google_auth_requests = None  # type: ignore[assignment]
    HAS_GOOGLE_AUTH = False

# Event-driven automation engine
from automation_engine import (
    automation_engine,
    DiagnosticCompletionPayload,
    QuizSubmissionPayload,
    StudentEnrollmentPayload,
    DataImportPayload,
    ContentUpdatePayload,
    AutomationResult,
)

# ML-powered analytics module
from analytics import (
    # Request/Response models
    CompetencyAnalysisRequest,
    CompetencyAnalysis,
    CompetencyAnalysisResponse,
    TopicRecommendation,
    TopicRecommendationRequest,
    TopicRecommendationResponse,
    EnhancedRiskPrediction,
    EnhancedRiskRequest,
    RiskTrainRequest,
    RiskTrainResponse,
    CalibrateDifficultyRequest,
    CalibrateDifficultyResponse,
    AdaptiveQuizRequest as AdaptiveQuizSelectRequest,
    AdaptiveQuizResponse,
    StudentSummaryResponse,
    ClassInsightsRequest,
    ClassInsightsResponse,
    MockDataRequest,
    RefreshCacheResponse,
    # Core functions
    compute_competency_analysis,
    predict_risk_enhanced,
    train_risk_model,
    calibrate_question_difficulty,
    select_adaptive_quiz,
    recommend_topics,
    get_student_summary,
    get_class_insights,
    generate_mock_student_data,
    refresh_all_caches,
    # Helpers
    fetch_student_quiz_history,
    fetch_student_engagement_metrics,
    fetch_topic_dependencies,
    store_competency_analysis,
    store_question_difficulty,
    # Config
    RISK_MODEL_PATH,
    COMPETENCY_THRESHOLDS,
    MIN_QUIZ_ATTEMPTS_FOR_COMPETENCY,
)

# ─── Configuration ─────────────────────────────────────────────

# ─── Configuration ─────────────────────────────────────────────

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mathpulse")

# Lazy-initialized inference client to avoid startup blocking
_inference_client = None
_inference_client_lock = Lock()

def get_inference_client():
    """Lazy-initialize inference client on first use."""
    global _inference_client
    if _inference_client is None:
        with _inference_client_lock:
            if _inference_client is None:
                logger.info("🔧 Initializing InferenceClient...")
                _inference_client = create_default_client()
                logger.info("✅ InferenceClient initialized")
    return _inference_client

HF_TOKEN = os.environ.get(
    "HF_TOKEN",
    os.environ.get("HUGGING_FACE_API_TOKEN", os.environ.get("HUGGINGFACE_API_TOKEN", "")),
)

# Grade 11-12 tutoring default model. Can be overridden via INFERENCE_MODEL_ID or INFERENCE_CHAT_MODEL_ID.
HF_MATH_MODEL_ID = os.getenv("INFERENCE_CHAT_MODEL_ID") or os.getenv("INFERENCE_MODEL_ID") or os.getenv("HF_MATH_MODEL_ID", "Qwen/Qwen3-32B")

# Alias kept so automation_engine.py (which imports CHAT_MODEL) keeps working.
CHAT_MODEL = HF_MATH_MODEL_ID

# Dedicated quiz model override. When empty, routing.task_model_map decides quiz model.
HF_QUIZ_MODEL_ID = (os.getenv("HF_QUIZ_MODEL_ID", "").strip() or None)
HF_QUIZ_JSON_REPAIR_MODEL_ID = os.getenv("HF_QUIZ_JSON_REPAIR_MODEL_ID", "Qwen/Qwen3-32B")

RISK_MODEL = "facebook/bart-large-mnli"
VERIFICATION_SAMPLES = 3  # Number of samples for self-consistency checking
ENABLE_DEV_ENDPOINTS = os.getenv("ENABLE_DEV_ENDPOINTS", "false").strip().lower() in {"1", "true", "yes", "on"}
UPLOAD_MAX_BYTES = int(os.getenv("UPLOAD_MAX_BYTES", str(5 * 1024 * 1024)))
UPLOAD_MAX_ROWS = int(os.getenv("UPLOAD_MAX_ROWS", "2000"))
UPLOAD_MAX_COLS = int(os.getenv("UPLOAD_MAX_COLS", "60"))
UPLOAD_MAX_PDF_PAGES = int(os.getenv("UPLOAD_MAX_PDF_PAGES", "20"))
UPLOAD_RATE_LIMIT_PER_MIN = int(os.getenv("UPLOAD_RATE_LIMIT_PER_MIN", "12"))
UPLOAD_MAX_FILES_PER_REQUEST = int(os.getenv("UPLOAD_MAX_FILES_PER_REQUEST", "8"))
IMPORT_RETENTION_DAYS = int(os.getenv("IMPORT_RETENTION_DAYS", "180"))
ENABLE_IMPORT_GROUNDED_QUIZ = os.getenv("ENABLE_IMPORT_GROUNDED_QUIZ", "true").strip().lower() in {"1", "true", "yes", "on"}
ENABLE_IMPORT_GROUNDED_LESSON = os.getenv("ENABLE_IMPORT_GROUNDED_LESSON", "true").strip().lower() in {"1", "true", "yes", "on"}
ENABLE_IMPORT_GROUNDED_FEEDBACK_EVENTS = os.getenv("ENABLE_IMPORT_GROUNDED_FEEDBACK_EVENTS", "true").strip().lower() in {"1", "true", "yes", "on"}
ENFORCE_LEGIT_SOURCES_FOR_LESSONS = os.getenv("ENFORCE_LEGIT_SOURCES_FOR_LESSONS", "true").strip().lower() in {"1", "true", "yes", "on"}
ENABLE_ASYNC_GENERATION = os.getenv("ENABLE_ASYNC_GENERATION", "true").strip().lower() in {"1", "true", "yes", "on"}
ENABLE_LLM_RISK_RECOMMENDATIONS = os.getenv("ENABLE_LLM_RISK_RECOMMENDATIONS", "true").strip().lower() in {"1", "true", "yes", "on"}
ASYNC_TASK_TTL_SECONDS = int(os.getenv("ASYNC_TASK_TTL_SECONDS", "3600"))
ASYNC_TASK_MAX_ITEMS = int(os.getenv("ASYNC_TASK_MAX_ITEMS", "400"))
LESSON_SOURCE_MIN_TEXT_LENGTH = int(os.getenv("LESSON_SOURCE_MIN_TEXT_LENGTH", "240"))
LESSON_SOURCE_MIN_TOPICS = int(os.getenv("LESSON_SOURCE_MIN_TOPICS", "1"))
LESSON_VALIDATION_MIN_SCORE = float(os.getenv("LESSON_VALIDATION_MIN_SCORE", "0.7"))
ENABLE_FALLBACK_FIREBASE_TOKEN_VERIFY = os.getenv("ENABLE_FALLBACK_FIREBASE_TOKEN_VERIFY", "true").strip().lower() in {"1", "true", "yes", "on"}
FIREBASE_AUTH_PROJECT_ID = os.getenv("FIREBASE_AUTH_PROJECT_ID", "mathpulse-ai-2026").strip()
FIREBASE_SERVICE_ACCOUNT_JSON = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON", "").strip()
FIREBASE_SERVICE_ACCOUNT_FILE = os.getenv("FIREBASE_SERVICE_ACCOUNT_FILE", "").strip()
FIREBASE_AUTH_PROJECT_ALLOWLIST: Set[str] = {
    value.strip()
    for value in os.getenv("FIREBASE_AUTH_PROJECT_ALLOWLIST", "").split(",")
    if value.strip()
}
CHAT_MAX_NEW_TOKENS = max(256, int(os.getenv("CHAT_MAX_NEW_TOKENS", "8192")))
CHAT_STREAM_NO_TOKEN_TIMEOUT_SEC = max(5, int(os.getenv("CHAT_STREAM_NO_TOKEN_TIMEOUT_SEC", "90")))
CHAT_STREAM_TOTAL_TIMEOUT_SEC = max(
    CHAT_STREAM_NO_TOKEN_TIMEOUT_SEC,
    int(os.getenv("CHAT_STREAM_TOTAL_TIMEOUT_SEC", "900")),
)
CHAT_STREAM_CONTINUATION_ENABLED = os.getenv(
    "CHAT_STREAM_CONTINUATION_ENABLED",
    "true",
).strip().lower() in {"1", "true", "yes", "on"}
CHAT_STREAM_CONTINUATION_MAX_ROUNDS = max(
    0,
    int(os.getenv("CHAT_STREAM_CONTINUATION_MAX_ROUNDS", "2")),
)
CHAT_STREAM_CONTINUATION_MIN_NEW_CHARS = max(
    1,
    int(os.getenv("CHAT_STREAM_CONTINUATION_MIN_NEW_CHARS", "24")),
)
CHAT_STREAM_CONTINUATION_TAIL_CHARS = max(
    80,
    int(os.getenv("CHAT_STREAM_CONTINUATION_TAIL_CHARS", "900")),
)
CHAT_STREAM_COMPLETION_MODE_DEFAULT = os.getenv(
    "CHAT_STREAM_COMPLETION_MODE_DEFAULT",
    "auto",
).strip().lower()
if CHAT_STREAM_COMPLETION_MODE_DEFAULT not in {"auto", "marker", "none"}:
    CHAT_STREAM_COMPLETION_MODE_DEFAULT = "auto"

ALLOWED_UPLOAD_EXTENSIONS: Set[str] = {".csv", ".xlsx", ".xls", ".pdf"}
ALLOWED_UPLOAD_MIME_TYPES: Set[str] = {
    "text/csv",
    "application/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/pdf",
    "application/octet-stream",
}
ALLOWED_COURSE_MATERIAL_EXTENSIONS: Set[str] = {".pdf", ".docx", ".txt"}
ALLOWED_COURSE_MATERIAL_MIME_TYPES: Set[str] = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "application/octet-stream",
}

VALID_ROLES: Set[str] = {"student", "teacher", "admin"}
ALL_APP_ROLES: Set[str] = {"student", "teacher", "admin"}
TEACHER_OR_ADMIN: Set[str] = {"teacher", "admin"}
ADMIN_ONLY: Set[str] = {"admin"}

PUBLIC_PATHS: Set[str] = {
    "/",
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
}
PUBLIC_API_PATHS: Set[str] = {
    "/api/quiz/topics",
}

ROLE_POLICIES: Dict[str, Set[str]] = {
    "/api/chat": ALL_APP_ROLES,
    "/api/chat/stream": ALL_APP_ROLES,
    "/api/verify-solution": ALL_APP_ROLES,
    "/api/predict-risk": TEACHER_OR_ADMIN,
    "/api/predict-risk/batch": TEACHER_OR_ADMIN,
    "/api/learning-path": ALL_APP_ROLES,
    "/api/analytics/daily-insight": TEACHER_OR_ADMIN,
    "/api/upload/class-records": TEACHER_OR_ADMIN,
    "/api/upload/class-records/risk-refresh/recent": TEACHER_OR_ADMIN,
    "/api/upload/course-materials": TEACHER_OR_ADMIN,
    "/api/upload/course-materials/recent": TEACHER_OR_ADMIN,
    "/api/course-materials/topics": TEACHER_OR_ADMIN,
    "/api/quiz/generate": TEACHER_OR_ADMIN,
    "/api/quiz/generate-async": TEACHER_OR_ADMIN,
    "/api/quiz/preview": TEACHER_OR_ADMIN,
    "/api/lesson/generate": TEACHER_OR_ADMIN,
    "/api/lesson/generate-async": TEACHER_OR_ADMIN,
    "/api/feedback/import-grounded": TEACHER_OR_ADMIN,
    "/api/feedback/import-grounded/summary": TEACHER_OR_ADMIN,
    "/api/import-grounded/access-audit": TEACHER_OR_ADMIN,
    "/api/quiz/student-competency": TEACHER_OR_ADMIN,
    "/api/calculator/evaluate": ALL_APP_ROLES,
    "/api/student/competency-analysis": TEACHER_OR_ADMIN,
    "/api/risk/train-model": ADMIN_ONLY,
    "/api/predict-risk/enhanced": TEACHER_OR_ADMIN,
    "/api/quiz/calibrate-difficulty": TEACHER_OR_ADMIN,
    "/api/quiz/adaptive-select": TEACHER_OR_ADMIN,
    "/api/learning/recommend-topics": TEACHER_OR_ADMIN,
    "/api/analytics/student-summary": ALL_APP_ROLES,
    "/api/analytics/class-insights": TEACHER_OR_ADMIN,
    "/api/analytics/refresh-cache": ADMIN_ONLY,
    "/api/ops/inference-metrics": ADMIN_ONLY,
    "/api/dev/generate-mock-data": ADMIN_ONLY,
    "/api/analytics/config": TEACHER_OR_ADMIN,
    "/api/analytics/imported-class-overview": TEACHER_OR_ADMIN,
    "/api/analytics/topic-mastery": TEACHER_OR_ADMIN,
    "/api/automation/diagnostic-completed": ADMIN_ONLY,
    "/api/automation/quiz-submitted": ADMIN_ONLY,
    "/api/automation/student-enrolled": ADMIN_ONLY,
    "/api/automation/data-imported": ADMIN_ONLY,
    "/api/automation/content-updated": ADMIN_ONLY,
}

if not HF_TOKEN:
    logger.warning(
        "HF_TOKEN is not set. AI features will fail. "
        "On HF Spaces this is injected automatically as a secret."
    )

# ─── FastAPI App ───────────────────────────────────────────────

app = FastAPI(
    title="MathPulse AI API",
    description="AI-powered math tutoring and student analytics backend",
    version="1.0.0",
)

logger.info("🚀 FastAPI app created, startup sequence beginning...")

@app.on_event("startup")
async def startup_event():
    """Called when the app starts up. Initialize Firebase and log readiness."""
    logger.info("⚙️  Initializing backend services...")
    _init_firebase_admin()
    
    # Pre-initialize inference client at startup to avoid first-request latency spike
    logger.info("🔧 Pre-initializing InferenceClient...")
    try:
        get_inference_client()
        logger.info("✅ InferenceClient pre-initialized at startup")
    except Exception as e:
        logger.warning(f"⚠️ Failed to pre-initialize InferenceClient: {e}")
    
    logger.info(f"✅ MathPulse AI backend ready at http://0.0.0.0:7860")
    logger.info(f"   - INFERENCE_PROVIDER: {os.getenv('INFERENCE_PROVIDER', 'hf_inference')}")
    logger.info(f"   - INFERENCE_MODEL_ID: {os.getenv('INFERENCE_MODEL_ID', HF_MATH_MODEL_ID)}")
    logger.info(f"   - INFERENCE_CHAT_MODEL_ID: {os.getenv('INFERENCE_CHAT_MODEL_ID', HF_MATH_MODEL_ID)}")
    logger.info(
        f"   - INFERENCE_CHAT_STRICT_MODEL_ONLY: "
        f"{os.getenv('INFERENCE_CHAT_STRICT_MODEL_ONLY', 'true')}"
    )
    logger.info(
        f"   - INFERENCE_CHAT_HARD_TRIGGER_ENABLED: "
        f"{os.getenv('INFERENCE_CHAT_HARD_TRIGGER_ENABLED', 'false')}"
    )
    logger.info(
        f"   - INFERENCE_ENFORCE_QWEN_ONLY: "
        f"{os.getenv('INFERENCE_ENFORCE_QWEN_ONLY', 'true')}"
    )
    logger.info(f"   - HF_TOKEN set: {'yes' if HF_TOKEN else 'no'}")


@app.on_event("shutdown")
async def shutdown_event() -> None:
    await _close_hf_async_http_client()


class AuthenticatedUser(BaseModel):
    uid: str
    email: Optional[str] = None
    role: str
    claims: Dict[str, Any] = Field(default_factory=dict)


_firebase_ready = False
_role_cache: Dict[str, Dict[str, Any]] = {}
_ROLE_CACHE_TTL_SECONDS = 60
_firestore_role_lookup_warning_emitted = False
_firestore_audit_lookup_warning_emitted = False
_firestore_topics_lookup_warning_emitted = False
_rate_limit_buckets: Dict[str, List[float]] = {}
_async_tasks: Dict[str, Dict[str, Any]] = {}
_async_tasks_lock = Lock()
FIRESTORE_SERVER_TIMESTAMP: Any = getattr(cast(Any, firebase_firestore), "SERVER_TIMESTAMP", None)
FIRESTORE_QUERY_DESCENDING: Any = getattr(getattr(cast(Any, firebase_firestore), "Query", None), "DESCENDING", "DESCENDING")


def _snapshot_to_dict(snapshot: Any) -> Dict[str, Any]:
    data = snapshot.to_dict() if hasattr(snapshot, "to_dict") else {}
    return data if isinstance(data, dict) else {}


def _snapshot_exists(snapshot: Any) -> bool:
    return bool(getattr(snapshot, "exists", False))


def _is_adc_missing_error(err: Exception) -> bool:
    message = str(err).lower()
    return (
        "default credentials were not found" in message
        or "application default credentials" in message
    )


def _init_firebase_admin() -> None:
    global _firebase_ready
    if _firebase_ready:
        return
    if not HAS_FIREBASE_ADMIN:
        logger.warning("firebase-admin is not available; protected API endpoints will reject requests.")
        return

    try:
        if not firebase_admin._apps:  # type: ignore[attr-defined]
            init_options: Dict[str, Any] = {}
            credentials_obj: Optional[Any] = None
            if FIREBASE_AUTH_PROJECT_ID:
                init_options["projectId"] = FIREBASE_AUTH_PROJECT_ID

            if FIREBASE_SERVICE_ACCOUNT_JSON:
                service_account_payload = json.loads(FIREBASE_SERVICE_ACCOUNT_JSON)
                credentials_obj = cast(Any, firebase_admin).credentials.Certificate(service_account_payload)
            elif FIREBASE_SERVICE_ACCOUNT_FILE:
                credentials_obj = cast(Any, firebase_admin).credentials.Certificate(FIREBASE_SERVICE_ACCOUNT_FILE)

            if credentials_obj and init_options:
                firebase_admin.initialize_app(credentials_obj, options=init_options)  # type: ignore[union-attr]
            elif credentials_obj:
                firebase_admin.initialize_app(credentials_obj)  # type: ignore[union-attr]
            elif init_options:
                firebase_admin.initialize_app(options=init_options)  # type: ignore[union-attr]
            else:
                firebase_admin.initialize_app()  # type: ignore[union-attr]
        _firebase_ready = True
        if FIREBASE_AUTH_PROJECT_ID:
            logger.info(f"Firebase Admin SDK initialized for API auth verification (projectId={FIREBASE_AUTH_PROJECT_ID})")
        else:
            logger.info("Firebase Admin SDK initialized for API auth verification")
    except Exception as e:
        logger.warning(
            "Firebase Admin SDK init failed: %s. Configure FIREBASE_SERVICE_ACCOUNT_JSON "
            "or FIREBASE_SERVICE_ACCOUNT_FILE, or set GOOGLE_APPLICATION_CREDENTIALS.",
            e,
        )


def _get_role_from_firestore(uid: str) -> Optional[str]:
    now = time.time()
    cached = _role_cache.get(uid)
    if cached and now - float(cached.get("ts", 0)) < _ROLE_CACHE_TTL_SECONDS:
        return cached.get("role")

    if not (_firebase_ready and firebase_firestore):
        return None

    try:
        doc = cast(Any, firebase_firestore.client().collection("users").document(uid).get())
        role = _snapshot_to_dict(doc).get("role") if _snapshot_exists(doc) else None
        if isinstance(role, str):
            _role_cache[uid] = {"role": role, "ts": now}
            return role
    except Exception as e:
        _warn_firestore_role_lookup_once(f"Failed to resolve role from Firestore for {uid}: {e}")

    return None


def _warn_firestore_role_lookup_once(message: str) -> None:
    global _firestore_role_lookup_warning_emitted
    if _firestore_role_lookup_warning_emitted:
        return
    logger.warning(message)
    _firestore_role_lookup_warning_emitted = True


def _warn_firestore_audit_lookup_once(message: str) -> None:
    global _firestore_audit_lookup_warning_emitted
    if _firestore_audit_lookup_warning_emitted:
        return
    logger.warning(message)
    _firestore_audit_lookup_warning_emitted = True


def _warn_firestore_topics_lookup_once(message: str) -> None:
    global _firestore_topics_lookup_warning_emitted
    if _firestore_topics_lookup_warning_emitted:
        return
    logger.warning(message)
    _firestore_topics_lookup_warning_emitted = True


def _extract_role_from_firestore_rest_payload(payload: Dict[str, Any]) -> Optional[str]:
    fields = payload.get("fields")
    if not isinstance(fields, dict):
        return None
    role_field = fields.get("role")
    if not isinstance(role_field, dict):
        return None

    # Firestore REST encodes field values by type, e.g. {"stringValue": "teacher"}.
    role_value = role_field.get("stringValue")
    if isinstance(role_value, str):
        normalized = role_value.strip().lower()
        if normalized in VALID_ROLES:
            return normalized
    return None


def _get_role_from_firestore_rest(uid: str, firebase_id_token: str, project_id: str) -> Optional[str]:
    if not uid or not firebase_id_token or not project_id:
        return None

    role_doc_url = (
        "https://firestore.googleapis.com/v1/"
        f"projects/{project_id}/databases/(default)/documents/users/{uid}"
        "?mask.fieldPaths=role"
    )

    try:
        response = http_requests.get(
            role_doc_url,
            headers={"Authorization": f"Bearer {firebase_id_token}"},
            timeout=5,
        )
        if response.status_code == 200:
            payload = cast(Dict[str, Any], response.json())
            return _extract_role_from_firestore_rest_payload(payload)
        if response.status_code not in {401, 403, 404}:
            logger.info(
                "Firestore REST role lookup returned non-success status %s for uid=%s",
                response.status_code,
                uid,
            )
    except Exception as rest_error:
        logger.info(f"Firestore REST role lookup failed for {uid}: {rest_error}")

    return None


def _resolve_user_role(decoded: Dict[str, Any], firebase_id_token: Optional[str] = None) -> str:
    role_claim = decoded.get("role")
    if isinstance(role_claim, str) and role_claim in VALID_ROLES:
        return role_claim

    uid = _extract_uid_from_claims(decoded)
    if uid:
        firestore_role = _get_role_from_firestore(uid)
        if isinstance(firestore_role, str) and firestore_role in VALID_ROLES:
            return firestore_role

        if firebase_id_token:
            token_project_id = str(decoded.get("aud", "")).strip()
            project_id = FIREBASE_AUTH_PROJECT_ID or token_project_id
            firestore_rest_role = _get_role_from_firestore_rest(uid, firebase_id_token, project_id)
            if isinstance(firestore_rest_role, str) and firestore_rest_role in VALID_ROLES:
                _role_cache[uid] = {"role": firestore_rest_role, "ts": time.time()}
                return firestore_rest_role

    return "student"


def _extract_uid_from_claims(decoded: Dict[str, Any]) -> str:
    """Normalize Firebase token user identifier across verifier implementations."""
    for key in ("uid", "user_id", "sub"):
        value = decoded.get(key)
        if isinstance(value, str):
            normalized = value.strip()
            if normalized:
                return normalized
    return ""


def _parse_bearer_token(authorization: str) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.strip().split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    return parts[1].strip()


def _verify_token_with_fallback(token: str) -> Dict[str, Any]:
    """Verify Firebase ID token via firebase-admin, then google-auth as fallback."""
    last_error: Optional[Exception] = None

    try:
        return cast(Dict[str, Any], firebase_auth.verify_id_token(token))  # type: ignore[union-attr]
    except Exception as err:
        last_error = err

    if not ENABLE_FALLBACK_FIREBASE_TOKEN_VERIFY:
        raise cast(Exception, last_error)
    if not HAS_GOOGLE_AUTH:
        raise cast(Exception, last_error)

    try:
        request_adapter = google_auth_requests.Request()  # type: ignore[union-attr]
        decoded_raw = google_id_token.verify_firebase_token(token, request_adapter)  # type: ignore[union-attr]
        decoded = cast(Dict[str, Any], decoded_raw or {})
        if not decoded:
            raise ValueError("Fallback Firebase token verification returned empty claims")

        audience = str(decoded.get("aud", ""))
        issuer = str(decoded.get("iss", ""))
        if audience and issuer != f"https://securetoken.google.com/{audience}":
            raise ValueError("Fallback Firebase token verification issuer mismatch")

        if FIREBASE_AUTH_PROJECT_ALLOWLIST and audience not in FIREBASE_AUTH_PROJECT_ALLOWLIST:
            raise ValueError("Firebase token project is not in FIREBASE_AUTH_PROJECT_ALLOWLIST")

        logger.info("Firebase token verified via google-auth fallback")
        return decoded
    except Exception as fallback_err:
        logger.warning(f"Fallback Firebase token verification failed: {fallback_err}")
        raise cast(Exception, last_error)


def get_current_user(request: Request) -> AuthenticatedUser:
    user = getattr(request.state, "user", None)
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


def require_student_self_or_staff(request: Request, student_id: str) -> AuthenticatedUser:
    user = get_current_user(request)
    if user.role in {"teacher", "admin"}:
        return user
    if user.role == "student" and user.uid == student_id:
        return user
    raise HTTPException(status_code=403, detail="Insufficient permissions for requested student")


def enforce_rate_limit(request: Request, bucket_name: str, limit: int, window_seconds: int) -> None:
    user = getattr(request.state, "user", None)
    actor_id = user.uid if user else ((request.client.host if request.client else "unknown"))
    key = f"{bucket_name}:{actor_id}"
    now = time.time()
    start = now - window_seconds
    hits = [ts for ts in _rate_limit_buckets.get(key, []) if ts >= start]
    if len(hits) >= limit:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded for {bucket_name}. Try again later.",
        )
    hits.append(now)
    _rate_limit_buckets[key] = hits


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _prune_async_tasks(now_ts: Optional[float] = None) -> None:
    now_value = now_ts if now_ts is not None else time.time()
    expiry_cutoff = now_value - ASYNC_TASK_TTL_SECONDS
    expired_task_ids: List[str] = []

    for task_id, task in list(_async_tasks.items()):
        created_iso = str(task.get("createdAt") or "").strip()
        if not created_iso:
            continue
        try:
            created_dt = datetime.fromisoformat(created_iso.replace("Z", "+00:00"))
            if created_dt.timestamp() < expiry_cutoff:
                expired_task_ids.append(task_id)
        except ValueError:
            continue

    for task_id in expired_task_ids:
        _async_tasks.pop(task_id, None)

    if len(_async_tasks) <= ASYNC_TASK_MAX_ITEMS:
        return

    overflow = len(_async_tasks) - ASYNC_TASK_MAX_ITEMS
    sorted_items = sorted(_async_tasks.items(), key=lambda kv: str(kv[1].get("createdAt") or ""))
    for task_id, _ in sorted_items[:overflow]:
        _async_tasks.pop(task_id, None)


def _create_async_task(owner_uid: str, task_kind: str, payload: Dict[str, Any]) -> str:
    task_id = f"task_{uuid.uuid4().hex[:12]}"
    with _async_tasks_lock:
        _prune_async_tasks()
        _async_tasks[task_id] = {
            "taskId": task_id,
            "taskKind": task_kind,
            "ownerUid": owner_uid,
            "status": "queued",
            "createdAt": _utc_now_iso(),
            "startedAt": None,
            "completedAt": None,
            "progressPercent": 5.0,
            "progressStage": "queued",
            "progressMessage": "Task queued for background generation.",
            "cancelRequested": False,
            "request": payload,
            "result": None,
            "error": None,
        }
    return task_id


def _update_async_task(task_id: str, **updates: Any) -> None:
    with _async_tasks_lock:
        task = _async_tasks.get(task_id)
        if not task:
            return
        task.update(updates)


async def _run_async_task(task_id: str, runner) -> None:
    with _async_tasks_lock:
        task = _async_tasks.get(task_id)
        if not task:
            return
        if bool(task.get("cancelRequested")):
            task["status"] = "cancelled"
            task["completedAt"] = _utc_now_iso()
            task["progressPercent"] = 100.0
            task["progressStage"] = "cancelled"
            task["progressMessage"] = "Task was cancelled before execution."
            task["error"] = {"message": "Task cancelled before execution."}
            return
        task["status"] = "running"
        task["startedAt"] = _utc_now_iso()
        task["progressPercent"] = 15.0
        task["progressStage"] = "running"
        task["progressMessage"] = "Background generation started."
        task["error"] = None

    try:
        payload = await runner()
        with _async_tasks_lock:
            task = _async_tasks.get(task_id)
            if not task:
                return
            if bool(task.get("cancelRequested")):
                task["status"] = "cancelled"
                task["completedAt"] = _utc_now_iso()
                task["progressPercent"] = 100.0
                task["progressStage"] = "cancelled"
                task["progressMessage"] = "Task was cancelled during execution."
                task["error"] = {"message": "Task cancelled during execution."}
                task["result"] = None
                return
            task["status"] = "completed"
            task["completedAt"] = _utc_now_iso()
            task["progressPercent"] = 100.0
            task["progressStage"] = "completed"
            task["progressMessage"] = "Generation completed successfully."
            task["result"] = jsonable_encoder(payload)
            task["error"] = None
    except HTTPException as http_exc:
        with _async_tasks_lock:
            task = _async_tasks.get(task_id)
            if not task:
                return
            if bool(task.get("cancelRequested")):
                task["status"] = "cancelled"
                task["completedAt"] = _utc_now_iso()
                task["progressPercent"] = 100.0
                task["progressStage"] = "cancelled"
                task["progressMessage"] = "Task was cancelled during execution."
                task["error"] = {"message": "Task cancelled during execution."}
                task["result"] = None
                return
            task["status"] = "failed"
            task["completedAt"] = _utc_now_iso()
            task["progressPercent"] = 100.0
            task["progressStage"] = "failed"
            task["progressMessage"] = "Generation failed while processing the request."
            task["error"] = jsonable_encoder(http_exc.detail)
    except Exception as exc:
        logger.error(f"Async task {task_id} failed: {exc}")
        with _async_tasks_lock:
            task = _async_tasks.get(task_id)
            if not task:
                return
            if bool(task.get("cancelRequested")):
                task["status"] = "cancelled"
                task["completedAt"] = _utc_now_iso()
                task["progressPercent"] = 100.0
                task["progressStage"] = "cancelled"
                task["progressMessage"] = "Task was cancelled during execution."
                task["error"] = {"message": "Task cancelled during execution."}
                task["result"] = None
                return
            task["status"] = "failed"
            task["completedAt"] = _utc_now_iso()
            task["progressPercent"] = 100.0
            task["progressStage"] = "failed"
            task["progressMessage"] = "Generation failed due to an unexpected error."
            task["error"] = {"message": str(exc)}


def _start_async_task_in_thread(task_id: str, runner) -> None:
    """Run long async generation tasks off the main event loop."""
    asyncio.create_task(asyncio.to_thread(lambda: asyncio.run(_run_async_task(task_id, runner))))


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path
        request.state.user = None

        if request.method == "OPTIONS" or path in PUBLIC_PATHS:
            return await call_next(request)

        if path in PUBLIC_API_PATHS:
            return await call_next(request)

        if not path.startswith("/api/"):
            return await call_next(request)

        if path == "/api/dev/generate-mock-data" and not ENABLE_DEV_ENDPOINTS:
            return JSONResponse(status_code=404, content={"detail": "Not found"})

        _init_firebase_admin()
        if not _firebase_ready:
            return JSONResponse(
                status_code=503,
                content={"detail": "Authentication service unavailable"},
            )

        token = _parse_bearer_token(request.headers.get("Authorization", ""))
        if not token:
            return JSONResponse(
                status_code=401,
                content={"detail": "Missing or invalid Authorization bearer token"},
            )

        try:
            decoded = _verify_token_with_fallback(token)
        except Exception as e:
            logger.warning(f"Token verification failed for {path}: {e}")
            return JSONResponse(status_code=401, content={"detail": "Invalid or expired auth token"})

        uid = _extract_uid_from_claims(decoded)
        if not uid:
            return JSONResponse(status_code=401, content={"detail": "Token missing uid"})

        role = _resolve_user_role(decoded, token)
        request.state.user = AuthenticatedUser(
            uid=uid,
            email=decoded.get("email"),
            role=role,
            claims=decoded,
        )

        required_roles = ROLE_POLICIES.get(path)
        if required_roles and role not in required_roles:
            return JSONResponse(status_code=403, content={"detail": "Forbidden for this role"})

        return await call_next(request)


# ─── Middleware: Request ID + Logging + Timeout ────────────────

REQUEST_TIMEOUT_SECONDS = 120  # 2 minutes for AI-heavy endpoints


class RequestMiddleware(BaseHTTPMiddleware):
    """Adds request-ID header, logs requests, and enforces timeouts."""

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = str(uuid.uuid4())[:8]
        start = time.time()

        # Attach request_id for downstream logging
        request.state.request_id = request_id
        logger.info(f"[{request_id}] {request.method} {request.url.path}")

        try:
            response = await asyncio.wait_for(
                call_next(request),
                timeout=REQUEST_TIMEOUT_SECONDS,
            )
            duration = round(time.time() - start, 3)
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Response-Time"] = f"{duration}s"
            logger.info(f"[{request_id}] {response.status_code} in {duration}s")
            return response
        except asyncio.TimeoutError:
            duration = round(time.time() - start, 3)
            logger.error(f"[{request_id}] TIMEOUT after {duration}s on {request.url.path}")
            return JSONResponse(
                status_code=504,
                content={
                    "detail": f"Request timed out after {REQUEST_TIMEOUT_SECONDS}s",
                    "requestId": request_id,
                },
                headers={"X-Request-ID": request_id},
            )
        except Exception as exc:
            duration = round(time.time() - start, 3)
            logger.error(f"[{request_id}] Unhandled error after {duration}s: {exc}")
            return JSONResponse(
                status_code=500,
                content={
                    "detail": "Internal server error",
                    "requestId": request_id,
                },
                headers={"X-Request-ID": request_id},
            )


app.add_middleware(RequestMiddleware)
app.add_middleware(AuthMiddleware)


# ─── Global Exception Handler ─────────────────────────────────

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    request_id = getattr(request.state, "request_id", "unknown")
    logger.error(f"[{request_id}] HTTPException {exc.status_code}: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "status": exc.status_code,
            "requestId": request_id,
        },
        headers={"X-Request-ID": request_id},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", "unknown")
    logger.error(f"[{request_id}] Unhandled: {type(exc).__name__}: {exc}\n{traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An unexpected error occurred. Please try again.",
            "error": type(exc).__name__,
            "requestId": request_id,
        },
        headers={"X-Request-ID": request_id},
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Hugging Face Clients ─────────────────────────────────────

# InferenceClient is kept only for zero-shot classification (BART).
from huggingface_hub import InferenceClient

_zsc_client: Optional[InferenceClient] = None


def get_client() -> InferenceClient:
    """Get or initialize the HuggingFace InferenceClient (used for zero-shot classification only)."""
    global _zsc_client
    if _zsc_client is None:
        if not HF_TOKEN:
            raise HTTPException(
                status_code=500,
                detail="HF_TOKEN not configured. Set the HF_TOKEN environment variable.",
            )
        for attempt in range(3):
            try:
                _zsc_client = InferenceClient(
                    token=HF_TOKEN,
                    timeout=60,
                )
                logger.info("HF InferenceClient initialized (for zero-shot classification)")
                break
            except Exception as e:
                logger.warning(f"HF client init attempt {attempt + 1} failed: {e}")
                if attempt == 2:
                    raise HTTPException(
                        status_code=503,
                        detail="Failed to initialize AI model client after 3 attempts.",
                    )
                time.sleep(2 ** attempt)
    assert _zsc_client is not None
    return _zsc_client


# ─── HF Serverless Chat Helper (requests-based) ───────────────


def _strip_repetition(text: str, min_chunk: int = 40) -> str:
    """Remove repeated blocks from model output (a common issue with smaller LLMs)."""
    lines = text.split("\n")
    seen_blocks: list[str] = []
    result_lines: list[str] = []
    i = 0
    while i < len(lines):
        # Try to match a block of 2-4 lines that repeats
        matched = False
        for blen in (4, 3, 2):
            if i + blen > len(lines):
                continue
            block = "\n".join(lines[i : i + blen]).strip()
            if len(block) < min_chunk:
                continue
            if block in seen_blocks:
                # Skip this repeated block
                i += blen
                matched = True
                break
            seen_blocks.append(block)
        if not matched:
            result_lines.append(lines[i])
            i += 1
    return "\n".join(result_lines).strip()


def _build_hf_inference_url(model_id: str) -> str:
    return f"https://router.huggingface.co/hf-inference/models/{model_id}"


def _messages_to_inference_prompt(messages: List[Dict[str, str]]) -> str:
    parts: List[str] = []
    for msg in messages:
        role = (msg.get("role") or "user").strip().lower()
        content = (msg.get("content") or "").strip()
        if not content:
            continue
        if role in {"tool", "function"}:
            continue
        if role == "system":
            parts.append(f"SYSTEM:\n{content}")
        elif role == "assistant":
            parts.append(f"ASSISTANT:\n{content}")
        else:
            parts.append(f"USER:\n{content}")

    parts.append("ASSISTANT:")
    return "\n\n".join(parts)


def call_hf_chat(
    messages: List[Dict[str, str]],
    *,
    max_tokens: int = 2048,
    temperature: float = 0.2,
    top_p: float = 0.9,
    repetition_penalty: float = 1.15,
    model: Optional[str] = None,
    task_type: str = "default",
    timeout: Optional[int] = None,
) -> str:
    req = InferenceRequest(
        messages=messages,
        model=model,
        task_type=task_type,
        max_new_tokens=max_tokens,
        temperature=temperature,
        top_p=top_p,
        repetition_penalty=repetition_penalty,
        timeout_sec=timeout,
    )
    text = get_inference_client().generate_from_messages(req)
    return _strip_repetition(text)


def call_hf_chat_stream(
    messages: List[Dict[str, str]],
    *,
    max_tokens: int = 512,
    temperature: float = 0.3,
    top_p: float = 0.85,
    model: Optional[str] = None,
    task_type: str = "chat",
    timeout: Optional[int] = None,
) -> Iterator[str]:
    """Stream chat deltas from HF router as text chunks."""
    client = get_inference_client()
    effective_task = (task_type or "chat").strip().lower()
    request_tag = f"{effective_task}-stream-{int(time.time() * 1000)}"
    chat_model_override = getattr(cast(Any, client), "chat_model_override", "")

    selection_req = InferenceRequest(
        messages=messages,
        model=model,
        task_type=task_type,
        max_new_tokens=max_tokens,
        temperature=temperature,
        top_p=top_p,
        timeout_sec=timeout,
    )
    selected_model, _ = client._resolve_primary_model(selection_req)

    model_chain = client._model_chain_for_task(effective_task, selected_model)
    provider_chain = client._provider_chain_for_task(effective_task)
    timeout_sec = timeout or client.interactive_timeout_sec
    last_error: Optional[Exception] = None

    for fallback_depth, model_name in enumerate(model_chain):
        for provider in provider_chain:
            if provider == "local_space":
                last_error = RuntimeError("Streaming is not supported for local_space provider")
                continue

            route = client._resolve_route_label(provider, effective_task)
            stream_model = model_name if ":" in model_name else f"{model_name}:fastest"
            headers = {
                "Authorization": f"Bearer {client.hf_token}",
                "Content-Type": "application/json",
                "X-MathPulse-Task": effective_task,
            }
            if route == "pro-priority" and client.pro_route_header_name.strip():
                headers[client.pro_route_header_name.strip()] = client.pro_route_header_value

            payload: Dict[str, object] = {
                "model": stream_model,
                "messages": messages,
                "stream": True,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "top_p": top_p,
            }

            start = time.perf_counter()
            try:
                with http_requests.post(
                    client.hf_chat_url,
                    headers=headers,
                    json=payload,
                    timeout=timeout_sec,
                    stream=True,
                ) as response:
                    if response.status_code != 200:
                        raise RuntimeError(f"HF stream error {response.status_code}: {response.text}")

                    emitted_any = False
                    for raw_line in response.iter_lines(decode_unicode=True):
                        if not raw_line:
                            continue
                        line = raw_line.strip()
                        if not line.startswith("data:"):
                            continue

                        data_raw = line.split("data:", 1)[1].strip()
                        if data_raw == "[DONE]":
                            if emitted_any:
                                latency_ms = (time.perf_counter() - start) * 1000
                                logger.info(
                                    "✅ HF stream success: task=%s model=%s latency=%sms",
                                    effective_task,
                                    model_name,
                                    round(latency_ms, 0),
                                )
                                return
                            continue

                        try:
                            payload_obj = json.loads(data_raw)
                        except json.JSONDecodeError:
                            continue

                        choices = payload_obj.get("choices") or []
                        if not choices:
                            continue
                        first = choices[0] if isinstance(choices[0], dict) else {}
                        delta = first.get("delta") or {}
                        chunk = delta.get("content")
                        if not chunk:
                            msg = first.get("message") or {}
                            chunk = msg.get("content")
                        if not chunk:
                            continue

                        emitted_any = True
                        yield str(chunk)

                    if emitted_any:
                        return
                    raise RuntimeError("HF stream ended without content")

            except Exception as exc:
                last_error = exc
                logger.warning(
                    "⚠️ Stream attempt failed: task=%s provider=%s model=%s depth=%s error=%s",
                    effective_task,
                    provider,
                    model_name,
                    fallback_depth,
                    str(exc)[:180],
                )

    raise last_error or RuntimeError("Streaming failed with empty model/provider chain")


HF_BLOCKING_CALL_CONCURRENCY = max(1, int(os.getenv("HF_BLOCKING_CALL_CONCURRENCY", "16")))
_hf_call_semaphore: Optional[asyncio.Semaphore] = None
_hf_call_semaphore_loop: Optional[asyncio.AbstractEventLoop] = None
HF_ASYNC_MAX_CONNECTIONS = max(4, int(os.getenv("HF_ASYNC_MAX_CONNECTIONS", "64")))
HF_ASYNC_MAX_KEEPALIVE_CONNECTIONS = max(
    2,
    int(os.getenv("HF_ASYNC_MAX_KEEPALIVE_CONNECTIONS", "32")),
)
HF_ASYNC_CONNECT_TIMEOUT_SEC = float(os.getenv("HF_ASYNC_CONNECT_TIMEOUT_SEC", "10.0"))
HF_ASYNC_WRITE_TIMEOUT_SEC = float(os.getenv("HF_ASYNC_WRITE_TIMEOUT_SEC", "30.0"))
HF_ASYNC_POOL_TIMEOUT_SEC = float(os.getenv("HF_ASYNC_POOL_TIMEOUT_SEC", "10.0"))
_hf_async_http_client: Optional[httpx.AsyncClient] = None
_hf_async_http_client_lock: Optional[asyncio.Lock] = None
_hf_async_http_client_loop: Optional[asyncio.AbstractEventLoop] = None


def _get_hf_async_http_client_lock() -> asyncio.Lock:
    global _hf_async_http_client, _hf_async_http_client_lock, _hf_async_http_client_loop
    loop = asyncio.get_running_loop()
    if _hf_async_http_client_lock is None or _hf_async_http_client_loop is not loop:
        # Test environments can spin up multiple event loops; reset pooled client per loop.
        _hf_async_http_client = None
        _hf_async_http_client_lock = asyncio.Lock()
        _hf_async_http_client_loop = loop
    return _hf_async_http_client_lock


async def _get_hf_async_http_client() -> httpx.AsyncClient:
    global _hf_async_http_client
    lock = _get_hf_async_http_client_lock()
    async with lock:
        if _hf_async_http_client is None or _hf_async_http_client.is_closed:
            limits = httpx.Limits(
                max_connections=HF_ASYNC_MAX_CONNECTIONS,
                max_keepalive_connections=HF_ASYNC_MAX_KEEPALIVE_CONNECTIONS,
            )
            _hf_async_http_client = httpx.AsyncClient(http2=True, limits=limits)
    assert _hf_async_http_client is not None
    return _hf_async_http_client


async def _close_hf_async_http_client() -> None:
    global _hf_async_http_client
    lock = _get_hf_async_http_client_lock()
    async with lock:
        if _hf_async_http_client is not None:
            await _hf_async_http_client.aclose()
            _hf_async_http_client = None


def _get_hf_call_semaphore() -> asyncio.Semaphore:
    global _hf_call_semaphore, _hf_call_semaphore_loop
    loop = asyncio.get_running_loop()
    if _hf_call_semaphore is None or _hf_call_semaphore_loop is not loop:
        _hf_call_semaphore = asyncio.Semaphore(HF_BLOCKING_CALL_CONCURRENCY)
        _hf_call_semaphore_loop = loop
    return _hf_call_semaphore


async def _run_hf_blocking(func, /, *args, **kwargs):
    semaphore = _get_hf_call_semaphore()
    async with semaphore:
        return await asyncio.to_thread(func, *args, **kwargs)


def _hf_retry_sleep_seconds(backoff_sec: float, attempt: int) -> float:
    jitter_factor = random.uniform(0.9, 1.2)
    return backoff_sec * attempt * jitter_factor


def _resolve_async_hf_timeout(timeout_sec: int) -> httpx.Timeout:
    return httpx.Timeout(
        connect=HF_ASYNC_CONNECT_TIMEOUT_SEC,
        read=float(timeout_sec),
        write=HF_ASYNC_WRITE_TIMEOUT_SEC,
        pool=HF_ASYNC_POOL_TIMEOUT_SEC,
    )


async def call_hf_chat_async(
    messages: List[Dict[str, str]],
    *,
    max_tokens: int = 2048,
    temperature: float = 0.2,
    top_p: float = 0.9,
    repetition_penalty: float = 1.15,
    model: Optional[str] = None,
    task_type: str = "default",
    timeout: Optional[int] = None,
) -> str:
    if os.getenv("PYTEST_CURRENT_TEST"):
        return await _run_hf_blocking(
            call_hf_chat,
            messages,
            max_tokens=max_tokens,
            temperature=temperature,
            top_p=top_p,
            repetition_penalty=repetition_penalty,
            model=model,
            task_type=task_type,
            timeout=timeout,
        )

    client = get_inference_client()
    effective_task = (task_type or "default").strip().lower()
    request_tag = f"{effective_task}-async-{int(time.time() * 1000)}"

    selection_req = InferenceRequest(
        messages=messages,
        model=model,
        task_type=task_type,
        request_tag=request_tag,
        max_new_tokens=max_tokens,
        temperature=temperature,
        top_p=top_p,
        repetition_penalty=repetition_penalty,
        timeout_sec=timeout,
    )
    selected_model, _ = client._resolve_primary_model(selection_req)
    model_chain = client._model_chain_for_task(effective_task, selected_model)
    provider_chain = client._provider_chain_for_task(effective_task)
    last_error: Optional[Exception] = None
    retryable_status = {408, 429, 500, 502, 503, 504}

    for fallback_depth, model_name in enumerate(model_chain):
        request_for_model = InferenceRequest(
            messages=messages,
            model=model_name,
            task_type=task_type,
            request_tag=request_tag,
            max_new_tokens=max_tokens,
            temperature=temperature,
            top_p=top_p,
            repetition_penalty=repetition_penalty,
            timeout_sec=timeout,
        )
        for provider in provider_chain:
            route = client._resolve_route_label(provider, effective_task)
            if provider == "local_space":
                try:
                    text = await _run_hf_blocking(
                        client._generate_with_provider,
                        request_for_model,
                        provider,
                        fallback_depth,
                    )
                    return _strip_repetition(text)
                except Exception as exc:
                    last_error = exc
                    logger.warning(
                        "⚠️ Async local fallback failed: task=%s model=%s depth=%s error=%s",
                        effective_task,
                        model_name,
                        fallback_depth,
                        str(exc)[:180],
                    )
                    continue

            stream_model = model_name if ":" in model_name else f"{model_name}:fastest"
            timeout_sec = client._timeout_for(request_for_model, provider)
            max_retries, backoff_sec = client._retry_profile(effective_task)
            headers = {
                "Authorization": f"Bearer {client.hf_token}",
                "Content-Type": "application/json",
                "X-MathPulse-Task": effective_task,
            }
            if route == "pro-priority" and client.pro_route_header_name.strip():
                headers[client.pro_route_header_name.strip()] = client.pro_route_header_value

            payload: Dict[str, object] = {
                "model": stream_model,
                "messages": messages,
                "stream": False,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "top_p": top_p,
            }

            async_client = await _get_hf_async_http_client()
            for attempt in range(1, max_retries + 1):
                start = time.perf_counter()
                client._record_attempt(
                    task_type=effective_task,
                    provider=provider,
                    route=route,
                    fallback_depth=fallback_depth,
                )
                try:
                    response = await async_client.post(
                        client.hf_chat_url,
                        headers=headers,
                        json=payload,
                        timeout=_resolve_async_hf_timeout(timeout_sec),
                    )
                    latency_ms = (time.perf_counter() - start) * 1000
                    client._bump_bucket("status_code_counts", str(response.status_code), 1)

                    if response.status_code in retryable_status and attempt < max_retries:
                        log_model_call(
                            logger,
                            provider=provider,
                            model=model_name,
                            endpoint=client.hf_chat_url,
                            latency_ms=latency_ms,
                            input_tokens=None,
                            output_tokens=None,
                            status="error",
                            error_class="HTTPRetry",
                            error_message=f"status={response.status_code}",
                            task_type=effective_task,
                            request_tag=request_tag,
                            retry_attempt=attempt,
                            fallback_depth=fallback_depth,
                            route=route,
                        )
                        client._bump_metric("retries_total", 1)
                        await asyncio.sleep(_hf_retry_sleep_seconds(backoff_sec, attempt))
                        continue

                    if response.status_code != 200:
                        client._bump_metric("requests_error", 1)
                        raise RuntimeError(
                            f"HF inference error {response.status_code}: {response.text[:280]}"
                        )

                    data = response.json()
                    text = client._extract_text(data)
                    log_model_call(
                        logger,
                        provider=provider,
                        model=model_name,
                        endpoint=client.hf_chat_url,
                        latency_ms=latency_ms,
                        input_tokens=None,
                        output_tokens=None,
                        status="ok",
                        task_type=effective_task,
                        request_tag=request_tag,
                        retry_attempt=attempt,
                        fallback_depth=fallback_depth,
                        route=route,
                    )
                    client._bump_metric("requests_ok", 1)
                    return _strip_repetition(text)
                except Exception as exc:
                    latency_ms = (time.perf_counter() - start) * 1000
                    last_error = exc
                    if attempt < max_retries:
                        log_model_call(
                            logger,
                            provider=provider,
                            model=model_name,
                            endpoint=client.hf_chat_url,
                            latency_ms=latency_ms,
                            input_tokens=None,
                            output_tokens=None,
                            status="error",
                            error_class=exc.__class__.__name__,
                            error_message=str(exc),
                            task_type=effective_task,
                            request_tag=request_tag,
                            retry_attempt=attempt,
                            fallback_depth=fallback_depth,
                            route=route,
                        )
                        client._bump_metric("retries_total", 1)
                        await asyncio.sleep(_hf_retry_sleep_seconds(backoff_sec, attempt))
                        continue

                    client._bump_metric("requests_error", 1)
                    logger.warning(
                        "⚠️ Async HF attempt failed: task=%s provider=%s model=%s depth=%s error=%s",
                        effective_task,
                        provider,
                        model_name,
                        fallback_depth,
                        str(exc)[:180],
                    )

    raise last_error or RuntimeError("Inference failed with empty model/provider chain")


async def call_hf_chat_stream_async(
    messages: List[Dict[str, str]],
    *,
    max_tokens: int = 512,
    temperature: float = 0.3,
    top_p: float = 0.85,
    model: Optional[str] = None,
    task_type: str = "chat",
    timeout: Optional[int] = None,
) -> AsyncIterator[str]:
    if os.getenv("PYTEST_CURRENT_TEST"):
        stream_iter = call_hf_chat_stream(
            messages,
            max_tokens=max_tokens,
            temperature=temperature,
            top_p=top_p,
            model=model,
            task_type=task_type,
            timeout=timeout,
        )
        done = object()

        def _next_chunk():
            return next(stream_iter, done)

        while True:
            chunk = await _run_hf_blocking(_next_chunk)
            if chunk is done:
                return
            if chunk:
                yield str(chunk)

    client = get_inference_client()
    effective_task = (task_type or "chat").strip().lower()
    request_tag = f"{effective_task}-stream-async-{int(time.time() * 1000)}"

    selection_req = InferenceRequest(
        messages=messages,
        model=model,
        task_type=task_type,
        request_tag=request_tag,
        max_new_tokens=max_tokens,
        temperature=temperature,
        top_p=top_p,
        timeout_sec=timeout,
    )
    selected_model, _ = client._resolve_primary_model(selection_req)
    model_chain = client._model_chain_for_task(effective_task, selected_model)
    provider_chain = client._provider_chain_for_task(effective_task)
    last_error: Optional[Exception] = None
    retryable_status = {408, 429, 500, 502, 503, 504}

    for fallback_depth, model_name in enumerate(model_chain):
        request_for_model = InferenceRequest(
            messages=messages,
            model=model_name,
            task_type=task_type,
            request_tag=request_tag,
            max_new_tokens=max_tokens,
            temperature=temperature,
            top_p=top_p,
            timeout_sec=timeout,
        )
        for provider in provider_chain:
            if provider == "local_space":
                last_error = RuntimeError("Streaming is not supported for local_space provider")
                continue

            route = client._resolve_route_label(provider, effective_task)
            stream_model = model_name if ":" in model_name else f"{model_name}:fastest"
            timeout_sec = client._timeout_for(request_for_model, provider)
            max_retries, backoff_sec = client._retry_profile(effective_task)

            headers = {
                "Authorization": f"Bearer {client.hf_token}",
                "Content-Type": "application/json",
                "X-MathPulse-Task": effective_task,
            }
            if route == "pro-priority" and client.pro_route_header_name.strip():
                headers[client.pro_route_header_name.strip()] = client.pro_route_header_value

            payload: Dict[str, object] = {
                "model": stream_model,
                "messages": messages,
                "stream": True,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "top_p": top_p,
            }

            async_client = await _get_hf_async_http_client()
            for attempt in range(1, max_retries + 1):
                start = time.perf_counter()
                client._record_attempt(
                    task_type=effective_task,
                    provider=provider,
                    route=route,
                    fallback_depth=fallback_depth,
                )
                try:
                    async with async_client.stream(
                        "POST",
                        client.hf_chat_url,
                        headers=headers,
                        json=payload,
                        timeout=_resolve_async_hf_timeout(timeout_sec),
                    ) as response:
                        client._bump_bucket("status_code_counts", str(response.status_code), 1)

                        if response.status_code in retryable_status and attempt < max_retries:
                            body = await response.aread()
                            body_preview = body[:220].decode("utf-8", errors="replace")
                            latency_ms = (time.perf_counter() - start) * 1000
                            log_model_call(
                                logger,
                                provider=provider,
                                model=model_name,
                                endpoint=client.hf_chat_url,
                                latency_ms=latency_ms,
                                input_tokens=None,
                                output_tokens=None,
                                status="error",
                                error_class="HTTPRetry",
                                error_message=f"status={response.status_code} body={body_preview}",
                                task_type=effective_task,
                                request_tag=request_tag,
                                retry_attempt=attempt,
                                fallback_depth=fallback_depth,
                                route=route,
                            )
                            client._bump_metric("retries_total", 1)
                            await asyncio.sleep(_hf_retry_sleep_seconds(backoff_sec, attempt))
                            continue

                        if response.status_code != 200:
                            body = await response.aread()
                            body_preview = body[:280].decode("utf-8", errors="replace")
                            client._bump_metric("requests_error", 1)
                            raise RuntimeError(
                                f"HF stream error {response.status_code}: {body_preview}"
                            )

                        emitted_any = False
                        async for raw_line in response.aiter_lines():
                            if not raw_line:
                                continue
                            line = raw_line.strip()
                            if not line.startswith("data:"):
                                continue

                            data_raw = line.split("data:", 1)[1].strip()
                            if data_raw == "[DONE]":
                                continue

                            try:
                                payload_obj = json.loads(data_raw)
                            except json.JSONDecodeError:
                                continue

                            choices = payload_obj.get("choices") or []
                            if not choices:
                                continue
                            first = choices[0] if isinstance(choices[0], dict) else {}
                            delta = first.get("delta") or {}
                            chunk = delta.get("content")
                            if not chunk:
                                msg = first.get("message") or {}
                                chunk = msg.get("content")
                            if not chunk:
                                continue

                            emitted_any = True
                            yield str(chunk)

                        if emitted_any:
                            latency_ms = (time.perf_counter() - start) * 1000
                            log_model_call(
                                logger,
                                provider=provider,
                                model=model_name,
                                endpoint=client.hf_chat_url,
                                latency_ms=latency_ms,
                                input_tokens=None,
                                output_tokens=None,
                                status="ok",
                                task_type=effective_task,
                                request_tag=request_tag,
                                retry_attempt=attempt,
                                fallback_depth=fallback_depth,
                                route=route,
                            )
                            client._bump_metric("requests_ok", 1)
                            return

                        raise RuntimeError("HF stream ended without content")
                except Exception as exc:
                    latency_ms = (time.perf_counter() - start) * 1000
                    last_error = exc
                    if attempt < max_retries:
                        log_model_call(
                            logger,
                            provider=provider,
                            model=model_name,
                            endpoint=client.hf_chat_url,
                            latency_ms=latency_ms,
                            input_tokens=None,
                            output_tokens=None,
                            status="error",
                            error_class=exc.__class__.__name__,
                            error_message=str(exc),
                            task_type=effective_task,
                            request_tag=request_tag,
                            retry_attempt=attempt,
                            fallback_depth=fallback_depth,
                            route=route,
                        )
                        client._bump_metric("retries_total", 1)
                        await asyncio.sleep(_hf_retry_sleep_seconds(backoff_sec, attempt))
                        continue

                    client._bump_metric("requests_error", 1)
                    logger.warning(
                        "⚠️ Async stream attempt failed: task=%s provider=%s model=%s depth=%s error=%s",
                        effective_task,
                        provider,
                        model_name,
                        fallback_depth,
                        str(exc)[:180],
                    )

    raise last_error or RuntimeError("Streaming failed with empty model/provider chain")


def load_local_math_model(model_name: str = "Qwen/Qwen2.5-Math-7B-Instruct"):
    """Optional local loader for environments using Transformers instead of HF Inference API."""
    from transformers import AutoModelForCausalLM, AutoTokenizer  # type: ignore[import-not-found]

    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        torch_dtype="auto",
        device_map="auto",
    )
    return tokenizer, model


# ─── Math Tutor Prompt & Wrapper ──────────────────────────────

_GREETING_PATTERN = re.compile(r"^\s*(?:hi|hello|hey|good\s+(?:morning|afternoon|evening))\b")
_THANKS_PATTERN = re.compile(r"\b(?:thanks|thank\s+you|thank\s+u|ty)\b")

_GREETING_RESPONSES: Tuple[str, ...] = (
    "Hi! I am MathPulse, your math tutor. I can help with algebra, geometry, calculus, and more. What math question would you like to try?",
    "Hello! Great to see you. I am here for math topics and step-by-step solutions whenever you are ready.",
)

_THANKS_RESPONSES: Tuple[str, ...] = (
    "You are very welcome. If you want, send another math question and we can work through it together.",
    "Glad I could help. I am here anytime you want to practice more math.",
)

_NON_MATH_REDIRECT_RESPONSES: Tuple[str, ...] = (
    "That topic is outside my math scope, but I would be happy to help with mathematics like algebra, calculus, geometry, trigonometry, or statistics.",
    "I focus on math-only support, so I may not be the best for that request. Share a math question and I will guide you step by step.",
    "I am built for math tutoring, so I can best help with mathematical problems and explanations. If you want, ask me any math question next.",
)

_MATH_SCOPE_KEYWORDS: Set[str] = {
    "math",
    "mathematics",
    "algebra",
    "geometry",
    "trigonometry",
    "calculus",
    "statistics",
    "probability",
    "arithmetic",
    "equation",
    "inequality",
    "function",
    "graph",
    "slope",
    "derivative",
    "integral",
    "limit",
    "matrix",
    "determinant",
    "fraction",
    "percentage",
    "ratio",
    "polynomial",
    "quadratic",
    "logarithm",
    "exponent",
    "angle",
    "triangle",
    "circle",
    "perimeter",
    "area",
    "volume",
    "mean",
    "median",
    "mode",
    "standard deviation",
    "solve",
    "simplify",
    "factor",
    "evaluate",
    "compute",
    "calculate",
}

_MATH_SCOPE_PATTERNS: Tuple[re.Pattern[str], ...] = (
    re.compile(r"\d+\s*[%+\-*/^=]\s*[-+]?\d*"),
    re.compile(r"\b(?:sin|cos|tan|cot|sec|csc|log|ln|sqrt)\s*\(?"),
    re.compile(r"\b(?:differentiate|integrate|derive|proof|prove)\b"),
    re.compile(r"\b(?:x|y|z)\s*[=+\-*/^]\s*[-+]?\d"),
)


def is_math_related_query(message: str) -> bool:
    normalized = (message or "").strip().lower()
    if not normalized:
        return False

    if any(keyword in normalized for keyword in _MATH_SCOPE_KEYWORDS):
        return True

    return any(pattern.search(normalized) for pattern in _MATH_SCOPE_PATTERNS)


def get_scope_boundary_response(message: str) -> Optional[str]:
    normalized = (message or "").strip().lower()
    if not normalized:
        return random.choice(_NON_MATH_REDIRECT_RESPONSES)

    if is_math_related_query(normalized):
        return None

    if _GREETING_PATTERN.search(normalized):
        return random.choice(_GREETING_RESPONSES)

    if _THANKS_PATTERN.search(normalized):
        return random.choice(_THANKS_RESPONSES)

    return random.choice(_NON_MATH_REDIRECT_RESPONSES)


def build_math_tutor_prompt(question: str) -> str:
    """Build a structured math-tutor prompt for the LLM."""
    return f"""SYSTEM:
You are MathPulse Tutor, a precise and patient math tutor for Filipino senior high school STEM students.
Your job is to:
1) Understand the student's math question (algebra, functions, graphs, trigonometry, analytic geometry, basic calculus, statistics, or word problems).
2) Solve the problem step by step, explaining each transformation in simple language.
3) Show all important equations clearly and avoid skipping algebra steps unless obvious to a Grade 11–12 STEM student.
4) At the end, restate the final answer explicitly (e.g., "Final answer: x = 3").
5) If the question is ambiguous or missing information, ask a short clarifying question first instead of guessing.
6) If the student makes a mistake, point it out gently, explain why it is wrong, and show the correct method.
7) Never invent new notation or definitions; use standard high-school math notation only.
8) When there are multiple possible methods, briefly mention alternatives but pick one main method and follow it consistently.
9) If the computation is long, summarize intermediate results so the student does not get lost.
10) If the answer depends on approximations, specify whether the result is exact or rounded (and to how many decimal places).
Speak in clear, concise English. Use short paragraphs and LaTeX-style math when helpful (e.g., x^2 + 3x + 2 = 0).
If the user question is not about math, politely and briefly redirect them to ask a math question.
If the user sends a greeting or thanks, reply warmly, then invite a math question.

USER:
Student question:
{question}
"""


def call_math_tutor_llm(question: str) -> str:
    """Convenience wrapper: call the HF serverless model with the MathPulse tutor prompt via chat completions."""
    prompt = build_math_tutor_prompt(question)
    messages = [{"role": "user", "content": prompt}]
    return call_hf_chat(messages, max_tokens=CHAT_MAX_NEW_TOKENS, temperature=0.2, top_p=0.9, task_type="chat")


# ─── Request/Response Models ──────────────────────────────────


class ChatMessage(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = Field(default_factory=list)
    userId: Optional[str] = None
    verify: bool = Field(default=False, description="Enable self-consistency verification for math answers")
    expectedEndMarker: Optional[str] = Field(
        default=None,
        description="Optional marker that should appear in the completed answer (for continuation checks).",
    )
    completionMode: str = Field(
        default="auto",
        description="Completion check mode: auto, marker, or none.",
    )
    continuationMaxRounds: Optional[int] = Field(
        default=None,
        ge=0,
        le=8,
        description="Optional override for max backend continuation rounds.",
    )

    @field_validator("completionMode")
    @classmethod
    def validate_completion_mode(cls, value: str) -> str:
        normalized = (value or "").strip().lower()
        if normalized in {"auto", "marker", "none"}:
            return normalized
        return "auto"


class ChatResponse(BaseModel):
    response: str
    verified: Optional[bool] = None
    confidence: Optional[str] = None
    warning: Optional[str] = None


class StudentRiskData(BaseModel):
    engagementScore: float = Field(..., ge=0, le=100)
    avgQuizScore: float = Field(..., ge=0, le=100)
    attendance: float = Field(..., ge=0, le=100)
    assignmentCompletion: float = Field(..., ge=0, le=100)


class RiskPrediction(BaseModel):
    riskLevel: str
    confidence: float
    analysis: dict
    risk_level: str
    risk_score: float
    top_factors: List[str]


class BatchRiskRequest(BaseModel):
    students: List[StudentRiskData]


class LearningPathRequest(BaseModel):
    weaknesses: List[str]
    gradeLevel: str
    learningStyle: Optional[str] = "visual"


class LearningPathResponse(BaseModel):
    learningPath: str


class StudentInsightData(BaseModel):
    name: str
    engagementScore: float
    avgQuizScore: float
    attendance: float
    riskLevel: str


class DailyInsightRequest(BaseModel):
    students: List[StudentInsightData]


class DailyInsightResponse(BaseModel):
    insight: str


class VerificationResult(BaseModel):
    verified: bool
    confidence: str
    response: str
    warning: Optional[str] = None


class CodeVerificationResult(BaseModel):
    verified: bool
    code: str
    output: str
    error: Optional[str] = None


class LLMJudgeResult(BaseModel):
    correct: bool
    issues: List[str]
    confidence: float


class VerifySolutionRequest(BaseModel):
    problem: str
    solution: str


class VerifySolutionResponse(BaseModel):
    overall_verified: bool
    aggregated_confidence: float
    self_consistency: Optional[VerificationResult] = None
    code_verification: Optional[CodeVerificationResult] = None
    llm_judge: Optional[LLMJudgeResult] = None
    warnings: List[str] = Field(default_factory=list)


# ─── Routes ────────────────────────────────────────────────────


@app.get("/health")
async def health_check():
    chat_model = CHAT_MODEL
    try:
        routing_client = get_inference_client()
        chat_model, _ = routing_client._resolve_primary_model(
            InferenceRequest(
                messages=[{"role": "user", "content": "health_check"}],
                task_type="chat",
            )
        )
    except Exception:
        pass

    return {"status": "healthy", "models": {"chat": chat_model, "risk": RISK_MODEL}}


@app.get("/")
async def root():
    return {
        "name": "MathPulse AI API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }


# ─── AI Chat Tutor ─────────────────────────────────────────────


MATH_TUTOR_SYSTEM_PROMPT = """You are L.O.L.I. (Learning Optimizer with Layered Intelligence), 
an expert AI math tutor for Grade 11-12 Filipino students.

**Problem-Solving Protocol:**
1. Read the problem carefully and restate it in your own words to confirm understanding.
2. Identify key information, formulas, theorems, and what you need to find.
3. Solve step by step using Chain-of-Thought reasoning with explicit calculations.
4. Show ALL steps and equation manipulations clearly with intermediate results.
5. Verify your answer by substituting back into the original problem (for equations/algebra).
6. Double-check your arithmetic and final answer before presenting.
7. Put your final answer inside \\boxed{}

**Rules for Mathematical Accuracy:**
- ALWAYS show complete working. Never skip steps or combine multiple operations.
- Use clear mathematical notation (x², √, π, ≈, ∴, →, =)
- Show intermediate calculations explicitly (e.g., "3 × 4 = 12, then 12 + 5 = 17")
- Reveal your thinking process — explain WHY each step follows from the previous
- For word problems: Define variables clearly, show equation setup, solve step-by-step, then verify
- If verification fails, recalculate and identify the error before correcting
- For physics/kinematics problems: Check units and verify magnitude of answers make sense
- For functions/calculus: Always verify domain and range assumptions
- Be encouraging but honest. If a problem is ambiguous, ask for clarification.
- Respond in clear English suitable for Grade 11-12 students
- If asked about any non-math topic, respond in a friendly tone and redirect to math support only.
- If the user sends greetings or thanks, respond politely and invite a math-related question.
- Never use external tools or functions — solve purely through mathematical reasoning
- Never use external tools or functions — solve purely through mathematical reasoning"""


_STREAM_COMPLETION_MODES: Set[str] = {"auto", "marker", "none"}
_EXPECTED_END_MARKER_PATTERNS: Tuple[re.Pattern[str], ...] = (
    re.compile(
        r"\b(?:end|finish|stop)\s+with(?:\s+the\s+(?:exact\s+)?(?:marker|text))?\s*[:\-]?\s*([\"'`]?)([A-Za-z0-9_:\-]{2,96})\1",
        re.IGNORECASE,
    ),
    re.compile(
        r"\b(?:include|append)\s+(?:the\s+)?marker\s*[:\-]?\s*([\"'`]?)([A-Za-z0-9_:\-]{2,96})\1",
        re.IGNORECASE,
    ),
)
_EXPECTED_RANGE_PATTERNS: Tuple[re.Pattern[str], ...] = (
    re.compile(r"\bfor\s+([a-zA-Z])\s*=\s*(-?\d+)\s*(?:\.\.|to)\s*(-?\d+)\b", re.IGNORECASE),
    re.compile(r"\b([a-zA-Z])\s*=\s*(-?\d+)\s*\.\.\s*(-?\d+)\b", re.IGNORECASE),
)


def _normalize_expected_end_marker(marker: Optional[str]) -> Optional[str]:
    if marker is None:
        return None

    normalized = str(marker).strip()
    if not normalized:
        return None

    if len(normalized) >= 2 and normalized[0] == normalized[-1] and normalized[0] in {'"', "'", "`"}:
        normalized = normalized[1:-1].strip()

    normalized = normalized.rstrip(".,; ")
    if not normalized:
        return None

    return normalized[:120]


def _extract_expected_end_marker_from_prompt(prompt: str) -> Optional[str]:
    source = (prompt or "").strip()
    if not source:
        return None

    for pattern in _EXPECTED_END_MARKER_PATTERNS:
        match = pattern.search(source)
        if not match:
            continue
        marker = _normalize_expected_end_marker(match.group(2))
        if marker:
            return marker

    return None


def _contains_expected_end_marker(answer: str, marker: Optional[str]) -> bool:
    marker_value = _normalize_expected_end_marker(marker)
    if not marker_value:
        return False
    return marker_value.lower() in (answer or "").lower()


def _extract_expected_prompt_range(prompt: str) -> Optional[Tuple[str, int, int]]:
    source = (prompt or "").strip()
    if not source:
        return None

    for pattern in _EXPECTED_RANGE_PATTERNS:
        match = pattern.search(source)
        if not match:
            continue

        var_name = match.group(1).lower()
        start_value = int(match.group(2))
        end_value = int(match.group(3))
        if abs(end_value - start_value) > 4000:
            return None
        return var_name, start_value, end_value

    return None


def _response_covers_expected_range(answer: str, range_spec: Optional[Tuple[str, int, int]]) -> bool:
    if range_spec is None:
        return True

    var_name, start_value, end_value = range_spec
    sequence_pattern = re.compile(rf"\b{re.escape(var_name)}\s*=\s*(-?\d+)\b", re.IGNORECASE)
    matches = [int(match) for match in sequence_pattern.findall(answer or "")]
    if not matches:
        return False

    terminal_value = matches[-1]
    if end_value >= start_value:
        return terminal_value >= end_value
    return terminal_value <= end_value


def _response_looks_truncated(answer: str) -> bool:
    trimmed = (answer or "").strip()
    if not trimmed:
        return True

    trailing_signals = [
        r"```[^`]*$",
        r"\$\$[^$]*$",
        r"\$[^$\n]*$",
        r"\\\[[^\]]*$",
        r"\\\([^\)]*$",
        r"\\boxed\{[^}]*$",
        r"(?:Step\s*\d+[:.]?)\s*$",
        r"(?:Final\s*Answer[:.]?)\s*$",
    ]
    if any(re.search(pattern, trimmed, re.IGNORECASE) for pattern in trailing_signals):
        return True

    if len(trimmed) >= 96 and re.search(
        r"\b(?:and|or|but|because|since|so|then|which|that|where|when|with|for|to|from|of|in|on|at|by)\s*$",
        trimmed,
        re.IGNORECASE,
    ):
        return True

    return False


def _normalize_stream_completion_mode(mode: Optional[str]) -> str:
    candidate = (mode or "").strip().lower()
    if candidate in _STREAM_COMPLETION_MODES:
        return candidate
    if CHAT_STREAM_COMPLETION_MODE_DEFAULT in _STREAM_COMPLETION_MODES:
        return CHAT_STREAM_COMPLETION_MODE_DEFAULT
    return "auto"


def _resolve_stream_continuation_rounds(request: ChatRequest, completion_mode: str) -> int:
    if not CHAT_STREAM_CONTINUATION_ENABLED:
        return 0
    if completion_mode == "none":
        return 0
    if request.continuationMaxRounds is None:
        return CHAT_STREAM_CONTINUATION_MAX_ROUNDS
    return max(0, min(int(request.continuationMaxRounds), 8))


def _should_continue_stream_response(
    *,
    prompt: str,
    accumulated_answer: str,
    completion_mode: str,
    expected_end_marker: Optional[str],
    expected_range: Optional[Tuple[str, int, int]],
) -> bool:
    mode = _normalize_stream_completion_mode(completion_mode)
    if mode == "none":
        return False

    marker_present = _contains_expected_end_marker(accumulated_answer, expected_end_marker)
    if mode == "marker":
        return not marker_present

    if expected_end_marker and not marker_present:
        return True

    if expected_range and not _response_covers_expected_range(accumulated_answer, expected_range):
        return True

    if _response_looks_truncated(accumulated_answer):
        return True

    return False


def _merge_answer_continuation(base: str, continuation: str) -> str:
    base_trimmed = (base or "").strip()
    continuation_trimmed = (continuation or "").strip()

    if not base_trimmed:
        return continuation_trimmed
    if not continuation_trimmed:
        return base_trimmed

    max_overlap = min(len(base_trimmed), len(continuation_trimmed), 220)
    for overlap in range(max_overlap, 23, -1):
        if base_trimmed.endswith(continuation_trimmed[:overlap]):
            return f"{base_trimmed}{continuation_trimmed[overlap:]}".strip()

    if base_trimmed.endswith(continuation_trimmed):
        return base_trimmed
    if continuation_trimmed.startswith(base_trimmed):
        return continuation_trimmed

    return f"{base_trimmed}\n\n{continuation_trimmed}".strip()


def _build_stream_continuation_prompt(original_question: str, expected_end_marker: Optional[str]) -> str:
    lines = [
        "Continue the exact same answer from where it stopped.",
        "Do not restart. Do not repeat content that was already sent.",
        "Only output the missing continuation.",
        f"Original student question: {original_question}",
    ]
    marker = _normalize_expected_end_marker(expected_end_marker)
    if marker:
        lines.append(f'Include the exact marker "{marker}" at the very end once complete.')
    return "\n".join(lines)


@app.post("/api/chat", response_model=ChatResponse)
async def chat_tutor(request: ChatRequest):
    """AI Math Tutor powered by Hugging Face Inference routing."""
    try:
        boundary_response = get_scope_boundary_response(request.message)
        if boundary_response is not None:
            return ChatResponse(response=boundary_response)

        messages = [{"role": "system", "content": MATH_TUTOR_SYSTEM_PROMPT}]

        # Add conversation history
        for msg in request.history[-10:]:  # Keep last 10 messages for context window
            messages.append({"role": msg.role, "content": msg.content})

        # Add current message
        messages.append({"role": "user", "content": request.message})

        # Call HF serverless with retry (handled inside call_hf_chat)
        try:
            answer = await call_hf_chat_async(
                messages,
                max_tokens=CHAT_MAX_NEW_TOKENS,
                temperature=0.3,
                top_p=0.85,
                task_type="chat",
            )
        except Exception as hf_err:
            logger.error(f"HF chat failed: {hf_err}")
            raise HTTPException(
                status_code=502,
                detail="AI model service is temporarily unavailable. Please try again.",
            )

        # Optional self-consistency verification
        if request.verify:
            logger.info("Running self-consistency verification for chat response")
            verification = await verify_math_response(request.message, messages)
            return ChatResponse(
                response=verification["response"],
                verified=verification["verified"],
                confidence=verification["confidence"],
                warning=verification.get("warning"),
            )

        return ChatResponse(response=answer)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Chat service error: {str(e)}")


@app.post("/api/chat/stream")
async def chat_tutor_stream(request: ChatRequest):
    """SSE stream endpoint for AI Math Tutor chat responses."""
    try:
        boundary_response = get_scope_boundary_response(request.message)
        messages = [{"role": "system", "content": MATH_TUTOR_SYSTEM_PROMPT}]
        for msg in request.history[-10:]:
            messages.append({"role": msg.role, "content": msg.content})
        messages.append({"role": "user", "content": request.message})

        def _sse(event: str, data: str) -> str:
            lines = str(data).replace("\r\n", "\n").replace("\r", "\n").split("\n")
            body = [f"event: {event}"] + [f"data: {line}" for line in lines]
            return "\n".join(body) + "\n\n"

        async def event_generator():
            if boundary_response is not None:
                payload = json.dumps({"chunk": boundary_response}, ensure_ascii=False)
                yield _sse("chunk", payload)
                yield _sse("end", "done")
                return

            stream_started_at = time.monotonic()
            emitted_any_chunk = False
            completion_mode = _normalize_stream_completion_mode(request.completionMode)
            expected_end_marker = _normalize_expected_end_marker(request.expectedEndMarker)
            if not expected_end_marker:
                expected_end_marker = _extract_expected_end_marker_from_prompt(request.message)
            if completion_mode == "marker" and not expected_end_marker:
                completion_mode = "auto"

            expected_range = _extract_expected_prompt_range(request.message) if completion_mode == "auto" else None
            continuation_rounds = _resolve_stream_continuation_rounds(request, completion_mode)
            max_attempts = 1 + continuation_rounds
            assembled_response = ""

            try:
                for attempt_index in range(max_attempts):
                    response_len_before_attempt = len(assembled_response)
                    if attempt_index == 0:
                        attempt_messages = messages
                    else:
                        continuation_messages = list(messages)
                        tail_context = assembled_response[-CHAT_STREAM_CONTINUATION_TAIL_CHARS:]
                        if tail_context:
                            continuation_messages.append({"role": "assistant", "content": tail_context})
                        continuation_messages.append({
                            "role": "user",
                            "content": _build_stream_continuation_prompt(request.message, expected_end_marker),
                        })
                        attempt_messages = continuation_messages

                    stream_iterator = call_hf_chat_stream_async(
                        attempt_messages,
                        max_tokens=CHAT_MAX_NEW_TOKENS,
                        temperature=0.3,
                        top_p=0.85,
                        task_type="chat",
                    )

                    attempt_chunks: List[str] = []

                    while True:
                        elapsed = time.monotonic() - stream_started_at
                        remaining_total = CHAT_STREAM_TOTAL_TIMEOUT_SEC - elapsed
                        if remaining_total <= 0:
                            raise TimeoutError("Chat stream exceeded total timeout")

                        token_timeout = min(CHAT_STREAM_NO_TOKEN_TIMEOUT_SEC, remaining_total)
                        try:
                            chunk = await asyncio.wait_for(stream_iterator.__anext__(), timeout=token_timeout)
                        except StopAsyncIteration:
                            break

                        if not chunk:
                            continue

                        chunk_text = str(chunk)
                        attempt_chunks.append(chunk_text)

                        if attempt_index == 0:
                            assembled_response += chunk_text
                            emitted_any_chunk = True
                            payload = json.dumps({"chunk": chunk_text}, ensure_ascii=False)
                            yield _sse("chunk", payload)
                            await asyncio.sleep(0)

                    attempt_text = "".join(attempt_chunks)
                    if attempt_index > 0 and attempt_text:
                        merged_response = _merge_answer_continuation(assembled_response, attempt_text)
                        if merged_response.startswith(assembled_response):
                            delta_text = merged_response[len(assembled_response):]
                        else:
                            delta_text = attempt_text
                            merged_response = _merge_answer_continuation(assembled_response, delta_text)

                        assembled_response = merged_response
                        if delta_text:
                            emitted_any_chunk = True
                            payload = json.dumps({"chunk": delta_text}, ensure_ascii=False)
                            yield _sse("chunk", payload)
                            await asyncio.sleep(0)

                    added_chars = len(assembled_response) - response_len_before_attempt
                    should_continue = _should_continue_stream_response(
                        prompt=request.message,
                        accumulated_answer=assembled_response,
                        completion_mode=completion_mode,
                        expected_end_marker=expected_end_marker,
                        expected_range=expected_range,
                    )

                    if not should_continue:
                        break

                    if attempt_index >= continuation_rounds:
                        logger.info(
                            "Reached chat stream continuation limit (rounds=%s mode=%s marker=%s)",
                            continuation_rounds,
                            completion_mode,
                            expected_end_marker or "<none>",
                        )
                        break

                    if attempt_index > 0 and added_chars < CHAT_STREAM_CONTINUATION_MIN_NEW_CHARS:
                        logger.info(
                            "Stopping chat stream continuation due to low progress (added_chars=%s min_required=%s)",
                            added_chars,
                            CHAT_STREAM_CONTINUATION_MIN_NEW_CHARS,
                        )
                        break

                    logger.info(
                        "Continuing chat stream response (attempt=%s mode=%s marker=%s range=%s)",
                        attempt_index + 2,
                        completion_mode,
                        expected_end_marker or "<none>",
                        expected_range or "<none>",
                    )
            except (asyncio.TimeoutError, TimeoutError):
                logger.error(
                    "HF chat stream timed out (idle=%ss total=%ss)",
                    CHAT_STREAM_NO_TOKEN_TIMEOUT_SEC,
                    CHAT_STREAM_TOTAL_TIMEOUT_SEC,
                )
                err_payload = json.dumps({
                    "detail": (
                        "AI response stream timed out mid-response. Please retry."
                        if emitted_any_chunk
                        else "AI response stream timed out before any tokens were received. Please retry."
                    ),
                })
                yield _sse("error", err_payload)
            except Exception as hf_err:
                logger.error(f"HF chat stream failed: {hf_err}")
                err_payload = json.dumps({
                    "detail": "AI model service is temporarily unavailable. Please try again.",
                })
                yield _sse("error", err_payload)
            finally:
                yield _sse("end", "done")

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )
    except Exception as e:
        logger.error(f"Chat stream setup error: {e}")
        raise HTTPException(status_code=500, detail=f"Chat stream setup error: {str(e)}")


# ─── Verification System ──────────────────────────────────────


def _extract_final_answer(text: str) -> Optional[str]:
    """Extract the final numeric/symbolic answer from a math response."""
    # Try to find explicitly labeled final answers
    patterns = [
        r"\*\*Final Answer[:\s]*(.+?)\*\*",
        r"Final Answer[:\s]*(.+?)[\n\.]",
        r"(?:the answer is|= )\s*(.+?)[\n\.\s]",
        r"\\boxed\{(.+?)\}",
    ]
    for pat in patterns:
        match = re.search(pat, text, re.IGNORECASE)
        if match:
            return match.group(1).strip().rstrip(".")
    # Fallback: last line with an equals sign
    for line in reversed(text.strip().splitlines()):
        if "=" in line:
            parts = line.split("=")
            return parts[-1].strip().rstrip(".")
    return None


async def verify_math_response(
    problem: str, base_messages: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Self-consistency verification: generate multiple responses to the same
    math problem and check if the final answers agree.
    Returns dict with 'verified' (bool), 'confidence' (str), and 'response'.
    """
    responses: List[str] = []
    answers: List[Optional[str]] = []

    logger.info(f"Generating {VERIFICATION_SAMPLES} responses for self-consistency check")

    for i in range(VERIFICATION_SAMPLES):
        try:
            text = await call_hf_chat_async(
                base_messages,
                max_tokens=2048,
                temperature=0.7,
                top_p=0.9,
                task_type="verify_solution",
            )
            responses.append(text)
            answers.append(_extract_final_answer(text))
            logger.info(f"  Sample {i+1} answer: {answers[-1]}")
        except Exception as e:
            logger.warning(f"  Sample {i+1} failed: {e}")
            responses.append("")
            answers.append(None)

    # Check agreement among non-None answers
    valid_answers = [a for a in answers if a is not None]

    if not valid_answers:
        return {
            "verified": False,
            "confidence": "low",
            "response": responses[0] if responses else "",
            "warning": "Could not extract answers for verification.",
        }

    counter = Counter(valid_answers)
    most_common_answer, most_common_count = counter.most_common(1)[0]
    agreement_ratio = most_common_count / len(valid_answers)

    if agreement_ratio >= 1.0:
        confidence = "high"
        verified = True
    elif agreement_ratio >= 0.6:
        confidence = "medium"
        verified = True
    else:
        confidence = "low"
        verified = False

    # Pick the response whose answer matches the majority
    best_response = responses[0]
    for resp, ans in zip(responses, answers):
        if ans == most_common_answer and resp:
            best_response = resp
            break

    result: Dict[str, Any] = {
        "verified": verified,
        "confidence": confidence,
        "response": best_response,
    }

    if not verified:
        result["warning"] = (
            f"Self-consistency check failed: answers did not converge "
            f"({len(set(valid_answers))} distinct answers from {len(valid_answers)} samples). "
            f"This answer may be unreliable."
        )

    logger.info(f"Self-consistency result: verified={verified}, confidence={confidence}")
    return result


async def verify_with_code(problem: str, solution: str) -> Dict[str, Any]:
    """
    Ask the model to generate Python verification code for a math solution,
    execute it safely, and return the verification result.
    """

    prompt = f"""Given this math problem and its proposed solution, write a short Python script that numerically verifies the answer.

**Problem:** {problem}

**Proposed Solution:** {solution}

Rules:
- Use only the Python standard library and the `math` module.
- The script must print EXACTLY one line: either "VERIFIED" if the solution is correct, or "FAILED: <reason>" if it is wrong.
- Do NOT use input(), networking, file I/O, or any system calls.
- Keep the script under 30 lines.

Respond with ONLY the Python code, no markdown fences, no explanation."""

    try:
        raw_code = await call_hf_chat_async(
            messages=[
                {
                    "role": "system",
                    "content": "You are a Python code generator. Output only valid Python code, nothing else.",
                },
                {"role": "user", "content": prompt},
            ],
            max_tokens=800,
            temperature=0.1,
        )
        # Strip markdown code fences if present
        code = re.sub(r"^```(?:python)?\s*\n?", "", raw_code.strip())
        code = re.sub(r"\n?```\s*$", "", code)
        code = code.strip()

        if not code:
            return {"verified": False, "code": "", "output": "", "error": "No code generated"}

        logger.info("Executing verification code in isolated subprocess sandbox")

        code_blocklist = re.compile(
            r"(__\w+__|\bimport\b|exec\s*\(|eval\s*\(|open\s*\(|os\.|sys\.|subprocess|socket|pathlib|shutil|input\s*\(|compile\s*\(|globals\s*\(|locals\s*\(|__builtins__)",
            re.IGNORECASE,
        )
        if code_blocklist.search(code):
            return {
                "verified": False,
                "code": code,
                "output": "",
                "error": "Generated code contains disallowed operations",
            }
        if len(code) > 3000:
            return {
                "verified": False,
                "code": code,
                "output": "",
                "error": "Generated code exceeded maximum allowed length",
            }

        wrapper_script = f"""
import io
import json
import math
import contextlib

try:
    import resource
    _max_mem = 256 * 1024 * 1024
    resource.setrlimit(resource.RLIMIT_CPU, (2, 2))
    resource.setrlimit(resource.RLIMIT_AS, (_max_mem, _max_mem))
except Exception:
    pass

SAFE_BUILTINS = {{
    "print": print,
    "range": range,
    "len": len,
    "abs": abs,
    "round": round,
    "int": int,
    "float": float,
    "str": str,
    "sum": sum,
    "min": min,
    "max": max,
    "enumerate": enumerate,
    "zip": zip,
    "map": map,
    "list": list,
    "tuple": tuple,
    "dict": dict,
    "set": set,
    "sorted": sorted,
    "pow": pow,
    "isinstance": isinstance,
    "True": True,
    "False": False,
    "None": None,
}}

payload = {{"ok": False, "output": "", "error": None}}
stdout_capture = io.StringIO()
source = {json.dumps(code)}
try:
    compiled = compile(source, "<verification>", "exec")
    with contextlib.redirect_stdout(stdout_capture):
        exec(compiled, {{"__builtins__": SAFE_BUILTINS, "math": math}}, {{}})
    payload["ok"] = True
except Exception as exc:
    payload["error"] = str(exc)

payload["output"] = stdout_capture.getvalue().strip()
print(json.dumps(payload))
""".strip()

        temp_path = ""
        try:
            with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False, encoding="utf-8") as tf:
                tf.write(wrapper_script)
                temp_path = tf.name

            completed = subprocess.run(
                [sys.executable, "-I", "-S", temp_path],
                capture_output=True,
                text=True,
                timeout=3,
            )
        except subprocess.TimeoutExpired:
            return {
                "verified": False,
                "code": code,
                "output": "",
                "error": "Code execution timed out",
            }
        finally:
            if temp_path and os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except OSError:
                    pass

        if completed.returncode != 0:
            stderr_text = (completed.stderr or "").strip()
            return {
                "verified": False,
                "code": code,
                "output": "",
                "error": f"Sandbox execution failed: {stderr_text[:300]}",
            }

        lines = (completed.stdout or "").strip().splitlines()
        if not lines:
            return {
                "verified": False,
                "code": code,
                "output": "",
                "error": "Sandbox execution produced no output",
            }

        try:
            payload = json.loads(lines[-1])
        except json.JSONDecodeError:
            return {
                "verified": False,
                "code": code,
                "output": "",
                "error": "Sandbox returned malformed payload",
            }

        output = str(payload.get("output", "")).strip()
        sandbox_error = payload.get("error")
        if sandbox_error:
            return {
                "verified": False,
                "code": code,
                "output": output,
                "error": f"Code execution error: {sandbox_error}",
            }

        verified = output.upper().startswith("VERIFIED")
        logger.info(f"Code verification output: {output}")

        return {
            "verified": verified,
            "code": code,
            "output": output,
            "error": None,
        }

    except Exception as e:
        logger.error(f"Code verification error: {e}")
        return {"verified": False, "code": "", "output": "", "error": str(e)}


async def llm_judge_verification(problem: str, solution: str) -> Dict[str, Any]:
    """
    Use a second LLM call with low temperature to judge whether a math
    solution is correct. Checks formula usage, calculations, and logic.
    Returns dict with 'correct' (bool), 'issues' (list), 'confidence' (float).
    """

    prompt = f"""You are a meticulous math verification expert. Your job is to verify whether the following solution to a math problem is mathematically correct.

**Problem:** {problem}

**Solution to verify:**
{solution}

Carefully check:
1. Are the correct formulas and theorems applied?
2. Is every arithmetic calculation accurate?
3. Is the logical reasoning valid at each step?
4. Is the final answer correct and in the right units?

Respond with ONLY a JSON object (no markdown, no explanation outside the JSON):
{{
  "correct": true or false,
  "issues": ["list of specific errors or concerns, empty if correct"],
  "confidence": 0.0 to 1.0
}}"""

    try:
        raw = await call_hf_chat_async(
            messages=[
                {
                    "role": "system",
                    "content": "You are a mathematical verification judge. Respond ONLY with valid JSON.",
                },
                {"role": "user", "content": prompt},
            ],
            task_type="verify_solution",
            max_tokens=500,
            temperature=0.1,
        )
        # Extract JSON from response
        json_start = raw.find("{")
        json_end = raw.rfind("}") + 1
        if json_start >= 0 and json_end > json_start:
            parsed = json.loads(raw[json_start:json_end])
        else:
            logger.warning(f"LLM judge returned non-JSON: {raw[:200]}")
            return {"correct": False, "issues": ["Could not parse judge response"], "confidence": 0.0}

        judge_result = {
            "correct": bool(parsed.get("correct", False)),
            "issues": list(parsed.get("issues", [])),
            "confidence": float(parsed.get("confidence", 0.0)),
        }

        logger.info(f"LLM judge result: correct={judge_result['correct']}, confidence={judge_result['confidence']}")
        return judge_result

    except Exception as e:
        logger.error(f"LLM judge error: {e}\n{traceback.format_exc()}")
        return {"correct": False, "issues": [f"Judge error: {str(e)}"], "confidence": 0.0}


# ─── Verification Endpoint ────────────────────────────────────


@app.post("/api/verify-solution", response_model=VerifySolutionResponse)
async def verify_solution(request: VerifySolutionRequest):
    """
    Run all 3 verification methods on a problem+solution pair:
    1. Self-consistency (multiple samples)
    2. Code-based verification
    3. LLM judge review
    Returns aggregated confidence and per-method results.
    """
    try:
        logger.info(f"Running full verification for problem: {request.problem[:80]}...")
        warnings: List[str] = []

        # Build messages for self-consistency check
        messages = [
            {"role": "system", "content": MATH_TUTOR_SYSTEM_PROMPT},
            {"role": "user", "content": request.problem},
        ]

        # 1. Self-consistency check
        try:
            sc_result = await verify_math_response(request.problem, messages)
            sc_model = VerificationResult(
                verified=sc_result["verified"],
                confidence=sc_result["confidence"],
                response=sc_result["response"],
                warning=sc_result.get("warning"),
            )
            if sc_result.get("warning"):
                warnings.append(f"Self-consistency: {sc_result['warning']}")
        except Exception as e:
            logger.error(f"Self-consistency verification failed: {e}")
            sc_model = VerificationResult(
                verified=False, confidence="low", response="", warning=str(e)
            )
            warnings.append(f"Self-consistency check failed: {str(e)}")

        # 2. Code verification
        try:
            cv_result = await verify_with_code(request.problem, request.solution)
            cv_model = CodeVerificationResult(
                verified=cv_result["verified"],
                code=cv_result.get("code", ""),
                output=cv_result.get("output", ""),
                error=cv_result.get("error"),
            )
            if cv_result.get("error"):
                warnings.append(f"Code verification: {cv_result['error']}")
        except Exception as e:
            logger.error(f"Code verification failed: {e}")
            cv_model = CodeVerificationResult(
                verified=False, code="", output="", error=str(e)
            )
            warnings.append(f"Code verification failed: {str(e)}")

        # 3. LLM judge
        try:
            lj_result = await llm_judge_verification(request.problem, request.solution)
            lj_model = LLMJudgeResult(
                correct=lj_result["correct"],
                issues=lj_result["issues"],
                confidence=lj_result["confidence"],
            )
            if lj_result["issues"]:
                warnings.append(f"LLM judge issues: {'; '.join(lj_result['issues'])}")
        except Exception as e:
            logger.error(f"LLM judge verification failed: {e}")
            lj_model = LLMJudgeResult(correct=False, issues=[str(e)], confidence=0.0)
            warnings.append(f"LLM judge failed: {str(e)}")

        # Aggregate confidence score (0.0 - 1.0)
        scores: List[float] = []

        # Self-consistency score
        sc_score_map = {"high": 1.0, "medium": 0.6, "low": 0.2}
        scores.append(sc_score_map.get(sc_model.confidence, 0.2))

        # Code verification score
        scores.append(1.0 if cv_model.verified else 0.0)

        # LLM judge score
        scores.append(lj_model.confidence if lj_model.correct else (1.0 - lj_model.confidence) * 0.3)

        aggregated = round(sum(scores) / len(scores), 3) if scores else 0.0
        overall_verified = aggregated >= 0.6

        logger.info(
            f"Verification complete: overall_verified={overall_verified}, "
            f"aggregated_confidence={aggregated}"
        )

        return VerifySolutionResponse(
            overall_verified=overall_verified,
            aggregated_confidence=aggregated,
            self_consistency=sc_model,
            code_verification=cv_model,
            llm_judge=lj_model,
            warnings=warnings,
        )

    except Exception as e:
        logger.error(f"Verify solution error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Verification error: {str(e)}")


# ─── Student Risk Classification (facebook/bart-large-mnli) ───


RISK_LABELS = [
    "high risk of failing",
    "medium academic risk",
    "low risk academically stable",
]

RISK_MAPPING = {
    "high risk of failing": "High",
    "medium academic risk": "Medium",
    "low risk academically stable": "Low",
}


def _to_strict_risk_level(level: str) -> str:
    normalized = (level or "").strip().lower()
    if normalized in {"high", "medium", "low"}:
        return normalized
    return "medium"


def _basic_risk_top_factors(student_data: StudentRiskData) -> List[str]:
    factors: List[str] = []
    if student_data.avgQuizScore < 55:
        factors.append("Low average quiz performance")
    if student_data.attendance < 70:
        factors.append("Low attendance rate")
    if student_data.assignmentCompletion < 65:
        factors.append("Incomplete assignment submission trend")
    if student_data.engagementScore < 50:
        factors.append("Low class engagement")
    if not factors:
        factors.append("No major risk indicators detected")
    return factors[:3]


def _parse_recommendation_lines(text: str, *, max_items: int = 5) -> List[str]:
    lines: List[str] = []
    for raw_line in (text or "").splitlines():
        line = raw_line.strip()
        if not line:
            continue
        line = re.sub(r"^[-*\u2022\d\.\)\s]+", "", line).strip()
        if not line:
            continue
        if len(line) < 8:
            continue
        lines.append(line)

    if not lines and text.strip():
        chunks = [chunk.strip() for chunk in re.split(r"[\n;]", text) if chunk.strip()]
        lines = chunks

    deduped: List[str] = []
    seen: Set[str] = set()
    for line in lines:
        key = line.lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(line)
        if len(deduped) >= max_items:
            break
    return deduped


async def _generate_risk_recommendations_llm(data: EnhancedRiskRequest, result: EnhancedRiskPrediction) -> List[str]:
    prompt = (
        "Generate concise teacher interventions for this student risk profile. "
        "Return plain text with one recommendation per line. Avoid JSON and markdown.\n\n"
        f"risk_level: {result.riskLevel}\n"
        f"risk_score: {result.risk_score:.2f}\n"
        f"engagementScore: {data.engagementScore:.1f}\n"
        f"avgQuizScore: {data.avgQuizScore:.1f}\n"
        f"attendance: {data.attendance:.1f}\n"
        f"assignmentCompletion: {data.assignmentCompletion:.1f}\n"
        f"streak: {int(data.streak or 0)}\n"
        f"daysSinceLastActivity: {int(data.daysSinceLastActivity or 0)}\n"
        f"top_factors: {', '.join(result.top_factors)}"
    )

    content = await call_hf_chat_async(
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a student success specialist. Provide practical, measurable, and age-appropriate "
                    "interventions for Grade 11-12 students."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        max_tokens=260,
        temperature=0.2,
        top_p=0.9,
        task_type="risk_narrative",
        timeout=120,
    )
    return _parse_recommendation_lines(content, max_items=5)


@app.post("/api/predict-risk", response_model=RiskPrediction)
async def predict_risk(student_data: StudentRiskData):
    """Student risk prediction using facebook/bart-large-mnli zero-shot classification"""
    try:
        hf = get_client()

        text = (
            f"Student academic performance summary: "
            f"Engagement score is {student_data.engagementScore:.0f}%. "
            f"Average quiz score is {student_data.avgQuizScore:.0f}%. "
            f"Attendance rate is {student_data.attendance:.0f}%. "
            f"Assignment completion rate is {student_data.assignmentCompletion:.0f}%."
        )

        # Retry HF inference with backoff
        result = None
        last_err: Optional[Exception] = None
        for attempt in range(3):
            try:
                result = await _run_hf_blocking(
                    hf.zero_shot_classification,
                    text=text,
                    candidate_labels=RISK_LABELS,
                    model=RISK_MODEL,
                    multi_label=False,
                )
                last_err = None
                break
            except Exception as hf_err:
                last_err = hf_err
                logger.warning(f"HF risk prediction attempt {attempt + 1} failed: {hf_err}")
                if attempt < 2:
                    await asyncio.sleep(2 ** attempt)

        if last_err is not None or result is None:
            logger.error(f"HF risk prediction failed after 3 attempts: {last_err}")
            raise HTTPException(
                status_code=502,
                detail="Risk prediction model is temporarily unavailable.",
            )

        # result is list[ZeroShotClassificationOutputElement] sorted by score desc
        top = result[0]
        top_label = top.label
        top_score = top.score

        risk_level = RISK_MAPPING.get(top_label, "Medium")
        strict_risk_level = _to_strict_risk_level(risk_level)
        top_factors = _basic_risk_top_factors(student_data)

        return RiskPrediction(
            riskLevel=risk_level,
            confidence=round(float(top_score), 4),
            analysis={
                "labels": [el.label for el in result],
                "scores": [round(el.score, 4) for el in result],
            },
            risk_level=strict_risk_level,
            risk_score=round(float(top_score), 4),
            top_factors=top_factors,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Risk prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Risk prediction error: {str(e)}")


@app.post("/api/predict-risk/batch")
async def predict_risk_batch(request: BatchRiskRequest):
    """Batch risk prediction for multiple students"""
    results = []
    for student in request.students:
        try:
            result = await predict_risk(student)
            results.append(result)
        except Exception:
            results.append(
                RiskPrediction(
                    riskLevel="Medium",
                    confidence=0.0,
                    analysis={"labels": [], "scores": []},
                    risk_level="medium",
                    risk_score=0.0,
                    top_factors=["Fallback risk response due to prediction error"],
                )
            )
    return results


# ─── Learning Path Generation ──────────────────────────────────


@app.post("/api/learning-path", response_model=LearningPathResponse)
async def generate_learning_path(request: LearningPathRequest):
    """Generate AI-powered personalized learning path"""
    try:
        prompt = f"""Generate a personalized math learning path for a student with these details:
- Weak Topics: {', '.join(request.weaknesses)}
- Grade Level: {request.gradeLevel}
- Learning Style: {request.learningStyle or 'visual'}

Create a structured learning path with 5-7 specific activities. For each activity provide:
1. Activity title
2. Brief description (1-2 sentences)
3. Estimated duration
4. Type (video, practice, quiz, reading, interactive)

Format as a numbered list. Be specific to the math topics mentioned."""

        messages = [
            {
                "role": "system",
                "content": "You are an educational curriculum expert specializing in mathematics. Create clear, actionable learning paths.",
            },
            {"role": "user", "content": prompt},
        ]

        try:
            content = await call_hf_chat_async(
                messages,
                max_tokens=1500,
                temperature=0.7,
                task_type="learning_path",
            )
        except Exception as hf_err:
            logger.error(f"HF learning-path failed: {hf_err}")
            raise HTTPException(
                status_code=502,
                detail="Learning path generation is temporarily unavailable.",
            )

        return LearningPathResponse(learningPath=content)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Learning path error: {e}")
        raise HTTPException(status_code=500, detail=f"Learning path error: {str(e)}")


# ─── Daily AI Insights ─────────────────────────────────────────


@app.post("/api/analytics/daily-insight", response_model=DailyInsightResponse)
async def daily_insight(request: DailyInsightRequest):
    """Generate daily AI insights for teacher dashboard"""
    try:
        students = request.students
        total = len(students)
        if total == 0:
            return DailyInsightResponse(insight="No student data available for analysis.")

        avg_engagement = sum(s.engagementScore for s in students) / total
        avg_quiz = sum(s.avgQuizScore for s in students) / total
        avg_attendance = sum(s.attendance for s in students) / total
        high_risk = sum(1 for s in students if s.riskLevel == "High")
        medium_risk = sum(1 for s in students if s.riskLevel == "Medium")

        prompt = f"""Analyze this classroom data and provide actionable insights for a math teacher:

Classroom Summary:
- Total Students: {total}
- Average Engagement: {avg_engagement:.1f}%
- Average Quiz Score: {avg_quiz:.1f}%
- Average Attendance: {avg_attendance:.1f}%
- High-Risk Students: {high_risk}
- Medium-Risk Students: {medium_risk}
- Low-Risk Students: {total - high_risk - medium_risk}

Provide:
1. A brief overall assessment (2-3 sentences)
2. 3-4 specific, actionable recommendations for the teacher
3. One positive observation to highlight

Keep the response under 200 words. Be specific and practical."""

        messages = [
            {
                "role": "system",
                "content": "You are an educational data analyst providing insights to math teachers. Be specific, actionable, and encouraging.",
            },
            {"role": "user", "content": prompt},
        ]

        try:
            content = await call_hf_chat_async(
                messages,
                max_tokens=800,
                temperature=0.7,
                task_type="daily_insight",
            )
        except Exception as hf_err:
            logger.error(f"HF daily-insight failed: {hf_err}")
            raise HTTPException(
                status_code=502,
                detail="AI insight generation is temporarily unavailable.",
            )

        return DailyInsightResponse(insight=content)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Daily insight error: {e}")
        raise HTTPException(status_code=500, detail=f"Daily insight error: {str(e)}")


# ─── Smart Document Upload ────────────────────────────────────


CLASS_RECORD_REQUIRED_FIELDS: Set[str] = {
    "name",
    "lrn",
    "email",
    "engagementScore",
    "avgQuizScore",
    "attendance",
    "assignmentCompletion",
    "term",
    "assessmentName",
}

# Fields that must be present in mapped columns before import proceeds.
# These are the minimum metrics required for downstream dashboard/risk workflows.
CLASS_RECORD_IMPORT_CORE_FIELDS: Set[str] = {
    "name",
    "engagementScore",
    "avgQuizScore",
    "attendance",
}

CLASS_RECORD_IDENTITY_FIELDS: Set[str] = {"lrn", "email"}

CLASS_RECORD_SCORING_FIELDS: Set[str] = {
    "engagementScore",
    "avgQuizScore",
    "attendance",
    "assignmentCompletion",
}

SUPPORTED_DATASET_INTENTS: Set[str] = {
    "synthetic_student_records",
    "general_analytics",
    "eval_only",
}

NON_EDUCATION_DOMAIN_TOKENS: Dict[str, Set[str]] = {
    "medical": {"patient", "diagnosis", "disease", "symptom", "clinical", "medication"},
    "finance": {"loan", "mortgage", "revenue", "income", "profit", "stock", "price"},
    "real_estate": {"bedroom", "bathroom", "sqft", "square feet", "zipcode", "property", "house"},
    "genomics": {"gene", "genome", "protein", "rna", "dna", "mutation", "chromosome"},
}

CLASS_RECORD_FIELD_ALIASES: Dict[str, List[str]] = {
    "name": ["name", "student", "learner", "fullname", "full name"],
    "lrn": ["lrn", "student id", "learner id", "reference", "id number"],
    "email": ["email", "e-mail", "mail"],
    "engagementScore": ["engagement", "participation", "activity", "involvement"],
    "avgQuizScore": ["quiz", "score", "grade", "exam", "test", "assessment"],
    "attendance": ["attendance", "present", "absence", "attend"],
    "assignmentCompletion": ["assignment", "homework", "submission", "completion", "task"],
    "term": ["term", "quarter", "semester", "period", "grading"],
    "assessmentName": ["assessment", "exam", "quiz name", "test name", "activity name", "title"],
}


def _is_empty_cell(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, float):
        return math.isnan(value)
    if isinstance(value, str):
        return not value.strip()
    return False


def _stringify_cell(value: Any) -> str:
    if _is_empty_cell(value):
        return ""
    return str(value).strip()


def _normalize_unknown_key(column_name: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "_", column_name.lower()).strip("_")
    if not base:
        base = "field"
    return f"unknown_{base[:48]}"


def _safe_numeric(value: Any, *, default_value: float = 0.0) -> Tuple[float, Optional[str]]:
    if _is_empty_cell(value):
        return default_value, "missing numeric value; defaulted to 0"

    raw = str(value).strip().replace("%", "").replace(",", "")
    try:
        return float(raw), None
    except Exception:
        return default_value, f"invalid numeric value '{raw}'; defaulted to 0"


def _normalize_column_text(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(value or "").strip().lower()).strip()


def _detect_non_education_signals(columns: List[str]) -> Dict[str, List[str]]:
    matches: Dict[str, List[str]] = {}
    for raw_column in columns:
        normalized = _normalize_column_text(raw_column)
        if not normalized:
            continue
        hit_domains: List[str] = []
        for domain, tokens in NON_EDUCATION_DOMAIN_TOKENS.items():
            if any(token in normalized for token in tokens):
                hit_domains.append(domain)
        if hit_domains:
            matches[raw_column] = sorted(set(hit_domains))
    return matches


def _build_column_interpretations(
    *,
    columns: List[str],
    mapping: Dict[str, str],
    mapping_source: Dict[str, str],
    non_education_matches: Dict[str, List[str]],
) -> List[Dict[str, Any]]:
    interpretations: List[Dict[str, Any]] = []
    for col in columns:
        mapped_field = mapping.get(col)
        source = mapping_source.get(col, "unmapped")
        domains = non_education_matches.get(col, [])

        if mapped_field in CLASS_RECORD_SCORING_FIELDS:
            usage_policy = "scoring"
            reason = "Mapped to a core educational metric used in risk and dashboard calculations."
        elif mapped_field in CLASS_RECORD_REQUIRED_FIELDS:
            usage_policy = "display"
            reason = "Mapped to an educational identity/context field used for display and record management."
        else:
            usage_policy = "storage_only"
            reason = "Column is not mapped to a supported educational field and is excluded from scoring."

        if source == "fallback":
            confidence_band = "high"
        elif source == "ai":
            confidence_band = "medium"
        else:
            confidence_band = "low"

        if domains:
            confidence_band = "low"
            reason = f"Detected non-education domain signals ({', '.join(domains)}); kept as storage-only metadata."
            usage_policy = "storage_only"

        interpretations.append(
            {
                "columnName": col,
                "mappedField": mapped_field,
                "mappingSource": source,
                "confidenceBand": confidence_band,
                "usagePolicy": usage_policy,
                "reason": reason,
                "domainSignals": domains,
            }
        )

    return interpretations


def _validate_class_record_mapping(mapping: Dict[str, str]) -> Tuple[List[str], List[str]]:
    mapped_fields = set(mapping.values())
    missing_core_fields = sorted(CLASS_RECORD_IMPORT_CORE_FIELDS - mapped_fields)
    has_identity = bool(CLASS_RECORD_IDENTITY_FIELDS & mapped_fields)
    missing_identity = [] if has_identity else ["lrn_or_email"]
    return missing_core_fields, missing_identity


def _build_scoring_student_payload(row: Dict[str, Any], class_section_id: Optional[str]) -> Dict[str, Any]:
    return {
        "studentId": row.get("studentId"),
        "name": row.get("name"),
        "email": row.get("email"),
        "lrn": row.get("lrn"),
        "avgQuizScore": row.get("avgQuizScore"),
        "attendance": row.get("attendance"),
        "engagementScore": row.get("engagementScore"),
        "assignmentCompletion": row.get("assignmentCompletion"),
        "term": row.get("term"),
        "assessmentName": row.get("assessmentName"),
        "classSectionId": class_section_id,
    }


def _fallback_column_mapping(columns: List[str]) -> Dict[str, str]:
    mapping: Dict[str, str] = {}
    for col in columns:
        normalized = re.sub(r"[^a-z0-9]+", " ", col.lower()).strip()
        if not normalized:
            continue

        for field, aliases in CLASS_RECORD_FIELD_ALIASES.items():
            if any(alias in normalized for alias in aliases):
                if col not in mapping:
                    mapping[col] = field
                break

    return mapping


def _sanitize_column_mapping(raw_mapping: Any) -> Dict[str, str]:
    """Keep only non-empty string->known-field entries from AI mapping output."""
    if not isinstance(raw_mapping, dict):
        return {}

    sanitized: Dict[str, str] = {}
    for raw_col, raw_field in raw_mapping.items():
        column_name = _stringify_cell(raw_col)
        mapped_field = _stringify_cell(raw_field)
        if not column_name or not mapped_field:
            continue
        if mapped_field not in CLASS_RECORD_REQUIRED_FIELDS:
            continue
        sanitized[column_name] = mapped_field

    return sanitized


def _build_record_identity(
    student: Dict[str, Any],
    unknown_fields: Dict[str, Any],
) -> Tuple[str, str, str, str]:
    candidate_student_id = (
        str(student.get("lrn", "")).strip()
        or str(student.get("email", "")).strip().lower()
        or re.sub(r"\s+", "_", str(student.get("name", "")).strip().lower())
    )
    if not candidate_student_id:
        candidate_student_id = "unknown-student"

    term = str(student.get("term", "")).strip()
    if not term:
        for key, value in unknown_fields.items():
            if any(token in key for token in ("term", "quarter", "semester", "period")):
                term = str(value).strip()
                break
    if not term:
        term = "unspecified-term"

    assessment_name = str(student.get("assessmentName", "")).strip()
    if not assessment_name:
        for key, value in unknown_fields.items():
            if any(token in key for token in ("assessment", "exam", "quiz", "test", "activity", "title")):
                assessment_name = str(value).strip()
                break
    if not assessment_name:
        assessment_name = "general-assessment"

    dedup_seed = f"{candidate_student_id.lower()}|{term.lower()}|{assessment_name.lower()}"
    dedup_key = hashlib.sha1(dedup_seed.encode("utf-8")).hexdigest()[:28]
    return candidate_student_id, term, assessment_name, dedup_key


def _persist_class_record_import_artifact(
    request: Request,
    *,
    file_hash: str,
    file_name: str,
    file_type: str,
    column_mapping: Dict[str, str],
    normalized_rows: List[Dict[str, Any]],
    row_warnings: List[Dict[str, Any]],
    unknown_columns: List[str],
    parse_warnings: List[str],
    dataset_intent: str,
    column_interpretations: List[Dict[str, Any]],
    interpretation_summary: Dict[str, Any],
    class_section_id: Optional[str] = None,
    class_name: Optional[str] = None,
) -> Dict[str, Any]:
    if not (_firebase_ready and firebase_firestore):
        return {
            "persisted": False,
            "importId": None,
            "dedup": {"inserted": 0, "updated": 0},
            "warning": "Firestore unavailable; class records were not persisted.",
        }

    user = get_current_user(request)
    normalized_class_section_id = (class_section_id or "").strip() or None
    normalized_class_name = (class_name or "").strip() or None
    import_seed = f"{user.uid}|{normalized_class_section_id or 'global'}|{file_hash}"
    import_id = hashlib.sha1(import_seed.encode("utf-8")).hexdigest()[:28]

    import_payload: Dict[str, Any] = {
        "importId": import_id,
        "teacherId": user.uid,
        "teacherEmail": user.email,
        "fileName": file_name,
        "fileType": file_type,
        "fileHash": file_hash,
        "rowCount": len(normalized_rows),
        "columnMapping": column_mapping,
        "unknownColumns": unknown_columns,
        "parseWarnings": parse_warnings,
        "datasetIntent": dataset_intent,
        "columnInterpretations": column_interpretations,
        "interpretationSummary": interpretation_summary,
        "rowWarnings": row_warnings[:300],
        "source": "api_upload_class_records",
        "retentionDays": IMPORT_RETENTION_DAYS,
        "expiresAtEpoch": _artifact_expiry_epoch(),
        "updatedAt": FIRESTORE_SERVER_TIMESTAMP,
    }
    if normalized_class_section_id:
        import_payload["classSectionId"] = normalized_class_section_id
    if normalized_class_name:
        import_payload["className"] = normalized_class_name

    inserted = 0
    updated = 0
    try:
        imports_ref = firebase_firestore.client().collection("classRecordImports").document(import_id)
        import_doc = cast(Any, imports_ref.get())
        if not _snapshot_exists(import_doc):
            import_payload["createdAt"] = FIRESTORE_SERVER_TIMESTAMP
        imports_ref.set(import_payload, merge=True)

        client = firebase_firestore.client()
        normalized_ref = client.collection("normalizedClassRecords")
        batch = client.batch()
        batch_count = 0

        for row in normalized_rows:
            dedup_key = str(row.get("dedupKey", "")).strip()
            if not dedup_key:
                continue

            scoped_key_seed = f"{user.uid}|{normalized_class_section_id or 'global'}|{dedup_key}"
            scoped_key = hashlib.sha1(scoped_key_seed.encode("utf-8")).hexdigest()[:36]
            row_doc_ref = normalized_ref.document(scoped_key)
            existing_doc = cast(Any, row_doc_ref.get())

            payload = {
                **row,
                "recordId": scoped_key,
                "teacherId": user.uid,
                "teacherEmail": user.email,
                "importId": import_id,
                "sourceFile": file_name,
                "retentionDays": IMPORT_RETENTION_DAYS,
                "expiresAtEpoch": _artifact_expiry_epoch(),
                "updatedAt": FIRESTORE_SERVER_TIMESTAMP,
            }
            if normalized_class_section_id:
                payload["classSectionId"] = normalized_class_section_id
            if normalized_class_name:
                payload["className"] = normalized_class_name
            if not _snapshot_exists(existing_doc):
                payload["createdAt"] = FIRESTORE_SERVER_TIMESTAMP
                inserted += 1
            else:
                updated += 1

            batch.set(row_doc_ref, payload, merge=True)
            batch_count += 1
            if batch_count >= 400:
                batch.commit()
                batch = client.batch()
                batch_count = 0

        if batch_count > 0:
            batch.commit()
    except Exception as persistence_err:
        if _is_adc_missing_error(cast(Exception, persistence_err)):
            logger.warning("Class record persistence skipped because Firestore ADC is not configured.")
            return {
                "persisted": False,
                "importId": None,
                "dedup": {"inserted": 0, "updated": 0},
                "warning": (
                    "Firestore ADC is not configured; class records were parsed but not persisted. "
                    "Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_FILE, "
                    "or set GOOGLE_APPLICATION_CREDENTIALS."
                ),
            }
        raise

    return {
        "persisted": True,
        "importId": import_id,
        "dedup": {"inserted": inserted, "updated": updated},
        "warning": None,
    }


def _normalize_class_records(
    df: Any,
    *,
    file_name: str,
    file_hash: str,
    column_mapping: Dict[str, str],
) -> Dict[str, Any]:
    normalized_rows: List[Dict[str, Any]] = []
    row_warnings: List[Dict[str, Any]] = []
    rejected_rows: List[Dict[str, Any]] = []
    unknown_columns = sorted([col for col in df.columns if col not in column_mapping])
    inferred_rows = 0
    fallback_inference_rows = 0

    for idx, row in df.iterrows():
        student: Dict[str, Any] = {}
        unknown_fields: Dict[str, Any] = {}
        warnings_for_row: List[str] = []

        for col in df.columns:
            raw_value = row[col]
            mapped_field = column_mapping.get(col)
            if mapped_field in CLASS_RECORD_REQUIRED_FIELDS:
                student[mapped_field] = _stringify_cell(raw_value)
            else:
                text_val = _stringify_cell(raw_value)
                if text_val:
                    unknown_fields[_normalize_unknown_key(col)] = text_val

        student_name = str(student.get("name", "")).strip()
        if not student_name:
            rejected_rows.append(
                {
                    "row": int(idx) + 2,
                    "reason": "missing required field: name",
                }
            )
            continue

        lrn_value = str(student.get("lrn", "")).strip()
        email_value = str(student.get("email", "")).strip().lower()
        if not lrn_value and not email_value:
            rejected_rows.append(
                {
                    "row": int(idx) + 2,
                    "reason": "missing required identity value: lrn_or_email",
                }
            )
            continue

        defaulted_metrics: Set[str] = set()
        for field in ["engagementScore", "avgQuizScore", "attendance", "assignmentCompletion"]:
            numeric_value, parse_warning = _safe_numeric(student.get(field))
            student[field] = numeric_value
            if parse_warning:
                warnings_for_row.append(f"{field}: {parse_warning}")
                defaulted_metrics.add(field)

        student_id, term, assessment_name, dedup_key = _build_record_identity(student, unknown_fields)
        student["name"] = student_name
        student["email"] = email_value
        student["lrn"] = lrn_value
        student["term"] = term
        student["assessmentName"] = assessment_name

        has_topic_signal = bool(
            (assessment_name and assessment_name.lower() != "general-assessment")
            or any(
                any(token in str(key).lower() for token in ("topic", "unit", "lesson", "skill", "competency"))
                for key in unknown_fields.keys()
            )
        )
        inference = _infer_student_state(
            avg_quiz=float(student.get("avgQuizScore") or 0.0),
            attendance=float(student.get("attendance") or 0.0),
            engagement=float(student.get("engagementScore") or 0.0),
            defaulted_metrics=defaulted_metrics,
            has_topic_signal=has_topic_signal,
        )
        inferred_rows += 1
        if inference.get("fallbackUsed"):
            fallback_inference_rows += 1

        normalized_row = {
            **student,
            "unknownFields": unknown_fields,
            "sourceMeta": {
                "fileName": file_name,
                "fileHash": file_hash,
                "sourceRow": int(idx) + 2,
            },
            "studentId": student_id,
            "dedupKey": dedup_key,
            "riskLevel": inference["riskLevel"],
            "inferredState": {
                "state": inference["state"],
                "confidence": inference["confidence"],
                "signals": inference["signals"],
                "explanation": inference["explanation"],
                "fallbackUsed": inference["fallbackUsed"],
            },
        }

        normalized_rows.append(normalized_row)
        if warnings_for_row:
            row_warnings.append(
                {
                    "row": int(idx) + 2,
                    "warning": "; ".join(warnings_for_row),
                }
            )

    return {
        "rows": normalized_rows,
        "rowWarnings": row_warnings,
        "rejectedRows": rejected_rows,
        "unknownColumns": unknown_columns,
        "interpretedRows": len(normalized_rows),
        "rejectedRowsCount": len(rejected_rows),
        "rejectedReasonCounts": dict(Counter(item["reason"] for item in rejected_rows)),
        "inferredRows": inferred_rows,
        "fallbackInferenceRows": fallback_inference_rows,
    }


def _slugify_class_token(value: str) -> str:
    token = re.sub(r"[^a-z0-9]+", "_", str(value or "").strip().lower())
    return re.sub(r"_+", "_", token).strip("_")


def _resolve_import_class_context(
    *,
    class_section_id: Optional[str],
    class_name: Optional[str],
) -> Tuple[str, str, str, str]:
    normalized_section_id = (class_section_id or "").strip().lower()
    normalized_class_name = (class_name or "").strip()

    grade = "Grade 11"
    section = "Section A"

    if normalized_class_name and " - " in normalized_class_name:
        parts = [part.strip() for part in normalized_class_name.split(" - ", 1)]
        if parts[0]:
            grade = parts[0]
        if len(parts) > 1 and parts[1]:
            section = parts[1]

    if normalized_section_id:
        section_tokens = [token for token in normalized_section_id.split("_") if token]
        if section_tokens:
            if section_tokens[0].startswith("grade"):
                suffix = section_tokens[0].replace("grade", "").strip("_")
                if suffix:
                    grade = f"Grade {suffix}"
            elif section_tokens[0].isdigit():
                grade = f"Grade {section_tokens[0]}"
            elif "grade" in section_tokens[0]:
                grade = section_tokens[0].replace("_", " ").title()
            if len(section_tokens) > 1:
                section = " ".join(token.capitalize() for token in section_tokens[1:])
            elif len(section_tokens) == 1 and section_tokens[0] and section_tokens[0] != "grade":
                section = section or "Section A"

    if not normalized_section_id:
        normalized_section_id = _slugify_class_token(f"{grade}_{section}") or "grade_11_section_a"

    resolved_name = normalized_class_name or f"{grade} - {section}"
    return normalized_section_id, resolved_name, grade, section


def _derive_risk_level(avg_quiz: float, attendance: float, engagement: float) -> str:
    if avg_quiz < 60 or attendance < 75 or engagement < 55:
        return "High"
    if avg_quiz < 75 or attendance < 85 or engagement < 70:
        return "Medium"
    return "Low"


def _infer_student_state(
    *,
    avg_quiz: float,
    attendance: float,
    engagement: float,
    defaulted_metrics: Set[str],
    has_topic_signal: bool,
) -> Dict[str, Any]:
    risk_level = _derive_risk_level(avg_quiz, attendance, engagement)

    if risk_level == "High":
        if avg_quiz < 50 or attendance < 65 or engagement < 45:
            state = "urgent_intervention"
        else:
            state = "at_risk"
    elif risk_level == "Medium":
        state = "watchlist"
    else:
        state = "on_track"

    non_default_metrics = 3 - len(defaulted_metrics)
    completeness = max(0.0, min(1.0, float(non_default_metrics) / 3.0))

    threshold_gap = max(
        max(0.0, 60.0 - avg_quiz) / 60.0,
        max(0.0, 75.0 - attendance) / 75.0,
        max(0.0, 55.0 - engagement) / 55.0,
    )
    confidence = 0.45 + (0.45 * completeness) + (0.1 * min(1.0, threshold_gap))
    confidence = max(0.1, min(0.99, confidence))

    signals: List[str] = []
    if avg_quiz < 60:
        signals.append("low_avg_quiz_score")
    if attendance < 75:
        signals.append("low_attendance")
    if engagement < 55:
        signals.append("low_engagement")
    if defaulted_metrics:
        signals.append("fallback_defaulted_metrics")
    if not has_topic_signal:
        signals.append("fallback_general_topic_context")
    if not signals:
        signals.append("stable_core_metrics")

    explanation = (
        f"State inferred from avgQuizScore={avg_quiz:.1f}, attendance={attendance:.1f}, "
        f"engagementScore={engagement:.1f}."
    )

    return {
        "riskLevel": risk_level,
        "state": state,
        "confidence": round(confidence, 3),
        "signals": signals,
        "explanation": explanation,
        "fallbackUsed": bool(defaulted_metrics or not has_topic_signal),
    }


def _pick_weakest_topic(unknown_fields: Dict[str, Any]) -> str:
    for key, value in (unknown_fields or {}).items():
        if any(token in key for token in ("weak", "topic", "skill", "competency")):
            topic = _canonicalize_topic_label(str(value or "").strip())
            if topic:
                return topic
    return "Foundational Skills"


def _sync_imported_students_to_teacher_dashboard(
    request: Request,
    *,
    normalized_rows: List[Dict[str, Any]],
    class_section_id: Optional[str],
    class_name: Optional[str],
) -> Dict[str, Any]:
    fallback_class_section_id = (class_section_id or "").strip().lower() or None
    if not (_firebase_ready and firebase_firestore):
        return {
            "synced": False,
            "createdStudents": 0,
            "updatedStudents": 0,
            "classroomsTouched": 0,
            "classroomId": None,
            "classSectionId": fallback_class_section_id,
            "warning": "Firestore unavailable; dashboard sync skipped.",
        }

    try:
        user = get_current_user(request)
        resolved_section_id, resolved_class_name, grade, section = _resolve_import_class_context(
            class_section_id=class_section_id,
            class_name=class_name,
        )

        by_identity: Dict[str, Dict[str, Any]] = defaultdict(dict)
        for row in normalized_rows:
            name = str(row.get("name") or "").strip()
            email = str(row.get("email") or "").strip().lower()
            lrn = str(row.get("lrn") or "").strip()
            identity = lrn or email or re.sub(r"\s+", "_", name.lower())
            if not identity:
                continue

            state = by_identity.get(identity)
            if not state:
                state = {
                    "name": name,
                    "email": email,
                    "lrn": lrn,
                    "scores": [],
                    "attendance": [],
                    "engagement": [],
                    "completion": [],
                    "weakestTopic": "",
                }
                by_identity[identity] = state

            avg_quiz = float(row.get("avgQuizScore") or 0.0)
            attendance = float(row.get("attendance") or 0.0)
            engagement = float(row.get("engagementScore") or 0.0)
            completion = float(row.get("assignmentCompletion") or 0.0)

            state["scores"].append(avg_quiz)
            state["attendance"].append(attendance)
            state["engagement"].append(engagement)
            state["completion"].append(completion)
            if not state.get("weakestTopic"):
                state["weakestTopic"] = _pick_weakest_topic(row.get("unknownFields") or {})

            if name and not state.get("name"):
                state["name"] = name
            if email and not state.get("email"):
                state["email"] = email
            if lrn and not state.get("lrn"):
                state["lrn"] = lrn

        if not by_identity:
            return {
                "synced": False,
                "createdStudents": 0,
                "updatedStudents": 0,
                "classroomsTouched": 0,
                "classroomId": resolved_section_id,
                "classSectionId": resolved_section_id,
                "warning": "No normalized student records were available for dashboard sync.",
            }

        client = firebase_firestore.client()
        classrooms_ref = client.collection("classrooms")
        students_ref = client.collection("managedStudents")

        classroom_doc_id = resolved_section_id or f"imported_{hashlib.sha1((user.uid + resolved_class_name).encode('utf-8')).hexdigest()[:12]}"
        classroom_ref = classrooms_ref.document(classroom_doc_id)
        classroom_snapshot = cast(Any, classroom_ref.get())
        existing_classroom = _snapshot_to_dict(classroom_snapshot) if _snapshot_exists(classroom_snapshot) else {}

        created_students = 0
        updated_students = 0
        risk_high_count = 0
        total_score = 0.0

        for identity, aggregate in by_identity.items():
            scores = aggregate.get("scores") or [0.0]
            attendance_values = aggregate.get("attendance") or [0.0]
            engagement_values = aggregate.get("engagement") or [0.0]
            completion_values = aggregate.get("completion") or [0.0]

            avg_quiz = float(sum(scores) / max(len(scores), 1))
            avg_attendance = float(sum(attendance_values) / max(len(attendance_values), 1))
            avg_engagement = float(sum(engagement_values) / max(len(engagement_values), 1))
            avg_completion = float(sum(completion_values) / max(len(completion_values), 1))

            has_topic_signal = str(aggregate.get("weakestTopic") or "").strip() not in {"", "Foundational Skills"}
            inference = _infer_student_state(
                avg_quiz=avg_quiz,
                attendance=avg_attendance,
                engagement=avg_engagement,
                defaulted_metrics=set(),
                has_topic_signal=has_topic_signal,
            )
            risk_level = str(inference["riskLevel"])
            if risk_level == "High":
                risk_high_count += 1
            total_score += avg_quiz

            fallback_name = str(aggregate.get("name") or "Imported Student").strip() or "Imported Student"
            avatar_seed = urllib.parse.quote(fallback_name)
            student_doc_id = hashlib.sha1(f"{user.uid}|{identity}".encode("utf-8")).hexdigest()[:36]
            student_ref = students_ref.document(student_doc_id)
            student_snapshot = cast(Any, student_ref.get())

            payload: Dict[str, Any] = {
                "teacherId": user.uid,
                "name": fallback_name,
                "email": str(aggregate.get("email") or ""),
                "lrn": str(aggregate.get("lrn") or ""),
                "avatar": f"https://ui-avatars.com/api/?name={avatar_seed}&background=random",
                "grade": grade,
                "section": section,
                "classSectionId": resolved_section_id,
                "classroomId": classroom_doc_id,
                "riskLevel": risk_level,
                "inferredState": {
                    "state": inference["state"],
                    "confidence": inference["confidence"],
                    "signals": inference["signals"],
                    "explanation": inference["explanation"],
                    "fallbackUsed": inference["fallbackUsed"],
                },
                "stateConfidence": inference["confidence"],
                "stateSignals": inference["signals"],
                "engagementScore": round(avg_engagement, 1),
                "avgQuizScore": round(avg_quiz, 1),
                "weakestTopic": str(aggregate.get("weakestTopic") or "Foundational Skills"),
                "attendance": round(avg_attendance, 1),
                "assignmentCompletion": round(avg_completion, 1),
                "struggles": [str(aggregate.get("weakestTopic") or "Foundational Skills")],
                "lastActive": FIRESTORE_SERVER_TIMESTAMP,
                "updatedAt": FIRESTORE_SERVER_TIMESTAMP,
            }

            if _snapshot_exists(student_snapshot):
                updated_students += 1
            else:
                created_students += 1
                payload["createdAt"] = FIRESTORE_SERVER_TIMESTAMP

            student_ref.set(payload, merge=True)

        student_count = len(by_identity)
        class_average = round(total_score / max(student_count, 1), 1)

        classroom_payload: Dict[str, Any] = {
            "teacherId": user.uid,
            "name": resolved_class_name,
            "grade": grade,
            "section": section,
            "classSectionId": resolved_section_id,
            "schedule": str(existing_classroom.get("schedule") or "Mon-Fri"),
            "studentCount": student_count,
            "avgScore": class_average,
            "atRiskCount": risk_high_count,
            "updatedAt": FIRESTORE_SERVER_TIMESTAMP,
        }
        if not _snapshot_exists(classroom_snapshot):
            classroom_payload["createdAt"] = FIRESTORE_SERVER_TIMESTAMP

        classroom_ref.set(classroom_payload, merge=True)

        return {
            "synced": True,
            "createdStudents": created_students,
            "updatedStudents": updated_students,
            "classroomsTouched": 1,
            "classroomId": classroom_doc_id,
            "classSectionId": resolved_section_id,
            "warning": None,
        }
    except Exception as sync_err:
        if _is_adc_missing_error(cast(Exception, sync_err)):
            logger.warning("Dashboard sync skipped because Firestore ADC is not configured.")
            warning = (
                "Firestore ADC is not configured; dashboard sync skipped. "
                "Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_FILE, "
                "or set GOOGLE_APPLICATION_CREDENTIALS."
            )
        else:
            logger.warning(f"Dashboard sync skipped due Firestore error: {sync_err}")
            warning = f"Dashboard sync skipped due Firestore error: {sync_err}"
        return {
            "synced": False,
            "createdStudents": 0,
            "updatedStudents": 0,
            "classroomsTouched": 0,
            "classroomId": None,
            "classSectionId": fallback_class_section_id,
            "warning": warning,
        }


def _resolve_uploaded_files(
    *,
    file: Optional[UploadFile],
    files: Optional[List[UploadFile]],
    max_files: int = UPLOAD_MAX_FILES_PER_REQUEST,
) -> List[UploadFile]:
    resolved: List[UploadFile] = []
    if files:
        resolved.extend(files)
    if file is not None:
        # Keep backward compatibility for clients sending a single `file` field.
        resolved.append(file)

    unique_files: List[UploadFile] = []
    seen_keys: Set[Tuple[str, Optional[str]]] = set()
    for upload in resolved:
        key = ((upload.filename or "").strip(), upload.content_type)
        if key in seen_keys:
            continue
        seen_keys.add(key)
        unique_files.append(upload)

    if not unique_files:
        raise HTTPException(status_code=400, detail="At least one file is required")
    if len(unique_files) > max_files:
        raise HTTPException(status_code=400, detail=f"Too many files. Max allowed per request: {max_files}")
    return unique_files


def _artifact_expiry_epoch() -> int:
    return int(time.time()) + (IMPORT_RETENTION_DAYS * 24 * 60 * 60)


def _is_artifact_expired(data: Dict[str, Any]) -> bool:
    raw = data.get("expiresAtEpoch")
    if raw is None:
        return False
    try:
        return int(raw) <= int(time.time())
    except Exception:
        return False


def _write_access_audit_log(
    request: Request,
    *,
    action: str,
    status: str,
    class_section_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    if not (_firebase_ready and firebase_firestore):
        return

    try:
        user = get_current_user(request)
        payload: Dict[str, Any] = {
            "action": action,
            "status": status,
            "teacherId": user.uid,
            "teacherEmail": user.email,
            "role": user.role,
            "path": request.url.path,
            "method": request.method,
            "createdAt": FIRESTORE_SERVER_TIMESTAMP,
            "createdAtIso": datetime.now(timezone.utc).isoformat(),
        }
        normalized_class_section_id = (class_section_id or "").strip() or None
        if normalized_class_section_id:
            payload["classSectionId"] = normalized_class_section_id
        if metadata:
            payload["metadata"] = metadata

        firebase_firestore.client().collection("accessAuditLogs").add(payload)
    except Exception as audit_err:
        if _is_adc_missing_error(cast(Exception, audit_err)):
            _warn_firestore_audit_lookup_once(
                f"Access audit log skipped because Firestore ADC is not configured ({action})."
            )
        else:
            logger.warning(f"Access audit log failed ({action}): {audit_err}")


def _record_risk_refresh_event(
    *,
    teacher_id: str,
    teacher_email: Optional[str],
    class_section_id: Optional[str],
    refresh_id: str,
    status: str,
    students_queued: int,
    queued_at_epoch: int,
    started_at_epoch: Optional[int] = None,
    completed_at_epoch: Optional[int] = None,
    duration_ms: Optional[int] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    """Persist lightweight monitoring artifacts for queued risk refresh jobs."""
    if not (_firebase_ready and firebase_firestore):
        return

    try:
        client = firebase_firestore.client()
        now_iso = datetime.now(timezone.utc).isoformat()
        normalized_class_section_id = (class_section_id or "").strip() or None

        event_payload: Dict[str, Any] = {
            "refreshId": refresh_id,
            "status": status,
            "teacherId": teacher_id,
            "teacherEmail": teacher_email,
            "studentsQueued": students_queued,
            "queuedAtEpoch": queued_at_epoch,
            "startedAtEpoch": started_at_epoch,
            "completedAtEpoch": completed_at_epoch,
            "durationMs": duration_ms,
            "createdAt": FIRESTORE_SERVER_TIMESTAMP,
            "createdAtIso": now_iso,
        }
        if normalized_class_section_id:
            event_payload["classSectionId"] = normalized_class_section_id
        if metadata:
            event_payload["metadata"] = metadata
        client.collection("riskRefreshEvents").add(event_payload)

        job_ref = client.collection("riskRefreshJobs").document(refresh_id)
        job_update: Dict[str, Any] = {
            "refreshId": refresh_id,
            "status": status,
            "teacherId": teacher_id,
            "teacherEmail": teacher_email,
            "studentsQueued": students_queued,
            "queuedAtEpoch": queued_at_epoch,
            "startedAtEpoch": started_at_epoch,
            "completedAtEpoch": completed_at_epoch,
            "durationMs": duration_ms,
            "updatedAt": FIRESTORE_SERVER_TIMESTAMP,
            "updatedAtIso": now_iso,
        }
        if normalized_class_section_id:
            job_update["classSectionId"] = normalized_class_section_id
        if metadata:
            job_update["metadata"] = metadata

        existing_job = cast(Any, job_ref.get())
        if not _snapshot_exists(existing_job):
            job_update["createdAt"] = FIRESTORE_SERVER_TIMESTAMP
            job_update["createdAtIso"] = now_iso
        job_ref.set(job_update, merge=True)

        stats_ref = client.collection("riskRefreshStats").document(teacher_id)
        stats_doc = cast(Any, stats_ref.get())
        stats_data = _snapshot_to_dict(stats_doc) if _snapshot_exists(stats_doc) else {}
        queued_count = int(stats_data.get("queuedCount", 0) or 0)
        success_count = int(stats_data.get("successCount", 0) or 0)
        failed_count = int(stats_data.get("failedCount", 0) or 0)

        if status == "queued":
            queued_count += 1
        elif status == "success":
            success_count += 1
        elif status == "failed":
            failed_count += 1

        stats_payload: Dict[str, Any] = {
            "teacherId": teacher_id,
            "teacherEmail": teacher_email,
            "queuedCount": queued_count,
            "successCount": success_count,
            "failedCount": failed_count,
            "lastRefreshId": refresh_id,
            "lastStatus": status,
            "lastStudentsQueued": students_queued,
            "lastQueuedAtEpoch": queued_at_epoch,
            "lastStartedAtEpoch": started_at_epoch,
            "lastCompletedAtEpoch": completed_at_epoch,
            "lastDurationMs": duration_ms,
            "updatedAt": FIRESTORE_SERVER_TIMESTAMP,
            "updatedAtIso": now_iso,
        }
        if normalized_class_section_id:
            stats_payload["classSectionId"] = normalized_class_section_id
        if not _snapshot_exists(stats_doc):
            stats_payload["createdAt"] = FIRESTORE_SERVER_TIMESTAMP
            stats_payload["createdAtIso"] = now_iso

        stats_ref.set(stats_payload, merge=True)
    except Exception as monitor_err:
        logger.warning(f"Risk refresh monitor logging failed ({refresh_id}, {status}): {monitor_err}")


def _queue_post_import_risk_refresh(
    request: Request,
    *,
    students: List[Dict[str, Any]],
    column_mapping: Dict[str, str],
    class_section_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Queue non-blocking automation refresh after class-record imports."""
    if not students:
        return {
            "queued": False,
            "studentsQueued": 0,
            "reason": "No normalized students to process.",
            "refreshId": None,
            "queuedAtEpoch": None,
        }

    # Keep payload compact while preserving key risk-driving fields.
    compact_students = [_build_scoring_student_payload(row, class_section_id) for row in students]

    user = get_current_user(request)
    normalized_class_section_id = (class_section_id or "").strip() or None
    queued_at_epoch = int(time.time())
    refresh_seed = f"{user.uid}|{normalized_class_section_id or 'global'}|{queued_at_epoch}|{len(compact_students)}"
    refresh_id = hashlib.sha1(refresh_seed.encode("utf-8")).hexdigest()[:24]

    sanitized_mapping = _sanitize_column_mapping(column_mapping)
    payload = DataImportPayload(
        teacherId=user.uid,
        students=compact_students,
        columnMapping=sanitized_mapping,
    )

    _record_risk_refresh_event(
        teacher_id=user.uid,
        teacher_email=user.email,
        class_section_id=normalized_class_section_id,
        refresh_id=refresh_id,
        status="queued",
        students_queued=len(compact_students),
        queued_at_epoch=queued_at_epoch,
    )

    async def _run_automation_job() -> None:
        started_at_epoch = int(time.time())
        try:
            result = await automation_engine.handle_data_import(payload)
            completed_at_epoch = int(time.time())
            duration_ms = max(0, int((completed_at_epoch - started_at_epoch) * 1000))
            final_status = "success" if bool(getattr(result, "success", False)) else "failed"
            _record_risk_refresh_event(
                teacher_id=user.uid,
                teacher_email=user.email,
                class_section_id=normalized_class_section_id,
                refresh_id=refresh_id,
                status=final_status,
                students_queued=len(compact_students),
                queued_at_epoch=queued_at_epoch,
                started_at_epoch=started_at_epoch,
                completed_at_epoch=completed_at_epoch,
                duration_ms=duration_ms,
                metadata={
                    "automationSuccess": bool(getattr(result, "success", False)),
                    "message": str(getattr(result, "message", "") or ""),
                    "actionsCount": len(getattr(result, "actions", []) or []),
                },
            )
            logger.info(
                "Post-import automation completed for teacher %s (refreshId=%s, queued=%s, success=%s)",
                user.uid,
                refresh_id,
                len(compact_students),
                result.success,
            )
        except Exception as automation_exc:
            completed_at_epoch = int(time.time())
            duration_ms = max(0, int((completed_at_epoch - started_at_epoch) * 1000))
            _record_risk_refresh_event(
                teacher_id=user.uid,
                teacher_email=user.email,
                class_section_id=normalized_class_section_id,
                refresh_id=refresh_id,
                status="failed",
                students_queued=len(compact_students),
                queued_at_epoch=queued_at_epoch,
                started_at_epoch=started_at_epoch,
                completed_at_epoch=completed_at_epoch,
                duration_ms=duration_ms,
                metadata={
                    "error": str(automation_exc),
                },
            )
            logger.error(
                "Post-import automation failed for teacher %s (refreshId=%s): %s",
                user.uid,
                refresh_id,
                automation_exc,
            )

    asyncio.create_task(_run_automation_job())
    return {
        "queued": True,
        "studentsQueued": len(compact_students),
        "reason": None,
        "refreshId": refresh_id,
        "queuedAtEpoch": queued_at_epoch,
    }


@app.get("/api/upload/class-records/risk-refresh/recent")
async def get_recent_risk_refresh_status(
    request: Request,
    classSectionId: Optional[str] = Query(default=None),
    limit: int = Query(default=10, ge=1, le=50),
):
    """Return lightweight monitoring view for recent post-import risk refresh jobs."""
    try:
        user = get_current_user(request)
        if not (_firebase_ready and firebase_firestore):
            raise HTTPException(status_code=503, detail="Firestore unavailable")

        normalized_class_section_id = (classSectionId or "").strip() or None
        query = (
            firebase_firestore.client()
            .collection("riskRefreshJobs")
            .where("teacherId", "==", user.uid)
        )
        if normalized_class_section_id:
            query = query.where("classSectionId", "==", normalized_class_section_id)

        warnings: List[str] = []
        try:
            docs = (
                query
                .order_by("updatedAt", direction=FIRESTORE_QUERY_DESCENDING)
                .limit(limit)
                .stream()
            )
        except Exception:
            warnings.append("Risk refresh monitor used fallback query path without ordering.")
            docs = query.limit(limit).stream()

        jobs: List[Dict[str, Any]] = []
        for doc in docs:
            data = doc.to_dict() or {}
            jobs.append(
                {
                    "refreshId": str(data.get("refreshId") or doc.id),
                    "status": str(data.get("status") or "unknown"),
                    "studentsQueued": int(data.get("studentsQueued") or 0),
                    "classSectionId": data.get("classSectionId"),
                    "queuedAtEpoch": data.get("queuedAtEpoch"),
                    "startedAtEpoch": data.get("startedAtEpoch"),
                    "completedAtEpoch": data.get("completedAtEpoch"),
                    "durationMs": data.get("durationMs"),
                    "updatedAtIso": data.get("updatedAtIso"),
                    "metadata": data.get("metadata") or {},
                }
            )

        stats_doc = cast(Any, (
            firebase_firestore.client()
            .collection("riskRefreshStats")
            .document(user.uid)
            .get()
        ))
        stats_data = _snapshot_to_dict(stats_doc) if _snapshot_exists(stats_doc) else {}
        stats = {
            "queuedCount": int(stats_data.get("queuedCount", 0) or 0),
            "successCount": int(stats_data.get("successCount", 0) or 0),
            "failedCount": int(stats_data.get("failedCount", 0) or 0),
            "lastRefreshId": stats_data.get("lastRefreshId"),
            "lastStatus": stats_data.get("lastStatus"),
            "lastStudentsQueued": int(stats_data.get("lastStudentsQueued", 0) or 0),
            "lastQueuedAtEpoch": stats_data.get("lastQueuedAtEpoch"),
            "lastStartedAtEpoch": stats_data.get("lastStartedAtEpoch"),
            "lastCompletedAtEpoch": stats_data.get("lastCompletedAtEpoch"),
            "lastDurationMs": stats_data.get("lastDurationMs"),
            "updatedAtIso": stats_data.get("updatedAtIso"),
        }

        response_payload = {
            "success": True,
            "classSectionId": normalized_class_section_id,
            "stats": stats,
            "jobs": jobs,
            "warnings": warnings,
        }

        _write_access_audit_log(
            request,
            action="risk_refresh_monitor_read",
            status="success",
            class_section_id=normalized_class_section_id,
            metadata={
                "requestedLimit": limit,
                "returnedJobs": len(jobs),
                "warningsCount": len(warnings),
            },
        )

        return response_payload
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Risk refresh monitor lookup error: {e}")
        raise HTTPException(status_code=500, detail=f"Risk refresh monitor lookup error: {str(e)}")


@app.post("/api/upload/class-records")
async def upload_class_records(
    request: Request,
    file: Optional[UploadFile] = File(default=None),
    files: Optional[List[UploadFile]] = File(default=None),
    classSectionId: Optional[str] = Form(default=None),
    className: Optional[str] = Form(default=None),
    datasetIntent: str = Form(default="synthetic_student_records"),
):
    """Upload and parse class records (CSV, Excel, PDF) with AI column detection"""
    try:
        import pandas as pd  # type: ignore[import-not-found]

        enforce_rate_limit(request, "upload_class_records", UPLOAD_RATE_LIMIT_PER_MIN, 60)

        uploads = _resolve_uploaded_files(file=file, files=files)
        normalized_dataset_intent = (datasetIntent or "").strip() or "synthetic_student_records"
        if normalized_dataset_intent not in SUPPORTED_DATASET_INTENTS:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Unsupported datasetIntent. Allowed values: "
                    + ", ".join(sorted(SUPPORTED_DATASET_INTENTS))
                ),
            )

        all_students: List[Dict[str, Any]] = []
        all_unknown_columns: Set[str] = set()
        all_warnings: List[str] = []
        all_row_warnings: List[Dict[str, Any]] = []
        all_rejected_rows: List[Dict[str, Any]] = []
        all_column_interpretations: List[Dict[str, Any]] = []
        aggregate_interpretation = {
            "scoringColumns": 0,
            "displayColumns": 0,
            "storageOnlyColumns": 0,
            "lowConfidenceColumns": 0,
            "domainMismatchWarnings": 0,
        }
        aggregate_dedup = {"inserted": 0, "updated": 0}
        interpreted_rows_total = 0
        rejected_rows_total = 0
        inferred_rows_total = 0
        fallback_inference_rows_total = 0
        per_file_results: List[Dict[str, Any]] = []

        for upload in uploads:
            filename = upload.filename or ""
            ext = os.path.splitext(filename)[1].lower()
            file_warnings: List[str] = []
            file_row_warnings: List[Dict[str, Any]] = []
            file_rejected_rows: List[Dict[str, Any]] = []
            file_students: List[Dict[str, Any]] = []
            file_unknown_columns: List[str] = []
            file_column_mapping: Dict[str, str] = {}
            file_column_mapping_source: Dict[str, str] = {}
            file_column_interpretations: List[Dict[str, Any]] = []
            file_interpretation_summary: Dict[str, Any] = {
                "scoringColumns": 0,
                "displayColumns": 0,
                "storageOnlyColumns": 0,
                "lowConfidenceColumns": 0,
                "domainMismatchWarnings": 0,
            }
            file_dedup = {"inserted": 0, "updated": 0}
            file_import_id: Optional[str] = None
            file_interpreted_rows = 0
            file_rejected_rows_count = 0
            file_inferred_rows = 0
            file_fallback_inference_rows = 0

            try:
                if ext not in ALLOWED_UPLOAD_EXTENSIONS:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Unsupported file format: {filename}. Use .csv, .xlsx, .xls, or .pdf",
                    )

                if (upload.content_type or "").lower() not in ALLOWED_UPLOAD_MIME_TYPES:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Unsupported content type: {upload.content_type}",
                    )

                contents = await upload.read(UPLOAD_MAX_BYTES + 1)
                if len(contents) > UPLOAD_MAX_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail=f"File too large. Max allowed size is {UPLOAD_MAX_BYTES // (1024 * 1024)} MB.",
                    )

                df = None

                if ext == ".csv":
                    df = pd.read_csv(io.BytesIO(contents), on_bad_lines="skip")
                elif ext in {".xlsx", ".xls"}:
                    import openpyxl
                    df = pd.read_excel(io.BytesIO(contents))
                elif ext == ".pdf":
                    import pdfplumber
                    with pdfplumber.open(io.BytesIO(contents)) as pdf:
                        if len(pdf.pages) > UPLOAD_MAX_PDF_PAGES:
                            raise HTTPException(
                                status_code=413,
                                detail=f"PDF has too many pages. Max allowed pages: {UPLOAD_MAX_PDF_PAGES}",
                            )
                        tables = []
                        for page in pdf.pages:
                            page_tables = page.extract_tables()
                            if page_tables:
                                tables.extend(page_tables)
                        if tables and len(tables[0]) > 1:
                            df = pd.DataFrame(tables[0][1:], columns=tables[0][0])
                        else:
                            raise HTTPException(status_code=400, detail="No tables found in PDF")
                else:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Unsupported file format: {filename}. Use .csv, .xlsx, or .pdf",
                    )

                if df is None or df.empty:
                    raise HTTPException(status_code=400, detail="No data found in uploaded file")

                if df.shape[0] > UPLOAD_MAX_ROWS:
                    raise HTTPException(
                        status_code=413,
                        detail=f"Too many rows ({df.shape[0]}). Max allowed: {UPLOAD_MAX_ROWS}",
                    )

                if df.shape[1] > UPLOAD_MAX_COLS:
                    raise HTTPException(
                        status_code=413,
                        detail=f"Too many columns ({df.shape[1]}). Max allowed: {UPLOAD_MAX_COLS}",
                    )

                file_hash = hashlib.sha256(contents).hexdigest()

                # AI-powered column mapping
                columns_text = ", ".join(df.columns.tolist())

                prompt = f"""I have a spreadsheet with these columns: {columns_text}

Map each column to one of these standard fields (respond as JSON only):
- name (student full name)
- lrn (learner reference number)
- email (email address)
- engagementScore (engagement percentage)
- avgQuizScore (average quiz/test score)
- attendance (attendance percentage)

If a column doesn't match any field, skip it. Respond ONLY with a JSON object mapping original column names to field names. Example: {{\"Student Name\": \"name\", \"LRN\": \"lrn\"}}"""

                mapping_text = ""
                try:
                    mapping_text = await call_hf_chat_async(
                        messages=[{"role": "user", "content": prompt}],
                        max_tokens=300,
                        temperature=0.1,
                    )
                    json_start = mapping_text.find("{")
                    json_end = mapping_text.rfind("}") + 1
                    if json_start >= 0 and json_end > json_start:
                        ai_mapping = _sanitize_column_mapping(json.loads(mapping_text[json_start:json_end]))
                        file_column_mapping = dict(ai_mapping)
                        file_column_mapping_source = {col: "ai" for col in ai_mapping.keys()}
                    else:
                        file_column_mapping = {}
                        file_warnings.append("AI mapper returned no JSON; fallback mapper was used.")
                except Exception:
                    file_column_mapping = {}
                    file_warnings.append("AI mapper failed; fallback mapper was used.")

                fallback_mapping = _fallback_column_mapping(df.columns.tolist())
                for col, field in fallback_mapping.items():
                    if col not in file_column_mapping:
                        file_column_mapping[col] = field
                        file_column_mapping_source[col] = "fallback"

                file_column_mapping = _sanitize_column_mapping(file_column_mapping)

                missing_core_fields, missing_identity = _validate_class_record_mapping(file_column_mapping)
                if missing_core_fields:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "Missing required educational columns after mapping: "
                            + ", ".join(missing_core_fields)
                            + ". Add equivalent columns or rename headers before upload."
                        ),
                    )
                if missing_identity:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "Import requires at least one student identity column (lrn or email) to avoid record collisions."
                        ),
                    )

                non_education_matches = _detect_non_education_signals(df.columns.tolist())
                if non_education_matches:
                    file_warnings.append(
                        "Potential non-education columns detected; these columns will be stored but excluded from scoring: "
                        + ", ".join(sorted(non_education_matches.keys())[:12])
                    )

                file_column_interpretations = _build_column_interpretations(
                    columns=df.columns.tolist(),
                    mapping=file_column_mapping,
                    mapping_source=file_column_mapping_source,
                    non_education_matches=non_education_matches,
                )
                file_interpretation_summary = {
                    "scoringColumns": sum(1 for item in file_column_interpretations if item.get("usagePolicy") == "scoring"),
                    "displayColumns": sum(1 for item in file_column_interpretations if item.get("usagePolicy") == "display"),
                    "storageOnlyColumns": sum(1 for item in file_column_interpretations if item.get("usagePolicy") == "storage_only"),
                    "lowConfidenceColumns": sum(1 for item in file_column_interpretations if item.get("confidenceBand") == "low"),
                    "domainMismatchWarnings": len(non_education_matches),
                }

                normalized_result = _normalize_class_records(
                    df,
                    file_name=filename,
                    file_hash=file_hash,
                    column_mapping=file_column_mapping,
                )
                file_students = normalized_result["rows"]
                file_row_warnings = normalized_result["rowWarnings"]
                file_rejected_rows = normalized_result.get("rejectedRows") or []
                file_unknown_columns = normalized_result["unknownColumns"]
                file_interpreted_rows = int(normalized_result.get("interpretedRows") or len(file_students))
                file_rejected_rows_count = int(normalized_result.get("rejectedRowsCount") or len(file_rejected_rows))
                file_inferred_rows = int(normalized_result.get("inferredRows") or 0)
                file_fallback_inference_rows = int(normalized_result.get("fallbackInferenceRows") or 0)

                persistence_result = _persist_class_record_import_artifact(
                    request,
                    file_hash=file_hash,
                    file_name=filename,
                    file_type=ext.replace(".", ""),
                    column_mapping=file_column_mapping,
                    normalized_rows=file_students,
                    row_warnings=file_row_warnings,
                    unknown_columns=file_unknown_columns,
                    parse_warnings=file_warnings,
                    dataset_intent=normalized_dataset_intent,
                    column_interpretations=file_column_interpretations,
                    interpretation_summary=file_interpretation_summary,
                    class_section_id=classSectionId,
                    class_name=className,
                )
                if persistence_result.get("warning"):
                    file_warnings.append(str(persistence_result["warning"]))

                file_status = "success"
                if file_row_warnings or file_warnings:
                    file_status = "partial_success"
                if not file_students:
                    file_status = "failed"

                file_import_id = persistence_result.get("importId")
                file_dedup = persistence_result.get("dedup") or {"inserted": 0, "updated": 0}
            except HTTPException as file_exc:
                file_status = "failed"
                file_warnings.append(str(file_exc.detail))
            except Exception as file_exc:
                logger.error(f"Class records processing failed for {filename}: {file_exc}")
                file_status = "failed"
                file_warnings.append(f"Unexpected processing error: {str(file_exc)}")

            per_file_result = {
                "fileName": filename,
                "fileType": ext.replace(".", ""),
                "status": file_status,
                "students": file_students,
                "totalRows": len(file_students),
                "columnMapping": file_column_mapping,
                "unknownColumns": file_unknown_columns,
                "warnings": file_warnings,
                "rowWarnings": file_row_warnings,
                "rejectedRows": file_rejected_rows,
                "datasetIntent": normalized_dataset_intent,
                "columnInterpretations": file_column_interpretations,
                "interpretationSummary": file_interpretation_summary,
                "classSectionId": (classSectionId or "").strip() or None,
                "className": (className or "").strip() or None,
                "importId": file_import_id,
                "persisted": bool(file_import_id),
                "dedup": file_dedup,
                "interpretedRows": file_interpreted_rows,
                "rejectedRowsCount": file_rejected_rows_count,
                "inferredRows": file_inferred_rows,
                "fallbackInferenceRows": file_fallback_inference_rows,
            }
            per_file_results.append(per_file_result)

            all_students.extend(file_students)
            all_unknown_columns.update(file_unknown_columns)
            all_column_interpretations.extend(file_column_interpretations)
            all_rejected_rows.extend(
                [
                    {
                        "row": item.get("row"),
                        "reason": f"{filename}: {item.get('reason', '')}",
                    }
                    for item in file_rejected_rows
                ]
            )
            aggregate_interpretation["scoringColumns"] += int(file_interpretation_summary.get("scoringColumns", 0) or 0)
            aggregate_interpretation["displayColumns"] += int(file_interpretation_summary.get("displayColumns", 0) or 0)
            aggregate_interpretation["storageOnlyColumns"] += int(file_interpretation_summary.get("storageOnlyColumns", 0) or 0)
            aggregate_interpretation["lowConfidenceColumns"] += int(file_interpretation_summary.get("lowConfidenceColumns", 0) or 0)
            aggregate_interpretation["domainMismatchWarnings"] += int(file_interpretation_summary.get("domainMismatchWarnings", 0) or 0)
            aggregate_dedup["inserted"] += int(file_dedup.get("inserted", 0) or 0)
            aggregate_dedup["updated"] += int(file_dedup.get("updated", 0) or 0)
            interpreted_rows_total += file_interpreted_rows
            rejected_rows_total += file_rejected_rows_count
            inferred_rows_total += file_inferred_rows
            fallback_inference_rows_total += file_fallback_inference_rows
            all_warnings.extend([f"{filename}: {warning}" for warning in file_warnings])
            all_row_warnings.extend(
                [
                    {
                        "row": warning.get("row"),
                        "warning": f"{filename}: {warning.get('warning', '')}",
                    }
                    for warning in file_row_warnings
                ]
            )

        first_file_with_mapping = next(
            (f for f in per_file_results if f.get("columnMapping")),
            None,
        )
        first_file_with_import = next(
            (f for f in per_file_results if f.get("importId")),
            None,
        )
        successful_files = sum(1 for f in per_file_results if f.get("status") in {"success", "partial_success"})
        failed_files = len(per_file_results) - successful_files
        overall_success = successful_files > 0
        risk_refresh = _queue_post_import_risk_refresh(
            request,
            students=all_students,
            column_mapping=(first_file_with_mapping or {}).get("columnMapping") or {},
            class_section_id=(classSectionId or "").strip() or None,
        )
        dashboard_sync = _sync_imported_students_to_teacher_dashboard(
            request,
            normalized_rows=all_students,
            class_section_id=(classSectionId or "").strip() or None,
            class_name=(className or "").strip() or None,
        )
        if dashboard_sync.get("warning"):
            all_warnings.append(str(dashboard_sync["warning"]))

        persisted_rows = int(aggregate_dedup.get("inserted", 0) or 0) + int(aggregate_dedup.get("updated", 0) or 0)
        rejected_reason_counts = dict(Counter(item.get("reason", "unknown") for item in all_rejected_rows))
        inferred_coverage_pct = round((float(inferred_rows_total) / float(max(interpreted_rows_total, 1))) * 100.0, 1)

        response_payload = {
            "success": overall_success,
            "students": all_students,
            "columnMapping": (first_file_with_mapping or {}).get("columnMapping") or {},
            "datasetIntent": normalized_dataset_intent,
            "totalRows": len(all_students),
            "interpretedRows": interpreted_rows_total,
            "rejectedRows": rejected_rows_total,
            "rejectedRowDetails": all_rejected_rows,
            "rejectedReasons": rejected_reason_counts,
            "persistedRows": persisted_rows,
            "inferredStateCoverage": {
                "inferredRows": inferred_rows_total,
                "interpretedRows": interpreted_rows_total,
                "fallbackRows": fallback_inference_rows_total,
                "coveragePct": inferred_coverage_pct,
            },
            "unknownColumns": sorted(all_unknown_columns),
            "columnInterpretations": all_column_interpretations,
            "interpretationSummary": aggregate_interpretation,
            "warnings": all_warnings,
            "rowWarnings": all_row_warnings,
            "importId": (first_file_with_import or {}).get("importId"),
            "persisted": bool(first_file_with_import and first_file_with_import.get("importId")),
            "dedup": aggregate_dedup,
            "files": per_file_results,
            "summary": {
                "totalFiles": len(per_file_results),
                "successfulFiles": successful_files,
                "failedFiles": failed_files,
            },
            "riskRefresh": risk_refresh,
            "dashboardSync": dashboard_sync,
        }

        _write_access_audit_log(
            request,
            action="class_records_upload",
            status="success" if overall_success else "partial_failure",
            class_section_id=(classSectionId or "").strip() or None,
            metadata={
                "totalFiles": len(per_file_results),
                "successfulFiles": successful_files,
                "failedFiles": failed_files,
                "persisted": bool(first_file_with_import and first_file_with_import.get("importId")),
                "students": len(all_students),
                "interpretedRows": interpreted_rows_total,
                "rejectedRows": rejected_rows_total,
                "persistedRows": persisted_rows,
                "inferredRows": inferred_rows_total,
                "fallbackInferenceRows": fallback_inference_rows_total,
                "datasetIntent": normalized_dataset_intent,
                "storageOnlyColumns": int(aggregate_interpretation.get("storageOnlyColumns", 0) or 0),
                "domainMismatchWarnings": int(aggregate_interpretation.get("domainMismatchWarnings", 0) or 0),
                "dashboardSync": bool(dashboard_sync.get("synced")),
                "dashboardCreatedStudents": int(dashboard_sync.get("createdStudents") or 0),
                "dashboardUpdatedStudents": int(dashboard_sync.get("updatedStudents") or 0),
            },
        )

        return response_payload

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=f"File upload error: {str(e)}")


def _split_material_sections(text: str, max_sections: int = 20) -> List[Dict[str, str]]:
    blocks = [block.strip() for block in re.split(r"\n\s*\n", text) if block.strip()]
    sections: List[Dict[str, str]] = []
    for idx, block in enumerate(blocks[:max_sections]):
        lines = [line.strip() for line in block.splitlines() if line.strip()]
        if not lines:
            continue
        title_candidate = lines[0][:80]
        if len(lines) > 1 and len(title_candidate.split()) <= 12:
            title = title_candidate
            body = " ".join(lines[1:])
        else:
            title = f"Section {idx + 1}"
            body = " ".join(lines)
        preview = re.sub(r"\s+", " ", body).strip()[:220]
        sections.append(
            {
                "sectionId": f"section_{idx + 1}",
                "title": title,
                "preview": preview,
            }
        )
    return sections


def _fallback_topic_extraction(text: str, max_topics: int = 8) -> List[Dict[str, Any]]:
    stop_words = {
        "about", "after", "again", "algebra", "also", "because", "before", "being", "between",
        "could", "course", "each", "from", "have", "into", "lesson", "math", "module", "other",
        "should", "their", "there", "these", "they", "this", "those", "topic", "topics", "using",
        "will", "with", "your",
    }
    words = re.findall(r"\b[a-zA-Z][a-zA-Z\-]{3,}\b", text.lower())
    filtered = [w for w in words if w not in stop_words]
    if not filtered:
        return []

    counts = Counter(filtered)
    topics: List[Dict[str, Any]] = []
    for idx, (word, _) in enumerate(counts.most_common(max_topics)):
        title = word.replace("-", " ").title()
        topics.append(
            {
                "topicId": f"topic_{idx + 1}",
                "title": title,
                "description": f"Coverage area inferred from uploaded material around '{title}'.",
                "prerequisiteTopics": [],
            }
        )
    return topics


def _compute_material_source_legitimacy(
    *,
    file_type: str,
    file_hash: str,
    extracted_text: str,
    topics: List[Dict[str, Any]],
    warnings: List[str],
) -> Dict[str, Any]:
    issues: List[str] = []
    evidence_checked = [
        "file_type",
        "file_hash",
        "text_length",
        "topic_count",
        "extraction_warnings",
    ]

    score = 1.0
    normalized_type = (file_type or "").strip().lower()
    if normalized_type not in {"pdf", "docx", "txt"}:
        issues.append(f"Unsupported source type '{normalized_type}'.")
        score -= 0.7

    if not (file_hash or "").strip():
        issues.append("Source file hash is missing.")
        score -= 0.6

    text_length = len(extracted_text or "")
    if text_length < LESSON_SOURCE_MIN_TEXT_LENGTH:
        issues.append(
            f"Extracted text is too short ({text_length} chars); minimum is {LESSON_SOURCE_MIN_TEXT_LENGTH}."
        )
        score -= 0.5

    topic_count = len(topics or [])
    if topic_count < LESSON_SOURCE_MIN_TOPICS:
        issues.append(
            f"Insufficient extracted topics ({topic_count}); minimum is {LESSON_SOURCE_MIN_TOPICS}."
        )
        score -= 0.5

    warning_hits = [w for w in (warnings or []) if "fallback" in str(w).lower() or "failed" in str(w).lower()]
    if warning_hits:
        issues.append("Source extraction had fallback/failure warnings that require review.")
        score -= min(0.4, 0.15 * len(warning_hits))

    score = max(0.0, min(1.0, score))
    if score >= 0.75:
        status = "verified"
    elif score >= 0.45:
        status = "review_required"
    else:
        status = "rejected"

    return {
        "status": status,
        "score": round(score, 3),
        "issues": issues,
        "evidenceChecked": evidence_checked,
        "checkedAtIso": datetime.now(timezone.utc).isoformat(),
    }


def _evaluate_lesson_source_legitimacy(
    imported_topics_payload: Dict[str, Any],
    *,
    allow_review_sources: bool,
) -> Dict[str, Any]:
    materials = imported_topics_payload.get("materials") or []
    verified_materials = 0
    review_materials = 0
    rejected_materials = 0
    issues: List[str] = []
    evidence_checked = ["artifact_legitimacy", "material_metadata", "topic_provenance"]
    scores: List[float] = []

    for material in materials:
        legitimacy = material.get("sourceLegitimacy") or {}
        status = str(legitimacy.get("status") or "review_required").strip().lower()
        score = float(legitimacy.get("score") or 0.0)
        scores.append(max(0.0, min(1.0, score)))

        if status == "verified":
            verified_materials += 1
        elif status == "review_required":
            review_materials += 1
        else:
            rejected_materials += 1
            issues.extend([str(x) for x in (legitimacy.get("issues") or []) if str(x).strip()])

    average_score = round(sum(scores) / len(scores), 3) if scores else 0.0

    if rejected_materials > 0:
        status = "rejected"
    elif review_materials > 0:
        status = "review_required"
    else:
        status = "verified" if verified_materials > 0 else "review_required"

    if status == "review_required" and not allow_review_sources:
        issues.append("Source legitimacy requires review. Enable allowReviewSources to proceed.")
    if status == "rejected":
        issues.append("One or more imported sources failed legitimacy checks.")

    return {
        "status": status,
        "score": average_score,
        "verifiedMaterials": verified_materials,
        "reviewMaterials": review_materials,
        "rejectedMaterials": rejected_materials,
        "evidenceChecked": evidence_checked,
        "issues": sorted(list({issue for issue in issues if issue.strip()})),
    }


def _persist_course_material_artifact(
    request: Request,
    *,
    file_hash: str,
    file_name: str,
    file_type: str,
    extracted_text: str,
    sections: List[Dict[str, Any]],
    topics: List[Dict[str, Any]],
    warnings: List[str],
    class_section_id: Optional[str] = None,
    class_name: Optional[str] = None,
) -> Dict[str, Any]:
    if not (_firebase_ready and firebase_firestore):
        return {
            "persisted": False,
            "materialId": None,
            "warning": "Firestore unavailable; material was not persisted.",
            "sourceLegitimacy": {
                "status": "review_required",
                "score": 0.0,
                "issues": ["Firestore unavailable; source legitimacy metadata not persisted."],
                "evidenceChecked": [],
            },
        }

    user = get_current_user(request)
    normalized_class_section_id = (class_section_id or "").strip() or None
    normalized_class_name = (class_name or "").strip() or None
    dedup_seed = f"{user.uid}|{normalized_class_section_id or 'global'}|{file_hash}"
    material_id = hashlib.sha1(dedup_seed.encode("utf-8")).hexdigest()[:28]
    source_legitimacy = _compute_material_source_legitimacy(
        file_type=file_type,
        file_hash=file_hash,
        extracted_text=extracted_text,
        topics=topics,
        warnings=warnings,
    )

    doc_payload: Dict[str, Any] = {
        "materialId": material_id,
        "teacherId": user.uid,
        "teacherEmail": user.email,
        "fileName": file_name,
        "fileType": file_type,
        "fileHash": file_hash,
        "extractedTextLength": len(extracted_text),
        "extractedTextPreview": extracted_text[:3000],
        "sections": sections,
        "topics": topics,
        "warnings": warnings,
        "sourceLegitimacy": source_legitimacy,
        "source": "api_upload_course_materials",
        "retentionDays": IMPORT_RETENTION_DAYS,
        "expiresAtEpoch": _artifact_expiry_epoch(),
        "updatedAt": FIRESTORE_SERVER_TIMESTAMP,
    }
    if normalized_class_section_id:
        doc_payload["classSectionId"] = normalized_class_section_id
    if normalized_class_name:
        doc_payload["className"] = normalized_class_name

    materials_ref = firebase_firestore.client().collection("courseMaterials").document(material_id)
    existing = cast(Any, materials_ref.get())
    if not _snapshot_exists(existing):
        doc_payload["createdAt"] = FIRESTORE_SERVER_TIMESTAMP

    materials_ref.set(doc_payload, merge=True)
    return {
        "persisted": True,
        "materialId": material_id,
        "warning": None,
        "sourceLegitimacy": source_legitimacy,
    }


def _load_persisted_course_material_topics(
    request: Request,
    *,
    class_section_id: Optional[str] = None,
    material_id: Optional[str] = None,
    limit_materials: int = 20,
) -> Dict[str, Any]:
    if not (_firebase_ready and firebase_firestore):
        return {
            "topics": [],
            "materials": [],
            "warnings": ["Firestore unavailable; imported topic lookup skipped."],
        }

    user = get_current_user(request)
    normalized_class_section_id = (class_section_id or "").strip() or None
    normalized_material_id = (material_id or "").strip() or None

    try:
        query = (
            firebase_firestore.client()
            .collection("courseMaterials")
            .where("teacherId", "==", user.uid)
        )
        if normalized_class_section_id:
            query = query.where("classSectionId", "==", normalized_class_section_id)
        if normalized_material_id:
            query = query.where("materialId", "==", normalized_material_id)
    except Exception as e:
        warning = (
            "Firestore ADC is not configured; imported topic lookup skipped."
            if _is_adc_missing_error(e)
            else "Firestore lookup unavailable; imported topic lookup skipped."
        )
        _warn_firestore_topics_lookup_once(f"{warning} Error: {e}")
        return {
            "topics": [],
            "materials": [],
            "warnings": [warning],
        }

    warnings: List[str] = []
    try:
        docs = (
            query
            .order_by("updatedAt", direction=FIRESTORE_QUERY_DESCENDING)
            .limit(limit_materials)
            .stream()
        )
    except Exception as stream_error:
        # Fallback for index limitations on combined where+order queries.
        warnings.append("Topic lookup used fallback query path without ordering.")
        try:
            docs = query.limit(limit_materials).stream()
        except Exception as fallback_error:
            chosen_error = fallback_error or stream_error
            warning = (
                "Firestore ADC is not configured; imported topic lookup skipped."
                if _is_adc_missing_error(cast(Exception, chosen_error))
                else "Firestore lookup unavailable; imported topic lookup skipped."
            )
            _warn_firestore_topics_lookup_once(f"{warning} Error: {chosen_error}")
            return {
                "topics": [],
                "materials": [],
                "warnings": [warning],
            }

    materials: List[Dict[str, Any]] = []
    deduped_topics: Dict[str, Dict[str, Any]] = {}
    expired_count = 0
    for doc in docs:
        data = doc.to_dict() or {}
        if _is_artifact_expired(data):
            expired_count += 1
            continue

        doc_material_id = str(data.get("materialId") or doc.id)
        doc_file_name = str(data.get("fileName") or "")
        doc_class_section_id = data.get("classSectionId")
        doc_class_name = data.get("className")
        topics = data.get("topics") or []

        materials.append(
            {
                "materialId": doc_material_id,
                "fileName": doc_file_name,
                "fileType": str(data.get("fileType") or ""),
                "fileHash": str(data.get("fileHash") or ""),
                "extractedTextLength": int(data.get("extractedTextLength") or 0),
                "classSectionId": doc_class_section_id,
                "className": doc_class_name,
                "topicsCount": len(topics),
                "sourceLegitimacy": data.get("sourceLegitimacy") or {
                    "status": "review_required",
                    "score": 0.0,
                    "issues": ["Missing source legitimacy metadata."],
                    "evidenceChecked": [],
                },
            }
        )

        for idx, topic in enumerate(topics):
            title = str(topic.get("title") or "").strip()
            if not title:
                continue

            topic_id = str(topic.get("topicId") or f"topic_{idx + 1}")
            description = str(topic.get("description") or "").strip()
            prerequisite_topics = [
                str(item).strip()
                for item in (topic.get("prerequisiteTopics") or [])
                if str(item).strip()
            ]
            source_files = [
                str(item).strip()
                for item in (topic.get("sourceFiles") or [doc_file_name])
                if str(item).strip()
            ]

            dedup_key = re.sub(r"\s+", " ", title.lower()).strip()
            if dedup_key not in deduped_topics:
                deduped_topics[dedup_key] = {
                    "topicId": topic_id,
                    "title": title,
                    "description": description,
                    "prerequisiteTopics": prerequisite_topics,
                    "sourceFiles": source_files,
                    "materialId": doc_material_id,
                    "sourceFile": source_files[0] if source_files else doc_file_name,
                    "sectionId": None,
                    "classSectionId": doc_class_section_id,
                    "className": doc_class_name,
                }

    if expired_count > 0:
        warnings.append(f"{expired_count} expired course-material artifact(s) were excluded by retention policy.")

    return {
        "topics": list(deduped_topics.values()),
        "materials": materials,
        "warnings": warnings,
    }


@app.post("/api/upload/course-materials")
async def upload_course_materials(
    request: Request,
    file: Optional[UploadFile] = File(default=None),
    files: Optional[List[UploadFile]] = File(default=None),
    classSectionId: Optional[str] = Form(default=None),
    className: Optional[str] = Form(default=None),
):
    """Upload and extract curriculum topics from course materials (PDF, DOCX, TXT)."""
    try:
        enforce_rate_limit(request, "upload_course_materials", UPLOAD_RATE_LIMIT_PER_MIN, 60)

        uploads = _resolve_uploaded_files(file=file, files=files)
        normalized_class_section_id = (classSectionId or "").strip() or None
        normalized_class_name = (className or "").strip() or None

        all_sections: List[Dict[str, Any]] = []
        all_topics: List[Dict[str, Any]] = []
        all_warnings: List[str] = []
        per_file_results: List[Dict[str, Any]] = []

        for upload in uploads:
            filename = upload.filename or ""
            ext = os.path.splitext(filename)[1].lower()
            file_warnings: List[str] = []
            file_sections: List[Dict[str, Any]] = []
            file_topics: List[Dict[str, Any]] = []
            file_hash: Optional[str] = None
            material_id: Optional[str] = None
            persisted = False
            source_legitimacy: Dict[str, Any] = {
                "status": "review_required",
                "score": 0.0,
                "issues": [],
                "evidenceChecked": [],
            }
            extracted_text_length = 0

            try:
                if ext not in ALLOWED_COURSE_MATERIAL_EXTENSIONS:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Unsupported file format: {filename}. Use .pdf, .docx, or .txt",
                    )

                if (upload.content_type or "").lower() not in ALLOWED_COURSE_MATERIAL_MIME_TYPES:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Unsupported content type: {upload.content_type}",
                    )

                contents = await upload.read(UPLOAD_MAX_BYTES + 1)
                if len(contents) > UPLOAD_MAX_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail=f"File too large. Max allowed size is {UPLOAD_MAX_BYTES // (1024 * 1024)} MB.",
                    )

                extracted_text = ""
                file_hash = hashlib.sha256(contents).hexdigest()

                if ext == ".pdf":
                    import pdfplumber

                    with pdfplumber.open(io.BytesIO(contents)) as pdf:
                        if len(pdf.pages) > UPLOAD_MAX_PDF_PAGES:
                            raise HTTPException(
                                status_code=413,
                                detail=f"PDF has too many pages. Max allowed pages: {UPLOAD_MAX_PDF_PAGES}",
                            )

                        page_texts: List[str] = []
                        for page in pdf.pages:
                            text = page.extract_text() or ""
                            if text.strip():
                                page_texts.append(text)
                        extracted_text = "\n\n".join(page_texts)
                elif ext == ".docx":
                    import importlib

                    docx_module = importlib.import_module("docx")
                    doc = docx_module.Document(io.BytesIO(contents))
                    paragraphs = [p.text.strip() for p in doc.paragraphs if p.text and p.text.strip()]
                    extracted_text = "\n\n".join(paragraphs)
                elif ext == ".txt":
                    extracted_text = contents.decode("utf-8", errors="ignore")

                extracted_text = re.sub(r"\s+", " ", extracted_text).strip()
                if not extracted_text:
                    raise HTTPException(
                        status_code=400,
                        detail="No readable text found in uploaded course material",
                    )

                extracted_text_length = len(extracted_text)
                sections = _split_material_sections(extracted_text)
                prompt_excerpt = extracted_text[:7000]
                topic_prompt = f"""Extract classroom math curriculum topics from this course material text.

Return JSON only in this exact shape:
{{
  "topics": [
    {{
      "title": "...",
      "description": "...",
      "prerequisiteTopics": ["..."]
    }}
  ]
}}

Rules:
- Keep topics concise and teacher-friendly.
- Include at most 10 topics.
- Use empty prerequisiteTopics when unknown.

TEXT:
{prompt_excerpt}
"""

                extracted_topics: List[Dict[str, Any]] = []
                try:
                    topic_text = await call_hf_chat_async(
                        messages=[{"role": "user", "content": topic_prompt}],
                        max_tokens=700,
                        temperature=0.1,
                    )
                    json_start = topic_text.find("{")
                    json_end = topic_text.rfind("}") + 1
                    topic_payload: Dict[str, Any] = {}
                    if json_start >= 0 and json_end > json_start:
                        topic_payload = json.loads(topic_text[json_start:json_end])

                    for idx, topic in enumerate((topic_payload.get("topics") or [])[:10]):
                        title = str(topic.get("title", "")).strip()
                        if not title:
                            continue
                        desc = str(topic.get("description", "")).strip() or f"Curriculum content related to {title}."
                        prereq_raw = topic.get("prerequisiteTopics") or []
                        prereq = [str(p).strip() for p in prereq_raw if str(p).strip()]
                        extracted_topics.append(
                            {
                                "topicId": f"topic_{idx + 1}",
                                "title": title,
                                "description": desc,
                                "prerequisiteTopics": prereq,
                            }
                        )
                except Exception as topic_err:
                    logger.warning(f"Topic extraction via AI failed: {topic_err}")

                if not extracted_topics:
                    file_warnings.append("AI topic extraction fallback was used.")
                    extracted_topics = _fallback_topic_extraction(extracted_text)

                file_topics = [
                    {
                        **topic,
                        "sourceFiles": [filename],
                    }
                    for topic in extracted_topics
                ]

                file_sections = [
                    {
                        **section,
                        "sourceFile": filename,
                    }
                    for section in sections
                ]

                persistence_result = _persist_course_material_artifact(
                    request,
                    file_hash=file_hash,
                    file_name=filename,
                    file_type=ext.replace(".", ""),
                    extracted_text=extracted_text,
                    sections=file_sections,
                    topics=file_topics,
                    warnings=file_warnings,
                    class_section_id=classSectionId,
                    class_name=className,
                )
                if persistence_result.get("warning"):
                    file_warnings.append(str(persistence_result["warning"]))
                material_id = persistence_result.get("materialId")
                persisted = bool(persistence_result.get("persisted"))
                source_legitimacy = cast(Dict[str, Any], persistence_result.get("sourceLegitimacy") or source_legitimacy)

                file_status = "success" if not file_warnings else "partial_success"
            except HTTPException as file_exc:
                file_status = "failed"
                file_warnings.append(str(file_exc.detail))
            except Exception as file_exc:
                logger.error(f"Course material processing failed for {filename}: {file_exc}")
                file_status = "failed"
                file_warnings.append(f"Unexpected processing error: {str(file_exc)}")

            file_result = {
                "fileName": filename,
                "fileType": ext.replace(".", ""),
                "status": file_status,
                "fileHash": file_hash,
                "materialId": material_id,
                "persisted": persisted,
                "sourceLegitimacy": source_legitimacy,
                "classSectionId": normalized_class_section_id,
                "className": normalized_class_name,
                "extractedTextLength": extracted_text_length,
                "sections": file_sections,
                "topics": file_topics,
                "warnings": file_warnings,
            }
            per_file_results.append(file_result)
            all_sections.extend(file_sections)
            all_topics.extend(file_topics)
            all_warnings.extend([f"{filename}: {warning}" for warning in file_warnings])

        first_successful = next(
            (f for f in per_file_results if f.get("status") in {"success", "partial_success"}),
            None,
        )
        successful_files = sum(1 for f in per_file_results if f.get("status") in {"success", "partial_success"})
        failed_files = len(per_file_results) - successful_files
        total_extracted_text_length = sum(int(f.get("extractedTextLength", 0) or 0) for f in per_file_results)

        response_payload = {
            "success": successful_files > 0,
            "fileName": (first_successful or {}).get("fileName", ""),
            "fileType": (first_successful or {}).get("fileType", ""),
            "fileHash": (first_successful or {}).get("fileHash"),
            "materialId": (first_successful or {}).get("materialId"),
            "persisted": bool(first_successful and first_successful.get("persisted")),
            "classSectionId": normalized_class_section_id,
            "className": normalized_class_name,
            "extractedTextLength": total_extracted_text_length,
            "sections": all_sections,
            "topics": all_topics,
            "warnings": all_warnings,
            "files": per_file_results,
            "summary": {
                "totalFiles": len(per_file_results),
                "successfulFiles": successful_files,
                "failedFiles": failed_files,
            },
        }

        _write_access_audit_log(
            request,
            action="course_material_upload",
            status="success" if successful_files > 0 else "failure",
            class_section_id=normalized_class_section_id,
            metadata={
                "totalFiles": len(per_file_results),
                "successfulFiles": successful_files,
                "failedFiles": failed_files,
                "totalTopics": len(all_topics),
                "persisted": bool(first_successful and first_successful.get("persisted")),
            },
        )

        return response_payload

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Course material upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Course material upload error: {str(e)}")


@app.get("/api/upload/course-materials/recent")
async def get_recent_course_materials(
    request: Request,
    classSectionId: Optional[str] = Query(default=None),
    limit: int = Query(default=10, ge=1, le=50),
):
    """List recent uploaded course materials for the authenticated teacher/admin."""
    try:
        user = get_current_user(request)
        if not (_firebase_ready and firebase_firestore):
            raise HTTPException(status_code=503, detail="Firestore unavailable")

        normalized_class_section_id = (classSectionId or "").strip() or None

        query = (
            firebase_firestore.client()
            .collection("courseMaterials")
            .where("teacherId", "==", user.uid)
        )
        if normalized_class_section_id:
            query = query.where("classSectionId", "==", normalized_class_section_id)

        warnings: List[str] = []
        try:
            docs = (
                query
                .order_by("updatedAt", direction=FIRESTORE_QUERY_DESCENDING)
                .limit(limit)
                .stream()
            )
        except Exception:
            warnings.append("Course-material lookup used fallback query path without ordering.")
            docs = query.limit(limit).stream()

        materials: List[Dict[str, Any]] = []
        expired_count = 0
        for doc in docs:
            data = doc.to_dict() or {}
            if _is_artifact_expired(data):
                expired_count += 1
                continue

            topics = data.get("topics") or []
            created_at = data.get("createdAt")
            updated_at = data.get("updatedAt")
            created_at_iso = created_at.isoformat() if created_at is not None and hasattr(created_at, "isoformat") else None
            updated_at_iso = updated_at.isoformat() if updated_at is not None and hasattr(updated_at, "isoformat") else None

            materials.append(
                {
                    "materialId": data.get("materialId") or doc.id,
                    "fileName": data.get("fileName", ""),
                    "fileType": data.get("fileType", ""),
                    "classSectionId": data.get("classSectionId"),
                    "className": data.get("className"),
                    "topicsCount": len(topics),
                    "topicTitles": [str(t.get("title", "")).strip() for t in topics[:5] if str(t.get("title", "")).strip()],
                    "extractedTextLength": int(data.get("extractedTextLength", 0) or 0),
                    "retentionDays": int(data.get("retentionDays", IMPORT_RETENTION_DAYS) or IMPORT_RETENTION_DAYS),
                    "expiresAtEpoch": data.get("expiresAtEpoch"),
                    "createdAt": created_at_iso,
                    "updatedAt": updated_at_iso,
                }
            )

        if expired_count > 0:
            warnings.append(f"{expired_count} expired course-material artifact(s) were excluded by retention policy.")

        response_payload = {
            "success": True,
            "classSectionId": normalized_class_section_id,
            "materials": materials,
            "warnings": warnings,
        }

        _write_access_audit_log(
            request,
            action="course_material_recent_read",
            status="success",
            class_section_id=normalized_class_section_id,
            metadata={
                "requestedClassSectionId": normalized_class_section_id,
                "requestedLimit": limit,
                "returnedMaterials": len(materials),
                "expiredExcluded": expired_count,
                "warningsCount": len(warnings),
            },
        )

        return response_payload

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Recent course materials lookup error: {e}")
        raise HTTPException(status_code=500, detail=f"Recent materials lookup error: {str(e)}")


@app.get("/api/course-materials/topics")
async def get_course_material_topics(
    request: Request,
    classSectionId: Optional[str] = Query(default=None),
    materialId: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=50),
):
    """Return persisted course-material topic map for the authenticated teacher/admin."""
    try:
        normalized_class_section_id = (classSectionId or "").strip() or None
        payload = _load_persisted_course_material_topics(
            request,
            class_section_id=normalized_class_section_id,
            material_id=materialId,
            limit_materials=limit,
        )
        response_payload = {
            "success": True,
            "classSectionId": normalized_class_section_id,
            "materialId": (materialId or "").strip() or None,
            "topics": payload.get("topics", []),
            "materials": payload.get("materials", []),
            "warnings": payload.get("warnings", []),
        }

        _write_access_audit_log(
            request,
            action="course_material_topics_read",
            status="success",
            class_section_id=normalized_class_section_id,
            metadata={
                "limit": limit,
                "materialId": (materialId or "").strip() or None,
                "topicsReturned": len(payload.get("topics", [])),
                "materialsReturned": len(payload.get("materials", [])),
                "warningsCount": len(payload.get("warnings", [])),
            },
        )

        return response_payload
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Course material topics lookup error: {e}")
        raise HTTPException(status_code=500, detail=f"Course materials topics lookup error: {str(e)}")


# ─── Quiz Maker Models ────────────────────────────────────────

VALID_QUESTION_TYPES = [
    "identification",
    "enumeration",
    "multiple_choice",
    "word_problem",
    "equation_based",
]

VALID_BLOOM_LEVELS = ["remember", "understand", "apply", "analyze"]

VALID_DIFFICULTY_LEVELS = ["easy", "medium", "hard"]

# ── Quiz generation hard limits ────────────────────────────────
# Moderate classroom profile: supports longer quizzes while keeping
# generation latency and payload size manageable across providers.
MAX_QUESTIONS_LIMIT = 30
MAX_TOPICS_LIMIT = 12


class QuizGenerationRequest(BaseModel):
    topics: List[str] = Field(..., min_length=1, description="Specific math topics to cover")
    gradeLevel: str = Field(..., description="Student grade level (e.g., 'Grade 7', 'Grade 10', 'College')")
    numQuestions: int = Field(default=10, ge=1, le=MAX_QUESTIONS_LIMIT, description="Number of questions to generate (max 30)")
    questionTypes: List[str] = Field(
        default=["multiple_choice", "identification", "word_problem"],
        description="Types of questions to include",
    )
    includeGraphs: bool = Field(default=False, description="Include graph-based identification questions")
    difficultyDistribution: Dict[str, int] = Field(
        default={"easy": 30, "medium": 50, "hard": 20},
        description="Percentage distribution per difficulty level",
    )
    bloomLevels: List[str] = Field(
        default=["remember", "understand", "apply", "analyze"],
        description="Bloom's Taxonomy cognitive levels",
    )
    excludeTopics: List[str] = Field(
        default_factory=list,
        description="Topics the class is already competent in — these will be excluded",
    )
    classSectionId: Optional[str] = Field(default=None, description="Optional class section context for imported topics")
    className: Optional[str] = Field(default=None, description="Optional class name context for metadata")
    materialId: Optional[str] = Field(default=None, description="Optional specific course-material artifact ID")
    preferImportedTopics: bool = Field(
        default=True,
        description="When true, prioritise persisted imported topics for generation when available",
    )

    @field_validator("questionTypes")
    @classmethod
    def validate_question_types(cls, values: List[str]) -> List[str]:
        for value in values:
            if value not in VALID_QUESTION_TYPES:
                raise ValueError(f"Invalid question type '{value}'. Must be one of: {VALID_QUESTION_TYPES}")
        return values

    @field_validator("bloomLevels")
    @classmethod
    def validate_bloom_levels(cls, values: List[str]) -> List[str]:
        for value in values:
            if value not in VALID_BLOOM_LEVELS:
                raise ValueError(f"Invalid Bloom level '{value}'. Must be one of: {VALID_BLOOM_LEVELS}")
        return values

    @field_validator("difficultyDistribution")
    @classmethod
    def validate_difficulty_distribution(cls, v: Dict[str, int]) -> Dict[str, int]:
        for key in v:
            if key not in VALID_DIFFICULTY_LEVELS:
                raise ValueError(f"Invalid difficulty key '{key}'. Must be one of: {VALID_DIFFICULTY_LEVELS}")
        total = sum(v.values())
        if total != 100:
            raise ValueError(f"Difficulty distribution percentages must sum to 100, got {total}")
        return v


class QuizQuestion(BaseModel):
    questionType: str
    question: str
    correctAnswer: str
    options: Optional[List[str]] = None
    bloomLevel: str
    difficulty: str
    topic: str
    points: int
    explanation: str
    provenance: Optional[Dict[str, Optional[str]]] = None


class QuizResponse(BaseModel):
    questions: List[QuizQuestion]
    totalPoints: int
    metadata: Dict[str, Any]


class StudentCompetencyRequest(BaseModel):
    studentId: str = Field(..., description="Firebase user ID of the student")
    quizHistory: Optional[List[Dict[str, Any]]] = Field(
        default_factory=list,
        description="Student quiz history — list of {topic, score, total, timeTaken}",
    )


class TopicCompetency(BaseModel):
    topic: str
    efficiencyScore: float = Field(..., ge=0, le=100)
    competencyLevel: str
    perspective: str


class StudentCompetencyResponse(BaseModel):
    studentId: str
    competencies: List[TopicCompetency]
    recommendedTopics: List[str]
    excludeTopics: List[str]


class CalculatorRequest(BaseModel):
    expression: str = Field(..., min_length=1, max_length=500, description="Mathematical expression to evaluate")


class CalculatorResponse(BaseModel):
    expression: str
    result: str
    steps: List[str]
    simplified: Optional[str] = None
    latex: Optional[str] = None


class LessonGenerationRequest(BaseModel):
    gradeLevel: str = Field(..., description="Grade level context for lesson generation")
    classSectionId: Optional[str] = Field(default=None, description="Optional class section context")
    className: Optional[str] = Field(default=None, description="Optional class display name")
    materialId: Optional[str] = Field(default=None, description="Optional specific course-material artifact ID")
    focusTopics: List[str] = Field(default_factory=list, description="Optional explicit topic overrides")
    topicCount: int = Field(default=5, ge=1, le=10, description="Maximum number of focus topics")
    preferImportedTopics: bool = Field(default=True, description="Prefer persisted imported topics when available")
    allowReviewSources: bool = Field(default=False, description="Allow generation from review_required sources")
    allowUnverifiedLesson: bool = Field(default=False, description="Allow returning lessons that fail self-validation")


class LessonPlanBlock(BaseModel):
    blockId: str
    title: str
    objective: str
    strategy: str
    estimatedMinutes: int
    activities: List[str]
    checksForUnderstanding: List[str]
    remediationTips: List[str]
    provenance: Optional[Dict[str, Optional[str]]] = None


class SourceLegitimacyReport(BaseModel):
    status: str
    score: float
    verifiedMaterials: int
    reviewMaterials: int
    rejectedMaterials: int
    evidenceChecked: List[str]
    issues: List[str]


class LessonSelfValidationReport(BaseModel):
    passed: bool
    score: float
    issues: List[str]
    checks: Dict[str, Any]


class LessonPlanResponse(BaseModel):
    success: bool
    lessonTitle: str
    gradeLevel: str
    classSectionId: Optional[str] = None
    className: Optional[str] = None
    usedImportedTopics: bool
    importedTopicCount: int
    weakSignals: Dict[str, float]
    focusTopics: List[str]
    blocks: List[LessonPlanBlock]
    provenanceSummary: List[Dict[str, Optional[str]]]
    sourceLegitimacy: SourceLegitimacyReport
    selfValidation: LessonSelfValidationReport
    publishReady: bool
    warnings: List[str]


class AsyncTaskSubmitResponse(BaseModel):
    success: bool
    taskId: str
    status: str
    taskKind: str
    createdAt: str


class AsyncTaskStatusResponse(BaseModel):
    success: bool
    taskId: str
    taskKind: str
    status: str
    createdAt: str
    startedAt: Optional[str] = None
    completedAt: Optional[str] = None
    progressPercent: float = 0.0
    progressStage: str = "queued"
    progressMessage: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[Any] = None


class AsyncTaskListResponse(BaseModel):
    success: bool
    count: int
    tasks: List[AsyncTaskStatusResponse]


class AsyncTaskCancelResponse(BaseModel):
    success: bool
    taskId: str
    status: str
    message: str


class InferenceMetricsResponse(BaseModel):
    success: bool
    metrics: Dict[str, Any]


class ImportGroundedFeedbackRequest(BaseModel):
    flow: str = Field(..., description="Flow identifier: quiz or lesson")
    status: str = Field(..., description="Event status: success, failed, or skipped")
    classSectionId: Optional[str] = Field(default=None, description="Optional class section context")
    className: Optional[str] = Field(default=None, description="Optional class display name")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Optional event metadata")

    @field_validator("flow")
    @classmethod
    def validate_flow(cls, v: str) -> str:
        value = (v or "").strip().lower()
        if value not in {"quiz", "lesson"}:
            raise ValueError("flow must be one of: quiz, lesson")
        return value

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        value = (v or "").strip().lower()
        if value not in {"success", "failed", "skipped"}:
            raise ValueError("status must be one of: success, failed, skipped")
        return value


class ImportGroundedFeedbackResponse(BaseModel):
    success: bool
    stored: bool
    warnings: List[str]


class ImportGroundedHourlyVolumeItem(BaseModel):
    hourBucket: str
    flow: str
    status: str
    eventCount: int


class ImportGroundedClassRateItem(BaseModel):
    classSectionId: str
    total24h: int
    failed24h: int
    skipped24h: int
    failureRate24h: float
    skippedRate24h: float
    total7d: int
    failed7d: int
    skipped7d: int
    failureRate7d: float
    skippedRate7d: float


class ImportGroundedFlowUsageItem(BaseModel):
    flow: str
    totalEvents: int
    eligibleEvents: int
    groundedEvents: int
    groundedUsageRatio: float


class ImportGroundedErrorReasonItem(BaseModel):
    normalizedErrorReason: str
    occurrences: int


class ImportGroundedTelemetryThresholds(BaseModel):
    go: bool
    reasons: List[str]


class ImportGroundedTelemetrySummaryResponse(BaseModel):
    success: bool
    classSectionId: Optional[str] = None
    lookbackDays: int
    totalEvents: int
    hourlyVolume: List[ImportGroundedHourlyVolumeItem]
    classRates: List[ImportGroundedClassRateItem]
    flowUsage: List[ImportGroundedFlowUsageItem]
    topErrors: List[ImportGroundedErrorReasonItem]
    thresholds: ImportGroundedTelemetryThresholds
    warnings: List[str]


class ImportGroundedAccessAuditItem(BaseModel):
    auditId: str
    action: str
    status: str
    path: str
    method: str
    classSectionId: Optional[str] = None
    createdAtIso: Optional[str] = None
    metadata: Dict[str, Any]


class ImportGroundedAccessAuditSummary(BaseModel):
    totalEvents: int
    byAction: Dict[str, int]
    byStatus: Dict[str, int]


class ImportGroundedAccessAuditResponse(BaseModel):
    success: bool
    classSectionId: Optional[str] = None
    lookbackDays: int
    entries: List[ImportGroundedAccessAuditItem]
    summary: ImportGroundedAccessAuditSummary
    warnings: List[str]


def _coerce_event_timestamp_utc(event: Dict[str, Any]) -> Optional[datetime]:
    created_at = event.get("createdAt")
    if isinstance(created_at, datetime):
        return created_at if created_at.tzinfo else created_at.replace(tzinfo=timezone.utc)

    created_at_iso = str(event.get("createdAtIso") or "").strip()
    if not created_at_iso:
        return None

    try:
        parsed = datetime.fromisoformat(created_at_iso.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except Exception:
        return None


def _to_compact_json(value: Any) -> str:
    try:
        return json.dumps(value, separators=(",", ":"), ensure_ascii=True)
    except Exception:
        return "{}"


def _csv_escape(value: Any) -> str:
    text = str(value if value is not None else "")
    return '"' + text.replace('"', '""') + '"'


# ─── Quiz Topics Database (SHS Grade 11-12 Only) ─────────────

MATH_TOPICS_BY_GRADE: Dict[str, Dict[str, List[str]]] = {
    "Grade 11": {
        "General Mathematics - Patterns, Relations, and Functions": [
            "Patterns and Real-Life Relationships", "Functions as Mathematical Models",
            "Function Notation and Evaluation", "Domain and Range of Functions",
            "Operations on Functions", "Composite Functions", "Inverse Functions",
            "Graphs of Rational Functions", "Graphs of Exponential Functions",
            "Graphs of Logarithmic Functions",
        ],
        "General Mathematics - Financial Mathematics": [
            "Simple and Compound Interest", "Simple and General Annuities",
            "Present and Future Value", "Loans, Amortization, and Sinking Funds",
            "Stocks, Bonds, and Market Indices",
            "Business Decision-Making with Mathematical Models",
        ],
        "General Mathematics - Logic and Mathematical Reasoning": [
            "Propositions and Logical Connectives", "Truth Values and Truth Tables",
            "Logical Equivalence and Implication", "Quantifiers and Negation",
            "Validity of Arguments",
        ],
        "Statistics and Probability - Random Variables": [
            "Random Variables", "Discrete Probability Distributions",
            "Mean and Variance of Discrete RV",
        ],
        "Statistics and Probability - Normal Distribution": [
            "Normal Distribution", "Standard Normal Distribution and Z-scores",
            "Areas Under the Normal Curve",
        ],
        "Statistics and Probability - Sampling and Estimation": [
            "Sampling Distributions", "Central Limit Theorem",
            "Point Estimation", "Confidence Intervals",
        ],
        "Statistics and Probability - Hypothesis Testing": [
            "Hypothesis Testing Concepts", "T-test", "Z-test",
            "Correlation and Regression",
        ],
    },
    "Grade 12": {
        "Pre-Calculus - Analytic Geometry": [
            "Conic Sections - Parabola", "Conic Sections - Ellipse",
            "Conic Sections - Hyperbola", "Conic Sections - Circle",
            "Systems of Nonlinear Equations",
        ],
        "Pre-Calculus - Series and Induction": [
            "Sequences and Series", "Arithmetic Sequences", "Geometric Sequences",
            "Mathematical Induction", "Binomial Theorem",
        ],
        "Pre-Calculus - Trigonometry": [
            "Angles and Unit Circle", "Trigonometric Functions",
            "Trigonometric Identities", "Sum and Difference Formulas",
            "Inverse Trigonometric Functions", "Polar Coordinates",
        ],
        "Basic Calculus - Limits": [
            "Limits of Functions", "Limit Theorems", "One-Sided Limits",
            "Infinite Limits and Limits at Infinity", "Continuity of Functions",
        ],
        "Basic Calculus - Derivatives": [
            "Definition of the Derivative", "Differentiation Rules", "Chain Rule",
            "Implicit Differentiation", "Higher-Order Derivatives", "Related Rates",
            "Extrema and the First Derivative Test",
            "Concavity and the Second Derivative Test", "Optimization Problems",
        ],
        "Basic Calculus - Integration": [
            "Antiderivatives and Indefinite Integrals",
            "Definite Integrals and the FTC",
            "Integration by Substitution", "Area Under a Curve",
        ],
    },
}


def _normalize_topic_key(value: str) -> str:
    key = re.sub(r"[^a-z0-9\s]+", " ", (value or "").lower())
    key = re.sub(r"\s+", " ", key).strip()
    return key


TOPIC_LABEL_ALIASES: Dict[str, str] = {
    # Legacy General Mathematics aliases mapped to strengthened SHS canonical labels.
    _normalize_topic_key("Functions and Relations"): "Functions as Mathematical Models",
    _normalize_topic_key("Evaluating Functions"): "Function Notation and Evaluation",
    _normalize_topic_key("Rational Functions"): "Graphs of Rational Functions",
    _normalize_topic_key("Exponential Functions"): "Graphs of Exponential Functions",
    _normalize_topic_key("Logarithmic Functions"): "Graphs of Logarithmic Functions",
    _normalize_topic_key("Simple Interest"): "Simple and Compound Interest",
    _normalize_topic_key("Compound Interest"): "Simple and Compound Interest",
    _normalize_topic_key("Annuities"): "Simple and General Annuities",
    _normalize_topic_key("Loans and Amortization"): "Loans, Amortization, and Sinking Funds",
    _normalize_topic_key("Stocks and Bonds"): "Stocks, Bonds, and Market Indices",
    _normalize_topic_key("Propositions and Connectives"): "Propositions and Logical Connectives",
    _normalize_topic_key("Truth Tables"): "Truth Values and Truth Tables",
    _normalize_topic_key("Logical Equivalence"): "Logical Equivalence and Implication",
    _normalize_topic_key("Valid Arguments and Fallacies"): "Validity of Arguments",
}


def _canonicalize_topic_label(value: str) -> str:
    clean_value = str(value or "").strip()
    if not clean_value:
        return ""
    return TOPIC_LABEL_ALIASES.get(_normalize_topic_key(clean_value), clean_value)


def _canonicalize_topic_list(values: List[str]) -> List[str]:
    canonical: List[str] = []
    for value in values:
        normalized = _canonicalize_topic_label(value)
        if normalized and normalized not in canonical:
            canonical.append(normalized)
    return canonical


def _resolve_grade_level_key(grade_level: Optional[str]) -> Optional[str]:
    raw = str(grade_level or "").strip()
    if not raw:
        return None

    normalized = raw.lower()
    if normalized in {"11", "grade11", "grade 11", "g11"}:
        return "Grade 11"
    if normalized in {"12", "grade12", "grade 12", "g12"}:
        return "Grade 12"

    for key in MATH_TOPICS_BY_GRADE.keys():
        if key.lower() == normalized:
            return key

    return None


def _fallback_topics_for_grade(grade_level: str, topic_count: int) -> List[str]:
    fallback_topics: List[str] = []
    grade_key = _resolve_grade_level_key(grade_level)
    if grade_key:
        for _, topics in MATH_TOPICS_BY_GRADE[grade_key].items():
            for topic in topics:
                if topic not in fallback_topics:
                    fallback_topics.append(topic)
                if len(fallback_topics) >= topic_count:
                    return fallback_topics

    # Keep grade-level separation strict; if grade is unknown, default to Grade 11.
    default_grade = "Grade 11"
    for _, topics in MATH_TOPICS_BY_GRADE[default_grade].items():
        for topic in topics:
            if topic not in fallback_topics:
                fallback_topics.append(topic)
            if len(fallback_topics) >= topic_count:
                return fallback_topics
    return fallback_topics


def _load_class_performance_artifacts(
    request: Request,
    *,
    class_section_id: Optional[str] = None,
    max_records: int = 500,
) -> Dict[str, float]:
    if not (_firebase_ready and firebase_firestore):
        return {
            "recordsCount": 0,
            "averageQuizScore": 0.0,
            "averageAttendance": 0.0,
            "averageEngagement": 0.0,
            "averageAssignmentCompletion": 0.0,
            "atRiskRate": 0.0,
        }

    user = get_current_user(request)
    normalized_class_section_id = (class_section_id or "").strip() or None

    query = (
        firebase_firestore.client()
        .collection("normalizedClassRecords")
        .where("teacherId", "==", user.uid)
    )
    if normalized_class_section_id:
        query = query.where("classSectionId", "==", normalized_class_section_id)

    docs = query.limit(max_records).stream()
    scores: List[float] = []
    attendance_rates: List[float] = []
    engagement_rates: List[float] = []
    completion_rates: List[float] = []
    at_risk_count = 0

    for doc in docs:
        row = doc.to_dict() or {}
        score = float(row.get("avgQuizScore") or 0.0)
        attendance = float(row.get("attendance") or 0.0)
        engagement = float(row.get("engagementScore") or 0.0)
        completion = float(row.get("assignmentCompletion") or 0.0)

        scores.append(score)
        attendance_rates.append(attendance)
        engagement_rates.append(engagement)
        completion_rates.append(completion)

        if score < 60 or attendance < 75 or engagement < 55:
            at_risk_count += 1

    count = len(scores)
    if count == 0:
        return {
            "recordsCount": 0,
            "averageQuizScore": 0.0,
            "averageAttendance": 0.0,
            "averageEngagement": 0.0,
            "averageAssignmentCompletion": 0.0,
            "atRiskRate": 0.0,
        }

    return {
        "recordsCount": float(count),
        "averageQuizScore": sum(scores) / count,
        "averageAttendance": sum(attendance_rates) / count,
        "averageEngagement": sum(engagement_rates) / count,
        "averageAssignmentCompletion": sum(completion_rates) / count,
        "atRiskRate": at_risk_count / count,
    }


def _parse_lesson_plan_json(raw: str) -> Dict[str, Any]:
    cleaned = (raw or "").strip()
    cleaned = re.sub(r"^```(?:json)?\s*\n?", "", cleaned)
    cleaned = re.sub(r"\n?```\s*$", "", cleaned)
    cleaned = cleaned.strip()

    start = cleaned.find("{")
    end = cleaned.rfind("}") + 1
    if start >= 0 and end > start:
        try:
            parsed = json.loads(cleaned[start:end])
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass
    return {}


def _deterministic_lesson_checks(
    *,
    selected_topics: List[str],
    blocks: List[LessonPlanBlock],
) -> Dict[str, Any]:
    issues: List[str] = []
    selected_topic_keys = {_normalize_topic_key(topic) for topic in selected_topics if topic.strip()}
    covered_topic_keys: Set[str] = set()

    if len(blocks) < 3:
        issues.append("Lesson must include at least 3 instructional blocks.")

    for block in blocks:
        block_text = " ".join([
            block.title,
            block.objective,
            block.strategy,
            " ".join(block.activities),
            " ".join(block.checksForUnderstanding),
            " ".join(block.remediationTips),
        ]).lower()

        matched = False
        for topic in selected_topics:
            topic_key = _normalize_topic_key(topic)
            topic_words = [w for w in topic_key.split(" ") if w]
            if topic_words and all(word in block_text for word in topic_words[: min(2, len(topic_words))]):
                covered_topic_keys.add(topic_key)
                matched = True
                break
        if not matched:
            issues.append(f"Block '{block.title}' is weakly grounded to selected topics.")

        if not block.activities:
            issues.append(f"Block '{block.title}' is missing classroom activities.")
        if not block.checksForUnderstanding:
            issues.append(f"Block '{block.title}' is missing checks for understanding.")

    topic_coverage_ratio = 1.0
    if selected_topic_keys:
        topic_coverage_ratio = len(covered_topic_keys) / max(1, len(selected_topic_keys))
        if topic_coverage_ratio < 0.6:
            issues.append(
                f"Topic coverage too low ({topic_coverage_ratio:.2f}); expected at least 0.60 across selected topics."
            )

    structure_ok = len(blocks) >= 3 and all(block.estimatedMinutes >= 5 for block in blocks)
    grounding_ok = topic_coverage_ratio >= 0.6
    score = max(0.0, min(1.0, 1.0 - (0.12 * len(issues))))

    return {
        "score": round(score, 3),
        "issues": issues,
        "checks": {
            "structure": structure_ok,
            "topicGrounding": grounding_ok,
            "topicCoverageRatio": round(topic_coverage_ratio, 3),
            "blockCount": len(blocks),
        },
    }


async def _ai_validate_lesson_plan(
    *,
    lesson_title: str,
    selected_topics: List[str],
    blocks: List[LessonPlanBlock],
) -> Dict[str, Any]:
    compact_blocks = [
        {
            "title": block.title,
            "objective": block.objective,
            "strategy": block.strategy,
            "estimatedMinutes": block.estimatedMinutes,
            "activities": block.activities,
            "checksForUnderstanding": block.checksForUnderstanding,
            "remediationTips": block.remediationTips,
        }
        for block in blocks
    ]

    validation_prompt = (
        "Validate this generated math lesson plan for instructional quality and grounding. "
        "Return JSON only in this schema: "
        '{"passed":true|false,"score":0.0-1.0,"issues":["..."],"checks":{"mathSoundness":true|false,"topicGrounding":true|false,"classroomUsability":true|false}}. '
        "Fail the lesson if topics are hallucinated, objectives are vague, or classroom activities are not actionable.\n\n"
        f"Lesson title: {lesson_title}\n"
        f"Selected topics: {json.dumps(selected_topics)}\n"
        f"Blocks: {json.dumps(compact_blocks)}"
    )

    try:
        raw = await call_hf_chat_async(
            messages=[
                {
                    "role": "system",
                    "content": "You are a strict lesson-quality verifier. Return valid JSON only.",
                },
                {"role": "user", "content": validation_prompt},
            ],
            task_type="lesson_generation",
            max_tokens=420,
            temperature=0.1,
            top_p=0.9,
            timeout=90,
        )
        parsed = _parse_lesson_plan_json(raw)
        if not parsed:
            return {
                "passed": False,
                "score": 0.0,
                "issues": ["AI validator returned invalid JSON."],
                "checks": {
                    "mathSoundness": False,
                    "topicGrounding": False,
                    "classroomUsability": False,
                },
            }

        score = float(parsed.get("score") or 0.0)
        score = max(0.0, min(1.0, score))
        checks_raw: Dict[str, Any] = {}
        if isinstance(parsed.get("checks"), dict):
            checks_raw = cast(Dict[str, Any], parsed.get("checks"))
        checks = {
            "mathSoundness": bool(checks_raw.get("mathSoundness")),
            "topicGrounding": bool(checks_raw.get("topicGrounding")),
            "classroomUsability": bool(checks_raw.get("classroomUsability")),
        }
        issues = [str(item).strip() for item in (parsed.get("issues") or []) if str(item).strip()]
        passed = bool(parsed.get("passed")) and score >= LESSON_VALIDATION_MIN_SCORE and all(checks.values())
        return {
            "passed": passed,
            "score": round(score, 3),
            "issues": issues,
            "checks": checks,
        }
    except Exception as validation_exc:
        logger.warning(f"Lesson AI self-validation failed: {validation_exc}")
        return {
            "passed": False,
            "score": 0.0,
            "issues": ["AI self-validation failed due to runtime error."],
            "checks": {
                "mathSoundness": False,
                "topicGrounding": False,
                "classroomUsability": False,
            },
        }


async def _validate_generated_lesson_plan(
    *,
    lesson_title: str,
    selected_topics: List[str],
    blocks: List[LessonPlanBlock],
) -> Dict[str, Any]:
    deterministic = _deterministic_lesson_checks(selected_topics=selected_topics, blocks=blocks)
    ai_validation = await _ai_validate_lesson_plan(
        lesson_title=lesson_title,
        selected_topics=selected_topics,
        blocks=blocks,
    )

    issues = deterministic.get("issues", []) + ai_validation.get("issues", [])
    checks = {
        **deterministic.get("checks", {}),
        **ai_validation.get("checks", {}),
    }

    combined_score = round(
        (0.4 * float(deterministic.get("score", 0.0))) +
        (0.6 * float(ai_validation.get("score", 0.0))),
        3,
    )
    passed = bool(ai_validation.get("passed")) and combined_score >= LESSON_VALIDATION_MIN_SCORE

    return {
        "passed": passed,
        "score": combined_score,
        "issues": sorted(list({str(issue).strip() for issue in issues if str(issue).strip()})),
        "checks": checks,
    }


@app.post("/api/lesson/generate", response_model=LessonPlanResponse)
async def generate_lesson_plan(http_request: Request, request: LessonGenerationRequest):
    """
    Generate a class lesson plan grounded on imported course-material topics and
    class performance artifacts. Falls back to built-in curriculum topics when
    imported topics are unavailable.
    """
    try:
        enforce_rate_limit(http_request, "generate_lesson_plan", 20, 60)

        imported_topics_payload: Dict[str, Any] = {"topics": [], "materials": [], "warnings": []}
        imported_topic_titles: List[str] = []
        warnings: List[str] = []
        import_grounding_enabled = ENABLE_IMPORT_GROUNDED_LESSON

        if not import_grounding_enabled and request.preferImportedTopics:
            warnings.append(
                "Import-grounded lesson generation is disabled by rollout flag; using focus topics and fallback curriculum."
            )

        if import_grounding_enabled and (request.preferImportedTopics or not request.focusTopics):
            imported_topics_payload = _load_persisted_course_material_topics(
                http_request,
                class_section_id=request.classSectionId,
                material_id=request.materialId,
                limit_materials=20,
            )
            imported_topic_titles = [
                str(topic.get("title") or "").strip()
                for topic in (imported_topics_payload.get("topics") or [])
                if str(topic.get("title") or "").strip()
            ]
            warnings.extend(imported_topics_payload.get("warnings") or [])

        selected_topics: List[str] = []
        for topic in request.focusTopics:
            clean_topic = _canonicalize_topic_label(str(topic).strip())
            if clean_topic and clean_topic not in selected_topics:
                selected_topics.append(clean_topic)

        if imported_topic_titles:
            for topic in imported_topic_titles:
                if topic not in selected_topics:
                    selected_topics.append(topic)

        if not selected_topics:
            selected_topics = _fallback_topics_for_grade(request.gradeLevel, request.topicCount)
            warnings.append("Using fallback curriculum topics because no imported topics were found.")

        selected_topics = selected_topics[: request.topicCount]

        source_legitimacy_report = _evaluate_lesson_source_legitimacy(
            imported_topics_payload,
            allow_review_sources=request.allowReviewSources,
        )
        using_imported_sources = bool(imported_topic_titles)
        if not using_imported_sources:
            source_legitimacy_report = {
                "status": "verified",
                "score": 1.0,
                "verifiedMaterials": 0,
                "reviewMaterials": 0,
                "rejectedMaterials": 0,
                "evidenceChecked": ["builtin_curriculum_fallback"],
                "issues": [],
            }

        if ENFORCE_LEGIT_SOURCES_FOR_LESSONS and using_imported_sources:
            source_status = str(source_legitimacy_report.get("status") or "review_required")
            if source_status == "rejected":
                raise HTTPException(
                    status_code=422,
                    detail={
                        "message": "Imported source legitimacy checks failed. Lesson generation blocked.",
                        "sourceLegitimacy": source_legitimacy_report,
                    },
                )
            if source_status == "review_required" and not request.allowReviewSources:
                raise HTTPException(
                    status_code=422,
                    detail={
                        "message": "Imported sources require review. Set allowReviewSources=true to continue.",
                        "sourceLegitimacy": source_legitimacy_report,
                    },
                )

        class_signals = _load_class_performance_artifacts(
            http_request,
            class_section_id=request.classSectionId,
            max_records=500,
        )

        topic_provenance_map: Dict[str, Dict[str, Optional[str]]] = {}
        for topic in (imported_topics_payload.get("topics") or []):
            title = str(topic.get("title") or "").strip()
            if not title:
                continue
            topic_provenance_map[_normalize_topic_key(title)] = {
                "topicId": str(topic.get("topicId") or "") or None,
                "title": title,
                "materialId": str(topic.get("materialId") or "") or None,
                "sourceFile": str(topic.get("sourceFile") or "") or None,
                "sectionId": str(topic.get("sectionId") or "") or None,
            }

        prompt = f"""Generate a JSON lesson plan for {request.gradeLevel}.

Class context:
- Class section: {request.classSectionId or 'n/a'}
- Class name: {request.className or 'n/a'}

Performance signals:
- recordsCount: {int(class_signals.get('recordsCount', 0))}
- averageQuizScore: {class_signals.get('averageQuizScore', 0.0):.1f}
- averageAttendance: {class_signals.get('averageAttendance', 0.0):.1f}
- averageEngagement: {class_signals.get('averageEngagement', 0.0):.1f}
- averageAssignmentCompletion: {class_signals.get('averageAssignmentCompletion', 0.0):.1f}
- atRiskRate: {class_signals.get('atRiskRate', 0.0):.2f}

Focus topics:
{json.dumps(selected_topics)}

Return JSON only with this structure:
{{
  "lessonTitle": "...",
  "blocks": [
    {{
      "title": "...",
      "topic": "...",
      "objective": "...",
      "strategy": "...",
      "estimatedMinutes": 10,
      "activities": ["..."],
      "checksForUnderstanding": ["..."],
      "remediationTips": ["..."]
    }}
  ]
}}

Rules:
- Use the provided focus topics only.
- Include 3 to 6 blocks.
- Prioritize prerequisite reinforcement and intervention scaffolds when risk is elevated.
- Keep activities practical and teacher-editable.
"""

        lesson_payload: Dict[str, Any] = {}
        try:
            raw = await call_hf_chat_async(
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert math instructional designer. Output strict JSON only.",
                    },
                    {"role": "user", "content": prompt},
                ],
                max_tokens=1200,
                temperature=0.25,
                task_type="lesson_generation",
            )
            lesson_payload = _parse_lesson_plan_json(raw)
        except Exception as lesson_exc:
            logger.warning(f"Lesson generation AI fallback engaged: {lesson_exc}")
            warnings.append("AI lesson synthesis failed; generated deterministic scaffold blocks.")

        raw_blocks = lesson_payload.get("blocks") if isinstance(lesson_payload, dict) else None
        if not isinstance(raw_blocks, list) or not raw_blocks:
            raw_blocks = [
                {
                    "title": f"Targeted Focus: {topic}",
                    "topic": topic,
                    "objective": f"Strengthen conceptual understanding and application for {topic}.",
                    "strategy": "Model-practice-feedback loop with explicit prerequisite checks.",
                    "estimatedMinutes": 12,
                    "activities": [
                        f"Activate prior knowledge related to {topic} with quick retrieval prompts.",
                        f"Guided worked examples for {topic} with think-aloud reasoning.",
                        "Partner practice with immediate corrective feedback.",
                    ],
                    "checksForUnderstanding": [
                        "Use mini whiteboard checks after each worked example.",
                        "Collect one-sentence justification from students for the final item.",
                    ],
                    "remediationTips": [
                        "Re-teach prerequisite vocabulary and notation before independent work.",
                        "Provide tiered hints before revealing full solutions.",
                    ],
                }
                for topic in selected_topics[: min(4, len(selected_topics))]
            ]

        lesson_title = str(lesson_payload.get("lessonTitle") or "Intervention-Grounded Math Lesson Plan").strip()
        blocks: List[LessonPlanBlock] = []
        provenance_summary: List[Dict[str, Optional[str]]] = []

        for idx, block in enumerate(raw_blocks[:6]):
            if not isinstance(block, dict):
                continue
            topic_hint = str(block.get("topic") or selected_topics[min(idx, len(selected_topics) - 1)]).strip()
            matched_provenance = topic_provenance_map.get(_normalize_topic_key(topic_hint))

            lesson_block = LessonPlanBlock(
                blockId=f"block_{idx + 1}",
                title=str(block.get("title") or f"Lesson Block {idx + 1}").strip(),
                objective=str(block.get("objective") or f"Build understanding of {topic_hint}.").strip(),
                strategy=str(block.get("strategy") or "Guided explicit instruction with scaffolded practice.").strip(),
                estimatedMinutes=max(5, min(25, int(block.get("estimatedMinutes") or 12))),
                activities=[str(item).strip() for item in (block.get("activities") or []) if str(item).strip()] or [f"Practice and discussion for {topic_hint}."],
                checksForUnderstanding=[str(item).strip() for item in (block.get("checksForUnderstanding") or []) if str(item).strip()] or ["Exit ticket: one solved item plus reasoning."],
                remediationTips=[str(item).strip() for item in (block.get("remediationTips") or []) if str(item).strip()] or ["Revisit prerequisite examples and provide targeted hints."],
                provenance=matched_provenance,
            )
            blocks.append(lesson_block)

            if matched_provenance and matched_provenance not in provenance_summary:
                provenance_summary.append(matched_provenance)

        if not blocks:
            raise HTTPException(status_code=500, detail="Unable to generate lesson blocks.")

        self_validation_report = await _validate_generated_lesson_plan(
            lesson_title=lesson_title,
            selected_topics=selected_topics,
            blocks=blocks,
        )
        if not self_validation_report.get("passed"):
            warnings.append("Generated lesson failed self-validation checks.")
            if not request.allowUnverifiedLesson:
                raise HTTPException(
                    status_code=422,
                    detail={
                        "message": "Lesson self-validation failed. Fix generation inputs or enable allowUnverifiedLesson.",
                        "selfValidation": self_validation_report,
                    },
                )

        publish_ready = bool(
            self_validation_report.get("passed") and
            source_legitimacy_report.get("status") == "verified"
        )

        return LessonPlanResponse(
            success=True,
            lessonTitle=lesson_title,
            gradeLevel=request.gradeLevel,
            classSectionId=request.classSectionId,
            className=request.className,
            usedImportedTopics=bool(imported_topic_titles),
            importedTopicCount=len(imported_topics_payload.get("topics") or []),
            weakSignals=class_signals,
            focusTopics=selected_topics,
            blocks=blocks,
            provenanceSummary=provenance_summary,
            sourceLegitimacy=SourceLegitimacyReport(**source_legitimacy_report),
            selfValidation=LessonSelfValidationReport(**self_validation_report),
            publishReady=publish_ready,
            warnings=warnings,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Lesson generation error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Lesson generation error: {str(e)}")


@app.post("/api/lesson/generate-async", response_model=AsyncTaskSubmitResponse)
async def generate_lesson_plan_async(http_request: Request, request: LessonGenerationRequest):
    if not ENABLE_ASYNC_GENERATION:
        raise HTTPException(status_code=404, detail="Async generation is disabled")

    enforce_rate_limit(http_request, "generate_lesson_plan_async", 20, 60)
    user = get_current_user(http_request)
    if user.role not in TEACHER_OR_ADMIN:
        raise HTTPException(status_code=403, detail="Forbidden for this role")

    task_id = _create_async_task(
        owner_uid=user.uid,
        task_kind="lesson_generation",
        payload=request.model_dump(),
    )

    _start_async_task_in_thread(task_id, lambda: generate_lesson_plan(http_request, request))

    with _async_tasks_lock:
        task = dict(_async_tasks.get(task_id, {}))

    return AsyncTaskSubmitResponse(
        success=True,
        taskId=task_id,
        status=str(task.get("status") or "queued"),
        taskKind="lesson_generation",
        createdAt=str(task.get("createdAt") or _utc_now_iso()),
    )


@app.post("/api/feedback/import-grounded", response_model=ImportGroundedFeedbackResponse)
async def record_import_grounded_feedback(http_request: Request, request: ImportGroundedFeedbackRequest):
    """Capture lightweight pilot feedback telemetry for import-grounded quiz and lesson flows."""
    warnings: List[str] = []
    stored = False
    try:
        enforce_rate_limit(http_request, "import_grounded_feedback", 60, 60)
        user = get_current_user(http_request)

        if ENABLE_IMPORT_GROUNDED_FEEDBACK_EVENTS and _firebase_ready and firebase_firestore:
            payload: Dict[str, Any] = {
                "flow": request.flow,
                "status": request.status,
                "teacherId": user.uid,
                "teacherEmail": user.email,
                "role": user.role,
                "classSectionId": (request.classSectionId or "").strip() or None,
                "className": (request.className or "").strip() or None,
                "metadata": request.metadata,
                "createdAt": FIRESTORE_SERVER_TIMESTAMP,
                "createdAtIso": datetime.now(timezone.utc).isoformat(),
            }
            firebase_firestore.client().collection("importGroundedFeedbackEvents").add(payload)
            stored = True
        else:
            warnings.append("Import-grounded feedback storage is disabled or unavailable.")

        _write_access_audit_log(
            http_request,
            action="import_grounded_feedback",
            status="success" if stored else "accepted",
            class_section_id=request.classSectionId,
            metadata={
                "flow": request.flow,
                "eventStatus": request.status,
                "stored": stored,
            },
        )

        return ImportGroundedFeedbackResponse(success=True, stored=stored, warnings=warnings)
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Import-grounded feedback logging failed: {e}")
        return ImportGroundedFeedbackResponse(success=True, stored=False, warnings=["Feedback logging failed"])


@app.get("/api/feedback/import-grounded/summary", response_model=ImportGroundedTelemetrySummaryResponse)
async def get_import_grounded_feedback_summary(
    request: Request,
    classSectionId: Optional[str] = Query(default=None),
    days: int = Query(default=7, ge=1, le=30),
    limit: int = Query(default=5000, ge=100, le=20000),
):
    """Aggregate import-grounded pilot telemetry (Query A-D equivalent) from Firestore events."""
    try:
        user = get_current_user(request)
        if not (_firebase_ready and firebase_firestore):
            raise HTTPException(status_code=503, detail="Firestore unavailable")

        normalized_class_section_id = (classSectionId or "").strip() or None
        now_utc = datetime.now(timezone.utc)
        lookback_start = now_utc - timedelta(days=days)
        start_24h = now_utc - timedelta(hours=24)
        warnings: List[str] = []

        docs = (
            firebase_firestore.client()
            .collection("importGroundedFeedbackEvents")
            .where("teacherId", "==", user.uid)
            .limit(limit)
            .stream()
        )

        hourly_counter: Counter[Tuple[str, str, str]] = Counter()
        class_counter: Dict[str, Dict[str, int]] = {}
        flow_counter: Dict[str, Dict[str, int]] = {}
        error_counter: Counter[str] = Counter()
        total_events = 0

        for doc in docs:
            payload = doc.to_dict() or {}
            event_class_section_id = str(payload.get("classSectionId") or "").strip() or None
            if normalized_class_section_id and event_class_section_id != normalized_class_section_id:
                continue

            event_ts = _coerce_event_timestamp_utc(payload)
            if event_ts is None:
                warnings.append("Some events were excluded because timestamps were missing or invalid.")
                continue
            if event_ts < lookback_start:
                continue

            flow = str(payload.get("flow") or "unknown").strip().lower() or "unknown"
            status = str(payload.get("status") or "unknown").strip().lower() or "unknown"
            raw_metadata = payload.get("metadata")
            metadata: Dict[str, Any] = raw_metadata if isinstance(raw_metadata, dict) else {}

            total_events += 1

            hour_bucket = event_ts.replace(minute=0, second=0, microsecond=0).isoformat()
            hourly_counter[(hour_bucket, flow, status)] += 1

            class_key = event_class_section_id or "unscoped"
            class_stats = class_counter.setdefault(
                class_key,
                {
                    "total24h": 0,
                    "failed24h": 0,
                    "skipped24h": 0,
                    "total7d": 0,
                    "failed7d": 0,
                    "skipped7d": 0,
                },
            )
            class_stats["total7d"] += 1
            if status == "failed":
                class_stats["failed7d"] += 1
            if status == "skipped":
                class_stats["skipped7d"] += 1
            if event_ts >= start_24h:
                class_stats["total24h"] += 1
                if status == "failed":
                    class_stats["failed24h"] += 1
                if status == "skipped":
                    class_stats["skipped24h"] += 1

            flow_stats = flow_counter.setdefault(
                flow,
                {
                    "totalEvents": 0,
                    "eligibleEvents": 0,
                    "groundedEvents": 0,
                },
            )
            flow_stats["totalEvents"] += 1
            import_grounding_enabled = bool(metadata.get("importGroundingEnabled", True))
            if import_grounding_enabled:
                flow_stats["eligibleEvents"] += 1
                if bool(metadata.get("usedImportedTopics", False)):
                    flow_stats["groundedEvents"] += 1

            if status == "failed":
                normalized_error = str(metadata.get("error") or "unknown_error").strip().lower() or "unknown_error"
                error_counter[normalized_error] += 1

        deduped_warnings = sorted(set(warnings))

        hourly_volume = [
            ImportGroundedHourlyVolumeItem(
                hourBucket=hour,
                flow=flow,
                status=status,
                eventCount=count,
            )
            for (hour, flow, status), count in sorted(hourly_counter.items(), key=lambda item: item[0], reverse=True)
        ]

        class_rates: List[ImportGroundedClassRateItem] = []
        aggregate_total_24h = 0
        aggregate_failed_24h = 0
        aggregate_skipped_24h = 0
        aggregate_total_7d = 0
        aggregate_failed_7d = 0
        aggregate_skipped_7d = 0

        for class_key, stats in sorted(class_counter.items()):
            total24h = int(stats["total24h"])
            failed24h = int(stats["failed24h"])
            skipped24h = int(stats["skipped24h"])
            total7d = int(stats["total7d"])
            failed7d = int(stats["failed7d"])
            skipped7d = int(stats["skipped7d"])

            aggregate_total_24h += total24h
            aggregate_failed_24h += failed24h
            aggregate_skipped_24h += skipped24h
            aggregate_total_7d += total7d
            aggregate_failed_7d += failed7d
            aggregate_skipped_7d += skipped7d

            class_rates.append(
                ImportGroundedClassRateItem(
                    classSectionId=class_key,
                    total24h=total24h,
                    failed24h=failed24h,
                    skipped24h=skipped24h,
                    failureRate24h=(failed24h / total24h) if total24h else 0.0,
                    skippedRate24h=(skipped24h / total24h) if total24h else 0.0,
                    total7d=total7d,
                    failed7d=failed7d,
                    skipped7d=skipped7d,
                    failureRate7d=(failed7d / total7d) if total7d else 0.0,
                    skippedRate7d=(skipped7d / total7d) if total7d else 0.0,
                )
            )

        flow_usage: List[ImportGroundedFlowUsageItem] = []
        aggregate_eligible = 0
        aggregate_grounded = 0
        for flow, stats in sorted(flow_counter.items()):
            eligible = int(stats["eligibleEvents"])
            grounded = int(stats["groundedEvents"])
            aggregate_eligible += eligible
            aggregate_grounded += grounded
            flow_usage.append(
                ImportGroundedFlowUsageItem(
                    flow=flow,
                    totalEvents=int(stats["totalEvents"]),
                    eligibleEvents=eligible,
                    groundedEvents=grounded,
                    groundedUsageRatio=(grounded / eligible) if eligible else 0.0,
                )
            )

        top_errors = [
            ImportGroundedErrorReasonItem(normalizedErrorReason=reason, occurrences=count)
            for reason, count in error_counter.most_common(20)
        ]

        failure_rate_24h = (aggregate_failed_24h / aggregate_total_24h) if aggregate_total_24h else 0.0
        skipped_rate_7d = (aggregate_skipped_7d / aggregate_total_7d) if aggregate_total_7d else 0.0
        failure_rate_7d = (aggregate_failed_7d / aggregate_total_7d) if aggregate_total_7d else 0.0
        grounded_usage_ratio = (aggregate_grounded / aggregate_eligible) if aggregate_eligible else 0.0

        threshold_reasons: List[str] = []
        if failure_rate_24h > 0.08:
            threshold_reasons.append("Hold: failure_rate_24h exceeded 8% threshold.")
        if failure_rate_7d > 0.05:
            threshold_reasons.append("Hold: failure_rate_7d exceeded 5% threshold.")
        if skipped_rate_7d > 0.10:
            threshold_reasons.append("Hold: skipped_rate_7d exceeded 10% threshold.")
        if aggregate_eligible > 0 and grounded_usage_ratio < 0.70:
            threshold_reasons.append("Hold: grounded_usage_ratio below 70% for eligible events.")

        if total_events == 0:
            deduped_warnings.append("No telemetry events found for the requested window/filter.")

        _write_access_audit_log(
            request,
            action="import_grounded_feedback_summary_read",
            status="success",
            class_section_id=normalized_class_section_id,
            metadata={
                "lookbackDays": days,
                "requestedLimit": limit,
                "returnedEvents": total_events,
                "warningsCount": len(deduped_warnings),
            },
        )

        return ImportGroundedTelemetrySummaryResponse(
            success=True,
            classSectionId=normalized_class_section_id,
            lookbackDays=days,
            totalEvents=total_events,
            hourlyVolume=hourly_volume,
            classRates=class_rates,
            flowUsage=flow_usage,
            topErrors=top_errors,
            thresholds=ImportGroundedTelemetryThresholds(
                go=len(threshold_reasons) == 0,
                reasons=threshold_reasons,
            ),
            warnings=deduped_warnings,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Import-grounded feedback summary lookup failed: {e}")
        raise HTTPException(status_code=500, detail=f"Import-grounded feedback summary error: {str(e)}")


@app.get("/api/import-grounded/access-audit", response_model=ImportGroundedAccessAuditResponse)
async def get_import_grounded_access_audit(
    request: Request,
    classSectionId: Optional[str] = Query(default=None),
    days: int = Query(default=7, ge=1, le=30),
    limit: int = Query(default=200, ge=1, le=1000),
    export: str = Query(default="json"),
):
    """
    Retrieve import-grounded access audit events for the authenticated teacher scope.
    Supports JSON (default) and CSV export.
    """
    try:
        user = get_current_user(request)
        if not (_firebase_ready and firebase_firestore):
            raise HTTPException(status_code=503, detail="Firestore unavailable")

        export_mode = (export or "json").strip().lower()
        if export_mode not in {"json", "csv"}:
            raise HTTPException(status_code=400, detail="export must be one of: json, csv")

        normalized_class_section_id = (classSectionId or "").strip() or None
        lookback_start = datetime.now(timezone.utc) - timedelta(days=days)
        warnings: List[str] = []

        query = (
            firebase_firestore.client()
            .collection("accessAuditLogs")
            .where("teacherId", "==", user.uid)
        )
        try:
            docs = (
                query
                .order_by("createdAt", direction=FIRESTORE_QUERY_DESCENDING)
                .limit(min(limit * 4, 4000))
                .stream()
            )
        except Exception:
            warnings.append("Access-audit lookup used fallback query path without ordering.")
            docs = query.limit(min(limit * 4, 4000)).stream()

        allowed_prefixes = (
            "class_records_",
            "course_material_",
            "risk_refresh_",
            "import_grounded_",
        )
        entries: List[ImportGroundedAccessAuditItem] = []
        by_action: Counter[str] = Counter()
        by_status: Counter[str] = Counter()

        for doc in docs:
            payload = doc.to_dict() or {}
            action = str(payload.get("action") or "").strip()
            if not action or not action.startswith(allowed_prefixes):
                continue

            event_class_section_id = str(payload.get("classSectionId") or "").strip() or None
            if normalized_class_section_id and event_class_section_id != normalized_class_section_id:
                continue

            event_ts = _coerce_event_timestamp_utc(payload)
            if event_ts is None:
                warnings.append("Some audit events were excluded because timestamps were missing or invalid.")
                continue
            if event_ts < lookback_start:
                continue

            status = str(payload.get("status") or "unknown").strip() or "unknown"
            method = str(payload.get("method") or "").strip().upper() or "GET"
            path = str(payload.get("path") or "").strip() or "unknown"
            metadata_raw = payload.get("metadata")
            metadata = metadata_raw if isinstance(metadata_raw, dict) else {}
            created_at_iso = event_ts.isoformat()

            entry = ImportGroundedAccessAuditItem(
                auditId=str(doc.id),
                action=action,
                status=status,
                path=path,
                method=method,
                classSectionId=event_class_section_id,
                createdAtIso=created_at_iso,
                metadata=metadata,
            )
            entries.append(entry)
            by_action[action] += 1
            by_status[status] += 1

            if len(entries) >= limit:
                break

        if not entries:
            warnings.append("No import-grounded access-audit events found for the requested window/filter.")

        deduped_warnings = sorted(set(warnings))
        summary = ImportGroundedAccessAuditSummary(
            totalEvents=len(entries),
            byAction=dict(by_action),
            byStatus=dict(by_status),
        )

        _write_access_audit_log(
            request,
            action="import_grounded_access_audit_read",
            status="success",
            class_section_id=normalized_class_section_id,
            metadata={
                "lookbackDays": days,
                "requestedLimit": limit,
                "returnedEvents": len(entries),
                "export": export_mode,
                "warningsCount": len(deduped_warnings),
            },
        )

        if export_mode == "csv":
            header = [
                "auditId",
                "createdAtIso",
                "action",
                "status",
                "method",
                "path",
                "classSectionId",
                "metadataJson",
            ]
            lines = [",".join(header)]
            for item in entries:
                lines.append(
                    ",".join(
                        [
                            _csv_escape(item.auditId),
                            _csv_escape(item.createdAtIso),
                            _csv_escape(item.action),
                            _csv_escape(item.status),
                            _csv_escape(item.method),
                            _csv_escape(item.path),
                            _csv_escape(item.classSectionId or ""),
                            _csv_escape(_to_compact_json(item.metadata)),
                        ]
                    )
                )

            date_tag = datetime.now(timezone.utc).strftime("%Y%m%d")
            return Response(
                content="\n".join(lines),
                media_type="text/csv",
                headers={
                    "Content-Disposition": f'attachment; filename="import-grounded-access-audit-{date_tag}.csv"',
                },
            )

        return ImportGroundedAccessAuditResponse(
            success=True,
            classSectionId=normalized_class_section_id,
            lookbackDays=days,
            entries=entries,
            summary=summary,
            warnings=deduped_warnings,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Import-grounded access-audit lookup failed: {e}")
        raise HTTPException(status_code=500, detail=f"Import-grounded access-audit error: {str(e)}")


# ─── Quiz Generation System Prompt ────────────────────────────

QUIZ_GENERATION_SYSTEM_PROMPT = """You are an expert math quiz generator for MathPulse AI, an educational platform.

PURPOSE:
You are creating supplemental math assessments to support classroom learning, not replace teacher instruction.

BLOOM'S TAXONOMY FRAMEWORK:
Generate questions following Bloom's Taxonomy levels to ensure comprehensive skill evaluation:
- Remember (recall): Recall facts, definitions, or formulas
- Understand (explain): Explain concepts in own words, interpret data
- Apply (use): Use formulas/methods to solve problems in new contexts
- Analyze (examine): Break down complex problems, compare approaches, identify patterns

QUESTION TYPES:
- Identification: Define or identify mathematical concepts, properties, or theorems
- Enumeration: List steps in a process, properties of a shape, or related concepts
- Multiple Choice: Standard multiple-choice with 4 options (one correct)
- Word Problem: Real-world context-based problems relatable to students' experiences
- Equation-Based: Solve equations, manipulate expressions, prove identities

GRAPH QUESTIONS (when requested):
- Use ONLY identification-type questions about graphs
- Ask students to identify key features: intercepts, slopes, vertex locations, asymptotes, domain/range, transformations
- Describe the graph in text (do NOT attempt to render images)
- Format: "Given a graph of [description with key coordinates]... Identify [feature]."
- Note: Graph questions use identification format as graphing is challenging for students

GUIDELINES:
- Make questions context-based and relatable to students' real-world experiences
- Generate clear, unambiguous questions with definitive correct answers
- For each question, provide a detailed step-by-step explanation
- Ensure mathematical accuracy — verify all answers
- Match difficulty to the specified level (easy, medium, hard)
- Distribute Bloom's Taxonomy levels as evenly as possible across the quiz

RESPONSE FORMAT:
Respond ONLY with a valid JSON array of question objects. No markdown, no explanation outside:
[
  {
    "questionType": "multiple_choice",
    "question": "...",
    "correctAnswer": "...",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "bloomLevel": "apply",
    "difficulty": "medium",
    "topic": "Linear Equations",
    "points": 3,
    "explanation": "Step 1: ... Step 2: ... Therefore the answer is ..."
  }
]

Points by difficulty: easy=1, medium=3, hard=5.
For non-multiple-choice questions, omit the "options" field or set to null.
Do NOT output chain-of-thought, planning notes, "Thinking Process", or any preamble.
If you cannot comply with constraints, still return the closest valid JSON array only.
"""


# ─── Quiz Generation Helpers ──────────────────────────────────


def _distribute_questions(
    num_questions: int,
    difficulty_distribution: Dict[str, int],
    bloom_levels: List[str],
    question_types: List[str],
) -> List[Dict[str, str]]:
    """
    Pre-compute the distribution of questions by difficulty, Bloom level,
    and question type so the LLM prompt can be very specific.
    """
    distribution: List[Dict[str, str]] = []

    # Compute counts per difficulty
    difficulty_counts: Dict[str, int] = {}
    remaining = num_questions
    for i, (diff, pct) in enumerate(difficulty_distribution.items()):
        if i == len(difficulty_distribution) - 1:
            difficulty_counts[diff] = remaining
        else:
            count = max(1, round(num_questions * pct / 100))
            count = min(count, remaining)
            difficulty_counts[diff] = count
            remaining -= count

    idx = 0
    for diff, count in difficulty_counts.items():
        for j in range(count):
            bloom = bloom_levels[idx % len(bloom_levels)]
            qtype = question_types[idx % len(question_types)]
            distribution.append({
                "difficulty": diff,
                "bloomLevel": bloom,
                "questionType": qtype,
            })
            idx += 1

    return distribution


def _parse_quiz_json(raw: str) -> List[Dict[str, Any]]:
    """Robustly extract a JSON array of quiz questions from LLM output."""
    # Try direct parse
    cleaned = raw.strip()
    # Remove markdown fences
    cleaned = re.sub(r"^```(?:json)?\s*\n?", "", cleaned)
    cleaned = re.sub(r"\n?```\s*$", "", cleaned)
    cleaned = cleaned.strip()

    # Remove common reasoning preambles before JSON output.
    cleaned = re.sub(r"^\s*thinking\s*process\s*:\s*", "", cleaned, flags=re.IGNORECASE)

    def _extract_json_blocks(text: str) -> List[str]:
        blocks: List[str] = []
        starts = [i for i, ch in enumerate(text) if ch in "[{"]
        for start in starts:
            opener = text[start]
            closer = "]" if opener == "[" else "}"
            depth = 0
            in_string = False
            escaped = False
            for idx in range(start, len(text)):
                ch = text[idx]
                if in_string:
                    if escaped:
                        escaped = False
                    elif ch == "\\":
                        escaped = True
                    elif ch == '"':
                        in_string = False
                    continue

                if ch == '"':
                    in_string = True
                    continue

                if ch == opener:
                    depth += 1
                elif ch == closer:
                    depth -= 1
                    if depth == 0:
                        blocks.append(text[start : idx + 1])
                        break
        return blocks

    def _coerce_question_list(value: Any) -> List[Dict[str, Any]]:
        if not isinstance(value, list):
            return []
        return [item for item in value if isinstance(item, dict)]

    # Try every balanced JSON block and accept array payloads directly.
    for candidate in _extract_json_blocks(cleaned):
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, list):
                return _coerce_question_list(parsed)
            if isinstance(parsed, dict) and isinstance(parsed.get("questions"), list):
                return _coerce_question_list(parsed.get("questions") or [])
        except json.JSONDecodeError:
            continue

    # Try to find array brackets
    arr_start = cleaned.find("[")
    arr_end = cleaned.rfind("]") + 1
    if arr_start >= 0 and arr_end > arr_start:
        try:
            return _coerce_question_list(json.loads(cleaned[arr_start:arr_end]))
        except json.JSONDecodeError:
            pass

    # Fallback: try parsing individual objects
    objects: List[Dict[str, Any]] = []
    for match in re.finditer(r"\{[^{}]+\}", cleaned, re.DOTALL):
        try:
            obj = json.loads(match.group())
            if "question" in obj:
                objects.append(obj)
        except json.JSONDecodeError:
            continue

    return objects


async def _repair_quiz_json_with_llm(
    raw_output: str,
    *,
    num_questions: int,
    timeout: int,
    model_id: Optional[str],
) -> List[Dict[str, Any]]:
    """Attempt to coerce malformed quiz output into a strict JSON array."""
    repair_messages = [
        {
            "role": "system",
            "content": (
                "You are a strict JSON formatter. Convert the user's draft into ONLY a valid JSON array "
                "of quiz question objects. Do not include markdown, commentary, or chain-of-thought. "
                f"Return exactly {num_questions} objects when possible."
            ),
        },
        {
            "role": "user",
            "content": (
                "Rewrite this into valid JSON array only. Keep and normalize useful question content.\n\n"
                f"DRAFT:\n{raw_output}"
            ),
        },
    ]

    repaired_text = await call_hf_chat_async(
        repair_messages,
        max_tokens=min(4096, max(2048, num_questions * 260)),
        temperature=0.0,
        top_p=0.1,
        timeout=timeout,
        task_type="default",
        model=model_id,
    )
    return _parse_quiz_json(repaired_text)


async def _regenerate_quiz_json_strict(
    *,
    original_prompt: str,
    num_questions: int,
    timeout: int,
    model_id: Optional[str],
) -> List[Dict[str, Any]]:
    """Regenerate quiz questions using a strict JSON-only prompt path."""
    strict_messages = [
        {
            "role": "system",
            "content": (
                "You generate quizzes as strict JSON only. "
                "Output must begin with '[' and end with ']'. "
                "Do not output markdown, notes, or chain-of-thought."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Generate exactly {num_questions} questions from this spec. "
                "Return JSON array only.\n\n"
                f"SPEC:\n{original_prompt}"
            ),
        },
    ]

    strict_text = await call_hf_chat_async(
        strict_messages,
        max_tokens=min(4096, max(2048, num_questions * 260)),
        temperature=0.0,
        top_p=0.1,
        timeout=timeout,
        task_type="default",
        model=model_id,
    )
    return _parse_quiz_json(strict_text)


def _validate_quiz_questions(
    questions: List[Dict[str, Any]],
    distribution: List[Dict[str, str]],
    topic_provenance_map: Optional[Dict[str, Dict[str, Optional[str]]]] = None,
) -> List[QuizQuestion]:
    """Validate and normalise each question from the LLM response."""
    validated: List[QuizQuestion] = []
    points_map = {"easy": 1, "medium": 3, "hard": 5}

    def _topic_key(value: str) -> str:
        normalized = re.sub(r"[^a-z0-9\s]+", " ", (value or "").lower())
        normalized = re.sub(r"\s+", " ", normalized).strip()
        return normalized

    def _normalize_options(raw_options: Any, fallback_obj: Dict[str, Any]) -> Optional[List[str]]:
        def _coerce_list(value: Any) -> List[str]:
            if isinstance(value, list):
                return [str(item).strip() for item in value if str(item).strip()]
            if isinstance(value, dict):
                extracted = [str(item).strip() for item in value.values() if str(item).strip()]
                return extracted
            if isinstance(value, str):
                text = value.strip()
                if not text:
                    return []
                if text.startswith("[") and text.endswith("]"):
                    try:
                        parsed = json.loads(text)
                        if isinstance(parsed, list):
                            return [str(item).strip() for item in parsed if str(item).strip()]
                    except Exception:
                        pass
                split_candidates = [part.strip() for part in re.split(r"\n+|\s*\|\s*", text) if part.strip()]
                return split_candidates
            return []

        options_list = _coerce_list(raw_options)
        if not options_list:
            for alt_key in ("choices", "answerChoices", "answers"):
                options_list = _coerce_list(fallback_obj.get(alt_key))
                if options_list:
                    break

        if not options_list:
            return None

        return options_list[:4]

    for i, q in enumerate(questions):
        if not isinstance(q, dict):
            continue
        dist = distribution[i] if i < len(distribution) else {}

        question_type = q.get("questionType", dist.get("questionType", "identification"))
        if question_type not in VALID_QUESTION_TYPES:
            question_type = "identification"

        difficulty = q.get("difficulty", dist.get("difficulty", "medium"))
        if difficulty not in VALID_DIFFICULTY_LEVELS:
            difficulty = "medium"

        bloom_level = q.get("bloomLevel", dist.get("bloomLevel", "understand"))
        if bloom_level not in VALID_BLOOM_LEVELS:
            bloom_level = "understand"

        options = None
        if question_type == "multiple_choice":
            options = _normalize_options(q.get("options"), q)
            if not options:
                # If options are malformed/missing, downgrade to identification to keep generation resilient.
                question_type = "identification"
                options = None

        question_topic = str(q.get("topic", "General"))
        question_provenance = None
        if topic_provenance_map:
            question_provenance = topic_provenance_map.get(_topic_key(question_topic))

        validated.append(QuizQuestion(
            questionType=question_type,
            question=str(q.get("question", "")),
            correctAnswer=str(q.get("correctAnswer", "")),
            options=options,
            bloomLevel=bloom_level,
            difficulty=difficulty,
            topic=question_topic,
            points=q.get("points", points_map.get(difficulty, 3)),
            explanation=str(q.get("explanation", "No explanation provided.")),
            provenance=question_provenance,
        ))

    return validated


# ─── Quiz Generation Endpoints ────────────────────────────────


@app.post("/api/quiz/generate", response_model=QuizResponse)
async def generate_quiz(http_request: Request, request: QuizGenerationRequest):
    """
    Generate an AI-powered quiz via HF Serverless Inference.
    Supports Bloom's Taxonomy integration, multiple question types,
    and graph-based identification questions.
    """
    try:

        normalized_exclude_topics = set(_canonicalize_topic_list(request.excludeTopics))
        # Filter out excluded topics (supports legacy topic labels via canonicalization)
        effective_topics = _canonicalize_topic_list(request.topics)
        effective_topics = [t for t in effective_topics if t not in normalized_exclude_topics]
        import_grounding_enabled = ENABLE_IMPORT_GROUNDED_QUIZ
        import_warnings: List[str] = []
        if not import_grounding_enabled and request.preferImportedTopics:
            import_warnings.append(
                "Import-grounded quiz generation is disabled by rollout flag; using provided and curriculum topics only."
            )

        imported_topics_payload: Dict[str, Any] = {"topics": [], "materials": [], "warnings": []}
        imported_topic_titles: List[str] = []
        if import_grounding_enabled and (request.preferImportedTopics or not effective_topics):
            imported_topics_payload = _load_persisted_course_material_topics(
                http_request,
                class_section_id=request.classSectionId,
                material_id=request.materialId,
                limit_materials=15,
            )
            import_warnings.extend(imported_topics_payload.get("warnings", []))
            imported_topic_titles = [
                str(topic.get("title", "")).strip()
                for topic in imported_topics_payload.get("topics", [])
                if str(topic.get("title", "")).strip() and _canonicalize_topic_label(str(topic.get("title", "")).strip()) not in normalized_exclude_topics
            ]
            imported_topic_titles = _canonicalize_topic_list(imported_topic_titles)

        if imported_topic_titles:
            if request.preferImportedTopics:
                merged_topics = imported_topic_titles + [topic for topic in effective_topics if topic not in imported_topic_titles]
            else:
                merged_topics = effective_topics + [topic for topic in imported_topic_titles if topic not in effective_topics]
            effective_topics = merged_topics

        if not effective_topics:
            raise HTTPException(
                status_code=400,
                detail="All requested topics are in the exclude list. Please provide at least one topic to cover.",
            )

        # ── Enforce request limits ──
        if len(effective_topics) > MAX_TOPICS_LIMIT:
            logger.warning(
                f"Trimming topics from {len(effective_topics)} to {MAX_TOPICS_LIMIT} (request limit)"
            )
            effective_topics = effective_topics[:MAX_TOPICS_LIMIT]

        if request.numQuestions > MAX_QUESTIONS_LIMIT:
            logger.warning(
                f"Clamping numQuestions from {request.numQuestions} to {MAX_QUESTIONS_LIMIT} (request limit)"
            )
            request.numQuestions = MAX_QUESTIONS_LIMIT

        # Pre-compute question distribution
        distribution = _distribute_questions(
            request.numQuestions,
            request.difficultyDistribution,
            request.bloomLevels,
            request.questionTypes,
        )

        # Build per-question specifications
        spec_lines: List[str] = []
        for i, d in enumerate(distribution):
            topic = effective_topics[i % len(effective_topics)]
            graph_note = ""
            if request.includeGraphs and d["questionType"] == "identification":
                graph_note = " (GRAPH-BASED: describe a graph and ask the student to identify a feature)"
            spec_lines.append(
                f"Q{i+1}: type={d['questionType']}, difficulty={d['difficulty']}, "
                f"bloom={d['bloomLevel']}, topic={topic}{graph_note}"
            )

        graph_instruction = ""
        if request.includeGraphs:
            graph_instruction = (
                "\n\nGRAPH QUESTIONS: For any identification questions, make them graph-based. "
                "Describe the graph verbally (e.g., 'Given a parabola with vertex at (2,3) opening upward...') "
                "and ask the student to identify key features such as intercepts, axis of symmetry, "
                "slopes, asymptotes, domain, range, or transformations. "
                "Do NOT attempt to render an actual image."
            )

        prompt = f"""Generate exactly {request.numQuestions} math quiz questions for {request.gradeLevel} students.

Topics to cover: {', '.join(effective_topics)}

Question specifications:
{chr(10).join(spec_lines)}
{graph_instruction}

Remember:
- Points: easy=1, medium=3, hard=5
- Each question must have a step-by-step explanation
- Multiple choice must have exactly 4 options
- All math must be accurate
- Make problems relatable to students' real-world experiences"""

        messages = [
            {"role": "system", "content": QUIZ_GENERATION_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]

        logger.info(f"Generating quiz: {request.numQuestions} questions, topics={effective_topics}")

        # Scale max_tokens based on requested questions and allow larger completions
        # for higher-count quizzes while keeping provider-side limits reasonable.
        max_tokens = min(8192, max(3072, request.numQuestions * 320))
        # Use longer HTTP timeout for larger quiz payloads.
        http_timeout = min(300, max(120, request.numQuestions * 10))

        parsed_questions: List[Dict[str, Any]] = []
        raw_content = ""  # Will be set inside the loop
        max_attempts = 3  # Extra retry helps with larger quiz sizes

        for attempt in range(max_attempts):
            raw_content = await call_hf_chat_async(
                messages, max_tokens=max_tokens, temperature=0.1, top_p=0.9,
                timeout=http_timeout,
                task_type="quiz_generation",
                model=HF_QUIZ_MODEL_ID,
            )
            logger.info(f"Raw quiz response length: {len(raw_content)} chars (attempt {attempt + 1})")

            parsed_questions = _parse_quiz_json(raw_content)

            if not parsed_questions:
                logger.error(f"Failed to parse quiz JSON (attempt {attempt + 1}). Raw content:\n{raw_content[:500]}")
                try:
                    repaired_questions = await _repair_quiz_json_with_llm(
                        raw_content,
                        num_questions=request.numQuestions,
                        timeout=http_timeout,
                        model_id=HF_QUIZ_JSON_REPAIR_MODEL_ID,
                    )
                except Exception as repair_exc:
                    logger.warning(f"Quiz JSON repair pass failed (attempt {attempt + 1}): {repair_exc}")
                    repaired_questions = []

                if repaired_questions:
                    parsed_questions = repaired_questions
                    logger.info(
                        "Recovered quiz JSON via repair pass: %s questions (attempt %s)",
                        len(parsed_questions),
                        attempt + 1,
                    )

            if not parsed_questions:
                try:
                    strict_questions = await _regenerate_quiz_json_strict(
                        original_prompt=prompt,
                        num_questions=request.numQuestions,
                        timeout=http_timeout,
                        model_id=HF_QUIZ_JSON_REPAIR_MODEL_ID,
                    )
                except Exception as strict_exc:
                    logger.warning(f"Strict quiz regeneration failed (attempt {attempt + 1}): {strict_exc}")
                    strict_questions = []

                if strict_questions:
                    parsed_questions = strict_questions
                    logger.info(
                        "Recovered quiz JSON via strict regeneration: %s questions (attempt %s)",
                        len(parsed_questions),
                        attempt + 1,
                    )

            if not parsed_questions:
                if attempt < max_attempts - 1:
                    logger.info("Retrying quiz generation...")
                    continue
                raise HTTPException(
                    status_code=500,
                    detail="Failed to parse quiz questions from AI response. Please try again.",
                )

            # If we got at least 70% of requested questions, accept the result
            if len(parsed_questions) >= request.numQuestions * 0.7:
                break

            # Otherwise retry with a stronger nudge
            if attempt < max_attempts - 1:
                logger.warning(
                    f"LLM generated only {len(parsed_questions)}/{request.numQuestions} questions "
                    f"(attempt {attempt + 1}). Retrying with reinforced prompt..."
                )
                # Add an assistant + user turn to push the LLM harder
                messages = [
                    {"role": "system", "content": QUIZ_GENERATION_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                    {"role": "assistant", "content": raw_content},
                    {
                        "role": "user",
                        "content": (
                            f"You only generated {len(parsed_questions)} questions but I need "
                            f"exactly {request.numQuestions}. Please generate ALL "
                            f"{request.numQuestions} questions in a single JSON array. "
                            f"Do not stop early."
                        ),
                    },
                ]

        # Warn if the LLM still generated fewer questions than requested
        if len(parsed_questions) < request.numQuestions:
            logger.warning(
                f"LLM generated {len(parsed_questions)}/{request.numQuestions} questions "
                f"after {max_attempts} attempts (raw length={len(raw_content)} chars)."
            )

        topic_provenance_map: Dict[str, Dict[str, Optional[str]]] = {}
        for imported_topic in (imported_topics_payload.get("topics") or []):
            title = str(imported_topic.get("title") or "").strip()
            if not title:
                continue
            normalized_title = re.sub(r"[^a-z0-9\s]+", " ", title.lower())
            normalized_title = re.sub(r"\s+", " ", normalized_title).strip()
            topic_provenance_map[normalized_title] = {
                "topicId": str(imported_topic.get("topicId") or "") or None,
                "title": title,
                "materialId": str(imported_topic.get("materialId") or "") or None,
                "sourceFile": str(imported_topic.get("sourceFile") or "") or None,
                "sectionId": str(imported_topic.get("sectionId") or "") or None,
            }

        validated = _validate_quiz_questions(
            parsed_questions,
            distribution,
            topic_provenance_map=topic_provenance_map,
        )
        total_points = sum(q.points for q in validated)

        # Build metadata
        topic_counts: Dict[str, int] = {}
        difficulty_counts: Dict[str, int] = {}
        bloom_counts: Dict[str, int] = {}
        for q in validated:
            topic_counts[q.topic] = topic_counts.get(q.topic, 0) + 1
            difficulty_counts[q.difficulty] = difficulty_counts.get(q.difficulty, 0) + 1
            bloom_counts[q.bloomLevel] = bloom_counts.get(q.bloomLevel, 0) + 1

        metadata: Dict[str, Any] = {
            "topicsCovered": topic_counts,
            "difficultyBreakdown": difficulty_counts,
            "bloomTaxonomyDistribution": bloom_counts,
            "questionTypeBreakdown": dict(Counter(q.questionType for q in validated)),
            "gradeLevel": request.gradeLevel,
            "totalQuestions": len(validated),
            "includesGraphQuestions": request.includeGraphs,
            "classSectionId": request.classSectionId,
            "className": request.className,
            "materialId": request.materialId,
            "importGroundingEnabled": import_grounding_enabled,
            "usedImportedTopics": bool(imported_topic_titles),
            "importedMaterialsCount": len(imported_topics_payload.get("materials", [])),
            "importedTopicCount": len(imported_topics_payload.get("topics", [])),
            "importWarnings": import_warnings,
            "topicProvenance": [
                {
                    "topicId": topic.get("topicId"),
                    "title": topic.get("title"),
                    "materialId": topic.get("materialId"),
                    "sourceFile": topic.get("sourceFile"),
                    "sectionId": topic.get("sectionId"),
                }
                for topic in (imported_topics_payload.get("topics") or [])
            ][:20],
            "supplementalPurpose": (
                "This quiz is designed to supplement classroom instruction, "
                "not replace teacher-led learning."
            ),
            "bloomTaxonomyRationale": (
                "Ensures questions assess different cognitive levels from basic recall "
                "to complex analysis, providing comprehensive skill evaluation."
            ),
            "recommendedTeacherActions": [
                "Review questions before assigning to students",
                "Use difficulty breakdown to identify areas needing re-teaching",
                "Focus on topics where students score below 60%",
                "Use Bloom analysis to ensure higher-order thinking is practiced",
            ],
        }

        if request.includeGraphs:
            metadata["graphQuestionNote"] = (
                "Graph questions use identification format as graphing is "
                "challenging for students. Graphs are described in text."
            )

        logger.info(f"Quiz generated: {len(validated)} questions, {total_points} total points")

        return QuizResponse(
            questions=validated,
            totalPoints=total_points,
            metadata=metadata,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Quiz generation error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Quiz generation error: {str(e)}")


@app.post("/api/quiz/preview", response_model=QuizResponse)
async def preview_quiz(http_request: Request, request: QuizGenerationRequest):
    """
    Generate a 3-question preview quiz for teachers to verify AI question
    quality before assigning a full quiz to students.
    """
    # Override to produce only 3 questions
    request.numQuestions = 3
    return await generate_quiz(http_request, request)


@app.post("/api/quiz/generate-async", response_model=AsyncTaskSubmitResponse)
async def generate_quiz_async(http_request: Request, request: QuizGenerationRequest):
    if not ENABLE_ASYNC_GENERATION:
        raise HTTPException(status_code=404, detail="Async generation is disabled")

    enforce_rate_limit(http_request, "generate_quiz_async", 20, 60)
    user = get_current_user(http_request)
    if user.role not in TEACHER_OR_ADMIN:
        raise HTTPException(status_code=403, detail="Forbidden for this role")

    task_id = _create_async_task(
        owner_uid=user.uid,
        task_kind="quiz_generation",
        payload=request.model_dump(),
    )

    async def _quiz_runner() -> QuizResponse:
        _update_async_task(
            task_id,
            progressPercent=30.0,
            progressStage="preparing",
            progressMessage="Preparing quiz prompt and topic distribution.",
        )
        await asyncio.sleep(0)
        _update_async_task(
            task_id,
            progressPercent=70.0,
            progressStage="generating",
            progressMessage="Generating quiz questions with the AI model.",
        )
        response = await generate_quiz(http_request, request)
        _update_async_task(
            task_id,
            progressPercent=92.0,
            progressStage="finalizing",
            progressMessage="Validating generated quiz and finalizing output.",
        )
        return response

    _start_async_task_in_thread(task_id, _quiz_runner)

    with _async_tasks_lock:
        task = dict(_async_tasks.get(task_id, {}))

    return AsyncTaskSubmitResponse(
        success=True,
        taskId=task_id,
        status=str(task.get("status") or "queued"),
        taskKind="quiz_generation",
        createdAt=str(task.get("createdAt") or _utc_now_iso()),
    )


@app.get("/api/tasks/{task_id}", response_model=AsyncTaskStatusResponse)
async def get_async_task_status(http_request: Request, task_id: str):
    user = get_current_user(http_request)

    with _async_tasks_lock:
        _prune_async_tasks()
        task = _async_tasks.get(task_id)
        if task is None:
            raise HTTPException(status_code=404, detail="Task not found")
        owner_uid = str(task.get("ownerUid") or "")
        if user.role != "admin" and owner_uid != user.uid:
            raise HTTPException(status_code=403, detail="Forbidden for this task")
        task_data = dict(task)

    return AsyncTaskStatusResponse(
        success=True,
        taskId=str(task_data.get("taskId") or task_id),
        taskKind=str(task_data.get("taskKind") or "unknown"),
        status=str(task_data.get("status") or "queued"),
        createdAt=str(task_data.get("createdAt") or _utc_now_iso()),
        startedAt=cast(Optional[str], task_data.get("startedAt")),
        completedAt=cast(Optional[str], task_data.get("completedAt")),
        progressPercent=float(task_data.get("progressPercent") or 0.0),
        progressStage=str(task_data.get("progressStage") or "queued"),
        progressMessage=cast(Optional[str], task_data.get("progressMessage")),
        result=cast(Optional[Dict[str, Any]], task_data.get("result")),
        error=task_data.get("error"),
    )


@app.get("/api/tasks", response_model=AsyncTaskListResponse)
async def list_async_tasks(
    http_request: Request,
    limit: int = Query(default=50, ge=1, le=200),
    status: Optional[str] = Query(default=None),
    include_results: bool = Query(default=False),
):
    user = get_current_user(http_request)
    status_filter = (status or "").strip().lower()

    with _async_tasks_lock:
        _prune_async_tasks()
        raw_tasks = list(_async_tasks.values())

    filtered: List[Dict[str, Any]] = []
    for task in raw_tasks:
        owner_uid = str(task.get("ownerUid") or "")
        if user.role != "admin" and owner_uid != user.uid:
            continue
        task_status = str(task.get("status") or "queued").strip().lower()
        if status_filter and task_status != status_filter:
            continue
        filtered.append(dict(task))

    filtered.sort(key=lambda item: str(item.get("createdAt") or ""), reverse=True)
    selected = filtered[:limit]

    task_items: List[AsyncTaskStatusResponse] = []
    for item in selected:
        task_items.append(
            AsyncTaskStatusResponse(
                success=True,
                taskId=str(item.get("taskId") or ""),
                taskKind=str(item.get("taskKind") or "unknown"),
                status=str(item.get("status") or "queued"),
                createdAt=str(item.get("createdAt") or _utc_now_iso()),
                startedAt=cast(Optional[str], item.get("startedAt")),
                completedAt=cast(Optional[str], item.get("completedAt")),
                progressPercent=float(item.get("progressPercent") or 0.0),
                progressStage=str(item.get("progressStage") or "queued"),
                progressMessage=cast(Optional[str], item.get("progressMessage")),
                result=cast(Optional[Dict[str, Any]], item.get("result") if include_results else None),
                error=item.get("error"),
            )
        )

    return AsyncTaskListResponse(success=True, count=len(task_items), tasks=task_items)


@app.post("/api/tasks/{task_id}/cancel", response_model=AsyncTaskCancelResponse)
async def cancel_async_task(http_request: Request, task_id: str):
    user = get_current_user(http_request)

    with _async_tasks_lock:
        _prune_async_tasks()
        task = _async_tasks.get(task_id)
        if task is None:
            raise HTTPException(status_code=404, detail="Task not found")

        owner_uid = str(task.get("ownerUid") or "")
        if user.role != "admin" and owner_uid != user.uid:
            raise HTTPException(status_code=403, detail="Forbidden for this task")

        current_status = str(task.get("status") or "queued").strip().lower()
        if current_status in {"completed", "failed", "cancelled"}:
            return AsyncTaskCancelResponse(
                success=False,
                taskId=task_id,
                status=current_status,
                message="Task is already in a terminal state.",
            )

        task["cancelRequested"] = True
        if current_status == "queued":
            task["status"] = "cancelled"
            task["completedAt"] = _utc_now_iso()
            task["progressPercent"] = 100.0
            task["progressStage"] = "cancelled"
            task["progressMessage"] = "Task was cancelled before execution."
            task["error"] = {"message": "Task cancelled before execution."}
        else:
            task["status"] = "cancelling"
            task["progressStage"] = "cancelling"
            task["progressMessage"] = "Cancellation requested. Waiting for task to stop."

        updated_status = str(task.get("status") or "queued")

    return AsyncTaskCancelResponse(
        success=True,
        taskId=task_id,
        status=updated_status,
        message="Cancellation request accepted.",
    )


@app.get("/api/ops/inference-metrics", response_model=InferenceMetricsResponse)
async def get_inference_metrics(http_request: Request):
    user = get_current_user(http_request)
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden for this role")

    client = get_inference_client()
    metrics_snapshot = client.snapshot_metrics()
    metrics_snapshot["pro_enabled"] = bool(getattr(client, "pro_enabled", False))
    return InferenceMetricsResponse(success=True, metrics=metrics_snapshot)


@app.get("/api/quiz/topics")
async def get_quiz_topics(gradeLevel: Optional[str] = None):
    """
    Return structured list of SHS math topics organised by grade level.
    Only Grade 11 and Grade 12 are supported.
    If gradeLevel is provided, return topics for that grade only.
    """
    if gradeLevel:
        key = _resolve_grade_level_key(gradeLevel)
        if key:
            return {"gradeLevel": key, "topics": MATH_TOPICS_BY_GRADE[key]}
        raise HTTPException(
            status_code=404,
            detail=f"Grade level '{gradeLevel}' not found. Available: {list(MATH_TOPICS_BY_GRADE.keys())}",
        )

    # Return all SHS topics organized by grade
    return {
        "gradeLevels": list(MATH_TOPICS_BY_GRADE.keys()),
        "allTopics": MATH_TOPICS_BY_GRADE,
    }


# ─── Student Competency Assessment ────────────────────────────


@app.post("/api/quiz/student-competency", response_model=StudentCompetencyResponse)
async def student_competency(request: StudentCompetencyRequest):
    """
    Assess a student's competency per topic based on their quiz history.
    Returns efficiency scores, competency levels, and recommendations.
    """
    try:
        history = request.quizHistory or []

        if not history:
            # No history — return empty competency with recommendation to start
            return StudentCompetencyResponse(
                studentId=request.studentId,
                competencies=[],
                recommendedTopics=["Start with foundational topics to build a learning profile"],
                excludeTopics=[],
            )

        # Aggregate scores per topic
        topic_data: Dict[str, List[Dict[str, Any]]] = {}
        for entry in history:
            topic = _canonicalize_topic_label(str(entry.get("topic", "Unknown")))
            if topic not in topic_data:
                topic_data[topic] = []
            topic_data[topic].append(entry)

        # Compute competency per topic
        competencies: List[TopicCompetency] = []
        recommended: List[str] = []
        exclude: List[str] = []

        for topic, entries in topic_data.items():
            scores = [e.get("score", 0) / max(e.get("total", 1), 1) * 100 for e in entries]
            avg_score = sum(scores) / len(scores) if scores else 0

            # Factor in time efficiency (faster with correct answers = more efficient)
            time_factors = []
            for e in entries:
                if e.get("timeTaken") and e.get("total"):
                    time_per_q = e["timeTaken"] / e["total"]
                    # Normalise: < 30s per question = efficient, > 120s = slow
                    efficiency = max(0, min(100, 100 - (time_per_q - 30) * (100 / 90)))
                    time_factors.append(efficiency)

            time_efficiency = sum(time_factors) / len(time_factors) if time_factors else 50
            efficiency_score = round(avg_score * 0.7 + time_efficiency * 0.3, 1)

            if efficiency_score >= 85:
                level = "advanced"
                perspective = f"Student demonstrates strong mastery of {topic}. Consistently scores well with efficient problem-solving."
                exclude.append(topic)
            elif efficiency_score >= 65:
                level = "proficient"
                perspective = f"Student has solid understanding of {topic} but may benefit from challenging practice problems."
            elif efficiency_score >= 40:
                level = "developing"
                perspective = f"Student shows foundational knowledge of {topic} but needs more practice to build fluency."
                recommended.append(topic)
            else:
                level = "beginner"
                perspective = f"Student is still building understanding of {topic}. Recommend focused review and guided practice."
                recommended.insert(0, topic)  # High-priority

            competencies.append(TopicCompetency(
                topic=topic,
                efficiencyScore=efficiency_score,
                competencyLevel=level,
                perspective=perspective,
            ))

        # If the AI is available, enhance perspectives
        if competencies:
            try:
                summary = ", ".join(
                    f"{c.topic}: {c.competencyLevel} ({c.efficiencyScore}%)"
                    for c in competencies
                )
                ai_prompt = f"""Based on this student competency profile, provide a brief (2-3 sentence) overall assessment:
{summary}

Focus on actionable recommendations. Be encouraging yet honest."""

                overall_perspective = await call_hf_chat_async(
                    messages=[
                        {"role": "system", "content": "You are an educational assessment expert. Be concise and supportive."},
                        {"role": "user", "content": ai_prompt},
                    ],
                    max_tokens=200,
                    temperature=0.3,
                )
                if overall_perspective:
                    # Add to recommended as a note
                    recommended.append(f"AI Insight: {overall_perspective.strip()}")
            except Exception as e:
                logger.warning(f"AI competency enhancement failed: {e}")

        competencies.sort(key=lambda c: c.efficiencyScore)

        return StudentCompetencyResponse(
            studentId=request.studentId,
            competencies=competencies,
            recommendedTopics=recommended,
            excludeTopics=exclude,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Student competency error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Competency assessment error: {str(e)}")


# ─── Calculator / Symbolic Math ───────────────────────────────

# Allowed names for safe expression evaluation via SymPy
_SAFE_SYMPY_NAMES: Optional[Dict[str, Any]] = None


def _get_sympy_safe_dict() -> Dict[str, Any]:
    """Lazily build allowlist of SymPy names for safe eval."""
    global _SAFE_SYMPY_NAMES
    if _SAFE_SYMPY_NAMES is not None:
        return _SAFE_SYMPY_NAMES

    import sympy  # type: ignore[import-untyped]

    _SAFE_SYMPY_NAMES = {
        # Symbols
        "x": sympy.Symbol("x"),
        "y": sympy.Symbol("y"),
        "z": sympy.Symbol("z"),
        "t": sympy.Symbol("t"),
        "n": sympy.Symbol("n"),
        # Constants
        "pi": sympy.pi,
        "e": sympy.E,
        "E": sympy.E,
        "I": sympy.I,
        "oo": sympy.oo,
        "inf": sympy.oo,
        # Functions
        "sin": sympy.sin,
        "cos": sympy.cos,
        "tan": sympy.tan,
        "asin": sympy.asin,
        "acos": sympy.acos,
        "atan": sympy.atan,
        "sinh": sympy.sinh,
        "cosh": sympy.cosh,
        "tanh": sympy.tanh,
        "log": sympy.log,
        "ln": sympy.log,
        "exp": sympy.exp,
        "sqrt": sympy.sqrt,
        "Abs": sympy.Abs,
        "abs": sympy.Abs,
        "factorial": sympy.factorial,
        "binomial": sympy.binomial,
        "ceiling": sympy.ceiling,
        "floor": sympy.floor,
        # Operations
        "diff": sympy.diff,
        "integrate": sympy.integrate,
        "limit": sympy.limit,
        "solve": sympy.solve,
        "simplify": sympy.simplify,
        "expand": sympy.expand,
        "factor": sympy.factor,
        "Rational": sympy.Rational,
        "Matrix": sympy.Matrix,
        "Sum": sympy.Sum,
        "Product": sympy.Product,
        "Derivative": sympy.Derivative,
        "Integral": sympy.Integral,
        "Limit": sympy.Limit,
    }
    return _SAFE_SYMPY_NAMES


_DANGEROUS_PATTERNS = re.compile(
    r"(__\w+__|import\s|exec\s*\(|eval\s*\(|open\s*\(|os\.|sys\.|subprocess|shutil|__builtins__|globals|locals|compile|getattr|setattr|delattr)",
    re.IGNORECASE,
)


@app.post("/api/calculator/evaluate", response_model=CalculatorResponse)
async def calculator_evaluate(request: CalculatorRequest):
    """
    Evaluate a mathematical expression symbolically using SymPy.
    Supports arithmetic, algebra, trigonometry, and calculus.
    """
    try:
        import sympy  # type: ignore[import-untyped]

        expr_str = request.expression.strip()

        # Safety validation
        if _DANGEROUS_PATTERNS.search(expr_str):
            raise HTTPException(
                status_code=400,
                detail="Expression contains disallowed patterns. Only mathematical expressions are permitted.",
            )
        if len(expr_str) > 500:
            raise HTTPException(status_code=400, detail="Expression too long (max 500 characters).")

        safe_dict = _get_sympy_safe_dict()
        steps: List[str] = [f"Input expression: {expr_str}"]

        # Parse expression
        try:
            parsed = sympy.sympify(expr_str, locals=safe_dict)
            steps.append(f"Parsed as: {parsed}")
        except Exception as parse_err:
            raise HTTPException(
                status_code=400,
                detail=f"Could not parse expression: {str(parse_err)}",
            )

        # Simplify
        simplified = sympy.simplify(parsed)
        if simplified != parsed:
            steps.append(f"Simplified: {simplified}")

        # Try numeric evaluation
        try:
            numeric = float(simplified.evalf())
            if numeric == int(numeric):
                result_str = str(int(numeric))
            else:
                result_str = str(round(numeric, 10))
            steps.append(f"Numerical result: {result_str}")
        except Exception:
            result_str = str(simplified)
            steps.append(f"Symbolic result: {result_str}")

        # LaTeX representation
        try:
            latex_str = sympy.latex(simplified)
        except Exception:
            latex_str = None

        return CalculatorResponse(
            expression=expr_str,
            result=result_str,
            steps=steps,
            simplified=str(simplified) if simplified != parsed else None,
            latex=latex_str,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Calculator error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Calculator error: {str(e)}")


# ─── ML-Powered Student Analytics Endpoints ──────────────────


@app.post("/api/student/competency-analysis", response_model=CompetencyAnalysisResponse)
async def student_competency_analysis(request: CompetencyAnalysisRequest):
    """
    Analyse student competency per topic using IRT (Item Response Theory).
    Calculates efficiency scores, mastery percentages, learning velocity,
    and theta (ability) estimates.
    """
    try:
        logger.info(f"Competency analysis requested for student {request.studentId}")

        # Fetch quiz history from Firestore
        quiz_history = await fetch_student_quiz_history(request.studentId)

        result = await compute_competency_analysis(
            student_id=request.studentId,
            quiz_history=quiz_history,
            topic_filter=request.topicId,
        )

        # Store results if successful
        if result.status == "success":
            await store_competency_analysis(
                request.studentId,
                {
                    "analyses": [a.dict() for a in result.analyses],
                    "overallCompetency": result.overallCompetency,
                    "thetaEstimate": result.thetaEstimate,
                },
            )

        return result

    except Exception as e:
        logger.error(f"Competency analysis error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Competency analysis error: {str(e)}")


@app.post("/api/risk/train-model", response_model=RiskTrainResponse)
async def train_risk_classification_model(request: RiskTrainRequest):
    """
    Train a supervised ML model (XGBoost/Random Forest) for student risk prediction.
    Admin-only endpoint. Collects historical data from Firestore, trains the model,
    and saves it to disk.
    """
    try:
        logger.info(f"Risk model training requested (forceRetrain={request.forceRetrain})")
        result = await train_risk_model(force_retrain=request.forceRetrain)
        return result
    except Exception as e:
        logger.error(f"Risk model training error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Model training error: {str(e)}")


@app.post("/api/predict-risk/enhanced", response_model=EnhancedRiskPrediction)
async def predict_risk_ml(data: EnhancedRiskRequest):
    """
    Enhanced student risk prediction using trained ML model with SHAP explanations.
    Falls back to rule-based heuristics if no trained model is available.
    Returns risk probabilities for all classes and top contributing factors.
    """
    try:
        logger.info(f"Enhanced risk prediction for student {data.studentId}")
        result = await predict_risk_enhanced(data)
        if ENABLE_LLM_RISK_RECOMMENDATIONS:
            try:
                llm_recommendations = await _generate_risk_recommendations_llm(data, result)
                if llm_recommendations:
                    result.recommendations = llm_recommendations
                    result.modelUsed = "ml_model+llm_narrative"
            except Exception as llm_exc:
                logger.warning(f"Risk recommendation generation via LLM failed: {llm_exc}")
        return result
    except Exception as e:
        logger.error(f"Enhanced risk prediction error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Risk prediction error: {str(e)}")


@app.post("/api/quiz/calibrate-difficulty", response_model=CalibrateDifficultyResponse)
async def calibrate_quiz_difficulty(request: CalibrateDifficultyRequest):
    """
    Calculate IRT difficulty parameters for a question based on student responses.
    Uses 3-Parameter Logistic model to estimate difficulty (b), discrimination (a),
    and guessing (c) parameters.
    """
    try:
        logger.info(f"Calibrating difficulty for question {request.questionId}")
        result = await calibrate_question_difficulty(request)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Difficulty calibration error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Calibration error: {str(e)}")


@app.post("/api/quiz/adaptive-select", response_model=AdaptiveQuizResponse)
async def adaptive_quiz_selection(request: AdaptiveQuizSelectRequest):
    """
    Select questions adaptively based on student ability level using IRT.
    Adjusts difficulty distribution to target ~70-75% success rate.
    Uses student competency data to personalize quiz difficulty.
    """
    try:
        logger.info(f"Adaptive quiz selection for student {request.studentId}, topic {request.topicId}")
        result = await select_adaptive_quiz(request)
        return result
    except Exception as e:
        logger.error(f"Adaptive quiz selection error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Adaptive selection error: {str(e)}")


@app.post("/api/learning/recommend-topics", response_model=TopicRecommendationResponse)
async def recommend_learning_topics(request: TopicRecommendationRequest):
    """
    Recommend topics for a student based on competency gaps, prerequisites,
    recency of practice, and peer performance patterns.
    Returns ranked list with reasoning and estimated time to mastery.
    """
    try:
        logger.info(f"Topic recommendation for student {request.studentId}")
        result = await recommend_topics(request)
        return result
    except Exception as e:
        logger.error(f"Topic recommendation error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Recommendation error: {str(e)}")


@app.get("/api/analytics/student-summary", response_model=StudentSummaryResponse)
async def student_analytics_summary(request: Request, studentId: str = Query(..., description="Firebase user ID")):
    """
    Aggregate all ML-powered metrics for a student:
    competency distribution, risk assessment, recommendations,
    learning velocity trends, efficiency scores, predicted performance,
    and engagement pattern analysis.
    """
    try:
        require_student_self_or_staff(request, studentId)
        logger.info(f"Student summary requested for {studentId}")
        result = await get_student_summary(studentId)
        return result
    except Exception as e:
        logger.error(f"Student summary error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Analytics error: {str(e)}")


@app.post("/api/analytics/class-insights", response_model=ClassInsightsResponse)
async def class_analytics_insights(request: ClassInsightsRequest):
    """
    Aggregate class-wide ML analytics for teacher dashboards.
    Includes risk distribution, common weak topics, learning velocity,
    engagement patterns, and intervention recommendations.
    """
    try:
        logger.info(f"Class insights requested by teacher {request.teacherId}")
        result = await get_class_insights(request)
        return result
    except Exception as e:
        logger.error(f"Class insights error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Class insights error: {str(e)}")


@app.post("/api/analytics/refresh-cache", response_model=RefreshCacheResponse)
async def refresh_analytics_cache():
    """
    Force clear and refresh all ML analytics caches.
    Use when student data has been updated and fresh analysis is needed.
    """
    try:
        result = refresh_all_caches()
        logger.info("Analytics caches refreshed")
        return result
    except Exception as e:
        logger.error(f"Cache refresh error: {e}")
        raise HTTPException(status_code=500, detail=f"Cache refresh error: {str(e)}")


@app.post("/api/dev/generate-mock-data")
async def generate_mock_data(request: MockDataRequest):
    """
    Generate realistic mock student data for testing ML features.
    Development/testing endpoint only.
    Generates students with varied archetypes: perfect, struggling,
    inconsistent, improving, declining, and average performers.
    """
    try:
        logger.info(f"Generating mock data: {request.numStudents} students, {request.numQuizzes} quizzes")
        data = generate_mock_student_data(
            num_students=request.numStudents,
            num_quizzes=request.numQuizzes,
            seed=request.seed,
        )
        return data
    except Exception as e:
        logger.error(f"Mock data generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Mock data error: {str(e)}")


@app.get("/api/analytics/config")
async def get_analytics_config():
    """Return current ML analytics configuration parameters."""
    return {
        "riskModelPath": RISK_MODEL_PATH,
        "riskModelExists": os.path.exists(RISK_MODEL_PATH),
        "competencyThresholds": COMPETENCY_THRESHOLDS,
        "minQuizAttemptsForCompetency": MIN_QUIZ_ATTEMPTS_FOR_COMPETENCY,
        "cacheTTLSeconds": 3600,
        "topicPrerequisites": fetch_topic_dependencies(),
    }


@app.get("/api/analytics/imported-class-overview")
async def get_imported_class_overview(
    request: Request,
    classSectionId: Optional[str] = Query(default=None),
    limit: int = Query(default=3000, ge=1, le=5000),
):
    """Return teacher-facing class/student aggregates derived from imported normalized records."""
    try:
        user = get_current_user(request)
        if not (_firebase_ready and firebase_firestore):
            raise HTTPException(status_code=503, detail="Firestore unavailable")

        normalized_class_section_id = (classSectionId or "").strip().lower() or None
        client = firebase_firestore.client()
        try:
            query = client.collection("normalizedClassRecords").where("teacherId", "==", user.uid)
            docs = list(query.limit(limit).stream())
        except Exception as firestore_err:
            if _is_adc_missing_error(cast(Exception, firestore_err)):
                raise HTTPException(
                    status_code=503,
                    detail=(
                        "Firestore ADC is not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON "
                        "or FIREBASE_SERVICE_ACCOUNT_FILE, or set GOOGLE_APPLICATION_CREDENTIALS."
                    ),
                )
            raise

        class_agg: Dict[str, Dict[str, Any]] = {}
        student_agg: Dict[str, Dict[str, Any]] = {}

        for doc in docs:
            row = doc.to_dict() or {}
            resolved_class_section_id, resolved_class_name, grade, section = _resolve_import_class_context(
                class_section_id=str(row.get("classSectionId") or "").strip() or None,
                class_name=str(row.get("className") or "").strip() or None,
            )

            if normalized_class_section_id and resolved_class_section_id != normalized_class_section_id:
                continue

            student_identity = (
                str(row.get("studentId") or "").strip()
                or str(row.get("lrn") or "").strip()
                or str(row.get("email") or "").strip().lower()
                or re.sub(r"\s+", "_", str(row.get("name") or "").strip().lower())
            )
            if not student_identity:
                continue

            student_key = f"{resolved_class_section_id}|{student_identity}"
            avg_quiz = float(row.get("avgQuizScore") or 0.0)
            attendance = float(row.get("attendance") or 0.0)
            engagement = float(row.get("engagementScore") or 0.0)
            completion = float(row.get("assignmentCompletion") or 0.0)
            weakest_topic = _pick_weakest_topic(row.get("unknownFields") or {})
            has_topic_signal = weakest_topic not in {"", "Foundational Skills"}
            inference = _infer_student_state(
                avg_quiz=avg_quiz,
                attendance=attendance,
                engagement=engagement,
                defaulted_metrics=set(),
                has_topic_signal=has_topic_signal,
            )
            risk_level = str(inference["riskLevel"])

            existing_student = student_agg.get(student_key)
            if not existing_student:
                student_agg[student_key] = {
                    "id": hashlib.sha1(f"{user.uid}|{student_key}".encode("utf-8")).hexdigest()[:36],
                    "lrn": str(row.get("lrn") or "").strip() or None,
                    "name": str(row.get("name") or "Imported Student").strip() or "Imported Student",
                    "email": str(row.get("email") or "").strip(),
                    "classSectionId": resolved_class_section_id,
                    "className": resolved_class_name,
                    "grade": grade,
                    "section": section,
                    "scores": [avg_quiz],
                    "attendanceValues": [attendance],
                    "engagementValues": [engagement],
                    "completionValues": [completion],
                    "riskLevel": risk_level,
                    "weakestTopic": weakest_topic,
                    "inferredState": {
                        "state": inference["state"],
                        "confidence": inference["confidence"],
                        "signals": inference["signals"],
                        "explanation": inference["explanation"],
                        "fallbackUsed": inference["fallbackUsed"],
                    },
                }
            else:
                existing_student["scores"].append(avg_quiz)
                existing_student["attendanceValues"].append(attendance)
                existing_student["engagementValues"].append(engagement)
                existing_student["completionValues"].append(completion)
                if existing_student.get("riskLevel") != "High" and risk_level == "High":
                    existing_student["riskLevel"] = "High"
                elif existing_student.get("riskLevel") == "Low" and risk_level == "Medium":
                    existing_student["riskLevel"] = "Medium"
                if existing_student.get("weakestTopic") in {"", "Foundational Skills"} and weakest_topic:
                    existing_student["weakestTopic"] = weakest_topic
                if float(inference["confidence"]) < float(existing_student.get("inferredState", {}).get("confidence") or 1.0):
                    existing_student["inferredState"] = {
                        "state": inference["state"],
                        "confidence": inference["confidence"],
                        "signals": inference["signals"],
                        "explanation": inference["explanation"],
                        "fallbackUsed": inference["fallbackUsed"],
                    }

            existing_class = class_agg.get(resolved_class_section_id)
            if not existing_class:
                class_agg[resolved_class_section_id] = {
                    "id": resolved_class_section_id,
                    "name": resolved_class_name,
                    "classSectionId": resolved_class_section_id,
                    "grade": grade,
                    "section": section,
                    "schedule": "Mon-Fri",
                    "students": set(),
                    "scoreValues": [],
                    "atRiskStudents": set(),
                }

            class_agg[resolved_class_section_id]["students"].add(student_key)
            class_agg[resolved_class_section_id]["scoreValues"].append(avg_quiz)
            if risk_level == "High":
                class_agg[resolved_class_section_id]["atRiskStudents"].add(student_key)

        students_payload: List[Dict[str, Any]] = []
        for student in student_agg.values():
            scores = student.pop("scores", [])
            attendance_values = student.pop("attendanceValues", [])
            engagement_values = student.pop("engagementValues", [])
            completion_values = student.pop("completionValues", [])
            students_payload.append(
                {
                    **student,
                    "avgQuizScore": round(float(sum(scores) / max(len(scores), 1)), 1),
                    "attendance": round(float(sum(attendance_values) / max(len(attendance_values), 1)), 1),
                    "engagementScore": round(float(sum(engagement_values) / max(len(engagement_values), 1)), 1),
                    "assignmentCompletion": round(float(sum(completion_values) / max(len(completion_values), 1)), 1),
                    "stateConfidence": float((student.get("inferredState") or {}).get("confidence") or 0.0),
                    "stateSignals": list((student.get("inferredState") or {}).get("signals") or []),
                }
            )

        classrooms_payload: List[Dict[str, Any]] = []
        for classroom in class_agg.values():
            score_values = classroom.get("scoreValues") or []
            classrooms_payload.append(
                {
                    "id": classroom["id"],
                    "name": classroom["name"],
                    "classSectionId": classroom["classSectionId"],
                    "schedule": classroom["schedule"],
                    "studentCount": len(classroom.get("students") or set()),
                    "avgScore": round(float(sum(score_values) / max(len(score_values), 1)), 1) if score_values else 0.0,
                    "atRiskCount": len(classroom.get("atRiskStudents") or set()),
                }
            )

        classrooms_payload.sort(key=lambda item: item.get("name") or "")
        students_payload.sort(key=lambda item: item.get("name") or "")

        warnings: List[str] = []
        if len(docs) >= limit:
            warnings.append("Imported class overview reached the maximum row scan limit; results may be partial.")

        inferred_count = sum(1 for item in students_payload if item.get("inferredState"))
        inferred_coverage_pct = round((float(inferred_count) / float(max(len(students_payload), 1))) * 100.0, 1)

        return {
            "success": True,
            "classSectionId": normalized_class_section_id,
            "classrooms": classrooms_payload,
            "students": students_payload,
            "inferredStateCoverage": {
                "inferredRows": inferred_count,
                "studentRows": len(students_payload),
                "coveragePct": inferred_coverage_pct,
            },
            "warnings": warnings,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Imported class overview error: {e}")
        raise HTTPException(status_code=500, detail=f"Imported class overview error: {str(e)}")


# ─── Topic Mastery Analytics ──────────────────────────────────

# SHS topic data for fallback/mock generation
_SHS_TOPICS = {
    "gen-math": {
        "name": "General Mathematics",
        "topics": [
            ("Functions and Relations", "Functions and Their Graphs"),
            ("Evaluating Functions", "Functions and Their Graphs"),
            ("Operations on Functions", "Functions and Their Graphs"),
            ("Composite Functions", "Functions and Their Graphs"),
            ("Inverse Functions", "Functions and Their Graphs"),
            ("Rational Functions", "Functions and Their Graphs"),
            ("Exponential Functions", "Functions and Their Graphs"),
            ("Logarithmic Functions", "Functions and Their Graphs"),
            ("Simple Interest", "Business Mathematics"),
            ("Compound Interest", "Business Mathematics"),
            ("Annuities", "Business Mathematics"),
            ("Loans and Amortization", "Business Mathematics"),
            ("Stocks and Bonds", "Business Mathematics"),
            ("Propositions and Connectives", "Logic"),
            ("Truth Tables", "Logic"),
            ("Logical Equivalence", "Logic"),
            ("Valid Arguments and Fallacies", "Logic"),
        ],
    },
    "stats-prob": {
        "name": "Statistics and Probability",
        "topics": [
            ("Random Variables", "Random Variables"),
            ("Discrete Probability Distributions", "Random Variables"),
            ("Mean and Variance of Discrete RV", "Random Variables"),
            ("Normal Distribution", "Normal Distribution"),
            ("Standard Normal Distribution and Z-scores", "Normal Distribution"),
            ("Areas Under the Normal Curve", "Normal Distribution"),
            ("Sampling Distributions", "Sampling and Estimation"),
            ("Central Limit Theorem", "Sampling and Estimation"),
            ("Point Estimation", "Sampling and Estimation"),
            ("Confidence Intervals", "Sampling and Estimation"),
            ("Hypothesis Testing Concepts", "Hypothesis Testing"),
            ("T-test", "Hypothesis Testing"),
            ("Z-test", "Hypothesis Testing"),
            ("Correlation and Regression", "Correlation and Regression"),
        ],
    },
    "pre-calc": {
        "name": "Pre-Calculus",
        "topics": [
            ("Conic Sections - Parabola", "Analytic Geometry"),
            ("Conic Sections - Ellipse", "Analytic Geometry"),
            ("Conic Sections - Hyperbola", "Analytic Geometry"),
            ("Conic Sections - Circle", "Analytic Geometry"),
            ("Systems of Nonlinear Equations", "Analytic Geometry"),
            ("Sequences and Series", "Series and Induction"),
            ("Arithmetic Sequences", "Series and Induction"),
            ("Geometric Sequences", "Series and Induction"),
            ("Mathematical Induction", "Series and Induction"),
            ("Binomial Theorem", "Series and Induction"),
            ("Angles and Unit Circle", "Trigonometry"),
            ("Trigonometric Functions", "Trigonometry"),
            ("Trigonometric Identities", "Trigonometry"),
            ("Sum and Difference Formulas", "Trigonometry"),
            ("Inverse Trigonometric Functions", "Trigonometry"),
            ("Polar Coordinates", "Trigonometry"),
        ],
    },
    "basic-calc": {
        "name": "Basic Calculus",
        "topics": [
            ("Limits of Functions", "Limits"),
            ("Limit Theorems", "Limits"),
            ("One-Sided Limits", "Limits"),
            ("Infinite Limits and Limits at Infinity", "Limits"),
            ("Continuity of Functions", "Limits"),
            ("Definition of the Derivative", "Derivatives"),
            ("Differentiation Rules", "Derivatives"),
            ("Chain Rule", "Derivatives"),
            ("Implicit Differentiation", "Derivatives"),
            ("Higher-Order Derivatives", "Derivatives"),
            ("Related Rates", "Derivatives"),
            ("Extrema and the First Derivative Test", "Derivatives"),
            ("Concavity and the Second Derivative Test", "Derivatives"),
            ("Optimization Problems", "Derivatives"),
            ("Antiderivatives and Indefinite Integrals", "Integration"),
            ("Definite Integrals and the FTC", "Integration"),
            ("Integration by Substitution", "Integration"),
            ("Area Under a Curve", "Integration"),
        ],
    },
}


@app.get("/api/analytics/topic-mastery")
async def topic_mastery_analytics(
    request: Request,
    teacherId: str = Query(..., description="Teacher UID"),
    classId: Optional[str] = Query(None, description="Optional class ID filter"),
    classSectionId: Optional[str] = Query(None, description="Optional class section ID filter"),
):
    """
    Aggregate per-topic mastery statistics for a teacher's class.
    Returns topic-level averages, attempt counts, and mastery status.
    """
    try:
        user = get_current_user(request)
        if user.role != "admin" and teacherId != user.uid:
            raise HTTPException(status_code=403, detail="Forbidden for this teacher scope")
        if not (_firebase_ready and firebase_firestore):
            raise HTTPException(status_code=503, detail="Firestore unavailable")

        effective_class_section_id = (classSectionId or classId or "").strip().lower() or None

        topic_lookup: Dict[str, Dict[str, str]] = {}
        for subject_id, subject_meta in _SHS_TOPICS.items():
            for topic_name, unit in subject_meta.get("topics", []):
                canonical_name = _canonicalize_topic_label(topic_name)
                if not canonical_name:
                    continue
                topic_lookup[_normalize_topic_key(canonical_name)] = {
                    "topicName": canonical_name,
                    "subjectId": subject_id,
                    "unit": unit,
                }

        def resolve_topic_meta(raw_topic: str) -> Dict[str, str]:
            canonical = _canonicalize_topic_label(raw_topic)
            key = _normalize_topic_key(canonical)
            if key in topic_lookup:
                return topic_lookup[key]
            return {
                "topicName": canonical or "General Performance",
                "subjectId": "gen-math",
                "unit": "Imported Curriculum",
            }

        def extract_topics_from_record(row: Dict[str, Any]) -> List[str]:
            candidates: List[str] = []
            assessment_name = _canonicalize_topic_label(str(row.get("assessmentName") or "").strip())
            if assessment_name and assessment_name.lower() != "general-assessment":
                candidates.append(assessment_name)

            unknown_fields = row.get("unknownFields") or {}
            if isinstance(unknown_fields, dict):
                for key, value in unknown_fields.items():
                    if any(token in str(key).lower() for token in ("topic", "unit", "lesson", "skill", "competency")):
                        fragments = re.split(r"[,;|]+", str(value or ""))
                        for fragment in fragments:
                            label = _canonicalize_topic_label(fragment.strip())
                            if label:
                                candidates.append(label)

            deduped: List[str] = []
            seen_keys: Set[str] = set()
            for candidate in candidates:
                key = _normalize_topic_key(candidate)
                if not key or key in seen_keys:
                    continue
                seen_keys.add(key)
                deduped.append(candidate)

            if not deduped:
                return ["General Performance"]
            return deduped

        client = firebase_firestore.client()
        records_query = client.collection("normalizedClassRecords").where("teacherId", "==", teacherId)
        material_query = client.collection("courseMaterials").where("teacherId", "==", teacherId)

        docs = list(records_query.limit(3000).stream())
        student_ids: Set[str] = set()
        topic_stats: Dict[str, Dict[str, Any]] = {}
        fallback_topic_rows = 0

        for doc in docs:
            row = doc.to_dict() or {}
            resolved_class_section_id, _, _, _ = _resolve_import_class_context(
                class_section_id=str(row.get("classSectionId") or "").strip() or None,
                class_name=str(row.get("className") or "").strip() or None,
            )
            if effective_class_section_id and resolved_class_section_id != effective_class_section_id:
                continue

            student_identity = (
                str(row.get("studentId") or "").strip()
                or str(row.get("lrn") or "").strip()
                or str(row.get("email") or "").strip().lower()
                or re.sub(r"\s+", "_", str(row.get("name") or "").strip().lower())
            )
            if student_identity:
                student_ids.add(student_identity)

            avg_quiz_score = float(row.get("avgQuizScore") or 0.0)
            extracted_topics = extract_topics_from_record(row)
            if extracted_topics == ["General Performance"]:
                fallback_topic_rows += 1

            for topic_label in extracted_topics:
                metadata = resolve_topic_meta(topic_label)
                topic_key = _normalize_topic_key(metadata["topicName"])
                if topic_key not in topic_stats:
                    topic_stats[topic_key] = {
                        "topicName": metadata["topicName"],
                        "subjectId": metadata["subjectId"],
                        "unit": metadata["unit"],
                        "scores": [],
                        "students": set(),
                        "studentsAbove85": 0,
                    }

                topic_stats[topic_key]["scores"].append(avg_quiz_score)
                if student_identity:
                    if student_identity not in topic_stats[topic_key]["students"] and avg_quiz_score >= 85:
                        topic_stats[topic_key]["studentsAbove85"] += 1
                    topic_stats[topic_key]["students"].add(student_identity)

        material_docs = list(material_query.limit(200).stream())
        for doc in material_docs:
            data = doc.to_dict() or {}
            resolved_material_section_id, _, _, _ = _resolve_import_class_context(
                class_section_id=str(data.get("classSectionId") or "").strip() or None,
                class_name=str(data.get("className") or "").strip() or None,
            )
            if effective_class_section_id and resolved_material_section_id != effective_class_section_id:
                continue

            for topic in data.get("topics") or []:
                topic_title = str((topic or {}).get("title") or "").strip()
                if not topic_title:
                    continue
                metadata = resolve_topic_meta(topic_title)
                topic_key = _normalize_topic_key(metadata["topicName"])
                if topic_key not in topic_stats:
                    topic_stats[topic_key] = {
                        "topicName": metadata["topicName"],
                        "subjectId": metadata["subjectId"],
                        "unit": metadata["unit"],
                        "scores": [],
                        "students": set(),
                        "studentsAbove85": 0,
                    }

        total_students = len(student_ids)
        topics_payload: List[Dict[str, Any]] = []
        mastered_count = 0
        needs_attention_count = 0

        for topic_data in topic_stats.values():
            scores = topic_data.get("scores") or []
            students_attempted = len(topic_data.get("students") or set())
            class_average = float(sum(scores) / len(scores)) if scores else 0.0
            mastery_percentage = (
                float(topic_data.get("studentsAbove85") or 0) / float(total_students) * 100.0
                if total_students > 0
                else 0.0
            )

            if students_attempted == 0:
                mastery_status = "no_data"
            elif mastery_percentage >= 75.0:
                mastery_status = "mastered"
            elif class_average >= 65.0 or mastery_percentage >= 40.0:
                mastery_status = "on_track"
            else:
                mastery_status = "needs_attention"

            if mastery_status == "mastered":
                mastered_count += 1
            if mastery_status == "needs_attention":
                needs_attention_count += 1

            topics_payload.append(
                {
                    "topicName": topic_data["topicName"],
                    "subjectId": topic_data["subjectId"],
                    "unit": topic_data["unit"],
                    "classAverage": round(class_average, 1),
                    "studentsAttempted": students_attempted,
                    "totalStudents": total_students,
                    "studentsAbove85": int(topic_data.get("studentsAbove85") or 0),
                    "masteryPercentage": round(mastery_percentage, 1),
                    "masteryStatus": mastery_status,
                    "isExcluded": False,
                }
            )

        topics_payload.sort(key=lambda item: (item["masteryStatus"], item["topicName"]))

        warnings: List[str] = []
        if fallback_topic_rows > 0:
            warnings.append(
                "Some records did not contain explicit topic/assessment columns; fallback topic context was applied."
            )

        return {
            "topics": topics_payload,
            "summary": {
                "totalTopicsTracked": len(topics_payload),
                "masteredCount": mastered_count,
                "needsAttentionCount": needs_attention_count,
                "excludedCount": 0,
                "fallbackTopicRows": fallback_topic_rows,
            },
            "warnings": warnings,
        }
    except Exception as e:
        logger.error(f"Topic mastery analytics error: {e}")
        raise HTTPException(status_code=500, detail=f"Topic mastery error: {str(e)}")


# ─── Automation Engine Endpoints ──────────────────────────────


@app.post("/api/automation/diagnostic-completed", response_model=AutomationResult)
async def automation_diagnostic_completed(payload: DiagnosticCompletionPayload):
    """
    Trigger automation pipeline after a student completes the diagnostic.
    Classifies risk per subject, generates learning path, creates
    remedial quizzes, and produces teacher intervention recommendations.
    """
    try:
        logger.info(f"Automation trigger: diagnostic_completed for {payload.studentId}")
        result = await automation_engine.handle_diagnostic_completion(payload)
        return result
    except Exception as e:
        logger.error(f"Automation diagnostic error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Automation error: {str(e)}")


@app.post("/api/automation/quiz-submitted", response_model=AutomationResult)
async def automation_quiz_submitted(payload: QuizSubmissionPayload):
    """
    Trigger automation after any quiz / assessment submission.
    Recalculates risk for the subject and determines status changes.
    """
    try:
        logger.info(f"Automation trigger: quiz_submitted by {payload.studentId}")
        result = await automation_engine.handle_quiz_submission(payload)
        return result
    except Exception as e:
        logger.error(f"Automation quiz error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Automation error: {str(e)}")


@app.post("/api/automation/student-enrolled", response_model=AutomationResult)
async def automation_student_enrolled(payload: StudentEnrollmentPayload):
    """
    Trigger automation when a new student account is created.
    Initialises progress tracking, gamification, and flags diagnostic as pending.
    """
    try:
        logger.info(f"Automation trigger: student_enrolled for {payload.studentId}")
        result = await automation_engine.handle_student_enrollment(payload)
        return result
    except Exception as e:
        logger.error(f"Automation enrollment error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Automation error: {str(e)}")


@app.post("/api/automation/data-imported", response_model=AutomationResult)
async def automation_data_imported(payload: DataImportPayload):
    """
    Trigger automation after a teacher uploads external data.
    Recalculates risk for all affected students and flags status changes.
    """
    try:
        logger.info(f"Automation trigger: data_imported by teacher {payload.teacherId}")
        result = await automation_engine.handle_data_import(payload)
        return result
    except Exception as e:
        logger.error(f"Automation import error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Automation error: {str(e)}")


@app.post("/api/automation/content-updated", response_model=AutomationResult)
async def automation_content_updated(payload: ContentUpdatePayload):
    """
    Trigger automation after admin CRUD on curriculum content.
    Logs the change and notifies affected teachers.
    """
    try:
        logger.info(f"Automation trigger: content_updated by admin {payload.adminId}")
        result = await automation_engine.handle_content_update(payload)
        return result
    except Exception as e:
        logger.error(f"Automation content error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Automation error: {str(e)}")


# ─── Main ──────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
