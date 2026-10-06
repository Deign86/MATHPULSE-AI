# QA merge plan — PRs 196 → 195 → 197 onto main

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.
> One lane at a time, strictly sequential. Each lane works ONLY in its qa worktree
> (`.worktrees/qa-jerrick`, `.worktrees/qa-ellijah`, `.worktrees/qa-marcus`).
> Never work in the main checkout. Never `git add -A`; add explicit paths only.

**Goal:** Rebase, reconcile, verify, and merge PRs 196, 195, 197 onto main with zero regressions.

**Architecture:** Sequential rebase of each QA branch onto current `origin/main`,
conflicts resolved per the binding contract (not "last wins"), full TESTING.md
verification in-lane, `gh pr merge --merge` only on fresh green checks + MERGEABLE.

**Tech Stack:** React 18 + TS + Vite, FastAPI, Firebase Functions Node 22, Firestore/RTDB.

**Spec:** `docs/superpowers/plans/2026-10-06-qa-merge-contract.md` (binding) + `TESTING.md` (commands).

## Global Constraints

- Merge order is 196 → 195 → 197. Lane N+1 starts only after lane N's PR is merged.
- Contract file decisions override any branch content; losers are dropped/adapted, never stacked.
- `ROLE_POLICIES` (`backend/main.py:404–492`) stays byte-identical unless a lane proves a test demands otherwise.
- Never broaden `firestore.rules` to accommodate a client path.
- GATES.md conflicts: always keep main's committed version (never working-copy files).
- main's English-only LLM policy + profile refresh (`App.tsx:833`) are preserved in every lane.
- E2E/dev servers/emulators never run in lanes (ports exclusive); CI + TESTING.md suites are the evidence.

## Review Focus

- A rebased branch whose CI is green but whose contract losers were stacked instead of dropped.
- A "passing" test that encodes a losing contract (must be rewritten, not kept).
- A conflict resolved by keeping both implementations (duplicate throttle/normalization paths).
- Firestore rule mismatch that only fails at runtime (risk-write, legacy-LRN queries).
- PWA build green but `/api` unproxied in prod (build ≠ deployed API proof; keep `env.ts` fail-closed).

## Lanes

### Lane 1 — Rebase + reconcile + merge PR 196 (qa/jerrick, cb54b4cb, 2 commits)

Worktree: `.worktrees/qa-jerrick`. Base: current `origin/main`.
1. `git fetch origin`; `git status --short` clean (stash nothing — worktree must be clean; report if dirty); rebase `qa/jerrick` onto `origin/main`, resolving per contract (196-relevant: throttle DROP J variant, quiz-cap 12, calendar DROP J fields, telemetry DROP J schema, quiz-maker J WINS, loading/back J WINS, analytics J WINS, admin-users J WINS, GATES.md keep main's).
2. `npm ci` at worktree root (and `functions` if touched); verify `node_modules/.bin/tsc` exists.
3. Run ALL of: `npm test -- --run`, `npm run typecheck`, `npm run lint -- --max-warnings=0`, `npm run lint:anti-slop`, `python backend/pre_deploy_check.py`, `python -m pytest backend/tests/ -q` (repo root, UTF-8), `cd functions && npm run lint && npm run build && npm test`.
4. Rewrite any test asserting a losing contract (J prompt-string assertion → contract §9; telemetry tests → §4). Keep J's pinned winners (quiz-maker 5/topics/title, retry/back, rollback tests).
5. Commit (explicit paths), `git push --force-with-lease origin qa/jerrick`.
6. Evidence: `gh pr checks 196` all SUCCESS/SKIPPED, `gh pr view 196 --json mergeable,mergeStateStatus` MERGEABLE + CLEAN, `git diff --stat origin/main...qa/jerrick` shows contract losers absent.
7. Merge: `gh pr merge 196 --merge`. Verify `git ls-remote origin main` advanced and PR state MERGED.

### Lane 2 — Rebase + reconcile + merge PR 195 (qa/ellijah, fadf55d, 3 commits)

Worktree: `.worktrees/qa-ellijah`. Base: `origin/main` AFTER lane 1's merge.
Same steps 1–7 with 195 contract facets: throttle DROP E variant, quiz-cap 12 (E wins),
calendar E WINS, telemetry E WINS, duplicate-import E contract + placement fix (persistence
must follow validation), class-record E placement fix, drop E legacy-LRN queries +
graded-only retake bypass + unconditional practice flag + separate subject override map;
keep E's latest-attempt average, submission assignmentId, rollback tests, PDF validator.
Re-verify the full suite (main moved under it). Merge `gh pr merge 195 --merge`.

### Lane 3 — Rebase + reconcile + merge PR 197 (qa/marcus, 9a311bca, 4 commits)

Worktree: `.worktrees/qa-marcus`. Base: `origin/main` AFTER lane 2's merge.
Same steps 1–7 with 197 contract facets: throttle M WINS (auth-UID 60/60 + IP fallback),
quiz-cap 12, calendar keep M date validation only, telemetry DROP M schema, drop M 409 +
student risk-write + LRN-only ModulesPage call + `progress.dailyStreak` + second retry
state + LessonViewer history listener; keep M first-response guidance (§9), preview-count
behavior, request-title persistence, class selector, synthetic-trajectory removal,
firebaseStoragePath helper (+`quiz_pdfs/` prefix check). Merge `gh pr merge 197 --merge`.

### Lane 4 — Final verification on main

1. `git fetch origin`; main HEAD == third merge commit; all three PRs state MERGED.
2. `gh pr checks 195/196/197` green-on-merge (or main CI run green:
   `gh run list --workflow "Repository CI" --branch main --limit 3`).
3. Spot-check survivors: `ROLE_POLICIES` intact, `env.ts` fail-closed intact,
   single chat throttle (auth-UID), single telemetry schema, no `scoreRiskStatus`.
4. Report: SHAs, per-lane verification summary, rulings carried.

## Rulings (orchestrator)

- No `gates/merge-*.md` files: their CHECK lines would execute in the pre-commit hook
  on every lane commit; lane acceptance lives here (status log) + lane reports. Cost if
  wrong: less machine-checking; mitigated by reviewer per lane + lane 4.
- No sdd-workspace script (bash-only, PowerShell host): progress = this status log +
  todowrite. Cost if wrong: recovery after compaction uses git log + this file.
- Merge method `--merge` matches repo precedent (#193). Cost if wrong: history shape only.

## Status log

- 2026-10-06: plan + contract written; guard commit (.gitignore .worktrees/, GATES.md verdict) pending push. Lane 1 not started.
