import { describe, expect, it } from 'vitest';
import { API_BASE_URL, apiUrl } from './env';

describe('frontend API configuration', () => {
  it('composes API paths from configured backend origin', () => {
    expect(apiUrl('/api/health')).toBe(`${API_BASE_URL}/api/health`);
  });

  it('never targets a hosted frontend URL', () => {
    expect(API_BASE_URL).not.toContain('huggingface.co/spaces/');
  });
});
