import React from 'react';
import { X } from 'lucide-react';
import type { AIFeatureMetric } from '../../../services/aiMonitoringService';

interface SystemDirectoryModalProps {
  open: boolean;
  onClose: () => void;
  features: AIFeatureMetric[];
}

export const SystemDirectoryModal: React.FC<SystemDirectoryModalProps> = ({ open, onClose, features }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 rounded p-1 hover:bg-slate-100" aria-label="Close">
          <X className="h-5 w-5 text-slate-500" />
        </button>
        <h2 className="text-lg font-bold text-slate-900 mb-4">AI Feature Directory</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-slate-500 uppercase">
              <th className="pb-2">Feature</th>
              <th className="pb-2">Model</th>
              <th className="pb-2 text-right">Cost</th>
              <th className="pb-2 text-right">Requests</th>
              <th className="pb-2 text-right">Cache Hit</th>
            </tr>
          </thead>
          <tbody>
            {features.map((f) => (
              <tr key={f.featureId} className="border-b border-slate-100">
                <td className="py-2 font-medium text-slate-800">{f.featureName}</td>
                <td className="py-2 text-slate-600">{f.modelId}</td>
                <td className="py-2 text-right">${f.monthlyCost.toFixed(4)}</td>
                <td className="py-2 text-right">{f.totalRequests.toLocaleString()}</td>
                <td className="py-2 text-right">{(f.cacheHitRate * 100).toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
