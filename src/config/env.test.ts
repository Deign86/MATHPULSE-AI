import { describe, expect, it } from 'vitest';
import { API_BASE_URL, apiUrl } from './env';

describe('frontend API configuration', () => {
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
});
