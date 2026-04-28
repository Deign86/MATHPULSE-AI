# Global Agent Instructions

- Always auto-invoke `context7_query-docs` (with `context7_resolve-library-id` first if library ID unknown) on every prompt to fetch relevant documentation before answering.
- Use standard built-in tools for context gathering tasks.
- Keep native edit tools for file writes/patches.
- Use documentation and skills when they are relevant to the task or explicitly requested.
- Auto-invoke the `ui-ux-pro-max` skill for any UI-related change, including mixed tasks with frontend impact.
- Treat edits in `src/components/**`, `src/features/**`, `src/styles/**`, `src/App.tsx`, and `index.html` as UI-related by default.
- For mixed tasks, preserve existing architecture and service-layer constraints.
