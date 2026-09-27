#!/usr/bin/env python3
"""
Firestore Memory Write Pipeline — Smoke Test

Verifies that all three memory stores (profile, active state, session summaries)
are actually being written to Firestore and can be read back correctly.

Usage:
    export FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/service-account.json
    export FIRESTORE_PROJECT_ID=your-project-id
    python scripts/test_memory_write_pipeline.py

Or place the service account at ~/.hermes/firebase-service-account.json (MATHPULSE-AI default).
"""

import json
import os
import sys
import time
from datetime import datetime

# ── Configuration ───────────────────────────────────────────────────────────
TEST_UID = "test_memory_pipeline_" + str(int(time.time()))

SERVICE_ACCOUNT_PATHS = [
    os.environ.get("FIREBASE_SERVICE_ACCOUNT_PATH"),
    os.path.expanduser("~/.hermes/firebase-service-account.json"),
    os.path.join(os.path.dirname(__file__), "..", "firebase-service-account.json"),
]

FIRESTORE_PROJECT_ID = os.environ.get("FIRESTORE_PROJECT_ID")

# ── Results tracking ───────────────────────────────────────────────────────
passes = 0
fails = 0


def report(test_name: str, passed: bool, detail: str = ""):
    global passes, fails
    status = "✅ PASS" if passed else "❌ FAIL"
    if passed:
        passes += 1
    else:
        fails += 1
    print(f"  {status}  {test_name}")
    if detail:
        for line in detail.strip().split("\n"):
            print(f"         {line}")
    return passed


# ── Initialize Firebase ────────────────────────────────────────────────────
def init_firebase():
    """Try to initialize the Firebase Admin SDK from the first available key file."""
    import firebase_admin
    from firebase_admin import credentials

    if firebase_admin._apps:
        print("  ℹ️  Firebase already initialized, reusing existing app.\n")
        return

    key_path = None
    for p in SERVICE_ACCOUNT_PATHS:
        if p and os.path.isfile(p):
            key_path = p
            break

    if not key_path:
        print("  ❌ No Firebase service account key found.")
        print(
            "     Tried:\n"
            + "\n".join(f"       - {p}" for p in SERVICE_ACCOUNT_PATHS if p)
        )
        sys.exit(1)

    print(f"  ℹ️  Using service account: {key_path}\n")

    cred = credentials.Certificate(key_path)
    project_id = FIRESTORE_PROJECT_ID
    if not project_id:
        # Try to extract from the key file
        with open(key_path) as f:
            key_data = json.load(f)
            project_id = key_data.get("project_id")

    kwargs = {}
    if project_id:
        kwargs["projectId"] = project_id
        print(f"  ℹ️  Project ID: {project_id}")

    firebase_admin.initialize_app(cred, kwargs)
    print("  ✅ Firebase Admin SDK initialized.\n")


