"""Student Intelligence Pipeline API routes."""

import logging
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from pydantic import BaseModel
from typing import Any, Dict, Literal

logger = logging.getLogger("mathpulse.pipeline_routes")

router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])


class PipelineEventPayload(BaseModel):
    student_id: str
    event_type: Literal["diagnostic", "quiz", "battle", "lesson", "module", "session"]
    event_data: Dict[str, Any] = {}
    occurred_at: str
    class_id: str = ""
    teacher_id: str = ""


def _require_auth(request: Request):
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


async def _run_pipeline(payload: PipelineEventPayload):
    """Background task to run the pipeline."""
    try:
        from services.student_intelligence_pipeline import get_pipeline, StudentActivityEvent
        pipeline = get_pipeline()
        event = StudentActivityEvent(**payload.model_dump())
        await pipeline.process_event(event)
    except Exception as e:
        logger.error(f"Pipeline background task failed: {e}", exc_info=True)


@router.post("/event", status_code=202)
async def receive_event(payload: PipelineEventPayload, background_tasks: BackgroundTasks, request: Request):
    """Universal intake endpoint. Returns 202 immediately, processes async."""
    user = _require_auth(request)
    # Students can only emit events for themselves
    if user.role == "student" and payload.student_id != user.uid:
        raise HTTPException(status_code=403, detail="Students can only emit events for their own ID")
    background_tasks.add_task(_run_pipeline, payload)
    return {"status": "accepted", "student_id": payload.student_id}


@router.get("/profile/{student_id}")
async def get_profile(student_id: str, request: Request):
    """Get full student profile."""
    _require_auth(request)

    _firebase_firestore = None
    try:
        from firebase_admin import firestore as ff
        _firebase_firestore = ff
    except Exception:
        raise HTTPException(status_code=503, detail="Firestore unavailable")

    db = _firebase_firestore.client()
    doc = db.collection("student_profiles").document(student_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Profile not found")
    return doc.to_dict()


@router.post("/profile/{student_id}/recompute")
async def recompute_profile(student_id: str, background_tasks: BackgroundTasks, request: Request):
    """Force full profile rebuild from raw Firestore data."""
    user = _require_auth(request)
    if user.role not in ("teacher", "admin"):
        raise HTTPException(status_code=403, detail="Teacher or admin required")

    async def _recompute():
        from services.student_intelligence_pipeline import get_pipeline, StudentActivityEvent
        pipeline = get_pipeline()
        # Trigger a synthetic diagnostic event to force full recompute
        event = StudentActivityEvent(
            student_id=student_id,
            event_type="session",
            event_data={"event": "force_recompute"},
            occurred_at=__import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
            class_id="",
            teacher_id=user.uid,
        )
        await pipeline.process_event(event)

    background_tasks.add_task(_recompute)
    return {"status": "recompute_queued", "student_id": student_id}


@router.post("/admin/backfill", status_code=202)
async def backfill_all(background_tasks: BackgroundTasks, request: Request):
    """One-time migration: rebuild student_profiles for ALL existing students."""
    user = _require_auth(request)
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    async def _backfill():
        try:
            from services.student_intelligence_pipeline import get_pipeline, StudentActivityEvent
            from firebase_admin import firestore as ff
            db = ff.client()
            pipeline = get_pipeline()

            students = db.collection("managedStudents").stream()
            count = 0
            for student_doc in students:
                sid = student_doc.id
                data = student_doc.to_dict()
                event = StudentActivityEvent(
                    student_id=sid,
                    event_type="session",
                    event_data={"event": "backfill"},
                    occurred_at=__import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
                    class_id=data.get("classroomId", ""),
                    teacher_id=data.get("teacherId", ""),
                )
                await pipeline.process_event(event)
                count += 1
                if count % 10 == 0:
                    logger.info(f"Backfilled {count} students")
            logger.info(f"Backfill complete: {count} students processed")
        except Exception as e:
            logger.error(f"Backfill failed: {e}", exc_info=True)

    background_tasks.add_task(_backfill)
    return {"status": "backfill_started"}
