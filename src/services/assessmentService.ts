// src/services/assessmentService.ts
// Service layer for Initial Assessment feature
// Handles Firestore operations and backend API calls

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
  Timestamp,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  type AssessmentResult,
  type AssessmentDoc,
  type CompetencyProfileDoc,
  type ClassAssessmentSummary,
  type GenerateAssessmentResponse,
  type SubmitAssessmentResponse,
  type AssessmentCategory,
  type CompetencyScore,
  type ProficiencyProfile,
} from '../types/assessment';
import { apiFetch } from './apiService';

const API_URL = import.meta.env.VITE_API_URL || 'https://deign86-mathpulse-api-v3test.hf.space';

// ─── Firestore Collection Names ─────────────────────────────────────────

const ASSESSMENTS_COLLECTION = 'assessments';
const COMPETENCY_PROFILES_COLLECTION = 'competencyProfiles';
const CLASS_ASSESSMENTS_COLLECTION = 'classAssessments';

// ─── Type Helpers ────────────────────────────────────────────────────────

function toAssessmentDoc(result: AssessmentResult): AssessmentDoc {
  return {
    uid: result.uid,
    assessmentId: result.assessmentId,
    assessmentType: result.assessmentType,
    completedAt: Timestamp.fromDate(new Date(result.completedAt)),
    rawScore: result.rawScore,
    totalQuestions: result.totalQuestions,
    correctAnswers: result.correctAnswers,
    timeSpentSeconds: result.timeSpentSeconds,
    competencyScores: Object.fromEntries(
      Object.entries(result.competencyScores).map(([key, value]) => [
        key,
        {
          score: value.score,
          correct: value.correct,
          attempted: value.attempted,
        },
      ])
    ),
    recommendations: result.recommendations,
    proficiencyProfile: {
      strengths: result.proficiencyProfile.strengths,
      weaknesses: result.proficiencyProfile.weaknesses,
      borderline: result.proficiencyProfile.borderline,
      suggestedStartingModule: result.proficiencyProfile.suggestedStartingModule,
      recommendedPace: result.proficiencyProfile.recommendedPace,
      g12Readiness: result.proficiencyProfile.g12Readiness,
    },
  };
}

function fromAssessmentDoc(doc: AssessmentDoc): AssessmentResult {
  return {
    uid: doc.uid,
    assessmentId: doc.assessmentId,
    completedAt: doc.completedAt.toDate(),
    rawScore: doc.rawScore,
    totalQuestions: doc.totalQuestions,
    correctAnswers: doc.correctAnswers,
    timeSpentSeconds: doc.timeSpentSeconds,
    competencyScores: Object.fromEntries(
      Object.entries(doc.competencyScores).map(([key, value]) => [
        key,
        {
          score: value.score,
          correct: value.correct,
          attempted: value.attempted,
        } as CompetencyScore,
      ])
    ),
    recommendations: doc.recommendations,
    proficiencyProfile: doc.proficiencyProfile as ProficiencyProfile,
    assessmentType: doc.assessmentType,
  };
}

// ─── Assessment Operations ──────────────────────────────────────────────

/**
 * Save initial assessment result to Firestore
 */
export const completeInitialAssessment = async (result: AssessmentResult): Promise<void> => {
  const assessmentDoc = toAssessmentDoc(result);

  // Save to assessments collection
  await setDoc(
    doc(db, ASSESSMENTS_COLLECTION, result.uid, 'attempts', result.assessmentId),
    assessmentDoc
  );

  // Update user's hasCompletedInitialAssessment flag via Firestore directly
  await updateDoc(doc(db, 'users', result.uid), {
    hasCompletedInitialAssessment: true,
    initialAssessmentCompletedAt: serverTimestamp(),
    iarAssessmentState: 'completed',
  });
};

/**
 * Get student's initial assessment result
 */
