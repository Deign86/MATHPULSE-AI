/**
 * @file useDailyCheckInReminder.ts
 * Internal hook. Fires a streak_reminder notification if the user has not checked in today.
 * Only used inside NotificationContext — never imported directly from outside the feature.
 */
import { useEffect, useRef } from 'react';
import { hasCheckedInToday } from './notificationFirestoreService';
import { notify } from './notificationService';
import type { NotificationType } from './types';

export function useDailyCheckInReminder(userId: string | null): void {
  const hasFired = useRef(false);

  useEffect(() => {
    if (!userId || hasFired.current) return;

    const checkAndNotify = async () => {
      try {
        const checked = await hasCheckedInToday(userId);
        if (!checked) {
          await notify({
            userId,
            type: 'streak_reminder' as NotificationType,
            title: "Don't forget your daily check-in! 🔥",
            message: 'Check in today to keep your streak alive and earn bonus XP.',
            actionUrl: '/dashboard',
          });
        }
      } catch (error) {
        console.error('[useDailyCheckInReminder] Error:', error);
      } finally {
        hasFired.current = true;
      }
    };

    checkAndNotify();
  }, [userId]);
}
