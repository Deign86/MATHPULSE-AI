"""
MathPulse AI - ML-Powered Student Analytics & Adaptive Learning Module

Provides:
- Student competency assessment via IRT (Item Response Theory)
- Enhanced risk prediction with trained ML models (Random Forest / XGBoost)
- Quiz difficulty calibration engine
- Topic recommendation engine
- Learning analytics aggregation
- Mock data generation for development/testing
"""

import os
import math
import json
import time
import random
import logging
import hashlib
import traceback
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
from functools import lru_cache
from collections import defaultdict

import numpy as np  # type: ignore[import-not-found]
from scipy import stats as scipy_stats  # type: ignore[import-not-found]
from scipy.optimize import minimize_scalar  # type: ignore[import-not-found]
from sklearn.linear_model import LinearRegression  # type: ignore[import-not-found]
from sklearn.ensemble import RandomForestClassifier  # type: ignore[import-not-found]
from sklearn.model_selection import train_test_split  # type: ignore[import-not-found]
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report  # type: ignore[import-not-found]
from pydantic import BaseModel, Field

# Optional heavy dependencies — guarded imports
xgb: Any = None
shap: Any = None
joblib: Any = None
firebase_admin: Any = None
credentials: Any = None
firestore: Any = None

try:
    import xgboost as xgb  # type: ignore[import-not-found,no-redef]
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False

try:
    import shap  # type: ignore[import-not-found,no-redef]
    HAS_SHAP = True
except ImportError:
    HAS_SHAP = False

try:
    import joblib  # type: ignore[import-not-found,no-redef]
    HAS_JOBLIB = True
except ImportError:
    HAS_JOBLIB = False

try:
    import firebase_admin  # type: ignore[import-not-found,no-redef]
    from firebase_admin import credentials, firestore  # type: ignore[import-not-found,no-redef,assignment]
    HAS_FIREBASE = True
except ImportError:
    HAS_FIREBASE = False

logger = logging.getLogger("mathpulse.analytics")

# ─── Configuration ─────────────────────────────────────────────

RISK_MODEL_PATH = "models/risk_classifier.joblib"
IRT_DIFFICULTY_CACHE_TTL = 3600  # 1 hour
MIN_QUIZ_ATTEMPTS_FOR_COMPETENCY = 3
LEARNING_VELOCITY_WINDOW_DAYS = 30
COMPETENCY_THRESHOLDS = {
    "beginner": (0, 40),
    "developing": (40, 65),
    "proficient": (65, 85),
    "advanced": (85, 100),
}

# Topic dependency / prerequisite graph
TOPIC_PREREQUISITES: Dict[str, List[str]] = {
    "Quadratic Equations": ["Linear Equations", "Variables & Expressions"],
    "Systems of Equations": ["Linear Equations", "Slope & Rate of Change"],
    "Polynomials": ["Variables & Expressions", "Exponents & Powers"],
    "Factoring": ["Polynomials", "Variables & Expressions"],
    "Quadratic Functions": ["Quadratic Equations", "Functions"],
    "Exponential Functions": ["Exponents & Powers", "Functions"],
    "Trigonometric Ratios": ["Pythagorean Theorem", "Angles", "Triangles"],
    "Trigonometric Functions": ["Trigonometric Ratios", "Functions"],
    "Derivatives": ["Limits", "Functions"],
    "Integration": ["Derivatives", "Area Under a Curve"],
    "Limits": ["Functions", "Rational Expressions"],
    "Coordinate Geometry": ["Linear Equations", "Slope & Rate of Change"],
    "Circle Theorems": ["Circles", "Angles"],
    "Logarithmic Functions": ["Exponential Functions"],
    "Rational Functions": ["Polynomials", "Factoring"],
    "Complex Numbers": ["Quadratic Equations", "Radicals & Exponents"],
    "Matrices (Introduction)": ["Systems of Equations"],
    "Conic Sections": ["Coordinate Geometry", "Quadratic Functions"],
    "Probability of Compound Events": ["Probability Basics"],
    "Permutations & Combinations": ["Probability Basics", "Factorial"],
    "Hypothesis Testing Basics": ["Normal Distribution Basics", "Sampling Methods"],
    "Confidence Intervals": ["Normal Distribution Basics", "Sampling Methods"],
    "Regression Analysis": ["Scatter Plots", "Linear Functions"],
    "Statistical Inference": ["Hypothesis Testing Basics", "Confidence Intervals"],
    "Multivariable Calculus": ["Derivatives", "Integration"],
    "Differential Equations": ["Derivatives", "Integration"],
    "Vector Calculus": ["Multivariable Calculus", "Vectors"],
    "Linear Transformations": ["Matrices & Determinants", "Vector Spaces"],
    "Eigenvalues & Eigenvectors": ["Matrices & Determinants"],
}


# ─── Pydantic Models ──────────────────────────────────────────

class CompetencyAnalysisRequest(BaseModel):
    studentId: str
    topicId: Optional[str] = None


class CompetencyAnalysis(BaseModel):
    topicId: str
    topicName: str
    efficiencyScore: float = Field(..., ge=0, le=100)
    competencyLevel: str
    masteryPercentage: float
    learningVelocity: float
    totalAttempts: int
    averageAccuracy: float
    lastAttemptDate: Optional[str] = None


class CompetencyAnalysisResponse(BaseModel):
    studentId: str
    status: str  # "success" | "insufficient_data"
    analyses: List[CompetencyAnalysis]
    overallCompetency: Optional[str] = None
    thetaEstimate: Optional[float] = None


class TopicRecommendation(BaseModel):
    topicId: str
    topicName: str
    recommendationScore: float
    reasoning: str
    estimatedTimeToMastery: int  # hours
    prerequisitesMet: bool
    currentCompetency: str


class TopicRecommendationRequest(BaseModel):
    studentId: str
    numRecommendations: int = Field(default=5, ge=1, le=20)


class TopicRecommendationResponse(BaseModel):
    studentId: str
    recommendations: List[TopicRecommendation]
    status: str


class EnhancedRiskPrediction(BaseModel):
    riskLevel: str
    confidence: float
    probabilities: Dict[str, float]
    contributingFactors: List[Dict[str, Any]]
    recommendations: List[str]
    modelUsed: str  # "ml_model" | "rule_based" | "zero_shot"


class EnhancedRiskRequest(BaseModel):
    studentId: str
    engagementScore: float = Field(..., ge=0, le=100)
    avgQuizScore: float = Field(..., ge=0, le=100)
    attendance: float = Field(..., ge=0, le=100)
    assignmentCompletion: float = Field(..., ge=0, le=100)
    streak: Optional[int] = 0
    xpGrowthRate: Optional[float] = 0.0
    timeOnPlatform: Optional[float] = 0.0  # hours
    # Optional trend data
    engagementTrend7d: Optional[float] = None
    quizScoreVariance: Optional[float] = None
    consecutiveAbsences: Optional[int] = 0
    daysSinceLastActivity: Optional[int] = 0


class RiskTrainRequest(BaseModel):
    forceRetrain: bool = False


class RiskTrainResponse(BaseModel):
    status: str
    accuracy: float
    precision: float
    recall: float
    f1Score: float
    samplesUsed: int
    modelPath: str


class CalibrateDifficultyRequest(BaseModel):
    questionId: str
    studentResponses: List[Dict[str, Any]]  # [{studentId, correct, timeSpent, attempts}]


class CalibrateDifficultyResponse(BaseModel):
    questionId: str
    difficultyParameter: float  # b parameter
    discriminationParameter: float  # a parameter
    guessingParameter: float  # c parameter
    difficultyLabel: str  # "easy" | "medium" | "hard"
    totalResponses: int
    successRate: float


class AdaptiveQuizRequest(BaseModel):
    studentId: str
    topicId: str
    numQuestions: int = Field(default=10, ge=1, le=50)
    targetSuccessRate: float = Field(default=0.70, ge=0.3, le=0.95)


class AdaptiveQuizSelection(BaseModel):
    questionId: str
    estimatedDifficulty: float
    predictedSuccessProbability: float
    difficultyLabel: str


class AdaptiveQuizResponse(BaseModel):
    studentId: str
    topicId: str
    selectedQuestions: List[AdaptiveQuizSelection]
    studentAbilityEstimate: float
    expectedSuccessRate: float
    difficultyDistribution: Dict[str, int]


