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
    bloomLevel: Optional[str] = None
    competencyCode: Optional[str] = None
    points: Optional[int] = None
    xpReward: Optional[int] = None


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
    competency_code: Optional[str] = None,
    grade_level: str = "Grade 11/12",
    lesson_objective: Optional[str] = None,
    xp_reward: int = 10,
    points: int = 1,
) -> str:
    """Build the QuizForge prompt for quiz generation with variance."""

    # Build question type string
    qt_str = ", ".join(question_types) if question_types else "multiple_choice"

    # Build variance instruction based on seed
    variance_instruction = ""
    if variance_seed is not None:
        variance_instruction = f"""
IMPORTANT — VARIANCE (seed {variance_seed}):
- Paraphrase concepts in fresh ways
- Use different numerical values and scenarios
- Vary question phrasing and structure
- Do NOT repeat similar question patterns"""

    return f"""You are a precise DepEd-aligned mathematics quiz generator for Filipino Senior High School STEM students ({grade_level}).

Generate a "Try It Yourself" quiz for the following lesson.

## LESSON METADATA
- Title: {lesson_title or topic}
- DepEd Competency: {competency_code or 'Not specified'}
- Grade Level: {grade_level}
- Subject: {subject}
- Lesson Objective: {lesson_objective or topic}

## RAG CONTEXT (lesson source material)
{retrieved_context}

## QUIZ CONFIGURATION
- Number of questions: {question_count}
- Difficulty: {difficulty}
- Question type: {qt_str}
- XP per correct answer: {xp_reward}
- Point value per question: {points}

## Instructions
1. Generate EXACTLY {question_count} questions covering the topic above.
2. Question types to use: {qt_str}
3. DISTRIBUTION (for {question_count} questions):
   - Include at least 1 "remember" (recall, definitions, fundamental facts)
   - Include at least 1 "understand" (explain concepts)
   - Include at least 1 "apply" (real-world context: pesos, jeepney, sari-sari store, barangay)
   - Difficulty: {difficulty} — appropriate for {grade_level} Filipino STEM students.
4. Use Filipino-localized context where possible (pesos, jeepney, barangay, sari-sari store, etc.).
5. Each question must be mathematically accurate and curriculum-aligned.
6. Provide clear explanations for the correct answer.{variance_instruction}

## Question Type Rules
- multiple-choice: 4 options as array of objects with "key" and "text" fields, exactly one correct
- true-false: statement that is either True or False
- fill-in-blank: question with a single numeric or short text answer

## Output Format (strict JSON array — no markdown, no extra text)
[
  {{
    "id": "q1",
    "question_text": "What is the derivative of f(x) = x³?",
    "type": "multiple_choice",
    "bloom_level": "remember",
    "options": [
      {{ "key": "A", "text": "2x²" }},
      {{ "key": "B", "text": "3x²" }},
      {{ "key": "C", "text": "x²" }},
      {{ "key": "D", "text": "3x" }}
    ],
    "correct_answer": "B",
    "explanation": "Using the power rule: d/dx(xⁿ) = nxⁿ⁻¹. So d/dx(x³) = 3x².",
    "points": {points},
    "xp_reward": {xp_reward},
    "difficulty": "{difficulty}",
    "competency_code": "{competency_code or 'N/A'}"
  }},
  {{
    "id": "q2",
    "question_text": "The sum of angles in a triangle is 180 degrees.",
    "type": "true-false",
    "bloom_level": "remember",
    "options": [
      {{ "key": "A", "text": "True" }},
      {{ "key": "B", "text": "False" }}
    ],
    "correct_answer": "A",
    "explanation": "By the triangle angle sum theorem, interior angles of any Euclidean triangle sum to 180°.",
    "points": {points},
    "xp_reward": {xp_reward},
    "difficulty": "{difficulty}",
    "competency_code": "{competency_code or 'N/A'}"
  }},
  {{
    "id": "q3",
    "question_text": "If f(x) = 2x + 3, then f(4) = ___",
    "type": "fill_in_blank",
    "bloom_level": "apply",
    "options": null,
    "correct_answer": "11",
    "explanation": "Substitute x = 4: f(4) = 2(4) + 3 = 8 + 3 = 11.",
    "points": {points},
    "xp_reward": {xp_reward},
    "difficulty": "{difficulty}",
    "competency_code": "{competency_code or 'N/A'}"
  }}
]

IMPORTANT:
- Return ONLY a valid JSON array, no markdown fences, no extra text
- For multiple-choice: options are objects with "key" ("A","B","C","D") and "text" (the answer text)
- correct_answer must be the KEY ("A","B","C","D") that matches the correct option
- For fill-in-blank, correct_answer is the exact text that fills the blank
- Generate FRESH, VARIED questions — no two questions should be identical or nearly identical
- Spread Bloom's taxonomy: include "remember", "understand", and "apply" level questions"""


