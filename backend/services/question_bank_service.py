"""
Question Bank Service for Quiz Battle.

Handles querying the question bank with random ordering,
caching session questions, and 24-hour debounce for variance results.
"""

import os
import random
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional

from google.cloud import firestore

DEFAULT_FIREBASE_PROJECT = os.getenv("FIREBASE_AUTH_PROJECT_ID", "mathpulse-ai-2026")


def _get_db() -> firestore.Client:
    """Get Firestore client."""
    return firestore.Client(project=DEFAULT_FIREBASE_PROJECT)


async def get_questions_for_battle(
    grade_level: int,
    topic: str,
    count: int = 10,
) -> List[Dict]:
    """
    Fetch random questions from the question bank for a battle session.

    Uses Firestore random_seed field for pseudo-random ordering.
    If fewer than `count` questions exist, returns all available.

    Firestore path: question_bank/{grade_level}/topics/{topic}/questions/{docId}
    (alternating collection/document segments — 5 segments total).
    """
    db = _get_db()
    collection_ref = (
        db.collection("question_bank")
        .document(str(grade_level))
        .collection("topics")
        .document(topic)
        .collection("questions")
    )

    # Pseudo-random query using random_seed >= random threshold
    threshold = random.random()
    query = (
        collection_ref
        .where("random_seed", ">=", threshold)
        .order_by("random_seed")
        .limit(count)
    )
    docs = list(query.stream())

    # If we didn't get enough, query from the start to fill shortfall
    if len(docs) < count:
        remaining = count - len(docs)
        fallback_query = (
            collection_ref
            .where("random_seed", "<", threshold)
            .order_by("random_seed")
            .limit(remaining)
        )
        docs.extend(list(fallback_query.stream()))

    questions = [doc.to_dict() for doc in docs]
    required_fields = ("question", "choices", "correct_answer", "difficulty")
    return [q for q in questions if q and all(k in q for k in required_fields)]


async def cache_session_questions(
    session_id: str,
    questions: List[Dict],
    player_ids: List[str],
    grade_level: int,
    topic: str,
) -> None:
    """Cache varied questions for a battle session with 24-hour TTL.

    Questions are inlined as a list field in the root session document
    (1 Firestore write vs. N subcollection batch writes).
    """
    db = _get_db()
    session_ref = db.collection("quiz_battle_sessions").document(session_id)
    session_ref.set({
        "player_ids": player_ids,
        "grade_level": grade_level,
        "topic": topic,
        "questions": questions,
        "created_at": firestore.SERVER_TIMESTAMP,
        "variance_cached_until": datetime.now(timezone.utc) + timedelta(hours=24),
    })


async def get_cached_session(session_id: str) -> Optional[List[Dict]]:
    """
    Check if a session has cached varied questions within 24 hours.

    Returns the cached questions if valid, otherwise None.
    """
    db = _get_db()
    session_doc = db.collection("quiz_battle_sessions").document(session_id).get()
    if not session_doc.exists:
        return None

    data = session_doc.to_dict()
    cached_until = data.get("variance_cached_until")
    if cached_until:
        if isinstance(cached_until, datetime):
            if cached_until.tzinfo is None:
                cached_until = cached_until.replace(tzinfo=timezone.utc)
        elif hasattr(cached_until, 'timestamp'):
            # Firestore Timestamp object
            cached_until = datetime.fromtimestamp(cached_until.timestamp(), tz=timezone.utc)

        if cached_until > datetime.now(timezone.utc):
            questions: List[Dict] = data.get("questions") or []
            return questions if questions else None

    return None
