"""
MathPulse AI — Intervention Engine

Generates personalized intervention plans for at-risk students using
real quiz data from Firestore and DeepSeek AI for learning path generation.
"""

import json
import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

logger = logging.getLogger("mathpulse.intervention_engine")

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

class LearningStep(BaseModel):
    step_number: int
    type: Literal["video_lesson", "practice", "assessment", "chat_session", "review"] = "practice"
    title: str
    description: str = ""
    duration_minutes: int = 10
    num_items: Optional[int] = None
    topic: str = ""
    competency_tag: str = ""
    difficulty: Literal["easy", "medium", "hard"] = "easy"
    is_completed: bool = False
    completion_score: Optional[float] = None


class LearningPath(BaseModel):
    student_id: str
    generated_at: str = ""
    methodology_tags: List[str] = Field(default_factory=lambda: ["Interactive", "Video", "Practice", "Quiz"])
    steps: List[LearningStep] = Field(default_factory=list)
    estimated_duration_days: int = 7
    primary_weak_topic: str = ""
    all_weak_topics: List[str] = Field(default_factory=list)
    ai_rationale: str = ""


class InterventionPlan(BaseModel):
    student_id: str
    student_name: str = ""
    grade_level: str = ""
    section: str = ""
    risk_level: Literal["Low Risk", "Medium Risk", "High Risk", "Critical", "Unassessed"] = "Unassessed"
    avg_score: float = 0.0
    engagement_level: Literal["Low", "Medium", "High"] = "Low"
    last_active: Optional[str] = None
    weakest_topic: str = ""
    weak_topics: List[str] = Field(default_factory=list)
    accuracy_by_topic: Dict[str, float] = Field(default_factory=dict)
    learning_strengths: str = ""
    next_steps_summary: str = ""
    learning_path: Optional[LearningPath] = None
    generated_at: str = ""
    teacher_recommendations: List[str] = Field(default_factory=list)


# ─── Risk & Engagement Classification ─────────────────────────────────────

def _classify_risk(avg_score: float, quiz_count: int, days_since_active: Optional[int]) -> str:
    if quiz_count == 0:
        return "Unassessed"
    engagement_low = (days_since_active is None or days_since_active > 7) or quiz_count < 3
    if avg_score < 50 and engagement_low:
        return "Critical"
    if avg_score < 60 or (avg_score < 75 and engagement_low):
        return "High Risk"
    if avg_score < 75:
        return "Medium Risk"
    return "Low Risk"


def _classify_engagement(days_since_active: Optional[int], recent_quiz_count: int) -> str:
    if days_since_active is not None and days_since_active <= 2 and recent_quiz_count >= 5:
        return "High"
    if days_since_active is not None and days_since_active <= 7:
        return "Medium"
    return "Low"


# ─── Engine ────────────────────────────────────────────────────────────────

