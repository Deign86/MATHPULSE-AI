"""
PDF Pipeline Router — Auto-generate modules & lessons from uploaded PDFs.

Pipeline stages:
1. Download PDF from Firebase Storage
2. Extract text with PyMuPDF
3. Chunk text (400 tokens approx, 80 overlap)
4. Embed chunks with SentenceTransformer
5. Store chunks in Firestore rag_chunks + ChromaDB curriculum_chunks
6. Call LLM to extract module/lesson structure
7. Write dynamic_modules and dynamic_lessons docs
8. Update job status throughout
"""

import os
import re
import json
import uuid
import logging
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import fitz
from firebase_admin import firestore, storage as fb_storage
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings

from services.inference_client import InferenceRequest, create_default_client

router = APIRouter(prefix="/pdf-pipeline", tags=["pdf-pipeline"])
logger = logging.getLogger(__name__)

db = firestore.client()

_inference_client = None
_embedder = None
_chroma_collection = None


def _get_inference_client():
    global _inference_client
    if _inference_client is None:
        _inference_client = create_default_client()
    return _inference_client


def _get_embedder():
    global _embedder
    if _embedder is None:
        _embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    return _embedder


def _get_chroma_collection():
    global _chroma_collection
    if _chroma_collection is None:
        persist_dir = os.getenv("CURRICULUM_VECTORSTORE_DIR", "datasets/vectorstore")
        client = chromadb.PersistentClient(
            path=persist_dir,
            settings=Settings(anonymized_telemetry=False),
        )
        _chroma_collection = client.get_or_create_collection(
            name="curriculum_chunks",
            metadata={"hnsw:space": "cosine"},
        )
    return _chroma_collection


CHUNK_SIZE = 400
CHUNK_OVERLAP = 80


class PipelineRequest(BaseModel):
    jobId: str
    storagePath: str
    downloadURL: str
    subjectTag: str
    gradeLevel: str
    fileName: str


def update_job(job_id: str, patch: dict):
    db.collection("pdf_processing_jobs").document(job_id).update(
        {**patch, "updatedAt": firestore.SERVER_TIMESTAMP}
    )


def download_pdf_bytes(storage_path: str) -> bytes:
    bucket = fb_storage.bucket()
    blob = bucket.blob(storage_path)
    return blob.download_as_bytes()


def extract_text_pages(pdf_bytes: bytes) -> List[str]:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    return [page.get_text("text") for page in doc]


def chunk_text(pages: List[str]) -> List[Dict[str, Any]]:
    chunks = []
    for page_num, text in enumerate(pages):
        words = text.split()
        i = 0
        while i < len(words):
            chunk_words = words[i : i + CHUNK_SIZE]
            chunk_text_str = " ".join(chunk_words).strip()
            if len(chunk_text_str) > 60:
                chunks.append({
                    "text": chunk_text_str,
                    "page": page_num + 1,
                    "chunk_index": len(chunks),
                })
            i += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks


def embed_and_store_chunks(
    chunks: List[Dict[str, Any]],
    job_id: str,
    module_id: str,
    subject_tag: str,
) -> List[str]:
    chunk_ids = []
    texts = [c["text"] for c in chunks]
    vectors = _get_embedder().encode(texts, batch_size=32, show_progress_bar=False).tolist()

    batch = db.batch()
    for chunk, vector in zip(chunks, vectors):
        chunk_id = f"{module_id}-chunk-{chunk['chunk_index']}"
        ref = db.collection("rag_chunks").document(chunk_id)
        batch.set(ref, {
            "chunkId": chunk_id,
            "moduleId": module_id,
            "jobId": job_id,
            "text": chunk["text"],
            "page": chunk["page"],
            "embedding": vector,
            "createdAt": firestore.SERVER_TIMESTAMP,
        })
        chunk_ids.append(chunk_id)
        if len(chunk_ids) % 400 == 0:
            batch.commit()
            batch = db.batch()

    batch.commit()

    chroma_collection = _get_chroma_collection()
    chroma_collection.add(
        ids=chunk_ids,
        documents=[c["text"] for c in chunks],
        embeddings=vectors,
        metadatas=[{
            "moduleId": module_id,
            "subject": subject_tag,
            "source": "dynamic",
            "jobId": job_id,
            "page": c["page"],
        } for c in chunks],
    )

    return chunk_ids


SCHEMA_JSON = """{
  "moduleTitle": "string",
  "moduleDescription": "string",
  "subject": "SUBJECT_TAG",
  "gradeLevel": "GRADE_LEVEL",
  "lessons": [
    {
      "title": "string",
      "duration": "string (e.g. '25 min')",
      "overview": "string (2-3 sentences)",
      "objectives": ["string"],
      "keyTerms": [{"term": "string", "definition": "string"}],
      "exampleProblems": [{"problem": "string", "steps": ["string"], "answer": "string"}],
      "practiceItems": [{"question": "string", "answer": "string"}]
    }
  ]
}"""


