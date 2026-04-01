# Contributing to MathPulse AI

Thanks for contributing to MathPulse AI. This repository uses PR-based delivery with branch protections and CI checks.

## Workflow Summary
1. Create a branch from `main` using the naming conventions below.
2. Make focused changes and keep commits atomic.
3. Run local validation before opening a PR.
4. Open a PR to `main` (or to `release/*` for release maintenance).
5. Address review comments and ensure required checks pass.
6. Merge with squash merge after approval.

## Branch Naming Conventions
Use one of the following prefixes:
- `feature/<short-description>`
- `fix/<short-description>`
- `hotfix/<short-description>`
- `chore/<short-description>`
- `release/<version-or-date>`

Examples:
- `feature/teacher-risk-insights-panel`
- `fix/chat-stream-regression`
- `hotfix/api-timeout-guard`

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

## Pull Request Requirements
- Use the PR template and fill every required section.
- Reference related issues where possible.
- Include testing evidence and risk notes.
- Resolve all review conversations before merge.
- Do not push directly to protected branches.

## Merge Strategy
- Default merge strategy is squash merge.
- Keep PRs focused and reviewable.
- Prefer one logical change per PR.

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

## Security and Secrets
- Never commit `.env` files, service account keys, tokens, or private keys.
- Use GitHub Secrets, Firebase Secret Manager, or environment-specific secret stores.
- Review `SECURITY.md` for responsible disclosure.
