/**
 * useNotifications.ts
 *
 * Custom hook wrapping real-time notification subscription and
 * all read/delete operations. Subscribes to Firestore on mount
 * (when uid is available) and unsubscribes on unmount.
 *
 * Mutations optimistically update local state for instant UI
 * feedback while the service call completes in the background.
 *
 * Returns:
 * ```ts
 * {
 *   items: Notification[],
 *   unreadCount: number,
 *   markRead: (id: string) => Promise<void>,
 *   markAllRead: () => Promise<void>,
 *   remove: (id: string) => Promise<void>,
 *   isLoading: boolean,
 *   error: string | null,
 * }
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import {
  subscribeToUserNotifications,
  markNotificationRead,
  markAllRead as markAllReadService,
  deleteNotification,
} from '../services/notificationService';
import type { Notification } from '../types/models';

interface UseNotificationsReturn {
  items: Notification[];
  unreadCount: number;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useNotifications(): UseNotificationsReturn {
  const uid = useAuthStore((s) => s.user?.uid);

  const [items, setItems] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Real-time subscription ──────────────────────────────────────

  useEffect(() => {
    if (!uid) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const unsubscribe = subscribeToUserNotifications(
      uid,
      (notifications) => {
        setItems(notifications);
        setIsLoading(false);
      },
      (err) => {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setIsLoading(false);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [uid]);

  // ── Actions ─────────────────────────────────────────────────────

  const markRead = useCallback(
    async (id: string) => {
      if (!uid) return;

      // Optimistic update
      setItems((prev) =>
        prev.map((n) => (n.id === id && !n.read ? { ...n, read: true } : n)),
      );

      try {
        await markNotificationRead(uid, id);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        // Revert on failure — re-fetch will correct state
      }
    },
    [uid],
  );

  const markAllRead = useCallback(async () => {
    if (!uid) return;

    // Optimistic update
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));

    try {
      await markAllReadService(uid);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
  }, [uid]);

  const remove = useCallback(
    async (id: string) => {
      if (!uid) return;

      // Optimistic removal
      setItems((prev) => prev.filter((n) => n.id !== id));

      try {
        await deleteNotification(uid, id);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      }
    },
    [uid],
  );

  const unreadCount = items.filter((n) => !n.read).length;

  return {
    items,
    unreadCount,
    markRead,
    markAllRead,
    remove,
    isLoading,
    error,
  };
}
