/**
 * MathPulse AI — App Service Worker
 * ---------------------------------
 * Owns the PWA app-shell caching strategy. This worker is intentionally
 * separate from `/firebase-messaging-sw.js` (the FCM push worker). Keeping the
 * two registrations independent means background push handling survives app
 * shell updates and vice versa.
 *
 * Cache policy:
 *  - Versioned precache of the app shell (index.html, manifest, offline page,
 *    icons) on install.
 *  - Network-first for navigations with an offline app-shell fallback.
 *  - Stale-while-revalidate for safe, same-origin static assets only.
 *  - NEVER caches API calls (`/api/*`, `/health`, Firebase auth helpers, etc.)
 *    or cross-origin requests, so private/authenticated data is never stored
 *    in the Cache Storage.
 *
 * The runtime version and hashed asset list are injected by the
 * `mathpulse-pwa-sw-config` Vite plugin into `/pwa-config.js`.
 */

importScripts('/pwa-config.js');

const DEFAULT_VERSION = '1.0.0';

// Same-origin static shell entries that are safe to precache. Do NOT add API
// or Firebase endpoints here.
const PRECACHE_URLS = [
  '/',
  // Build plugin injects hashed application assets into this marker.
  ...((self.__MATH_PULSE_PWA__ && self.__MATH_PULSE_PWA__.assets) || []),
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/mathpulse_final_logo.png',
  '/mathpulse_logo.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
];

// Anything matching these prefixes is treated as dynamic API/private traffic
// and is never cached, regardless of the request mode.
const API_PATH_PREFIXES = ['/api/', '/__/', '/health', '/docs', '/redoc', '/openapi.json'];

function isApiPath(pathname) {
  return API_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`),
  );
}

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isCacheableRequest(request) {
  if (request.method !== 'GET') return false;
  const url = new URL(request.url);
  if (!isSameOrigin(url)) return false;
  if (isApiPath(url.pathname)) return false;
  // Skip service-worker/config scripts so we never serve a stale copy of the
  // workers themselves.
  if (url.pathname === '/sw.js' || url.pathname === '/pwa-config.js') return false;
  return true;
}

function getCacheVersion() {
  try {
    const runtime = self.__MATH_PULSE_PWA__;
    if (runtime && typeof runtime.version === 'string' && runtime.version.trim()) {
      return runtime.version.trim();
    }
  } catch (_) {
    /* ignore malformed config */
  }
  return DEFAULT_VERSION;
}

const CACHE_NAME = `mathpulse-app-shell-${getCacheVersion()}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('mathpulse-app-shell-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch (_) {
    return;
  }

  // Let cross-origin requests (fonts, FCM SDK, etc.) go through the network
  // untouched. They are intentionally not cached by the app shell worker.
  if (!isSameOrigin(url)) return;

  // Never intercept API or private Firebase helper traffic.
  if (isApiPath(url.pathname)) return;

  // Service workers and their generated config are always network-first.
  if (url.pathname === '/sw.js' || url.pathname === '/pwa-config.js') return;

  if (request.mode === 'navigate') {
    // Network-first navigation with an offline app-shell fallback.
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          }
          return response;
        })
        .catch(() =>
          caches
            .match('/index.html')
            .then((cached) => cached || caches.match('/offline.html')),
        ),
    );
    return;
  }

  if (!isCacheableRequest(request)) return;

  // Stale-while-revalidate for safe, same-origin static assets.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || network;
    }),
  );
});
