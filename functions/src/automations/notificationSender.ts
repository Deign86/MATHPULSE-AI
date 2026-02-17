/**
 * MathPulse AI Cloud Functions - Notification Sender
 *
 * Creates notification documents in the Firestore `notifications`
 * collection, matching the schema used by the frontend
 * notificationService.ts.
 */

import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

export interface NotificationPayload {
  userId: string;
  type: "grade" | "reminder" | "message" | "achievement";
  title: string;
  message: string;
  link?: string;
}

/**
 * Create a notification document for a user.
 */
export async function createNotification(
  payload: NotificationPayload,
): Promise<string> {
  const db = admin.firestore();

  const notifRef = await db.collection("notifications").add({
    userId: payload.userId,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    link: payload.link || null,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  functions.logger.info("📬 Notification created", {
    userId: payload.userId,
    type: payload.type,
    id: notifRef.id,
  });

  return notifRef.id;
}

/**
 * Send multiple notifications in a batch.
 */
export async function sendBatchNotifications(
  notifications: NotificationPayload[],
): Promise<string[]> {
  const db = admin.firestore();
  const batch = db.batch();
  const ids: string[] = [];

  for (const notif of notifications) {
    const ref = db.collection("notifications").doc();
    batch.set(ref, {
      userId: notif.userId,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      link: notif.link || null,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    ids.push(ref.id);
  }

  await batch.commit();

  functions.logger.info(`📬 Batch: ${ids.length} notifications created`);
  return ids;
}
