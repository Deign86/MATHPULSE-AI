/**
 * achievementCheckerService.ts — Mobile achievement evaluation & award
 *
 * Evaluates achievement conditions against user stats, awards newly
 * unlocked achievements to the `achievements/{uid}/unlocked/{achievementId}`
 * Firestore subcollection, and grants XP through the gamification service.
 *
 * Mirror of web `src/services/achievementCheckerService.ts` adapted for
 * the mobile subcollection pattern.
 */

import { db } from '@/lib/firebase';
import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  firestoreQuery as query,
  onSnapshot,
  firestoreServerTimestamp,
} from '@/lib/firebase';
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_MAP,
  AchievementConfig,
  AchievementConditionType,
  AchievementCategory,
  CATEGORY_COUNTS,
} from '@/config/achievements';
import type { Achievement } from '@/types/models';
import { awardXP } from './gamificationService';

// ─── Stats type ─────────────────────────────────────────────────────────────

/**
 * Flat snapshot of user progress + profile data consumed by the
 * evaluateProgress switch. Corresponds to the fields read by the
 * web's evaluateCondition function.
 */
export interface AchievementCheckerStats {
  // Progress fields
  totalLessonsCompleted: number;
  quizAttempts: Array<{ score: number }>;
  totalQuizzesCompleted: number;
  allLessonsCompleted: boolean;
  allSubjectsExplored: boolean;
  assessmentPerfect: boolean;
  battleWins: number;
  battleWinStreak: number;
  battleComebackWins: number;
  speedQuizWins: number;
  quizNoMistakes: boolean;
  friendsAdded: number;
  contributionMade: boolean;
  consecutiveDaysActive: number;
  // User / profile fields
  dailyStreak: number;
  level: number;
  totalXP: number;
  profileComplete: boolean;
}

/**
 * Default stats — used as fallback so callers don't need to supply
 * every field on first check.
 */
export const DEFAULT_STATS: AchievementCheckerStats = {
  totalLessonsCompleted: 0,
  quizAttempts: [],
  totalQuizzesCompleted: 0,
  allLessonsCompleted: false,
  allSubjectsExplored: false,
  assessmentPerfect: false,
  battleWins: 0,
  battleWinStreak: 0,
  battleComebackWins: 0,
  speedQuizWins: 0,
  quizNoMistakes: false,
  friendsAdded: 0,
  contributionMade: false,
  consecutiveDaysActive: 0,
  dailyStreak: 0,
  level: 1,
  totalXP: 0,
  profileComplete: false,
};

// ─── Firestore paths ────────────────────────────────────────────────────────

/** Subcollection path helper: achievements/{uid}/unlocked */
function unlockedCollectionPath(uid: string): string {
  return `achievements/${uid}/unlocked`;
}

/** Full doc ref: achievements/{uid}/unlocked/{achievementId} */
function unlockedDocRef(uid: string, achievementId: string) {
  return doc(db, unlockedCollectionPath(uid), achievementId);
}

/** Runtime wrapper returned by checkAndAwardAchievements for gamificationService compatibility. */
export interface UnlockedAchievementResult {
  id: string;
  title: string;
  description: string;
  /** Lucide icon display name (for type compatibility with Achievement) */
  icon: string;
  /** Alias for icon — gamificationService reads this */
  iconName: string;
  iconColor: string;
  xpReward: number;
  condition: AchievementConditionType;
  category: AchievementCategory;
  /** Timestamp when this achievement was unlocked */
  unlockedAt: Date;
}

// ─── Exported functions ─────────────────────────────────────────────────────

/**
 * Evaluate all achievement conditions for a user and award any newly
 * unlocked ones.
 *
 * Writes each unlock to `achievements/{uid}/unlocked/{achievementId}` and
 * grants XP through `awardXP` from the gamification service.
 *
 * Signature mirrors the web checker:
 *   checkAndAwardAchievements(userId, progressData, userData, eventType?)
 *
 * progressData + userData are merged into AchievementCheckerStats via the
 * internal mergeStats helper, using sensible defaults for missing fields.
 *
 * @returns Array of newly unlocked achievements with runtime fields
 */
