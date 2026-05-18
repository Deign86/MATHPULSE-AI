"""
At-Risk + Locked Module Resolution Logic.

POST /api/at-risk/resolve       — Classify flagged topics into resolution states + generate fallback content
GET  /api/at-risk/fallback/{uid}/{topic_id} — Fetch cached fallback study brief
"""

import logging
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.ai_client import CHAT_MODEL
from services.deepseek_client import is_enabled, rag_grounded_completion, parse_json_response
from rag.curriculum_rag import (
    retrieve_curriculum_context,
    format_retrieved_chunks,
    summarize_retrieval_confidence,
)

import firebase_admin
from firebase_admin import firestore as fs

logger = logging.getLogger("mathpulse.at_risk_resolution")
router = APIRouter(prefix="/api/at-risk", tags=["at-risk-resolution"])


# ─── Models ────────────────────────────────────────────────────────

class FlaggedTopicInput(BaseModel):
    topic_id: str
    topic_name: str
    subject: str = "General Mathematics"
    quarter: int = 1
    confidence_score: float = 0.0


class ResolveRequest(BaseModel):
    uid: str
    flagged_topics: list[FlaggedTopicInput]


class ResolvedTopic(BaseModel):
    topic_id: str
    subject: str
    quarter: int
    confidence_score: float
    resolution_state: str  # accessible | coming_soon | progression_locked | no_module
    module_id: Optional[str] = None


class FallbackContent(BaseModel):
    summary: str = ""
    key_concepts: list[str] = Field(default_factory=list)
    one_worked_example: dict = Field(default_factory=dict)
    what_to_focus_on: str = ""
    rag_confidence: str = "low"


class ResolveResponse(BaseModel):
    resolved: list[ResolvedTopic]
    fallback_generated: int = 0


# ─── Resolution Logic ──────────────────────────────────────────────

def _resolve_topic(
    topic: FlaggedTopicInput,
    firestore_client: Any,
    uid: str,
) -> ResolvedTopic:
    """Classify a flagged topic into a resolution state by checking Firestore modules collection."""
    # Query modules collection for matching topic
    modules_ref = firestore_client.collection("modules")
    # Try exact match on moduleId == topic_id first
    doc = modules_ref.document(topic.topic_id).get()

    module_id: Optional[str] = None
    module_status: Optional[str] = None

    if doc.exists:
        data = doc.to_dict() or {}
        module_id = topic.topic_id
        module_status = data.get("moduleStatus") or data.get("status") or "unavailable"
    else:
        # Fallback: query by topicId field
        query = modules_ref.where("topicId", "==", topic.topic_id).limit(1).stream()
        for match in query:
            data = match.to_dict() or {}
            module_id = match.id
            module_status = data.get("moduleStatus") or data.get("status") or "unavailable"
            break

    if not module_id or not module_status:
        return ResolvedTopic(
            topic_id=topic.topic_id,
            subject=topic.subject,
            quarter=topic.quarter,
            confidence_score=topic.confidence_score,
            resolution_state="no_module",
            module_id=None,
        )

    # Check if module is accessible
    if module_status in ("available", "teacher_uploaded"):
        # Check progression unlock
        progress_doc = (
            firestore_client.collection("studentProgress")
            .document(uid)
            .collection("modules")
            .document(module_id)
            .get()
        )
        if progress_doc.exists:
            prog_data = progress_doc.to_dict() or {}
            if prog_data.get("unlocked") is False:
                return ResolvedTopic(
                    topic_id=topic.topic_id,
                    subject=topic.subject,
                    quarter=topic.quarter,
                    confidence_score=topic.confidence_score,
                    resolution_state="progression_locked",
                    module_id=module_id,
                )
        return ResolvedTopic(
            topic_id=topic.topic_id,
            subject=topic.subject,
            quarter=topic.quarter,
            confidence_score=topic.confidence_score,
            resolution_state="accessible",
            module_id=module_id,
        )

    if module_status == "coming_soon":
        return ResolvedTopic(
            topic_id=topic.topic_id,
            subject=topic.subject,
            quarter=topic.quarter,
            confidence_score=topic.confidence_score,
            resolution_state="coming_soon",
            module_id=module_id,
        )

    # unavailable or unknown
    return ResolvedTopic(
        topic_id=topic.topic_id,
        subject=topic.subject,
        quarter=topic.quarter,
        confidence_score=topic.confidence_score,
        resolution_state="no_module",
        module_id=module_id,
    )


# ─── Fallback Content Generation ──────────────────────────────────

