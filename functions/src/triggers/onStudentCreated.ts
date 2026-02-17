/**
 * Trigger: onStudentCreated
 *
 * Fires when a new document is created in the `users` collection
 * with role === "student".  Initialises progress skeleton,
 * gamification defaults, and sends a welcome notification.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { INITIAL_GAMIFICATION, NOTIFICATION_TYPES } from "../config/constants";
import { createNotification } from "../automations/notificationSender";

export const onStudentCreated = functions.firestore
  .document("users/{userId}")
  .onCreate(async (snapshot, context) => {
    const userId = context.params.userId;
    const userData = snapshot.data();

    // Only process student accounts
    if (userData.role !== "student") {
      functions.logger.info("Non-student account created, skipping", {
        userId,
        role: userData.role,
      });
      return null;
    }

    functions.logger.info("🆕 New student created", {
      userId,
      name: userData.displayName || userData.name,
    });

    const db = admin.firestore();

    try {
      const batch = db.batch();

      // 1. Initialise progress record
      const progressRef = db.collection("progress").doc(userId);
      batch.set(progressRef, {
        userId,
        subjects: {},
        lessons: {},
        quizAttempts: [],
        totalLessonsCompleted: 0,
        totalQuizzesCompleted: 0,
        averageScore: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 2. Set gamification defaults on user profile
      batch.update(snapshot.ref, {
        ...INITIAL_GAMIFICATION,
        onboardingComplete: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await batch.commit();

      // 3. Send welcome notification
      await createNotification({
        userId,
        type: NOTIFICATION_TYPES.REMINDER,
        title: "Welcome to MathPulse!",
        message:
          "Complete your diagnostic assessment to get started with personalised learning.",
      });

      // 4. Notify assigned teacher if any
      const teacherId = userData.teacherId;
      if (teacherId) {
        await createNotification({
          userId: teacherId,
          type: NOTIFICATION_TYPES.MESSAGE,
          title: "New Student Enrolled",
          message: `${userData.displayName || userData.name || "A student"} has joined. Diagnostic assessment is pending.`,
        });
      }

      functions.logger.info("✅ Student initialised", { userId });
    } catch (error: any) {
      functions.logger.error("❌ Student initialisation failed", {
        userId,
        error: error.message,
      });
    }

    return null;
  });
