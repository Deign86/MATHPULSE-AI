/**
 * @file PushNotificationsManager.tsx
 *
 * Render-free component that activates the FCM lifecycle hook for the
 * current authenticated user. Mounted once near the top of the tree
 * (inside `BrowserRouter` + `AuthProvider`) so it survives tab changes
 * and role-based route switching.
 */
import React from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const PushNotificationsManager: React.FC = () => {
  usePushNotifications();
  return null;
};

export default PushNotificationsManager;
