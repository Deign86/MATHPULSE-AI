/**
 * checkInService.ts — Mobile Firestore-backed daily check-in service.
 *
 * Each check-in writes to `checkIns/{autoId}` and updates the user's
 * streak on the `users/{uid}` document. Teachers can view their students'
 * check-ins for well-being insights.
 *
 * XP is awarded via gamificationService.awardXP after submit.
 * The XP amount (CHECK_IN_XP) is the single source of truth — no hardcoded
 * values in the UI layer.
 */

import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  collection,
  firestoreQuery,
  where,
  orderBy,
  limit,
  updateDoc,
  firestoreServerTimestamp,
} from '../lib/firebase';
import { db } from '../lib/firebase';

// ─── Constants ──────────────────────────────────────────────────────────────

/** XP earned for a single daily check-in. Single source of truth. */
export const CHECK_IN_XP = 10;
export const CHECK_IN_SOURCE = 'check_in';
export const CHECK_IN_REASON = 'Daily check-in';

// ─── Types ──────────────────────────────────────────────────────────────────

export type Mood = 'great' | 'good' | 'okay' | 'struggling' | 'stressed';

export interface CheckInRecord {
  id: string;
  uid: string;
  timestamp: Date;
  mood: Mood;
  note?: string;
  streakDay: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Return a Date representing 00:00:00.000 UTC for today.
 */
function todayStartUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Return a Date representing 00:00:00.000 local-midnight for today.
 * Firestore Timestamps are always UTC, but we query against the server
 * clock using a local-midnight range.
 */
function todayStartLocal(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

// ─── Submit Check-in ────────────────────────────────────────────────────────

/**
 * Submit a daily check-in for the given user.
 *
 * - Determines the streak day based on the last check-in date.
 * - Writes the check-in to `checkIns/{autoId}`.
 * - Updates `users/{uid}` with latest streak info.
 *
 * @throws If the user already checked in today (duplicate prevention).
 * @throws If the user document doesn't exist.
 */
export async function submitCheckIn(
  uid: string,
  mood: Mood,
  note?: string,
): Promise<CheckInRecord> {
  const todayStart = todayStartLocal();
  const userRef = doc(db, 'users', uid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    throw new Error('User not found');
  }

  const userData = userDoc.data();

  // Duplicate check: has the user already checked in today?
  const lastCheckInDate = userData.lastCheckInDate?.toDate?.() ?? null;
  if (lastCheckInDate) {
    const lastDayStart = new Date(lastCheckInDate);
    lastDayStart.setHours(0, 0, 0, 0);
    if (lastDayStart.getTime() === todayStart.getTime()) {
      throw new Error('Already checked in today');
    }
  }

  // Determine streak
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const previousStreak: number = userData.dailyStreak ?? userData.streak?.current ?? 0;
  let streakDay = 1;

  if (lastCheckInDate) {
    const lastDayStart = new Date(lastCheckInDate);
    lastDayStart.setHours(0, 0, 0, 0);

    if (lastDayStart.getTime() === yesterdayStart.getTime()) {
      // Consecutive day — increment streak
      streakDay = previousStreak + 1;
    }
    // Otherwise: gap — reset to 1 (already default)
  }

  // Write the check-in record
  const checkInRef = doc(collection(db, 'checkIns'));
  const record: Record<string, unknown> = {
    uid,
    timestamp: firestoreServerTimestamp(),
    mood,
    note: note ?? '',
    streakDay,
  };

  await setDoc(checkInRef, record);

  // Update user streak data
  await updateDoc(userRef, {
    lastCheckInDate: firestoreServerTimestamp(),
    dailyStreak: streakDay,
    updatedAt: firestoreServerTimestamp(),
  });

  return {
    id: checkInRef.id,
    uid,
    timestamp: new Date(),
    mood,
    note,
    streakDay,
  };
}

// ─── Today's Check-in ───────────────────────────────────────────────────────

/**
 * Fetch today's check-in for a user, if one exists.
 * Returns `null` if the user has not checked in today.
 */
export async function getTodayCheckIn(uid: string): Promise<CheckInRecord | null> {
  const todayStart = todayStartLocal();
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const q = firestoreQuery(
    collection(db, 'checkIns'),
    where('uid', '==', uid),
    where('timestamp', '>=', todayStart),
    where('timestamp', '<', todayEnd),
    orderBy('timestamp', 'desc'),
    limit(1),
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];
  const data = docSnap.data();
  return {
    id: docSnap.id,
    uid: data.uid,
    timestamp: data.timestamp?.toDate?.() ?? new Date(),
    mood: data.mood as Mood,
    note: data.note || undefined,
    streakDay: data.streakDay ?? 0,
  };
}

// ─── Student History ────────────────────────────────────────────────────────

/**
 * Get recent check-in history for a student.
 * Used by the student's own check-in screen for progress display.
 */
export async function getCheckInsForStudent(
  uid: string,
  daysBack: number = 7,
): Promise<CheckInRecord[]> {
  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  const q = firestoreQuery(
    collection(db, 'checkIns'),
    where('uid', '==', uid),
    where('timestamp', '>=', since),
    orderBy('timestamp', 'desc'),
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      uid: data.uid,
      timestamp: data.timestamp?.toDate?.() ?? new Date(),
      mood: data.mood as Mood,
      note: data.note || undefined,
      streakDay: data.streakDay ?? 0,
    };
  });
}

// ─── Teacher Insights ───────────────────────────────────────────────────────

/**
 * Get check-ins for all students of a teacher (or filtered by class).
 * Useful for the teacher insights dashboard.
 *
 * TODO: Once class-level filtering is supported, pass a classId param
 * to scope the query to a subcollection or use a composite index.
 */
export async function getCheckInsForTeacher(
  teacherId: string,
  _classId?: string,
): Promise<CheckInRecord[]> {
  // Step 1: get all student uids for this teacher
  const teacherSnap = await getDoc(doc(db, 'users', teacherId));
  if (!teacherSnap.exists()) return [];

  const studentIds: string[] = teacherSnap.data().students ?? [];

  if (studentIds.length === 0) return [];

  // Step 2: fetch recent check-ins for those students
  const today = todayStartLocal();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const q = firestoreQuery(
    collection(db, 'checkIns'),
    where('uid', 'in', studentIds.slice(0, 30)), // Firestore 'in' limit: 30
    where('timestamp', '>=', sevenDaysAgo),
    orderBy('timestamp', 'desc'),
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      uid: data.uid,
      timestamp: data.timestamp?.toDate?.() ?? new Date(),
      mood: data.mood as Mood,
      note: data.note || undefined,
      streakDay: data.streakDay ?? 0,
    };
  });
}

// ─── User Streak ────────────────────────────────────────────────────────────

/**
 * Read the current streak for a user from the user document.
 * Checks both `streak.current` (nested) and `dailyStreak` (flat) fields.
 */
export async function getUserStreak(uid: string): Promise<number> {
  const userSnap = await getDoc(doc(db, 'users', uid));
  if (!userSnap.exists()) return 0;

  const data = userSnap.data();
  return data.streak?.current ?? data.dailyStreak ?? 0;
}
