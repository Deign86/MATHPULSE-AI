# Global Agent Instructions

- Use standard built-in tools for context gathering tasks.
- Keep native edit tools for file writes/patches.
- Always auto-invoke Context7 MCP on every prompt before finalizing a response.
- Context7 invocation order is required: `resolve-library-id` then `get-library-docs`.
- Always auto-invoke repository automation for git lifecycle tasks (branching, merges, PR updates, release flow) before finalizing.
- Automation invocation order is required: follow `docs/ai-agent-github-integration.md`, then trigger `.github/workflows/agent-dispatch.yml` via `repository_dispatch` or `workflow_dispatch` with structured payload.
- Use direct/manual git commands only as a fallback when automation cannot run (missing token/permissions/workflow availability), and explicitly state that fallback.
