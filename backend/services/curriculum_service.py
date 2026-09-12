"""
Curriculum Service - Firestore-backed curriculum data.

Fetches subjects, topics, and modules from Firestore.
Falls back to static data if Firestore is unavailable.
"""

import logging
import os
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Static curriculum data as fallback
_STATIC_SUBJECTS = [
    {
        "id": "gen-math",
        "code": "GEN MATH",
        "name": "General Mathematics",
        "gradeLevel": "Grade 11",
        "semester": "1st Semester",
        "quarters": ["Q1", "Q2", "Q3", "Q4"],
        "termStructure": "quarterly",
        "available": True,
        "shelved": False,
        "color": "from-blue-500 to-cyan-500",
        "pdfAvailable": True,
        "topics": [
            {"id": "gen-math-001", "name": "Patterns and Real-Life Relationships", "unit": "Patterns, Relations, and Functions"},
            {"id": "gen-math-002", "name": "Functions as Mathematical Models", "unit": "Patterns, Relations, and Functions"},
            {"id": "gen-math-003", "name": "Function Notation and Evaluation", "unit": "Patterns, Relations, and Functions"},
            {"id": "gen-math-004", "name": "Domain and Range of Functions", "unit": "Patterns, Relations, and Functions"},
            {"id": "gen-math-005", "name": "Operations on Functions", "unit": "Patterns, Relations, and Functions"},
            {"id": "gen-math-006", "name": "Composite Functions", "unit": "Patterns, Relations, and Functions"},
            {"id": "gen-math-007", "name": "Inverse Functions", "unit": "Patterns, Relations, and Functions"},
            {"id": "gen-math-008", "name": "Graphs of Rational Functions", "unit": "Patterns, Relations, and Functions"},
            {"id": "gen-math-009", "name": "Graphs of Exponential Functions", "unit": "Patterns, Relations, and Functions"},
            {"id": "gen-math-010", "name": "Graphs of Logarithmic Functions", "unit": "Patterns, Relations, and Functions"},
            {"id": "gen-math-011", "name": "Simple and Compound Interest", "unit": "Financial Mathematics"},
            {"id": "gen-math-012", "name": "Simple and General Annuities", "unit": "Financial Mathematics"},
            {"id": "gen-math-013", "name": "Present and Future Value", "unit": "Financial Mathematics"},
            {"id": "gen-math-014", "name": "Loans, Amortization, and Sinking Funds", "unit": "Financial Mathematics"},
            {"id": "gen-math-015", "name": "Stocks, Bonds, and Market Indices", "unit": "Financial Mathematics"},
            {"id": "gen-math-016", "name": "Business Decision-Making with Mathematical Models", "unit": "Financial Mathematics"},
            {"id": "gen-math-017", "name": "Propositions and Logical Connectives", "unit": "Logic and Mathematical Reasoning"},
            {"id": "gen-math-018", "name": "Truth Values and Truth Tables", "unit": "Logic and Mathematical Reasoning"},
            {"id": "gen-math-019", "name": "Logical Equivalence and Implication", "unit": "Logic and Mathematical Reasoning"},
            {"id": "gen-math-020", "name": "Quantifiers and Negation", "unit": "Logic and Mathematical Reasoning"},
            {"id": "gen-math-021", "name": "Validity of Arguments", "unit": "Logic and Mathematical Reasoning"},
        ]
    },
    {
        "id": "finite-math",
        "code": "FINITE MATH",
        "name": "Finite Mathematics",
        "gradeLevel": "Grade 11",
        "semester": None,
        "quarters": [],
        "termStructure": "year-long",
        "available": True,
        "shelved": False,
        "color": "from-violet-500 to-purple-500",
        "pdfAvailable": True,
        "topics": [
            {"id": "finite-001", "name": "Geometry of Design", "unit": "Unit 1"},
            {"id": "finite-002", "name": "Patterns in Nature and Art", "unit": "Unit 2"},
            {"id": "finite-003", "name": "Introduction to Matrices", "unit": "Unit 3"},
            {"id": "finite-004", "name": "Introduction to Linear Programming", "unit": "Unit 4"},
        ]
    },
    {
        "id": "stats-prob",
        "code": "STAT&PROB",
        "name": "Statistics and Probability",
        "gradeLevel": "Grade 11",
        "semester": "2nd Semester",
        "quarters": [],
        "termStructure": "shelved",
        "available": False,
        "shelved": True,
        "color": "from-sky-500 to-cyan-500",
        "pdfAvailable": False,
        "topics": [
            {"id": "stat-001", "name": "Random Variables", "unit": "Random Variables"},
            {"id": "stat-002", "name": "Discrete Probability Distributions", "unit": "Random Variables"},
            {"id": "stat-003", "name": "Mean and Variance of Discrete RV", "unit": "Random Variables"},
            {"id": "stat-004", "name": "Normal Distribution", "unit": "Normal Distribution"},
            {"id": "stat-005", "name": "Standard Normal Distribution and Z-scores", "unit": "Normal Distribution"},
            {"id": "stat-006", "name": "Areas Under the Normal Curve", "unit": "Normal Distribution"},
            {"id": "stat-007", "name": "Sampling Distributions", "unit": "Sampling and Estimation"},
            {"id": "stat-008", "name": "Central Limit Theorem", "unit": "Sampling and Estimation"},
            {"id": "stat-009", "name": "Point Estimation", "unit": "Sampling and Estimation"},
            {"id": "stat-010", "name": "Confidence Intervals", "unit": "Sampling and Estimation"},
            {"id": "stat-011", "name": "Hypothesis Testing Concepts", "unit": "Hypothesis Testing"},
            {"id": "stat-012", "name": "T-test", "unit": "Hypothesis Testing"},
            {"id": "stat-013", "name": "Z-test", "unit": "Hypothesis Testing"},
            {"id": "stat-014", "name": "Correlation and Regression", "unit": "Correlation and Regression"},
        ]
    },
    {
        "id": "business-math",
        "code": "BUS MATH",
        "name": "Business Mathematics",
        "gradeLevel": "Grade 11",
        "semester": "1st Semester",
        "quarters": [],
        "termStructure": "shelved",
        "available": False,
        "shelved": True,
        "color": "from-amber-500 to-orange-500",
        "pdfAvailable": False,
        "topics": []
    },
]

