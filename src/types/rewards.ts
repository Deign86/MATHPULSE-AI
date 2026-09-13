/**
 * @file rewards.ts
 * Type definitions for the Daily Rewards System.
 */

export type RewardRarity = 'common' | 'uncommon' | 'rare' | 'epic';

export interface RewardBase {
  id: string;
  label: string;
  description: string;
  icon: string; // stable lucide icon key
  rarity: RewardRarity;
  color: string; // Tailwind or hex color for card
}

/** Bonus XP granted directly. */
export interface XpReward extends RewardBase {
  type: 'xp';
  /** XP amount. */
  value: number;
}

/** Hint tokens added to the student's balance. */
export interface HintTokenReward extends RewardBase {
  type: 'hint_token';
  /** Number of tokens granted. */
  value: number;
}

/** Streak shields added to the student's balance. */
export interface StreakShieldReward extends RewardBase {
  type: 'streak_shield';
  /** Number of shields granted. */
  value: number;
}

/**
 * Temporary XP multiplier. Duration and multiplier are separate fields because
 * the two are independent: deriving the multiplier from a substring of `id`
 * silently applied the wrong multiplier whenever the naming convention changed.
 */
export interface XpMultiplierReward extends RewardBase {
  type: 'xp_multiplier';
  durationMinutes: number;
  multiplier: number;
}

/** Badge grant; the payload is the badge identifier rather than a quantity. */
export interface BadgeUnlockReward extends RewardBase {
  type: 'badge_unlock';
  badgeId: string;
}

/** Reward payload as stored in the catalog, without its weekly day index. */
export type RewardPayload =
  | XpReward
  | HintTokenReward
  | StreakShieldReward
  | XpMultiplierReward
  | BadgeUnlockReward;

export type RewardType = RewardPayload['type'];

/** A reward payload assigned to a day of the week (0-6). */
export type RewardDefinition = RewardPayload & { day: number };

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
