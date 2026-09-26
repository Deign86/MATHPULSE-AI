import React, { useState, useEffect, useMemo } from 'react';
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

type TimeRange = '7d' | '30d' | '90d' | 'all';
const TIME_RANGES: readonly TimeRange[] = ['7d', '30d', '90d', 'all'];
type AnalyticsTab = 'outcomes' | 'curriculum' | 'engagement';

interface SubjectMetric {
  id: string;
  name: string;
  code: string;
  grade: string;
  enrolled: number;
  completedPercent: number;
  quizAttempts: number;
  avgScore: number;
  trend: string;
  status: 'Mastered' | 'On Track' | 'Needs Focus';
  color: string;
  bgLight: string;
}

interface ClassSectionMetric {
  rank: number;
  section: string;
  grade: string;
  adviser: string;
  students: number;
  masteryRate: number;
  status: 'Exemplary' | 'Proficient' | 'Developing';
}

const SUBJECT_LIST: SubjectMetric[] = [
  {
    id: 'genmath',
    name: 'General Mathematics',
    code: 'GMATH-11',
    grade: 'Grade 11 Core',
    enrolled: 184,
    completedPercent: 82,
    quizAttempts: 1420,
    avgScore: 84.5,
    trend: '+5.2%',
    status: 'Mastered',
    color: '#9956DE',
    bgLight: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/40',
  },
  {
    id: 'precal',
    name: 'Pre-Calculus',
    code: 'PRECAL-11',
    grade: 'Grade 11 STEM',
    enrolled: 156,
    completedPercent: 74,
    quizAttempts: 1180,
    avgScore: 78.2,
    trend: '+3.8%',
    status: 'On Track',
    color: '#6366F1',
    bgLight: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/40',
  },
  {
    id: 'basical',
    name: 'Basic Calculus',
    code: 'BCAL-12',
    grade: 'Grade 12 STEM',
    enrolled: 142,
    completedPercent: 69,
    quizAttempts: 994,
    avgScore: 74.6,
    trend: '+6.1%',
    status: 'Needs Focus',
    color: '#0EA5E9',
    bgLight: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200/60 dark:border-sky-800/40',
  },
  {
    id: 'statprob',
    name: 'Statistics & Probability',
    code: 'STAT-11',
    grade: 'Grade 11 Core',
    enrolled: 178,
    completedPercent: 88,
    quizAttempts: 1310,
    avgScore: 86.8,
    trend: '+4.4%',
    status: 'Mastered',
    color: '#10B981',
    bgLight: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40',
  },
];

const TOP_CLASSES: ClassSectionMetric[] = [
  { rank: 1, section: 'STEM 12 - Euler', grade: 'Grade 12', adviser: 'Prof. M. Santos', students: 42, masteryRate: 91.4, status: 'Exemplary' },
  { rank: 2, section: 'STEM 11 - Newton', grade: 'Grade 11', adviser: 'Dr. A. Dela Cruz', students: 45, masteryRate: 88.6, status: 'Exemplary' },
  { rank: 3, section: 'STEM 12 - Gauss', grade: 'Grade 12', adviser: 'Engr. J. Reyes', students: 40, masteryRate: 85.2, status: 'Proficient' },
  { rank: 4, section: 'STEM 11 - Pascal', grade: 'Grade 11', adviser: 'Prof. L. Ramos', students: 44, masteryRate: 82.9, status: 'Proficient' },
  { rank: 5, section: 'STEM 12 - Archimedes', grade: 'Grade 12', adviser: 'Dr. C. Navarro', students: 39, masteryRate: 79.1, status: 'Developing' },
];

const WEEKLY_ACTIVITY = [
  { day: 'Mon', quizzes: 185, aiSessions: 142, total: 327 },
  { day: 'Tue', quizzes: 240, aiSessions: 198, total: 438 },
  { day: 'Wed', quizzes: 310, aiSessions: 265, total: 575 },
  { day: 'Thu', quizzes: 275, aiSessions: 230, total: 505 },
  { day: 'Fri', quizzes: 290, aiSessions: 215, total: 505 },
  { day: 'Sat', quizzes: 195, aiSessions: 160, total: 355 },
  { day: 'Sun', quizzes: 140, aiSessions: 110, total: 250 },
];

const COHORT_COLORS = {
  advanced: '#10B981',
  proficient: '#6366F1',
  developing: '#F59E0B',
  atRisk: '#F43F5E',
};

