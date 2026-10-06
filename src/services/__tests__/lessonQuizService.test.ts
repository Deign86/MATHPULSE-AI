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
        questionType: 'multiple_choice',
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
      id: 0,
      type: 'multiple-choice',
      question: 'Which value is the interest rate?',
      options: ['Principal', 'Rate'],
      correctAnswer: 'Rate',
      explanation: 'The rate is the percent charged.',
      hints: [],
      bloomLevel: 'apply',
    }]);

    expect(apiFetchSpy).toHaveBeenCalledWith(
      '/api/quiz/generate',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('multiple_choice'),
      }),
    );
  });

  it('maps option-less backend kinds to the text-answer path', async () => {
    apiFetchSpy.mockResolvedValue({
      questions: [{
        questionType: 'identification',
        question: 'What is P = S - C?',
        correctAnswer: 'Profit',
        explanation: 'Profit equals sales minus cost.',
        bloomLevel: 'remember',
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
      id: 0,
      type: 'fill-in-blank',
      question: 'What is P = S - C?',
      options: undefined,
      correctAnswer: 'Profit',
      explanation: 'Profit equals sales minus cost.',
      hints: [],
      bloomLevel: 'remember',
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
