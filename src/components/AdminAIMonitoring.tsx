import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Eye,
  Flame,
  Info,
  Lightbulb,
  MessageSquare,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  Zap,
  Cpu,
  ArrowUpRight,
  ShieldCheck,
  LayoutDashboard,
  ListFilter,
  BarChart3,
  MousePointer2,
  Settings,
  Layers,
  GraduationCap,
  Target,
  FileSearch,
  PenTool,
  MessageCircle,
  Sticker,
  CheckCircle2,
  FileCheck,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { useAIMonitoring } from '../hooks/useAIMonitoring';
import type { AIUsageLog } from '../types/hfMonitoring';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type HealthStatus = 'Healthy' | 'Warning' | 'Offline';
type UsageLevel = 'Low' | 'Medium' | 'High';

interface AIUsageArea {
  id: string;
  name: string;
  description: string;
  status: HealthStatus;
  requests: number;
  estimatedCost: number;
  avgCostPerRequest: number;
  usageLevel: UsageLevel;
  lastActiveAt: string;
  trend?: 'Up' | 'Stable' | 'Down';
  costPercent?: number;
  icon: any;
}

// ─────────────────────────────────────────────
// Constants & Utils
// ─────────────────────────────────────────────

const FEATURE_META: Record<string, { icon: any; color: string }> = {
  'ai-chat': { icon: MessageCircle, color: 'text-sky-500 bg-sky-50' },
  'quiz-generation': { icon: PenTool, color: 'text-purple-500 bg-purple-50' },
  'lesson-generation': { icon: GraduationCap, color: 'text-indigo-500 bg-indigo-50' },
  'learning-paths': { icon: Target, color: 'text-rose-500 bg-rose-50' },
  'risk-classification': { icon: AlertTriangle, color: 'text-amber-500 bg-amber-50' },
  'daily-insights': { icon: Sparkles, color: 'text-emerald-500 bg-emerald-50' },
  'solution-verification': { icon: FileCheck, color: 'text-blue-500 bg-blue-50' },
  'curriculum-search': { icon: FileSearch, color: 'text-slate-500 bg-slate-50' },
  'content-processing': { icon: Layers, color: 'text-violet-500 bg-violet-50' },
  'auto-feedback': { icon: Sticker, color: 'text-pink-500 bg-pink-50' },
};

const PLATFORM_AI_FEATURES = [
  { id: 'ai-chat', name: 'AI Chat Tutor', description: 'On-demand math help via DeepSeek' },
  { id: 'quiz-generation', name: 'Quiz Generation', description: 'AI quiz creation from curriculum' },
  { id: 'lesson-generation', name: 'Lesson Generation', description: 'AI-generated lesson plans' },
  { id: 'learning-paths', name: 'Learning Paths', description: 'Personalized study plans' },
  { id: 'risk-classification', name: 'Risk Classification', description: 'Student at-risk identification' },
  { id: 'daily-insights', name: 'Daily AI Insights', description: 'Analytics for teachers' },
  { id: 'solution-verification', name: 'Solution Verification', description: 'Math solution checking' },
  { id: 'curriculum-search', name: 'Curriculum Search', description: 'Embedding-based search' },
  { id: 'content-processing', name: 'Content Processing', description: 'Topic extraction' },
  { id: 'auto-feedback', name: 'Auto Feedback', description: 'Instant feedback for students' },
];

const USAGE_WEIGHTS: Record<string, number> = {
  'ai-chat': 35, 'quiz-generation': 18, 'lesson-generation': 12, 'learning-paths': 8,
  'risk-classification': 6, 'daily-insights': 5, 'solution-verification': 6,
  'curriculum-search': 4, 'content-processing': 3, 'auto-feedback': 3,
};

function formatTimestamp(iso: string): string {
  if (!iso) return 'N/A';
  try {
    const date = new Date(iso);
    return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return 'N/A'; }
}

