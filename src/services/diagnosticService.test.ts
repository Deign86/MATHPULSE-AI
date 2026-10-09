import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateDiagnostic } from './diagnosticService';

function hangUntilAborted(_url: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('generateDiagnostic timeout', () => {
  it('waits the advertised 90 s in a single request before timing out', async () => {
    vi.useFakeTimers();
    const fetchSpy = vi.fn(hangUntilAborted);
    vi.stubGlobal('fetch', fetchSpy);

    const pending = generateDiagnostic('STEM', 'Grade 11');
    const outcome = expect(pending).rejects.toThrow('The request timed out');

    await vi.advanceTimersByTimeAsync(89_000);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1_000);
    await outcome;
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
