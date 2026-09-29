# src/components/admin/ai-monitoring/

## Responsibility
- Present AI usage, spending, model/resource rankings, pricing context, and system directory details within admin monitoring.
- Files: FeatureSpendingCard, KPICard, PricingInfoTooltip, PromoPricingBanner, ResourceRankingRow, SystemDirectoryModal.

## Design
- Presentational cards and modal receive typed metrics/pricing/features via props; they do not own the monitoring data source.
- Props samples: `FeatureSpendingCard({ title, feature })`, `KPICard` receives metric value/label/theme, `ResourceRankingRow({ features })`, `SystemDirectoryModal({ open, onClose, features })`, and pricing tooltip/banner receive pricing metadata.
- State is limited to interaction state such as tooltip/modal visibility; values and loading lifecycle belong to the parent.

## Flow
- Admin monitoring parent loads usage metrics and feature/pricing metadata → passes snapshots into these components → cards and rankings render; user opens pricing/system details → modal/tooltip state displays supplied information.

## Integration
- Composed by admin AI monitoring/dashboard views; connected indirectly to monitoring/config services through the parent that supplies typed props.
- Uses shared `components/ui/` cards, tooltip, and dialog primitives; no direct auth or data-fetch service usage is evident in this subtree.
