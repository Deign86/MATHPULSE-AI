import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { awardXP } from './gamificationService';
import { computeHonestXp, type HonestXpInput } from './honestXp';

export interface LearningEventRecord extends HonestXpInput {
  eventId: string;
  userId: string;
  lessonId: string;
  xpEarned: number;
}

export interface RecordLearningEventInput extends HonestXpInput {
  userId: string;
  lessonId: string;
}

async function createEventId(userId: string, lessonId: string): Promise<string> {
  const input = new TextEncoder().encode(`${userId}_${lessonId}`);
  const digest = await crypto.subtle.digest('SHA-256', input);
  const hexDigest = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  return hexDigest.slice(0, 32);
}

export async function recordLearningEvent(
  input: RecordLearningEventInput,
): Promise<LearningEventRecord> {
  const eventId = await createEventId(input.userId, input.lessonId);
  const eventRef = doc(db, 'learning_events', eventId);
  const existingEvent = await getDoc(eventRef);

  if (existingEvent.exists()) {
    // SAFETY: learning_events documents are written with LearningEventRecord fields by this service.
    return existingEvent.data() as LearningEventRecord;
  }

  const xpEarned = computeHonestXp(input);
  const eventRecord: LearningEventRecord = {
    eventId,
    userId: input.userId,
    lessonId: input.lessonId,
    quizScore: input.quizScore,
    hintsUsed: input.hintsUsed,
    streakDays: input.streakDays,
    xpEarned,
  };

  await setDoc(eventRef, {
    ...eventRecord,
    timestamp: serverTimestamp(),
  });
  await awardXP(input.userId, xpEarned, 'lesson_complete', `Completed lesson: ${input.lessonId}`);

  return eventRecord;
}
