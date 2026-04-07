# Global Agent Instructions

- Use standard built-in tools for context gathering tasks.
- Keep native edit tools for file writes/patches.
- Always auto-invoke Context7 MCP on every prompt before finalizing a response.
- Context7 invocation order is required: `resolve-library-id` then `get-library-docs`.
- Always auto-invoke MemPalace MCP on every prompt before finalizing a response.
- MemPalace invocation order is required: `mempalace_status` then `mempalace_search`.
