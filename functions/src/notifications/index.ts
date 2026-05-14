/**
 * FCM push triggers for MathPulse AI.
 *
 * Each Firestore trigger owns one event class (achievement unlocked,
 * grade posted, quiz battle state change, in-app notification echo).
 * Scheduled triggers cover the user-engagement loops (daily reward,
 * streak reminder). The HTTPS-callable `sendTestPush` lets the settings
 * UI verify a user's push setup end-to-end.
 *
 * All sends route through `sendPushToUser` (utils/sendPush.ts) so the
 * per-user preference gating + token cleanup are honoured uniformly.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { sendPushToUser } from "../utils/sendPush";

type AnyDoc = Record<string, unknown>;

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" ? value : fallback;
}

// ───────────────────────── Achievement Unlocked ─────────────────────────
/**
 * Fires when an achievement document is written under
 * `users/{userId}/achievements/{achievementId}` (newer subcollection
 * pattern). The legacy flat `achievements` collection is handled by the
 * in-app notification catch-all below — those rows write a notification
 * which then triggers `onInAppNotificationCreated`.
 */
export const onAchievementUnlocked = functions.firestore
  .document("users/{userId}/achievements/{achievementId}")
  .onCreate(async (snap, context) => {
    const data = (snap.data() || {}) as AnyDoc;
    if (!data) return;
    if (data.unlockedAt === undefined && data.unlocked !== true) return;

    const name = asString(data.name) || asString(data.title) || "New Achievement";
    await sendPushToUser(context.params.userId, {
      title: "🏆 Achievement Unlocked!",
      body: `You earned: ${name}`,
      url: "/grades",
      tag: `achievement-${context.params.achievementId}`,
      notificationType: "achievement",
    });
  });

// ───────────────────────── Quiz Battle State ────────────────────────────
/**
 * Listens to `quizBattleMatches/{battleId}`. Notifies the invited player
 * on a new pending invite and both players when the match completes.
 *
 * Schema is defensive — the codebase's quiz-battle docs use slightly
 * different field names across paths (challengedUserId vs playerBId).
 * We accept either to avoid silent failures during gradual migrations.
 */
export const onQuizBattleUpdate = functions.firestore
  .document("quizBattleMatches/{battleId}")
  .onWrite(async (change, context) => {
    const after = (change.after.exists ? change.after.data() : null) as AnyDoc | null;
    const before = (change.before.exists ? change.before.data() : null) as AnyDoc | null;
    if (!after) return;

    const battleId = context.params.battleId;
    const newStatus = asString(after.status);
    const prevStatus = before ? asString(before.status) : "";

    const challengerId =
      asString(after.challengerUserId) || asString(after.playerAId);
    const challengedId =
      asString(after.challengedUserId) || asString(after.playerBId);
    const challengerName =
      asString(after.challengerDisplayName) ||
      asString(after.playerAName) ||
      "Someone";

    // New invite arrived
    if (
      newStatus === "pending" &&
      prevStatus !== "pending" &&
      challengedId
    ) {
      await sendPushToUser(challengedId, {
        title: "⚔️ Battle Challenge!",
        body: `${challengerName} challenged you to a Math Battle!`,
        url: `/battle?match=${battleId}`,
        tag: `battle-invite-${battleId}`,
        notificationType: "quiz_battle",
      });
    }

    // Match completed — notify both players
    if (
      newStatus === "completed" &&
      prevStatus !== "completed" &&
      (challengerId || challengedId)
    ) {
      const recipients = [challengerId, challengedId].filter(
        (id): id is string => Boolean(id),
      );
      await Promise.all(
        recipients.map((uid) =>
          sendPushToUser(uid, {
            title: "🎮 Battle Complete!",
            body: "Your Math Battle has ended. Check the results!",
            url: `/battle?match=${battleId}`,
            tag: `battle-complete-${battleId}`,
            notificationType: "quiz_battle",
          }),
        ),
      );
    }
  });

// ───────────────────────── Grade / Assessment Posted ────────────────────
/**
 * Fires when an attempt is written under
 * `assessmentResults/{studentId}/attempts/{attemptId}`. The studentId is
 * carried in the path so we don't need a body field.
 */
