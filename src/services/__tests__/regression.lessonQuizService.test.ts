import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as apiService from '../apiService';
import { generateLessonQuiz } from '../lessonQuizService';

const apiFetchSpy = vi.spyOn(apiService, 'apiFetch');

describe('lesson quiz regression', () => {
  beforeEach(() => apiFetchSpy.mockReset());

  it('preserves lesson-specific answer and fills omitted hints with an empty list', async () => {
    apiFetchSpy.mockResolvedValue({
      questions: [{
        id: 1,
        type: 'multiple-choice',
        question: 'What is the rate?',
        options: ['principal', 'interest rate'],
        correctAnswer: 'interest rate',
        explanation: 'The rate is expressed as a percent.',
      }],
      retrievalConfidence: {},
      sourceChunks: 1,
      generatedAt: '2026-10-01T00:00:00.000Z',
    });

    await expect(generateLessonQuiz({ lessonId: 'lesson-1', lessonTitle: 'Interest', questionCount: 1 }))
      .resolves.toMatchObject([{ correctAnswer: 'interest rate', hints: [] }]);
  });

  it('does not silently substitute generic questions when the API returns none', async () => {
    apiFetchSpy.mockResolvedValue({ questions: [], retrievalConfidence: {}, sourceChunks: 0, generatedAt: '' });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(generateLessonQuiz({ lessonId: 'lesson-1', lessonTitle: 'Interest', questionCount: 1 }))
      .rejects.toThrow('Quiz generation returned no lesson-specific questions.');
  });
});