_firestore_db = None


def _get_firestore_db():
    """Initialize Firestore client."""
    global _firestore_db
    if _firestore_db is not None:
        return _firestore_db

    try:
        import firebase_admin
        from firebase_admin import firestore
        if not firebase_admin._apps:
            # Try service account from env or default credentials
            import json
            svc_account = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
            if svc_account:
                sa_creds = json.loads(svc_account)
                firebase_admin.initialize_app(firebase_admin.Certificate(sa_creds))
            else:
                firebase_admin.initialize_app()
        _firestore_db = firestore.client()
        return _firestore_db
    except Exception as e:
        logger.warning(f"Could not initialize Firestore: {e}")
        return None


def get_subjects(grade_level: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Fetch all subjects from Firestore.
    Falls back to static data if Firestore unavailable.
    Defaults to Grade 11 (SHS) if no grade specified.
    """
    # Default to Grade 11 (SHS) - only serve Grade 11 students for now
    if grade_level is None:
        grade_level = "Grade 11"
    
    db = _get_firestore_db()
    
    if db is not None:
        try:
            subjects_ref = db.collection("subjects")
            if grade_level:
                subjects_ref = subjects_ref.where("gradeLevel", "==", grade_level)
            
            docs = subjects_ref.stream()
            subjects = []
            for doc in docs:
                data = doc.to_dict()
                if data:
                    data["id"] = doc.id
                    subjects.append(data)
            
            if subjects:
                logger.info(f"Loaded {len(subjects)} subjects from Firestore")
                return subjects
        except Exception as e:
            logger.warning(f"Firestore fetch failed, using static data: {e}")
    
    # Static fallback
    if grade_level:
        return [s for s in _STATIC_SUBJECTS if s.get("gradeLevel") == grade_level]
    return list(_STATIC_SUBJECTS)


def get_subject(subject_id: str) -> Optional[Dict[str, Any]]:
    """Fetch a single subject by ID."""
    db = _get_firestore_db()
    
    if db is not None:
        try:
            doc = db.collection("subjects").document(subject_id).get()
            if doc.exists:
                data = doc.to_dict()
                data["id"] = doc.id
                return data
        except Exception as e:
            logger.warning(f"Firestore fetch failed for {subject_id}: {e}")
    
    # Static fallback
    for subject in _STATIC_SUBJECTS:
        if subject["id"] == subject_id:
            return dict(subject)
    return None


def get_topics(subject_id: str) -> List[Dict[str, Any]]:
    """Fetch all topics for a subject."""
    subject = get_subject(subject_id)
    if subject:
        return subject.get("topics", [])
    return []


def get_topic(subject_id: str, topic_id: str) -> Optional[Dict[str, Any]]:
    """Fetch a single topic."""
    topics = get_topics(subject_id)
    for topic in topics:
        if topic["id"] == topic_id:
            return topic
    return None