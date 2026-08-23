/* MathPulse AI FCM worker. The sender must use data-only FCM messages. */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');
importScripts('/firebase-config.js');

const config = {
  apiKey: self.FIREBASE_API_KEY,
  authDomain: self.FIREBASE_AUTH_DOMAIN,
  projectId: self.FIREBASE_PROJECT_ID,
  storageBucket: self.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID,
  appId: self.FIREBASE_APP_ID,
};
let messaging = null;
try {
  if (config.apiKey && config.projectId && !firebase.apps.length) firebase.initializeApp(config);
  if (firebase.apps.length) messaging = firebase.messaging();
} catch (error) { console.warn('[fcm-sw] Firebase unavailable', error); }

const seen = new Set();
const DEFAULT_ICON = '/mathpulse_logo.png';
const DEFAULT_BADGE = '/mathpulse_logo.png';
function safeInternalRoute(value) {
  if (!value || value.constructor !== String || !value.startsWith('/') || value.startsWith('//')) return null;
  if (/[\\\r\n]/.test(value) || /[a-z][a-z\d+.-]*:/i.test(value)) return null;
  try {
    const url = new URL(value, self.location.origin);
    return url.origin === self.location.origin ? `${url.pathname}${url.search}${url.hash}` : null;
  } catch (_) { return null; }
}
function payloadEventId(data) {
  return String(data.eventId || data.messageId || data.tag || `${data.title || ''}:${data.body || ''}`);
}

if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    // Data-only is intentional: handling notification payloads here would
    // duplicate the browser's automatic display.
    const data = payload.data || {};
    const eventId = payloadEventId(data);
    if (seen.has(eventId)) return;
    seen.add(eventId);
    if (seen.size > 500) seen.delete(seen.values().next().value);
    const route = safeInternalRoute(data.url) || '/';
    self.registration.showNotification(data.title || 'MathPulse AI', {
      body: data.body || '',
      icon: data.icon || DEFAULT_ICON,
      badge: data.badge || DEFAULT_BADGE,
      image: data.image || undefined,
      tag: data.tag || `mathpulse-${eventId}`,
      data: { route, eventId },
      renotify: false,
      requireInteraction: false,
    });
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const route = safeInternalRoute(data.route || data.url) || '/';
  const eventId = String(data.eventId || '');
  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      try {
        if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
          await client.focus();
          client.postMessage({ type: 'NOTIFICATION_CLICK', url: route, eventId });
          return;
        }
      } catch (_) { /* ignore an unavailable client */ }
    }
    if (clients.openWindow) await clients.openWindow(new URL(route, self.location.origin).href);
  })());
});
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