def _generate_fallback_content(
    topic: FlaggedTopicInput,
    resolution_state: str,
) -> Optional[dict]:
    """Generate RAG-grounded fallback study brief for a non-accessible topic."""
    if not is_enabled():
        return None

    # STEP 1 — RAG retrieval: key concepts
    concept_chunks = retrieve_curriculum_context(
        query=f"core concepts and learning competency for {topic.topic_name}",
        subject=topic.subject,
        quarter=topic.quarter,
        chunk_type="key_concepts",
        top_k=5,
    )
    if not concept_chunks:
        concept_chunks = retrieve_curriculum_context(
            query=f"core concepts and learning competency for {topic.topic_name}",
            subject=topic.subject,
            quarter=topic.quarter,
            chunk_type="learning_competency",
            top_k=5,
        )
    if not concept_chunks:
        concept_chunks = retrieve_curriculum_context(
            query=f"core concepts and learning competency for {topic.topic_name}",
            subject=topic.subject,
            quarter=topic.quarter,
            top_k=5,
        )

    # Worked examples
    example_chunks = retrieve_curriculum_context(
        query=f"worked examples for {topic.topic_name}",
        subject=topic.subject,
        quarter=topic.quarter,
        chunk_type="worked_examples",
        top_k=3,
    )

    # Merge and deduplicate
    seen: set[str] = set()
    merged: list[dict] = []
    for chunk in concept_chunks + example_chunks:
        key = f"{chunk.get('source_file')}::{chunk.get('page')}::{chunk.get('content', '')[:60]}"
        if key not in seen:
            seen.add(key)
            merged.append(chunk)

    rag_context = format_retrieved_chunks(merged)
    confidence_info = summarize_retrieval_confidence(merged)
    rag_band = confidence_info.get("band", "low")

    # STEP 2 — DeepSeek call
    system_prompt = (
        "You are a DepEd SHS math tutor. A student has been flagged as at-risk on a topic "
        "but the full module is not yet available. Generate a compact, self-contained "
        "study brief using ONLY the retrieved DepEd curriculum content below. "
        "Do NOT invent content outside the curriculum context."
    )
    user_prompt = (
        f"[CURRICULUM CONTEXT]\n{rag_context}\n\n"
        f"The student is at risk in: '{topic.topic_name}' ({topic.subject}, Q{topic.quarter}).\n"
        f"The full module is currently [{resolution_state}].\n\n"
        "Generate a compact study brief with this exact JSON structure:\n"
        "{\n"
        '  "summary": "2-3 sentence overview of the topic",\n'
        '  "key_concepts": ["concept 1", "concept 2", "concept 3"],\n'
        '  "one_worked_example": { "problem": "...", "solution": "..." },\n'
        '  "what_to_focus_on": "1-2 sentences on what the student should prioritize",\n'
        f'  "rag_confidence": "{rag_band}"\n'
        "}\n\n"
        "Return ONLY valid JSON."
    )

    raw = rag_grounded_completion(CHAT_MODEL, system_prompt, user_prompt, temperature=0.2)
    parsed = parse_json_response(raw)

    if parsed:
        parsed.setdefault("rag_confidence", rag_band)
        return parsed

    return None


# ─── Endpoints ─────────────────────────────────────────────────────

@router.post("/resolve", response_model=ResolveResponse)
async def resolve_at_risk_topics(request: ResolveRequest):
    """Resolve flagged topics into resolution states and generate fallback content."""
    try:
        firestore_client = fs.client()
    except Exception:
        raise HTTPException(status_code=503, detail="Database unavailable")

    resolved: list[ResolvedTopic] = []
    fallback_count = 0

    for topic in request.flagged_topics:
        result = _resolve_topic(topic, firestore_client, request.uid)
        resolved.append(result)

        # Write resolution state to Firestore
        try:
            firestore_client.collection("students").document(request.uid).collection(
                "flaggedTopics"
            ).document(topic.topic_id).set({
                "topicId": topic.topic_id,
                "subject": topic.subject,
                "quarter": topic.quarter,
                "confidenceScore": topic.confidence_score,
                "resolutionState": result.resolution_state,
                "moduleId": result.module_id,
                "resolvedAt": fs.SERVER_TIMESTAMP,
            })
        except Exception as e:
            logger.warning(f"Failed to write flaggedTopics for {topic.topic_id}: {e}")

        # Generate fallback content for non-accessible topics
        if result.resolution_state != "accessible":
            fallback = _generate_fallback_content(topic, result.resolution_state)
            if fallback:
                try:
                    firestore_client.collection("students").document(request.uid).collection(
                        "atRiskFallbackContent"
                    ).document(topic.topic_id).set({
                        **fallback,
                        "generated_at": fs.SERVER_TIMESTAMP,
                        "resolutionState": result.resolution_state,
                    })
                    fallback_count += 1
                except Exception as e:
                    logger.warning(f"Failed to cache fallback for {topic.topic_id}: {e}")

    return ResolveResponse(resolved=resolved, fallback_generated=fallback_count)


@router.get("/fallback/{uid}/{topic_id}")
async def get_fallback_content(uid: str, topic_id: str):
    """Fetch cached fallback study brief for a flagged topic."""
    try:
        firestore_client = fs.client()
    except Exception:
        raise HTTPException(status_code=503, detail="Database unavailable")

    doc = (
        firestore_client.collection("students")
        .document(uid)
        .collection("atRiskFallbackContent")
        .document(topic_id)
        .get()
    )

    if not doc.exists:
        raise HTTPException(status_code=404, detail="No fallback content found")

    return doc.to_dict()
