"""
Tutor Check-in Engine — DeepSeek-powered contextual student engagement.

POST /api/tutor-checkin -> Generate a personalized check-in message for a student
based on their recent activity, weak topics, and current risk status.
"""

import logging
import os
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger("mathpulse.tutor_checkin")

router = APIRouter(prefix="/api/tutor-checkin", tags=["tutor-checkin"])


class TutorCheckinRequest(BaseModel):
    student_id: str
    student_name: Optional[str] = None
    risk_status: Optional[str] = None
    wri: Optional[float] = None
    weak_topics: Optional[list] = None
    recent_activity: Optional[str] = None


class TutorCheckinResponse(BaseModel):
    message: str
    tone: str
    suggested_action: Optional[str] = None


def _build_checkin_prompt(req: TutorCheckinRequest) -> str:
    """Build a contextual prompt for DeepSeek to generate a tutor check-in."""
    name = req.student_name or "Student"
    status = req.risk_status or "unknown"
    wri = req.wri
    weak = req.weak_topics or []
    activity = req.recent_activity or "No recent activity recorded."

    weak_topics_str = ", ".join(weak) if weak else "none identified"

    tone_map = {
        "safe": "encouraging and celebratory",
        "watch": "gentle and supportive",
        "intervene": "caring but firm",
        "critical": "urgent and deeply supportive",
        "at_risk": "emergency-level supportive",
    }
    tone = tone_map.get(status, "supportive")

    prompt = f"""You are MathPulse AI, a friendly and encouraging math tutor checking in on a student.

Student: {name}
Current risk status: {status}
WRI score: {wri if wri is not None else 'N/A'}
Weak topics: {weak_topics_str}
Recent activity: {activity}

Generate a short, personalized check-in message (2-3 sentences max) in a {tone} tone.
The message should:
- Acknowledge the student's current situation without being judgmental
- Offer specific, actionable encouragement
- Suggest ONE concrete next step they can take right now
- Be warm, human, and written like a caring tutor, not a robot

Return ONLY the message text. No JSON, no markdown, no prefixes."""

    return prompt


@router.post("", response_model=TutorCheckinResponse)
def generate_tutor_checkin(req: TutorCheckinRequest):
    """
    Generate a DeepSeek-powered tutor check-in message for a student.
    """
    try:
        # Lazy import to avoid startup dependency issues
        from services.inference_client import InferenceClient

        client = InferenceClient()
        prompt = _build_checkin_prompt(req)

        # Call DeepSeek with a short, fast completion
        response = client.generate(
            messages=[{"role": "user", "content": prompt}],
            model="deepseek-chat",
            temperature=0.7,
            max_tokens=150,
        )

        message = response.strip() if response else _fallback_message(req.risk_status)

        tone_map = {
            "safe": "encouraging",
            "watch": "supportive",
            "intervene": "caring-but-firm",
            "critical": "urgent",
            "at_risk": "emergency",
        }

        return TutorCheckinResponse(
            message=message,
            tone=tone_map.get(req.risk_status or "", "supportive"),
            suggested_action=_suggest_action(req.risk_status, req.weak_topics),
        )

    except Exception as e:
        logger.error(f"[TUTOR_CHECKIN] Failed to generate check-in: {e}")
        # Fallback to template-based message
        return TutorCheckinResponse(
            message=_fallback_message(req.risk_status),
            tone="supportive",
            suggested_action=_suggest_action(req.risk_status, req.weak_topics),
        )


def _fallback_message(risk_status: Optional[str]) -> str:
    """Template-based fallback when DeepSeek is unavailable."""
    fallbacks = {
        "safe": "Great work! You're on track. Keep up the momentum with today's practice.",
        "watch": "I noticed you've been working hard. Let's take a moment to review any tricky concepts together.",
        "intervene": "Your teacher and I are here to help. Let's focus on one topic at a time — you've got this.",
        "critical": "I'm worried about your progress. Please reach out to your teacher or start a remedial module today.",
        "at_risk": "Your learning path is paused until your teacher reviews your progress. In the meantime, review your completed lessons.",
    }
    return fallbacks.get(risk_status or "", "Keep going! Every problem you solve makes you stronger.")


def _suggest_action(risk_status: Optional[str], weak_topics: Optional[list]) -> Optional[str]:
    """Suggest a concrete next action based on status."""
    if risk_status == "safe":
        return "Try a bonus challenge to stretch your skills."
    if risk_status == "watch":
        return "Review the hint for your last incorrect answer."
    if risk_status == "intervene":
        topic = weak_topics[0] if weak_topics else "your weakest topic"
        return f"Start the remedial module on {topic}."
    if risk_status in ("critical", "at_risk"):
        return "Contact your teacher or start a 1-on-1 review session."
    return None