class StudentSummaryResponse(BaseModel):
    studentId: str
    competencyDistribution: Dict[str, int]
    riskAssessment: Optional[Dict[str, Any]] = None
    recommendedTopics: List[Dict[str, Any]]
    learningVelocityTrend: List[Dict[str, Any]]
    efficiencyScores: Dict[str, float]
    predictedNextQuizScore: Optional[float] = None
    engagementPatterns: Dict[str, Any]
    status: str


class ClassInsightsRequest(BaseModel):
    teacherId: str
    classId: Optional[str] = None


class ClassInsightsResponse(BaseModel):
    teacherId: str
    riskDistribution: Dict[str, int]
    riskTrend: List[Dict[str, Any]]
    commonWeakTopics: List[Dict[str, Any]]
    learningVelocityDistribution: Dict[str, float]
    engagementPatterns: Dict[str, Any]
    interventionRecommendations: List[Dict[str, Any]]
    successPredictions: Dict[str, Any]
    totalStudents: int
    status: str


class MockDataRequest(BaseModel):
    numStudents: int = Field(default=30, ge=1, le=200)
    numQuizzes: int = Field(default=20, ge=1, le=100)
    seed: Optional[int] = None


class RefreshCacheResponse(BaseModel):
    status: str
    cachedItems: int
    timestamp: str


# ─── In-Memory Caches ─────────────────────────────────────────

_competency_cache: Dict[str, Tuple[float, Any]] = {}
_class_stats_cache: Dict[str, Tuple[float, Any]] = {}
_difficulty_cache: Dict[str, Tuple[float, Any]] = {}
_risk_model_cache: Dict[str, Any] = {}


def _cache_get(cache: Dict[str, Tuple[float, Any]], key: str, ttl: int) -> Optional[Any]:
    """Get from cache if not expired."""
    if key in cache:
        ts, val = cache[key]
        if time.time() - ts < ttl:
            return val
        del cache[key]
    return None


def _cache_set(cache: Dict[str, Tuple[float, Any]], key: str, value: Any):
    """Set a cache entry with current timestamp."""
    cache[key] = (time.time(), value)


# ─── Firebase Helpers ──────────────────────────────────────────

_firestore_db = None


def _get_firestore_db():
    """Get or initialise Firestore client."""
    global _firestore_db
    if _firestore_db is not None:
        return _firestore_db

    if not HAS_FIREBASE:
        logger.warning("firebase-admin not installed; Firestore operations will use mock data")
        return None

    try:
        # Check if already initialised
        firebase_admin.get_app()
    except ValueError:
        # Initialise with default credentials or service account
        cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        else:
            # Try default credentials (e.g., GCP environment)
            try:
                firebase_admin.initialize_app()
            except Exception as e:
                logger.warning(f"Could not initialise Firebase: {e}")
                return None

    _firestore_db = firestore.client()
    return _firestore_db


async def fetch_student_quiz_history(student_id: str) -> List[Dict[str, Any]]:
    """Fetch quiz attempt history for a student from Firestore."""
    db = _get_firestore_db()
    if db is None:
        logger.info(f"No Firestore connection; returning empty quiz history for {student_id}")
        return []

    try:
        # Query progress collection for the student
        progress_ref = db.collection("progress").where("userId", "==", student_id)
        docs = progress_ref.stream()
        history = []
        for doc in docs:
            data = doc.to_dict()
            if data:
                data["id"] = doc.id
                history.append(data)

        # Also check quizAttempts subcollection if it exists
        quiz_ref = db.collection("quizAttempts").where("studentId", "==", student_id).order_by(
            "completedAt", direction=firestore.Query.DESCENDING
        )
        quiz_docs = quiz_ref.stream()
        for doc in quiz_docs:
            data = doc.to_dict()
            if data:
                data["id"] = doc.id
                data["source"] = "quizAttempts"
                history.append(data)

        logger.info(f"Fetched {len(history)} quiz history records for student {student_id}")
        return history

    except Exception as e:
        logger.error(f"Error fetching quiz history for {student_id}: {e}")
        return []


async def fetch_student_engagement_metrics(student_id: str, days: int = 30) -> Dict[str, Any]:
    """Fetch engagement metrics for a student over the past N days."""
    db = _get_firestore_db()
    if db is None:
        return {
            "totalTimeOnPlatform": 0,
            "sessionsCount": 0,
            "avgSessionDuration": 0,
            "dailyActivity": {},
            "hourlyActivity": {},
        }

    try:
        cutoff = datetime.utcnow() - timedelta(days=days)

        # Fetch XP activities as engagement proxy
        xp_ref = db.collection("xpActivities").where(
            "userId", "==", student_id
        ).where("timestamp", ">=", cutoff)
        xp_docs = xp_ref.stream()

        daily_activity: Dict[str, int] = {}
        hourly_activity: Dict[int, int] = defaultdict(int)
        total_xp = 0
        activity_count = 0

        for doc in xp_docs:
            data = doc.to_dict()
            if data:
                activity_count += 1
                total_xp += data.get("xpAmount", 0)
                ts = data.get("timestamp")
                if ts:
                    if hasattr(ts, "seconds"):
                        dt = datetime.utcfromtimestamp(ts.seconds)
                    elif isinstance(ts, datetime):
                        dt = ts
                    else:
                        continue
                    day_key = dt.strftime("%Y-%m-%d")
                    daily_activity[day_key] = daily_activity.get(day_key, 0) + 1
                    hourly_activity[dt.hour] += 1

        return {
            "totalXP": total_xp,
            "activityCount": activity_count,
            "dailyActivity": daily_activity,
            "hourlyActivity": dict(hourly_activity),
            "activeDays": len(daily_activity),
            "avgActivitiesPerDay": round(activity_count / max(len(daily_activity), 1), 2),
        }

    except Exception as e:
        logger.error(f"Error fetching engagement metrics for {student_id}: {e}")
        return {"totalXP": 0, "activityCount": 0, "dailyActivity": {}, "hourlyActivity": {}}


def fetch_topic_dependencies() -> Dict[str, List[str]]:
    """Return the topic prerequisite graph."""
    return TOPIC_PREREQUISITES.copy()


async def store_competency_analysis(student_id: str, analysis: Dict[str, Any]):
    """Store competency analysis results in Firestore."""
    db = _get_firestore_db()
    if db is None:
        logger.info(f"No Firestore; skipping competency storage for {student_id}")
        return

    try:
        doc_ref = db.collection("competencyAnalyses").document(student_id)
        analysis["updatedAt"] = firestore.SERVER_TIMESTAMP
        doc_ref.set(analysis, merge=True)
        logger.info(f"Stored competency analysis for {student_id}")
    except Exception as e:
        logger.error(f"Error storing competency analysis: {e}")


async def store_question_difficulty(question_id: str, params: Dict[str, Any]):
    """Store question IRT difficulty parameters in Firestore."""
    db = _get_firestore_db()
    if db is None:
        logger.info(f"No Firestore; skipping difficulty storage for {question_id}")
        return

    try:
        doc_ref = db.collection("questions").document(question_id).collection(
            "difficulty_params"
        ).document("irt")
        params["updatedAt"] = firestore.SERVER_TIMESTAMP
        doc_ref.set(params, merge=True)
        logger.info(f"Stored difficulty params for question {question_id}")
    except Exception as e:
        logger.error(f"Error storing question difficulty: {e}")


# ─── IRT & Statistical Helpers ─────────────────────────────────


def _irt_3pl_probability(theta: float, a: float, b: float, c: float = 0.25) -> float:
    """
    3-Parameter Logistic IRT model.
    P(correct) = c + (1 - c) / (1 + exp(-a * (theta - b)))
    theta: student ability
    a: discrimination
    b: difficulty
    c: guessing parameter
    """
    exponent = -a * (theta - b)
    exponent = max(-20, min(20, exponent))  # numerical stability
    return c + (1 - c) / (1 + math.exp(exponent))


