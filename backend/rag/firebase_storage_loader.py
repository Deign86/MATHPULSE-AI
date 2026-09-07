"""
Firebase Storage PDF loader for curriculum ingestion.
Downloads PDFs from Firebase Storage and extracts text for ChromaDB indexing.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
import re
from typing import Any, Dict, List, Optional, Tuple

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
    """Download a file (PDF or Markdown) from Firebase Storage and return its bytes."""
    _, bucket = _init_firebase_storage()
    if bucket is not None:
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

    # Fallback to gcloud storage cat
    import shutil
    import subprocess

    gcloud_bin = shutil.which("gcloud") or "gcloud"
    bucket_name = os.getenv("FIREBASE_STORAGE_BUCKET", "mathpulse-ai-2026.firebasestorage.app")
    cmd = f'"{gcloud_bin}" storage cat "gs://{bucket_name}/{storage_path}"'
    res = subprocess.run(cmd, shell=True, capture_output=True)
    if res.returncode == 0 and res.stdout:
        logger.info("Downloaded via gcloud %s (%d bytes)", storage_path, len(res.stdout))
        if dest_path:
            Path(dest_path).parent.mkdir(parents=True, exist_ok=True)
            with open(dest_path, "wb") as f:
                f.write(res.stdout)
        return res.stdout
    logger.warning("Download failed for %s", storage_path)
    return None


download_file_from_storage = download_pdf_from_storage


def list_curriculum_blobs(prefix: str = "curriculum/") -> List[Dict[str, Any]]:
    """List all curriculum blobs (PDF and Markdown) under a prefix in Firebase Storage."""
    _, bucket = _init_firebase_storage()
    if bucket is not None:
        blobs = bucket.list_blobs(prefix=prefix)
        result = []
        for blob in blobs:
            name = blob.name
            if (name.endswith(".pdf") or name.endswith(".md")) and not name.lower().endswith("readme.md"):
                result.append({
                    "name": name,
                    "size": blob.size,
                    "updated": str(blob.updated) if blob.updated else None,
                    "download_url": f"https://storage.googleapis.com/{bucket.name}/{name}",
                })
        return result

    # Fallback to gcloud storage ls
    import json
    import shutil
    import subprocess

    gcloud_bin = shutil.which("gcloud") or "gcloud"
    bucket_name = os.getenv("FIREBASE_STORAGE_BUCKET", "mathpulse-ai-2026.firebasestorage.app")
    cmd = f'"{gcloud_bin}" storage ls --json "gs://{bucket_name}/{prefix}**"'
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if res.returncode == 0:
        try:
            items = json.loads(res.stdout)
            result = []
            for item in items:
                meta = item.get("metadata", {})
                name = meta.get("name") or item.get("name") or ""
                if (name.endswith(".pdf") or name.endswith(".md")) and not name.lower().endswith("readme.md"):
                    result.append({
                        "name": name,
                        "size": int(meta.get("size", 0)),
                        "updated": meta.get("updated"),
                        "download_url": f"https://storage.googleapis.com/{bucket_name}/{name}",
                    })
            return result
        except Exception as err:
            logger.warning("Failed to parse gcloud storage ls output: %s", err)
            return []
    return []


def infer_storage_metadata(storage_path: str) -> Dict[str, Any]:
    """Infer metadata for a curriculum resource stored in Firebase Storage or local filesystem."""
    clean_path = storage_path.replace("\\", "/").strip("/")
    if clean_path.startswith("gs://"):
        parts_gs = clean_path.split("/", 2)
        if len(parts_gs) > 2:
            clean_path = parts_gs[2]

    parts = [p.lower() for p in clean_path.split("/")]
    joined = " ".join(parts)
    subparts = parts[1:] if len(parts) > 1 and parts[0] == "curriculum" else parts
    sub_joined = " ".join(subparts)
    filename = parts[-1] if parts else ""
    filename_lower = filename.lower()

    # Subject and SubjectId detection
    if "stat_prob" in joined or "statistics" in joined or "prob" in joined:
        subject = "Statistics and Probability"
        subject_id = "stats-prob"
        content_domain = "statistics"
    elif "finite math 1" in joined or "finite-math-1" in joined or "finite-mathematics-1" in joined:
        subject = "Finite Mathematics 1"
        subject_id = "finite-math-1"
        content_domain = "general"
    elif "finite math 2" in joined or "finite-math-2" in joined or "finite-mathematics-2" in joined:
        subject = "Finite Mathematics 2"
        subject_id = "finite-math-2"
        content_domain = "general"
    elif "finite math" in joined or "finite" in joined:
        subject = "Finite Mathematics"
        subject_id = "finite-math"
        content_domain = "general"
    elif "bus.math" in joined or "business math" in joined or "bus_math" in joined:
        subject = "Business Mathematics"
        subject_id = "business-math"
        content_domain = "general"
    elif "org" in joined and ("mngt" in joined or "mgmt" in joined or "management" in joined):
        subject = "Organization and Management"
        subject_id = "org-mgmt"
        content_domain = "general"
    else:
        subject = "General Mathematics"
        subject_id = "gen-math"
        content_domain = "general"

    # Quarter detection (1, 2, 3, 4)
    quarter = 0
    q_match = re.search(r"(?:quarter[\s_/-]*|[\b_/-]q)([1-4])(?!\d)", clean_path, re.IGNORECASE)
    if q_match:
        quarter = int(q_match.group(1))
    elif "1stsem" in joined or "1st sem" in joined or "firstsem" in joined or "first sem" in joined or "term 1" in joined:
        quarter = 1
    elif "2ndsem" in joined or "2nd sem" in joined or "secondsem" in joined or "second sem" in joined or "term 2" in joined:
        quarter = 2
    elif "finite math 1" in joined:
        quarter = 1
    elif "finite math 2" in joined:
        quarter = 2
    elif "stat_prob" in joined:
        quarter = 1

    # Resource type detection: learning_activity_sheet, lesson_exemplar, curriculum_guide, sdo_module
    is_las = bool(re.search(r"\b(las|learning[\s_-]*activity)\b|[-_]las\d*[-_.]", sub_joined, re.IGNORECASE))
    is_le = bool(re.search(r"\b(lesson[\s_-]*exemplar)\b|[-_]le\d*[-_.]|\ble\d+\b", sub_joined, re.IGNORECASE))
    is_guide = bool(
        re.search(r"\b(curriculum[\s_-]*guide|budget[\s_-]*of[\s_-]*work|budget)\b|curriculum & budget", sub_joined, re.IGNORECASE)
        or filename_lower.startswith("general-mathematics-")
        or filename_lower.startswith("finite-mathematics-")
    )

    if is_las:
        resource_type = "learning_activity_sheet"
    elif is_le:
        resource_type = "lesson_exemplar"
    elif is_guide:
        resource_type = "curriculum_guide"
    else:
        resource_type = "sdo_module"

    curated = PDF_METADATA.get(storage_path) or PDF_METADATA.get(clean_path)
    if not curated and clean_path.startswith("curriculum/"):
        curated = PDF_METADATA.get(clean_path[len("curriculum/"):])
    if not curated and not clean_path.startswith("curriculum/"):
        curated = PDF_METADATA.get(f"curriculum/{clean_path}")
    if not curated and filename:
        curated = PDF_METADATA.get(filename)

    if curated:
        subject = curated.get("subject", subject)
        subject_id = curated.get("subjectId", subject_id)
        resource_type = curated.get("type") or curated.get("resource_type", resource_type)
        content_domain = curated.get("content_domain", content_domain)
        quarter = curated.get("quarter", quarter)

    full_storage_path = clean_path if clean_path.startswith("curriculum/") else f"curriculum/{clean_path}"

    return {
        "subject": subject,
        "subjectId": subject_id,
        "type": resource_type,
        "resource_type": resource_type,
        "content_domain": content_domain,
        "quarter": quarter,
        "storage_path": full_storage_path,
        "filename": filename,
    }


PDF_METADATA: Dict[str, dict] = {
    # General Mathematics Q1 — SDO Navotas teaching modules
    "curriculum/gen_math_sdo/SDO_Navotas_Gen.Math_SHS_1stSem.FV.pdf": {
        "subject": "General Mathematics",
        "subjectId": "gen-math",
        "type": "sdo_module",
        "content_domain": "general",
        "quarter": 1,
        "storage_path": "curriculum/gen_math_sdo/SDO_Navotas_Gen.Math_SHS_1stSem.FV.pdf",
    },
    "curriculum/gen_math_sdo/SHS_GM_Q1_LAS1_LE1.pdf": {
        "subject": "General Mathematics",
        "subjectId": "gen-math",
        "type": "learning_activity_sheet",
        "content_domain": "general",
        "quarter": 1,
        "storage_path": "curriculum/gen_math_sdo/SHS_GM_Q1_LAS1_LE1.pdf",
    },
    "curriculum/gen_math_sdo/SHS_GM_Q1_LAS2_LE1.pdf": {
        "subject": "General Mathematics",
        "subjectId": "gen-math",
        "type": "learning_activity_sheet",
        "content_domain": "general",
        "quarter": 1,
        "storage_path": "curriculum/gen_math_sdo/SHS_GM_Q1_LAS2_LE1.pdf",
    },
    "curriculum/gen_math_sdo/SHS_GM_Q1_LAS3_LE1.pdf": {
        "subject": "General Mathematics",
        "subjectId": "gen-math",
        "type": "learning_activity_sheet",
        "content_domain": "general",
        "quarter": 1,
        "storage_path": "curriculum/gen_math_sdo/SHS_GM_Q1_LAS3_LE1.pdf",
    },
    # General Mathematics Q2 — Interest & Annuities modules (~27-35 pages each)
    "curriculum/general_math/genmath_q2_mod1_simpleandcompoundinterests_v2.pdf": {
        "subject": "General Mathematics",
        "subjectId": "gen-math",
        "type": "sdo_module",
        "content_domain": "general",
        "quarter": 2,
        "storage_path": "curriculum/general_math/genmath_q2_mod1_simpleandcompoundinterests_v2.pdf",
    },
    "curriculum/general_math/genmath_q2_mod2_interestmaturityfutureandpresentvaluesinsimpleandcompoundinterests_v2.pdf": {
        "subject": "General Mathematics",
        "subjectId": "gen-math",
        "type": "sdo_module",
        "content_domain": "general",
        "quarter": 2,
        "storage_path": "curriculum/general_math/genmath_q2_mod2_interestmaturityfutureandpresentvaluesinsimpleandcompoundinterests_v2.pdf",
    },
    "curriculum/general_math/genmath_q2_mod3_SolvingProblemsInvolvingSimpleandCompoundInterest_v2.pdf": {
        "subject": "General Mathematics",
        "subjectId": "gen-math",
        "type": "sdo_module",
        "content_domain": "general",
        "quarter": 2,
        "storage_path": "curriculum/general_math/genmath_q2_mod3_SolvingProblemsInvolvingSimpleandCompoundInterest_v2.pdf",
    },
    "curriculum/general_math/genmath_q2_mod4_simpleandgeneralannuities_v2.pdf": {
        "subject": "General Mathematics",
        "subjectId": "gen-math",
        "type": "sdo_module",
        "content_domain": "general",
        "quarter": 2,
        "storage_path": "curriculum/general_math/genmath_q2_mod4_simpleandgeneralannuities_v2.pdf",
    },
    # Statistics and Probability — Full textbook (331 pages, ~607k chars)
    "curriculum/stat_prob/Full.pdf": {
        "subject": "Statistics and Probability",
        "subjectId": "stats-prob",
        "type": "sdo_module",
        "content_domain": "statistics",
        "quarter": 1,
        "storage_path": "curriculum/stat_prob/Full.pdf",
    },
    # SSHS Learning Resources: Finite Mathematics 1 & 2
    "curriculum/sshs_learning_resources/Finite Mathematics/Finite Math 1/PDF/Finite Math 1_LAS.pdf": {
        "subject": "Finite Mathematics 1",
        "subjectId": "finite-math-1",
        "type": "learning_activity_sheet",
        "content_domain": "general",
        "quarter": 1,
        "storage_path": "curriculum/sshs_learning_resources/Finite Mathematics/Finite Math 1/PDF/Finite Math 1_LAS.pdf",
    },
    "curriculum/sshs_learning_resources/Finite Mathematics/Finite Math 1/PDF/Finite Math 1_LE.pdf": {
        "subject": "Finite Mathematics 1",
        "subjectId": "finite-math-1",
        "type": "lesson_exemplar",
        "content_domain": "general",
        "quarter": 1,
        "storage_path": "curriculum/sshs_learning_resources/Finite Mathematics/Finite Math 1/PDF/Finite Math 1_LE.pdf",
    },
    "curriculum/sshs_learning_resources/Finite Mathematics/Finite Math 2/PDF/Finite Math 2_LAS.pdf": {
        "subject": "Finite Mathematics 2",
        "subjectId": "finite-math-2",
        "type": "learning_activity_sheet",
        "content_domain": "general",
        "quarter": 2,
        "storage_path": "curriculum/sshs_learning_resources/Finite Mathematics/Finite Math 2/PDF/Finite Math 2_LAS.pdf",
    },
    "curriculum/sshs_learning_resources/Finite Mathematics/Finite Math 2/PDF/Finite Math 2_LE.pdf": {
        "subject": "Finite Mathematics 2",
        "subjectId": "finite-math-2",
        "type": "lesson_exemplar",
        "content_domain": "general",
        "quarter": 2,
        "storage_path": "curriculum/sshs_learning_resources/Finite Mathematics/Finite Math 2/PDF/Finite Math 2_LE.pdf",
    },
    # SSHS Learning Resources: General Mathematics Complete Course (Term 1)
    "curriculum/sshs_learning_resources/General Mathematics/Complete Course (Term 1)/PDF/General Mathematics_LAS.pdf": {
        "subject": "General Mathematics",
        "subjectId": "gen-math",
        "type": "learning_activity_sheet",
        "content_domain": "general",
        "quarter": 1,
        "storage_path": "curriculum/sshs_learning_resources/General Mathematics/Complete Course (Term 1)/PDF/General Mathematics_LAS.pdf",
    },
    "curriculum/sshs_learning_resources/General Mathematics/Complete Course (Term 1)/PDF/General Mathematics_LE.pdf": {
        "subject": "General Mathematics",
        "subjectId": "gen-math",
        "type": "lesson_exemplar",
        "content_domain": "general",
        "quarter": 1,
        "storage_path": "curriculum/sshs_learning_resources/General Mathematics/Complete Course (Term 1)/PDF/General Mathematics_LE.pdf",
    },
    # SSHS Learning Resources: Curriculum Guide & Budget of Work
    "curriculum/sshs_learning_resources/General Mathematics/Curriculum & Budget of Work/PDF/GENERAL-MATHEMATICS-1.pdf": {
        "subject": "General Mathematics",
        "subjectId": "gen-math",
        "type": "curriculum_guide",
        "content_domain": "general",
        "quarter": 1,
        "storage_path": "curriculum/sshs_learning_resources/General Mathematics/Curriculum & Budget of Work/PDF/GENERAL-MATHEMATICS-1.pdf",
    },
    "curriculum/sshs_learning_resources/General Mathematics/Curriculum & Budget of Work/PDF/General-Mathematics-2.pdf": {
        "subject": "General Mathematics",
        "subjectId": "gen-math",
        "type": "curriculum_guide",
        "content_domain": "general",
        "quarter": 2,
        "storage_path": "curriculum/sshs_learning_resources/General Mathematics/Curriculum & Budget of Work/PDF/General-Mathematics-2.pdf",
    },
    # SSHS Learning Resources: General Mathematics Quarter 1
    "curriculum/sshs_learning_resources/General Mathematics/Quarter 1/Learning Activity Sheets/PDF/SHS_GM_Q1_LAS1.pdf": {
        "subject": "General Mathematics",
        "subjectId": "gen-math",
        "type": "learning_activity_sheet",
        "content_domain": "general",
        "quarter": 1,
        "storage_path": "curriculum/sshs_learning_resources/General Mathematics/Quarter 1/Learning Activity Sheets/PDF/SHS_GM_Q1_LAS1.pdf",
    },
    "curriculum/sshs_learning_resources/General Mathematics/Quarter 1/Learning Activity Sheets/PDF/SHS_GM_Q1_LAS2.pdf": {
        "subject": "General Mathematics",
        "subjectId": "gen-math",
        "type": "learning_activity_sheet",
        "content_domain": "general",
        "quarter": 1,
        "storage_path": "curriculum/sshs_learning_resources/General Mathematics/Quarter 1/Learning Activity Sheets/PDF/SHS_GM_Q1_LAS2.pdf",
    },
    "curriculum/sshs_learning_resources/General Mathematics/Quarter 1/Learning Activity Sheets/PDF/SHS_GM_Q1_LAS4.pdf": {
        "subject": "General Mathematics",
        "subjectId": "gen-math",
        "type": "learning_activity_sheet",
        "content_domain": "general",
        "quarter": 1,
        "storage_path": "curriculum/sshs_learning_resources/General Mathematics/Quarter 1/Learning Activity Sheets/PDF/SHS_GM_Q1_LAS4.pdf",
    },
    "curriculum/sshs_learning_resources/General Mathematics/Quarter 1/Lesson Exemplars/PDF/SHS_GM_Q1_LE1.pdf": {
        "subject": "General Mathematics",
        "subjectId": "gen-math",
        "type": "lesson_exemplar",
        "content_domain": "general",
        "quarter": 1,
        "storage_path": "curriculum/sshs_learning_resources/General Mathematics/Quarter 1/Lesson Exemplars/PDF/SHS_GM_Q1_LE1.pdf",
    },
    "curriculum/sshs_learning_resources/General Mathematics/Quarter 1/Lesson Exemplars/PDF/SHS_GM_Q1_LE2.pdf": {
        "subject": "General Mathematics",
        "subjectId": "gen-math",
        "type": "lesson_exemplar",
        "content_domain": "general",
        "quarter": 1,
        "storage_path": "curriculum/sshs_learning_resources/General Mathematics/Quarter 1/Lesson Exemplars/PDF/SHS_GM_Q1_LE2.pdf",
    },
    "curriculum/sshs_learning_resources/General Mathematics/Quarter 1/Lesson Exemplars/PDF/SHS_GM_Q1_LE3.pdf": {
        "subject": "General Mathematics",
        "subjectId": "gen-math",
        "type": "lesson_exemplar",
        "content_domain": "general",
        "quarter": 1,
        "storage_path": "curriculum/sshs_learning_resources/General Mathematics/Quarter 1/Lesson Exemplars/PDF/SHS_GM_Q1_LE3.pdf",
    },
    # SSHS Learning Resources: General Mathematics Quarter 2
    "curriculum/sshs_learning_resources/General Mathematics/Quarter 2/Learning Activity Sheets/PDF/SHS_GM_Q2_LAS2.pdf": {
        "subject": "General Mathematics",
        "subjectId": "gen-math",
        "type": "learning_activity_sheet",
        "content_domain": "general",
        "quarter": 2,
        "storage_path": "curriculum/sshs_learning_resources/General Mathematics/Quarter 2/Learning Activity Sheets/PDF/SHS_GM_Q2_LAS2.pdf",
    },
    "curriculum/sshs_learning_resources/General Mathematics/Quarter 2/Lesson Exemplars/PDF/SHS_GM_Q2_LE4.pdf": {
        "subject": "General Mathematics",
        "subjectId": "gen-math",
        "type": "lesson_exemplar",
        "content_domain": "general",
        "quarter": 2,
        "storage_path": "curriculum/sshs_learning_resources/General Mathematics/Quarter 2/Lesson Exemplars/PDF/SHS_GM_Q2_LE4.pdf",
    },
    "curriculum/sshs_learning_resources/General Mathematics/Quarter 2/Lesson Exemplars/PDF/SHS_GM_Q2_LE5.pdf": {
        "subject": "General Mathematics",
        "subjectId": "gen-math",
        "type": "lesson_exemplar",
        "content_domain": "general",
        "quarter": 2,
        "storage_path": "curriculum/sshs_learning_resources/General Mathematics/Quarter 2/Lesson Exemplars/PDF/SHS_GM_Q2_LE5.pdf",
    },
    "curriculum/sshs_learning_resources/General Mathematics/Quarter 2/Lesson Exemplars/PDF/SHS_GM_Q2_LE6.pdf": {
        "subject": "General Mathematics",
        "subjectId": "gen-math",
        "type": "lesson_exemplar",
        "content_domain": "general",
        "quarter": 2,
        "storage_path": "curriculum/sshs_learning_resources/General Mathematics/Quarter 2/Lesson Exemplars/PDF/SHS_GM_Q2_LE6.pdf",
    },
    # SSHS Learning Resources: General Mathematics Quarter 3
    "curriculum/sshs_learning_resources/General Mathematics/Quarter 3/Learning Activity Sheets/PDF/SHS_GM_Q3_LAS_LE7.pdf": {
        "subject": "General Mathematics",
        "subjectId": "gen-math",
        "type": "learning_activity_sheet",
        "content_domain": "general",
        "quarter": 3,
        "storage_path": "curriculum/sshs_learning_resources/General Mathematics/Quarter 3/Learning Activity Sheets/PDF/SHS_GM_Q3_LAS_LE7.pdf",
    },
    "curriculum/sshs_learning_resources/General Mathematics/Quarter 3/Learning Activity Sheets/PDF/SHS_GM_Q3_LAS_LE8.pdf": {
        "subject": "General Mathematics",
        "subjectId": "gen-math",
        "type": "learning_activity_sheet",
        "content_domain": "general",
        "quarter": 3,
        "storage_path": "curriculum/sshs_learning_resources/General Mathematics/Quarter 3/Learning Activity Sheets/PDF/SHS_GM_Q3_LAS_LE8.pdf",
    },
    "curriculum/sshs_learning_resources/General Mathematics/Quarter 3/Learning Activity Sheets/PDF/SHS_GM_Q3_LAS_LE9.pdf": {
        "subject": "General Mathematics",
        "subjectId": "gen-math",
        "type": "learning_activity_sheet",
        "content_domain": "general",
        "quarter": 3,
        "storage_path": "curriculum/sshs_learning_resources/General Mathematics/Quarter 3/Learning Activity Sheets/PDF/SHS_GM_Q3_LAS_LE9.pdf",
    },
    "curriculum/sshs_learning_resources/General Mathematics/Quarter 3/Lesson Exemplars/PDF/SHS_GM_Q3_LE7.pdf": {
        "subject": "General Mathematics",
        "subjectId": "gen-math",
        "type": "lesson_exemplar",
        "content_domain": "general",
        "quarter": 3,
        "storage_path": "curriculum/sshs_learning_resources/General Mathematics/Quarter 3/Lesson Exemplars/PDF/SHS_GM_Q3_LE7.pdf",
    },
    "curriculum/sshs_learning_resources/General Mathematics/Quarter 3/Lesson Exemplars/PDF/SHS_GM_Q3_LE8.pdf": {
        "subject": "General Mathematics",
        "subjectId": "gen-math",
        "type": "lesson_exemplar",
        "content_domain": "general",
        "quarter": 3,
        "storage_path": "curriculum/sshs_learning_resources/General Mathematics/Quarter 3/Lesson Exemplars/PDF/SHS_GM_Q3_LE8.pdf",
    },
    "curriculum/sshs_learning_resources/General Mathematics/Quarter 3/Lesson Exemplars/PDF/SHS_GM_Q3_LE9.pdf": {
        "subject": "General Mathematics",
        "subjectId": "gen-math",
        "type": "lesson_exemplar",
        "content_domain": "general",
        "quarter": 3,
        "storage_path": "curriculum/sshs_learning_resources/General Mathematics/Quarter 3/Lesson Exemplars/PDF/SHS_GM_Q3_LE9.pdf",
    },
    # SSHS Learning Resources: General Mathematics Quarter 4
    "curriculum/sshs_learning_resources/General Mathematics/Quarter 4/Learning Activity Sheets/PDF/SHS_GM_Q4_LAS_LE10.pdf": {
        "subject": "General Mathematics",
        "subjectId": "gen-math",
        "type": "learning_activity_sheet",
        "content_domain": "general",
        "quarter": 4,
        "storage_path": "curriculum/sshs_learning_resources/General Mathematics/Quarter 4/Learning Activity Sheets/PDF/SHS_GM_Q4_LAS_LE10.pdf",
    },
    "curriculum/sshs_learning_resources/General Mathematics/Quarter 4/Learning Activity Sheets/PDF/SHS_GM_Q4_LAS_LE11.pdf": {
        "subject": "General Mathematics",
        "subjectId": "gen-math",
        "type": "learning_activity_sheet",
        "content_domain": "general",
        "quarter": 4,
        "storage_path": "curriculum/sshs_learning_resources/General Mathematics/Quarter 4/Learning Activity Sheets/PDF/SHS_GM_Q4_LAS_LE11.pdf",
    },
    "curriculum/sshs_learning_resources/General Mathematics/Quarter 4/Learning Activity Sheets/PDF/SHS_GM_Q4_LAS_LE12.pdf": {
        "subject": "General Mathematics",
        "subjectId": "gen-math",
        "type": "learning_activity_sheet",
        "content_domain": "general",
        "quarter": 4,
        "storage_path": "curriculum/sshs_learning_resources/General Mathematics/Quarter 4/Learning Activity Sheets/PDF/SHS_GM_Q4_LAS_LE12.pdf",
    },
    "curriculum/sshs_learning_resources/General Mathematics/Quarter 4/Lesson Exemplars/PDF/SHS_GM_Q4_LE10.pdf": {
        "subject": "General Mathematics",
        "subjectId": "gen-math",
        "type": "lesson_exemplar",
        "content_domain": "general",
        "quarter": 4,
        "storage_path": "curriculum/sshs_learning_resources/General Mathematics/Quarter 4/Lesson Exemplars/PDF/SHS_GM_Q4_LE10.pdf",
    },
    "curriculum/sshs_learning_resources/General Mathematics/Quarter 4/Lesson Exemplars/PDF/SHS_GM_Q4_LE11.pdf": {
        "subject": "General Mathematics",
        "subjectId": "gen-math",
        "type": "lesson_exemplar",
        "content_domain": "general",
        "quarter": 4,
        "storage_path": "curriculum/sshs_learning_resources/General Mathematics/Quarter 4/Lesson Exemplars/PDF/SHS_GM_Q4_LE11.pdf",
    },
    "curriculum/sshs_learning_resources/General Mathematics/Quarter 4/Lesson Exemplars/PDF/SHS_GM_Q4_LE12.pdf": {
        "subject": "General Mathematics",
        "subjectId": "gen-math",
        "type": "lesson_exemplar",
        "content_domain": "general",
        "quarter": 4,
        "storage_path": "curriculum/sshs_learning_resources/General Mathematics/Quarter 4/Lesson Exemplars/PDF/SHS_GM_Q4_LE12.pdf",
    },
}