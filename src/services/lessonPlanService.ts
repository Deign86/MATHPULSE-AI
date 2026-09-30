import { db } from '../lib/firebase';
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { LessonPlanResponse } from './apiService';
import { apiFetch, apiService, getCurriculumGroundedLesson } from './apiService';
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
  const {
    publishReady: _publishReady,
    sourceLegitimacy: _sourceLegitimacy,
    curriculumGrounding: _curriculumGrounding,
    needsReview: _needsReview,
    selfValidation: _selfValidation,
    ...draftPayload
  } = lesson;
  // SAFETY: 'draft' is a member of the GeneratedLessonPlanStatus union persisted with the draft.
  await setDoc(lessonRef, {
    ...draftPayload,
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
  await apiFetch<{ success: boolean; lessonId: string; status: GeneratedLessonPlanStatus }>(
    `/api/lesson-plans/${encodeURIComponent(lessonId)}/publish`,
    { method: 'POST' },
  );
}

/** Caller-facing request shape for grounded lesson-plan generation. */
interface LessonPlanGroundingRequest {
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
}

/** Request payload sent to the lesson-plan API, extended with curriculum grounding metadata. */
interface LessonPlanPayload extends LessonPlanGroundingRequest {
  curriculumContext?: string;
  curriculumRetrievalConfidence?: number;
  curriculumRetrievalBand?: 'high' | 'medium' | 'low';
  curriculumRetrievalQuery?: string;
  needsReview?: boolean;
}

export async function generateLessonPlanWithCurriculumGrounding(
  request: LessonPlanGroundingRequest,
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

  const payload: LessonPlanPayload = {
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
  };

  const lessonPlan = await apiService.generateLessonPlan(payload);
  return {
    ...lessonPlan,
    curriculumSources,
    curriculumContext,
  };
}
