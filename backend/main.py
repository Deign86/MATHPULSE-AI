"""
MathPulse AI - FastAPI Backend
AI-powered math tutoring backend using Hugging Face models.
- meta-llama/Meta-Llama-3-8B-Instruct for chat, learning paths, insights, and quiz generation
  (via HF Serverless Inference API)
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
import logging
import traceback
from typing import List, Optional, Dict, Any, Set
from collections import Counter

from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
from starlette.middleware.base import BaseHTTPMiddleware
import asyncio
import time
import uuid
import sys
import tempfile
import subprocess
import requests as http_requests
import uvicorn

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

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mathpulse")

HF_TOKEN = os.environ.get("HF_TOKEN", os.environ.get("HUGGING_FACE_API_TOKEN", ""))

# Temporarily using Meta-Llama-3-8B-Instruct via HF Serverless Inference API
# because Qwen/Qwen2.5-Math-7B-Instruct is provider-only (not available on
# HF serverless).  Swap this back once a provider is configured or the model
# becomes serverless-compatible.
HF_MATH_MODEL_ID = os.getenv("HF_MATH_MODEL_ID", "meta-llama/Meta-Llama-3-8B-Instruct")

# Alias kept so automation_engine.py (which imports CHAT_MODEL) keeps working.
CHAT_MODEL = HF_MATH_MODEL_ID

RISK_MODEL = "facebook/bart-large-mnli"
VERIFICATION_SAMPLES = 3  # Number of samples for self-consistency checking
ENABLE_DEV_ENDPOINTS = os.getenv("ENABLE_DEV_ENDPOINTS", "false").strip().lower() in {"1", "true", "yes", "on"}
UPLOAD_MAX_BYTES = int(os.getenv("UPLOAD_MAX_BYTES", str(5 * 1024 * 1024)))
UPLOAD_MAX_ROWS = int(os.getenv("UPLOAD_MAX_ROWS", "2000"))
UPLOAD_MAX_COLS = int(os.getenv("UPLOAD_MAX_COLS", "60"))
UPLOAD_MAX_PDF_PAGES = int(os.getenv("UPLOAD_MAX_PDF_PAGES", "20"))
UPLOAD_RATE_LIMIT_PER_MIN = int(os.getenv("UPLOAD_RATE_LIMIT_PER_MIN", "12"))

ALLOWED_UPLOAD_EXTENSIONS: Set[str] = {".csv", ".xlsx", ".xls", ".pdf"}
ALLOWED_UPLOAD_MIME_TYPES: Set[str] = {
    "text/csv",
    "application/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/pdf",
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
    "/api/verify-solution": ALL_APP_ROLES,
    "/api/predict-risk": TEACHER_OR_ADMIN,
    "/api/predict-risk/batch": TEACHER_OR_ADMIN,
    "/api/learning-path": ALL_APP_ROLES,
    "/api/analytics/daily-insight": TEACHER_OR_ADMIN,
    "/api/upload/class-records": TEACHER_OR_ADMIN,
    "/api/quiz/generate": TEACHER_OR_ADMIN,
    "/api/quiz/preview": TEACHER_OR_ADMIN,
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
    "/api/dev/generate-mock-data": ADMIN_ONLY,
    "/api/analytics/config": TEACHER_OR_ADMIN,
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


class AuthenticatedUser(BaseModel):
    uid: str
    email: Optional[str] = None
    role: str
    claims: Dict[str, Any] = Field(default_factory=dict)


_firebase_ready = False
_role_cache: Dict[str, Dict[str, Any]] = {}
_ROLE_CACHE_TTL_SECONDS = 60
_rate_limit_buckets: Dict[str, List[float]] = {}


def _init_firebase_admin() -> None:
    global _firebase_ready
    if _firebase_ready:
        return
    if not HAS_FIREBASE_ADMIN:
        logger.warning("firebase-admin is not available; protected API endpoints will reject requests.")
        return

    try:
        if not firebase_admin._apps:  # type: ignore[attr-defined]
            firebase_admin.initialize_app()  # type: ignore[union-attr]
        _firebase_ready = True
        logger.info("Firebase Admin SDK initialized for API auth verification")
    except Exception as e:
        logger.warning(f"Firebase Admin SDK init failed: {e}")


def _get_role_from_firestore(uid: str) -> Optional[str]:
    now = time.time()
    cached = _role_cache.get(uid)
    if cached and now - float(cached.get("ts", 0)) < _ROLE_CACHE_TTL_SECONDS:
        return cached.get("role")

    if not (_firebase_ready and firebase_firestore):
        return None

    try:
        doc = firebase_firestore.client().collection("users").document(uid).get()
        role = doc.to_dict().get("role") if doc.exists else None
        if isinstance(role, str):
            _role_cache[uid] = {"role": role, "ts": now}
            return role
    except Exception as e:
        logger.warning(f"Failed to resolve role from Firestore for {uid}: {e}")

    return None


def _resolve_user_role(decoded: Dict[str, Any]) -> str:
    role_claim = decoded.get("role")
    if isinstance(role_claim, str) and role_claim in VALID_ROLES:
        return role_claim

    uid = str(decoded.get("uid", ""))
    if uid:
        firestore_role = _get_role_from_firestore(uid)
        if isinstance(firestore_role, str) and firestore_role in VALID_ROLES:
            return firestore_role

    return "student"


def _parse_bearer_token(authorization: str) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.strip().split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    return parts[1].strip()


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


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
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
            decoded = firebase_auth.verify_id_token(token)  # type: ignore[union-attr]
        except Exception as e:
            logger.warning(f"Token verification failed for {path}: {e}")
            return JSONResponse(status_code=401, content={"detail": "Invalid or expired auth token"})

        uid = str(decoded.get("uid", ""))
        if not uid:
            return JSONResponse(status_code=401, content={"detail": "Token missing uid"})

        role = _resolve_user_role(decoded)
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

    async def dispatch(self, request: Request, call_next):
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


def call_hf_chat(
    messages: List[Dict[str, str]],
    *,
    max_tokens: int = 2048,
    temperature: float = 0.2,
    top_p: float = 0.9,
    repetition_penalty: float = 1.15,
    model: Optional[str] = None,
    timeout: int = 90,
) -> str:
    """
    Call the HF Serverless Inference API (OpenAI-compatible chat endpoint)
    using plain ``requests``.  Retries up to 3 times on 503 (model loading).
    """
    if not HF_TOKEN:
        raise RuntimeError("HF_TOKEN is not set")

    target_model = model or HF_MATH_MODEL_ID
    url = "https://router.huggingface.co/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {HF_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": target_model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "top_p": top_p,
        "repetition_penalty": repetition_penalty,
    }

    for attempt in range(3):
        resp = http_requests.post(url, headers=headers, json=payload, timeout=timeout)
        if resp.status_code == 503 and attempt < 2:
            logger.warning(f"HF chat 503 (model loading), retry {attempt + 1}/3")
            time.sleep(3)
            continue
        if resp.status_code != 200:
            raise RuntimeError(f"HF Inference error {resp.status_code}: {resp.text}")

        data = resp.json()
        # OpenAI-compatible format: {"choices": [{"message": {"content": "..."}}]}
        choices = data.get("choices", [])
        if choices:
            raw = (choices[0].get("message", {}).get("content", "") or "").strip()
            return _strip_repetition(raw)

        raise RuntimeError(f"Unexpected HF response format: {data}")

    raise RuntimeError("HF Inference failed after retries")


# ─── Math Tutor Prompt & Wrapper ──────────────────────────────


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
If the user question is not about math, politely say that you can only help with math-related questions.

USER:
Student question:
{question}
"""


