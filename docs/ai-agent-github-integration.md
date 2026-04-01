# AI Agent GitHub Integration

This repository supports structured AI-to-GitHub automation through `repository_dispatch` and `workflow_dispatch`.

## Supported Agent Events

- `agent.code_change`
- `agent.ui_fix`
- `agent.repo_standardization`
- `agent.bug_audit`
- `agent.docs_update`
- `agent.release_prep`

## Payload Contract

Use this JSON schema in `client_payload` for `repository_dispatch`.

```json
{
  "agent_name": "copilot",
  "task_type": "ui_fix",
  "scope": "teacher dashboard components",
  "branch": "fix/teacher-facing-component-ui-fixes",
  "paths": ["src/components", "src/App.tsx"],
  "requires_ci": true,
  "requires_review": true,
  "pull_request_number": 123
}
```

Field notes:
- `agent_name`: source agent identity
- `task_type`: one of the supported task types
- `scope`: short human-readable scope
- `branch`: target branch for routing and CI dispatch
- `paths`: changed-path hints for inference
- `requires_ci`: trigger CI workflow dispatch
- `requires_review`: trigger review-oriented routing
- `pull_request_number`: optional, enables PR comments and label updates

## Workflows and Responsibilities

- `.github/workflows/agent-dispatch.yml`
: validates agent payload, computes inferred scope/branch guidance, dispatches CI, and optionally fans out manual runs to branch and audit workflows.

- `.github/workflows/branch-name-governor.yml`
: computes normalized branch suggestions, detects non-compliant branch names, publishes safe replacement-branch guidance.

- `.github/workflows/ai-change-audit.yml`
: applies scope and risk labels, posts plain-language next steps, and requests review when appropriate.

- `.github/workflows/ci.yml`
: supports `workflow_dispatch` with routeable targets:
: `run_frontend`, `run_backend`, `run_functions`.

## Triggering via GitHub API

### repository_dispatch

```bash
curl -L -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/repos/Deign86/MATHPULSE-AI/dispatches \
  -d '{
    "event_type": "agent.ui_fix",
    "client_payload": {
      "agent_name": "copilot",
      "task_type": "ui_fix",
      "scope": "teacher dashboard components",
      "branch": "fix/teacher-facing-component-ui-fixes",
      "paths": ["src/components/TeacherDashboard.tsx", "src/components/AdminAnalytics.tsx"],
      "requires_ci": true,
      "requires_review": true,
      "pull_request_number": 42
    }
  }'
```

### workflow_dispatch

```bash
curl -L -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/repos/Deign86/MATHPULSE-AI/actions/workflows/agent-dispatch.yml/dispatches \
  -d '{
    "ref": "chore/team-automation-and-agent-integration-2026-04-01",
    "inputs": {
      "agent_name": "copilot",
      "task_type": "repo_standardization",
      "scope": "repository workflow automation",
      "branch": "chore/team-automation-and-agent-integration-2026-04-01",
      "paths": "[\".github/workflows/branch-name-governor.yml\",\"scripts/suggest-branch-name.js\"]",
      "requires_ci": "true",
      "requires_review": "true"
    }
  }'
```

## Safety Controls

- No auto-merge.
- No review bypass.
- No direct protected-branch push automation.
- No forced branch rename behavior.
- Branch normalization is suggestion-first with replacement-branch guidance.
- Workflow permissions are least-privilege and scoped by job.

## Recommended Token Permissions

For external agent dispatch automation tokens:
- Repository Actions: write
- Contents: read
- Pull requests: write (only if PR comments/labels are required)
- Issues: write (for labels/comments)

Avoid broad admin scopes unless strictly required.
