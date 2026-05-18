"""
MathPulse AI - Try It Yourself Quiz State Management
POST /api/try-it-yourself/resolve-question  - Report question resolution (correct/revealed)
POST /api/try-it-yourself/use-hint          - Record hint usage, return next hint tier
POST /api/try-it-yourself/complete-session  - Finalize session, calculate server-side XP

Implements:
- user_question_states Firestore collection (per-user, per-question progress)
- Server-side XP decay based on hints_used and attempts
- Struggle flag for shadow retry injection
- Brute Force Floor XP (never 0 for correct answers)
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

import firebase_admin
from firebase_admin import firestore as fs

logger = logging.getLogger("mathpulse.try_it_yourself")
router = APIRouter(prefix="/api/try-it-yourself", tags=["try-it-yourself"])


# --- XP Decay Constants ---
BASE_XP_PER_QUESTION = 10
HINT_DECAY = {0: 1.0, 1: 0.7, 2: 0.4, 3: 0.2}  # multiplier per hints_used
BRUTE_FORCE_FLOOR_XP = 2  # minimum XP for correct answer (never 0)
REVEAL_XP = 0  # complete forfeit
STRUGGLE_THRESHOLD = 3  # attempts before flagging struggle


# --- Request/Response Models ---

class ResolveQuestionRequest(BaseModel):
    userId: str
    sessionId: str
    questionId: str
    resolution: Literal["correct", "revealed"]
    attempts: int = Field(ge=1, description="Total attempts on this question")
    hintsUsed: int = Field(ge=0, le=3, description="Number of hints used (0-3)")


class ResolveQuestionResponse(BaseModel):
    xpAwarded: int
    status: str  # New | Retry | Learning | Mastered
    struggleFlag: bool


class UseHintRequest(BaseModel):
    userId: str
    sessionId: str
    questionId: str
    currentHintTier: int = Field(ge=0, le=2, description="0-indexed hint tier being requested")


class UseHintResponse(BaseModel):
    hintsUsed: int
    xpMultiplier: float
    acknowledged: bool


class CompleteSessionRequest(BaseModel):
    userId: str
    sessionId: str
    questionResults: List[Dict[str, Any]]  # [{questionId, resolution, attempts, hintsUsed, xpAwarded}]


class CompleteSessionResponse(BaseModel):
    totalXP: int
    questionsResolved: int
    questionsRevealed: int
    averageAttempts: float
    struggleTopics: List[str]


# --- Helpers ---

def _get_firestore():
    if firebase_admin._apps:
        return firebase_admin.firestore.client()
    return None


def _calculate_xp(hints_used: int, attempts: int, resolution: str) -> int:
    """Calculate XP for a resolved question using decay model."""
    if resolution == "revealed":
        return REVEAL_XP

    # Base XP with hint decay
    multiplier = HINT_DECAY.get(min(hints_used, 3), 0.2)
    xp = int(BASE_XP_PER_QUESTION * multiplier)

    # Brute force floor: never 0 for correct answers
    return max(xp, BRUTE_FORCE_FLOOR_XP)


def _determine_status(attempts: int, hints_used: int, resolution: str, previous_status: str = "New") -> str:
    """
    Determine question mastery status based on performance AND previous status.
    Follows Bloom's taxonomy phase progression:
      New → Learning (correct in Phase 1)
      Learning → Mastered (correct in Phase 2+)
      Any → Retry (revealed or excessive attempts)
      Retry → Learning (correct on retry)
    """
    if resolution == "revealed":
        return "Retry"
    
    # Correct answer — promote based on previous status
    if previous_status == "New":
        if hints_used == 0 and attempts == 1:
            return "Learning"  # Clean pass → skip to Learning
        return "Learning"  # Any correct from New → Learning
    elif previous_status == "Retry":
        return "Learning"  # Correct retry → back to Learning
    elif previous_status == "Learning":
        if hints_used <= 1 and attempts <= 2:
            return "Mastered"  # Clean-ish pass → Mastered
        return "Learning"  # Struggled but correct → stay Learning
    elif previous_status == "Mastered":
        return "Mastered"  # Already mastered, stays mastered
    
    return "Learning"


def _authenticate(request: Request, userId: str) -> None:
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    uid = getattr(user, "uid", None)
    if uid != userId:
        raise HTTPException(status_code=403, detail="Not authorized for this user")


# --- Endpoints ---

@router.post("/resolve-question", response_model=ResolveQuestionResponse)
async def resolve_question(request: Request, body: ResolveQuestionRequest):
    """
    Called when a question is formally resolved (answered correctly or revealed).
    Calculates server-side XP, updates user_question_states in Firestore.
    """
    _authenticate(request, body.userId)

    xp = _calculate_xp(body.hintsUsed, body.attempts, body.resolution)
    struggle_flag = body.attempts >= STRUGGLE_THRESHOLD

    # Fetch previous status for proper state transition
    previous_status = "New"
    db = _get_firestore()
    if db:
        try:
            state_ref = db.collection("user_question_states").document(f"{body.userId}_{body.questionId}")
            existing = state_ref.get()
            if existing.exists:
                previous_status = existing.to_dict().get("status", "New")
        except Exception as e:
            logger.warning("Firestore read failed for previous status: %s", e)

    status = _determine_status(body.attempts, body.hintsUsed, body.resolution, previous_status)

    db = _get_firestore()
    if db:
        try:
            state_ref = db.collection("user_question_states").document(f"{body.userId}_{body.questionId}")
            state_ref.set({
                "user_id": body.userId,
                "question_id": body.questionId,
                "session_id": body.sessionId,
                "status": status,
                "attempts": body.attempts,
                "hints_used": body.hintsUsed,
                "struggle_flag": struggle_flag,
                "resolution": body.resolution,
                "xp_awarded": xp,
                "resolved_at": datetime.now(timezone.utc).isoformat(),
            }, merge=True)
        except Exception as e:
            logger.warning("Firestore write failed for question state: %s", e)

    return ResolveQuestionResponse(
        xpAwarded=xp,
        status=status,
        struggleFlag=struggle_flag,
    )


@router.post("/use-hint", response_model=UseHintResponse)
async def use_hint(request: Request, body: UseHintRequest):
    """
    Record hint usage for a question. Returns updated hint count and XP multiplier.
    Frontend uses this to track decay — backend is the source of truth.
    """
    _authenticate(request, body.userId)

    new_hints_used = body.currentHintTier + 1
    multiplier = HINT_DECAY.get(min(new_hints_used, 3), 0.2)

    db = _get_firestore()
    if db:
        try:
            state_ref = db.collection("user_question_states").document(f"{body.userId}_{body.questionId}")
            state_ref.set({
                "user_id": body.userId,
                "question_id": body.questionId,
                "session_id": body.sessionId,
                "hints_used": new_hints_used,
                "last_hint_at": datetime.now(timezone.utc).isoformat(),
            }, merge=True)
        except Exception as e:
            logger.warning("Firestore write failed for hint usage: %s", e)

    return UseHintResponse(
        hintsUsed=new_hints_used,
        xpMultiplier=multiplier,
        acknowledged=True,
    )


@router.post("/complete-session", response_model=CompleteSessionResponse)
async def complete_session(request: Request, body: CompleteSessionRequest):
    """
    Finalize a Try It Yourself session. Calculates total XP server-side,
    identifies struggle topics, and updates user profile.
    """
    _authenticate(request, body.userId)

    total_xp = 0
    questions_resolved = 0
    questions_revealed = 0
    total_attempts = 0
    struggle_topics: List[str] = []

    for result in body.questionResults:
        resolution = result.get("resolution", "correct")
        hints_used = result.get("hintsUsed", 0)
        attempts = result.get("attempts", 1)

        # Server-side XP recalculation (never trust frontend)
        xp = _calculate_xp(hints_used, attempts, resolution)
        total_xp += xp
        total_attempts += attempts

        if resolution == "correct":
            questions_resolved += 1
        else:
            questions_revealed += 1

        if attempts >= STRUGGLE_THRESHOLD:
            topic = result.get("topic", "Unknown")
            if topic not in struggle_topics:
                struggle_topics.append(topic)

    avg_attempts = total_attempts / max(len(body.questionResults), 1)

    # Update user XP in Firestore
    db = _get_firestore()
    if db and total_xp > 0:
        try:
            user_ref = db.collection("users").document(body.userId)
            user_ref.update({
                "totalXP": fs.Increment(total_xp),
                "currentXP": fs.Increment(total_xp),
            })
        except Exception as e:
            logger.warning("User XP update failed: %s", e)

    return CompleteSessionResponse(
        totalXP=total_xp,
        questionsResolved=questions_resolved,
        questionsRevealed=questions_revealed,
        averageAttempts=round(avg_attempts, 1),
        struggleTopics=struggle_topics,
    )

class ShadowRetryRequest(BaseModel):
    userId: str
    sessionId: str
    struggleTopics: List[str] = Field(..., description="Topics the student struggled with in previous phase")
    subject: str
    difficulty: str = "medium"
    count: int = Field(default=3, ge=1, le=5)


class ShadowRetryResponse(BaseModel):
    variants: List[Dict[str, Any]]
    generated: bool


# --- Generate Round Models ---

class GenerateRoundRequest(BaseModel):
    userId: str
    sessionId: str
    questionIds: List[str] = Field(..., description="All question IDs available for this quiz")


class PhaseQuestions(BaseModel):
    phase: int
    label: str  # "Foundation", "Application", "Complexity", "Gauntlet"
    questionIds: List[str]


class GenerateRoundResponse(BaseModel):
    phases: List[PhaseQuestions]
    questionStatuses: Dict[str, str]  # questionId -> status (New/Retry/Learning/Mastered)


@router.post("/generate-round", response_model=GenerateRoundResponse)
async def generate_round(request: Request, body: GenerateRoundRequest):
    """
    Queries user_question_states for all provided question IDs and groups them
    into Bloom's taxonomy phases based on their mastery status:
      Phase 1 (Foundation): New + Retry questions (Remembering & Understanding)
      Phase 2 (Application): Learning questions (Applying)
      Phase 3 (Complexity): Learning questions via spaced repetition
      Phase 4 (Gauntlet): Mastered questions (Analyzing)
    
    Returns phase-grouped question IDs so the frontend can build the quiz flow.
    """
    _authenticate(request, body.userId)

    # Fetch all user_question_states for these questions
    statuses: Dict[str, str] = {}
    db = _get_firestore()
    
    if db and body.questionIds:
        try:
            # Batch fetch all question states for this user
            for qid in body.questionIds:
                doc_ref = db.collection("user_question_states").document(f"{body.userId}_{qid}")
                doc = doc_ref.get()
                if doc.exists:
                    statuses[qid] = doc.to_dict().get("status", "New")
                else:
                    statuses[qid] = "New"
        except Exception as e:
            logger.warning("Firestore batch read failed: %s", e)
            # Default all to New if read fails
            for qid in body.questionIds:
                statuses[qid] = "New"
    else:
        for qid in body.questionIds:
            statuses[qid] = "New"

    # Group questions by status
    new_questions = [qid for qid, s in statuses.items() if s == "New"]
    retry_questions = [qid for qid, s in statuses.items() if s == "Retry"]
    learning_questions = [qid for qid, s in statuses.items() if s == "Learning"]
    mastered_questions = [qid for qid, s in statuses.items() if s == "Mastered"]

    # Build phases per spec v7
    phases: List[PhaseQuestions] = []

    # Phase 1 (Foundation): New + Retry
    phase1_ids = new_questions + retry_questions
    if phase1_ids:
        phases.append(PhaseQuestions(phase=1, label="Foundation", questionIds=phase1_ids))

    # Phase 2 (Application): Learning
    if learning_questions:
        phases.append(PhaseQuestions(phase=2, label="Application", questionIds=learning_questions))

    # Phase 3 (Complexity): Learning spaced repetition (re-include learning if enough)
    # Only activate if there are learning questions AND we already have a Phase 1
    if learning_questions and phase1_ids:
        phases.append(PhaseQuestions(phase=3, label="Complexity", questionIds=learning_questions))

    # Phase 4 (Gauntlet): Mastered questions
    if mastered_questions:
        phases.append(PhaseQuestions(phase=4, label="Gauntlet", questionIds=mastered_questions))

    # If no phases were built (all questions are new), put everything in Phase 1
    if not phases:
        phases.append(PhaseQuestions(phase=1, label="Foundation", questionIds=body.questionIds))

    return GenerateRoundResponse(phases=phases, questionStatuses=statuses)


@router.post("/shadow-retry", response_model=ShadowRetryResponse)
async def generate_shadow_retries(request: Request, body: ShadowRetryRequest):
    """
    Generate variant questions for topics the student struggled with.
    Called between phases during the round summary screen.
    Returns lightweight variant questions targeting weak areas.
    """
    _authenticate(request, body.userId)

    # Import quiz generation utilities
    try:
        from routes.quiz_generation_routes import _get_inference_client, _parse_quiz_response
        from services.inference_client import InferenceRequest
        from rag.curriculum_rag import retrieve_curriculum_context
    except ImportError as e:
        logger.warning("Shadow retry generation unavailable: %s", e)
        return ShadowRetryResponse(variants=[], generated=False)

    if not body.struggleTopics:
        return ShadowRetryResponse(variants=[], generated=False)

    # Build a focused prompt for variant generation
    topics_str = ", ".join(body.struggleTopics[:3])  # Max 3 topics

    try:
        # Retrieve curriculum context for the struggle topics
        chunks = retrieve_curriculum_context(
            query=topics_str,
            subject=body.subject,
            top_k=4,
        )
        context = "\n".join(chunk.get("document", "") for chunk in chunks[:4]) if chunks else topics_str

        prompt = f"""Generate {body.count} VARIANT math questions for topics the student struggled with.
