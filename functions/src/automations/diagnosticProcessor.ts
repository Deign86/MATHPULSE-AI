/**
 * MathPulse AI Cloud Functions - Diagnostic Processor
 *
 * Orchestrates the full workflow when a student completes the
 * mandatory diagnostic assessment.  This is the PRIMARY automation
 * entry point — everything else follows from it.
 *
 * Steps:
 * 1. Classify per-subject risk
 * 2. Update student profile with badges / risk data
 * 3. Identify weak topics
 * 4. Compute overall risk level
 * 5. Call FastAPI backend for ML risk prediction
 * 6. Generate personalised learning path (via FastAPI)
 * 7. Auto-generate remedial quizzes for "At Risk" subjects
 * 8. Generate teacher intervention recommendations
 * 9. Update dashboard data
 */

import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import {
  classifySubjectRisks,
  identifyWeakTopics,
  calculateOverallRisk,
  extractBadges,
  calculateAvgScore,
  SubjectScore,
  WeakTopic,
  OverallRisk,
} from "./riskAnalyzer";
import {
  deriveIARAssessmentInsights,
  deriveIARAssessmentState,
  IARTopicArea,
} from "./iarAssessmentScoring";
import { buildRemedialQuizConfigs } from "./quizProcessor";
import { predictRisk, generateLearningPath } from "../services/backendApi";
import { createNotification } from "./notificationSender";
import {
  DEEP_DIAGNOSTIC_ACTIVE_STATUSES,
  NOTIFICATION_TYPES,
  DEFAULT_IAR_WORKFLOW_MODE,
  DEEP_DIAGNOSTIC_MIN_ITEMS_BY_SUBJECT,
  DEEP_DIAGNOSTIC_DUE_DAYS,
  IARWorkflowMode,
  LEARNING_PATH_UNLOCK_CRITERIA_VERSION,
  G12_TRANSITION_MIN_MASTERED_RATIO,
  G12_TRANSITION_MAX_CRITICAL_GAPS,
} from "../config/constants";
import { recommendNextTopicGroup } from "./learningPathEngine";
import {
  evaluateDiagnosticPolicy,
  resolveCurriculumVersionSetId,
  runDiagnosticPolicySanityChecks,
} from "../config/diagnosticPolicies";

// ─── Payload Type ─────────────────────────────────────────────

export interface DiagnosticPayload {
  lrn: string;
  results: SubjectScore[];
  gradeLevel: string;
  questionBreakdown?: Record<string, Array<{
    correct: boolean;
    questionId?: string;
    difficulty?: "basic" | "standard" | "challenge";
    gradeLevelTag?: "G11" | "G12Candidate";
    quarter?: 1 | 2 | 3 | 4;
    answerType?: "MCQ" | "shortAnswerNumeric" | "shortAnswerText" | "confidenceLikert";
  }>>;
  workflowMode?: IARWorkflowMode;
  assessmentType?: "initial_assessment" | "followup_diagnostic";
  curriculumVersionSetId?: string;
  lifecycleControl?: {
    action?: "none" | "reopen_expired" | "reset_expired";
    actorId?: string;
    actorRole?: "teacher" | "admin" | "system";
    reason?: string;
  };
}

interface RemediationStatusSummary {
  total: number;
  queued: number;
  inProgress: number;
  completed: number;
  expired: number;
  legacyPending: number;
  outstanding: number;
  unlockEligible: boolean;
}

interface Grade12TransitionGate {
  isBlocked: boolean;
  reason: string;
  reasonCode?: string;
  masteredRatio: number;
  criticalGapCount: number;
  evaluatedTopicCount: number;
  recommendedRemediationTopicGroupId?: string;
  sourceSnapshotId?: string;
}

// ─── Main Processor ───────────────────────────────────────────

