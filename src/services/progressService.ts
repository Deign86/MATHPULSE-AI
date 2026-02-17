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
    const progressSnap = await getDoc(progressRef);

    if (!progressSnap.exists()) {
      await initializeUserProgress(userId);
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
    if (!moduleProgress.lessonsCompleted.includes(lessonId)) {
      moduleProgress.lessonsCompleted.push(lessonId);
      moduleProgress.lastAccessedAt = new Date();
    }

    // Update Firestore
    await setDoc(
      progressRef,
      {
        [`lessons.${lessonId}`]: lessonProgress,
        [`subjects.${subjectId}.modulesProgress.${moduleId}`]: moduleProgress,
        totalLessonsCompleted: increment(1),
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
    const progressRef = doc(db, 'progress', userId);
    const progressSnap = await getDoc(progressRef);

    if (!progressSnap.exists()) {
      await initializeUserProgress(userId);
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
    if (!moduleProgress.quizzesCompleted.includes(quizId)) {
      moduleProgress.quizzesCompleted.push(quizId);
      moduleProgress.lastAccessedAt = new Date();
    }

    // Update Firestore
    await updateDoc(progressRef, {
      quizAttempts: [...(progressData.quizAttempts || []), quizAttempt],
      [`subjects.${subjectId}.modulesProgress.${moduleId}`]: moduleProgress,
      totalQuizzesCompleted: increment(1),
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
