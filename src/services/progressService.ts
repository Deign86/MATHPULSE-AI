import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  UserProgress,
  ModuleProgress,
  SubjectProgress,
  LessonProgress,
  QuizAttempt,
  QuizAnswer,
} from '../types/models';

const ensureProgressDocExists = async (userId: string) => {
  const progressRef = doc(db, 'progress', userId);
  let snap = await getDoc(progressRef);
  if (!snap.exists()) {
    await initializeUserProgress(userId);
    snap = await getDoc(progressRef);
  }
  return { progressRef, snap };
};

// Initialize user progress
export const initializeUserProgress = async (userId: string): Promise<UserProgress> => {
  const progressData: UserProgress = {
    userId,
    subjects: {},
    lessons: {},
    quizAttempts: [],
    totalLessonsCompleted: 0,
    totalQuizzesCompleted: 0,
    averageScore: 0,
    updatedAt: new Date(),
  };

  await setDoc(doc(db, 'progress', userId), progressData);
  return progressData;
};

// Get user progress
export const getUserProgress = async (userId: string): Promise<UserProgress | null> => {
  try {
    const docRef = doc(db, 'progress', userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as UserProgress;
    }

    // Initialize if doesn't exist
    return await initializeUserProgress(userId);
  } catch (error) {
    console.error('Error getting user progress:', error);
    return null;
  }
};

// Subscribe to user progress (realtime)
export const subscribeToUserProgress = (
  userId: string,
  onChange: (progress: UserProgress | null) => void
): (() => void) => {
  const docRef = doc(db, 'progress', userId);
  return onSnapshot(
    docRef,
    (snap) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }
      const data = snap.data();
      onChange({
        ...data,
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      } as UserProgress);
    },
    (error) => {
      console.error('Error subscribing to user progress:', error);
      onChange(null);
    }
  );
};