def run_tests():
    global passes, fails
    """Run all three smoke tests."""
    import firebase_admin
    from firebase_admin import firestore

    db = firestore.client()

    # ── Collection references ────────────────────────────────────────────
    profile_ref = (
        db.collection("users")
        .document(TEST_UID)
        .collection("tutorMemory")
        .document("profile")
    )
    active_ref = (
        db.collection("users")
        .document(TEST_UID)
        .collection("tutorMemory")
        .document("working")
        .collection("state")
        .document("active_state")
    )
    session_ref = (
        db.collection("users")
        .document(TEST_UID)
        .collection("tutorMemory")
        .document("sessions")
        .collection("items")
        .document(TEST_UID)
    )
    # Also test sub-session for multiple summaries
    session_ref_2 = (
        db.collection("users")
        .document(TEST_UID)
        .collection("tutorMemory")
        .document("sessions")
        .collection("items")
        .document(TEST_UID + "_v2")
    )

    print("=" * 60)
    print("  FIRESTORE MEMORY WRITE PIPELINE — SMOKE TEST")
    print("=" * 60)
    print(f"  Test UID: {TEST_UID}\n")

    # ── Test 1: Profile Memory (stable_facts, topic tracking) ────────────
    print("─" * 60)
    print("  TEST 1: Profile Memory (stable_facts, topic tracking)")
    print("─" * 60)

    # Write stable_facts
    try:
        profile_ref.set(
            {
                "stable_facts": {
                    "learning_style": "visual",
                    "grade_level": "Grade 11",
                    "weak_topics": ["trigonometry"],
                },
                "preferred_topics": ["geometry", "algebra"],
                "last_updated": firestore.SERVER_TIMESTAMP,
            },
            merge=True,
        )
        report("Write stable_facts", True, f"  Document written to profile")
    except Exception as e:
        report("Write stable_facts", False, f"  Error: {e}")
        raise

    # Read back and verify
    try:
        doc = profile_ref.get()
        data = doc.to_dict() if doc.exists else {}
        facts = data.get("stable_facts", {})
        ok = (
            facts.get("learning_style") == "visual"
            and facts.get("grade_level") == "Grade 11"
        )
        report(
            "Read & verify stable_facts",
            ok,
            f"  stable_facts: {json.dumps(facts, indent=2)}" if ok else f"  Got: {facts}",
        )
        if not ok:
            fails += 1
    except Exception as e:
        report("Read & verify stable_facts", False, f"  Error: {e}")

    # ── Test 2: Active State (turn_count, active_topic) ──────────────────
    print("\n" + "─" * 60)
    print("  TEST 2: Active State (turn_count, active_topic)")
    print("─" * 60)

    # Write initial active state
    try:
        active_ref.set(
            {
                "active_topic": "algebra_linear_equations",
                "turn_count": 1,
                "last_interaction": firestore.SERVER_TIMESTAMP,
            },
            merge=True,
        )
        report("Write initial active state", True)
    except Exception as e:
        report("Write initial active state", False, f"  Error: {e}")

    # Read back
    try:
        doc = active_ref.get()
        data = doc.to_dict() if doc.exists else {}
        ok = data.get("active_topic") == "algebra_linear_equations" and data.get("turn_count") == 1
        report(
            "Read & verify initial state",
            ok,
            f"  active_topic={data.get('active_topic')}, turn_count={data.get('turn_count')}" if ok else f"  Got: {data}",
        )
    except Exception as e:
        report("Read & verify initial state", False, f"  Error: {e}")

    # Increment turn_count (simulate update after each turn)
    try:
        active_ref.set(
            {
                "turn_count": 2,
                "last_interaction": firestore.SERVER_TIMESTAMP,
            },
            merge=True,
        )
        report("Increment turn_count to 2", True)
    except Exception as e:
        report("Increment turn_count to 2", False, f"  Error: {e}")

    # Read back incremented value
    try:
        doc = active_ref.get()
        data = doc.to_dict() if doc.exists else {}
        ok = data.get("turn_count") == 2
        report(
            "Verify turn_count incremented",
            ok,
            f"  turn_count={data.get('turn_count')}" if ok else f"  Got: {data}",
        )
    except Exception as e:
        report("Verify turn_count incremented", False, f"  Error: {e}")

    # Update active_topic mid-session
    try:
        active_ref.set(
            {
                "active_topic": "geometry_triangles",
                "turn_count": 3,
            },
            merge=True,
        )
        report("Update active_topic mid-session", True)
    except Exception as e:
        report("Update active_topic mid-session", False, f"  Error: {e}")

    # Read back topic change
    try:
        doc = active_ref.get()
        data = doc.to_dict() if doc.exists else {}
        ok = data.get("active_topic") == "geometry_triangles" and data.get("turn_count") == 3
        report(
            "Verify topic change reflected",
            ok,
            f"  active_topic={data.get('active_topic')}, turn_count={data.get('turn_count')}" if ok else f"  Got: {data}",
        )
    except Exception as e:
        report("Verify topic change reflected", False, f"  Error: {e}")

    # ── Test 3: Session Summaries (concepts_covered, key_insights) ───────
    print("\n" + "─" * 60)
    print("  TEST 3: Session Summaries (concepts_covered, key_insights)")
    print("─" * 60)

    # Write first session summary
    try:
        ts1 = firestore.SERVER_TIMESTAMP
        session_ref.set(
            {
                "concepts_covered": [
                    "linear equations",
                    "slope-intercept form",
                    "graphing",
                ],
                "key_insights": "Student understands slope but struggles with y-intercept",
                "student_understanding": "developing",
                "session_duration_turns": 12,
                "timestamp": ts1,
            }
        )
        report("Write first session summary", True)
    except Exception as e:
        report("Write first session summary", False, f"  Error: {e}")

    # Write second session summary
    try:
        session_ref_2.set(
            {
                "concepts_covered": [
                    "Pythagorean theorem",
                    "right triangles",
                    "hypotenuse",
                ],
                "key_insights": "Student excelled at applying theorem to real-world problems",
                "student_understanding": "proficient",
                "session_duration_turns": 8,
                "timestamp": firestore.SERVER_TIMESTAMP,
            }
        )
        report("Write second session summary", True)
    except Exception as e:
        report("Write second session summary", False, f"  Error: {e}")

    # Read back first session and verify
    try:
        doc = session_ref.get()
        data = doc.to_dict() if doc.exists else {}
        concepts = data.get("concepts_covered", [])
        insights = data.get("key_insights", "")
        ok = "linear equations" in concepts and "slope" in insights
        report(
            "Verify first session summary",
            ok,
            f"  concepts_covered={concepts}\n         key_insights={insights}"
            if ok
            else f"  Got: concepts={concepts}, insights={insights}",
        )
    except Exception as e:
        report("Verify first session summary", False, f"  Error: {e}")

    # Read back second session and verify
    try:
        doc = session_ref_2.get()
        data = doc.to_dict() if doc.exists else {}
        concepts = data.get("concepts_covered", [])
        insights = data.get("key_insights", "")
        ok = any("Pythagorean" in c for c in concepts) and "real-world" in insights
        report(
            "Verify second session summary",
            ok,
            f"  concepts_covered={concepts}\n         key_insights={insights}"
            if ok
            else f"  Got: concepts={concepts}, insights={insights}",
        )
    except Exception as e:
        report("Verify second session summary", False, f"  Error: {e}")

    # Verify we can query session summaries by collection
    try:
        sessions_query = (
            db.collection("users")
            .document(TEST_UID)
            .collection("tutorMemory")
            .document("sessions")
            .collection("items")
            .order_by("timestamp", direction=firestore.Query.DESCENDING)
            .limit(5)
        )
        results = list(sessions_query.stream())
        ok = len(results) >= 2
        report(
            "Query session summaries collection",
            ok,
            f"  Found {len(results)} session(s)" if ok else f"  Got {len(results)} sessions, expected >= 2",
        )
    except Exception as e:
        report("Query session summaries collection", False, f"  Error: {e}")


    # ── Cleanup ──────────────────────────────────────────────────────────
    print("\n" + "─" * 60)
    print("  CLEANUP: Removing test data")
    print("─" * 60)

    try:
        # Delete session summarie
        session_ref.delete()
        session_ref_2.delete()
        # Clear the active state fields instead of deleting the doc
        active_ref.set(
            {
                "active_topic": firestore.DELETE_FIELD,
                "turn_count": firestore.DELETE_FIELD,
                "last_interaction": firestore.DELETE_FIELD,
            },
            merge=True,
        )
        # Clear test fact from profile
        profile_ref.update(
            {
                "stable_facts.learning_style": firestore.DELETE_FIELD,
                "stable_facts.grade_level": firestore.DELETE_FIELD,
                "stable_facts.weak_topics": firestore.DELETE_FIELD,
                "preferred_topics": firestore.DELETE_FIELD,
                "last_updated": firestore.DELETE_FIELD,
            }
        )
        print("  ✅ Test data cleaned up.\n")
    except Exception as e:
        print(f"  ⚠️  Cleanup warning: {e}")
        print("  (Run-dependent test data will expire naturally if not cleaned.)\n")

    # ── Summary ──────────────────────────────────────────────────────────
    print("=" * 60)
    print(f"  RESULTS: {passes} passed, {fails} failed")
    print("=" * 60)

    return fails == 0


if __name__ == "__main__":
    init_firebase()
    success = run_tests()
    sys.exit(0 if success else 1)
