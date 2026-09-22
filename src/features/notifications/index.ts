/**
 * @file index.ts
 * Public barrel. ONLY import from here outside of src/features/notifications/.
 */
export { NotificationProvider, useNotifications } from './NotificationContext';
export { NotificationBell } from './NotificationBell';
export { notify } from './notificationService';
export {
  TEACHER_ONLY_NOTIFICATION_TYPES,
  defaultRecipientRole,
  isTeacherOnlyNotification,
  filterNotificationsForRole,
} from './types';
export type {
  Notification,
  NotificationPayload,
  NotificationType,
  NotificationRecipientRole,
} from './types';
