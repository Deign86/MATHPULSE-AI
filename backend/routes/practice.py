"""
MathPulse AI - Practice Center Router
POST /api/practice/generate  - Generate MCQ practice session via AI
POST /api/practice/submit     - Score session, persist result, update XP
GET  /api/practice/stats/{userId}    - Aggregated stats + recent sessions
GET  /api/practice/history/{userId}  - Paginated session history
"""

from __future__ import annotations

import json
import logging
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from services.ai_client import CHAT_MODEL, get_deepseek_client
import firebase_admin
from firebase_admin import firestore as fs

logger = logging.getLogger("mathpulse.practice")

router = APIRouter(prefix="/api/practice", tags=["practice"])

# In-memory fallback if Firestore unavailable
_in_memory_sessions: Dict[str, Dict[str, Any]] = defaultdict(dict)
_in_memory_results: Dict[str, Dict[str, Any]] = defaultdict(dict)


# ─── Request Models ────────────────────────────────────────────────────────────

class PracticeGenerateRequest(BaseModel):
    userId: str
    subject: str
    competency: str
    difficulty: Literal["Practice", "Challenge", "Mastery"] = "Practice"
    count: int = Field(default=5, ge=1, le=20)


class AnswerItem(BaseModel):
    question_id: str
    selected_index: int


class PracticeSubmitRequest(BaseModel):
    session_id: str
    userId: str
    answers: List[AnswerItem]


# ─── Response Models ──────────────────────────────────────────────────────────

class PracticeQuestion(BaseModel):
    id: str
    question: str
    options: List[str]
    correct_index: int
    explanation: str
    competency: str
    difficulty: str
    bloomsLevel: str


class PracticeGenerateResponse(BaseModel):
    session_id: str
    questions: List[PracticeQuestion]
    generated_at: str


class PerQuestionFeedback(BaseModel):
    question_id: str
    selected_index: int
    correct_index: int
    is_correct: bool
    explanation: str


class UpdatedStats(BaseModel):
    totalXP: int
    quizzesCompleted: int
    averageScore: float


class PracticeSubmitResponse(BaseModel):
    score_percent: float
    correct_count: int
    total: int
    xp_earned: int
    per_question_feedback: List[PerQuestionFeedback]
    updated_stats: UpdatedStats


class RecentSession(BaseModel):
    session_id: str
    score_percent: float
    subject: str
    difficulty: str
    timestamp: str


class CompetencyBreakdownEntry(BaseModel):
    total: int
    correct: int
    percent: float


class PracticeStatsResponse(BaseModel):
    quizzesCompleted: int
    totalXPEarned: int
    averageScore: float
    recentSessions: List[RecentSession]
    competencyBreakdown: Dict[str, CompetencyBreakdownEntry]


class HistoryItem(BaseModel):
    session_id: str
    score_percent: float
    subject: str
    difficulty: str
    submitted_at: str


class PracticeHistoryResponse(BaseModel):
    page: int
    limit: int
    hasMore: bool
    total: int
    items: List[HistoryItem]


# ─── Helpers ───────────────────────────────────────────────────────────────────

def _get_firestore():
    if firebase_admin._apps:
        return firebase_admin.firestore.client()
    return None


async def _call_deepseek(system_prompt: str, user_message: str, temperature: float = 0.7) -> str:
    """Call DeepSeek with JSON mode for structured output."""
    try:
        client = get_deepseek_client()
        response = client.chat.completions.create(
            model=CHAT_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=temperature,
            response_format={"type": "json_object"},
        )
        return response.choices[0].message.content or ""
    except Exception as e:
        logger.error(f"DeepSeek API error: {e}")
        raise HTTPException(status_code=500, detail="AI model unavailable. Please try again later.")


def _parse_questions_response(raw: str, count: int) -> List[Dict[str, Any]]:
    """Extract question list from AI JSON response."""
    cleaned = raw.strip()
    cleaned = cleaned.replace("```json", "").replace("```", "").strip()
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse AI response. Please try again.")

    questions = None
    if isinstance(data, dict):
        for key in ("questions", "items", "data", "results", "practice_questions"):
            if key in data and isinstance(data[key], list):
                questions = data[key]
                break
        if questions is None and len(data) > 0:
            for v in data.values():
                if isinstance(v, list) and len(v) > 0 and isinstance(v[0], dict):
                    questions = v
                    break
    elif isinstance(data, list):
        questions = data

    if not questions:
        raise HTTPException(status_code=500, detail="AI response missing questions. Please try again.")

    # Ensure we have exactly `count` questions
    questions = questions[:count]
    return questions


