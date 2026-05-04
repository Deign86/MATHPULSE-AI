"""
PDF Ingestion Module for Quiz Battle RAG Question Bank.

Ingests PDFs from Firebase Storage, extracts text, chunks content,
generates embeddings, calls DeepSeek to produce base questions,
and stores results in Firestore.
"""

import asyncio
import hashlib
import io
import json
import logging
import os
import random
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

from google.cloud.firestore import Client
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
import pypdf

from rag.firebase_storage_loader import _init_firebase_storage
from services.ai_client import get_deepseek_client, CHAT_MODEL

logger = logging.getLogger(__name__)

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
DEFAULT_FIREBASE_PROJECT = os.getenv("FIREBASE_AUTH_PROJECT_ID", "mathpulse-ai-2026")


@dataclass
class IngestionResult:
    """Result of a PDF ingestion operation."""

    filename: str
    processed: bool
    question_count: int
    grade_level: int
    topic: str
    storage_path: str
    timestamp: datetime


def _extract_filename(storage_path: str) -> str:
    """Extract filename from a Firebase Storage path."""
    return storage_path.split("/")[-1]


def _generate_chunk_id(source_chunk_id: str, question_text: str) -> str:
    """Generate a unique document ID for a question."""
    return hashlib.md5(f"{source_chunk_id}:{question_text}".encode()).hexdigest()


def _strip_json_fences(text: str) -> str:
    """Strip markdown JSON fences from text."""
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()


async def _generate_questions_for_chunk(
    chunk_text: str,
    chunk_id: str,
    topic: str,
    grade_level: int,
    deepseek_client,
) -> list[dict]:
    """Call DeepSeek to generate MCQs for a text chunk."""
    system_prompt = (
        "You are a DepEd-aligned math question generator for Filipino students. "
        "Given a curriculum excerpt, generate 5 multiple-choice questions. "
        "Return ONLY a JSON array. No markdown, no explanation."
    )

    user_prompt = f"""Given this curriculum excerpt:
<chunk>
{chunk_text}
</chunk>

Generate 5 multiple-choice questions. For each question output JSON:
{{
  "question": "...",
  "choices": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "correct_answer": "A",
  "explanation": "...",
  "topic": "{topic}",
  "difficulty": "easy|medium|hard",
  "grade_level": {grade_level},
  "source_chunk_id": "{chunk_id}"
}}
Return a JSON array only, no extra text."""

    try:
        response = deepseek_client.chat.completions.create(
            model=CHAT_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
        )
        raw_response = response.choices[0].message.content
        clean_response = _strip_json_fences(raw_response)
        questions = json.loads(clean_response)
        return questions if isinstance(questions, list) else []
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse DeepSeek response as JSON for chunk {chunk_id}: {e}")
        return []
    except Exception as e:
        logger.error(f"Error calling DeepSeek for chunk {chunk_id}: {e}")
        return []


