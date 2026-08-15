import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  deactivateCurrentPushToken,
  deactivateCurrentSessionToken,
  getPushCapability,
  onForegroundMessage,
  pushStatus,
  requestPushPermissionAndRegister,
  safeInternalRoute,
  type PushStatus,
} from '@/services/pushNotificationService';

const seenEvents = new Set<string>();
const typeNames: Record<string, string> = {
  achievement: 'achievement', quiz_battle: 'quiz battle', daily_reward: 'daily reward',
  assignment: 'assignment', grade_posted: 'grade update', streak_reminder: 'streak reminder',
  leaderboard: 'leaderboard', system: 'system announcement',
};

function eventKey(payload: { messageId?: string; data?: Record<string, string> }): string {
  return payload.data?.eventId || payload.messageId || payload.data?.tag ||
    `${payload.data?.title || ''}:${payload.data?.body || ''}`;
}

export interface UsePushNotificationsResult {
  status: PushStatus;
  enable: () => Promise<boolean>;
  disable: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsResult {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const tokenRef = useRef<string | null>(null);
  const uidRef = useRef<string | null>(null);
  const [status, setStatus] = useState<PushStatus>(() => {
    const capability = getPushCapability();
    return pushStatus(typeof Notification === 'undefined' ? undefined : Notification.permission, capability.supported, false);
  });

  const refresh = useCallback(async () => {
    const uid = currentUser?.uid;
    if (!uid) return;
    uidRef.current = uid;
    const capability = getPushCapability();
    if (!capability.supported) { setStatus('unsupported'); return; }
    const permission = Notification.permission;
    if (permission === 'denied') { setStatus('denied'); return; }
    if (permission !== 'granted') { setStatus('default'); return; }
    setStatus('registering');
    try {
      const token = await requestPushPermissionAndRegister(uid, 'refresh');
      tokenRef.current = token;
      setStatus(token ? 'enabled' : 'error');
    } catch {
      setStatus('error');
    }
  }, [currentUser?.uid]);

  const enable = useCallback(async () => {
    const uid = currentUser?.uid;
    if (!uid) return false;
    setStatus('registering');
    try {
      const token = await requestPushPermissionAndRegister(uid, 'prompt');
      tokenRef.current = token;
      setStatus(token ? 'enabled' : Notification.permission === 'denied' ? 'denied' : 'error');
      return Boolean(token);
    } catch {
      setStatus('error');
      return false;
    }
  }, [currentUser?.uid]);

  const disable = useCallback(async () => {
    const uid = uidRef.current || currentUser?.uid;
    if (uid) await deactivateCurrentPushToken(uid, tokenRef.current);
    tokenRef.current = null;
    setStatus(Notification.permission === 'denied' ? 'denied' : 'granted');
  }, [currentUser?.uid]);

  // Existing grants are refreshed silently. Default permission is never prompted here.
  useEffect(() => {
    const nextUid = currentUser?.uid ?? null;
    const previousUid = uidRef.current;
    const previousToken = tokenRef.current;
    // Account changes and logout are the only automatic cleanup paths. This is
    // deliberately not an effect cleanup, so StrictMode/remounts do not
    // deregister a still-valid device token.
    if (previousUid && previousUid !== nextUid) {
      // Account switch/logout cleanup is intentional. There is no cleanup
      // return from this effect: ordinary remounts must not revoke a device.
      void deactivateCurrentSessionToken(previousUid);
      if (previousToken) void deactivateCurrentPushToken(previousUid, previousToken);
    }
    tokenRef.current = null;
    uidRef.current = nextUid;
    if (nextUid) void refresh();
  }, [currentUser?.uid, refresh]);

  useEffect(() => {
    if (!currentUser?.uid || status !== 'enabled') return;
    return onForegroundMessage((payload) => {
      const data = (payload.data || {}) as Record<string, string>;
      const key = eventKey(payload);
      if (seenEvents.has(key)) return;
      seenEvents.add(key);
      if (seenEvents.size > 500) seenEvents.delete(seenEvents.values().next().value as string);
      const title = payload.notification?.title || data.title || 'MathPulse AI';
      const body = payload.notification?.body || data.body || '';
      const category = data.notificationType;
      // Foreground FCM is shown in this one in-app surface only; it is not written to Firestore.
      toast(title, { description: body, id: key, action: safeInternalRoute(data.url) ? {
        label: 'Open', onClick: () => navigate(safeInternalRoute(data.url) || '/'),
      } : undefined, });
      void typeNames[category || ''];
    });
  }, [currentUser?.uid, navigate, status]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; url?: unknown; eventId?: string } | null;
      if (!data || data.type !== 'NOTIFICATION_CLICK') return;
      const key = data.eventId || String(data.url || '/');
      if (seenEvents.has(key)) return;
      seenEvents.add(key);
      const route = safeInternalRoute(data.url) || '/';
      navigate(route);
    };
    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, [navigate]);

  return { status, enable, disable, refresh };
}