def _build_question_prompt(subject: str, competency: str, difficulty: str, count: int) -> tuple[str, str]:
    system_prompt = (
        "You are an expert Filipino math educator. "
        "Generate exactly " + str(count) + " multiple-choice math questions "
        "for the subject \"" + subject + "\" focused on competency: \"" + competency + "\". "
        "Difficulty level: " + difficulty + ". "
        "Return ONLY valid JSON with this exact structure: "
        "{ \"questions\": [{ \"id\": \"q1\", \"question\": \"...\", "
        "\"options\": [\"A: ...\", \"B: ...\", \"C: ...\", \"D: ...\"], "
        "\"correct_index\": 0-3, \"explanation\": \"...\", "
        "\"competency\": \"...\", \"difficulty\": \"...\", "
        "\"bloomsLevel\": \"Remember|Understand|Apply|Analyze|Evaluate|Create\" }] }. "
        "Use Filipino context where appropriate. Make questions clear and unambiguous."
    )
    user_message = (
        f"Generate {count} multiple-choice math questions for {subject}, "
        f"competency: {competency}, difficulty: {difficulty}. "
        f"Return only the JSON, no explanation."
    )
    return system_prompt, user_message


def _authenticate(request: Request, userId: str) -> None:
    """Verify the requesting user matches the userId in the payload."""
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    uid = getattr(user, "uid", None)
    if uid != userId:
        raise HTTPException(status_code=403, detail="Not authorized for this user")


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/generate", response_model=PracticeGenerateResponse)
async def generate_practice(request: Request, body: PracticeGenerateRequest):
    """
    Generate a practice session with count MCQ questions aligned to
    subject, competency, and difficulty.
    """
    # Auth check
    _authenticate(request, body.userId)

    system_prompt, user_message = _build_question_prompt(
        body.subject, body.competency, body.difficulty, body.count
    )

    # Call AI
    raw_response = await _call_deepseek(system_prompt, user_message, temperature=0.7)

    # Parse questions
    raw_questions = _parse_questions_response(raw_response, body.count)

    # Normalize into PracticeQuestion list
    questions: List[PracticeQuestion] = []
    for i, q in enumerate(raw_questions):
        q_id = q.get("id") or f"q{i+1}"
        correct_idx = int(q.get("correct_index", 0))
        questions.append(
            PracticeQuestion(
                id=q_id,
                question=q.get("question", ""),
                options=q.get("options", ["", "", "", ""]),
                correct_index=correct_idx,
                explanation=q.get("explanation", "No explanation available."),
                competency=q.get("competency", body.competency),
                difficulty=q.get("difficulty", body.difficulty),
                bloomsLevel=q.get("bloomsLevel", "Apply"),
            )
        )

    session_id = str(uuid.uuid4())
    generated_at = datetime.now(timezone.utc).isoformat()

    # Build Firestore document
    session_doc = {
        "session_id": session_id,
        "userId": body.userId,
        "subject": body.subject,
        "competency": body.competency,
        "difficulty": body.difficulty,
        "questions": [q.model_dump() for q in questions],
        "generated_at": generated_at,
    }

    # Store in Firestore (fallback to in-memory)
    db = _get_firestore()
    if db:
        try:
            db.collection("practice_sessions").document(session_id).set(session_doc)
        except Exception as e:
            logger.warning("Firestore write failed for session %s: %s", session_id, e)
            _in_memory_sessions[session_id] = session_doc
    else:
        _in_memory_sessions[session_id] = session_doc

    return PracticeGenerateResponse(
        session_id=session_id,
        questions=questions,
        generated_at=generated_at,
    )


