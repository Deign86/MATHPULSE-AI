from __future__ import annotations

import asyncio
import json
import logging
import os
import re
from datetime import datetime, timezone
from threading import Lock
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from services.inference_client import (
    InferenceRequest,
    create_default_client,
    is_sequential_model,
    get_model_for_task,
)
from rag.curriculum_rag import (
    build_analysis_curriculum_context,
    build_lesson_prompt,
    build_lesson_query,
    build_problem_generation_prompt,
    format_retrieved_chunks,
    retrieve_curriculum_context,
    retrieve_lesson_pdf_context,
    summarize_retrieval_confidence,
)
from rag.firebase_storage_loader import get_study_materials_from_chunks
from rag.vectorstore_loader import get_vectorstore_health, reset_vectorstore_singleton

try:
    from firebase_admin import firestore as firebase_firestore
except Exception:
    firebase_firestore = None

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


async def _generate_text(
    prompt: str,
    task_type: str,
    max_new_tokens: int = 900,
    enable_thinking: bool = False,
) -> str:
    request = InferenceRequest(
        messages=[
            {"role": "system", "content": "You are a precise DepEd-aligned curriculum assistant."},
            {"role": "user", "content": prompt},
        ],
        task_type=task_type,
        max_new_tokens=max_new_tokens,
        temperature=0.2,
        top_p=0.9,
        enable_thinking=enable_thinking,
    )
    return _get_inference_client().generate_from_messages(request)


_FLASHCARD_SYSTEM_PROMPT = """You are an educational flashcard generator for Filipino high school mathematics students (DepEd K-12 curriculum).
Given a lesson text, generate exactly 10 flashcards in JSON format.
Each flashcard has:
- "front": a concise question, term, or problem prompt (max 20 words)
- "back": the answer, definition, or solution (max 40 words)
- "difficulty": one of "easy", "medium", or "hard"

Distribute difficulty: 3 easy, 4 medium, 3 hard.
Focus on key concepts, formulas, definitions, and problem-solving steps from the lesson.
Return ONLY a valid JSON array. No markdown, no explanation."""


