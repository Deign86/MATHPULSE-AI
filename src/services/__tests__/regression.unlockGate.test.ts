import { describe, expect, it } from 'vitest';
import type { QuizAttempt } from '../../types/models';
import { getUnlockedModuleIds } from '../unlockGate';

const attempt = (quizId: string, score: number): QuizAttempt => ({
  quizId,
  attemptNumber: 1,
  score,
  completedAt: new Date(0),
  timeSpent: 0,
  answers: [],
});

describe('unlock gate regression', () => {
  it('does not let a later high-scoring quiz bypass the first locked checkpoint', () => {
    expect(getUnlockedModuleIds({
      subjectId: 'gen-math',
      moduleIds: ['m1', 'm2', 'm3'],
      checkpointQuizIds: ['', 'm1-check', 'm2-check'],
      quizAttempts: [attempt('m1-check', 74), attempt('m2-check', 100)],
    })).toEqual(['m1']);
  });
});
