"""
Teacher-uploaded course material ingestion router.

POST /api/teacher-materials/upload
- Parses PDF/DOCX/TXT files
- Retrieves DepEd RAG context
- Generates a teacher_uploaded curriculum module via DeepSeek
- Stores module in Firestore `modules` collection
- Indexes chunks in teacher-materials vector store
"""

from __future__ import annotations

import hashlib
import io
import json
import logging
import os
import re
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request
from fastapi import File, Form, UploadFile
from pydantic import BaseModel, Field

logger = logging.getLogger("mathpulse.teacher_materials")

router = APIRouter(prefix="/api/teacher-materials", tags=["teacher-materials"])

# ─── Request/Response Models ───────────────────────────────────────────────────


class TeacherMaterialUploadResponse(BaseModel):
    success: bool
    moduleId: Optional[str] = None
    title: Optional[str] = None
    message: str
    error: Optional[str] = None


class TeacherMaterialMetadata(BaseModel):
    teacherId: str
    classId: Optional[str] = None
    gradeLevel: Optional[str] = None
    subject: Optional[str] = None
    quarter: Optional[str] = None
    strandOrTrack: Optional[str] = None


# ─── Deps (import lazily so main.py doesn't break at startup before deps exist) ─

_firebase_firestore = None


def _get_firestore():
    global _firebase_firestore
    if _firebase_firestore is None:
        try:
            from firebase_admin import firestore as ff

            _firebase_firestore = ff
        except Exception:
            _firebase_firestore = None
    return _firebase_firestore


def _get_firestore_client():
    fs = _get_firestore()
    if fs is None:
        return None
    return fs.Client()


# ─── Helpers ─────────────────────────────────────────────────────────────────

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def _compute_file_hash(contents: bytes) -> str:
    return hashlib.sha256(contents).hexdigest()


def _generate_module_id(title: str, teacher_id: str) -> str:
    """Create a stable slug from title + teacher_id + short UUID."""
    clean = re.sub(r"[^a-zA-Z0-9\s]", "", title.lower())
    slug = "-".join(clean.split())[:40]
    uid_part = uuid.uuid4().hex[:6]
    return f"{slug}-{teacher_id[:8]}-{uid_part}"


# ─── File Parsing (mirrors existing /api/upload/course-materials patterns) ─────


def _parse_pdf(contents: bytes) -> tuple[str, List[str]]:
    """Extract text + headings from PDF using pdfplumber."""
    import pdfplumber

    outlines: List[str] = []
    page_texts: List[str] = []

    with pdfplumber.open(io.BytesIO(contents)) as pdf:
        for page in pdf.pages:
            # Extract headings from pdfplumber's extracted words
            text = page.extract_text() or ""
            if text.strip():
                page_texts.append(text)
            # Try to get outlines/headings
            try:
                outline_pages = page.outline
                if outline_pages:
                    for item in outline_pages:
                        if isinstance(item, dict):
                            title = item.get("title", "")
                            if title.strip():
                                outlines.append(title.strip())
                        elif isinstance(item, list):
                            for sub in item:
                                if isinstance(sub, dict):
                                    title = sub.get("title", "")
                                    if title.strip():
                                        outlines.append(title.strip())
            except Exception:
                pass

    text = "\n\n".join(page_texts)
    text = re.sub(r"\s+", " ", text).strip()
    return text, outlines


def _parse_docx(contents: bytes) -> tuple[str, List[str]]:
    """Extract text + headings from DOCX using python-docx."""
    import docx

    outlines: List[str] = []
    paragraphs: List[str] = []

    doc = docx.Document(io.BytesIO(contents))
    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue
        # Extract heading-style paragraphs
        if para.style.name and para.style.name.startswith("Heading"):
            outlines.append(text)
        paragraphs.append(text)

    text = "\n\n".join(paragraphs)
    text = re.sub(r"\s+", " ", text).strip()
    return text, outlines


def _parse_txt(contents: bytes) -> tuple[str, List[str]]:
    """Treat as plain text."""
    text = contents.decode("utf-8", errors="ignore")
    text = re.sub(r"\s+", " ", text).strip()
    return text, []


