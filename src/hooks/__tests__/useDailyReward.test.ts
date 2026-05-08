/**
 * @file useDailyReward.test.ts
 * Unit tests for the useDailyReward hook.
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDailyReward } from '../useDailyReward';
import * as dailyRewardService from '../../services/dailyRewardService';

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../../services/dailyRewardService', async () => {
  const actual = await vi.importActual<typeof dailyRewardService>('../../services/dailyRewardService');
  return {
    ...actual,
    getDailyRewardState: vi.fn(),
    claimDailyReward: vi.fn(),
    getThisWeeksRewards: vi.fn(() => [
      { id: 'xp_50', day: 0, label: '+50 XP', description: 'Test', icon: '⚡', type: 'xp', value: 50, rarity: 'common', color: '#4ade80' },
      { id: 'hint_x2', day: 1, label: '2 Hints', description: 'Test', icon: '💡', type: 'hint_token', value: 2, rarity: 'common', color: '#a78bfa' },
      { id: 'hint_x3', day: 2, label: '3 Hints', description: 'Test', icon: '💡', type: 'hint_token', value: 3, rarity: 'common', color: '#a78bfa' },
      { id: 'xp_100', day: 3, label: '+100 XP', description: 'Test', icon: '🌟', type: 'xp', value: 100, rarity: 'rare', color: '#facc15' },
      { id: 'streak_shield', day: 4, label: 'Shield', description: 'Test', icon: '🛡️', type: 'streak_shield', value: 1, rarity: 'rare', color: '#60a5fa' },
      { id: 'hint_x5', day: 5, label: '5 Hints', description: 'Test', icon: '🔦', type: 'hint_token', value: 5, rarity: 'rare', color: '#8b5cf6' },
      { id: 'xp_200', day: 6, label: '+200 XP', description: 'Test', icon: '💥', type: 'xp', value: 200, rarity: 'epic', color: '#f97316' },
    ]),
    getTodaysReward: vi.fn(() => ({ id: 'xp_50', day: 0, label: '+50 XP', description: 'Test', icon: '⚡', type: 'xp', value: 50, rarity: 'common', color: '#4ade80' })),
    getNextResetTime: vi.fn(() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(0, 0, 0, 0);
      return d;
    }),
  };
});

describe('useDailyReward', () => {
  const mockGetDailyRewardState = vi.mocked(dailyRewardService.getDailyRewardState);
  const mockClaimDailyReward = vi.mocked(dailyRewardService.claimDailyReward);

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockGetDailyRewardState.mockReset();
    mockClaimDailyReward.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initialises with null userId', () => {
    const { result } = renderHook(() => useDailyReward(null));
    expect(result.current.todayReward).not.toBeNull();
    expect(result.current.canClaim).toBe(false);
    expect(result.current.currentStreak).toBe(0);
  });

  it('fetches state on mount when userId provided', async () => {
    mockGetDailyRewardState.mockResolvedValue({
      lastClaimedDate: '',
      lastClaimedWeekSeed: 202620,
      claimedDays: [],
      currentStreak: 3,
      longestStreak: 5,
      totalClaimed: 10,
      coins: 100,
      hintTokens: 5,
      streakShields: 2,
      activeMultiplier: null,
    });

    const { result } = renderHook(() => useDailyReward('user-123'));

    await waitFor(() => {
      expect(result.current.currentStreak).toBe(3);
    });

    expect(result.current.coins).toBe(100);
    expect(result.current.hintTokens).toBe(5);
    expect(result.current.streakShields).toBe(2);
    expect(result.current.canClaim).toBe(true);
  });

  it('canClaim is false when already claimed today', async () => {
    const todayPHT = new Date().toISOString().split('T')[0];
    mockGetDailyRewardState.mockResolvedValue({
      lastClaimedDate: todayPHT,
      lastClaimedWeekSeed: 202620,
      claimedDays: [0],
      currentStreak: 1,
      longestStreak: 1,
      totalClaimed: 1,
      coins: 0,
      hintTokens: 0,
      streakShields: 0,
      activeMultiplier: null,
    });

    const { result } = renderHook(() => useDailyReward('user-123'));

    await waitFor(() => {
      expect(result.current.canClaim).toBe(false);
    });
  });

  it('claim() calls service and updates state on success', async () => {
    mockGetDailyRewardState
      .mockResolvedValueOnce({
        lastClaimedDate: '',
        lastClaimedWeekSeed: 202620,
        claimedDays: [],
        currentStreak: 0,
        longestStreak: 0,
        totalClaimed: 0,
        coins: 0,
        hintTokens: 0,
        streakShields: 0,
        activeMultiplier: null,
      })
      .mockResolvedValueOnce({
        lastClaimedDate: new Date().toISOString().split('T')[0],
        lastClaimedWeekSeed: 202620,
        claimedDays: [0],
        currentStreak: 1,
        longestStreak: 1,
        totalClaimed: 1,
        coins: 0,
        hintTokens: 0,
        streakShields: 0,
        activeMultiplier: null,
      });

    mockClaimDailyReward.mockResolvedValue({
      success: true,
      reward: { id: 'xp_50', day: 0, label: '+50 XP', description: 'Test', icon: '⚡', type: 'xp', value: 50, rarity: 'common', color: '#4ade80' },
      dayIndex: 0,
      streakAfter: 1,
      longestStreakAfter: 1,
      coinsAfter: 0,
      hintTokensAfter: 0,
      streakShieldsAfter: 0,
      streakPreserved: false,
      xpAwarded: 50,
      multiplierApplied: 1,
      isMilestone: false,
    });

    const { result } = renderHook(() => useDailyReward('user-123'));

    await waitFor(() => expect(result.current.canClaim).toBe(true));

    await act(async () => {
      await result.current.claim();
    });

    expect(mockClaimDailyReward).toHaveBeenCalledWith('user-123');
    expect(result.current.showModal).toBe(true);
    expect(result.current.lastClaimResult?.success).toBe(true);
  });

  it('dismissModal() closes the modal', async () => {
    mockGetDailyRewardState.mockResolvedValue({
      lastClaimedDate: '',
      lastClaimedWeekSeed: 202620,
      claimedDays: [],
      currentStreak: 0,
      longestStreak: 0,
      totalClaimed: 0,
      coins: 0,
      hintTokens: 0,
      streakShields: 0,
      activeMultiplier: null,
    });

    mockClaimDailyReward.mockResolvedValue({
      success: true,
      reward: { id: 'xp_50', day: 0, label: '+50 XP', description: 'Test', icon: '⚡', type: 'xp', value: 50, rarity: 'common', color: '#4ade80' },
      dayIndex: 0,
      streakAfter: 1,
      longestStreakAfter: 1,
      coinsAfter: 0,
      hintTokensAfter: 0,
      streakShieldsAfter: 0,
      streakPreserved: false,
      xpAwarded: 50,
      multiplierApplied: 1,
      isMilestone: false,
    });

    const { result } = renderHook(() => useDailyReward('user-123'));

    await waitFor(() => expect(result.current.canClaim).toBe(true));

    await act(async () => {
      await result.current.claim();
    });

    expect(result.current.showModal).toBe(true);

    act(() => {
      result.current.dismissModal();
    });

    expect(result.current.showModal).toBe(false);
  });

  it('timeUntilReset is formatted as HH:MM:SS', async () => {
    mockGetDailyRewardState.mockResolvedValue({
      lastClaimedDate: '',
      lastClaimedWeekSeed: 202620,
      claimedDays: [],
      currentStreak: 0,
      longestStreak: 0,
      totalClaimed: 0,
      coins: 0,
      hintTokens: 0,
      streakShields: 0,
      activeMultiplier: null,
    });

    const { result } = renderHook(() => useDailyReward('user-123'));

    await waitFor(() => {
      expect(result.current.timeUntilReset).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });
  });

  it('handles service error gracefully', async () => {
    mockGetDailyRewardState.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useDailyReward('user-123'));

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
    });

    expect(result.current.canClaim).toBe(false);
  });
});
