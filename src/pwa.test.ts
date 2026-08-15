import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const manifest = JSON.parse(
  readFileSync(resolve(process.cwd(), 'public/manifest.webmanifest'), 'utf8'),
) as {
  name: string;
  short_name: string;
  display: string;
  start_url: string;
  scope: string;
  icons: Array<{ sizes: string; type: string; purpose?: string }>;
};

describe('PWA static contract', () => {
  it('has installable manifest metadata and required icons', () => {
    expect(manifest.name).toBe('MathPulse AI');
    expect(manifest.short_name).toBe('MathPulse');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ sizes: '192x192', type: 'image/png' }),
      expect.objectContaining({ sizes: '512x512', type: 'image/png' }),
      expect.objectContaining({ sizes: '512x512', purpose: 'maskable' }),
    ]));
  });
});
