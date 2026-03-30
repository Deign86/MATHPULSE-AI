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

interface DiagnosticTriggerContext {
  lrn: string;
  diagnosticData: Record<string, any>;
  updateSnapshot: (payload: Record<string, unknown>) => Promise<unknown>;
  processDiagnostic: typeof processDiagnosticCompletion;
}

interface DiagnosticTriggerRuntimeContext extends DiagnosticTriggerContext {
  logger?: Pick<typeof functions.logger, "info" | "error">;
}

export async function handleDiagnosticCompleteCreate(
  input: DiagnosticTriggerContext,
): Promise<void> {
  const {
    lrn,
    diagnosticData,
    updateSnapshot,
    processDiagnostic,
  } = input;

  // Idempotency check
  if (diagnosticData.processed) {
    functions.logger.info("Already processed, skipping", { lrn });
    return;
  }

  // Mark as processing
  await updateSnapshot({
    processing: true,
    processingStartedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Parse results into the expected format
  const results = Array.isArray(diagnosticData.results)
    ? diagnosticData.results
    : Object.entries(diagnosticData.results || {}).map(
      ([subject, score]) => ({ subject, score: Number(score) }),
    );

  await processDiagnostic({
    lrn,
    results,
    gradeLevel: diagnosticData.gradeLevel || "Grade 11",
    questionBreakdown: diagnosticData.questionBreakdown,
    workflowMode: diagnosticData.workflowMode,
    assessmentType: diagnosticData.assessmentType,
  });

  await updateSnapshot({
    processed: true,
    processing: false,
    processedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

export async function handleDiagnosticCompleteSnapshotCreate(
  input: DiagnosticTriggerRuntimeContext,
): Promise<void> {
  const {
    lrn,
    diagnosticData,
    updateSnapshot,
    processDiagnostic,
    logger = functions.logger,
  } = input;

  logger.info("[DIAGNOSTIC] Diagnostic result created", { lrn });

  try {
    await handleDiagnosticCompleteCreate({
      lrn,
      diagnosticData,
      updateSnapshot,
      processDiagnostic,
    });

    logger.info("[OK] Diagnostic processing complete", { lrn });
  } catch (error: any) {
    logger.error("[ERROR] Diagnostic processing failed", {
      lrn,
      error: error.message,
      stack: error.stack,
    });

    // Mark as failed for manual retry / debugging
    await updateSnapshot({
      processing: false,
      processingError: error.message,
      failedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Don't re-throw — avoids infinite Cloud Functions retries
  }
}

export const onDiagnosticComplete = functions.firestore
  .document("diagnosticResults/{lrn}")
  .onCreate(async (snapshot, context) => {
    const lrn = context.params.lrn;
    const diagnosticData = snapshot.data();

    await handleDiagnosticCompleteSnapshotCreate({
      lrn,
      diagnosticData,
      updateSnapshot: (payload) => snapshot.ref.update(payload),
      processDiagnostic: processDiagnosticCompletion,
    });

    return null;
  });
