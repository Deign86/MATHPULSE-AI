/**
 * @file types.ts
 * Shared types for the notification feature.
 */
import type { DocumentData } from 'firebase/firestore';

/** Opaque Firestore passthrough bag for notification-specific fields. */
export type NotificationMetadata = DocumentData;

export type NotificationType =
  | 'achievement_unlocked'
  | 'level_up'
  | 'quiz_result'
  | 'daily_checkin'
  | 'streak_milestone'
  | 'streak_reminder'
  | 'teacher_announcement'
  | 'new_assignment'
  | 'xp_earned'
  | 'system_alert'
  | 'risk_alert'
  | 'reminder'
  | 'message';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  metadata?: NotificationMetadata;
  actionUrl?: string;
}

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: NotificationMetadata;
  actionUrl?: string;
}
