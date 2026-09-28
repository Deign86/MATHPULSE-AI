# src/bones/

## Responsibility
Optional registry for generated `.bone` capture modules.

## Design
`registry.ts` exports `registerBoneyardRegistry()`, which eagerly discovers `*.bone.ts`, `*.bone.tsx`, `*.bone.js`, and `*.bone.jsx` modules using Vite `import.meta.glob`.

## Flow
`main.tsx` calls `registerBoneyardRegistry()` after app mounting; with no captured modules present, registration has no additional runtime behavior.

## Integration
This is a development/capture integration, not application state or a service layer; it does not replace contexts, TanStack Query, or API services.
