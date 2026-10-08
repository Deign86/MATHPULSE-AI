/**
 * @file NotificationContext.tsx
 * Notification Provider and hook.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Notification } from './types';
import { dedupeNotifications, filterNotificationsForRole, selectUnreadCount } from './types';
import {
  subscribeToNotifications,
  markAsRead as firestoreMarkAsRead,
  markAllAsRead as firestoreMarkAllAsRead,
  deleteNotification as firestoreDeleteNotification,
} from './notificationFirestoreService';
import { useDailyCheckInReminder } from './useDailyCheckInReminder';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { currentUser, userProfile, userRole } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const userId = currentUser?.uid ?? null;

  // Ref to always access current notifications state — avoids stale closure in revert
  const notificationsRef = useRef<Notification[]>([]);
  const markAllAsReadInFlightRef = useRef(false);
  // Ids being marked read by an in-flight Mark all read. Snapshots that arrive before the write
  // is acknowledged (a reconnect re-sending the server copy) must not flip them back to unread.
  const pendingReadIdsRef = useRef<ReadonlySet<string>>(new Set());

  // Fire daily check-in reminder (students only)
  useDailyCheckInReminder(userProfile?.role === 'student' ? userId : null);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setIsLoading(false);
      return () => undefined;
    }

    setIsLoading(true);
    // Role falls back to the auth role while the profile is still loading
    // (or missing) so students never lose their inbox mid-load.
    const role = userProfile?.role ?? userRole;
    const unsubscribe = subscribeToNotifications(userId, (newNotifications) => {
      const pendingReadIds = pendingReadIdsRef.current;
      const visible = dedupeNotifications(filterNotificationsForRole(newNotifications, role));
      setNotifications(pendingReadIds.size === 0
        ? visible
        : visible.map((notification) => (pendingReadIds.has(notification.id) ? { ...notification, isRead: true } : notification)));
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userId, userProfile?.role, userRole]);

  // Keep ref in sync with current notifications state
  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  const unreadCount = useMemo(
    () => selectUnreadCount(notifications),
    [notifications]
  );

  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!userId) return;
      await firestoreMarkAsRead(userId, notificationId);
    },
    [userId]
  );

  const markAllAsRead = useCallback(async () => {
    if (!userId || markAllAsReadInFlightRef.current) return;
    markAllAsReadInFlightRef.current = true;
    const prev = notificationsRef.current;
    pendingReadIdsRef.current = new Set(prev.filter((notification) => !notification.isRead).map((notification) => notification.id));
    setNotifications((curr) => curr.map((n) => (n.isRead ? n : { ...n, isRead: true })));
    try {
      await firestoreMarkAllAsRead(userId);
      pendingReadIdsRef.current = new Set();
    } catch (err) {
      pendingReadIdsRef.current = new Set();
      console.error('[markAllAsRead] Firestore update failed:', err);
      const previousById = new Map(prev.map((notification) => [notification.id, notification]));
      setNotifications((curr) => curr.map((notification) => {
        const previous = previousById.get(notification.id);
        if (!previous || previous.isRead === notification.isRead) return notification;
        return { ...notification, isRead: previous.isRead };
      }));
    } finally {
      markAllAsReadInFlightRef.current = false;
    }
  }, [userId]);

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      if (!userId) return;
      await firestoreDeleteNotification(userId, notificationId);
    },
    [userId]
  );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      isLoading,
      markAsRead,
      markAllAsRead,
      deleteNotification,
    }),
    [notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteNotification]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
