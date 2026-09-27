import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as notificationFirestoreNs from './notificationFirestoreService';
import { notify } from './notificationService';
import type { NotificationPayload } from './types';

// Firestore seam: spy on the real createNotification so notify()'s wiring is exercised.
vi.spyOn(notificationFirestoreNs, 'createNotification');

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('notify', () => {
    it('calls createNotification with the payload', async () => {
      const createNotificationSpy = vi.mocked(notificationFirestoreNs.createNotification);
      createNotificationSpy.mockResolvedValue('notif-123');

      const payload: NotificationPayload = {
        userId: 'user-123',
        type: 'daily_checkin',
        title: 'Daily Check-In Complete!',
        message: 'You earned 20 XP!',
        metadata: { xpEarned: 20 },
        actionUrl: '/dashboard',
      };

      await notify(payload);

      expect(createNotificationSpy).toHaveBeenCalledWith(payload);
    });

    it('handles errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(notificationFirestoreNs.createNotification).mockRejectedValue(new Error('Firestore error'));

      const payload: NotificationPayload = {
        userId: 'user-123',
        type: 'streak_reminder',
        title: 'Streak Reminder',
        message: 'Check in today!',
      };

      await notify(payload);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[NotificationService] Failed to create notification:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('does not throw on error', async () => {
      vi.mocked(notificationFirestoreNs.createNotification).mockRejectedValue(new Error('Firestore error'));

      const payload: NotificationPayload = {
        userId: 'user-123',
        type: 'xp_earned',
        title: 'XP Earned',
        message: 'You got 50 XP!',
      };

      await expect(notify(payload)).resolves.not.toThrow();
    });
  });
});
