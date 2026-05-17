import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { createNotification } from "../automations/notificationSender";
import { sanitizeProfileFields } from "../utils/profileSanitizer";
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

    // ── Defence-in-depth: sanitize user-controlled text fields ─────────────
    // Mirrors the client-side Zod rules. If the document was written through
    // an unprivileged path or a compromised client, this removes HTML/script
    // tag characters and clamps phone format. Idempotent — only re-writes
    // when the cleaned value differs, which prevents infinite trigger loops.
    const sanitization = sanitizeProfileFields(afterData);
    if (sanitization.changed) {
      functions.logger.warn("[SECURITY] Sanitized invalid profile fields on user write", {
        userId,
        fieldsRewritten: Object.keys(sanitization.patches),
      });
      try {
        await change.after.ref.update(sanitization.patches);
      } catch (sanitizeErr) {
        functions.logger.error("[SECURITY] Failed to apply profile sanitization", {
          userId,
          error: sanitizeErr instanceof Error ? sanitizeErr.message : String(sanitizeErr),
        });
      }
      // Reflect the cleaned values for downstream logic in this same invocation.
      Object.assign(afterData, sanitization.patches);
    }

    const db = admin.firestore();
    await handleStudentProfileReassessmentUpdate({
      db,
      userId,
      beforeData,
      afterData,
    });

    // Update leaderboard collection when XP, name, or photo changes
    const beforeXP = beforeData.totalXP as number || 0;
    const afterXP = afterData.totalXP as number || 0;
    if (beforeXP !== afterXP || beforeData.name !== afterData.name || beforeData.level !== afterData.level || beforeData.photo !== afterData.photo) {
      const leaderboardRef = db.collection("leaderboard").doc(userId);
      await leaderboardRef.set({
        name: afterData.name || 'Unknown',
        photo: afterData.photo || '',
        totalXP: afterXP,
        level: afterData.level || 1,
        weeklyXP: afterData.weeklyXP || 0,
        monthlyXP: afterData.monthlyXP || 0,
        role: afterData.role,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      functions.logger.info("[LEADERBOARD] Updated leaderboard for user", { userId, totalXP: afterXP });
    }

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

// ─── Leaderboard Sync Functions ───────────────────────────────────────────────

/**
 * Sync a single user to the leaderboard collection
 */
async function syncUserToLeaderboard(
  db: FirebaseFirestore.Firestore,
  userId: string,
  userData: Record<string, unknown>
): Promise<void> {
  const leaderboardRef = db.collection("leaderboard").doc(userId);
  await leaderboardRef.set({
    name: userData.name || "Unknown",
    photo: userData.photo || "",
    totalXP: userData.totalXP || 0,
    level: userData.level || 1,
    weeklyXP: userData.weeklyXP || 0,
    monthlyXP: userData.monthlyXP || 0,
    role: userData.role,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

/**
 * HTTPS callable function to sync all students to leaderboard
 * Trigger: POST /syncLeaderboard or manual invocation
 */
export const syncLeaderboardCollection = functions.https.onCall(async (data, context) => {
  if (!context.auth || (context.auth.uid !== data?.adminUid && !data?.force)) {
    throw new functions.https.HttpsError("permission-denied", "Admin access required");
  }

  const db = admin.firestore();
  const batch = db.batch();
  let synced = 0;
  let errors = 0;

  const usersSnapshot = await db.collection("users").where("role", "==", "student").get();

  for (const userDoc of usersSnapshot.docs) {
    try {
      const userData = userDoc.data();
      const leaderboardRef = db.collection("leaderboard").doc(userDoc.id);
      batch.set(leaderboardRef, {
        name: userData.name || "Unknown",
        photo: userData.photo || "",
        totalXP: userData.totalXP || 0,
        level: userData.level || 1,
        weeklyXP: userData.weeklyXP || 0,
        monthlyXP: userData.monthlyXP || 0,
        role: userData.role,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      synced++;

      // Commit in batches of 500
      if (synced % 500 === 0) {
        await batch.commit();
        functions.logger.info(`[LEADERBOARD] Synced ${synced} users...`);
      }
    } catch (err) {
      errors++;
      functions.logger.error("[LEADERBOARD] Error syncing user", { userId: userDoc.id, error: err });
    }
  }

  // Final commit
  if (synced % 500 !== 0) {
    await batch.commit();
  }

  functions.logger.info("[LEADERBOARD] Sync complete", { synced, errors });
  return { success: true, synced, errors };
});

/**
 * Firestore trigger: When a new student is created, add them to leaderboard
 */
export const onStudentCreated = functions.firestore
  .document("users/{userId}")
  .onCreate(async (snap, context) => {
    const userId = context.params.userId;
    const userData = snap.data();

    // Sanitize on create: a freshly-created user doc may already contain an
    // injection payload from the signup form. Strip HTML chars + clamp phone.
    const sanitization = sanitizeProfileFields(userData);
    if (sanitization.changed) {
      functions.logger.warn("[SECURITY] Sanitized invalid profile fields on user create", {
        userId,
        fieldsRewritten: Object.keys(sanitization.patches),
      });
      try {
        await snap.ref.update(sanitization.patches);
        Object.assign(userData, sanitization.patches);
      } catch (sanitizeErr) {
        functions.logger.error("[SECURITY] Failed to apply profile sanitization on create", {
          userId,
          error: sanitizeErr instanceof Error ? sanitizeErr.message : String(sanitizeErr),
        });
      }
    }

    if (userData.role !== "student") return null;

    const db = admin.firestore();
    await syncUserToLeaderboard(db, userId, userData);
    functions.logger.info("[LEADERBOARD] Added new student to leaderboard", { userId });

    return null;
  });
