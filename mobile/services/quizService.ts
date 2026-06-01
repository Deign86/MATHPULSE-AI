import { API_URL } from '../lib/api';
import { db, doc, getDoc } from '../lib/firebase';
import type { GeneratedQuiz } from '../types/models';

export interface QuizFilters {
  gradeLevel?: number;
  subject?: string;
}

export interface GenerateQuizParams {
  userId: string;
  gradeLevel: number;
  subject: string;
  topic: string;
  questionCount?: number;
}

// --- API calls ---

export async function getAvailableQuizzes(
  userId: string,
  token: string,
): Promise<any[]> {
  // Closest real endpoint: GET /api/quiz/topics — returns available topics
  const res = await fetch(
    `${API_URL}/api/quiz/topics?userId=${encodeURIComponent(userId)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    console.warn(`[quizService.getAvailableQuizzes] ${res.status} ${res.statusText}`);
    return [];
  }
  return res.json();
}

export async function listQuizzes(
  filters: QuizFilters,
  token: string,
): Promise<any[]> {
  const gradeParam = filters.gradeLevel ? `&gradeLevel=${filters.gradeLevel}` : '';
  const subjectParam = filters.subject ? `&subject=${encodeURIComponent(filters.subject)}` : '';
  const res = await fetch(
    `${API_URL}/api/quiz/topics?${gradeParam}${subjectParam}`.replace('?&', '?'),
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    console.warn(`[quizService.listQuizzes] ${res.status} ${res.statusText}`);
    return [];
  }
  return res.json();
}

export async function getQuizDetails(quizId: string): Promise<GeneratedQuiz> {
  const quizDoc = await getDoc(doc(db, 'generatedQuizzes', quizId));
  if (!quizDoc.exists()) {
    throw new Error(`Quiz with id "${quizId}" not found`);
  }
  return { id: quizDoc.id, ...quizDoc.data() } as GeneratedQuiz;
}

export async function submitQuiz(
  quizId: string,
  answers: any[],
  token: string,
): Promise<{ score: number; xpEarned: number }> {
  // Real endpoint: POST /api/practice/submit — different shape, send { session_id, userId, answers }
  const res = await fetch(`${API_URL}/api/practice/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ session_id: quizId, answers }),
  });
  if (!res.ok) {
    console.warn(`[quizService.submitQuiz] ${res.status} ${res.statusText}`);
    return { score: 0, xpEarned: 0 };
  }
  const data = await res.json();
  return {
    score: data.score ?? data.correctCount ?? 0,
    xpEarned: data.xpEarned ?? data.xp ?? 0,
  };
}

export async function generateQuiz(
  params: GenerateQuizParams,
  token: string,
): Promise<any> {
  const res = await fetch(`${API_URL}/api/quiz/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    console.warn(`[quizService.generateQuiz] ${res.status} ${res.statusText}`);
    return [];
  }
  return res.json();
}
