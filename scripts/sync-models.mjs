import { existsSync, mkdirSync, copyFileSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

// config/models.yaml is the single source of truth; backend/config/models.yaml
// is a generated copy kept next to the backend Dockerfile. `--check` verifies
// the two are in sync so drift is caught in CI instead of silently repaired.
const src = resolve('config/models.yaml');
const dst = resolve('backend/config/models.yaml');
const checkOnly = process.argv.includes('--check');

if (!existsSync(src)) {
  console.error(`[sync:models] Missing source of truth: ${src}`);
  process.exit(1);
}

if (checkOnly) {
  if (!existsSync(dst)) {
    console.error(`[sync:models] Missing generated copy: ${dst}\nRun: npm run sync:models`);
    process.exit(1);
  }
  const source = readFileSync(src, 'utf8');
  const generated = readFileSync(dst, 'utf8');
  if (source !== generated) {
    console.error(
      `[sync:models] Drift detected between ${src} and ${dst}.\nRun: npm run sync:models and commit the result.`,
    );
    process.exit(1);
  }
  console.log(`[sync:models] In sync: ${dst}`);
  process.exit(0);
}

mkdirSync(dirname(dst), { recursive: true });
copyFileSync(src, dst);
console.log(`[sync:models] Synced: ${src} -> ${dst}`);
