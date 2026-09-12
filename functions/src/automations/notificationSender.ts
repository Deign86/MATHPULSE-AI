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
  type: "grade" | "reminder" | "message" | "achievement" | "risk_alert";
  title: string;
  message: string;
  link?: string;
  studentId?: string;
  wri?: number;
  riskStatus?: string;
}

/**
 * Create a notification document for a user.
 */
export async function createNotification(
  payload: NotificationPayload,
): Promise<string> {
  const db = admin.firestore();

  const notificationRecord: admin.firestore.DocumentData = {
    userId: payload.userId,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    link: payload.link || null,
    actionUrl: payload.link || null,
    isRead: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (payload.studentId) notificationRecord.studentId = payload.studentId;
  if (payload.wri !== undefined) notificationRecord.wri = payload.wri;
  if (payload.riskStatus) notificationRecord.riskStatus = payload.riskStatus;

  const notifRef = await db
    .collection("notifications")
    .doc(payload.userId)
    .collection("items")
    .add(notificationRecord);

  functions.logger.info("[NOTIFY] Notification created", {
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
    const ref = db
      .collection("notifications")
      .doc(notif.userId)
      .collection("items")
      .doc();

    const notificationRecord: admin.firestore.DocumentData = {
      userId: notif.userId,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      link: notif.link || null,
      actionUrl: notif.link || null,
      isRead: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (notif.studentId) notificationRecord.studentId = notif.studentId;
    if (notif.wri !== undefined) notificationRecord.wri = notif.wri;
    if (notif.riskStatus) notificationRecord.riskStatus = notif.riskStatus;

    batch.set(ref, notificationRecord);
    ids.push(ref.id);
  }

  await batch.commit();

  functions.logger.info(`[NOTIFY] Batch: ${ids.length} notifications created`);
  return ids;
}
