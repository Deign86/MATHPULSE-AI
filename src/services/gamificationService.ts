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
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { LeaderboardEntry, XPActivity, Achievement, UserAchievements } from '../types/models';

// Update user streak
export const updateStreak = async (userId: string): Promise<number> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    const lastActivityDate = userData.lastActivityDate?.toDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let newStreak = userData.streak || 0;

    if (!lastActivityDate) {
      // First activity
      newStreak = 1;
    } else {
      const lastActivity = new Date(lastActivityDate);
      lastActivity.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Same day, keep streak
        newStreak = userData.streak || 1;
      } else if (diffDays === 1) {
        // Consecutive day, increase streak
        newStreak = (userData.streak || 0) + 1;
        // Award streak bonus XP
        const bonusXP = Math.min(newStreak * 5, 50); // Max 50 XP bonus
        await awardXP(userId, bonusXP, 'streak_bonus', `${newStreak} day streak bonus!`);
      } else {
        // Streak broken
        newStreak = 1;
      }
    }

    // Generate local date string YYYY-MM-DD
    const localNow = new Date();
    const todayDateStr = `${localNow.getFullYear()}-${String(localNow.getMonth() + 1).padStart(2, '0')}-${String(localNow.getDate()).padStart(2, '0')}`;

    await updateDoc(userRef, {
      streak: newStreak,
      streakHistory: arrayUnion(todayDateStr),
      lastActivityDate: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return newStreak;
  } catch (error) {
    console.error('Error updating streak:', error);
    return 0;
  }
};

// Award XP and handle level ups
export const awardXP = async (
  userId: string,
  xpAmount: number,
  type: string,
  description: string
): Promise<{ newLevel: number; leveledUp: boolean; xp: number }> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    const currentXP = (userData.currentXP || 0) + xpAmount;
    const totalXP = (userData.totalXP || 0) + xpAmount;
    const currentLevel = userData.level || 1;

    // Calculate XP required for next level (exponential growth)
    const xpForNextLevel = Math.floor(100 * Math.pow(1.5, currentLevel - 1));
    let newLevel = currentLevel;
    let remainingXP = currentXP;
    let leveledUp = false;

    // Check for level up(s)
    while (remainingXP >= xpForNextLevel) {
      remainingXP -= xpForNextLevel;
      newLevel++;
      leveledUp = true;
    }

    // Update user data
    await updateDoc(userRef, {
      currentXP: remainingXP,
      totalXP: totalXP,
      level: newLevel,
      updatedAt: serverTimestamp(),
    });

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

    return { newLevel, leveledUp, xp: xpAmount };
  } catch (error) {
    console.error('Error awarding XP:', error);
    throw error;
  }
};

// Get leaderboard (global student rankings)
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
      collection(db, 'users'),
      where('role', '==', 'student'),
      orderBy('totalXP', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(leaderboardQuery);
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

    // Define achievement conditions
    const achievementConditions = [
      {
        id: 'first_lesson',
        condition: (progressData.totalLessonsCompleted || 0) >= 1,
        title: 'First Steps',
        description: 'Complete your first lesson',
        icon: 'target',
        xpReward: 50,
      },
      {
        id: 'ten_lessons',
        condition: (progressData.totalLessonsCompleted || 0) >= 10,
        title: 'Dedicated Learner',
        description: 'Complete 10 lessons',
        icon: 'book-open',
        xpReward: 200,
      },
      {
        id: 'perfect_score',
        condition: progressData.quizAttempts?.some((q: { score: number }) => q.score === 100) || false,
        title: 'Perfect Score',
        description: 'Get 100% on a quiz',
        icon: 'star',
        xpReward: 150,
      },
      {
        id: 'week_streak',
        condition: (userData.streak || 0) >= 7,
        title: 'Week Warrior',
        description: 'Maintain a 7-day streak',
        icon: 'flame',
        xpReward: 300,
      },
      {
        id: 'level_five',
        condition: (userData.level || 0) >= 5,
        title: 'Rising Star',
        description: 'Reach level 5',
        icon: 'star',
        xpReward: 250,
      },
    ];

    // Check each condition
    for (const achievement of achievementConditions) {
      const alreadyUnlocked = unlockedAchievements.some((a: { id: string }) => a.id === achievement.id);
      
      if (!alreadyUnlocked && achievement.condition) {
        const newAchievement: Achievement = {
          id: achievement.id,
          title: achievement.title,
          description: achievement.description,
          icon: achievement.icon,
          xpReward: achievement.xpReward,
          condition: achievement.id,
          unlockedAt: new Date(),
        };

        newAchievements.push(newAchievement);

        // Award XP for achievement
        await awardXP(userId, achievement.xpReward, 'achievement_unlocked', `Unlocked: ${achievement.title}`);
      }
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
