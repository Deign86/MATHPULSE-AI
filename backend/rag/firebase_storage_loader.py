"""
Firebase Storage PDF loader for curriculum ingestion.
Downloads PDFs from Firebase Storage and extracts text for ChromaDB indexing.
"""

from __future__ import annotations

import datetime
import logging
import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger("mathpulse.fb_storage_loader")

_FIREBASE_INITIALIZED = False


def _init_firebase_storage() -> Tuple[any, any]:
    global _FIREBASE_INITIALIZED

    if _FIREBASE_INITIALIZED:
        try:
            from firebase_admin import storage as fb_storage
            bucket = fb_storage.bucket()
            return fb_storage, bucket
        except Exception as e:
            logger.warning("Firebase storage unavailable: %s", e)
            _FIREBASE_INITIALIZED = False
            return None, None

    try:
        import firebase_admin
        from firebase_admin import credentials, storage
    except ImportError:
        logger.warning("firebase_admin not installed")
        return None, None

    if firebase_admin._apps:
        _FIREBASE_INITIALIZED = True
        try:
            bucket = storage.bucket()
            return storage, bucket
        except Exception as e:
            logger.warning("Firebase storage bucket unavailable: %s", e)
            return None, None

    sa_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    sa_file = os.getenv("FIREBASE_SERVICE_ACCOUNT_FILE")
    bucket_name = os.getenv("FIREBASE_STORAGE_BUCKET", "mathpulse-ai-2026.firebasestorage.app")

    try:
        if sa_json:
            import json as _json
            creds = credentials.Certificate(_json.loads(sa_json))
        elif sa_file and Path(sa_file).exists():
            creds = credentials.Certificate(sa_file)
        else:
            creds = credentials.ApplicationDefault()

        firebase_admin.initialize_app(creds, {"storageBucket": bucket_name})
        _FIREBASE_INITIALIZED = True
        bucket = storage.bucket()
        return storage, bucket
    except Exception as e:
        logger.warning("Firebase init failed: %s", e)
        return None, None


def download_pdf_from_storage(storage_path: str, dest_path: Optional[str] = None) -> Optional[bytes]:
    """Download a PDF from Firebase Storage and return its bytes."""
    _, bucket = _init_firebase_storage()
    if bucket is None:
        logger.warning("Firebase Storage not available, skipping download")
        return None

    try:
        blob = bucket.blob(storage_path)
        if not blob.exists():
            logger.warning("Blob does not exist: %s", storage_path)
            return None
        bytes_data = blob.download_as_bytes()
        logger.info("Downloaded %s (%d bytes)", storage_path, len(bytes_data))

        if dest_path:
            Path(dest_path).parent.mkdir(parents=True, exist_ok=True)
            with open(dest_path, "wb") as f:
                f.write(bytes_data)
            logger.info("Saved to %s", dest_path)

        return bytes_data
    except Exception as e:
        logger.error("Failed to download %s: %s", storage_path, e)
        return None


def list_curriculum_blobs(prefix: str = "curriculum/") -> List[Dict[str, str]]:
    """List all blobs under a prefix in Firebase Storage."""
    _, bucket = _init_firebase_storage()
    if bucket is None:
        return []

    blobs = bucket.list_blobs(prefix=prefix)
    result = []
    for blob in blobs:
        if blob.name.endswith(".pdf"):
            result.append({
                "name": blob.name,
                "size": blob.size,
                "updated": str(blob.updated) if blob.updated else None,
                "download_url": f"https://storage.googleapis.com/{bucket.name}/{blob.name}",
            })
    return result


# NOTE: Curriculum guide PDFs (shaping papers) are stored in Firebase Storage
# for system reference but are NOT included in RAG ingestion because they
# contain only learning objectives and course descriptions — insufficient
# content for lesson generation (typically <10 chunks each).
#
# Only SDO teaching modules (full lesson content with examples and problems)
# are included in the RAG pipeline.

PDF_METADATA: Dict[str, dict] = {
    # General Mathematics — SDO Navotas teaching module (100 pages, ~125k chars)
    "curriculum/gen_math_sdo/SDO_Navotas_Gen.Math_SHS_1stSem.FV.pdf": {
        "subject": "General Mathematics",
        "subjectId": "gen-math",
        "type": "sdo_module",
        "content_domain": "general",
        "quarter": 1,
        "storage_path": "curriculum/gen_math_sdo/SDO_Navotas_Gen.Math_SHS_1stSem.FV.pdf",
    },
    # Business Mathematics — SDO Navotas teaching module (100 pages, ~145k chars)
    "curriculum/business_math/SDO_Navotas_Bus.Math_SHS_1stSem.FV.pdf": {
        "subject": "Business Mathematics",
        "subjectId": "business-math",
        "type": "sdo_module",
        "content_domain": "business",
        "quarter": 1,
        "storage_path": "curriculum/business_math/SDO_Navotas_Bus.Math_SHS_1stSem.FV.pdf",
    },
    # Statistics and Probability — SDO Navotas teaching module (100 pages, ~156k chars)
    "curriculum/stat_prob/SDO_Navotas_STAT_PROB_SHS_1stSem.FV.pdf": {
        "subject": "Statistics and Probability",
        "subjectId": "stats-prob",
        "type": "sdo_module",
        "content_domain": "statistics",
        "quarter": 1,
        "storage_path": "curriculum/stat_prob/SDO_Navotas_STAT_PROB_SHS_1stSem.FV.pdf",
    },
}


def generate_signed_download_url(storage_path: str, expiration_hours: int = 24) -> Optional[str]:
    """Generate a signed download URL for a Firebase Storage blob.

    Args:
        storage_path: The path of the blob in Firebase Storage.
        expiration_hours: Number of hours until the URL expires (default 24).

    Returns:
        Signed URL string, or None if Firebase Storage is unavailable.
    """
    _, bucket = _init_firebase_storage()
    if bucket is None:
        logger.warning("Firebase Storage not available, cannot generate signed URL")
        return None

    try:
        blob = bucket.blob(storage_path)
        signed_url = blob.generate_signed_url(
            expiration=datetime.timedelta(hours=expiration_hours),
            method="GET",
        )
        logger.info("Generated signed URL for %s (expires in %dh)", storage_path, expiration_hours)
        return signed_url
    except Exception as e:
        logger.error("Failed to generate signed URL for %s: %s", storage_path, e)
        return None


def get_study_materials_from_chunks(chunks: list[dict]) -> list[dict]:
    """Extract study materials from chunks, deduplicating by source PDF.

    Args:
        chunks: List of chunk dicts with optional `source_file`, `storage_path`,
               and `content_domain` keys.

    Returns:
        List of dicts with keys: `title`, `source_pdf_url`, `topic_match`.
    """
    seen_sources: set[str] = set()
    materials: list[dict] = []

    for chunk in chunks:
        source = chunk.get("source_file")
        if not source or source in seen_sources:
            continue
        seen_sources.add(source)

        # Look up PDF metadata by storage_path
        metadata = PDF_METADATA.get(source)
        if metadata:
            title = metadata.get("subject", source)
            topic_match = metadata.get("content_domain", chunk.get("content_domain", ""))
        else:
            title = source.split("/")[-1]
            topic_match = chunk.get("content_domain", "")

        storage_path = chunk.get("storage_path", source)
        source_pdf_url = generate_signed_download_url(storage_path)

        materials.append({
            "title": title,
            "source_pdf_url": source_pdf_url or "",
            "topic_match": topic_match,
        })

    return materials