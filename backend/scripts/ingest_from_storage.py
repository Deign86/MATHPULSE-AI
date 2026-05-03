"""
Ingest curriculum PDFs from Firebase Storage into ChromaDB.
Run: python -m backend.scripts.ingest_from_storage
"""

from __future__ import annotations

import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger("mathpulse.ingest")

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend.rag.firebase_storage_loader import (
    PDF_METADATA,
    download_pdf_from_storage,
    list_curriculum_blobs,
)

_CONTENT_DOMAIN_CLASSIFIERS = [
    ("introduction", ["introduction", "welcome", "overview", "objectives", "learning objectives"]),
    ("key_concepts", ["key concepts", "key ideas", "main concepts", "definitions", "key terms"]),
    ("worked_examples", ["example", "worked example", "illustrative example", "sample problem", "solution"]),
    ("important_notes", ["important", "note", "remember", "tip", "caution", "warning", "key point"]),
    ("practice", ["practice", "exercise", "try it", "your turn", "activity", "problem set"]),
    ("summary", ["summary", "recap", "key takeaways", "wrap-up", "conclusion"]),
    ("assessment", ["assessment", "quiz", "test", "evaluation", "exam"]),
]

_CONTENT_TYPE_CLASSIFIERS = [
    ("definition", ["definition", "define", "means", "is defined as"]),
    ("formula", ["formula", "equation", "expression", "rule"]),
    ("procedure", ["step", "method", "how to", "procedure", "process"]),
    ("concept", ["concept", "idea", "principle", "theory"]),
    ("application", ["application", "use", "example", "solve", "problem"]),
]


def _classify_chunk(content: str) -> tuple[str, str]:
    content_lower = content.lower()
    content_domain = "general"
    chunk_type = "concept"

    for domain, keywords in _CONTENT_DOMAIN_CLASSIFIERS:
        if any(kw in content_lower for kw in keywords):
            content_domain = domain
            break

    for ctype, keywords in _CONTENT_TYPE_CLASSIFIERS:
        if any(kw in content_lower for kw in keywords):
            chunk_type = ctype
            break

    return content_domain, chunk_type


def _classify_lesson_section(content: str) -> str:
    content_lower = content.lower().strip()
    first_sentence = content_lower[:200]

    for domain, keywords in _CONTENT_DOMAIN_CLASSIFIERS:
        if any(kw in first_sentence for kw in keywords):
            return domain
    return "general"


