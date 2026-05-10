/**
 * Competency Service
 *
 * Firestore data access for competency matrix data.
 * Queries quizResults, moduleProgress collections and provides
 * a compute-and-cache utility for derived competency scores.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  setDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type {
  FirestoreQuizResult,
  FirestoreModuleProgress,
  CachedCompetencyMatrix,
} from '../types/competency';
import { subjects, getActiveSubjectIdsForGrade } from '../data/subjects';

// ─── Palette for radar chart modules ─────────────────────────────────────────

export const THEME_PALETTE = [
  '#1FA7E1', // Summer Sky
  '#9956DE', // Amethyst
  '#75D06A', // Pastel Green
  '#FFB356', // Texas Rose
  '#7274ED', // Slate Blue
  '#FF8B8B', // Mona Lisa
  '#6ED1CF', // Downy
  '#FB96BB', // Illusion
];

// ─── Query: quizResults subcollection ─────────────────────────────────────────

/**
 * Fetch all quiz results for a user from the quizResults subcollection.
 * Collection: users/{userId}/quizResults/{quizId}
 *
 * Falls back to quizAttempts embedded in the progress document if
 * the quizResults subcollection doesn't exist yet.
 */
export async function fetchQuizResults(userId: string): Promise<FirestoreQuizResult[]> {
  try {
    const quizResultsRef = collection(db, 'users', userId, 'quizResults');
    const q = query(quizResultsRef, orderBy('timestamp', 'desc'), limit(500));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // Fallback: try reading from the progress document's quizAttempts
      return fetchQuizResultsFromProgress(userId);
    }

    return snapshot.docs.map((d) => {
      const data = d.data();
      return {
        quizId: d.id,
        moduleId: data.moduleId || '',
        subjectId: data.subjectId || '',
        score: typeof data.score === 'number' ? data.score : 0,
        totalQuestions: data.totalQuestions || 0,
        correctAnswers: data.correctAnswers || 0,
        questionType: data.questionType || 'multiple_choice',
        timestamp: data.timestamp instanceof Timestamp
          ? data.timestamp.toDate()
          : (data.timestamp?.toDate ? data.timestamp.toDate() : new Date()),
        timeSpent: data.timeSpent || 0,
      } satisfies FirestoreQuizResult;
    });
  } catch (err) {
    console.error('[competencyService] fetchQuizResults failed, falling back:', err);
    return fetchQuizResultsFromProgress(userId);
  }
}

/**
 * Fallback: read quizAttempts from the progress document.
 */
async function fetchQuizResultsFromProgress(userId: string): Promise<FirestoreQuizResult[]> {
  const progressDoc = await getDoc(doc(db, 'progress', userId));
  if (!progressDoc.exists()) return [];

  const data = progressDoc.data();
  const attempts: FirestoreQuizResult[] = (data.quizAttempts || []).map(
    (a: Record<string, unknown>, i: number) => ({
      quizId: String(a.quizId || `attempt-${i}`),
      moduleId: String(a.moduleId || a.quizId || ''),
      subjectId: String(a.subjectId || ''),
      score: typeof a.score === 'number' ? a.score : 0,
      totalQuestions: (a.totalQuestions as number) || 0,
      correctAnswers: typeof a.correctAnswers === 'number' ? a.correctAnswers : 0,
      questionType: (a.questionType as FirestoreQuizResult['questionType']) || 'multiple_choice',
      timestamp: a.completedAt
        ? new Date(a.completedAt as string | number)
        : new Date(),
      timeSpent: (a.timeSpent as number) || 0,
    }),
  );
  return attempts;
}

// ─── Query: moduleProgress subcollection ──────────────────────────────────────

/**
 * Fetch all module progress docs for a user.
 * Collection: users/{userId}/moduleProgress/{moduleId}
 */
