from __future__ import annotations

import re
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from rag.curriculum_rag import retrieve_lesson_pdf_context
from routes.rag_routes import (
    _ensure_7_sections,
    _generate_text,
    _strip_thinking_and_parse,
)
from services.inference_client import InferenceAuthError, InferenceConnectionError


router = APIRouter(prefix="/api", tags=["fun-modules"])


class GenerateModuleRequest(BaseModel):
    topic: str = Field(min_length=1)
    subject: str = Field(min_length=1)
    quarter: int = Field(ge=1, le=4)
    bloomLevel: str = Field(min_length=1)


class MasteryRecordRequest(BaseModel):
    userId: str = Field(min_length=1)
    competencyCode: str = Field(min_length=1)
    correct: bool
    score: float = Field(ge=0, le=1)


class GenerateModuleResponse(BaseModel):
    moduleId: str
    title: str
    cards: list[dict[str, Any]]
    sources: list[str]


class MasteryRecordResponse(BaseModel):
    masteryProbability: float
    unlockedModules: list[str]
    xpAwarded: int


def _api_error(status_code: int, error: str, error_type: str) -> HTTPException:
    return HTTPException(
        status_code=status_code,
        detail={
            "error": error,
            "message": error.replace("_", " ").capitalize(),
            "type": error_type,
        },
    )


def _module_id(payload: GenerateModuleRequest) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", payload.topic.lower()).strip("-")
    return f"{payload.subject.lower().replace(' ', '-')}-q{payload.quarter}-{slug}"


def _source_names(chunks: list[dict[str, Any]]) -> list[str]:
    names: list[str] = []
    for chunk in chunks:
        source_name = chunk.get("source_file") or chunk.get("storage_path")
        if isinstance(source_name, str) and source_name not in names:
            names.append(source_name)
    return names


@router.post("/curriculum/generate-module", response_model=GenerateModuleResponse)
async def generate_module(payload: GenerateModuleRequest) -> dict[str, Any]:
    try:
        chunks, _retrieval_mode = retrieve_lesson_pdf_context(
            topic=payload.topic,
            subject=payload.subject,
            quarter=payload.quarter,
            lesson_title=payload.topic,
            top_k=8,
        )
    except Exception:
        raise _api_error(503, "retrieval_failed", "RetrievalError")

    if not chunks:
        raise _api_error(404, "no_curriculum_context", "CurriculumContextError")

    prompt = (
        f"Create concise Merrill learning cards for {payload.topic} in {payload.subject}, "
        f"quarter {payload.quarter}, Bloom level {payload.bloomLevel}. Return JSON with title and sections."
    )
    try:
        raw_text = await _generate_text(prompt, task_type="rag_lesson", max_new_tokens=4096, enable_thinking=True)
    except InferenceAuthError:
        raise _api_error(502, "inference_auth_failed", "InferenceAuthError")
    except InferenceConnectionError:
        raise _api_error(502, "inference_connection_failed", "InferenceConnectionError")
    except Exception:
        raise _api_error(502, "inference_failed", "InferenceError")

    try:
        parsed = _strip_thinking_and_parse(raw_text)
        if not isinstance(parsed, dict):
            raise ValueError("module response must be an object")
        cards = parsed.get("sections", parsed.get("cards"))
        if not isinstance(cards, list):
            raise ValueError("module response must contain cards")
        normalized = _ensure_7_sections(
            {**parsed, "sections": cards},
            str(parsed.get("title") or payload.topic),
            chunks=chunks,
        )
    except Exception:
        raise _api_error(500, "parse_failed", "ParseError")

    return {
        "moduleId": _module_id(payload),
        "title": str(normalized.get("title") or payload.topic),
        "cards": normalized["sections"],
        "sources": _source_names(chunks),
    }


@router.post("/mastery/record", response_model=MasteryRecordResponse)
async def record_mastery(payload: MasteryRecordRequest) -> dict[str, Any]:
    probability = round((payload.score + (1.0 if payload.correct else 0.0)) / 2.0, 3)
    return {
        "masteryProbability": probability,
        "unlockedModules": [],
        "xpAwarded": 30 if payload.correct else 0,
    }
