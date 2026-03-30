import { db } from '../lib/firebase';
import {
  collection, doc, setDoc, getDoc, getDocs,
  query, where, orderBy, updateDoc, deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import type {
  GeneratedQuiz,
  AIQuizQuestion,
  GeneratedQuizStatus,
  QuizAnswerRecord,
} from '../types/models';

const API_URL = import.meta.env.VITE_API_URL || 'https://deign86-mathpulse-api-v3test.hf.space';

// ─── SAVE GENERATED QUIZ TO FIRESTORE ─────────────────────────

export async function saveGeneratedQuiz(
  quiz: Omit<GeneratedQuiz, 'id'>,
  teacherId: string,
): Promise<string> {
  const quizRef = doc(collection(db, 'generatedQuizzes'));
  await setDoc(quizRef, {
    ...quiz,
    teacherId,
    createdAt: serverTimestamp(),
    status: 'draft' as GeneratedQuizStatus,
  });
  return quizRef.id;
}

// ─── UPDATE QUIZ STATUS ─────────────────────────────────────

export async function updateQuizStatus(
  quizId: string,
  status: GeneratedQuizStatus,
): Promise<void> {
  await updateDoc(doc(db, 'generatedQuizzes', quizId), { status });
}

// ─── PUBLISH QUIZ ────────────────────────────────────────────

export async function publishQuiz(quizId: string): Promise<void> {
  await updateDoc(doc(db, 'generatedQuizzes', quizId), {
    status: 'published' as GeneratedQuizStatus,
    publishedAt: serverTimestamp(),
  });
}

// ─── DELETE QUIZ ─────────────────────────────────────────────

export async function deleteGeneratedQuiz(quizId: string): Promise<void> {
  await deleteDoc(doc(db, 'generatedQuizzes', quizId));
}

// ─── ASSIGN QUIZ TO STUDENT ─────────────────────────────────

export async function assignQuizToStudent(
  quizId: string,
  lrn: string,
  teacherId: string,
): Promise<void> {
  // Update quiz status
  await updateDoc(doc(db, 'generatedQuizzes', quizId), {
    status: 'assigned' as GeneratedQuizStatus,
    'metadata.assignedTo': lrn,
    assignedBy: teacherId,
    assignedAt: serverTimestamp(),
  });

  // Create assignment record
  const assignmentRef = doc(collection(db, 'quizAssignments'));
  await setDoc(assignmentRef, {
    quizId,
    lrn,
    teacherId,
    status: 'pending',
    assignedAt: serverTimestamp(),
    dueDate: null,
  });

  // Send notification to student
  const notificationRef = doc(collection(db, 'notifications'));
  await setDoc(notificationRef, {
    userId: lrn,
    type: 'quiz_assigned',
    title: 'New Quiz Assigned',
    message: 'Your teacher has assigned you a new quiz. Complete it to earn XP!',
    quizId,
    read: false,
    createdAt: serverTimestamp(),
  });
}

// ─── FETCH SINGLE GENERATED QUIZ ─────────────────────────────

export async function fetchGeneratedQuiz(quizId: string): Promise<GeneratedQuiz | null> {
  const quizDoc = await getDoc(doc(db, 'generatedQuizzes', quizId));
  if (!quizDoc.exists()) return null;
  return { id: quizDoc.id, ...quizDoc.data() } as GeneratedQuiz;
}

// ─── FETCH ALL QUIZZES BY TEACHER ────────────────────────────

export async function fetchQuizzesByTeacher(teacherId: string): Promise<GeneratedQuiz[]> {
  const q = query(
    collection(db, 'generatedQuizzes'),
    where('teacherId', '==', teacherId),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as GeneratedQuiz));
}

// ─── CONVERT GeneratedQuiz → playable quiz payload ───────────
// Returns an object compatible with the Quiz interface used by QuizExperience.

export interface PlayableQuiz {
  id: string;
  title: string;
  subject: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  questions: number;
  duration: string;
  xpReward: number;
  type: 'practice' | 'challenge' | 'mastery';
  completed: boolean;
  bestScore?: number;
  locked: boolean;
  // AI pipeline fields
  loadedQuestions: AIQuizQuestion[];
  source: 'ai_generated' | 'adaptive' | 'hardcoded';
  generatedQuizId: string;
}