export async function checkAndAwardAchievements(
  userId: string,
  progressData: Record<string, unknown>,
  userData: Record<string, unknown>,
  eventType?: AchievementConditionType
): Promise<UnlockedAchievementResult[]> {
  // Merge progress + user data into typed stats
  const stats = mergeStats(progressData, userData);

  // 1. Load currently unlocked IDs from subcollection
  const col = collection(db, unlockedCollectionPath(userId));
  const snapshot = await getDocs(query(col));
  const unlockedIds = new Set<string>();
  snapshot.forEach((d) => unlockedIds.add(d.id));

  // 2. Filter candidates: not already unlocked, matching eventType if provided
  const candidates = ACHIEVEMENTS.filter((a) => {
    if (unlockedIds.has(a.id)) return false;
    if (eventType !== undefined && a.condition !== eventType) return false;
    return true;
  });

  if (candidates.length === 0) return [];

  // 3. Evaluate conditions and award
  const newlyUnlocked: UnlockedAchievementResult[] = [];
  const now = new Date();

  for (const achievement of candidates) {
    const earned = evaluateProgress(achievement, stats);
    if (!earned) continue;

    await awardAchievement(userId, achievement.id);
    newlyUnlocked.push(toUnlockedResult(achievement, now));

    // Award XP through the gamification service.
    try {
      await awardXP(
        userId,
        achievement.xpReward,
        'achievement_unlocked',
        `Unlocked: ${achievement.title}`
      );
    } catch {
      // XP write may fail; achievement record persists regardless
    }
  }

  return newlyUnlocked;
}

/**
 * Evaluate whether a single achievement's condition is met given
 * the current user stats.
 */
export function evaluateProgress(
  achievement: AchievementConfig,
  stats: AchievementCheckerStats
): boolean {
  const { condition, threshold } = achievement;

  switch (condition) {
    // ── lesson_complete ────────────────────────────────────────────────────
    case 'lesson_complete': {
      const count = stats.totalLessonsCompleted;
      return threshold !== undefined ? count >= threshold : count >= 1;
    }

    // ── perfect_score ──────────────────────────────────────────────────────
    case 'perfect_score': {
      const attempts = stats.quizAttempts;
      if (threshold !== undefined) {
        return attempts.filter((q) => q.score === 100).length >= threshold;
      }
      return attempts.some((q) => q.score === 100);
    }

    // ── quiz_complete ──────────────────────────────────────────────────────
    case 'quiz_complete': {
      const count = stats.totalQuizzesCompleted;
      return threshold !== undefined ? count >= threshold : count >= 1;
    }

    // ── mastery_10 (daily streak) ──────────────────────────────────────────
    case 'mastery_10': {
      const streak = stats.dailyStreak;
      return threshold !== undefined ? streak >= threshold : streak >= 10;
    }

    // ── mastery_level ─────────────────────────────────────────────────────
    case 'mastery_level': {
      const level = stats.level;
      return threshold !== undefined ? level >= threshold : level >= 5;
    }

    // ── mastery_xp ────────────────────────────────────────────────────────
    case 'mastery_xp': {
      return stats.totalXP >= (threshold ?? 5000);
    }

    // ── mastery_all_lessons ────────────────────────────────────────────────
    case 'mastery_all_lessons':
      return stats.allLessonsCompleted;

    // ── mastery_all_subjects ───────────────────────────────────────────────
    case 'mastery_all_subjects':
      return stats.allSubjectsExplored;

    // ── mastery_assessment_perfect ────────────────────────────────────────
    case 'mastery_assessment_perfect':
      return stats.assessmentPerfect;

    // ── mastery_max_level ─────────────────────────────────────────────────
    case 'mastery_max_level':
      return stats.level >= 100;

    // ── battle_win ────────────────────────────────────────────────────────
    case 'battle_win': {
      const count = stats.battleWins;
      return threshold !== undefined ? count >= threshold : count >= 1;
    }

    // ── battle_undefeated ─────────────────────────────────────────────────
    case 'battle_undefeated': {
      const streak = stats.battleWinStreak;
      return streak >= (threshold ?? 5);
    }

    // ── battle_comeback ───────────────────────────────────────────────────
    case 'battle_comeback':
      return stats.battleComebackWins >= 1;

    // ── speed_quiz ────────────────────────────────────────────────────────
    case 'speed_quiz':
      return stats.speedQuizWins >= 1;

    // ── quiz_no_mistakes ──────────────────────────────────────────────────
    case 'quiz_no_mistakes':
      return stats.quizNoMistakes;

    // ── explore_* / social_* ──────────────────────────────────────────────
    case 'explore_profile_complete':
      return stats.profileComplete;

    case 'explore_friend_added': {
      const count = stats.friendsAdded;
      return threshold !== undefined ? count >= threshold : count >= 1;
    }

    case 'explore_social': {
      return stats.friendsAdded >= (threshold ?? 1);
    }

    case 'social_friend': {
      return stats.friendsAdded >= (threshold ?? 1);
    }

    case 'social_contribution':
      return stats.contributionMade;

    case 'social_xp':
      // Rank-based: evaluated asynchronously by caller
      return false;

    case 'social_daily_return': {
      const days = stats.consecutiveDaysActive;
      return days >= (threshold ?? 3);
    }

    default:
      return false;
  }
}

