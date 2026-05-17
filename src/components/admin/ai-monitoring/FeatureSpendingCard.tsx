import React from 'react';
import type { AIFeatureMetric } from '../../../services/aiMonitoringService';

interface FeatureSpendingCardProps {
  title: string;
  feature: AIFeatureMetric | undefined;
}

export const FeatureSpendingCard: React.FC<FeatureSpendingCardProps> = ({ title, feature }) => {
  if (!feature) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">{title}</p>
      <p className="text-lg font-bold text-slate-900">{feature.featureName}</p>
      <div className="mt-2 flex items-center gap-3 text-xs text-slate-600">
        <span>${feature.monthlyCost.toFixed(4)}</span>
        <span className="text-slate-300">|</span>
        <span>{feature.totalRequests.toLocaleString()} reqs</span>
        <span className="text-slate-300">|</span>
        <span>{(feature.cacheHitRate * 100).toFixed(0)}% cache</span>
      </div>
    </div>
  );
};
