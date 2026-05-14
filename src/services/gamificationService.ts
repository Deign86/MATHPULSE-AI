import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  serverTimestamp,
  increment,
  arrayUnion,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { LeaderboardEntry, XPActivity, Achievement, UserAchievements } from '../types/models';
import { checkAndAwardAchievements } from './achievementCheckerService';
import { ACHIEVEMENT_MAP } from '../config/achievements';

// Award XP and handle level ups
export const awardXP = async (
  userId: string,
  xpAmount: number,
  type: string,
  description: string
): Promise<{ newLevel: number; leveledUp: boolean; xp: number; addedXp?: number }> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    const previousCurrentXP = userData.currentXP || 0;
    const previousTotalXP = userData.totalXP || 0;
    const xpMultiplier = userData.xpMultiplier || 1.0;
    const adjustedXpAmount = Math.floor(xpAmount * xpMultiplier);
    const currentXP = previousCurrentXP + adjustedXpAmount;
    const totalXP = previousTotalXP + adjustedXpAmount;
    const currentLevel = userData.level || 1;

    let newLevel = currentLevel;
    const accumulatedXP = totalXP;
    let leveledUp = false;

    // Determine correct level purely based on absolute lifetime totalXP 
    // instead of spending currency (currentXP) for levels
    while (true) {
      const requiredForNext = Math.floor(100 * Math.pow(1.5, newLevel - 1));
      
      // We calculate their expected absolute total XP for newLevels from 1 upwards
      // simplified iterative check:
      let sumRequired = 0;
      for (let i = 1; i <= newLevel; i++) {
        sumRequired += Math.floor(100 * Math.pow(1.5, i - 1));
      }
      
      if (totalXP >= sumRequired) {
        newLevel++;
        leveledUp = true;
      } else {
        break;
      }
    }

    // Update user data - ensure we're ALWAYS incrementing from the previous value, never resetting to a hardcoded constant
    const updatePayload: Record<string, any> = {
      currentXP: currentXP, // MUST be previous + increment, never a fixed value like 50
      totalXP: totalXP,     // MUST be previous + increment, never a fixed value like 50
      level: newLevel,
      updatedAt: serverTimestamp(),
    };

    // Clear xpMultiplier back to baseline once it has been applied (one-shot boost)
    if (xpMultiplier !== 1.0) {
      updatePayload.xpMultiplier = 1.0;
    }

    await updateDoc(userRef, updatePayload);

    // Log XP activity
    const activityRef = doc(collection(db, 'xpActivities'));
    await setDoc(activityRef, {
      activityId: activityRef.id,
      userId,
      type,
      xpEarned: xpAmount,
      description,
      timestamp: serverTimestamp(),
    });

    return { newLevel, leveledUp, xp: currentXP, addedXp: xpAmount };
  } catch (error) {
    console.error('Error awarding XP:', error);
    throw error;
  }
};

