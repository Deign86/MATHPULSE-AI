# Git Workflow

## Branch Purposes
- `main`: Production-ready branch. Protected. No direct pushes.
- `release/*`: Stabilization or release maintenance branches. Protected.
- `hotfix/*`: Urgent production fixes. Protected once created.
- `feature/*`, `fix/*`, `chore/*`: Regular development branches.

## Naming Convention
Use these branch prefixes:
- `feature/<short-description>`
- `fix/<short-description>`
- `hotfix/<short-description>`
- `chore/<short-description>`
- `release/<version-or-date>`

## Delivery Model
1. Branch from `main`.
2. Open a pull request.
3. Pass required CI checks.
4. Obtain required review approval(s).
5. Resolve all conversations.
6. Merge with squash merge.

## Merge Strategy
- Default: squash merge only.
- Rationale: cleaner history, easier rollback by PR, clearer release notes.

## Protected Branch Expectations
For `main` and release-critical branches:
- Pull request required before merge.
- At least 1 approval required.
- Required status checks must pass.
- Conversation resolution required.
- Linear history enabled.
- Force pushes blocked.
- Branch deletion blocked.
- Bypass limited to administrators only when intentionally needed.

## Hotfix Handling
1. Create `hotfix/<description>` from `main`.
2. Implement minimal fix.
3. Open PR to `main` and run full CI.
4. Merge via squash after review.
5. Backport to active `release/*` branch if needed.

## Local Validation Checklist
Run before opening PR:
- `npm run build`
- `npm test`
- `npm run check:backend`
- `npm --prefix functions run build`

## Large Session Safety: Auto-checkpoint
Use the guarded script during large unattended coding sessions:
- `npm run checkpoint:if-large`

Behavior:
- Triggers when tracked changed files meet threshold (default 18).
- Skips protected branches by default.
- Excludes secrets and build artifacts.
- Creates local checkpoint commit only.
- Never pushes automatically.
- Prevents immediate recursive checkpoint commits.

## Recovery Guidance
If a risky change set becomes unstable:
1. Create a new fix branch from the last good commit.
2. Cherry-pick only validated commits.
3. Re-run local and CI checks.
4. Open a new PR with clear rollback context.
