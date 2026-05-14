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

from fastapi import APIRouter, Request, HTTPException, Depends, Query
from pydantic import BaseModel, Field

from rag.pdf_ingestion import ingest_pdf, IngestionResult
_quiz_battle_services = None


def _get_quiz_battle_services():
    global _quiz_battle_services
    if _quiz_battle_services is not None:
        return _quiz_battle_services
    try:
        from services.question_bank_service import get_questions_for_battle, cache_session_questions, get_cached_session  # type: ignore[import-untyped]
        from services.variance_engine import apply_variance  # type: ignore[import-untyped]
    except ImportError:
        from backend.services.question_bank_service import get_questions_for_battle, cache_session_questions, get_cached_session  # type: ignore[import-untyped]
        from backend.services.variance_engine import apply_variance  # type: ignore[import-untyped]
    _quiz_battle_services = (
        get_questions_for_battle,
        cache_session_questions,
        get_cached_session,
        apply_variance,
    )
    return _quiz_battle_services

try:
    from firebase_admin import firestore as firebase_firestore
except Exception:
    firebase_firestore = None

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


class QuizBattleResultItem(BaseModel):
    studentId: str
    studentName: str
    totalMatches: int
    wins: int
    averageScore: float
    lastPlayedAt: str


class QuizBattleResultsResponse(BaseModel):
    results: List[QuizBattleResultItem]
    hasMore: bool


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
    # Lazy import to avoid stale-services shadowing at project root
    (
        get_questions_for_battle,
        cache_session_questions,
        _get_cached_session,
        apply_variance,
    ) = _get_quiz_battle_services()

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

    if not firebase_firestore:
        raise HTTPException(status_code=503, detail="Firestore not available")

    db = firebase_firestore.client()

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


@router.get("/results", response_model=QuizBattleResultsResponse)
async def get_quiz_battle_results(
    request: Request,
    classId: Optional[str] = Query(None, description="Filter by class section id"),
    limit: int = Query(20, ge=1, le=100, description="Number of results to return"),
    after: Optional[str] = Query(None, description="Pagination cursor (document id)"),
):
    """
    Get aggregated quiz battle results per student.

    Only teachers and admins can access this endpoint.
    Supports pagination with `after` cursor and filtering by `classId`.
    """
    user = _get_current_user(request)
    if user.role not in ("teacher", "admin"):
        raise HTTPException(status_code=403, detail="Teacher or admin access required")

    if not firebase_firestore:
        raise HTTPException(status_code=503, detail="Firestore not available")

    try:
        db = firebase_firestore.client()

        # Try quizBattleResults collection first; fallback to battles
        results: List[QuizBattleResultItem] = []
        collection_name = "quizBattleResults"

        # Build query
        query = db.collection(collection_name).limit(limit + 1)

        if classId:
            # Filter by classSectionId or sectionId (support both field names)
            query = query.where("classSectionId", "==", classId)

        if after:
            # Pagination cursor
            query = query.start_after({"studentId": after})

        docs = query.stream()

        for doc in docs:
            data = doc.to_dict()
            if not data:
                continue
            results.append(QuizBattleResultItem(
                studentId=data.get("studentId", doc.id),
                studentName=data.get("studentName", "Unknown"),
                totalMatches=data.get("totalMatches", 0),
                wins=data.get("wins", 0),
                averageScore=data.get("averageScore", 0.0),
                lastPlayedAt=data.get("lastPlayedAt", ""),
            ))

        # If no results and collection might not exist, try battles collection
        if not results:
            battles_query = db.collection("battles").limit(limit + 1)
            if classId:
                battles_query = battles_query.where("classSectionId", "==", classId)
            if after:
                battles_query = battles_query.start_after({"studentId": after})

            battle_docs = battles_query.stream()
            student_stats: Dict[str, Dict[str, Any]] = {}

            for doc in battle_docs:
                data = doc.to_dict()
                if not data:
                    continue
                # Aggregate per student from battle documents
                players = data.get("players", [])
                for player in players:
                    sid = player.get("studentId")
                    if not sid:
                        continue
                    if sid not in student_stats:
                        student_stats[sid] = {
                            "studentId": sid,
                            "studentName": player.get("studentName", "Unknown"),
                            "totalMatches": 0,
                            "wins": 0,
                            "totalScore": 0,
                            "lastPlayedAt": data.get("endedAt", ""),
                        }
                    student_stats[sid]["totalMatches"] += 1
                    if player.get("isWinner"):
                        student_stats[sid]["wins"] += 1
                    student_stats[sid]["totalScore"] += player.get("score", 0)

            for sid, stats in list(student_stats.items())[:limit]:
                avg_score = (
                    stats["totalScore"] / stats["totalMatches"]
                    if stats["totalMatches"] > 0
                    else 0.0
                )
                results.append(QuizBattleResultItem(
                    studentId=stats["studentId"],
                    studentName=stats["studentName"],
                    totalMatches=stats["totalMatches"],
                    wins=stats["wins"],
                    averageScore=round(avg_score, 2),
                    lastPlayedAt=stats["lastPlayedAt"],
                ))

        has_more = len(results) > limit
        if has_more:
            results = results[:limit]

        return QuizBattleResultsResponse(
            results=results,
            hasMore=has_more,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch quiz battle results: {str(e)}",
        )
