import React from 'react';
import { createPortal } from 'react-dom';
import { X, Cpu } from 'lucide-react';
import type { AIFeatureMetric } from '../../../services/aiMonitoringService';

interface SystemDirectoryModalProps {
  open: boolean;
  onClose: () => void;
  features: AIFeatureMetric[];
}

export const SystemDirectoryModal: React.FC<SystemDirectoryModalProps> = ({ open, onClose, features }) => {
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="system-directory-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[85dvh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Brand Accent Strip */}
        <div className="h-1 w-full bg-gradient-to-r from-[#9956DE] via-[#8643C8] to-[#7274ED]" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs">
              <Cpu size={16} />
            </div>
            <div>
              <h2 id="system-directory-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                AI Feature Directory
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">Live model deployment registry and cost metrics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 active:scale-95 transition-all"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Table Content */}
        <div className="overflow-y-auto p-4 sm:p-6">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 font-bold pl-3">Feature</th>
                <th className="pb-3 font-bold">Model</th>
                <th className="pb-3 font-bold text-right">Cost</th>
                <th className="pb-3 font-bold text-right">Requests</th>
                <th className="pb-3 font-bold text-right pr-3">Cache Hit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {features.map((f) => (
                <tr
                  key={f.featureId}
                  className="group hover:bg-purple-50/20 dark:hover:bg-purple-950/15 border-l-2 border-l-transparent hover:border-l-[#9956DE] transition-all"
                >
                  <td className="py-3 pl-3 font-semibold text-slate-800 dark:text-slate-200 group-hover:text-[#9956DE] dark:group-hover:text-purple-300 transition-colors">{f.featureName}</td>
                  <td className="py-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">{f.modelId}</td>
                  <td className="py-3 text-right font-semibold text-slate-700 dark:text-slate-300 tabular-nums">${f.monthlyCost.toFixed(4)}</td>
                  <td className="py-3 text-right text-slate-500 dark:text-slate-400 tabular-nums">{f.totalRequests.toLocaleString()}</td>
                  <td className="py-3 text-right pr-3 text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">{(f.cacheHitRate * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>,
    document.body
  );
};

