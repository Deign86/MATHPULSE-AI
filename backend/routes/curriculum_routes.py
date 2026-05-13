from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

# Lazy import to prevent ModuleNotFoundError during test collection.
# The project root (MATHPULSE-AI/) has a stale services/ dir that
# shadows backend/services/ and lacks curriculum_service.py.
# Deferring the import avoids the collision at module-load time;
# by the time route handlers run, sys.path is correct.
_curriculum_service = None
def _get_curriculum_service():
    global _curriculum_service
    if _curriculum_service is None:
        try:
            from services.curriculum_service import get_subject, get_subjects, get_topic, get_topics
            _curriculum_service = (get_subject, get_subjects, get_topic, get_topics)
        except ImportError:
            _curriculum_service = False  # sentinel: don't retry
    return _curriculum_service if _curriculum_service is not False else None

logger = logging.getLogger("mathpulse.curriculum")
router = APIRouter(prefix="/api/curriculum", tags=["curriculum"])


class SubjectResponse(BaseModel):
    id: str
    code: str
    name: str
    gradeLevel: str
    semester: str
    color: str
    pdfAvailable: bool
    topics: list


class TopicResponse(BaseModel):
    id: str
    name: str
    unit: str


@router.get("/subjects", response_model=list[SubjectResponse])
async def list_subjects(grade_level: Optional[str] = Query(None, description="Filter by grade level (e.g., 'Grade 11', 'Grade 12')")):
    """List all curriculum subjects, optionally filtered by grade level."""
    svc = _get_curriculum_service()
    if svc is None:
        raise HTTPException(status_code=503, detail="Curriculum service unavailable")
    _, get_subjects_fn, _, _ = svc
    # Guard against malformed grade levels (e.g., "Grade 2011" from bad state)
    valid_grades = {"Grade 11", "Grade 12", "Grade 11/12"}
    if grade_level and grade_level not in valid_grades:
        logger.warning(f"[curriculum] Invalid grade_level received: {grade_level!r}, defaulting to Grade 11")
        grade_level = "Grade 11"
    subjects = get_subjects_fn(grade_level)
    return subjects


@router.get("/subjects/{subject_id}", response_model=SubjectResponse)
async def get_subject_by_id(subject_id: str):
    """Get a specific subject by ID."""
    svc = _get_curriculum_service()
    if svc is None:
        raise HTTPException(status_code=503, detail="Curriculum service unavailable")
    get_subject_fn, _, _, _ = svc
    subject = get_subject_fn(subject_id)
    if not subject:
        raise HTTPException(status_code=404, detail=f"Subject not found: {subject_id}")
    return subject


@router.get("/subjects/{subject_id}/topics", response_model=list[TopicResponse])
async def list_subject_topics(subject_id: str):
    """List all topics for a subject."""
    svc = _get_curriculum_service()
    if svc is None:
        raise HTTPException(status_code=503, detail="Curriculum service unavailable")
    _, _, _, get_topics_fn = svc
    topics = get_topics_fn(subject_id)
    return topics


@router.get("/subjects/{subject_id}/topics/{topic_id}", response_model=TopicResponse)
async def get_topic_by_id(subject_id: str, topic_id: str):
    """Get a specific topic."""
    svc = _get_curriculum_service()
    if svc is None:
        raise HTTPException(status_code=503, detail="Curriculum service unavailable")
    _, _, get_topic_fn, _ = svc
    topic = get_topic_fn(subject_id, topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail=f"Subject not found: {subject_id}/{topic_id}")
    return topic