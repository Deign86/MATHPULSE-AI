"""
MathPulse AI - Event-Driven Automation Engine

Processes educational workflows based on a diagnostic-first, risk-driven
intervention model.  Trigger points:

1. Diagnostic Assessment Completion  (highest priority)
2. Quiz / Assessment Submission       (continuous)
3. New Student Enrollment
4. External Data Import               (teacher action)
5. Admin Content Updates

Each event is routed to a dedicated handler that orchestrates
classification, quiz generation, notifications and dashboard updates.
"""

import math
import logging
from typing import List, Optional, Dict, Any

from pydantic import BaseModel, Field

logger = logging.getLogger("mathpulse.automation")

# ─── Constants ──────────────────────────────────────────────────

AT_RISK_THRESHOLD = 60          # < 60 % → At Risk
WEAK_TOPIC_THRESHOLD = 0.50     # < 50 % accuracy → weak topic
HIGH_RISK_RATIO = 0.75          # 75 %+ subjects at risk
MEDIUM_RISK_RATIO = 0.50        # 50-75 %

REMEDIAL_CONFIG = {
    "High":   {"questions": 15, "dist": {"easy": 60, "medium": 30, "hard": 10}},
    "Medium": {"questions": 12, "dist": {"easy": 50, "medium": 35, "hard": 15}},
    "Low":    {"questions": 10, "dist": {"easy": 40, "medium": 40, "hard": 20}},
}

# ─── Request / Response Models ──────────────────────────────────


class DiagnosticResult(BaseModel):
    """Per-subject score from diagnostic assessment."""
    subject: str
    score: float = Field(..., ge=0, le=100)


class DiagnosticCompletionPayload(BaseModel):
    """Payload sent when a student completes the diagnostic."""
    studentId: str
    results: List[DiagnosticResult]
    gradeLevel: str = "Grade 10"
    questionBreakdown: Optional[Dict[str, list]] = None   # topic → [{correct: bool, …}]


class QuizSubmissionPayload(BaseModel):
    """Payload sent on quiz / assessment submission."""
    studentId: str
    quizId: str
    subject: str
    score: float = Field(..., ge=0, le=100)
    totalQuestions: int
    correctAnswers: int
    timeSpentSeconds: int
    answers: Optional[List[Dict[str, Any]]] = None


class StudentEnrollmentPayload(BaseModel):
    """Payload sent when a new student account is created."""
    studentId: str
    name: str
    email: str
    gradeLevel: str = "Grade 10"
    teacherId: Optional[str] = None


class DataImportPayload(BaseModel):
    """Payload sent after a teacher uploads a spreadsheet."""
    teacherId: str
    students: List[Dict[str, Any]]       # parsed student rows
    columnMapping: Dict[str, str]


class ContentUpdatePayload(BaseModel):
    """Payload sent when admin performs CRUD on curriculum."""
    adminId: str
    action: str                           # create | update | delete
    contentType: str                      # lesson | quiz | module | subject
    contentId: str
    subjectId: Optional[str] = None
    details: Optional[str] = None


# ─── Risk classification helpers ─────────────────────────────────


class SubjectRiskClassification(BaseModel):
    status: str              # "At Risk" | "On Track"
    score: float
    confidence: float
    needsIntervention: bool


class AutomationResult(BaseModel):
    """Standardised result returned by every handler."""
    success: bool
    event: str
    studentId: Optional[str] = None
    message: str
    riskClassifications: Optional[Dict[str, Dict[str, Any]]] = None
    overallRisk: Optional[str] = None
    atRiskSubjects: Optional[List[str]] = None
    weakTopics: Optional[List[Dict[str, Any]]] = None
    learningPath: Optional[str] = None
    remedialQuizzesCreated: int = 0
    interventions: Optional[str] = None
    notifications: List[str] = Field(default_factory=list)


# ─── Automation Engine ──────────────────────────────────────────


