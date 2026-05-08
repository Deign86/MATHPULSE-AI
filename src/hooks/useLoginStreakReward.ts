/**
 * @file useLoginStreakReward.ts
 * React hook for the Login Streak Reward System (fixed 7-day cycle).
 * Runs in parallel with the weekly shuffled reward system.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  LoginStreakState,
  LoginStreakClaimResult,
  LoginStreakReward,
} from '../types/loginStreakRewards';
import {
  getLoginStreakState,
  claimLoginStreakReward,
  canClaimTodayStreak,
} from '../services/loginStreakService';
import { getStreakReward, getStreakRewardWithLives } from '../data/loginStreakCatalog';
import { getPHTDateString } from '../data/rewardCatalog';

export interface UseLoginStreakRewardResult {
  state: LoginStreakState | null;
  currentReward: LoginStreakReward | null;
  currentRewardLives: number;
  canClaim: boolean;
  isClaiming: boolean;
  isLoading: boolean;
  showModal: boolean;
  lastResult: LoginStreakClaimResult | null;
  error: string | null;
  claim: () => Promise<void>;
  dismissModal: () => void;
  refresh: () => Promise<void>;
  todayPHT: string;
}

export function useLoginStreakReward(userId: string | null): UseLoginStreakRewardResult {
  const [state, setState] = useState<LoginStreakState | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [lastResult, setLastResult] = useState<LoginStreakClaimResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Derived values ────────────────────────────────────────────────────────────

  const todayPHT = useMemo(() => getPHTDateString(), []);

  const canClaim = useMemo(() => {
    if (!state || isClaiming) return false;
    return canClaimTodayStreak(state, todayPHT);
  }, [state, isClaiming, todayPHT]);

  /** The reward for the current streak day (before claiming). Scaled per cycle. */
  const currentReward = useMemo<LoginStreakReward | null>(() => {
    if (!state) return null;
    const { reward } = getStreakRewardWithLives(state.currentStreakDay, state.currentCycle);
    return reward;
  }, [state?.currentStreakDay, state?.currentCycle]);

  /** Lives awarded if claiming the current combo day. */
  const currentRewardLives = useMemo(() => {
    if (!state) return 0;
    if (state.currentStreakDay !== 5) return 0;
    const { livesAwarded } = getStreakRewardWithLives(state.currentStreakDay, state.currentCycle);
    return livesAwarded;
  }, [state?.currentStreakDay, state?.currentCycle]);

  // ── Fetch state ───────────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    if (!userId) {
      setState(null);
      return;
    }
    setIsLoading(true);
    try {
      setError(null);
      const fresh = await getLoginStreakState(userId);
      setState(fresh);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load streak rewards';
      setError(msg);
      console.error('[useLoginStreakReward] refresh error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ── Claim action ──────────────────────────────────────────────────────────────

  const claim = useCallback(async () => {
    if (!userId || !canClaim) return;

    setIsClaiming(true);
    setError(null);

    try {
      const result = await claimLoginStreakReward(userId);
      setLastResult(result);

      if (result.success) {
        setShowModal(true);
        // Refresh state after successful claim
        const fresh = await getLoginStreakState(userId);
        setState(fresh);
      } else {
        setError(result.error || 'Claim failed');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Claim failed';
      setError(msg);
      console.error('[useLoginStreakReward] claim error:', err);
    } finally {
      setIsClaiming(false);
    }
  }, [userId, canClaim]);

  const dismissModal = useCallback(() => {
    setShowModal(false);
  }, []);

  // ── Return ─────────────────────────────────────────────────────────────────────

  return {
    state,
    currentReward,
    currentRewardLives,
    canClaim,
    isClaiming,
    isLoading,
    showModal,
    lastResult,
    error,
    claim,
    dismissModal,
    refresh,
    todayPHT,
  };
}