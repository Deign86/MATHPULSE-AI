import { describe, expect, it } from 'vitest';
import { getWeakestDiagnosticTopics } from './recommendedTopics';

describe('getWeakestDiagnosticTopics', () => {
  it('moves the first recommendation to the next weakest competency after improvement', () => {
    const scores = {
      Functions: { correct: 2, attempted: 5 },
      Logic: { correct: 1, attempted: 5 },
      BusinessMath: { correct: 4, attempted: 5 },
    };
    expect(getWeakestDiagnosticTopics(scores)).toEqual(['Logic', 'Functions', 'BusinessMath']);
    expect(getWeakestDiagnosticTopics({
      ...scores,
      Logic: { correct: 5, attempted: 5 },
    })).toEqual(['Functions', 'BusinessMath', 'Logic']);
  });
});
