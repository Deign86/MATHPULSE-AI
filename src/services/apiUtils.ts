// src/services/apiUtils.ts
// Shared API utilities: retry logic, timeout handling, error classification, logging

// ─── Constants ────────────────────────────────────────────────

export const DEFAULT_TIMEOUT_MS = 30_000;
export const MAX_RETRIES = 3;
export const INITIAL_BACKOFF_MS = 1_000;

// ─── Error Types ──────────────────────────────────────────────

export class ApiError extends Error {
  public readonly status: number;
  public readonly statusText: string;
  public readonly endpoint: string;
  public readonly responseBody: string;
  public readonly retryable: boolean;
  public readonly requestId?: string;

  constructor(opts: {
    status: number;
    statusText: string;
    endpoint: string;
    responseBody: string;
    retryable: boolean;
    requestId?: string;
  }) {
    super(`API Error ${opts.status} (${opts.statusText}) on ${opts.endpoint}: ${opts.responseBody}`);
    this.name = 'ApiError';
    this.status = opts.status;
    this.statusText = opts.statusText;
    this.endpoint = opts.endpoint;
    this.responseBody = opts.responseBody;
    this.retryable = opts.retryable;
    this.requestId = opts.requestId;
  }
}

export class ApiTimeoutError extends Error {
  public readonly endpoint: string;
  public readonly timeoutMs: number;

  constructor(endpoint: string, timeoutMs: number) {
    super(`Request to ${endpoint} timed out after ${timeoutMs}ms`);
    this.name = 'ApiTimeoutError';
    this.endpoint = endpoint;
    this.timeoutMs = timeoutMs;
  }
}

export class ApiNetworkError extends Error {
  public readonly endpoint: string;
  public readonly originalError: Error;

  constructor(endpoint: string, originalError: Error) {
    super(`Network error on ${endpoint}: ${originalError.message}`);
    this.name = 'ApiNetworkError';
    this.endpoint = endpoint;
    this.originalError = originalError;
  }
}

export class ApiValidationError extends Error {
  public readonly endpoint: string;
  public readonly details: string;

  constructor(endpoint: string, details: string) {
    super(`Validation error before calling ${endpoint}: ${details}`);
    this.name = 'ApiValidationError';
    this.endpoint = endpoint;
    this.details = details;
  }
}

// ─── Error classification ─────────────────────────────────────

/** HTTP status codes that are safe to retry */
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

export function isRetryableStatus(status: number): boolean {
  return RETRYABLE_STATUS_CODES.has(status);
}

export function isClientError(status: number): boolean {
  return status >= 400 && status < 500 && !RETRYABLE_STATUS_CODES.has(status);
}

// ─── Logging ──────────────────────────────────────────────────

export interface ApiLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  endpoint: string;
  method: string;
  status?: number;
  attempt?: number;
  durationMs?: number;
  message: string;
  details?: unknown;
}

function logApi(entry: ApiLogEntry): void {
  const prefix = `[API ${entry.level.toUpperCase()}] ${entry.timestamp} ${entry.method} ${entry.endpoint}`;

  switch (entry.level) {
    case 'error':
      console.error(prefix, entry.message, entry.details ?? '');
      break;
    case 'warn':
      console.warn(prefix, entry.message, entry.details ?? '');
      break;
    default:
      console.info(prefix, entry.message, entry.details ?? '');
  }
}

export function logApiInfo(endpoint: string, method: string, message: string, details?: unknown): void {
  logApi({ timestamp: new Date().toISOString(), level: 'info', endpoint, method, message, details });
}

export function logApiWarn(endpoint: string, method: string, message: string, details?: unknown): void {
  logApi({ timestamp: new Date().toISOString(), level: 'warn', endpoint, method, message, details });
}

export function logApiError(endpoint: string, method: string, message: string, details?: unknown): void {
  logApi({ timestamp: new Date().toISOString(), level: 'error', endpoint, method, message, details });
}

// ─── Timeout wrapper ─────────────────────────────────────────

export function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): { promise: Promise<Response>; abort: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const promise = fetch(url, {
    ...options,
    signal: controller.signal,
  }).finally(() => clearTimeout(timer));

  return { promise, abort: () => controller.abort() };
}

// ─── Sleep helper ─────────────────────────────────────────────

/** Default sleep implementation; override via `_setSleep` for testing. */
let _sleepFn = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export function sleep(ms: number): Promise<void> {
  return _sleepFn(ms);
}

/** @internal – test-only hook to replace the sleep implementation */
export function _setSleep(fn: (ms: number) => Promise<void>): void {
  _sleepFn = fn;
}

/** @internal – restore the default sleep implementation */
export function _resetSleep(): void {
  _sleepFn = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Exponential backoff calculator ──────────────────────────

export function getBackoffDelay(attempt: number, baseMs: number = INITIAL_BACKOFF_MS): number {
  // Exponential backoff with jitter: base * 2^attempt + random jitter
  const exponential = baseMs * Math.pow(2, attempt);
  const jitter = Math.random() * baseMs;
  return Math.min(exponential + jitter, 30_000); // cap at 30s
}

// ─── Retry-aware fetch ───────────────────────────────────────

export interface RetryFetchOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Request timeout in ms (default: 30000) */
  timeoutMs?: number;
  /** Base backoff delay in ms (default: 1000) */
  baseBackoffMs?: number;
  /** If true, parse response as JSON even on error for logging */
  parseErrorBody?: boolean;
}

