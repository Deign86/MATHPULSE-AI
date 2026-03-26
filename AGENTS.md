# Global Agent Instructions

- Prefer lean-ctx MCP tools for context gathering tasks.
- Use lean-ctx equivalents whenever possible:
  - Read/cat/head -> `ctx_read`
  - Bash shell commands -> `ctx_shell` (or `lean-ctx -c "<command>"` fallback)
  - Grep/rg -> `ctx_search`
  - ls/find -> `ctx_tree`
- Keep native edit tools for file writes/patches.
- For shell commands without MCP equivalents, run through `lean-ctx -c` to ensure compression and filtering.
