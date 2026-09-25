// src/pages/admin/AIMonitoringPage.tsx
// TODO: Review pricing after 2026-05-31
import React, { useState } from 'react';
import { RefreshCw, DollarSign, Cpu, Activity, Database, List, Sparkles } from 'lucide-react';
import { useAIMonitoring } from '../../hooks/useAIMonitoring';
import { KPICard } from '../../components/admin/ai-monitoring/KPICard';
import { PromoPricingBanner } from '../../components/admin/ai-monitoring/PromoPricingBanner';
import { FeatureSpendingCard } from '../../components/admin/ai-monitoring/FeatureSpendingCard';
import { ResourceRankingRow } from '../../components/admin/ai-monitoring/ResourceRankingRow';
import { SystemDirectoryModal } from '../../components/admin/ai-monitoring/SystemDirectoryModal';
import { PricingInfoTooltip } from '../../components/admin/ai-monitoring/PricingInfoTooltip';

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
      <div className="space-y-6 pt-2 pb-6 max-w-[1400px] mx-auto min-w-0">
        {/* Promo banner skeleton */}
        <div className="h-[72px] w-full rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        {/* Header row skeleton */}
        <div className="h-20 w-full rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        {/* KPI Cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
        {/* Secondary cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
        {/* Resource breakdown skeleton */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/90 p-5 space-y-4">
          <div className="h-4 w-40 rounded bg-slate-100 dark:bg-slate-700 animate-pulse" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-3 w-28 rounded bg-slate-100 dark:bg-slate-700 animate-pulse" />
              <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-700 animate-pulse" />
              <div className="h-3 w-16 rounded bg-slate-100 dark:bg-slate-700 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const topSpending = data.features.find((f) => f.isTopSpending);
  const mostActive = data.features.find((f) => f.isMostActive);

  return (
    <div className="space-y-6 pt-2 pb-6 max-w-[1400px] mx-auto min-w-0">
      {/* Promo Banner */}
      {data.promotionalPricingActive && (
        <PromoPricingBanner
          promoExpiresUtc={data.pricingMeta.promoExpiresUtc}
          daysUntilPromoEnds={data.pricingMeta.daysUntilPromoEnds}
          fullPriceInputRate={data.pricingMeta.fullPriceInputRate}
          fullPriceOutputRate={data.pricingMeta.fullPriceOutputRate}
        />
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800/90 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/60 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">AI Engine & Cost Telemetry</h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50">
              <Sparkles size={11} /> DeepSeek API
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <PricingInfoTooltip pricingMeta={data.pricingMeta} />
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Synced <span className="tabular-nums font-medium text-slate-600 dark:text-slate-300">{new Date(data.lastUpdated).toLocaleTimeString()}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowDirectory(true)}
            className="inline-flex items-center gap-1.5 min-h-[44px] rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-slate-800 px-4 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-sm transition-all active:scale-95"
          >
            <List className="h-4 w-4 text-slate-500 dark:text-slate-400" /> Feature Directory
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label="Refresh AI monitoring metrics"
            className="inline-flex items-center gap-1.5 min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 text-xs font-semibold text-white shadow-sm transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <KPICard
          title="Monthly Cost"
          value={`$${data.monthlyCost.toFixed(2)}`}
          subValue={`Est. ~$${data.estimatedCostAfterPromo.toFixed(2)} at standard rate`}
          icon={<DollarSign className="h-5 w-5" />}
          gradient="from-emerald-700 to-teal-900"
        />
        <KPICard
          title="Active Engine"
          value={data.activeEngine}
          subValue={data.engineTier}
          icon={<Cpu className="h-5 w-5" />}
          badge={data.promotionalPricingActive ? '75% OFF Promo Active' : undefined}
          gradient="from-indigo-700 to-slate-900"
        />
        <KPICard
          title="Total Requests"
          value={data.totalUsage.toLocaleString()}
          subValue={data.billingCycleLabel}
          icon={<Activity className="h-5 w-5" />}
          gradient="from-violet-700 to-purple-950"
        />
        <KPICard
          title="Cache Efficiency"
          value={`${(data.cacheHitRate * 100).toFixed(1)}%`}
          subValue="Hit: $0.0036/1M vs Miss: $0.435/1M"
          icon={<Database className="h-5 w-5" />}
          gradient="from-sky-700 to-indigo-950"
        />
      </div>

      {/* Secondary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FeatureSpendingCard title="Top Spending Feature" feature={topSpending} />
        <FeatureSpendingCard title="Most Active Feature" feature={mostActive} />
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-slate-800/90 p-4 sm:p-5 shadow-sm">
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Cost Breakdown</p>
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Cache Hit</span>
              <span className="font-semibold text-slate-900 dark:text-white tabular-nums">${data.costBreakdown.cacheHitCost.toFixed(6)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Cache Miss</span>
              <span className="font-semibold text-slate-900 dark:text-white tabular-nums">${data.costBreakdown.cacheMissCost.toFixed(6)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Output Tokens</span>
              <span className="font-semibold text-slate-900 dark:text-white tabular-nums">${data.costBreakdown.outputCost.toFixed(6)}</span>
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

