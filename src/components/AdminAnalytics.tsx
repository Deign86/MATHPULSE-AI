import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Users, GraduationCap, BookOpen, Clock,
  BarChart3, Activity, Target, Award,
  Calendar, Download, Filter, Zap, Brain, Flame,
  PieChart, Database, Loader2
} from 'lucide-react';
import { Button } from './ui/button';
import { getAnalyticsSummary, type AnalyticsSummary } from '../services/adminService';

type TimeRange = '7d' | '30d' | '90d' | '12m';

// ─── Empty state card ────────────────────────────────────────────────────────
const EmptySection: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}> = ({ icon, title, subtitle }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
    <div className="w-12 h-12 rounded-full bg-[#edf1f7] flex items-center justify-center">
      {icon}
    </div>
    <p className="text-sm font-semibold text-[#5a6578]">{title}</p>
    {subtitle && <p className="text-xs text-[#a0aec0] max-w-xs">{subtitle}</p>}
  </div>
);

const AdminAnalytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loadingKPIs, setLoadingKPIs] = useState(true);
  const rangeSelectionSupported = false;

  useEffect(() => {
    getAnalyticsSummary()
      .then(setSummary)
      .catch(console.error)
      .finally(() => setLoadingKPIs(false));
  }, []);

  const timeRangeLabels: Record<TimeRange, string> = {
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days',
    '12m': 'Last 12 Months',
  };

  // KPI card definitions — Total Active Users and At-Risk Students come from real Firestore data
  const kpis = [
    {
      label: 'Total Active Users',
      value: loadingKPIs ? null : (summary?.totalActiveUsers ?? 0).toLocaleString(),
      icon: Users,
      color: 'from-sky-500 to-blue-600',
    },
    {
      label: 'Avg. Completion Rate',
      value: 'N/A',
      icon: Target,
      color: 'from-teal-500 to-emerald-600',
    },
    {
      label: 'Avg. Session Duration',
      value: 'N/A',
      icon: Clock,
      color: 'from-violet-500 to-purple-600',
    },
    {
      label: 'At-Risk Students',
      value: loadingKPIs ? null : (summary?.atRiskStudents ?? 0).toString(),
      icon: Activity,
      color: 'from-rose-500 to-orange-600',
    },
  ];

  const gamificationCards = [
    {
      label: 'Achievements Unlocked',
      icon: Award,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      value: loadingKPIs ? null : (summary?.achievementsUnlocked ?? 0).toLocaleString(),
    },
    {
      label: 'XP Earned (Platform)',
      icon: Zap,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
      value: loadingKPIs ? null : (
        (summary?.totalXPEarned ?? 0) >= 1_000_000
          ? `${((summary?.totalXPEarned ?? 0) / 1_000_000).toFixed(1)}M`
          : (summary?.totalXPEarned ?? 0) >= 1_000
          ? `${Math.round((summary?.totalXPEarned ?? 0) / 1_000)}K`
          : (summary?.totalXPEarned ?? 0).toLocaleString()
      ),
    },
    {
      label: 'Active Streaks',
      icon: Flame,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      value: loadingKPIs ? null : (summary?.activeStreaks ?? 0).toLocaleString(),
    },
    {
      label: 'AI Tutor Sessions',
      icon: Brain,
      color: 'text-sky-600',
      bg: 'bg-sky-50',
      value: loadingKPIs ? null : (summary?.aiTutorSessions ?? 0).toLocaleString(),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Time Range & Export Controls */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-2 bg-white rounded-xl p-1 shadow-sm border border-[#dde3eb]">
          {(Object.entries(timeRangeLabels) as [TimeRange, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTimeRange(key)}
              disabled={!rangeSelectionSupported}
              title={!rangeSelectionSupported ? 'Range selection is unavailable until backend range queries are supported.' : undefined}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                timeRange === key
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-[#5a6578] hover:bg-[#edf1f7]'
              } ${!rangeSelectionSupported ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled
            title="Advanced analytics filters are not implemented yet"
            className="px-4 py-2 gap-2 rounded-xl border-[#dde3eb] font-semibold text-sm opacity-50 cursor-not-allowed"
          >
            <Filter size={16} />
            Filters
          </Button>
          <Button
            variant="outline"
            disabled
            title="Export is unavailable until backend report generation is implemented"
            className="px-4 py-2 gap-2 rounded-xl border-[#dde3eb] font-semibold text-sm opacity-50 cursor-not-allowed"
          >
            <Download size={16} />
            Export
          </Button>
        </div>
      </motion.div>

      {!rangeSelectionSupported ? (
        <p className="text-xs text-[#5a6578] -mt-3">
          Time-range filtering is currently disabled because analytics range queries are not yet supported by the backend.
        </p>
      ) : null}

      {/* Loading / no full data banner */}
      {!loadingKPIs && !summary?.totalActiveUsers && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-5 py-4"
        >
          <Database size={18} className="text-rose-600 shrink-0" />
          <p className="text-sm text-rose-800">
            <span className="font-semibold">Limited analytics data.</span>{' '}
            KPI cards will populate automatically as students, quizzes, and sessions accumulate in the platform.
            Chart visualisations require time-series data.
          </p>
        </motion.div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.06 }}
              className="bg-white rounded-2xl p-5 shadow-sm border border-[#dde3eb]"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center shadow-sm`}>
                  <Icon size={20} className="text-white" />
                </div>
              </div>
              {loadingKPIs ? (
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 size={16} className="animate-spin text-[#a0aec0]" />
                  <div className="w-14 h-6 bg-[#edf1f7] rounded-lg animate-pulse" />
                </div>
              ) : (
                <p className="text-2xl font-bold text-[#0a1628] mb-2">{kpi.value}</p>
              )}
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#5a6578] font-medium">{kpi.label}</p>
                <span className="text-xs text-[#a0aec0] font-medium">
                  {timeRangeLabels[timeRange]}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Performance Trends + Grade Distribution */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="xl:col-span-8 bg-white rounded-2xl p-6 shadow-sm border border-[#dde3eb]"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-[#0a1628]">Performance Trends</h2>
              <p className="text-sm text-[#5a6578]">Average scores — students vs. teacher targets</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-sky-300" />
                <span className="text-[#a0aec0] font-medium">Students</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-violet-300" />
                <span className="text-[#a0aec0] font-medium">Teacher Targets</span>
              </div>
            </div>
          </div>
          <EmptySection
            icon={<BarChart3 size={24} className="text-[#c2cad8]" />}
            title="No performance data yet"
            subtitle="Import student and class records to generate trend charts."
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="xl:col-span-4 bg-white rounded-2xl p-6 shadow-sm border border-[#dde3eb]"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
              <PieChart size={20} className="text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0a1628]">Grade Distribution</h2>
              <p className="text-xs text-[#5a6578]">All students, current term</p>
            </div>
          </div>
          <EmptySection
            icon={<Database size={24} className="text-[#c2cad8]" />}
            title="No grade data"
            subtitle="Import quiz and assessment results to see grade breakdowns."
          />
        </motion.div>
      </div>

      {/* Subject Engagement + Weekly Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="xl:col-span-7 bg-white rounded-2xl p-6 shadow-sm border border-[#dde3eb]"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center">
              <BookOpen size={20} className="text-sky-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0a1628]">Subject Engagement</h2>
              <p className="text-xs text-[#5a6578]">Enrollment, completion, and average scores</p>
            </div>
          </div>

          {/* Table header */}
          <div className="overflow-hidden rounded-xl border border-[#dde3eb]">
            <table className="w-full">
              <thead>
                <tr className="bg-[#f7f9fc]">
                  <th className="text-left text-xs font-semibold text-[#5a6578] px-4 py-3">Subject</th>
                  <th className="text-right text-xs font-semibold text-[#5a6578] px-4 py-3">Enrolled</th>
                  <th className="text-right text-xs font-semibold text-[#5a6578] px-4 py-3">Completion</th>
                  <th className="text-right text-xs font-semibold text-[#5a6578] px-4 py-3">Avg. Score</th>
                  <th className="text-left text-xs font-semibold text-[#5a6578] px-4 py-3 w-36">Progress</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={5} className="px-4 py-10">
                    <EmptySection
                      icon={<Database size={22} className="text-[#c2cad8]" />}
                      title="No subject data available"
                      subtitle="Import class enrollment records to view subject engagement."
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="xl:col-span-5 bg-white rounded-2xl p-6 shadow-sm border border-[#dde3eb]"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <Calendar size={20} className="text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0a1628]">Weekly Activity</h2>
              <p className="text-xs text-[#5a6578]">Sessions per day of week</p>
            </div>
          </div>
          <EmptySection
            icon={<Activity size={24} className="text-[#c2cad8]" />}
            title="No session activity yet"
            subtitle="Student logins and session data will appear here after data is imported."
          />
        </motion.div>
      </div>

      {/* Gamification + Top Classes */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="xl:col-span-5 bg-white rounded-2xl p-6 shadow-sm border border-[#dde3eb]"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
              <Award size={20} className="text-rose-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0a1628]">Gamification Overview</h2>
              <p className="text-xs text-[#5a6578]">Engagement & motivation metrics</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {gamificationCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className={`${card.bg} border border-[#dde3eb] rounded-xl p-4`}>
                  <Icon size={20} className={card.color} />
                  {loadingKPIs ? (
                    <div className="w-12 h-5 bg-white/60 rounded mt-2 mb-1 animate-pulse" />
                  ) : (
                    <p className="text-lg font-bold text-[#0a1628] mt-2 mb-1">{card.value}</p>
                  )}
                  <p className="text-xs text-[#5a6578] font-medium">{card.label}</p>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="xl:col-span-7 bg-white rounded-2xl p-6 shadow-sm border border-[#dde3eb]"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
              <GraduationCap size={20} className="text-teal-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0a1628]">Top Performing Classes</h2>
              <p className="text-xs text-[#5a6578]">Ranked by average score this term</p>
            </div>
          </div>
          <EmptySection
            icon={<Database size={24} className="text-[#c2cad8]" />}
            title="No class data yet"
            subtitle="Import class and student records to see top performers ranked here."
          />
        </motion.div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