# ── Response Parser ────────────────────────────────────────────────────

def _parse_quiz_response(text: str, expected_count: int) -> List[Dict[str, Any]]:
    """Parse and validate QuizForge quiz generation response."""
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

        # QuizForge required fields
        if "question_text" not in q or "correct_answer" not in q:
            logger.warning(f"Question {i} missing required field 'question_text' or 'correct_answer', skipping")
            continue

        qtype = q.get("type", "multiple-choice")
        correct_key = q.get("correct_answer", "")

        # ── Flatten options from [{key, text}] to [text] ──────────────────
        raw_options = q.get("options")
        flat_options: Optional[List[str]] = None

        if raw_options and isinstance(raw_options, list):
            # QuizForge: options is [{key: "A", text: "..."}, ...]
            if len(raw_options) > 0 and isinstance(raw_options[0], dict) and "text" in raw_options[0]:
                # Sort by key to maintain consistent ordering (A, B, C, D)
                def key_sort(opt: Dict[str, str]) -> str:
                    return opt.get("key", "")
                sorted_opts = sorted(raw_options, key=key_sort)
                flat_options = [opt.get("text", "") for opt in sorted_opts]
            else:
                # Already flat array of strings
                flat_options = raw_options
        elif qtype == "true-false":
            flat_options = ["True", "False"]

        # ── Map correct_key ("A") → correct_answer TEXT ─────────────────
        correct_answer_text: str = correct_key
        if flat_options and isinstance(raw_options, list):
            # Find the option whose key matches correct_key
            for opt in raw_options:
                if isinstance(opt, dict) and opt.get("key") == correct_key:
                    correct_answer_text = opt.get("text", correct_key)
                    break

        # ── Build normalized internal record ────────────────────────────
        normalized = {
            "id": i + 1,
            "type": qtype,
            "question": q["question_text"],
            "bloomLevel": q.get("bloom_level", "apply"),
            "competencyCode": q.get("competency_code"),
            "correctAnswer": correct_answer_text,
            "options": flat_options,
            "explanation": q.get("explanation", ""),
            "points": q.get("points", 1),
            "xpReward": q.get("xp_reward", 10),
        }

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

        # Shuffle retrieved chunks for variance BEFORE formatting prompt context
        # This ensures different lessons → different curriculum context → different generated questions
        seed = request.varianceSeed if request.varianceSeed else hash(f"{request.topic}:{request.subject}:{request.lessonTitle or ''}:{request.userId or 'anon'}") % (2**32)
        rng = random.Random(seed)
        rng.shuffle(chunks)  # In-place shuffle for deterministic variety per seed

        # Format retrieved chunks for the prompt
        formatted_context = "\n\n---\n\n".join(
            f"[Source: {chunk.get('metadata', {}).get('source_file', 'Unknown')}, Page {chunk.get('metadata', {}).get('page', 'N/A')}]\n{chunk.get('document', '')}"
            for chunk in chunks
        )

        confidence = summarize_retrieval_confidence(chunks)

        # 2. Build generation prompt (QuizForge format)
        prompt = _build_quiz_generation_prompt(
            topic=request.topic,
            subject=request.subject,
            lesson_title=request.lessonTitle,
            question_count=request.questionCount,
            question_types=request.questionTypes,
            difficulty=request.difficulty,
            retrieved_context=formatted_context,
            variance_seed=request.varianceSeed,
            competency_code=request.competencyCode,
            grade_level="Grade 11/12",
            lesson_objective=request.topic,
            xp_reward=10,
            points=1,
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
