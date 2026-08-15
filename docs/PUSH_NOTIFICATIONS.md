# MathPulse AI Web Push Notifications

## Architecture

- The browser uses Firebase Cloud Messaging (FCM) with the existing Firebase web app configuration.
- `/firebase-messaging-sw.js` is a dedicated, narrow-scope worker for background delivery. `/sw.js` remains the PWA app-shell worker and never caches FCM worker/config assets.
- FCM tokens are stored at `users/{userId}/fcmTokens/{sha256(token)}`. The raw token is required by the trusted sender, but the document ID and delivery records use hashes.
- Firebase Functions use the Admin SDK to send targeted pushes. Clients cannot send pushes or write delivery claims.
- Foreground messages become an in-app toast only. Background messages are rendered once by the FCM worker and use validated same-origin routes.

## Firebase Console setup

1. Open Firebase Console → project `mathpulse-ai-2026`.
2. Project settings → Your apps → Web app: verify the web configuration values used by the deployment.
3. Cloud Messaging → Web configuration → generate or copy the Web Push certificate key pair (VAPID public key).
4. Confirm Cloud Messaging is enabled and the web app has an HTTPS hosting origin.
5. Confirm the Firebase Functions service account has permission to use Firebase Cloud Messaging and Firestore.
6. Do not put service-account JSON, private keys, or Admin credentials in `VITE_*` variables.

## Environment variables

Frontend public values are documented in `.env.example`:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_VAPID_KEY`

The VAPID key is public and is safe to ship to browsers. Server credentials remain server-side. For Functions use the existing Firebase runtime credentials. For separately deployed backend environments, configure the existing documented `FIREBASE_SERVICE_ACCOUNT_JSON`/service-account file and never commit it.

Push requires HTTPS, except for `localhost` development. Browser permission is requested only after the user activates **Enable notifications** in Settings → Notifications.

## Local development

```bash
cp .env.example .env.local
# Fill Firebase web values and VITE_FIREBASE_VAPID_KEY
npm run dev
```

For local Functions testing, use the repository's existing emulator configuration and `VITE_USE_FUNCTIONS_EMULATOR=true`. Real browser push still requires a supported browser and a valid VAPID key.

## Deployment order

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run validate:pwa
cd functions && npm run lint && npm run build && npm test
cd ..
npx firebase deploy --only hosting,functions --project mathpulse-ai-2026
```

Deploy the frontend and Functions together when changing the FCM data contract. The generated production assets must include `firebase-messaging-sw.js` and `firebase-config.js`. Hosting serves the worker/config assets with no-cache headers so browser updates are not hidden by stale app-shell caches.

## Manual end-to-end checklist

### Browser/platform matrix

- [ ] Chrome desktop, current stable, HTTPS production origin.
- [ ] Edge desktop, current stable, HTTPS production origin.
- [ ] Android Chrome, installed or normal browser mode.
- [ ] Firefox: document the deployed support result; Firebase Web Messaging support and notification behavior vary by browser/version and may be unavailable. The UI must show Unsupported rather than claiming success.
- [ ] Incognito/private browsing: expect browser-specific restrictions, ephemeral permission/token state, or unsupported messaging; verify graceful status/error handling.

### Permission and lifecycle

- [ ] Initial authenticated load does not open a permission prompt.
- [ ] Settings → Notifications shows Unsupported, Not enabled, Enabled, Denied, Registering, or Error accurately.
- [ ] User clicks Enable notifications; permission prompt appears only from that action.
- [ ] Grant permission; token is created under the authenticated user's `fcmTokens` subcollection with timestamps and metadata.
- [ ] Deny permission; no repeated prompts occur and browser-settings guidance is shown.
- [ ] Revoke permission in browser site settings after enabling; reload and verify the current session token is deactivated.
- [ ] Disable from Settings; verify this device token is inactive while another device remains active.
- [ ] Sign out and sign into another account; verify the previous account's session token is inactive and the new account is not sent the previous user's pushes.
- [ ] Rotate/refresh a token; verify only the prior token for that browser session is deactivated. Other devices/browsers for the same account stay active.

### Delivery and navigation

- [ ] Foreground: send an authorized test/domain event; exactly one in-app toast appears and no duplicate Firestore notification is created by the foreground handler.
- [ ] Background tab: send a push; exactly one browser notification appears with title, body, icon, badge, tag, and event ID.
- [ ] App closed: send a push; notification appears and opens only a safe internal route.
- [ ] Click with an existing MathPulse tab: tab is focused and navigates in-app.
- [ ] Click with no existing tab: a same-origin app route opens.
- [ ] Send duplicate event ID: no duplicate delivery to the same active device.
- [ ] Send an invalid/expired registration token through a controlled test; verify it is marked inactive and no raw token is logged.
- [ ] Test multiple devices/browsers for one account; every active token receives the first event.
- [ ] Test a partial send failure; successful/invalid tokens are not repeated, while retryable tokens remain eligible for retry.

### Roles and preferences

- [ ] Student receives an authorized student event and can control category/master preferences.
- [ ] Teacher receives only authorized teacher events; assignment deadline sends use a trusted class-section ownership record and a valid assignment ID.
- [ ] Administrator can receive system/admin events and use the authorized development/admin test-push control.
- [ ] Disabled master preference suppresses pushes.
- [ ] Disabled category suppresses only that category.
- [ ] Quiet hours suppress normal categories and preserve the documented system-alert behavior.

## Troubleshooting

- Check browser DevTools → Application → Service Workers for `/firebase-messaging-sw.js` and its `/firebase-messaging/` scope.
- Check the Network panel for uncached `firebase-config.js` and the generated Firebase values (never expose secrets).
- Check Functions logs for counts and error codes, not token values.
- Verify the deployed origin is HTTPS and that the VAPID key belongs to the same Firebase project.
- If permission is denied, use the browser site settings to allow notifications; the app intentionally does not repeatedly prompt.
- Remove only an invalid token document or let the Functions sender deactivate it; do not manually copy tokens into logs or tickets.
