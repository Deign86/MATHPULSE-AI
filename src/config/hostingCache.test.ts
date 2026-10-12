import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface HostingHeaderRule {
  source: string;
  headers: { key: string; value: string }[];
}

// SAFETY: firebase.json is the checked-in hosting config; the test asserts the fields it reads.
const hosting = (JSON.parse(readFileSync(resolve(__dirname, '../../firebase.json'), 'utf8')) as {
  hosting: { headers: HostingHeaderRule[] };
}).hosting;

const cacheControlFor = (source: string): string | undefined =>
  hosting.headers
    .find((rule) => rule.source === source)
    ?.headers.find((header) => header.key === 'Cache-Control')?.value;

describe('hosting cache headers', () => {
  // Users load "/" and SPA routes (rewritten to index.html), not "/index.html". Without these rules
  // Firebase serves the shell with max-age=3600, so returning users stay on the previous build.
  it.each(['/', '**/!(*.*)', 'index.html'])('revalidates the app shell at %s', (source) => {
    expect(cacheControlFor(source)).toMatch(/no-cache/);
  });

  it('keeps hashed build assets immutable', () => {
    expect(cacheControlFor('/assets/**')).toBe('public, max-age=31536000, immutable');
  });
});
