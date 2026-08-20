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

/**
 * Normalize the configured backend base URL.
 *
 * - Unset / empty → same-origin `/api` on web, or clear warning on native Android.
 * - Absolute URL   → its origin (backend routes `/api/...` and `/health` are
 *                    appended by `apiUrl` so the path structure is preserved).
 * - Relative path  → kept as-is (e.g. `/api`).
 */
function normalizeApiBaseUrl(raw: string | undefined): string {
  const value = trimToEmpty(raw);
  if (!value) {
    if (IS_NATIVE_PLATFORM) {
      console.warn(
        '[Capacitor / Android] VITE_API_URL is unset. On native Android APK, relative /api requests cannot reach the backend. Set VITE_API_URL=https://your-api-domain.com for production or http://10.0.2.2:8000 for local emulator development.',
      );
    }
    return '/api';
  }

  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      // Never ship a hosted frontend origin. A separately deployed FastAPI
      // backend origin remains supported and is configurable at build time.
      if (/huggingface\.co$/i.test(parsed.hostname) && /\/spaces\//i.test(parsed.pathname)) {
        return '/api';
      }
      return parsed.origin.replace(/\/+$/, '');
    } catch {
      return value.replace(/\/+$/, '');
    }
  }

  return value.replace(/\/+$/, '') || '/api';
}

/** Base URL for the FastAPI backend. Defaults to same-origin `/api` on web. */
export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);

/** True when the app is running a production build. */
export const IS_PRODUCTION = import.meta.env.PROD === true;

/** Build identifier used for service-worker cache versioning. */
export const APP_VERSION =
  trimToEmpty(import.meta.env.VITE_APP_VERSION) || '1.0.0';

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
