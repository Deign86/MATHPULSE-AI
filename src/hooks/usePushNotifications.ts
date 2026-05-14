/**
 * @file usePushNotifications.ts
 *
 * Lifecycle hook that:
 *   1. Requests notification permission once auth is ready.
 *   2. Registers an FCM token tied to the current user.
 *   3. Bridges foreground FCM messages into the in-app notification feed
 *      (`src/features/notifications`) so the bell icon stays accurate even
 *      while the tab has focus (FCM does NOT auto-render foreground pushes).
 *   4. Listens for `NOTIFICATION_CLICK` postMessage events from the SW so
 *      clicked background pushes deep-link via the React Router instance.
 *
 * Mount once at the top of the authenticated tree — see
 * `src/components/PushNotificationsManager.tsx`.
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { notify } from '@/features/notifications';
import type { NotificationType } from '@/features/notifications';
import {
  requestPushPermissionAndRegister,
  onForegroundMessage,
  deregisterPushToken,
} from '@/services/pushNotificationService';

/**
 * FCM `notificationType` values (set by Cloud Functions in the data payload)
 * mapped to the in-app `NotificationType` union. Keeping the FCM keys stable
 * lets future native clients deep-link without renaming everything.
 */
const FCM_TO_INAPP: Record<string, NotificationType> = {
  achievement: 'achievement_unlocked',
  quiz_battle: 'system_alert',
  daily_reward: 'daily_checkin',
  assignment: 'new_assignment',
  grade_posted: 'quiz_result',
  streak_reminder: 'streak_reminder',
  leaderboard: 'system_alert',
  system: 'system_alert',
};

function mapType(fcmType: string | undefined): NotificationType {
  if (!fcmType) return 'system_alert';
  return FCM_TO_INAPP[fcmType] ?? 'system_alert';
}

interface UsePushNotificationsResult {
  /** Call from logout flow to mark this device's token inactive. */
  unregister: () => Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsResult {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const tokenRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    const uid = currentUser?.uid ?? null;
    userIdRef.current = uid;
    if (!uid) return;

    let unsubscribeForeground: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      const token = await requestPushPermissionAndRegister(uid);
      if (cancelled) return;
      tokenRef.current = token;

      if (!token) return;

      unsubscribeForeground = onForegroundMessage((payload) => {
        const notif = payload.notification ?? {};
        const data = (payload.data ?? {}) as Record<string, string>;
        const title = notif.title || data.title || 'MathPulse AI';
        const message = notif.body || data.body || '';
        const fcmType = data.notificationType;

        // Bridge into the existing in-app feed so the bell + panel stay in
        // sync. We tag `metadata.source = 'fcm_foreground'` so the catch-all
        // Cloud Function trigger can skip these and avoid an echo loop.
        void notify({
          userId: uid,
          type: mapType(fcmType),
          title,
          message,
          actionUrl: data.url,
          metadata: {
            ...data,
            source: 'fcm_foreground',
            fcmType: fcmType ?? null,
          },
        });
      });
    })();

    return () => {
      cancelled = true;
      unsubscribeForeground?.();
    };
  }, [currentUser?.uid]);

  // Listen for service-worker click events (background push tapped).
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; url?: string } | null | undefined;
      if (!data || data.type !== 'NOTIFICATION_CLICK') return;
      const url = data.url || '/';
      try {
        // Route via React Router so we don't reload the SPA.
        const target = url.startsWith('http') ? new URL(url).pathname : url;
        navigate(target);
      } catch {
        // Last resort — full navigation.
        window.location.href = url;
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, [navigate]);

  const unregister = async () => {
    const uid = userIdRef.current;
    const token = tokenRef.current;
    if (!uid || !token) return;
    await deregisterPushToken(uid, token);
    tokenRef.current = null;
  };

  return { unregister };
}
