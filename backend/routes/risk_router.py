"""
WRI (Weighted Risk Index) Computation Router.

POST /api/risk/compute      -> Compute WRI for a single student
POST /api/risk/compute/batch -> Batch compute WRI for multiple students

Prevention-first 5-band classification:
  WRI >= 88 -> safe
  WRI >= 80 -> watch
  WRI >= 75 -> intervene
  WRI >= 68 -> critical
  WRI < 68  -> at_risk

Aligned with DepEd DO No. 8, s. 2015 — 75 is the failing floor, not the trigger.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger("mathpulse.risk")

router = APIRouter(prefix="/api/risk", tags=["risk"])

# Lazy import of wri_service (may not exist yet in dev environments)
_wri_service = None

def _get_wri_service():
    global _wri_service
    if _wri_service is None:
        try:
            from services.wri_service import compute_wri
            _wri_service = compute_wri
        except ImportError:
            # Fallback for when services haven't been set up yet
            _wri_service = None
    return _wri_service


class RiskComputePayload(BaseModel):
    d: Optional[float] = None
    g: Optional[float] = None
    p: Optional[float] = None
    weights: Dict[str, float] = {"w1": 0.30, "w2": 0.40, "w3": 0.30}


class StudentRiskInput(BaseModel):
    id: str
    d: Optional[float] = None
    g: Optional[float] = None
    p: Optional[float] = None


class BatchRiskPayload(BaseModel):
    students: List[StudentRiskInput]
    weights: Dict[str, float] = {"w1": 0.30, "w2": 0.40, "w3": 0.30}


@router.post("/compute")
def compute_risk_endpoint(payload: RiskComputePayload):
    """
    Compute WRI for a single student.
    """
    compute_fn = _get_wri_service()
    if compute_fn is None:
        raise HTTPException(
            status_code=503,
            detail="WRI service not available. Ensure backend services are initialized."
        )
    
    try:
        result = compute_fn(
            d=payload.d,
            g=payload.g,
            p=payload.p,
            weights=payload.weights,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/compute/batch")
def compute_risk_batch(payload: BatchRiskPayload):
    """
    Compute WRI for multiple students in one call.
    Used by Cloud Functions for batch recalculation.
    """
    compute_fn = _get_wri_service()
    if compute_fn is None:
        raise HTTPException(
            status_code=503,
            detail="WRI service not available."
        )
    
    results = []
    for student in payload.students:
        try:
            result = compute_fn(
                d=student.d,
                g=student.g,
                p=student.p,
                weights=payload.weights,
            )
            results.append({
                "id": student.id,
                **result,
            })
        except ValueError as e:
            results.append({
                "id": student.id,
                "wri": None,
                "risk_status": "error",
                "error": str(e),
            })
    
    return {"results": results}