class InterventionEngine:
    """Generates full intervention plans for at-risk students."""

    def __init__(self):
        self._cache: Dict[str, tuple] = {}  # student_id -> (plan, timestamp)
        self._cache_ttl = 3600  # 1 hour

    async def generate_full_intervention(self, student_id: str, force: bool = False) -> InterventionPlan:
        # Check cache
        if not force and student_id in self._cache:
            plan, cached_at = self._cache[student_id]
            if time.time() - cached_at < self._cache_ttl:
                return plan

        db = _get_firestore_client()
        if not db:
            logger.error("Firestore client unavailable")
            return InterventionPlan(student_id=student_id, generated_at=_now_iso())

        # Fetch student data from managedStudents
        student_data = await self._fetch_student_data(db, student_id)
        if not student_data:
            return InterventionPlan(
                student_id=student_id,
                student_name="Unknown",
                generated_at=_now_iso(),
                learning_strengths="No assessment data available yet.",
                next_steps_summary="Assign a diagnostic quiz to begin intervention planning.",
            )

        # Fetch quiz attempts
        quiz_attempts = await self._fetch_quiz_attempts(db, student_id, student_data)

        # Compute metrics
        now = datetime.now(timezone.utc)
        quiz_count = len(quiz_attempts)
        avg_score = 0.0
        accuracy_by_topic: Dict[str, List[float]] = {}

        if quiz_count > 0:
            scores = [float(q.get("score", 0)) for q in quiz_attempts]
            avg_score = sum(scores) / len(scores)

            for attempt in quiz_attempts:
                topic = self._extract_topic(attempt)
                if topic:
                    if topic not in accuracy_by_topic:
                        accuracy_by_topic[topic] = []
                    accuracy_by_topic[topic].append(float(attempt.get("score", 0)))

        topic_avgs = {t: round(sum(s) / len(s), 1) for t, s in accuracy_by_topic.items() if s}
        weak_topics = [t for t, s in sorted(topic_avgs.items(), key=lambda x: x[1]) if s < 70][:5]
        strong_topics = [t for t, s in topic_avgs.items() if s >= 70]
        weakest_topic = weak_topics[0] if weak_topics else student_data.get("weakestTopic", "Foundational Skills")
        if weakest_topic == "N/A":
            weakest_topic = "Foundational Skills"

        # Last active
        days_since_active = None
        last_active_str = None
        last_active_ts = student_data.get("lastActive")
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
        recent_count = sum(1 for q in quiz_attempts if self._is_recent(q, now, 14))

        risk_level = _classify_risk(avg_score, quiz_count, days_since_active)
        engagement = _classify_engagement(days_since_active, recent_count)

        # Generate AI insights
        insights = await self._generate_insights(
            grade_level=student_data.get("gradeLevel", student_data.get("grade", "11")),
            section=student_data.get("section", ""),
            risk_level=risk_level,
            avg_score=avg_score,
            engagement=engagement,
            strong_topics=strong_topics,
            weak_topics=weak_topics,
            quiz_count=quiz_count,
        )

        # Generate learning path
        learning_path = await self._generate_learning_path(
            student_id=student_id,
            grade_level=student_data.get("gradeLevel", student_data.get("grade", "11")),
            risk_level=risk_level,
            engagement=engagement,
            weak_topics=weak_topics,
            weakest_topic=weakest_topic,
            topic_avgs=topic_avgs,
        )

        # Generate teacher recommendations
        recommendations = await self._generate_recommendations(
            grade_level=student_data.get("gradeLevel", student_data.get("grade", "11")),
            risk_level=risk_level,
            weak_topics=weak_topics,
            avg_score=avg_score,
        )

        plan = InterventionPlan(
            student_id=student_id,
            student_name=student_data.get("name", "Unknown"),
            grade_level=student_data.get("gradeLevel", student_data.get("grade", "")),
            section=student_data.get("section", ""),
            risk_level=risk_level,
            avg_score=round(avg_score, 1),
            engagement_level=engagement,
            last_active=last_active_str,
            weakest_topic=weakest_topic,
            weak_topics=weak_topics,
            accuracy_by_topic=topic_avgs,
            learning_strengths=insights.get("learning_strengths", "Shows potential for improvement with guided support."),
            next_steps_summary=insights.get("next_steps_summary", f"Focus on {weakest_topic} with structured practice."),
            learning_path=learning_path,
            generated_at=_now_iso(),
            teacher_recommendations=recommendations,
        )

        # Cache
        self._cache[student_id] = (plan, time.time())

        # Persist to Firestore
        try:
            db.collection("intervention_plans").document(student_id).set(
                plan.model_dump(), merge=True
            )
        except Exception as e:
            logger.warning(f"Failed to persist intervention plan: {e}")

        return plan

    async def _fetch_student_data(self, db: Any, student_id: str) -> Optional[Dict]:
        """Fetch student from managedStudents or users collection."""
        try:
            doc = db.collection("managedStudents").document(student_id).get()
            if doc.exists:
                return {"id": doc.id, **doc.to_dict()}

            # Try users collection
            doc2 = db.collection("users").document(student_id).get()
            if doc2.exists:
                return {"id": doc2.id, **doc2.to_dict()}
        except Exception as e:
            logger.debug(f"Error fetching student {student_id}: {e}")
        return None

    async def _fetch_quiz_attempts(self, db: Any, student_id: str, student_data: Dict) -> List[Dict]:
        """Fetch quiz attempts from progress collection and practice_results."""
        attempts = []

        # Try progress/{student_id}
        for lookup_id in [student_id, student_data.get("lrn"), student_data.get("accountUid")]:
            if not lookup_id:
                continue
            try:
                progress_doc = db.collection("progress").document(lookup_id).get()
                if progress_doc.exists:
                    pdata = progress_doc.to_dict()
                    quiz_data = pdata.get("quizAttempts", [])
                    if quiz_data:
                        attempts = quiz_data
                        break
            except Exception:
                pass

        # Also check practice_results
        account_uid = student_data.get("accountUid") or student_id
        try:
            sessions = (
                db.collection("practice_results")
                .document(account_uid)
                .collection("sessions")
                .order_by("submitted_at", direction="DESCENDING")
                .limit(30)
                .stream()
            )
            for sess in sessions:
                sd = sess.to_dict()
                attempts.append({
                    "quizId": sd.get("session_id", ""),
                    "score": sd.get("score_percent", 0),
                    "completedAt": sd.get("submitted_at"),
                    "answers": sd.get("per_question_feedback", []),
                    "subject": sd.get("subject", ""),
                })
        except Exception:
            pass

        return attempts[:30]

    def _extract_topic(self, attempt: Dict) -> Optional[str]:
        """Extract topic from quiz attempt."""
        # Check subject field first
        if attempt.get("subject"):
            return attempt["subject"]
        # Try to extract from quizId
        quiz_id = attempt.get("quizId", "")
        if not quiz_id:
            return None
        parts = quiz_id.replace("_", "-").replace(".", "-").split("-")
        if len(parts) >= 2:
            topic = " ".join(p.capitalize() for p in parts[:2] if p and not p.isdigit())
            return topic if topic else None
        return quiz_id.capitalize() if quiz_id else None

    def _is_recent(self, attempt: Dict, now: datetime, days: int) -> bool:
        completed = attempt.get("completedAt")
        if not completed:
            return False
        try:
            if hasattr(completed, "seconds"):
                q_dt = datetime.fromtimestamp(completed.seconds, tz=timezone.utc)
            elif isinstance(completed, datetime):
                q_dt = completed
            else:
                return False
            return (now - q_dt).days <= days
        except Exception:
            return False

    async def _generate_insights(self, **kwargs) -> Dict[str, str]:
        """Generate learning_strengths and next_steps_summary via DeepSeek."""
        prompt = f"""You are MathPulse AI analyzing a Filipino K-12 student's performance data.

Student: Grade {kwargs['grade_level']}, Section {kwargs['section']}
Risk Level: {kwargs['risk_level']}
Average Score: {kwargs['avg_score']:.1f}%
Engagement: {kwargs['engagement']}
Strong Topics (accuracy > 70%): {', '.join(kwargs['strong_topics'][:3]) or 'None identified yet'}
Weak Topics (accuracy < 60%): {', '.join(kwargs['weak_topics'][:3]) or 'None identified yet'}
Quiz Attempt Count (last 30 days): {kwargs['quiz_count']}

Generate two SHORT insights (max 20 words each):
1. LEARNING STRENGTHS: What the student excels at or shows potential in. Be specific and encouraging.
2. NEXT STEPS: The single most important action for the teacher/student right now.

Return as JSON:
{{"learning_strengths": "...", "next_steps_summary": "..."}}"""

        try:
            from services.ai_client import get_deepseek_client, CHAT_MODEL
            client = get_deepseek_client()
            response = client.chat.completions.create(
                model=CHAT_MODEL,
                messages=[
                    {"role": "system", "content": "You are MathPulse AI. Respond only with valid JSON."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                max_tokens=200,
                response_format={"type": "json_object"},
            )
            content = response.choices[0].message.content or "{}"
            return json.loads(content)
        except Exception as e:
            logger.warning(f"DeepSeek insights failed: {e}")
            return {
                "learning_strengths": "Shows willingness to engage with the platform." if kwargs['quiz_count'] > 0 else "No assessment data yet — potential to be discovered.",
                "next_steps_summary": f"Begin with foundational practice in {kwargs['weak_topics'][0] if kwargs['weak_topics'] else 'core topics'}.",
            }

    async def _generate_learning_path(self, **kwargs) -> LearningPath:
        """Generate a structured learning path via DeepSeek."""
        student_id = kwargs["student_id"]
        weak_topics = kwargs["weak_topics"]
        weakest_topic = kwargs["weakest_topic"]
        engagement = kwargs["engagement"]
        risk_level = kwargs["risk_level"]
        grade_level = kwargs["grade_level"]
        topic_avgs = kwargs["topic_avgs"]

        style_hint = "shorter steps (5-8 min), gamified" if engagement == "Low" else "standard pacing (10-15 min)"
        estimated_days = 5 if risk_level == "Critical" else 7

        prompt = f"""Create a personalized intervention learning path for a Filipino K-12 math student.

Student Profile:
- Grade Level: {grade_level}
- Risk Level: {risk_level}
- Primary Weak Topic: {weakest_topic}
- All Weak Topics: {', '.join(weak_topics[:4]) or weakest_topic}
- Accuracy by Topic: {json.dumps(topic_avgs)}
- Engagement: {engagement} → {style_hint}

Create a 4-6 step learning path that:
1. Starts with the MOST CRITICAL weak topic (lowest accuracy)
2. Uses varied methodology: video → practice → assessment → review cycle
3. Scales difficulty: start easy, progress to grade-level
4. Total estimated time: {estimated_days} days

Return ONLY valid JSON:
{{
  "methodology_tags": ["Interactive", "Video", "Practice", "Quiz"],
  "estimated_duration_days": {estimated_days},
  "ai_rationale": "1 sentence explaining why this path was chosen",
  "steps": [
    {{
      "step_number": 1,
      "type": "video_lesson",
      "title": "Topic - Concept Name",
      "description": "Brief description of what student will learn",
      "duration_minutes": 8,
      "num_items": null,
      "topic": "Topic Name",
      "competency_tag": "M11GM-Ia-1",
      "difficulty": "easy"
    }}
  ]
}}"""

        try:
            from services.ai_client import get_deepseek_client, CHAT_MODEL
            client = get_deepseek_client()
            response = client.chat.completions.create(
                model=CHAT_MODEL,
                messages=[
                    {"role": "system", "content": "You are a curriculum designer for Filipino K-12 DepEd math. Respond only with valid JSON."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.4,
                max_tokens=800,
                response_format={"type": "json_object"},
            )
            content = response.choices[0].message.content or "{}"
            parsed = json.loads(content)

            steps = []
            for s in parsed.get("steps", []):
                steps.append(LearningStep(
                    step_number=s.get("step_number", len(steps) + 1),
                    type=s.get("type", "practice"),
                    title=s.get("title", "Practice Step"),
                    description=s.get("description", ""),
                    duration_minutes=s.get("duration_minutes", 10),
                    num_items=s.get("num_items"),
                    topic=s.get("topic", weakest_topic),
                    competency_tag=s.get("competency_tag", ""),
                    difficulty=s.get("difficulty", "easy"),
                ))

            return LearningPath(
                student_id=student_id,
                generated_at=_now_iso(),
                methodology_tags=parsed.get("methodology_tags", ["Interactive", "Video", "Practice", "Quiz"]),
                steps=steps,
                estimated_duration_days=parsed.get("estimated_duration_days", estimated_days),
                primary_weak_topic=weakest_topic,
                all_weak_topics=weak_topics,
                ai_rationale=parsed.get("ai_rationale", f"Focused on {weakest_topic} as the primary area needing improvement."),
            )
        except Exception as e:
            logger.warning(f"DeepSeek learning path generation failed: {e}")
            # Fallback: generate a basic path
            return self._fallback_learning_path(student_id, weakest_topic, weak_topics)

    def _fallback_learning_path(self, student_id: str, weakest_topic: str, weak_topics: List[str]) -> LearningPath:
        """Generate a basic learning path without AI."""
        steps = [
            LearningStep(step_number=1, type="video_lesson", title=f"{weakest_topic} - Fundamentals",
                         description="Review core concepts", duration_minutes=8, topic=weakest_topic, difficulty="easy"),
            LearningStep(step_number=2, type="practice", title=f"{weakest_topic} - Guided Practice",
                         description="Work through examples", duration_minutes=12, num_items=10, topic=weakest_topic, difficulty="easy"),
            LearningStep(step_number=3, type="practice", title=f"{weakest_topic} - Independent Practice",
                         description="Solve problems independently", duration_minutes=15, num_items=10, topic=weakest_topic, difficulty="medium"),
            LearningStep(step_number=4, type="assessment", title=f"{weakest_topic} - Mastery Check",
                         description="Demonstrate understanding", duration_minutes=10, num_items=5, topic=weakest_topic, difficulty="medium"),
        ]
        if len(weak_topics) > 1:
            steps.append(LearningStep(step_number=5, type="review", title=f"{weak_topics[1]} - Review",
                                      description="Brief review of secondary weak area", duration_minutes=10, topic=weak_topics[1], difficulty="easy"))

        return LearningPath(
            student_id=student_id,
            generated_at=_now_iso(),
            steps=steps,
            estimated_duration_days=7,
            primary_weak_topic=weakest_topic,
            all_weak_topics=weak_topics,
            ai_rationale=f"Structured path focusing on {weakest_topic} with progressive difficulty.",
        )

    async def _generate_recommendations(self, **kwargs) -> List[str]:
        """Generate teacher recommendations via DeepSeek."""
        prompt = f"""Generate 3-5 concise, actionable recommendations for a teacher working with this at-risk student.

Student: Grade {kwargs['grade_level']}, Risk: {kwargs['risk_level']}
Weak Topics: {', '.join(kwargs['weak_topics'][:3]) or 'Foundational Skills'}
Avg Score: {kwargs['avg_score']:.0f}%

Return as a JSON array of strings. Each recommendation max 25 words. Be specific to the weak topics."""

        try:
            from services.ai_client import get_deepseek_client, CHAT_MODEL
            client = get_deepseek_client()
            response = client.chat.completions.create(
                model=CHAT_MODEL,
                messages=[
                    {"role": "system", "content": "You are a K-12 math education advisor. Respond only with a JSON array of strings."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                max_tokens=300,
                response_format={"type": "json_object"},
            )
            content = response.choices[0].message.content or "[]"
            parsed = json.loads(content)
            if isinstance(parsed, list):
                return parsed[:5]
            if isinstance(parsed, dict):
                return parsed.get("recommendations", parsed.get("actions", []))[:5]
        except Exception as e:
            logger.warning(f"DeepSeek recommendations failed: {e}")

        return [
            f"Schedule 1-on-1 review session for {kwargs['weak_topics'][0] if kwargs['weak_topics'] else 'foundational skills'}.",
            "Assign additional practice problems at reduced difficulty level.",
            "Monitor quiz completion and provide immediate feedback.",
        ]

    async def complete_step(self, student_id: str, step_number: int, score: float, time_spent: int) -> Dict:
        """Mark a learning step as completed."""
        db = _get_firestore_client()
        if not db:
            return {"error": "Firestore unavailable"}

        try:
            plan_ref = db.collection("intervention_plans").document(student_id)
            plan_doc = plan_ref.get()
            if not plan_doc.exists:
                return {"error": "No intervention plan found"}

            plan_data = plan_doc.to_dict()
            learning_path = plan_data.get("learning_path", {})
            steps = learning_path.get("steps", [])

            for step in steps:
                if step.get("step_number") == step_number:
                    step["is_completed"] = True
                    step["completion_score"] = score
                    break

            plan_ref.update({"learning_path.steps": steps})

            # Invalidate cache
            self._cache.pop(student_id, None)

            return {"status": "completed", "step_number": step_number, "score": score}
        except Exception as e:
            logger.error(f"Failed to complete step: {e}")
            return {"error": str(e)}

    def invalidate_cache(self, student_id: str) -> None:
        self._cache.pop(student_id, None)


# ─── Helpers ───────────────────────────────────────────────────────────────

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# Singleton
_engine_instance: Optional[InterventionEngine] = None


def get_intervention_engine() -> InterventionEngine:
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = InterventionEngine()
    return _engine_instance