function formatCurrency(amount: number): string {
  return amount >= 1 ? `$${amount.toFixed(2)}` : `$${amount.toFixed(4)}`;
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

function mapStatsToUsageAreas(stats: AIUsageLog[]): AIUsageArea[] {
  const totalReq = stats.reduce((sum, s) => sum + s.requestCount, 0);
  const totalCost = stats.reduce((sum, s) => sum + s.estimatedCostUSD, 0);
  const now = new Date().toISOString();

  const areas = PLATFORM_AI_FEATURES.map((feature) => {
    const log = stats.find(s => {
      const cleanName = s.featureName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanFeature = feature.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      return cleanName.includes(cleanFeature) || cleanFeature.includes(cleanName);
    });

    const requests = log?.requestCount ?? Math.round((totalReq * (USAGE_WEIGHTS[feature.id] ?? 1)) / 100);
    const estimatedCost = log?.estimatedCostUSD ?? (totalCost * (USAGE_WEIGHTS[feature.id] ?? 1)) / 100;
    const status: HealthStatus = log ? (log.status === 'Degraded' ? 'Warning' : log.status === 'Down' ? 'Offline' : 'Healthy') : 'Healthy';
    const usageLevel: UsageLevel = log ? (log.priority === 'High' ? 'High' : log.priority === 'Medium' ? 'Medium' : 'Low') : (USAGE_WEIGHTS[feature.id] >= 20 ? 'High' : USAGE_WEIGHTS[feature.id] >= 8 ? 'Medium' : 'Low');

    return {
      ...feature, status, requests, estimatedCost, avgCostPerRequest: requests > 0 ? estimatedCost / requests : 0, usageLevel,
      lastActiveAt: log?.lastUpdated?.toDate().toISOString() ?? now, trend: 'Stable' as const,
      icon: FEATURE_META[feature.id]?.icon || Zap,
    };
  });

  const totalDerivedCost = areas.reduce((sum, a) => sum + a.estimatedCost, 0);
  return areas.map((a) => ({ ...a, costPercent: totalDerivedCost > 0 ? (a.estimatedCost / totalDerivedCost) * 100 : 0 }));
}

// ─────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────

const StatCard: React.FC<{
  title: string;
  value: string;
  subtitle: string;
  icon: any;
  variant: 'blue' | 'green' | 'red' | 'purple' | 'sky';
}> = ({ title, value, subtitle, icon: Icon, variant }) => {
  const variants = {
    blue: 'bg-[#5154E7] shadow-blue-200',
    sky: 'bg-[#0EA5E9] shadow-sky-100',
    green: 'bg-[#10B981] shadow-emerald-200',
    red: 'bg-[#EF4444] shadow-rose-200',
    purple: 'bg-[#9956DE] shadow-purple-200',
  };

  return (
    <div className={`relative overflow-hidden rounded-[24px] p-5 text-white shadow-lg transition-transform ${variants[variant]}`}>
      <div className="absolute -right-4 -top-4 opacity-10">
        <Icon size={100} />
      </div>
      <div className="absolute right-4 top-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
        <Icon size={16} />
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">{title}</p>
      <h3 className="text-2xl font-black mt-2 leading-none">{value}</h3>
      <p className="text-[10px] font-bold mt-4 opacity-70 uppercase tracking-widest">{subtitle}</p>
      
      {/* Subject Card Styling Circle */}
      <div className="absolute -bottom-8 -left-8 w-20 h-20 bg-white/10 rounded-full blur-2xl" />
    </div>
  );
};

const AdminAIMonitoring: React.FC = () => {
  const [showFullList, setShowFullList] = useState(false);
  const {
    stats, systemHealth, totalSpend, highestCostFeature, mostActiveFeature, isLoading, error, refresh,
  } = useAIMonitoring();

  const usageAreas = useMemo(() => mapStatsToUsageAreas(stats), [stats]);
  const sortedByCost = useMemo(() => [...usageAreas].sort((a, b) => b.estimatedCost - a.estimatedCost), [usageAreas]);

  // Determine dynamic health variant
  const healthVariant = systemHealth === 'Healthy' ? 'green' : 'red';

  return (
    <div className="space-y-6 pt-6 xl:pt-8 pb-10 w-full max-w-[1600px] mx-auto px-4">
      {/* ── 1. Top Metrics & Inline Warning ── */}
      <div className="space-y-4">
        {/* Compact Header Bar with Warning */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
             <div className="w-1.5 h-6 bg-[#9956DE] rounded-full" />
             <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Platform AI Systems</p>
          </div>
          
          <div className="flex items-center gap-3">
             <AnimatePresence>
                {systemHealth !== 'Healthy' && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100"
                  >
                    <AlertTriangle size={12} className="text-amber-500 animate-pulse" />
                    <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">System Performance Issues</span>
                  </motion.div>
                )}
             </AnimatePresence>
             {/* Refresh Button: Re-fetches live data from the backend */}
             <button 
               onClick={refresh} 
               disabled={isLoading}
               title="Refresh live data"
               className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-purple-600 shadow-sm transition-all active:scale-95"
             >
               <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="System Status"
            value={systemHealth === 'Healthy' ? 'All Clear' : 'Issues Found'}
            subtitle={systemHealth === 'Healthy' ? 'Infrastructure Stable' : 'Action Recommended'}
            icon={ShieldCheck}
            variant={healthVariant}
          />
          <StatCard
            title="Monthly Cost"
            value={isLoading ? '...' : formatCurrency(totalSpend)}
            subtitle="Current Billable Cycle"
            icon={DollarSign}
            variant="purple"
          />
          <StatCard
            title="Total Usage"
            value={isLoading ? '...' : formatNumber(stats.reduce((s,l)=>s+l.requestCount,0))}
            subtitle="Inference Requests"
            icon={Activity}
            variant="blue"
          />
          <StatCard
            title="Active Engine"
            value="DeepSeek-R1"
            subtitle="High-Performance LLM"
            icon={Cpu}
            variant="sky"
          />
        </div>
      </div>

      {/* ── 2. Insights Area ── */}
      {!showFullList ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-5"
        >
          {/* Highest Cost Card (Reduced padding/height) */}
          <div className="lg:col-span-4 bg-white rounded-[28px] border border-slate-200 p-6 shadow-sm flex flex-col justify-between group">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-50 text-[#9956DE] flex items-center justify-center border border-slate-100 group-hover:scale-110 transition-transform">
                <TrendingUp size={20} />
              </div>
              <span className="text-[9px] font-black text-[#9956DE] bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100 uppercase tracking-widest">Top Spending</span>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Highest Monthly Cost</p>
              <h4 className="text-xl font-black text-[#1e293b] mt-1 truncate">{isLoading ? '...' : highestCostFeature?.featureName || 'N/A'}</h4>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-tighter">Cost Share</span>
                  <span className="text-[13px] font-black text-[#9956DE]">{formatCurrency(highestCostFeature?.estimatedCostUSD || 0)}</span>
                </div>
                <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(highestCostFeature?.estimatedCostUSD || 0) / (totalSpend || 1) * 100}%` }}
                    className="h-full bg-gradient-to-r from-[#9956DE] to-[#8b5cf6] rounded-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Most Active Card (Reduced padding/height) */}
          <div className="lg:col-span-4 bg-white rounded-[28px] border border-slate-200 p-6 shadow-sm flex flex-col justify-between group">
             <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-50 text-[#0EA5E9] flex items-center justify-center border border-slate-100 group-hover:scale-110 transition-transform">
                <MousePointer2 size={20} />
              </div>
              <span className="text-[9px] font-black text-[#0EA5E9] bg-sky-50 px-2.5 py-1 rounded-full border border-sky-100 uppercase tracking-widest">Most Active</span>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Most Popular Feature</p>
              <h4 className="text-xl font-black text-[#1e293b] mt-1 truncate">{isLoading ? '...' : mostActiveFeature?.featureName || 'N/A'}</h4>
              <p className="text-2xl font-black text-[#1e293b] mt-3 tracking-tighter leading-none">
                {isLoading ? '...' : formatNumber(mostActiveFeature?.requestCount || 0)}
                <span className="text-[10px] text-slate-400 font-bold ml-2 uppercase tracking-widest">REQS</span>
              </p>
            </div>
          </div>

          {/* Nav Card to Full Directory (Reduced padding/height) */}
          <div 
            onClick={() => setShowFullList(true)}
            className="lg:col-span-4 bg-white rounded-[28px] border border-slate-200 p-6 flex flex-col justify-center items-center text-center group cursor-pointer transition-all hover:border-[#9956DE]/50"
          >
            <div className="w-12 h-12 rounded-full bg-[#9956DE]/10 text-[#9956DE] flex items-center justify-center mb-3 group-hover:scale-110 transition-all">
              <ListFilter size={24} />
            </div>
            <h3 className="text-[16px] font-black text-[#1e293b] tracking-tight">System Directory</h3>
            
            <button className="mt-4 flex items-center gap-2 px-5 py-2 bg-[#9956DE] text-white rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-lg shadow-purple-100 transition-all hover:bg-[#8b5cf6] hover:scale-105">
              SEE FULL LIST <ArrowRight size={12} />
            </button>
          </div>

          {/* Quick Ranking Mini-List */}
          <div className="lg:col-span-12 bg-white rounded-[28px] border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4 px-2">
              <BarChart3 size={16} className="text-[#9956DE]" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resource Ranking Breakdown</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-2">
              {sortedByCost.slice(0, 4).map((area, idx) => {
                const meta = FEATURE_META[area.id] || { icon: Zap, color: 'text-slate-500' };
                return (
                  <div key={area.id} className="flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-[#9956DE] transition-all">
                      <meta.icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-black text-[#1e293b] truncate leading-none">{area.name}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] font-black text-[#9956DE]">{formatCurrency(area.estimatedCost)}</span>
                        <span className="text-[8px] font-black text-slate-400 uppercase">{Math.round(area.costPercent || 0)}% Share</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <div className="sticky top-0 z-40 -mx-[24px] xl:-mx-[32px] px-[24px] xl:px-[32px] pt-4 pb-4 bg-[#f8fafc] backdrop-blur-sm">
            <div className="flex items-center justify-between bg-white rounded-[24px] border border-slate-200/60 shadow-sm p-3">
               <button 
                 onClick={() => setShowFullList(false)}
                 className="flex items-center gap-2 h-12 px-6 text-[11px] font-black text-[#9956DE] hover:bg-purple-50 rounded-xl uppercase tracking-widest transition-all"
               >
                 <ChevronRight className="rotate-180" size={16} /> Back to System Dashboard
               </button>
               <div className="flex items-center gap-2 px-4">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Real-time Engine Logs</span>
               </div>
            </div>
          </div>

          <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm shadow-slate-200/40 relative">
            <div className="rounded-[32px]">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead className="sticky top-[106px] z-30 shadow-md bg-[#f8fafc]">
                  <tr className="border-b border-[#8b5cf6]">
                    <th className="bg-[#9956DE] px-8 py-5 text-[11px] font-black text-white uppercase tracking-widest whitespace-nowrap rounded-tl-[32px]">AI Module Identity</th>
                    <th className="bg-[#9956DE] px-8 py-5 text-[11px] font-black text-white uppercase tracking-widest">Engine Status</th>
                    <th className="bg-[#9956DE] px-8 py-5 text-[11px] font-black text-white uppercase tracking-widest text-right">Inference Reqs</th>
                    <th className="bg-[#9956DE] px-8 py-5 text-[11px] font-black text-white uppercase tracking-widest text-right">Monthly Cost</th>
                    <th className="bg-[#9956DE] px-8 py-5 text-[11px] font-black text-white uppercase tracking-widest rounded-tr-[32px]">Last Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {usageAreas.map(area => {
                  const meta = FEATURE_META[area.id] || { icon: Zap, color: 'text-slate-500 bg-slate-50' };
                  return (
                    <tr key={area.id} className="group hover:bg-purple-50/10 border-b border-slate-50">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${meta.color} border-slate-100`}>
                            <meta.icon size={18} />
                          </div>
                          <div>
                            <span className="font-black text-[#1e293b] text-sm block leading-none tracking-tight group-hover:text-[#9956DE] transition-colors">{area.name}</span>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1 opacity-70">{area.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          area.status === 'Healthy' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                          <div className={`w-1 h-1 rounded-full ${area.status === 'Healthy' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          {area.status}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right font-black text-[#1e293b]">{formatNumber(area.requests)}</td>
                      <td className="px-8 py-5 text-right font-black text-[#9956DE]">{formatCurrency(area.estimatedCost)}</td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                          <Clock size={12} /> {formatTimestamp(area.lastActiveAt)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AdminAIMonitoring;