export async function fetchModuleProgress(
  userId: string,
): Promise<Record<string, FirestoreModuleProgress>> {
  try {
    const moduleProgressRef = collection(db, 'users', userId, 'moduleProgress');
    const snapshot = await getDocs(moduleProgressRef);

    if (snapshot.empty) return {};

    const result: Record<string, FirestoreModuleProgress> = {};
    snapshot.forEach((d) => {
      const data = d.data();
      result[d.id] = {
        moduleId: d.id,
        subjectId: data.subjectId || '',
        sessionsCompleted: data.sessionsCompleted || 0,
        lastActive: data.lastActive
          ? (data.lastActive instanceof Timestamp
              ? data.lastActive.toDate()
              : new Date(data.lastActive))
          : new Date(),
        moduleTitle: data.moduleTitle || d.id,
        lessonsCompleted: data.lessonsCompleted || [],
        quizzesCompleted: data.quizzesCompleted || [],
      };
    });
    return result;
  } catch (err) {
    console.error('[competencyService] fetchModuleProgress failed:', err);
    return {};
  }
}

// ─── Score Computation ────────────────────────────────────────────────────────

/**
 * Compute the 5-axis competency scores for a single module.
 *
 * - Overall Mastery: average quiz score for the module
 * - Concept Grasp: ratio of correct answers on conceptual question types
 * - Application: ratio on applied/word-problem question types
 * - Engagement: number of sessions or activities (normalized 0-100)
 * - Consistency: inverse of score std-dev (higher = more consistent)
 */
export function computeModuleScores(
  moduleId: string,
  quizResults: FirestoreQuizResult[],
  moduleProgress: FirestoreModuleProgress,
  allModules: { id: string; title: string; lessons: unknown[]; quizzes: unknown[] }[],
): {
  overallMastery: number;
  conceptGrasp: number;
  application: number;
  engagement: number;
  consistency: number;
} {
  const moduleQuizzes = quizResults.filter((q) => q.moduleId === moduleId);

  // Overall Mastery: average score across all quiz attempts for this module
  const overallMastery =
    moduleQuizzes.length > 0
      ? moduleQuizzes.reduce((sum, q) => sum + q.score, 0) / moduleQuizzes.length
      : 0;

  // Concept Grasp: correct ratio on conceptual question types
  const conceptualTypes = ['identification', 'multiple_choice'];
  const conceptQuizzes = moduleQuizzes.filter((q) =>
    conceptualTypes.includes(q.questionType),
  );
  const conceptGrasp =
    conceptQuizzes.length > 0
      ? conceptQuizzes.reduce((sum, q) => sum + q.score, 0) / conceptQuizzes.length
      : overallMastery * 0.9; // fallback estimate

  // Application: ratio on applied/word-problem types
  const appliedTypes = ['word_problem', 'equation_based', 'enumeration'];
  const appliedQuizzes = moduleQuizzes.filter((q) =>
    appliedTypes.includes(q.questionType),
  );
  const application =
    appliedQuizzes.length > 0
      ? appliedQuizzes.reduce((sum, q) => sum + q.score, 0) / appliedQuizzes.length
      : overallMastery * 0.85;

  // Engagement: sessions + lessons + quizzes normalized to 0-100
  const mp = moduleProgress;
  const lessonCount = mp?.lessonsCompleted?.length || 0;
  const quizCount = mp?.quizzesCompleted?.length || 0;
  const sessionCount = mp?.sessionsCompleted || 0;
  const allModulesEntry = allModules.find((m) => m.id === moduleId);
  const totalLessons = allModulesEntry?.lessons?.length || 1;
  const totalQuizzes = allModulesEntry?.quizzes?.length || 1;

  const lessonPct = Math.min(100, (lessonCount / totalLessons) * 100);
  const quizPct = Math.min(100, (quizCount / totalQuizzes) * 100);
  const engagement = Math.min(100, (lessonPct + quizPct + sessionCount * 5) / 2.5);

  // Consistency: inverse of coefficient of variation (CV = stdDev / mean)
  // Higher score = more consistent
  if (moduleQuizzes.length < 2) {
    // Not enough data — assume moderate consistency
    const consistency = engagement > 50 ? 60 + engagement * 0.3 : engagement * 0.8;
    return { overallMastery, conceptGrasp, application, engagement, consistency: Math.min(100, consistency) };
  }

  const scores = moduleQuizzes.map((q) => q.score);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance =
    scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / Math.max(mean, 1); // coefficient of variation
  // CV of 0 = perfect consistency = 100 score; CV of 1 = high variance = 0 score
  const consistency = Math.max(0, Math.min(100, (1 - cv) * 100));

  return {
    overallMastery: Math.round(overallMastery),
    conceptGrasp: Math.round(conceptGrasp),
    application: Math.round(application),
    engagement: Math.round(engagement),
    consistency: Math.round(consistency),
  };
}

