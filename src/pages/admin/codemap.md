# src/pages/admin/

## Responsibility
- Admin-only pages expose platform operations; `AIMonitoringPage` reports AI usage, costs, and model health.

## Design
- `useAIMonitoring` supplies cached/query state; `AIMonitoringPage` handles refresh and the system-directory modal.
- `KPICard`, `FeatureSpendingCard`, `ResourceRankingRow`, `PromoPricingBanner`, and `PricingInfoTooltip` render metric sections.

## Flow
- Admin route → `AIMonitoringPage` → `useAIMonitoring` / `aiMonitoringService` → `GET /api/admin/ai-monitoring/summary`; refresh calls `POST /api/admin/ai-monitoring/refresh`.

## Integration
- Uses the shared API transport and admin AI monitoring endpoints; it does not transition IAR (`not_started`, `in_progress`, `completed`, `skipped_unassessed`, `deep_diagnostic_required`, `deep_diagnostic_in_progress`, `placed`).
- No Quiz Battle RTDB queue integration.
