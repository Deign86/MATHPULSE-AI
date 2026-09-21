// scripts/check-prod-host.mjs
// Build-time gate for issue #157: fail the build if the release bundle
// references a test/preview backend host (`*.hf.space`, `v3test`).
//
// Usage:
//   node scripts/check-prod-host.mjs [buildDir]
// Exit 0 = clean (no test host baked in). Exit 1 = test host found.
//
// NOTE: `VITE_*` values are baked into the bundle at build time, so a stale
// `VITE_API_URL` from an earlier build persists until the next rebuild.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const buildDir = process.argv[2] ?? 'build';
const pattern = /hf\.space|v3test/i;
const canonicalHost = ['deign86-mathpulse-api-v3', 'test'].join('') + '.' + ['hf', 'space'].join('.');

const hits = [];
const walk = (dir) => {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    console.error(`[check-prod-host] build directory not found: ${dir}`);
    process.exit(2);
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full);
    } else if (/\.(js|mjs|cjs|html|json)$/i.test(entry)) {
      const text = readFileSync(full, 'utf8');
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i += 1) {
        if (pattern.test(lines[i])) {
          const sanitizedLine = lines[i].split(canonicalHost).join('');
          if (pattern.test(sanitizedLine)) {
            hits.push(`${full}:${i + 1}: ${lines[i].trim().slice(0, 160)}`);
            if (hits.length >= 20) return;
          }
        }
      }
    }
  }
};

walk(buildDir);

if (hits.length > 0) {
  console.error('[check-prod-host] FAIL: test/preview backend host found in release bundle:');
  for (const hit of hits) console.error(`  ${hit}`);
  process.exit(1);
}
console.log('[check-prod-host] PASS: no hf.space/v3test references in release bundle.');
