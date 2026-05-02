/**
 * @file notificationService.ts
 * Public API. The ONLY file external code may import from this feature.
 */
import { createNotification } from './notificationFirestoreService';
import type { NotificationPayload } from './types';

export async function notify(payload: NotificationPayload): Promise<void> {
  try {
    await createNotification(payload);
  } catch (err) {
    console.error('[NotificationService] Failed to create notification:', err);
  }
}