export async function processDiagnosticCompletion(
  payload: DiagnosticPayload,
): Promise<void> {
  const {
    lrn,
    results,
    gradeLevel,
    questionBreakdown,
    workflowMode = DEFAULT_IAR_WORKFLOW_MODE,
    assessmentType = "initial_assessment",
    curriculumVersionSetId: requestedCurriculumVersionSetId,
    lifecycleControl,
  } = payload;
  const db = admin.firestore();
  const curriculumVersionSetId =
    requestedCurriculumVersionSetId || resolveCurriculumVersionSetId(gradeLevel);
  const policySanity = runDiagnosticPolicySanityChecks();

  if (!policySanity.isValid) {
    throw new Error(`Diagnostic policy sanity checks failed: ${policySanity.errors.join("; ")}`);
  }

  functions.logger.info("[DIAGNOSTIC] Starting diagnostic processing workflow", { lrn });

  // STEP 1: Classify per-subject risk
  const riskClassifications = classifySubjectRisks(results);
  functions.logger.info("Risk classifications calculated", {
    subjects: Object.keys(riskClassifications).length,
  });

  // STEP 2: Update student profile with badges & risk data
  const badges = extractBadges(riskClassifications);
  const riskAtRiskSubjects = Object.entries(riskClassifications)
    .filter(([, data]) => data.status === "At Risk")
    .map(([subject]) => subject);

  const isInitialAssessment = assessmentType === "initial_assessment";
  const iarInsights = deriveIARAssessmentInsights({ results, questionBreakdown });
  const atRiskSubjects = isInitialAssessment
    ? iarInsights.atRiskSubjectIds
    : riskAtRiskSubjects;

  // STEP 3: Identify weak topics
  const weakTopics = identifyWeakTopics(questionBreakdown);
  functions.logger.info("Weak topics identified", { count: weakTopics.length });

  // STEP 4: Compute overall risk level
  const overallRisk = calculateOverallRisk(riskClassifications);
  functions.logger.info("Overall risk level", { overallRisk });

  const recommendation = recommendNextTopicGroup({
    gradeLevel,
    atRiskSubjects,
    weakTopics,
  });

  const policyEvaluation = evaluateDiagnosticPolicy(gradeLevel, questionBreakdown);
  const masterySnapshotRef = policyEvaluation
    ? await db.collection("learnerMasterySnapshots").add({
      lrn,
      userId: lrn,
      gradeLevel,
      versionSetId: policyEvaluation.versionSetId,
      policyId: policyEvaluation.policyId,
      sourceAssessmentType: assessmentType,
      byTopicGroup: policyEvaluation.byTopicGroup,
      summary: policyEvaluation.summary,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    : null;

  if (masterySnapshotRef && policyEvaluation) {
    await writeProgressionAuditEvent(db, {
      lrn,
      userId: lrn,
      eventType: "mastery_snapshot_generated",
      gradeLevel,
      workflowMode,
      assessmentType,
      curriculumVersionSetId: policyEvaluation.versionSetId,
      payload: {
        snapshotId: masterySnapshotRef.id,
        policyId: policyEvaluation.policyId,
        summary: policyEvaluation.summary,
      },
    });
  }

  const deepDiagnosticTargets = isInitialAssessment
    ? iarInsights.deepDiagnosticTopics.map((topic) => ({
      topic,
      priority: iarInsights.topicClassifications[topic] === "HighRisk" ? "high" : "medium",
    }))
    : weakTopics.map((topic) => ({
      topic: topic.topic as IARTopicArea,
      priority: topic.priority,
    }));

  const requiresDeepDiagnostic =
    isInitialAssessment &&
    workflowMode === "iar_plus_diagnostic" &&
    deepDiagnosticTargets.length > 0;

  if (!isInitialAssessment) {
    await completeOutstandingDeepDiagnostics(db, lrn);
  }

  // STEP 6: Optional deep diagnostic assignment for IAR+Diagnostic mode
  if (requiresDeepDiagnostic) {
    const batch = db.batch();
    for (const target of deepDiagnosticTargets) {
      const ref = db.collection("deepDiagnosticAssignments").doc();
      batch.set(ref, {
        lrn,
        gradeLevel,
        topic: target.topic,
        priority: target.priority,
        minItems:
          DEEP_DIAGNOSTIC_MIN_ITEMS_BY_SUBJECT[target.topic] || 8,
        status: "queued",
        curriculumVersionSetId,
        dueAt: new Date(Date.now() + DEEP_DIAGNOSTIC_DUE_DAYS * 24 * 60 * 60 * 1000),
        lifecycleVersion: LEARNING_PATH_UNLOCK_CRITERIA_VERSION,
        createdByAutomation: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        startedAt: null,
        completedAt: null,
      });
    }
    await batch.commit();

    await writeProgressionAuditEvent(db, {
      lrn,
      userId: lrn,
      eventType: "deep_diagnostic_assignments_created",
      gradeLevel,
      workflowMode,
      assessmentType,
      curriculumVersionSetId,
      payload: {
        assignmentCount: deepDiagnosticTargets.length,
        topics: deepDiagnosticTargets.map((topic) => topic.topic),
        dueDays: DEEP_DIAGNOSTIC_DUE_DAYS,
      },
    });
  }

  await applyDeepDiagnosticLifecycleTransitions(
    db,
    lrn,
    gradeLevel,
    curriculumVersionSetId,
    lifecycleControl,
  );

  const refreshedRemediationStatus = await getRemediationStatusSummary(db, lrn);
  const transitionGate = await evaluateGrade12TransitionGate(db, lrn, gradeLevel);
  const shouldRemainLocked =
    workflowMode === "iar_plus_diagnostic" &&
    ((refreshedRemediationStatus.total > 0 && !refreshedRemediationStatus.unlockEligible) ||
      transitionGate.isBlocked);
  const learningPathState = shouldRemainLocked
    ? "locked_pending_deep_diagnostic"
    : "unlocked";
  const iarAssessmentState = deriveIARAssessmentState({
    assessmentType,
    workflowMode,
    requiresDeepDiagnostic,
    learningPathState,
    remediationSummary: refreshedRemediationStatus,
  });
  const remediationState = deriveRemediationState(refreshedRemediationStatus);
  const recommendationToPersist = transitionGate.isBlocked && transitionGate.recommendedRemediationTopicGroupId
    ? {
      nextTopicGroupId: transitionGate.recommendedRemediationTopicGroupId,
      rationale: transitionGate.reason,
      reasonCode: transitionGate.reasonCode || "grade12_transition_blocked",
    }
    : isInitialAssessment
      ? {
        nextTopicGroupId: iarInsights.recommendedNextTopicGroupId,
        rationale: iarInsights.recommendationRationale,
        reasonCode: iarInsights.recommendationReasonCode,
      }
      : recommendation;

  // Update student profile
  await db.collection("users").doc(lrn).update({
    hasTakenDiagnostic: true,
    subjectBadges: badges,
    riskClassifications,
    atRiskSubjects,
    overallRisk,
    lastAssessmentType: assessmentType,
    ...(isInitialAssessment
      ? {
          iarMode: workflowMode,
          initialAssessmentCompletedAt:
            admin.firestore.FieldValue.serverTimestamp(),
          iarQuestionSetVersion: "iar.v2.server_scored",
          iarTopicClassifications: iarInsights.topicClassifications,
          topicScores: iarInsights.topicScores,
          riskFlags: iarInsights.riskFlags,
          startingQuarterG11: iarInsights.startingQuarterG11,
          priorityTopics: iarInsights.priorityTopics,
          g12ReadinessIndicators: iarInsights.g12ReadinessIndicators,
        }
      : {}),
    iarAssessmentState,
    learningPathState,
    remediationState,
    remediationStatusCounts: {
      total: refreshedRemediationStatus.total,
      queued: refreshedRemediationStatus.queued + refreshedRemediationStatus.legacyPending,
      inProgress: refreshedRemediationStatus.inProgress,
      completed: refreshedRemediationStatus.completed,
      expired: refreshedRemediationStatus.expired,
      outstanding: refreshedRemediationStatus.outstanding,
    },
    currentCurriculumVersionSetId: curriculumVersionSetId,
    unlockCriteriaVersion: LEARNING_PATH_UNLOCK_CRITERIA_VERSION,
    recommendedNextTopicGroupId: recommendationToPersist.nextTopicGroupId,
    recommendationRationale: recommendationToPersist.rationale,
    recommendationReasonCode: recommendationToPersist.reasonCode,
    grade12TransitionGate: {
      isBlocked: transitionGate.isBlocked,
      reason: transitionGate.reason,
      reasonCode: transitionGate.reasonCode || null,
      masteredRatio: transitionGate.masteredRatio,
      criticalGapCount: transitionGate.criticalGapCount,
      evaluatedTopicCount: transitionGate.evaluatedTopicCount,
      sourceSnapshotId: transitionGate.sourceSnapshotId || null,
    },
    lastRiskUpdate: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await db.collection("recommendationLogs").add({
    lrn,
    userId: lrn,
    source: isInitialAssessment ? "iar" : "ongoing_performance",
    gradeLevel,
    curriculumVersionSetId,
    policyVersionSetId: policyEvaluation?.versionSetId || null,
    workflowMode,
    assessmentType,
    recommendedTopicGroupId: recommendationToPersist.nextTopicGroupId,
    rationale: recommendationToPersist.rationale,
    reasonCode: recommendationToPersist.reasonCode,
    recommendation: {
      startingQuarterG11: iarInsights.startingQuarterG11,
      priorityTopics: iarInsights.priorityTopics,
      riskFlags: iarInsights.riskFlags,
      g12ReadinessIndicators: iarInsights.g12ReadinessIndicators,
      reasonCode: recommendationToPersist.reasonCode,
    },
    transitionGate,
    remediationState,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    status: "active",
  });

  await writeProgressionAuditEvent(db, {
    lrn,
    userId: lrn,
    eventType: "learning_path_state_decided",
    gradeLevel,
    workflowMode,
    assessmentType,
    curriculumVersionSetId,
    payload: {
      learningPathState,
      remediationState,
      iarAssessmentState,
      recommendationTopicGroupId: recommendationToPersist.nextTopicGroupId,
      recommendationReasonCode: recommendationToPersist.reasonCode,
      recommendationContract: {
        startingQuarterG11: iarInsights.startingQuarterG11,
        priorityTopics: iarInsights.priorityTopics,
        riskFlags: iarInsights.riskFlags,
        g12ReadinessIndicators: iarInsights.g12ReadinessIndicators,
      },
      transitionGate,
      remediationStatus: refreshedRemediationStatus,
      policyEvaluationSummary: policyEvaluation?.summary || null,
    },
  });

  // STEP 5: Call FastAPI backend for ML-powered risk prediction
  try {
    const riskPrediction = await predictRisk({
      engagementScore: 50, // Default for new student
      avgQuizScore: calculateAvgScore(results),
      attendance: 100, // Default for new student
      assignmentCompletion: 0, // New student hasn't completed anything
    });

    await db.collection("users").doc(lrn).update({
      mlRiskLevel: riskPrediction.riskLevel,
      mlRiskConfidence: riskPrediction.confidence,
    });

    functions.logger.info("ML risk prediction saved", {
      level: riskPrediction.riskLevel,
    });
  } catch (error: any) {
    functions.logger.warn("ML risk prediction failed, using rule-based only", {
      error: error.message,
    });
  }

  // STEP 7: Generate personalised learning path
  if (atRiskSubjects.length > 0) {
    try {
      const learningPathResponse = await generateLearningPath({
        weaknesses: atRiskSubjects,
        gradeLevel,
        learningStyle: "visual", // Default
      });

      await db.collection("learningPaths").doc(lrn).set({
        lrn,
        content: learningPathResponse.learningPath,
        weaknesses: atRiskSubjects,
        curriculumVersionSetId,
        recommendationTopicGroupId: recommendationToPersist.nextTopicGroupId,
        recommendationReasonCode: recommendationToPersist.reasonCode,
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "active",
        autoGenerated: true,
        source: "diagnostic_automation",
      });

      functions.logger.info("[OK] Learning path generated", { lrn });
    } catch (error: any) {
      functions.logger.error("Learning path generation failed", {
        error: error.message,
      });
    }
  }

  // STEP 8: Auto-generate remedial quizzes
  if (atRiskSubjects.length > 0) {
    const quizConfigs = buildRemedialQuizConfigs(
      lrn,
      atRiskSubjects,
      overallRisk,
      gradeLevel,
      { curriculumVersionSetId },
    );

    const batch = db.batch();
    for (const config of quizConfigs) {
      const ref = db.collection("assignedQuizzes").doc();
      batch.set(ref, {
        ...config,
        curriculumVersionSetId,
        recommendationTopicGroupId: recommendationToPersist.nextTopicGroupId,
        recommendationReasonCode: recommendationToPersist.reasonCode,
        assignedAt: admin.firestore.FieldValue.serverTimestamp(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
    }
    await batch.commit();

    functions.logger.info("[OK] Remedial quizzes created", {
      count: quizConfigs.length,
    });
  }

  // STEP 9: Generate teacher intervention recommendations
  if (overallRisk === "High" || overallRisk === "Medium") {
    await generateAndStoreInterventions(
      db,
      lrn,
      riskClassifications,
      weakTopics,
      overallRisk,
    );
  }

  // STEP 10: Student notification
  const notifMessage = atRiskSubjects.length > 0
    ? `Diagnostic complete — ${atRiskSubjects.length} subject(s) flagged At Risk: ${atRiskSubjects.join(", ")}`
    : "Diagnostic complete — all subjects On Track!";

  const modeSuffix = learningPathState === "locked_pending_deep_diagnostic"
    ? ` ${refreshedRemediationStatus.outstanding} remediation assignment(s) remain before full learning-path unlock.`
    : " You may now continue to regular lessons and quizzes.";

  await createNotification({
    userId: lrn,
    type: NOTIFICATION_TYPES.GRADE,
    title: "Diagnostic Assessment Complete",
    message: `${notifMessage}${modeSuffix}`,
  });

  functions.logger.info("[OK] Diagnostic processing workflow complete", { lrn });
}

// ─── Helper: Teacher Interventions ───────────────────────────

async function generateAndStoreInterventions(
  db: admin.firestore.Firestore,
  lrn: string,
  riskClassifications: Record<string, any>,
  weakTopics: WeakTopic[],
  overallRisk: OverallRisk,
): Promise<void> {
  try {
    // Build a summary for the teacher
    const atRiskSubjects = Object.entries(riskClassifications)
      .filter(([, data]) => data.status === "At Risk")
      .map(([subject, data]) => `${subject} (${data.score}%)`)
      .join(", ");

    const topicSummary = weakTopics
      .slice(0, 5)
      .map((t) => `${t.topic} (${Math.round(t.accuracy * 100)}% accuracy)`)
      .join(", ");

    const interventionContent =
      `**Risk Level:** ${overallRisk}\n\n` +
      `**At-Risk Subjects:** ${atRiskSubjects}\n\n` +
      `**Weak Topics:** ${topicSummary || "None identified"}\n\n` +
      "**Recommended Actions:**\n" +
      "- Schedule one-on-one review session for at-risk subjects\n" +
      "- Assign additional practice problems for weak topics\n" +
      "- Monitor quiz performance over the next 2 weeks\n" +
      "- Consider peer tutoring for collaborative learning";

    await db.collection("interventions").add({
      lrn,
      content: interventionContent,
      overallRisk,
      riskClassifications,
      weakTopics,
      source: "diagnostic_automation",
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Notify teachers (look up assigned teacher)
    const studentDoc = await db.collection("users").doc(lrn).get();
    const studentData = studentDoc.data();
    const teacherId = studentData?.teacherId;
    const studentName = studentData?.displayName || studentData?.name || lrn;

    if (teacherId) {
      await createNotification({
        userId: teacherId,
        type: NOTIFICATION_TYPES.MESSAGE,
        title: "Student Needs Intervention",
        message: `${studentName} completed their diagnostic with ${overallRisk} risk level. Review recommended.`,
      });
    }

    functions.logger.info("[OK] Teacher interventions created", { lrn });
  } catch (error: any) {
    functions.logger.error("Intervention generation failed", {
      error: error.message,
    });
  }
}

async function completeOutstandingDeepDiagnostics(
  db: admin.firestore.Firestore,
  lrn: string,
): Promise<void> {
  const assignmentsSnap = await db
    .collection("deepDiagnosticAssignments")
    .where("lrn", "==", lrn)
    .get();

  if (assignmentsSnap.empty) return;

  const outstandingDocs = assignmentsSnap.docs.filter((docSnap) => {
    const status = docSnap.data().status as string | undefined;
    return status === "pending" || status === "queued" || status === "in_progress";
  });

  if (outstandingDocs.length === 0) return;

  const batch = db.batch();
  for (const doc of outstandingDocs) {
    batch.update(doc.ref, {
      status: "completed",
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      resolution: "followup_diagnostic_submitted",
    });
  }

  await batch.commit();

  await writeProgressionAuditEvent(db, {
    lrn,
    userId: lrn,
    eventType: "deep_diagnostic_completed_from_followup",
    gradeLevel: "Grade 11",
    workflowMode: DEFAULT_IAR_WORKFLOW_MODE,
    assessmentType: "followup_diagnostic",
    curriculumVersionSetId: resolveCurriculumVersionSetId("Grade 11"),
    payload: {
      updatedAssignments: outstandingDocs.length,
      resolution: "followup_diagnostic_submitted",
    },
  });
}

async function applyDeepDiagnosticLifecycleTransitions(
  db: admin.firestore.Firestore,
  lrn: string,
  gradeLevel: string,
  curriculumVersionSetId: string,
  lifecycleControl?: DiagnosticPayload["lifecycleControl"],
): Promise<void> {
  const assignmentsSnap = await db
    .collection("deepDiagnosticAssignments")
    .where("lrn", "==", lrn)
    .get();

  if (assignmentsSnap.empty) return;

  if (lifecycleControl?.action && lifecycleControl.action !== "none") {
    const role = lifecycleControl.actorRole;
    if (role !== "teacher" && role !== "admin" && role !== "system") {
      throw new Error("Lifecycle control requires actorRole teacher, admin, or system");
    }
  }

  const nowMs = Date.now();
  const batch = db.batch();
  let writeCount = 0;
  let expiredFromOverdue = 0;
  let reopened = 0;
  let reset = 0;

  for (const docSnap of assignmentsSnap.docs) {
    const data = docSnap.data();
    const status = data.status as string | undefined;
    const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : null;
    const dueAtDate = data.dueAt?.toDate ? data.dueAt.toDate() : null;

    if (!dueAtDate && (status === "pending" || status === "queued" || status === "in_progress")) {
      const fallbackDueAt = createdAt
        ? new Date(createdAt.getTime() + DEEP_DIAGNOSTIC_DUE_DAYS * 24 * 60 * 60 * 1000)
        : new Date(nowMs + DEEP_DIAGNOSTIC_DUE_DAYS * 24 * 60 * 60 * 1000);
      batch.update(docSnap.ref, {
        dueAt: fallbackDueAt,
        lifecycleVersion: LEARNING_PATH_UNLOCK_CRITERIA_VERSION,
      });
      writeCount += 1;
    }

    const active = status === "pending" || status === "queued" || status === "in_progress";
    if (active && dueAtDate && dueAtDate.getTime() < nowMs) {
      batch.update(docSnap.ref, {
        status: "expired",
        expiredAt: admin.firestore.FieldValue.serverTimestamp(),
        transitionReason: "overdue_timeout",
        lifecycleVersion: LEARNING_PATH_UNLOCK_CRITERIA_VERSION,
      });
      writeCount += 1;
      expiredFromOverdue += 1;
      continue;
    }

    if (status === "expired" && lifecycleControl?.action === "reopen_expired") {
      batch.update(docSnap.ref, {
        status: "queued",
        reopenedAt: admin.firestore.FieldValue.serverTimestamp(),
        reopenedBy: lifecycleControl.actorId || "system",
        transitionReason: lifecycleControl.reason || "manual_reopen",
        lifecycleVersion: LEARNING_PATH_UNLOCK_CRITERIA_VERSION,
        dueAt: new Date(nowMs + DEEP_DIAGNOSTIC_DUE_DAYS * 24 * 60 * 60 * 1000),
      });
      writeCount += 1;
      reopened += 1;
      continue;
    }

    if (status === "expired" && lifecycleControl?.action === "reset_expired") {
      const newRef = db.collection("deepDiagnosticAssignments").doc();
      batch.set(newRef, {
        lrn,
        gradeLevel,
        topic: data.topic,
        priority: data.priority || "medium",
        minItems: data.minItems || 8,
        status: "queued",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        startedAt: null,
        completedAt: null,
        dueAt: new Date(nowMs + DEEP_DIAGNOSTIC_DUE_DAYS * 24 * 60 * 60 * 1000),
        resetFromAssignmentId: docSnap.id,
        resetBy: lifecycleControl.actorId || "system",
        resetReason: lifecycleControl.reason || "manual_reset",
        lifecycleVersion: LEARNING_PATH_UNLOCK_CRITERIA_VERSION,
        curriculumVersionSetId,
      });
      writeCount += 1;
      reset += 1;
    }
  }

  if (writeCount === 0) {
    return;
  }

  await batch.commit();
  await writeProgressionAuditEvent(db, {
    lrn,
    userId: lrn,
    eventType: "deep_diagnostic_lifecycle_transition",
    gradeLevel,
    workflowMode: DEFAULT_IAR_WORKFLOW_MODE,
    assessmentType: "initial_assessment",
    curriculumVersionSetId,
    payload: {
      expiredFromOverdue,
      reopened,
      reset,
      action: lifecycleControl?.action || "none",
      actorId: lifecycleControl?.actorId || "system",
      actorRole: lifecycleControl?.actorRole || "system",
    },
  });
}

async function evaluateGrade12TransitionGate(
  db: admin.firestore.Firestore,
  lrn: string,
  gradeLevel: string,
): Promise<Grade12TransitionGate> {
  if (gradeLevel !== "Grade 12") {
    return {
      isBlocked: false,
      reason: "Grade 12 transition gate not applicable.",
      reasonCode: "g12_transition_not_applicable",
      masteredRatio: 1,
      criticalGapCount: 0,
      evaluatedTopicCount: 0,
    };
  }

  const snapshot = await db
    .collection("learnerMasterySnapshots")
    .where("lrn", "==", lrn)
    .where("gradeLevel", "==", "Grade 11")
    .orderBy("generatedAt", "desc")
    .limit(1)
    .get();

  if (snapshot.empty) {
    return {
      isBlocked: true,
      reason: "Grade 12 transition is blocked: no Grade 11 mastery snapshot is available.",
      reasonCode: "g12_transition_blocked_no_snapshot",
      masteredRatio: 0,
      criticalGapCount: 0,
      evaluatedTopicCount: 0,
    };
  }

  const latest = snapshot.docs[0];
  const byTopicGroup = latest.data().byTopicGroup as Record<
    string,
    { score?: number; status?: string }
  >;
  const topicEntries = Object.entries(byTopicGroup || {});
  const evaluated = topicEntries.filter(([, value]) => value?.status !== "insufficient_evidence");
  const mastered = evaluated.filter(([, value]) => value?.status === "mastered").length;
  const criticalGapEntries = evaluated.filter(([, value]) => value?.status === "critical_gap");
  const evaluatedCount = evaluated.length;
  const masteredRatio = evaluatedCount > 0 ? mastered / evaluatedCount : 0;
  const criticalGapCount = criticalGapEntries.length;

  const isBlocked =
    masteredRatio < G12_TRANSITION_MIN_MASTERED_RATIO ||
    criticalGapCount > G12_TRANSITION_MAX_CRITICAL_GAPS;

  const remediationTopic = criticalGapEntries
    .sort((a, b) => (a[1].score || 0) - (b[1].score || 0))[0]?.[0];

  if (!isBlocked) {
    return {
      isBlocked: false,
      reason: "Grade 12 transition gate passed.",
      reasonCode: "g12_transition_passed",
      masteredRatio: Math.round(masteredRatio * 10000) / 10000,
      criticalGapCount,
      evaluatedTopicCount: evaluatedCount,
      sourceSnapshotId: latest.id,
    };
  }

  return {
    isBlocked: true,
    reason:
      "Grade 12 transition is blocked: mastery criteria from Grade 11 snapshot were not met.",
    reasonCode: "g12_transition_blocked_mastery_threshold",
    masteredRatio: Math.round(masteredRatio * 10000) / 10000,
    criticalGapCount,
    evaluatedTopicCount: evaluatedCount,
    recommendedRemediationTopicGroupId: remediationTopic,
    sourceSnapshotId: latest.id,
  };
}

async function writeProgressionAuditEvent(
  db: admin.firestore.Firestore,
  event: {
    lrn: string;
    userId: string;
    eventType: string;
    gradeLevel: string;
    workflowMode: IARWorkflowMode;
    assessmentType: "initial_assessment" | "followup_diagnostic";
    curriculumVersionSetId: string;
    payload: Record<string, unknown>;
  },
): Promise<void> {
  await db.collection("progressionAuditLog").add({
    ...event,
    immutable: true,
    unlockCriteriaVersion: LEARNING_PATH_UNLOCK_CRITERIA_VERSION,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function getRemediationStatusSummary(
  db: admin.firestore.Firestore,
  lrn: string,
): Promise<RemediationStatusSummary> {
  const assignmentsSnap = await db
    .collection("deepDiagnosticAssignments")
    .where("lrn", "==", lrn)
    .get();

  if (assignmentsSnap.empty) {
    return {
      total: 0,
      queued: 0,
      inProgress: 0,
      completed: 0,
      expired: 0,
      legacyPending: 0,
      outstanding: 0,
      unlockEligible: true,
    };
  }

  const summary = assignmentsSnap.docs.reduce<RemediationStatusSummary>(
    (acc, docSnap) => {
      const status = docSnap.data().status as string | undefined;
      acc.total += 1;

      if (status === "queued") acc.queued += 1;
      else if (status === "in_progress") acc.inProgress += 1;
      else if (status === "completed") acc.completed += 1;
      else if (status === "expired") acc.expired += 1;
      else if (status === "pending") acc.legacyPending += 1;
      else acc.queued += 1;

      return acc;
    },
    {
      total: 0,
      queued: 0,
      inProgress: 0,
      completed: 0,
      expired: 0,
      legacyPending: 0,
      outstanding: 0,
      unlockEligible: false,
    },
  );

  const activeSet = new Set<string>(DEEP_DIAGNOSTIC_ACTIVE_STATUSES);
  summary.outstanding = summary.queued + summary.inProgress + summary.expired + summary.legacyPending;
  summary.unlockEligible =
    summary.total > 0 &&
    assignmentsSnap.docs.every((docSnap) => {
      const status = (docSnap.data().status as string | undefined) || "queued";
      return !activeSet.has(status) || status === "completed";
    }) &&
    summary.outstanding === 0;

  return summary;
}

function deriveRemediationState(
  summary: RemediationStatusSummary,
): "not_required" | "queued" | "in_progress" | "completed" | "expired" {
  if (summary.total === 0) return "not_required";
  if (summary.expired > 0) return "expired";
  if (summary.inProgress > 0) return "in_progress";
  if (summary.queued + summary.legacyPending > 0) return "queued";
  return "completed";
}
