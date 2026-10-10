# config/

## Responsibility
Repository-level model defaults and task routing metadata; the scoped frontend-facing file is `models.yaml`.

## Design
`models.yaml` defines `primary` (`deepseek-flash`), `rag_primary` (`deepseek-v4-pro`), the BAAI embedding model, capability lists, and task-to-model/provider/fallback maps.

## Flow
Backend model configuration consumes these YAML entries to select a model and fallback by task. The frontend does not load this file directly; it uses configured backend endpoints.

## Integration
Frontend API calls use `src/config/env.ts` and `src/services/apiService.ts`; model routing is server-side metadata and must remain consistent with those backend task contracts.
