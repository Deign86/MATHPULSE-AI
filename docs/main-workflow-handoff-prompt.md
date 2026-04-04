# Handoff Prompt: Validate Automation on Main

Use this prompt with your coding agent after the automation files are on `main`.

---

You are validating GitHub-first collaboration automation in `Deign86/MATHPULSE-AI`.

## Objective
Prove the workflow system works on `main` for both teammate-style and agent-style paths.

## Required checks

1. Branch normalization (teammate path)
- Simulate a weak branch name and teacher UI file changes.
- Run:
```powershell
$env:CHANGED_FILES_JSON='["src/components/TeacherDashboard.tsx","src/components/TeacherAnalytics.tsx"]'; node scripts/suggest-branch-name.js --branch "my-branch" --summary "teacher dashboard ui fixes"; Remove-Item Env:CHANGED_FILES_JSON
```
- Confirm output includes:
- `isCurrentBranchCompliant: false`
- `suggestedBranch` under `fix/...`
- labels include `frontend` and `teacher-ui`

2. Agent payload simulation
- Use payload file `docs/examples/agent-ui-fix-dispatch.json`.
- Run:
```powershell
$payload = Get-Content docs/examples/agent-ui-fix-dispatch.json -Raw | ConvertFrom-Json
$pathsJson = '[' + (($payload.client_payload.paths | ForEach-Object { '"' + $_ + '"' }) -join ',') + ']'
$env:CHANGED_FILES_JSON = $pathsJson
node scripts/suggest-branch-name.js --branch $payload.client_payload.branch --summary $payload.client_payload.scope --task-type $payload.client_payload.task_type
Remove-Item Env:CHANGED_FILES_JSON
```
- Confirm output includes:
- `isCurrentBranchCompliant: true`
- changed files count > 0
- labels and ciTargets inferred

3. Live dispatch on main
- Send repository dispatch:
```powershell
gh api repos/Deign86/MATHPULSE-AI/dispatches --method POST --input docs/examples/agent-ui-fix-dispatch.json
```
- Trigger manual dispatch workflow:
```powershell
gh workflow run agent-dispatch.yml --ref main -f agent_name=copilot -f task_type=ui_fix -f scope="teacher dashboard components" -f branch=fix/teacher-ui-frontend-dashboard-tsx-fixes-analytics -f paths='["src/components/TeacherDashboard.tsx","src/components/TeacherAnalytics.tsx"]' -f requires_ci=true -f requires_review=true
```

4. Verify Actions runs
- Run:
```powershell
gh run list --limit 20 --json databaseId,event,workflowName,headBranch,status,conclusion,createdAt
```
- Confirm runs appear for:
- `Agent Dispatch Router`
- `Branch Name Governor`
- `AI Change Audit`
- `CI`

5. Safety assertions
- Confirm no auto-merge happened.
- Confirm no protected branch force-push.
- Confirm branch rename remains suggestion/replacement flow.

## Deliverable format
Report with:
- pass/fail per step,
- run IDs,
- any errors and exact remediation,
- final statement: "Main workflow automation validation complete".

---

If any step fails, fix only the minimum required files on a new branch and provide a PR-ready patch plan.
