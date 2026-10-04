# Testing & Verification Index

Single source of truth for how each layer is verified. Commands below mirror `.github/workflows/ci.yml`. Do not re-derive them by trial and error.

## Per-layer commands

| Layer | Command (cwd) | Env / notes | CI job |
|---|---|---|---|
| Frontend unit | `npm test -- --run` (repo root; `package.json` test is `vitest run --passWithNoTests`) | Node 22, `node_modules` installed | Frontend checks (`npm test -- --run`, then typecheck, lint, anti-slop, PWA build) |
| Frontend typecheck | `npm run typecheck` → `tsc --noEmit` (repo root) | Same as above | Frontend checks |
| Frontend lint | `npm run lint -- --max-warnings=0` → `eslint src` (repo root) | Same as above | Frontend checks |
| Frontend anti-slop | `npm run lint:anti-slop` → `oxlint --quiet` (repo root) | Exits nonzero on errors only; warnings are non-blocking | Frontend checks |
| Backend pre-check | `python backend/pre_deploy_check.py` (repo root) | Python 3.12 | Backend checks |
| Backend tests | `cd backend` then `python -m pytest tests/ -v --tb=short` with `PYTHONPATH=<repo>/backend` and UTF-8 mode | No servers/ports (starlette TestClient is in-process) | Backend checks |
| Backend targeted | `python -m pytest backend/tests/<file> -q` (repo root) | Same as above | — |
| Functions lint | `cd functions && npm run lint` (0 errors; 2 pre-existing axios `import/no-named-as-default-member` warnings are accepted) | Node 22, `functions/node_modules` installed | Firebase Functions checks |
| Functions build | `cd functions && npm run build` → `tsc` | Same as above | Firebase Functions checks + deploy predeploy |
| Functions tests | `cd functions && npm test` → build + `node --test "lib/**/*.test.js"` | No emulator tests in this repo (emulator-gated suites removed 2026-10-04; do not add new ones) — 0 failures expected | Validate Functions (deploy workflow); PR CI runs the same suite |
| E2E | `e2e list`, `e2e run [--max-failures N --workers 1] [files...]` (repo root, tester-army/e2e v0.16.0) | Needs: `E2E_USER_{STUDENT,TEACHER,ADMIN}_{USERNAME,PASSWORD}`, ports 5173/8000 free, backend on `:8000`, ChatGPT login serving the agent model (`e2e models openai` to check). Report: `.e2e/report.json` + `.e2e/artifacts/` | No CI job — manual only |

## Worktree setup (fresh worktrees have NO node_modules)

After `git worktree add`, before running any Node toolchain in the worktree:

```powershell
npm ci  # repo root of the worktree (and cd functions && npm ci if touching functions)
Test-Path -LiteralPath "node_modules\.bin\tsc"  # must be True before typecheck/lint/test
```

The system Python environment works across worktrees (no venv in this repo). Never run `npm run dev`, vite preview, emulators, or E2E suites in parallel lanes — browser automation and dev ports are exclusive to one lane at a time.

## CI triage recipe (PowerShell-safe)

```powershell
gh pr checks <n>                              # all checks for a PR
gh pr view <n> --json state,mergeable,mergeStateStatus
gh run list --workflow "<name>" --branch main --limit 5
gh run view --job <jobId> --log-failed        # failed-step logs only
```

Do NOT use `gh run view ... --json ... --jq ...` with inline quotes in PowerShell (`accepts at most 1 arg(s)`). Prefer `--log-failed` over full logs.

## Gate checks (unlazy `GATES.md`)

- Status only: `node <skill-dir>/scripts/gate-check.mjs GATES.md --status` (read-only; never executes CHECK lines).
- Full mode EXECUTES every `CHECK:` line — dangerous when a CHECK runs a test suite (e.g. `npx e2e run` timed out a batch). Prefer targeted runs, or mark outcomes ABANDONED with reason instead of executing expensive gates.
- The pre-commit hook verifies `GATES.md`; prose edits are safe, gate checkboxes must reflect actually-run evidence.

## Frontend test hygiene (`src/test-setup.ts`)

- The global setup spies on Firebase SDK namespaces (`getAuth`, Firestore fns, …) via `vi.spyOn` so no real app initializes. These spies live for the whole test file.
- NEVER call `vi.restoreAllMocks()` in a test file that needs Firebase behavior afterwards — it restores the setup spies to the real SDK mid-file (e.g. real `getAuth()` then throws "No Firebase App", failing all later tests in that file). Prefer `vi.unstubAllGlobals()` for `stubGlobal` cleanup and `mockReset()`/`mockClear()` on your own spies.
- Follow the established pattern: `vi.spyOn` service boundaries (never `vi.mock` modules — the anti-slop `no-module-mocking` rule rejects it), `// SAFETY:` before any type assertion.
