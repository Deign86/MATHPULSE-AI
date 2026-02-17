// src/services/__tests__/apiUtils.test.ts
// Comprehensive tests for the API utility module

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  retryFetch,
  fetchWithTimeout,
  withFallback,
  validateRequired,
  validateRange,
  getBackoffDelay,
  sleep,
  ApiError,
  ApiTimeoutError,
  ApiNetworkError,
  ApiValidationError,
  isRetryableStatus,
  isClientError,
  DEFAULT_TIMEOUT_MS,
  MAX_RETRIES,
} from '../apiUtils';

// ─── Helpers ──────────────────────────────────────────────────

function mockFetchResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : `Error ${status}`,
    headers: new Headers(headers),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
    clone: () => mockFetchResponse(body, status, headers),
  } as unknown as Response;
}

// ─── Tests ────────────────────────────────────────────────────

describe('apiUtils', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─── Error Classes ────────────────────────────────────────

  describe('Error classes', () => {
    it('ApiError contains status and endpoint', () => {
      const err = new ApiError({
        status: 404,
        statusText: 'Not Found',
        endpoint: '/api/test',
        responseBody: 'not found',
        retryable: false,
      });
      expect(err.status).toBe(404);
      expect(err.endpoint).toBe('/api/test');
      expect(err.retryable).toBe(false);
      expect(err.name).toBe('ApiError');
      expect(err.message).toContain('404');
    });

    it('ApiTimeoutError contains endpoint and timeout', () => {
      const err = new ApiTimeoutError('/api/slow', 30000);
      expect(err.endpoint).toBe('/api/slow');
      expect(err.timeoutMs).toBe(30000);
      expect(err.name).toBe('ApiTimeoutError');
    });

    it('ApiNetworkError wraps the original error', () => {
      const original = new TypeError('Failed to fetch');
      const err = new ApiNetworkError('/api/down', original);
      expect(err.endpoint).toBe('/api/down');
      expect(err.originalError).toBe(original);
      expect(err.name).toBe('ApiNetworkError');
    });

    it('ApiValidationError contains details', () => {
      const err = new ApiValidationError('/api/foo', 'missing field: bar');
      expect(err.endpoint).toBe('/api/foo');
      expect(err.details).toBe('missing field: bar');
    });
  });

  // ─── Status Classification ────────────────────────────────

  describe('isRetryableStatus', () => {
    it.each([408, 429, 500, 502, 503, 504])('returns true for %d', (status) => {
      expect(isRetryableStatus(status)).toBe(true);
    });

    it.each([400, 401, 403, 404, 405, 409, 422])('returns false for %d', (status) => {
      expect(isRetryableStatus(status)).toBe(false);
    });
  });

  describe('isClientError', () => {
    it.each([400, 401, 403, 404, 405, 409, 422])('returns true for %d', (status) => {
      expect(isClientError(status)).toBe(true);
    });

    it('returns false for retryable status 429', () => {
      expect(isClientError(429)).toBe(false);
    });

    it('returns false for server error 500', () => {
      expect(isClientError(500)).toBe(false);
    });
  });

  // ─── Backoff ──────────────────────────────────────────────

  describe('getBackoffDelay', () => {
    it('increases exponentially', () => {
      const d0 = getBackoffDelay(0, 1000);
      const d1 = getBackoffDelay(1, 1000);
      const d2 = getBackoffDelay(2, 1000);
      // With jitter these are approximate, but the exponential component dominates
      expect(d0).toBeGreaterThanOrEqual(1000);
      expect(d0).toBeLessThanOrEqual(2000);
      expect(d1).toBeGreaterThanOrEqual(2000);
      expect(d2).toBeGreaterThanOrEqual(4000);
    });

    it('caps at 30 seconds', () => {
      const d = getBackoffDelay(10, 1000);
      expect(d).toBeLessThanOrEqual(30_000);
    });
  });

  // ─── Validation Helpers ───────────────────────────────────

  describe('validateRequired', () => {
    it('passes when all fields are present', () => {
      expect(() =>
        validateRequired('/test', { a: 'val', b: 123 }),
      ).not.toThrow();
    });

    it('throws ApiValidationError for missing fields', () => {
      expect(() =>
        validateRequired('/test', { a: '', b: null, c: undefined }),
      ).toThrow(ApiValidationError);
    });

    it('lists all missing fields', () => {
      try {
        validateRequired('/test', { name: '', email: null });
        expect.fail('should throw');
      } catch (e) {
        expect((e as ApiValidationError).details).toContain('name');
        expect((e as ApiValidationError).details).toContain('email');
      }
    });
  });

  describe('validateRange', () => {
    it('passes for value within range', () => {
      expect(() => validateRange('/test', 'score', 50, 0, 100)).not.toThrow();
    });

    it('throws for value below min', () => {
      expect(() => validateRange('/test', 'score', -1, 0, 100)).toThrow(ApiValidationError);
    });

    it('throws for value above max', () => {
      expect(() => validateRange('/test', 'score', 101, 0, 100)).toThrow(ApiValidationError);
    });

    it('throws for NaN', () => {
      expect(() => validateRange('/test', 'score', NaN, 0, 100)).toThrow(ApiValidationError);
    });
  });

  // ─── retryFetch ───────────────────────────────────────────

  describe('retryFetch', () => {
    it('returns data on first successful call', async () => {
      vi.useRealTimers();
      const body = { ok: true };
      globalThis.fetch = vi.fn().mockResolvedValue(mockFetchResponse(body));

      const result = await retryFetch<typeof body>('http://api/test', {}, { maxRetries: 0, timeoutMs: 5000 });
      expect(result).toEqual(body);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('retries on 500 and succeeds on second attempt', async () => {
      vi.useRealTimers();
      const body = { ok: true };
      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce(mockFetchResponse({ error: 'fail' }, 500))
        .mockResolvedValueOnce(mockFetchResponse(body, 200));

      const result = await retryFetch<typeof body>('http://api/test', {}, {
        maxRetries: 2,
        timeoutMs: 5000,
        baseBackoffMs: 10, // very short for testing
      });
      expect(result).toEqual(body);
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it('does NOT retry on 400 (client error)', async () => {
      vi.useRealTimers();
      globalThis.fetch = vi.fn().mockResolvedValue(mockFetchResponse({ error: 'bad' }, 400));

      await expect(
        retryFetch('http://api/test', {}, { maxRetries: 3, timeoutMs: 5000 }),
      ).rejects.toThrow(ApiError);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('does NOT retry on 401', async () => {
      vi.useRealTimers();
      globalThis.fetch = vi.fn().mockResolvedValue(mockFetchResponse({ error: 'unauth' }, 401));

      await expect(
        retryFetch('http://api/test', {}, { maxRetries: 3, timeoutMs: 5000 }),
      ).rejects.toThrow(ApiError);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('does NOT retry on 403', async () => {
      vi.useRealTimers();
      globalThis.fetch = vi.fn().mockResolvedValue(mockFetchResponse({ error: 'forbidden' }, 403));

      await expect(
        retryFetch('http://api/test', {}, { maxRetries: 3, timeoutMs: 5000 }),
      ).rejects.toThrow(ApiError);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('does NOT retry on 404', async () => {
      vi.useRealTimers();
      globalThis.fetch = vi.fn().mockResolvedValue(mockFetchResponse({ error: 'not found' }, 404));

      await expect(
        retryFetch('http://api/test', {}, { maxRetries: 3, timeoutMs: 5000 }),
      ).rejects.toThrow(ApiError);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('retries on 429 (rate limit)', async () => {
      vi.useRealTimers();
      const body = { ok: true };
      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce(mockFetchResponse({ error: 'rate limit' }, 429))
        .mockResolvedValueOnce(mockFetchResponse(body, 200));

      const result = await retryFetch<typeof body>('http://api/test', {}, {
        maxRetries: 2,
        timeoutMs: 5000,
        baseBackoffMs: 10,
      });
      expect(result).toEqual(body);
    });

    it('retries on 502', async () => {
      vi.useRealTimers();
      const body = { ok: true };
      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce(mockFetchResponse({ error: 'bad gateway' }, 502))
        .mockResolvedValueOnce(mockFetchResponse(body, 200));

      const result = await retryFetch<typeof body>('http://api/test', {}, {
        maxRetries: 2,
        timeoutMs: 5000,
        baseBackoffMs: 10,
      });
      expect(result).toEqual(body);
    });

    it('retries on 503', async () => {
      vi.useRealTimers();
      const body = { ok: true };
      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce(mockFetchResponse({ error: 'service unavailable' }, 503))
        .mockResolvedValueOnce(mockFetchResponse(body, 200));

      const result = await retryFetch<typeof body>('http://api/test', {}, {
        maxRetries: 2,
        timeoutMs: 5000,
        baseBackoffMs: 10,
      });
      expect(result).toEqual(body);
    });

    it('throws after exhausting all retries on 500', async () => {
      vi.useRealTimers();
      globalThis.fetch = vi.fn().mockResolvedValue(mockFetchResponse({ error: 'fail' }, 500));

      await expect(
        retryFetch('http://api/test', {}, { maxRetries: 2, timeoutMs: 5000, baseBackoffMs: 10 }),
      ).rejects.toThrow(ApiError);
      expect(globalThis.fetch).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    });

    it('retries on network error (fetch throws TypeError)', async () => {
      vi.useRealTimers();
      const body = { ok: true };
      globalThis.fetch = vi
        .fn()
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(mockFetchResponse(body, 200));

      const result = await retryFetch<typeof body>('http://api/test', {}, {
        maxRetries: 2,
        timeoutMs: 5000,
        baseBackoffMs: 10,
      });
      expect(result).toEqual(body);
    });

    it('respects Retry-After header on 429', async () => {
      vi.useRealTimers();
      const body = { ok: true };
      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce(
          mockFetchResponse({ error: 'rate limit' }, 429, { 'retry-after': '1' }),
        )
        .mockResolvedValueOnce(mockFetchResponse(body, 200));

      const start = Date.now();
      const result = await retryFetch<typeof body>('http://api/test', {}, {
        maxRetries: 2,
        timeoutMs: 10000,
        baseBackoffMs: 10,
      });
      expect(result).toEqual(body);
      // Should have waited at least ~1s for Retry-After
      expect(Date.now() - start).toBeGreaterThanOrEqual(900);
    });
  });

  // ─── withFallback ─────────────────────────────────────────

  describe('withFallback', () => {
    it('returns API data when call succeeds', async () => {
      vi.useRealTimers();
      const result = await withFallback(
        () => Promise.resolve({ value: 42 }),
        { value: 0 },
        'test',
      );
      expect(result.data).toEqual({ value: 42 });
      expect(result.fromFallback).toBe(false);
    });

    it('returns fallback when call fails', async () => {
      vi.useRealTimers();
      const result = await withFallback(
        () => Promise.reject(new Error('fail')),
        { value: 0 },
        'test',
      );
      expect(result.data).toEqual({ value: 0 });
      expect(result.fromFallback).toBe(true);
    });
  });

  // ─── Constants ────────────────────────────────────────────

  describe('Constants', () => {
    it('DEFAULT_TIMEOUT_MS is 30 seconds', () => {
      expect(DEFAULT_TIMEOUT_MS).toBe(30_000);
    });

    it('MAX_RETRIES is 3', () => {
      expect(MAX_RETRIES).toBe(3);
    });
  });
});