async def llm_generate_structure(
    full_text: str,
    subject_tag: str,
    grade_level: str,
    file_name: str,
) -> dict:
    schema = SCHEMA_JSON.replace("SUBJECT_TAG", subject_tag).replace("GRADE_LEVEL", grade_level)
    prompt = (
        "You are a DepEd curriculum expert. Given the following extracted PDF content, "
        "generate a structured JSON for a math learning module.\n\n"
        f"PDF FILENAME: {file_name}\n"
        f"SUBJECT: {subject_tag}\n"
        f"GRADE: {grade_level}\n\n"
        f"PDF CONTENT (first 6000 chars):\n{full_text[:6000]}\n\n"
        f"Return ONLY valid JSON in this exact schema:\n{schema}"
    )

    request = InferenceRequest(
        messages=[
            {"role": "system", "content": "You are a precise DepEd-aligned curriculum assistant."},
            {"role": "user", "content": prompt},
        ],
        task_type="lesson_generation",
        max_new_tokens=2048,
        temperature=0.3,
        top_p=0.9,
        enable_thinking=False,
    )
    raw = _get_inference_client().generate_from_messages(request)

    json_match = re.search(r"\{[\s\S]*\}", raw)
    if not json_match:
        raise ValueError("LLM did not return valid JSON structure")
    return json.loads(json_match.group())


def write_module_and_lessons(
    structure: dict,
    module_id: str,
    job_id: str,
    chunk_ids: List[str],
    subject_tag: str,
    grade_level: str,
) -> List[str]:
    batch = db.batch()

    module_ref = db.collection("dynamic_modules").document(module_id)
    batch.set(module_ref, {
        "moduleId": module_id,
        "title": structure["moduleTitle"],
        "description": structure.get("moduleDescription", ""),
        "subject": structure.get("subject", subject_tag),
        "gradeLevel": structure.get("gradeLevel", grade_level),
        "subjectId": subject_tag,
        "lessonCount": len(structure.get("lessons", [])),
        "chunkIds": chunk_ids,
        "jobId": job_id,
        "status": "published",
        "createdAt": firestore.SERVER_TIMESTAMP,
    })

    lesson_ids = []
    for i, lesson in enumerate(structure.get("lessons", [])):
        lesson_id = f"{module_id}-lesson-{i + 1}"
        lesson_ref = db.collection("dynamic_lessons").document(lesson_id)
        batch.set(lesson_ref, {
            "lessonId": lesson_id,
            "moduleId": module_id,
            "order": i + 1,
            "title": lesson["title"],
            "duration": lesson.get("duration", "30 min"),
            "overview": lesson.get("overview", ""),
            "objectives": lesson.get("objectives", []),
            "keyTerms": lesson.get("keyTerms", []),
            "exampleProblems": lesson.get("exampleProblems", []),
            "practiceItems": lesson.get("practiceItems", []),
            "locked": False,
            "completed": False,
            "createdAt": firestore.SERVER_TIMESTAMP,
        })
        lesson_ids.append(lesson_id)

    batch.commit()
    return lesson_ids


@router.post("/process")
async def process_pdf(req: PipelineRequest):
    job_id = req.jobId
    module_id = f"dyn-{uuid.uuid4().hex[:12]}"

    try:
        update_job(job_id, {"status": "downloading", "stage": "Downloading PDF"})
        pdf_bytes = download_pdf_bytes(req.storagePath)

        update_job(job_id, {"status": "extracting", "stage": "Extracting text from PDF"})
        pages = extract_text_pages(pdf_bytes)
        full_text = "\n".join(pages)

        if len(full_text.strip()) < 100:
            raise ValueError("PDF appears to have no extractable text (possibly scanned image)")

        update_job(job_id, {"status": "chunking", "stage": "Chunking text"})
        chunks = chunk_text(pages)

        update_job(job_id, {"status": "embedding", "stage": f"Embedding {len(chunks)} chunks"})
        chunk_ids = embed_and_store_chunks(chunks, job_id, module_id, req.subjectTag)

        update_job(job_id, {"status": "generating", "stage": "Generating module structure with AI"})
        structure = await llm_generate_structure(
            full_text, req.subjectTag, req.gradeLevel, req.fileName
        )

        update_job(job_id, {"status": "writing", "stage": "Writing module to database"})
        write_module_and_lessons(structure, module_id, job_id, chunk_ids, req.subjectTag, req.gradeLevel)

        update_job(job_id, {
            "status": "completed",
            "stage": "Done",
            "generatedModuleId": module_id,
            "generatedModuleTitle": structure["moduleTitle"],
        })

        return {"success": True, "moduleId": module_id, "title": structure["moduleTitle"]}

    except Exception as e:
        logger.exception("PDF pipeline failed for job %s", job_id)
        update_job(job_id, {"status": "failed", "errorMessage": str(e)})
        raise HTTPException(status_code=500, detail=str(e))
