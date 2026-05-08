/**
 * @file loginStreakRewards.ts
 * Type definitions for the Daily Login Streak Reward System (fixed 7-day cycle).
 */

import type { RewardRarity } from './rewards';

// ── Reward type (separate from existing RewardType in rewards.ts) ─────────────
export type LoginStreakRewardType = 'xp' | 'hint_token' | 'lives' | 'epic_placeholder';

// ── Individual fixed reward entry for one streak day ─────────────────────────
export interface LoginStreakReward {
  id: string;                    // e.g. 'streak_xp_d1', 'streak_hintkeys_d3'
  streakDay: number;            // 1–7 (day in the cycle)
  category: LoginStreakRewardType;
  baseValue: number;            // base amount at cycle 1
  rarity: RewardRarity;         // common | uncommon | epic
  icon: string;                 // emoji
  label: string;                // display label
  description: string;          // full description
  color: string;               // hex color for UI card
  isEpicPlaceholder: boolean;  // true for Day 7 — lock until asset ready
  reward_asset_id: string | null; // populate when epic asset is ready
}

// ── Firestore state document ──────────────────────────────────────────────────
export interface LoginStreakState {
  lastClaimedDate: string;    // "YYYY-MM-DD" in PHT (Asia/Manila)
  currentStreakDay: number;   // 1–7 (position in 7-day cycle)
  currentCycle: number;       // 1 = Week 1, 2 = Week 2+, etc.
  longestStreakCycle: number; // highest cycle reached
  longestStreakDay: number;   // highest streakDay reached (7 = full cycle)
  totalClaims: number;        // total reward claims ever
  lives: number;              // accumulated lives (new mechanic)
  // Note: hintTokens and xp are denormalized to user profile separately
}

// ── Claim result ──────────────────────────────────────────────────────────────
export interface LoginStreakClaimResult {
  success: boolean;
  reward: LoginStreakReward;
  streakDayAfter: number;       // streak day AFTER this claim (1–7, wraps to 1 after 7)
  cycleAfter: number;           // cycle AFTER this claim
  xpAwarded: number;
  hintTokensAwarded: number;
  livesAwarded: number;
  isCycleComplete: boolean;     // true if they just completed a full 7-day cycle
  isNewCycle: boolean;          // true if they just entered a new cycle (Day 1 again)
  error?: string;
}