def chunk_text_preserve_pages(text: str, page_starts: List[int], chunk_size: int = 500, overlap: int = 80) -> List[Dict[str, Any]]:
    """Split text into overlapping chunks, preserving page traceability."""
    words = text.split()
    chunks = []
    i = 0
    chunk_idx = 0
    while i < len(words):
        chunk_words = words[i : i + chunk_size]
        chunk_text = " ".join(chunk_words)
        estimated_page = max(1, (i // chunk_size) + 1)
        content_domain, chunk_type = _classify_chunk(chunk_text)

        chunks.append({
            "text": chunk_text,
            "chunk_index": chunk_idx,
            "estimated_page": estimated_page,
            "content_domain": content_domain,
            "chunk_type": chunk_type,
        })
        i += chunk_size - overlap
        chunk_idx += 1
    return chunks


def extract_pdf_text_and_pages(pdf_bytes: bytes) -> tuple[str, List[int]]:
    """Extract text from PDF bytes, returning full text and page start positions."""
    try:
        from pypdf import PdfReader
    except ImportError:
        try:
            import PyPDF2 as PdfReaderModule
            from PyPDF2 import PdfReader
        except ImportError:
            logger.error("No PDF library available. Install: pip install pypdf")
            return "", []

    import io
    reader = PdfReader(io.BytesIO(pdf_bytes))
    pages: List[str] = []
    for page in reader.pages:
        text = page.extract_text() or ""
        pages.append(text)

    page_starts = []
    position = 0
    for page_text in pages:
        page_starts.append(position)
        position += len(page_text) + 1

    full_text = "\n".join(pages)
    return full_text, page_starts


def get_firestore_client():
    try:
        import firebase_admin
        from firebase_admin import firestore
        if not firebase_admin._apps:
            sa_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
            sa_file = os.getenv("FIREBASE_SERVICE_ACCOUNT_FILE")
            bucket_name = os.getenv("FIREBASE_STORAGE_BUCKET", "mathpulse-ai-2026.firebasestorage.app")
            if sa_json:
                import json as _json
                from firebase_admin import credentials
                creds = credentials.Certificate(_json.loads(sa_json))
                firebase_admin.initialize_app(creds, {"storageBucket": bucket_name})
            elif sa_file and Path(sa_file).exists():
                from firebase_admin import credentials
                creds = credentials.Certificate(sa_file)
                firebase_admin.initialize_app(creds, {"storageBucket": bucket_name})
            else:
                firebase_admin.initialize_app(options={"storageBucket": bucket_name})
        return firestore.client()
    except Exception as e:
        logger.warning("Firestore unavailable: %s", e)
        return None


def ingest_from_firebase_storage(force_reindex: bool = False):
    """Download PDFs from Firebase Storage and ingest into ChromaDB."""
    try:
        from sentence_transformers import SentenceTransformer
        import chromadb
    except ImportError:
        logger.error("Missing dependencies. Install: pip install chromadb sentence-transformers pypdf")
        return

    chroma_path = os.getenv("CURRICULUM_VECTORSTORE_DIR", "datasets/vectorstore")
    chroma_client = chromadb.PersistentClient(path=chroma_path)
    collection = chroma_client.get_or_create_collection(
        name="curriculum_chunks",
        metadata={"hnsw:space": "cosine"},
    )
    embedder = SentenceTransformer("BAAI/bge-base-en-v1.5")

    db = get_firestore_client()

    logger.info("Starting ingestion from Firebase Storage...")
    ingested_count = 0
    skipped_count = 0
    error_count = 0

    for storage_path, metadata in PDF_METADATA.items():
        doc_id = storage_path.replace("/", "_").replace(".pdf", "")

        if db:
            try:
                doc_ref = db.collection("curriculumDocuments").document(doc_id)
                existing = doc_ref.get()
                if existing.exists:
                    if not force_reindex and existing.to_dict().get("status") == "ingested":
                        logger.info("[SKIP] %s already ingested", storage_path)
                        skipped_count += 1
                        continue
            except Exception as e:
                logger.warning("Firestore check failed for %s: %s", storage_path, e)

        logger.info("Downloading: %s", storage_path)
        pdf_bytes = download_pdf_from_storage(storage_path)
        if pdf_bytes is None:
            logger.error("[ERROR] Failed to download: %s", storage_path)
            if db:
                try:
                    doc_ref.set({
                        "storagePath": storage_path,
                        "status": "failed",
                        "error": "download_failed",
                        **metadata,
                    }, merge=True)
                except:
                    pass
            error_count += 1
            continue

        logger.info("Extracting text from: %s (%d bytes)", storage_path, len(pdf_bytes))
        full_text, page_starts = extract_pdf_text_and_pages(pdf_bytes)
        if not full_text.strip():
            logger.warning("[WARN] No text extracted from: %s", storage_path)
            error_count += 1
            continue

        chunks = chunk_text_preserve_pages(full_text, page_starts)
        logger.info("  -> %d chunks created", len(chunks))

        existing_ids = [cid for cid in collection.get()["ids"] if cid.startswith(f"{doc_id}_chunk_")]
        if existing_ids:
            collection.delete(ids=existing_ids)
            logger.info("  Removed %d existing chunks", len(existing_ids))

        for chunk in chunks:
            chunk_id = f"{doc_id}_chunk_{chunk['chunk_index']}"
            embedding = embedder.encode(chunk["text"], normalize_embeddings=True).tolist()

            collection.add(
                embeddings=[embedding],
                documents=[chunk["text"]],
                metadatas=[{
                    "document_id": doc_id,
                    "module_id": metadata.get("subjectId", ""),
                    "lesson_id": f"lesson-{doc_id}",
                    "title": metadata.get("subject", ""),
                    "subject": metadata.get("subject", ""),
                    "subjectId": metadata.get("subjectId", ""),
                    "quarter": metadata.get("quarter", 1),
                    "competency_code": metadata.get("competency_code", ""),
                    "content_domain": chunk["content_domain"],
                    "chunk_type": chunk["chunk_type"],
                    "source_file": storage_path.split("/")[-1],
                    "storage_path": storage_path,
                    "page": chunk["estimated_page"],
                    "chunk_index": chunk["chunk_index"],
                    "type": metadata.get("type", ""),
                }],
                ids=[chunk_id],
            )

        if db:
            try:
                doc_ref.set({
                    "id": doc_id,
                    "storagePath": storage_path,
                    "status": "ingested",
                    "ingestedAt": __import__("firebase_admin").firestore.SERVER_TIMESTAMP,
                    "chunkCount": len(chunks),
                    **metadata,
                }, merge=True)
            except Exception as e:
                logger.warning("Firestore update failed: %s", e)

        logger.info("[OK] Ingested %s (%d chunks)", storage_path, len(chunks))
        ingested_count += 1

    logger.info("=" * 50)
    logger.info("Ingestion complete: %d ingested, %d skipped, %d errors", ingested_count, skipped_count, error_count)
    logger.info("Total chunks in ChromaDB: %d", collection.count())


if __name__ == "__main__":
    import argparse
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

    parser = argparse.ArgumentParser(description="Ingest curriculum PDFs from Firebase Storage into ChromaDB")
    parser.add_argument("--force", action="store_true", help="Re-ingest even if already ingested")
    args = parser.parse_args()

    ingest_from_firebase_storage(force_reindex=args.force)