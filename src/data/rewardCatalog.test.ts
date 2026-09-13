import { describe, expect, it } from 'vitest';
import { REWARD_CATALOG, pickWeeklyRewards, getWeekSeed } from './rewardCatalog';
import type { RewardPayload } from '../types/rewards';

describe('REWARD_CATALOG invariants', () => {
  it('has unique ids', () => {
    const ids = REWARD_CATALOG.map((reward) => reward.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has at least 7 rewards so a week can be filled', () => {
    expect(REWARD_CATALOG.length).toBeGreaterThanOrEqual(7);
  });

  it('gives numeric-variant rewards a positive number value', () => {
    const numeric = REWARD_CATALOG.filter(
      (reward): reward is Extract<RewardPayload, { value: number }> =>
        reward.type === 'xp' || reward.type === 'hint_token' || reward.type === 'streak_shield',
    );
    expect(numeric.length).toBeGreaterThan(0);
    for (const reward of numeric) {
      // Number.isFinite already rejects non-numbers, so it also proves the field is numeric.
      expect(Number.isFinite(reward.value), reward.id).toBe(true);
      expect(reward.value, reward.id).toBeGreaterThan(0);
      expect(Number.isInteger(reward.value), reward.id).toBe(true);
    }
  });

  it('gives every XP multiplier an explicit duration and multiplier', () => {
    const multipliers = REWARD_CATALOG.filter(
      (reward): reward is Extract<RewardPayload, { type: 'xp_multiplier' }> =>
        reward.type === 'xp_multiplier',
    );
    expect(multipliers.length).toBeGreaterThan(0);
    for (const reward of multipliers) {
      expect(Number.isFinite(reward.durationMinutes), reward.id).toBe(true);
      expect(reward.durationMinutes, reward.id).toBeGreaterThan(0);
      // A multiplier below 1 would reduce XP; below-or-equal 1 is never a reward.
      expect(reward.multiplier, reward.id).toBeGreaterThan(1);
    }
  });

  it('does not derive multiplier magnitude from the reward id', () => {
    // Regression guard: `xp_mult_30m` promised x2 but `id.includes('2')` was false,
    // so the catalog silently applied x1.5. Magnitude must come from the payload.
    const thirtyMinute = REWARD_CATALOG.find((reward) => reward.id === 'xp_mult_30m');
    expect(thirtyMinute?.type).toBe('xp_multiplier');
    if (thirtyMinute?.type === 'xp_multiplier') {
      expect(thirtyMinute.multiplier).toBe(2);
      expect(thirtyMinute.durationMinutes).toBe(30);
    }
  });

  it('gives every badge reward a non-empty badge id', () => {
    const badges = REWARD_CATALOG.filter(
      (reward): reward is Extract<RewardPayload, { type: 'badge_unlock' }> =>
        reward.type === 'badge_unlock',
    );
    for (const badge of badges) {
      expect(badge.badgeId.trim().length, badge.id).toBeGreaterThan(0);
    }
  });
});

describe('pickWeeklyRewards', () => {
  it('returns exactly 7 rewards with sequential day indices', () => {
    const weekly = pickWeeklyRewards(202601);
    expect(weekly).toHaveLength(7);
    expect(weekly.map((reward) => reward.day)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('is deterministic for the same seed', () => {
    const first = pickWeeklyRewards(202601).map((reward) => reward.id);
    const second = pickWeeklyRewards(202601).map((reward) => reward.id);
    expect(first).toEqual(second);
  });

  it('produces a stable selection for the current week seed', () => {
    const seed = getWeekSeed();
    expect(pickWeeklyRewards(seed).map((reward) => reward.id)).toEqual(
      pickWeeklyRewards(seed).map((reward) => reward.id),
    );
  });

  it('does not mutate the catalog', () => {
    const before = REWARD_CATALOG.map((reward) => reward.id);
    pickWeeklyRewards(202602);
    expect(REWARD_CATALOG.map((reward) => reward.id)).toEqual(before);
  });
});
