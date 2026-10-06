import { describe, expect, it } from 'vitest';
import type { QuizAttempt } from '../../types/models';
import { calculateLatestAttemptAverage } from '../progressService';

const attempt = (quizId: string, attemptNumber: number, score: number): QuizAttempt => ({
  quizId,
  attemptNumber,
  score,
  completedAt: new Date(attemptNumber),
  timeSpent: 0,
  answers: [],
});

describe('risk average from latest quiz attempts', () => {
  it('uses the newest attempt per quiz instead of averaging the entire attempt history', () => {
    expect(calculateLatestAttemptAverage([
      attempt('quiz-a', 1, 20),
      attempt('quiz-a', 2, 100),
      attempt('quiz-b', 1, 80),
    ])).toBe(90);
  });

  it('returns zero when no quiz attempts exist', () => {
    expect(calculateLatestAttemptAverage([])).toBe(0);
  });
});
