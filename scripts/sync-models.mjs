import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const src = resolve('config/models.yaml');
const dst = resolve('backend/config/models.yaml');

try {
  if (existsSync(src)) {
    mkdirSync(dirname(dst), { recursive: true });
    copyFileSync(src, dst);
    console.log(`[sync:models] Synced: ${src} -> ${dst}`);
  }
} catch (err) {
  console.warn('[sync:models] Note: models.yaml sync skipped:', err?.message || err);
}
