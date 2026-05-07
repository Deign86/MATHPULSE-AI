/**
 * @file useDailyReward.ts
 * React hook for daily rewards state, countdown timer, and claim action.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  RewardDefinition,
  DailyRewardState,
  ClaimResult,
} from '../types/rewards';
import {
  getDailyRewardState,
  claimDailyReward,
  canClaimToday,
  getThisWeeksRewards,
  getTodaysReward,
  getNextResetTime,
  formatCountdown,
} from '../services/dailyRewardService';

export interface UseDailyRewardResult {
  weekRewards: RewardDefinition[];
  todayReward: RewardDefinition | null;
  canClaim: boolean;
  isClaiming: boolean;
  claimedDays: number[];
  currentStreak: number;
  longestStreak: number;
  totalClaimed: number;
  coins: number;
  hintTokens: number;
  streakShields: number;
  activeMultiplier: { multiplier: number; expiresAt: string } | null;
  timeUntilReset: string;
  showModal: boolean;
  lastClaimResult: ClaimResult | null;
  error: string | null;
  claim: () => Promise<void>;
  dismissModal: () => void;
  refresh: () => Promise<void>;
}

export function useDailyReward(userId: string | null): UseDailyRewardResult {
  const [state, setState] = useState<DailyRewardState | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [lastClaimResult, setLastClaimResult] = useState<ClaimResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeUntilReset, setTimeUntilReset] = useState('00:00:00');

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const weekRewards = useMemo(() => getThisWeeksRewards(), []);
  const todayReward = useMemo(() => getTodaysReward(), []);

  // ── Fetch state ───────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    if (!userId) {
      setState(null);
      return;
    }
    try {
      setError(null);
      const fresh = await getDailyRewardState(userId);
      setState(fresh);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load rewards';
      setError(msg);
      console.error('[useDailyReward] refresh error:', err);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ── Countdown timer ───────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const nextReset = getNextResetTime();
      const remaining = nextReset.getTime() - Date.now();
      setTimeUntilReset(formatCountdown(remaining));
    };

    tick(); // initial
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // ── Derived values ────────────────────────────────────────────────────────
  const canClaim = useMemo(() => {
    if (!state || isClaiming) return false;
    return canClaimToday(state);
  }, [state, isClaiming]);

  const activeMultiplier = useMemo(() => {
    if (!state?.activeMultiplier) return null;
    const expiresAt = new Date(state.activeMultiplier.expiresAt).getTime();
    if (expiresAt <= Date.now()) return null;
    return state.activeMultiplier;
  }, [state?.activeMultiplier]);

  // ── Claim action ──────────────────────────────────────────────────────────
  const claim = useCallback(async () => {
    if (!userId || !canClaim) return;

    setIsClaiming(true);
    setError(null);

    try {
      const result = await claimDailyReward(userId);
      setLastClaimResult(result);

      if (result.success) {
        setShowModal(true);
        // Refresh state after successful claim
        const fresh = await getDailyRewardState(userId);
        setState(fresh);
      } else {
        setError(result.error || 'Claim failed');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Claim failed';
      setError(msg);
      console.error('[useDailyReward] claim error:', err);
    } finally {
      setIsClaiming(false);
    }
  }, [userId, canClaim]);

  const dismissModal = useCallback(() => {
    setShowModal(false);
  }, []);

  // ── Return ────────────────────────────────────────────────────────────────
  return {
    weekRewards,
    todayReward,
    canClaim,
    isClaiming,
    claimedDays: state?.claimedDays ?? [],
    currentStreak: state?.currentStreak ?? 0,
    longestStreak: state?.longestStreak ?? 0,
    totalClaimed: state?.totalClaimed ?? 0,
    coins: state?.coins ?? 0,
    hintTokens: state?.hintTokens ?? 0,
    streakShields: state?.streakShields ?? 0,
    activeMultiplier,
    timeUntilReset,
    showModal,
    lastClaimResult,
    error,
    claim,
    dismissModal,
    refresh,
  };
}
