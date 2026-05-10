/**
 * achievementCheckerService.ts
 *
 * Evaluates achievement conditions against a user's progress data and
 * awards newly unlocked achievements with XP rewards.
 *
 * Also provides rolling-shuffle helpers so RewardsModal can display
 * 3 random locked achievements without repetition across renders.
 */

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { awardXP } from './gamificationService';
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_MAP,
  AchievementConfig,
  AchievementConditionType,
} from '../config/achievements';

// ─── Types ─────────────────────────────────────────────────────────────────

/** The shape written to Firestore under achievements/{userId} */
export interface UnlockedAchievement {
  id: string;
  title: string;
  description: string;
  iconName: string;
  iconColor: string;
  xpReward: number;
  condition: AchievementConditionType;
  category: string;
  unlockedAt: Date;
}

/** Rolling shuffle state stored in Firestore under achievements/{userId}/shuffle */
export interface ShuffleState {
  shownIds: string[]; // last N shown achievement IDs
  lastShuffleAt: Date;
}

const SHUFFLE_POOL_SIZE = 3; // number of locked achievements to display
const SHUFFLE_HISTORY = 6;   // don't repeat these recently shown IDs

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Seeded pseudo-random number generator (no external deps). */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

/**
 * Given a list of locked achievement IDs, return a shuffled sub-list
 * of size SHUFFLE_POOL_SIZE using toDateString() of today as a seed so
 * the selection is stable throughout the day but changes tomorrow.
 */
export function getDailyShuffledAchievements(
  lockedIds: string[],
  today = new Date()
): string[] {
  if (lockedIds.length === 0) return [];
  const seed = today.toDateString().split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng = seededRandom(seed);

  const pool = [...lockedIds];
  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, Math.min(SHUFFLE_POOL_SIZE, pool.length));
}

// ─── Main check function ───────────────────────────────────────────────────

/**
 * Check all achievement conditions for a user and award any newly unlocked ones.
 *
 * @param userId       - Firebase user ID
 * @param progressData - Flattened progress snapshot (from progress/{userId})
 * @param userData     - Flattened user snapshot (from users/{userId})
 * @param eventType    - Optional: specific event that triggered this call (e.g. 'lesson_complete')
 *                       When provided, only achievements matching this event type are evaluated for
 *                       performance. Pass undefined to do a full sweep (e.g. on level-up).
 */
