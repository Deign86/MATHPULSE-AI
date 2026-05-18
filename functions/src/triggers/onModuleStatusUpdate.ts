/**
 * Trigger: onModuleStatusUpdate
 *
 * Fires when a document in the `modules` collection is updated.
 * If the status changes to 'available' or 'teacher_uploaded',
 * notifies all watchers in `module_watch_requests`.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { createNotification } from "../automations/notificationSender";

export const onModuleStatusUpdate = functions.firestore
  .document("modules/{moduleId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const moduleId = context.params.moduleId;

    const oldStatus = before.status || before.moduleStatus;
    const newStatus = after.status || after.moduleStatus;

    // Only trigger when status transitions TO available/teacher_uploaded
    if (oldStatus === newStatus) return null;
    if (newStatus !== "available" && newStatus !== "teacher_uploaded") return null;

    const db = admin.firestore();
    const moduleTitle = after.moduleTitle || after.title || moduleId;

    // Find all watchers for this module
    const watchersSnap = await db
      .collection("module_watch_requests")
      .where("moduleId", "==", moduleId)
      .get();

    if (watchersSnap.empty) {
      functions.logger.info("[MODULE_STATUS] No watchers for module", { moduleId });
      return null;
    }

    // Notify each watcher
    const batch = db.batch();
    const notifyPromises: Promise<string>[] = [];

    for (const watchDoc of watchersSnap.docs) {
      const { userId } = watchDoc.data();

      notifyPromises.push(
        createNotification({
          userId,
          type: "message",
          title: "Module Now Available! 🎉",
          message: `"${moduleTitle}" is now available. Start learning!`,
          link: `/modules?open=${moduleId}`,
        }),
      );

      // Remove the watch request (one-time notification)
      batch.delete(watchDoc.ref);
    }

    await Promise.all(notifyPromises);
    await batch.commit();

    functions.logger.info("[MODULE_STATUS] Notified watchers", {
      moduleId,
      count: watchersSnap.size,
    });

    return null;
  });
