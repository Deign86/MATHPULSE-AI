/**
 * Trigger: onQuizSubmitted
 *
 * Fires when a new quiz result document is created in the
 * `quizResults` collection.  Recalculates per-subject risk
 * and updates the student profile.
 */

import * as admin from "firebase-admin";
import { onDocumentCreatedWithAuthContext } from "firebase-functions/v2/firestore";
import { processQuizSubmission } from "../automations/quizProcessor";

export function matchesQuizSubmissionIdentity(
  callerUid: string | undefined,
  studentId: string | undefined,
  lrn: string | undefined,
): callerUid is string {
  return Boolean(callerUid && studentId === callerUid && lrn === callerUid);
}

export const onQuizSubmitted = onDocumentCreatedWithAuthContext(
  "quizResults/{resultId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return null;
    const resultId = event.params.resultId;
    const quizData = snapshot.data();
    const callerUid = event.authId;
    const lrn: string | undefined = quizData.lrn;
    const studentId: string | undefined = quizData.studentId;

    // Validate required fields
    if (!matchesQuizSubmissionIdentity(callerUid, studentId, lrn) || !quizData.subject || quizData.score === undefined) {
      console.warn("Quiz result missing caller identity or required fields, skipping", {
        resultId,
        hasCallerUid: !!callerUid,
        hasStudentId: !!studentId,
        hasLrn: !!quizData.lrn,
        hasSubject: !!quizData.subject,
        hasScore: quizData.score !== undefined,
      });
      return null;
    }
    const targetUid = callerUid;

    console.info("[QUIZ] Quiz result created", {
      resultId,
      targetUid,
      subject: quizData.subject,
      score: quizData.score,
    });

    try {
      await processQuizSubmission({
        callerUid: targetUid,
        lrn: targetUid,
        quizId: quizData.quizId || resultId,
        subject: quizData.subject,
        score: quizData.score,
        totalQuestions: quizData.totalQuestions || 0,
        correctAnswers: quizData.correctAnswers || 0,
        timeSpentSeconds: quizData.timeSpentSeconds || 0,
        answers: quizData.answers,
      });

      await snapshot.ref.update({
        automationProcessed: true,
        automationProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.info("[OK] Quiz submission processed", {
        resultId,
        targetUid,
      });
    } catch (error: any) {
      console.error("[ERROR] Quiz submission processing failed", {
        resultId,
        error: error.message,
      });

      await snapshot.ref.update({
        automationError: error.message,
        automationFailedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return null;
  },
);