export const getInitialAssessment = async (uid: string): Promise<AssessmentResult | null> => {
  const q = query(
    collection(db, ASSESSMENTS_COLLECTION, uid, 'attempts'),
    where('assessmentType', '==', 'initial'),
    orderBy('completedAt', 'desc'),
    limit(1)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  return fromAssessmentDoc(snapshot.docs[0].data() as AssessmentDoc);
};

/**
 * Get all assessment attempts for a student
 */
export const getAssessmentHistory = async (uid: string): Promise<AssessmentResult[]> => {
  const q = query(
    collection(db, ASSESSMENTS_COLLECTION, uid, 'attempts'),
    orderBy('completedAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => fromAssessmentDoc(doc.data() as AssessmentDoc));
};

// ─── Competency Profile Operations ──────────────────────────────────────

/**
 * Get student's competency profile
 */
export const getStudentCompetencyProfile = async (uid: string): Promise<CompetencyProfileDoc | null> => {
  const docRef = doc(db, COMPETENCY_PROFILES_COLLECTION, uid);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  return docSnap.data() as CompetencyProfileDoc;
};

/**
 * Update competency profile after assessment
 */
export const updateCompetencyProfile = async (
  uid: string,
  assessmentResult: AssessmentResult
): Promise<void> => {
  const { strengths, weaknesses, borderline } = assessmentResult.proficiencyProfile;

  // Calculate primary strength and weakness
  const primaryStrength = strengths.length > 0 ? strengths[0] : null;
  const primaryWeakness = weaknesses.length > 0 ? weaknesses[0] : null;

  // Get suggested module based on primary weakness
  const suggestedModule = assessmentResult.proficiencyProfile.suggestedStartingModule;

  const competencyProfileData = {
    uid,
    lastAssessmentDate: serverTimestamp() as Timestamp,
    lastAssessmentType: assessmentResult.assessmentType,
    overallScore: assessmentResult.rawScore,
    competencies: Object.fromEntries(
      Object.entries(assessmentResult.competencyScores).map(([key, value]) => [
        key,
        {
          score: value.score,
          correct: value.correct,
          attempted: value.attempted,
          lastAttemptedAt: serverTimestamp(),
        },
      ])
    ),
    primaryWeakness,
    primaryStrength,
    suggestedModule,
    updatedAt: serverTimestamp() as Timestamp,
  };

  await setDoc(
    doc(db, COMPETENCY_PROFILES_COLLECTION, uid),
    competencyProfileData,
    { merge: true }
  );
};

/**
 * Subscribe to competency profile changes
 */
export const subscribeToCompetencyProfile = (
  uid: string,
  callback: (profile: CompetencyProfileDoc | null) => void
): (() => void) => {
  const docRef = doc(db, COMPETENCY_PROFILES_COLLECTION, uid);

  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as CompetencyProfileDoc);
    } else {
      callback(null);
    }
  });
};

// ─── Class Assessment Operations ────────────────────────────────────────

/**
 * Get class assessment summary for a teacher
 */