async def _generate_flashcards(lesson_text: str, topic: str) -> List[dict]:
    """Generate 10 flashcards from lesson content using DeepSeek AI."""
    user_message = f"Topic: {topic}\n\nLesson content:\n{lesson_text}"
    request = InferenceRequest(
        messages=[
            {"role": "system", "content": _FLASHCARD_SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        task_type="flashcard_generation",
        max_new_tokens=800,
        temperature=0.3,
    )
    try:
        raw_response = await asyncio.to_thread(
            _get_inference_client().generate_from_messages, request
        )
        # Strip markdown fences if present
        cleaned = raw_response.strip()
        if cleaned.startswith("```"):
            lines = cleaned.splitlines()
            cleaned = "".join(lines[1:-1])
        parsed = json.loads(cleaned)
        if not isinstance(parsed, list):
            logger.warning("Flashcard response was not a list")
            return []
        validated = []
        for card in parsed:
            if isinstance(card, dict) and all(k in card for k in ("front", "back", "difficulty")):
                validated.append({
                    "front": str(card.get("front", "")),
                    "back": str(card.get("back", "")),
                    "difficulty": str(card.get("difficulty", "medium")),
                })
        return validated
    except Exception as exc:
        logger.warning("Flashcard generation failed: %s", exc)
        return []


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


def _get_cached_generated_assets(lesson_id: str, topic_slug: str) -> Optional[dict]:
    """Return cached study_materials + flashcards if they exist and are fresh (≤7 days)."""
    if firebase_firestore is None:
        return None
    try:
        doc_ref = firebase_firestore.client().collection("lessons").document(lesson_id).collection("generated_assets").document(topic_slug)
        doc = doc_ref.get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        generated_at = data.get("generated_at")
        if generated_at is None:
            return None
        # Firestore.Timestamp → datetime comparison
        try:
            ts = generated_at.replace(tzinfo=datetime.now(timezone.utc).tzinfo) if hasattr(generated_at, "replace") else None
        except Exception:
            ts = None
        if ts is None:
            # Fallback: assume fresh if we can't parse
            return {"study_materials": data.get("study_materials"), "flashcards": data.get("flashcards")}
        age_seconds = (datetime.now(timezone.utc) - ts).total_seconds()
        if age_seconds > 604800:  # 7 days
            return None
        return {"study_materials": data.get("study_materials"), "flashcards": data.get("flashcards")}
    except Exception as exc:
        logger.warning("cached_generated_assets lookup skipped: %s", exc)
        return None


def _save_generated_assets(lesson_id: str, topic_slug: str, study_materials: list, flashcards: list) -> None:
    """Persist study_materials + flashcards to Firestore for future reuse."""
    if firebase_firestore is None:
        return
    try:
        doc_ref = firebase_firestore.client().collection("lessons").document(lesson_id).collection("generated_assets").document(topic_slug)
        doc_ref.set({
            "study_materials": study_materials,
            "flashcards": flashcards,
            "generated_at": firebase_firestore.SERVER_TIMESTAMP,
        })
    except Exception as exc:
        logger.warning("cached_generated_assets save skipped: %s", exc)


def _strip_thinking_and_parse(text: str) -> dict:
    cleaned = text.strip()
    cleaned = re.sub(r" </think>", "", cleaned, flags=re.DOTALL).strip()
    if "{" in cleaned and "}" in cleaned:
        try:
            start = cleaned.find("{")
            end = cleaned.rfind("}") + 1
            parsed = json.loads(cleaned[start:end])
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass
    return {"explanation": text}


class RagLessonRequest(BaseModel):
    topic: str
    subject: str
    quarter: int
    lessonTitle: Optional[str] = None
    learningCompetency: Optional[str] = None
    moduleUnit: Optional[str] = None
    learnerLevel: Optional[str] = None
    userId: Optional[str] = None
    moduleId: Optional[str] = None
    lessonId: Optional[str] = None
    competencyCode: Optional[str] = None
    storagePath: Optional[str] = None


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
    active_model = get_model_for_task("rag_lesson")
    is_seq = is_sequential_model(active_model)
    try:
        health = get_vectorstore_health()
        return {
            "status": "ok",
            "chunkCount": health["chunkCount"],
            "subjects": health["subjects"],
            "lastIngested": datetime.now(timezone.utc).isoformat(),
            "activeModel": active_model,
            "isSequentialModel": is_seq,
        }
    except Exception as exc:
        return {
            "status": "degraded",
            "chunkCount": 0,
            "subjects": {},
            "lastIngested": None,
            "activeModel": active_model,
            "isSequentialModel": is_seq,
            "warning": str(exc),
        }


def _fetch_youtube_videos(
    lesson_title: str,
    subject: str,
    competency: str,
    quarter: int,
    lesson_id: Optional[str] = None,
) -> List[Dict]:
    """Fetch up to 3 relevant YouTube videos for a lesson."""
    try:
        from services.youtube_service import get_video_search_results
    except ImportError:
        return []
    try:
        result = get_video_search_results(
            topic=lesson_title,
            subject=subject,
            lesson_context=competency,
            grade_level=f"Grade {quarter + 10}",
            lesson_id=lesson_id,
            max_results=3,
        )
        return result.get("videos", [])
    except Exception as e:
        logger.warning("YouTube video search failed: %s", e)
        return []


def _ensure_7_sections(lesson_data: dict, lesson_title: str) -> dict:
    sections = lesson_data.get("sections", [])
    section_types = {s.get("type") for s in sections}
    required = ["introduction", "key_concepts", "video", "worked_examples", "important_notes", "try_it_yourself", "summary"]

    default_content = {
        "introduction": {"type": "introduction", "title": "Introduction", "content": f"Welcome to the lesson on {lesson_title}. This topic builds foundational skills for your mathematics journey."},
        "key_concepts": {"type": "key_concepts", "title": "Key Concepts", "content": f"The following key concepts are essential for mastering {lesson_title}:", "callouts": [{"type": "important", "text": "Review the curriculum PDF for detailed explanations of each concept."}]},
        "video": {"type": "video", "title": "Video Lesson", "content": "Watch the video explanation below to understand the concepts visually.", "videoId": "", "videoTitle": "", "videoChannel": "", "embedUrl": "", "thumbnailUrl": ""},
        "worked_examples": {"type": "worked_examples", "title": "Worked Examples", "examples": [{"problem": f"Sample problem for {lesson_title}", "steps": ["Step 1: Identify the given information.", "Step 2: Apply the appropriate formula or method.", "Step 3: Solve step-by-step.", "Step 4: Verify your answer."], "answer": "Solution will vary based on specific problem parameters."}]},
        "important_notes": {"type": "important_notes", "title": "Important Notes", "bulletPoints": [f"Always read problems carefully before solving {lesson_title} questions.", "Check your units and ensure consistency throughout calculations.", "Practice regularly to build fluency with these concepts."]},
        "try_it_yourself": {"type": "try_it_yourself", "title": "Try It Yourself", "practiceProblems": [{"question": f"Practice applying {lesson_title} concepts. Solve a similar problem from your textbook or worksheets.", "solution": "Compare your solution with the worked examples above. If stuck, re-read the key concepts section or ask your teacher for guidance."}]},
        "summary": {"type": "summary", "title": "Summary", "content": f"In this lesson on {lesson_title}, you explored key concepts, worked through examples, and practiced problem-solving techniques. Continue reviewing these materials and seek additional practice to strengthen your understanding."},
    }

    def _is_section_blank(section: dict, s_type: str) -> bool:
        """Check if a section has effectively no content."""
        if not section:
            return True
        text_content = (section.get("content") or "").strip()
        if s_type in ("introduction", "key_concepts", "video", "summary"):
            return len(text_content) < 10
        if s_type == "worked_examples":
            examples = section.get("examples") or []
            return not examples or all(not (ex.get("problem") or "").strip() for ex in examples)
        if s_type == "important_notes":
            bullets = section.get("bulletPoints") or []
            return not bullets or all(not (b or "").strip() for b in bullets)
        if s_type == "try_it_yourself":
            problems = section.get("practiceProblems") or []
            return not problems or all(not (p.get("question") or "").strip() for p in problems)
        return False

    filled = {}
    for req_type in required:
        for existing in sections:
            if existing.get("type") == req_type:
                filled[req_type] = existing
                break
        else:
            filled[req_type] = default_content[req_type]

    # Validate and replace blank sections with defaults
    for req_type in required:
        if _is_section_blank(filled[req_type], req_type):
            filled[req_type] = default_content[req_type]

    ordered = [filled[t] for t in required]

    for i, section in enumerate(ordered):
        s_type = section.get("type")
        if s_type == "key_concepts" and not section.get("callouts"):
            section["callouts"] = []
        if s_type == "worked_examples" and not section.get("examples"):
            section["examples"] = []
        if s_type == "important_notes" and not section.get("bulletPoints"):
            section["bulletPoints"] = []
        if s_type == "try_it_yourself" and not section.get("practiceProblems"):
            section["practiceProblems"] = []
        ordered[i] = section

    return {**lesson_data, "sections": ordered}


@router.post("/lesson")
async def rag_lesson(request: Request, payload: RagLessonRequest):
    # ── Step 0: Check Firestore cache ────────────────────────────────────────
    topic_slug = f"{payload.subject}_{payload.quarter}_{payload.topic}"
    cached_assets = _get_cached_generated_assets(payload.lessonId or payload.topic, topic_slug)
    if cached_assets:
        logger.info("Cache hit for generated_assets: lesson_id=%s, topic_slug=%s", payload.lessonId or payload.topic, topic_slug)

    # ── Step 1: Retrieve curriculum chunks ───────────────────────────────────
    try:
        chunks, retrieval_mode = retrieve_lesson_pdf_context(
            topic=build_lesson_query(
                payload.topic,
                payload.subject,
                payload.quarter,
                lesson_title=payload.lessonTitle,
                competency=payload.learningCompetency,
                module_unit=payload.moduleUnit,
                learner_level=payload.learnerLevel,
            ),
            subject=payload.subject,
            quarter=payload.quarter,
            lesson_title=payload.lessonTitle,
            competency=payload.learningCompetency,
            module_id=payload.moduleId,
            lesson_id=payload.lessonId,
            competency_code=payload.competencyCode,
            storage_path=payload.storagePath,
            top_k=8,
        )
    except Exception as exc:
        import traceback
        logger.error(f"RAG retrieval error: {type(exc).__name__}: {exc}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=503,
            detail={
                "error": "retrieval_failed",
                "message": f"Curriculum retrieval failed: {exc}",
                "type": type(exc).__name__,
            },
        )

    if not chunks:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "no_curriculum_context",
                "message": f"No curriculum content found for lesson '{payload.lessonTitle}' ({payload.subject} Q{payload.quarter}). Please ensure the PDF has been ingested.",
                "retrievalBand": "low",
                "sources": [],
            },
        )

    # Extract study materials from retrieved chunks
    study_materials = get_study_materials_from_chunks(chunks)

    # ── Step 2: Build prompt ─────────────────────────────────────────────────
    try:
        prompt = build_lesson_prompt(
            lesson_title=payload.lessonTitle or payload.topic,
            competency=payload.learningCompetency or payload.topic,
            grade_level="Grade 11-12",
            subject=payload.subject,
            quarter=payload.quarter,
            learner_level=payload.learnerLevel,
            module_unit=payload.moduleUnit,
            curriculum_chunks=chunks,
            competency_code=payload.competencyCode,
        )
    except Exception as exc:
        logger.error(f"RAG prompt build error: {type(exc).__name__}: {exc}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "prompt_build_failed",
                "message": f"Failed to build lesson prompt: {exc}",
                "type": type(exc).__name__,
            },
        )

    # ── Step 3: AI inference ─────────────────────────────────────────────────
    try:
        raw_explanation = await _generate_text(
            prompt,
            task_type="rag_lesson",
            max_new_tokens=1800,
            enable_thinking=True,
        )
    except Exception as exc:
        logger.error(f"RAG inference error: {type(exc).__name__}: {exc}")
        raise HTTPException(
            status_code=502,
            detail={
                "error": "inference_failed",
                "message": f"AI model call failed: {exc}",
                "type": type(exc).__name__,
            },
        )

    # ── Step 4: Parse & validate response ────────────────────────────────────
    try:
        parsed_lesson = _strip_thinking_and_parse(raw_explanation)
        parsed_lesson = _ensure_7_sections(parsed_lesson, payload.lessonTitle or payload.topic)
    except Exception as exc:
        logger.error(f"RAG parse error: {type(exc).__name__}: {exc}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "parse_failed",
                "message": f"Failed to parse AI response: {exc}",
                "type": type(exc).__name__,
            },
        )

    # ── Step 5: Enrich with videos + generate flashcards concurrently ────────
    flashcards = []
    if parsed_lesson.get("sections"):
        video_section = next((s for s in parsed_lesson["sections"] if s.get("type") == "video"), None)
        if video_section:
            try:
                # Run video fetch and flashcard generation concurrently
                video_task = asyncio.to_thread(
                    _fetch_youtube_videos,
                    payload.lessonTitle or payload.topic,
                    payload.subject,
                    payload.learningCompetency or "",
                    payload.quarter,
                    payload.lessonId,
                )
                flashcard_task = _generate_flashcards(
                    json.dumps(parsed_lesson),
                    payload.lessonTitle or payload.topic,
                )
                videos, flashcards = await asyncio.gather(video_task, flashcard_task)
                if videos:
                    # Primary video for backwards compatibility
                    primary = videos[0]
                    video_section["videoId"] = primary.get("videoId", "")
                    video_section["videoTitle"] = primary.get("title", "")
                    video_section["videoChannel"] = primary.get("channelTitle", "")
                    video_section["embedUrl"] = f"https://www.youtube.com/embed/{primary.get('videoId', '')}"
                    video_section["thumbnailUrl"] = primary.get("thumbnailUrl", "")
                    # New: full videos array for Smart Video Integration
                    video_section["videos"] = videos
            except Exception as exc:
                logger.warning("YouTube/flashcard enrichment skipped: %s", exc)

    # ── Step 6: Assemble response ────────────────────────────────────────────
    retrieval_summary = summarize_retrieval_confidence(chunks)

    try:
        _log_rag_usage(
            request,
            event_type="lesson",
            topic=build_lesson_query(payload.topic, payload.subject, payload.quarter, lesson_title=payload.lessonTitle),
            subject=payload.subject,
            quarter=payload.quarter,
            chunks=chunks,
        )
    except Exception as exc:
        logger.warning("RAG usage logging skipped: %s", exc)

    needs_review = parsed_lesson.get("needsReview", False)
    if retrieval_summary.get("band") == "low":
        needs_review = True

    # Use cached assets if available, otherwise save newly generated ones
    if cached_assets:
        study_materials = cached_assets.get("study_materials") or study_materials
        flashcards = cached_assets.get("flashcards") or flashcards
    else:
        try:
            _save_generated_assets(
                payload.lessonId or payload.topic,
                topic_slug,
                study_materials,
                flashcards,
            )
        except Exception as exc:
            logger.warning("Generated assets cache save skipped: %s", exc)

    return {
        **parsed_lesson,
        "retrievalConfidence": retrieval_summary.get("confidence", 0.0),
        "retrievalBand": retrieval_summary.get("band", "low"),
        "retrievalMode": retrieval_mode,
        "needsReview": needs_review,
        "sources": [
            {
                "subject": row.get("subject"),
                "quarter": row.get("quarter"),
                "source_file": row.get("source_file"),
                "storage_path": row.get("storage_path"),
                "page": row.get("page"),
                "score": row.get("score"),
                "content_domain": row.get("content_domain"),
                "chunk_type": row.get("chunk_type"),
                "content": row.get("content"),
            }
            for row in chunks
        ],
        "activeModel": get_model_for_task("rag_lesson"),
        "study_materials": study_materials,
        "flashcards": flashcards,
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
    raw = await _generate_text(
        prompt,
        task_type="quiz_generation",
        max_new_tokens=600,
        enable_thinking=False,
    )

    parsed = _strip_thinking_and_parse(raw)

    problem = str(parsed.get("problem") or raw)
    if not problem or problem.startswith("{"):
        problem = str(parsed.get("content") or str(parsed))
    if len(problem) < 3 or problem.startswith("{"):
        problem = raw
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