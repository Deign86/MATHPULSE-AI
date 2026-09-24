import React from 'react';
import type { AIFeatureMetric } from '../../../services/aiMonitoringService';

interface FeatureSpendingCardProps {
  title: string;
  feature: AIFeatureMetric | undefined;
}

export const FeatureSpendingCard: React.FC<FeatureSpendingCardProps> = ({ title, feature }) => {
  if (!feature) return null;

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-slate-800/90 p-4 sm:p-5 shadow-sm">
      <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">{title}</p>
      <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">{feature.featureName}</p>
      <div className="mt-3 flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
        <span className="tabular-nums font-semibold">${feature.monthlyCost.toFixed(4)}</span>
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <span className="tabular-nums">{feature.totalRequests.toLocaleString()} reqs</span>
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <span className="tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">{(feature.cacheHitRate * 100).toFixed(0)}% cache</span>
      </div>
    </div>
  );
};

