import { describe, expect, it, vi, afterEach } from 'vitest';
import * as rateLimitHandler from '../../utils/rateLimitHandler';
import { ApiError } from '../apiUtils';
import { apiFetch } from '../apiService';

const rateLimitSpy = vi.spyOn(rateLimitHandler, 'handleRateLimitError').mockResolvedValue(true);

describe('api transport regression', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    rateLimitSpy.mockClear();
  });

  it('keeps caller headers while avoiding JSON content type for multipart uploads', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const headers = new Headers({ 'X-Upload-Token': 'upload-1' });

    await apiFetch('/api/upload', { method: 'POST', headers, body: new FormData() }, {
      maxRetries: 0,
      timeoutMs: 1000,
      baseBackoffMs: 0,
    });

    const requestHeaders = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(requestHeaders.get('X-Upload-Token')).toBe('upload-1');
    expect(requestHeaders.has('Content-Type')).toBe(false);
  });

  it('does not retry forbidden responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('forbidden', { status: 403 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiFetch('/api/private', undefined, {
      maxRetries: 4,
      timeoutMs: 1000,
      baseBackoffMs: 0,
    })).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
