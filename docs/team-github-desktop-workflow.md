# Team GitHub Desktop Workflow

This guide is for teammates who only need four actions:

1. Pull
2. Edit
3. Commit
4. Push

The repository automation handles branch naming suggestions, labels, risk hints, and CI routing.

## Daily Flow (No Advanced Git Required)

1. Open GitHub Desktop.
2. Select the `MATHPULSE-AI` repository.
3. Click **Fetch origin** then **Pull origin**.
4. Create a branch from `main`.
5. Work on your files.
6. Commit with a short message.
7. Push branch.
8. Open Pull Request.
9. Read automation comments and follow the suggested next steps.

## Branch Naming: What Happens Automatically

When you push, **Branch Name Governor** analyzes changed files and suggests a normalized branch if needed.

Examples:
- `fix/teacher-facing-component-ui-fixes`
- `feature/student-dashboard-progress-cards`
- `refactor/admin-attendance-form-state`
- `docs/api-usage-instructions`

### Important Safety Rule

Branch renaming is **not** force-applied automatically.

Why:
- GitHub Desktop local branch rename and remote branch rename must stay coordinated.
- Silent remote rename can confuse teammates and break local tracking.

## Safe Replacement Branch Flow in GitHub Desktop

If automation says your branch should be renamed:

1. Create a new branch with the suggested name.
2. Ensure it starts from your current working branch (same commits).
3. Publish the new branch.
4. Open or update PR from the new branch.
5. Delete old branch only after confirming commits exist on new branch.

## What Automation Adds to Your PR

- Scope labels (frontend, backend, docs, teacher-ui, automation, etc)
- Risk labels (`risk-low`, `risk-medium`, `risk-high`)
- Recommended branch name
- Recommended commit title format
- Simple next-step checklist

## When to Ask for Help

Ask for help if:
- a workflow says high risk,
- branch suggestion looks wrong,
- CI fails and message is unclear,
- your branch appears out-of-date with `main`.

## Rules You Must Follow

- Do not push directly to `main`.
- Do not force-push protected branches.
- Do not auto-merge without review.
- Do not commit secrets.

## Quick Commands (Optional)

If you use terminal occasionally:

```bash
npm run suggest:branch
```

This prints suggested branch, labels, risk, and next steps from your current changes.
