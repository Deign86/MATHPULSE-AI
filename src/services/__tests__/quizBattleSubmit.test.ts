import { describe, expect, it } from 'vitest';

import {
  isStaleRoundError,
  shouldPostTimeoutSubmit,
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
});
