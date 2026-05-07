"""
Quiz Battle API Routes.

Endpoints:
- POST /api/quiz-battle/generate       → Generate varied questions for a battle session
- POST /api/quiz-battle/ingest-pdf     → Trigger PDF ingestion (teacher/admin)
- GET  /api/quiz-battle/bank-status    → List processed PDFs (teacher/admin)
"""

import os
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel, Field

from rag.pdf_ingestion import ingest_pdf, IngestionResult
from services.question_bank_service import get_questions_for_battle, cache_session_questions, get_cached_session
from services.variance_engine import apply_variance

router = APIRouter(prefix="/api/quiz-battle", tags=["quiz-battle"])


# ── Pydantic Models ──────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    grade_level: int = Field(..., ge=7, le=12)
    topic: str = Field(..., min_length=1)
    question_count: int = Field(default=10, ge=1, le=50)
    session_id: str = Field(..., min_length=1)
    player_ids: List[str] = Field(default_factory=list)


class GenerateResponse(BaseModel):
    questions: List[Dict[str, Any]]
    session_id: str


class IngestPdfRequest(BaseModel):
    storage_path: str = Field(..., min_length=1)
    grade_level: int = Field(..., ge=7, le=12)
    topic: str = Field(..., min_length=1)
    force_reingest: bool = False


class IngestPdfResponse(BaseModel):
    status: str
    filename: str
    question_count: int
    grade_level: int
    topic: str
    storage_path: str
    timestamp: datetime


class BankStatusItem(BaseModel):
    filename: str
    processed: bool
    timestamp: Optional[datetime]
    question_count: int
    grade_level: int
    topic: str
    storage_path: str


class BankStatusResponse(BaseModel):
    pdfs: List[BankStatusItem]


# ── Helper ───────────────────────────────────────────────────────────

def _get_current_user(request: Request):
    user = getattr(request.state, "user", None)
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


def _is_internal_request(request: Request) -> bool:
    """Check if request is from an internal service (Cloud Functions)."""
    internal_secret = request.headers.get("X-Internal-Service")
    expected = os.getenv("QUIZ_BATTLE_INTERNAL_SECRET")
    if expected and internal_secret == expected:
        return True
    return False


# ── Endpoints ────────────────────────────────────────────────────────

@router.post("/generate", response_model=GenerateResponse)
async def generate_questions(
    body: GenerateRequest,
    request: Request,
):
    """
    Generate varied questions for a quiz battle session.

    Returns questions with choices but WITHOUT correct_answer (unless called
    by an internal service with X-Internal-Service header).
    """
    # 1. Fetch base questions
    questions = await get_questions_for_battle(
        body.grade_level,
        body.topic,
        body.question_count,
    )

    if not questions:
        raise HTTPException(
            status_code=404,
            detail=f"No questions found for grade {body.grade_level}, topic '{body.topic}'",
        )

    # 2. Apply variance (with 24h cache)
    varied = await apply_variance(questions, body.session_id)

    # 3. Cache session metadata
    await cache_session_questions(
        body.session_id,
        varied,
        body.player_ids,
        body.grade_level,
        body.topic,
    )

    # 4. Prepare response
    is_internal = _is_internal_request(request)
    response_questions = []
    for q in varied:
        q_copy = dict(q)
        if not is_internal:
            q_copy.pop("correct_answer", None)
        response_questions.append(q_copy)

    return GenerateResponse(questions=response_questions, session_id=body.session_id)


@router.post("/ingest-pdf", response_model=IngestPdfResponse)
async def ingest_pdf_endpoint(
    body: IngestPdfRequest,
    user=Depends(_get_current_user),
):
    """
    Trigger PDF ingestion into the question bank.

    Requires teacher or admin role.
    """
    if user.role not in ("teacher", "admin"):
        raise HTTPException(status_code=403, detail="Teacher or admin access required")

    try:
        result = await ingest_pdf(
            storage_path=body.storage_path,
            grade_level=body.grade_level,
            topic=body.topic,
            force_reingest=body.force_reingest,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")

    return IngestPdfResponse(
        status="processed" if result.processed else "skipped",
        filename=result.filename,
        question_count=result.question_count,
        grade_level=result.grade_level,
        topic=result.topic,
        storage_path=result.storage_path,
        timestamp=result.timestamp,
    )


@router.get("/bank-status", response_model=BankStatusResponse)
async def bank_status(
    user=Depends(_get_current_user),
):
    """
    Get the status of all processed PDFs in the question bank.

    Requires teacher or admin role.
    """
    if user.role not in ("teacher", "admin"):
        raise HTTPException(status_code=403, detail="Teacher or admin access required")

    from google.cloud import firestore
    db = firestore.Client(project=os.getenv("FIREBASE_AUTH_PROJECT_ID", "mathpulse-ai-2026"))

    docs = db.collection("pdf_processing_status").stream()
    pdfs = []
    for doc in docs:
        data = doc.to_dict()
        pdfs.append(BankStatusItem(
            filename=doc.id,
            processed=data.get("processed", False),
            timestamp=data.get("timestamp"),
            question_count=data.get("question_count", 0),
            grade_level=data.get("grade_level", 0),
            topic=data.get("topic", ""),
            storage_path=data.get("storage_path", ""),
        ))

    return BankStatusResponse(pdfs=pdfs)
