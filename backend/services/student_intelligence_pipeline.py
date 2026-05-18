"""
MathPulse AI — Student Intelligence Pipeline

Central event processor that:
- Intercepts every student activity completion
- Recomputes P (systemPerformanceAvg) from all accumulated scores
- Calls existing compute_wri() with updated D, G, P
- Writes denormalized student_profiles and class summaries
- Triggers DeepSeek AI context generation when meaningful
"""

import json
import logging
import os
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

logger = logging.getLogger("mathpulse.pipeline")

# ─── Firestore ─────────────────────────────────────────────────────────────

_firebase_firestore = None


def _get_db():
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

class StudentActivityEvent(BaseModel):
    student_id: str
    event_type: Literal["diagnostic", "quiz", "battle", "lesson", "module", "session"]
    event_data: Dict[str, Any] = Field(default_factory=dict)
    occurred_at: str  # ISO string
    class_id: str = ""
    teacher_id: str = ""


class ProfileUpdateResult(BaseModel):
    student_id: str
    profile_updated: bool = False
    p_updated: bool = False
    new_p: Optional[float] = None
    wri_recomputed: bool = False
    new_wri: Optional[float] = None
    new_risk_status: str = "pending_assessment"
    risk_status_changed: bool = False
    previous_risk_status: Optional[str] = None
    ai_regenerated: bool = False


# ─── Source weights and recency multipliers for P computation ──────────────

SOURCE_WEIGHTS = {
    "practice": 1.0,
    "lesson_quiz": 1.0,
    "module_quiz": 1.2,
    "assessment": 1.2,
    "battle": 0.8,
    "intervention_quiz": 1.3,
    "diagnostic": 1.0,
}


def _recency_multiplier(occurred_at: datetime) -> float:
    now = datetime.now(timezone.utc)
    days_ago = (now - occurred_at).days
    if days_ago <= 7:
        return 1.5
    if days_ago <= 30:
        return 1.0
    return 0.6


# ─── Pipeline ──────────────────────────────────────────────────────────────

