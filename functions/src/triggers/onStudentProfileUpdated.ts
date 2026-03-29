import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { createNotification } from "../automations/notificationSender";
import {
  NOTIFICATION_TYPES,
  REASSESSMENT_INACTIVITY_DAYS,
  REASSESSMENT_SCAN_BATCH_LIMIT,
} from "../config/constants";

type ReassessmentReasonCode =
  | "grade_changed"
  | "strand_changed"
  | "inactivity_threshold";

interface RequestReassessmentInput {
  db: FirebaseFirestore.Firestore;
  userId: string;
  source: "profile_change" | "scheduled_inactivity";
  actorId: string;
  actorRole: string;
  reasonCodes: ReassessmentReasonCode[];
  metadata?: Record<string, unknown>;
}

interface InactivityDecision {
  shouldQueue: boolean;
  inactivityDays: number;
  anchorField?: string;
}

function normalizeValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.toLowerCase() : null;
}

function valuesDiffer(a: unknown, b: unknown): boolean {
  return normalizeValue(a) !== normalizeValue(b);
}

function toDateOrNull(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: unknown }).toDate === "function"
  ) {
    const dateValue = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(dateValue.getTime()) ? null : dateValue;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function hasCompletedInitialAssessment(profileData: Record<string, unknown>): boolean {
  return profileData.hasTakenDiagnostic === true;
}

function detectProfileReassessmentReasons(
  beforeData: Record<string, unknown>,
  afterData: Record<string, unknown>,
): ReassessmentReasonCode[] {
  const reasons = new Set<ReassessmentReasonCode>();

  const beforeGrade = beforeData.grade ?? beforeData.gradeLevel;
  const afterGrade = afterData.grade ?? afterData.gradeLevel;
  if (valuesDiffer(beforeGrade, afterGrade)) reasons.add("grade_changed");

  const beforeStrand = beforeData.strand ?? beforeData.track ?? beforeData.major;
  const afterStrand = afterData.strand ?? afterData.track ?? afterData.major;
  if (valuesDiffer(beforeStrand, afterStrand)) reasons.add("strand_changed");

  return [...reasons];
}

function shouldQueueInactivityReassessment(
  userData: Record<string, unknown>,
  inactivityThresholdDays: number,
  now: Date = new Date(),
): InactivityDecision {
  if (inactivityThresholdDays <= 0 || userData.role !== "student") {
    return { shouldQueue: false, inactivityDays: 0 };
  }

  if (!hasCompletedInitialAssessment(userData)) {
    return { shouldQueue: false, inactivityDays: 0 };
  }

  const candidateAnchors: Array<{ field: string; value: unknown }> = [
    { field: "lastActiveAt", value: userData.lastActiveAt },
    { field: "lastLoginAt", value: userData.lastLoginAt },
    { field: "updatedAt", value: userData.updatedAt },
  ];

  const anchor = candidateAnchors.find((entry) => toDateOrNull(entry.value));
  const anchorDate = anchor ? toDateOrNull(anchor.value) : null;

  if (!anchorDate) {
    return { shouldQueue: false, inactivityDays: 0 };
  }

  const msDiff = now.getTime() - anchorDate.getTime();
  const inactivityDays = Math.max(0, Math.floor(msDiff / (1000 * 60 * 60 * 24)));

  return {
    shouldQueue: inactivityDays >= inactivityThresholdDays,
    inactivityDays,
    anchorField: anchor?.field,
  };
}

async function requestReassessmentForStudent(
  input: RequestReassessmentInput,
): Promise<{ wasUpdated: boolean; reasonCodes: ReassessmentReasonCode[] }> {
  const { db, userId, source, actorId, actorRole, reasonCodes, metadata } = input;

  if (reasonCodes.length === 0) {
    return { wasUpdated: false, reasonCodes: [] };
  }

  const userRef = db.collection("users").doc(userId);
  const snapshot = await userRef.get();
  if (!snapshot.exists) {
    return { wasUpdated: false, reasonCodes: [] };
  }

  const userData = snapshot.data() as Record<string, unknown>;
  const currentReassessment =
    typeof userData.reassessment === "object" && userData.reassessment !== null
      ? (userData.reassessment as Record<string, unknown>)
      : {};

  const existingCodesRaw = currentReassessment.reasonCodes;
  const existingCodes = Array.isArray(existingCodesRaw)
    ? existingCodesRaw.filter(
        (code): code is ReassessmentReasonCode =>
          code === "grade_changed" ||
          code === "strand_changed" ||
          code === "inactivity_threshold",
      )
    : [];

  const nextReasonCodes = Array.from(new Set<ReassessmentReasonCode>([...existingCodes, ...reasonCodes]));

  const isAlreadyPending = currentReassessment.status === "pending";
  const hasDiagnosticLocked = userData.hasTakenDiagnostic === false;
  const isNoOp =
    isAlreadyPending &&
    hasDiagnosticLocked &&
    nextReasonCodes.length === existingCodes.length &&
    nextReasonCodes.every((code) => existingCodes.includes(code));

  if (isNoOp) {
    return { wasUpdated: false, reasonCodes: existingCodes };
  }

  await userRef.set(
    {
      hasTakenDiagnostic: false,
      reassessment: {
        status: "pending",
        source,
        actorId,
        actorRole,
        reasonCodes: nextReasonCodes,
        metadata: metadata || {},
        requestedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    },
    { merge: true },
  );

  return { wasUpdated: true, reasonCodes: nextReasonCodes };
}

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
