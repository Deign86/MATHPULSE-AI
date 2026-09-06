#!/usr/bin/env node

/**
 * Auto-Clean Build Artifacts & Caches
 *
 * Recursively scans build artifacts and caches in the repository,
 * calculates cumulative disk footprint, and purges them if the total
 * exceeds a configured threshold (default: 300 MB).
 */

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const DEFAULT_THRESHOLD_MB = 300;

// Explicit, relative target directories and file patterns
const STATIC_TARGETS = [
  'build',
  'dist',
  path.join('functions', 'lib'),
  path.join('node_modules', '.vite'),
  '.pytest_cache',
  path.join('backend', '.pytest_cache')
];

const EPHEMERAL_FILE_PATTERNS = [
  /^firebase-debug.*\.log$/,
  /^npm-debug.*\.log$/,
  /^\.coverage$/
];

// Absolute paths that must never be deleted
const PROTECTED_PATHS = new Set([
  REPO_ROOT,
  path.join(REPO_ROOT, 'src'),
  path.join(REPO_ROOT, 'src', 'lib'),
  path.join(REPO_ROOT, 'datasets'),
  path.join(REPO_ROOT, 'public'),
  path.join(REPO_ROOT, 'functions'),
  path.join(REPO_ROOT, 'functions', 'src'),
  path.join(REPO_ROOT, 'backend'),
  path.join(REPO_ROOT, 'node_modules'),
  path.join(REPO_ROOT, '.git')
]);

function parseArguments() {
  const args = process.argv.slice(2);
  let thresholdMb = Number(process.env.AUTO_CLEAN_THRESHOLD_MB) || DEFAULT_THRESHOLD_MB;
  let force = false;
  let dryRun = false;
  let verbose = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--threshold-mb' || arg === '-t') {
      const nextVal = Number(args[++i]);
      if (!Number.isNaN(nextVal) && nextVal >= 0) {
        thresholdMb = nextVal;
      }
    } else if (arg.startsWith('--threshold-mb=')) {
      const val = Number(arg.split('=')[1]);
      if (!Number.isNaN(val) && val >= 0) {
        thresholdMb = val;
      }
    } else if (arg === '--force' || arg === '-f') {
      force = true;
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--verbose' || arg === '-v') {
      verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return { thresholdMb, force, dryRun, verbose };
}

function printHelp() {
  console.log(`
Usage: node scripts/auto-clean-artifacts.mjs [options]

Options:
  -t, --threshold-mb <number>  Threshold in MB before cleaning triggers (default: ${DEFAULT_THRESHOLD_MB})
  -f, --force                  Force clean regardless of current size
      --dry-run                Check size and report without removing files
  -v, --verbose                Show size breakdown of individual targets
  -h, --help                   Display this help message

Environment variables:
  AUTO_CLEAN_THRESHOLD_MB      Override default threshold (e.g. 500)
`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

async function getPathSize(targetPath) {
  try {
    const stats = await fsp.lstat(targetPath);
    if (!stats.isDirectory()) {
      return stats.size;
    }

    let total = 0;
    const entries = await fsp.readdir(targetPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(targetPath, entry.name);
      if (entry.isDirectory()) {
        total += await getPathSize(fullPath);
      } else if (entry.isFile()) {
        const fileStats = await fsp.lstat(fullPath).catch(() => null);
        if (fileStats) total += fileStats.size;
      }
    }
    return total;
  } catch {
    return 0;
  }
}

async function findPycacheDirs(dir, found = []) {
  try {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === 'node_modules' || entry.name === '.git') continue;

      const fullPath = path.join(dir, entry.name);
      if (entry.name === '__pycache__') {
        found.push(fullPath);
      } else {
        await findPycacheDirs(fullPath, found);
      }
    }
  } catch {
    // Ignore unreadable directories
  }
  return found;
}

async function findEphemeralFiles(dir) {
  const found = [];
  try {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile()) {
        if (EPHEMERAL_FILE_PATTERNS.some((pattern) => pattern.test(entry.name))) {
          found.push(path.join(dir, entry.name));
        }
      }
    }
  } catch {
    // Ignore
  }
  return found;
}

async function collectAllTargets() {
  const targets = [];

  // 1. Static artifact folders
  for (const rel of STATIC_TARGETS) {
    const absPath = path.join(REPO_ROOT, rel);
    if (fs.existsSync(absPath)) {
      targets.push(absPath);
    }
  }

  // 2. Python bytecode __pycache__ directories
  const pycacheDirs = await findPycacheDirs(REPO_ROOT);
  for (const dir of pycacheDirs) {
    targets.push(dir);
  }

  // 3. Root ephemeral logs
  const ephemeralFiles = await findEphemeralFiles(REPO_ROOT);
  for (const file of ephemeralFiles) {
    targets.push(file);
  }

  // Filter out protected paths
  return targets.filter((p) => !PROTECTED_PATHS.has(path.normalize(p)));
}

async function main() {
  const { thresholdMb, force, dryRun, verbose } = parseArguments();
  const thresholdBytes = thresholdMb * 1024 * 1024;

  const targets = await collectAllTargets();
  const sizeMap = new Map();
  let totalBytes = 0;

  for (const target of targets) {
    const size = await getPathSize(target);
    sizeMap.set(target, size);
    totalBytes += size;
  }

  if (verbose || dryRun) {
    console.log(`[auto-clean] Found ${targets.length} artifact targets:`);
    for (const [target, size] of sizeMap.entries()) {
      const rel = path.relative(REPO_ROOT, target);
      console.log(`  - ${rel}: ${formatBytes(size)}`);
    }
  }

  console.log(
    `[auto-clean] Cumulative artifact size: ${formatBytes(totalBytes)} (Threshold: ${thresholdMb} MB / ${formatBytes(thresholdBytes)})`
  );

  const shouldClean = force || totalBytes >= thresholdBytes;

  if (!shouldClean) {
    console.log('[auto-clean] Artifact size is within acceptable threshold. No cleanup needed.');
    return;
  }

  if (dryRun) {
    console.log(`[auto-clean] [DRY RUN] Would clean ${targets.length} targets freeing ${formatBytes(totalBytes)}.`);
    return;
  }

  const reason = force ? 'force flag specified' : 'size threshold exceeded';
  console.log(`[auto-clean] Initiating cleanup (${reason})...`);

  let removedCount = 0;
  for (const target of targets) {
    const rel = path.relative(REPO_ROOT, target);
    try {
      await fsp.rm(target, { recursive: true, force: true });
      removedCount++;
      if (verbose) {
        console.log(`  ✓ Removed ${rel}`);
      }
    } catch (err) {
      console.warn(`  ⚠ Failed to remove ${rel}: ${err.message}`);
    }
  }

  console.log(`[auto-clean] Successfully removed ${removedCount} target(s). Freed ${formatBytes(totalBytes)}.`);
}

main().catch((err) => {
  console.error('[auto-clean] Error during execution:', err);
  process.exit(1);
});
