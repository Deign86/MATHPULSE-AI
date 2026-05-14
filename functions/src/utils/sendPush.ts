/**
 * Shared FCM sender for MathPulse AI Cloud Functions.
 *
 * Responsibilities:
 *   - Read all `active` tokens from `users/{userId}/fcmTokens`.
 *   - Honour the user's per-category preferences stored at
 *     `users/{userId}/settings/preferences` (`pushPreferences` field).
 *     Master toggle: `pushEnabled`. Per-type toggles match
 *     `notificationType` keys ('achievement', 'quiz_battle', etc.).
 *   - Send via `admin.messaging().sendEachForMulticast` so partial
 *     failures don't abort the whole batch.
 *   - Mark expired/unregistered tokens inactive so they stop being queried
 *     on the next send.
 *
 * The `data` payload shape is mobile-parity stable: `{ url, tag,
 * notificationType }`. Future Capacitor / React Native handlers parse the
 * same fields without code changes here.
 */

import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

export type PushNotificationType =
  | "achievement"
  | "quiz_battle"
  | "daily_reward"
  | "assignment"
  | "grade_posted"
  | "streak_reminder"
  | "leaderboard"
  | "system";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  notificationType: PushNotificationType;
  icon?: string;
  imageUrl?: string;
}

const DEFAULT_ICON = "/mathpulse_logo.png";
const DEFAULT_BADGE = "/mathpulse_logo.png";

const INVALID_TOKEN_ERRORS = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

/**
 * Check whether a user has opted in for a given notification type.
 * Defaults to `true` so newly-created users still receive notifications
 * before they touch their settings. Master toggle defaults true as well.
 */
async function isPushAllowed(
  userId: string,
  notificationType: PushNotificationType,
): Promise<boolean> {
  try {
    const db = admin.firestore();
    const prefsSnap = await db
      .doc(`users/${userId}/settings/preferences`)
      .get();
    if (!prefsSnap.exists) return true;
    const data = prefsSnap.data() || {};
    const push = (data.pushPreferences || {}) as Record<string, unknown>;

    if (push.pushEnabled === false) return false;
    if (push[notificationType] === false) return false;
    return true;
  } catch (err) {
    functions.logger.warn(
      `[sendPush] failed to read preferences for ${userId}, defaulting to allow`,
      { err: (err as Error).message },
    );
    return true;
  }
}

/**
 * Fan-out a push to every active token for the given user. Silently no-ops
 * if the user has no active tokens or has disabled the relevant category.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<{ sent: number; invalidated: number }> {
  if (!userId) return { sent: 0, invalidated: 0 };

  const allowed = await isPushAllowed(userId, payload.notificationType);
  if (!allowed) {
    functions.logger.info("[sendPush] suppressed by user prefs", {
      userId,
      type: payload.notificationType,
    });
    return { sent: 0, invalidated: 0 };
  }

  const db = admin.firestore();
  const tokensSnap = await db
    .collection(`users/${userId}/fcmTokens`)
    .where("active", "==", true)
    .get();

  if (tokensSnap.empty) return { sent: 0, invalidated: 0 };

  const docsByToken = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
  for (const d of tokensSnap.docs) {
    const t = (d.data().token as string | undefined) || d.id;
    if (t) docsByToken.set(t, d);
  }
  const tokens = Array.from(docsByToken.keys());
  if (tokens.length === 0) return { sent: 0, invalidated: 0 };

  const tag = payload.tag || `mathpulse-${payload.notificationType}`;
  const url = payload.url || "/";

  const message: admin.messaging.MulticastMessage = {
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
      ...(payload.imageUrl ? { imageUrl: payload.imageUrl } : {}),
    },
    webpush: {
      notification: {
        icon: payload.icon || DEFAULT_ICON,
        badge: DEFAULT_BADGE,
        tag,
        renotify: true,
        requireInteraction: false,
      },
      fcmOptions: { link: url },
    },
    apns: {
      payload: { aps: { sound: "default" } },
      ...(payload.imageUrl ? { fcmOptions: { imageUrl: payload.imageUrl } } : {}),
    },
    data: {
      url,
      tag,
      notificationType: payload.notificationType,
      title: payload.title,
      body: payload.body,
    },
  };

  let response: admin.messaging.BatchResponse;
  try {
    response = await admin.messaging().sendEachForMulticast(message);
  } catch (err) {
    functions.logger.error("[sendPush] sendEachForMulticast threw", {
      userId,
      err: (err as Error).message,
    });
    return { sent: 0, invalidated: 0 };
  }

  let invalidated = 0;
  await Promise.all(
    response.responses.map(async (resp, i) => {
      if (resp.success) return;
      const code = resp.error?.code;
      if (code && INVALID_TOKEN_ERRORS.has(code)) {
        const token = tokens[i];
        const tokenDoc = docsByToken.get(token);
        if (tokenDoc) {
          try {
            await tokenDoc.ref.update({
              active: false,
              invalidatedAt: admin.firestore.FieldValue.serverTimestamp(),
              invalidationReason: code,
            });
            invalidated += 1;
          } catch (err) {
            functions.logger.warn("[sendPush] failed to mark token inactive", {
              userId,
              token,
              err: (err as Error).message,
            });
          }
        }
      } else {
        functions.logger.warn("[sendPush] non-fatal send failure", {
          userId,
          code,
          message: resp.error?.message,
        });
      }
    }),
  );

  functions.logger.info("[sendPush] dispatched", {
    userId,
    type: payload.notificationType,
    sent: response.successCount,
    failed: response.failureCount,
    invalidated,
  });

  return { sent: response.successCount, invalidated };
}

/**
 * Fan-out helper for sending the same push to many recipients.
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<void> {
  await Promise.all(userIds.map((uid) => sendPushToUser(uid, payload)));
}