def _parse_uploaded_file(
    contents: bytes, filename: str
) -> tuple[str, int, dict]:
    """Parse uploaded file — returns (text, char_count, metadata_dict).

    Called both by the route handler and in tests (patched)."""
    ext = os.path.splitext(filename)[1].lower()
    if ext == ".pdf":
        text, outlines = _parse_pdf(contents)
    elif ext == ".docx":
        text, outlines = _parse_docx(contents)
    elif ext == ".txt":
        text, outlines = _parse_txt(contents)
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {ext}. Use .pdf, .docx, or .txt",
        )
    return text, len(text), {"ext": ext.replace(".", ""), "outlines": outlines}


# ─── RAG Context Retrieval ────────────────────────────────────────────────────


def _retrieve_rag_context(
    query: str, grade_level: Optional[str] = None, top_k: int = 5
) -> str:
    """
    Retrieve relevant DepEd curriculum passages via the existing RAG pipeline.
    Falls back to empty string if RAG is unavailable.
    """
    try:
        from rag.curriculum_rag import retrieve_curriculum_context

        result = retrieve_curriculum_context(
            query=query,
            grade_level=grade_level or "",
            top_k=top_k,
        )
        if isinstance(result, dict):
            # New format with metadata + chunks
            chunks = result.get("chunks", [])
            formatted = []
            for chunk in chunks:
                src = chunk.get("source", "unknown")
                text = chunk.get("text", "")
                if text:
                    formatted.append(f"[Source: {src}]\n{text}")
            return "\n\n---\n\n".join(formatted)
        elif isinstance(result, str):
            return result
        else:
            return str(result)
    except Exception as e:
        logger.warning(f"RAG retrieval failed: {e}")
        return ""


async def _generate_teacher_module(
    course_material_text: str,
    rag_results: str,
    metadata: Dict[str, Any],
) -> Dict[str, Any]:
    """Async wrapper delegating to _generate_module_via_deepseek.

    Exists as a stable patch target for tests and future override points.
    """
    return await _generate_module_via_deepseek(course_material_text, rag_results, metadata)


