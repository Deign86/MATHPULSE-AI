import { copyFileSync, existsSync, chmodSync } from "node:fs";
import { resolve } from "node:path";

const source = resolve("scripts/git-hooks/pre-commit");
const destination = resolve(".git/hooks/pre-commit");

if (existsSync(".git/hooks")) {
  copyFileSync(source, destination);
  try {
    chmodSync(destination, 0o755);
  } catch (_) {}
  console.log("Anti-slop pre-commit hook installed to .git/hooks/pre-commit");
} else {
  console.log("No .git directory found; skipping hook copy.");
}