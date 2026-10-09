// Verifies every issue in the range is either closed by a `Fixes #n` commit on
// this branch or explicitly abandoned in a lane gates file.
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const FIRST = Number(process.argv[2] ?? 211);
const LAST = Number(process.argv[3] ?? 306);
const BASE = process.argv[4] ?? 'main';

const commitBodies = execSync(`git log ${BASE}..HEAD --format=%B`, { encoding: 'utf8' });
const fixed = new Set([...commitBodies.matchAll(/\bFixes #(\d+)/gi)].map(m => Number(m[1])));

const gatesDir = join(process.cwd(), 'gates');
const abandoned = new Map();
for (const name of readdirSync(gatesDir)) {
  const text = readFileSync(join(gatesDir, name), 'utf8');
  for (const m of text.matchAll(/^ABANDON:\s*G(\d+)\s+(.*)$/gm)) {
    abandoned.set(Number(m[1]), `${name}: ${m[2].trim()}`);
  }
}

const missing = [];
const fixedButAbandoned = [];
for (let n = FIRST; n <= LAST; n++) {
  const isFixed = fixed.has(n);
  const isAbandoned = abandoned.has(n);
  if (!isFixed && !isAbandoned) missing.push(n);
  if (isFixed && isAbandoned) fixedButAbandoned.push(n);
}

const total = LAST - FIRST + 1;
const covered = total - missing.length;
console.log(`covered ${covered}/${total} (fixed ${[...fixed].filter(n => n >= FIRST && n <= LAST).length}, abandoned ${abandoned.size})`);
for (const [n, why] of [...abandoned.entries()].sort((a, b) => a[0] - b[0])) console.log(`  ABANDON #${n} ${why}`);
if (fixedButAbandoned.length) console.log(`  both fixed and abandoned: ${fixedButAbandoned.join(', ')}`);
if (missing.length) {
  console.log(`  missing: ${missing.join(', ')}`);
  process.exit(1);
}
