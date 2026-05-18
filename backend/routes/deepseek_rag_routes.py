"""
RAG-grounded DeepSeek routes.

Feature 1: Topic-level weakness detection
Feature 2: AI preview for coming_soon modules
Feature 3: Personalized study tips per flagged topic
"""

import json
import logging
from typing import Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter

from services.ai_client import REASONER_MODEL, CHAT_MODEL
from services.deepseek_client import is_enabled, rag_grounded_completion, parse_json_response
from rag.curriculum_rag import (
    retrieve_curriculum_context,
    build_analysis_curriculum_context,
    retrieve_lesson_pdf_context,
    format_retrieved_chunks,
    summarize_retrieval_confidence,
    build_exact_lesson_query,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/deepseek", tags=["deepseek-rag"])

WEAK_TOPIC_THRESHOLD = 0.60


# ═══════════════════════════════════════════════════════════════
# Feature 1 — RAG-grounded topic-level weakness detection
# ═══════════════════════════════════════════════════════════════

class QuestionResult(BaseModel):
    question_id: str
    topic_id: str
    quarter: int
    competency_code: str = ""
    is_correct: bool


class WeaknessDetectionRequest(BaseModel):
    student_id: str
    subject: str = "General Mathematics"
    questions: list[QuestionResult]


class WeaknessDetectionResponse(BaseModel):
    flagged_topics: list[str]
    confidence: dict[str, float] = Field(default_factory=dict)
    reasoning_summary: str = ""
    source: str = "rule_based"  # "deepseek" or "rule_based"


@router.post("/weakness-detection", response_model=WeaknessDetectionResponse)
async def detect_weaknesses(req: WeaknessDetectionRequest):
    """Detect topic-level weaknesses using RAG + DeepSeek, with rule-based fallback."""

    # Rule-based fallback: compute per-topic accuracy
    topic_stats: dict[str, dict] = {}
    for q in req.questions:
        if q.topic_id not in topic_stats:
            topic_stats[q.topic_id] = {"correct": 0, "total": 0}
        topic_stats[q.topic_id]["total"] += 1
        if q.is_correct:
            topic_stats[q.topic_id]["correct"] += 1

    rule_flagged = []
    rule_confidence = {}
    for topic_id, stats in topic_stats.items():
        accuracy = stats["correct"] / stats["total"] if stats["total"] > 0 else 0
        if accuracy < WEAK_TOPIC_THRESHOLD:
            rule_flagged.append(topic_id)
            rule_confidence[topic_id] = round(1.0 - accuracy, 2)

    if not is_enabled() or not rule_flagged:
        return WeaknessDetectionResponse(
            flagged_topics=rule_flagged,
            confidence=rule_confidence,
            reasoning_summary="Rule-based detection: topics below 60% accuracy threshold.",
            source="rule_based",
        )

    # RAG retrieval
    topic_names = list({q.topic_id for q in req.questions if q.topic_id in rule_flagged})
    rag_chunks = build_analysis_curriculum_context(weak_topics=topic_names, subject=req.subject)

    for topic_name in topic_names:
        chunks = retrieve_curriculum_context(
            query=f"DepEd learning competency for {topic_name}",
            subject=req.subject,
            chunk_type="learning_competency",
            top_k=3,
        )
        rag_chunks.extend(chunks)

    rag_context = format_retrieved_chunks(rag_chunks)

    # DeepSeek call
    system_prompt = (
        "You are a DepEd SHS math assessment expert. Analyze student quiz results and identify "
        "specific topic weaknesses at the competency level. Base your analysis ONLY on the "
        "DepEd curriculum evidence provided in [CURRICULUM CONTEXT]. Do not invent competencies "
        "or topics not present in the retrieved context."
    )
    questions_json = json.dumps([q.model_dump() for q in req.questions], default=str)
    user_prompt = (
        f"[CURRICULUM CONTEXT]\n{rag_context}\n\n"
        f"[STUDENT QUIZ RESULTS]\n{questions_json}\n\n"
        "Identify flagged topics and return JSON:\n"
        '{"flagged_topics": ["topic_id", ...], '
        '"confidence": {"topic_id": 0.85}, '
        '"reasoning_summary": "plain text for teacher dashboard, grounded in DepEd competencies"}'
    )

    raw = rag_grounded_completion(REASONER_MODEL, system_prompt, user_prompt, temperature=0.1)
    parsed = parse_json_response(raw)

    if parsed and "flagged_topics" in parsed:
        return WeaknessDetectionResponse(
            flagged_topics=parsed["flagged_topics"],
            confidence=parsed.get("confidence", rule_confidence),
            reasoning_summary=parsed.get("reasoning_summary", ""),
            source="deepseek",
        )

    # Fallback
    return WeaknessDetectionResponse(
        flagged_topics=rule_flagged,
        confidence=rule_confidence,
        reasoning_summary="Rule-based detection: topics below 60% accuracy threshold.",
        source="rule_based",
    )


# ═══════════════════════════════════════════════════════════════
# Feature 2 — RAG-grounded AI preview for coming_soon modules
# ═══════════════════════════════════════════════════════════════

class ModulePreviewRequest(BaseModel):
    module_id: str
    module_title: str
    subject: str = "General Mathematics"
    quarter: int = 1


class ModulePreviewResponse(BaseModel):
    ai_overview: str
    rag_confidence: str = "low"  # "high" | "medium" | "low"
    generated: bool = False


@router.post("/module-preview", response_model=ModulePreviewResponse)
async def generate_module_preview(req: ModulePreviewRequest):
    """Generate a RAG-grounded AI preview for a coming_soon module."""

    if not is_enabled():
        return ModulePreviewResponse(ai_overview="", generated=False)

    # RAG retrieval using existing 4-tier fallback
    query = build_exact_lesson_query(
        topic=req.module_title,
        subject=req.subject,
        quarter=req.quarter,
    )
    chunks, _ = retrieve_lesson_pdf_context(
        topic=req.module_title,
        subject=req.subject,
        quarter=req.quarter,
        top_k=6,
    )

    rag_context = format_retrieved_chunks(chunks)
    confidence_info = summarize_retrieval_confidence(chunks)
    band = confidence_info.get("band", "low")

    system_prompt = (
        "You are a DepEd K-12 SHS math educator writing for Grade 11-12 Filipino students. "
        "Generate content ONLY from the retrieved DepEd curriculum excerpts provided. "
        "Do NOT add generic filler. Do NOT invent examples or definitions not present "
        "in the retrieved context."
    )
    user_prompt = (
        f"[CURRICULUM CONTEXT]\n{rag_context}\n\n"
        f"Write a 3-5 sentence student-friendly overview of the topic '{req.module_title}' "
        f"under '{req.subject}', Quarter {req.quarter}, strictly based on the "
        "curriculum evidence above."
    )

    raw = rag_grounded_completion(CHAT_MODEL, system_prompt, user_prompt, temperature=0.3)

    if not raw:
        return ModulePreviewResponse(ai_overview="", rag_confidence=band, generated=False)

    overview = raw.strip()
    if band == "low":
        overview += "\n\n⚠ Limited curriculum data available for this topic."

    return ModulePreviewResponse(ai_overview=overview, rag_confidence=band, generated=True)


# ═══════════════════════════════════════════════════════════════
# Feature 3 — RAG-grounded personalized study tips
# ═══════════════════════════════════════════════════════════════

class StudyTipsRequest(BaseModel):
    student_id: str
    topic_id: str
    topic_name: str
    subject: str = "General Mathematics"
    confidence_score: float = 0.0


class StudyTipsResponse(BaseModel):
    tips: str
    generated: bool = False
    confidence_score: float = 0.0


@router.post("/study-tips", response_model=StudyTipsResponse)
async def generate_study_tips(req: StudyTipsRequest):
    """Generate RAG-grounded personalized study tips for a flagged topic."""

    if not is_enabled():
        return StudyTipsResponse(tips="", generated=False, confidence_score=req.confidence_score)

    # RAG retrieval: practice chunks
    practice_chunks = retrieve_curriculum_context(
        query=f"study tips practice exercises for {req.topic_name}",
        subject=req.subject,
        chunk_type="practice",
        top_k=4,
    )
    # Fallback if no practice chunks found
    if not practice_chunks:
        practice_chunks = retrieve_curriculum_context(
            query=f"study tips practice exercises for {req.topic_name}",
            subject=req.subject,
            top_k=4,
        )

    # Worked examples
    example_chunks = retrieve_curriculum_context(
        query=f"worked examples for {req.topic_name}",
        subject=req.subject,
        chunk_type="worked_examples",
        top_k=2,
    )

    # Merge and deduplicate
    seen_keys: set[str] = set()
    merged: list[dict] = []
    for chunk in practice_chunks + example_chunks:
        key = f"{chunk.get('source_file')}::{chunk.get('page')}::{chunk.get('content', '')[:60]}"
        if key not in seen_keys:
            seen_keys.add(key)
            merged.append(chunk)

    rag_context = format_retrieved_chunks(merged)

    system_prompt = (
        "You are a math tutor helping a Filipino SHS student improve weak areas. "
        "Base ALL study tips strictly on the retrieved DepEd curriculum content below. "
        "Do not invent practice problems or examples not found in the curriculum context."
    )
    user_prompt = (
        f"[CURRICULUM CONTEXT]\n{rag_context}\n\n"
        f"Give 2-3 concise, practical study tips for a student weak in '{req.topic_name}' "
        "under DepEd SHS curriculum. Reference specific concepts from the curriculum "
        "context above. Be direct and student-friendly."
    )

    raw = rag_grounded_completion(CHAT_MODEL, system_prompt, user_prompt, temperature=0.4)

    if not raw:
        return StudyTipsResponse(tips="", generated=False, confidence_score=req.confidence_score)

    return StudyTipsResponse(
        tips=raw.strip(),
        generated=True,
        confidence_score=req.confidence_score,
    )
