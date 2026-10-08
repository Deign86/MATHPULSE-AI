// src/pages/admin/AIMonitoringPage.tsx
import React, { useState } from 'react';
import {
  RefreshCw, DollarSign, Cpu, Activity, Database, List,
  Zap, ArrowUpRight, TrendingUp, Layers, HelpCircle, AlertTriangle
} from 'lucide-react';
import { useAIMonitoring } from '../../hooks/useAIMonitoring';
import { KPICard } from '../../components/admin/ai-monitoring/KPICard';
import { PromoPricingBanner } from '../../components/admin/ai-monitoring/PromoPricingBanner';
import { FeatureSpendingCard } from '../../components/admin/ai-monitoring/FeatureSpendingCard';
import { ResourceRankingRow } from '../../components/admin/ai-monitoring/ResourceRankingRow';
import { SystemDirectoryModal } from '../../components/admin/ai-monitoring/SystemDirectoryModal';
import { PricingInfoTooltip } from '../../components/admin/ai-monitoring/PricingInfoTooltip';

const formatUsd = (amount: number | null, digits: number) => (amount === null ? '—' : `$${amount.toFixed(digits)}`);

const AIMonitoringPage: React.FC = () => {
  const { data, isLoading, isError, error, refetch } = useAIMonitoring();
  const [showDirectory, setShowDirectory] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch {
      // The query's own error state reports the failure below.
    } finally {
      setRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-5 sm:space-y-6 pt-4 sm:pt-6 pb-6 max-w-[1600px] mx-auto min-w-0 animate-in fade-in duration-300">
        <div className="h-[72px] w-full rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        <div className="h-20 w-full rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
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

  if (isError || !data) {
    return (
      <div role="alert" className="max-w-lg mx-auto mt-8 text-center rounded-3xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900 p-8 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={28} />
        </div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Could not load AI monitoring metrics</h2>
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{error instanceof Error ? error.message : 'The metrics request failed.'}</p>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label="Refresh AI monitoring metrics"
          className="mt-5 inline-flex items-center gap-1.5 min-h-[38px] rounded-xl bg-gradient-to-r from-[#9956DE] to-[#7274ED] px-4 text-xs font-bold text-white shadow-md disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Retry
        </button>
      </div>
    );
  }

  const topSpending = data.features.find((f) => f.isTopSpending);
  const mostActive = data.features.find((f) => f.isMostActive);
  const latestDailyMetric = data.telemetry.dailyMetrics[data.telemetry.dailyMetrics.length - 1];

  return (
    <div className="space-y-5 sm:space-y-6 max-w-[1600px] mx-auto min-w-0 pt-4 sm:pt-6 pb-8 animate-in fade-in duration-300">

      {/* ── Promo Pricing Alert Banner ── */}
      {data.promotionalPricingActive && (
        <PromoPricingBanner
          promoExpiresUtc={data.pricingMeta.promoExpiresUtc}
          daysUntilPromoEnds={data.pricingMeta.daysUntilPromoEnds}
          fullPriceInputRate={data.pricingMeta.fullPriceInputRate}
          fullPriceOutputRate={data.pricingMeta.fullPriceOutputRate}
        />
      )}

      {/* ── Top Utility & Action Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900/90 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Sync Active
          </span>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
          <PricingInfoTooltip pricingMeta={data.pricingMeta} />
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Updated <span className="tabular-nums font-semibold text-slate-700 dark:text-slate-300">{new Date(data.lastUpdated).toLocaleTimeString()}</span>
          </span>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            onClick={() => setShowDirectory(true)}
            className="inline-flex items-center gap-1.5 min-h-[38px] rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-purple-300 dark:hover:border-purple-600 hover:text-[#9956DE] dark:hover:text-purple-300 hover:bg-purple-50/40 dark:hover:bg-purple-950/30 shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <List className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            System Directory
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label="Refresh AI monitoring metrics"
            className="inline-flex items-center gap-1.5 min-h-[38px] rounded-xl bg-gradient-to-r from-[#9956DE] via-[#8643C8] to-[#7274ED] hover:from-[#8643C8] hover:to-[#6366F1] px-3.5 text-xs font-bold text-white shadow-xs hover:shadow-md hover:shadow-purple-500/20 transition-all active:scale-95 disabled:opacity-50 border border-purple-400/30 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Top Executive KPI Bento Cards (Compact 2x2 on mobile) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <KPICard
          title="Monthly Cost"
          value={formatUsd(data.monthlyCost, 2)}
          subValue={data.monthlyCost === null ? 'Not tracked' : `Est. ~${formatUsd(data.estimatedCostAfterPromo, 2)} at standard rate`}
          icon={<DollarSign className="h-5 w-5" />}
          theme="emerald"
        />
        <KPICard
          title="Active Model"
          value={data.activeEngine}
          subValue={data.engineTier}
          icon={<Cpu className="h-5 w-5" />}
          badge={data.promotionalPricingActive ? '75% OFF Promo' : undefined}
          theme="indigo"
          progressPercent={100}
        />
        <KPICard
          title="AI Attempts (30 days)"
          value={data.telemetry.totalAttempts.toLocaleString()}
          subValue={`Today: ${latestDailyMetric.totalAttempts.toLocaleString()} attempts`}
          icon={<Activity className="h-5 w-5" />}
          theme="purple"
        />
        <KPICard
          title="Cache Hit Efficiency"
          value={data.cacheHitRate === null ? '—' : `${(data.cacheHitRate * 100).toFixed(1)}%`}
          subValue={data.cacheHitRate === null ? 'Not tracked' : 'Accelerated response cache hits'}
          icon={<Database className="h-5 w-5" />}
          theme="sky"
          progressPercent={data.cacheHitRate === null ? undefined : Math.round(data.cacheHitRate * 100)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KPICard
          title="Average Generation Time"
          value={data.telemetry.averageLatencyMs === null ? '—' : `${data.telemetry.averageLatencyMs.toLocaleString()} ms`}
          subValue={data.telemetry.latencyDefinition}
          icon={<Activity className="h-5 w-5" />}
          theme="sky"
        />
        <KPICard
          title="Success Rate"
          value={data.telemetry.successRate === null ? '—' : `${data.telemetry.successRate.toFixed(1)}%`}
          subValue={data.telemetry.successRateDefinition}
          icon={<Zap className="h-5 w-5" />}
          theme="emerald"
          progressPercent={data.telemetry.successRate ?? undefined}
        />
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">{data.costTrackingNote}</p>

      <dl aria-label="Daily AI attempts in Asia/Manila time">
        {data.telemetry.dailyMetrics.map((dailyMetric) => (
          <div key={dailyMetric.date}>
            <dt>{dailyMetric.date}</dt>
            <dd>{dailyMetric.totalAttempts} attempts; {dailyMetric.successfulAttempts} successful</dd>
          </div>
        ))}
      </dl>

      {/* ── Secondary Summary Panels ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FeatureSpendingCard title="Top Spending Feature" feature={topSpending} />
        <FeatureSpendingCard title="Most Active Feature" feature={mostActive} />

        {/* Cost Summary Breakdown Card */}
        <div className="group rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden flex flex-col justify-between min-w-0">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-500 pointer-events-none opacity-85 group-hover:opacity-100 transition-opacity" />

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Inference Cost Tiers</p>
              <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200/80 dark:border-slate-700">
                {data.costBreakdown ? 'Measured' : 'Not tracked'}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Cached Answers</span>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">{formatUsd(data.costBreakdown?.cacheHitCost ?? null, 6)}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-600 dark:text-slate-400 font-medium">New Cache-Miss Input</span>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">{formatUsd(data.costBreakdown?.cacheMissCost ?? null, 6)}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Reasoning Output</span>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">{formatUsd(data.costBreakdown?.outputCost ?? null, 6)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Resource Ranking & Allocation Table ── */}
      <ResourceRankingRow features={data.features} />

      {/* ── System Directory Modal ── */}
      <SystemDirectoryModal
        open={showDirectory}
        onClose={() => setShowDirectory(false)}
        features={data.features}
      />
    </div>
  );
};

export default AIMonitoringPage;