class StudentIntelligencePipeline:

    async def process_event(self, event: StudentActivityEvent) -> ProfileUpdateResult:
        """Master entry point. Called after every student activity."""
        db = _get_db()
        if not db:
            logger.error("Firestore unavailable")
            return ProfileUpdateResult(student_id=event.student_id)

        result = ProfileUpdateResult(student_id=event.student_id)

        try:
            # 1. Load or create profile
            profile = self._load_profile(db, event.student_id)

            # 2. Load managed student data (source of D, G, weights)
            managed = self._load_managed_student(db, event.student_id)

            # 3. Update profile section from event
            self._update_profile_section(profile, event)

            # 4. Compute P from all activity (skip for session events)
            if event.event_type != "session":
                new_p = self._compute_system_performance_avg(db, event.student_id, event)
                profile["system_performance_avg"] = new_p
                result.p_updated = True
                result.new_p = new_p
            else:
                new_p = profile.get("system_performance_avg")

            # 5. Recompute WRI using existing compute_wri function
            d = managed.get("diagnosticScore") or profile.get("diagnostic", {}).get("overall_score")
            g = managed.get("externalGradesAvg") or profile.get("external_grades_avg")
            weights = managed.get("weights") or profile.get("wri_weights") or {"w1": 0.30, "w2": 0.40, "w3": 0.30}

            if d is not None and event.event_type != "session":
                from services.wri_service import compute_wri
                wri_result = compute_wri(d=d, g=g, p=new_p, weights=weights)

                previous_status = profile.get("risk_status", "pending_assessment")
                new_status = wri_result["risk_status"]

                result.wri_recomputed = True
                result.new_wri = wri_result["wri"]
                result.new_risk_status = new_status
                result.previous_risk_status = previous_status
                result.risk_status_changed = previous_status != new_status

                # Update profile
                profile["wri"] = wri_result["wri"]
                profile["risk_status"] = new_status
                profile["previous_risk_status"] = previous_status
                profile["system_performance_avg"] = new_p
                profile["external_grades_avg"] = g
                profile["diagnostic_score"] = d
                profile["wri_weights"] = weights
                profile["g_fallback"] = wri_result["g_fallback"]
                profile["p_fallback"] = wri_result["p_fallback"]
                profile["wri_updated_at"] = _now_iso()

                # Compute risk trend
                profile["risk_trend"] = self._compute_risk_trend(profile)

                # 6. Write to managedStudents (update P, WRI, riskStatus)
                self._update_managed_student(db, event.student_id, wri_result, new_p)

            # 7. AI context generation (cost-controlled)
            if self._should_regenerate_ai(event, profile, result):
                ai_ctx = await self._generate_ai_context(profile, event)
                if ai_ctx:
                    profile["ai_context"] = ai_ctx
                    result.ai_regenerated = True

            # 8. Update metadata
            profile["last_updated_at"] = _now_iso()
            profile["last_event_type"] = event.event_type
            profile["last_event_at"] = event.occurred_at
            profile["profile_version"] = profile.get("profile_version", 0) + 1

            # 9. Write student_profiles/{id}
            db.collection("student_profiles").document(event.student_id).set(profile, merge=True)
            result.profile_updated = True

            # 10. Write denormalized summary
            if event.class_id:
                self._write_summary(db, event.class_id, event.student_id, profile)

            # 11. Invalidate class analytics cache
            if event.class_id:
                self._invalidate_class_cache(db, event.class_id)

        except Exception as e:
            logger.error(f"Pipeline error for {event.student_id}: {e}", exc_info=True)

        return result

    # ─── Profile loading ───────────────────────────────────────────────────

    def _load_profile(self, db, student_id: str) -> Dict:
        doc = db.collection("student_profiles").document(student_id).get()
        if doc.exists:
            return doc.to_dict()
        return {"student_id": student_id, "profile_version": 0, "risk_status": "pending_assessment"}

    def _load_managed_student(self, db, student_id: str) -> Dict:
        doc = db.collection("managedStudents").document(student_id).get()
        if doc.exists:
            return doc.to_dict()
        # Try users collection
        doc2 = db.collection("users").document(student_id).get()
        return doc2.to_dict() if doc2.exists else {}

    # ─── Profile section updates ───────────────────────────────────────────

    def _update_profile_section(self, profile: Dict, event: StudentActivityEvent):
        ed = event.event_data

        if event.event_type == "diagnostic":
            profile.setdefault("diagnostic", {})
            profile["diagnostic"]["completed"] = True
            profile["diagnostic"]["completed_at"] = event.occurred_at
            profile["diagnostic"]["overall_score"] = ed.get("overall_score", 0)
            profile["diagnostic"]["per_topic_scores"] = ed.get("per_topic_scores", {})
            profile["diagnostic"]["weak_topics"] = [
                t for t, s in ed.get("per_topic_scores", {}).items() if s < 60
            ]
            profile["diagnostic"]["strong_topics"] = [
                t for t, s in ed.get("per_topic_scores", {}).items() if s >= 75
            ]
            profile["diagnostic_score"] = ed.get("overall_score", 0)

        elif event.event_type in ("quiz", "battle"):
            qp = profile.setdefault("quiz_performance", {
                "total_attempts": 0, "avg_score_all_time": None,
                "recent_attempts": [], "accuracy_by_topic": {},
            })
            qp["total_attempts"] = qp.get("total_attempts", 0) + 1

            score = ed.get("score", 0)
            topic = ed.get("topic", "")

            # Update rolling average
            prev_avg = qp.get("avg_score_all_time") or 0
            prev_count = qp["total_attempts"] - 1
            if prev_count > 0:
                qp["avg_score_all_time"] = round(
                    (prev_avg * prev_count + score) / qp["total_attempts"], 1
                )
            else:
                qp["avg_score_all_time"] = score

            # Update per-topic accuracy (exponential moving average)
            if topic:
                acc = qp.setdefault("accuracy_by_topic", {})
                prev = acc.get(topic, score)
                acc[topic] = round(prev * 0.7 + score * 0.3, 1)

            # Add to recent attempts (keep last 10)
            recent = qp.setdefault("recent_attempts", [])
            recent.insert(0, {
                "quiz_id": ed.get("quiz_id", ""),
                "topic": topic,
                "competency_tag": ed.get("competency_tag", ""),
                "score": score,
                "source": ed.get("source", event.event_type),
                "attempted_at": event.occurred_at,
            })
            qp["recent_attempts"] = recent[:10]

            # Compute lowest/highest topics
            if qp.get("accuracy_by_topic"):
                sorted_topics = sorted(qp["accuracy_by_topic"].items(), key=lambda x: x[1])
                qp["lowest_accuracy_topics"] = [t for t, _ in sorted_topics[:5]]
                qp["highest_accuracy_topics"] = [t for t, _ in sorted_topics[-5:]]

            # Battle-specific
            if event.event_type == "battle":
                bp = profile.setdefault("battle_performance", {"total_battles": 0, "battles_won": 0})
                bp["total_battles"] = bp.get("total_battles", 0) + 1
                if ed.get("won"):
                    bp["battles_won"] = bp.get("battles_won", 0) + 1
                bp["win_rate"] = round(bp["battles_won"] / bp["total_battles"] * 100, 1) if bp["total_battles"] > 0 else 0
                bp["avg_battle_score"] = score
                bp["last_battle_at"] = event.occurred_at

        elif event.event_type == "lesson":
            ce = profile.setdefault("content_engagement", {"lessons_completed": 0, "modules_completed": 0, "topics_studied": []})
            if ed.get("is_completed"):
                ce["lessons_completed"] = ce.get("lessons_completed", 0) + 1
            topic = ed.get("topic", "")
            if topic and topic not in ce.get("topics_studied", []):
                ce.setdefault("topics_studied", []).append(topic)
            ce["last_content_at"] = event.occurred_at

        elif event.event_type == "module":
            ce = profile.setdefault("content_engagement", {"lessons_completed": 0, "modules_completed": 0, "topics_studied": []})
            if ed.get("is_completed"):
                ce["modules_completed"] = ce.get("modules_completed", 0) + 1
            ce["last_content_at"] = event.occurred_at

        elif event.event_type == "session":
            eng = profile.setdefault("engagement", {"total_sessions": 0, "login_streak": 0})
            eng["total_sessions"] = eng.get("total_sessions", 0) + 1
            eng["last_active_at"] = event.occurred_at
            eng["days_since_last_active"] = 0

    # ─── P computation ─────────────────────────────────────────────────────

    def _compute_system_performance_avg(
        self, db, student_id: str, current_event: StudentActivityEvent
    ) -> float:
        """Compute P from ALL in-platform scores with source weights and recency."""
        scores = []

        # Fetch from quizSubmissions
        try:
            subs = db.collection("quizSubmissions").where("lrn", "==", student_id).order_by(
                "submittedAt", direction="DESCENDING"
            ).limit(50).stream()
            for s in subs:
                d = s.to_dict()
                score = d.get("score", 0)
                source = d.get("source", "practice")
                submitted = d.get("submittedAt")
                if submitted and hasattr(submitted, "seconds"):
                    dt = datetime.fromtimestamp(submitted.seconds, tz=timezone.utc)
                else:
                    dt = datetime.now(timezone.utc) - timedelta(days=15)
                scores.append((score, source, dt))
        except Exception as e:
            logger.debug(f"quizSubmissions fetch failed for {student_id}: {e}")

        # Fetch from progress/{id}.quizAttempts
        try:
            for lookup_id in [student_id]:
                prog = db.collection("progress").document(lookup_id).get()
                if prog.exists:
                    attempts = prog.to_dict().get("quizAttempts", [])
                    for a in attempts:
                        score = a.get("score", 0)
                        completed = a.get("completedAt")
                        if completed and hasattr(completed, "seconds"):
                            dt = datetime.fromtimestamp(completed.seconds, tz=timezone.utc)
                        else:
                            dt = datetime.now(timezone.utc) - timedelta(days=15)
                        scores.append((score, "practice", dt))
                    break
        except Exception as e:
            logger.debug(f"progress fetch failed for {student_id}: {e}")

        # Include current event score
        if current_event.event_type in ("quiz", "battle", "diagnostic"):
            event_score = current_event.event_data.get("score") or current_event.event_data.get("overall_score", 0)
            source = current_event.event_data.get("source", current_event.event_type)
            try:
                dt = datetime.fromisoformat(current_event.occurred_at.replace("Z", "+00:00"))
            except Exception:
                dt = datetime.now(timezone.utc)
            scores.append((event_score, source, dt))

        if not scores:
            # Fallback to D
            return self._load_profile(_get_db(), student_id).get("diagnostic_score") or 0.0

        # Weighted average
        weighted_sum = 0.0
        weight_sum = 0.0
        for score, source, dt in scores:
            sw = SOURCE_WEIGHTS.get(source, 1.0)
            rm = _recency_multiplier(dt)
            weighted_sum += score * sw * rm
            weight_sum += sw * rm

        return round(weighted_sum / weight_sum, 2) if weight_sum > 0 else 0.0

    # ─── WRI update to managedStudents ─────────────────────────────────────

    def _update_managed_student(self, db, student_id: str, wri_result: Dict, new_p: float):
        """Write updated WRI data to managedStudents/{id}."""
        try:
            ref = db.collection("managedStudents").document(student_id)
            if not ref.get().exists:
                return
            ref.update({
                "wri": wri_result["wri"],
                "riskStatus": wri_result["risk_status"],
                "systemPerformanceAvg": new_p,
                "riskUpdatedAt": datetime.now(timezone.utc),
            })
        except Exception as e:
            logger.warning(f"Failed to update managedStudents/{student_id}: {e}")

    # ─── Risk trend ────────────────────────────────────────────────────────

    def _compute_risk_trend(self, profile: Dict) -> str:
        qp = profile.get("quiz_performance", {})
        avg_all = qp.get("avg_score_all_time")
        avg_7d = qp.get("avg_score_last_7_days")
        if avg_all is None or avg_7d is None:
            return "insufficient_data"
        if avg_7d > avg_all + 5:
            return "improving"
        if avg_7d < avg_all - 5:
            return "worsening"
        return "stable"

    # ─── AI context generation ─────────────────────────────────────────────

    def _should_regenerate_ai(self, event: StudentActivityEvent, profile: Dict, result: ProfileUpdateResult) -> bool:
        if event.event_type == "session":
            return False
        if event.event_type == "diagnostic":
            return True
        if result.risk_status_changed:
            return True
        ai_ctx = profile.get("ai_context", {})
        if not ai_ctx.get("generated_at"):
            return True
        # Rate limit: max once per 6 hours
        try:
            last_gen = datetime.fromisoformat(ai_ctx["generated_at"].replace("Z", "+00:00"))
            if (datetime.now(timezone.utc) - last_gen).total_seconds() < 21600:
                return False
        except Exception:
            pass
        return event.event_type in ("quiz", "battle") and result.new_risk_status in ("critical", "at_risk")

    async def _generate_ai_context(self, profile: Dict, event: StudentActivityEvent) -> Optional[Dict]:
        """Call DeepSeek for AI context generation."""
        try:
            from services.ai_client import get_deepseek_client, CHAT_MODEL

            weak_topics = profile.get("quiz_performance", {}).get("lowest_accuracy_topics", [])[:3]
            diag = profile.get("diagnostic", {})
            qp = profile.get("quiz_performance", {})

            prompt = f"""Analyze this student's FULL learning history and generate insights.

Student: Grade {profile.get('grade_level', '?')}, Section {profile.get('section', '?')}
WRI: {profile.get('wri', 'N/A')} | Status: {profile.get('risk_status', 'pending_assessment')}
Previous Status: {profile.get('previous_risk_status', 'N/A')}
Risk Trend: {profile.get('risk_trend', 'insufficient_data')}

Diagnostic Score: {diag.get('overall_score', 'N/A')}%
System Performance (P): {profile.get('system_performance_avg', 'N/A')}%
External Grades (G): {profile.get('external_grades_avg', 'N/A')}%

Quiz Performance: {qp.get('total_attempts', 0)} attempts, avg {qp.get('avg_score_all_time', 'N/A')}%
Weakest Topics: {', '.join(weak_topics) or 'None identified'}
Strongest Topics: {', '.join(qp.get('highest_accuracy_topics', [])[:3]) or 'None identified'}

Latest Event: {event.event_type} — score {event.event_data.get('score', event.event_data.get('overall_score', 'N/A'))}%

Generate JSON:
{{"ai_summary": "1 sentence: current status with WRI context",
"ai_strengths": "specific topics/skills they excel at",
"ai_concerns": "specific gaps needing attention",
"ai_recommendation": "top 1 action for teacher this week (max 20 words)",
"notable_change": "what changed most since last update",
"rag_topics_used": []}}"""

            client = get_deepseek_client()
            response = client.chat.completions.create(
                model=CHAT_MODEL,
                messages=[
                    {"role": "system", "content": "You are MathPulse AI analyzing Filipino K-12 math student data. Respond only with valid JSON."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                max_tokens=400,
                response_format={"type": "json_object"},
            )
            content = response.choices[0].message.content or "{}"
            parsed = json.loads(content)
            parsed["generated_at"] = _now_iso()
            parsed["based_on_wri_status"] = profile.get("risk_status", "pending_assessment")
            return parsed
        except Exception as e:
            logger.warning(f"DeepSeek AI context generation failed: {e}")
            return None

    # ─── Denormalized summary ──────────────────────────────────────────────

    def _write_summary(self, db, class_id: str, student_id: str, profile: Dict):
        """Write lightweight summary for Teacher Dashboard reads."""
        qp = profile.get("quiz_performance", {})
        ai = profile.get("ai_context", {})
        eng = profile.get("engagement", {})

        summary = {
            "student_id": student_id,
            "display_name": profile.get("display_name", ""),
            "wri": profile.get("wri"),
            "risk_status": profile.get("risk_status", "pending_assessment"),
            "previous_risk_status": profile.get("previous_risk_status"),
            "risk_trend": profile.get("risk_trend", "insufficient_data"),
            "avg_score_all_time": qp.get("avg_score_all_time"),
            "avg_score_last_7_days": qp.get("avg_score_last_7_days"),
            "score_trend": qp.get("score_trend", "insufficient_data"),
            "last_active_at": eng.get("last_active_at"),
            "days_since_last_active": eng.get("days_since_last_active", 999),
            "weakest_topic": (qp.get("lowest_accuracy_topics") or [None])[0],
            "ai_summary": ai.get("ai_summary", ""),
            "has_intervention_plan": profile.get("intervention", {}).get("has_active_plan", False),
            "lessons_completed": profile.get("content_engagement", {}).get("lessons_completed", 0),
            "modules_completed": profile.get("content_engagement", {}).get("modules_completed", 0),
            "updated_at": _now_iso(),
        }

        try:
            db.collection("classes").document(class_id).collection("student_summaries").document(student_id).set(summary, merge=True)
        except Exception as e:
            logger.warning(f"Failed to write summary for {student_id} in class {class_id}: {e}")

    def _invalidate_class_cache(self, db, class_id: str):
        try:
            db.collection("class_analytics").document(class_id).update({"cache_valid": False})
        except Exception:
            pass


# ─── Helpers ───────────────────────────────────────────────────────────────

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# Singleton
_pipeline: Optional[StudentIntelligencePipeline] = None


def get_pipeline() -> StudentIntelligencePipeline:
    global _pipeline
    if _pipeline is None:
        _pipeline = StudentIntelligencePipeline()
    return _pipeline