// Get leaderboard from dedicated leaderboard collection
export const getLeaderboard = async (
  userId?: string,
  scopedOnly: boolean = false,
  timeRange: 'all' | 'week' | 'month' = 'all',
  limitCount: number = 10
): Promise<LeaderboardEntry[]> => {
  try {
    void userId;
    void scopedOnly;
    void timeRange;

    const leaderboardQuery = query(
      collection(db, 'leaderboard'),
      orderBy('totalXP', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(leaderboardQuery);
    
    if (snapshot.empty) {
      return [];
    }
    
    return snapshot.docs.map((doc, index) => {
      const data = doc.data();
      return {
        userId: doc.id,
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
    console.error('Error getting leaderboard:', error);
    return [];
  }
};
export const subscribeToLeaderboard = (
  callback: (leaderboard: LeaderboardEntry[]) => void,
  userId?: string,
  scopedOnly: boolean = false,
  timeRange: 'all' | 'week' | 'month' = 'all',
  limitCount: number = 10
) => {
  void userId;
  void scopedOnly;
  void timeRange;

  const leaderboardQuery = query(
    collection(db, 'leaderboard'),
    orderBy('totalXP', 'desc'),
    limit(limitCount)
  );

  return onSnapshot(leaderboardQuery, (snapshot) => {
    const leaderboard = snapshot.docs.map((doc, index) => {
      const data = doc.data();
      return {
        userId: doc.id,
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
  }, (error) => {
    console.error('Error subscribing to leaderboard:', error);
    callback([]);
  });
};
// Get user's rank
export const getUserRank = async (userId: string): Promise<number> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return 0;

    const userXP = userDoc.data().totalXP || 0;

    // Count users with more XP
    const higherRankedQuery = query(
      collection(db, 'users'),
      where('role', '==', 'student'),
      where('totalXP', '>', userXP)
    );

    const snapshot = await getDocs(higherRankedQuery);
    return snapshot.size + 1;
  } catch (error) {
    console.error('Error getting user rank:', error);
    return 0;
  }
};

// Get XP activities for a user
export const getXPActivities = async (
  userId: string,
  limitCount: number = 20
): Promise<XPActivity[]> => {
  try {
    const activitiesQuery = query(
      collection(db, 'xpActivities'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(activitiesQuery);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        timestamp: data.timestamp?.toDate() || new Date(),
      } as XPActivity;
    });
  } catch (error) {
    console.error('Error getting XP activities:', error);
    return [];
  }
};

// Check and unlock achievements
export const checkAchievements = async (userId: string): Promise<Achievement[]> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    const progressDoc = await getDoc(doc(db, 'progress', userId));

    if (!userDoc.exists() || !progressDoc.exists()) return [];

    const userData = userDoc.data();
    const progressData = progressDoc.data();

    const achievementsDoc = await getDoc(doc(db, 'achievements', userId));
    const unlockedAchievements = achievementsDoc.exists()
      ? achievementsDoc.data().achievements || []
      : [];

    const newAchievements: Achievement[] = [];

    // Call the new service to evaluate and award achievements
    const newlyUnlocked = await checkAndAwardAchievements(userId, progressData, userData);

    for (const unlocked of newlyUnlocked) {
      const config = ACHIEVEMENT_MAP.get(unlocked.id);
      
      const newAchievement: Achievement = {
        id: unlocked.id,
        title: unlocked.title,
        description: unlocked.description,
        icon: config?.icon?.name ?? unlocked.id,
        xpReward: config?.xpReward ?? unlocked.xpReward,
        condition: unlocked.id,
        iconColor: unlocked.iconColor,
        category: unlocked.category,
        unlockedAt: unlocked.unlockedAt,
      };

      newAchievements.push(newAchievement);

      // Award XP for achievement
      await awardXP(userId, newAchievement.xpReward, 'achievement_unlocked', `Unlocked: ${newAchievement.title}`);
    }

    // Save new achievements
    if (newAchievements.length > 0) {
      await setDoc(
        doc(db, 'achievements', userId),
        {
          userId,
          achievements: [...unlockedAchievements, ...newAchievements],
          totalAchievements: unlockedAchievements.length + newAchievements.length,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    return newAchievements;
  } catch (error) {
    console.error('Error checking achievements:', error);
    return [];
  }
};

// Get user achievements
export const getUserAchievements = async (userId: string): Promise<Achievement[]> => {
  try {
    const achievementsDoc = await getDoc(doc(db, 'achievements', userId));
    
    if (achievementsDoc.exists()) {
      const data = achievementsDoc.data();
      return data.achievements || [];
    }
    
    return [];
  } catch (error) {
    console.error('Error getting user achievements:', error);
    return [];
  }
};

// Purchase avatar item with XP
export const purchaseAvatarItem = async (
  userId: string,
  itemId: string,
  xpCost: number
): Promise<{ success: boolean; message: string; currentXP?: number }> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    const currentXP = userData.currentXP || 0;
    const ownedItems = userData.ownedAvatarItems || [];

    // Check if user already owns the item
    if (ownedItems.includes(itemId)) {
      return { success: false, message: 'You already own this item', currentXP };
    }

    // Check if user has enough XP
    if (currentXP < xpCost) {
      return { success: false, message: `Not enough XP. Need ${xpCost}, but you have ${currentXP}`, currentXP };
    }

    // Deduct XP and add item to owned items
    const newXP = currentXP - xpCost;
    await updateDoc(userRef, {
      currentXP: newXP,
      ownedAvatarItems: arrayUnion(itemId),
      updatedAt: serverTimestamp(),
    });

    // Log the purchase activity
    const activityRef = doc(collection(db, 'xpActivities'));
    await setDoc(activityRef, {
      activityId: activityRef.id,
      userId,
      type: 'item_purchase',
      xpEarned: -xpCost,
      description: `Purchased avatar item: ${itemId}`,
      timestamp: serverTimestamp(),
    });

    return { success: true, message: 'Item purchased successfully!', currentXP: newXP };
  } catch (error) {
    console.error('Error purchasing avatar item:', error);
    return { success: false, message: 'Failed to purchase item' };
  }
};

export const resetAvatarPurchasesForTesting = async (userId: string): Promise<{ success: boolean; newXP: number }> => {
  if (!import.meta.env.DEV) {
    return { success: false, newXP: 0 };
  }

  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return { success: false, newXP: 0 };
    }
    
    const userData = userDoc.data();
    const currentXP = userData.currentXP || 0;
    
    // Ensure the user has at least 5000 spendable XP for testing without touching totalXP
    const newXP = Math.max(currentXP, 5000);

    await updateDoc(userRef, {
      ownedAvatarItems: [],
      avatarLayers: {
        top: '',
        bottom: '',
        shoes: '',
        accessory: '',
      },
      currentXP: newXP,
      updatedAt: serverTimestamp(),
    });
    
    return { success: true, newXP };
  } catch (error) {
    console.error('Error resetting avatar items:', error);
    return { success: false, newXP: 0 };
  }
};

// Unlock an avatar item (e.g. from a reward or chest) without deducting XP
export const unlockAvatarItem = async (
  userId: string,
  itemId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    const ownedItems = userData.ownedAvatarItems || [];

    if (ownedItems.includes(itemId)) {
      return { success: true, message: 'Item already owned' };
    }

    await updateDoc(userRef, {
      ownedAvatarItems: arrayUnion(itemId),
      updatedAt: serverTimestamp(),
    });

    return { success: true, message: 'Avatar item unlocked!' };
  } catch (error) {
    console.error('Error unlocking avatar item:', error);
    return { success: false, message: 'Failed to unlock item' };
  }
};
