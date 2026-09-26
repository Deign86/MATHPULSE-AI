import React from 'react';
import type { AIFeatureMetric } from '../../../services/aiMonitoringService';

interface FeatureSpendingCardProps {
  title: string;
  feature: AIFeatureMetric | undefined;
}

export const FeatureSpendingCard: React.FC<FeatureSpendingCardProps> = ({ title, feature }) => {
  if (!feature) return null;

  return (
    <div className="group rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden flex flex-col justify-between min-w-0">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-sky-500 pointer-events-none opacity-85 group-hover:opacity-100 transition-opacity" />
      <div>
        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">{title}</p>
        <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate group-hover:text-[#9956DE] dark:group-hover:text-purple-300 transition-colors">{feature.featureName}</p>
      </div>
      <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs pt-3 border-t border-slate-100 dark:border-slate-800">
        <span className="tabular-nums font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
          ${feature.monthlyCost.toFixed(4)}
        </span>
        <span className="tabular-nums font-medium text-slate-500 dark:text-slate-400">
          {feature.totalRequests.toLocaleString()} reqs
        </span>
        <span className="tabular-nums text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-lg border border-emerald-200/60 dark:border-emerald-800/60 font-bold text-[11px]">
          {(feature.cacheHitRate * 100).toFixed(0)}% cache
        </span>
      </div>
    </div>
  );
};

