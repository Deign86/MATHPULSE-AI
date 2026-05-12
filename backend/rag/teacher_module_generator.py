from typing import List, Literal, Optional, Any, Dict
from pydantic import BaseModel
import re
import json
import logging
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)

class ExampleItem(BaseModel):
    prompt: str
    solutionSteps: list[str]
    source: Literal["teacher_file", "deped_rag", "mixed"]

class SectionItem(BaseModel):
    id: str
    title: str
    sectionType: Literal["content"]
    body: str
    keyPoints: list[str]
    examples: list[ExampleItem]

class PracticeItem(BaseModel):
    id: str
    questionType: Literal["multiple_choice", "open_ended", "numeric"]
    prompt: str
    choices: list[str] | None  # None for open_ended/numeric
    correctAnswer: str
    explanation: str
    source: Literal["teacher_file", "deped_rag", "mixed"]

class AiSafety(BaseModel):
    requiresGrounding: bool = True
    allowedModels: list[str]
    groundingSources: list[Literal["teacher_file", "deped_rag"]]

class TeacherModule(BaseModel):
    moduleId: str
    title: str
    gradeLevel: str
    subject: str
    quarter: Literal["Q1", "Q2", "Q3", "Q4", "All", "Unknown"]
    strandOrTrack: str | None
    competencyTags: list[str]
    moduleType: Literal["teacher_uploaded"] = "teacher_uploaded"
    sourceLabel: Literal["Teacher Upload"] = "Teacher Upload"
    originNote: str
    summary: str
    learningObjectives: list[str]
    sections: list[SectionItem]
    practice: list[PracticeItem]
    aiSafety: AiSafety

TEACHER_MATERIAL_MODULE_SYSTEM_PROMPT = """You are the curriculum ingestion and lesson-design assistant inside MathPulse AI, an AI-powered math education platform aligned with the Philippine DepEd curriculum. A teacher has uploaded a lesson file (PDF or DOCX).

You receive:
- COURSE_MATERIAL_TEXT: text extracted from the teacher's file.
- RAG_RESULTS: passages retrieved from the DepEd curriculum vector store that match the topic, grade level, and subject.

Your job is to output only valid JSON describing a single new teacher_uploaded module for the student-facing Curriculum Modules screen, using the exact schema provided.

Rules:
1. Do not hallucinate content. All explanations, examples, and practice questions must be clearly supported by COURSE_MATERIAL_TEXT and/or RAG_RESULTS.
2. If either source does not contain some detail, omit it or explicitly say that the detail is not available.
3. Set "moduleType": "teacher_uploaded" and "sourceLabel": "Teacher Upload".
4. Use the teacher file's topic and structure to decide the module title and sections.
5. Use DepEd passages in RAG_RESULTS only to align competencies, terminology, and phrasing with the official curriculum.
6. Do not mention RAG, embeddings, or internal system components in student-visible text.
7. Respond with JSON only, no extra text.
8. Generate realistic worked examples with step-by-step solution steps.
9. Generate practice questions that assess understanding (multiple choice preferred, with 4 choices A-D).
10. Set competencyTags based on DepEd curriculum alignment.
"""

def generate_module_id(title: str, teacher_id: str) -> str:
    # Create a stable slug from title + teacher_id + timestamp
    # e.g., "quadratic-equations-grace-math-teacher-2026-05-13"
    import unicodedata
    import time
    title_slug = unicodedata.normalize('NFKD', title).encode('ascii', 'ignore').decode('ascii').lower()
    title_slug = re.sub(r'[^a-z0-9]+', '-', title_slug).strip('-')
    timestamp = datetime.now().strftime("%Y-%m-%d")
    return f"{title_slug}-{teacher_id}-{timestamp}"

def _parse_module_json(raw: str) -> Optional[Dict[str, Any]]:
    """Robustly extract a JSON object from LLM output."""
    cleaned = raw.strip()
    # Remove markdown fences
    cleaned = re.sub(r"^```(?:json)?\s*\n?", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\n?```\s*$", "", cleaned)
    cleaned = cleaned.strip()

    # Remove reasoning blocks
    cleaned = re.sub(r"<think>[\s\S]*?</think>", "", cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Try to find a JSON object in the string
        try:
            start_idx = cleaned.find('{')
            end_idx = cleaned.rfind('}')
            if start_idx != -1 and end_idx != -1 and end_idx >= start_idx:
                json_str = cleaned[start_idx:end_idx + 1]
                return json.loads(json_str)
        except Exception:
            pass
        return None

async def generate_teacher_module(
    course_material_text: str,
    rag_results: str,
    metadata: dict
) -> TeacherModule:
    # Import inside the function to avoid circular imports if imported from main
    import sys
    import os
    # Ensure backend path is in sys.path
    if os.path.dirname(os.path.dirname(__file__)) not in sys.path:
        sys.path.append(os.path.dirname(os.path.dirname(__file__)))
    from main import call_hf_chat_async

    prompt = f"""
COURSE_MATERIAL_TEXT:
{course_material_text}

RAG_RESULTS:
{rag_results}

METADATA:
Grade Level: {metadata.get('grade_level', 'Unknown')}
Subject: {metadata.get('subject', 'Unknown')}
Quarter: {metadata.get('quarter', 'Unknown')}
Strand/Track: {metadata.get('strand', 'Unknown')}
Module Title Hint: {metadata.get('title', 'Unknown')}

Generate the module JSON according to the system prompt rules and schema.
Ensure moduleType is "teacher_uploaded" and sourceLabel is "Teacher Upload".
"""

    messages = [
        {"role": "system", "content": TEACHER_MATERIAL_MODULE_SYSTEM_PROMPT},
        {"role": "user", "content": prompt},
    ]

    logger.info(f"Generating teacher module for {metadata.get('title', 'Unknown')}")
    
    # We use a larger max_tokens because a full module with sections and practice items can be quite long.
    raw_content = await call_hf_chat_async(
        messages,
        max_tokens=8192,
        temperature=0.3,
        top_p=0.9,
        timeout=180,
        task_type="chat",
    )
    
    parsed_json = _parse_module_json(raw_content)
    
    if not parsed_json:
        logger.error(f"Failed to parse teacher module JSON. Raw content:\n{raw_content[:500]}...")
        raise ValueError("Failed to generate valid JSON for the teacher module")
        
    # Generate an ID if missing
    if "moduleId" not in parsed_json or not parsed_json["moduleId"]:
        parsed_json["moduleId"] = generate_module_id(
            parsed_json.get("title", metadata.get("title", "module")),
            metadata.get("teacher_id", "teacher")
        )
        
    try:
        # Pydantic will validate the schema
        module = TeacherModule(**parsed_json)
        return module
    except Exception as e:
        logger.error(f"Failed to validate teacher module against schema: {e}")
        logger.error(f"Parsed JSON: {json.dumps(parsed_json)[:500]}")
        raise ValueError(f"Teacher module failed schema validation: {e}")
