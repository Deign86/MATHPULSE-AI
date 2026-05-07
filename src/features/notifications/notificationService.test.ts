import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createNotification } from './notificationFirestoreService';
import { notify } from './notificationService';
import type { NotificationPayload } from './types';

vi.mock('./notificationFirestoreService', () => ({
  createNotification: vi.fn(),
}));

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('notify', () => {
    it('calls createNotification with the payload', async () => {
      (createNotification as unknown as ReturnType<typeof vi.fn>).mockResolvedValue('notif-123');

      const payload: NotificationPayload = {
        userId: 'user-123',
        type: 'daily_checkin',
        title: 'Daily Check-In Complete!',
        message: 'You earned 20 XP!',
        metadata: { xpEarned: 20 },
        actionUrl: '/dashboard',
      };

      await notify(payload);

      expect(createNotification).toHaveBeenCalledWith(payload);
    });

    it('handles errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (createNotification as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Firestore error'));

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
      (createNotification as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Firestore error'));

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
