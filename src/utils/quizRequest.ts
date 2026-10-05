import type { QuizGenerationRequest } from '../services/apiService';

export function buildQuizRequestBasics(
  topics: string[],
  gradeLevel: string,
  numQuestions: number,
  title: string,
): Pick<QuizGenerationRequest, 'topics' | 'gradeLevel' | 'numQuestions' | 'title'> {
  return {
    topics,
    gradeLevel,
    numQuestions,
    title: title.trim() || undefined,
  };
}
