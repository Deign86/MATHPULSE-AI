// src/pages/admin/AIMonitoringPage.tsx
// TODO: Review pricing after 2026-05-31
import React, { useState } from 'react';
import { RefreshCw, DollarSign, Cpu, Activity, Database, List } from 'lucide-react';
import { useAIMonitoring } from '../../hooks/useAIMonitoring';
import { KPICard } from '../../components/admin/ai-monitoring/KPICard';
import { PromoPricingBanner } from '../../components/admin/ai-monitoring/PromoPricingBanner';
import { FeatureSpendingCard } from '../../components/admin/ai-monitoring/FeatureSpendingCard';
import { ResourceRankingRow } from '../../components/admin/ai-monitoring/ResourceRankingRow';
import { SystemDirectoryModal } from '../../components/admin/ai-monitoring/SystemDirectoryModal';
import { PricingInfoTooltip } from '../../components/admin/ai-monitoring/PricingInfoTooltip';
import { Skeleton } from '../../components/ui/skeleton';

const AIMonitoringPage: React.FC = () => {
  const { data, isLoading, refetch } = useAIMonitoring();
  const [showDirectory, setShowDirectory] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  };

  if (isLoading || !data) {
    return (
      <div className="space-y-4 p-1">
        <Skeleton className="h-12 w-full rounded-lg" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const topSpending = data.features.find((f) => f.isTopSpending);
  const mostActive = data.features.find((f) => f.isMostActive);

  return (
    <div className="space-y-5 p-1">
      {/* Promo Banner */}
      {data.promotionalPricingActive && (
        <PromoPricingBanner
          promoExpiresUtc={data.pricingMeta.promoExpiresUtc}
          daysUntilPromoEnds={data.pricingMeta.daysUntilPromoEnds}
          fullPriceInputRate={data.pricingMeta.fullPriceInputRate}
          fullPriceOutputRate={data.pricingMeta.fullPriceOutputRate}
        />
      )}

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PricingInfoTooltip pricingMeta={data.pricingMeta} />
          <span className="text-xs text-slate-400">
            Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDirectory(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <List className="h-3.5 w-3.5" /> Directory
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Monthly Cost"
          value={`$${data.monthlyCost.toFixed(2)}`}
          subValue={`Would be ~$${data.estimatedCostAfterPromo.toFixed(2)} at full price`}
          icon={<DollarSign className="h-5 w-5" />}
          gradient="from-emerald-600 to-emerald-800"
        />
        <KPICard
          title="Active Engine"
          value={data.activeEngine}
          subValue={data.engineTier}
          icon={<Cpu className="h-5 w-5" />}
          badge={data.promotionalPricingActive ? '75% OFF until May 31' : undefined}
          gradient="from-indigo-600 to-indigo-800"
        />
        <KPICard
          title="Total Requests"
          value={data.totalUsage.toLocaleString()}
          subValue={data.billingCycleLabel}
          icon={<Activity className="h-5 w-5" />}
          gradient="from-violet-600 to-violet-800"
        />
        <KPICard
          title="Cache Efficiency"
          value={`${(data.cacheHitRate * 100).toFixed(1)}%`}
          subValue="Cache hits: $0.003625/1M vs miss: $0.435/1M"
          icon={<Database className="h-5 w-5" />}
          gradient="from-sky-600 to-sky-800"
        />
      </div>

      {/* Secondary cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <FeatureSpendingCard title="Top Spending" feature={topSpending} />
        <FeatureSpendingCard title="Most Active" feature={mostActive} />
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Cost Breakdown</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Cache Hit</span>
              <span className="font-medium">${data.costBreakdown.cacheHitCost.toFixed(6)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Cache Miss</span>
              <span className="font-medium">${data.costBreakdown.cacheMissCost.toFixed(6)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Output</span>
              <span className="font-medium">${data.costBreakdown.outputCost.toFixed(6)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Resource Breakdown */}
      <ResourceRankingRow features={data.features} />

      {/* Directory Modal */}
      <SystemDirectoryModal
        open={showDirectory}
        onClose={() => setShowDirectory(false)}
        features={data.features}
      />
    </div>
  );
};

export default AIMonitoringPage;
