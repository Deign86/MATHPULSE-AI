/**
 * Manual Triggers
 *
 * HTTP-callable Cloud Functions that allow admins / developers to
 * manually re-run automation workflows.  Useful for:
 * - Reprocessing a failed diagnostic
 * - Testing the pipeline end-to-end
 * - Backfilling data for existing students
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { processDiagnosticCompletion } from "../automations/diagnosticProcessor";
import { processQuizSubmission } from "../automations/quizProcessor";
import {
  BackfillMode,
  runCurriculumVersionBackfill,
} from "../automations/backfillCurriculumVersion";
import {
  ReassessmentReasonCode,
  requestReassessmentForStudent,
} from "../automations/reassessmentEngine";

/**
 * Manually trigger diagnostic processing for a learner.
 *
 * Call via Firebase SDK:
 *   const manualProcess = httpsCallable(functions, 'manualProcessStudent');
 *   await manualProcess({ lrn: '...' });
 */
export const manualProcessStudent = functions.https.onCall(
  async (data, context) => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to trigger manual processing.",
      );
    }

    const { lrn, deepDiagnosticAction, actionReason } = data;
    if (!lrn || typeof lrn !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "lrn is required and must be a string.",
      );
    }

    if (
      deepDiagnosticAction !== undefined &&
      deepDiagnosticAction !== "none" &&
      deepDiagnosticAction !== "reopen_expired" &&
      deepDiagnosticAction !== "reset_expired"
    ) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "deepDiagnosticAction must be one of: none, reopen_expired, reset_expired.",
      );
    }

    const db = admin.firestore();

    // Verify the caller is a teacher or admin
    const callerDoc = await db.collection("users").doc(context.auth.uid).get();
    const callerRole = callerDoc.data()?.role;
    if (callerRole !== "teacher" && callerRole !== "admin") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only teachers and admins can trigger manual processing.",
      );
    }

    // Fetch diagnostic results
    const diagDoc = await db.collection("diagnosticResults").doc(lrn).get();
    if (!diagDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        `No diagnostic results found for learner ${lrn}.`,
      );
    }

    const diagData = diagDoc.data()!;

    // Parse results
    const results = Array.isArray(diagData.results)
      ? diagData.results
      : Object.entries(diagData.results || {}).map(
          ([subject, score]) => ({ subject, score: Number(score) }),
        );

    functions.logger.info("[REPROCESS] Manual diagnostic reprocessing triggered", {
      lrn,
      triggeredBy: context.auth.uid,
    });

    try {
      await processDiagnosticCompletion({
        lrn,
        results,
        gradeLevel: diagData.gradeLevel || "Grade 11",
        questionBreakdown: diagData.questionBreakdown,
        curriculumVersionSetId: diagData.curriculumVersionSetId,
        workflowMode: diagData.workflowMode,
        assessmentType: diagData.assessmentType,
        lifecycleControl: deepDiagnosticAction
          ? {
            action: deepDiagnosticAction,
            actorId: context.auth.uid,
            actorRole: callerRole,
            reason: actionReason,
          }
          : undefined,
      });

      // Update the document
      await diagDoc.ref.update({
        processed: true,
        processing: false,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        manuallyReprocessed: true,
        reprocessedBy: context.auth.uid,
      });

      return {
        success: true,
        message: `Diagnostic reprocessed for learner ${lrn}`,
      };
    } catch (error: any) {
      functions.logger.error("Manual reprocessing failed", {
        lrn,
        error: error.message,
      });

      throw new functions.https.HttpsError(
        "internal",
        `Reprocessing failed: ${error.message}`,
      );
    }
  },
);

/**
 * Manually trigger quiz processing for a specific quiz result.
 *
 * Call via Firebase SDK:
 *   const manualQuiz = httpsCallable(functions, 'manualProcessQuiz');
 *   await manualQuiz({ resultId: '...' });
 */
export const manualProcessQuiz = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated.",
      );
    }

    const { resultId } = data;
    if (!resultId || typeof resultId !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "resultId is required.",
      );
    }

    const db = admin.firestore();

    // Verify caller is teacher/admin
    const callerDoc = await db.collection("users").doc(context.auth.uid).get();
    const callerRole = callerDoc.data()?.role;
    if (callerRole !== "teacher" && callerRole !== "admin") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only teachers and admins can trigger manual processing.",
      );
    }

    const quizDoc = await db.collection("quizResults").doc(resultId).get();
    if (!quizDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        `Quiz result ${resultId} not found.`,
      );
    }

    const quizData = quizDoc.data()!;
    const lrn: string | undefined = quizData.lrn;

    if (!lrn || !quizData.subject || quizData.score === undefined) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Quiz result is missing required fields (lrn/subject/score).",
      );
    }

    try {
      await processQuizSubmission({
        lrn,
        quizId: quizData.quizId || resultId,
        subject: quizData.subject,
        score: quizData.score,
        totalQuestions: quizData.totalQuestions || 0,
        correctAnswers: quizData.correctAnswers || 0,
        timeSpentSeconds: quizData.timeSpentSeconds || 0,
        answers: quizData.answers,
      });

      return {
        success: true,
        message: `Quiz result ${resultId} reprocessed for ${lrn}`,
      };
    } catch (error: any) {
      throw new functions.https.HttpsError(
        "internal",
        `Quiz reprocessing failed: ${error.message}`,
      );
    }
  },
);

