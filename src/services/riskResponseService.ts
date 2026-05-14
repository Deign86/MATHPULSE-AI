// src/services/riskResponseService.ts
// WRI Response Engine — Automated system behaviors per risk band
// Each band triggers a different automated response when WRI status changes.

import { doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { StudentRiskProfile } from '../types/models';

export type RiskStatus = NonNullable<StudentRiskProfile['riskStatus']>;

// ─── Teacher Alert Messages ───────────────────────────────────────────────────

export const TEACHER_ALERT_MESSAGES: Partial<
  Record<RiskStatus, (studentName: string, wri: number) => string>
> = {
  intervene: (name, wri) =>
    `📘 ${name} is approaching the intervention threshold (WRI: ${wri}). Remedial modules have been activated. Please review their progress.`,
  critical: (name, wri) =>
    `⚠️ ${name} requires urgent attention (WRI: ${wri}). A structured intervention checklist has been generated. Please act soon.`,
  at_risk: (name, wri) =>
    `🚨 ${name} is at critical risk of failing (WRI: ${wri}). Your acknowledgment is required before their learning path continues.`,
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Trigger automated risk responses when a student's WRI status changes.
 * Only fires if the status actually changed (not on every recalc).
 *
 * @param studentId   Firestore user ID (LRN)
 * @param newStatus   Newly computed risk status
 * @param previousStatus  Previous risk status (from before recalc)
 * @param wri         Current WRI score
 */
export async function triggerRiskResponse(
  studentId: string,
  newStatus: RiskStatus,
  previousStatus: RiskStatus | null,
  wri: number
): Promise<void> {
  // Only fire if status actually changed
  if (newStatus === previousStatus) return;

  console.log(`[riskResponse] ${studentId}: ${previousStatus ?? 'null'} → ${newStatus} (WRI ${wri})`);

  switch (newStatus) {
    case 'watch':
      await adjustModuleDifficulty(studentId, 'easier');
      await increaseHintAvailability(studentId, true);
      await boostXPMultiplier(studentId, 1.2);
      break;

    case 'intervene':
      await adjustModuleDifficulty(studentId, 'remedial');
      await increaseHintAvailability(studentId, true);
      await boostXPMultiplier(studentId, 1.5);
      await increaseTutorCheckInFrequency(studentId, 2);
      await notifyTeacher(studentId, 'intervene', wri);
      break;

    case 'critical':
      await adjustModuleDifficulty(studentId, 'remedial');
      await lockNonEssentialFeatures(studentId, [
        'leaderboard',
        'cosmetic_shop',
        'bonus_challenges',
      ]);
      await increaseTutorCheckInFrequency(studentId, 3);
      await notifyTeacher(studentId, 'critical', wri);
      await generateInterventionChecklist(studentId);
      break;

    case 'at_risk':
      await adjustModuleDifficulty(studentId, 'remedial');
      await lockNonEssentialFeatures(studentId, [
        'leaderboard',
        'cosmetic_shop',
        'bonus_challenges',
        'optional_modules',
      ]);
      await increaseTutorCheckInFrequency(studentId, 5);
      await notifyTeacher(studentId, 'at_risk', wri);
      await generateInterventionChecklist(studentId);
      await requireTeacherAcknowledgment(studentId);
      break;

    case 'safe':
      await adjustModuleDifficulty(studentId, 'normal');
      await increaseHintAvailability(studentId, false);
      await boostXPMultiplier(studentId, 1.0);
      await unlockAllFeatures(studentId);
      await increaseTutorCheckInFrequency(studentId, 1);
      break;
  }
}

// ─── Stub Helpers (to be implemented by feature owners) ───────────────────────

/**
 * Adjust module difficulty for a student.
 * @param mode 'easier' | 'remedial' | 'normal'
 */
export async function adjustModuleDifficulty(
  studentId: string,
  mode: 'easier' | 'remedial' | 'normal'
): Promise<void> {
  const ref = doc(db, 'users', studentId);
  await updateDoc(ref, {
    moduleDifficulty: mode,
    moduleDifficultyUpdatedAt: serverTimestamp(),
  });
  console.log(`[riskResponse] ${studentId}: module difficulty → ${mode}`);
}

/**
 * Unlock or lock additional hints on quizzes.
 * @param enabled true = unlock more hints, false = reset to default
 */
export async function increaseHintAvailability(
  studentId: string,
  enabled: boolean
): Promise<void> {
  const ref = doc(db, 'users', studentId);
  await updateDoc(ref, {
    extraHintsEnabled: enabled,
    extraHintsUpdatedAt: serverTimestamp(),
  });
  console.log(`[riskResponse] ${studentId}: extra hints → ${enabled}`);
}

/**
 * Apply an XP multiplier to re-engage the student.
 * @param multiplier 1.0 = baseline, 1.2 = subtle boost, 1.5 = larger incentive
 */
export async function boostXPMultiplier(
  studentId: string,
  multiplier: number
): Promise<void> {
  const ref = doc(db, 'users', studentId);
  await updateDoc(ref, {
    xpMultiplier: multiplier,
    xpMultiplierUpdatedAt: serverTimestamp(),
  });
  console.log(`[riskResponse] ${studentId}: XP multiplier → ${multiplier}x`);
}

/**
 * Increase AI tutor check-in frequency.
 * @param factor 1 = normal, 2 = 2x, 3 = 3x, 5 = 5x
 */
export async function increaseTutorCheckInFrequency(
  studentId: string,
  factor: number
): Promise<void> {
  const ref = doc(db, 'users', studentId);
  await updateDoc(ref, {
    tutorCheckInFactor: factor,
    tutorCheckInUpdatedAt: serverTimestamp(),
  });
  console.log(`[riskResponse] ${studentId}: tutor check-in factor → ${factor}x`);
}

/**
 * Send a risk_alert notification to the student's teacher.
 */
export async function notifyTeacher(
  studentId: string,
  status: RiskStatus,
  wri: number
): Promise<void> {
  // Fetch student doc to get teacherId and name
  const { getDoc } = await import('firebase/firestore');
  const studentRef = doc(db, 'users', studentId);
  const snap = await getDoc(studentRef);
  if (!snap.exists()) {
    console.warn(`[riskResponse] notifyTeacher: student ${studentId} not found`);
    return;
  }

  const data = snap.data();
  const teacherId = data?.teacherId as string | undefined;
  const studentName =
    (data?.displayName as string) ||
    (data?.name as string) ||
    studentId;

  if (!teacherId) {
    console.warn(`[riskResponse] notifyTeacher: no teacherId for ${studentId}`);
    return;
  }

  const messageFn = TEACHER_ALERT_MESSAGES[status];
  if (!messageFn) return;

  const message = messageFn(studentName, wri);

  // Write to teacher's notifications subcollection
  const notifRef = doc(db, 'notifications', `${teacherId}_${Date.now()}`);
  await setDoc(notifRef, {
    userId: teacherId,
    type: 'risk_alert',
    title:
      status === 'intervene'
        ? 'Student Intervention Needed'
        : status === 'critical'
        ? 'Urgent: Student Critical'
        : 'Emergency: Student At Risk',
    message,
    studentId,
    studentName,
    wri,
    riskStatus: status,
    read: false,
    createdAt: serverTimestamp(),
  });

  console.log(`[riskResponse] ${studentId}: teacher notification sent → ${status}`);
}

/**
 * Generate an intervention checklist for the teacher.
 * Creates a document in the `interventionChecklists` collection.
 */
export async function generateInterventionChecklist(studentId: string): Promise<void> {
  const checklistRef = doc(db, 'interventionChecklists', studentId);
  await setDoc(
    checklistRef,
    {
      studentId,
      items: [
        { id: '1', text: 'Review recent quiz performance', completed: false },
        { id: '2', text: 'Schedule 1-on-1 check-in', completed: false },
        { id: '3', text: 'Assign remedial module', completed: false },
        { id: '4', text: 'Contact parent/guardian', completed: false },
        { id: '5', text: 'Monitor weekly progress', completed: false },
      ],
      generatedAt: serverTimestamp(),
      acknowledged: false,
    },
    { merge: true }
  );
  console.log(`[riskResponse] ${studentId}: intervention checklist generated`);
}

/**
 * Gate student progress until the teacher explicitly acknowledges the at-risk state.
 * Sets a flag on the student doc that blocks non-essential progress.
 */
export async function requireTeacherAcknowledgment(studentId: string): Promise<void> {
  const ref = doc(db, 'users', studentId);
  await updateDoc(ref, {
    teacherAckRequired: true,
    teacherAckRequiredAt: serverTimestamp(),
    teacherAcknowledged: false,
  });
  console.log(`[riskResponse] ${studentId}: teacher acknowledgment required`);
}

/**
 * Temporarily hide non-essential features (leaderboard, shop, etc.).
 * @param features Array of feature keys to lock
 */
export async function lockNonEssentialFeatures(
  studentId: string,
  features: string[]
): Promise<void> {
  const ref = doc(db, 'users', studentId);
  await updateDoc(ref, {
    lockedFeatures: features,
    lockedFeaturesUpdatedAt: serverTimestamp(),
  });
  console.log(`[riskResponse] ${studentId}: locked features → ${features.join(', ')}`);
}

/**
 * Restore all previously locked features (recovery path).
 */
export async function unlockAllFeatures(studentId: string): Promise<void> {
  const ref = doc(db, 'users', studentId);
  await updateDoc(ref, {
    lockedFeatures: [],
    lockedFeaturesUpdatedAt: serverTimestamp(),
  });
  console.log(`[riskResponse] ${studentId}: all features unlocked`);
}
