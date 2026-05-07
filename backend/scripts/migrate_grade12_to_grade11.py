"""
Migrate Grade 12 users to Grade 11.

Run this to convert all existing Grade 12 users to Grade 11:
    python backend/scripts/migrate_grade12_to_grade11.py

This handles:
- Firestore user profiles
- Progress records
- Any references to Grade 12
"""

import logging
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

logger = logging.getLogger(__name__)


def migrate_grade_12_to_grade_11():
    """Migrate all Grade 12 users to Grade 11."""
    try:
        import firebase_admin
        from firebase_admin import firestore

        svc_account = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        if svc_account:
            import json
            from firebase_admin import credentials
            creds = credentials.Certificate(json.loads(svc_account))
            firebase_admin.initialize_app(creds)
        else:
            firebase_admin.initialize_app()

        db = firestore.client()
        print("Firebase initialized")

    except Exception as e:
        print(f"Failed to initialize Firebase: {e}")
        return

    # Count migrations
    users_migrated = 0
    progress_migrated = 0

    # Migrate users collection
    print("\n--- Migrating users ---")
    users_ref = db.collection("users")
    
    # Batch update for users
    batch = db.batch()
    user_count = 0

    for doc in users_ref.stream():
        data = doc.to_dict()
        if data.get("grade") == "Grade 12":
            batch.update(doc.reference, {"grade": "Grade 11"})
            user_count += 1
            print(f"  Migrating user: {doc.id} ({data.get('name', 'Unknown')})")
            
            if user_count >= 500:
                batch.commit()
                users_migrated += user_count
                user_count = 0
                batch = db.batch()

    if user_count > 0:
        batch.commit()
        users_migrated += user_count

    print(f"  => Migrated {users_migrated} users to Grade 11")

    # Migrate progress collection
    print("\n--- Migrating progress ---")
    progress_ref = db.collection("progress")
    batch = db.batch()
    progress_count = 0

    for doc in progress_ref.stream():
        data = doc.to_dict()
        if data.get("gradeLevel") == "Grade 12":
            batch.update(doc.reference, {"gradeLevel": "Grade 11"})
            progress_count += 1
            
            if progress_count >= 500:
                batch.commit()
                progress_migrated += progress_count
                progress_count = 0
                batch = db.batch()

    if progress_count > 0:
        batch.commit()
        progress_migrated += progress_count

    print(f"  => Migrated {progress_migrated} progress records to Grade 11")

    print(f"\n=== Migration complete ===")
    print(f"Users migrated: {users_migrated}")
    print(f"Progress migrated: {progress_migrated}")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    migrate_grade_12_to_grade_11()