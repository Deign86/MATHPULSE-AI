import { db } from '../lib/firebase';
import { collection, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import type { LessonPlanResponse } from './apiService';

export type GeneratedLessonPlanStatus = 'draft' | 'published';

export interface GeneratedLessonPlanRecord extends LessonPlanResponse {
  id: string;
  teacherId: string;
  teacherName?: string;
  studentId?: string;
  studentName?: string;
  status: GeneratedLessonPlanStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
  publishedAt?: unknown;
}

export async function saveGeneratedLessonPlan(
  lesson: LessonPlanResponse,
  teacherId: string,
  context?: {
    teacherName?: string;
    studentId?: string;
    studentName?: string;
  },
): Promise<string> {
  const lessonRef = doc(collection(db, 'generatedLessonPlans'));
  await setDoc(lessonRef, {
    ...lesson,
    teacherId,
    teacherName: context?.teacherName || null,
    studentId: context?.studentId || null,
    studentName: context?.studentName || null,
    status: 'draft' as GeneratedLessonPlanStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return lessonRef.id;
}

export async function publishLessonPlan(lessonId: string): Promise<void> {
  const lessonRef = doc(db, 'generatedLessonPlans', lessonId);
  const snapshot = await getDoc(lessonRef);
  if (!snapshot.exists()) {
    throw new Error('Lesson draft not found. Save draft before publishing.');
  }

  const data = snapshot.data() as Partial<GeneratedLessonPlanRecord>;
  if (!data.publishReady) {
    throw new Error('Lesson is not publish-ready. Resolve source legitimacy and validation issues first.');
  }

  await updateDoc(lessonRef, {
    status: 'published' as GeneratedLessonPlanStatus,
    publishedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
