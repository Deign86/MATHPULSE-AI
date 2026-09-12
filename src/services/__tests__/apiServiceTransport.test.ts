import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as rateLimitHandler from '../../utils/rateLimitHandler';
import { ApiError } from '../apiUtils';

/**
 * Transport-level guard for the shared request stage.
 *
 * `buildRequestHeaders` and `logAndSignalApiError` are now the single owners of
 * header construction and failure classification. These tests pin the behaviour
 * that both the JSON and blob paths inherit, so a change to the shared stage
 * fails here instead of only surfacing in one call path.
 */
const handleRateLimitSpy = vi
  .spyOn(rateLimitHandler, 'handleRateLimitError')
  .mockResolvedValue(true);

const { apiFetch } = await import('../apiService');

/** No retries so each case exercises exactly one request. */
const NO_RETRY = { maxRetries: 0, timeoutMs: 2_000, baseBackoffMs: 0 };

const fetchMock = vi.fn();

function lastRequestInit() {
  const call = fetchMock.mock.calls.at(-1);
  if (!call) throw new Error('fetch was never called');
  return { url: String(call[0]), init: call[1] };
}

describe('apiService transport', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    handleRateLimitSpy.mockClear();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults to a JSON content type and returns the parsed body', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(apiFetch<{ ok: boolean }>('/api/ping', undefined, NO_RETRY)).resolves.toEqual({
      ok: true,
    });

    const { url, init } = lastRequestInit();
    expect(url).toContain('/api/ping');
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json');
  });

  it('leaves FormData bodies without a JSON content type', async () => {
    fetchMock.mockResolvedValue(
      new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );

    await apiFetch('/api/upload', { method: 'POST', body: new FormData() }, NO_RETRY);

    const { init } = lastRequestInit();
    expect(new Headers(init.headers).has('Content-Type')).toBe(false);
  });

  it('classifies a server failure as an ApiError', async () => {
    fetchMock.mockResolvedValue(
      new Response('boom', { status: 503, statusText: 'Service Unavailable' }),
    );

    await expect(apiFetch('/api/boom', undefined, NO_RETRY)).rejects.toBeInstanceOf(ApiError);
  });

  it('routes 429 responses through the shared rate-limit handler', async () => {
    fetchMock.mockResolvedValue(
      new Response('slow down', { status: 429, statusText: 'Too Many Requests' }),
    );

    await expect(apiFetch('/api/limited', undefined, NO_RETRY)).rejects.toBeInstanceOf(ApiError);

    expect(handleRateLimitSpy).toHaveBeenCalledTimes(1);
    expect(handleRateLimitSpy.mock.calls[0][1]).toBe('/api/limited');
  });
});
