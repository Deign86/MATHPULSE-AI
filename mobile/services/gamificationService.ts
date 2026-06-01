/**
 * gamificationService.ts — Mobile Firestore-backed gamification service.
 *
 * Ported from `src/services/gamificationService.ts` for the mobile app.
 * All XP writes go through Firestore; reads use `onSnapshot` where appropriate.
 *
 * Level formula: exponential cumulative scale.
 *   computeLevel(totalXP) = largest N such that
 *     sum_{i=1..N-1} floor(100 * 1.5^(i-1)) <= totalXP
 *   Pre-computed thresholds:
 *     [0, 100, 250, 475, 812, 1318, 2077, 3200, 4867, 7328, …]
 */

import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  collection,
  firestoreQuery,
  where,
  orderBy,
  limit,
  onSnapshot,
  runTransaction,
  firestoreServerTimestamp,
  increment,
  arrayUnion,
  updateDoc,
} from '../lib/firebase';
import { db } from '../lib/firebase';
import type { LeaderboardEntry, XPActivity, Achievement } from '../types/models';

// ─── Level Computation ──────────────────────────────────────────────────────

/**
 * Compute level from lifetime totalXP using exponential cumulative scale.
 *
 * Level = largest N such that sum_{i=1..N-1} floor(100 * 1.5^(i-1)) <= totalXP.
 *
 * Thresholds (cumulative):
 *   L1:    0 XP
 *   L2:  100 XP  (100)
 *   L3:  250 XP  (100 + 150)
 *   L4:  475 XP  (100 + 150 + 225)
 *   L5:  812 XP  (100 + 150 + 225 + 337)
 *   L6: 1318 XP  (… + 506)
 *   L7: 2077 XP  (… + 759)
 *   L8: 3200 XP  (… + 1123)
 *   L9: 4867 XP  (… + 1667)
 *  L10: 7328 XP  (… + 2461)
 */
export function computeLevel(totalXP: number): number {
  if (totalXP < 0) return 1;

  let level = 1;
  let cumulative = 0;

  // Keep summing thresholds until we exceed totalXP
  for (let i = 1; ; i++) {
    cumulative += Math.floor(100 * Math.pow(1.5, i - 1));
    if (totalXP >= cumulative) {
      level = i + 1;
    } else {
      break;
    }
  }

  return level;
}

/**
 * Compute level-progress metadata from lifetime totalXP.
 *
 * Returns the current level, the XP required to reach the current level
 * (prevThreshold), the XP required for the next level (nextThreshold),
 * and the XP earned within the current level.
 */
export function getLevelProgress(totalXP: number): {
  level: number;
  prevThreshold: number;
  nextThreshold: number;
  xpInLevel: number;
  xpToNext: number;
} {
  if (totalXP < 0) {
    return { level: 1, prevThreshold: 0, nextThreshold: 100, xpInLevel: 0, xpToNext: 100 };
  }

  let level = 1;
  let cumulative = 0;
  let prevCumulative = 0;

  for (let i = 1; ; i++) {
    const step = Math.floor(100 * Math.pow(1.5, i - 1));
    prevCumulative = cumulative;
    cumulative += step;
    if (totalXP >= cumulative) {
      level = i + 1;
    } else {
      break;
    }
  }

  const xpInLevel = totalXP - prevCumulative;
  const xpToNext = cumulative - totalXP;

  return { level, prevThreshold: prevCumulative, nextThreshold: cumulative, xpInLevel, xpToNext };
}

// ─── Award XP ───────────────────────────────────────────────────────────────

export const awardXP = async (
  uid: string,
  amount: number,
  source: string,
  reason: string,
): Promise<{ newTotal: number; leveledUp: boolean; newLevel: number }> => {
  if (amount <= 0) {
    throw new Error('XP amount must be positive');
  }

  const userRef = doc(db, 'users', uid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    throw new Error('User not found');
  }

  const userData = userDoc.data();
  const previousTotalXP: number = userData.totalXP || 0;
  const xpMultiplier: number = userData.xpMultiplier || 1.0;
  const adjustedAmount = Math.floor(amount * xpMultiplier);

  const newTotal = previousTotalXP + adjustedAmount;
  const newCurrentXP = (userData.currentXP || 0) + adjustedAmount;
  const previousLevel: number = userData.level || 1;
  const newLevel = computeLevel(newTotal);
  const leveledUp = newLevel > previousLevel;

  const updatePayload: Record<string, unknown> = {
    currentXP: newCurrentXP,
    totalXP: newTotal,
    level: newLevel,
    updatedAt: firestoreServerTimestamp(),
  };

  // Clear one-shot multiplier after use
  if (xpMultiplier !== 1.0) {
    updatePayload.xpMultiplier = 1.0;
  }

  await updateDoc(userRef, updatePayload);

  // Log activity
  const activityRef = doc(collection(db, 'xpActivities'));
  await setDoc(activityRef, {
    activityId: activityRef.id,
    userId: uid,
    type: source,
    xpEarned: adjustedAmount,
    description: reason,
    timestamp: firestoreServerTimestamp(),
  });

  return { newTotal, leveledUp, newLevel };
};

