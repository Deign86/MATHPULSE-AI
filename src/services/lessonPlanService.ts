import { db } from '../lib/firebase';
import { collection, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import type { LessonPlanResponse } from './apiService';
import { apiService, getCurriculumGroundedLesson } from './apiService';
import type { CurriculumSource } from '../types/curriculum';

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

export async function generateLessonPlanWithCurriculumGrounding(
  request: {
    gradeLevel: string;
    subject?: string;
    quarter?: number;
    moduleUnit?: string;
    lessonTitle?: string;
    learningCompetency?: string;
    learnerLevel?: string;
    classSectionId?: string;
    className?: string;
    materialId?: string;
    focusTopics?: string[];
    topicCount?: number;
    preferImportedTopics?: boolean;
    allowReviewSources?: boolean;
    allowUnverifiedLesson?: boolean;
  },
  useRAG: boolean = true,
): Promise<LessonPlanResponse & { curriculumSources?: CurriculumSource[]; curriculumContext?: string }> {
  const topic = request.learningCompetency || request.lessonTitle || (request.focusTopics && request.focusTopics[0]) || 'general mathematics';
  const subject = request.subject || 'general_math';
  const quarter = request.quarter ?? 1;

  let curriculumContext = '';
  let curriculumSources: CurriculumSource[] = [];
  let retrievalConfidence: number | undefined;
  let retrievalBand: 'high' | 'medium' | 'low' | undefined;
  let retrievalQuery: string | undefined;
  let needsReview = false;

  if (useRAG) {
    try {
      const grounded = await getCurriculumGroundedLesson(topic, subject, quarter, {
        lessonTitle: request.lessonTitle,
        learningCompetency: request.learningCompetency,
        moduleUnit: request.moduleUnit,
        learnerLevel: request.learnerLevel,
      });
      curriculumSources = grounded.sources || [];
      curriculumContext = grounded.explanation || '';
      retrievalConfidence = grounded.retrievalConfidence;
      retrievalBand = grounded.retrievalBand;
      retrievalQuery = grounded.retrievalQuery;
      needsReview = grounded.needsReview ?? false;
    } catch {
      curriculumContext = '';
      curriculumSources = [];
    }
  }

  const payload = {
    ...request,
    subject,
    quarter,
    curriculumContext: curriculumContext
      ? `[CURRICULUM CONTEXT]\n${curriculumContext}`
      : undefined,
    curriculumRetrievalConfidence: retrievalConfidence,
    curriculumRetrievalBand: retrievalBand,
    curriculumRetrievalQuery: retrievalQuery,
    needsReview,
  } as unknown as {
    gradeLevel: string;
    subject?: string;
    quarter?: number;
    moduleUnit?: string;
    lessonTitle?: string;
    learningCompetency?: string;
    learnerLevel?: string;
    classSectionId?: string;
    className?: string;
    materialId?: string;
    focusTopics?: string[];
    topicCount?: number;
    preferImportedTopics?: boolean;
    allowReviewSources?: boolean;
    allowUnverifiedLesson?: boolean;
    curriculumContext?: string;
    curriculumRetrievalConfidence?: number;
    curriculumRetrievalBand?: 'high' | 'medium' | 'low';
    curriculumRetrievalQuery?: string;
    needsReview?: boolean;
  };

  const lessonPlan = await apiService.generateLessonPlan(payload);
  return {
    ...lessonPlan,
    curriculumSources,
    curriculumContext,
  };
}
