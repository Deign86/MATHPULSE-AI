import React, { useState, useMemo } from 'react';
import { Search, Database, ArrowUpDown, Cpu, Zap } from 'lucide-react';
import type { AIFeatureMetric } from '../../../services/aiMonitoringService';

interface ResourceRankingRowProps {
  features: AIFeatureMetric[];
}

export const ResourceRankingRow: React.FC<ResourceRankingRowProps> = ({ features }) => {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'cost' | 'requests' | 'cache'>('cost');

  const filteredAndSorted = useMemo(() => {
    return features
      .filter((f) => f.featureName.toLowerCase().includes(search.toLowerCase()) || f.featureId.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === 'cost') return b.monthlyCost - a.monthlyCost;
        if (sortBy === 'requests') return b.totalRequests - a.totalRequests;
        return b.cacheHitRate - a.cacheHitRate;
      });
  }, [features, search, sortBy]);

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-slate-800/90 p-4 sm:p-6 shadow-xs overflow-hidden">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-100 dark:border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-[#9956DE] dark:text-purple-400 flex items-center justify-center border border-purple-200/60 dark:border-purple-800/50 shadow-xs shrink-0">
            <Cpu size={18} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Feature Inference & Cost Allocation</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">Live breakdown of token consumption and cost share across platform modules</p>
          </div>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
            <input
              type="text"
              placeholder="Filter features..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8 pr-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/60 rounded-xl text-xs font-medium outline-none focus:border-[#9956DE] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 w-36 sm:w-44 transition-all"
            />
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-slate-900/70 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-xs">
            <button
              onClick={() => setSortBy('cost')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                sortBy === 'cost' ? 'bg-white dark:bg-slate-800 text-[#9956DE] dark:text-purple-300 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Cost
            </button>
            <button
              onClick={() => setSortBy('requests')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                sortBy === 'requests' ? 'bg-white dark:bg-slate-800 text-[#9956DE] dark:text-purple-300 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Requests
            </button>
            <button
              onClick={() => setSortBy('cache')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                sortBy === 'cache' ? 'bg-white dark:bg-slate-800 text-[#9956DE] dark:text-purple-300 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Cache
            </button>
          </div>
        </div>
      </div>

      {/* Feature List */}
      <div className="space-y-2.5">
        {filteredAndSorted.map((f) => (
          <div
            key={f.featureId}
            className="group flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700/60 hover:border-purple-300 dark:hover:border-purple-800/60 hover:bg-purple-50/20 dark:hover:bg-purple-950/10 transition-all gap-2 sm:gap-4"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2 truncate">
                  <span className="truncate font-bold text-slate-900 dark:text-white group-hover:text-[#9956DE] dark:group-hover:text-purple-300 transition-colors">
                    {f.featureName}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    ({f.totalRequests.toLocaleString()} reqs)
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {(f.cacheHitRate * 100).toFixed(0)}% cached
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-white tabular-nums">
                    ${f.monthlyCost.toFixed(4)}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full rounded-full bg-slate-200/70 dark:bg-slate-700/60 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#9956DE] via-[#8643C8] to-[#7274ED] transition-all duration-500"
                  style={{ width: `${Math.max(f.costShare, 3)}%` }}
                />
              </div>
            </div>

            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 w-12 text-right tabular-nums shrink-0">
              {f.costShare.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