// ─── Leaderboard ────────────────────────────────────────────────────────────

export const getLeaderboard = async (
  period: 'weekly' | 'monthly' | 'all' = 'all',
  limitCount: number = 100,
): Promise<LeaderboardEntry[]> => {
  try {
    const lbQuery = firestoreQuery(
      collection(db, 'leaderboard'),
      orderBy('totalXP', 'desc'),
      limit(limitCount),
    );

    const snapshot = await getDocs(lbQuery);

    if (snapshot.empty) {
      return [];
    }

    void period; // period filter not implemented on read side yet

    return snapshot.docs.map((docSnap, index) => {
      const data = docSnap.data();
      return {
        userId: docSnap.id,
        name: data.name || 'Unknown',
        photo: data.photo,
        xp: data.totalXP || 0,
        level: data.level || 1,
        rank: index + 1,
        weeklyXP: data.weeklyXP || 0,
        monthlyXP: data.monthlyXP || 0,
      };
    });
  } catch (error) {
    console.error('[gamificationService.getLeaderboard] Error:', error);
    return [];
  }
};

export const subscribeToLeaderboard = (
  callback: (leaderboard: LeaderboardEntry[]) => void,
  period: 'weekly' | 'monthly' | 'all' = 'all',
  limitCount: number = 100,
): (() => void) => {
  void period;

  const lbQuery = firestoreQuery(
    collection(db, 'leaderboard'),
    orderBy('totalXP', 'desc'),
    limit(limitCount),
  );

  return onSnapshot(
    lbQuery,
    (snapshot) => {
      const leaderboard = snapshot.docs.map((docSnap, index) => {
        const data = docSnap.data();
        return {
          userId: docSnap.id,
          name: data.name || 'Unknown',
          photo: data.photo,
          xp: data.totalXP || 0,
          level: data.level || 1,
          rank: index + 1,
          weeklyXP: data.weeklyXP || 0,
          monthlyXP: data.monthlyXP || 0,
        };
      });
      callback(leaderboard);
    },
    (error) => {
      console.error('[gamificationService.subscribeToLeaderboard] Error:', error);
      callback([]);
    },
  );
};

// ─── User Rank ──────────────────────────────────────────────────────────────

export const getUserRank = async (uid: string): Promise<number> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) return 0;

    const userXP: number = userDoc.data().totalXP || 0;

    // Count students with more XP (this requires a composite index)
    const higherRankedQuery = firestoreQuery(
      collection(db, 'users'),
      where('role', '==', 'student'),
      where('totalXP', '>', userXP),
    );

    const snapshot = await getDocs(higherRankedQuery);
    return snapshot.size + 1;
  } catch (error) {
    console.error('[gamificationService.getUserRank] Error:', error);
    return 0;
  }
};

// ─── XP Activity History ────────────────────────────────────────────────────

export const getXPActivities = async (
  uid: string,
  limitCount: number = 20,
  daysBack?: number,
): Promise<XPActivity[]> => {
  try {
    const activitiesQuery = firestoreQuery(
      collection(db, 'xpActivities'),
      where('userId', '==', uid),
      orderBy('timestamp', 'desc'),
      limit(limitCount),
    );

    const snapshot = await getDocs(activitiesQuery);
    const activities = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        ...data,
        timestamp: data.timestamp?.toDate?.() ?? new Date(),
      } as XPActivity;
    });

    if (typeof daysBack === 'number' && daysBack > 0) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - daysBack);
      cutoff.setHours(0, 0, 0, 0);
      return activities.filter((a) => a.timestamp >= cutoff);
    }

    return activities;
  } catch (error) {
    console.error('[gamificationService.getXPActivities] Error:', error);
    return [];
  }
};

// ─── Achievements ───────────────────────────────────────────────────────────

/**
 * Check all achievement conditions against the user's current stats and
 * award any newly-unlocked achievements. Uses a lazy import to avoid a
 * circular dependency with achievementCheckerService.
 */
export const checkAchievements = async (
  uid: string,
  stats: Record<string, unknown>,
): Promise<Achievement[]> => {
  try {
    // Lazy import to break circular dependency risk
    // (The achievementCheckerService imports from this file)
    const { checkAndAwardAchievements } = await import(
      '../services/achievementCheckerService'
    );

    const newlyUnlocked = await checkAndAwardAchievements(
      uid,
      stats,
      {} /* userData — populated inside achievementCheckerService */,
    );

    const newAchievements: Achievement[] = [];

    for (const unlocked of newlyUnlocked) {
      const achievement: Achievement = {
        id: unlocked.id,
        title: unlocked.title,
        description: unlocked.description,
        icon: unlocked.iconName || unlocked.id,
        xpReward: unlocked.xpReward || 0,
        condition: unlocked.id,
        iconColor: unlocked.iconColor,
        category: unlocked.category,
        unlockedAt: unlocked.unlockedAt,
      };

      newAchievements.push(achievement);

      // Award XP for each achievement
      if (achievement.xpReward > 0) {
        await awardXP(
          uid,
          achievement.xpReward,
          'achievement_unlocked',
          `Unlocked: ${achievement.title}`,
        );
      }
    }

    // Persist newly unlocked achievements into achievements/{uid}/unlocked
    if (newAchievements.length > 0) {
      for (const ach of newAchievements) {
        const unlockedRef = doc(
          collection(db, 'achievements', uid, 'unlocked'),
        );
        await setDoc(unlockedRef, {
          ...ach,
          userId: uid,
          unlockedAt: firestoreServerTimestamp(),
        });
      }
    }

    return newAchievements;
  } catch (error) {
    console.error('[gamificationService.checkAchievements] Error:', error);
    return [];
  }
};