@router.post("/submit", response_model=PracticeSubmitResponse)
async def submit_practice(request: Request, body: PracticeSubmitRequest):
    """
    Score a practice session, compute XP, persist result, update user stats.
    XP formula: 10 XP per correct answer + 50 XP bonus if score >= 80%.
    """
    _authenticate(request, body.userId)

    session_id = body.session_id
    userId = body.userId

    # Retrieve session
    db = _get_firestore()
    questions_data: List[Dict[str, Any]] = []
    session_subject = ""
    session_difficulty = ""
    session_competency = ""

    if db:
        try:
            doc = db.collection("practice_sessions").document(session_id).get()
            if doc.exists:
                data = doc.to_dict()
                questions_data = data.get("questions", [])
                session_subject = data.get("subject", "")
                session_difficulty = data.get("difficulty", "")
                session_competency = data.get("competency", "")
        except Exception as e:
            logger.warning("Firestore read failed for session %s: %s", session_id, e)
    else:
        sess = _in_memory_sessions.get(session_id, {})
        questions_data = sess.get("questions", [])
        session_subject = sess.get("subject", "")
        session_difficulty = sess.get("difficulty", "")
        session_competency = sess.get("competency", "")

    if not questions_data:
        raise HTTPException(status_code=404, detail="Session not found or expired.")

    # Build question lookup
    q_lookup: Dict[str, Dict[str, Any]] = {q["id"]: q for q in questions_data}

    # Score
    correct_count = 0
    total = len(body.answers)
    per_question_feedback: List[PerQuestionFeedback] = []

    for answer in body.answers:
        q = q_lookup.get(answer.question_id, {})
        correct_idx = int(q.get("correct_index", -1))
        is_correct = answer.selected_index == correct_idx
        if is_correct:
            correct_count += 1
        per_question_feedback.append(
            PerQuestionFeedback(
                question_id=answer.question_id,
                selected_index=answer.selected_index,
                correct_index=correct_idx,
                is_correct=is_correct,
                explanation=q.get("explanation", ""),
            )
        )

    score_percent = round((correct_count / total) * 100, 1) if total > 0 else 0.0
    xp_earned = correct_count * 10 + (50 if score_percent >= 80 else 0)

    submitted_at = datetime.now(timezone.utc).isoformat()

    # Build result doc
    result_doc = {
        "session_id": session_id,
        "userId": userId,
        "score_percent": score_percent,
        "correct_count": correct_count,
        "total": total,
        "xp_earned": xp_earned,
        "subject": session_subject,
        "competency": session_competency,
        "difficulty": session_difficulty,
        "answers": [a.model_dump() for a in body.answers],
        "per_question_feedback": [f.model_dump() for f in per_question_feedback],
        "submitted_at": submitted_at,
    }

    # Store result
    if db:
        try:
            db.collection("practice_results").document(userId).collection("sessions").document(session_id).set(result_doc)
        except Exception as e:
            logger.warning("Firestore write failed for result %s: %s", session_id, e)
            _in_memory_results[f"{userId}:{session_id}"] = result_doc
    else:
        _in_memory_results[f"{userId}:{session_id}"] = result_doc

    # Update user stats atomically
    if db:
        try:
            user_ref = db.collection("users").document(userId)
            user_doc = user_ref.get()
            if user_doc.exists:
                current = user_doc.to_dict()
                current_quizzes = current.get("quizzesCompleted", 0) or 0
                current_avg = current.get("averageScore", 0.0) or 0.0
                new_quizzes = current_quizzes + 1
                new_avg = round((current_avg * current_quizzes + score_percent) / new_quizzes, 1)
                user_ref.update({
                    "totalXP": fs.Increment(xp_earned),
                    "quizzesCompleted": fs.Increment(1),
                    "averageScore": new_avg,
                })
                updated_total_xp = (current.get("totalXP", 0) or 0) + xp_earned
                updated_stats = UpdatedStats(
                    totalXP=updated_total_xp,
                    quizzesCompleted=new_quizzes,
                    averageScore=new_avg,
                )
            else:
                updated_stats = UpdatedStats(
                    totalXP=xp_earned,
                    quizzesCompleted=1,
                    averageScore=score_percent,
                )
        except Exception as e:
            logger.warning("User stats update failed: %s", e)
            updated_stats = UpdatedStats(
                totalXP=xp_earned,
                quizzesCompleted=1,
                averageScore=score_percent,
            )
    else:
        updated_stats = UpdatedStats(
            totalXP=xp_earned,
            quizzesCompleted=1,
            averageScore=score_percent,
        )

    return PracticeSubmitResponse(
        score_percent=score_percent,
        correct_count=correct_count,
        total=total,
        xp_earned=xp_earned,
        per_question_feedback=per_question_feedback,
        updated_stats=updated_stats,
    )


