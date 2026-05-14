/**
 * WRI Cloud Functions Triggers
 *
 * Fires when activityScores or externalGrades subcollections change,
 * recalculates WRI and riskStatus on the parent managedStudent doc.
 * Also includes a scheduled batch recalc for periodic consistency.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { createNotification } from "../automations/notificationSender";

// ─── WRI Thresholds (Prevention-First 5-Band) ──────────────────

const WRI_SAFE_THRESHOLD = 88;
const WRI_WATCH_THRESHOLD = 80;
const WRI_INTERVENE_THRESHOLD = 75;
const WRI_CRITICAL_THRESHOLD = 68;
const DEFAULT_WEIGHTS = { w1: 0.30, w2: 0.40, w3: 0.30 };

// ─── Helpers ───────────────────────────────────────────────────

function deriveRiskStatus(wri: number | null): "safe" | "watch" | "intervene" | "critical" | "at_risk" | null {
  if (wri === null || wri === undefined) return null;
  if (wri >= WRI_SAFE_THRESHOLD) return "safe";
  if (wri >= WRI_WATCH_THRESHOLD) return "watch";
  if (wri >= WRI_INTERVENE_THRESHOLD) return "intervene";
  if (wri >= WRI_CRITICAL_THRESHOLD) return "critical";
  return "at_risk";
}

// ─── Risk Response Automation ──────────────────────────────────

/**
 * Apply automated system responses when a student's WRI status changes.
 * Fires after WRI recalculation when the status has actually changed.
 */
async function applyRiskResponse(
  studentId: string,
  newStatus: "safe" | "watch" | "intervene" | "critical" | "at_risk" | null,
  previousStatus: "safe" | "watch" | "intervene" | "critical" | "at_risk" | null,
  wri: number | null,
): Promise<void> {
  if (newStatus === null || newStatus === previousStatus) return;

  const db = admin.firestore();
  const studentRef = db.collection("users").doc(studentId);
  const studentSnap = await studentRef.get();
  const studentData = studentSnap.exists ? studentSnap.data() : {};
  const teacherId = studentData?.teacherId as string | undefined;
  const studentName =
    (studentData?.displayName as string) ||
    (studentData?.name as string) ||
    studentId;

  functions.logger.info(`[RISK_RESPONSE] ${studentId}: ${previousStatus ?? "null"} → ${newStatus}`, { wri });

  // Build the update payload for the student doc
  const updatePayload: Record<string, any> = {};

  switch (newStatus) {
    case "watch":
      updatePayload.moduleDifficulty = "easier";
      updatePayload.extraHintsEnabled = true;
      updatePayload.xpMultiplier = 1.2;
      break;

    case "intervene":
      updatePayload.moduleDifficulty = "remedial";
      updatePayload.extraHintsEnabled = true;
      updatePayload.xpMultiplier = 1.5;
      updatePayload.tutorCheckInFactor = 2;
      break;

    case "critical":
      updatePayload.moduleDifficulty = "remedial";
      updatePayload.lockedFeatures = ["leaderboard", "cosmetic_shop", "bonus_challenges"];
      updatePayload.tutorCheckInFactor = 3;
      break;

    case "at_risk":
      updatePayload.moduleDifficulty = "remedial";
      updatePayload.lockedFeatures = ["leaderboard", "cosmetic_shop", "bonus_challenges", "optional_modules"];
      updatePayload.tutorCheckInFactor = 5;
      updatePayload.teacherAckRequired = true;
      updatePayload.teacherAcknowledged = false;
      break;

    case "safe":
      updatePayload.moduleDifficulty = "normal";
      updatePayload.extraHintsEnabled = false;
      updatePayload.xpMultiplier = 1.0;
      updatePayload.lockedFeatures = [];
      updatePayload.tutorCheckInFactor = 1;
      updatePayload.teacherAckRequired = false;
      break;
  }

  if (Object.keys(updatePayload).length > 0) {
    await studentRef.update(updatePayload);
    functions.logger.info(`[RISK_RESPONSE] ${studentId}: student doc updated`, updatePayload);
  }

  // Teacher notifications for intervene / critical / at_risk
  if (teacherId && (newStatus === "intervene" || newStatus === "critical" || newStatus === "at_risk")) {
    const titles: Record<string, string> = {
      intervene: "Student Intervention Needed",
      critical: "Urgent: Student Critical",
      at_risk: "Emergency: Student At Risk",
    };
    const messages: Record<string, string> = {
      intervene: `${studentName} is approaching the intervention threshold (WRI: ${wri ?? "N/A"}). Remedial modules have been activated. Please review their progress.`,
      critical: `${studentName} requires urgent attention (WRI: ${wri ?? "N/A"}). A structured intervention checklist has been generated. Please act soon.`,
      at_risk: `${studentName} is at critical risk of failing (WRI: ${wri ?? "N/A"}). Your acknowledgment is required before their learning path continues.`,
    };

    try {
      await createNotification({
        userId: teacherId,
        type: "risk_alert",
        title: titles[newStatus],
        message: messages[newStatus],
        studentId,
        wri: wri ?? undefined,
        riskStatus: newStatus,
      });
      functions.logger.info(`[RISK_RESPONSE] ${studentId}: teacher notification sent → ${newStatus}`);
    } catch (err: any) {
      functions.logger.error(`[RISK_RESPONSE] ${studentId}: failed to send teacher notification`, { error: err.message });
    }
  }

  // Generate intervention checklist for critical / at_risk
  if (newStatus === "critical" || newStatus === "at_risk") {
    const checklistRef = db.collection("interventionChecklists").doc(studentId);
    await checklistRef.set(
      {
        studentId,
        items: [
          { id: "1", text: "Review recent quiz performance", completed: false },
          { id: "2", text: "Schedule 1-on-1 check-in", completed: false },
          { id: "3", text: "Assign remedial module", completed: false },
          { id: "4", text: "Contact parent/guardian", completed: false },
          { id: "5", text: "Monitor weekly progress", completed: false },
        ],
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
        acknowledged: false,
      },
      { merge: true }
    );
    functions.logger.info(`[RISK_RESPONSE] ${studentId}: intervention checklist generated`);
  }
}

