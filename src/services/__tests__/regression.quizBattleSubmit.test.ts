import { describe, expect, it } from 'vitest';
import { isRoundExpiredOrLocked, shouldPostTimeoutSubmit } from '../quizBattleService';

describe('quiz battle submit regression', () => {
  it('never posts a timeout answer without an option selection', () => {
    expect(shouldPostTimeoutSubmit(null)).toBe(false);
    expect(shouldPostTimeoutSubmit(0)).toBe(true);
  });

  it('locks a round at the exact deadline even while the displayed timer is positive', () => {
    expect(isRoundExpiredOrLocked({
      roundSecondsLeft: 1,
      roundDeadlineAtMs: 10_000,
      roundLocked: false,
      answerSubmitting: false,
      now: 10_000,
    })).toBe(true);
  });
});
