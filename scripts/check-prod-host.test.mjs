import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const runGate = (content) => {
  const dir = mkdtempSync(join(tmpdir(), 'check-prod-host-test-'));
  try {
    writeFileSync(join(dir, 'bundle.js'), content, 'utf8');
    const result = spawnSync(process.execPath, ['scripts/check-prod-host.mjs', dir], {
      encoding: 'utf8',
    });
    return {
      status: result.status,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

test('check-prod-host gate allows the canonical production backend host', () => {
  const canonicalHost = ['https://', 'deign86-mathpulse-api-v3', 'test', '.', 'hf', '.', 'space'].join('');
  const outcome = runGate(`export const API_URL = "${canonicalHost}";`);
  assert.equal(
    outcome.status,
    0,
    `Expected exit code 0 for canonical host, got ${outcome.status}. stderr: ${outcome.stderr}`,
  );
  assert.match(outcome.stdout, /PASS: no hf\.space\/v3test references in release bundle\./);
});

test('check-prod-host gate rejects arbitrary other hf.space backend hosts', () => {
  const otherHost = ['https://', 'another-mathpulse-preview', '.', 'hf', '.', 'space'].join('');
  const outcome = runGate(`export const API_URL = "${otherHost}";`);
  assert.equal(outcome.status, 1, `Expected exit code 1 for other hf.space host, got ${outcome.status}`);
  assert.match(outcome.stderr, /FAIL: test\/preview backend host found in release bundle/);
});
