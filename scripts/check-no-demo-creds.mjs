#!/usr/bin/env node
/**
 * Build grep gate for issue #156.
 * Fails the build pipeline if credential material leaked into the shipped
 * bundle (e.g. hardcoded demo passwords in the LoginPage chunk).
 * Scans text assets under build/ for banned literals; exit 0 = clean.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BUILD_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "build");
const BANNED = ["TestPass123"];
const SCAN_EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".html", ".json", ".txt"]);

const hits = [];

function scanFile(path, relative) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return;
  }
  for (const needle of BANNED) {
    if (text.includes(needle)) hits.push(`${relative}: contains banned literal (${needle.length} chars masked)`);
  }
}

function walk(dir, relative = "") {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = relative === "" ? entry : `${relative}/${entry}`;
    if (statSync(full).isDirectory()) {
      walk(full, rel);
    } else if (SCAN_EXTENSIONS.has(extname(entry))) {
      scanFile(full, rel);
    }
  }
}

try {
  walk(BUILD_DIR);
} catch (err) {
  console.error(`[check:no-demo-creds] cannot scan build output: ${err.message}`);
  console.error("[check:no-demo-creds] run `npm run build` first.");
  process.exit(2);
}

if (hits.length > 0) {
  console.error("[check:no-demo-creds] FAIL — credential material found in build/:");
  for (const hit of hits) console.error(`  - ${hit}`);
  process.exit(1);
}
console.log("[check:no-demo-creds] PASS — no credential literals in build/.");
