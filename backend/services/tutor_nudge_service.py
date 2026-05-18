"""
MathPulse AI — Tutor Nudge Service

Generates proactive AI tutor nudges for at-risk students using DeepSeek,
then writes them to Firestore for the floating tutor to surface.
"""

import logging
from datetime import datetime, timezone

logger = logging.getLogger("mathpulse.tutor_nudge")

NUDGE_COOLDOWN_HOURS = 24

SYSTEM_PROMPT = (
    "You are MathPulse's AI tutor. Write a single short, friendly message "
    "to nudge the student to work on their weakest topic. "
    "No long explanation, just a nudge plus a concrete action. "
    "1-2 sentences max. No code, no LaTeX. Be warm and encouraging."
)


def _get_db():
    try:
        from firebase_admin import firestore as ff
        return ff.client()
    except Exception:
        return None


def _has_recent_nudge(db, student_id: str, topic: str) -> bool:
    """Check if an unconsumed nudge for this topic exists within cooldown."""
    from datetime import timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(hours=NUDGE_COOLDOWN_HOURS)
    nudges_ref = db.collection("tutorNudges").document(student_id).collection("nudges")
    existing = (
        nudges_ref
        .where("topic", "==", topic)
        .where("createdAt", ">=", cutoff)
        .limit(1)
        .get()
    )
    return len(existing) > 0


async def generate_tutor_nudge_for_student(
    student_id: str,
    weak_topics: list[str],
    grade_level: str = "Grade 11",
    recent_score: float | None = None,
) -> dict | None:
    """Generate a nudge message via DeepSeek and write to Firestore."""
    if not weak_topics:
        return None

    db = _get_db()
    if not db:
        logger.warning("Firestore unavailable, skipping nudge generation")
        return None

    # Pick the first weak topic that doesn't have a recent nudge
    topic = None
    for t in weak_topics[:3]:
        if not _has_recent_nudge(db, student_id, t):
            topic = t
            break

    if not topic:
        return None  # All topics have recent nudges

    # Generate nudge via DeepSeek
    try:
        from services.ai_client import get_deepseek_client, CHAT_MODEL

        client = get_deepseek_client()
        user_content = (
            f"Student grade: {grade_level}. "
            f"Weak topic: {topic}. "
            f"{'Recent score: ' + str(round(recent_score)) + '%.' if recent_score else ''} "
            f"Write a short nudge to encourage them to practice this topic."
        )

        response = client.chat.completions.create(
            model=CHAT_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            temperature=0.7,
            max_tokens=100,
        )
        message = (response.choices[0].message.content or "").strip()
        if not message:
            return None

    except Exception as e:
        logger.error(f"DeepSeek nudge generation failed for {student_id}: {e}")
        return None

    # Write to Firestore
    nudge_data = {
        "message": message,
        "topic": topic,
        "createdAt": datetime.now(timezone.utc),
        "consumed": False,
    }

    try:
        db.collection("tutorNudges").document(student_id).collection("nudges").add(nudge_data)
        logger.info(f"Nudge written for {student_id}: topic={topic}")
    except Exception as e:
        logger.error(f"Failed to write nudge for {student_id}: {e}")
        return None

    return {"message": message, "topic": topic, "created_at": nudge_data["createdAt"].isoformat()}