// ─── Cache: competencyMatrix subcollection ────────────────────────────────────

/**
 * Derive competency scores from existing data and cache them in
 * users/{userId}/competencyMatrix/{moduleId}.
 *
 * Call this after quiz completion or periodically to keep the
 * cached scores fresh.
 */
export async function computeAndSaveCompetencyScores(
  userId: string,
): Promise<Record<string, CachedCompetencyMatrix>> {
  const [quizResults, moduleProgress] = await Promise.all([
    fetchQuizResults(userId),
    fetchModuleProgress(userId),
  ]);

  // Get all valid modules from the curriculum
  const studentGrade = null; // Will use default gen-math
  const activeSubjectIds = getActiveSubjectIdsForGrade(studentGrade);
  const activeSubject = subjects.find((s) => activeSubjectIds[0] === s.id) || subjects[0];
  const validModules = activeSubject?.modules || [];

  const cached: Record<string, CachedCompetencyMatrix> = {};

  await Promise.all(
    validModules.map(async (mod) => {
      const mp = moduleProgress[mod.id];
      const scores = computeModuleScores(mod.id, quizResults, mp || { moduleId: mod.id, subjectId: activeSubject.id, sessionsCompleted: 0, lastActive: new Date(), moduleTitle: mod.title, lessonsCompleted: [], quizzesCompleted: [] }, validModules);

      const cacheDoc: CachedCompetencyMatrix = {
        moduleId: mod.id,
        moduleName: mod.title,
        ...scores,
        computedAt: new Date(),
      };

      try {
        await setDoc(
          doc(db, 'users', userId, 'competencyMatrix', mod.id),
          { ...cacheDoc, computedAt: serverTimestamp() },
          { merge: true },
        );
      } catch (err) {
        console.warn(`[competencyService] Failed to cache scores for module ${mod.id}:`, err);
      }

      cached[mod.id] = cacheDoc;
    }),
  );

  return cached;
}

/**
 * Read cached competency matrix for a user.
 * Returns null for a module if not yet cached.
 */
export async function fetchCachedCompetencyMatrix(
  userId: string,
): Promise<Record<string, CachedCompetencyMatrix>> {
  try {
    const matrixRef = collection(db, 'users', userId, 'competencyMatrix');
    const snapshot = await getDocs(matrixRef);

    if (snapshot.empty) return {};

    const result: Record<string, CachedCompetencyMatrix> = {};
    snapshot.forEach((d) => {
      const data = d.data();
      result[d.id] = {
        moduleId: d.id,
        moduleName: data.moduleName || d.id,
        overallMastery: data.overallMastery ?? 0,
        conceptGrasp: data.conceptGrasp ?? 0,
        application: data.application ?? 0,
        engagement: data.engagement ?? 0,
        consistency: data.consistency ?? 0,
        computedAt: data.computedAt?.toDate?.() || new Date(),
      };
    });
    return result;
  } catch (err) {
    console.error('[competencyService] fetchCachedCompetencyMatrix failed:', err);
    return {};
  }
}

// ─── Module list helper ────────────────────────────────────────────────────────

/**
 * Returns module info (id, name, color) for active modules.
 * Used by the radar chart to build the polygon list.
 */
export function getActiveModulesInfo(): { id: string; name: string; color: string }[] {
  const activeSubjectIds = getActiveSubjectIdsForGrade(null);
  const activeSubjectId = activeSubjectIds[0] ?? 'gen-math';
  const validModules = subjects.find((s) => s.id === activeSubjectId)?.modules || [];

  return validModules.map((mod, i) => ({
    id: mod.id,
    name: mod.title.length > 15 ? mod.title.substring(0, 15).trim() + '...' : mod.title,
    color: THEME_PALETTE[i % THEME_PALETTE.length],
  }));
}