# ─── DeepSeek Module Generation ───────────────────────────────────────────────


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
8. Generate realistic worked examples with step-by-step solution steps (show reasoning clearly).
9. Generate practice questions that assess understanding (multiple choice preferred, with 4 choices A-D labeled with the choice text, not just letters).
10. Set competencyTags based on DepEd curriculum alignment.
11. Module title should be short and student-friendly (max 80 chars).
12. Each section's body should be 2-4 paragraphs of explanatory content.
13. Include at least 2 sections and 3 practice questions for a complete module.
"""


async def _generate_module_via_deepseek(
    course_material_text: str,
    rag_results: str,
    metadata: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Call DeepSeek to generate a teacher-uploaded module JSON.
    Returns the parsed JSON dict or raises an exception.
    """
    # Build the user prompt
    rag_section = f"\n\nRAG_RESULTS:\n{rag_results}" if rag_results else "\n\nRAG_RESULTS: (no relevant DepEd passages found — use only the teacher file content)"

    user_prompt = f"""COURSE_MATERIAL_TEXT:
{course_material_text[:8000]}

{rag_section}

Grade Level: {metadata.get('gradeLevel', 'Not specified')}
Subject: {metadata.get('subject', 'Not specified')}
Quarter: {metadata.get('quarter', 'Not specified')}
Strand/Track: {metadata.get('strandOrTrack', 'Not specified')}

Generate a teacher_uploaded module JSON following this exact schema:
{{
  "moduleId": "string (unique slug based on title + teacher)",
  "title": "string (max 80 chars, student-friendly)",
  "gradeLevel": "string (e.g. 'Grade 11')",
  "subject": "string (e.g. 'General Mathematics')",
  "quarter": "Q1 | Q2 | Q3 | Q4 | All | Unknown",
  "strandOrTrack": "string (e.g. 'STEM', 'ABM', 'HUMSS', or null)",
  "competencyTags": ["short phrase 1", "short phrase 2"],
  "moduleType": "teacher_uploaded",
  "sourceLabel": "Teacher Upload",
  "originNote": "1-2 sentence note about origin and grounding for teachers",
  "summary": "2-3 sentence overview for students",
  "learningObjectives": ["Objective 1", "Objective 2", "Objective 3"],
  "sections": [
    {{
      "id": "string-section-id",
      "title": "Section title",
      "sectionType": "content",
      "body": "Explanatory text (2-4 paragraphs)",
      "keyPoints": ["Key idea 1", "Key idea 2"],
      "examples": [
        {{
          "prompt": "Worked example or guided problem statement",
          "solutionSteps": ["Step 1...", "Step 2...", "Step 3..."],
          "source": "teacher_file | deped_rag | mixed"
        }}
      ]
    }}
  ],
  "practice": [
    {{
      "id": "string-practice-id",
      "questionType": "multiple_choice | open_ended | numeric",
      "prompt": "Question text",
      "choices": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctAnswer": "A",
      "explanation": "Short explanation of why this is correct",
      "source": "teacher_file | deped_rag | mixed"
    }}
  ],
  "aiSafety": {{
    "requiresGrounding": true,
    "allowedModels": ["deepseek-chat"],
    "groundingSources": ["teacher_file", "deped_rag"]
  }}
}}

Respond with JSON only, no markdown or extra text."""

    messages = [
        {"role": "system", "content": TEACHER_MATERIAL_MODULE_SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

    try:
        # Call DeepSeek via inference_client (test-friendly patch target)
        from services.inference_client import call_hf_chat_async  # type: ignore[import-not-found]
        raw_response = await call_hf_chat_async(
            messages=messages,
            max_tokens=4096,
            temperature=0.3,
            task_type="chat",
        )

        # Parse JSON from response
        json_start = raw_response.find("{")
        json_end = raw_response.rfind("}") + 1
        if json_start < 0 or json_end <= json_start:
            raise ValueError(f"Could not find JSON in DeepSeek response: {raw_response[:200]}")

        module_json = json.loads(raw_response[json_start:json_end])
        return module_json

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse DeepSeek module JSON: {e}\nRaw: {raw_response[:500]}")
        raise
    except Exception as e:
        logger.error(f"DeepSeek module generation failed: {e}")
        raise


# ─── Module Persistence ───────────────────────────────────────────────────────


def _persist_teacher_module(
    module_data: Dict[str, Any],
    teacher_id: str,
    material_id: str,
) -> bool:
    """Store the generated module in Firestore `modules` collection."""
    fs = _get_firestore()
    if fs is None:
        logger.warning("Firestore unavailable; module not persisted")
        return False

    try:
        db = _get_firestore_client()
        if db is None:
            return False

        module_id = module_data.get("moduleId", material_id)
        doc_ref = db.collection("modules").document(module_id)

        doc_payload = {
            **module_data,
            "teacherId": teacher_id,
            "materialId": material_id,
            "createdAt": fs.SERVER_TIMESTAMP,
            "updatedAt": fs.SERVER_TIMESTAMP,
        }

        doc_ref.set(doc_payload, merge=True)
        logger.info(f"Teacher module persisted: {module_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to persist teacher module: {e}")
        return False


# ─── Vector Indexing ───────────────────────────────────────────────────────────


def _index_teacher_material_chunks(
    material_id: str,
    module_id: str,
    text: str,
    metadata: Dict[str, Any],
) -> bool:
    """
    Chunk the teacher material text and add to the teacher-materials vector index.
    Creates a separate index from the DepEd curriculum index.
    """
    try:
        from rag.teacher_material_ingestion import chunk_text, ingest_teacher_material

        # Chunk the raw text (outline is empty here since we already extracted it)
        chunks = chunk_text(text, outline=[], chunk_size=500)

        chunk_metadata = {
            "material_id": material_id,
            "module_id": module_id,
            "teacher_id": metadata.get("teacherId", ""),
            "grade_level": metadata.get("gradeLevel", ""),
            "subject": metadata.get("subject", ""),
            "title": metadata.get("title", ""),
        }

        ingest_teacher_material(material_id, chunks, chunk_metadata)
        logger.info(f"Indexed {len(chunks)} chunks for teacher material {material_id}")
        return True
    except ImportError:
        # Wave 1A hasn't created teacher_material_ingestion yet
        logger.warning("teacher_material_ingestion not available yet; skipping indexing")
        return False
    except Exception as e:
        logger.warning(f"Failed to index teacher material chunks: {e}")
        return False


# ─── API Endpoint ──────────────────────────────────────────────────────────────


@router.post("/upload")
async def upload_teacher_material(
    request: Request,
    file: UploadFile = File(...),
    teacherId: Optional[str] = Form(default=None),
    classId: Optional[str] = Form(default=None),
    gradeLevel: Optional[str] = Form(default=None),
    subject: Optional[str] = Form(default=None),
    quarter: Optional[str] = Form(default=None),
    strandOrTrack: Optional[str] = Form(default=None),
) -> TeacherMaterialUploadResponse:
    """
    Upload a course material file (PDF/DOCX/TXT) and generate a student-facing
    curriculum module grounded in the uploaded content + DepEd curriculum RAG.

    Steps:
    1. Parse file (extract text + headings)
    2. Retrieve DepEd RAG context
    3. Generate module JSON via DeepSeek
    4. Persist module to Firestore `modules` collection
    5. Index chunks in teacher-materials vector store
    """
    try:
        # ── Auth check ──────────────────────────────────────────────────────────
        try:
            from main import get_current_user

            user = get_current_user(request)
        except Exception:
            raise HTTPException(status_code=401, detail="Authentication required")

        if user.role not in ("teacher", "admin"):
            raise HTTPException(status_code=403, detail="Forbidden for this role")

        effective_teacher_id = teacherId or user.uid

        # ── File validation ─────────────────────────────────────────────────────
        contents = await file.read(MAX_FILE_SIZE + 1)
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Max allowed size is {MAX_FILE_SIZE // (1024 * 1024)} MB.",
            )

        filename = file.filename or "unnamed"
        ext = os.path.splitext(filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format: {ext}. Use .pdf, .docx, or .txt",
            )

        content_type = (file.content_type or "").lower()
        if content_type and content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported content type: {content_type}",
            )

        # ── Parse file ─────────────────────────────────────────────────────────
        extracted_text, _char_count, parsed_meta = _parse_uploaded_file(contents, filename)
        file_type = parsed_meta.get("ext", "")
        if not extracted_text.strip():
            raise HTTPException(
                status_code=400,
                detail="No readable text found in the uploaded file",
            )

        # ── Generate material ID ───────────────────────────────────────────────
        file_hash = _compute_file_hash(contents)
        dedup_seed = f"teacher-module|{effective_teacher_id}|{file_hash}"
        material_id = hashlib.sha1(dedup_seed.encode("utf-8")).hexdigest()[:28]

        # ── RAG retrieval ────────────────────────────────────────────────────
        # Build query from file text (first 500 chars as topic query)
        query_text = extracted_text[:500]
        rag_context = _retrieve_rag_context(
            query=query_text,
            grade_level=gradeLevel,
            top_k=5,
        )

        # ── Build metadata for generation ────────────────────────────────────
        gen_metadata: Dict[str, Any] = {
            "teacherId": effective_teacher_id,
            "classId": classId,
            "gradeLevel": gradeLevel or "Grade 11",
            "subject": subject or "Mathematics",
            "quarter": quarter or "All",
            "strandOrTrack": strandOrTrack,
            "fileName": filename,
            "fileType": file_type,
        }

        # ── Generate module via DeepSeek ─────────────────────────────────────
        try:
            module_data = await _generate_teacher_module(
                course_material_text=extracted_text,
                rag_results=rag_context,
                metadata=gen_metadata,
            )
        except Exception as gen_err:
            logger.error(f"Module generation failed: {gen_err}")
            return TeacherMaterialUploadResponse(
                success=False,
                message="Module generation failed. Please try again.",
                error=str(gen_err),
            )

        # Ensure required fields
        if not module_data.get("moduleId"):
            module_data["moduleId"] = _generate_module_id(
                module_data.get("title", filename),
                effective_teacher_id,
            )

        module_id = module_data["moduleId"]

        # ── Persist module to Firestore ────────────────────────────────────────
        persisted = _persist_teacher_module(module_data, effective_teacher_id, material_id)
        if not persisted:
            logger.warning(f"Module not persisted to Firestore (ID: {module_id})")

        # ── Index chunks in vector store ──────────────────────────────────────
        _index_teacher_material_chunks(
            material_id=material_id,
            module_id=module_id,
            text=extracted_text,
            metadata={
                **gen_metadata,
                "title": module_data.get("title", filename),
            },
        )

        return TeacherMaterialUploadResponse(
            success=True,
            moduleId=module_id,
            title=module_data.get("title", filename),
            message="Teacher module created and available to students.",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Teacher material upload failed: {e}")
        return TeacherMaterialUploadResponse(
            success=False,
            message="An unexpected error occurred during processing.",
            error=str(e),
        )
