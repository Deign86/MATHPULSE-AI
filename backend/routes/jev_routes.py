from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict

from services.jev_client import verify_lesson_factuality


logger = logging.getLogger(__name__)


class JevVerifyRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    referenceText: str
    generatedText: str
    claimType: str = "curriculum_alignment"


class JevVerifyResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    verified: bool
    pCorrect: float
    pLeak: float
    action: str


router = APIRouter(prefix="/api/jev", tags=["jev"])


@router.post("/verify", response_model=JevVerifyResponse)
async def verify_jev(request: JevVerifyRequest) -> JevVerifyResponse:
    if len(request.referenceText) + len(request.generatedText) > 8000:
        raise HTTPException(
            status_code=400,
            detail="Combined text exceeds 8000 characters limit",
        )

    try:
        verification: dict[str, Any] = await verify_lesson_factuality(
            request.referenceText,
            request.generatedText,
        )
    except Exception as exc:
        logger.exception("JEV verification failed")
        raise HTTPException(
            status_code=502,
            detail="JEV verification service unavailable",
        ) from exc
    verified = bool(verification.get("verified", True))
    return JevVerifyResponse(
        verified=verified,
        pCorrect=float(verification.get("pCorrect", 1.0 if verified else 0.0)),
        pLeak=float(verification.get("pLeak", 0.0)),
        action=str(verification.get("action", "verified")),
    )
