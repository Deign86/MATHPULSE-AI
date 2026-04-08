# Global Agent Instructions

- Use standard built-in tools for context gathering tasks.
- Keep native edit tools for file writes/patches.
- Always auto-invoke Context7 MCP on every prompt before finalizing a response.
- Context7 invocation order is required: `resolve-library-id` then `get-library-docs`.
- Always auto-invoke the `awesome-design-md` skill whenever touching UI or frontend-related code.
- For mixed tasks, apply `awesome-design-md` to the UI portion while preserving existing architecture and service-layer constraints.