export function toPlayableQuiz(gen: GeneratedQuiz): PlayableQuiz {
  const diffBreak = gen.metadata.difficultyBreakdown;
  const dominantDiff: 'Easy' | 'Medium' | 'Hard' =
    diffBreak.hard >= diffBreak.medium && diffBreak.hard >= diffBreak.easy
      ? 'Hard'
      : diffBreak.medium >= diffBreak.easy
        ? 'Medium'
        : 'Easy';

  const mins = Math.max(5, Math.ceil(gen.questions.length * 1.5));

  return {
    id: gen.id,
    title: gen.title,
    subject: gen.metadata.topicsCovered[0] ?? 'Mathematics',
    difficulty: dominantDiff,
    questions: gen.questions.length,
    duration: `${mins} min`,
    xpReward: gen.totalPoints * 2,
    type: 'practice',
    completed: gen.status === 'completed',
    locked: false,
    loadedQuestions: gen.questions,
    source: 'ai_generated',
    generatedQuizId: gen.id,
  };
}

// ─── FETCH PENDING QUIZZES FOR STUDENT ───────────────────────

export async function fetchPendingQuizzesForStudent(lrn: string): Promise<PlayableQuiz[]> {
  const assignmentsQuery = query(
    collection(db, 'quizAssignments'),
    where('lrn', '==', lrn),
    where('status', '==', 'pending'),
    orderBy('assignedAt', 'desc'),
  );

  const assignmentsSnap = await getDocs(assignmentsQuery);
  const quizzes: PlayableQuiz[] = [];

  for (const assignDoc of assignmentsSnap.docs) {
    const { quizId } = assignDoc.data();
    const gen = await fetchGeneratedQuiz(quizId);
    if (gen) quizzes.push(toPlayableQuiz(gen));
  }

  return quizzes;
}

// ─── FETCH ADAPTIVE QUIZ ────────────────────────────────────

export async function fetchAdaptiveQuiz(
  lrn: string,
  subject: string,
): Promise<PlayableQuiz | null> {
  try {
    const response = await fetch(`${API_URL}/api/quiz/adaptive-select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lrn, topicId: subject, numQuestions: 10 }),
    });

    if (!response.ok) return null;
    const data = await response.json();

    return {
      id: `adaptive_${lrn}_${Date.now()}`,
      title: `Adaptive ${subject} Quiz`,
      subject,
      difficulty: 'Medium',
      questions: data.questions?.length ?? 10,
      duration: '15 min',
      xpReward: 100,
      type: 'practice',
      completed: false,
      locked: false,
      loadedQuestions: (data.questions ?? []) as AIQuizQuestion[],
      source: 'adaptive',
      generatedQuizId: '',
    };
  } catch {
    return null;
  }
}

// ─── SAVE QUIZ RESULTS ──────────────────────────────────────

export async function saveQuizResults(
  lrn: string,
  quizId: string,
  generatedQuizId: string | undefined,
  subject: string,
  source: string,
  score: number,
  xpEarned: number,
  totalTime: number,
  answers: QuizAnswerRecord[],
  questionsMeta: { topic: string; difficulty: string; bloomLevel: string }[],
): Promise<void> {
  const submissionRef = doc(collection(db, 'quizSubmissions'));

  await setDoc(submissionRef, {
    submissionId: submissionRef.id,
    lrn,
    quizId,
    generatedQuizId: generatedQuizId ?? null,
    subject,
    source,
    score,
    xpEarned,
    totalTime,
    answers,
    correctCount: answers.filter((a) => a.correct).length,
    totalQuestions: answers.length,
    questionBreakdown: answers.map((a, i) => ({
      questionId: a.questionId,
      topic: questionsMeta[i]?.topic ?? subject,
      difficulty: questionsMeta[i]?.difficulty ?? 'medium',
      bloomLevel: questionsMeta[i]?.bloomLevel ?? 'understand',
      correct: a.correct,
      timeSpent: a.timeSpent,
    })),
    submittedAt: serverTimestamp(),
  });

  // Mark assignment as completed if this was an assigned quiz
  if (generatedQuizId) {
    const assignmentsQuery = query(
      collection(db, 'quizAssignments'),
      where('quizId', '==', generatedQuizId),
      where('lrn', '==', lrn),
    );
    const snap = await getDocs(assignmentsQuery);

    for (const d of snap.docs) {
      await updateDoc(d.ref, {
        status: 'completed',
        completedAt: serverTimestamp(),
        score,
      });
    }

    // Also update GeneratedQuiz status
    try {
      await updateDoc(doc(db, 'generatedQuizzes', generatedQuizId), {
        status: 'completed' as GeneratedQuizStatus,
      });
    } catch {
      // non-critical
    }
  }
}

// ─── GET STUDENT COMPETENCY ─────────────────────────────────

export async function getStudentCompetency(lrn: string) {
  const response = await fetch(`${API_URL}/api/quiz/student-competency`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lrn }),
  });
  if (!response.ok) return null;
  return response.json();
}
