import { describe, expect, it } from 'vitest';
import { selectAnalyticsAttempts } from '../adminAnalyticsRange';

describe('selectAnalyticsAttempts', () => {
  const now = new Date('2026-10-05T12:00:00.000Z');
  const attempts = [
    { learnerId: 'one', score: 90, occurredAt: new Date('2026-10-04T12:00:00.000Z') },
    { learnerId: 'two', score: 70, occurredAt: new Date('2026-08-15T12:00:00.000Z') },
    { learnerId: 'three', score: 80, occurredAt: null },
  ];

  it('filters attempts by the requested range and retains their real export rows', () => {
    expect(selectAnalyticsAttempts(attempts, '7d', now)).toEqual([attempts[0]]);
    expect(selectAnalyticsAttempts(attempts, '30d', now)).toEqual([attempts[0]]);
    expect(selectAnalyticsAttempts(attempts, '90d', now)).toEqual(attempts.slice(0, 2));
  });

  it('includes legacy undated attempts only in the all-time report', () => {
    expect(selectAnalyticsAttempts(attempts, 'all', now)).toEqual(attempts);
  });
});
