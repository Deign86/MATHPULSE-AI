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

/**
 * Manually trigger diagnostic processing for a student.
 *
 * Call via Firebase SDK:
 *   const manualProcess = httpsCallable(functions, 'manualProcessStudent');
 *   await manualProcess({ studentId: '...' });
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

    const { studentId } = data;
    if (!studentId || typeof studentId !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "studentId is required and must be a string.",
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
    const diagDoc = await db.collection("diagnosticResults").doc(studentId).get();
    if (!diagDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        `No diagnostic results found for student ${studentId}.`,
      );
    }

    const diagData = diagDoc.data()!;

    // Parse results
    const results = Array.isArray(diagData.results)
      ? diagData.results
      : Object.entries(diagData.results || {}).map(
          ([subject, score]) => ({ subject, score: Number(score) }),
        );

    functions.logger.info("🔄 Manual diagnostic reprocessing triggered", {
      studentId,
      triggeredBy: context.auth.uid,
    });

    try {
      await processDiagnosticCompletion({
        studentId,
        results,
        gradeLevel: diagData.gradeLevel || "Grade 10",
        questionBreakdown: diagData.questionBreakdown,
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
        message: `Diagnostic reprocessed for student ${studentId}`,
      };
    } catch (error: any) {
      functions.logger.error("Manual reprocessing failed", {
        studentId,
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

    try {
      await processQuizSubmission({
        studentId: quizData.studentId,
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
        message: `Quiz result ${resultId} reprocessed for ${quizData.studentId}`,
      };
    } catch (error: any) {
      throw new functions.https.HttpsError(
        "internal",
        `Quiz reprocessing failed: ${error.message}`,
      );
    }
  },
);
