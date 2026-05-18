// src/services/tutorNudgeService.ts
// Subscribes to proactive AI tutor nudges from Firestore

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  doc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface TutorNudge {
  id: string;
  message: string;
  topic: string;
  createdAt: Date;
  consumed: boolean;
}

/**
 * Subscribe to the latest unconsumed tutor nudge for a student.
 * Returns an unsubscribe function.
 */
export function subscribeToTutorNudges(
  studentId: string,
  callback: (nudge: TutorNudge | null) => void
): Unsubscribe {
  const nudgesRef = collection(db, 'tutorNudges', studentId, 'nudges');
  const q = query(
    nudgesRef,
    where('consumed', '==', false),
    orderBy('createdAt', 'desc'),
    limit(1)
  );

  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      callback(null);
      return;
    }
    const docSnap = snapshot.docs[0];
    const data = docSnap.data();
    callback({
      id: docSnap.id,
      message: data.message,
      topic: data.topic,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      consumed: false,
    });
  }, () => callback(null));
}

/**
 * Mark a nudge as consumed so it won't show again.
 */
export async function consumeNudge(studentId: string, nudgeId: string): Promise<void> {
  const nudgeRef = doc(db, 'tutorNudges', studentId, 'nudges', nudgeId);
  await updateDoc(nudgeRef, { consumed: true });
}
