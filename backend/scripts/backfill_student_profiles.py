"""
MathPulse AI — Backfill Student Profiles

One-time migration script to build student_profiles for ALL existing students
who already have data in Firestore but no unified profile.

Usage:
  cd backend
  python -m scripts.backfill_student_profiles
"""

import asyncio
import logging
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("backfill")


async def backfill_all_profiles():
    """Rebuild student_profiles for all existing managedStudents."""
    # Initialize Firebase
    import firebase_admin
    from firebase_admin import firestore

    if not firebase_admin._apps:
        sa_path = os.environ.get("FIREBASE_SERVICE_ACCOUNT_FILE")
        sa_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
        if sa_path and os.path.exists(sa_path):
            from firebase_admin import credentials
            cred = credentials.Certificate(sa_path)
            firebase_admin.initialize_app(cred)
        elif sa_json:
            import json
            from firebase_admin import credentials
            cred = credentials.Certificate(json.loads(sa_json))
            firebase_admin.initialize_app(cred)
        else:
            firebase_admin.initialize_app()

    db = firestore.client()

    from services.student_intelligence_pipeline import get_pipeline, StudentActivityEvent
    from datetime import datetime, timezone

    pipeline = get_pipeline()

    # Fetch all managed students
    logger.info("Fetching all managedStudents...")
    students = list(db.collection("managedStudents").stream())
    total = len(students)
    logger.info(f"Found {total} students to backfill")

    success = 0
    errors = 0

    for i, student_doc in enumerate(students):
        sid = student_doc.id
        data = student_doc.to_dict()

        try:
            # Create a synthetic event to trigger full profile build
            event = StudentActivityEvent(
                student_id=sid,
                event_type="session",
                event_data={"event": "backfill", "source": "migration_script"},
                occurred_at=datetime.now(timezone.utc).isoformat(),
                class_id=data.get("classroomId", ""),
                teacher_id=data.get("teacherId", ""),
            )

            # Set basic profile fields from managed student data
            profile_ref = db.collection("student_profiles").document(sid)
            profile_doc = profile_ref.get()
            if not profile_doc.exists:
                # Pre-seed with identity data
                profile_ref.set({
                    "student_id": sid,
                    "display_name": data.get("name", ""),
                    "grade_level": data.get("gradeLevel", data.get("grade", "")),
                    "section": data.get("section", ""),
                    "class_id": data.get("classroomId", ""),
                    "teacher_id": data.get("teacherId", ""),
                    "diagnostic_score": data.get("diagnosticScore"),
                    "external_grades_avg": data.get("externalGradesAvg"),
                    "wri": data.get("wri"),
                    "risk_status": data.get("riskStatus", "pending_assessment"),
                    "wri_weights": data.get("weights", {"w1": 0.30, "w2": 0.40, "w3": 0.30}),
                    "profile_version": 0,
                }, merge=True)

            # Run pipeline to compute P and update everything
            await pipeline.process_event(event)
            success += 1

        except Exception as e:
            logger.error(f"Error backfilling {sid}: {e}")
            errors += 1

        if (i + 1) % 10 == 0:
            logger.info(f"Progress: {i + 1}/{total} (success={success}, errors={errors})")

    logger.info(f"Backfill complete: {success} success, {errors} errors out of {total} total")


if __name__ == "__main__":
    asyncio.run(backfill_all_profiles())
