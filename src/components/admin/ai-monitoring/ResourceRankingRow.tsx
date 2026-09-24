import React from 'react';
import type { AIFeatureMetric } from '../../../services/aiMonitoringService';

interface ResourceRankingRowProps {
  features: AIFeatureMetric[];
}

export const ResourceRankingRow: React.FC<ResourceRankingRowProps> = ({ features }) => {
  const sorted = [...features].sort((a, b) => b.monthlyCost - a.monthlyCost);

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-slate-800/90 p-4 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Resource Breakdown</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">Feature contribution to total inference costs</p>
        </div>
      </div>
      <div className="space-y-3">
        {sorted.map((f) => (
          <div key={f.featureId} className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="truncate font-semibold text-slate-700 dark:text-slate-200">{f.featureName}</span>
                <span className="font-semibold text-slate-500 dark:text-slate-400 tabular-nums">${f.monthlyCost.toFixed(4)}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-500 dark:bg-indigo-400 transition-all duration-300"
                  style={{ width: `${Math.min(f.costShare, 100)}%` }}
                />
              </div>
            </div>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 w-10 text-right tabular-nums">{f.costShare.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

