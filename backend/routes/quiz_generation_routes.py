"""
Unified Quiz Generation Routes.

Generates dynamic quiz questions using DeepSeek AI + RAG curriculum context.
Used by: lesson practice quizzes, module quizzes, and quiz battle.

When new PDFs are ingested into the vectorstore, this endpoint automatically
picks up the new content via RAG retrieval.
"""

from __future__ import annotations

import json
import logging
import random
import re
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from rag.curriculum_rag import (
    retrieve_curriculum_context,
    summarize_retrieval_confidence,
)
from services.inference_client import (
    InferenceRequest,
    create_default_client,
    get_model_for_task,
)

logger = logging.getLogger("mathpulse.quiz_generation")
router = APIRouter(prefix="/api/quiz", tags=["quiz-generation"])

_inference_client = None


def _get_inference_client():
    global _inference_client
    if _inference_client is None:
        _inference_client = create_default_client()
    return _inference_client


# ── Request/Response Models ────────────────────────────────────────────

class QuizGenerationRequest(BaseModel):
    topic: str = Field(..., min_length=1, description="Lesson topic or competency")
    subject: str = Field(..., min_length=1, description="Subject name (e.g., 'General Mathematics')")
    lessonTitle: Optional[str] = Field(default=None, description="Full lesson title")
    questionCount: int = Field(default=6, ge=1, le=20, description="Number of questions to generate")
    questionTypes: List[str] = Field(
        default=["multiple-choice", "true-false", "fill-in-blank"],
        description="Question types to include",
    )
    difficulty: str = Field(default="medium", pattern="^(easy|medium|hard)$")
    quarter: Optional[int] = Field(default=1, ge=1, le=4)
    moduleId: Optional[str] = Field(default=None)
    lessonId: Optional[str] = Field(default=None)
    competencyCode: Optional[str] = Field(default=None)
    storagePath: Optional[str] = Field(default=None)
    userId: Optional[str] = Field(default=None)
    varianceSeed: Optional[int] = Field(default=None, description="Random seed for variance across generations")


class QuizQuestion(BaseModel):
    id: int
    type: str
    question: str
    options: Optional[List[str]] = None
    correctAnswer: str
    explanation: str


class QuizGenerationResponse(BaseModel):
    questions: List[QuizQuestion]
    retrievalConfidence: Dict[str, Any]
    sourceChunks: int
    generatedAt: str


# ── Prompt Builder ─────────────────────────────────────────────────────