/**
 * Persist a single achievement unlock to Firestore.
 *
 * Writes to `achievements/{uid}/unlocked/{achievementId}` with
 * achievement metadata + server timestamp.
 */
export async function awardAchievement(
  userId: string,
  achievementId: string
): Promise<void> {
  const config = ACHIEVEMENT_MAP.get(achievementId);
  if (!config) {
    console.warn(
      `[achievementChecker] Unknown achievement id "${achievementId}"`
    );
    return;
  }

  await setDoc(unlockedDocRef(userId, achievementId), {
    id: config.id,
    title: config.title,
    description: config.description,
    icon: config.icon,
    iconColor: config.iconColor,
    xpReward: config.xpReward,
    condition: config.condition,
    category: config.category,
    unlockedAt: firestoreServerTimestamp(),
  });
}

// ─── Internal helpers ───────────────────────────────────────────────────────

/** Safely read a number from a Record<string, unknown> with a default. */
function safeNum(obj: Record<string, unknown>, key: string, fallback: number): number {
  const v = obj[key];
  return typeof v === 'number' && !Number.isNaN(v) ? v : fallback;
}

/** Safely read a boolean flag. */
function safeBool(obj: Record<string, unknown>, key: string, fallback = false): boolean {
  const v = obj[key];
  return typeof v === 'boolean' ? v : fallback;
}

/** Safely read an array. */
function safeArr<T>(obj: Record<string, unknown>, key: string): T[] {
  const v = obj[key];
  return Array.isArray(v) ? (v as T[]) : [];
}