export const getClassAssessmentSummary = async (
  classId: string,
  teacherUid: string
): Promise<ClassAssessmentSummary | null> => {
  const docRef = doc(db, CLASS_ASSESSMENTS_COLLECTION, classId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  const data = docSnap.data();
  if (data.teacherUid !== teacherUid) return null;

  return data as ClassAssessmentSummary;
};

/**
 * Get all class assessment summaries for a teacher
 */
export const getTeacherClassAssessments = async (
  teacherUid: string
): Promise<ClassAssessmentSummary[]> => {
  const q = query(
    collection(db, CLASS_ASSESSMENTS_COLLECTION),
    where('teacherUid', '==', teacherUid)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data() as ClassAssessmentSummary);
};

/**
 * Aggregate class assessment data (called from Cloud Function)
 */
export const aggregateClassAssessments = async (
  classId: string,
  studentIds: string[]
): Promise<ClassAssessmentSummary> => {
  let totalScore = 0;
  let completedCount = 0;
  const competencyTotals: Record<string, { total: number; count: number }> = {};
  const studentsNeedingIntervention: string[] = [];

  for (const studentId of studentIds) {
    const assessment = await getInitialAssessment(studentId);
    if (assessment) {
      completedCount++;
      totalScore += assessment.rawScore;

      // Aggregate competency scores
      for (const [compId, compScore] of Object.entries(assessment.competencyScores)) {
        if (!competencyTotals[compId]) {
          competencyTotals[compId] = { total: 0, count: 0 };
        }
        competencyTotals[compId].total += compScore.score;
        competencyTotals[compId].count++;

        // Check for intervention needed
        if (compScore.score < 40) {
          studentsNeedingIntervention.push(studentId);
          break;
        }
      }
    }
  }

  const averageScore = completedCount > 0 ? Math.round(totalScore / completedCount) : 0;
  const competencyAverages = Object.fromEntries(
    Object.entries(competencyTotals).map(([compId, data]) => [
      compId,
      Math.round(data.total / data.count),
    ])
  );

  return {
    classId,
    teacherUid: '', // Will be set by the caller
    totalStudents: studentIds.length,
    completedAssessments: completedCount,
    averageScore,
    competencyAverages,
    studentsNeedingIntervention: [...new Set(studentsNeedingIntervention)],
    overallRiskDistribution: {
      low: completedCount > 0 ? Math.round((completedCount - studentsNeedingIntervention.length) / completedCount * 100) : 0,
      moderate: 0,
      high: studentsNeedingIntervention.length,
      critical: 0,
    },
  };
};

// ─── Backend API Operations ─────────────────────────────────────────────

/**
 * Generate assessment questions from backend
 */
export const generateAssessment = async (
  category: AssessmentCategory,
  gradeLevel: string,
  difficulty: 'mixed' | 'easier' | 'harder' = 'mixed'
): Promise<GenerateAssessmentResponse> => {
  return apiFetch<GenerateAssessmentResponse>(
    `${API_URL}/api/assessment/generate`,
    {
      method: 'POST',
      body: JSON.stringify({
        category,
        grade_level: gradeLevel,
        difficulty,
      }),
    }
  );
};

/**
 * Submit assessment responses for scoring
 */
export const submitAssessment = async (
  assessmentId: string,
  responses: Array<{ questionId: string; answer: string; timeSpent: number }>,
  assessmentType: 'initial' | 'followup' | 'practice' = 'initial'
): Promise<SubmitAssessmentResponse> => {
  return apiFetch<SubmitAssessmentResponse>(
    `${API_URL}/api/assessment/submit`,
    {
      method: 'POST',
      body: JSON.stringify({
        assessment_id: assessmentId,
        responses,
        assessment_type: assessmentType,
      }),
    }
  );
};

/**
 * Get personalized lesson context based on assessment results
 */
export const getPersonalizedLessonContext = async (
  uid: string,
  topic: string
): Promise<{
  studentUid: string;
  competencyProfile: CompetencyProfileDoc | null;
  weaknessFocus: string | null;
  sessionGoal: string;
}> => {
  const profile = await getStudentCompetencyProfile(uid);

  const primaryWeakness = profile?.primaryWeakness || null;

  let sessionGoal = `Generate lesson on ${topic}`;
  if (primaryWeakness) {
    sessionGoal += ` with extra focus on addressing ${primaryWeakness} weakness from assessment`;
  }

  return {
    studentUid: uid,
    competencyProfile: profile,
    weaknessFocus: primaryWeakness,
    sessionGoal,
  };
};

// ─── Utility Functions ─────────────────────────────────────────────────

/**
 * Check if student has completed initial assessment
 */
export const hasCompletedInitialAssessment = async (uid: string): Promise<boolean> => {
  const profile = await getStudentCompetencyProfile(uid);
  return profile !== null && profile.overallScore > 0;
};

/**
 * Get recommended module based on competency profile
 */
export const getRecommendedModule = async (uid: string): Promise<string> => {
  const profile = await getStudentCompetencyProfile(uid);
  if (!profile || !profile.suggestedModule) {
    return 'gen-math-q1'; // Default to General Math Q1
  }
  return profile.suggestedModule;
};

/**
 * Get competencies that need practice based on profile
 */
export const getWeaknessCompetencies = async (uid: string): Promise<string[]> => {
  const profile = await getStudentCompetencyProfile(uid);
  if (!profile) return [];

  const weaknesses: string[] = [];
  for (const [compId, compData] of Object.entries(profile.competencies)) {
    if (compData.score < 50) {
      weaknesses.push(compId);
    }
  }
  return weaknesses;
};

/**
 * Get strengths from competency profile
 */
export const getStrengthCompetencies = async (uid: string): Promise<string[]> => {
  const profile = await getStudentCompetencyProfile(uid);
  if (!profile) return [];

  const strengths: string[] = [];
  for (const [compId, compData] of Object.entries(profile.competencies)) {
    if (compData.score >= 80) {
      strengths.push(compId);
    }
  }
  return strengths;
};