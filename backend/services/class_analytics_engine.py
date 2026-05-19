"""
MathPulse AI — Class Analytics Engine

Fetches real quiz data from Firestore, computes per-student and class-level
metrics, generates AI insights via DeepSeek, and caches results.
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

logger = logging.getLogger("mathpulse.class_analytics")

# ─── Firestore helper ──────────────────────────────────────────────────────

_firebase_firestore = None


def _get_firestore_client():
    global _firebase_firestore
    if _firebase_firestore is None:
        try:
            from firebase_admin import firestore as ff
            _firebase_firestore = ff
        except Exception:
            return None
    try:
        return _firebase_firestore.client()
    except Exception:
        return None


# ─── Models ────────────────────────────────────────────────────────────────

class StudentAnalyticsSummary(BaseModel):
    student_id: str
    student_name: str
    avatar_url: Optional[str] = None
    grade_level: str = ""
    section: str = ""
    avg_score: float = 0.0
    quiz_attempt_count: int = 0
    last_active: Optional[str] = None
    risk_level: Literal["Low Risk", "Medium Risk", "High Risk", "Critical", "Unassessed"] = "Unassessed"
    engagement_level: Literal["Low", "Medium", "High"] = "Low"
    weakest_topic: Optional[str] = None
    accuracy_by_topic: Dict[str, float] = Field(default_factory=dict)
    completion_rate: float = 0.0


class TopicPerformance(BaseModel):
    topic: str
    class_accuracy: float = 0.0
    struggling_count: int = 0
    mastered_count: int = 0


class ClassInsights(BaseModel):
    class_id: str
    generated_at: str = ""
    class_summary: str = ""
    top_weak_topics: List[str] = Field(default_factory=list)
    recommended_actions: List[str] = Field(default_factory=list)
    class_strengths: str = ""
    risk_distribution: Dict[str, int] = Field(default_factory=dict)
    topic_performance: List[TopicPerformance] = Field(default_factory=list)


class ClassAnalyticsReport(BaseModel):
    class_id: str
    class_name: str = ""
    grade_level: str = ""
    section: str = ""
    teacher_id: str = ""
    student_count: int = 0
    class_average: float = 0.0
    completion_rate: float = 0.0
    participation_rate: float = 0.0
    attention_count: int = 0
    students: List[StudentAnalyticsSummary] = Field(default_factory=list)
    insights: Optional[ClassInsights] = None
    generated_at: str = ""


# ─── Risk & Engagement Classification ─────────────────────────────────────

def classify_risk(avg_score: float, quiz_count: int, days_since_active: Optional[int]) -> str:
    """Map to WRI status bands. When no WRI is available, estimate from avg_score."""
    if quiz_count == 0:
        return "pending_assessment"
    # Approximate WRI bands from avg_score (actual WRI uses D, G, P weights)
    if avg_score >= 88:
        return "safe"
    if avg_score >= 80:
        return "watch"
    if avg_score >= 75:
        return "intervene"
    if avg_score >= 68:
        return "critical"
    return "at_risk"


def classify_engagement(days_since_active: Optional[int], recent_quiz_count: int) -> str:
    if days_since_active is not None and days_since_active <= 2 and recent_quiz_count >= 5:
        return "High"
    if days_since_active is not None and days_since_active <= 7:
        return "Medium"
    return "Low"


# ─── Engine ────────────────────────────────────────────────────────────────

class ClassAnalyticsEngine:
    """Computes class analytics from Firestore data."""

    def __init__(self):
        self._cache: Dict[str, tuple] = {}  # class_id -> (report, timestamp)
        self._cache_ttl = 1800  # 30 min

    async def get_class_analytics(
        self, class_id: str, teacher_id: str, force_refresh: bool = False
    ) -> ClassAnalyticsReport:
        # Check cache
        if not force_refresh and class_id in self._cache:
            report, cached_at = self._cache[class_id]
            if time.time() - cached_at < self._cache_ttl:
                return report

        db = _get_firestore_client()
        if not db:
            logger.error("Firestore client unavailable")
            return ClassAnalyticsReport(class_id=class_id, teacher_id=teacher_id, generated_at=_now_iso())

        # Fast path: try reading from denormalized student_summaries (written by pipeline)
        summaries_snap = list(db.collection("classes").document(class_id).collection("student_summaries").stream())
        use_fast_path = len(summaries_snap) > 0 and not force_refresh

        # Fetch class info
        class_doc = db.collection("classrooms").document(class_id).get()
        class_data = class_doc.to_dict() if class_doc.exists else {}

        class_name = class_data.get("name", "")
        grade_level = class_data.get("gradeLevel", class_data.get("grade", ""))
        section = class_data.get("section", "")

        # Fetch students in this class from managedStudents
        students_query = db.collection("managedStudents").where("classroomId", "==", class_id).stream()
        managed_students = []
        for doc_snap in students_query:
            managed_students.append({"id": doc_snap.id, **doc_snap.to_dict()})

        # Also try classSectionId match
        if not managed_students:
            class_section_id = class_data.get("classSectionId", class_id)
            students_query2 = db.collection("managedStudents").where("classSectionId", "==", class_section_id).stream()
            for doc_snap in students_query2:
                managed_students.append({"id": doc_snap.id, **doc_snap.to_dict()})

        # Fetch quiz data for each student from progress collection
        student_summaries = await self._build_student_summaries(db, managed_students)

        # Compute class-level metrics
        assessed_students = [s for s in student_summaries if s.quiz_attempt_count > 0]
        student_count = len(student_summaries)

        class_average = 0.0
        if assessed_students:
            class_average = sum(s.avg_score for s in assessed_students) / len(assessed_students)

        completion_rate = 0.0
        if student_count > 0:
            completion_rate = (len(assessed_students) / student_count) * 100

        # Participation = active in last 7 days
        now = datetime.now(timezone.utc)
        active_count = sum(1 for s in student_summaries if s.last_active and _days_since(s.last_active) <= 7)
        participation_rate = (active_count / student_count * 100) if student_count > 0 else 0.0

        # Attention = intervene + critical + at_risk
        attention_count = sum(1 for s in student_summaries if s.risk_level in ("intervene", "critical", "at_risk"))

        # Topic performance
        topic_perf = self._compute_topic_performance(student_summaries)

        # Risk distribution
        risk_dist = {"safe": 0, "watch": 0, "intervene": 0, "critical": 0, "at_risk": 0, "pending_assessment": 0}
        for s in student_summaries:
            # Prefer stored WRI status from managedStudents if available
            stored_status = None
            try:
                ms_doc = db.collection("managedStudents").document(s.student_id).get()
                if ms_doc.exists:
                    stored_status = ms_doc.to_dict().get("riskStatus")
            except Exception:
                pass
            status = stored_status if stored_status in risk_dist else s.risk_level
            risk_dist[status] = risk_dist.get(status, 0) + 1

        # Generate AI insights
        insights = await self._generate_insights(
            class_id=class_id,
            class_name=class_name,
            grade_level=grade_level,
            section=section,
            student_count=student_count,
            class_average=class_average,
            completion_rate=completion_rate,
            participation_rate=participation_rate,
            risk_dist=risk_dist,
            topic_perf=topic_perf,
        )

        report = ClassAnalyticsReport(
            class_id=class_id,
            class_name=class_name,
            grade_level=grade_level,
            section=section,
            teacher_id=teacher_id,
            student_count=student_count,
            class_average=round(class_average, 1),
            completion_rate=round(completion_rate, 1),
            participation_rate=round(participation_rate, 1),
            attention_count=attention_count,
            students=student_summaries,
            insights=insights,
            generated_at=_now_iso(),
        )

        # Cache
        self._cache[class_id] = (report, time.time())

        # Persist to Firestore
        try:
            db.collection("class_analytics").document(class_id).set(
                {**report.model_dump(), "cached_at": _now_iso()},
                merge=True,
            )
        except Exception as e:
            logger.warning(f"Failed to persist analytics cache: {e}")

        return report

    async def _build_student_summaries(
        self, db: Any, managed_students: List[Dict]
    ) -> List[StudentAnalyticsSummary]:
        summaries = []
        now = datetime.now(timezone.utc)

        for student in managed_students:
            student_id = student.get("id", "")
            student_name = student.get("name", "Unknown")
            avatar = student.get("avatar", "")

            # Try to fetch quiz data from progress/{student_id}
            quiz_attempts = []
            try:
                # Try by student ID first
                progress_doc = db.collection("progress").document(student_id).get()
                if progress_doc.exists:
                    pdata = progress_doc.to_dict()
                    quiz_attempts = pdata.get("quizAttempts", [])

                # Also try by LRN if available
                if not quiz_attempts and student.get("lrn"):
                    progress_doc2 = db.collection("progress").document(student["lrn"]).get()
                    if progress_doc2.exists:
                        pdata2 = progress_doc2.to_dict()
                        quiz_attempts = pdata2.get("quizAttempts", [])

                # Also try accountUid
                if not quiz_attempts and student.get("accountUid"):
                    progress_doc3 = db.collection("progress").document(student["accountUid"]).get()
                    if progress_doc3.exists:
                        pdata3 = progress_doc3.to_dict()
                        quiz_attempts = pdata3.get("quizAttempts", [])

                # Also check practice_results subcollection
                if not quiz_attempts and student.get("accountUid"):
                    practice_sessions = (
                        db.collection("practice_results")
                        .document(student["accountUid"])
                        .collection("sessions")
                        .order_by("submitted_at", direction="DESCENDING")
                        .limit(20)
                        .stream()
                    )
                    for sess in practice_sessions:
                        sd = sess.to_dict()
                        quiz_attempts.append({
                            "quizId": sd.get("session_id", ""),
                            "score": sd.get("score_percent", 0),
                            "completedAt": sd.get("submitted_at"),
                            "answers": sd.get("per_question_feedback", []),
                        })
            except Exception as e:
                logger.debug(f"Error fetching progress for {student_id}: {e}")

            # Compute metrics from quiz attempts
            quiz_count = len(quiz_attempts)
            avg_score = 0.0
            accuracy_by_topic: Dict[str, List[float]] = {}

            if quiz_count > 0:
                scores = [float(q.get("score", 0)) for q in quiz_attempts]
                avg_score = sum(scores) / len(scores)

                # Extract per-question topic accuracy if available
                for attempt in quiz_attempts:
                    answers = attempt.get("answers", [])
                    quiz_id = attempt.get("quizId", "")
                    # Use quizId as topic proxy if no per-question topic
                    topic = _extract_topic_from_quiz_id(quiz_id)
                    if topic:
                        if topic not in accuracy_by_topic:
                            accuracy_by_topic[topic] = []
                        accuracy_by_topic[topic].append(float(attempt.get("score", 0)))

            # Compute topic averages
            topic_avgs = {t: sum(scores) / len(scores) for t, scores in accuracy_by_topic.items() if scores}
            weakest_topic = min(topic_avgs, key=topic_avgs.get) if topic_avgs else student.get("weakestTopic")
            if weakest_topic == "N/A":
                weakest_topic = None

            # Last active
            last_active_ts = student.get("lastActive")
            last_active_str = None
            days_since_active = None
            if last_active_ts:
                try:
                    if hasattr(last_active_ts, "seconds"):
                        last_dt = datetime.fromtimestamp(last_active_ts.seconds, tz=timezone.utc)
                    else:
                        last_dt = last_active_ts
                    last_active_str = last_dt.isoformat()
                    days_since_active = (now - last_dt).days
                except Exception:
                    pass

            # Recent quiz count (last 14 days)
            recent_quiz_count = 0
            for q in quiz_attempts:
                completed = q.get("completedAt")
                if completed:
                    try:
                        if hasattr(completed, "seconds"):
                            q_dt = datetime.fromtimestamp(completed.seconds, tz=timezone.utc)
                        else:
                            q_dt = completed if isinstance(completed, datetime) else datetime.now(timezone.utc)
                        if (now - q_dt).days <= 14:
                            recent_quiz_count += 1
                    except Exception:
                        pass

            risk_level = classify_risk(avg_score, quiz_count, days_since_active)
            engagement = classify_engagement(days_since_active, recent_quiz_count)

            summaries.append(StudentAnalyticsSummary(
                student_id=student_id,
                student_name=student_name,
                avatar_url=avatar or None,
                grade_level=student.get("gradeLevel", student.get("grade", "")),
                section=student.get("section", ""),
                avg_score=round(avg_score, 1),
                quiz_attempt_count=quiz_count,
                last_active=last_active_str,
                risk_level=risk_level,
                engagement_level=engagement,
                weakest_topic=weakest_topic,
                accuracy_by_topic=topic_avgs,
                completion_rate=min(quiz_count / 5 * 100, 100) if quiz_count > 0 else 0.0,
            ))

        return summaries

    def _compute_topic_performance(self, students: List[StudentAnalyticsSummary]) -> List[TopicPerformance]:
        topic_data: Dict[str, Dict] = {}

        for s in students:
            for topic, accuracy in s.accuracy_by_topic.items():
                if topic not in topic_data:
                    topic_data[topic] = {"scores": [], "struggling": 0, "mastered": 0}
                topic_data[topic]["scores"].append(accuracy)
                if accuracy < 60:
                    topic_data[topic]["struggling"] += 1
                if accuracy >= 80:
                    topic_data[topic]["mastered"] += 1

        # Also include weakest_topic from students without per-topic data
        for s in students:
            if s.weakest_topic and s.weakest_topic not in topic_data and s.quiz_attempt_count > 0:
                topic_data[s.weakest_topic] = {
                    "scores": [s.avg_score],
                    "struggling": 1 if s.avg_score < 60 else 0,
                    "mastered": 0,
                }

        result = []
        for topic, data in topic_data.items():
            if not data["scores"]:
                continue
            result.append(TopicPerformance(
                topic=topic,
                class_accuracy=round(sum(data["scores"]) / len(data["scores"]), 1),
                struggling_count=data["struggling"],
                mastered_count=data["mastered"],
            ))

        return sorted(result, key=lambda t: t.class_accuracy)[:8]

    async def _generate_insights(
        self,
        class_id: str,
        class_name: str,
        grade_level: str,
        section: str,
        student_count: int,
        class_average: float,
        completion_rate: float,
        participation_rate: float,
        risk_dist: Dict[str, int],
        topic_perf: List[TopicPerformance],
    ) -> ClassInsights:
        # Format topic performance for prompt
        topic_lines = "\n".join(
            f"  - {t.topic}: {t.class_accuracy}% (struggling: {t.struggling_count})"
            for t in topic_perf[:6]
        ) or "  No topic data available yet."

        weak_topics = [t.topic for t in topic_perf[:3]] if topic_perf else []

        prompt = f"""You are MathPulse AI analyzing a class's performance data for a Filipino K-12 teacher.