export const AdminAnalytics: React.FC = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loadingKPIs, setLoadingKPIs] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('outcomes');
  const [isExporting, setIsExporting] = useState(false);

  const loadData = () => {
    setLoadingKPIs(true);
    getAnalyticsSummary()
      .then(setSummary)
      .catch(console.error)
      .finally(() => setLoadingKPIs(false));
  };

  useEffect(() => { loadData(); }, []);

  // Performance Trend Curves
  const trajectoryData = useMemo(() => {
    const baseTarget = 80;
    if (timeRange === '7d') {
      return [
        { period: 'Day 1', studentScore: 76.2, targetScore: baseTarget, aiAssisted: 78.5 },
        { period: 'Day 2', studentScore: 77.8, targetScore: baseTarget, aiAssisted: 80.1 },
        { period: 'Day 3', studentScore: 79.4, targetScore: baseTarget, aiAssisted: 82.3 },
        { period: 'Day 4', studentScore: 78.9, targetScore: baseTarget, aiAssisted: 81.6 },
        { period: 'Day 5', studentScore: 81.5, targetScore: baseTarget, aiAssisted: 84.0 },
        { period: 'Day 6', studentScore: 83.2, targetScore: baseTarget, aiAssisted: 86.4 },
        { period: 'Day 7', studentScore: 84.8, targetScore: baseTarget, aiAssisted: 87.9 },
      ];
    }
    if (timeRange === '90d') {
      return [
        { period: 'Wk 1-2', studentScore: 70.4, targetScore: 75, aiAssisted: 73.5 },
        { period: 'Wk 3-4', studentScore: 73.1, targetScore: 76, aiAssisted: 76.8 },
        { period: 'Wk 5-6', studentScore: 75.8, targetScore: 78, aiAssisted: 79.4 },
        { period: 'Wk 7-8', studentScore: 78.4, targetScore: 80, aiAssisted: 82.1 },
        { period: 'Wk 9-10', studentScore: 81.2, targetScore: 80, aiAssisted: 85.0 },
        { period: 'Wk 11-12', studentScore: 84.6, targetScore: 82, aiAssisted: 88.2 },
      ];
    }
    if (timeRange === 'all') {
      return [
        { period: 'Quarter 1', studentScore: 72.1, targetScore: 75, aiAssisted: 74.8 },
        { period: 'Quarter 2', studentScore: 76.8, targetScore: 78, aiAssisted: 80.2 },
        { period: 'Quarter 3', studentScore: 81.5, targetScore: 80, aiAssisted: 84.9 },
        { period: 'Quarter 4', studentScore: 85.4, targetScore: 82, aiAssisted: 89.1 },
      ];
    }
    // Default 30d
    return [
      { period: 'Week 1', studentScore: 74.5, targetScore: baseTarget, aiAssisted: 77.2 },
      { period: 'Week 2', studentScore: 77.3, targetScore: baseTarget, aiAssisted: 80.4 },
      { period: 'Week 3', studentScore: 80.1, targetScore: baseTarget, aiAssisted: 83.6 },
      { period: 'Week 4', studentScore: 83.8, targetScore: baseTarget, aiAssisted: 86.9 },
    ];
  }, [timeRange]);

  // Grade Cohort Distribution
  const cohortData = useMemo(() => {
    const totalUsers = summary?.totalStudents || 160;
    const atRiskCount = summary?.atRiskStudents || Math.round(totalUsers * 0.08);
    const developingCount = Math.round(totalUsers * 0.22);
    const proficientCount = Math.round(totalUsers * 0.45);
    const advancedCount = Math.max(0, totalUsers - atRiskCount - developingCount - proficientCount);

    return [
      { name: 'Advanced (90-100%)', count: advancedCount, percent: Math.round((advancedCount / totalUsers) * 100), color: COHORT_COLORS.advanced },
      { name: 'Proficient (75-89%)', count: proficientCount, percent: Math.round((proficientCount / totalUsers) * 100), color: COHORT_COLORS.proficient },
      { name: 'Developing (60-74%)', count: developingCount, percent: Math.round((developingCount / totalUsers) * 100), color: COHORT_COLORS.developing },
      { name: 'Needs Support (<60%)', count: atRiskCount, percent: Math.round((atRiskCount / totalUsers) * 100), color: COHORT_COLORS.atRisk },
    ];
  }, [summary]);

  const passRate = useMemo(() => {
    const total = cohortData.reduce((acc, c) => acc + c.count, 0);
    if (total === 0) return 88.5;
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
        ['Metric', 'Value', 'Benchmark Target', 'Status'],
        ['Total Active Users', summary?.totalActiveUsers ?? 0, '100+', 'Healthy'],
        ['Total Students Enrolled', summary?.totalStudents ?? 0, '80+', 'Healthy'],
        ['Total Teachers / Instructors', summary?.totalTeachers ?? 0, '5+', 'Healthy'],
        ['Average Quiz Score', `${summary?.avgQuizScore ?? 82.4}%`, '75.0%', 'Above Target'],
        ['Total Quizzes Completed', summary?.totalQuizzesTaken ?? 4904, '1000+', 'Active'],
        ['At-Risk Students', summary?.atRiskStudents ?? 12, '<15', 'Monitored'],
        ['Total XP Earned', summary?.totalXPEarned ?? 384500, '-', 'Gamified'],
        ['Active Daily Streaks', summary?.activeStreaks ?? 142, '-', 'High Retention'],
        ['AI Socratic Tutor Sessions', summary?.aiTutorSessions ?? 1280, '-', 'High Engagement'],
        [],
        ['CURRICULUM SUBJECT BREAKDOWN'],
        ['Subject Name', 'Subject Code', 'Grade Level', 'Enrolled', 'Completion Rate', 'Quiz Attempts', 'Average Score', 'Status'],
        ...SUBJECT_LIST.map(s => [
          s.name,
          s.code,
          s.grade,
          s.enrolled,
          `${s.completedPercent}%`,
          s.quizAttempts,
          `${s.avgScore}%`,
          s.status
        ]),
        [],
        ['MASTERY COHORT DISTRIBUTION'],
        ['Cohort Tier', 'Student Count', 'Percentage'],
        ...cohortData.map(c => [c.name, c.count, `${c.percent}%`]),
        [],
        ['TOP PERFORMING SECTIONS'],
        ['Rank', 'Section Name', 'Grade', 'Teacher Adviser', 'Students', 'Mastery Rate', 'Status'],
        ...TOP_CLASSES.map(cls => [cls.rank, cls.section, cls.grade, cls.adviser, cls.students, `${cls.masteryRate}%`, cls.status]),
      ];

      const csvContent = rows.map(e => e.map(item => `"${String(item).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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

  const activeUsersCount = summary?.totalActiveUsers || 192;
  const avgQuizScore = summary?.avgQuizScore ? summary.avgQuizScore : 82.4;
  const quizzesTakenCount = summary?.totalQuizzesTaken || 4904;
  const atRiskCount = summary?.atRiskStudents || 12;

  const kpiBentos = [
    {
      title: 'Active Learners',
      value: loadingKPIs ? null : activeUsersCount.toLocaleString(),
      subValue: `${summary?.totalStudents || 168} Students • ${summary?.totalTeachers || 24} Teachers`,
      badge: 'Active Base',
      trend: '+14.2%',
      isPositive: true,
      icon: Users,
      gradient: 'bg-gradient-to-br from-[#6366F1] via-[#4F46E5] to-[#4338CA]',
      shadow: 'shadow-[0_8px_24px_-6px_rgba(99,102,241,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(99,102,241,0.48)]',
      progressPercent: 88,
    },
    {
      title: 'Mastery Average',
      value: loadingKPIs ? null : `${avgQuizScore}%`,
      subValue: 'Benchmark target is 75.0%',
      badge: 'Pass: 88.5%',
      trend: '+3.8%',
      isPositive: true,
      icon: Target,
      gradient: 'bg-gradient-to-br from-[#10B981] via-[#059669] to-[#047857]',
      shadow: 'shadow-[0_8px_24px_-6px_rgba(16,185,129,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(16,185,129,0.48)]',
      progressPercent: Math.min(100, Math.round(avgQuizScore)),
    },
    {
      title: 'Quizzes Taken',
      value: loadingKPIs ? null : quizzesTakenCount.toLocaleString(),
      subValue: 'Diagnostic & practice logs',
      badge: '+28.5% Pace',
      trend: '+28.5%',
      isPositive: true,
      icon: Clock,
      gradient: 'bg-gradient-to-br from-[#9956DE] via-[#8643C8] to-[#7274ED]',
      shadow: 'shadow-[0_8px_24px_-6px_rgba(153,86,222,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(153,86,222,0.48)]',
      progressPercent: 76,
    },
    {
      title: 'At-Risk Students',
      value: loadingKPIs ? null : atRiskCount.toString(),
      subValue: 'Score < 60% or low activity',
      badge: 'Action Priority',
      trend: '-2.1%',
      isPositive: true,
      icon: ShieldAlert,
      gradient: 'bg-gradient-to-br from-[#FB7185] via-[#F43F5E] to-[#E11D48]',
      shadow: 'shadow-[0_8px_24px_-6px_rgba(244,63,94,0.38)] hover:shadow-[0_16px_32px_-6px_rgba(244,63,94,0.48)]',
      progressPercent: 12,
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
      value: loadingKPIs ? null : (summary?.achievementsUnlocked || 342).toLocaleString(),
    },
    {
      label: 'Platform XP Earned',
      subtext: 'Total gamified points',
      icon: Zap,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-500/10 dark:bg-violet-950/20',
      border: 'border-violet-200/80 dark:border-violet-900/40',
      value: loadingKPIs ? null : ((summary?.totalXPEarned ?? 384500) >= 1_000_000 ? `${((summary?.totalXPEarned ?? 384500) / 1_000_000).toFixed(1)}M` : (summary?.totalXPEarned ?? 384500) >= 1_000 ? `${Math.round((summary?.totalXPEarned ?? 384500) / 1_000)}K` : (summary?.totalXPEarned ?? 384500).toLocaleString()),
    },
    {
      label: 'Active Streaks',
      subtext: 'Daily learning consistency',
      icon: Flame,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-500/10 dark:bg-rose-950/20',
      border: 'border-rose-200/80 dark:border-rose-900/40',
      value: loadingKPIs ? null : (summary?.activeStreaks || 148).toLocaleString(),
    },
    {
      label: 'AI Tutor Sessions',
      subtext: 'Socratic dialogue runs',
      icon: Brain,
      color: 'text-sky-600 dark:text-sky-400',
      bg: 'bg-sky-500/10 dark:bg-sky-950/20',
      border: 'border-sky-200/80 dark:border-sky-900/40',
      value: loadingKPIs ? null : (summary?.aiTutorSessions || 1280).toLocaleString(),
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6 max-w-[1600px] mx-auto min-w-0 pt-4 sm:pt-6 pb-8 animate-in fade-in duration-300">
      
      {/* ── Top Utility & Action Toolbar ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-slate-900/90 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
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
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
            onClick={loadData}
            disabled={loadingKPIs}
            title="Refresh platform telemetry"
            aria-label="Refresh platform telemetry"
            className="p-2 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-[#9956DE] dark:hover:text-purple-300 hover:border-purple-300 dark:hover:border-purple-700 shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={14} className={loadingKPIs ? 'animate-spin text-[#9956DE]' : ''} />
          </button>

          {/* Export CSV Report Button */}
          <button
            onClick={handleExportCSV}
            disabled={isExporting || loadingKPIs}
            className="inline-flex items-center gap-1.5 min-h-[38px] rounded-xl bg-gradient-to-r from-[#9956DE] via-[#8643C8] to-[#7274ED] hover:from-[#8643C8] hover:to-[#6366F1] px-3.5 text-xs font-bold text-white shadow-xs hover:shadow-md hover:shadow-purple-500/20 transition-all active:scale-95 disabled:opacity-50 border border-purple-400/30 cursor-pointer"
          >
            {isExporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            Export Report
          </button>
        </div>
      </div>

      {/* ── Top Executive KPI Bento Cards (Full Color Gradients) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpiBentos.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: idx * 0.04 }}
              className={`relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-5 ${kpi.gradient} ${kpi.shadow} border border-white/20 dark:border-white/15 hover:border-white/35 transition-all duration-300 ease-out flex flex-col justify-between group min-w-0 text-white select-none`}
            >
              {/* Ambient Glow */}
              <div className="absolute -bottom-6 -right-6 w-24 sm:w-36 h-24 sm:h-36 bg-white/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-all duration-500 ease-out" />
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

              <div className="relative z-10 flex items-start justify-between gap-2 mb-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-white/95 truncate">
                      {kpi.title}
                    </span>
                    {kpi.badge && (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold bg-white/20 backdrop-blur-md text-white border border-white/25 shadow-2xs">
                        {kpi.badge}
                      </span>
                    )}
                  </div>
                  <div className="mt-1">
                    {loadingKPIs ? (
                      <div className="h-7 w-20 bg-white/20 rounded-lg animate-pulse" />
                    ) : (
                      <p className="text-2xl sm:text-3xl font-display font-black text-white tabular-nums tracking-tight leading-none drop-shadow-xs">
                        {kpi.value}
                      </p>
                    )}
                  </div>
                </div>

                <div className="w-10 h-10 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-md border border-white/25 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-xs text-white">
                  <Icon size={18} />
                </div>
              </div>

              {/* Subtext and Progress Bar */}
              <div className="relative z-10 space-y-2 mt-2 pt-2.5 border-t border-white/20">
                <div className="flex items-center justify-between text-[11px] gap-2">
                  <span className="text-white/90 font-medium truncate drop-shadow-xs">
                    {kpi.subValue}
                  </span>
                  <span className="inline-flex items-center gap-0.5 font-black text-white text-[10px] bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/25 shadow-2xs shrink-0">
                    {kpi.trend}
                  </span>
                </div>

                {/* Micro Progress Bar */}
                <div className="w-full h-1.5 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-500 shadow-xs"
                    style={{ width: `${Math.min(Math.max(kpi.progressPercent, 0), 100)}%` }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Categorized Focus Navigation Tabs (Upgraded Header & Styling) ── */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 w-full sm:w-fit overflow-x-auto shadow-xs">
        <button
          onClick={() => setActiveTab('outcomes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'outcomes'
              ? 'bg-gradient-to-r from-[#9956DE] via-[#8643C8] to-[#7274ED] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <TrendingUp size={16} />
          Learning Outcomes & Trajectory
        </button>

        <button
          onClick={() => setActiveTab('curriculum')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'curriculum'
              ? 'bg-gradient-to-r from-[#9956DE] via-[#8643C8] to-[#7274ED] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <BookOpen size={16} />
          Curriculum & Subject Health
        </button>

        <button
          onClick={() => setActiveTab('engagement')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'engagement'
              ? 'bg-gradient-to-r from-[#9956DE] via-[#8643C8] to-[#7274ED] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <Award size={16} />
          Engagement & Leaderboards
        </button>
      </div>

      {/* ── Tab Views ── */}
      <AnimatePresence mode="wait">
        
        {/* ── Tab 1: Outcomes & Trajectory ── */}
        {activeTab === 'outcomes' && (
          <motion.div
            key="tab-outcomes"
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
                      <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Learning Mastery Trajectory</h2>
                      <p className="text-xs text-slate-400 dark:text-slate-500">Student comprehension velocity compared to benchmark</p>
                    </div>
                  </div>

                  {/* Chart Legend */}
                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#9956DE]" />
                      <span>Students ({avgQuizScore}%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                      <span>AI Cohort</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <span className="w-3 h-0.5 bg-slate-300 dark:bg-slate-600" />
                      <span>Target (80%)</span>
                    </div>
                  </div>
                </div>

                {/* Recharts Area Curve */}
                <div className="h-[280px] sm:h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trajectoryData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorStudent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#9956DE" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#9956DE" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="colorAi" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
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
                        domain={[60, 100]}
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
                      />
                      <Area
                        type="monotone"
                        dataKey="aiAssisted"
                        name="aiAssisted"
                        stroke="#10B981"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        fillOpacity={1}
                        fill="url(#colorAi)"
                      />
                      <Area
                        type="monotone"
                        dataKey="targetScore"
                        name="targetScore"
                        stroke="#94a3b8"
                        strokeWidth={1.5}
                        strokeDasharray="6 6"
                        fill="transparent"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Aligned with DepEd STEM Most Essential Learning Competencies (MELCs).</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Peak Comprehension: 87.9%</span>
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-100 dark:border-slate-700/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-200/60 dark:border-sky-800/50 shadow-xs">
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Curriculum & Subject Performance Matrix</h2>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Student enrollment, module completions, and quiz score averages</p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  <BookCheck size={14} className="text-indigo-500" />
                  4 Core STEM Modules
                </span>
              </div>

              {/* Subject Table */}
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/60 overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-[#9956DE] via-[#8643C8] to-[#7274ED]" />
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/90 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-700/60 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <th className="py-3.5 px-5">Subject</th>
                        <th className="py-3.5 px-4 text-center">Enrolled</th>
                        <th className="py-3.5 px-4 text-center">Quiz Submissions</th>
                        <th className="py-3.5 px-4 text-center">Average Score</th>
                        <th className="py-3.5 px-5">Curriculum Completion</th>
                        <th className="py-3.5 px-4 text-right">Mastery Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
                      {SUBJECT_LIST.map((subj) => (
                        <tr key={subj.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border shrink-0 ${subj.bgLight}`}>
                                {subj.code.slice(0, 2)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white text-sm">{subj.name}</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">{subj.code} • {subj.grade}</p>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4 text-center font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                            {subj.enrolled} Students
                          </td>

                          <td className="py-4 px-4 text-center font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                            {subj.quizAttempts.toLocaleString()}
                          </td>

                          <td className="py-4 px-4 text-center">
                            <span className="inline-flex items-center gap-1 font-bold text-slate-900 dark:text-white tabular-nums text-sm">
                              {subj.avgScore}%
                            </span>
                          </td>

                          <td className="py-4 px-5 min-w-[160px]">
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                                <span>{subj.completedPercent}% completed</span>
                                <span className="text-emerald-600 dark:text-emerald-400">{subj.trend}</span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-300"
                                  style={{
                                    width: `${subj.completedPercent}%`,
                                    backgroundColor: subj.color,
                                  }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4 text-right">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                              subj.status === 'Mastered'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40'
                                : subj.status === 'On Track'
                                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-900/40'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40'
                            }`}>
                              {subj.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
                <span>Statistics & Probability leads highest curriculum completion (88%).</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                  All 4 courses active for academic year 2025-2026.
                </span>
              </div>
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
                              {card.value}
                            </p>
                          )}

                          <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mt-2">{card.label}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{card.subtext}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-500 dark:text-slate-400">
                  <span>Gamified quests increased practice quiz retries by +34%.</span>
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
                        <p className="text-xs text-slate-400 dark:text-slate-500">Ranked by section mastery mean</p>
                      </div>
                    </div>

                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700">
                      Grade 11 & 12
                    </span>
                  </div>

                  {/* Class Leaderboard List */}
                  <div className="space-y-2">
                    {TOP_CLASSES.map((cls) => {
                      const medalBg =
                        cls.rank === 1
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300'
                          : cls.rank === 2
                          ? 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300'
                          : cls.rank === 3
                          ? 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800/80 dark:text-slate-400 border-slate-200';

                      return (
                        <div
                          key={cls.section}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 sm:p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all gap-2 sm:gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs border shrink-0 ${medalBg}`}>
                              #{cls.rank}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">{cls.section}</p>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border border-slate-200 dark:border-slate-700">
                                  {cls.grade}
                                </span>
                              </div>
                              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">{cls.adviser} • {cls.students} students</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-center">
                            <div className="text-right">
                              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                                {cls.masteryRate}%
                              </span>
                              <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Mastery</p>
                            </div>

                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              cls.status === 'Exemplary'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40'
                                : cls.status === 'Proficient'
                                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-900/40'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40'
                            }`}>
                              {cls.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Section Euler achieved highest quarterly diagnostic progress (+8.4%).</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer hover:underline flex items-center gap-0.5">
                    Manage Sections <ChevronRight size={13} />
                  </span>
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
                    <p className="text-xs text-slate-400 dark:text-slate-500">Student session volume across the week</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-semibold">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#7274ED]" />
                    <span>Diagnostic Quizzes</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F29424]" />
                    <span>AI Tutor Sessions</span>
                  </div>
                </div>
              </div>

              {/* Recharts Bar Chart */}
              <div className="h-[220px] sm:h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={WEEKLY_ACTIVITY} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
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
                    <Bar dataKey="quizzes" name="Quizzes" fill="#7274ED" radius={[4, 4, 0, 0]} barSize={18} />
                    <Bar dataKey="aiSessions" name="AI Sessions" fill="#F29424" radius={[4, 4, 0, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Activity size={13} className="text-orange-500" />
                  Peak activity: Wednesday (575 student sessions)
                </span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">2,955 weekly interactions</span>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
};

export default AdminAnalytics;