/** Browser FCM integration. Permission is requested only by an explicit user action. */
import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type MessagePayload,
  type Messaging,
} from 'firebase/messaging';
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where, serverTimestamp, type DocumentData } from 'firebase/firestore';
import firebaseApp, { db } from '../lib/firebase';
import { z } from 'zod';

export type FCMPlatform = 'web';
export type PushStatus = 'unsupported' | 'default' | 'granted' | 'registering' | 'enabled' | 'denied' | 'error';
export type PushPermissionAction = 'prompt' | 'refresh';

export interface PushCapability {
  supported: boolean;
  reason?: 'secure-context' | 'notification' | 'service-worker' | 'firebase' | 'vapid' | 'unknown';
}

export interface FCMTokenRecord {
  token: string;
  userId: string;
  platform: FCMPlatform;
  browser: string;
  userAgent: string;
  active: boolean;
  activeSession: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  lastSeenAt?: unknown;
}

export const FCM_SW_URL = '/firebase-messaging-sw.js';
export const FCM_SW_SCOPE = '/firebase-messaging/';
const SESSION_KEY = 'mathpulse-fcm-session';
let cachedMessaging: Messaging | null = null;
let supportPromise: Promise<boolean> | null = null;
let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;
let sessionId: string | null = null;
let currentToken: { userId: string; token: string } | null = null;

/** Accept only app-relative routes. Exported for SW-contract and hook tests. */
export function safeInternalRoute<V>(value: V): string | null {
  const parsedRoute = z.string().safeParse(value);
  if (!parsedRoute.success || !parsedRoute.data.startsWith('/') || parsedRoute.data.startsWith('//')) return null;
  const route = parsedRoute.data;
  if (/[\\\r\n]/.test(route) || /[a-z][a-z\d+.-]*:/i.test(route)) return null;
  try {
    const parsed = new URL(route, 'https://mathpulse.invalid');
    if (parsed.origin !== 'https://mathpulse.invalid') return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function pushStatus(permission: NotificationPermission | undefined, capable: boolean, enabled: boolean): PushStatus {
  if (!capable) return 'unsupported';
  if (permission === 'denied') return 'denied';
  if (permission === 'granted') return enabled ? 'enabled' : 'granted';
  return 'default';
}

export function sha256Hex(value: string): Promise<string> {
  if (!('crypto' in globalThis) || !crypto.subtle) return Promise.reject(new Error('Web Crypto is unavailable'));
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)).then((buffer) =>
    Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join(''),
  );
}

export function getSessionId(): string {
  if (sessionId) return sessionId;
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return (sessionId = existing);
    const generated = crypto.randomUUID instanceof Function ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    sessionStorage.setItem(SESSION_KEY, generated);
    return (sessionId = generated);
  } catch {
    return (sessionId = `memory-${Date.now()}-${Math.random()}`);
  }
}

export function getPushCapability(): PushCapability {
  if (!('window' in globalThis)) return { supported: false, reason: 'unknown' };
  if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return { supported: false, reason: 'secure-context' };
  }
  if (!('Notification' in globalThis)) return { supported: false, reason: 'notification' };
  if (!('serviceWorker' in navigator)) return { supported: false, reason: 'service-worker' };
  if (!import.meta.env.VITE_FIREBASE_VAPID_KEY) return { supported: false, reason: 'vapid' };
  return { supported: true };
}

export async function isPushSupported(): Promise<boolean> {
  const capability = getPushCapability();
  if (!capability.supported) return false;
  supportPromise ??= isSupported().catch(() => false);
  return supportPromise;
}

async function getMessagingIfSupported(): Promise<Messaging | null> {
  if (!(await isPushSupported())) return null;
  try {
    cachedMessaging ??= getMessaging(firebaseApp);
    return cachedMessaging;
  } catch {
    return null;
  }
}

/** Reuses one narrow-scope registration and never registers on ordinary mount. */
export function ensureFirebaseMessagingServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (registrationPromise) return registrationPromise;
  registrationPromise = (async () => {
    if (!('navigator' in globalThis) || !('serviceWorker' in navigator)) return null;
    try {
      return await navigator.serviceWorker.getRegistration(FCM_SW_SCOPE) ||
        await navigator.serviceWorker.register(FCM_SW_URL, { scope: FCM_SW_SCOPE });
    } catch (error) {
      console.warn('[push] service worker registration failed', error);
      return null;
    }
  })();
  return registrationPromise;
}

