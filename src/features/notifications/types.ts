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
  | 'quiz_assigned'
  | 'xp_earned'
  | 'system_alert'
  | 'risk_alert'
  | 'reminder'
  | 'message';

export type NotificationRecipientRole = 'student' | 'teacher' | 'admin';

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
  recipientRole?: NotificationRecipientRole;
}

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: NotificationMetadata;
  actionUrl?: string;
  recipientRole?: NotificationRecipientRole;
}

/**
 * Notification types carrying other users' data that must never render in a
 * student inbox (issue #156). Even if a misaddressed document lands in a
 * student's subcollection, the client filter drops it.
 */
export const TEACHER_ONLY_NOTIFICATION_TYPES: readonly NotificationType[] = ['risk_alert'];

/** Default recipient scope stamped on writes when the caller omits it. */
export function defaultRecipientRole(type: NotificationType): NotificationRecipientRole {
  return TEACHER_ONLY_NOTIFICATION_TYPES.includes(type) ? 'teacher' : 'student';
}

export function isTeacherOnlyNotification(type: NotificationType): boolean {
  return TEACHER_ONLY_NOTIFICATION_TYPES.includes(type);
}

/**
 * Fail-closed inbox filter: students never see teacher-only alerts.
 * Teachers/admins see everything in their own scoped inbox.
 */
export function filterNotificationsForRole(
  items: Notification[],
  role: NotificationRecipientRole | null | undefined,
): Notification[] {
  if (role === 'student') {
    return items.filter((item) => !isTeacherOnlyNotification(item.type));
  }
  return items;
}

/** Panel page size (issue #158): the list renders one page, "Show more" adds another. */
export const NOTIFICATION_PAGE_SIZE = 20;

/**
 * Recurring reminder types collapsed to their newest occurrence (issue #158).
 * One check-in reminder per day accumulates into dozens of identical rows
 * spanning months; the panel keeps the latest and drops the rest.
 */
export const COLLAPSED_RECURRING_TYPES: readonly NotificationType[] = ['daily_checkin', 'streak_reminder'];

/**
 * Single-source list collation (issue #158). Input is newest-first (the
 * subscription orders by createdAt desc), so the first occurrence wins:
 * exact duplicate ids are dropped and recurring reminders with an identical
 * title collapse to their newest row. Badge, header, and list all derive
 * from this collated array, so the counts cannot disagree.
 */
export function dedupeNotifications(items: Notification[]): Notification[] {
  const seenIds = new Set<string>();
  const seenRecurring = new Set<string>();
  const collated: Notification[] = [];
  for (const item of items) {
    if (seenIds.has(item.id)) continue;
    seenIds.add(item.id);
    if (COLLAPSED_RECURRING_TYPES.includes(item.type)) {
      const recurringKey = `${item.type}::${item.title}`;
      if (seenRecurring.has(recurringKey)) continue;
      seenRecurring.add(recurringKey);
    }
    collated.push(item);
  }
  return collated;
}

/** Single-source unread count: badge and panel header both read this (issue #158). */
export function selectUnreadCount(items: Notification[]): number {
  return items.filter((item) => !item.isRead).length;
}

/** Visible page slice of the collated list; never mutates the input. */
export function paginateNotifications(items: Notification[], visibleCount: number): Notification[] {
  return items.slice(0, Math.max(0, visibleCount));
}
