/**
 * achievementCheckerService.test.ts
 *
 * Test spec for the mobile achievement checker service.
 *
 * These tests document the expected behaviour of evaluateProgress,
 * awardAchievement, and checkAndAwardAchievements.  The file uses the
 * Vitest API; a full vitest config + firebase mock setup is needed to
 * actually run these tests, but the assertions serve as a living spec.
 *
 * @vitest-environment node
 */

// Vitest globals (describe, it, expect, vi, beforeEach) are provided by
// types/vitest-globals.d.ts until vitest is added as a dev dependency.

// ── Module mocks ────────────────────────────────────────────────────────────

vi.mock('@/lib/firebase', () => ({
  db: {},
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  getDocs: vi.fn(),
  collection: vi.fn(),
  firestoreQuery: vi.fn(),
  onSnapshot: vi.fn(),
  firestoreServerTimestamp: vi.fn(() => new Date('2026-06-01T00:00:00Z')),
}));

vi.mock('@/services/gamificationService', () => ({
  awardXP: vi
    .fn()
    .mockResolvedValue({ newTotal: 0, leveledUp: false, newLevel: 1 }),
}));

// Also mock the relative path used by achievementCheckerService itself
vi.mock('../services/gamificationService', () => ({
  awardXP: vi
    .fn()
    .mockResolvedValue({ newTotal: 0, leveledUp: false, newLevel: 1 }),
}));

// ── Imports after mocking ───────────────────────────────────────────────────

import {
  evaluateProgress,
  awardAchievement,
  checkAndAwardAchievements,
  getAllAchievements,
  getAchievementsByCategory,
  getAchievementCountByCategory,
  subscribeToUserAchievements,
  DEFAULT_STATS,
} from '@/services/achievementCheckerService';
import type { AchievementCheckerStats } from '@/services/achievementCheckerService';
import {
  ACHIEVEMENTS,
  AchievementConfig,
} from '@/config/achievements';
import { setDoc, getDocs, collection, firestoreQuery, onSnapshot } from '@/lib/firebase';
import { awardXP } from '@/services/gamificationService';

// ── Helpers ─────────────────────────────────────────────────────────────────

const mockSetDoc = vi.mocked(setDoc);
const mockGetDocs = vi.mocked(getDocs);
const mockCollection = vi.mocked(collection);
const mockOnSnapshot = vi.mocked(onSnapshot);