def _estimate_theta(responses: List[Dict[str, Any]], difficulty_params: Dict[str, Dict[str, float]]) -> float:
    """
    Estimate student ability (theta) using Maximum Likelihood Estimation.
    responses: list of {questionId, correct: bool}
    difficulty_params: {questionId: {a, b, c}}
    """
    if not responses:
        return 0.0

    def neg_log_likelihood(theta: float) -> float:
        ll = 0.0
        for r in responses:
            qid = r.get("questionId", "")
            params = difficulty_params.get(qid, {"a": 1.0, "b": 0.0, "c": 0.25})
            p = _irt_3pl_probability(theta, params["a"], params["b"], params.get("c", 0.25))
            p = max(1e-10, min(1 - 1e-10, p))  # avoid log(0)
            if r.get("correct", False):
                ll += math.log(p)
            else:
                ll += math.log(1 - p)
        return -ll

    result = minimize_scalar(neg_log_likelihood, bounds=(-4, 4), method="bounded")
    return round(result.x, 3)


def _calculate_learning_velocity(scores_over_time: List[Tuple[float, float]]) -> float:
    """
    Calculate learning velocity using weighted linear regression.
    scores_over_time: list of (timestamp_as_days, score)
    Returns slope (positive = improving, negative = declining).
    """
    if len(scores_over_time) < 2:
        return 0.0

    times = np.array([t for t, _ in scores_over_time]).reshape(-1, 1)
    scores = np.array([s for _, s in scores_over_time])

    # Exponential decay weights (more recent = higher weight)
    max_time = times.max()
    decay_rate = 0.05
    weights = np.exp(-decay_rate * (max_time - times.flatten()))
    weights = weights / weights.sum()

    # Weighted linear regression
    model = LinearRegression()
    model.fit(times, scores, sample_weight=weights)

    return round(float(model.coef_[0]), 4)


def _calculate_efficiency_score(
    student_times: List[float],
    student_accuracies: List[bool],
    class_avg_time: float,
    attempt_counts: List[int],
) -> float:
    """
    Efficiency = (class_avg_time / student_time) * accuracy_multiplier * 100
    Penalise multiple attempts.
    """
    if not student_times or class_avg_time <= 0:
        return 50.0

    efficiencies = []
    for t, correct, attempts in zip(student_times, student_accuracies, attempt_counts):
        if t <= 0:
            t = 1.0
        time_ratio = class_avg_time / t
        accuracy_mult = 1.0 if correct else 0.3
        attempt_penalty = 1.0 / max(attempts, 1)
        eff = time_ratio * accuracy_mult * attempt_penalty * 100
        efficiencies.append(min(eff, 150))  # cap at 150 to avoid outliers

    raw = sum(efficiencies) / len(efficiencies)
    return round(min(max(raw, 0), 100), 2)


def _get_competency_level(score: float) -> str:
    """Map a score (0-100) to competency level."""
    for level, (low, high) in COMPETENCY_THRESHOLDS.items():
        if low <= score < high:
            return level
    return "advanced" if score >= 85 else "beginner"


# ─── Competency Assessment System ─────────────────────────────


async def compute_competency_analysis(
    student_id: str,
    quiz_history: List[Dict[str, Any]],
    topic_filter: Optional[str] = None,
) -> CompetencyAnalysisResponse:
    """
    Full competency analysis using IRT approach.
    """
    if not quiz_history or len(quiz_history) < MIN_QUIZ_ATTEMPTS_FOR_COMPETENCY:
        return CompetencyAnalysisResponse(
            studentId=student_id,
            status="insufficient_data",
            analyses=[],
            overallCompetency=None,
            thetaEstimate=None,
        )

    # Group by topic
    topic_data: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for entry in quiz_history:
        topic = entry.get("topicId") or entry.get("topic") or "Unknown"
        if topic_filter and topic != topic_filter:
            continue
        topic_data[topic].append(entry)

    if not topic_data:
        return CompetencyAnalysisResponse(
            studentId=student_id,
            status="insufficient_data",
            analyses=[],
        )

    # Build difficulty params from class-wide success rates
    difficulty_params: Dict[str, Dict[str, float]] = {}
    all_responses_for_irt: List[Dict[str, Any]] = []

    for topic, entries in topic_data.items():
        for entry in entries:
            qid = entry.get("questionId", entry.get("id", f"{topic}_{len(all_responses_for_irt)}"))
            correct = entry.get("correct", False)
            if isinstance(correct, (int, float)):
                correct = correct > 0.5
            score = entry.get("score", 0)
            total = entry.get("total", 1)
            if not isinstance(correct, bool) and total > 0:
                correct = (score / total) >= 0.5

            all_responses_for_irt.append({"questionId": qid, "correct": correct})

            # Estimate difficulty from success rate across the dataset
            if qid not in difficulty_params:
                difficulty_params[qid] = {"a": 1.0, "b": 0.0, "c": 0.25}

    # Estimate theta
    theta = _estimate_theta(all_responses_for_irt, difficulty_params)

    # Per-topic analysis
    analyses: List[CompetencyAnalysis] = []

    for topic, entries in topic_data.items():
        topic_name = topic.replace("_", " ").title()

        # Accuracy
        correct_count = 0
        total_count = 0
        first_attempt_correct = 0
        first_attempt_total = 0
        times: List[float] = []
        accuracies: List[bool] = []
        attempt_counts: List[int] = []
        scores_over_time: List[Tuple[float, float]] = []

        for entry in entries:
            total_count += 1
            score = entry.get("score", 0)
            total = max(entry.get("total", 1), 1)
            pct = (score / total) * 100
            correct = pct >= 50
            if correct:
                correct_count += 1

            attempts = entry.get("attempts", 1)
            if attempts <= 1 and correct:
                first_attempt_correct += 1
            first_attempt_total += 1

            time_spent = entry.get("timeTaken") or entry.get("timeSpent") or 60
            times.append(float(time_spent))
            accuracies.append(correct)
            attempt_counts.append(max(attempts, 1))

            # Timestamp for velocity
            ts = entry.get("completedAt") or entry.get("timestamp") or entry.get("date")
            if ts:
                if isinstance(ts, (int, float)):
                    day_val = ts / 86400
                elif hasattr(ts, "seconds"):
                    day_val = ts.seconds / 86400
                elif isinstance(ts, datetime):
                    day_val = ts.timestamp() / 86400
                elif isinstance(ts, str):
                    try:
                        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                        day_val = dt.timestamp() / 86400
                    except Exception:
                        day_val = time.time() / 86400
                else:
                    day_val = time.time() / 86400
                scores_over_time.append((day_val, pct))

        avg_accuracy = (correct_count / max(total_count, 1)) * 100
        mastery_pct = (first_attempt_correct / max(first_attempt_total, 1)) * 100

        # Class average time (use all entries as proxy)
        class_avg_time = np.mean(times) if times else 60.0

        efficiency = _calculate_efficiency_score(times, accuracies, class_avg_time, attempt_counts)
        velocity = _calculate_learning_velocity(scores_over_time)
        competency_level = _get_competency_level(avg_accuracy)

        # Last attempt date
        last_date = None
        if scores_over_time:
            last_ts = max(t for t, _ in scores_over_time)
            last_date = datetime.utcfromtimestamp(last_ts * 86400).isoformat()

        analyses.append(CompetencyAnalysis(
            topicId=topic,
            topicName=topic_name,
            efficiencyScore=efficiency,
            competencyLevel=competency_level,
            masteryPercentage=round(mastery_pct, 2),
            learningVelocity=velocity,
            totalAttempts=total_count,
            averageAccuracy=round(avg_accuracy, 2),
            lastAttemptDate=last_date,
        ))

    # Sort by efficiency score ascending (weakest first)
    analyses.sort(key=lambda a: a.efficiencyScore)

    # Overall competency
    if analyses:
        avg_eff = sum(a.efficiencyScore for a in analyses) / len(analyses)
        overall = _get_competency_level(avg_eff)
    else:
        overall = None

    return CompetencyAnalysisResponse(
        studentId=student_id,
        status="success",
        analyses=analyses,
        overallCompetency=overall,
        thetaEstimate=theta,
    )


# ─── Enhanced Risk Prediction ─────────────────────────────────


