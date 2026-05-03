"""
Register curriculum document metadata in Firestore.
Populates the curriculumDocuments collection so the app can display
lessons mapped to their source PDFs before ingestion.

Run: python backend/scripts/register_firestore_metadata.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def _get_firestore_client():
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
        print(f"Firestore init failed: {e}")
        return None


CURRICULUM_DOCUMENTS = [
    {
        "id": "gm_lesson_1",
        "moduleId": "gm-q1-business-finance",
        "lessonId": "gm-q1-bf-1",
        "title": "Represent business transactions and financial goals using variables and equations.",
        "subject": "General Mathematics",
        "subjectId": "gen-math",
        "quarter": 1,
        "competencyCode": "GM11-BF-1",
        "learningCompetency": "Represent business transactions and financial goals using variables and equations.",
        "storagePath": "curriculum/general_math/GENERAL-MATHEMATICS-1.pdf",
        "status": "uploaded",
    },
    {
        "id": "gm_navotas_lesson_1",
        "moduleId": "gm-q1-patterns-sequences-series",
        "lessonId": "gm-q1-pss-1",
        "title": "Identify and describe arithmetic and geometric patterns in data.",
        "subject": "General Mathematics",
        "subjectId": "gen-math",
        "quarter": 1,
        "competencyCode": "GM11-PSS-1",
        "learningCompetency": "Identify and describe arithmetic and geometric patterns in data.",
        "storagePath": "curriculum/gen_math_sdo/SDO_Navotas_Gen.Math_SHS_1stSem.FV.pdf",
        "status": "uploaded",
    },
    {
        "id": "bm_lesson_1",
        "moduleId": "bm-q1-business-math",
        "lessonId": "bm-q1-1",
        "title": "Translate verbal phrases to mathematical expressions; model business scenarios using linear equations and inequalities.",
        "subject": "Business Mathematics",
        "subjectId": "business-math",
        "quarter": 1,
        "competencyCode": "ABM_BM11BS-Ia-b-1",
        "learningCompetency": "Translate verbal phrases to mathematical expressions; model business scenarios using linear equations and inequalities.",
        "storagePath": "curriculum/business_math/SDO_Navotas_Bus.Math_SHS_1stSem.FV.pdf",
        "status": "uploaded",
    },
    {
        "id": "stat_lesson_1",
        "moduleId": "stat-q1-probability",
        "lessonId": "stat-q1-1",
        "title": "Define and describe random variables and their types.",
        "subject": "Statistics and Probability",
        "subjectId": "stats-prob",
        "quarter": 1,
        "competencyCode": "SP_SHS11-Ia-1",
        "learningCompetency": "Define and describe random variables and their types.",
        "storagePath": "curriculum/stat_prob/SDO_Navotas_STAT_PROB_SHS_1stSem.FV.pdf",
        "status": "uploaded",
    },
    {
        "id": "fm1_lesson_1",
        "moduleId": "fm1-q1-counting",
        "lessonId": "fm1-q1-fpc-1",
        "title": "Apply the fundamental counting principle in contextual problems.",
        "subject": "Finite Mathematics 1",
        "subjectId": "finite-math-1",
        "quarter": 1,
        "competencyCode": "FM1-SHS11-Ia-1",
        "learningCompetency": "Apply the fundamental counting principle in contextual problems.",
        "storagePath": "curriculum/finite_math/Finite-Mathematics-1-1.pdf",
        "status": "uploaded",
    },
    {
        "id": "fm2_lesson_1",
        "moduleId": "fm2-q1-matrices",
        "lessonId": "fm2-q1-matrices-1",
        "title": "Represent contextual data using matrix notation.",
        "subject": "Finite Mathematics 2",
        "subjectId": "finite-math-2",
        "quarter": 1,
        "competencyCode": "FM2-SHS11-Ia-1",
        "learningCompetency": "Represent contextual data using matrix notation.",
        "storagePath": "curriculum/finite_math/Finite-Mathematics-2-1.pdf",
        "status": "uploaded",
    },
    {
        "id": "org_mgmt_lesson_1",
        "moduleId": "org-mgmt-q1",
        "lessonId": "org-mgmt-q1-1",
        "title": "Understand the fundamental concepts of organization and management.",
        "subject": "Organization and Management",
        "subjectId": "org-mgmt",
        "quarter": 1,
        "competencyCode": "ABM_OM11-Ia-1",
        "learningCompetency": "Understand the fundamental concepts of organization and management.",
        "storagePath": "curriculum/org_mgmt/SDO_Navotas_SHS_ABM_OrgAndMngt_FirstSem_FV.pdf",
        "status": "uploaded",
    },
]


def register_metadata(force: bool = False):
    db = _get_firestore_client()
    if db is None:
        print("ERROR: Cannot connect to Firestore. Check credentials.")
        print("Set FIREBASE_SERVICE_ACCOUNT_JSON or place mathpulse-sa.json in backend/ directory.")
        return

    print("Connected to Firestore.")
    print("-" * 50)

    registered = 0
    skipped = 0
    updated = 0

    for doc in CURRICULUM_DOCUMENTS:
        doc_id = doc["id"]
        doc_ref = db.collection("curriculumDocuments").document(doc_id)
        existing = doc_ref.get()

        if existing.exists and not force:
            print(f"[SKIP] {doc_id} already registered")
            skipped += 1
            continue

        if existing.exists and force:
            updated += 1
        else:
            registered += 1

        data = {
            **doc,
            "uploadedAt": None,
        }
        doc_ref.set(data, merge=True)
        print(f"[OK]  {'Updated' if force and existing.exists else 'Registered'} {doc_id} -> {doc.get('storagePath')}")

    print("-" * 50)
    print(f"Done: {registered} registered, {skipped} skipped, {updated} updated.")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Register curriculum document metadata in Firestore")
    parser.add_argument("--force", action="store_true", help="Overwrite existing records")
    args = parser.parse_args()
    register_metadata(force=args.force)