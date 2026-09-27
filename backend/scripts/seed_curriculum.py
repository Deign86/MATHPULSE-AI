"""
Seed Firestore curriculum collection from static data.

Run this ONCE to migrate static curriculum to Firestore:
    python backend/scripts/seed_curriculum.py

After seeding, the curriculum API will read from Firestore.
"""

import logging
import json
import os
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.curriculum_service import _STATIC_SUBJECTS

logger = logging.getLogger(__name__)


def seed_curriculum():
    """Seed curriculum subjects to Firestore."""
    try:
        import firebase_admin
        from firebase_admin import firestore, credentials

        # Initialize Firebase
        svc_account = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        if svc_account:
            sa_creds = credentials.Certificate(json.loads(svc_account))
            firebase_admin.initialize_app(sa_creds)
        else:
            firebase_admin.initialize_app()

        db = firestore.client()
        print("Firebase initialized")

    except Exception as e:
        print(f"Failed to initialize Firebase: {e}")
        return

    # Seed new subjects
    subjects_ref = db.collection("subjects")
    count = 0

    for subject in _STATIC_SUBJECTS:
        doc_ref = subjects_ref.document(subject["id"])
        doc_ref.set(subject)
        count += 1
        print(f"  Seeded: {subject['id']} - {subject['name']} ({len(subject.get('topics', []))} topics)")

    print(f"\nSeeded {count} subjects to Firestore")
    print("\nCurriculum is now available at:")
    print("  GET /api/curriculum/subjects")
    print("  GET /api/curriculum/subjects/{id}")
    print("  GET /api/curriculum/subjects/{id}/topics")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    seed_curriculum()