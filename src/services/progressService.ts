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
  serverTimestamp,
  increment,
  Timestamp,
  onSnapshot,
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

// Subscribe to user progress changes in real time
export const subscribeToUserProgress = (
  userId: string,
  onChange: (progress: UserProgress | null) => void,
): (() => void) => {
  const progressRef = doc(db, 'progress', userId);

  return onSnapshot(
    progressRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(null);
        return;
      }

      const data = snapshot.data();
      onChange({
        ...(data as UserProgress),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      });
    },
    (error) => {
      console.error('Error subscribing to user progress:', error);
      onChange(null);
    },
  );
};

// Persist lesson-level progress percent (0-100) for partial completion tracking
export const updateLessonProgressPercent = async (
  userId: string,
  lessonId: string,
  percent: number,
): Promise<void> => {
  const clampedPercent = Math.max(0, Math.min(100, percent));
  const progressRef = doc(db, 'progress', userId);

  await setDoc(
    progressRef,
    {
      [`lessons.${lessonId}.lessonId`]: lessonId,
      [`lessons.${lessonId}.progressPercent`]: clampedPercent,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};

// Recalculate module progress percentage from persisted lesson/quiz completion
export const recalculateAndUpdateModuleProgress = async (
  userId: string,
  subjectId: string,
  moduleId: string,
  totalLessons: number,
  totalQuizzes: number,
): Promise<number> => {
  const progressRef = doc(db, 'progress', userId);
  const progressSnap = await getDoc(progressRef);

  if (!progressSnap.exists()) {
    return 0;
  }

  const data = progressSnap.data() as UserProgress;
  const moduleProgress = data.subjects?.[subjectId]?.modulesProgress?.[moduleId];
  if (!moduleProgress) {
    return 0;
  }

  const totalItems = Math.max(1, totalLessons + totalQuizzes);
  const completedLessons = moduleProgress.lessonsCompleted?.length || 0;
  const completedQuizzes = moduleProgress.quizzesCompleted?.length || 0;
  const progress = Math.round(((completedLessons + completedQuizzes) / totalItems) * 100);

  await setDoc(
    progressRef,
    {
      [`subjects.${subjectId}.modulesProgress.${moduleId}.progress`]: progress,
      [`subjects.${subjectId}.modulesProgress.${moduleId}.lastAccessedAt`]: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return progress;
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
    const progressRef = doc(db, 'progress', userId);
    let progressSnap = await getDoc(progressRef);

    if (!progressSnap.exists()) {
      await initializeUserProgress(userId);
      progressSnap = await getDoc(progressRef);
    }

    const progressData = progressSnap.data() as UserProgress;

    // Update lesson progress
    const lessonProgress: LessonProgress = {
      lessonId,
      completed: true,
      completedAt: new Date(),
      timeSpent,
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
    const isNewLesson = !moduleProgress.lessonsCompleted.includes(lessonId);
    if (isNewLesson) {
      moduleProgress.lessonsCompleted.push(lessonId);
      moduleProgress.lastAccessedAt = new Date();
    }

    // Update Firestore
    await setDoc(
      progressRef,
      {
        [`lessons.${lessonId}`]: lessonProgress,
        [`subjects.${subjectId}.modulesProgress.${moduleId}`]: moduleProgress,
        ...(isNewLesson && { totalLessonsCompleted: increment(1) }),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Award XP
    await awardXP(userId, xpReward, 'lesson_complete', `Completed lesson: ${lessonId}`);
  } catch (error) {
    console.error('Error completing lesson:', error);
    throw error;
  }
};

// Record a practice quiz attempt (no module context needed)
export const recordPracticeQuiz = async (
  userId: string,
  quizId: string,
  subjectId: string,
  score: number,
  answers: QuizAnswer[],
  timeSpent: number,
): Promise<void> => {
  try {
    const progressRef = doc(db, 'progress', userId);
    let progressSnap = await getDoc(progressRef);

    if (!progressSnap.exists()) {
      await initializeUserProgress(userId);
      progressSnap = await getDoc(progressRef);
    }

    const progressData = progressSnap.data() as UserProgress;
    const quizAttempt: QuizAttempt = {
      quizId,
      attemptNumber: (progressData.quizAttempts?.filter(q => q.quizId === quizId).length || 0) + 1,
      score,
      completedAt: new Date(),
      timeSpent,
      answers,
    };

    const isNewQuiz = !progressData.quizAttempts?.some(q => q.quizId === quizId);

    await updateDoc(progressRef, {
      quizAttempts: [...(progressData.quizAttempts || []), quizAttempt],
      ...(isNewQuiz && { totalQuizzesCompleted: increment(1) }),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error recording practice quiz:', error);
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
  timeSpent: number,
  xpRewardOverride?: number
): Promise<void> => {
  try {
    const progressRef = doc(db, 'progress', userId);
    let progressSnap = await getDoc(progressRef);

    if (!progressSnap.exists()) {
      await initializeUserProgress(userId);
      progressSnap = await getDoc(progressRef);
    }

    const progressData = progressSnap.data() as UserProgress;

    // Create quiz attempt
    const quizAttempt: QuizAttempt = {
      quizId,
      attemptNumber: (progressData.quizAttempts?.filter(q => q.quizId === quizId).length || 0) + 1,
      score,
      completedAt: new Date(),
      timeSpent,
      answers,
    };

    // Calculate XP based on score, with optional override from caller
    const xpReward = xpRewardOverride !== undefined ? xpRewardOverride : Math.floor((score / 100) * 100);

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
    const isNewQuiz = !moduleProgress.quizzesCompleted.includes(quizId);
    if (isNewQuiz) {
      moduleProgress.quizzesCompleted.push(quizId);
      moduleProgress.lastAccessedAt = new Date();
    }

    // Update Firestore
    await updateDoc(progressRef, {
      quizAttempts: [...(progressData.quizAttempts || []), quizAttempt],
      [`subjects.${subjectId}.modulesProgress.${moduleId}`]: moduleProgress,
      ...(isNewQuiz && { totalQuizzesCompleted: increment(1) }),
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
    const progressRef = doc(db, 'progress', userId);
    await setDoc(
      progressRef,
      {
        [`subjects.${subjectId}.modulesProgress.${moduleId}.progress`]: progress,
        [`subjects.${subjectId}.modulesProgress.${moduleId}.lastAccessedAt`]: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error updating module progress:', error);
    throw error;
  }
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
    const progressRef = doc(db, 'progress', userId);
    await setDoc(
      progressRef,
      {
        [`subjects.${subjectId}.progress`]: progress,
        [`subjects.${subjectId}.completedModules`]: completedModules,
        [`subjects.${subjectId}.totalModules`]: totalModules,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
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
