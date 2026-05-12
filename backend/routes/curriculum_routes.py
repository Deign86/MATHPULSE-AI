from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from services.curriculum_service import (
    get_subject,
    get_subjects,
    get_topic,
    get_topics,
)

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
    # Guard against malformed grade levels (e.g., "Grade 2011" from bad state)
    valid_grades = {"Grade 11", "Grade 12", "Grade 11/12"}
    if grade_level and grade_level not in valid_grades:
        logger.warning(f"[curriculum] Invalid grade_level received: {grade_level!r}, defaulting to Grade 11")
        grade_level = "Grade 11"
    subjects = get_subjects(grade_level)
    return subjects


@router.get("/subjects/{subject_id}", response_model=SubjectResponse)
async def get_subject_by_id(subject_id: str):
    """Get a specific subject by ID."""
    subject = get_subject(subject_id)
    if not subject:
        raise HTTPException(status_code=404, detail=f"Subject not found: {subject_id}")
    return subject


@router.get("/subjects/{subject_id}/topics", response_model=list[TopicResponse])
async def list_subject_topics(subject_id: str):
    """List all topics for a subject."""
    topics = get_topics(subject_id)
    return topics


@router.get("/subjects/{subject_id}/topics/{topic_id}", response_model=TopicResponse)
async def get_topic_by_id(subject_id: str, topic_id: str):
    """Get a specific topic."""
    topic = get_topic(subject_id, topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail=f"Topic not found: {subject_id}/{topic_id}")
    return topic