def _build_quiz_generation_prompt(
    topic: str,
    subject: str,
    lesson_title: Optional[str],
    question_count: int,
    question_types: List[str],
    difficulty: str,
    retrieved_context: str,
    variance_seed: Optional[int] = None,
) -> str:
    """Build the DeepSeek prompt for quiz generation with variance."""

    # Build variance instruction based on seed
    variance_instruction = ""
    if variance_seed is not None:
        variance_instruction = f"""
8. VARIANCE REQUIREMENT: Use seed {variance_seed} to ensure variety. Generate DIFFERENT questions each time.
   - Paraphrase concepts in fresh ways
   - Use different numerical values and scenarios
   - Vary question phrasing and structure
   - Avoid repeating similar question patterns"""

    return f"""You are a DepEd-aligned mathematics quiz generator for Filipino Senior High School students (Grades 11-12).

Given the following curriculum context about "{topic}" from {subject}, generate {question_count} {difficulty}-difficulty quiz questions.

## Retrieved Curriculum Context
{retrieved_context}

## Instructions
1. Generate exactly {question_count} questions covering the topic above.
2. Question types to use: {', '.join(question_types)}
3. DISTRIBUTION (for {question_count} questions):
   - 2 items: Recall and Basics (simple recall, definitions, fundamental facts)
   - 4 items: Direct Application (real-world context with pesos, jeepney, sari-sari store, etc.)
   - 3 items: Mixed/Interleaved Problems (combine concepts, multi-step reasoning)
   - 1 item: Metacognitive/Reflective (explain reasoning, justify approach, identify errors)
4. Difficulty: {difficulty} — appropriate for Grade 11-12 Filipino STEM students.
5. Use Filipino-localized context where possible (pesos, jeepney, barangay, sari-sari store, etc.).
6. Each question must be mathematically accurate and curriculum-aligned.
7. Provide clear explanations for the correct answer.{variance_instruction}

## Question Type Rules
- multiple-choice: 4 options (A/B/C/D format), exactly one correct answer
- true-false: statement that is either True or False
- fill-in-blank: question with a single numeric or short text answer

## Output Format
Return ONLY a valid JSON array. No markdown, no extra text. Format:
[
  {{
    "type": "multiple-choice",
    "question": "What is the derivative of f(x) = x³?",
    "options": ["2x²", "3x²", "x²", "3x"],
    "correctAnswer": "3x²",
    "explanation": "Using the power rule: d/dx(xⁿ) = nxⁿ⁻¹. So d/dx(x³) = 3x²."
  }},
  {{
    "type": "true-false",
    "question": "The sum of angles in a triangle is 180 degrees.",
    "options": ["True", "False"],
    "correctAnswer": "True",
    "explanation": "By the triangle angle sum theorem, the interior angles of any Euclidean triangle sum to 180°."
  }},
  {{
    "type": "fill-in-blank",
    "question": "If f(x) = 2x + 3, then f(4) = ___",
    "options": null,
    "correctAnswer": "11",
    "explanation": "Substitute x = 4: f(4) = 2(4) + 3 = 8 + 3 = 11."
  }}
]

IMPORTANT:
- Return ONLY the JSON array, no other text
- Ensure correctAnswer exactly matches one of the options (for MC/TF)
- For fill-in-blank, correctAnswer is the exact text that fills the blank
- Generate FRESH, VARIED questions - no two questions should be identical or nearly identical
- Questions should feel like they were created independently, not templated"""


# ── Response Parser ────────────────────────────────────────────────────