class MathPulseAutomationEngine:
    """
    Stateless event-driven automation system.

    Each ``handle_*`` method is an independent, self-contained handler that
    receives a validated Pydantic payload and returns an ``AutomationResult``.
    Firebase / Hugging Face calls are only attempted when available.
    """

    # ────────────────────────────────────────────────────────────
    # 1. DIAGNOSTIC COMPLETION  (highest-priority)
    # ────────────────────────────────────────────────────────────

    async def handle_diagnostic_completion(
        self, payload: DiagnosticCompletionPayload
    ) -> AutomationResult:
        """
        Runs when a student completes the mandatory diagnostic.

        Steps:
        1. Classify per-subject risk
        2. Identify weak topics
        3. Compute overall risk
        4. Generate personalised learning path (AI)
        5. Create remedial quiz assignments
        6. Generate teacher intervention recommendations (AI)
        7. Persist everything & notify
        """
        student_id = payload.studentId
        logger.info(f"📊 DIAGNOSTIC COMPLETED for {student_id}")
        notifications: list[str] = []

        # 1 — subject-level risk
        risk_classifications = self._classify_subject_risks(payload.results)

        # 2 — weak topics
        weak_topics = self._identify_weak_topics(payload.questionBreakdown)

        # 3 — overall risk
        overall_risk = self._calculate_overall_risk(risk_classifications)

        at_risk_subjects = [
            subj for subj, data in risk_classifications.items()
            if data["status"] == "At Risk"
        ]

        # 4 — learning path (AI call)
        learning_path: Optional[str] = None
        if at_risk_subjects:
            learning_path = await self._generate_learning_path(
                at_risk_subjects, weak_topics, payload.gradeLevel
            )

        # 5 — remedial quizzes
        remedial_count = 0
        remedial_quizzes: list[dict] = []
        if at_risk_subjects:
            remedial_quizzes = self._build_remedial_quiz_configs(
                student_id, at_risk_subjects, overall_risk, payload.gradeLevel
            )
            remedial_count = len(remedial_quizzes)

        # 6 — teacher interventions (AI call)
        interventions: Optional[str] = None
        if at_risk_subjects:
            interventions = await self._generate_teacher_interventions(
                risk_classifications, weak_topics
            )

        # 7 — notification messages
        if at_risk_subjects:
            notifications.append(
                f"Diagnostic complete — {len(at_risk_subjects)} subject(s) flagged At Risk: "
                + ", ".join(at_risk_subjects)
            )
        else:
            notifications.append("Diagnostic complete — all subjects On Track!")

        logger.info(
            f"✅ DIAGNOSTIC PROCESSING COMPLETE for {student_id} | "
            f"Overall={overall_risk} | AtRisk={at_risk_subjects}"
        )

        return AutomationResult(
            success=True,
            event="diagnostic_completed",
            studentId=student_id,
            message=f"Diagnostic processed for {student_id}",
            riskClassifications=risk_classifications,
            overallRisk=overall_risk,
            atRiskSubjects=at_risk_subjects,
            weakTopics=weak_topics,
            learningPath=learning_path,
            remedialQuizzesCreated=remedial_count,
            interventions=interventions,
            notifications=notifications,
        )

    # ────────────────────────────────────────────────────────────
    # 2. QUIZ SUBMISSION  (continuous)
    # ────────────────────────────────────────────────────────────

    async def handle_quiz_submission(
        self, payload: QuizSubmissionPayload
    ) -> AutomationResult:
        """Recalculate risk for a subject after a quiz is submitted."""
        student_id = payload.studentId
        logger.info(f"📝 QUIZ SUBMITTED by {student_id} — {payload.subject} ({payload.score}%)")
        notifications: list[str] = []

        # Determine new status for this subject
        new_status = "At Risk" if payload.score < AT_RISK_THRESHOLD else "On Track"
        confidence = (
            (AT_RISK_THRESHOLD - payload.score) / AT_RISK_THRESHOLD
            if new_status == "At Risk"
            else (payload.score - AT_RISK_THRESHOLD) / (100 - AT_RISK_THRESHOLD)
        )

        risk_classifications = {
            payload.subject: {
                "status": new_status,
                "score": payload.score,
                "confidence": round(abs(confidence), 2),
                "needsIntervention": new_status == "At Risk",
            }
        }

        at_risk = [payload.subject] if new_status == "At Risk" else []

        if new_status == "At Risk":
            notifications.append(
                f"Quiz result: {payload.subject} scored {payload.score}% — status changed to At Risk"
            )
        else:
            notifications.append(
                f"Quiz result: {payload.subject} scored {payload.score}% — On Track"
            )

        return AutomationResult(
            success=True,
            event="quiz_submitted",
            studentId=student_id,
            message=f"Quiz processed for {student_id}",
            riskClassifications=risk_classifications,
            overallRisk=None,   # single-subject update — overall recalculated on frontend
            atRiskSubjects=at_risk,
            notifications=notifications,
        )

    # ────────────────────────────────────────────────────────────
    # 3. STUDENT ENROLLMENT
    # ────────────────────────────────────────────────────────────

    async def handle_student_enrollment(
        self, payload: StudentEnrollmentPayload
    ) -> AutomationResult:
        """
        Prepare a new student:
        - Create empty progress record skeleton
        - Initialise gamification (XP 0, Level 1, no streaks)
        - Flag as needing diagnostic
        """
        student_id = payload.studentId
        logger.info(f"🆕 NEW STUDENT ENROLLED: {student_id}")

        notifications: list[str] = [
            f"Welcome {payload.name}! Please complete the diagnostic assessment to personalise your learning path.",
        ]

        if payload.teacherId:
            notifications.append(
                f"New student {payload.name} enrolled — diagnostic pending."
            )

        return AutomationResult(
            success=True,
            event="student_enrolled",
            studentId=student_id,
            message=f"Student {payload.name} enrolled and initialised",
            notifications=notifications,
        )

    # ────────────────────────────────────────────────────────────
    # 4. DATA IMPORT  (teacher action)
    # ────────────────────────────────────────────────────────────

    async def handle_data_import(
        self, payload: DataImportPayload
    ) -> AutomationResult:
        """
        After a teacher uploads a spreadsheet, recalculate risk for every
        imported student and flag any status changes.
        """
        logger.info(f"📂 DATA IMPORT by teacher {payload.teacherId} — {len(payload.students)} students")
        notifications: list[str] = []
        high_risk_students: list[str] = []
        medium_risk_count = 0
        low_risk_count = 0
        weak_topic_counts: Dict[str, int] = {}

        for student_row in payload.students:
            name = str(student_row.get("name") or "Unknown").strip() or "Unknown"
            avg_score = self._safe_float(student_row.get("avgQuizScore"), 0.0)
            attendance = self._safe_float(student_row.get("attendance"), 0.0)
            engagement = self._safe_float(student_row.get("engagementScore"), 0.0)
            completion_raw = student_row.get("assignmentCompletion")
            completion = (
                self._safe_float(completion_raw, 0.0)
                if completion_raw not in (None, "")
                else None
            )

            risk_level = self._classify_import_risk(
                avg_score=avg_score,
                attendance=attendance,
                engagement=engagement,
                completion=completion,
            )
            if risk_level == "High":
                high_risk_students.append(name)
            elif risk_level == "Medium":
                medium_risk_count += 1
            else:
                low_risk_count += 1

            topic_label = self._extract_import_topic(student_row)
            if topic_label:
                weak_topic_counts[topic_label] = weak_topic_counts.get(topic_label, 0) + 1

        if high_risk_students:
            notifications.append(
                f"Data import flagged {len(high_risk_students)} high-risk student(s): "
                + ", ".join(high_risk_students[:5])
                + ("..." if len(high_risk_students) > 5 else "")
            )

        notifications.append(
            "Risk interpretation summary — "
            f"High: {len(high_risk_students)}, Medium: {medium_risk_count}, Low: {low_risk_count}."
        )

        if weak_topic_counts:
            top_topics = sorted(
                weak_topic_counts.items(),
                key=lambda item: (-item[1], item[0]),
            )[:3]
            notifications.append(
                "Most frequent weak-topic signals: "
                + ", ".join(f"{topic} ({count})" for topic, count in top_topics)
            )

        notifications.append(
            f"Data import complete — {len(payload.students)} student records processed."
        )

        return AutomationResult(
            success=True,
            event="data_imported",
            studentId=None,
            message=f"Data import processed for {len(payload.students)} students",
            atRiskSubjects=None,
            notifications=notifications,
        )

    # ────────────────────────────────────────────────────────────
    # 5. CONTENT UPDATE  (admin action)
    # ────────────────────────────────────────────────────────────

    async def handle_content_update(
        self, payload: ContentUpdatePayload
    ) -> AutomationResult:
        """
        After admin CRUD on curriculum, log & notify.
        """
        logger.info(
            f"📚 CONTENT UPDATE by admin {payload.adminId}: "
            f"{payload.action} {payload.contentType} {payload.contentId}"
        )
        notifications: list[str] = [
            f"Curriculum update: {payload.action}d {payload.contentType} "
            f"({payload.contentId}). Teachers may want to review affected quizzes.",
        ]

        return AutomationResult(
            success=True,
            event="content_updated",
            studentId=None,
            message=f"Content {payload.action} processed for {payload.contentType}",
            notifications=notifications,
        )

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    #  INTERNAL HELPERS
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    # --- risk classification ---

    @staticmethod
    def _safe_float(value: Any, default: float = 0.0) -> float:
        try:
            parsed = float(value)
            if math.isnan(parsed) or math.isinf(parsed):
                return default
            return parsed
        except (TypeError, ValueError):
            return default

    @staticmethod
    def _classify_import_risk(
        *,
        avg_score: float,
        attendance: float,
        engagement: float,
        completion: Optional[float],
    ) -> str:
        high_flags = int(avg_score < 60) + int(attendance < 75) + int(engagement < 55)
        medium_flags = int(avg_score < 75) + int(attendance < 85) + int(engagement < 70)

        if completion is not None:
            high_flags += int(completion < 60)
            medium_flags += int(completion < 75)

        if high_flags >= 2 or (avg_score < 55 and (attendance < 80 or engagement < 65)):
            return "High"
        if medium_flags >= 2:
            return "Medium"
        return "Low"

    @staticmethod
    def _extract_import_topic(student_row: Dict[str, Any]) -> Optional[str]:
        explicit_topic = str(student_row.get("weakestTopic") or "").strip()
        if explicit_topic:
            return explicit_topic

        assessment_name = str(student_row.get("assessmentName") or "").strip()
        if assessment_name and assessment_name.lower() != "general-assessment":
            return assessment_name

        return None

    @staticmethod
    def _classify_subject_risks(
        results: List[DiagnosticResult],
    ) -> Dict[str, Dict[str, Any]]:
        """Classify each subject as 'At Risk' or 'On Track'."""
        classifications: Dict[str, Dict[str, Any]] = {}
        for r in results:
            if r.score < AT_RISK_THRESHOLD:
                status = "At Risk"
                confidence = round((AT_RISK_THRESHOLD - r.score) / AT_RISK_THRESHOLD, 2)
            else:
                status = "On Track"
                confidence = round(
                    (r.score - AT_RISK_THRESHOLD) / (100 - AT_RISK_THRESHOLD), 2
                )
            classifications[r.subject] = {
                "status": status,
                "score": r.score,
                "confidence": confidence,
                "needsIntervention": status == "At Risk",
            }
        return classifications

    @staticmethod
    def _identify_weak_topics(
        question_breakdown: Optional[Dict[str, list]],
    ) -> List[Dict[str, Any]]:
        """
        Drill into per-topic accuracy from diagnostic question-level data.
        Returns topics sorted weakest-first.
        """
        if not question_breakdown:
            return []

        weak: list[dict] = []
        for topic, questions in question_breakdown.items():
            if not questions:
                continue
            correct_count = sum(1 for q in questions if q.get("correct"))
            accuracy = correct_count / len(questions)
            if accuracy < WEAK_TOPIC_THRESHOLD:
                weak.append({
                    "topic": topic,
                    "accuracy": round(accuracy, 2),
                    "questionsAttempted": len(questions),
                    "priority": "high" if accuracy < 0.3 else "medium",
                })
        weak.sort(key=lambda x: x["accuracy"])
        return weak

    @staticmethod
    def _calculate_overall_risk(
        classifications: Dict[str, Dict[str, Any]],
    ) -> str:
        total = len(classifications)
        if total == 0:
            return "Low"
        at_risk_count = sum(
            1 for d in classifications.values() if d["status"] == "At Risk"
        )
        ratio = at_risk_count / total
        if ratio >= HIGH_RISK_RATIO:
            return "High"
        elif ratio >= MEDIUM_RISK_RATIO:
            return "Medium"
        return "Low"

    # --- remedial quiz configs ---

    @staticmethod
    def _build_remedial_quiz_configs(
        student_id: str,
        at_risk_subjects: List[str],
        overall_risk: str,
        grade_level: str,
    ) -> List[Dict[str, Any]]:
        """Return list of quiz configuration dicts ready for persistence."""
        cfg = REMEDIAL_CONFIG.get(overall_risk, REMEDIAL_CONFIG["Low"])
        quizzes: list[dict] = []
        for subject in at_risk_subjects:
            quizzes.append({
                "studentId": student_id,
                "subject": subject,
                "quizConfig": {
                    "topics": [subject],
                    "gradeLevel": grade_level,
                    "numQuestions": cfg["questions"],
                    "questionTypes": [
                        "identification",
                        "enumeration",
                        "multiple_choice",
                        "word_problem",
                    ],
                    "difficultyDistribution": cfg["dist"],
                    "bloomLevels": ["remember", "understand", "apply"],
                    "includeGraphs": False,
                    "excludeTopics": [],
                    "purpose": "remedial",
                    "targetStudent": student_id,
                },
                "status": "pending",
                "autoGenerated": True,
                "reason": f'Diagnostic identified "{subject}" as At Risk',
                "priority": "high" if overall_risk == "High" else "medium",
                "dueInDays": 7,
            })
        return quizzes

    # --- AI helpers (Hugging Face) ---

    async def _generate_learning_path(
        self,
        at_risk_subjects: List[str],
        weak_topics: List[Dict[str, Any]],
        grade_level: str,
    ) -> Optional[str]:
        """Generate a personalised learning path via HF Serverless Inference."""
        try:
            from main import call_hf_chat

            weakness_lines = ", ".join(at_risk_subjects)
            topic_lines = "\n".join(
                f"  - {t['topic']} ({t['accuracy']*100:.0f}% accuracy)"
                for t in weak_topics[:5]
            )

            prompt = (
                f"Generate a personalised math learning path for a {grade_level} student.\n\n"
                f"Weak subjects: {weakness_lines}\n"
                f"Weak topics:\n{topic_lines}\n\n"
                "Create 5-7 specific activities. For each give:\n"
                "1. Activity title\n"
                "2. Brief description (1-2 sentences)\n"
                "3. Estimated duration\n"
                "4. Type (video, practice, quiz, reading, interactive)\n\n"
                "Format as a numbered list. Be specific."
            )

            return call_hf_chat(
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are an educational curriculum expert specialising in "
                            "mathematics. Create clear, actionable learning paths."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                max_tokens=1500,
                temperature=0.7,
            )
        except Exception as e:
            logger.warning(f"Learning-path AI call failed: {e}")
            return None

    async def _generate_teacher_interventions(
        self,
        risk_classifications: Dict[str, Dict[str, Any]],
        weak_topics: List[Dict[str, Any]],
    ) -> Optional[str]:
        """Generate teacher intervention recommendations via HF Serverless Inference."""
        try:
            from main import call_hf_chat

            at_risk = [
                subj for subj, data in risk_classifications.items()
                if data["status"] == "At Risk"
            ]
            topic_lines = "\n".join(
                f"- {t['topic']} ({t['accuracy']*100:.0f}% accuracy)"
                for t in weak_topics[:5]
            )

            prompt = (
                "You are an educational intervention specialist. A student has completed "
                "their diagnostic assessment with the following results:\n\n"
                f"At-Risk Subjects: {', '.join(at_risk)}\n\n"
                f"Weak Topics Identified:\n{topic_lines}\n\n"
                "Generate a 'Remedial Path Timeline' with:\n"
                "1. Prioritised list of topics to address (most critical first)\n"
                "2. Suggested teaching strategies for each topic\n"
                "3. Recommended one-on-one intervention activities\n"
                "4. Timeline for reassessment\n"
                "5. Warning signs that student needs additional support\n\n"
                "Keep response under 300 words, structured with clear sections."
            )

            return call_hf_chat(
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are an expert educational intervention specialist. "
                            "Provide actionable, structured recommendations for teachers."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                max_tokens=1000,
                temperature=0.5,
            )
        except Exception as e:
            logger.warning(f"Teacher-intervention AI call failed: {e}")
            return None


# Module-level singleton
automation_engine = MathPulseAutomationEngine()
