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

    // Validate required fields
    if (!quizData.studentId || !quizData.subject || quizData.score === undefined) {
      functions.logger.warn("Quiz result missing required fields, skipping", {
        resultId,
        hasStudentId: !!quizData.studentId,
        hasSubject: !!quizData.subject,
        hasScore: quizData.score !== undefined,
      });
      return null;
    }

    functions.logger.info("📝 Quiz result created", {
      resultId,
      studentId: quizData.studentId,
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
        studentId: quizData.studentId,
        quizId: quizData.quizId || resultId,
        subject: quizData.subject,
        score: quizData.score,
        totalQuestions: quizData.totalQuestions || 0,
        correctAnswers: quizData.correctAnswers || 0,
        timeSpentSeconds: quizData.timeSpentSeconds || 0,
        answers: quizData.answers,
      });

      functions.logger.info("✅ Quiz submission processed", {
        resultId,
        studentId: quizData.studentId,
      });
    } catch (error: any) {
      functions.logger.error("❌ Quiz submission processing failed", {
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
