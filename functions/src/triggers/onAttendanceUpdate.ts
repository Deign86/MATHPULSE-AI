/**
 * Trigger: onAttendanceUpdate
 *
 * Fires when a student's attendance record is updated.
 * Checks for at-risk attendance patterns and sends alerts
 * to teachers when attendance drops below thresholds.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { NOTIFICATION_TYPES } from "../config/constants";
import { createNotification } from "../automations/notificationSender";

const LOW_ATTENDANCE_THRESHOLD = 75; // percent
const CRITICAL_ATTENDANCE_THRESHOLD = 50;

export const onAttendanceUpdate = functions.firestore
  .document("attendance/{recordId}")
  .onWrite(async (change, context) => {
    const recordId = context.params.recordId;

    // Deleted → nothing to do
    if (!change.after.exists) {
      return null;
    }

    const data = change.after.data()!;
    const previousData = change.before.exists ? change.before.data()! : null;

    const lrn: string | undefined = data.lrn;
    const attendanceRate: number | undefined = data.attendanceRate;

    if (!lrn || attendanceRate === undefined) {
      return null;
    }

    functions.logger.info("[ATTENDANCE] Attendance update", {
      recordId,
      lrn,
      attendanceRate,
    });

    const db = admin.firestore();

    try {
      // Only alert if attendance dropped below a threshold
      const previousRate = previousData?.attendanceRate ?? 100;

      if (
        attendanceRate < CRITICAL_ATTENDANCE_THRESHOLD &&
        previousRate >= CRITICAL_ATTENDANCE_THRESHOLD
      ) {
        // Critical attendance — notify teacher
        const studentDoc = await db.collection("users").doc(lrn).get();
        const studentData = studentDoc.data();
        const teacherId = studentData?.teacherId;
        const name = studentData?.displayName || studentData?.name || lrn;

        if (teacherId) {
          await createNotification({
            userId: teacherId,
            type: NOTIFICATION_TYPES.MESSAGE,
            title: "Critical Attendance Alert",
            message: `${name}'s attendance has dropped to ${attendanceRate}%. Immediate intervention recommended.`,
          });
        }

        // Also update user risk factors
        await db.collection("users").doc(lrn).update({
          attendanceAlert: "critical",
          lastAttendanceRate: attendanceRate,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        functions.logger.warn("[WARN] Critical attendance", { lrn, attendanceRate });
      } else if (
        attendanceRate < LOW_ATTENDANCE_THRESHOLD &&
        previousRate >= LOW_ATTENDANCE_THRESHOLD
      ) {
        // Low attendance — send reminder to student
        await createNotification({
          userId: lrn,
          type: NOTIFICATION_TYPES.REMINDER,
          title: "Attendance Reminder",
          message: `Your attendance is at ${attendanceRate}%. Regular attendance helps you stay on track!`,
        });

        await db.collection("users").doc(lrn).update({
          attendanceAlert: "low",
          lastAttendanceRate: attendanceRate,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        functions.logger.info("[LOW] Low attendance flagged", { lrn, attendanceRate });
      }
    } catch (error: any) {
      functions.logger.error("[ERROR] Attendance processing failed", {
        recordId,
        error: error.message,
      });
    }

    return null;
  });
