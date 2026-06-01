/**
 * useDailyReward.ts
 *
 * Custom hook encapsulating daily-reward service calls.
 * Provides weekly reward grid, streak info, active multipliers,
 * a claim action, and a refresh action — all driven by the
 * authenticated user's uid from useAuthStore.
 *
 * Returns:
 * ```ts
 * {
 *   weeklyRewards: { weekSeed, rewards, claimedDays, todayIndex } | null,
 *   streakInfo: DailyRewardState | null,
 *   multipliers: ActiveMultiplier[],
 *   claim: (dayIndex: number) => Promise<ClaimResult | undefined>,
 *   isLoading: boolean,
 *   error: string | null,
 *   refresh: () => Promise<void>,
 * }
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import type { DailyRewardState, ActiveMultiplier, ClaimResult } from '../types/rewards';
import type { RewardDefinition } from '../types/rewards';
import {
  getWeeklyRewards,
  claimDailyReward,
  getStreakInfo,
  getActiveMultipliers,
} from '../services/dailyRewardService';

interface WeeklyRewardsData {
  weekSeed: number;
  rewards: RewardDefinition[];
  claimedDays: number[];
  todayIndex: number;
}

interface UseDailyRewardReturn {
  weeklyRewards: WeeklyRewardsData | null;
  streakInfo: DailyRewardState | null;
  multipliers: ActiveMultiplier[];
  claim: (dayIndex: number) => Promise<ClaimResult | undefined>;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDailyReward(): UseDailyRewardReturn {
  const uid = useAuthStore((s) => s.user?.uid);

  const [weeklyRewards, setWeeklyRewards] = useState<WeeklyRewardsData | null>(null);
  const [streakInfo, setStreakInfo] = useState<DailyRewardState | null>(null);
  const [multipliers, setMultipliers] = useState<ActiveMultiplier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all reward data from the dailyRewardService in parallel.
   */
  const load = useCallback(async () => {
    if (!uid) return;
    setIsLoading(true);
    setError(null);

    try {
      const [rewardsData, streak, activeMults] = await Promise.all([
        getWeeklyRewards(uid),
        getStreakInfo(uid),
        getActiveMultipliers(uid),
      ]);

      setWeeklyRewards(rewardsData);
      setStreakInfo(streak);
      setMultipliers(activeMults);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load daily rewards';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [uid]);

  // Initial load when uid becomes available
  useEffect(() => {
    load();
  }, [load]);

  /**
   * Claim the daily reward for the given day index (0–6).
   * After a successful claim the reward data is refreshed.
   */
  const claim = useCallback(
    async (dayIndex: number): Promise<ClaimResult | undefined> => {
      if (!uid) return undefined;
      setError(null);

      try {
        const result = await claimDailyReward(uid, dayIndex);
        // Refresh streak info and weekly rewards after claiming
        const [streak, rewardsData, activeMults] = await Promise.all([
          getStreakInfo(uid),
          getWeeklyRewards(uid),
          getActiveMultipliers(uid),
        ]);
        setStreakInfo(streak);
        setWeeklyRewards(rewardsData);
        setMultipliers(activeMults);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to claim daily reward';
        setError(message);
        return undefined;
      }
    },
    [uid],
  );

  return {
    weeklyRewards,
    streakInfo,
    multipliers,
    claim,
    isLoading,
    error,
    refresh: load,
  };
}
