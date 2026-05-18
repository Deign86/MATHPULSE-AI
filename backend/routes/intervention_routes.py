"""Intervention API routes."""

import logging
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional

logger = logging.getLogger("mathpulse.intervention_routes")

router = APIRouter(prefix="/api/intervention", tags=["intervention"])


class GenerateRequest(BaseModel):
    student_id: str


class CompleteStepRequest(BaseModel):
    score: float = 0.0
    time_spent_minutes: int = 0


def _require_auth(request: Request):
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


@router.post("/generate")
async def generate_intervention(body: GenerateRequest, request: Request):
    """Generate a full intervention plan for a student."""
    _require_auth(request)

    from services.intervention_engine import get_intervention_engine
    engine = get_intervention_engine()
    plan = await engine.generate_full_intervention(body.student_id, force=True)
    return plan.model_dump()


@router.get("/{student_id}")
async def get_intervention(student_id: str, request: Request):
    """Get latest intervention plan. Auto-generates if missing or stale."""
    user = _require_auth(request)

    from services.intervention_engine import get_intervention_engine
    engine = get_intervention_engine()
    plan = await engine.generate_full_intervention(student_id, force=False)
    return plan.model_dump()


@router.post("/{student_id}/step/{step_number}/complete")
async def complete_step(student_id: str, step_number: int, body: CompleteStepRequest, request: Request):
    """Mark a learning step as completed."""
    _require_auth(request)

    from services.intervention_engine import get_intervention_engine
    engine = get_intervention_engine()
    result = await engine.complete_step(student_id, step_number, body.score, body.time_spent_minutes)

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/{student_id}/export-pdf")
async def export_pdf_data(student_id: str, request: Request):
    """Get all data needed for PDF export."""
    _require_auth(request)

    from services.intervention_engine import get_intervention_engine
    engine = get_intervention_engine()
    plan = await engine.generate_full_intervention(student_id, force=False)
    return plan.model_dump()
