import { describe, expect, it } from 'vitest';
import type { QuizAttempt } from '../../types/models';
import { getUnlockedModuleIds, isModuleUnlocked } from '../unlockGate';

const makeAttempt = (quizId: string, score: number): QuizAttempt => ({
  quizId,
  attemptNumber: 1,
  score,
  completedAt: new Date(0),
  timeSpent: 0,
  answers: [],
});

describe('isModuleUnlocked', () => {
  it('keeps the first General Mathematics module open', () => {
    expect(isModuleUnlocked({
      subjectId: 'gen-math',
      moduleIndex: 0,
      quizAttempts: [],
      checkpointQuizId: 'gen-math-m2-q1',
    })).toBe(true);
  });

  it('locks a later module below the 75 percent gate', () => {
    expect(isModuleUnlocked({
      subjectId: 'gen-math',
      moduleIndex: 1,
      quizAttempts: [makeAttempt('gen-math-m1-q1', 74)],
      checkpointQuizId: 'gen-math-m1-q1',
    })).toBe(false);
  });

  it('opens a later module at exactly 75 percent', () => {
    expect(isModuleUnlocked({
      subjectId: 'gen-math',
      moduleIndex: 1,
      quizAttempts: [makeAttempt('gen-math-m1-q1', 75)],
      checkpointQuizId: 'gen-math-m1-q1',
    })).toBe(true);
  });

  it('locks a later module when there are no attempts', () => {
    expect(isModuleUnlocked({
      subjectId: 'finite-math',
      moduleIndex: 2,
      quizAttempts: [],
      checkpointQuizId: 'finite-math-m2-q1',
    })).toBe(false);
  });

  it('uses the highest matching checkpoint attempt', () => {
    expect(isModuleUnlocked({
      subjectId: 'gen-math',
      moduleIndex: 1,
      quizAttempts: [
        makeAttempt('gen-math-m1-q1', 74),
        makeAttempt('gen-math-m1-q1', 75),
      ],
      checkpointQuizId: 'gen-math-m1-q1',
    })).toBe(true);
  });

  it.each(['stats-prob', 'business-math'])('keeps shelved %s modules locked', (subjectId) => {
    expect(isModuleUnlocked({
      subjectId,
      moduleIndex: 0,
      quizAttempts: [makeAttempt(`${subjectId}-m1-q1`, 100)],
      checkpointQuizId: `${subjectId}-m1-q1`,
    })).toBe(false);
  });
});

describe('getUnlockedModuleIds', () => {
  it('returns the ordered unlocked prefix', () => {
    expect(getUnlockedModuleIds({
      subjectId: 'gen-math',
      moduleIds: ['m1', 'm2', 'm3'],
      checkpointQuizIds: ['', 'm1-q1', 'm2-q1'],
      quizAttempts: [makeAttempt('m1-q1', 75)],
    })).toEqual(['m1', 'm2']);
  });

  it('stops at the first locked module', () => {
    expect(getUnlockedModuleIds({
      subjectId: 'gen-math',
      moduleIds: ['m1', 'm2', 'm3'],
      checkpointQuizIds: ['', 'm1-q1', 'm2-q1'],
      quizAttempts: [makeAttempt('m1-q1', 74), makeAttempt('m2-q1', 100)],
    })).toEqual(['m1']);
  });
});

describe('Wave-2 unlock matrix', () => {
  it.each([
    ['gen-math', 74, false],
    ['gen-math', 75, true],
    ['finite-math', 74, false],
    ['finite-math', 75, true],
    ['stats-prob', 100, false],
    ['business-math', 100, false],
  ])('%s checkpoint score %i resolves to availability %s', (subjectId, score, expected) => {
    expect(isModuleUnlocked({
      subjectId,
      moduleIndex: subjectId === 'stats-prob' || subjectId === 'business-math' ? 0 : 1,
      quizAttempts: [makeAttempt(`${subjectId}-m1-q1`, score)],
      checkpointQuizId: `${subjectId}-m1-q1`,
    })).toBe(expected);
  });
});
