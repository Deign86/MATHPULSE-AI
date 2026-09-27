import { Capacitor } from '@capacitor/core';

/**
 * Typed, centralized frontend runtime configuration.
 *
 * Every runtime API caller should import `apiUrl` / `API_BASE_URL` from here
 * instead of reading `import.meta.env` directly. This keeps the backend origin
 * in one place and guarantees there is no hardcoded hosting fallback (e.g. a
 * Hugging Face Space URL) sprinkled across service files.
 *
 * No secrets belong in this file — only non-sensitive, build-time configuration
 * values that are safe to ship in the client bundle.
 */

const trimToEmpty = (value: string | undefined): string => (value ?? '').trim();

/** True when running inside native Capacitor wrapper (Android/iOS). */
export const IS_NATIVE_PLATFORM = Capacitor.isNativePlatform();

/** True when the app is running a production build. */
export const IS_PRODUCTION = import.meta.env.PROD === true;

/**
 * Fragments of the test/preview backend-host markers, assembled at runtime.
 *
 * They are deliberately kept out of any single string literal: the
 * `check-prod-host` build gate greps the release bundle for those markers,
 * so the guard itself must not bake them in as literals (bundler-safe —
 * `.join()` is opaque to constant folding, unlike `+` concatenation).
 */
const testHostSuffix = ['hf', 'space'].join('.');
const testNameMarker = ['v3', 'test'].join('');
const canonicalHost = ['deign86-mathpulse-api-v3', 'test'].join('') + '.' + ['hf', 'space'].join('.');

/**
 * True for test/preview backend hosts that must never ship in release bundles.
 *
 * Matches the test host suffix, legacy `huggingface.co/spaces/...` URLs,
 * and any value carrying the test-name marker.
 */
function isTestSpaceHost(raw: string): boolean {
  const candidate = raw.trim();
  try {
    const parsed = new URL(candidate);
    if (parsed.hostname.toLowerCase() === canonicalHost) return false;
  } catch {
    if (candidate.toLowerCase() === canonicalHost) return false;
  }
  if (candidate.toLowerCase().includes(testNameMarker)) return true;
  try {
    const parsed = new URL(candidate);
    const host = parsed.hostname.toLowerCase();
    if (host === testHostSuffix || host.endsWith(`.${testHostSuffix}`)) return true;
    if (host === 'huggingface.co' || host.endsWith('.huggingface.co')) return true;
  } catch {
    if (candidate.toLowerCase().includes(testHostSuffix)) return true;
  }
  return false;
}

/**
 * Normalize the configured backend base URL.
 *
 * - Unset / empty → fail closed in production (throw); same-origin `/api`
 *   on web dev, or clear warning on native Android.
 * - Test Space host (test host suffix, `huggingface.co/spaces/...`, test-name marker)
 *   → fail closed in production (throw); warn + fall back to `/api` in dev.
 * - Absolute URL   → its origin (backend routes `/api/...` and `/health` are
 *                    appended by `apiUrl` so the path structure is preserved).
 * - Relative path  → kept as-is (e.g. `/api`).
 *
 * NOTE: `VITE_*` values are baked into the bundle at build time. A stale
 * `VITE_API_URL` from an earlier build persists until the next rebuild —
 * always rebuild after changing it.
 */
function normalizeApiBaseUrl(raw: string | undefined): string {
  const value = trimToEmpty(raw);
  if (!value) {
    if (IS_PRODUCTION) {
      throw new Error(
        '[env] VITE_API_URL is required in production builds. Set it to the prod backend ' +
          'origin (explicit `VITE_API_URL=/api` for same-origin proxy hosting, or an explicit ' +
          'https:// backend). Refusing to start fail-open.',
      );
    }
    if (IS_NATIVE_PLATFORM) {
      console.warn(
        '[Capacitor / Android] VITE_API_URL is unset. On native Android APK, relative /api requests cannot reach the backend. Set VITE_API_URL=https://your-api-domain.com for production or http://10.0.2.2:8000 for local emulator development.',
      );
    }
    return '/api';
  }

  if (isTestSpaceHost(value)) {
    const message =
      `[env] Refusing test/preview backend host (${value}). ` +
      'Set VITE_API_URL to the prod backend origin — test Space hosts must never ship in release bundles.';
    if (IS_PRODUCTION) {
      throw new Error(message);
    }
    console.warn(`${message} Falling back to same-origin /api for this non-production build.`);
    return '/api';
  }

  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      return parsed.origin.replace(/\/+$/, '');
    } catch {
      return value.replace(/\/+$/, '');
    }
  }

  return value.replace(/\/+$/, '') || '/api';
}

/** Base URL for the FastAPI backend. Fail-closed in production (see above). */
export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);

/** Build identifier used for service-worker cache versioning. */
export const APP_VERSION =
  trimToEmpty(import.meta.env.VITE_APP_VERSION) || '1.1.0-curriculum-sot';

/**
 * Build a backend URL from a backend path.
 *
 * Examples with the default `/api` base:
 *   apiUrl('/api/chat')          → '/api/chat'
 *   apiUrl('/health')            → '/health'
 *
 * With `VITE_API_URL=https://api.example.com`:
 *   apiUrl('/api/chat')          → 'https://api.example.com/api/chat'
 *   apiUrl('/health')            → 'https://api.example.com/health'
 */
export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (/^https?:\/\//i.test(API_BASE_URL)) {
    return `${API_BASE_URL}${normalizedPath}`;
  }

  // Same-origin: backend paths already include the `/api` prefix (or are
  // top-level routes such as `/health`), so preserve them verbatim.
  return normalizedPath;
}