/** Merge progress + user Record<string,unknown> into typed AchievementCheckerStats. */
function mergeStats(
  progress: Record<string, unknown>,
  user: Record<string, unknown>
): AchievementCheckerStats {
  return {
    totalLessonsCompleted: safeNum(progress, 'totalLessonsCompleted', 0),
    quizAttempts: safeArr<{ score: number }>(progress, 'quizAttempts'),
    totalQuizzesCompleted: safeNum(progress, 'totalQuizzesCompleted', 0),
    allLessonsCompleted: safeBool(progress, 'allLessonsCompleted'),
    allSubjectsExplored: safeBool(progress, 'allSubjectsExplored'),
    assessmentPerfect: safeBool(progress, 'assessmentPerfect'),
    battleWins: safeNum(progress, 'battleWins', 0),
    battleWinStreak: safeNum(progress, 'battleWinStreak', 0),
    battleComebackWins: safeNum(progress, 'battleComebackWins', 0),
    speedQuizWins: safeNum(progress, 'speedQuizWins', 0),
    quizNoMistakes: safeBool(progress, 'quizNoMistakes'),
    friendsAdded: safeNum(progress, 'friendsAdded', 0),
    contributionMade: safeBool(progress, 'contributionMade'),
    consecutiveDaysActive: safeNum(progress, 'consecutiveDaysActive', 0),
    dailyStreak: safeNum(user, 'dailyStreak', 0),
    level: safeNum(user, 'level', 1),
    totalXP: safeNum(user, 'totalXP', 0),
    profileComplete: safeBool(user, 'profileComplete'),
  };
}

/** Convert config + timestamp to the runtime result type used by gamificationService. */
function toUnlockedResult(
  a: AchievementConfig,
  unlockedAt: Date
): UnlockedAchievementResult {
  return {
    id: a.id,
    title: a.title,
    description: a.description,
    icon: a.icon,
    iconName: a.icon,
    iconColor: a.iconColor,
    xpReward: a.xpReward,
    condition: a.condition,
    category: a.category,
    unlockedAt,
  };
}

// ─── Query helpers ─────────────────────────────────────────────────────

/**
 * Return all achievement configs (40 total).
 */
export function getAllAchievements(): AchievementConfig[] {
  return [...ACHIEVEMENTS];
}

/**
 * Return achievement configs filtered by category.
 */
export function getAchievementsByCategory(
  category: AchievementCategory
): AchievementConfig[] {
  return ACHIEVEMENTS.filter((a) => a.category === category);
}

/**
 * Return the count of achievements in a category.
 */
export function getAchievementCountByCategory(
  category: AchievementCategory
): number {
  return CATEGORY_COUNTS[category];
}

/**
 * Subscribe to real-time unlocks for a user via Firestore onSnapshot.
 * Fires the callback immediately with current state and again on every
 * change to the `achievements/{uid}/unlocked` subcollection.
 *
 * Returns an unsubscribe function.
 */
export function subscribeToUserAchievements(
  uid: string,
  callback: (achievements: Achievement[]) => void
): () => void {
  const col = collection(db, unlockedCollectionPath(uid));

  const unsub = onSnapshot(
    query(col),
    (snapshot) => {
      const achievements: Achievement[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as Record<string, unknown>;
        const achievement: Achievement = {
          id: typeof data.id === 'string' ? data.id : d.id,
          title: typeof data.title === 'string' ? data.title : '',
          description:
            typeof data.description === 'string' ? data.description : '',
          icon: typeof data.icon === 'string' ? data.icon : 'Award',
          xpReward: typeof data.xpReward === 'number' ? data.xpReward : 0,
          condition:
            typeof data.condition === 'string' ? data.condition : '',
          iconColor:
            typeof data.iconColor === 'string'
              ? data.iconColor
              : undefined,
          category:
            typeof data.category === 'string'
              ? data.category
              : undefined,
          unlockedAt:
            data.unlockedAt instanceof Date ||
            (typeof data.unlockedAt === 'object' &&
              data.unlockedAt !== null &&
              'toDate' in (data.unlockedAt as Record<string, unknown>))
              ? new Date()
              : undefined,
        };
        achievements.push(achievement);
      });
      callback(achievements);
    },
    (error) => {
      console.error(
        '[achievementChecker] onSnapshot error:',
        error
      );
      callback([]);
    }
  );

  return unsub;
}

// ─── Re-exports ─────────────────────────────────────────────────────────────

export type { AchievementConfig, AchievementConditionType, AchievementCategory };
export { ACHIEVEMENTS, ACHIEVEMENT_MAP, CATEGORY_COUNTS };
