import { describe, expect, it } from 'vitest';
import { computeHonestXp } from '../honestXp';

describe('honest XP regression', () => {
  it('retains a nonzero minimum after a high hint penalty', () => {
    expect(computeHonestXp({ quizScore: 100, hintsUsed: 20, streakDays: 1 })).toBe(10);
  });

  it('does not award a streak bonus for a zero-day streak', () => {
    expect(computeHonestXp({ quizScore: 0, hintsUsed: 0, streakDays: 0 })).toBe(30);
  });
});
