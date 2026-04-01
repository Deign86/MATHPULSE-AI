# Automation Demo Scenario

Use this scripted walkthrough to demo the collaboration automation to your team in about 10 minutes.

## Demo Goal

Show that a teammate with minimal Git knowledge can:
- push from a weak branch name,
- get automatic branch normalization guidance,
- receive scope/risk labels and next steps,
- and let an AI agent trigger the right workflows with structured metadata.

## Scenario A: GitHub Desktop teammate flow

### Story
A design lead edits teacher-facing UI and pushes from a vague branch name: `my-branch`.

### Simulated changes
- `src/components/TeacherDashboard.tsx`
- `src/components/TeacherAnalytics.tsx`

### Local preview command
Run this before opening a PR to preview what automation will infer:

```bash
$env:CHANGED_FILES_JSON='["src/components/TeacherDashboard.tsx","src/components/TeacherAnalytics.tsx"]'; node scripts/suggest-branch-name.js --branch "my-branch" --summary "teacher dashboard ui fixes"; Remove-Item Env:CHANGED_FILES_JSON
```

### Expected inference (from current implementation)
- Current branch compliant: `false`
- Suggested branch: `fix/teacher-ui-frontend-dashboard-tsx-fixes-analytics`
- Matched scopes: `teacher-ui`, `frontend`
- Labels: `frontend`, `teacher-ui`, `design`
- CI targets: `frontend`
- Risk level: `medium`
- Suggested commit title: `fix: teacher ui frontend dashboard tsx fixes analytics`

### What to do in GitHub Desktop
1. Create a new branch named `fix/teacher-ui-frontend-dashboard-tsx-fixes-analytics`.
2. Publish the new branch.
3. Open PR from the new branch.
4. Keep old branch only until you confirm all commits are on the new branch.

### What appears automatically on PR
- Branch Name Governor comment:
- branch compliance
- suggested normalized branch
- safe replacement-branch instructions
- AI Change Audit comment:
- inferred scope
- risk level
- labels applied
- plain-language next steps

## Scenario B: AI agent dispatch flow

### Story
An agent performs a UI fix and should trigger branch/risk intelligence and CI without manual workflow decisions.

### Example event
`agent.ui_fix`

### Example payload
See `docs/examples/agent-ui-fix-dispatch.json`.

### Dispatch command

```bash
curl -L -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/repos/Deign86/MATHPULSE-AI/dispatches \
  -d @docs/examples/agent-ui-fix-dispatch.json
```

### Expected workflow behavior
- `agent-dispatch.yml`
- validates payload
- computes branch/scope intelligence
- dispatches `ci.yml` with target lanes based on inferred scope
- `branch-name-governor.yml`
- posts normalization summary guidance
- `ai-change-audit.yml`
- applies labels and risk markers
- posts "what to do next"

## Demo Talk Track (what to say)

1. "My team only needs pull, edit, commit, push."
2. "If they use a weak branch name, the repo proposes a safe normalized branch, not a dangerous forced rename."
3. "PR labels and risk are inferred from changed files."
4. "AI agents can trigger the same workflow system with structured payloads."
5. "Nothing bypasses protected-branch safety or required reviews."

## Success Criteria

Demo is successful if you can show all of these:
- Suggested branch appears for non-compliant branch names.
- Scope labels and risk labels are applied.
- CI is routed to relevant area targets.
- Agent dispatch works with one payload.
- No auto-merge, no force rename, no protected-branch bypass.

## Troubleshooting from Real Run

- If `gh workflow run ...` returns HTTP 404 for a workflow file:
- The workflow is not available on the default branch yet.
- `workflow_dispatch` requires the workflow file to exist on default branch.

- If `repository_dispatch` returns success but no workflow run appears:
- The target workflow is likely not present on default branch.
- Move or merge workflow files to default branch before relying on dispatch events.

- Token handling safety:
- Never paste raw PAT values into repository files or command history.
- Prefer setting a repo secret via GitHub UI or secure local prompt flow.
- If a PAT was exposed in chat or logs, revoke it and issue a new token.