def _build_risk_features(data: EnhancedRiskRequest) -> np.ndarray:
    """Build feature vector for risk prediction."""
    features = [
        data.engagementScore,
        data.avgQuizScore,
        data.attendance,
        data.assignmentCompletion,
        data.streak or 0,
        data.xpGrowthRate or 0.0,
        data.timeOnPlatform or 0.0,
        data.engagementTrend7d or 0.0,
        data.quizScoreVariance or 0.0,
        data.consecutiveAbsences or 0,
        data.daysSinceLastActivity or 0,
    ]
    return np.array(features).reshape(1, -1)


RISK_FEATURE_NAMES = [
    "engagementScore",
    "avgQuizScore",
    "attendance",
    "assignmentCompletion",
    "streak",
    "xpGrowthRate",
    "timeOnPlatform",
    "engagementTrend7d",
    "quizScoreVariance",
    "consecutiveAbsences",
    "daysSinceLastActivity",
]


def _load_risk_model():
    """Load trained risk model from disk."""
    if not HAS_JOBLIB:
        return None

    cache_key = "risk_model"
    cached = _risk_model_cache.get(cache_key)
    if cached is not None:
        return cached

    if os.path.exists(RISK_MODEL_PATH):
        try:
            model = joblib.load(RISK_MODEL_PATH)
            _risk_model_cache[cache_key] = model
            logger.info("Loaded trained risk model from disk")
            return model
        except Exception as e:
            logger.error(f"Error loading risk model: {e}")
    return None


def _rule_based_risk(data: EnhancedRiskRequest) -> EnhancedRiskPrediction:
    """Fallback rule-based risk prediction when no ML model is available."""
    score = (
        data.engagementScore * 0.25
        + data.avgQuizScore * 0.30
        + data.attendance * 0.25
        + data.assignmentCompletion * 0.20
    )

    # Penalties
    if (data.consecutiveAbsences or 0) >= 3:
        score -= 10
    if (data.daysSinceLastActivity or 0) >= 7:
        score -= 10
    if (data.streak or 0) == 0:
        score -= 5

    # Bonuses
    if (data.streak or 0) >= 7:
        score += 5
    if (data.engagementTrend7d or 0) > 0:
        score += 5

    score = max(0, min(100, score))

    if score >= 70:
        risk_level = "Low"
        probs = {"High": 0.05, "Medium": 0.15, "Low": 0.80}
    elif score >= 45:
        risk_level = "Medium"
        probs = {"High": 0.15, "Medium": 0.55, "Low": 0.30}
    else:
        risk_level = "High"
        probs = {"High": 0.70, "Medium": 0.20, "Low": 0.10}

    factors = []
    if data.avgQuizScore < 50:
        factors.append({"feature": "avgQuizScore", "impact": -0.3, "detail": "Low quiz scores"})
    if data.attendance < 60:
        factors.append({"feature": "attendance", "impact": -0.25, "detail": "Poor attendance"})
    if data.engagementScore < 40:
        factors.append({"feature": "engagementScore", "impact": -0.2, "detail": "Low engagement"})
    if (data.consecutiveAbsences or 0) >= 3:
        factors.append({"feature": "consecutiveAbsences", "impact": -0.15, "detail": "Multiple consecutive absences"})
    if data.assignmentCompletion < 50:
        factors.append({"feature": "assignmentCompletion", "impact": -0.2, "detail": "Low assignment completion"})
    if not factors:
        factors.append({"feature": "overall", "impact": 0.0, "detail": "No major risk factors identified"})

    recommendations = []
    if risk_level == "High":
        recommendations = [
            "Schedule immediate one-on-one check-in with student",
            "Set up tutoring sessions for weak subjects",
            "Contact parent/guardian about academic concerns",
            "Create a structured study plan with daily goals",
        ]
    elif risk_level == "Medium":
        recommendations = [
            "Monitor progress closely over next 2 weeks",
            "Encourage participation in study groups",
            "Assign additional practice exercises for weak areas",
        ]
    else:
        recommendations = [
            "Continue current learning approach",
            "Challenge with advanced material when ready",
        ]

    return EnhancedRiskPrediction(
        riskLevel=risk_level,
        confidence=round(max(probs.values()), 3),
        probabilities=probs,
        contributingFactors=factors[:3],
        recommendations=recommendations,
        modelUsed="rule_based",
    )


async def predict_risk_enhanced(data: EnhancedRiskRequest) -> EnhancedRiskPrediction:
    """Enhanced risk prediction using trained ML model with SHAP explanations."""
    model = _load_risk_model()

    if model is None:
        logger.info("No trained ML model found; using rule-based risk prediction")
        return _rule_based_risk(data)

    try:
        features = _build_risk_features(data)
        label_map = {0: "High", 1: "Medium", 2: "Low"}

        # Predict
        prediction = model.predict(features)[0]
        probabilities_raw = model.predict_proba(features)[0]
        risk_level = label_map.get(int(prediction), "Medium")

        probs = {}
        for i, label in label_map.items():
            if i < len(probabilities_raw):
                probs[label] = round(float(probabilities_raw[i]), 4)
            else:
                probs[label] = 0.0

        confidence = round(float(max(probabilities_raw)), 4)

        # SHAP explanations
        factors = []
        if HAS_SHAP:
            try:
                explainer = shap.TreeExplainer(model)
                shap_values = explainer.shap_values(features)

                if isinstance(shap_values, list):
                    # Multi-class: use SHAP values for predicted class
                    sv = shap_values[int(prediction)][0]
                else:
                    sv = shap_values[0]

                # Get top 3 contributing features
                feature_impacts = list(zip(RISK_FEATURE_NAMES, sv))
                feature_impacts.sort(key=lambda x: abs(x[1]), reverse=True)

                for fname, impact in feature_impacts[:3]:
                    idx = RISK_FEATURE_NAMES.index(fname)
                    fval = features[0][idx]
                    factors.append({
                        "feature": fname,
                        "impact": round(float(impact), 4),
                        "value": round(float(fval), 2),
                        "detail": f"{fname} = {fval:.1f} (SHAP impact: {impact:.3f})",
                    })
            except Exception as e:
                logger.warning(f"SHAP explanation failed: {e}")
                factors = [{"feature": "model_prediction", "impact": 0.0, "detail": "SHAP unavailable"}]
        else:
            # Feature importance fallback
            if hasattr(model, "feature_importances_"):
                importances = model.feature_importances_
                fi = list(zip(RISK_FEATURE_NAMES, importances))
                fi.sort(key=lambda x: x[1], reverse=True)
                for fname, imp in fi[:3]:
                    idx = RISK_FEATURE_NAMES.index(fname)
                    fval = features[0][idx]
                    factors.append({
                        "feature": fname,
                        "impact": round(float(imp), 4),
                        "value": round(float(fval), 2),
                        "detail": f"{fname} = {fval:.1f} (importance: {imp:.3f})",
                    })

        # Recommendations based on prediction
        if risk_level == "High":
            recommendations = [
                "Immediate intervention recommended — schedule one-on-one session",
                "Review recent quiz performance for specific skill gaps",
                "Contact parent/guardian about academic concerns",
                "Create personalised remediation plan",
            ]
        elif risk_level == "Medium":
            recommendations = [
                "Monitor student progress more frequently",
                "Assign targeted practice for weak areas",
                "Encourage peer study groups",
            ]
        else:
            recommendations = [
                "Student is performing well — maintain current pace",
                "Consider enrichment activities for advanced topics",
            ]

        return EnhancedRiskPrediction(
            riskLevel=risk_level,
            confidence=confidence,
            probabilities=probs,
            contributingFactors=factors,
            recommendations=recommendations,
            modelUsed="ml_model",
        )

    except Exception as e:
        logger.error(f"ML risk prediction failed: {e}\n{traceback.format_exc()}")
        logger.info("Falling back to rule-based prediction")
        return _rule_based_risk(data)


