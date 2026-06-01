import { create } from 'zustand';
import type { Achievement, LeaderboardEntry } from '../types/models';
import type { DailyRewardState, ActiveMultiplier } from '../types/rewards';

interface GamificationState {
  xp: number;
  level: number;
  dailyStreak: number;
  dailyRewards: any;
  achievements: Achievement[];
  activeMultipliers: ActiveMultiplier[];
  leaderboard: LeaderboardEntry[];
  isLoading: boolean;
  error: string | null;
}

interface GamificationActions {
  addXP: (amount: number) => void;
  claimDailyReward: (dayIndex: number) => void;
  refreshLeaderboard: () => void;
  resetError: () => void;
}

export const useGamificationStore = create<GamificationState & GamificationActions>(
  (set) => ({
    xp: 0,
    level: 1,
    dailyStreak: 0,
    dailyRewards: null,
    achievements: [],
    activeMultipliers: [],
    leaderboard: [],
    isLoading: false,
    error: null,

    addXP: (amount: number) =>
      set((state) => ({
        xp: state.xp + amount,
        level: Math.floor((state.xp + amount) / 100) + 1,
      })),

    claimDailyReward: (_dayIndex: number) =>
      set((state) => ({
        dailyStreak: state.dailyStreak + 1,
        isLoading: false,
      })),

    refreshLeaderboard: () =>
      set({ isLoading: true }),

    resetError: () => set({ error: null }),
  })
);
