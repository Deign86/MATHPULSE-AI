/**
 * MathPulse AI — Firebase Cloud Messaging Service Worker
 * --------------------------------------------------------
 * Handles BACKGROUND push messages (when the page is closed or tab is
 * not focused). Foreground messages are handled in
 * src/services/pushNotificationService.ts via onMessage().
 *
 * The compat SDKs are imported here because service workers cannot use
 * ES modules in all browsers consistently (and Firebase's modular SDK
 * does not yet ship a SW build).
 *
 * Firebase config is loaded from /firebase-config.js, which is generated
 * at dev/build time by the `mathpulse-fcm-config` plugin in vite.config.ts
 * from VITE_FIREBASE_* env vars. This keeps secrets out of the SW source
 * file while still working offline once cached by the browser.
 *
 * Mobile parity contract:
 *   The `data` payload shape — `{ url, tag, notificationType }` —
 *   MUST stay stable so future Capacitor / React Native FCM handlers
 *   can route deep links identically.
 */

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// /firebase-config.js is emitted by the Vite plugin at startup/build.
// It sets self.FIREBASE_API_KEY etc. from VITE_FIREBASE_* env values.
try {
  importScripts('/firebase-config.js');
} catch (err) {
  // Service worker may load before /firebase-config.js exists (cold cache).
  // We still attempt initialization below; if it fails, push is disabled
  // until the config asset is cached.
  // eslint-disable-next-line no-console
  console.warn('[fcm-sw] /firebase-config.js not yet available:', err);
}

const firebaseConfig = {
  apiKey: self.FIREBASE_API_KEY,
  authDomain: self.FIREBASE_AUTH_DOMAIN,
  projectId: self.FIREBASE_PROJECT_ID,
  storageBucket: self.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID,
  appId: self.FIREBASE_APP_ID,
};

let messaging = null;
try {
  if (firebaseConfig.apiKey && firebaseConfig.projectId) {
    firebase.initializeApp(firebaseConfig);
    messaging = firebase.messaging();
  } else {
    // eslint-disable-next-line no-console
    console.warn('[fcm-sw] Firebase config missing — push disabled until config loads.');
  }
} catch (err) {
  // eslint-disable-next-line no-console
  console.error('[fcm-sw] Firebase init failed:', err);
}

const DEFAULT_ICON = '/mathpulse_logo.png';
const DEFAULT_BADGE = '/mathpulse_logo.png';

if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    const notif = payload.notification || {};
    const data = payload.data || {};
    const title = notif.title || 'MathPulse AI';
    const body = notif.body || '';
    const tag = data.tag || 'mathpulse-default';

    self.registration.showNotification(title, {
      body,
      icon: notif.icon || DEFAULT_ICON,
      badge: DEFAULT_BADGE,
      data,
      tag,
      renotify: true,
      requireInteraction: false,
    });
  });
}

// Notification click → focus existing tab or open new window.
// The `data.url` field carries the in-app deep link.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil((async () => {
    const allClients = await clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });

    for (const client of allClients) {
      try {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', url });
          return client.focus();
        }
      } catch (_) { /* ignore */ }
    }

    if (clients.openWindow) {
      return clients.openWindow(url);
    }
    return null;
  })());
});

// Skip waiting on install so updates take effect on the next reload.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
