import type { Question, QuestionType } from '@/types/curriculum';
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
    // Backend QuizQuestion shape: `questionType` uses the underscore vocabulary
    // (identification, enumeration, multiple_choice, word_problem, equation_based).
    questionType: string;
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

type SubjectName =
  | 'General Mathematics'
  | 'Statistics and Probability'
  | 'Business Mathematics'
  | 'Finite Mathematics';


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
/**
 * Map a backend question type to the Try-It renderer's vocabulary. Only
 * multiple_choice ships options; every other backend kind is answered as
 * free text through the fill-in-blank path.
 */
const toUiQuestionType = (backendType: string): QuestionType =>
  backendType === 'multiple_choice' ? 'multiple-choice' : 'fill-in-blank';

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
        // Backend QuizGenerationRequest only accepts its underscore vocabulary.
        // Only multiple_choice ships options; the rest render as text answers.
        questionTypes: ['multiple_choice', 'identification', 'word_problem'],
        difficulty: 'medium',
        competencyCode,
        varianceSeed,
      }),
    });

    if (!response.questions?.length) {
      throw new Error('Quiz generation returned no lesson-specific questions.');
    }

    // Map API response to InteractiveLesson Question type. The backend attaches
    // options only to multiple_choice; every other kind is answered as text,
    // which the Try-It renderer supports via its fill-in-blank path.
    // SAFETY: the mapped values are exactly the QuestionType union members.
    return response.questions.map((q, index) => ({
      id: index,
      type: toUiQuestionType(q.questionType),
      question: q.question,
      options: q.options || undefined,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      hints: q.hints || [],
      bloomLevel: (q.bloomLevel || 'remember') as Question['bloomLevel'],
    }));
  } catch (error) {
    console.error('[lessonQuizService] Failed to generate quiz via API:', error);
    throw error;
  }
}

/**
 * Get the number of questions for a quiz type.
 */
export function getQuestionCountForQuiz(type: 'practice' | 'quiz'): number {
  return type === 'quiz' ? 8 : 6;
}

// ─── Internal Helpers ────────────────────────────────────────────────────

function _deriveSubjectName(subjectId?: string): SubjectName | null {
  if (!subjectId) return null;
  const sid = subjectId.toLowerCase();
  if (sid.includes('gen-math') || sid.includes('gen_math')) return 'General Mathematics';
  if (sid.includes('stats') || sid.includes('prob')) return 'Statistics and Probability';
  if (sid.includes('business')) return 'Business Mathematics';
  if (sid.includes('finite')) return 'Finite Mathematics';
  // Grade 11 only: legacy pre-calc / calculus ids fall back to General Mathematics.
  return null;
}
