# Gates: TESTING.md worktree install matches CI

Scope: TESTING.md's worktree setup said plain `npm ci`, which fails with ERESOLVE in a fresh worktree (2026-10-13). Change it to `npm ci --legacy-peer-deps` for the root and `functions/`, as every CI install does, and say that the pre-commit hook's `npx oxlint --quiet` needs the worktree's node_modules. TESTING.md is the only content change; this file is the Unlazy ledger.

Post-commit checks (a commit cannot gate its own PR): the PR from `docs/testing-legacy-peer-deps` into main is open, and its CI checks pass. Verified after the push and reported on the PR and in chat.

- [x] G1: TESTING.md tells agents to install the worktree root with `npm ci --legacy-peer-deps` (ci.yml:61, deploy-frontend.yml:49, release-android.yml:47)
  CHECK: git grep -n -F "npm ci --legacy-peer-deps  # repo root of the worktree" -- TESTING.md
  EXPECT: /TESTING\.md:\d+:npm ci --legacy-peer-deps  # repo root of the worktree/
  EVIDENCE: TESTING.md:26:npm ci --legacy-peer-deps  # repo root of the worktree (and cd functions && npm ci --legacy-peer-deps if touching functions)

- [x] G2: The functions install in TESTING.md matches its CI step (`npm ci --legacy-peer-deps` under `working-directory: functions` at ci.yml:156, deploy-functions.yml:40 and :67)
  CHECK: git grep -n -F "cd functions && npm ci --legacy-peer-deps" -- TESTING.md
  EXPECT: /TESTING\.md:\d+:.*cd functions && npm ci --legacy-peer-deps/
  EVIDENCE: TESTING.md:26:npm ci --legacy-peer-deps  # repo root of the worktree (and cd functions && npm ci --legacy-peer-deps if touching functions)

- [x] G3: No `npm ci` without `--legacy-peer-deps` is left in TESTING.md or any workflow
  CHECK: git grep -n -P "npm ci(?! --legacy-peer-deps)" -- TESTING.md .github/workflows || echo NO_BARE_NPM_CI
  EXPECT: /^\s*NO_BARE_NPM_CI\s*$/
  EVIDENCE: NO_BARE_NPM_CI

- [x] G4: TESTING.md says to install before committing from a worktree, because the pre-commit hook runs `npx oxlint --quiet`, which needs `oxlint` and `@oxlint/plugins` from the worktree's node_modules
  CHECK: git grep -n -e "before running any Node toolchain or committing" -e "npx oxlint --quiet" -- TESTING.md
  EXPECT: /committing in the worktree[\s\S]*pre-commit[\s\S]*npx oxlint --quiet[\s\S]*@oxlint\/plugins/
  EVIDENCE: TESTING.md:23:After `git worktree add`, before running any Node toolchain or committing in the worktree: | TESTING.md:32:Commits from a worktree run the main checkout's pre-commit hook (`.git/hooks/pr

- [x] G5: The ERESOLVE cause cited in TESTING.md matches package-lock.json: `@capacitor-firebase/authentication` 7.5.0 has optional peer `firebase@^11.2.0` (lines 290-310); the installed firebase is 12.12.1 (line 8562)
  CHECK: git grep -n -E "firebase.: .\^11\.2\.0|firebase-12\.12\.1\.tgz" -- package-lock.json
  EXPECT: /package-lock\.json:306:\s+"firebase": "\^11\.2\.0"[\s\S]*firebase-12\.12\.1\.tgz/
  EVIDENCE: package-lock.json:306:        "firebase": "^11.2.0" | package-lock.json:8563:      "resolved": "https://registry.npmjs.org/firebase/-/firebase-12.12.1.tgz",

- [x] G6: Both documented installs exit 0 in this fresh worktree (no node_modules at the root or in functions/ beforehand)
  EVIDENCE: `ls -d node_modules functions/node_modules` before the runs -> both "No such file or directory"; root `npm ci --legacy-peer-deps` -> "added 812 packages, and audited 813 packages in 1m", exit=0 (69 s); `cd functions && npm ci --legacy-peer-deps` -> "added 463 packages, and audited 464 packages in 1m", exit=0 (76 s, run concurrently); no ERESOLVE or "npm error" line in either log

- [x] G7: The doc's post-install check passes for both installs
  CHECK: powershell -NoProfile -Command "Test-Path -LiteralPath 'node_modules\.bin\tsc'; Test-Path -LiteralPath 'functions\node_modules\.bin\tsc'"
  EXPECT: /True\s+True/
  EVIDENCE: True | True

- [x] G8: The pre-commit hook's lint step runs clean from this worktree's node_modules
  CHECK: npx oxlint --quiet 2>NUL && echo HOOK_OXLINT_OK: npx oxlint --quiet exited 0
  EXPECT: HOOK_OXLINT_OK
  EVIDENCE: HOOK_OXLINT_OK: npx oxlint --quiet exited 0

- [x] G9: TESTING.md is the only content change (plus this ledger)
  CHECK: git status --porcelain 2>NUL
  EXPECT: /^ M GATES\.md\r?\n M TESTING\.md\s*$/
  EVIDENCE: M GATES.md | M TESTING.md

- [x] G10: The added prose names no LLM provider or model and has no filler
  EVIDENCE: `.agents/skills/anti-slop/scripts/detect_slop.py --verbose` on the 4 non-blank added lines (`git diff -U0 TESTING.md`) -> "Overall Slop Score: 0/100"; read-through: they name only npm, ERESOLVE, @capacitor-firebase/authentication, firebase, the pre-commit hook paths, oxlint and @oxlint/plugins

- [x] G11: Without the flag the root install fails with ERESOLVE, as TESTING.md now says (reproduced, not taken on report)
  EVIDENCE: scratch copy of package.json + package-lock.json (no node_modules), `npm ci --dry-run` -> "npm error code ERESOLVE" / "While resolving: @capacitor-firebase/authentication@7.5.0" / "Found: firebase@12.12.1" / "peerOptional firebase@"^11.2.0" from @capacitor-firebase/authentication@7.5.0"; same copy, `npm ci --legacy-peer-deps --dry-run --ignore-scripts` -> exit=0 (scripts skipped because the copy lacks scripts/setup-git-hooks.mjs, which `prepare` runs)
