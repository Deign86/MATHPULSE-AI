from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from threading import Lock
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from services.inference_client import InferenceRequest, create_default_client
from rag.curriculum_rag import (
    build_analysis_curriculum_context,
    build_lesson_prompt,
    build_lesson_query,
    build_problem_generation_prompt,
    retrieve_curriculum_context,
    summarize_retrieval_confidence,
)
from rag.vectorstore_loader import get_vectorstore_health

try:
    from firebase_admin import firestore as firebase_firestore  # type: ignore[import-not-found]
except Exception:
    firebase_firestore = None  # type: ignore[assignment]

logger = logging.getLogger("mathpulse.rag")
router = APIRouter(prefix="/api/rag", tags=["rag"])

_inference_client = None
_inference_lock = Lock()


def _get_inference_client():
    global _inference_client
    if _inference_client is None:
        with _inference_lock:
            if _inference_client is None:
                _inference_client = create_default_client()
    return _inference_client


async def _generate_text(prompt: str, task_type: str, max_new_tokens: int = 900) -> str:
    request = InferenceRequest(
        messages=[
            {"role": "system", "content": "You are a precise DepEd-aligned curriculum assistant."},
            {"role": "user", "content": prompt},
        ],
        task_type=task_type,
        max_new_tokens=max_new_tokens,
        temperature=0.2,
        top_p=0.9,
    )
    return _get_inference_client().generate_from_messages(request)


def _log_rag_usage(
    request: Request,
    *,
    event_type: str,
    topic: str,
    subject: str,
    quarter: Optional[int],
    chunks: List[Dict[str, Any]],
) -> None:
    if firebase_firestore is None:
        return
    try:
        user = getattr(request.state, "user", None)
        uid = getattr(user, "uid", None)
        domains = sorted({str(chunk.get("content_domain") or "").strip() for chunk in chunks if chunk.get("content_domain")})
        top_score = max((float(chunk.get("score") or 0.0) for chunk in chunks), default=0.0)
        payload = {
            "userId": uid,
            "type": event_type,
            "topic": topic,
            "subject": subject,
            "quarter": quarter,
            "retrievedChunks": len(chunks),
            "topScore": top_score,
            "curriculumDomainsHit": domains,
            "timestamp": firebase_firestore.SERVER_TIMESTAMP,
            "createdAtIso": datetime.now(timezone.utc).isoformat(),
        }
        firebase_firestore.client().collection("rag_usage").add(payload)
    except Exception as exc:
        logger.warning("rag_usage logging skipped: %s", exc)


class RagLessonRequest(BaseModel):
    topic: str
    subject: str
    quarter: int
    lessonTitle: Optional[str] = None
    learningCompetency: Optional[str] = None
    moduleUnit: Optional[str] = None
    learnerLevel: Optional[str] = None
    userId: Optional[str] = None


class RagProblemRequest(BaseModel):
    topic: str
    subject: str
    quarter: int
    difficulty: str = Field(default="medium")
    userId: Optional[str] = None


class RagAnalysisContextRequest(BaseModel):
    weakTopics: List[str]
    subject: str
    userId: Optional[str] = None