export const onGradePosted = functions.firestore
  .document("assessmentResults/{studentId}/attempts/{attemptId}")
  .onCreate(async (snap, context) => {
    const data = (snap.data() || {}) as AnyDoc;
    const studentId = context.params.studentId;
    if (!studentId) return;

    const score = asNumber(data.score, 0);
    const maxScore = asNumber(data.maxScore, asNumber(data.totalScore, 100));
    const subject = asString(data.subject) || asString(data.title) || "an assessment";

    await sendPushToUser(studentId, {
      title: "📝 New Grade Posted",
      body: `You scored ${score}/${maxScore} on ${subject}.`,
      url: "/grades",
      tag: `grade-${context.params.attemptId}`,
      notificationType: "grade_posted",
    });
  });

// ───────────────────────── Daily Reward Reminder ────────────────────────
/**
 * Daily 08:00 PHT (= 00:00 UTC) reminder for students who haven't claimed
 * today's reward yet. Reads the lastClaimedDate from the user's daily
 * rewards subcollection (existing schema) so we don't double-notify.
 */
export const dailyRewardReminder = functions.pubsub
  .schedule("0 0 * * *")
  .timeZone("Asia/Manila")
  .onRun(async () => {
    const db = admin.firestore();
    const today = new Date().toISOString().split("T")[0];

    const usersSnap = await db
      .collection("users")
      .where("role", "==", "student")
      .get();

    const targets: string[] = [];
    await Promise.all(
      usersSnap.docs.map(async (userDoc) => {
        try {
          // Subcollection layout: users/{uid}/dailyRewards/{rewardId}
          // Pick the most recent reward doc to get lastClaimedDate.
          const rewardsSnap = await userDoc.ref
            .collection("dailyRewards")
            .orderBy("lastClaimedDate", "desc")
            .limit(1)
            .get();
          const lastClaim = rewardsSnap.empty
            ? null
            : asString(rewardsSnap.docs[0].data().lastClaimedDate);
          if (lastClaim === today) return;
          targets.push(userDoc.id);
        } catch {
          // If the subcollection doesn't exist or query fails, treat as unclaimed.
          targets.push(userDoc.id);
        }
      }),
    );

    functions.logger.info(`[dailyRewardReminder] sending to ${targets.length} students`);

    await Promise.all(
      targets.map((uid) =>
        sendPushToUser(uid, {
          title: "🎁 Daily Reward Ready!",
          body: "Your daily bonus is waiting. Log in to claim it!",
          url: "/",
          tag: "daily-reward",
          notificationType: "daily_reward",
        }),
      ),
    );

    return null;
  });

// ───────────────────────── Streak Reminder ──────────────────────────────
/**
 * Daily 19:00 PHT (= 11:00 UTC) reminder for students with an active
 * streak who haven't been active today.
 */
export const streakReminder = functions.pubsub
  .schedule("0 11 * * *")
  .timeZone("Asia/Manila")
  .onRun(async () => {
    const db = admin.firestore();
    const today = new Date().toISOString().split("T")[0];

    const usersSnap = await db
      .collection("users")
      .where("role", "==", "student")
      .get();

    const targets: Array<{ uid: string; streak: number }> = [];
    for (const userDoc of usersSnap.docs) {
      const data = userDoc.data();
      const lastActivity =
        asString(data.lastActivityDate) ||
        asString(data?.gamification?.lastActivityDate);
      const streak = asNumber(
        data.streak,
        asNumber(data?.gamification?.streak, 0),
      );
      if (streak <= 0) continue;
      if (lastActivity === today) continue;
      targets.push({ uid: userDoc.id, streak });
    }

    functions.logger.info(`[streakReminder] sending to ${targets.length} students`);

    await Promise.all(
      targets.map(({ uid, streak }) =>
        sendPushToUser(uid, {
          title: "🔥 Keep Your Streak Alive!",
          body: `You have a ${streak}-day streak! Complete a lesson today to keep it going.`,
          url: "/modules",
          tag: "streak-reminder",
          notificationType: "streak_reminder",
        }),
      ),
    );

    return null;
  });

