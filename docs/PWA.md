# MathPulse AI — Progressive Web App (PWA)

MathPulse AI ships as an installable PWA. This document describes the offline
app shell, service worker cache policy, install flow, and how the PWA worker
coexists with Firebase Cloud Messaging (FCM).

## 1. What is cached (and what is never cached)

The app-shell service worker (`public/sw.js`) follows a conservative policy:

### Precached on install

- `/` and `/index.html`
- `/offline.html`
- `/manifest.webmanifest`
- `/mathpulse_final_logo.png`, `/mathpulse_logo.png`
- `/icons/icon-*.png`, `/icons/apple-touch-icon.png`

The precache is **versioned** via `self.__MATH_PULSE_PWA__.version`, which is
injected into `/pwa-config.js` by the `mathpulse-pwa-sw-config` Vite plugin.
The version is read from `VITE_APP_VERSION` (default `1.0.0`).

### Network-first navigations

HTML navigation requests are fetched from the network first. When the network
is unavailable, the worker falls back to the cached `/index.html` and, as a
last resort, `/offline.html`.

### Stale-while-revalidate static assets

Same-origin, non-API static assets (hashed `/assets/*` bundles, icons, etc.)
are served from cache while a fresh copy is fetched in the background.

### Never cached

- `/api/*` and all backend API traffic
- `/health`, `/docs`, `/redoc`, `/openapi.json`
- `/__/*` Firebase Auth helpers
- Cross-origin requests (Google Fonts, Firebase SDK, FCM SDK)
- `/sw.js` and `/pwa-config.js` (always network-fresh)

Authenticated/private data is therefore never written to Cache Storage by this
worker.

## 2. Service workers: app shell vs. FCM

There are **two independent service worker registrations**:

| Worker | Path | Owner | Purpose |
|---|---|---|---|
| App shell | `/sw.js` | `src/main.tsx` | PWA precache, offline fallback, static caching |
| FCM push | `/firebase-messaging-sw.js` scoped to `/firebase-messaging/` | `src/services/pushNotificationService.ts` | Background push messages |

They must not be merged or overwritten. The app-shell worker never imports
Firebase SDKs, and the FCM worker never touches app-shell caching. The FCM
registration uses the narrow `/firebase-messaging/` scope and is passed
explicitly to Firebase `getToken()`, avoiding scope conflicts with the root app
worker.

## 3. Install flow

### Chromium / Android / desktop

The `beforeinstallprompt` event is captured by `usePwaInstall`, which exposes a
deferred prompt. `InstallPwaButton` (mounted in the authenticated app header)
shows an install action and calls `promptInstall()` on click. The
`appinstalled` event hides the button after installation.

### iOS Safari

iOS does not fire `beforeinstallprompt`. `usePwaInstall` detects iOS and
`InstallPwaButton` shows manual guidance: **Share → Add to Home Screen → Add**.

### Already installed / standalone

The button renders nothing when the app is running in `standalone` /
`fullscreen` display mode or after an `appinstalled` event.

## 4. Registration

`src/main.tsx` registers `/sw.js` after the window `load` event in production
builds. To exercise the offline/install flow in local development, set:

```env
VITE_ENABLE_SW_IN_DEV=true
```

The FCM worker remains registered separately by `pushNotificationService.ts`.

## 5. Configuration

| Variable | Default | Purpose |
|---|---|---|
| `VITE_APP_VERSION` | `1.0.0` | App-shell cache version (bump to invalidate the precache) |
| `VITE_ENABLE_SW_IN_DEV` | `false` | Register `/sw.js` in local dev builds |
| `VITE_API_URL` | `https://deign86-mathpulse-api-v3test.hf.space` in production workflow | Existing FastAPI backend origin. Override only when backend hosting changes. |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:4173` | Backend allow-list; set to deployed frontend origins in production |

## 6. Hosting configuration

### Backend origin

Firebase Hosting serves the frontend only. The current FastAPI backend remains at:

```text
https://deign86-mathpulse-api-v3test.hf.space
```

`deploy-frontend.yml` injects this origin through `VITE_API_URL` unless the GitHub repository variable overrides it. Backend CORS must allow `https://mathpulse-ai-2026.web.app`.

### Firebase Hosting (`firebase.json`)

- `public` points at the Vite output directory (`build`).
- A catch-all rewrite routes SPA navigation to `/index.html` (static files such
  as `/sw.js`, `/manifest.webmanifest`, and icons are served first).
- `sw.js`, `pwa-config.js`, and `firebase-messaging-sw.js` are served with
  `no-cache, no-store, must-revalidate`.
- `/assets/**` and `/icons/**` are served with immutable long-lived caching.

### Nginx (`nginx.conf`)

Equivalent rules for the Docker production image:

- `/index.html`, `/sw.js`, `/pwa-config.js`, `/firebase-messaging-sw.js` are
  never cached.
- `/manifest.webmanifest` is served as `application/manifest+json` and is not
  cached.
- `/assets/` is cached immutably for one year.

### Docker

`VITE_APP_VERSION` is passed as a build arg to the production stage in
`docker-compose.yml`. The production image serves the built PWA through Nginx.

## 7. CI and release verification

CI builds the production output and runs `npm run validate:pwa` before the
frontend artifact can be uploaded or deployed. The validator checks the
manifest JSON and required fields, every manifest icon, detected service
workers, local `importScripts` dependencies, literal precache entries, and the
asset list emitted in `pwa-config.js`.

Run the same checks locally with:

```bash
npm ci --legacy-peer-deps
npm run build
npm run validate:pwa
```

Deploy these files together from `build/`: `index.html`,
`manifest.webmanifest`, `sw.js`, `pwa-config.js`, `firebase-config.js`,
`firebase-messaging-sw.js`, `offline.html`, `/icons/**`, root logo assets, and
`/assets/**`. Firebase Hosting keeps workers, generated configuration,
manifest, and HTML revalidating while content-hashed assets use long-lived
immutable caching.

To test a service-worker update safely, build with a new `VITE_APP_VERSION`,
serve the production build with `npm run preview`, and use a private browser
profile or clear the registered worker/cache between releases. Confirm the
new worker activates, the app shell loads offline, and `/api/**` is not cached.

## 8. Verification checklist

- [ ] `npm run build` emits `build/manifest.webmanifest`, `build/sw.js`,
      `build/pwa-config.js`, and `build/offline.html`.
- [ ] Loading `/manifest.webmanifest` returns `application/manifest+json`.
- [ ] Chrome DevTools → Application → Manifest shows no installability errors.
- [ ] Chrome DevTools → Application → Service Workers shows both `/sw.js` and
      `/firebase-messaging-sw.js` registered.
- [ ] After first load, DevTools → Network → Offline still renders the app
      shell (or `/offline.html` for a cold navigation).
- [ ] `/api/*` requests are not listed in Cache Storage.
- [ ] `beforeinstallprompt` shows the install button; `appinstalled` hides it.
- [ ] On iOS Safari, the header control shows "Add to Home Screen" guidance.

## 9. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Stale app after deploy | Bump `VITE_APP_VERSION` so the SW cache name changes. |
| `sw.js` still serves old assets | Ensure `/sw.js` is served with `no-cache` and the old cache is deleted on activate. |
| Manifest 404 in Firebase | Confirm the deploy contains `build/` and `firebase.json` has `hosting.public: "build"`. |
| Push stopped working | Verify `/firebase-messaging-sw.js` is still present and was not overwritten by `/sw.js`. |
| Install button never appears in dev | Set `VITE_ENABLE_SW_IN_DEV=true` and reload; note `beforeinstallprompt` is not fired by all dev servers. |