export async function checkAndAwardAchievements(
  userId: string,
  progressData: Record<string, unknown>,
  userData: Record<string, unknown>,
  eventType?: AchievementConditionType
): Promise<UnlockedAchievement[]> {
  // 1. Load currently unlocked IDs
  const achievementsDoc = await getDoc(doc(db, 'achievements', userId));
  const unlockedMap = new Set<string>();
  if (achievementsDoc.exists()) {
    const data = achievementsDoc.data();
    (data.achievements as UnlockedAchievement[]).forEach((a) => unlockedMap.add(a.id));
  }

  // 2. Filter achievements to check
  const candidates = ACHIEVEMENTS.filter((a) => {
    if (unlockedMap.has(a.id)) return false;
    if (eventType !== undefined && a.condition !== eventType) return false;
    return true;
  });

  if (candidates.length === 0) return [];

  // 3. Evaluate conditions
  const newlyUnlocked: UnlockedAchievement[] = [];
  const progress = progressData as Record<string, unknown>;
  const user = userData as Record<string, unknown>;

  for (const achievement of candidates) {
    const earned = evaluateCondition(achievement, progress, user);
    if (earned) {
      newlyUnlocked.push(toUnlockedAchievement(achievement));
      // Award XP
      await awardXP(userId, achievement.xpReward, 'achievement_unlocked', `Unlocked: ${achievement.title}`);
    }
  }

  // 4. Persist to Firestore
  if (newlyUnlocked.length > 0) {
    const existing: UnlockedAchievement[] = achievementsDoc.exists()
      ? (achievementsDoc.data().achievements as UnlockedAchievement[])
      : [];

    await setDoc(
      doc(db, 'achievements', userId),
      {
        userId,
        achievements: [...existing, ...newlyUnlocked],
        totalAchievements: existing.length + newlyUnlocked.length,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  return newlyUnlocked;
}

/** Evaluate whether a single achievement's condition is met. */
function evaluateCondition(
  achievement: AchievementConfig,
  progress: Record<string, unknown>,
  user: Record<string, unknown>
): boolean {
  const { condition, threshold } = achievement;

  switch (condition) {
    // ── lesson_complete ──────────────────────────────────────────────────────
    case 'lesson_complete': {
      const count = (progress.totalLessonsCompleted as number) || 0;
      return threshold !== undefined ? count >= threshold : count >= 1;
    }

    // ── perfect_score ───────────────────────────────────────────────────────
    case 'perfect_score': {
      if (threshold !== undefined) {
        // Count how many quizzes have a perfect score
        const attempts = (progress.quizAttempts as Array<{ score: number }>) || [];
        return attempts.filter((q) => q.score === 100).length >= threshold;
      }
      // Single perfect score check
      const attempts = (progress.quizAttempts as Array<{ score: number }>) || [];
      return attempts.some((q) => q.score === 100);
    }

    // ── quiz_complete ───────────────────────────────────────────────────────
    case 'quiz_complete': {
      const count = (progress.totalQuizzesCompleted as number) || 0;
      return threshold !== undefined ? count >= threshold : count >= 1;
    }

    // ── mastery_10 (daily streak) ──────────────────────────────────────────
    case 'mastery_10': {
      const streak = (user.dailyStreak as number) || 0;
      return threshold !== undefined ? streak >= threshold : streak >= 10;
    }

    // ── mastery_level ───────────────────────────────────────────────────────
    case 'mastery_level': {
      const level = (user.level as number) || 1;
      return threshold !== undefined ? level >= threshold : level >= 5;
    }

    // ── mastery_xp ─────────────────────────────────────────────────────────
    case 'mastery_xp': {
      const totalXP = (user.totalXP as number) || 0;
      return totalXP >= (threshold ?? 5000);
    }

    // ── mastery_all_lessons ─────────────────────────────────────────────────
    case 'mastery_all_lessons': {
      return (progress.allLessonsCompleted as boolean) || false;
    }

    // ── mastery_all_subjects ───────────────────────────────────────────────
    case 'mastery_all_subjects': {
      return (progress.allSubjectsExplored as boolean) || false;
    }

    // ── mastery_assessment_perfect ─────────────────────────────────────────
    case 'mastery_assessment_perfect': {
      return (progress.assessmentPerfect as boolean) || false;
    }

    // ── mastery_max_level ─────────────────────────────────────────────────
    case 'mastery_max_level': {
      const level = (user.level as number) || 1;
      return level >= 100; // assuming level 100 is max
    }

    // ── battle_win ─────────────────────────────────────────────────────────
    case 'battle_win': {
      const count = (progress.battleWins as number) || 0;
      return threshold !== undefined ? count >= threshold : count >= 1;
    }

    // ── battle_undefeated ──────────────────────────────────────────────────
    case 'battle_undefeated': {
      const streak = (progress.battleWinStreak as number) || 0;
      return streak >= (threshold ?? 5);
    }

    // ── battle_comeback ───────────────────────────────────────────────────
    case 'battle_comeback': {
      const count = (progress.battleComebackWins as number) || 0;
      return count >= 1;
    }

    // ── speed_quiz ─────────────────────────────────────────────────────────
    case 'speed_quiz': {
      // Handled by quiz submission service — this is only checked on explicit speed events
      const count = (progress.speedQuizWins as number) || 0;
      return count >= 1;
    }

    // ── quiz_no_mistakes ─────────────────────────────────────────────────
    case 'quiz_no_mistakes': {
      return (progress.quizNoMistakes as boolean) || false;
    }

    // ── explore_* / social_* ───────────────────────────────────────────────
    case 'explore_profile_complete':
      return (user.profileComplete as boolean) || false;

    case 'explore_friend_added': {
      const count = (progress.friendsAdded as number) || 0;
      return threshold !== undefined ? count >= threshold : count >= 1;
    }

    case 'explore_social': {
      const count = (progress.friendsAdded as number) || 0;
      return count >= (threshold ?? 1);
    }

    case 'social_friend': {
      const count = (progress.friendsAdded as number) || 0;
      return count >= (threshold ?? 1);
    }

    case 'social_contribution':
      return (progress.contributionMade as boolean) || false;

    case 'social_xp': {
      // Top-10 leaderboard check — depends on getUserRank
      return false; // evaluated asynchronously by caller
    }

    case 'social_daily_return': {
      const days = (progress.consecutiveDaysActive as number) || 0;
      return days >= (threshold ?? 3);
    }

    default:
      return false;
  }
}

/** Convert an AchievementConfig to the Firestore-friendly UnlockedAchievement shape. */
function toUnlockedAchievement(achievement: AchievementConfig): UnlockedAchievement {
  return {
    id: achievement.id,
    title: achievement.title,
    description: achievement.description,
    iconName: achievement.icon.name, // Lucide icon display name e.g. "BookOpen"
    iconColor: achievement.iconColor,
    xpReward: achievement.xpReward,
    condition: achievement.condition,
    category: achievement.category,
    unlockedAt: new Date(),
  };
}

// ─── Rolling shuffle helper ─────────────────────────────────────────────────

/**
 * Return SHUFFLE_POOL_SIZE achievement configs for display in RewardsModal.
 * Uses daily-seeded shuffle to show consistent locked achievements throughout the day.
 */
export function getShuffledLockedAchievements(
  userId: string,
  lockedAchievements: AchievementConfig[],
  today?: Date
): AchievementConfig[] {
  const lockedIds = lockedAchievements.map((a) => a.id);
  const shuffledIds = getDailyShuffledAchievements(lockedIds, today);
  return shuffledIds
    .map((id) => ACHIEVEMENT_MAP.get(id))
    .filter((a): a is AchievementConfig => a !== undefined);
}

/** Persist recently shown achievement IDs to Firestore to prevent rapid repetition. */
export async function recordShuffleShown(
  userId: string,
  shownIds: string[]
): Promise<void> {
  await setDoc(
    doc(db, 'achievements', userId, 'shuffle', 'state'),
    {
      shownIds: shownIds.slice(-SHUFFLE_HISTORY),
      lastShuffleAt: serverTimestamp(),
    },
    { merge: true }
  );
}

// ─── Re-export AchievementConfig for convenience ───────────────────────────
export type { AchievementConfig } from '../config/achievements';
export { ACHIEVEMENTS, ACHIEVEMENT_MAP } from '../config/achievements';