// ───────────────────────── Assignment Deadline (Callable) ───────────────
interface NotifyAssignmentDeadlinePayload {
  studentIds?: string[];
  assignmentTitle?: string;
  dueDate?: string;
  assignmentUrl?: string;
}

/**
 * Teacher-triggered callable: pushes an assignment deadline reminder to a
 * list of student UIDs. Authorisation is enforced — only teachers/admins
 * can invoke.
 */
export const notifyAssignmentDeadline = functions.https.onCall(
  async (data: NotifyAssignmentDeadlinePayload, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Sign-in required.",
      );
    }
    const callerSnap = await admin
      .firestore()
      .doc(`users/${context.auth.uid}`)
      .get();
    const callerRole = callerSnap.data()?.role;
    if (callerRole !== "teacher" && callerRole !== "admin") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only teachers/admins may notify students of deadlines.",
      );
    }

    const studentIds = Array.isArray(data?.studentIds) ? data.studentIds : [];
    const assignmentTitle = asString(data?.assignmentTitle) || "An assignment";
    const dueDate = asString(data?.dueDate) || "soon";
    const assignmentUrl = asString(data?.assignmentUrl) || "/grades";

    if (studentIds.length === 0) {
      return { sent: 0, error: "No studentIds provided." };
    }

    await Promise.all(
      studentIds.map((uid) =>
        sendPushToUser(uid, {
          title: "📚 Assignment Due Soon",
          body: `"${assignmentTitle}" is due on ${dueDate}.`,
          url: assignmentUrl,
          tag: `assignment-deadline-${assignmentTitle}`,
          notificationType: "assignment",
        }),
      ),
    );

    return { sent: studentIds.length };
  },
);

// ───────────────────────── Test Push (Callable) ─────────────────────────
/**
 * Sends a test push to the caller's own active tokens. Used by the
 * "Test Notification" button in Settings → Notifications.
 */
export const sendTestPush = functions.https.onCall(async (_data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Sign-in required.");
  }
  const result = await sendPushToUser(context.auth.uid, {
    title: "🔔 MathPulse Test Notification",
    body: "Push notifications are working! You'll receive updates here.",
    url: "/",
    tag: "test-push",
    notificationType: "system",
  });
  return result;
});

// ───────────────────────── In-App Notification Catch-All ────────────────
/**
 * Fires when the frontend (or any backend) creates an in-app notification
 * at `notifications/{userId}/items/{notificationId}`. We mirror selected
 * priority types as push so the user is alerted even when the tab is in
 * the background.
 *
 * Echo guard: notifications written via the foreground FCM bridge carry
 * `metadata.source === 'fcm_foreground'` — we skip those to avoid a loop
 * (push received → write in-app → trigger sends another push).
 */
const PUSH_RELAYED_INAPP_TYPES = new Set([
  "achievement_unlocked",
  "level_up",
  "quiz_result",
  "new_assignment",
  "teacher_announcement",
  "streak_milestone",
]);

const INAPP_TO_FCM: Record<string, "achievement" | "system" | "grade_posted" | "assignment"> = {
  achievement_unlocked: "achievement",
  level_up: "system",
  quiz_result: "grade_posted",
  new_assignment: "assignment",
  teacher_announcement: "system",
  streak_milestone: "system",
};

export const onInAppNotificationCreated = functions.firestore
  .document("notifications/{userId}/items/{notificationId}")
  .onCreate(async (snap, context) => {
    const data = (snap.data() || {}) as AnyDoc;
    const inAppType = asString(data.type);
    const metadata = (data.metadata as Record<string, unknown> | undefined) || {};

    // Echo guard
    if (metadata.source === "fcm_foreground") return;

    if (!PUSH_RELAYED_INAPP_TYPES.has(inAppType)) return;

    const fcmType = INAPP_TO_FCM[inAppType] || "system";
    const title = asString(data.title) || "MathPulse AI";
    const body = asString(data.message) || "";
    const url = asString(data.actionUrl) || "/";

    await sendPushToUser(context.params.userId, {
      title,
      body,
      url,
      tag: `inapp-${context.params.notificationId}`,
      notificationType: fcmType,
    });
  });