/**
 * Read all unlocked achievements for a user from the
 * `achievements/{uid}/unlocked` subcollection.
 */
export const getUserAchievements = async (
  uid: string,
): Promise<Achievement[]> => {
  try {
    const achievementsRef = collection(db, 'achievements', uid, 'unlocked');
    const snapshot = await getDocs(achievementsRef);

    if (snapshot.empty) return [];

    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: data.id,
        title: data.title,
        description: data.description,
        icon: data.icon || data.iconName || data.id,
        xpReward: data.xpReward || 0,
        condition: data.condition || data.id,
        iconColor: data.iconColor,
        category: data.category,
        unlockedAt: data.unlockedAt?.toDate?.() ?? new Date(),
      };
    });
  } catch (error) {
    console.error('[gamificationService.getUserAchievements] Error:', error);
    return [];
  }
};

// ─── Avatar Shop ────────────────────────────────────────────────────────────

/**
 * Purchase an avatar item with spendable XP (currentXP).
 * Uses a Firestore transaction for atomicity.
 */
export const purchaseAvatarItem = async (
  uid: string,
  itemId: string,
  price: number,
): Promise<{ success: boolean; message: string; currentXP?: number }> => {
  try {
    const userRef = doc(db, 'users', uid);

    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const data = userDoc.data();
      const currentXP: number = data.currentXP || 0;
      const ownedItems: string[] = data.ownedAvatarItems || [];

      if (ownedItems.includes(itemId)) {
        throw new Error('You already own this item');
      }

      if (currentXP < price) {
        throw new Error(
          `Not enough XP. Need ${price}, but you have ${currentXP}`,
        );
      }

      transaction.update(userRef, {
        currentXP: increment(-price),
        ownedAvatarItems: arrayUnion(itemId),
        updatedAt: firestoreServerTimestamp(),
      });
    });

    // Log purchase activity (outside the transaction to avoid write contention)
    const activityRef = doc(collection(db, 'xpActivities'));
    await setDoc(activityRef, {
      activityId: activityRef.id,
      userId: uid,
      type: 'avatar_purchase',
      xpEarned: -price,
      description: `Purchased avatar item: ${itemId}`,
      timestamp: firestoreServerTimestamp(),
    });

    // Read back current XP for the return value
    const updatedDoc = await getDoc(userRef);
    const newXP = updatedDoc.exists()
      ? (updatedDoc.data().currentXP || 0)
      : 0;

    return {
      success: true,
      message: 'Item purchased successfully!',
      currentXP: newXP,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to purchase item';
    console.error('[gamificationService.purchaseAvatarItem] Error:', message);
    return { success: false, message };
  }
};

/**
 * Unlock an avatar item (e.g. from a reward or chest) without deducting XP.
 */
export const unlockAvatarItem = async (
  uid: string,
  itemId: string,
): Promise<{ success: boolean; message: string }> => {
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const data = userDoc.data();
    const ownedItems: string[] = data.ownedAvatarItems || [];

    if (ownedItems.includes(itemId)) {
      return { success: true, message: 'Item already owned' };
    }

    await updateDoc(userRef, {
      ownedAvatarItems: arrayUnion(itemId),
      updatedAt: firestoreServerTimestamp(),
    });

    return { success: true, message: 'Avatar item unlocked!' };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to unlock item';
    console.error('[gamificationService.unlockAvatarItem] Error:', message);
    return { success: false, message };
  }
};

// ─── Backward-compat aliases (pre-existing callers) ────────────────────────

/**
 * @deprecated Use `awardXP(uid, amount, source, reason)` instead.
 * Legacy wrapper that accepts the old `addXP(amount, userId, token?)` shape.
 */
export async function addXP(
  amount: number,
  userId: string,
  _token?: string,
): Promise<{ newTotal: number; leveledUp: boolean }> {
  const result = await awardXP(userId, amount, 'generic', 'XP awarded');
  return { newTotal: result.newTotal, leveledUp: result.leveledUp };
}

/**
 * @deprecated Daily reward service has not been ported to mobile yet.
 * Legacy stub that returns a safe default so consuming screens don't crash.
 */
export async function claimDailyReward(
  _userId: string,
  _dayIndex: number,
  _token?: string,
): Promise<{ reward: unknown; claimed: boolean }> {
  console.warn(
    '[gamificationService.claimDailyReward] dailyRewardService not yet ported to mobile',
  );
  return { reward: null, claimed: false };
}
