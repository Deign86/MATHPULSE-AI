import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_BASE_URL, apiUrl } from './env';

describe('frontend API configuration', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('preserves the /api prefix for same-origin deployments', () => {
    if (/^https?:\/\//i.test(API_BASE_URL)) return;

    expect(API_BASE_URL).toBe('/api');
    expect(apiUrl('/api/health')).toBe('/api/health');
    expect(apiUrl('/health')).toBe('/health');
  });

  it('appends backend paths for an absolute backend origin', () => {
    if (!/^https?:\/\//i.test(API_BASE_URL)) return;

    expect(apiUrl('/api/health')).toBe(`${API_BASE_URL}/api/health`);
    expect(apiUrl('/health')).toBe(`${API_BASE_URL}/health`);
  });

  it('never targets a hosted frontend URL', () => {
    expect(API_BASE_URL).not.toContain('huggingface.co/spaces/');
  });

  it('allows the canonical production backend host in production builds', async () => {
    const canonicalHost = ['https://', 'deign86-mathpulse-api-v3', 'test', '.', 'hf', '.', 'space'].join('');
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_API_URL', canonicalHost);

    const reloaded = await import('./env');
    expect(reloaded.API_BASE_URL).toBe(canonicalHost);
    expect(reloaded.apiUrl('/api/health')).toBe(`${canonicalHost}/api/health`);
  });

  it('rejects arbitrary other hf.space preview backend hosts in production builds', async () => {
    const otherHost = ['https://', 'another-mathpulse-preview', '.', 'hf', '.', 'space'].join('');
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_API_URL', otherHost);

    await expect(import('./env')).rejects.toThrow(/Refusing test\/preview backend host/);
  });
});