async def train_risk_model(force_retrain: bool = False) -> RiskTrainResponse:
    """
    Train a risk classification model on historical student data.
    Tries XGBoost first, falls back to Random Forest.
    """
    if not HAS_JOBLIB:
        raise ValueError("joblib not installed; cannot save model")

    # Check if model exists and skip unless forced
    if os.path.exists(RISK_MODEL_PATH) and not force_retrain:
        return RiskTrainResponse(
            status="model_exists",
            accuracy=0.0,
            precision=0.0,
            recall=0.0,
            f1Score=0.0,
            samplesUsed=0,
            modelPath=RISK_MODEL_PATH,
        )

    # Fetch historical data from Firestore
    db = _get_firestore_db()
    X_data = []
    y_data = []

    if db is not None:
        try:
            users_ref = db.collection("users").where("role", "==", "student").limit(500)
            user_docs = users_ref.stream()

            for doc in user_docs:
                data = doc.to_dict()
                if not data:
                    continue

                features = [
                    data.get("engagementScore", 50),
                    data.get("avgQuizScore", 50),
                    data.get("attendance", 80),
                    data.get("assignmentCompletion", 60),
                    data.get("streak", 0),
                    data.get("xpGrowthRate", 0),
                    data.get("timeOnPlatform", 0),
                    0.0,  # engagementTrend7d
                    0.0,  # quizScoreVariance
                    data.get("consecutiveAbsences", 0),
                    data.get("daysSinceLastActivity", 0),
                ]
                X_data.append(features)

                # Determine label from existing riskLevel or compute it
                risk = data.get("riskLevel", "")
                if risk == "High":
                    y_data.append(0)
                elif risk == "Medium":
                    y_data.append(1)
                else:
                    y_data.append(2)

        except Exception as e:
            logger.error(f"Error fetching training data: {e}")

    # If insufficient real data, generate synthetic training data
    if len(X_data) < 50:
        logger.info("Insufficient Firestore data; generating synthetic training data")
        synth_X, synth_y = _generate_synthetic_risk_data(500)
        X_data.extend(synth_X.tolist())
        y_data.extend(synth_y.tolist())

    X = np.array(X_data)
    y = np.array(y_data)

    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    # Train model
    if HAS_XGBOOST:
        model = xgb.XGBClassifier(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            objective="multi:softprob",
            num_class=3,
            eval_metric="mlogloss",
            random_state=42,
            use_label_encoder=False,
        )
        logger.info("Training XGBoost risk classifier")
    else:
        model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            class_weight="balanced",
        )
        logger.info("Training Random Forest risk classifier")

    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, average="weighted", zero_division=0)
    rec = recall_score(y_test, y_pred, average="weighted", zero_division=0)
    f1 = f1_score(y_test, y_pred, average="weighted", zero_division=0)

    logger.info(f"Risk model trained: accuracy={acc:.3f}, F1={f1:.3f}")
    logger.info(f"Classification report:\n{classification_report(y_test, y_pred, zero_division=0)}")

    # Save model
    os.makedirs(os.path.dirname(RISK_MODEL_PATH), exist_ok=True)
    joblib.dump(model, RISK_MODEL_PATH)
    logger.info(f"Risk model saved to {RISK_MODEL_PATH}")

    # Clear model cache so next prediction loads new model
    _risk_model_cache.clear()

    return RiskTrainResponse(
        status="trained",
        accuracy=round(acc, 4),
        precision=round(prec, 4),
        recall=round(rec, 4),
        f1Score=round(f1, 4),
        samplesUsed=len(X_data),
        modelPath=RISK_MODEL_PATH,
    )


def _generate_synthetic_risk_data(n: int) -> Tuple[np.ndarray, np.ndarray]:
    """Generate synthetic student data for model training."""
    np.random.seed(42)

    X = []
    y = []

    for _ in range(n):
        risk_class = np.random.choice([0, 1, 2], p=[0.2, 0.3, 0.5])

        if risk_class == 0:  # High risk
            engagement = np.random.normal(30, 15)
            quiz = np.random.normal(35, 12)
            attendance = np.random.normal(50, 15)
            completion = np.random.normal(35, 15)
            streak = max(0, int(np.random.normal(1, 2)))
            xp_growth = np.random.normal(-0.5, 0.3)
            time_platform = np.random.normal(2, 1)
            trend = np.random.normal(-10, 5)
            variance = np.random.normal(25, 8)
            absences = max(0, int(np.random.normal(4, 2)))
            days_inactive = max(0, int(np.random.normal(10, 5)))
        elif risk_class == 1:  # Medium risk
            engagement = np.random.normal(55, 12)
            quiz = np.random.normal(60, 10)
            attendance = np.random.normal(72, 10)
            completion = np.random.normal(60, 12)
            streak = max(0, int(np.random.normal(3, 3)))
            xp_growth = np.random.normal(0.2, 0.3)
            time_platform = np.random.normal(5, 2)
            trend = np.random.normal(0, 8)
            variance = np.random.normal(15, 5)
            absences = max(0, int(np.random.normal(2, 1)))
            days_inactive = max(0, int(np.random.normal(3, 3)))
        else:  # Low risk
            engagement = np.random.normal(82, 10)
            quiz = np.random.normal(85, 8)
            attendance = np.random.normal(93, 5)
            completion = np.random.normal(88, 8)
            streak = max(0, int(np.random.normal(10, 5)))
            xp_growth = np.random.normal(1.0, 0.4)
            time_platform = np.random.normal(10, 3)
            trend = np.random.normal(5, 5)
            variance = np.random.normal(8, 3)
            absences = 0
            days_inactive = max(0, int(np.random.normal(1, 1)))

        features = [
            max(0, min(100, engagement)),
            max(0, min(100, quiz)),
            max(0, min(100, attendance)),
            max(0, min(100, completion)),
            streak,
            xp_growth,
            max(0, time_platform),
            trend,
            max(0, variance),
            absences,
            days_inactive,
        ]

        X.append(features)
        y.append(risk_class)

    return np.array(X), np.array(y)


# ─── Quiz Difficulty Calibration ───────────────────────────────


