# Repo Automation Audit

## Team Reality
- Team flow is mostly pull, edit, commit, push with GitHub Desktop.
- Branch naming, commit naming, and PR hygiene are inconsistent in daily use.
- GitHub Desktop supports branch creation and publishing, but branch renaming still requires explicit coordination between local and remote.
- Local Git hooks are clone-local and cannot be treated as enforceable team policy.
- Team needs GitHub-side automation to provide safety and guidance with minimal Git expertise.

## Implemented Automation
- Added `config/change-scope-map.json`.
- Added `scripts/suggest-branch-name.js`.
- Added `.github/workflows/branch-name-governor.yml`.
- Added `.github/workflows/ai-change-audit.yml`.
- Added `.github/workflows/agent-dispatch.yml`.
- Updated `.github/workflows/ci.yml` to support `workflow_dispatch` with scope-selective CI lanes.
- Updated `.github/PULL_REQUEST_TEMPLATE.md` for automation-aware PR context.
- Updated `.github/CODEOWNERS` with additional area-level patterns.
- Updated `.github/ISSUE_TEMPLATE/bug_report.yml` and `.github/ISSUE_TEMPLATE/feature_request.yml` with automation metadata inputs.
- Updated `CONTRIBUTING.md` for GitHub Desktop-first collaboration.
- Added `docs/team-github-desktop-workflow.md`.
- Added `docs/ai-agent-github-integration.md`.

What each automation does:
- `suggest-branch-name.js`: infers scope, branch type, labels, CI targets, risk level, and suggested conventional commit title from changed files and context.
- `branch-name-governor.yml`: posts branch compliance and normalized-branch recommendation with safe replacement-branch instructions.
- `ai-change-audit.yml`: applies inferred labels, adds risk labels, requests review when applicable, and posts plain-language next actions.
- `agent-dispatch.yml`: validates agent payload contract, produces analysis, triggers CI dispatch, and routes manual dispatch fan-out.
- `ci.yml` dispatch routing: allows agent-triggered/manual CI runs with frontend/backend/functions targeting.

## Branch Naming Automation
- Branch names are inferred from deterministic path + keyword scope mapping in `config/change-scope-map.json`.
- Type inference supports `feature/`, `fix/`, `refactor/`, `docs/`, `chore/`, `hotfix/`.
- Slug generation combines dominant scope tokens, path tokens, summary hints, and optional inferred issue number.
- Validation checks:
- allowed regex pattern,
- generic branch-name detection,
- protected branch pattern awareness.

What is fully automated:
- Branch compliance detection.
- Suggested normalized branch generation.
- Branch normalization report in workflow summary and PR comment.

What is suggestion-only:
- Replacement branch creation instructions for GitHub Desktop users.
- Suggested conventional commit title.

What requires manual coordination:
- Any actual branch rename or replacement-branch migration.
- Deleting legacy branch after confirming commits on replacement branch.

## AI Agent Integration
- Supported dispatch events:
- `agent.code_change`
- `agent.ui_fix`
- `agent.repo_standardization`
- `agent.bug_audit`
- `agent.docs_update`
- `agent.release_prep`

Payload contract:
- `agent_name`
- `task_type`
- `scope`
- `branch`
- `paths` (array or parsable text)
- `requires_ci` (boolean)
- `requires_review` (boolean)
- `pull_request_number` (optional)

How agents trigger workflows:
- `repository_dispatch` for direct automation events.
- `workflow_dispatch` for operator/manual dispatch with equivalent contract inputs.
- `agent-dispatch.yml` validates payload and dispatches routeable CI.

Safety controls:
- No protected-branch auto-push behavior.
- No auto-merge behavior.
- No review bypass behavior.
- Branch rename remains advisory/replacement-flow only.
- Workflow permissions are limited to required scopes.

## GitHub Settings Applied
- GitHub MCP inspection completed with authenticated actor `Deign86`.
- GitHub MCP branch inventory retrieved for `Deign86/MATHPULSE-AI` and protection flags checked.
- Confirmed `main` currently reports `protected: false` from MCP branch listing.

Settings/rules applied through GitHub MCP:
- No settings/rules mutation was applied because the available MCP tool surface in this session does not expose repository settings/ruleset mutation endpoints.

## Manual GitHub Follow-up
- Configure branch protection/rulesets in GitHub UI:
- protect `main` (and `release/*`, `hotfix/*` when present),
- require PR before merge,
- require 1+ approvals,
- require conversation resolution,
- require status checks: `ci-frontend`, `ci-backend`, `ci-functions`,
- block force pushes and branch deletion,
- enable linear history.
- Enable automatic delete head branches after merge.
- Enforce merge strategy restrictions (squash-only).
- Confirm Actions permissions policy aligns with repository security posture.
- Optionally pre-create labels used by automation to avoid first-run creation races.

## Safe Usage Rules
- Users should:
- work from non-protected branches,
- follow workflow suggestions for branch normalization,
- use PR flow and review comments as the source of next steps,
- verify replacement branch before deleting old branch.

- Users should not:
- push directly to protected branches,
- force-rename shared remote branches,
- bypass PR review and required checks,
- auto-merge risky changes.

Protected branch behavior:
- Keep `main` and release-critical branches protected.
- Keep merge through PR with required checks and approvals.

Branch rename caveats:
- Rename is partially automatable in GitHub APIs but still requires local coordination in GitHub Desktop clones.
- This implementation intentionally uses suggestion-first and replacement-branch flow to avoid branch tracking breakage.

## Follow-up Improvements
- Add explicit branch-name policy status check as required after team adoption period.
- Add optional commit-message lint as warning-first then enforce when team is ready.
- Add richer path-to-owner mapping when additional reviewers join.
- Add release-prep workflow for changelog/tag draft automation.
- Add dashboard metrics for branch-compliance and PR hygiene trends.
