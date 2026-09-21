import { describe, expect, it } from 'vitest';

import {
  isRoundExpiredOrLocked,
  isStaleRoundError,
  shouldPostTimeoutSubmit,
  shouldRefetchExpiredBotMatch,
} from '../quizBattleService';

// Issue #154: timeout submits must never post selectedOptionIndex:null,
// and stale-round failures must trigger a client resync (no freeze).
// RED before the fix (helpers unexported), GREEN after.

describe('quizBattleSubmit client guards', () => {
  it('suppresses timeout posts with null selection', () => {
    expect(shouldPostTimeoutSubmit(null)).toBe(false);
    expect(shouldPostTimeoutSubmit(0)).toBe(true);
    expect(shouldPostTimeoutSubmit(2)).toBe(true);
  });

  it('detects stale-round failures that require a resync', () => {
    expect(isStaleRoundError('Expected round 2, received 1.')).toBe(true);
    expect(isStaleRoundError('Round timer elapsed. Fetching latest state.')).toBe(true);
    expect(isStaleRoundError('Match is not currently active.')).toBe(true);
    expect(isStaleRoundError('Unable to submit answer right now. Please try again.')).toBe(false);
  });

  describe('isRoundExpiredOrLocked', () => {
    it('(a1) locks when roundSecondsLeft === 0 with future deadline and unlocked state', () => {
      expect(
        isRoundExpiredOrLocked({
          roundSecondsLeft: 0,
          roundDeadlineAtMs: 1_700_000_100_000,
          roundLocked: false,
          answerSubmitting: false,
          now: 1_700_000_000_000,
        })
      ).toBe(true);
    });

    it('(a2) locks when roundSecondsLeft === -1 with future deadline and unlocked state', () => {
      expect(
        isRoundExpiredOrLocked({
          roundSecondsLeft: -1,
          roundDeadlineAtMs: 1_700_000_100_000,
          roundLocked: false,
          answerSubmitting: false,
          now: 1_700_000_000_000,
        })
      ).toBe(true);
    });

    it('(b) locks when Date.now() >= roundDeadlineAtMs with positive secondsLeft and unlocked state', () => {
      expect(
        isRoundExpiredOrLocked({
          roundSecondsLeft: 5,
          roundDeadlineAtMs: 1_700_000_050_000,
          roundLocked: false,
          answerSubmitting: false,
          now: 1_700_000_050_000,
        })
      ).toBe(true);
    });

    it('(c) locks when roundLocked is true with fresh timer', () => {
      expect(
        isRoundExpiredOrLocked({
          roundSecondsLeft: 10,
          roundDeadlineAtMs: 1_700_000_100_000,
          roundLocked: true,
          answerSubmitting: false,
          now: 1_700_000_000_000,
        })
      ).toBe(true);
    });

    it('(d) locks when answerSubmitting is true with fresh timer', () => {
      expect(
        isRoundExpiredOrLocked({
          roundSecondsLeft: 10,
          roundDeadlineAtMs: 1_700_000_100_000,
          roundLocked: false,
          answerSubmitting: true,
          now: 1_700_000_000_000,
        })
      ).toBe(true);
    });

    it('(e) allows input when round is fresh (positive timer, future deadline, unlocked, not submitting)', () => {
      expect(
        isRoundExpiredOrLocked({
          roundSecondsLeft: 10,
          roundDeadlineAtMs: 1_700_000_100_000,
          roundLocked: false,
          answerSubmitting: false,
          now: 1_700_000_000_000,
        })
      ).toBe(false);
    });
  });

  describe('shouldRefetchExpiredBotMatch', () => {
    it('(f1) refetches bot in_progress match past its round deadline', () => {
      expect(
        shouldRefetchExpiredBotMatch({
          mode: 'bot',
          status: 'in_progress',
          roundDeadlineAtMs: 1_700_000_000_000,
          now: 1_700_000_005_000,
        })
      ).toBe(true);
    });

    it('(f2) refetches exactly at the deadline boundary', () => {
      expect(
        shouldRefetchExpiredBotMatch({
          mode: 'bot',
          status: 'in_progress',
          roundDeadlineAtMs: 1_700_000_000_000,
          now: 1_700_000_000_000,
        })
      ).toBe(true);
    });

    it('(f3) skips bot match with a future deadline', () => {
      expect(
        shouldRefetchExpiredBotMatch({
          mode: 'bot',
          status: 'in_progress',
          roundDeadlineAtMs: 1_700_000_100_000,
          now: 1_700_000_000_000,
        })
      ).toBe(false);
    });

    it('(f4) skips online matches even past deadline', () => {
      expect(
        shouldRefetchExpiredBotMatch({
          mode: 'online',
          status: 'in_progress',
          roundDeadlineAtMs: 1_700_000_000_000,
          now: 1_700_000_005_000,
        })
      ).toBe(false);
    });

    it('(f5) skips non-progress matches and missing deadlines', () => {
      expect(
        shouldRefetchExpiredBotMatch({
          mode: 'bot',
          status: 'ready',
          roundDeadlineAtMs: 1_700_000_000_000,
          now: 1_700_000_005_000,
        })
      ).toBe(false);
      expect(
        shouldRefetchExpiredBotMatch({
          mode: 'bot',
          status: 'in_progress',
          roundDeadlineAtMs: undefined,
          now: 1_700_000_005_000,
        })
      ).toBe(false);
    });
  });
});