@router.get("/health")
async def rag_health():
    try:
        health = get_vectorstore_health()
        return {
            "status": "ok",
            "chunkCount": health["chunkCount"],
            "subjects": health["subjects"],
            "lastIngested": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as exc:
        return {
            "status": "degraded",
            "chunkCount": 0,
            "subjects": {},
            "lastIngested": None,
            "warning": str(exc),
        }


@router.post("/lesson")
async def rag_lesson(request: Request, payload: RagLessonRequest):
    retrieval_query = build_lesson_query(
        payload.topic,
        payload.subject,
        payload.quarter,
        lesson_title=payload.lessonTitle,
        competency=payload.learningCompetency,
        module_unit=payload.moduleUnit,
        learner_level=payload.learnerLevel,
    )
    chunks = retrieve_curriculum_context(
        query=retrieval_query,
        subject=payload.subject,
        quarter=payload.quarter,
        top_k=5,
    )
    prompt = build_lesson_prompt(
        lesson_title=payload.lessonTitle or payload.topic,
        competency=payload.learningCompetency or payload.topic,
        grade_level="Grade 11-12",
        subject=payload.subject,
        quarter=payload.quarter,
        learner_level=payload.learnerLevel,
        module_unit=payload.moduleUnit,
        curriculum_chunks=chunks,
    )
    explanation = await _generate_text(prompt, task_type="lesson_generation")
    retrieval_summary = summarize_retrieval_confidence(chunks)

    _log_rag_usage(
        request,
        event_type="lesson",
        topic=retrieval_query,
        subject=payload.subject,
        quarter=payload.quarter,
        chunks=chunks,
    )

    return {
        "explanation": explanation,
        "retrievalConfidence": retrieval_summary.get("confidence", 0.0),
        "retrievalBand": retrieval_summary.get("band", "low"),
        "retrievalQuery": retrieval_query,
        "needsReview": retrieval_summary.get("band", "low") == "low",
        "sources": [
            {
                "subject": row.get("subject"),
                "quarter": row.get("quarter"),
                "source_file": row.get("source_file"),
                "page": row.get("page"),
                "score": row.get("score"),
                "content": row.get("content"),
                "content_domain": row.get("content_domain"),
                "chunk_type": row.get("chunk_type"),
            }
            for row in chunks
        ],
    }


@router.post("/generate-problem")
async def rag_generate_problem(request: Request, payload: RagProblemRequest):
    chunks = retrieve_curriculum_context(
        query=payload.topic,
        subject=payload.subject,
        quarter=payload.quarter,
        top_k=5,
    )
    prompt = build_problem_generation_prompt(payload.topic, payload.difficulty, chunks)
    raw = await _generate_text(prompt, task_type="quiz_generation")

    parsed: Dict[str, Any] = {}
    cleaned = raw.strip()
    if "{" in cleaned and "}" in cleaned:
        try:
            start = cleaned.find("{")
            end = cleaned.rfind("}") + 1
            parsed = json.loads(cleaned[start:end])
        except Exception:
            parsed = {}

    problem = str(parsed.get("problem") or raw)
    solution = str(parsed.get("solution") or "")
    competency_ref = str(parsed.get("competencyReference") or "DepEd competency-aligned")

    _log_rag_usage(
        request,
        event_type="problem_generation",
        topic=payload.topic,
        subject=payload.subject,
        quarter=payload.quarter,
        chunks=chunks,
    )

    return {
        "problem": problem,
        "solution": solution,
        "competencyReference": competency_ref,
        "sources": [
            {
                "subject": row.get("subject"),
                "quarter": row.get("quarter"),
                "source_file": row.get("source_file"),
                "page": row.get("page"),
                "score": row.get("score"),
            }
            for row in chunks
        ],
    }


@router.post("/analysis-context")
async def rag_analysis_context(request: Request, payload: RagAnalysisContextRequest):
    if not payload.weakTopics:
        raise HTTPException(status_code=400, detail="weakTopics must be a non-empty list")

    chunks = build_analysis_curriculum_context(payload.weakTopics, payload.subject)
    lines = ["LEARNING COMPETENCIES:"]
    for index, row in enumerate(chunks, start=1):
        lines.append(
            f"{index}. {row.get('content')} (Source: {row.get('source_file')} p.{row.get('page')}, "
            f"Q{row.get('quarter')}, {row.get('content_domain')})"
        )

    _log_rag_usage(
        request,
        event_type="analysis_context",
        topic=", ".join(payload.weakTopics),
        subject=payload.subject,
        quarter=None,
        chunks=chunks,
    )

    return {"curriculumContext": "\n".join(lines)}
