/**
 * Trigger: onQuizSubmitted
 *
 * Fires when a new quiz result document is created in the
 * `quizResults` collection.  Recalculates per-subject risk
 * and updates the student profile.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { processQuizSubmission } from "../automations/quizProcessor";

export const onQuizSubmitted = functions.firestore
  .document("quizResults/{resultId}")
  .onCreate(async (snapshot, context) => {
    const resultId = context.params.resultId;
    const quizData = snapshot.data();
    const lrn: string | undefined = quizData.lrn;

    // Validate required fields
    if (!lrn || !quizData.subject || quizData.score === undefined) {
      functions.logger.warn("Quiz result missing required fields, skipping", {
        resultId,
        hasLrn: !!quizData.lrn,
        hasSubject: !!quizData.subject,
        hasScore: quizData.score !== undefined,
      });
      return null;
    }

    functions.logger.info("[QUIZ] Quiz result created", {
      resultId,
      lrn,
      subject: quizData.subject,
      score: quizData.score,
    });

    try {
      // Mark as processing
      await snapshot.ref.update({
        automationProcessed: true,
        automationProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

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

      functions.logger.info("[OK] Quiz submission processed", {
        resultId,
        lrn,
      });
    } catch (error: any) {
      functions.logger.error("[ERROR] Quiz submission processing failed", {
        resultId,
        error: error.message,
      });

      await snapshot.ref.update({
        automationError: error.message,
        automationFailedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return null;
  });
