# Contributing to MathPulse AI

Thanks for contributing to MathPulse AI. This repository is designed for teammates who mostly use GitHub Desktop and keep Git commands minimal.

If you can do pull, edit, commit, and push, the automation in this repo handles the rest.

## Workflow Summary
1. Pull latest changes.
2. Create or use a working branch in GitHub Desktop.
3. Edit files and commit.
4. Push branch.
5. Open a PR.
6. Read automation comments and follow suggested next steps.
7. Merge with squash merge after approvals and checks.

Detailed non-expert guide: `docs/team-github-desktop-workflow.md`.
Live demo walkthrough: `docs/automation-demo-scenario.md`.

## Branch Naming Conventions
Preferred prefixes:
- `feature/<short-description>`
- `fix/<short-description>`
- `refactor/<short-description>`
- `docs/<short-description>`
- `hotfix/<short-description>`
- `chore/<short-description>`
- `release/<version-or-date>`

Examples:
- `feature/teacher-risk-insights-panel`
- `fix/chat-stream-regression`
- `hotfix/api-timeout-guard`

If your branch name is vague or non-compliant, the **Branch Name Governor** workflow comments with a normalized suggestion.

Important: branch rename is not forced automatically, because GitHub Desktop + remote coordination can break if done unsafely.
Use the suggested replacement-branch flow from the workflow comment.

## Commit Convention
Use Conventional Commits:
- `feat:` new features
- `fix:` bug fixes
- `chore:` maintenance and repository tasks
- `docs:` documentation changes
- `refactor:` internal code changes without behavior changes
- `test:` test-only changes
- `build:` build tooling or dependency changes
- `ci:` CI workflow changes

Examples:
- `feat: add class-level mastery filter in dashboard`
- `fix: prevent quiz generation retry loop`
- `ci: add pull request quality gate workflow`

If commit naming is weak, automation suggests a safe commit title format in PR comments and workflow summaries.

## Local Setup
1. Install dependencies:
   - `npm install`
   - `pip install -r backend/requirements-dev.txt`
   - `npm --prefix functions install`
2. Create environment config from examples:
   - `.env.local`
   - `backend/config/env.sample` values as needed

## Required Local Validation
Run these before pushing:
- `npm run build`
- `npm test`
- `npm run check:backend`
- `npm --prefix functions run build`

Optional local branch suggestion:
- `npm run suggest:branch`

This command analyzes changed files and prints:
- suggested normalized branch name,
- inferred scope,
- suggested labels,
- risk level,
- recommended next steps.

## Pull Request Requirements
- Use the PR template and fill every required section.
- Reference related issues where possible.
- Include testing evidence and risk notes.
- Resolve all review conversations before merge.
- Do not push directly to protected branches.

## Automation You Should Expect
When you push or update a PR, GitHub Actions will automatically:
- infer changed area (frontend, teacher UI, backend, functions, docs, workflow/config),
- suggest a normalized branch name when needed,
- suggest a Conventional Commit title if needed,
- apply scope and risk labels on PRs,
- post plain-language "what to do next" instructions.

Agent integrations are documented in `docs/ai-agent-github-integration.md`.

## Merge Strategy
- Default merge strategy is squash merge.
- Keep PRs focused and reviewable.
- Prefer one logical change per PR.

## Protected Branch Safety
- Never push directly to `main`.
- Never force-push to protected branches.
- Never auto-merge without review.
- Never bypass branch protections except intentional admin emergency procedure.

## Safe Auto-checkpoint for Large Sessions
This repo includes a guarded checkpoint script for long unattended work sessions:
- Run with `npm run checkpoint:if-large`
- Default trigger threshold: 18 tracked changed files
- Never runs on protected branches by default (`main`, `master`, `develop`, `release/*`, `hotfix/*`)
- Never auto-pushes
- Skips secret-sensitive and build artifact files
- Prevents immediate recursive checkpoint commits

Useful overrides:
- `CHECKPOINT_THRESHOLD=25 npm run checkpoint:if-large`
- `CHECKPOINT_DISABLED=1 npm run checkpoint:if-large`
- `npm run checkpoint:if-large -- --dry-run`

## AI Agent Dispatch Quick Start
Use this when an agent should trigger repository automation explicitly:

1. Trigger repository dispatch event with one of:
- `agent.code_change`
- `agent.ui_fix`
- `agent.repo_standardization`
- `agent.bug_audit`
- `agent.docs_update`
- `agent.release_prep`

2. Include payload fields:
- `agent_name`
- `task_type`
- `scope`
- `branch`
- `paths` (array)
- `requires_ci` (boolean)
- `requires_review` (boolean)

3. Workflows that consume this:
- `.github/workflows/agent-dispatch.yml`
- `.github/workflows/branch-name-governor.yml`
- `.github/workflows/ai-change-audit.yml`

## Security and Secrets
- Never commit `.env` files, service account keys, tokens, or private keys.
- Use GitHub Secrets, Firebase Secret Manager, or environment-specific secret stores.
- Review `SECURITY.md` for responsible disclosure.
