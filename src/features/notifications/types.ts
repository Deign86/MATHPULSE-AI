/**
 * @file types.ts
 * Shared types for the notification feature.
 */

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
  | 'system_alert';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  metadata?: Record<string, unknown>;
  actionUrl?: string;
}

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  actionUrl?: string;
}