function makeStats(overrides: Partial<AchievementCheckerStats> = {}): AchievementCheckerStats {
  return { ...DEFAULT_STATS, ...overrides };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('evaluateProgress', () => {
  const FIRST_STEPS = ACHIEVEMENTS.find(
    (a) => a.id === 'first_lesson'
  ) as AchievementConfig;

  it('returns unlocked=true when First Steps condition met (1+ lesson completed)', () => {
    const result = evaluateProgress(FIRST_STEPS, makeStats({ totalLessonsCompleted: 1 }));
    expect(result).toBe(true);
  });

  it('returns unlocked=true for first_battle at threshold=1 with 1 battle win', () => {
    const achievement = ACHIEVEMENTS.find(
      (a) => a.id === 'first_battle'
    ) as AchievementConfig;
    const result = evaluateProgress(achievement, makeStats({ battleWins: 1 }));
    expect(result).toBe(true);
  });

  it('returns unlocked=true for perfect_score when a quiz has score=100', () => {
    const achievement = ACHIEVEMENTS.find(
      (a) => a.id === 'perfect_score'
    ) as AchievementConfig;
    const result = evaluateProgress(
      achievement,
      makeStats({ quizAttempts: [{ score: 100 }] })
    );
    expect(result).toBe(true);
  });

  it('returns unlocked=true for quiz_perfect (threshold=5) with 5 perfect quizzes', () => {
    const achievement = ACHIEVEMENTS.find(
      (a) => a.id === 'quiz_perfect'
    ) as AchievementConfig;
    const result = evaluateProgress(
      achievement,
      makeStats({
        quizAttempts: new Array(5).fill({ score: 100 }),
      })
    );
    expect(result).toBe(true);
  });

  it('returns unlocked=false for Dedicated Learner when only 3/10 lessons done', () => {
    const achievement = ACHIEVEMENTS.find(
      (a) => a.id === 'lesson_10'
    ) as AchievementConfig;
    const result = evaluateProgress(
      achievement,
      makeStats({ totalLessonsCompleted: 3 })
    );
    expect(result).toBe(false);
  });

  it('returns unlocked=false for Undefeated when streak is 3 (threshold=5)', () => {
    const achievement = ACHIEVEMENTS.find(
      (a) => a.id === 'undefeated'
    ) as AchievementConfig;
    const result = evaluateProgress(
      achievement,
      makeStats({ battleWinStreak: 3 })
    );
    expect(result).toBe(false);
  });

  it('returns unlocked=true for mastery_level (threshold=5) when level >= 5', () => {
    const achievement = ACHIEVEMENTS.find(
      (a) => a.id === 'mastery_level'
    ) as AchievementConfig;
    const result = evaluateProgress(achievement, makeStats({ level: 5 }));
    expect(result).toBe(true);
  });

  it('returns unlocked=true for mastery_xp (threshold=5000) when totalXP >= 5000', () => {
    const achievement = ACHIEVEMENTS.find(
      (a) => a.id === 'mastery_xp'
    ) as AchievementConfig;
    const result = evaluateProgress(achievement, makeStats({ totalXP: 5000 }));
    expect(result).toBe(true);
  });

  it('returns unlocked=true for Profile Complete when profileComplete is true', () => {
    const achievement = ACHIEVEMENTS.find(
      (a) => a.id === 'explore_profile'
    ) as AchievementConfig;
    const result = evaluateProgress(
      achievement,
      makeStats({ profileComplete: true })
    );
    expect(result).toBe(true);
  });

  it('returns unlocked=false for social_xp (rank-based, always false from evaluateProgress)', () => {
    const achievement = ACHIEVEMENTS.find(
      (a) => a.id === 'social_top_10'
    ) as AchievementConfig;
    const result = evaluateProgress(achievement, makeStats({}));
    expect(result).toBe(false);
  });
});

describe('awardAchievement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes unlock to Firestore subcollection on award', async () => {
    // getDocs mock must return an empty snapshot so checkAndAward sees nothing unlocked
    mockGetDocs.mockResolvedValue({
      forEach: vi.fn(),
      docs: [],
      size: 0,
      empty: true,
    } as unknown as Awaited<ReturnType<typeof getDocs>>);
    mockCollection.mockReturnValue('mocked-col-ref' as unknown as ReturnType<typeof collection>);
    mockSetDoc.mockResolvedValue(undefined);

    await awardAchievement('user-abc', 'first_lesson');

    expect(mockSetDoc).toHaveBeenCalledTimes(1);

    // Verify the doc data shape
    const callArgs = mockSetDoc.mock.calls[0];
    const docData = callArgs[1] as Record<string, unknown>;
    expect(docData).toHaveProperty('id', 'first_lesson');
    expect(docData).toHaveProperty('title', 'First Steps');
    expect(docData).toHaveProperty('xpReward', 50);
    expect(docData).toHaveProperty('unlockedAt');
  });
});