// Update lesson progress percentage (partial completion)
export const updateLessonProgressPercent = async (
  userId: string,
  lessonId: string,
  progressPercent: number
): Promise<void> => {
  try {
    const { progressRef, snap } = await ensureProgressDocExists(userId);

    // Never decrease saved progress (re-opening a lesson should not reset progress).
    const existingPctRaw = (snap.data() as any)?.lessons?.[lessonId]?.progressPercent;
    const existingPct = typeof existingPctRaw === 'number' && Number.isFinite(existingPctRaw) ? existingPctRaw : 0;
    const nextPct = Math.max(existingPct, Math.max(0, Math.min(100, progressPercent)));

    // Use updateDoc field paths so we truly update nested maps.
    await updateDoc(progressRef, {
      [`lessons.${lessonId}.lessonId`]: lessonId,
      [`lessons.${lessonId}.progressPercent`]: nextPct,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating lesson progress percent:', error);
  }
};

// Complete a lesson
export const completeLesson = async (
  userId: string,
  subjectId: string,
  moduleId: string,
  lessonId: string,
  timeSpent: number,
  xpReward: number = 50
): Promise<void> => {
  try {
    const { progressRef, snap } = await ensureProgressDocExists(userId);
    const progressData = snap.data() as UserProgress;

    // Update lesson progress
    const lessonProgress: LessonProgress = {
      lessonId,
      completed: true,
      completedAt: new Date(),
      timeSpent,
      progressPercent: 100,
    };

    // Update subject and module progress
    if (!progressData.subjects) progressData.subjects = {};
    if (!progressData.subjects[subjectId]) {
      progressData.subjects[subjectId] = {
        subjectId,
        progress: 0,
        completedModules: 0,
        totalModules: 0,
        modulesProgress: {},
      };
    }

    const subjectProgress = progressData.subjects[subjectId];
    if (!subjectProgress.modulesProgress[moduleId]) {
      subjectProgress.modulesProgress[moduleId] = {
        moduleId,
        subjectId,
        progress: 0,
        lessonsCompleted: [],
        quizzesCompleted: [],
        startedAt: new Date(),
        lastAccessedAt: new Date(),
      };
    }

    const moduleProgress = subjectProgress.modulesProgress[moduleId];

    const isNewCompletion = !moduleProgress.lessonsCompleted.includes(lessonId);
    if (!moduleProgress.lessonsCompleted.includes(lessonId)) {
      moduleProgress.lessonsCompleted.push(lessonId);
      moduleProgress.lastAccessedAt = new Date();
    }

    // Update Firestore
    await updateDoc(progressRef, {
      [`lessons.${lessonId}`]: lessonProgress,
      [`subjects.${subjectId}.modulesProgress.${moduleId}`]: moduleProgress,
      totalLessonsCompleted: increment(isNewCompletion ? 1 : 0),
      updatedAt: serverTimestamp(),
    });

    // Award XP
    await awardXP(userId, xpReward, 'lesson_complete', `Completed lesson: ${lessonId}`);
  } catch (error) {
    console.error('Error completing lesson:', error);
    throw error;
  }
};

// Complete a quiz
export const completeQuiz = async (
  userId: string,
  subjectId: string,
  moduleId: string,
  quizId: string,
  score: number,
  answers: QuizAnswer[],
  timeSpent: number
): Promise<void> => {
  try {
    const { progressRef, snap } = await ensureProgressDocExists(userId);
    const progressData = snap.data() as UserProgress;

    // Create quiz attempt
    const quizAttempt: QuizAttempt = {
      quizId,
      attemptNumber: (progressData.quizAttempts?.filter(q => q.quizId === quizId).length || 0) + 1,
      score,
      completedAt: new Date(),
      timeSpent,
      answers,
    };

    // Calculate XP based on score
    const xpReward = Math.floor((score / 100) * 100); // 0-100 XP based on score

    // Update module progress
    if (!progressData.subjects) progressData.subjects = {};
    if (!progressData.subjects[subjectId]) {
      progressData.subjects[subjectId] = {
        subjectId,
        progress: 0,
        completedModules: 0,
        totalModules: 0,
        modulesProgress: {},
      };
    }

    const subjectProgress = progressData.subjects[subjectId];
    if (!subjectProgress.modulesProgress[moduleId]) {
      subjectProgress.modulesProgress[moduleId] = {
        moduleId,
        subjectId,
        progress: 0,
        lessonsCompleted: [],
        quizzesCompleted: [],
        startedAt: new Date(),
        lastAccessedAt: new Date(),
      };
    }

    const moduleProgress = subjectProgress.modulesProgress[moduleId];

    const isNewCompletion = !moduleProgress.quizzesCompleted.includes(quizId);
    if (!moduleProgress.quizzesCompleted.includes(quizId)) {
      moduleProgress.quizzesCompleted.push(quizId);
      moduleProgress.lastAccessedAt = new Date();
    }

    // Update Firestore
    await updateDoc(progressRef, {
      quizAttempts: [...(progressData.quizAttempts || []), quizAttempt],
      [`subjects.${subjectId}.modulesProgress.${moduleId}`]: moduleProgress,
      totalQuizzesCompleted: increment(isNewCompletion ? 1 : 0),
      updatedAt: serverTimestamp(),
    });

    // Award XP
    await awardXP(userId, xpReward, 'quiz_complete', `Completed quiz: ${quizId} (Score: ${score}%)`);
  } catch (error) {
    console.error('Error completing quiz:', error);
    throw error;
  }
};

// Update module progress percentage
export const updateModuleProgress = async (
  userId: string,
  subjectId: string,
  moduleId: string,
  progress: number
): Promise<void> => {
  try {
    const { progressRef } = await ensureProgressDocExists(userId);
    await updateDoc(progressRef, {
      [`subjects.${subjectId}.modulesProgress.${moduleId}.progress`]: progress,
      [`subjects.${subjectId}.modulesProgress.${moduleId}.lastAccessedAt`]: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating module progress:', error);
    throw error;
  }
};

export const recalculateAndUpdateModuleProgress = async (
  userId: string,
  subjectId: string,
  moduleId: string,
  totalLessons: number,
  totalQuizzes: number
): Promise<number> => {
  const progress = await getUserProgress(userId);
  const moduleProgress = progress?.subjects?.[subjectId]?.modulesProgress?.[moduleId];
  const completedLessons = moduleProgress?.lessonsCompleted?.length ?? 0;
  const completedQuizzes = moduleProgress?.quizzesCompleted?.length ?? 0;
  const totalItems = totalLessons + totalQuizzes;
  const pct = totalItems > 0 ? Math.min(100, Math.round(((completedLessons + completedQuizzes) / totalItems) * 100)) : 0;
  await updateModuleProgress(userId, subjectId, moduleId, pct);
  return pct;
};

// Update subject progress
export const updateSubjectProgress = async (
  userId: string,
  subjectId: string,
  progress: number,
  completedModules: number,
  totalModules: number
): Promise<void> => {
  try {
    const { progressRef } = await ensureProgressDocExists(userId);
    await updateDoc(progressRef, {
      [`subjects.${subjectId}.progress`]: progress,
      [`subjects.${subjectId}.completedModules`]: completedModules,
      [`subjects.${subjectId}.totalModules`]: totalModules,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating subject progress:', error);
    throw error;
  }
};

// Award XP to user
const awardXP = async (
  userId: string,
  xpAmount: number,
  type: string,
  description: string
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      currentXP: increment(xpAmount),
      totalXP: increment(xpAmount),
      updatedAt: serverTimestamp(),
    });

    // Log XP activity
    const activityRef = doc(collection(db, 'xpActivities'));
    await setDoc(activityRef, {
      activityId: activityRef.id,
      userId,
      type,
      xpEarned: xpAmount,
      description,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error awarding XP:', error);
  }
};

// Get quiz history for a user
export const getQuizHistory = async (userId: string, quizId?: string): Promise<QuizAttempt[]> => {
  try {
    const progressRef = doc(db, 'progress', userId);
    const progressSnap = await getDoc(progressRef);

    if (progressSnap.exists()) {
      const data = progressSnap.data() as UserProgress;
      let quizAttempts = data.quizAttempts || [];

      if (quizId) {
        quizAttempts = quizAttempts.filter(q => q.quizId === quizId);
      }

      return quizAttempts;
    }

    return [];
  } catch (error) {
    console.error('Error getting quiz history:', error);
    return [];
  }
};
