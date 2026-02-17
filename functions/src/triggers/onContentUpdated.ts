/**
 * Trigger: onContentUpdated
 *
 * Fires when curriculum content is created, updated or deleted
 * in the `curriculumContent` collection.  Logs the change and
 * notifies teachers who may be affected.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { NOTIFICATION_TYPES } from "../config/constants";
import { createNotification } from "../automations/notificationSender";

export const onContentUpdated = functions.firestore
  .document("curriculumContent/{contentId}")
  .onWrite(async (change, context) => {
    const contentId = context.params.contentId;

    // Determine action type
    let action: string;
    let data: any;
    if (!change.before.exists) {
      action = "create";
      data = change.after.data();
    } else if (!change.after.exists) {
      action = "delete";
      data = change.before.data();
    } else {
      action = "update";
      data = change.after.data();
    }

    const contentType = data?.contentType || "content";
    const adminId = data?.updatedBy || data?.createdBy || "system";
    const subjectId = data?.subjectId || null;

    functions.logger.info("📚 Content change detected", {
      contentId,
      action,
      contentType,
      adminId,
    });

    const db = admin.firestore();

    try {
      // Log the content change
      await db.collection("contentAuditLog").add({
        contentId,
        action,
        contentType,
        adminId,
        subjectId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        details: data?.title || data?.name || contentId,
      });

      // Notify teachers about curriculum changes that may affect their classes
      if (subjectId) {
        // Find teachers who teach this subject (query teacher profiles)
        const teachersSnap = await db
          .collection("users")
          .where("role", "==", "teacher")
          .limit(50) // Safety limit
          .get();

        const notifications: Promise<string>[] = [];
        for (const teacherDoc of teachersSnap.docs) {
          notifications.push(
            createNotification({
              userId: teacherDoc.id,
              type: NOTIFICATION_TYPES.MESSAGE,
              title: "Curriculum Update",
              message: `${contentType} "${data?.title || contentId}" has been ${action}d. You may want to review affected quizzes.`,
            }),
          );
        }

        await Promise.all(notifications);
        functions.logger.info("✅ Teachers notified of content change", {
          contentId,
          teachersNotified: notifications.length,
        });
      }
    } catch (error: any) {
      functions.logger.error("❌ Content update processing failed", {
        contentId,
        error: error.message,
      });
    }

    return null;
  });
