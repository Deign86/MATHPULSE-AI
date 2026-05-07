/**
 * @file rewards.ts
 * Type definitions for the Daily Rewards System.
 */

export type RewardRarity = 'common' | 'rare' | 'epic';
export type RewardType = 'xp' | 'coins' | 'streak_shield' | 'hint_token' | 'xp_multiplier' | 'badge_unlock';

export interface RewardDefinition {
  id: string;
  day: number; // 0–6 assigned after shuffle
  label: string;
  description: string;
  icon: string; // emoji or icon name
  type: RewardType;
  value: number | string; // XP amount, coin count, multiplier %, or badge ID
  rarity: RewardRarity;
  color: string; // Tailwind or hex color for card
}

export interface ActiveMultiplier {
  multiplier: number;
  expiresAt: string; // ISO timestamp string
}

export interface DailyRewardState {
  lastClaimedDate: string; // "YYYY-MM-DD" in PHT
  lastClaimedWeekSeed: number;
  claimedDays: number[]; // days claimed THIS week [0,1,2,...] — reset on new week
  currentStreak: number;
  longestStreak: number;
  totalClaimed: number;
  coins: number;
  hintTokens: number;
  streakShields: number;
  activeMultiplier: ActiveMultiplier | null;
}

export interface ClaimResult {
  success: boolean;
  reward: RewardDefinition;
  dayIndex: number;
  streakAfter: number;
  longestStreakAfter: number;
  coinsAfter: number;
  hintTokensAfter: number;
  streakShieldsAfter: number;
  streakPreserved: boolean;
  xpAwarded: number;
  multiplierApplied: number;
  isMilestone: boolean;
  error?: string;
}

export interface WeeklyRewards {
  weekSeed: number;
  weekStart: string;
  rewards: RewardDefinition[];
}