Topics: {topics_str}
Subject: {body.subject}
Difficulty: {body.difficulty}

These are RETRY questions — test the SAME concepts but with different numbers, scenarios, or phrasing.
Include 3 progressive hints per question.

Context: {context[:2000]}

Return JSON array:
[{{"id": "v1", "question_text": "...", "type": "multiple_choice", "bloom_level": "understand",
  "options": [{{"key": "A", "text": "..."}}, ...], "correct_answer": "A",
  "explanation": "...", "hints": ["hint1", "hint2", "hint3"],
  "points": 1, "xp_reward": 10, "difficulty": "{body.difficulty}", "competency_code": "N/A"}}]

Return ONLY valid JSON array."""

        inference_request = InferenceRequest(
            messages=[
                {"role": "system", "content": "You are a math question generator creating retry variants for struggling students."},
                {"role": "user", "content": prompt},
            ],
            task_type="quiz_generation",
            max_new_tokens=2000,
            temperature=0.8,
        )

        raw = _get_inference_client().generate_from_messages(inference_request)
        variants = _parse_quiz_response(raw, body.count)

        return ShadowRetryResponse(variants=variants, generated=True)

    except Exception as e:
        logger.warning("Shadow retry generation failed: %s", e)
        return ShadowRetryResponse(variants=[], generated=False)