# src/utils/

## Responsibility
Small reusable pure helpers and browser-side utilities shared across frontend domains.

## Design
Representative exports: `computeRisk`, `classifyWRI`, and `riskStatusToOverallRisk` (`riskEngine.ts`); `isMathRelatedQuery` and `getScopeBoundaryResponse` (`mathScope.ts`); `cacheKeys`/`stableHash`, `toChatPreviewText`, `selectDisplayXP`, `validateAdminCreateUserForm`, and `getDefaultAvatar`.

## Flow
Callers pass validated domain values to helpers and consume deterministic results; storage-oriented helpers such as `hintCache.ts` encapsulate browser persistence and expiry.

## Integration
Utilities are imported by hooks, services, and views without introducing a shared state layer. API transport remains in `services/apiService.ts`; shared input/output contracts are in `types/`.