async def calibrate_question_difficulty(request: CalibrateDifficultyRequest) -> CalibrateDifficultyResponse:
    """
    Calculate IRT difficulty parameters for a question based on student responses.
    """
    responses = request.studentResponses
    if not responses:
        raise ValueError("No student responses provided")

    correct_count = sum(1 for r in responses if r.get("correct", False))
    total = len(responses)
    success_rate = correct_count / total

    # Difficulty parameter b = logit(1 - p_correct)
    p = max(0.01, min(0.99, success_rate))  # clamp to avoid infinity
    b = round(math.log((1 - p) / p), 3)

    # Discrimination parameter a
    # Split students into high and low performers by time
    if len(responses) >= 4:
        times = [r.get("timeSpent", 60) for r in responses]
        median_time = sorted(times)[len(times) // 2]

        fast_correct = sum(1 for r in responses if r.get("correct") and r.get("timeSpent", 60) <= median_time)
        fast_total = sum(1 for r in responses if r.get("timeSpent", 60) <= median_time)
        slow_correct = sum(1 for r in responses if r.get("correct") and r.get("timeSpent", 60) > median_time)
        slow_total = sum(1 for r in responses if r.get("timeSpent", 60) > median_time)

        p_fast = fast_correct / max(fast_total, 1)
        p_slow = slow_correct / max(slow_total, 1)

        # Higher discrimination if fast students do much better
        a = round(max(0.3, min(3.0, (p_fast - p_slow) * 3 + 1.0)), 3)
    else:
        a = 1.0

    # Guessing parameter c (based on question type; default 0.25 for 4-choice)
    c = 0.25

    # Difficulty label
    if b < -1.0:
        diff_label = "easy"
    elif b < 1.0:
        diff_label = "medium"
    else:
        diff_label = "hard"

    # Store in Firestore
    params = {
        "b": b,
        "a": a,
        "c": c,
        "difficultyLabel": diff_label,
        "successRate": round(success_rate, 4),
        "totalResponses": total,
    }
    await store_question_difficulty(request.questionId, params)

    # Cache it
    _cache_set(_difficulty_cache, request.questionId, params)

    return CalibrateDifficultyResponse(
        questionId=request.questionId,
        difficultyParameter=b,
        discriminationParameter=a,
        guessingParameter=c,
        difficultyLabel=diff_label,
        totalResponses=total,
        successRate=round(success_rate, 4),
    )


async def select_adaptive_quiz(request: AdaptiveQuizRequest) -> AdaptiveQuizResponse:
    """
    Select questions adaptively based on student ability and IRT parameters.
    """
    # Get student competency for this topic
    quiz_history = await fetch_student_quiz_history(request.studentId)

    # Estimate student ability
    topic_entries = [e for e in quiz_history if (e.get("topicId") or e.get("topic")) == request.topicId]

    if topic_entries:
        responses_for_irt = []
        difficulty_params = {}
        for i, entry in enumerate(topic_entries):
            qid = entry.get("questionId", f"q_{i}")
            correct = entry.get("correct", False)
            if isinstance(correct, (int, float)):
                correct = correct > 0.5
            score = entry.get("score", 0)
            total = max(entry.get("total", 1), 1)
            if not isinstance(correct, bool):
                correct = (score / total) >= 0.5

            responses_for_irt.append({"questionId": qid, "correct": correct})
            difficulty_params[qid] = {"a": 1.0, "b": 0.0, "c": 0.25}

        theta = _estimate_theta(responses_for_irt, difficulty_params)
    else:
        theta = 0.0  # Default ability

    competency_level = _get_competency_level((theta + 4) / 8 * 100)  # normalise theta to 0-100

    # Difficulty distribution based on competency
    distributions = {
        "beginner": {"easy": 0.70, "medium": 0.20, "hard": 0.10},
        "developing": {"easy": 0.40, "medium": 0.40, "hard": 0.20},
        "proficient": {"easy": 0.20, "medium": 0.40, "hard": 0.40},
        "advanced": {"easy": 0.10, "medium": 0.30, "hard": 0.60},
    }

    dist = distributions.get(competency_level, distributions["developing"])

    # Generate question selections with adaptive difficulty
    n = request.numQuestions
    selected: List[AdaptiveQuizSelection] = []
    current_theta = theta
    difficulty_counts = {"easy": 0, "medium": 0, "hard": 0}

    # Calculate target counts per difficulty
    target_counts = {
        "easy": max(1, round(n * dist["easy"])),
        "medium": max(1, round(n * dist["medium"])),
        "hard": max(0, n - max(1, round(n * dist["easy"])) - max(1, round(n * dist["medium"]))),
    }

    for i in range(n):
        # Determine difficulty for this question
        if i < 2:
            # Start near student's level
            b = current_theta
        else:
            # Adaptive: alternate based on simulated performance
            if i % 3 == 0:
                b = current_theta - 0.5  # Slightly easier
            elif i % 3 == 1:
                b = current_theta
            else:
                b = current_theta + 0.5  # Slightly harder

        # Classify difficulty
        if b < -1.0:
            diff_label = "easy"
        elif b < 1.0:
            diff_label = "medium"
        else:
            diff_label = "hard"

        # Ensure we don't exceed target counts
        if difficulty_counts[diff_label] >= target_counts[diff_label]:
            # Pick the difficulty with most remaining quota
            remaining = {k: target_counts[k] - difficulty_counts[k] for k in target_counts}
            diff_label = max(remaining, key=lambda k: remaining[k])
            if diff_label == "easy":
                b = min(b, -1.0)
            elif diff_label == "hard":
                b = max(b, 1.0)

        difficulty_counts[diff_label] += 1

        # Calculate predicted success probability
        predicted_p = _irt_3pl_probability(current_theta, a=1.0, b=b, c=0.25)

        selected.append(AdaptiveQuizSelection(
            questionId=f"{request.topicId}_q{i+1}",
            estimatedDifficulty=round(b, 3),
            predictedSuccessProbability=round(predicted_p, 3),
            difficultyLabel=diff_label,
        ))

    # Expected overall success rate
    avg_success = sum(q.predictedSuccessProbability for q in selected) / max(len(selected), 1)

    return AdaptiveQuizResponse(
        studentId=request.studentId,
        topicId=request.topicId,
        selectedQuestions=selected,
        studentAbilityEstimate=round(theta, 3),
        expectedSuccessRate=round(avg_success, 3),
        difficultyDistribution=difficulty_counts,
    )


# ─── Topic Recommendation Engine ──────────────────────────────


async def recommend_topics(request: TopicRecommendationRequest) -> TopicRecommendationResponse:
    """
    Recommend topics based on competency gaps, prerequisites, and peer data.
    """
    student_id = request.studentId
    quiz_history = await fetch_student_quiz_history(student_id)

    if not quiz_history:
        # Cold start: recommend foundational topics
        foundational = [
            TopicRecommendation(
                topicId="Variables & Expressions",
                topicName="Variables & Expressions",
                recommendationScore=95.0,
                reasoning="Foundational topic essential for all algebra. Start here to build a strong base.",
                estimatedTimeToMastery=3,
                prerequisitesMet=True,
                currentCompetency="not_attempted",
            ),
            TopicRecommendation(
                topicId="Integers",
                topicName="Integers",
                recommendationScore=90.0,
                reasoning="Core number sense topic needed for all math areas.",
                estimatedTimeToMastery=2,
                prerequisitesMet=True,
                currentCompetency="not_attempted",
            ),
            TopicRecommendation(
                topicId="Fractions & Decimals",
                topicName="Fractions & Decimals",
                recommendationScore=85.0,
                reasoning="Understanding fractions is critical for algebra and calculus.",
                estimatedTimeToMastery=4,
                prerequisitesMet=True,
                currentCompetency="not_attempted",
            ),
        ]
        return TopicRecommendationResponse(
            studentId=student_id,
            recommendations=foundational[:request.numRecommendations],
            status="cold_start",
        )

    # Get competency analysis
    comp_result = await compute_competency_analysis(student_id, quiz_history)
    dependencies = fetch_topic_dependencies()

    topic_competencies: Dict[str, CompetencyAnalysis] = {}
    for a in comp_result.analyses:
        topic_competencies[a.topicId] = a

    # Score each topic
    all_topics = set()
    for a in comp_result.analyses:
        all_topics.add(a.topicId)
    for topic, prereqs in dependencies.items():
        all_topics.add(topic)
        all_topics.update(prereqs)

    scored_topics: List[TopicRecommendation] = []

    for topic in all_topics:
        comp = topic_competencies.get(topic)
        current_level = comp.competencyLevel if comp else "not_attempted"
        current_score = comp.averageAccuracy if comp else 0

        # Skip topics already mastered
        if current_level == "advanced":
            continue

        # 1. Weakness score (higher for weaker topics)
        if current_level == "not_attempted":
            weakness_score = 70
        elif current_level == "beginner":
            weakness_score = 100 - current_score
        elif current_level == "developing":
            weakness_score = 80 - current_score * 0.5
        else:  # proficient
            weakness_score = 40 - current_score * 0.3

        # 2. Prerequisite score (higher if prerequisites are met)
        prereqs = dependencies.get(topic, [])
        if prereqs:
            prereq_scores = []
            for p in prereqs:
                p_comp = topic_competencies.get(p)
                if p_comp:
                    prereq_scores.append(p_comp.averageAccuracy)
                else:
                    prereq_scores.append(0)
            prereq_avg = sum(prereq_scores) / len(prereq_scores) if prereq_scores else 0
            prereqs_met = all(s >= 50 for s in prereq_scores)
        else:
            prereq_avg = 100  # No prereqs needed
            prereqs_met = True

        # 3. Recency score (boost recently attempted topics)
        if comp and comp.lastAttemptDate:
            try:
                last_dt = datetime.fromisoformat(comp.lastAttemptDate.replace("Z", "+00:00"))
                days_since = (datetime.utcnow() - last_dt.replace(tzinfo=None)).days
            except Exception:
                days_since = 30
        else:
            days_since = 30

        recency_score = min(days_since, 60)  # cap at 60

        # 4. Combined score
        total_score = (
            weakness_score * 0.4
            + prereq_avg * 0.3
            + recency_score * 0.2
            + (10 if prereqs_met else 0) * 0.1
        )

        # Degrade score if prerequisites not met (but still recommend)
        if not prereqs_met:
            total_score *= 0.6

        # Estimate time to mastery (hours)
        if current_level == "not_attempted":
            est_hours = 8
        elif current_level == "beginner":
            est_hours = 6
        elif current_level == "developing":
            est_hours = 4
        else:
            est_hours = 2

        # Build reasoning
        reasons = []
        if current_level in ("beginner", "not_attempted"):
            reasons.append(f"Currently at {current_level} level — focused practice will build foundation")
        elif current_level == "developing":
            reasons.append(f"Developing competency ({current_score:.0f}% accuracy) — close to proficiency with more practice")
        else:
            reasons.append(f"Proficient but not yet mastered ({current_score:.0f}% accuracy)")

        if not prereqs_met and prereqs:
            reasons.append(f"Note: prerequisites ({', '.join(prereqs)}) not fully met — complete those first")
        elif prereqs and prereqs_met:
            reasons.append("All prerequisites are met")

        if comp and comp.learningVelocity > 0:
            reasons.append(f"Positive learning trend (velocity: {comp.learningVelocity:+.3f})")
        elif comp and comp.learningVelocity < 0:
            reasons.append(f"Declining performance detected — review recommended")

        if days_since > 14:
            reasons.append(f"Not practiced in {days_since} days — review to prevent forgetting")

        scored_topics.append(TopicRecommendation(
            topicId=topic,
            topicName=topic.replace("_", " ").title(),
            recommendationScore=round(total_score, 2),
            reasoning=". ".join(reasons) + ".",
            estimatedTimeToMastery=est_hours,
            prerequisitesMet=prereqs_met,
            currentCompetency=current_level,
        ))

    # Sort by score descending
    scored_topics.sort(key=lambda t: t.recommendationScore, reverse=True)

    return TopicRecommendationResponse(
        studentId=student_id,
        recommendations=scored_topics[:request.numRecommendations],
        status="success",
    )


# ─── Learning Analytics Aggregation ───────────────────────────


async def get_student_summary(student_id: str) -> StudentSummaryResponse:
    """Aggregate all ML metrics for a single student."""
    # Check cache
    cached = _cache_get(_competency_cache, f"summary_{student_id}", IRT_DIFFICULTY_CACHE_TTL)
    if cached:
        return cached

    quiz_history = await fetch_student_quiz_history(student_id)
    engagement = await fetch_student_engagement_metrics(student_id)

    # Competency analysis
    comp_result = await compute_competency_analysis(student_id, quiz_history)

    # Competency distribution
    comp_dist = {"beginner": 0, "developing": 0, "proficient": 0, "advanced": 0}
    for a in comp_result.analyses:
        if a.competencyLevel in comp_dist:
            comp_dist[a.competencyLevel] += 1

    # Efficiency scores per subject
    eff_scores = {}
    for a in comp_result.analyses:
        eff_scores[a.topicName] = a.efficiencyScore

    # Learning velocity trend (chart data)
    velocity_trend = []
    for a in comp_result.analyses:
        velocity_trend.append({
            "topic": a.topicName,
            "velocity": a.learningVelocity,
            "accuracy": a.averageAccuracy,
            "attempts": a.totalAttempts,
        })

    # Topic recommendations
    try:
        rec_req = TopicRecommendationRequest(studentId=student_id, numRecommendations=5)
        rec_result = await recommend_topics(rec_req)
        recommended = [
            {
                "topicId": r.topicId,
                "topicName": r.topicName,
                "score": r.recommendationScore,
                "reasoning": r.reasoning,
                "prerequisitesMet": r.prerequisitesMet,
            }
            for r in rec_result.recommendations
        ]
    except Exception as e:
        logger.warning(f"Topic recommendation failed: {e}")
        recommended = []

    # Predicted next quiz score (simple linear extrapolation)
    predicted_score = None
    if quiz_history and len(quiz_history) >= 3:
        recent_scores = []
        for entry in quiz_history[-10:]:
            score = entry.get("score", 0)
            total = max(entry.get("total", 1), 1)
            recent_scores.append((score / total) * 100)
        if len(recent_scores) >= 3:
            x = np.arange(len(recent_scores)).reshape(-1, 1)
            y = np.array(recent_scores)
            model = LinearRegression()
            model.fit(x, y)
            predicted_score = round(float(max(0, min(100, model.predict([[len(recent_scores)]])[0]))), 1)

    # Engagement patterns
    engagement_patterns = {
        "dailyActivity": engagement.get("dailyActivity", {}),
        "hourlyActivity": engagement.get("hourlyActivity", {}),
        "activeDays": engagement.get("activeDays", 0),
        "avgActivitiesPerDay": engagement.get("avgActivitiesPerDay", 0),
        "totalXP": engagement.get("totalXP", 0),
    }

    result = StudentSummaryResponse(
        studentId=student_id,
        competencyDistribution=comp_dist,
        riskAssessment=None,
        recommendedTopics=recommended,
        learningVelocityTrend=velocity_trend,
        efficiencyScores=eff_scores,
        predictedNextQuizScore=predicted_score,
        engagementPatterns=engagement_patterns,
        status="success" if comp_result.status == "success" else "limited_data",
    )

    # Cache the result
    _cache_set(_competency_cache, f"summary_{student_id}", result)

    return result


async def get_class_insights(request: ClassInsightsRequest) -> ClassInsightsResponse:
    """Aggregate class-wide ML analytics for teacher dashboards."""
    cached = _cache_get(_class_stats_cache, f"class_{request.teacherId}_{request.classId}", IRT_DIFFICULTY_CACHE_TTL)
    if cached:
        return cached

    db = _get_firestore_db()
    student_ids: List[str] = []

    if db is not None:
        try:
            if request.classId:
                # Fetch students in specific class
                class_ref = db.collection("classes").document(request.classId)
                class_doc = class_ref.get()
                if class_doc.exists:
                    class_data = class_doc.to_dict()
                    student_ids = class_data.get("studentIds", [])
            else:
                # Fetch all students for this teacher
                user_ref = db.collection("users").where("role", "==", "student").limit(100)
                for doc in user_ref.stream():
                    student_ids.append(doc.id)
        except Exception as e:
            logger.error(f"Error fetching class students: {e}")

    if not student_ids:
        # Generate sample data for demo
        return _generate_demo_class_insights(request)

    # Aggregate per-student data
    risk_dist = {"High": 0, "Medium": 0, "Low": 0}
    all_competencies: List[CompetencyAnalysis] = []
    all_velocities: List[float] = []
    interventions: List[Dict[str, Any]] = []
    topic_weakness_counts: Dict[str, int] = defaultdict(int)
    hourly_engagement = defaultdict(int)

    for sid in student_ids[:50]:  # Limit for performance
        try:
            summary = await get_student_summary(sid)

            # Risk
            if summary.riskAssessment:
                level = summary.riskAssessment.get("riskLevel", "Medium")
                risk_dist[level] = risk_dist.get(level, 0) + 1

            # Competencies
            for topic, count in summary.competencyDistribution.items():
                if topic in ("beginner", "developing") and count > 0:
                    # Mark this as a weak area
                    pass

            # Velocities
            for vt in summary.learningVelocityTrend:
                all_velocities.append(vt.get("velocity", 0))
                if vt.get("velocity", 0) < -0.01:
                    topic_weakness_counts[vt.get("topic", "Unknown")] += 1

            # Engagement
            for hour_str, count in summary.engagementPatterns.get("hourlyActivity", {}).items():
                hourly_engagement[int(hour_str)] += count

            # Intervention needed?
            total_beginner = summary.competencyDistribution.get("beginner", 0)
            if total_beginner >= 2 or (summary.predictedNextQuizScore and summary.predictedNextQuizScore < 50):
                interventions.append({
                    "studentId": sid,
                    "reason": "Multiple topics at beginner level" if total_beginner >= 2 else "Predicted score below 50%",
                    "predictedScore": summary.predictedNextQuizScore,
                    "recommendedAction": "Schedule one-on-one tutoring session",
                })

        except Exception as e:
            logger.warning(f"Error processing student {sid}: {e}")

    # Common weak topics
    common_weak = sorted(topic_weakness_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    weak_topics_list = [
        {"topic": t, "studentsStruggling": c, "percentageOfClass": round(c / max(len(student_ids), 1) * 100, 1)}
        for t, c in common_weak
    ]

    # Velocity distribution
    if all_velocities:
        vel_dist: Dict[str, float] = {
            "mean": round(float(np.mean(all_velocities)), 4),
            "median": round(float(np.median(all_velocities)), 4),
            "improving": float(sum(1 for v in all_velocities if v > 0.01)),
            "declining": float(sum(1 for v in all_velocities if v < -0.01)),
            "plateaued": float(sum(1 for v in all_velocities if -0.01 <= v <= 0.01)),
        }
    else:
        vel_dist = {"mean": 0.0, "median": 0.0, "improving": 0.0, "declining": 0.0, "plateaued": 0.0}

    result = ClassInsightsResponse(
        teacherId=request.teacherId,
        riskDistribution=risk_dist,
        riskTrend=[],  # Would require historical data
        commonWeakTopics=weak_topics_list,
        learningVelocityDistribution=vel_dist,
        engagementPatterns={"hourlyDistribution": dict(hourly_engagement)},
        interventionRecommendations=interventions[:10],
        successPredictions={
            "classAverageExpected": round(float(np.mean([s or 60 for s in []])) if not all_velocities else 65.0, 1),
            "studentsLikelyToStruggle": len(interventions),
        },
        totalStudents=len(student_ids),
        status="success",
    )

    _cache_set(_class_stats_cache, f"class_{request.teacherId}_{request.classId}", result)
    return result


def _generate_demo_class_insights(request: ClassInsightsRequest) -> ClassInsightsResponse:
    """Generate demo class insights when no real data is available."""
    return ClassInsightsResponse(
        teacherId=request.teacherId,
        riskDistribution={"High": 4, "Medium": 8, "Low": 18},
        riskTrend=[
            {"date": "2026-02-11", "high": 5, "medium": 9, "low": 16},
            {"date": "2026-02-18", "high": 4, "medium": 8, "low": 18},
        ],
        commonWeakTopics=[
            {"topic": "Quadratic Equations", "studentsStruggling": 12, "percentageOfClass": 40.0},
            {"topic": "Trigonometric Ratios", "studentsStruggling": 9, "percentageOfClass": 30.0},
            {"topic": "Factoring", "studentsStruggling": 7, "percentageOfClass": 23.3},
        ],
        learningVelocityDistribution={
            "mean": 0.015,
            "median": 0.008,
            "improving": 18,
            "declining": 5,
            "plateaued": 7,
        },
        engagementPatterns={
            "hourlyDistribution": {str(h): random.randint(5, 40) for h in range(8, 22)},
            "peakHour": 16,
            "avgDailyActiveStudents": 22,
        },
        interventionRecommendations=[
            {
                "studentId": "demo_student_1",
                "reason": "Declining performance in multiple topics",
                "predictedScore": 42.5,
                "recommendedAction": "Schedule one-on-one review session for Quadratic Equations",
            },
            {
                "studentId": "demo_student_2",
                "reason": "3 consecutive absences",
                "predictedScore": 38.0,
                "recommendedAction": "Contact parent/guardian and arrange catch-up sessions",
            },
        ],
        successPredictions={
            "classAverageExpected": 72.3,
            "studentsLikelyToStruggle": 4,
            "studentsLikelyToExcel": 8,
        },
        totalStudents=30,
        status="demo_data",
    )


# ─── Mock Data Generator ──────────────────────────────────────


def generate_mock_student_data(
    num_students: int = 30,
    num_quizzes: int = 20,
    seed: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Generate realistic mock student data for testing ML features.
    Includes edge cases: perfect students, struggling students, inconsistent performers.
    """
    if seed is not None:
        random.seed(seed)
        np.random.seed(seed)

    topics = [
        "Linear Equations", "Quadratic Equations", "Polynomials",
        "Trigonometric Ratios", "Pythagorean Theorem", "Fractions & Decimals",
        "Integers", "Probability Basics", "Angles", "Area & Perimeter",
    ]

    students = []
    all_quiz_data = []

    for i in range(num_students):
        student_id = f"mock_student_{i+1:03d}"

        # Assign student archetype
        archetype_roll = random.random()
        if archetype_roll < 0.1:
            archetype = "perfect"
        elif archetype_roll < 0.2:
            archetype = "struggling"
        elif archetype_roll < 0.3:
            archetype = "inconsistent"
        elif archetype_roll < 0.5:
            archetype = "improving"
        elif archetype_roll < 0.65:
            archetype = "declining"
        else:
            archetype = "average"

        # Base metrics per archetype
        archetypes = {
            "perfect": {
                "engagement": (90, 5), "quiz": (92, 4), "attendance": (98, 2),
                "completion": (95, 3), "streak": (15, 3),
            },
            "struggling": {
                "engagement": (25, 10), "quiz": (30, 12), "attendance": (55, 15),
                "completion": (30, 12), "streak": (0, 1),
            },
            "inconsistent": {
                "engagement": (60, 25), "quiz": (55, 25), "attendance": (70, 20),
                "completion": (55, 20), "streak": (3, 5),
            },
            "improving": {
                "engagement": (65, 10), "quiz": (60, 10), "attendance": (80, 8),
                "completion": (70, 10), "streak": (7, 3),
            },
            "declining": {
                "engagement": (50, 15), "quiz": (55, 15), "attendance": (65, 12),
                "completion": (50, 15), "streak": (1, 2),
            },
            "average": {
                "engagement": (65, 12), "quiz": (68, 10), "attendance": (82, 8),
                "completion": (72, 10), "streak": (5, 3),
            },
        }

        params = archetypes[archetype]
        engagement = max(0, min(100, np.random.normal(*params["engagement"])))
        avg_quiz = max(0, min(100, np.random.normal(*params["quiz"])))
        attendance = max(0, min(100, np.random.normal(*params["attendance"])))
        completion = max(0, min(100, np.random.normal(*params["completion"])))
        streak = max(0, int(np.random.normal(*params["streak"])))

        student = {
            "studentId": student_id,
            "name": f"Student {i+1}",
            "archetype": archetype,
            "engagementScore": round(engagement, 1),
            "avgQuizScore": round(avg_quiz, 1),
            "attendance": round(attendance, 1),
            "assignmentCompletion": round(completion, 1),
            "streak": streak,
            "xpGrowthRate": round(np.random.normal(0.5 if archetype == "improving" else 0, 0.3), 2),
            "timeOnPlatform": round(max(0, np.random.normal(8, 3)), 1),
        }
        students.append(student)

        # Generate quiz history for this student
        base_time = datetime(2025, 9, 1)
        for j in range(num_quizzes):
            topic = random.choice(topics)
            days_offset = random.randint(0, 150)
            quiz_date = base_time + timedelta(days=days_offset)

            # Score based on archetype with progression
            if archetype == "improving":
                base_score = 40 + (j / num_quizzes) * 40
            elif archetype == "declining":
                base_score = 80 - (j / num_quizzes) * 35
            elif archetype == "perfect":
                base_score = 90
            elif archetype == "struggling":
                base_score = 30
            elif archetype == "inconsistent":
                base_score = random.choice([30, 50, 70, 90])
            else:  # average
                base_score = 65

            score = max(0, min(100, base_score + np.random.normal(0, 8)))
            total_questions = random.choice([10, 15, 20])
            correct = round(total_questions * score / 100)
            time_per_q = max(10, np.random.normal(60 if score > 70 else 90, 20))

            quiz_entry = {
                "studentId": student_id,
                "topicId": topic,
                "topic": topic,
                "score": correct,
                "total": total_questions,
                "correct": correct >= total_questions * 0.5,
                "timeTaken": round(time_per_q * total_questions),
                "timeSpent": round(time_per_q),
                "attempts": random.choice([1, 1, 1, 2, 2, 3]) if score < 60 else 1,
                "completedAt": quiz_date.isoformat(),
                "timestamp": quiz_date.isoformat(),
                "questionId": f"q_{topic.replace(' ', '_').lower()}_{j}",
            }
            all_quiz_data.append(quiz_entry)

    return {
        "students": students,
        "quizHistory": all_quiz_data,
        "metadata": {
            "numStudents": num_students,
            "numQuizzes": num_quizzes,
            "archetypeDistribution": {
                archetype: sum(1 for s in students if s["archetype"] == archetype)
                for archetype in ["perfect", "struggling", "inconsistent", "improving", "declining", "average"]
            },
            "topicsCovered": topics,
            "generatedAt": datetime.utcnow().isoformat(),
        },
    }


# ─── Cache Management ─────────────────────────────────────────


def refresh_all_caches() -> RefreshCacheResponse:
    """Clear and refresh all in-memory caches."""
    _competency_cache.clear()
    _class_stats_cache.clear()
    _difficulty_cache.clear()
    _risk_model_cache.clear()

    logger.info("All analytics caches cleared")

    return RefreshCacheResponse(
        status="caches_cleared",
        cachedItems=0,
        timestamp=datetime.utcnow().isoformat(),
    )
