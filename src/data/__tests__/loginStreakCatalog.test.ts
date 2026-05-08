/**
 * @file loginStreakCatalog.test.ts
 * Unit tests for loginStreakCatalog.ts — TDD Red phase (tests written before implementation).
 */

import { describe, it, expect } from 'vitest';
import {
  getStreakReward,
  getStreakRewardWithLives,
  getStreakDayFromDate,
  STREAK_CATALOG,
} from '../loginStreakCatalog';

describe('loginStreakCatalog', () => {
  // ── STREAK_CATALOG structure ───────────────────────────────────────────────

  describe('STREAK_CATALOG', () => {
    it('has exactly 7 entries', () => {
      expect(STREAK_CATALOG).toHaveLength(7);
    });

    it('contains entries for streak days 1 through 7', () => {
      const days = STREAK_CATALOG.map((r) => r.streakDay).sort((a, b) => a - b);
      expect(days).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it('Day 7 is marked as epic placeholder', () => {
      const day7 = STREAK_CATALOG.find((r) => r.streakDay === 7);
      expect(day7?.isEpicPlaceholder).toBe(true);
      expect(day7?.reward_asset_id).toBeNull();
    });
  });

  // ── getStreakReward scaling ────────────────────────────────────────────────

  describe('getStreakReward — XP scaling (15% per cycle)', () => {
    it('Day 1 at Cycle 1 returns base value 100 XP', () => {
      const r = getStreakReward(1, 1);
      expect(r.category).toBe('xp');
      expect(r.baseValue).toBe(100);
    });

    it('Day 1 at Cycle 2 scales XP by 1.15 → 115', () => {
      const r = getStreakReward(1, 2);
      expect(r.baseValue).toBe(Math.round(100 * 1.15)); // 115
    });

    it('Day 1 at Cycle 3 scales XP by 1.30 → 130', () => {
      const r = getStreakReward(1, 3);
      expect(r.baseValue).toBe(Math.round(100 * 1.30)); // 130
    });

    it('Day 2 at Cycle 2: 250 * 1.15 = 288', () => {
      const r = getStreakReward(2, 2);
      expect(r.baseValue).toBe(Math.round(250 * 1.15));
    });

    it('Day 4 at Cycle 2: 400 * 1.15 = 460', () => {
      const r = getStreakReward(4, 2);
      expect(r.baseValue).toBe(Math.round(400 * 1.15));
    });

    it('Day 6 at Cycle 2: 500 * 1.15 = 575', () => {
      const r = getStreakReward(6, 2);
      expect(r.baseValue).toBe(Math.round(500 * 1.15));
    });
  });

  describe('getStreakReward — hint token scaling (ceil)', () => {
    it('Day 3 at Cycle 1: base 3', () => {
      const r = getStreakReward(3, 1);
      expect(r.category).toBe('hint_token');
      expect(r.baseValue).toBe(3);
    });

    it('Day 3 at Cycle 2: ceil(3 * 1.15) = ceil(3.45) = 4', () => {
      const r = getStreakReward(3, 2);
      expect(r.baseValue).toBe(Math.ceil(3 * 1.15));
    });

    it('Day 3 at Cycle 3: ceil(3 * 1.30) = ceil(3.9) = 4', () => {
      const r = getStreakReward(3, 3);
      expect(r.baseValue).toBe(Math.ceil(3 * 1.30));
    });

    it('Day 5 at Cycle 1 hint value is 5', () => {
      const r = getStreakReward(5, 1);
      expect(r.category).toBe('hint_token');
      expect(r.baseValue).toBe(5);
    });
  });

  describe('getStreakReward — Day 7 epic placeholder', () => {
    it('Day 7 is epic_placeholder category', () => {
      const r = getStreakReward(7, 1);
      expect(r.category).toBe('epic_placeholder');
    });

    it('Day 7 stays at 0 value regardless of cycle', () => {
      expect(getStreakReward(7, 1).baseValue).toBe(0);
      expect(getStreakReward(7, 2).baseValue).toBe(0);
      expect(getStreakReward(7, 5).baseValue).toBe(0);
    });

    it('Day 7 has isEpicPlaceholder = true', () => {
      expect(getStreakReward(7, 1).isEpicPlaceholder).toBe(true);
    });
  });

  // ── getStreakRewardWithLives — Day 5 combo ─────────────────────────────────

  describe('getStreakRewardWithLives — Day 5 combo', () => {
    it('Day 5 at Cycle 1: 5 hint tokens + 5 lives', () => {
      const { reward, livesAwarded } = getStreakRewardWithLives(5, 1);
      expect(reward.baseValue).toBe(5); // hint tokens
      expect(livesAwarded).toBe(5);
    });

    it('Day 5 at Cycle 2: ceil(5*1.15)=6 hint tokens, 5+(2-1)*2=7 lives', () => {
      const { reward, livesAwarded } = getStreakRewardWithLives(5, 2);
      expect(reward.baseValue).toBe(Math.ceil(5 * 1.15)); // 6
      expect(livesAwarded).toBe(5 + (2 - 1) * 2); // 7
    });

    it('Day 5 at Cycle 3: ceil(5*1.30)=7 hints, 5+(3-1)*2=9 lives', () => {
      const { reward, livesAwarded } = getStreakRewardWithLives(5, 3);
      expect(reward.baseValue).toBe(Math.ceil(5 * 1.30)); // 7
      expect(livesAwarded).toBe(5 + (3 - 1) * 2); // 9
    });
  });

  // ── getStreakDayFromDate ──────────────────────────────────────────────────

  describe('getStreakDayFromDate', () => {
    it('empty lastClaimedDate → nextStreakDay = 1, isReset = false', () => {
      const result = getStreakDayFromDate('', '2026-05-08', 1);
      expect(result.nextStreakDay).toBe(1);
      expect(result.isReset).toBe(false);
    });

    it('lastClaimedDate === todayPHT → no advance (already claimed)', () => {
      const result = getStreakDayFromDate('2026-05-08', '2026-05-08', 3);
      expect(result.nextStreakDay).toBe(3); // stays on day 3
      expect(result.isReset).toBe(false);
    });

    it('lastClaimedDate === yesterdayPHT → advance streak day', () => {
      const result = getStreakDayFromDate('2026-05-07', '2026-05-08', 3);
      expect(result.nextStreakDay).toBe(4); // 3 + 1
      expect(result.isReset).toBe(false);
    });

    it('gap (2+ days old) → reset to day 1', () => {
      const result = getStreakDayFromDate('2026-05-05', '2026-05-08', 5);
      expect(result.nextStreakDay).toBe(1);
      expect(result.isReset).toBe(true);
    });

    it('wraps from day 7 to day 1 on consecutive claim after day 7', () => {
      const result = getStreakDayFromDate('2026-05-08', '2026-05-09', 7);
      expect(result.nextStreakDay).toBe(1); // wraps
      expect(result.isReset).toBe(false);
    });
  });
});