def _parse_quiz_response(text: str, expected_count: int) -> List[Dict[str, Any]]:
    """Parse and validate DeepSeek quiz generation response."""
    cleaned = text.strip()

    # Strip markdown fences
    cleaned = re.sub(r"^```json\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"^```\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    cleaned = cleaned.strip()

    try:
        questions = json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse quiz response as JSON: {e}")
        # Try to extract JSON array from text
        match = re.search(r"\[.*\]", cleaned, re.DOTALL)
        if match:
            try:
                questions = json.loads(match.group())
            except json.JSONDecodeError:
                raise ValueError(f"Invalid JSON in quiz response: {e}")
        else:
            raise ValueError(f"No JSON array found in quiz response")

    if not isinstance(questions, list):
        raise ValueError("Quiz response is not a JSON array")

    validated = []
    for i, q in enumerate(questions):
        if not isinstance(q, dict):
            continue

        # Ensure required fields
        if "question" not in q or "correctAnswer" not in q:
            continue

        # Normalize field names
        normalized = {
            "id": i + 1,
            "type": q.get("type", "multiple-choice"),
            "question": q["question"],
            "correctAnswer": q["correctAnswer"],
            "explanation": q.get("explanation", ""),
        }

        # Handle options
        if "options" in q and q["options"]:
            normalized["options"] = q["options"]
        elif "choices" in q and q["choices"]:
            normalized["options"] = q["choices"]
        else:
            # For true-false, auto-populate options
            if normalized["type"] == "true-false":
                normalized["options"] = ["True", "False"]
            else:
                normalized["options"] = None

        validated.append(normalized)

    if len(validated) < min(expected_count, 3):
        raise ValueError(f"Only {len(validated)} valid questions parsed, expected at least {min(expected_count, 3)}")

    return validated[:expected_count]


# ── Variance Application ───────────────────────────────────────────────

def _apply_variance(questions: List[Dict[str, Any]], seed: int) -> List[Dict[str, Any]]:
    """Apply deterministic variance to questions (shuffle choices, etc.)."""
    rng = random.Random(seed)

    for q in questions:
        # Shuffle multiple-choice options while tracking correct answer
        if q.get("type") == "multiple-choice" and q.get("options"):
            options = q["options"].copy()
            correct = q["correctAnswer"]

            # Only shuffle if correct answer is in options
            if correct in options:
                rng.shuffle(options)
                q["options"] = options
                q["correctAnswer"] = correct  # Keep original correct answer text

    return questions


# ── Endpoints ──────────────────────────────────────────────────────────

@router.post("/generate", response_model=QuizGenerationResponse)
async def generate_quiz(request: QuizGenerationRequest):
    """
    Generate a dynamic quiz using DeepSeek AI + RAG curriculum context.

    This endpoint retrieves relevant curriculum chunks from the vectorstore,
    then calls DeepSeek to generate varied quiz questions based on that context.
    When new PDFs are ingested, they automatically become available via RAG.
    """
    try:
        # 1. Retrieve curriculum context via RAG
        query = request.lessonTitle or request.topic
        chunks = retrieve_curriculum_context(
            query=query,
            subject=request.subject,
            quarter=request.quarter,
            module_id=request.moduleId,
            lesson_id=request.lessonId,
            competency_code=request.competencyCode,
            storage_path=request.storagePath,
            top_k=8,
        )

        if not chunks:
            logger.warning(f"No curriculum chunks found for topic '{request.topic}' in subject '{request.subject}'")
            raise HTTPException(
                status_code=404,
                detail=f"No curriculum content found for topic '{request.topic}'. Please ensure PDFs are ingested.",
            )

        # Format retrieved chunks for the prompt
        formatted_context = "\n\n---\n\n".join(
            f"[Source: {chunk.get('metadata', {}).get('source_file', 'Unknown')}, Page {chunk.get('metadata', {}).get('page', 'N/A')}]\n{chunk.get('document', '')}"
            for chunk in chunks
        )

        confidence = summarize_retrieval_confidence(chunks)

        # 2. Build generation prompt
        prompt = _build_quiz_generation_prompt(
            topic=request.topic,
            subject=request.subject,
            lesson_title=request.lessonTitle,
            question_count=request.questionCount,
            question_types=request.questionTypes,
            difficulty=request.difficulty,
            retrieved_context=formatted_context,
            variance_seed=request.varianceSeed,
        )

        # 3. Call DeepSeek with higher temperature for variance
        inference_request = InferenceRequest(
            messages=[
                {"role": "system", "content": "You are a precise DepEd-aligned curriculum quiz generator. Generate FRESH, VARIED questions each time - do not repeat patterns."},
                {"role": "user", "content": prompt},
            ],
            task_type="quiz_generation",
            max_new_tokens=3000,
            temperature=0.7,  # Higher temp for variance
            top_p=0.9,
        )

        raw_response = _get_inference_client().generate_from_messages(inference_request)

        # 4. Parse response
        questions = _parse_quiz_response(raw_response, request.questionCount)

        # 5. Apply variance (shuffle options) with user-based seed for consistency
        seed = request.varianceSeed if request.varianceSeed else hash(f"{request.topic}:{request.subject}:{request.lessonTitle or ''}:{request.userId or 'anon'}") % (2**32)
        varied_questions = _apply_variance(questions, seed)

        # 6. Build response
        return QuizGenerationResponse(
            questions=[QuizQuestion(**q) for q in varied_questions],
            retrievalConfidence=confidence,
            sourceChunks=len(chunks),
            generatedAt=__import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Quiz generation failed")
        raise HTTPException(status_code=500, detail=f"Quiz generation failed: {str(e)}")


@router.get("/health")
async def quiz_generation_health():
    """Check quiz generation service health."""
    model = get_model_for_task("quiz_generation")
    return {
        "status": "ok",
        "activeModel": model,
        "endpoint": "/api/quiz/generate",
        "features": ["rag-retrieval", "deepseek-generation", "choice-shuffling", "auto-pdf-updates"],
    }
