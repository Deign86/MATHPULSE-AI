from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import re
import threading
import time
from collections import OrderedDict
from datetime import datetime, timezone
from threading import Lock
from typing import Any, AsyncIterator, Callable, Dict, List, Optional, Set, Tuple

import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, field_validator

from services.ai_client import CHAT_MODEL, get_deepseek_client
from services.llm_json import extract_json_object
from services.jev_client import verify_lesson_factuality

from services.inference_client import (
    InferenceRequest,
    InferenceAuthError,
    InferenceConnectionError,
    create_default_client,
    is_sequential_model,
    get_current_runtime_config,
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
from rag.vectorstore_loader import get_vectorstore_health, reset_vectorstore_singleton, get_vectorstore_components

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


def _lesson_primary_model() -> str:
    """Model for rag_lesson generation.

    An explicit RAG model (HF_RAG_MODEL_ID via admin override, MODEL_PROFILE or env) wins: the prod profile
    also exports INFERENCE_MODEL_ID=deepseek-flash, which overrides every task in the inference client's map.
    With no RAG model configured, fall back to the client's task map (config/models.yaml → deepseek-v4-pro),
    since get_model_for_task() would otherwise resolve to deepseek-flash.
    """
    if get_current_runtime_config()["resolved"].get("HF_RAG_MODEL_ID"):
        return get_model_for_task("rag_lesson")
    model, _ = _get_inference_client()._resolve_primary_model(InferenceRequest(messages=[], task_type="rag_lesson"))
    return model


def _curriculum_messages(prompt: str) -> List[Dict[str, str]]:
    return [
        {"role": "system", "content": "You are a precise DepEd-aligned curriculum assistant."},
        {"role": "user", "content": prompt},
    ]


async def _generate_text(
    prompt: str,
    task_type: str,
    max_new_tokens: int = 900,
    enable_thinking: bool = False,
    model: Optional[str] = None,
    timeout_sec: Optional[int] = None,
    max_retries: Optional[int] = None,
) -> str:
    request = InferenceRequest(
        messages=_curriculum_messages(prompt),
        model=model,
        task_type=task_type,
        max_new_tokens=max_new_tokens,
        temperature=0.2,
        top_p=0.9,
        timeout_sec=timeout_sec,
        enable_thinking=enable_thinking,
        max_retries=max_retries,
    )
    # The inference client is synchronous; keep its network call off the event loop.
    return await asyncio.to_thread(_get_inference_client().generate_from_messages, request)


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


def _strip_thinking_and_parse(text: str) -> dict:
    parsed = extract_json_object(text)
    if parsed is not None:
        return parsed
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
    forceRefresh: bool = False

    @field_validator("quarter", mode="before")
    @classmethod
    def _coerce_quarter(cls, value: Any) -> Any:
        # Grade-11-only: lessons may carry quarter as "Q1" string; RAG needs int 1-4.
        if isinstance(value, int) and not isinstance(value, bool):
            coerced = value
        else:
            match = re.fullmatch(r"\s*(?:Q(?:uarter)?\s*)?([1-4])\s*", str(value or ""), re.IGNORECASE)
            if not match:
                raise ValueError("quarter must be 1-4 (accepts 'Q1'-style strings)")
            coerced = int(match.group(1))
        if not 1 <= coerced <= 4:
            raise ValueError("quarter must be 1-4 (accepts 'Q1'-style strings)")
        return coerced


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
    active_model = _lesson_primary_model()
    is_seq = is_sequential_model(active_model)
    try:
        health = await asyncio.to_thread(get_vectorstore_health)
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


def _build_grounded_defaults(lesson_title: str, chunks: Optional[List[Dict[str, Any]]] = None) -> dict:
    chunk_texts = [str(c.get("content") or "").strip() for c in (chunks or []) if str(c.get("content") or "").strip()]

    if chunk_texts:
        primary = chunk_texts[0]
        intro_context = f"This lesson explores {lesson_title} grounded in the DepEd Senior High School curriculum. {primary[:220]}..."

        bullet_points = []
        for c in chunk_texts[:4]:
            lines = [l.strip() for l in c.split("\n") if len(l.strip()) > 20]
            if lines:
                bullet_points.append(lines[0][:180])

        if bullet_points:
            concepts_body = f"Key definitions and operational principles for {lesson_title}:\n\n" + "\n\n".join(f"• {bp}" for bp in bullet_points)
        else:
            concepts_body = f"Fundamental concepts for {lesson_title}:\n\n{primary[:350]}"

        callout_text = "Define variables explicitly and verify constraints when formulating mathematical and financial relations."
    else:
        intro_context = f"Welcome to the lesson on {lesson_title}. This topic builds foundational mathematical understanding."
        concepts_body = (
            f"The following key concepts are essential for mastering {lesson_title}:\n\n"
            f"• Clearly identify the unknown quantities and assign meaningful variables.\n"
            f"• Translate verbal transactions and scenarios into mathematical equations.\n"
            f"• Apply systematic algebraic operations to evaluate and interpret models."
        )
        callout_text = "Always define variables and check domain constraints before solving mathematical models."

    return {
        "introduction": {"type": "introduction", "title": "Introduction", "content": intro_context},
        "key_concepts": {
            "type": "key_concepts",
            "title": "Key Concepts",
            "content": concepts_body,
            "callouts": [{"type": "important", "text": callout_text}],
        },
        "video": {"type": "video", "title": "Video Lesson", "content": "Watch the video explanation below to understand the concepts visually.", "videoId": "", "videoTitle": "", "videoChannel": "", "embedUrl": "", "thumbnailUrl": ""},
        "worked_examples": {
            "type": "worked_examples",
            "title": "Worked Examples",
            "examples": [{
                "problem": f"Sample problem applying {lesson_title}",
                "steps": [
                    "Step 1: Identify given parameters and represent unknown quantities with variables.",
                    "Step 2: Construct the governing equation or algebraic model.",
                    "Step 3: Solve algebraically step-by-step for the required unknown.",
                    "Step 4: Check that the result satisfies all problem constraints and state the conclusion.",
                ],
                "answer": "Follow structured algebraic steps to evaluate and verify results.",
            }],
        },
        "important_notes": {
            "type": "important_notes",
            "title": "Important Notes",
            "bulletPoints": [
                f"Verify units and constraints carefully throughout calculations for {lesson_title}.",
                "Check for extraneous roots or invalid values outside the practical domain.",
                "Practice regular word-problem translations to build mathematical fluency.",
            ],
        },
        "try_it_yourself": {
            "type": "try_it_yourself",
            "title": "Try It Yourself",
            "practiceProblems": [{
                "question": f"Formulate and solve a real-world scenario applying {lesson_title}.",
                "solution": "Set up variables, formulate the equation, solve for the unknown, and interpret the outcome in context.",
            }],
        },
        "summary": {
            "type": "summary",
            "title": "Summary",
            "content": f"In this lesson on {lesson_title}, you explored foundational definitions, worked through algebraic models, and reviewed practical interpretations. Proceed to the practice quiz to solidify your mastery.",
        },
    }


def _ensure_7_sections(lesson_data: dict, lesson_title: str, chunks: Optional[List[Dict[str, Any]]] = None) -> dict:
    sections = lesson_data.get("sections", [])
    section_types = {s.get("type") for s in sections}
    required = ["introduction", "key_concepts", "video", "worked_examples", "important_notes", "try_it_yourself", "summary"]

    default_content = _build_grounded_defaults(lesson_title, chunks=chunks)

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


# ─── Lesson pipeline: per-student cache, in-flight dedupe, streamed generation ─

# Bump when build_lesson_prompt or the richness rules change: new keys -> lessons regenerate on next open.
LESSON_PROMPT_VERSION = "2026-10-v2"
_LESSON_MEMORY_MAX_ENTRIES = 256
_RETRIEVAL_MEMORY_MAX_ENTRIES = 256
_LESSON_GENERATION_CAP_SEC = 300.0
_LESSON_VIDEO_CAP_SEC = 20.0
_LEARNER_PROFILE_CAP_SEC = 4.0
_LEARNER_PROFILE_MAX_CHARS = 1500
_LESSON_PROGRESS_INTERVAL_SEC = 1.0
_LESSON_PING_INTERVAL_SEC = 15.0
_REASONER_LESSON_MAX_TOKENS = 32768
# The lesson is rewritten from retrieved curriculum text, so deep reasoning adds little; DeepSeek's default
# "high" effort took 61-221 s per lesson. Override with RAG_LESSON_REASONING_EFFORT=high|max if quality needs it.
_REASONER_LESSON_EFFORT = os.getenv("RAG_LESSON_REASONING_EFFORT", "low").strip().lower()
if _REASONER_LESSON_EFFORT not in {"low", "high", "max"}:
    _REASONER_LESSON_EFFORT = "low"
_REASONER_STREAM_TIMEOUT = httpx.Timeout(connect=10.0, read=60.0, write=30.0, pool=10.0)
_STUDENT_LESSONS_COLLECTION = "studentLessons"
GENERIC_LEARNER_PROFILE = (
    "Grade 11 Senior High School STEM student (DepEd). No individual learning data is available: "
    "pitch the lesson at a typical Grade 11 level and include brief prerequisite refreshers."
)

# Memory LRU in front of Firestore, keyed by (uid, lesson key). Only verified primary-model lessons land here.
_lesson_memory: "OrderedDict[Tuple[str, str], Dict[str, Any]]" = OrderedDict()
# Retrieval is per lesson (not per student), so it is shared across students.
_retrieval_memory: "OrderedDict[str, Tuple[List[Dict[str, Any]], str]]" = OrderedDict()
_background_tasks: Set[asyncio.Task] = set()

LessonEmit = Callable[[str, Dict[str, Any]], None]


def _spawn_background(coro: Any) -> asyncio.Task:
    """Run a task that outlives the request that started it (client disconnects must not cancel it)."""
    task = asyncio.create_task(coro)
    _background_tasks.add(task)

    def _finished(done: asyncio.Task) -> None:
        _background_tasks.discard(done)
        if not done.cancelled():
            done.exception()  # mark retrieved; waiters handle the error themselves

    task.add_done_callback(_finished)
    return task


def _remember(store: OrderedDict, key: Any, value: Any, max_entries: int) -> None:
    store[key] = value
    store.move_to_end(key)
    while len(store) > max_entries:
        store.popitem(last=False)


class _LessonJob:
    """One in-flight lesson generation shared by every identical concurrent request of one student."""

    def __init__(self) -> None:
        self.listeners: List[asyncio.Queue] = []
        self.last_stage: Optional[str] = None
        self.task: Optional[asyncio.Task] = None

    def emit(self, event: str, payload: Dict[str, Any]) -> None:
        if event == "stage":
            self.last_stage = payload["stage"]
        for queue in list(self.listeners):
            queue.put_nowait((event, payload))


_lesson_jobs: Dict[Tuple[str, str, bool], _LessonJob] = {}


def _lesson_cache_key(payload: RagLessonRequest) -> str:
    canonical = json.dumps(
        {**payload.model_dump(exclude={"userId", "forceRefresh"}), "promptVersion": LESSON_PROMPT_VERSION},
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _authenticated_uid(request: Request) -> str:
    """The uid set by main.py AuthMiddleware; never payload.userId (client-controlled). Empty when anonymous."""
    user = getattr(request.state, "user", None)
    return str(getattr(user, "uid", "") or "")


def _firestore_db() -> Any:
    if firebase_firestore is None:
        return None
    return firebase_firestore.client()


def _read_student_lesson(uid: str, key: str) -> Optional[Dict[str, Any]]:
    try:
        db = _firestore_db()
        if db is None:
            return None
        snapshot = db.collection(_STUDENT_LESSONS_COLLECTION).document(uid).collection("lessons").document(key).get()
        if not snapshot.exists:
            return None
        return json.loads((snapshot.to_dict() or {})["lessonJson"])
    except Exception as exc:
        logger.warning("studentLessons read skipped: %s", exc)
        return None


def _write_student_lesson(uid: str, key: str, payload: RagLessonRequest, lesson: Dict[str, Any], profile_summary: str) -> None:
    try:
        db = _firestore_db()
        if db is None:
            return
        db.collection(_STUDENT_LESSONS_COLLECTION).document(uid).collection("lessons").document(key).set({
            # A JSON string sidesteps Firestore's nested-array limits.
            "lessonJson": json.dumps(lesson, ensure_ascii=False),
            "promptVersion": LESSON_PROMPT_VERSION,
            "model": lesson.get("activeModel"),
            "subject": payload.subject,
            "quarter": payload.quarter,
            "lessonId": payload.lessonId,
            "lessonTitle": payload.lessonTitle or payload.topic,
            "uid": uid,
            "profileSummary": profile_summary[:500],
            "createdAt": firebase_firestore.SERVER_TIMESTAMP,
        })
    except Exception as exc:
        logger.warning("studentLessons write skipped: %s", exc)


def _load_learner_profile(uid: str, payload: RagLessonRequest) -> str:
    """Compact learner profile from existing student data (users doc, tutor memory, topic progress). No PII."""
    lines: List[str] = []
    db = _firestore_db()
    user_doc = db.collection("users").document(uid).get() if db is not None else None
    user = (user_doc.to_dict() or {}) if user_doc is not None and user_doc.exists else {}
    if user.get("grade") or user.get("track"):
        lines.append(f"Grade/strand: {user.get('grade') or 'Grade 11'} {user.get('track') or ''}".strip())
    if user.get("iarAssessmentState"):
        lines.append(f"Initial assessment: {user['iarAssessmentState']}, starting quarter {user.get('startingQuarterG11') or 'n/a'}")
    if user.get("iarTopicClassifications"):
        lines.append("Assessment topic placement: " + ", ".join(f"{topic}={level}" for topic, level in user["iarTopicClassifications"].items()))
    if user.get("topicScores"):
        lines.append("Assessment topic scores (%): " + ", ".join(f"{topic}={score}" for topic, score in user["topicScores"].items()))
    assessment = user.get("assessmentResults") or {}
    if assessment.get("weakTopics"):
        lines.append("Weak topics: " + ", ".join(map(str, assessment["weakTopics"][:6])))
    if assessment.get("strongTopics"):
        lines.append("Strong topics: " + ", ".join(map(str, assessment["strongTopics"][:6])))
    if user.get("recommendedPace") or user.get("overallRisk"):
        lines.append(f"Pace: {user.get('recommendedPace') or 'normal'}; overall risk: {user.get('overallRisk') or 'unknown'}")
    if payload.subject in (user.get("atRiskSubjects") or []):
        lines.append(f"Flagged at risk in {payload.subject}")
    if user.get("riskFlags"):
        lines.append("Risk flags: " + ", ".join(map(str, user["riskFlags"][:4])))

    if db is not None and payload.lessonId:
        progress_doc = db.collection("studentProgress").document(uid).collection("topics").document(payload.lessonId).get()
        if progress_doc.exists:
            progress = progress_doc.to_dict() or {}
            lines.append(f"This lesson: mastery {progress.get('mastery_level') or 'unknown'}, best quiz score {progress.get('best_score', 'n/a')}")

    from services.memory_service import load_profile

    tutor = load_profile(uid)
    if tutor is not None:
        if tutor.weak_topics:
            lines.append("Tutor-observed weak topics: " + ", ".join(tutor.weak_topics[:5]))
        if tutor.recurring_mistakes:
            lines.append("Recurring mistakes: " + "; ".join(tutor.recurring_mistakes[-3:]))
        if tutor.explanation_depth and tutor.explanation_depth != "auto":
            lines.append(f"Prefers {tutor.explanation_depth} explanations")
    return "\n".join(lines)[:_LEARNER_PROFILE_MAX_CHARS]


async def _learner_profile_for(uid: str, payload: RagLessonRequest) -> Tuple[str, bool]:
    """(profile text, personalized). Fail-open to the generic Grade 11 STEM profile."""
    if not uid:
        return GENERIC_LEARNER_PROFILE, False
    try:
        profile = await asyncio.wait_for(asyncio.to_thread(_load_learner_profile, uid, payload), timeout=_LEARNER_PROFILE_CAP_SEC)
    except Exception as exc:
        logger.warning("Learner profile unavailable (%s); using generic profile", str(exc) or type(exc).__name__)
        return GENERIC_LEARNER_PROFILE, False
    if not profile.strip():
        return GENERIC_LEARNER_PROFILE, False
    return profile, True


# Minimum richness for an accepted lesson (see build_lesson_prompt for what is requested).
_MIN_INTRO_CHARS = 400
_MIN_KEY_CONCEPTS_CHARS = 600
_MIN_WORKED_EXAMPLES = 3
_MIN_EXAMPLE_STEPS = 3
_MIN_NOTES = 4
_MIN_PRACTICE_PROBLEMS = 5
_MIN_SUMMARY_CHARS = 250


def _lesson_deficits(parsed_lesson: Dict[str, Any]) -> List[str]:
    """Specific reasons a parsed lesson is too thin to accept; empty when it is rich enough."""
    sections = parsed_lesson.get("sections")
    if not isinstance(sections, list) or not sections:
        return ["The response was not valid lesson JSON with a 'sections' array."]
    by_type = {s.get("type"): s for s in sections if isinstance(s, dict)}
    deficits: List[str] = []

    def text_of(section_type: str) -> str:
        return str((by_type.get(section_type) or {}).get("content") or "").strip()

    if len(text_of("introduction")) < _MIN_INTRO_CHARS:
        deficits.append(f"introduction.content must be at least {_MIN_INTRO_CHARS} characters with learning objectives.")
    if len(text_of("key_concepts")) < _MIN_KEY_CONCEPTS_CHARS:
        deficits.append(f"key_concepts.content must be at least {_MIN_KEY_CONCEPTS_CHARS} characters of definitions and formulas.")
    if not (by_type.get("key_concepts") or {}).get("callouts"):
        deficits.append("key_concepts needs at least 1 callout (e.g. a common misconception).")
    examples = [e for e in (by_type.get("worked_examples") or {}).get("examples") or [] if isinstance(e, dict)]
    complete_examples = [
        e for e in examples
        if str(e.get("problem") or "").strip()
        and len([s for s in e.get("steps") or [] if str(s).strip()]) >= _MIN_EXAMPLE_STEPS
        and str(e.get("answer") or "").strip()
    ]
    if len(complete_examples) < _MIN_WORKED_EXAMPLES:
        deficits.append(
            f"worked_examples needs at least {_MIN_WORKED_EXAMPLES} examples, each with a problem, "
            f"at least {_MIN_EXAMPLE_STEPS} steps and an answer (found {len(complete_examples)})."
        )
    notes = [b for b in (by_type.get("important_notes") or {}).get("bulletPoints") or [] if str(b).strip()]
    if len(notes) < _MIN_NOTES:
        deficits.append(f"important_notes needs at least {_MIN_NOTES} bulletPoints (found {len(notes)}).")
    problems = [
        p for p in (by_type.get("try_it_yourself") or {}).get("practiceProblems") or []
        if isinstance(p, dict) and str(p.get("question") or "").strip() and str(p.get("solution") or "").strip()
    ]
    if len(problems) < _MIN_PRACTICE_PROBLEMS:
        deficits.append(f"try_it_yourself needs at least {_MIN_PRACTICE_PROBLEMS} practiceProblems with solutions (found {len(problems)}).")
    if len(text_of("summary")) < _MIN_SUMMARY_CHARS:
        deficits.append(f"summary.content must be at least {_MIN_SUMMARY_CHARS} characters of key takeaways.")
    return deficits


def _build_repair_prompt(original_prompt: str, previous_output: str, deficits: List[str]) -> str:
    return (
        f"{original_prompt}\n\n"
        "[YOUR PREVIOUS OUTPUT]\n"
        f"{previous_output[:12000]}\n\n"
        "[PROBLEMS TO FIX]\n"
        + "\n".join(f"- {d}" for d in deficits)
        + "\n\nReturn the COMPLETE corrected lesson as one valid JSON object with all 7 sections, "
        "fixing every problem above. Keep everything grounded in the curriculum context. Return JSON only."
    )


def _stream_reasoner_lesson(
    messages: List[Dict[str, str]],
    model: str,
    report_progress: Callable[[str, int], None],
    stop: threading.Event,
) -> str:
    """Stream a lesson from DeepSeek in a worker thread; returns the accumulated answer content."""
    client = get_deepseek_client().with_options(max_retries=0)
    # Thinking mode ignores sampling params, and its reasoning tokens count toward max_tokens:
    # 8192 ran out mid-JSON on most lessons, so the budget leaves room for reasoning plus the lesson.
    stream = client.chat.completions.create(
        model=model,
        messages=messages,
        max_tokens=_REASONER_LESSON_MAX_TOKENS,
        reasoning_effort=_REASONER_LESSON_EFFORT,
        stream=True,
        timeout=_REASONER_STREAM_TIMEOUT,
        extra_body={"thinking": {"type": "enabled"}},
    )
    parts: List[str] = []
    content_chars = 0
    reasoning_chars = 0
    finish_reason: Optional[str] = None
    last_report = 0.0
    try:
        for chunk in stream:
            if stop.is_set():
                raise TimeoutError(f"Lesson generation exceeded {int(_LESSON_GENERATION_CAP_SEC)}s")
            if not chunk.choices:
                continue
            choice = chunk.choices[0]
            reasoning = getattr(choice.delta, "reasoning_content", None)
            if reasoning:
                reasoning_chars += len(reasoning)
            if choice.delta.content:
                parts.append(choice.delta.content)
                content_chars += len(choice.delta.content)
            finish_reason = choice.finish_reason or finish_reason
            now = time.monotonic()
            if now - last_report >= _LESSON_PROGRESS_INTERVAL_SEC:
                last_report = now
                if content_chars:
                    report_progress("writing", content_chars)
                else:
                    report_progress("thinking", reasoning_chars)
    finally:
        close = getattr(stream, "close", None)
        if callable(close):
            close()
    if finish_reason == "length":
        raise RuntimeError("Lesson stream hit max_tokens before the JSON was complete")
    text = "".join(parts).strip()
    if not text:
        raise RuntimeError("Lesson stream returned no content")
    return text


async def _generate_lesson_text(prompt: str, emit: LessonEmit) -> Tuple[str, str]:
    """Stream the lesson from the configured rag_lesson model; fall back once to non-streaming chat."""
    primary_model = _lesson_primary_model()
    loop = asyncio.get_running_loop()
    stop = threading.Event()

    def report_progress(phase: str, chars: int) -> None:
        loop.call_soon_threadsafe(emit, "progress", {"phase": phase, "chars": chars})

    try:
        text = await asyncio.wait_for(
            asyncio.to_thread(_stream_reasoner_lesson, _curriculum_messages(prompt), primary_model, report_progress, stop),
            timeout=_LESSON_GENERATION_CAP_SEC,
        )
        return text, primary_model
    except Exception as exc:
        stop.set()
        logger.warning(
            "rag_lesson stream from %s failed (%s: %s); falling back to %s",
            primary_model, type(exc).__name__, exc, CHAT_MODEL,
        )
    text = await _generate_text(
        prompt,
        task_type="rag_lesson",
        max_new_tokens=4096,
        model=CHAT_MODEL,
        timeout_sec=120,
        max_retries=1,
    )
    return text, CHAT_MODEL


async def _repair_lesson_text(original_prompt: str, previous_output: str, deficits: List[str]) -> str:
    return await _generate_text(
        _build_repair_prompt(original_prompt, previous_output, deficits),
        task_type="rag_lesson",
        max_new_tokens=8192,
        model=CHAT_MODEL,
        timeout_sec=120,
        max_retries=1,
    )


async def _fetch_lesson_videos(payload: RagLessonRequest) -> Tuple[List[Dict], float]:
    """YouTube lookup capped at _LESSON_VIDEO_CAP_SEC; never raises. Returns (videos, elapsed ms)."""
    started = time.perf_counter()
    try:
        videos = await asyncio.wait_for(
            asyncio.to_thread(
                _fetch_youtube_videos,
                payload.lessonTitle or payload.topic,
                payload.subject,
                payload.learningCompetency or "",
                payload.quarter,
                lesson_id=payload.lessonId,
            ),
            timeout=_LESSON_VIDEO_CAP_SEC,
        )
    except Exception as exc:
        logger.warning("YouTube enrichment skipped: %s", str(exc) or type(exc).__name__)
        videos = []
    return videos or [], (time.perf_counter() - started) * 1000


async def _retrieve_lesson_chunks(payload: RagLessonRequest) -> Tuple[List[Dict[str, Any]], str]:
    retrieval_key = _lesson_cache_key(payload)
    if retrieval_key in _retrieval_memory:
        _retrieval_memory.move_to_end(retrieval_key)
        return _retrieval_memory[retrieval_key]
    chunks, retrieval_mode = await asyncio.to_thread(
        retrieve_lesson_pdf_context,
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
    if chunks:
        _remember(_retrieval_memory, retrieval_key, (chunks, retrieval_mode), _RETRIEVAL_MEMORY_MAX_ENTRIES)
    return chunks, retrieval_mode


async def _build_lesson(uid: str, payload: RagLessonRequest, emit: LessonEmit) -> Tuple[Dict[str, Any], bool, str]:
    """Run the full lesson pipeline. Returns (lesson response, cacheable, learner profile). Raises HTTPException."""
    started = time.perf_counter()
    timings: Dict[str, float] = {}
    # Video lookup and learner profile depend only on the payload/uid, so they run alongside retrieval + generation.
    video_task = _spawn_background(_fetch_lesson_videos(payload))
    profile_task = _spawn_background(_learner_profile_for(uid, payload))

    # ── Step 1: Retrieve curriculum chunks ───────────────────────────────────
    emit("stage", {"stage": "retrieving"})
    stage_started = time.perf_counter()
    try:
        chunks, retrieval_mode = await _retrieve_lesson_chunks(payload)
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
    timings["retrieve"] = (time.perf_counter() - stage_started) * 1000

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

    # ── Step 2: Build prompt ─────────────────────────────────────────────────
    learner_profile, personalized = await asyncio.shield(profile_task)
    try:
        prompt = build_lesson_prompt(
            lesson_title=payload.lessonTitle or payload.topic,
            competency=payload.learningCompetency or payload.topic,
            grade_level="Grade 11",
            subject=payload.subject,
            quarter=payload.quarter,
            learner_level=payload.learnerLevel,
            module_unit=payload.moduleUnit,
            curriculum_chunks=chunks,
            competency_code=payload.competencyCode,
            learner_profile=learner_profile,
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
    emit("stage", {"stage": "generating"})
    stage_started = time.perf_counter()
    try:
        raw_explanation, used_model = await _generate_lesson_text(prompt, emit)
    except InferenceAuthError as exc:
        logger.error(f"RAG inference auth error: {type(exc).__name__}: {exc}")
        raise HTTPException(
            status_code=502,
            detail={
                "error": "inference_auth_failed",
                "message": f"AI model call failed: {exc}",
                "type": type(exc).__name__,
            },
        )
    except InferenceConnectionError as exc:
        logger.error(f"RAG inference connection error: {type(exc).__name__}: {exc}")
        raise HTTPException(
            status_code=502,
            detail={
                "error": "inference_connection_failed",
                "message": f"AI model call failed: {exc}",
                "type": type(exc).__name__,
            },
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
    timings["generate"] = (time.perf_counter() - stage_started) * 1000

    # ── Step 4: Parse, validate richness (one repair pass), verify ───────────
    emit("stage", {"stage": "verifying"})
    stage_started = time.perf_counter()
    lesson_title = payload.lessonTitle or payload.topic
    replaced_with_defaults = False
    repaired = False
    verification = None
    try:
        parsed_lesson = _strip_thinking_and_parse(raw_explanation)
        deficits = _lesson_deficits(parsed_lesson)
        if deficits:
            logger.warning("rag_lesson too thin (%s); running one repair pass", "; ".join(deficits))
            repaired = True
            try:
                parsed_lesson = _strip_thinking_and_parse(await _repair_lesson_text(prompt, raw_explanation, deficits))
                deficits = _lesson_deficits(parsed_lesson)
            except Exception as exc:
                logger.warning("rag_lesson repair failed: %s: %s", type(exc).__name__, exc)
            if deficits:
                logger.warning("rag_lesson still thin after repair (%s); using grounded defaults", "; ".join(deficits))

        if deficits:
            replaced_with_defaults = True
            parsed_lesson = {
                "sections": list(_build_grounded_defaults(lesson_title, chunks=chunks).values()),
                "needsReview": True,
            }
        else:
            ref_text = format_retrieved_chunks(chunks)
            gen_text = json.dumps(parsed_lesson.get("sections", []), ensure_ascii=False)
            try:
                verification = await verify_lesson_factuality(
                    reference_text=ref_text,
                    generated_text=gen_text,
                )
            except Exception as exc:
                logger.warning("Jev verification error: %s; failing open", exc)
                verification = None

            if verification is not None and (
                not verification.get("verified", True)
                or verification.get("pCorrect", 1.0) < 0.70
            ):
                logger.warning(
                    "Jev factuality check failed (pCorrect=%.2f); replacing with grounded defaults",
                    verification.get("pCorrect", 0.0),
                )
                replaced_with_defaults = True
                parsed_lesson = {
                    **parsed_lesson,
                    "sections": list(_build_grounded_defaults(lesson_title, chunks=chunks).values()),
                }
            else:
                parsed_lesson = _ensure_7_sections(parsed_lesson, lesson_title, chunks=chunks)
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
    timings["verify"] = (time.perf_counter() - stage_started) * 1000

    # ── Step 5: Enrich with videos (lookup started at the top) ───────────────
    emit("stage", {"stage": "finalizing"})
    videos, timings["video"] = await asyncio.shield(video_task)
    video_section = next((s for s in parsed_lesson.get("sections") or [] if s.get("type") == "video"), None)
    if video_section and videos:
        # Primary video for backwards compatibility
        primary = videos[0]
        video_section["videoId"] = primary.get("videoId", "")
        video_section["videoTitle"] = primary.get("title", "")
        video_section["videoChannel"] = primary.get("channelTitle", "")
        video_section["embedUrl"] = f"https://www.youtube.com/embed/{primary.get('videoId', '')}"
        video_section["thumbnailUrl"] = primary.get("thumbnailUrl", "")
        # New: full videos array for Smart Video Integration
        video_section["videos"] = videos

    # ── Step 6: Assemble response ────────────────────────────────────────────
    retrieval_summary = summarize_retrieval_confidence(chunks)

    needs_review = parsed_lesson.get("needsReview", False)
    if retrieval_summary.get("band") == "low":
        needs_review = True

    lesson = {
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
        "activeModel": used_model,
        "jevVerification": verification,
        "personalized": personalized,
    }
    # Persisted indefinitely, so only a personalized, verified lesson from the primary (reasoner) model qualifies;
    # chat fallbacks, grounded defaults and anonymous requests regenerate next time.
    cacheable = (
        bool(uid)
        and verification is not None
        and not replaced_with_defaults
        and used_model == _lesson_primary_model()
    )
    logger.info(
        "rag_lesson timings cache=miss retrieve_ms=%d generate_ms=%d verify_ms=%d video_ms=%d total_ms=%d "
        "model=%s repaired=%s personalized=%s cacheable=%s",
        timings["retrieve"], timings["generate"], timings["verify"], timings["video"],
        (time.perf_counter() - started) * 1000, used_model, repaired, personalized, cacheable,
    )
    return lesson, cacheable, learner_profile


async def _run_lesson_job(uid: str, key: str, payload: RagLessonRequest, job: _LessonJob) -> Dict[str, Any]:
    job_key = (uid, key, payload.forceRefresh)
    try:
        return await _produce_lesson(uid, key, payload, job)
    finally:
        _lesson_jobs.pop(job_key, None)


async def _produce_lesson(uid: str, key: str, payload: RagLessonRequest, job: _LessonJob) -> Dict[str, Any]:
    if uid and not payload.forceRefresh:
        stored = await asyncio.to_thread(_read_student_lesson, uid, key)
        if stored is not None:
            job.emit("stage", {"stage": "cached"})
            _remember(_lesson_memory, (uid, key), stored, _LESSON_MEMORY_MAX_ENTRIES)
            logger.info("rag_lesson timings cache=hit source=firestore")
            return stored
    lesson, cacheable, learner_profile = await _build_lesson(uid, payload, job.emit)
    if cacheable:
        _remember(_lesson_memory, (uid, key), lesson, _LESSON_MEMORY_MAX_ENTRIES)
        _spawn_background(asyncio.to_thread(_write_student_lesson, uid, key, payload, lesson, learner_profile))
    return lesson


def _get_or_start_lesson(uid: str, payload: RagLessonRequest) -> Tuple[Optional[_LessonJob], Optional[Dict[str, Any]]]:
    """Return (None, cached lesson) on a memory hit, else (job, None) for a new or already in-flight generation.

    forceRefresh regenerates (and overwrites) only the caller's own lesson; anonymous callers are never cached.
    """
    key = _lesson_cache_key(payload)
    if uid and not payload.forceRefresh and (uid, key) in _lesson_memory:
        _lesson_memory.move_to_end((uid, key))
        logger.info("rag_lesson timings cache=hit source=memory total_ms=0")
        return None, _lesson_memory[(uid, key)]
    job_key = (uid, key, payload.forceRefresh)
    job = _lesson_jobs.get(job_key)
    if job is None:
        job = _LessonJob()
        _lesson_jobs[job_key] = job
        job.task = _spawn_background(_run_lesson_job(uid, key, payload, job))
    return job, None


# Prefetch (contract C4): background pregeneration of a student's next lesson through the same pipeline,
# cache key and in-flight registry, so opening the lesson mid-generation joins the running task.
_prefetch_semaphore = asyncio.Semaphore(max(1, int(os.getenv("LESSON_PREFETCH_CONCURRENCY", "2"))))
_prefetch_uids: Set[str] = set()


def _release_prefetch_slot(uid: str) -> None:
    _prefetch_uids.discard(uid)
    _prefetch_semaphore.release()


def _prefetch_finished(uid: str, task: asyncio.Task) -> None:
    _release_prefetch_slot(uid)
    if task.cancelled():
        return
    if task.exception() is not None:
        logger.warning("rag_lesson prefetch failed for one student: %s", task.exception())


@router.post("/lesson/prefetch", status_code=202)
async def rag_lesson_prefetch(request: Request, payload: RagLessonRequest):
    uid = _authenticated_uid(request)
    if not uid:
        return {"status": "skipped"}
    payload = payload.model_copy(update={"forceRefresh": False})
    key = _lesson_cache_key(payload)
    if (uid, key) in _lesson_memory:
        return {"status": "cached"}
    if (uid, key, False) in _lesson_jobs or (uid, key, True) in _lesson_jobs:
        return {"status": "in_progress"}
    # Interactive requests never take this semaphore; when every prefetch slot is busy, skip rather than pile up.
    if uid in _prefetch_uids or _prefetch_semaphore.locked():
        return {"status": "skipped"}
    # Claim the slot before the first await so a concurrent burst cannot oversubscribe it (acquiring an
    # unlocked semaphore completes without suspending). The job itself runs ungated, so an interactive
    # request that joins it is never queued behind the semaphore; the slot is released when the job ends.
    await _prefetch_semaphore.acquire()
    _prefetch_uids.add(uid)
    handed_off = False
    try:
        stored = await asyncio.to_thread(_read_student_lesson, uid, key)
        if stored is not None:
            _remember(_lesson_memory, (uid, key), stored, _LESSON_MEMORY_MAX_ENTRIES)
            return {"status": "cached"}
        if (uid, key, False) in _lesson_jobs:
            return {"status": "in_progress"}
        job, _ = _get_or_start_lesson(uid, payload)
        if job is None:
            return {"status": "cached"}
        job.task.add_done_callback(lambda task: _prefetch_finished(uid, task))
        handed_off = True
        return {"status": "queued"}
    finally:
        if not handed_off:
            _release_prefetch_slot(uid)


def _record_lesson_usage(request: Request, payload: RagLessonRequest, lesson: Dict[str, Any]) -> None:
    _spawn_background(asyncio.to_thread(
        _log_rag_usage,
        request,
        event_type="lesson",
        topic=build_lesson_query(payload.topic, payload.subject, payload.quarter, lesson_title=payload.lessonTitle),
        subject=payload.subject,
        quarter=payload.quarter,
        chunks=lesson.get("sources") or [],
    ))


@router.post("/lesson")
async def rag_lesson(request: Request, payload: RagLessonRequest):
    job, lesson = _get_or_start_lesson(_authenticated_uid(request), payload)
    if job is not None:
        # shield: a disconnecting client must not cancel the shared generation.
        lesson = await asyncio.shield(job.task)
    _record_lesson_usage(request, payload, lesson)
    return lesson


def _sse(event: str, payload: Any) -> str:
    return f"event: {event}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"


async def _lesson_events(
    request: Request,
    payload: RagLessonRequest,
    job: Optional[_LessonJob],
    cached: Optional[Dict[str, Any]],
) -> AsyncIterator[str]:
    if job is None:
        yield _sse("stage", {"stage": "cached"})
        yield _sse("lesson", cached)
        _record_lesson_usage(request, payload, cached)
        return

    queue: asyncio.Queue = asyncio.Queue()
    job.listeners.append(queue)
    if job.last_stage:
        queue.put_nowait(("stage", {"stage": job.last_stage}))
    getter: Optional[asyncio.Future] = None
    try:
        while True:
            getter = asyncio.ensure_future(queue.get())
            done, _ = await asyncio.wait(
                {getter, job.task},
                timeout=_LESSON_PING_INTERVAL_SEC,
                return_when=asyncio.FIRST_COMPLETED,
            )
            if getter in done:
                yield _sse(*getter.result())
                continue
            getter.cancel()
            if job.task in done:
                break
            yield ": ping\n\n"
        while not queue.empty():
            yield _sse(*queue.get_nowait())
        try:
            lesson = job.task.result()
        except HTTPException as exc:
            yield _sse("error", {"status": exc.status_code, "detail": exc.detail})
            return
        except Exception as exc:
            logger.error(f"RAG lesson stream error: {type(exc).__name__}: {exc}")
            yield _sse("error", {"status": 500, "detail": {"error": "lesson_failed", "message": str(exc), "type": type(exc).__name__}})
            return
        yield _sse("lesson", lesson)
        _record_lesson_usage(request, payload, lesson)
    finally:
        if getter is not None:
            getter.cancel()
        job.listeners.remove(queue)


@router.post("/lesson/stream")
async def rag_lesson_stream(request: Request, payload: RagLessonRequest):
    job, cached = _get_or_start_lesson(_authenticated_uid(request), payload)
    return StreamingResponse(
        _lesson_events(request, payload, job, cached),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/generate-problem")
async def rag_generate_problem(request: Request, payload: RagProblemRequest):
    chunks = await asyncio.to_thread(
        retrieve_curriculum_context,
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

    chunks = await asyncio.to_thread(build_analysis_curriculum_context, payload.weakTopics, payload.subject)
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


# ─── RAG Management Endpoints (Admin) ─────────────────────────────────────────

@router.get("/documents")
async def list_rag_documents():
    """List all documents in the vectorstore grouped by source file."""
    try:
        _, collection, _ = get_vectorstore_components()
        payload = collection.get(include=["metadatas"])
        metadatas = payload.get("metadatas") or []
        ids = payload.get("ids") or []

        # Group by source_file
        sources: Dict[str, Dict[str, Any]] = {}
        for i, md in enumerate(metadatas):
            if not isinstance(md, dict):
                continue
            source = md.get("source_file") or md.get("storage_path") or "unknown"
            subject = md.get("subject") or "unknown"
            if source not in sources:
                sources[source] = {"source_file": source, "subject": subject, "chunk_count": 0, "chunk_ids": []}
            sources[source]["chunk_count"] += 1
            sources[source]["chunk_ids"].append(ids[i])

        documents = sorted(sources.values(), key=lambda x: x["subject"])
        # Don't send all chunk_ids to frontend (too large), just count
        for doc in documents:
            del doc["chunk_ids"]

        return {"documents": documents, "total_chunks": len(ids)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to list RAG documents: {exc}")


@router.delete("/documents/by-subject/{subject}")
async def delete_rag_by_subject(subject: str):
    """Delete all chunks for a given subject from the vectorstore."""
    try:
        _, collection, _ = get_vectorstore_components()
        payload = collection.get(include=["metadatas"], where={"subject": subject})
        ids = payload.get("ids") or []
        if not ids:
            return {"deleted": 0, "message": f"No chunks found for subject '{subject}'."}
        collection.delete(ids=ids)
        return {"deleted": len(ids), "message": f"Deleted {len(ids)} chunks for subject '{subject}'."}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to delete: {exc}")


@router.delete("/documents/by-source")
async def delete_rag_by_source(source_file: str):
    """Delete all chunks from a specific source file."""
    try:
        _, collection, _ = get_vectorstore_components()
        payload = collection.get(include=["metadatas"], where={"source_file": source_file})
        ids = payload.get("ids") or []
        if not ids:
            # Try storage_path as fallback
            payload = collection.get(include=["metadatas"], where={"storage_path": source_file})
            ids = payload.get("ids") or []
        if not ids:
            return {"deleted": 0, "message": f"No chunks found for source '{source_file}'."}
        collection.delete(ids=ids)
        return {"deleted": len(ids), "message": f"Deleted {len(ids)} chunks from '{source_file}'."}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to delete: {exc}")


@router.delete("/documents/all")
async def purge_all_rag():
    """Purge ALL chunks from the vectorstore. Requires re-ingestion after."""
    try:
        client, collection, _ = get_vectorstore_components()
        # Delete the collection and recreate it empty
        client.delete_collection("curriculum_chunks")
        client.get_or_create_collection(name="curriculum_chunks", metadata={"hnsw:space": "cosine"})
        reset_vectorstore_singleton()
        return {"message": "All RAG content purged. Re-ingestion required."}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to purge: {exc}")
