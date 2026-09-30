import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as apiService from '../apiService';
import { generateLessonQuiz, getQuestionCountForQuiz } from '../lessonQuizService';

const apiFetchSpy = vi.spyOn(apiService, 'apiFetch');

beforeEach(() => {
  apiFetchSpy.mockReset();
});

describe('lessonQuizService', () => {
  it('maps generated lesson questions from the API response', async () => {
    apiFetchSpy.mockResolvedValue({
      questions: [{
        id: 3,
        type: 'multiple-choice',
        question: 'Which value is the interest rate?',
        options: ['Principal', 'Rate'],
        correctAnswer: 'Rate',
        explanation: 'The rate is the percent charged.',
        bloomLevel: 'apply',
      }],
      retrievalConfidence: {},
      sourceChunks: 1,
      generatedAt: '2026-09-30T00:00:00.000Z',
    });

    await expect(generateLessonQuiz({
      lessonId: 'gm-1-l1',
      lessonTitle: 'Simple Interest',
      questionCount: 1,
    })).resolves.toEqual([{
      id: 3,
      type: 'multiple-choice',
      question: 'Which value is the interest rate?',
      options: ['Principal', 'Rate'],
      correctAnswer: 'Rate',
      explanation: 'The rate is the percent charged.',
      hints: [],
      bloomLevel: 'apply',
    }]);
  });

  it('rejects API failures instead of returning unrelated shared-bank questions', async () => {
    apiFetchSpy.mockRejectedValue(new Error('API unavailable'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(generateLessonQuiz({
      lessonId: 'gm-1-l1',
      lessonTitle: 'Simple Interest',
      questionCount: 6,
    })).rejects.toThrow('API unavailable');
    expect(errorSpy).toHaveBeenCalledWith(
      '[lessonQuizService] Failed to generate quiz via API:',
      expect.any(Error),
    );
  });

  it('rejects empty API question sets instead of serving generic questions', async () => {
    apiFetchSpy.mockResolvedValue({
      questions: [],
      retrievalConfidence: {},
      sourceChunks: 0,
      generatedAt: '2026-09-30T00:00:00.000Z',
    });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(generateLessonQuiz({
      lessonId: 'gm-1-l1',
      lessonTitle: 'Simple Interest',
      questionCount: 6,
    })).rejects.toThrow('Quiz generation returned no lesson-specific questions.');
  });

  describe('getQuestionCountForQuiz', () => {
    it('returns 6 for practice quizzes', () => {
      expect(getQuestionCountForQuiz('practice')).toBe(6);
    });

    it('returns 8 for module quizzes', () => {
      expect(getQuestionCountForQuiz('quiz')).toBe(8);
    });
  });
});
