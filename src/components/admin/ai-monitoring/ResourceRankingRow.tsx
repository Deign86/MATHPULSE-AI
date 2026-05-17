import React from 'react';
import type { AIFeatureMetric } from '../../../services/aiMonitoringService';

interface ResourceRankingRowProps {
  features: AIFeatureMetric[];
}

export const ResourceRankingRow: React.FC<ResourceRankingRowProps> = ({ features }) => {
  const sorted = [...features].sort((a, b) => b.monthlyCost - a.monthlyCost);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Resource Breakdown</p>
      <div className="space-y-2">
        {sorted.map((f) => (
          <div key={f.featureId} className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate font-medium text-slate-700">{f.featureName}</span>
                <span className="text-xs text-slate-500">${f.monthlyCost.toFixed(4)}</span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-500"
                  style={{ width: `${Math.min(f.costShare, 100)}%` }}
                />
              </div>
            </div>
            <span className="text-xs text-slate-400 w-10 text-right">{f.costShare.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};
