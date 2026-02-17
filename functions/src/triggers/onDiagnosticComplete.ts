/**
 * Trigger: onDiagnosticComplete
 *
 * CRITICAL TRIGGER — fires when a new document is created in the
 * `diagnosticResults` collection.  Orchestrates the entire
 * diagnostic-completion workflow via diagnosticProcessor.
 *
 * Idempotent: checks `processed` flag to prevent double-processing.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { processDiagnosticCompletion } from "../automations/diagnosticProcessor";

export const onDiagnosticComplete = functions.firestore
  .document("diagnosticResults/{studentId}")
  .onCreate(async (snapshot, context) => {
    const studentId = context.params.studentId;
    const diagnosticData = snapshot.data();

    functions.logger.info("🎯 Diagnostic result created", { studentId });

    try {
      // Idempotency check
      if (diagnosticData.processed) {
        functions.logger.info("Already processed, skipping", { studentId });
        return null;
      }

      // Mark as processing
      await snapshot.ref.update({
        processing: true,
        processingStartedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Parse results into the expected format
      const results = Array.isArray(diagnosticData.results)
        ? diagnosticData.results
        : Object.entries(diagnosticData.results || {}).map(
            ([subject, score]) => ({ subject, score: Number(score) }),
          );

      // Run the workflow
      await processDiagnosticCompletion({
        studentId,
        results,
        gradeLevel: diagnosticData.gradeLevel || "Grade 10",
        questionBreakdown: diagnosticData.questionBreakdown,
      });

      // Mark as processed
      await snapshot.ref.update({
        processed: true,
        processing: false,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      functions.logger.info("✅ Diagnostic processing complete", { studentId });
    } catch (error: any) {
      functions.logger.error("❌ Diagnostic processing failed", {
        studentId,
        error: error.message,
        stack: error.stack,
      });

      // Mark as failed for manual retry / debugging
      await snapshot.ref.update({
        processing: false,
        processingError: error.message,
        failedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Don't re-throw — avoids infinite Cloud Functions retries
    }

    return null;
  });