@router.get("/stats/{userId}", response_model=PracticeStatsResponse)
async def get_practice_stats(request: Request, userId: str):
    """
    Return aggregated stats for a user:
    quizzesCompleted, totalXPEarned, averageScore, recentSessions (last 10),
    competencyBreakdown.
    """
    _authenticate(request, userId)

    db = _get_firestore()

    # Read user doc
    total_xp = 0
    quizzes_completed = 0
    average_score = 0.0

    if db:
        try:
            user_doc = db.collection("users").document(userId).get()
            if user_doc.exists:
                d = user_doc.to_dict()
                total_xp = d.get("totalXP", 0) or 0
                quizzes_completed = d.get("quizzesCompleted", 0) or 0
                average_score = d.get("averageScore", 0.0) or 0.0
        except Exception as e:
            logger.warning("Error reading user stats for %s: %s", userId, e)
    else:
        # Fallback: sum from in-memory results
        for key, val in _in_memory_results.items():
            if key.startswith(f"{userId}:"):
                quizzes_completed += 1
                total_xp += val.get("xp_earned", 0)

    # Read recent sessions from practice_results
    recent_sessions: List[RecentSession] = []
    competency_breakdown: Dict[str, Dict[str, Any]] = defaultdict(lambda: {"total": 0, "correct": 0})

    if db:
        try:
            results_ref = db.collection("practice_results").document(userId).collection("sessions")
            all_results = results_ref.order_by("submitted_at", direction=fs.Query.DESCENDING).limit(50).get()

            for doc in all_results:
                d = doc.to_dict()
                score = d.get("score_percent", 0)
                total = d.get("total", 1)
                correct = d.get("correct_count", 0)
                submitted = d.get("submitted_at", "")
                subject = d.get("subject", "")
                difficulty = d.get("difficulty", "")
                competency = d.get("competency", "")

                # Recent sessions (last 10)
                if len(recent_sessions) < 10:
                    recent_sessions.append(RecentSession(
                        session_id=d.get("session_id", ""),
                        score_percent=score,
                        subject=subject,
                        difficulty=difficulty,
                        timestamp=submitted,
                    ))

                # Competency breakdown
                if competency:
                    competency_breakdown[competency]["total"] += total
                    competency_breakdown[competency]["correct"] += correct
        except Exception as e:
            logger.warning("Error reading practice results for %s: %s", userId, e)
    else:
        # Fallback from in-memory
        for key, val in _in_memory_results.items():
            if key.startswith(f"{userId}:"):
                if len(recent_sessions) < 10:
                    recent_sessions.append(RecentSession(
                        session_id=val.get("session_id", ""),
                        score_percent=val.get("score_percent", 0),
                        subject=val.get("subject", ""),
                        difficulty=val.get("difficulty", ""),
                        timestamp=val.get("submitted_at", ""),
                    ))

    # Compute competency percentages
    competency_result: Dict[str, CompetencyBreakdownEntry] = {}
    for comp, vals in competency_breakdown.items():
        total_q = vals["total"]
        correct_q = vals["correct"]
        pct = round((correct_q / total_q) * 100, 1) if total_q > 0 else 0.0
        competency_result[comp] = CompetencyBreakdownEntry(
            total=total_q,
            correct=correct_q,
            percent=pct,
        )

    return PracticeStatsResponse(
        quizzesCompleted=quizzes_completed,
        totalXPEarned=total_xp,
        averageScore=average_score,
        recentSessions=recent_sessions,
        competencyBreakdown=competency_result,
    )


@router.get("/history/{userId}", response_model=PracticeHistoryResponse)
async def get_practice_history(
    request: Request,
    userId: str,
    page: int = 1,
    limit: int = 10,
):
    """
    Return paginated practice history for a user, sorted by submitted_at DESC.
    """
    _authenticate(request, userId)

    page = max(1, page)
    limit = max(1, min(50, limit))
    offset = (page - 1) * limit

    db = _get_firestore()
    items: List[HistoryItem] = []
    total = 0
    has_more = False

    if db:
        try:
            results_ref = db.collection("practice_results").document(userId).collection("sessions")
            # Get total count
            all_docs = results_ref.order_by("submitted_at", direction=fs.Query.DESCENDING).get()
            total = len(all_docs)

            # Get page
            page_docs = (
                results_ref
                .order_by("submitted_at", direction=fs.Query.DESCENDING)
                .offset(offset)
                .limit(limit)
                .get()
            )
            for doc in page_docs:
                d = doc.to_dict()
                items.append(HistoryItem(
                    session_id=d.get("session_id", ""),
                    score_percent=d.get("score_percent", 0),
                    subject=d.get("subject", ""),
                    difficulty=d.get("difficulty", ""),
                    submitted_at=d.get("submitted_at", ""),
                ))

            has_more = offset + len(items) < total
        except Exception as e:
            logger.warning("Error reading practice history for %s: %s", userId, e)
    else:
        # Fallback: filter in-memory
        all_results = [
            v for k, v in _in_memory_results.items() if k.startswith(f"{userId}:")
        ]
        all_results.sort(key=lambda x: x.get("submitted_at", ""), reverse=True)
        total = len(all_results)
        paginated = all_results[offset:offset + limit]
        for v in paginated:
            items.append(HistoryItem(
                session_id=v.get("session_id", ""),
                score_percent=v.get("score_percent", 0),
                subject=v.get("subject", ""),
                difficulty=v.get("difficulty", ""),
                submitted_at=v.get("submitted_at", ""),
            ))
        has_more = offset + len(items) < total

    return PracticeHistoryResponse(
        page=page,
        limit=limit,
        hasMore=has_more,
        total=total,
        items=items,
    )