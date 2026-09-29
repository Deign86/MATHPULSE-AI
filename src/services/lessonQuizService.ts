import type { Question } from '@/types/curriculum';
import { apiFetch } from './apiService';

interface LessonQuizParams {
  lessonId: string;
  lessonTitle: string;
  topic?: string; // specific lesson topic (e.g., "Simple Interest"), overrides lessonTitle for RAG retrieval
  subjectId?: string;
  competencyCode?: string;
  questionCount?: number;
}

/** Per-strategy retrieval confidence scores returned alongside generated questions. */
interface RetrievalConfidence { [strategy: string]: number }

interface QuizGenerationResponse {
  questions: Array<{
    id: number;
    type: string;
    question: string;
    options?: string[];
    correctAnswer: string;
    explanation: string;
    hints?: string[];
    bloomLevel?: string;
  }>;
  retrievalConfidence: RetrievalConfidence;
  sourceChunks: number;
  generatedAt: string;
}

// Minimal fallback bank for offline/development use only
const FALLBACK_QUESTIONS: Question[] = [
  {
    id: 1,
    type: 'multiple-choice',
    question: 'What is the value of π (pi) to two decimal places?',
    options: ['3.12', '3.14', '3.16', '3.18'],
    correctAnswer: '3.14',
    explanation: 'π ≈ 3.14159..., so to two decimal places it is 3.14.',
  },
  {
    id: 2,
    type: 'true-false',
    question: 'The sum of angles in a triangle is 180 degrees.',
    correctAnswer: 'True',
    explanation: 'The interior angles of any Euclidean triangle sum to 180°.',
  },
  {
    id: 3,
    type: 'fill-in-blank',
    question: 'If 2x + 5 = 13, then x = ___.',
    correctAnswer: '4',
    explanation: '2x = 13 - 5 = 8 → x = 4.',
  },
  {
    id: 4,
    type: 'multiple-choice',
    question: 'Which of the following is a prime number?',
    options: ['9', '15', '17', '21'],
    correctAnswer: '17',
    explanation: '17 is only divisible by 1 and itself. 9=3×3, 15=3×5, 21=3×7.',
  },
  {
    id: 5,
    type: 'true-false',
    question: 'The slope of a horizontal line is zero.',
    correctAnswer: 'True',
    explanation: 'A horizontal line has no rise, so rise/run = 0.',
  },
  {
    id: 6,
    type: 'fill-in-blank',
    question: 'The square root of 144 is ___.',
    correctAnswer: '12',
    explanation: '12 × 12 = 144, so √144 = 12.',
  },
];

type SubjectFallbackName =
  | 'General Mathematics'
  | 'Statistics and Probability'
  | 'Business Mathematics'
  | 'Finite Mathematics';

const SUBJECT_FALLBACK_QUESTIONS = {
  'General Mathematics': [
    { id: 7, type: 'multiple-choice', question: 'A shirt marked ₱800 is discounted by 10%. What is the sale price?', options: ['₱720', '₱780', '₱790', '₱880'], correctAnswer: '₱720', explanation: 'Ten percent of ₱800 is ₱80, so the sale price is ₱800 − ₱80 = ₱720.' },
    { id: 8, type: 'fill-in-blank', question: 'A ₱500 investment earns 4% simple interest for one year. The interest is ₱___.', correctAnswer: '20', explanation: 'I = Prt = ₱500 × 0.04 × 1 = ₱20.' },
  ],
  'Statistics and Probability': [
    { id: 7, type: 'multiple-choice', question: 'What is the mean of 2, 4, and 9?', options: ['4', '5', '6', '15'], correctAnswer: '5', explanation: 'The mean is (2 + 4 + 9) ÷ 3 = 5.' },
    { id: 8, type: 'fill-in-blank', question: 'A fair coin is flipped once. The probability of heads is ___.', correctAnswer: '1/2', explanation: 'One of the two equally likely outcomes is heads.' },
  ],
  'Business Mathematics': [
    { id: 7, type: 'multiple-choice', question: 'An item costs ₱200 and sells for ₱250. What is the profit?', options: ['₱25', '₱50', '₱200', '₱450'], correctAnswer: '₱50', explanation: 'Profit is selling price minus cost: ₱250 − ₱200 = ₱50.' },
    { id: 8, type: 'fill-in-blank', question: 'A 20% discount on ₱1,000 is ₱___.', correctAnswer: '200', explanation: '₱1,000 × 0.20 = ₱200.' },
  ],
  'Finite Mathematics': [
    { id: 7, type: 'multiple-choice', question: 'How many ways can 2 students be selected from a group of 4?', options: ['4', '6', '8', '12'], correctAnswer: '6', explanation: 'The number of selections is 4 choose 2 = 4! ÷ (2!2!) = 6.' },
    { id: 8, type: 'fill-in-blank', question: 'A set with 3 elements has ___ subsets.', correctAnswer: '8', explanation: 'A set with n elements has 2ⁿ subsets; 2³ = 8.' },
  ],
} satisfies Record<SubjectFallbackName, Question[]>;

