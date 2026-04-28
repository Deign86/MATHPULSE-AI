import { clamp } from '../utils/math';

export interface RoundScoreBreakdown {
  basePoints: number;
  difficultyMultiplier: number;
  streakMultiplier: number;
  speedBonus: number;
  totalPointsAwarded: number;
  streakAtAnswer: number;
  serverValidatedLatencyMs: number;
}

export interface MatchXPBreakdown {
  baseMatchXP: number;
  performanceXP: number;
  totalXPAwarded: number;
  totalPointsEarned: number;
  scoringVersion: 'v2';
}

export const DIFFICULTY_MULTIPLIERS: Record<'easy' | 'medium' | 'hard', number> = {
  easy: 1.0,
  medium: 1.15,
  hard: 1.30,
};

export const XP_CAP_PER_BATTLE = 140;
export const DAILY_BATTLE_XP_CAP = 500;

export type MatchOutcome = 'win' | 'loss' | 'draw';

export const computeRoundScoreBreakdown = (params: {
  difficulty: 'easy' | 'medium' | 'hard';
  consecutiveCorrect: number;
  responseMs: number;
  roundStartedAtMs: number;
  roundDeadlineAtMs: number;
}): RoundScoreBreakdown => {
  const { difficulty, consecutiveCorrect, responseMs, roundStartedAtMs, roundDeadlineAtMs } = params;
  const difficultyMultiplier = DIFFICULTY_MULTIPLIERS[difficulty] || 1.0;
  const streakMultiplier = Math.min(1.72, 1.00 + 0.10 * Math.max(0, consecutiveCorrect - 1));
  const totalTimeMs = Math.max(1, roundDeadlineAtMs - roundStartedAtMs);
  const rawSpeedBonus = Math.round(20 * (roundDeadlineAtMs - (roundStartedAtMs + responseMs)) / totalTimeMs);
  const speedBonus = Math.max(0, Math.min(20, rawSpeedBonus));
  const totalPointsAwarded = Math.round(100 * difficultyMultiplier * streakMultiplier + speedBonus);
  const serverValidatedLatencyMs = clamp(responseMs, 0, totalTimeMs);

  return {
    basePoints: 100,
    difficultyMultiplier,
    streakMultiplier,
    speedBonus,
    totalPointsAwarded,
    streakAtAnswer: consecutiveCorrect,
    serverValidatedLatencyMs,
  };
};

export const computeMatchXP = (params: {
  outcome: MatchOutcome;
  totalPointsEarned: number;
  battleXPEarnedToday: number;
}): { xpBreakdown: MatchXPBreakdown; actualXPAwarded: number } => {
  const { outcome, totalPointsEarned, battleXPEarnedToday } = params;
  const baseMatchXP = outcome === 'win' ? 60 : outcome === 'draw' ? 40 : 20;
  const performanceXP = Math.floor(totalPointsEarned * 0.08);
  const uncappedXP = baseMatchXP + performanceXP;
  const cappedByMatchXP = Math.min(uncappedXP, XP_CAP_PER_BATTLE);
  const remainingDailyCap = Math.max(0, DAILY_BATTLE_XP_CAP - battleXPEarnedToday);
  const actualXPAwarded = Math.min(cappedByMatchXP, remainingDailyCap);

  const xpBreakdown: MatchXPBreakdown = {
    baseMatchXP,
    performanceXP,
    totalXPAwarded: actualXPAwarded,
    totalPointsEarned,
    scoringVersion: 'v2',
  };

  return { xpBreakdown, actualXPAwarded };
};