// src/hooks/useFeatureAccess.ts
// Feature gate hook — reads lockedFeatures from user doc and returns access booleans

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface FeatureAccess {
  leaderboard: boolean;
  cosmeticShop: boolean;
  bonusChallenges: boolean;
  optionalModules: boolean;
  lockedFeatures: string[];
  loading: boolean;
}

const DEFAULT_ACCESS: FeatureAccess = {
  leaderboard: true,
  cosmeticShop: true,
  bonusChallenges: true,
  optionalModules: true,
  lockedFeatures: [],
  loading: true,
};

export function useFeatureAccess(userId: string | null): FeatureAccess {
  const [access, setAccess] = useState<FeatureAccess>(DEFAULT_ACCESS);

  useEffect(() => {
    if (!userId) {
      setAccess(DEFAULT_ACCESS);
      return;
    }

    const userRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(
      userRef,
      (snap) => {
        if (!snap.exists()) {
          setAccess(DEFAULT_ACCESS);
          return;
        }

        const data = snap.data();
        const locked: string[] = data?.lockedFeatures || [];

        setAccess({
          leaderboard: !locked.includes('leaderboard'),
          cosmeticShop: !locked.includes('cosmetic_shop'),
          bonusChallenges: !locked.includes('bonus_challenges'),
          optionalModules: !locked.includes('optional_modules'),
          lockedFeatures: locked,
          loading: false,
        });
      },
      (err) => {
        console.error('[useFeatureAccess] snapshot error:', err);
        setAccess(DEFAULT_ACCESS);
      }
    );

    return unsubscribe;
  }, [userId]);

  return access;
}
