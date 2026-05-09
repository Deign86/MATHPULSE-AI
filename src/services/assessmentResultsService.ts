import { collection, doc, setDoc, getDocs, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { apiFetch } from './apiService';
import type { AssessmentResult, AssessmentHistoryEntry } from '../types/models';

const API_URL = 'https://deign86-mathpulse-api-v3test.hf.space';

export async function saveAssessmentResult(
  result: Omit<AssessmentResult, 'completedAt'>,
): Promise<string> {
  const attemptId = `diag-${Date.now()}`;
  const docRef = doc(db, 'assessmentResults', result.studentId, 'attempts', attemptId);

  await setDoc(docRef, {
    ...result,
    attemptId,
    completedAt: serverTimestamp(),
  });

  try {
    await apiFetch(`${API_URL}/api/diagnostic/results`, {
      method: 'POST',
      body: JSON.stringify({
        test_id: attemptId,
        strand: result.strand,
        grade_level: result.gradeLevel,
        score: result.score,
        total_questions: result.totalQuestions,
        percentage: result.percentage,
        time_taken_seconds: result.timeTakenSeconds,
        answers: result.answers,
        competency_breakdown: result.competencyBreakdown,
        proficiency_level: result.proficiencyLevel,
        ai_narrative: result.aiNarrative || '',
      }),
    });
  } catch (err) {
    console.error('Backend result save failed, local save succeeded:', err);
  }

  return attemptId;
}

export async function getAssessmentHistory(studentId: string): Promise<AssessmentHistoryEntry[]> {
  const attemptsRef = collection(db, 'assessmentResults', studentId, 'attempts');
  const q = query(attemptsRef, orderBy('completedAt', 'desc'), limit(10));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      attemptId: data.attemptId,
      score: data.score,
      totalQuestions: data.totalQuestions,
      percentage: data.percentage,
      completedAt: data.completedAt?.toDate?.()?.toISOString() || data.completedAt,
      proficiencyLevel: data.proficiencyLevel,
    };
  });
}

export async function getLatestAssessmentResult(studentId: string): Promise<AssessmentResult | null> {
  const attemptsRef = collection(db, 'assessmentResults', studentId, 'attempts');
  const q = query(attemptsRef, orderBy('completedAt', 'desc'), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];
  const data = docSnap.data();
  return {
    ...data,
    completedAt: data.completedAt?.toDate?.()?.toISOString() || data.completedAt,
  } as AssessmentResult;
}
