import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { createNotification } from "../automations/notificationSender";
import {
  detectProfileReassessmentReasons,
  hasCompletedInitialAssessment,
  ReassessmentReasonCode,
  requestReassessmentForStudent,
  shouldQueueInactivityReassessment,
} from "../automations/reassessmentEngine";
import {
  NOTIFICATION_TYPES,
  REASSESSMENT_INACTIVITY_DAYS,
  REASSESSMENT_SCAN_BATCH_LIMIT,
} from "../config/constants";

interface ProfileReassessmentHandlerInput {
  db: FirebaseFirestore.Firestore;
  userId: string;
  beforeData: Record<string, unknown>;
  afterData: Record<string, unknown>;
  requestReassessment?: typeof requestReassessmentForStudent;
  sendNotification?: typeof createNotification;
}

interface InactivitySweepHandlerInput {
  db: FirebaseFirestore.Firestore;
  inactivityThresholdDays: number;
  scanBatchLimit: number;
  now?: Date;
  requestReassessment?: typeof requestReassessmentForStudent;
  sendNotification?: typeof createNotification;
}

interface InactivitySweepHandlerResult {
  scanned: number;
  triggered: number;
  inactivityThresholdDays: number;
  scanLimit: number;
}

export async function handleStudentProfileReassessmentUpdate(
  input: ProfileReassessmentHandlerInput,
): Promise<{ wasUpdated: boolean; reasonCodes: ReassessmentReasonCode[] }> {
  const {
    db,
    userId,
    beforeData,
    afterData,
    requestReassessment = requestReassessmentForStudent,
    sendNotification = createNotification,
  } = input;

  if (afterData.role !== "student") return { wasUpdated: false, reasonCodes: [] };
  if (!hasCompletedInitialAssessment(beforeData)) return { wasUpdated: false, reasonCodes: [] };

  const reasonCodes = detectProfileReassessmentReasons(beforeData, afterData);
  if (reasonCodes.length === 0) return { wasUpdated: false, reasonCodes: [] };

  const reassessment = await requestReassessment({
    db,
    userId,
    source: "profile_change",
    actorId: "system",
    actorRole: "system",
    reasonCodes,
    metadata: {
      before: {
        grade: beforeData.grade || beforeData.gradeLevel || null,
        strand: beforeData.strand || beforeData.track || beforeData.major || null,
      },
      after: {
        grade: afterData.grade || afterData.gradeLevel || null,
        strand: afterData.strand || afterData.track || afterData.major || null,
      },
    },
  });

  if (reassessment.wasUpdated) {
    await sendNotification({
      userId,
      type: NOTIFICATION_TYPES.REMINDER,
      title: "Reassessment required",
      message:
        "Your profile placement details changed, so your Initial Assessment and Recommendation has been reset. Please retake the IAR to unlock your updated learning path.",
    });

    functions.logger.info("[REASSESSMENT] Triggered from profile change", {
      userId,
      reasonCodes: reassessment.reasonCodes,
    });
  }

  return reassessment;
}

export async function handleInactivityReassessmentSweep(
  input: InactivitySweepHandlerInput,
): Promise<InactivitySweepHandlerResult> {
  const {
    db,
    inactivityThresholdDays,
    scanBatchLimit,
    now = new Date(),
    requestReassessment = requestReassessmentForStudent,
    sendNotification = createNotification,
  } = input;

  if (inactivityThresholdDays <= 0) {
    functions.logger.info("[REASSESSMENT] Inactivity reassessment sweep skipped (disabled)");
    return {
      scanned: 0,
      triggered: 0,
      inactivityThresholdDays,
      scanLimit: scanBatchLimit,
    };
  }

  let scanned = 0;
  let triggered = 0;
  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

  while (scanned < scanBatchLimit) {
    let query = db
      .collection("users")
      .where("role", "==", "student")
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(Math.min(150, scanBatchLimit - scanned));

    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const page = await query.get();
    if (page.empty) break;

    for (const docSnap of page.docs) {
      scanned += 1;
      const userData = docSnap.data() as Record<string, unknown>;
      const inactivityDecision = shouldQueueInactivityReassessment(
        userData,
        inactivityThresholdDays,
        now,
      );

      if (!inactivityDecision.shouldQueue) {
        continue;
      }

      const result = await requestReassessment({
        db,
        userId: docSnap.id,
        source: "scheduled_inactivity",
        actorId: "system",
        actorRole: "system",
        reasonCodes: ["inactivity_threshold"],
        metadata: {
          inactivityDays: inactivityDecision.inactivityDays,
          thresholdDays: inactivityThresholdDays,
          anchorField: inactivityDecision.anchorField || null,
        },
      });

      if (result.wasUpdated) {
        triggered += 1;
        await sendNotification({
          userId: docSnap.id,
          type: NOTIFICATION_TYPES.REMINDER,
          title: "IAR refresh available",
          message:
            "You have been inactive for an extended period. Retake the Initial Assessment and Recommendation to refresh your placement.",
        });
      }
    }

    lastDoc = page.docs[page.docs.length - 1] || null;
    if (page.docs.length === 0) break;
  }

  return {
    scanned,
    triggered,
    inactivityThresholdDays,
    scanLimit: scanBatchLimit,
  };
}

export const onStudentProfileUpdated = functions.firestore
  .document("users/{userId}")
  .onUpdate(async (change, context) => {
    const userId = context.params.userId;
    const beforeData = change.before.data() as Record<string, unknown>;
    const afterData = change.after.data() as Record<string, unknown>;

    const db = admin.firestore();
    await handleStudentProfileReassessmentUpdate({
      db,
      userId,
      beforeData,
      afterData,
    });

    return null;
  });

export const runInactivityReassessmentSweep = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async () => {
    const db = admin.firestore();
    const summary = await handleInactivityReassessmentSweep({
      db,
      inactivityThresholdDays: REASSESSMENT_INACTIVITY_DAYS,
      scanBatchLimit: REASSESSMENT_SCAN_BATCH_LIMIT,
    });

    functions.logger.info("[REASSESSMENT] Inactivity sweep complete", {
      scanned: summary.scanned,
      triggered: summary.triggered,
      inactivityThresholdDays: summary.inactivityThresholdDays,
      scanLimit: summary.scanLimit,
    });

    return null;
  });