Class: Grade {grade_level} - {section} ({class_name})
Student Count: {student_count}
Class Average Score: {class_average:.1f}%
Completion Rate: {completion_rate:.1f}%
Participation Rate: {participation_rate:.1f}%

Risk Distribution:
- Critical: {risk_dist.get('Critical', 0)} students
- High Risk: {risk_dist.get('High Risk', 0)} students
- Medium Risk: {risk_dist.get('Medium Risk', 0)} students
- Low Risk: {risk_dist.get('Low Risk', 0)} students
- Unassessed: {risk_dist.get('Unassessed', 0)} students

Topic Performance (class accuracy):
{topic_lines}

Top Weakest Topics: {', '.join(weak_topics) if weak_topics else 'None identified yet'}

Generate a JSON response with these exact keys:
{{
  "class_summary": "2-3 sentence overview of class performance. Be honest but constructive.",
  "class_strengths": "1 sentence on what the class is doing well.",
  "top_weak_topics": ["topic1", "topic2", "topic3"],
  "recommended_actions": [
    "Specific action 1 (max 20 words)",
    "Specific action 2",
    "Specific action 3"
  ]
}}

Be specific to Filipino K-12 DepEd context. If data is limited, acknowledge it and suggest next steps."""

        try:
            from services.ai_client import get_deepseek_client, CHAT_MODEL

            client = get_deepseek_client()
            response = client.chat.completions.create(
                model=CHAT_MODEL,
                messages=[
                    {"role": "system", "content": "You are MathPulse AI, a class analytics assistant for Filipino K-12 math teachers. Respond only with valid JSON."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                max_tokens=500,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content or "{}"
            parsed = json.loads(content)

            return ClassInsights(
                class_id=class_id,
                generated_at=_now_iso(),
                class_summary=parsed.get("class_summary", "Analytics data is being collected."),
                top_weak_topics=parsed.get("top_weak_topics", weak_topics),
                recommended_actions=parsed.get("recommended_actions", ["Encourage students to complete more quizzes."]),
                class_strengths=parsed.get("class_strengths", "Class is actively using the platform."),
                risk_distribution=risk_dist,
                topic_performance=topic_perf,
            )
        except Exception as e:
            logger.warning(f"DeepSeek insights generation failed: {e}")
            # Return fallback insights
            return ClassInsights(
                class_id=class_id,
                generated_at=_now_iso(),
                class_summary=f"Class has {student_count} students with an average score of {class_average:.0f}%. {risk_dist.get('Unassessed', 0)} students have not yet taken any quizzes.",
                top_weak_topics=weak_topics,
                recommended_actions=[
                    "Encourage unassessed students to complete their first quiz.",
                    "Review struggling topics in the next class session.",
                    "Schedule one-on-one check-ins with Critical risk students.",
                ],
                class_strengths="Students are enrolled and the platform is ready for use." if class_average < 50 else f"Class maintains a {class_average:.0f}% average.",
                risk_distribution=risk_dist,
                topic_performance=topic_perf,
            )

    def invalidate_cache(self, class_id: str) -> None:
        self._cache.pop(class_id, None)


# ─── Helpers ───────────────────────────────────────────────────────────────

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _days_since(iso_str: str) -> int:
    try:
        dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
        return (datetime.now(timezone.utc) - dt).days
    except Exception:
        return 999


def _extract_topic_from_quiz_id(quiz_id: str) -> Optional[str]:
    """Extract topic name from quiz ID patterns like 'algebra-1', 'geometry-basics'."""
    if not quiz_id:
        return None
    # Common patterns: subject-topic, module_quiz, etc.
    parts = quiz_id.replace("_", "-").replace(".", "-").split("-")
    if len(parts) >= 2:
        # Capitalize and join meaningful parts
        topic = " ".join(p.capitalize() for p in parts[:2] if p and not p.isdigit())
        return topic if topic else None
    return quiz_id.capitalize() if quiz_id else None


# Singleton
_engine_instance: Optional[ClassAnalyticsEngine] = None


def get_class_analytics_engine() -> ClassAnalyticsEngine:
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = ClassAnalyticsEngine()
    return _engine_instance