def call_math_tutor_llm(question: str) -> str:
    """Convenience wrapper: call the HF serverless model with the MathPulse tutor prompt via chat completions."""
    prompt = build_math_tutor_prompt(question)
    messages = [{"role": "user", "content": prompt}]
    return call_hf_chat(messages, max_tokens=512, temperature=0.2, top_p=0.9)


# ─── Request/Response Models ──────────────────────────────────


class ChatMessage(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = Field(default_factory=list)
    userId: Optional[str] = None
    verify: bool = Field(default=False, description="Enable self-consistency verification for math answers")


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
    return {"status": "healthy", "models": {"chat": CHAT_MODEL, "risk": RISK_MODEL}}


@app.get("/")
async def root():
    return {
        "name": "MathPulse AI API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }


# ─── AI Chat Tutor ─────────────────────────────────────────────


MATH_TUTOR_SYSTEM_PROMPT = """You are MathPulse AI, a friendly and concise expert math tutor for students.

Problem-Solving Protocol:
1. Restate the problem briefly.
2. Solve step by step, showing each equation clearly.
3. State the final answer with a label like "**Final Answer: x = 5**".
4. Verify once at the end by substituting back (do NOT repeat verification steps).

Rules:
- Be concise — aim for under 200 words.
- Use math notation where helpful (x², √, π).
- Never repeat yourself. Once a step is shown, move forward.
- If unsure, say so rather than guessing.
- Encourage the student briefly at the end.
- If the question is not about math, politely say you can only help with math."""


@app.post("/api/chat", response_model=ChatResponse)
async def chat_tutor(request: ChatRequest):
    """AI Math Tutor powered by HF Serverless Inference (Meta-Llama-3-8B-Instruct)"""
    try:
        messages = [{"role": "system", "content": MATH_TUTOR_SYSTEM_PROMPT}]

        # Add conversation history
        for msg in request.history[-10:]:  # Keep last 10 messages for context window
            messages.append({"role": msg.role, "content": msg.content})

        # Add current message
        messages.append({"role": "user", "content": request.message})

        # Call HF serverless with retry (handled inside call_hf_chat)
        try:
            answer = call_hf_chat(messages, max_tokens=1024, temperature=0.3, top_p=0.9)
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
            text = call_hf_chat(base_messages, max_tokens=2048, temperature=0.7, top_p=0.9)
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
        raw_code = call_hf_chat(
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
        raw = call_hf_chat(
            messages=[
                {
                    "role": "system",
                    "content": "You are a mathematical verification judge. Respond ONLY with valid JSON.",
                },
                {"role": "user", "content": prompt},
            ],
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
                result = hf.zero_shot_classification(
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

        return RiskPrediction(
            riskLevel=risk_level,
            confidence=round(float(top_score), 4),
            analysis={
                "labels": [el.label for el in result],
                "scores": [round(el.score, 4) for el in result],
            },
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
                RiskPrediction(riskLevel="Medium", confidence=0.0, analysis={"labels": [], "scores": []})
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
            content = call_hf_chat(messages, max_tokens=1500, temperature=0.7)
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
            content = call_hf_chat(messages, max_tokens=800, temperature=0.7)
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


@app.post("/api/upload/class-records")
async def upload_class_records(request: Request, file: UploadFile = File(...)):
    """Upload and parse class records (CSV, Excel, PDF) with AI column detection"""
    try:
        import pandas as pd  # type: ignore[import-not-found]

        enforce_rate_limit(request, "upload_class_records", UPLOAD_RATE_LIMIT_PER_MIN, 60)

        filename = file.filename or ""
        ext = os.path.splitext(filename)[1].lower()
        if ext not in ALLOWED_UPLOAD_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format: {filename}. Use .csv, .xlsx, .xls, or .pdf",
            )

        if (file.content_type or "").lower() not in ALLOWED_UPLOAD_MIME_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported content type: {file.content_type}",
            )

        contents = await file.read(UPLOAD_MAX_BYTES + 1)
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

If a column doesn't match any field, skip it. Respond ONLY with a JSON object mapping original column names to field names. Example: {{"Student Name": "name", "LRN": "lrn"}}"""

        mapping_text = call_hf_chat(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300,
            temperature=0.1,
        )
        # Extract JSON from response
        try:
            # Try to find JSON in the response
            json_start = mapping_text.find("{")
            json_end = mapping_text.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                column_mapping = json.loads(mapping_text[json_start:json_end])
            else:
                column_mapping = {}
        except json.JSONDecodeError:
            column_mapping = {}

        # Apply mapping and extract student data
        students = []
        for _, row in df.iterrows():
            student = {}
            for orig_col, field in column_mapping.items():
                if orig_col in df.columns:
                    val = row[orig_col]
                    student[field] = str(val) if pd.notna(val) else ""

            # Ensure numeric fields
            for numeric_field in ["engagementScore", "avgQuizScore", "attendance"]:
                if numeric_field in student:
                    try:
                        student[numeric_field] = float(student[numeric_field].replace("%", ""))
                    except (ValueError, AttributeError):
                        student[numeric_field] = 0.0

            if student.get("name"):
                students.append(student)

        return {
            "success": True,
            "students": students,
            "columnMapping": column_mapping,
            "totalRows": len(students),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=f"File upload error: {str(e)}")


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

# ── Temporary hard limits ──────────────────────────────────────
# Meta-Llama-3-8B-Instruct has an 8 192-token context window.
# Until we migrate to a model with a larger context (or add
# streaming / chunked generation), enforce conservative caps so
# the prompt + completion never exceed that budget.
MAX_QUESTIONS_LIMIT = 15   # keeps completion ≤ ~4 000 tokens
MAX_TOPICS_LIMIT = 8       # keeps the prompt ≤ ~3 500 tokens


class QuizGenerationRequest(BaseModel):
    topics: List[str] = Field(..., min_length=1, description="Specific math topics to cover")
    gradeLevel: str = Field(..., description="Student grade level (e.g., 'Grade 7', 'Grade 10', 'College')")
    numQuestions: int = Field(default=10, ge=1, le=MAX_QUESTIONS_LIMIT, description="Number of questions to generate (temporary max 15)")
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

    @validator("questionTypes", each_item=True)
    def validate_question_types(cls, v: str) -> str:
        if v not in VALID_QUESTION_TYPES:
            raise ValueError(f"Invalid question type '{v}'. Must be one of: {VALID_QUESTION_TYPES}")
        return v

    @validator("bloomLevels", each_item=True)
    def validate_bloom_levels(cls, v: str) -> str:
        if v not in VALID_BLOOM_LEVELS:
            raise ValueError(f"Invalid Bloom level '{v}'. Must be one of: {VALID_BLOOM_LEVELS}")
        return v

    @validator("difficultyDistribution")
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


# ─── Quiz Topics Database (SHS Grade 11-12 Only) ─────────────

MATH_TOPICS_BY_GRADE: Dict[str, Dict[str, List[str]]] = {
    "Grade 11": {
        "General Mathematics - Functions and Their Graphs": [
            "Functions and Relations", "Evaluating Functions", "Operations on Functions",
            "Composite Functions", "Inverse Functions", "Rational Functions",
            "Exponential Functions", "Logarithmic Functions",
        ],
        "General Mathematics - Business Mathematics": [
            "Simple Interest", "Compound Interest", "Annuities",
            "Loans and Amortization", "Stocks and Bonds",
        ],
        "General Mathematics - Logic": [
            "Propositions and Connectives", "Truth Tables",
            "Logical Equivalence", "Valid Arguments and Fallacies",
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

    # Try to find array brackets
    arr_start = cleaned.find("[")
    arr_end = cleaned.rfind("]") + 1
    if arr_start >= 0 and arr_end > arr_start:
        try:
            return json.loads(cleaned[arr_start:arr_end])
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


def _validate_quiz_questions(
    questions: List[Dict[str, Any]],
    distribution: List[Dict[str, str]],
) -> List[QuizQuestion]:
    """Validate and normalise each question from the LLM response."""
    validated: List[QuizQuestion] = []
    points_map = {"easy": 1, "medium": 3, "hard": 5}

    for i, q in enumerate(questions):
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

        options = q.get("options") if question_type == "multiple_choice" else None

        validated.append(QuizQuestion(
            questionType=question_type,
            question=q.get("question", ""),
            correctAnswer=str(q.get("correctAnswer", "")),
            options=options,
            bloomLevel=bloom_level,
            difficulty=difficulty,
            topic=q.get("topic", "General"),
            points=q.get("points", points_map.get(difficulty, 3)),
            explanation=q.get("explanation", "No explanation provided."),
        ))

    return validated


# ─── Quiz Generation Endpoints ────────────────────────────────


@app.post("/api/quiz/generate", response_model=QuizResponse)
async def generate_quiz(request: QuizGenerationRequest):
    """
    Generate an AI-powered quiz via HF Serverless Inference.
    Supports Bloom's Taxonomy integration, multiple question types,
    and graph-based identification questions.
    """
    try:

        # Filter out excluded topics
        effective_topics = [t for t in request.topics if t not in request.excludeTopics]
        if not effective_topics:
            raise HTTPException(
                status_code=400,
                detail="All requested topics are in the exclude list. Please provide at least one topic to cover.",
            )

        # ── Enforce temporary limits (8 192-token model context) ──
        if len(effective_topics) > MAX_TOPICS_LIMIT:
            logger.warning(
                f"Trimming topics from {len(effective_topics)} to {MAX_TOPICS_LIMIT} (model context limit)"
            )
            effective_topics = effective_topics[:MAX_TOPICS_LIMIT]

        if request.numQuestions > MAX_QUESTIONS_LIMIT:
            logger.warning(
                f"Clamping numQuestions from {request.numQuestions} to {MAX_QUESTIONS_LIMIT} (model context limit)"
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

        # Scale max_tokens based on requested questions — each question needs ~250-350 tokens
        # Hard-cap to 4096 so prompt+completion stays within the 8192 context window
        max_tokens = min(4096, max(2048, request.numQuestions * 300))
        # Use longer HTTP timeout for quiz generation (scales with question count)
        http_timeout = max(90, request.numQuestions * 12)

        parsed_questions: List[Dict[str, Any]] = []
        raw_content = ""  # Will be set inside the loop
        max_attempts = 2  # Retry once if LLM generates too few questions

        for attempt in range(max_attempts):
            raw_content = call_hf_chat(
                messages, max_tokens=max_tokens, temperature=0.3, top_p=0.9,
                timeout=http_timeout,
            )
            logger.info(f"Raw quiz response length: {len(raw_content)} chars (attempt {attempt + 1})")

            parsed_questions = _parse_quiz_json(raw_content)

            if not parsed_questions:
                logger.error(f"Failed to parse quiz JSON (attempt {attempt + 1}). Raw content:\n{raw_content[:500]}")
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

        validated = _validate_quiz_questions(parsed_questions, distribution)
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
async def preview_quiz(request: QuizGenerationRequest):
    """
    Generate a 3-question preview quiz for teachers to verify AI question
    quality before assigning a full quiz to students.
    """
    # Override to produce only 3 questions
    request.numQuestions = 3
    return await generate_quiz(request)


@app.get("/api/quiz/topics")
async def get_quiz_topics(gradeLevel: Optional[str] = None):
    """
    Return structured list of SHS math topics organised by grade level.
    Only Grade 11 and Grade 12 are supported.
    If gradeLevel is provided, return topics for that grade only.
    """
    if gradeLevel:
        key = gradeLevel.strip()
        # Try exact match first
        if key in MATH_TOPICS_BY_GRADE:
            return {"gradeLevel": key, "topics": MATH_TOPICS_BY_GRADE[key]}
        # Case-insensitive match
        for k, v in MATH_TOPICS_BY_GRADE.items():
            if k.lower() == key.lower():
                return {"gradeLevel": k, "topics": v}
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
            topic = entry.get("topic", "Unknown")
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

                overall_perspective = call_hf_chat(
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
    teacherId: str = Query(..., description="Teacher UID"),
    classId: Optional[str] = Query(None, description="Optional class ID filter"),
):
    """
    Aggregate per-topic mastery statistics for a teacher's class.
    Returns topic-level averages, attempt counts, and mastery status.
    """
    try:
        # No real student data imported yet — return empty state.
        return {
            "topics": [],
            "summary": {
                "totalTopicsTracked": 0,
                "masteredCount": 0,
                "needsAttentionCount": 0,
                "excludedCount": 0,
            },
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
