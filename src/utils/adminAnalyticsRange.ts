export type AdminAnalyticsRange = '7d' | '30d' | '90d' | 'all';

export interface AnalyticsAttempt {
  learnerId: string;
  score: number | null;
  occurredAt: Date | null;
}

export function selectAnalyticsAttempts<T extends AnalyticsAttempt>(
  attempts: readonly T[],
  range: AdminAnalyticsRange,
  now: Date = new Date(),
): T[] {
  if (range === 'all') return [...attempts];
  const rangeDays = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const cutoff = now.getTime() - rangeDays * 24 * 60 * 60 * 1000;
  return attempts.filter(({ occurredAt }) => {
    if (!occurredAt || Number.isNaN(occurredAt.getTime())) return false;
    const occurredAtMs = occurredAt.getTime();
    return occurredAtMs >= cutoff && occurredAtMs <= now.getTime();
  });
}