function browserName(): string {
  const ua = 'navigator' in globalThis ? navigator.userAgent : '';
  if (/Edg\//.test(ua)) return 'Edge';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'unknown';
}

async function persistToken(userId: string, token: string): Promise<void> {
  const id = await sha256Hex(token);
  const tokenRef = doc(db, 'users', userId, 'fcmTokens', id);
  const previous = await getDoc(tokenRef).catch(() => null);
  const record: DocumentData = {
    token, userId, platform: 'web', browser: browserName(),
    userAgent: 'navigator' in globalThis ? navigator.userAgent : '',
    active: true, activeSession: getSessionId(), updatedAt: serverTimestamp(), lastSeenAt: serverTimestamp(),
  };
  if (!previous?.exists()) record.createdAt = serverTimestamp();
  // FCM can rotate a token while the browser session stays the same. Retire
  // only the previous token belonging to this session; records for every
  // other browser/device remain active.
  if (currentToken && currentToken.userId === userId && currentToken.token !== token) {
    await deactivate(userId, currentToken.token);
  }
  currentToken = { userId, token };
  await setDoc(tokenRef, record, { merge: true });
}

/** Register/refresh without asking. `prompt` is exclusively for the Enable button. */
export async function requestPushPermissionAndRegister(userId: string, action: PushPermissionAction = 'prompt'): Promise<string | null> {
  if (!userId || !getPushCapability().supported || !(await isPushSupported())) return null;
  const permission = Notification.permission;
  if (permission === 'denied') return null;
  if (permission !== 'granted') {
    if (action !== 'prompt') return null;
    const result = await Notification.requestPermission();
    if (result !== 'granted') return null;
  }
  const messaging = await getMessagingIfSupported();
  const registration = await ensureFirebaseMessagingServiceWorker();
  const vapidKey = String(import.meta.env.VITE_FIREBASE_VAPID_KEY || '').trim();
  if (!messaging || !registration || !vapidKey) return null;
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
  if (!token) return null;
  await persistToken(userId, token);
  return token;
}

export function onForegroundMessage(callback: (payload: MessagePayload) => void): () => void {
  let unsubscribe: (() => void) | undefined;
  let cancelled = false;
  void getMessagingIfSupported().then((messaging) => {
    if (!cancelled && messaging) unsubscribe = onMessage(messaging, callback);
  });
  return () => { cancelled = true; unsubscribe?.(); };
}

async function deactivate(userId: string, token: string): Promise<void> {
  const id = await sha256Hex(token);
  await updateDoc(doc(db, 'users', userId, 'fcmTokens', id), {
    active: false, updatedAt: serverTimestamp(), lastSeenAt: serverTimestamp(),
  }).catch(() => setDoc(doc(db, 'users', userId, 'fcmTokens', id), { token, userId, active: false, updatedAt: serverTimestamp() }, { merge: true }));
}

/** Deactivates only this browser session's token; other devices are untouched. */
export async function deregisterPushToken(userId: string, token: string): Promise<void> {
  if (!userId || !token) return;
  await deactivate(userId, token);
  if (currentToken?.userId === userId && currentToken.token === token) currentToken = null;
  try { const messaging = await getMessagingIfSupported(); if (messaging) await deleteToken(messaging); } catch { /* best effort */ }
}

export async function deactivateCurrentPushToken(userId: string, token: string | null): Promise<void> {
  if (token) await deactivate(userId, token);
}

export async function deactivateCurrentSessionToken(userId: string): Promise<void> {
  if (!userId) return;
  const session = getSessionId();
  try {
    const snapshot = await getDocs(query(
      collection(db, 'users', userId, 'fcmTokens'),
      where('activeSession', '==', session),
      where('active', '==', true),
    ));
    await Promise.all(snapshot.docs.map((tokenDoc) => updateDoc(tokenDoc.ref, {
      active: false,
      updatedAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
    })));
  } catch (error) {
    console.warn('[push] session token cleanup failed', error);
  }
  if (currentToken?.userId === userId) currentToken = null;
}

export function resetPushServiceForTests(): void {
  cachedMessaging = null; supportPromise = null; registrationPromise = null; sessionId = null; currentToken = null;
}