describe('XP Award on Achievement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('awards 50 XP when First Steps is unlocked', async () => {
    // Mock empty unlocked set
    mockGetDocs.mockResolvedValue({
      forEach: vi.fn(),
      docs: [],
      size: 0,
      empty: true,
    } as unknown as Awaited<ReturnType<typeof getDocs>>);
    mockCollection.mockReturnValue('mock-col' as unknown as ReturnType<typeof collection>);
    mockSetDoc.mockResolvedValue(undefined);

    const stats = makeStats({ totalLessonsCompleted: 1 });

    // checkAndAwardAchievements(userId, progressData, userData, eventType?)
    // AchievementCheckerStats is structurally Record<string, unknown> but needs
    // an explicit cast in strict mode when passing to a Record<string, unknown> param.
    await checkAndAwardAchievements(
      'user-abc',
      stats as unknown as Record<string, unknown>,
      {},
      'lesson_complete'
    );

    // The achievement should trigger awardXP(userId, amount, source, reason)
    expect(awardXP).toHaveBeenCalledWith(
      'user-abc',
      50,
      'achievement_unlocked',
      `Unlocked: First Steps`
    );
  });

  it('grants 1000 XP for Battle Legend (battle_50) at 50 wins', async () => {
    mockGetDocs.mockResolvedValue({
      forEach: vi.fn(),
      docs: [],
      size: 0,
      empty: true,
    } as unknown as Awaited<ReturnType<typeof getDocs>>);
    mockCollection.mockReturnValue('mock-col' as unknown as ReturnType<typeof collection>);
    mockSetDoc.mockResolvedValue(undefined);

    const stats = makeStats({ battleWins: 50 });

    await checkAndAwardAchievements(
      'user-abc',
      stats as unknown as Record<string, unknown>,
      {},
      'battle_win'
    );

    const battle50 = ACHIEVEMENTS.find((a) => a.id === 'battle_50');
    expect(battle50?.xpReward).toBe(1000);

    // awardXP should have been called for every battle_win that qualifies
    // (first_battle=1, battle_10=10, battle_50=50, battle_master=3, first_blood_daily=1, rival_crusher=25)
    // All battle_win threshold achievements fire at 50 wins
    expect(awardXP).toHaveBeenCalled();
  });
});

describe('Query Helpers', () => {
  it('getAllAchievements returns 40 achievements', () => {
    const all = getAllAchievements();
    expect(all).toHaveLength(40);
  });

  it('getAchievementsByCategory returns correct counts', () => {
    expect(getAchievementsByCategory('learning')).toHaveLength(10);
    expect(getAchievementsByCategory('battle')).toHaveLength(10);
    expect(getAchievementsByCategory('mastery')).toHaveLength(8);
    expect(getAchievementsByCategory('exploration')).toHaveLength(7);
    expect(getAchievementsByCategory('social')).toHaveLength(5);
  });

  it('getAchievementCountByCategory matches config', () => {
    expect(getAchievementCountByCategory('learning')).toBe(10);
    expect(getAchievementCountByCategory('battle')).toBe(10);
    expect(getAchievementCountByCategory('mastery')).toBe(8);
    expect(getAchievementCountByCategory('exploration')).toBe(7);
    expect(getAchievementCountByCategory('social')).toBe(5);
  });

  it('ACHIEVEMENTS array contains no duplicate IDs', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('ACHIEVEMENTS xpReward sums match expected totals per category', () => {
    const sum = (cat: string) =>
      ACHIEVEMENTS.filter((a) => a.category === cat).reduce(
        (s, a) => s + a.xpReward,
        0
      );
    // Learning: 50 + 200 + 500 + 150 + 100 + 100 + 200 + 500 + 300 + 300 = 2400
    expect(sum('learning')).toBe(2400);
    // Battle: 100 + 300 + 1000 + 500 + 150 + 200 + 400 + 1000 + 50 + 750 = 4450
    expect(sum('battle')).toBe(4450);
    // Mastery: 500 + 250 + 400 + 1000 + 500 + 400 + 2000 + 1000 = 6050
    expect(sum('mastery')).toBe(6050);
    // Exploration: 50 + 50 + 100 + 300 + 200 + 500 + 100 = 1300
    expect(sum('exploration')).toBe(1300);
    // Social: 25 + 150 + 500 + 1000 + 200 = 1875
    expect(sum('social')).toBe(1875);
  });
});

describe('subscribeToUserAchievements', () => {
  it('returns an unsubscribe function', () => {
    const noop = () => {};
    mockOnSnapshot.mockReturnValue(noop);
    mockCollection.mockReturnValue('mock-col' as unknown as ReturnType<typeof collection>);

    const callback = vi.fn();
    const unsub = subscribeToUserAchievements('user-abc', callback);

    expect(typeof unsub).toBe('function');
    expect(mockOnSnapshot).toHaveBeenCalledTimes(1);
  });
});