/**
 * Generate lesson quiz questions via DeepSeek AI + RAG curriculum context.
 *
 * This function calls the backend API which:
 * 1. Retrieves relevant curriculum chunks from the vectorstore via RAG
 * 2. Calls DeepSeek to generate varied quiz questions from that context
 * 3. Applies variance (choice shuffling, paraphrasing)
 * 4. Returns structured questions in InteractiveLesson-compatible format
 *
 * When new PDFs are ingested into the vectorstore, they automatically
 * become available for quiz generation — no code changes needed.
 */
export async function generateLessonQuiz(params: LessonQuizParams): Promise<Question[]> {
  const { lessonTitle, topic, subjectId, competencyCode, questionCount = 6 } = params;

  // Derive subject name from subjectId or use default
  const subjectName = _deriveSubjectName(subjectId) || 'General Mathematics';

  // Derive deterministic seed per lesson for consistent retry behavior
  // (Different lessons still get different questions via backend chunk shuffle)
  const varianceSeed = params.lessonId
    ? Math.abs(params.lessonId.split('').reduce((acc, c) => (Math.imul(31, acc) + c.charCodeAt(0)) | 0, 0)) % 1_000_000
    : Math.floor(Math.random() * 1_000_000);

  try {
    const response = await apiFetch<QuizGenerationResponse>('/api/quiz/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: topic || lessonTitle,
        subject: subjectName,
        lessonTitle,
        questionCount,
        questionTypes: ['multiple-choice', 'true-false', 'fill-in-blank'],
        difficulty: 'medium',
        competencyCode,
        varianceSeed,
      }),
    });

    if (!response.questions || response.questions.length === 0) {
      console.warn('[lessonQuizService] API returned empty questions, using fallback');
      return _getFallbackQuestions(questionCount, varianceSeed, subjectName);
    }

    // Map API response to InteractiveLesson Question type
    // SAFETY: the quiz API returns question/type/bloom values already constrained to the Question unions.
    return response.questions.map((q) => ({
      id: q.id,
      type: q.type as Question['type'],
      question: q.question,
      options: q.options || undefined,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      hints: q.hints || [],
      bloomLevel: (q.bloomLevel || 'remember') as Question['bloomLevel'],
    }));
  } catch (error) {
    console.error('[lessonQuizService] Failed to generate quiz via API:', error);
    console.warn('[lessonQuizService] Using fallback questions');
    return _getFallbackQuestions(questionCount, varianceSeed, subjectName);
  }
}

/**
 * Get the number of questions for a quiz type.
 */
export function getQuestionCountForQuiz(type: 'practice' | 'quiz'): number {
  return type === 'quiz' ? 8 : 6;
}

// ─── Internal Helpers ────────────────────────────────────────────────────

function _deriveSubjectName(subjectId?: string): SubjectFallbackName | null {
  if (!subjectId) return null;
  const sid = subjectId.toLowerCase();
  if (sid.includes('gen-math') || sid.includes('gen_math')) return 'General Mathematics';
  if (sid.includes('stats') || sid.includes('prob')) return 'Statistics and Probability';
  if (sid.includes('business')) return 'Business Mathematics';
  if (sid.includes('finite')) return 'Finite Mathematics';
  // Grade 11 only: legacy pre-calc / calculus ids fall back to General Mathematics.
  return null;
}

function _isSubjectFallbackName(subjectName: string): subjectName is SubjectFallbackName {
  return Object.prototype.hasOwnProperty.call(SUBJECT_FALLBACK_QUESTIONS, subjectName);
}

function _getFallbackQuestions(count: number, seed: number, subjectName: string): Question[] {
  const subjectQuestions = _isSubjectFallbackName(subjectName) ? SUBJECT_FALLBACK_QUESTIONS[subjectName] : [];
  const bank: Question[] = [...FALLBACK_QUESTIONS, ...subjectQuestions];
  const shuffled = _seededShuffle(bank, seed);
  const selected: Question[] = [];
  const includedTypes = new Set<Question['type']>();

  if (count > 0 && subjectQuestions.length > 0) {
    selected.push(_seededShuffle(subjectQuestions, seed)[0]);
    includedTypes.add(selected[0].type);
  }
  for (const question of shuffled) {
    if (!includedTypes.has(question.type) && selected.length < count) {
      selected.push(question);
      includedTypes.add(question.type);
    }
  }
  for (const question of shuffled) {
    if (selected.length >= count) break;
    if (!selected.includes(question)) selected.push(question);
  }

  return selected.map((q, i) => ({
    ...q,
    id: i + 1,
  }));
}

function _seededShuffle<T>(values: T[], seed: number): T[] {
  const shuffled = [...values];
  let state = seed || 1;
  for (let index = shuffled.length - 1; index > 0; index--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const swapIndex = state % (index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}
