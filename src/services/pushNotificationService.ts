/**
 * @file pushNotificationService.ts
 *
 * Frontend Firebase Cloud Messaging (FCM) integration. Owns:
 *   - browser permission prompt
 *   - service worker registration (`/firebase-messaging-sw.js`)
 *   - token retrieval + persistence to `users/{uid}/fcmTokens/{token}`
 *   - foreground message subscription
 *   - logout-time token deregistration
 *
 * The token-storage schema is intentionally platform-agnostic so that a
 * future Capacitor / React Native FCM client can write tokens with
 * `platform: 'android' | 'ios'` to the same subcollection without any
 * Cloud Function changes — the sender query reads `where('active','==',true)`
 * across platforms and forwards via `admin.messaging().sendEachForMulticast`.
 */

import { getMessaging, getToken, onMessage, deleteToken, isSupported, type MessagePayload, type Messaging } from 'firebase/messaging';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import firebaseApp, { db } from '../lib/firebase';

export type FCMPlatform = 'web' | 'android' | 'ios';

export interface FCMTokenRecord {
  token: string;
  userId: string;
  platform: FCMPlatform;
  userAgent: string;
  // ServerTimestamp on write — Date | undefined when read
  createdAt?: unknown;
  updatedAt?: unknown;
  active: boolean;
}

const SW_URL = '/firebase-messaging-sw.js';

let cachedMessaging: Messaging | null = null;
let supportChecked = false;
let supported = false;

async function getMessagingIfSupported(): Promise<Messaging | null> {
  if (!supportChecked) {
    try {
      supported = await isSupported();
    } catch {
      supported = false;
    }
    supportChecked = true;
  }
  if (!supported) return null;
  if (!cachedMessaging) {
    cachedMessaging = getMessaging(firebaseApp);
  }
  return cachedMessaging;
}

/**
 * Register the FCM service worker if not already registered. Returns the
 * registration so it can be passed to `getToken()`.
 *
 * Re-using an existing registration avoids duplicate SWs when the user
 * navigates between routes.
 */
async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const existing = await navigator.serviceWorker.getRegistration(SW_URL);
    if (existing) return existing;
    return await navigator.serviceWorker.register(SW_URL, { scope: '/' });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[pushNotificationService] SW registration failed:', err);
    return null;
  }
}

/**
 * Prompt the user for notification permission, retrieve an FCM token,
 * and persist it to Firestore. Returns null when push is unsupported,
 * permission was denied, or the VAPID key is misconfigured.
 *
 * Idempotent: calling multiple times reuses the existing SW registration
 * and rewrites the token doc with `updatedAt` refreshed (handy for
 * tracking active devices).
 */
export async function requestPushPermissionAndRegister(userId: string): Promise<string | null> {
  if (!userId) return null;
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return null;
  }

  const messaging = await getMessagingIfSupported();
  if (!messaging) {
    // eslint-disable-next-line no-console
    console.warn('[pushNotificationService] FCM not supported in this browser.');
    return null;
  }

  let permission: NotificationPermission;
  try {
    permission = Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[pushNotificationService] permission prompt failed:', err);
    return null;
  }

  if (permission !== 'granted') return null;

  const vapidKey = (import.meta.env.VITE_FIREBASE_VAPID_KEY || '').trim();
  if (!vapidKey) {
    // eslint-disable-next-line no-console
    console.warn('[pushNotificationService] VITE_FIREBASE_VAPID_KEY missing — cannot fetch FCM token.');
    return null;
  }

  const swRegistration = await ensureServiceWorker();
  if (!swRegistration) return null;

  let token: string | null = null;
  try {
    token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: swRegistration });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[pushNotificationService] getToken failed:', err);
    return null;
  }

  if (!token) return null;

  try {
    const tokenRef = doc(db, 'users', userId, 'fcmTokens', token);
    const record: FCMTokenRecord = {
      token,
      userId,
      platform: 'web',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      active: true,
    };
    await setDoc(tokenRef, record, { merge: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[pushNotificationService] persisting token failed:', err);
    // Token is still usable — return it so the caller can subscribe to onMessage.
  }

  return token;
}

/**
 * Subscribe to FCM foreground messages. Returns an unsubscribe function.
 *
 * The browser does NOT auto-display foreground messages — the caller is
 * responsible for surfacing them (we route into the in-app notification
 * system via the usePushNotifications hook).
 */
export function onForegroundMessage(
  callback: (payload: MessagePayload) => void,
): () => void {
  let unsub: (() => void) | undefined;
  let cancelled = false;

  void getMessagingIfSupported().then((messaging) => {
    if (cancelled || !messaging) return;
    unsub = onMessage(messaging, callback);
  });

  return () => {
    cancelled = true;
    unsub?.();
  };
}

/**
 * Mark a token as inactive in Firestore and delete it from FCM. Called on
 * logout so the device stops receiving pushes for the previous user.
 */
export async function deregisterPushToken(userId: string, token: string): Promise<void> {
  if (!userId || !token) return;

  try {
    const tokenRef = doc(db, 'users', userId, 'fcmTokens', token);
    await updateDoc(tokenRef, { active: false, updatedAt: serverTimestamp() });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[pushNotificationService] marking token inactive failed:', err);
  }

  try {
    const messaging = await getMessagingIfSupported();
    if (messaging) {
      await deleteToken(messaging);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[pushNotificationService] deleteToken failed:', err);
  }
}