def _chunk_text(text: str) -> list[str]:
    """Split text into chunks using RecursiveCharacterTextSplitter."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        length_function=len,
        separators=["\n\n", "\n", " ", ""],
    )
    return splitter.split_text(text)


def _extract_pdf_text(pdf_bytes: bytes) -> str:
    """Extract text from PDF bytes using pypdf."""
    reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
    text_parts = []
    for page in reader.pages:
        text_parts.append(page.extract_text())
    return "\n".join(text_parts)


async def _save_questions_batch(
    firestore_client: Client,
    questions: list[dict],
    grade_level: int,
    topic: str,
) -> int:
    """Save questions to Firestore using batch writes. Returns count saved."""
    batch = firestore_client.batch()
    question_count = 0

    for question in questions:
        doc_id = question.get("id") or _generate_chunk_id(
            question.get("source_chunk_id", ""),
            question.get("question", ""),
        )
        doc_ref = firestore_client.collection("question_bank").document(
            str(grade_level)
        ).collection(topic).document("questions").collection("questions").document(doc_id)

        doc_data = {
            "question": question.get("question", ""),
            "choices": question.get("choices", []),
            "correct_answer": question.get("correct_answer", ""),
            "explanation": question.get("explanation", ""),
            "topic": question.get("topic", topic),
            "difficulty": question.get("difficulty", "medium"),
            "grade_level": question.get("grade_level", grade_level),
            "source_chunk_id": question.get("source_chunk_id", ""),
            "random_seed": random.random(),
            "created_at": datetime.now(timezone.utc),
        }
        batch.set(doc_ref, doc_data)
        question_count += 1

        if question_count % 500 == 0:
            await batch.commit()
            batch = firestore_client.batch()

    await batch.commit()
    return question_count


async def _save_embeddings_batch(
    firestore_client: Client,
    chunks: list[dict],
    filename: str,
) -> int:
    """Save chunk embeddings to Firestore. Returns count saved."""
    batch = firestore_client.batch()
    count = 0

    for chunk in chunks:
        chunk_id = chunk["id"]
        doc_ref = firestore_client.collection("question_bank_embeddings").document(chunk_id)
        doc_data = {
            "chunk_id": chunk_id,
            "text": chunk["text"],
            "embedding": chunk["embedding"],
            "filename": filename,
            "created_at": datetime.now(timezone.utc),
        }
        batch.set(doc_ref, doc_data)
        count += 1

        if count % 500 == 0:
            await batch.commit()
            batch = firestore_client.batch()

    await batch.commit()
    return count


async def _save_processing_manifest(
    firestore_client: Client,
    filename: str,
    question_count: int,
    chunk_count: int,
    grade_level: int,
    topic: str,
    storage_path: str,
) -> None:
    """Save processing manifest to Firestore."""
    doc_ref = firestore_client.collection("pdf_processing_status").document(filename)
    doc_data = {
        "filename": filename,
        "question_count": question_count,
        "chunk_count": chunk_count,
        "grade_level": grade_level,
        "topic": topic,
        "storage_path": storage_path,
        "processed_at": datetime.now(timezone.utc),
        "status": "completed",
    }
    await doc_ref.set(doc_data)


async def ingest_pdf(
    storage_path: str,
    grade_level: int,
    topic: str,
    force_reingest: bool = False,
) -> IngestionResult:
    """
    Ingest a PDF from Firebase Storage, generate questions, and store in Firestore.

    Args:
        storage_path: Path to PDF in Firebase Storage (e.g., "rag-pdfs/filename.pdf")
        grade_level: Grade level (11 or 12)
        topic: Topic identifier for the questions
        force_reingest: If True, reprocess even if already processed

    Returns:
        IngestionResult with processing summary
    """
    filename = _extract_filename(storage_path)
    project_id = os.getenv("FIREBASE_AUTH_PROJECT_ID", DEFAULT_FIREBASE_PROJECT)
    firestore_client = Client(project=project_id)

    # Step 1: Check if already processed
    if not force_reingest:
        status_ref = firestore_client.collection("pdf_processing_status").document(filename)
        status_doc = await status_ref.get()
        if status_doc.exists:
            logger.info(f"PDF {filename} already processed, skipping (use force_reingest=True to override)")
            data = status_doc.to_dict() or {}
            return IngestionResult(
                filename=filename,
                processed=True,
                question_count=data.get("question_count", 0),
                grade_level=data.get("grade_level", grade_level),
                topic=data.get("topic", topic),
                storage_path=data.get("storage_path", storage_path),
                timestamp=data.get("timestamp", datetime.now(timezone.utc)),
            )

    # Step 2: Download PDF from Firebase Storage
    try:
        _, bucket = _init_firebase_storage()
        blob = bucket.blob(storage_path)
        pdf_bytes = blob.download_as_bytes()
    except Exception as e:
        logger.error(f"Failed to download PDF from Firebase Storage: {e}")
        return IngestionResult(
            filename=filename,
            processed=False,
            question_count=0,
            grade_level=grade_level,
            topic=topic,
            storage_path=storage_path,
            timestamp=datetime.now(timezone.utc),
        )

    # Step 3: Extract text from PDF
    try:
        text = _extract_pdf_text(pdf_bytes)
    except Exception as e:
        logger.error(f"Failed to extract text from PDF: {e}")
        return IngestionResult(
            filename=filename,
            processed=False,
            question_count=0,
            grade_level=grade_level,
            topic=topic,
            storage_path=storage_path,
            timestamp=datetime.now(timezone.utc),
        )

    # Step 4: Chunk text
    chunks = _chunk_text(text)

    # Step 5: Generate embeddings
    embedding_model = SentenceTransformer(EMBEDDING_MODEL)
    chunk_ids = []
    chunk_data = []

    for i, chunk_text in enumerate(chunks):
        chunk_id = hashlib.md5(f"{filename}:{i}:{chunk_text[:100]}".encode()).hexdigest()
        embedding = embedding_model.encode(chunk_text).tolist()
        chunk_ids.append(chunk_id)
        chunk_data.append({
            "id": chunk_id,
            "text": chunk_text,
            "embedding": embedding,
        })

    # Step 6: Initialize DeepSeek client
    deepseek_client = get_deepseek_client()

    # Step 7: Generate questions for each chunk
    all_questions = []
    for i, chunk_text in enumerate(chunks):
        chunk_id = chunk_ids[i]
        questions = await _generate_questions_for_chunk(
            chunk_text, chunk_id, topic, grade_level, deepseek_client
        )
        for q in questions:
            q["id"] = _generate_chunk_id(chunk_id, q.get("question", ""))
        all_questions.extend(questions)

    # Step 8: Save questions to Firestore
    question_count = await _save_questions_batch(
        firestore_client, all_questions, grade_level, topic
    )

    # Step 9: Save embeddings to Firestore
    await _save_embeddings_batch(firestore_client, chunk_data, filename)

    # Step 10: Save manifest to Firestore
    await _save_processing_manifest(
        firestore_client, filename, question_count, len(chunks),
        grade_level, topic, storage_path
    )

    logger.info(
        f"Completed ingestion for {filename}: {question_count} questions, "
        f"{len(chunks)} chunks"
    )

    return IngestionResult(
        filename=filename,
        processed=True,
        question_count=question_count,
        grade_level=grade_level,
        topic=topic,
        storage_path=storage_path,
        timestamp=datetime.now(timezone.utc),
    )
