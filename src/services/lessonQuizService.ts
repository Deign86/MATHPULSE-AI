import type { Question } from '../components/InteractiveLesson';
import { apiFetch } from './apiService';

interface LessonQuizParams {
  lessonId: string;
  lessonTitle: string;
  topic?: string; // specific lesson topic (e.g., "Simple Interest"), overrides lessonTitle for RAG retrieval
  subjectId?: string;
  competencyCode?: string;
  questionCount?: number;
}

interface QuizGenerationResponse {
  questions: Array<{
    id: number;
    type: string;
    question: string;
    options?: string[];
    correctAnswer: string;
    explanation: string;
  }>;
  retrievalConfidence: Record<string, unknown>;
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

  // Generate unique variance seed for this attempt
  const varianceSeed = Math.floor(Math.random() * 1000000);

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
      return _getFallbackQuestions(questionCount);
    }

    // Map API response to InteractiveLesson Question type
    return response.questions.map((q) => ({
      id: q.id,
      type: q.type as Question['type'],
      question: q.question,
      options: q.options || undefined,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
    }));
  } catch (error) {
    console.error('[lessonQuizService] Failed to generate quiz via API:', error);
    console.warn('[lessonQuizService] Using fallback questions');
    return _getFallbackQuestions(questionCount);
  }
}

/**
 * Get the number of questions for a quiz type.
 */
export function getQuestionCountForQuiz(type: 'practice' | 'quiz'): number {
  return type === 'quiz' ? 8 : 6;
}

// ─── Internal Helpers ────────────────────────────────────────────────────

function _deriveSubjectName(subjectId?: string): string | null {
  if (!subjectId) return null;
  const sid = subjectId.toLowerCase();
  if (sid.includes('gen-math') || sid.includes('gen_math')) return 'General Mathematics';
  if (sid.includes('stats') || sid.includes('prob')) return 'Statistics and Probability';
  if (sid.includes('pre-calc') || sid.includes('pre_calc')) return 'Pre-Calculus';
  if (sid.includes('basic-calc') || sid.includes('basic_calc') || sid.includes('calculus')) return 'Basic Calculus';
  return null;
}

function _getFallbackQuestions(count: number): Question[] {
  const shuffled = [...FALLBACK_QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length)).map((q, i) => ({
    ...q,
    id: i + 1,
  }));
}
