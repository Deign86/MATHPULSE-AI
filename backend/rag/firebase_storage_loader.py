"""
Firebase Storage PDF loader for curriculum ingestion.
Downloads PDFs from Firebase Storage and extracts text for ChromaDB indexing.
"""

from __future__ import annotations

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


PDF_METADATA: Dict[str, dict] = {
    "curriculum/general_math/GENERAL-MATHEMATICS-1.pdf": {
        "subject": "General Mathematics",
        "subjectId": "gen-math",
        "type": "curriculum_guide",
        "content_domain": "general",
        "quarter": 1,
        "storage_path": "curriculum/general_math/GENERAL-MATHEMATICS-1.pdf",
    },
    "curriculum/finite_math/Finite-Mathematics-1-1.pdf": {
        "subject": "Finite Mathematics 1",
        "subjectId": "finite-math-1",
        "type": "curriculum_guide",
        "content_domain": "finite_math",
        "quarter": 1,
        "storage_path": "curriculum/finite_math/Finite-Mathematics-1-1.pdf",
    },
    "curriculum/finite_math/Finite-Mathematics-2-1.pdf": {
        "subject": "Finite Mathematics 2",
        "subjectId": "finite-math-2",
        "type": "curriculum_guide",
        "content_domain": "finite_math",
        "quarter": 1,
        "storage_path": "curriculum/finite_math/Finite-Mathematics-2-1.pdf",
    },
    "curriculum/gen_math_sdo/SDO_Navotas_Gen.Math_SHS_1stSem.FV.pdf": {
        "subject": "General Mathematics",
        "subjectId": "gen-math",
        "type": "sdo_module",
        "content_domain": "general",
        "quarter": 1,
        "storage_path": "curriculum/gen_math_sdo/SDO_Navotas_Gen.Math_SHS_1stSem.FV.pdf",
    },
    "curriculum/business_math/SDO_Navotas_Bus.Math_SHS_1stSem.FV.pdf": {
        "subject": "Business Mathematics",
        "subjectId": "business-math",
        "type": "sdo_module",
        "content_domain": "business",
        "quarter": 1,
        "storage_path": "curriculum/business_math/SDO_Navotas_Bus.Math_SHS_1stSem.FV.pdf",
    },
    "curriculum/org_mgmt/SDO_Navotas_SHS_ABM_OrgAndMngt_FirstSem_FV.pdf": {
        "subject": "Organization and Management",
        "subjectId": "org-mgmt",
        "type": "sdo_module",
        "content_domain": "org_management",
        "quarter": 1,
        "storage_path": "curriculum/org_mgmt/SDO_Navotas_SHS_ABM_OrgAndMngt_FirstSem_FV.pdf",
    },
    "curriculum/stat_prob/SDO_Navotas_STAT_PROB_SHS_1stSem.FV.pdf": {
        "subject": "Statistics and Probability",
        "subjectId": "stats-prob",
        "type": "sdo_module",
        "content_domain": "statistics",
        "quarter": 1,
        "storage_path": "curriculum/stat_prob/SDO_Navotas_STAT_PROB_SHS_1stSem.FV.pdf",
    },
}