/**
 * Admin-only one-shot backfill runner for version and lifecycle fields.
 * Supports deterministic dry-run and commit modes.
 */
export const manualBackfillCurriculumVersion = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated.",
      );
    }

    const db = admin.firestore();
    const callerDoc = await db.collection("users").doc(context.auth.uid).get();
    const callerRole = callerDoc.data()?.role;

    if (callerRole !== "admin") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only admins can run curriculum/version backfill.",
      );
    }

    const mode: BackfillMode = data?.mode === "commit" ? "commit" : "dry-run";
    const confirmCommit = data?.confirmCommit === true;
    const pageSize = typeof data?.pageSize === "number" ? Math.max(50, Math.min(500, data.pageSize)) : 200;
    const sampleSize = typeof data?.sampleSize === "number" ? Math.max(1, Math.min(25, data.sampleSize)) : 10;
    const maxDocsPerCollection = typeof data?.maxDocsPerCollection === "number"
      ? Math.max(1, data.maxDocsPerCollection)
      : undefined;

    if (mode === "commit" && !confirmCommit) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Commit mode requires confirmCommit=true.",
      );
    }

    functions.logger.info("[BACKFILL] Curriculum/version backfill requested", {
      mode,
      pageSize,
      sampleSize,
      maxDocsPerCollection: maxDocsPerCollection || "all",
      triggeredBy: context.auth.uid,
    });

    try {
      const summary = await runCurriculumVersionBackfill({
        db,
        mode,
        pageSize,
        sampleSize,
        maxDocsPerCollection,
      });

      return {
        success: true,
        mode,
        summary,
      };
    } catch (error: any) {
      functions.logger.error("[BACKFILL] Curriculum/version backfill failed", {
        error: error?.message || String(error),
        triggeredBy: context.auth.uid,
      });

      throw new functions.https.HttpsError(
        "internal",
        `Backfill execution failed: ${error?.message || String(error)}`,
      );
    }
  },
);

interface ManualReassessmentCallableContext {
  auth?: {
    uid: string;
  } | null;
}

interface ManualRequestReassessmentHandlerInput {
  data?: Record<string, unknown>;
  context: ManualReassessmentCallableContext;
  db: FirebaseFirestore.Firestore;
  requestReassessment?: typeof requestReassessmentForStudent;
}

export async function handleManualRequestReassessment(
  input: ManualRequestReassessmentHandlerInput,
): Promise<{
  success: boolean;
  userId: string;
  updated: boolean;
  reasonCodes: ReassessmentReasonCode[];
}> {
  const {
    data,
    context,
    db,
    requestReassessment = requestReassessmentForStudent,
  } = input;
  const payload = data || {};

  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be authenticated.",
    );
  }

  const callerDoc = await db.collection("users").doc(context.auth.uid).get();
  const callerRole = callerDoc.data()?.role;

  if (callerRole !== "teacher" && callerRole !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only teachers and admins can request reassessment.",
    );
  }

  const inputUserId = typeof payload.userId === "string" ? payload.userId.trim() : "";
  const inputLrn = typeof payload.lrn === "string" ? payload.lrn.trim() : "";

  if (!inputUserId && !inputLrn) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Either userId or lrn is required.",
    );
  }

  let targetUserId = inputUserId;
  if (!targetUserId) {
    const userQuery = await db
      .collection("users")
      .where("lrn", "==", inputLrn)
      .limit(1)
      .get();

    if (userQuery.empty) {
      throw new functions.https.HttpsError(
        "not-found",
        `No student profile found for lrn ${inputLrn}.`,
      );
    }

    targetUserId = userQuery.docs[0].id;
  }

  const allowedReasonCodes: ReassessmentReasonCode[] = [
    "manual_teacher_admin",
    "grade_level_changed",
    "strand_changed",
    "inactivity_threshold",
  ];

  const requestedReasonCodes = Array.isArray(payload.reasonCodes)
    ? payload.reasonCodes.filter((item: unknown): item is ReassessmentReasonCode =>
      typeof item === "string" &&
        allowedReasonCodes.includes(item as ReassessmentReasonCode),
    )
    : [];

  const reasonCodes: ReassessmentReasonCode[] = requestedReasonCodes.length > 0
    ? requestedReasonCodes
    : ["manual_teacher_admin"];

  const reason = typeof payload.reason === "string" ? payload.reason : undefined;

  const result = await requestReassessment({
    db,
    userId: targetUserId,
    reasonCodes,
    source: "manual",
    actorId: context.auth.uid,
    actorRole: callerRole,
    metadata: {
      reason: reason || null,
      requestedByRole: callerRole,
    },
  });

  return {
    success: true,
    userId: targetUserId,
    updated: result.wasUpdated,
    reasonCodes: result.reasonCodes,
  };
}

/**
 * Teacher/Admin callable to force reassessment eligibility for a learner.
 * Accepts either userId or lrn.
 */
export const manualRequestReassessment = functions.https.onCall(
  async (data, context) => {
    return handleManualRequestReassessment({
      data,
      context,
      db: admin.firestore(),
    });
  },
);
