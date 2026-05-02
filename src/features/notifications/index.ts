/**
 * @file index.ts
 * Public barrel. ONLY import from here outside of src/features/notifications/.
 */
export { NotificationProvider, useNotifications } from './NotificationContext';
export { NotificationBell } from './NotificationBell';
export { notify } from './notificationService';
export type { Notification, NotificationPayload, NotificationType } from './types';
