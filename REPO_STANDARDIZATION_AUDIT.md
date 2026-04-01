# Repo Standardization Audit

## Current State
- Repository had deployment automation in `.github/workflows/deploy-hf.yml`, but no reusable PR template, no issue templates, no CODEOWNERS file, no `CONTRIBUTING.md`, and no `SECURITY.md`.
- Branch inventory confirmed via GitHub MCP (`mcp_github_github_list_branches`) shows `main` exists and is currently not protected (`protected: false`).
- No `develop`, `release/*`, or `hotfix/*` branches currently exist on origin.
- Existing checks were deployment-focused; there was no dedicated PR CI workflow covering frontend, backend, and functions as required status checks.
- Existing Firebase Functions lint currently reports legacy `no-constant-condition` violations in source files, so lint was not promoted to a required blocking check in this standardization pass.
- No shared, versioned auto-checkpoint mechanism existed for large unattended coding sessions.

## Implemented in Repository
- Added `.github/PULL_REQUEST_TEMPLATE.md`.
  - Why: Standardize PR quality, test evidence, and delivery checklist.
- Added `.github/ISSUE_TEMPLATE/bug_report.yml` and `.github/ISSUE_TEMPLATE/feature_request.yml`.
  - Why: Standardize intake quality and triage metadata.
- Added `.github/CODEOWNERS` with `@Deign86` as default owner.
  - Why: Enforce review ownership routing from the base branch.
- Added `CONTRIBUTING.md`.
  - Why: Define branch naming, Conventional Commits, local checks, and PR workflow.
- Added `SECURITY.md`.
  - Why: Define vulnerability reporting and secret handling policy.
- Added `.github/workflows/ci.yml`.
  - Why: Introduce PR-safe CI checks with practical, existing commands.
  - Jobs: `ci-frontend`, `ci-backend`, `ci-functions`.
- Added `docs/git-workflow.md`.
  - Why: Document protected-branch delivery model, squash strategy, and hotfix flow.
- Added `scripts/checkpoint-if-large.mjs`.
  - Why: Guarded local auto-checkpoint for large tracked change sets.
- Updated `package.json`.
  - Added script: `checkpoint:if-large`.

## Implemented via GitHub Settings / MCP
- GitHub MCP was used to inspect repository context and branch state:
  - Authenticated actor confirmed via `mcp_github_github_get_me`.
  - Branch list and protection flags confirmed via `mcp_github_github_list_branches`.
- No repository settings or rulesets were applied through MCP because the currently exposed MCP tool surface does not include repository settings/ruleset mutation endpoints in this environment.
- Result: GitHub-side protections and merge/repo settings remain manual follow-up actions.

## Manual GitHub Follow-up Required
- Configure rulesets (preferred over legacy branch protection):
  1. GitHub UI path: `Repository Settings` -> `Rules` -> `Rulesets` -> `New ruleset` -> `Branch ruleset`.
  2. Create ruleset for `main` with:
     - Require pull request before merge
     - Require approvals: 1
     - Require conversation resolution
     - Require status checks: `ci-frontend`, `ci-backend`, `ci-functions`
     - Require linear history
     - Block force pushes
     - Block deletions
     - Restrict bypass (no broad bypass; admins only if intentionally needed)
  3. Create additional rulesets (when branches exist) for `release/*` and `hotfix/*` with the same controls as `main`.
  4. `develop` ruleset only if a `develop` branch is created; use at least 1 approval and required checks.
- Configure merge behavior:
  1. GitHub UI path: `Repository Settings` -> `General` -> `Pull Requests`.
  2. Enable `Allow squash merging`.
  3. Disable `Allow merge commits` and `Allow rebase merging` to enforce squash-only policy.
- Enable automatic branch cleanup:
  1. GitHub UI path: `Repository Settings` -> `General` -> `Pull Requests`.
  2. Enable `Automatically delete head branches`.
- Optional hardening (deferred):
  - Signed commits requirement for protected branches after contributor signing setup is complete.
  - Required deployments before merge when environment-based deployments are formalized.

## Recommended Branch Strategy
- `main`: production-ready branch; no direct push.
- `release/*`: release stabilization and patch line.
- `hotfix/*`: urgent production fixes with shortest safe cycle.
- `feature/*`, `fix/*`, `chore/*`: regular development work.
- Naming conventions:
  - `feature/...`
  - `fix/...`
  - `hotfix/...`
  - `chore/...`
  - `release/...`
- Merge strategy: squash merge only.
- Hotfix handling: branch from `main`, PR back to `main`, then backport to active `release/*` if applicable.

## Recommended Merge Controls
- PR reviews:
  - Minimum approvals: 1 (current repo/team scale decision).
- Status checks:
  - Require `ci-frontend`, `ci-backend`, `ci-functions`.
- Conversation resolution:
  - Required before merge.
- Linear history:
  - Required on protected branches.
- Bypass policy:
  - No broad bypass.
  - Keep bypass restricted to admins only when explicitly necessary.

## Auto-checkpoint Workflow
- Trigger threshold:
  - Default `18` safe tracked changed files.
  - Configurable via `CHECKPOINT_THRESHOLD` or `--threshold`.
- Which files are counted:
  - Tracked staged and unstaged files from git diff (not untracked-only files).
- Which files are excluded:
  - `.env*`, service account key files, key/cert-like material, common secret/credentials paths.
  - Build and generated artifacts (`build/`, `dist/`, `out/`, `functions/lib/`, `node_modules/`, temp/cache paths).
  - Log files.
- Loop prevention strategy:
  - Skip when last commit message already starts with `chore(checkpoint): auto-save large change set`.
  - `CHECKPOINT_IN_PROGRESS` guard prevents recursive re-entry.
- Protected branch safety:
  - Skips by default on `main`, `master`, `develop`, `release/*`, `hotfix/*`.
  - Can be overridden intentionally with `--allow-protected`.
- Why auto-push is disabled:
  - Prevents unintended remote history updates during unattended sessions.
  - Keeps checkpointing as a local safety net only.
- Safe usage notes:
  - Run manually: `npm run checkpoint:if-large`.
  - Dry-run support: `npm run checkpoint:if-large -- --dry-run`.
  - Disable globally in a session: `CHECKPOINT_DISABLED=1`.

## Follow-up Items
- Add frontend lint/typecheck scripts, then enforce them in CI and required checks.
- Resolve existing Firebase Functions lint violations, then add lint back as a required CI gate.
- Add CODEOWNERS path-level splits if team expands beyond a single owner.
- Add branch environment deployment checks and require successful deployment before merge once environments are formalized.
- Add release automation (tagging/changelog) after branch protection baseline is active.