function computeWRI(
  diagnosticScore: number | null,
  externalGradesAvg: number | null,
  systemPerformanceAvg: number | null,
  weights: { w1: number; w2: number; w3: number },
): { wri: number | null; riskStatus: "safe" | "watch" | "intervene" | "critical" | "at_risk" | null; pending: boolean } {
  const D = diagnosticScore;
  const G = externalGradesAvg ?? D;
  const P = systemPerformanceAvg ?? D;

  if (D === null || D === undefined) {
    return { wri: null, riskStatus: null, pending: true };
  }

  const w1 = weights.w1 ?? DEFAULT_WEIGHTS.w1;
  const w2 = weights.w2 ?? DEFAULT_WEIGHTS.w2;
  const w3 = weights.w3 ?? DEFAULT_WEIGHTS.w3;

  const wri = w1 * D + w2 * (G ?? D) + w3 * (P ?? D);
  const riskStatus = deriveRiskStatus(wri);

  return { wri: Math.round(wri * 10) / 10, riskStatus, pending: false };
}

async function recalcStudentWRI(studentId: string): Promise<void> {
  const db = admin.firestore();
  const studentRef = db.collection("managedStudents").doc(studentId);
  const studentSnap = await studentRef.get();

  if (!studentSnap.exists) {
    functions.logger.warn(`[WRI] managedStudent ${studentId} not found, skipping recalc`);
    return;
  }

  const data = studentSnap.data() || {};

  // Query activityScores subcollection
  const activityScoresSnap = await studentRef.collection("activityScores").get();
  const activityScores = activityScoresSnap.docs.map((d) => d.data().score as number | undefined).filter((s): s is number => s !== undefined);
  const systemPerformanceAvg = activityScores.length > 0
    ? Math.round((activityScores.reduce((a, b) => a + b, 0) / activityScores.length) * 10) / 10
    : data.systemPerformanceAvg ?? null;

  // Query externalGrades subcollection
  const externalGradesSnap = await studentRef.collection("externalGrades").get();
  const externalGrades = externalGradesSnap.docs.map((d) => {
    const gd = d.data();
    const score = gd.score ?? gd.grade ?? gd.value;
    return typeof score === "number" ? score : undefined;
  }).filter((s): s is number => s !== undefined);
  const externalGradesAvg = externalGrades.length > 0
    ? Math.round((externalGrades.reduce((a, b) => a + b, 0) / externalGrades.length) * 10) / 10
    : data.externalGradesAvg ?? null;

  const weights = {
    w1: data.w1 ?? DEFAULT_WEIGHTS.w1,
    w2: data.w2 ?? DEFAULT_WEIGHTS.w2,
    w3: data.w3 ?? DEFAULT_WEIGHTS.w3,
  };

  const diagnosticScore = data.diagnosticScore ?? null;
  const previousStatus = data.riskStatus as "safe" | "watch" | "intervene" | "critical" | "at_risk" | null ?? null;

  const { wri, riskStatus, pending } = computeWRI(diagnosticScore, externalGradesAvg, systemPerformanceAvg, weights);

  const updatePayload: Record<string, any> = {
    systemPerformanceAvg,
    externalGradesAvg,
    wri,
    riskStatus,
    wriPending: pending,
    wriComputedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Push to riskHistory if WRI changed and is not null
  const lastWri = data.wri;
  if (wri !== null && wri !== lastWri) {
    const historyEntry = {
      wri,
      riskStatus,
      diagnosticScore,
      externalGradesAvg,
      systemPerformanceAvg,
      computedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    updatePayload.riskHistory = admin.firestore.FieldValue.arrayUnion(historyEntry);
  }

  await studentRef.update(updatePayload);

  // Fire automated risk responses if status changed
  try {
    await applyRiskResponse(studentId, riskStatus, previousStatus, wri);
  } catch (err: any) {
    functions.logger.error(`[WRI] Risk response failed for ${studentId}`, { error: err.message });
  }

  functions.logger.info(`[WRI] Recalculated for ${studentId}`, {
    wri,
    riskStatus,
    previousStatus,
    diagnosticScore,
    externalGradesAvg,
    systemPerformanceAvg,
  });
}

// ─── Firestore Triggers ────────────────────────────────────────

export const onActivityScoreWritten = functions.firestore
  .document("managedStudents/{studentId}/activityScores/{docId}")
  .onWrite(async (change, context) => {
    if (!change.after.exists) return null;

    const { studentId } = context.params;
    functions.logger.info(`[WRI] activityScore written for ${studentId}`);

    try {
      await recalcStudentWRI(studentId);
      functions.logger.info(`[OK] WRI recalc done after activityScore for ${studentId}`);
    } catch (error: any) {
      functions.logger.error(`[ERROR] WRI recalc failed after activityScore for ${studentId}`, {
        error: error.message,
      });
    }

    return null;
  });

export const onExternalGradeWritten = functions.firestore
  .document("managedStudents/{studentId}/externalGrades/{docId}")
  .onWrite(async (change, context) => {
    if (!change.after.exists) return null;

    const { studentId } = context.params;
    functions.logger.info(`[WRI] externalGrade written for ${studentId}`);

    try {
      await recalcStudentWRI(studentId);
      functions.logger.info(`[OK] WRI recalc done after externalGrade for ${studentId}`);
    } catch (error: any) {
      functions.logger.error(`[ERROR] WRI recalc failed after externalGrade for ${studentId}`, {
        error: error.message,
      });
    }

    return null;
  });

// ─── Scheduled Batch Recalc ────────────────────────────────────

export const runWriBatchRecalc = functions.pubsub
  .schedule("every 60 minutes")
  .onRun(async (context) => {
    const db = admin.firestore();
    const managedStudentsRef = db.collection("managedStudents");

    functions.logger.info("[WRI] Starting batch WRI recalc");

    let processed = 0;
    let errors = 0;

    try {
      const snapshot = await managedStudentsRef.get();

      for (const doc of snapshot.docs) {
        try {
          await recalcStudentWRI(doc.id);
          processed++;
        } catch (error: any) {
          errors++;
          functions.logger.error(`[ERROR] Batch recalc failed for ${doc.id}`, {
            error: error.message,
          });
        }
      }
    } catch (error: any) {
      functions.logger.error("[ERROR] Batch recalc query failed", { error: error.message });
    }

    functions.logger.info(`[WRI] Batch recalc complete`, { processed, errors });
    return null;
  });
