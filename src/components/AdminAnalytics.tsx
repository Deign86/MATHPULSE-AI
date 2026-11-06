import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, GraduationCap, BookOpen, Clock,
  BarChart3, Activity, Target, Award,
  Calendar, Download, Zap, Brain, Flame,
  PieChart as PieChartIcon, Database, Loader2, TrendingUp,
  RefreshCw, Sparkles, Filter, CheckCircle2,
  AlertTriangle, ArrowUpRight, ChevronRight, Layers,
  TrendingDown, ShieldAlert, BookCheck
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip
} from 'recharts';
import { getAnalyticsSummary, type AnalyticsSummary } from '../services/adminService';
import type { AdminAnalyticsRange } from '../utils/adminAnalyticsRange';

type TimeRange = AdminAnalyticsRange;
const TIME_RANGES: readonly TimeRange[] = ['7d', '30d', '90d', 'all'];
type AnalyticsTab = 'outcomes' | 'curriculum' | 'engagement';

const COHORT_COLORS = {
  advanced: '#10B981',
  proficient: '#6366F1',
  developing: '#F59E0B',
  atRisk: '#F43F5E',
};

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

interface AdminAnalyticsProps {
  onManageSections?: () => void;
}

export const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({ onManageSections }) => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [loadingKPIs, setLoadingKPIs] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('outcomes');
  const [isExporting, setIsExporting] = useState(false);
  const summaryRequestId = useRef(0);

  const loadData = useCallback(() => {
    const requestId = summaryRequestId.current + 1;
    summaryRequestId.current = requestId;
    setLoadingKPIs(true);
    setSummaryError(null);
    getAnalyticsSummary(timeRange)
      .then((nextSummary) => {
        if (summaryRequestId.current === requestId) setSummary(nextSummary);
      })
      .catch((err) => {
        console.error('[AdminAnalytics] summary load failed:', err);
        if (summaryRequestId.current === requestId) setSummaryError('Analytics could not be loaded.');
      })
      .finally(() => {
        if (summaryRequestId.current === requestId) setLoadingKPIs(false);
      });
  }, [timeRange]);

  useEffect(() => { loadData(); }, [loadData]);

  // Only the selected-window aggregate is available from the live summary.
  const trajectoryData = useMemo(() => {
    if (summary === null) return [];
    return [{ period: timeRange.toUpperCase(), studentScore: summary.avgQuizScore, targetScore: 80 }];
  }, [summary, timeRange]);

  // Grade Cohort Distribution
  const cohortData = useMemo(() => {
    const learnerScores = new Map<string, number[]>();
    summary?.quizAttempts.forEach(({ learnerId, score }) => {
      if (score === null) return;
      const scores = learnerScores.get(learnerId) ?? [];
      scores.push(score);
      learnerScores.set(learnerId, scores);
    });
    const learnerAverages = [...learnerScores.values()].map((scores) => (
      scores.reduce((total, score) => total + score, 0) / scores.length
    ));
    const countFor = (matches: (score: number) => boolean) => learnerAverages.filter(matches).length;
    const advancedCount = countFor((score) => score >= 90);
    const proficientCount = countFor((score) => score >= 75 && score < 90);
    const developingCount = countFor((score) => score >= 60 && score < 75);
    const atRiskCount = countFor((score) => score < 60);
    const totalLearners = learnerAverages.length;

    return [
      { name: 'Advanced (90-100%)', count: advancedCount, percent: totalLearners ? Math.round((advancedCount / totalLearners) * 100) : 0, color: COHORT_COLORS.advanced },
      { name: 'Proficient (75-89%)', count: proficientCount, percent: totalLearners ? Math.round((proficientCount / totalLearners) * 100) : 0, color: COHORT_COLORS.proficient },
      { name: 'Developing (60-74%)', count: developingCount, percent: totalLearners ? Math.round((developingCount / totalLearners) * 100) : 0, color: COHORT_COLORS.developing },
      { name: 'Needs Support (<60%)', count: atRiskCount, percent: totalLearners ? Math.round((atRiskCount / totalLearners) * 100) : 0, color: COHORT_COLORS.atRisk },
    ];
  }, [summary]);

  const weeklyActivity = useMemo(() => {
    const attemptsByWeekday = new Array<number>(7).fill(0);
    summary?.quizAttempts.forEach(({ occurredAt }) => {
      if (occurredAt !== null) attemptsByWeekday[occurredAt.getDay()] += 1;
    });
    return WEEKDAY_ORDER.map((weekday) => ({ day: WEEKDAY_LABELS[weekday], quizzes: attemptsByWeekday[weekday] }));
  }, [summary]);
  const datedAttemptCount = weeklyActivity.reduce((total, { quizzes }) => total + quizzes, 0);
  const peakWeekday = weeklyActivity.reduce((peak, entry) => (entry.quizzes > peak.quizzes ? entry : peak), weeklyActivity[0]);

  const passRate = useMemo(() => {
    const total = cohortData.reduce((acc, c) => acc + c.count, 0);
    if (total === 0) return 0;
    const passing = cohortData.filter(c => c.name !== 'Needs Support (<60%)').reduce((acc, c) => acc + c.count, 0);
    return Math.round((passing / total) * 100);
  }, [cohortData]);

  // Export CSV Handler
  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      const rows = [
        ['MathPulse AI - Platform Learning & Outcome Analytics Report'],
        [`Generated At: ${new Date().toLocaleString()}`],
        [`Timeframe Filter: ${timeRange.toUpperCase()}`],
        [],
        ['KEY PERFORMANCE INDICATORS'],
        ['Metric', 'Value'],
        ['Active Learners', summary?.activeLearners ?? 0],
        ['Average Quiz Score', `${summary?.avgQuizScore ?? 0}%`],
        ['Quiz Attempts', summary?.totalQuizzesTaken ?? 0],
        ['Learners Scoring Below 60%', atRiskCount],
        [],
        ['QUIZ ATTEMPTS IN SELECTED RANGE'],
        ['Learner ID', 'Occurred At', 'Score'],
        ...((summary?.quizAttempts ?? []).map((attempt) => [
          attempt.learnerId,
          attempt.occurredAt?.toISOString() ?? 'Undated (all-time only)',
          attempt.score ?? '',
        ])),
        [],
      ];

      const columnCount = Math.max(...rows.map(row => row.length));
      const csvContent = rows.map(row => Array.from({ length: columnCount }, (_, index) => {
        const item = row[index] ?? '';
        return `"${String(item).replace(/"/g, '""')}"`;
      }).join(',')).join('\n');
      const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `MathPulse_Analytics_${timeRange}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const activeUsersCount = summary?.activeLearners ?? 0;
  const avgQuizScore = summary?.avgQuizScore ?? 0;
  const quizzesTakenCount = summary?.totalQuizzesTaken ?? 0;
  const atRiskCount = new Set((summary?.quizAttempts ?? [])
    .filter(({ score }) => score !== null && score < 60)
    .map(({ learnerId }) => learnerId)).size;
  const scoredAttemptCount = (summary?.quizAttempts ?? []).filter(({ score }) => score !== null).length;

  const kpiBentos = [
    {
      title: 'Active Learners',
      value: loadingKPIs ? null : activeUsersCount.toLocaleString(),
      subValue: `${summary?.activeLearners ?? 0} students with quiz activity • ${timeRange.toUpperCase()}`,
      badge: timeRange.toUpperCase(),
      trend: 'Selected range',
      isPositive: true,
      icon: Users,
      gradient: 'bg-gradient-to-br from-[#6366F1] via-[#4F46E5] to-[#4338CA]',
      shadow: 'shadow-[0_8px_24px_-6px_rgba(99,102,241,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(99,102,241,0.48)]',
      progressPercent: summary?.totalStudents ? (activeUsersCount / summary.totalStudents) * 100 : 0,
    },
    {
      title: 'Mastery Average',
      value: loadingKPIs ? null : `${avgQuizScore}%`,
      subValue: 'Benchmark target is 75.0%',
      badge: `Pass: ${passRate}%`,
      trend: `${timeRange.toUpperCase()} average`,
      isPositive: true,
      icon: Target,
      gradient: 'bg-gradient-to-br from-[#10B981] via-[#059669] to-[#047857]',
      shadow: 'shadow-[0_8px_24px_-6px_rgba(16,185,129,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(16,185,129,0.48)]',
      progressPercent: Math.min(100, Math.round(avgQuizScore)),
    },
    {
      title: 'Quizzes Taken',
      value: loadingKPIs ? null : quizzesTakenCount.toLocaleString(),
      subValue: `Diagnostic & practice logs • ${timeRange.toUpperCase()}`,
      badge: timeRange.toUpperCase(),
      trend: `${quizzesTakenCount} attempts`,
      isPositive: true,
      icon: Clock,
      gradient: 'bg-gradient-to-br from-[#9956DE] via-[#8643C8] to-[#7274ED]',
      shadow: 'shadow-[0_8px_24px_-6px_rgba(153,86,222,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(153,86,222,0.48)]',
      progressPercent: Math.min(100, quizzesTakenCount),
    },
    {
      title: 'At-Risk Students',
      value: loadingKPIs ? null : atRiskCount.toString(),
      subValue: `Learners scoring below 60% • ${timeRange.toUpperCase()}`,
      badge: timeRange.toUpperCase(),
      trend: `${atRiskCount} learners`,
      isPositive: true,
      icon: ShieldAlert,
      gradient: 'bg-gradient-to-br from-[#FB7185] via-[#F43F5E] to-[#E11D48]',
      shadow: 'shadow-[0_8px_24px_-6px_rgba(244,63,94,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(244,63,94,0.48)]',
      progressPercent: summary?.activeLearners ? (atRiskCount / summary.activeLearners) * 100 : 0,
    },
  ];

  const gamificationCards = [
    {
      label: 'Achievements Unlocked',
      subtext: 'Badges earned by learners',
      icon: Award,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10 dark:bg-amber-950/20',
      border: 'border-amber-200/80 dark:border-amber-900/40',
      value: loadingKPIs ? null : (summary?.achievementsUnlocked ?? 0).toLocaleString(),
    },
    {
      label: 'Platform XP Earned',
      subtext: 'Total gamified points',
      icon: Zap,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-500/10 dark:bg-violet-950/20',
      border: 'border-violet-200/80 dark:border-violet-900/40',
      value: loadingKPIs ? null : ((summary?.totalXPEarned ?? 0) >= 1_000_000 ? `${((summary?.totalXPEarned ?? 0) / 1_000_000).toFixed(1)}M` : (summary?.totalXPEarned ?? 0) >= 1_000 ? `${Math.round((summary?.totalXPEarned ?? 0) / 1_000)}K` : (summary?.totalXPEarned ?? 0).toLocaleString()),
    },
    {
      label: 'Active Streaks',
      subtext: 'Daily learning consistency',
      icon: Flame,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-500/10 dark:bg-rose-950/20',
      border: 'border-rose-200/80 dark:border-rose-900/40',
      value: loadingKPIs ? null : (summary?.activeStreaks ?? 0).toLocaleString(),
    },
    {
      label: 'AI Tutor Sessions',
      subtext: 'Socratic dialogue runs',
      icon: Brain,
      color: 'text-sky-600 dark:text-sky-400',
      bg: 'bg-sky-500/10 dark:bg-sky-950/20',
      border: 'border-sky-200/80 dark:border-sky-900/40',
      value: loadingKPIs ? null : (summary?.aiTutorSessions ?? 0).toLocaleString(),
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6 max-w-[1600px] mx-auto min-w-0 pt-4 sm:pt-6 pb-8 animate-in fade-in duration-300">

      {/* ── Top Utility & Action Toolbar ── */}
      <div data-tour="analytics-toolbar" className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-slate-900/90 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Realtime Telemetry
          </span>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Senior High School STEM Learning Analytics
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto shrink-0">
          {/* Timeframe Filter Pills */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
            {TIME_RANGES.map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 pointer-coarse:min-h-11 pointer-coarse:min-w-11 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timeRange === range
                    ? 'bg-gradient-to-r from-[#9956DE] via-[#8643C8] to-[#7274ED] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => loadData()}
            disabled={loadingKPIs}
            title="Refresh platform telemetry"
            aria-label="Refresh platform telemetry"
            className="p-2 min-w-[38px] min-h-[38px] pointer-coarse:min-w-11 pointer-coarse:min-h-11 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-[#9956DE] dark:hover:text-purple-300 hover:border-purple-300 dark:hover:border-purple-700 shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={14} className={loadingKPIs ? 'animate-spin text-[#9956DE]' : ''} />
          </button>

          {/* Export CSV Report Button */}
          <button
            onClick={handleExportCSV}
            disabled={isExporting || loadingKPIs}
            className="inline-flex items-center gap-1.5 min-h-[38px] pointer-coarse:min-h-11 rounded-xl bg-gradient-to-r from-[#9956DE] via-[#8643C8] to-[#7274ED] hover:from-[#8643C8] hover:to-[#6366F1] px-3.5 text-xs font-bold text-white shadow-xs hover:shadow-md hover:shadow-purple-500/20 transition-all active:scale-95 disabled:opacity-50 border border-purple-400/30 cursor-pointer"
          >
            {isExporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            Export Report
          </button>
        </div>
      </div>

      {summaryError !== null && (
        <div role="alert" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-sm text-rose-800 dark:text-rose-200">
          <span className="flex items-center gap-2 font-semibold">
            <AlertTriangle size={16} />
            {summaryError} The figures below are placeholders, not platform activity.
          </span>
          <button
            type="button"
            onClick={() => loadData()}
            className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors cursor-pointer"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* ── Top Executive KPI Bento Cards (Full Color Gradients - 2x2 on mobile, 4-col on desktop) ── */}
      <div data-tour="analytics-kpis" className="grid grid-cols-2 @4xl:grid-cols-4 gap-2.5 sm:gap-4">
        {kpiBentos.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: idx * 0.04 }}
              className={`relative overflow-hidden rounded-xl sm:rounded-3xl p-2.5 sm:p-5 ${kpi.gradient} ${kpi.shadow} border border-white/20 dark:border-white/15 hover:border-white/35 transition-all duration-300 ease-out flex flex-col justify-between group min-w-0 text-white select-none`}
            >
              {/* Ambient Glow */}
              <div className="absolute -bottom-6 -right-6 w-20 sm:w-36 h-20 sm:h-36 bg-white/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-all duration-500 ease-out" />
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

              <div className="relative z-10 flex items-start justify-between gap-1.5 sm:gap-2 mb-1.5 sm:mb-3">
                <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                    <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-white/95 min-w-0 leading-tight">
                      {kpi.title}
                    </span>
                    {kpi.badge && (
                      <span className="inline-flex items-center rounded-full px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[9px] font-bold bg-white/20 backdrop-blur-md text-white border border-white/25 shadow-2xs">
                        {kpi.badge}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 sm:mt-1">
                    {loadingKPIs ? (
                      <div className="h-6 sm:h-7 w-16 sm:w-20 bg-white/20 rounded-lg animate-pulse" />
                    ) : (
                      <p className="text-lg sm:text-3xl font-display font-black text-white tabular-nums tracking-tight leading-none drop-shadow-xs">
                        {summaryError === null ? kpi.value : '—'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-2xl bg-white/20 backdrop-blur-md border border-white/25 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-xs text-white">
                  <Icon size={14} className="sm:hidden" />
                  <Icon size={18} className="hidden sm:block" />
                </div>
              </div>

              {/* Subtext and Progress Bar */}
              <div className="relative z-10 space-y-1.5 sm:space-y-2 mt-1 sm:mt-2 pt-1.5 sm:pt-2.5 border-t border-white/20">
                <div className="flex items-center justify-between text-[10px] sm:text-[11px] gap-1.5">
                  <span className="text-white/90 font-medium min-w-0 leading-snug drop-shadow-xs">
                    {kpi.subValue}
                  </span>
                  {kpi.trend && (
                    <span className="inline-flex items-center gap-0.5 font-black text-white text-[9px] sm:text-[10px] bg-white/20 backdrop-blur-md px-1.5 sm:px-2 py-0.5 rounded-full border border-white/25 shadow-2xs shrink-0">
                      {kpi.trend}
                    </span>
                  )}
                </div>

                {/* Micro Progress Bar */}
                {kpi.progressPercent !== undefined && (
                  <div className="w-full h-1 sm:h-1.5 rounded-full bg-white/20 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-white transition-all duration-500 shadow-xs"
                      style={{ width: `${Math.min(Math.max(kpi.progressPercent, 0), 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Categorized Focus Navigation Tabs (Sticky Header) ── */}
      <div data-tour-sticky="" data-tour="analytics-tabs" className="sticky top-0 short:static z-20 -mx-1 px-1 py-1.5 bg-[#f8fafc]/95 dark:bg-slate-900/95 backdrop-blur-md">
        <div className="grid grid-cols-3 xl:flex xl:w-fit items-center gap-1.5 p-1 sm:p-1.5 bg-slate-100/90 dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 w-full shadow-xs">
          <button
            onClick={() => setActiveTab('outcomes')}
            className={`flex items-center justify-center xl:justify-start gap-2 min-w-0 h-full px-2 sm:px-4 py-2 sm:py-2.5 pointer-coarse:min-h-11 rounded-xl text-xs sm:text-sm font-bold leading-tight text-center xl:text-left xl:whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'outcomes'
                ? 'bg-gradient-to-r from-[#9956DE] via-[#8643C8] to-[#7274ED] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
            }`}
          >
            <TrendingUp size={15} className="hidden sm:block shrink-0" />
            <span className="sm:hidden">Outcomes</span>
            <span className="hidden sm:inline">Learning Outcomes & Trajectory</span>
          </button>

          <button
            onClick={() => setActiveTab('curriculum')}
            className={`flex items-center justify-center xl:justify-start gap-2 min-w-0 h-full px-2 sm:px-4 py-2 sm:py-2.5 pointer-coarse:min-h-11 rounded-xl text-xs sm:text-sm font-bold leading-tight text-center xl:text-left xl:whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'curriculum'
                ? 'bg-gradient-to-r from-[#9956DE] via-[#8643C8] to-[#7274ED] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
            }`}
          >
            <BookOpen size={15} className="hidden sm:block shrink-0" />
            <span className="sm:hidden">Curriculum</span>
            <span className="hidden sm:inline">Curriculum & Subject Health</span>
          </button>

          <button
            onClick={() => setActiveTab('engagement')}
            className={`flex items-center justify-center xl:justify-start gap-2 min-w-0 h-full px-2 sm:px-4 py-2 sm:py-2.5 pointer-coarse:min-h-11 rounded-xl text-xs sm:text-sm font-bold leading-tight text-center xl:text-left xl:whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'engagement'
                ? 'bg-gradient-to-r from-[#9956DE] via-[#8643C8] to-[#7274ED] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
            }`}
          >
            <Award size={15} className="hidden sm:block shrink-0" />
            <span className="sm:hidden">Engagement</span>
            <span className="hidden sm:inline">Engagement & Leaderboards</span>
          </button>
        </div>
      </div>

      {/* ── Tab Views ── */}
      <AnimatePresence mode="wait">

        {/* ── Tab 1: Outcomes & Trajectory ── */}
        {activeTab === 'outcomes' && (
          <motion.div
            key="tab-outcomes"
            data-tour="analytics-outcomes"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-5"
          >
            {/* Performance Trajectory Area Chart */}
            <div className="xl:col-span-8 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-100 dark:border-slate-700/60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-[#9956DE] dark:text-purple-300 flex items-center justify-center border border-purple-200/60 dark:border-purple-800/50 shadow-xs">
                      <TrendingUp size={18} />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Average Quiz Score by Range</h2>
                      <p className="text-xs text-slate-400 dark:text-slate-500">Live average of quiz attempts in the selected range</p>
                    </div>
                  </div>

                  {/* Chart Legend */}
                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#9956DE]" />
                      <span>Students ({avgQuizScore}%)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <span className="w-3 h-0.5 bg-slate-300 dark:bg-slate-600" />
                      <span>Target (80%)</span>
                    </div>
                  </div>
                </div>

                {/* Recharts Area Curve */}
                <div className="h-[280px] sm:h-[320px] short:h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trajectoryData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorStudent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#9956DE" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#9956DE" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.6} />
                      <XAxis
                        dataKey="period"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }}
                        dy={8}
                      />
                      <YAxis
                        domain={[0, 100]}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }}
                        unit="%"
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderRadius: '10px',
                          border: '1px solid #1e293b',
                          color: '#fff',
                          fontSize: '12px',
                          padding: '8px 12px',
                        }}
                        formatter={(value: any, name: any) => [
                          `${value}%`,
                          name === 'studentScore' ? 'Student Average' : name === 'aiAssisted' ? 'AI Assisted Cohort' : 'Benchmark'
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="studentScore"
                        name="studentScore"
                        stroke="#9956DE"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorStudent)"
                        dot={{ r: 5, strokeWidth: 2, fill: '#9956DE' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="targetScore"
                        name="targetScore"
                        stroke="#94a3b8"
                        strokeWidth={1.5}
                        strokeDasharray="6 6"
                        fill="transparent"
                        dot={{ r: 3, fill: '#94a3b8' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Aligned with DepEd STEM Most Essential Learning Competencies (MELCs).</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Scored attempts: {scoredAttemptCount}</span>
              </div>
            </div>

            {/* Grade Cohorts Donut Chart */}
            <div className="xl:col-span-4 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-700/60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800/50 shadow-xs">
                      <PieChartIcon size={18} />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Mastery Cohorts</h2>
                      <p className="text-xs text-slate-400 dark:text-slate-500">Student proficiency breakdown</p>
                    </div>
                  </div>
                </div>

                {/* Donut Chart with Centered Rate */}
                <div className="relative h-[190px] w-full flex items-center justify-center my-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={cohortData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="count"
                      >
                        {cohortData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderRadius: '8px',
                          border: '1px solid #1e293b',
                          color: '#fff',
                          fontSize: '11px',
                        }}
                        formatter={(val: any, name: any) => [`${val} students (${cohortData.find(c => c.name === name)?.percent}%)`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <span className="text-2xl font-display font-extrabold text-slate-900 dark:text-white leading-none">
                      {passRate}%
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                      Pass Rate
                    </span>
                  </div>
                </div>

                {/* Cohort Legend List */}
                <div className="space-y-1.5 mt-2">
                  {cohortData.map((cohort) => (
                    <div key={cohort.name} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cohort.color }} />
                        <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">{cohort.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white tabular-nums">{cohort.count}</span>
                        <span className="text-slate-400 text-[10px] w-7 text-right font-medium">{cohort.percent}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-bold text-slate-800 dark:text-slate-200">{cohortData[0].count + cohortData[1].count} students</span> proficient or advanced.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Tab 2: Curriculum & Subject Health ── */}
        {activeTab === 'curriculum' && (
          <motion.div
            key="tab-curriculum"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-100 dark:border-slate-700/60">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-200/60 dark:border-sky-800/50 shadow-xs">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Curriculum & Subject Performance Matrix</h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Per-subject enrollment, completion, and score averages</p>
                </div>
              </div>

              <p className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                Per-subject performance is not available yet: quiz attempts are not recorded against a subject. Range-wide outcomes are on the Learning Outcomes & Trajectory tab.
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Tab 3: Engagement & Leaderboards ── */}
        {activeTab === 'engagement' && (
          <motion.div
            key="tab-engagement"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-5">

              {/* Gamification Drivers (5 cols) */}
              <div className="xl:col-span-5 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-700/60">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/60 dark:border-amber-900/50 shadow-xs">
                        <Award size={18} />
                      </div>
                      <div>
                        <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Gamification & Retention Drivers</h2>
                        <p className="text-xs text-slate-400 dark:text-slate-500">Student motivation telemetry</p>
                      </div>
                    </div>
                  </div>

                  {/* 4 Gamification Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    {gamificationCards.map((card) => {
                      const Icon = card.icon;
                      return (
                        <div
                          key={card.label}
                          className={`${card.bg} border ${card.border} rounded-xl p-3.5 transition-all hover:scale-[1.02] duration-200`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Icon size={16} className={card.color} />
                          </div>

                          {loadingKPIs ? (
                            <div className="w-12 h-5 bg-white/60 dark:bg-slate-800/60 rounded animate-pulse mb-1" />
                          ) : (
                            <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums leading-none">
                              {summaryError === null ? card.value : '—'}
                            </p>
                          )}

                          <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mt-2">{card.label}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{card.subtext}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Top Performing Classes (7 cols) */}
              <div className="xl:col-span-7 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-700/60">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-900/50 shadow-xs">
                        <GraduationCap size={18} />
                      </div>
                      <div>
                        <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Top Performing STEM Classes</h2>
                        <p className="text-xs text-slate-400 dark:text-slate-500">Section mastery mean for the selected range</p>
                      </div>
                    </div>

                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700">
                      Grade 11 & 12
                    </span>
                  </div>

                  <p className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                    Section mastery rankings are not available yet: quiz attempts are not recorded against a class section.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Sections and advisers are maintained in Class Management.</span>
                  <button
                    type="button"
                    onClick={onManageSections}
                    className="text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer hover:underline flex items-center gap-0.5"
                  >
                    Manage Sections <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            </div>

            {/* Weekly Activity Bar Chart */}
            <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-5 sm:p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-200/60 dark:border-orange-900/50 shadow-xs">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Weekly Study Activity Trends</h2>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Quiz attempts by weekday • {timeRange.toUpperCase()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#7274ED]" />
                  <span>Quiz Attempts</span>
                </div>
              </div>

              {/* Recharts Bar Chart */}
              <div className="h-[220px] sm:h-[240px] 2xl:h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyActivity} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.6} />
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }}
                      dy={6}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderRadius: '10px',
                        border: '1px solid #1e293b',
                        color: '#fff',
                        fontSize: '11px',
                        padding: '8px 12px',
                      }}
                      cursor={{ fill: '#f8fafc', opacity: 0.15 }}
                    />
                    <Bar dataKey="quizzes" name="Quiz Attempts" fill="#7274ED" radius={[4, 4, 0, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Activity size={13} className="text-orange-500" />
                  {datedAttemptCount === 0 ? 'No dated quiz attempts in this range' : `Peak activity: ${peakWeekday.day} (${peakWeekday.quizzes} attempts)`}
                </span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{datedAttemptCount.toLocaleString()} dated attempts</span>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
};

export default AdminAnalytics;
