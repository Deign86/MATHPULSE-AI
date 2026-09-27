/**
 * The single authenticated-tree owner of browser push lifecycle. Keeping this
 * above role-specific branches prevents dashboard navigation/remounts from
 * unregistering a valid device token.
 */
import React, { createContext, useContext } from 'react';
import { usePushNotifications, type UsePushNotificationsResult } from '@/hooks/usePushNotifications';

export const PushNotificationsContext = createContext<UsePushNotificationsResult | null>(null);

export function usePushNotificationControls(): UsePushNotificationsResult {
  const controls = useContext(PushNotificationsContext);
  if (controls) return controls;
  return {
    status: 'unsupported',
    enable: async () => false,
    disable: async () => {},
    refresh: async () => {},
  };
}

const PushNotificationsManager: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const controls = usePushNotifications();
  return (
    <PushNotificationsContext.Provider value={controls}>
      {children}
    </PushNotificationsContext.Provider>
  );
};

export default PushNotificationsManager;
