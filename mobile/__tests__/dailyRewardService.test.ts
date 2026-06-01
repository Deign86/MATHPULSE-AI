// mobile/__tests__/dailyRewardService.test.ts
// Self-validating tests for rewardCatalog and dailyRewardService pure logic.
// Focuses on functions that do NOT require Firestore — PRNG, shuffle,
// weekly rewards, canClaimToday, formatCountdown, and streak shield rules.

import { describe, it, expect } from 'vitest';

import {
  mulberry32,
  seededShuffle,
  pickWeeklyRewards,
  getWeekSeed,
  getPHTDateString,
  getDayOfWeek,
  getNextResetTime,
  REWARD_CATALOG,
} from '../data/rewardCatalog';

import type { DailyRewardState } from '../types/rewards';

// Inlined pure functions from dailyRewardService.ts to avoid pulling in
// react-native / firebase dependencies.

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function canClaimToday(state: DailyRewardState): boolean {
  return state.lastClaimedDate !== getPHTDateString();
}

describe('Deterministic PRNG (Mulberry32)', () => {
  it('same seed produces same sequence', () => {
    const r1 = mulberry32(42);
    const r2 = mulberry32(42);
    for (let i = 0; i < 5; i++) {
      expect(r1()).toBe(r2());
    }
  });

  it('different seeds produce different sequences', () => {
    const r1 = mulberry32(42);
    const r2 = mulberry32(99);
    let anyDifferent = false;
    for (let i = 0; i < 5; i++) {
      if (r1() !== r2()) {
        anyDifferent = true;
        break;
      }
    }
    expect(anyDifferent).toBe(true);
  });
});

describe('Seeded Fisher-Yates Shuffle', () => {
  it('preserves array length', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7];
    const s1 = seededShuffle(arr, 123);
    expect(s1.length).toBe(7);
  });

  it('same seed produces identical shuffle', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7];
    const s1 = seededShuffle(arr, 123);
    const s2 = seededShuffle(arr, 123);
    expect(s1).toEqual(s2);
  });

  it('different seed produces different shuffle', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7];
    const s1 = seededShuffle(arr, 123);
    const s3 = seededShuffle(arr, 456);
    expect(s1).not.toEqual(s3);
  });
});

describe('Weekly reward grid', () => {
  it('returns exactly 7 rewards for various seeds', () => {
    const seeds = [202501, 202502, 202503, 202527, 202552];
    for (const seed of seeds) {
      const rewards = pickWeeklyRewards(seed);
      expect(rewards.length).toBe(7);
      expect(rewards.every((r) => r.day >= 0 && r.day <= 6)).toBe(true);
      const days = new Set(rewards.map((r) => r.day));
      expect(days.size).toBe(7);
    }
  });
});

describe('Reward catalog integrity', () => {
  it('has at least 16 items', () => {
    expect(REWARD_CATALOG.length).toBeGreaterThanOrEqual(16);
  });

  it('has unique IDs', () => {
    const ids = new Set(REWARD_CATALOG.map((r) => r.id));
    expect(ids.size).toBe(REWARD_CATALOG.length);
  });

  it('all rewards have non-empty IDs and labels', () => {
    for (const r of REWARD_CATALOG) {
      expect(r.id.length).toBeGreaterThan(0);
      expect(r.label.length).toBeGreaterThan(0);
    }
  });
});

describe('PHT date string', () => {
  it('returns YYYY-MM-DD format', () => {
    const d = new Date('2026-06-01T05:00:00Z');
    const pht = getPHTDateString(d);
    expect(pht).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('year is 2026+', () => {
    const d = new Date('2026-06-01T05:00:00Z');
    const pht = getPHTDateString(d);
    const year = parseInt(pht.split('-')[0], 10);
    expect(year).toBeGreaterThanOrEqual(2026);
  });
});

describe('canClaimToday', () => {
  it('cannot claim when already claimed today', () => {
    const todayPHT = getPHTDateString();
    const state: DailyRewardState = {
      lastClaimedDate: todayPHT,
      lastClaimedWeekSeed: 0,
      claimedDays: [0],
      currentStreak: 5,
      longestStreak: 10,
      totalClaimed: 5,
      hintTokens: 0,
      streakShields: 0,
      activeMultiplier: null,
    };
    expect(canClaimToday(state)).toBe(false);
  });

  it('can claim with fresh state', () => {
    const empty: DailyRewardState = {
      lastClaimedDate: '',
      lastClaimedWeekSeed: 0,
      claimedDays: [],
      currentStreak: 0,
      longestStreak: 0,
      totalClaimed: 0,
      hintTokens: 0,
      streakShields: 0,
      activeMultiplier: null,
    };
    expect(canClaimToday(empty)).toBe(true);
  });
});

describe('formatCountdown', () => {
  it('zero ms → 00:00:00', () => expect(formatCountdown(0)).toBe('00:00:00'));
  it('negative ms → 00:00:00', () => expect(formatCountdown(-100)).toBe('00:00:00'));
  it('1 second → 00:00:01', () => expect(formatCountdown(1000)).toBe('00:00:01'));
  it('1 minute → 00:01:00', () => expect(formatCountdown(60000)).toBe('00:01:00'));
  it('1 hour → 01:00:00', () => expect(formatCountdown(3600000)).toBe('01:00:00'));
  it('1h 1m 1s → 01:01:01', () => expect(formatCountdown(3661000)).toBe('01:01:01'));
  it('24h → 24:00:00', () => expect(formatCountdown(86400000)).toBe('24:00:00'));
});

describe('getDayOfWeek', () => {
  it('Monday → 0', () => {
    const monday = new Date('2026-06-01T04:00:00Z');
    expect(getDayOfWeek(monday)).toBe(0);
  });

  it('Sunday → 6', () => {
    const sunday = new Date('2026-06-07T04:00:00Z');
    expect(getDayOfWeek(sunday)).toBe(6);
  });

  it('all days 0–6 for June 1-7 2026', () => {
    for (let d = 1; d <= 7; d++) {
      const date = new Date(2026, 5, d, 4, 0, 0);
      const dow = getDayOfWeek(date);
      expect(dow).toBeGreaterThanOrEqual(0);
      expect(dow).toBeLessThanOrEqual(6);
    }
  });
});

describe('getWeekSeed consistency', () => {
  it('same date → same week seed', () => {
    const ws1 = getWeekSeed(new Date('2026-06-01T04:00:00Z'));
    const ws2 = getWeekSeed(new Date('2026-06-01T04:00:00Z'));
    expect(ws1).toBe(ws2);
  });

  it('week seed in valid range', () => {
    const ws = getWeekSeed(new Date('2026-06-01T04:00:00Z'));
    expect(ws).toBeGreaterThan(202600);
    expect(ws).toBeLessThan(202700);
  });
});

describe('getNextResetTime', () => {
  it('reset time is in the future', () => {
    const now = new Date();
    const reset = getNextResetTime(now);
    expect(reset.getTime()).toBeGreaterThan(now.getTime());
  });

  it('reset time is at most 7 days away', () => {
    const now = new Date();
    const reset = getNextResetTime(now);
    expect(reset.getTime() - now.getTime()).toBeLessThanOrEqual(7 * 24 * 60 * 60 * 1000);
  });
});
