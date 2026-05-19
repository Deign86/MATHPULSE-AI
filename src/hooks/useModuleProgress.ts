import { useCallback, useMemo } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { UserProgress, LessonProgress } from '../types/models';

interface UseModuleProgressOptions {
  userProgress: UserProgress | null;
  userId: string | undefined;
  subjectId: string | null;
  moduleId: string;
  totalLessons: number;
  totalQuizzes: number;
}

export function useModuleProgress({
  userProgress,
  userId,
  subjectId,
  moduleId,
  totalLessons,
  totalQuizzes,
}: UseModuleProgressOptions) {
  const moduleProgress = useMemo(() => {
    if (!subjectId) return null;
    return userProgress?.subjects?.[subjectId]?.modulesProgress?.[moduleId] ?? null;
  }, [userProgress, subjectId, moduleId]);

  const completedLessonIds = useMemo(
    () => new Set(moduleProgress?.lessonsCompleted ?? []),
    [moduleProgress?.lessonsCompleted],
  );

  const completedQuizIds = useMemo(
    () => new Set(moduleProgress?.quizzesCompleted ?? []),
    [moduleProgress?.quizzesCompleted],
  );

  const isModuleCompleted = useMemo(() => {
    if (!totalLessons && !totalQuizzes) return false;
    return completedLessonIds.size >= totalLessons && completedQuizIds.size >= totalQuizzes;
  }, [completedLessonIds.size, completedQuizIds.size, totalLessons, totalQuizzes]);

  const getLessonProgress = useCallback(
    (lessonId: string): LessonProgress | null => {
      return userProgress?.lessons?.[lessonId] ?? null;
    },
    [userProgress?.lessons],
  );

  const isStudyMaterialsCompleted = useCallback(
    (lessonId: string): boolean => {
      return userProgress?.lessons?.[lessonId]?.studyMaterialsCompleted === true;
    },
    [userProgress?.lessons],
  );

  const isLessonQuizCompleted = useCallback(
    (lessonId: string): boolean => {
      return userProgress?.lessons?.[lessonId]?.quizCompleted === true;
    },
    [userProgress?.lessons],
  );

  const getLessonQuizScore = useCallback(
    (lessonId: string): number | undefined => {
      return userProgress?.lessons?.[lessonId]?.quizScore;
    },
    [userProgress?.lessons],
  );

  const markStudyMaterialsComplete = useCallback(
    async (lessonId: string) => {
      if (!userId) return;
      const progressRef = doc(db, 'progress', userId);
      await setDoc(
        progressRef,
        {
          [`lessons.${lessonId}.lessonId`]: lessonId,
          [`lessons.${lessonId}.studyMaterialsCompleted`]: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    },
    [userId],
  );

  // Get last quiz score for a standalone quiz from quizAttempts
  const getLastQuizScore = useCallback(
    (quizId: string): { score: number; total: number } | null => {
      const attempts = userProgress?.quizAttempts?.filter((a) => a.quizId === quizId);
      if (!attempts?.length) return null;
      const last = attempts[attempts.length - 1];
      return { score: Math.round(last.score / 10), total: 10 };
    },
    [userProgress?.quizAttempts],
  );

  return {
    moduleProgress,
    completedLessonIds,
    completedQuizIds,
    isModuleCompleted,
    getLessonProgress,
    isStudyMaterialsCompleted,
    isLessonQuizCompleted,
    getLessonQuizScore,
    markStudyMaterialsComplete,
    getLastQuizScore,
  };
}
