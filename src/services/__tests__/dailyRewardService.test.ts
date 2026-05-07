/**
 * @file dailyRewardService.test.ts
 * Unit tests for daily reward catalog + utility functions.
 * NOTE: Firestore-dependent functions (getDailyRewardState, claimDailyReward)
 * are integration-tested; here we test pure logic only.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  mulberry32,
  seededShuffle,
  pickWeeklyRewards,
  getWeekSeed,
  getDayOfWeek,
  getPHTDateString,
  getPHTDate,
  getNextResetTime,
  REWARD_CATALOG,
} from '../../data/rewardCatalog';
import { canClaimToday, formatCountdown } from '../../services/dailyRewardService';
import { DailyRewardState } from '../../types/rewards';

describe('mulberry32 PRNG', () => {
  it('produces deterministic sequence for same seed', () => {
    const randA = mulberry32(42);
    const randB = mulberry32(42);
    for (let i = 0; i < 20; i++) {
      expect(randA()).toBe(randB());
    }
  });

  it('produces different sequence for different seeds', () => {
    const randA = mulberry32(42);
    const randB = mulberry32(43);
    let allSame = true;
    for (let i = 0; i < 10; i++) {
      if (randA() !== randB()) allSame = false;
    }
    expect(allSame).toBe(false);
  });

  it('produces values in [0, 1)', () => {
    const rand = mulberry32(123);
    for (let i = 0; i < 100; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('seededShuffle', () => {
  it('returns same order for same seed', () => {
    const arr = ['a', 'b', 'c', 'd', 'e'];
    const shuffledA = seededShuffle(arr, 999);
    const shuffledB = seededShuffle(arr, 999);
    expect(shuffledA).toEqual(shuffledB);
  });

  it('returns different order for different seeds', () => {
    const arr = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const shuffledA = seededShuffle(arr, 1);
    const shuffledB = seededShuffle(arr, 2);
    expect(shuffledA).not.toEqual(shuffledB);
  });

  it('preserves all elements', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = seededShuffle(arr, 77);
    expect(shuffled.sort()).toEqual(arr.sort());
  });
});

describe('pickWeeklyRewards', () => {
  it('returns exactly 7 rewards', () => {
    const rewards = pickWeeklyRewards(202620);
    expect(rewards).toHaveLength(7);
  });

  it('assigns day indices 0–6', () => {
    const rewards = pickWeeklyRewards(202620);
    rewards.forEach((r, i) => {
      expect(r.day).toBe(i);
    });
  });

  it('is deterministic for same week seed', () => {
    const a = pickWeeklyRewards(202620);
    const b = pickWeeklyRewards(202620);
    expect(a).toEqual(b);
  });

  it('returns different rewards for different week seeds', () => {
    const a = pickWeeklyRewards(202620);
    const b = pickWeeklyRewards(202621);
    // At least one reward should differ
    const idsA = a.map((r) => r.id).join(',');
    const idsB = b.map((r) => r.id).join(',');
    expect(idsA).not.toBe(idsB);
  });

  it('only picks from the catalog', () => {
    const rewards = pickWeeklyRewards(202620);
    const catalogIds = new Set(REWARD_CATALOG.map((r) => r.id));
    rewards.forEach((r) => {
      expect(catalogIds.has(r.id)).toBe(true);
    });
  });
});

describe('getWeekSeed', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a number in format YYYYWW', () => {
    // 2026-05-07 is a Thursday in week 19 of 2026
    vi.setSystemTime(new Date('2026-05-07T12:00:00Z'));
    const seed = getWeekSeed();
    expect(typeof seed).toBe('number');
    expect(seed).toBeGreaterThan(202600);
    expect(seed).toBeLessThan(202653);
  });

  it('is deterministic for same date', () => {
    vi.setSystemTime(new Date('2026-05-07T12:00:00Z'));
    const a = getWeekSeed();
    const b = getWeekSeed();
    expect(a).toBe(b);
  });
});

describe('getDayOfWeek', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 0 for Monday', () => {
    // 2026-05-04 is Monday in PHT
    vi.setSystemTime(new Date('2026-05-04T12:00:00+08:00'));
    expect(getDayOfWeek()).toBe(0);
  });

  it('returns 6 for Sunday', () => {
    // 2026-05-10 is Sunday in PHT
    vi.setSystemTime(new Date('2026-05-10T12:00:00+08:00'));
    expect(getDayOfWeek()).toBe(6);
  });
});

describe('getPHTDateString', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns YYYY-MM-DD format', () => {
    vi.setSystemTime(new Date('2026-05-07T12:00:00+08:00'));
    const str = getPHTDateString();
    expect(str).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns correct PHT date near midnight', () => {
    // 2026-05-07 23:30 PHT = 2026-05-07 15:30 UTC
    vi.setSystemTime(new Date('2026-05-07T15:30:00Z'));
    expect(getPHTDateString()).toBe('2026-05-07');
  });

  it('returns next day after PHT midnight', () => {
    // 2026-05-08 01:30 PHT = 2026-05-07 17:30 UTC
    vi.setSystemTime(new Date('2026-05-07T17:30:00Z'));
    expect(getPHTDateString()).toBe('2026-05-08');
  });
});

describe('getNextResetTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns next Monday 00:00 PHT from a Wednesday', () => {
    // 2026-05-07 is Wednesday PHT
    vi.setSystemTime(new Date('2026-05-07T12:00:00+08:00'));
    const reset = getNextResetTime();
    const phtReset = getPHTDate(reset);
    expect(phtReset.getDay()).toBe(1); // Monday
    expect(phtReset.getHours()).toBe(0);
    expect(phtReset.getMinutes()).toBe(0);
    expect(phtReset.getSeconds()).toBe(0);
  });

  it('returns next Monday from a Sunday', () => {
    // 2026-05-10 is Sunday PHT
    vi.setSystemTime(new Date('2026-05-10T12:00:00+08:00'));
    const reset = getNextResetTime();
    const phtReset = getPHTDate(reset);
    expect(phtReset.getDay()).toBe(1); // Monday
  });
});

describe('canClaimToday', () => {
  it('returns true when lastClaimedDate is empty', () => {
    const state: DailyRewardState = { ...createEmptyState(), lastClaimedDate: '' };
    expect(canClaimToday(state)).toBe(true);
  });

  it('returns true when lastClaimedDate is yesterday', () => {
    const state: DailyRewardState = { ...createEmptyState(), lastClaimedDate: '2026-05-06' };
    expect(canClaimToday(state)).toBe(true);
  });

  it('returns false when already claimed today', () => {
    const state: DailyRewardState = { ...createEmptyState(), lastClaimedDate: '2026-05-07' };
    expect(canClaimToday(state)).toBe(false);
  });
});

describe('formatCountdown', () => {
  it('formats 1h 1m 1s correctly', () => {
    expect(formatCountdown(3661000)).toBe('01:01:01');
  });

  it('formats 0 ms as 00:00:00', () => {
    expect(formatCountdown(0)).toBe('00:00:00');
  });

  it('formats negative as 00:00:00', () => {
    expect(formatCountdown(-1000)).toBe('00:00:00');
  });

  it('pads single digits', () => {
    expect(formatCountdown(1000 * 61)).toBe('00:01:01');
  });
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function createEmptyState(): DailyRewardState {
  return {
    lastClaimedDate: '',
    lastClaimedWeekSeed: 0,
    claimedDays: [],
    currentStreak: 0,
    longestStreak: 0,
    totalClaimed: 0,
    coins: 0,
    hintTokens: 0,
    streakShields: 0,
    activeMultiplier: null,
  };
}
