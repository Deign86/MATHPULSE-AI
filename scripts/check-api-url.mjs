// scripts/check-api-url.mjs
// Pre-build gate: VITE_API_URL must be set, or the bundle throws at boot
// (fail-closed env guard) and the hosted app spins on the loader forever.
//
// Usage:
//   VITE_API_URL=<origin> node scripts/check-api-url.mjs
// Exit 0 = set. Exit 1 = empty/unset.
//
// NOTE: `VITE_*` values are baked into the bundle at build time — always
// rebuild after changing VITE_API_URL. CI sets `/api`; Hosting deploys set
// the canonical https:// backend origin.
const value = (process.env.VITE_API_URL ?? '').trim();
if (!value) {
  console.error(
    '[check-api-url] FAIL: VITE_API_URL is empty or unset. Set it before building ' +
      '(VITE_API_URL=/api for CI/proxied builds, or the canonical https:// backend ' +
      'origin for Firebase Hosting) and rebuild.',
  );
  process.exit(1);
}
console.log(`[check-api-url] PASS: VITE_API_URL=${value}`);
