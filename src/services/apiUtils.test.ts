import { describe, expect, it } from 'vitest';
import { ApiError, readFastApiErrorDetail } from './apiUtils';

const makeApiError = (status: number, responseBody: string) =>
  new ApiError({ status, statusText: 'Not Found', endpoint: '/api/rag/lesson', responseBody, retryable: false });

describe('readFastApiErrorDetail', () => {
  it('reads the error code and message nested under FastAPI detail', () => {
    const err = makeApiError(404, JSON.stringify({
      detail: { error: 'no_curriculum_context', message: 'Please ensure the PDF has been ingested.', retrievalBand: 'low' },
      status: 404,
    }));
    expect(readFastApiErrorDetail(err)).toEqual({ error: 'no_curriculum_context', message: 'Please ensure the PDF has been ingested.' });
  });

  it('returns null for a plain-string detail or an unparseable body', () => {
    expect(readFastApiErrorDetail(makeApiError(404, JSON.stringify({ detail: 'Not Found' })))).toBeNull();
    expect(readFastApiErrorDetail(makeApiError(502, '<html>Bad Gateway</html>'))).toBeNull();
  });
});