/**
 * A robust `fetch` wrapper with:
 *  - Configurable timeout via AbortController
 *  - Exponential backoff with jitter
 *  - Retry on 5xx / 429 / network errors
 *  - No retry on 4xx client errors (except 429)
 *  - Detailed logging at every stage
 *
 * @returns Parsed JSON body typed as `T`.
 * @throws ApiError | ApiTimeoutError | ApiNetworkError
 */
export async function retryFetch<T>(
  url: string,
  options: RequestInit = {},
  retryOpts: RetryFetchOptions = {},
): Promise<T> {
  const {
    maxRetries = MAX_RETRIES,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    baseBackoffMs = INITIAL_BACKOFF_MS,
  } = retryOpts;

  const method = (options.method ?? 'GET').toUpperCase();
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const startTime = Date.now();

    try {
      if (attempt > 0) {
        logApiInfo(url, method, `Retry attempt ${attempt}/${maxRetries}`);
      }

      const { promise } = fetchWithTimeout(url, options, timeoutMs);
      const response = await promise;
      const durationMs = Date.now() - startTime;

      // ── Success ──
      if (response.ok) {
        logApiInfo(url, method, `${response.status} in ${durationMs}ms`, { attempt });
        return (await response.json()) as T;
      }

      // ── Error response ──
      const responseBody = await response.text().catch(() => 'Unable to read response body');
      const retryable = isRetryableStatus(response.status);

      const apiError = new ApiError({
        status: response.status,
        statusText: response.statusText,
        endpoint: url,
        responseBody,
        retryable,
        requestId: response.headers.get('x-request-id') ?? undefined,
      });

      logApiError(url, method, `${response.status} ${response.statusText} in ${durationMs}ms`, {
        attempt,
        responseBody: responseBody.slice(0, 500),
        retryable,
      });

      // Don't retry non-retryable client errors (400, 401, 403, 404, etc.)
      if (!retryable) {
        throw apiError;
      }

      // Handle 429 rate-limiting: use Retry-After header when available
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        if (retryAfter) {
          const waitSec = parseInt(retryAfter, 10);
          if (!isNaN(waitSec) && waitSec > 0) {
            logApiWarn(url, method, `Rate limited. Waiting ${waitSec}s (Retry-After header)`);
            await sleep(waitSec * 1000);
            lastError = apiError;
            continue;
          }
        }
      }

      lastError = apiError;

    } catch (err) {
      const durationMs = Date.now() - startTime;

      // Already an ApiError thrown for non-retryable status — re-throw
      if (err instanceof ApiError && !err.retryable) {
        throw err;
      }

      // Timeout (AbortController)
      if (err instanceof DOMException && err.name === 'AbortError') {
        const timeoutErr = new ApiTimeoutError(url, timeoutMs);
        logApiError(url, method, `Timeout after ${durationMs}ms`, { attempt, timeoutMs });
        lastError = timeoutErr;
      }
      // Network error
      else if (err instanceof TypeError && err.message.includes('fetch')) {
        const netErr = new ApiNetworkError(url, err);
        logApiError(url, method, `Network error after ${durationMs}ms: ${err.message}`, { attempt });
        lastError = netErr;
      }
      // Propagate known API errors
      else if (err instanceof ApiError) {
        lastError = err;
      }
      // Unknown error
      else {
        lastError = err instanceof Error ? err : new Error(String(err));
        logApiError(url, method, `Unexpected error: ${lastError.message}`, { attempt });
      }
    }

    // ── Backoff before next attempt ──
    if (attempt < maxRetries) {
      const delay = getBackoffDelay(attempt, baseBackoffMs);
      logApiWarn(url, method, `Backing off ${Math.round(delay)}ms before attempt ${attempt + 1}`, { attempt });
      await sleep(delay);
    }
  }

  // All retries exhausted
  logApiError(url, method, `All ${maxRetries + 1} attempts failed`);
  throw lastError ?? new Error(`retryFetch: all ${maxRetries + 1} attempts failed for ${url}`);
}

// ─── Fallback helper ─────────────────────────────────────────

/**
 * Wrap an async API call with a fallback value that is returned
 * when the call fails after all retries.
 */
export async function withFallback<T>(
  fn: () => Promise<T>,
  fallback: T,
  label = 'API call',
): Promise<{ data: T; fromFallback: boolean }> {
  try {
    const data = await fn();
    return { data, fromFallback: false };
  } catch (err) {
    logApiWarn('', '', `${label} failed — returning fallback`, {
      error: err instanceof Error ? err.message : String(err),
    });
    return { data: fallback, fromFallback: true };
  }
}

// ─── Request body validation helpers ─────────────────────────

export function validateRequired(
  endpoint: string,
  fields: Record<string, unknown>,
): void {
  const missing = Object.entries(fields)
    .filter(([, v]) => v === undefined || v === null || v === '')
    .map(([k]) => k);

  if (missing.length > 0) {
    throw new ApiValidationError(endpoint, `Missing required fields: ${missing.join(', ')}`);
  }
}

export function validateRange(
  endpoint: string,
  fieldName: string,
  value: number,
  min: number,
  max: number,
): void {
  if (typeof value !== 'number' || isNaN(value) || value < min || value > max) {
    throw new ApiValidationError(
      endpoint,
      `${fieldName} must be a number between ${min} and ${max}, got ${value}`,
    );
  }
}
