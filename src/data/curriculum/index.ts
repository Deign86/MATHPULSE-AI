import { getLessonById } from './types';
import type { Lesson } from '../subjects';

export function buildLessonFromCurriculum(lessonId: string, fallbackTitle?: string): Partial<Lesson> & { lessonId: string } {
  const curriculum = getLessonById(lessonId);

  if (!curriculum) {
    return {
      lessonId,
      title: fallbackTitle || `Lesson ${lessonId}`,
    };
  }

  return {
    lessonId: curriculum.lessonId,
    title: curriculum.lessonTitle,
    subjectId: curriculum.subjectId,
    subject: curriculum.subject,
    quarter: curriculum.quarter,
    competencyCode: curriculum.competencyCode,
    learningCompetency: curriculum.learningCompetency,
    storagePath: curriculum.storagePath,
    sourceFile: curriculum.sourceFile,
  } as any;
}

export function enrichLessonWithCurriculum(lesson: Lesson, lessonId: string): Lesson {
  const curriculum = getLessonById(lessonId);
  if (!curriculum) return lesson;

  return {
    ...lesson,
    id: lessonId,
    title: curriculum.lessonTitle,
    subject: curriculum.subject,
    quarter: curriculum.quarter,
  } as any;
}