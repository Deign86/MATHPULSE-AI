/**
 * @file NotificationContext.tsx
 * Notification Provider and hook.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { Notification } from './types';
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
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const userId = currentUser?.uid ?? null;

  // Fire daily check-in reminder (only inside provider, as required)
  useDailyCheckInReminder(userId);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setIsLoading(false);
      return () => undefined;
    }

    setIsLoading(true);
    const unsubscribe = subscribeToNotifications(userId, (newNotifications) => {
      setNotifications(newNotifications);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
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
    if (!userId) return;
    await firestoreMarkAllAsRead(userId);
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
