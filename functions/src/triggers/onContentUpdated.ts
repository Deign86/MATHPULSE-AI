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
import { createRuntimeCacheKey, runtimeCache } from "../services/runtimeCache";

const CONTENT_UPDATE_TEACHER_LIST_CACHE_TTL_MS = 30 * 1000;

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

    functions.logger.info("[CONTENT] Content change detected", {
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
        const teacherCacheKey = createRuntimeCacheKey("content-update", "teacher-list");
        let teacherIds = runtimeCache.get<string[]>(teacherCacheKey);

        if (!teacherIds) {
          const teachersSnap = await db
            .collection("users")
            .where("role", "==", "teacher")
            .limit(50) // Safety limit
            .get();

          teacherIds = teachersSnap.docs.map((teacherDoc) => teacherDoc.id);
          runtimeCache.set(teacherCacheKey, teacherIds, CONTENT_UPDATE_TEACHER_LIST_CACHE_TTL_MS);
        }

        const notifications: Promise<string>[] = [];
        for (const teacherId of teacherIds) {
          notifications.push(
            createNotification({
              userId: teacherId,
              type: NOTIFICATION_TYPES.MESSAGE,
              title: "Curriculum Update",
              message: `${contentType} "${data?.title || contentId}" has been ${action}d. You may want to review affected quizzes.`,
            }),
          );
        }

        await Promise.all(notifications);
        functions.logger.info("[OK] Teachers notified of content change", {
          contentId,
          teachersNotified: notifications.length,
        });
      }
    } catch (error: any) {
      functions.logger.error("[ERROR] Content update processing failed", {
        contentId,
        error: error.message,
      });
    }

    return null;
  });
