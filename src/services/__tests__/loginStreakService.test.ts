/**
 * @file loginStreakService.test.ts
 * Unit tests for loginStreakService.ts.
 * Tests pure logic + mock Firestore for transaction tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginStreakState } from '../../types/loginStreakRewards';

// ── Mock Firebase ─────────────────────────────────────────────────────────────

vi.mock('../../lib/firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({}) as any),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  runTransaction: vi.fn(),
  serverTimestamp: vi.fn(() => new Date()),
  Timestamp: { now: () => new Date() },
}));

vi.mock('../../services/gamificationService', () => ({
  awardXP: vi.fn().mockResolvedValue(undefined),
}));

// ── Import AFTER mocks ─────────────────────────────────────────────────────────

import {
  getLoginStreakState,
  initializeLoginStreakState,
  claimLoginStreakReward,
  canClaimTodayStreak,
  formatCountdown,
} from '../loginStreakService';
import { doc, runTransaction, getDoc } from 'firebase/firestore';
import { awardXP } from '../../services/gamificationService';

// ── Test helpers ───────────────────────────────────────────────────────────────

const mockState = (overrides: Partial<LoginStreakState> = {}): LoginStreakState => ({
  lastClaimedDate: '',
  currentStreakDay: 1,
  currentCycle: 1,
  longestStreakCycle: 0,
  longestStreakDay: 0,
  totalClaims: 0,
  lives: 0,
  ...overrides,
});

// ── Pure function tests ────────────────────────────────────────────────────────

describe('formatCountdown', () => {
  it('formats 0ms as 00:00:00', () => {
    expect(formatCountdown(0)).toBe('00:00:00');
  });

  it('formats 1 hour correctly', () => {
    expect(formatCountdown(3600 * 1000)).toBe('01:00:00');
  });

  it('formats 90 minutes correctly', () => {
    expect(formatCountdown(90 * 60 * 1000)).toBe('01:30:00');
  });

  it('formats 5 seconds as 00:00:05', () => {
    expect(formatCountdown(5 * 1000)).toBe('00:00:05');
  });
});

describe('canClaimTodayStreak', () => {
  it('returns false when lastClaimedDate === todayPHT (already claimed)', () => {
    const today = '2026-05-08';
    const state = mockState({ lastClaimedDate: today });
    expect(canClaimTodayStreak(state, today)).toBe(false);
  });

  it('returns true when lastClaimedDate !== todayPHT (can claim)', () => {
    const today = '2026-05-08';
    const state = mockState({ lastClaimedDate: '2026-05-07' });
    expect(canClaimTodayStreak(state, today)).toBe(true);
  });

  it('returns true when lastClaimedDate is empty (first claim)', () => {
    const today = '2026-05-08';
    const state = mockState({ lastClaimedDate: '' });
    expect(canClaimTodayStreak(state, today)).toBe(true);
  });
});

// ── Firestore transaction tests ───────────────────────────────────────────────

describe('claimLoginStreakReward — streak day advancement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('consecutive day claim: streakDay 1 → 2, cycle stays 1', async () => {
    // Setup: user claimed yesterday (streakDay 1, cycle 1)
    const existingState = mockState({
      lastClaimedDate: '2026-05-07',
      currentStreakDay: 1,
      currentCycle: 1,
    });

    // Mock getDoc returning existing state
    (getDoc as any).mockResolvedValue({
      exists: () => true,
      data: () => existingState,
    });

    // Mock runTransaction to capture what gets written
    let writtenState: any;
    (runTransaction as any).mockImplementation(async (db: any, fn: any) => {
      return fn({
        get: (ref: any) => Promise.resolve({ exists: () => true, data: () => existingState }),
        set: (ref: any, data: any) => { writtenState = data; return Promise.resolve(); },
        update: (ref: any, data: any) => { return Promise.resolve(); },
      });
    });

    const result = await claimLoginStreakReward('user123');

    expect(result.success).toBe(true);
    expect(result.streakDayAfter).toBe(2);
    expect(result.cycleAfter).toBe(1);
    expect(writtenState.currentStreakDay).toBe(2);
  });

  it('completes day 7 and wraps to day 1, cycle increments, isCycleComplete=true', async () => {
    // User was on day 7 (yesterday was consecutive), now claiming day 7 → wraps
    const existingState = mockState({
      lastClaimedDate: '2026-05-07', // yesterday = consecutive
      currentStreakDay: 7,
      currentCycle: 1,
      totalClaims: 6,
    });

    (getDoc as any).mockResolvedValue({
      exists: () => true,
      data: () => existingState,
    });

    let writtenState: any;
    (runTransaction as any).mockImplementation(async (db: any, fn: any) => {
      return fn({
        get: (ref: any) => Promise.resolve({ exists: () => true, data: () => existingState }),
        set: (ref: any, data: any) => { writtenState = data; return Promise.resolve(); },
        update: (ref: any, data: any) => { return Promise.resolve(); },
      });
    });

    const result = await claimLoginStreakReward('user123');

    expect(result.success).toBe(true);
    expect(result.streakDayAfter).toBe(1);   // wrapped to day 1
    expect(result.cycleAfter).toBe(2);        // incremented cycle
    expect(result.isCycleComplete).toBe(true); // milestone
    expect(result.isNewCycle).toBe(true);
    // Day 7 epic placeholder — no XP/hints/lives, but milestone fires
    expect(result.xpAwarded).toBe(0);
    expect(writtenState.currentStreakDay).toBe(1);
    expect(writtenState.currentCycle).toBe(2);
  });

  it('gap in streak resets to day 1, cycle 1', async () => {
    // Setup: user claimed 3 days ago (streak broken)
    const existingState = mockState({
      lastClaimedDate: '2026-05-04',  // 4 days ago — gap
      currentStreakDay: 5,
      currentCycle: 2,
    });

    (getDoc as any).mockResolvedValue({
      exists: () => true,
      data: () => existingState,
    });

    let writtenState: any;
    (runTransaction as any).mockImplementation(async (db: any, fn: any) => {
      return fn({
        get: (ref: any) => Promise.resolve({ exists: () => true, data: () => existingState }),
        set: (ref: any, data: any) => { writtenState = data; return Promise.resolve(); },
        update: (ref: any, data: any) => { return Promise.resolve(); },
      });
    });

    const result = await claimLoginStreakReward('user123');

    expect(result.success).toBe(true);
    expect(result.streakDayAfter).toBe(1);  // reset
    expect(result.cycleAfter).toBe(1);       // reset
    expect(writtenState.currentStreakDay).toBe(1);
    expect(writtenState.currentCycle).toBe(1);
    expect(writtenState.lives).toBe(7);     // lives persist on streak reset (never lost)
  });

  it('rejects double-claim on same day (ALREADY_CLAIMED)', async () => {
    // Setup: user already claimed today
    const today = '2026-05-08';
    const existingState = mockState({
      lastClaimedDate: today,  // same day
      currentStreakDay: 3,
      currentCycle: 1,
    });

    (getDoc as any).mockResolvedValue({
      exists: () => true,
      data: () => existingState,
    });

    let resultCode = '';
    (runTransaction as any).mockImplementation(async (db: any, fn: any) => {
      return fn({
        get: (ref: any) => Promise.resolve({ exists: () => true, data: () => existingState }),
        set: (ref: any, data: any) => { return Promise.resolve(); },
        update: (ref: any, data: any) => { return Promise.resolve(); },
      });
    });

    // The claim function checks lastClaimedDate === today → returns ALREADY_CLAIMED
    // We verify by checking result doesn't advance
    const result = await claimLoginStreakReward('user123');
    // The transaction should detect same-day and return early
    expect(result.success).toBe(false);
    expect(result.error).toBe('Already claimed today');
  });

  it('awards XP for xp-type rewards', async () => {
    // Setup: streak day 1 (xp reward)
    const existingState = mockState({
      lastClaimedDate: '2026-05-07',
      currentStreakDay: 1,
      currentCycle: 1,
    });

    (getDoc as any).mockResolvedValue({
      exists: () => true,
      data: () => existingState,
    });

    (runTransaction as any).mockImplementation(async (db: any, fn: any) => {
      return fn({
        get: (ref: any) => Promise.resolve({ exists: () => true, data: () => existingState }),
        set: (ref: any, data: any) => { return Promise.resolve(); },
        update: (ref: any, data: any) => { return Promise.resolve(); },
      });
    });

    const result = await claimLoginStreakReward('user123');

    expect(result.success).toBe(true);
    expect(result.xpAwarded).toBeGreaterThan(0);
    expect(awardXP).toHaveBeenCalledWith('user123', result.xpAwarded, 'login_streak', expect.any(String));
  });

  it('awards hint tokens for day 3', async () => {
    const existingState = mockState({
      lastClaimedDate: '2026-05-07',
      currentStreakDay: 3,  // day 3 = hint tokens
      currentCycle: 1,
    });

    (getDoc as any).mockResolvedValue({
      exists: () => true,
      data: () => existingState,
    });

    (runTransaction as any).mockImplementation(async (db: any, fn: any) => {
      return fn({
        get: (ref: any) => Promise.resolve({ exists: () => true, data: () => existingState }),
        set: (ref: any, data: any) => { return Promise.resolve(); },
        update: (ref: any, data: any) => { return Promise.resolve(); },
      });
    });

    const result = await claimLoginStreakReward('user123');

    expect(result.success).toBe(true);
    expect(result.hintTokensAwarded).toBe(3);  // base value at cycle 1
  });

  it('awards lives on day 5 combo', async () => {
    const existingState = mockState({
      lastClaimedDate: '2026-05-07',
      currentStreakDay: 5,  // day 5 = combo
      currentCycle: 1,
    });

    (getDoc as any).mockResolvedValue({
      exists: () => true,
      data: () => existingState,
    });

    (runTransaction as any).mockImplementation(async (db: any, fn: any) => {
      return fn({
        get: (ref: any) => Promise.resolve({ exists: () => true, data: () => existingState }),
        set: (ref: any, data: any) => { return Promise.resolve(); },
        update: (ref: any, data: any) => { return Promise.resolve(); },
      });
    });

    const result = await claimLoginStreakReward('user123');

    expect(result.success).toBe(true);
    expect(result.livesAwarded).toBe(5);  // base 5 lives at cycle 1
    expect(result.hintTokensAwarded).toBe(5);  // also hint tokens
  });

  it('scales rewards at cycle 2', async () => {
    const existingState = mockState({
      lastClaimedDate: '2026-05-07',
      currentStreakDay: 1,
      currentCycle: 2,  // cycle 2
    });

    (getDoc as any).mockResolvedValue({
      exists: () => true,
      data: () => existingState,
    });

    (runTransaction as any).mockImplementation(async (db: any, fn: any) => {
      return fn({
        get: (ref: any) => Promise.resolve({ exists: () => true, data: () => existingState }),
        set: (ref: any, data: any) => { return Promise.resolve(); },
        update: (ref: any, data: any) => { return Promise.resolve(); },
      });
    });

    const result = await claimLoginStreakReward('user123');

    expect(result.success).toBe(true);
    // Cycle 2: 100 * 1.15 = 115
    expect(result.xpAwarded).toBe(115);
  });

it('initializes state if no doc exists, starts at day 1 cycle 1', async () => {
    (getDoc as any).mockResolvedValue({
      exists: () => false,
      data: () => undefined,
    });

    let writtenState: any;
    (runTransaction as any).mockImplementation(async (db: any, fn: any) => {
      return fn({
        get: (ref: any) => Promise.resolve({ exists: () => false, data: () => undefined }),
        set: (ref: any, data: any) => { writtenState = data; return Promise.resolve(); },
        update: (ref: any, data: any) => { return Promise.resolve(); },
      });
    });

    const result = await claimLoginStreakReward('user123');

    expect(result.success).toBe(true);
    expect(writtenState.currentStreakDay).toBe(1);
    expect(writtenState.currentCycle).toBe(1);
    // Initial claim awards day 1 XP
    expect(result.xpAwarded).toBe(100);
  });
});