/**
 * @file display.ts
 * Single-source display selectors (issue #158).
 *
 * Dashboard banner, leaderboard YOU row, and every other XP surface must read
 * through `selectDisplayXP` so they cannot disagree: lifetime `totalXP` wins,
 * spendable `currentXP` is only a legacy fallback. Count nouns go through
 * `pluralize` so `1 quiz` never renders as `1 quizzes`. Leaderboard rows go
 * through `sortByXpDesc` so order is strictly by score.
 */

import { z } from 'zod';

/** Lifetime XP wins; spendable XP is a legacy fallback; missing data is zero. */
export function selectDisplayXP(totalXP: number | null | undefined, currentXP: number | null | undefined): number {
  const lifetime = z.number().safeParse(totalXP);
  if (lifetime.success && Number.isFinite(lifetime.data)) return lifetime.data;
  const spendable = z.number().safeParse(currentXP);
  if (spendable.success && Number.isFinite(spendable.data)) return spendable.data;
  return 0;
}

/** Count noun with correct singular/plural form (`1 quiz`, `2 quizzes`). */
export function pluralize(count: number, singular: string, plural?: string): string {
  return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}

/**
 * Strict score-descending order as a fresh array (never mutates the input).
 * V8 sort is stable, so tied scores keep their incoming (server-rank) order.
 */
export function sortByXpDesc<Row extends { totalXP: number }>(rows: readonly Row[]): Row[] {
  return [...rows].sort((a, b) => b.totalXP - a.totalXP);
}
