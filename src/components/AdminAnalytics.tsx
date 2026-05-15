import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Users, GraduationCap, BookOpen, Clock,
  BarChart3, Activity, Target, Award,
  Calendar, Download, Zap, Brain, Flame,
  PieChart, Database, Loader2, TrendingUp,
  RefreshCw
} from 'lucide-react';
import { Button } from './ui/button';
import { getAnalyticsSummary, type AnalyticsSummary } from '../services/adminService';

type TimeRange = '7d' | '30d' | '90d' | '12m';

const EmptySection: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}> = ({ icon, title, subtitle }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
    <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
      {icon}
    </div>
    <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{title}</p>
    {subtitle && <p className="text-[10px] text-slate-400 font-medium max-w-xs leading-relaxed">{subtitle}</p>}
  </div>
);

const AdminAnalytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loadingKPIs, setLoadingKPIs] = useState(true);
  const rangeSelectionSupported = false;

  const loadData = () => {
    setLoadingKPIs(true);
    getAnalyticsSummary()
      .then(setSummary)
      .catch(console.error)
      .finally(() => setLoadingKPIs(false));
  };

  useEffect(() => { loadData(); }, []);

  const timeRangeLabels: Record<TimeRange, string> = {
    '7d': '7 Days',
    '30d': '30 Days',
    '90d': '90 Days',
    '12m': '12 Months',
  };

  const kpis = [
    { label: 'Total Active Users', value: loadingKPIs ? null : (summary?.totalActiveUsers ?? 0).toLocaleString(), icon: Users, bg: 'bg-[#4f46e5]', shadow: 'shadow-indigo-500/20' },
    { label: 'Completion Rate', value: 'N/A', icon: Target, bg: 'bg-[#10b981]', shadow: 'shadow-emerald-500/20' },
    { label: 'Session Duration', value: 'N/A', icon: Clock, bg: 'bg-[#8b5cf6]', shadow: 'shadow-purple-500/20' },
    { label: 'At-Risk Students', value: loadingKPIs ? null : (summary?.atRiskStudents ?? 0).toString(), icon: Activity, bg: 'bg-[#f43f5e]', shadow: 'shadow-rose-500/20' },
  ];

  const gamificationCards = [
    { label: 'Achievements Unlocked', icon: Award, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', value: loadingKPIs ? null : (summary?.achievementsUnlocked ?? 0).toLocaleString() },
    { label: 'XP Earned (Platform)', icon: Zap, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100', value: loadingKPIs ? null : ((summary?.totalXPEarned ?? 0) >= 1_000_000 ? `${((summary?.totalXPEarned ?? 0) / 1_000_000).toFixed(1)}M` : (summary?.totalXPEarned ?? 0) >= 1_000 ? `${Math.round((summary?.totalXPEarned ?? 0) / 1_000)}K` : (summary?.totalXPEarned ?? 0).toLocaleString()) },
    { label: 'Active Streaks', icon: Flame, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', value: loadingKPIs ? null : (summary?.activeStreaks ?? 0).toLocaleString() },
    { label: 'AI Tutor Sessions', icon: Brain, color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-100', value: loadingKPIs ? null : (summary?.aiTutorSessions ?? 0).toLocaleString() },
  ];

  return (
    <div className="space-y-6 pt-6 xl:pt-8 pb-10 max-w-[1600px] mx-auto">
      {/* ── Header Bar ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-[#9956DE] rounded-full" />
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Platform Analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white rounded-xl p-1 shadow-sm border border-slate-200/60">
            {(Object.entries(timeRangeLabels) as [TimeRange, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTimeRange(key)}
                disabled={!rangeSelectionSupported}
                title={!rangeSelectionSupported ? 'Range selection unavailable' : undefined}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  timeRange === key
                    ? 'bg-[#9956DE] text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50'
                } ${!rangeSelectionSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={loadData}
            disabled={loadingKPIs}
            title="Refresh data"
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-[#9956DE] shadow-sm transition-all active:scale-95"
          >
            <RefreshCw size={14} className={loadingKPIs ? 'animate-spin' : ''} />
          </button>
          <Button
            variant="outline"
            disabled
            title="Export unavailable"
            className="h-9 px-4 gap-2 rounded-xl border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400 opacity-50 cursor-not-allowed shadow-sm"
          >
            <Download size={14} />
            Export
          </Button>
        </div>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className={`relative overflow-hidden ${kpi.bg} ${kpi.shadow} p-5 rounded-[28px] text-white flex flex-col gap-3 group hover:scale-[1.02] transition-all duration-300 shadow-lg`}
            >
              <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/10 group-hover:scale-[1.6] transition-transform duration-700 ease-out" />
              <div className="absolute -left-4 -top-4 w-12 h-12 rounded-full bg-white/10 group-hover:scale-[1.4] transition-transform duration-700 delay-75 ease-out" />
              <div className="relative z-10 flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">{kpi.label}</p>
                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm group-hover:bg-white/30 transition-colors">
                  <Icon size={14} />
                </div>
              </div>
              {loadingKPIs ? (
                <div className="relative z-10 flex items-center gap-2">
                  <Loader2 size={18} className="animate-spin opacity-60" />
                </div>
              ) : (
                <h3 className="relative z-10 text-3xl font-display font-black leading-none tracking-tight">{kpi.value}</h3>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* ── Limited Data Banner ── */}
      {!loadingKPIs && !summary?.totalActiveUsers && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-5 py-3"
        >
          <Database size={16} className="text-amber-600 shrink-0" />
          <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">
            Limited data — KPIs populate as platform usage grows. Charts require time-series data.
          </p>
        </motion.div>
      )}

      {/* ── Row 1: Performance Trends (8) + Grade Distribution (4) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="xl:col-span-8 bg-white rounded-[28px] border border-slate-200/60 p-6 shadow-sm shadow-slate-200/40"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                <TrendingUp size={18} />
              </div>
              <div>
                <h2 className="text-sm font-black text-[#1e293b] tracking-tight">Performance Trends</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Students vs. Teacher Targets</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Students</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Targets</span>
              </div>
            </div>
          </div>
          <EmptySection
            icon={<BarChart3 size={22} className="text-slate-300" />}
            title="No performance data yet"
            subtitle="Trend charts will generate as students complete quizzes and assessments."
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          className="xl:col-span-4 bg-white rounded-[28px] border border-slate-200/60 p-6 shadow-sm shadow-slate-200/40"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              <PieChart size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black text-[#1e293b] tracking-tight">Grade Distribution</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Current Term</p>
            </div>
          </div>
          <EmptySection
            icon={<Database size={22} className="text-slate-300" />}
            title="No grade data"
            subtitle="Import quiz results to see grade breakdowns."
          />
        </motion.div>
      </div>

      {/* ── Row 2: Subject Engagement (7) + Weekly Activity (5) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
          className="xl:col-span-7 bg-white rounded-[28px] border border-slate-200/60 p-6 shadow-sm shadow-slate-200/40"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
              <BookOpen size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black text-[#1e293b] tracking-tight">Subject Engagement</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Enrollment & Completion</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/60 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/80">
                  <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-5 py-3">Subject</th>
                  <th className="text-right text-[10px] font-black text-slate-400 uppercase tracking-widest px-5 py-3">Enrolled</th>
                  <th className="text-right text-[10px] font-black text-slate-400 uppercase tracking-widest px-5 py-3">Completion</th>
                  <th className="text-right text-[10px] font-black text-slate-400 uppercase tracking-widest px-5 py-3">Avg. Score</th>
                  <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-5 py-3 w-32">Progress</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={5} className="px-4 py-8">
                    <EmptySection
                      icon={<Database size={20} className="text-slate-300" />}
                      title="No subject data available"
                      subtitle="Import class enrollment records to view engagement."
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.25 }}
          className="xl:col-span-5 bg-white rounded-[28px] border border-slate-200/60 p-6 shadow-sm shadow-slate-200/40"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100">
              <Calendar size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black text-[#1e293b] tracking-tight">Weekly Activity</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Sessions Per Day</p>
            </div>
          </div>
          <EmptySection
            icon={<Activity size={22} className="text-slate-300" />}
            title="No session activity yet"
            subtitle="Student logins and session data will appear here."
          />
        </motion.div>
      </div>

      {/* ── Row 3: Gamification (5) + Top Classes (7) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.3 }}
          className="xl:col-span-5 bg-white rounded-[28px] border border-slate-200/60 p-6 shadow-sm shadow-slate-200/40"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <Award size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black text-[#1e293b] tracking-tight">Gamification Overview</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Engagement Metrics</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {gamificationCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className={`${card.bg} border ${card.border} rounded-2xl p-4 group hover:scale-[1.02] transition-all duration-200`}>
                  <div className="flex items-center justify-between mb-2">
                    <Icon size={18} className={card.color} />
                  </div>
                  {loadingKPIs ? (
                    <div className="w-12 h-5 bg-white/60 rounded-lg mt-1 mb-1 animate-pulse" />
                  ) : (
                    <p className="text-xl font-black text-[#1e293b] leading-none">{card.value}</p>
                  )}
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">{card.label}</p>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.35 }}
          className="xl:col-span-7 bg-white rounded-[28px] border border-slate-200/60 p-6 shadow-sm shadow-slate-200/40"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <GraduationCap size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black text-[#1e293b] tracking-tight">Top Performing Classes</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Ranked by Average Score</p>
            </div>
          </div>
          <EmptySection
            icon={<Database size={22} className="text-slate-300" />}
            title="No class data yet"
            subtitle="Import class and student records to see top performers."
          />
        </motion.div>
      </div>
    </div>
  );
};

export default AdminAnalytics;