import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Users, GraduationCap, BookOpen, Clock,
  BarChart3, Activity, Target, Award,
  Calendar, Download, Zap, Brain, Flame,
  PieChart, Database, Loader2, TrendingUp,
  RefreshCw, Sparkles
} from 'lucide-react';
import { Button } from './ui/button';
import { getAnalyticsSummary, type AnalyticsSummary } from '../services/adminService';

const EmptySection: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}> = ({ icon, title, subtitle }) => (
  <div className="flex flex-col items-center justify-center gap-2.5 py-10 text-center">
    <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 flex items-center justify-center">
      {icon}
    </div>
    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{title}</p>
    {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs leading-relaxed">{subtitle}</p>}
  </div>
);

const AdminAnalytics: React.FC = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loadingKPIs, setLoadingKPIs] = useState(true);

  const loadData = () => {
    setLoadingKPIs(true);
    getAnalyticsSummary()
      .then(setSummary)
      .catch(console.error)
      .finally(() => setLoadingKPIs(false));
  };

  useEffect(() => { loadData(); }, []);

  const kpis = [
    {
      label: 'Total Active Users',
      subtext: 'Students & instructors',
      value: loadingKPIs ? null : (summary?.totalActiveUsers ?? 0).toLocaleString(),
      icon: Users,
      iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/50',
    },
    {
      label: 'Avg. Quiz Score',
      subtext: 'Platform assessment mean',
      value: loadingKPIs ? null : `${summary?.avgQuizScore ?? 0}%`,
      icon: Target,
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50',
    },
    {
      label: 'Quizzes Taken',
      subtext: 'Diagnostic & practice runs',
      value: loadingKPIs ? null : (summary?.totalQuizzesTaken ?? 0).toLocaleString(),
      icon: Clock,
      iconBg: 'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-900/50',
    },
    {
      label: 'At-Risk Students',
      subtext: 'Score < 60% or low activity',
      value: loadingKPIs ? null : (summary?.atRiskStudents ?? 0).toString(),
      icon: Activity,
      iconBg: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50',
    },
  ];

  const gamificationCards = [
    {
      label: 'Achievements Unlocked',
      icon: Award,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50/70 dark:bg-rose-950/20',
      border: 'border-rose-100 dark:border-rose-900/40',
      value: loadingKPIs ? null : (summary?.achievementsUnlocked ?? 0).toLocaleString()
    },
    {
      label: 'XP Earned (Platform)',
      icon: Zap,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50/70 dark:bg-violet-950/20',
      border: 'border-violet-100 dark:border-violet-900/40',
      value: loadingKPIs ? null : ((summary?.totalXPEarned ?? 0) >= 1_000_000 ? `${((summary?.totalXPEarned ?? 0) / 1_000_000).toFixed(1)}M` : (summary?.totalXPEarned ?? 0) >= 1_000 ? `${Math.round((summary?.totalXPEarned ?? 0) / 1_000)}K` : (summary?.totalXPEarned ?? 0).toLocaleString())
    },
    {
      label: 'Active Streaks',
      icon: Flame,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50/70 dark:bg-amber-950/20',
      border: 'border-amber-100 dark:border-amber-900/40',
      value: loadingKPIs ? null : (summary?.activeStreaks ?? 0).toLocaleString()
    },
    {
      label: 'AI Tutor Sessions',
      icon: Brain,
      color: 'text-sky-600 dark:text-sky-400',
      bg: 'bg-sky-50/70 dark:bg-sky-950/20',
      border: 'border-sky-100 dark:border-sky-900/40',
      value: loadingKPIs ? null : (summary?.aiTutorSessions ?? 0).toLocaleString()
    },
  ];

  return (
    <div className="space-y-6 pt-2 pb-6 max-w-[1400px] mx-auto min-w-0">
      {/* ── Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800/90 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/60 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Platform Analytics</h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/50">
              <Sparkles size={11} /> Realtime
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">High-level engagement and learning outcome metrics</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 text-xs font-semibold border border-slate-200/80 dark:border-slate-700/60">
            <Activity size={13} className="text-emerald-500 animate-pulse shrink-0" />
            All-Time Platform Metrics
          </span>

          <button
            onClick={loadData}
            disabled={loadingKPIs}
            title="Refresh data"
            aria-label="Refresh data"
            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={15} className={loadingKPIs ? 'animate-spin text-indigo-600' : ''} />
          </button>

          <Button
            variant="outline"
            disabled
            title="Export available in future release"
            className="h-[44px] px-3.5 gap-2 rounded-xl border-slate-200/80 dark:border-slate-700/60 text-xs font-semibold text-slate-400 dark:text-slate-500 opacity-60 cursor-not-allowed"
          >
            <Download size={14} />
            Export
          </Button>
        </div>
      </div>

      {/* ── KPI Stat Bento Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.05 }}
              className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/60 shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${kpi.iconBg}`}>
                  <Icon size={18} />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">KPI</span>
              </div>
              <div>
                {loadingKPIs ? (
                  <div className="h-8 w-24 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" />
                ) : (
                  <p className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white tabular-nums">
                    {kpi.value}
                  </p>
                )}
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">{kpi.label}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{kpi.subtext}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Limited Data Banner ── */}
      {!loadingKPIs && !summary?.totalActiveUsers && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 rounded-2xl px-5 py-3.5"
        >
          <Database size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
            Limited usage data recorded. Metrics will continuously update as students and teachers complete lessons and quizzes.
          </p>
        </motion.div>
      )}

      {/* ── Row 1: Performance Trends (8) + Grade Distribution (4) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="xl:col-span-8 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-5 sm:p-6 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50">
                <TrendingUp size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Performance Trends</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">Student score trajectory vs benchmark goals</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <span>Students</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-violet-400" />
                <span>Targets</span>
              </div>
            </div>
          </div>
          <EmptySection
            icon={<BarChart3 size={22} className="text-slate-300 dark:text-slate-600" />}
            title="No performance trajectory data yet"
            subtitle="Trend curves will generate as students submit quizzes and assessments across subjects."
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="xl:col-span-4 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-5 sm:p-6 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center border border-violet-100 dark:border-violet-900/50">
              <PieChart size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Grade Distribution</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">Mastery cohort breakdown</p>
            </div>
          </div>
          <EmptySection
            icon={<Database size={22} className="text-slate-300 dark:text-slate-600" />}
            title="No grade bracket records"
            subtitle="Cohort distributions will render once summative assessments are logged."
          />
        </motion.div>
      </div>

      {/* ── Row 2: Subject Engagement (7) + Weekly Activity (5) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="xl:col-span-7 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-5 sm:p-6 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-100 dark:border-sky-900/50">
              <BookOpen size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Subject Engagement</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">Enrollment & completion rate</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/60 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/90 dark:bg-slate-800/90 border-b border-slate-200/80 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Subject</th>
                  <th className="text-right px-4 py-3">Enrolled</th>
                  <th className="text-right px-4 py-3">Completion</th>
                  <th className="text-right px-4 py-3">Avg. Score</th>
                  <th className="text-left px-4 py-3 w-28">Progress</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={5} className="px-4 py-8">
                    <EmptySection
                      icon={<Database size={20} className="text-slate-300 dark:text-slate-600" />}
                      title="No subject engagement logs available"
                      subtitle="Class enrollment and module submissions will populate this breakdown."
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="xl:col-span-5 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-5 sm:p-6 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-100 dark:border-orange-900/50">
              <Calendar size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Weekly Activity</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">Student sessions per day</p>
            </div>
          </div>
          <EmptySection
            icon={<Activity size={22} className="text-slate-300 dark:text-slate-600" />}
            title="No session activity recorded"
            subtitle="Daily student check-ins and lesson runs will plot here."
          />
        </motion.div>
      </div>

      {/* ── Row 3: Gamification (5) + Top Classes (7) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="xl:col-span-5 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-5 sm:p-6 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-100 dark:border-rose-900/50">
              <Award size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Gamification Overview</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">Student motivation and retention drivers</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {gamificationCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className={`${card.bg} border ${card.border} rounded-xl p-3.5 transition-all`}>
                  <div className="flex items-center justify-between mb-2">
                    <Icon size={16} className={card.color} />
                  </div>
                  {loadingKPIs ? (
                    <div className="w-12 h-5 bg-white/60 dark:bg-slate-800/60 rounded animate-pulse" />
                  ) : (
                    <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums leading-none">{card.value}</p>
                  )}
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1.5">{card.label}</p>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.35 }}
          className="xl:col-span-7 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-5 sm:p-6 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/50">
              <GraduationCap size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Top Performing Classes</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">Ranked by section mastery mean</p>
            </div>
          </div>
          <EmptySection
            icon={<Database size={22} className="text-slate-300 dark:text-slate-600" />}
            title="No class rankings computed"
            subtitle="Rankings appear as classes complete assessments."
          />
        </motion.div>
      </div>
    </div>
  );
};

export default AdminAnalytics;