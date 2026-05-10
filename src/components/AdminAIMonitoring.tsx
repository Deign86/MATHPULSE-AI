import React, { useMemo } from 'react';
import { motion } from 'motion/react';
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
} from 'lucide-react';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { useAIMonitoring } from '../hooks/useAIMonitoring';
import type { AIUsageLog } from '../types/hfMonitoring';

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
}

interface AlertItem {
  id: string;
  severity: 'warning' | 'critical' | 'info';
  message: string;
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const PLATFORM_AI_FEATURES: Omit<AIUsageArea, 'requests' | 'estimatedCost' | 'avgCostPerRequest' | 'costPercent' | 'lastActiveAt' | 'status' | 'usageLevel'>[] = [
  {
    id: 'ai-chat',
    name: 'AI Chat Tutor',
    description: 'On-demand math help for students via DeepSeek with streaming responses',
  },
  {
    id: 'quiz-generation',
    name: 'Quiz Generation',
    description: 'AI-powered quiz creation from imported topics and curriculum',
  },
  {
    id: 'lesson-generation',
    name: 'Lesson Generation',
    description: 'AI-generated lesson plans grounded on imported topics and class signals',
  },
  {
    id: 'learning-paths',
    name: 'Learning Paths',
    description: 'Personalized study plan generation based on student weaknesses',
  },
  {
    id: 'risk-classification',
    name: 'Risk Classification',
    description: 'Student at-risk identification using AI structured output and ML scoring',
  },
  {
    id: 'daily-insights',
    name: 'Daily AI Insights',
    description: 'Daily AI-powered analytics and recommendations for teachers',
  },
  {
    id: 'solution-verification',
    name: 'Solution Verification',
    description: 'Multi-method math solution checking with self-consistency and code execution',
  },
  {
    id: 'curriculum-search',
    name: 'Curriculum Search',
    description: 'Embedding-based search over lesson content and curriculum materials',
  },
  {
    id: 'content-processing',
    name: 'Content Processing',
    description: 'AI column detection and topic extraction from uploaded files',
  },
  {
    id: 'auto-feedback',
    name: 'Auto Feedback',
    description: 'Instant feedback and explanations for student quiz responses',
  },
];

// Estimated distribution weights (should total 100)
const USAGE_WEIGHTS: Record<string, number> = {
  'ai-chat': 35,
  'quiz-generation': 18,
  'lesson-generation': 12,
  'learning-paths': 8,
  'risk-classification': 6,
  'daily-insights': 5,
  'solution-verification': 6,
  'curriculum-search': 4,
  'content-processing': 3,
  'auto-feedback': 3,
};

// ─────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────

function formatTimestamp(iso: string): string {
  if (!iso) return 'N/A';
  try {
    const date = new Date(iso);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'N/A';
  }
}

function formatCurrency(amount: number): string {
  if (amount >= 1) {
    return `$${amount.toFixed(2)}`;
  }
  return `$${amount.toFixed(4)}`;
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

// ─────────────────────────────────────────────
// Data Transformation
// ─────────────────────────────────────────────

/**
 * Map Firestore AIUsageLog[] to the component's display AIUsageArea[].
 * Matches logs to PLATFORM_AI_FEATURES by name similarity.
 * Falls back to USAGE_WEIGHTS distribution when no log found for a feature.
 */
function mapStatsToUsageAreas(stats: AIUsageLog[]): AIUsageArea[] {
  const totalReq = stats.reduce((sum, s) => sum + s.requestCount, 0);
  const totalCost = stats.reduce((sum, s) => sum + s.estimatedCostUSD, 0);
  const now = new Date().toISOString();

  const areas = PLATFORM_AI_FEATURES.map((feature) => {
    // Find matching log by fuzzy name match
    const log = stats.find(s => {
      const cleanName = s.featureName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanFeature = feature.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      return cleanName.includes(cleanFeature) || cleanFeature.includes(cleanName);
    });

    const requests = log?.requestCount ?? Math.round((totalReq * (USAGE_WEIGHTS[feature.id] ?? 1)) / 100);
    const estimatedCost = log?.estimatedCostUSD ?? (totalCost * (USAGE_WEIGHTS[feature.id] ?? 1)) / 100;

    // Map AIUsageLog status → HealthStatus
    const status: HealthStatus = log
      ? log.status === 'Degraded' ? 'Warning'
        : log.status === 'Down' ? 'Offline'
        : 'Healthy'
      : 'Healthy';

    const usageLevel: UsageLevel = log
      ? log.priority === 'High' ? 'High'
        : log.priority === 'Medium' ? 'Medium'
        : 'Low'
      : USAGE_WEIGHTS[feature.id] >= 20 ? 'High'
        : USAGE_WEIGHTS[feature.id] >= 8 ? 'Medium'
        : 'Low';

    return {
      ...feature,
      status,
      requests,
      estimatedCost,
      avgCostPerRequest: requests > 0 ? estimatedCost / requests : 0,
      usageLevel,
      lastActiveAt: log?.lastUpdated?.toDate().toISOString() ?? now,
      trend: 'Stable' as const,
    };
  });

  const totalDerivedCost = areas.reduce((sum, a) => sum + a.estimatedCost, 0);
  return areas.map((a) => ({
    ...a,
    costPercent: totalDerivedCost > 0 ? (a.estimatedCost / totalDerivedCost) * 100 : 0,
  }));
}

function deriveAlerts(areas: AIUsageArea[], stats: AIUsageLog[]): AlertItem[] {
  const alerts: AlertItem[] = [];

  // Degraded features
  const degradedFeatures = stats.filter(s => s.status === 'Degraded');
  if (degradedFeatures.length > 0) {
    alerts.push({
      id: 'degraded',
      severity: 'warning',
      message: `${degradedFeatures.length} AI feature(s) are in degraded state`,
    });
  }

  // Down (offline) features
  const downFeatures = stats.filter(s => s.status === 'Down');
  if (downFeatures.length > 0) {
    alerts.push({
      id: 'offline',
      severity: 'critical',
      message: `${downFeatures[0].featureName} is currently unavailable`,
    });
  }

  // High-cost feature spike
  const chatArea = areas.find((a) => a.id === 'ai-chat');
  if (chatArea && chatArea.costPercent && chatArea.costPercent > 40) {
    alerts.push({
      id: 'chatcost',
      severity: 'info',
      message: 'AI Chat Tutor is driving most of the AI spend this period',
    });
  }

  // Quiz generation cost increase
  const quizArea = areas.find((a) => a.id === 'quiz-generation');
  if (quizArea && quizArea.costPercent && quizArea.costPercent > 25) {
    alerts.push({
      id: 'quizcost',
      severity: 'info',
      message: 'Quiz Generation is using more AI resources than usual',
    });
  }

  return alerts;
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function StatusBadgeSimple({
  status,
  loading,
}: {
  status: HealthStatus;
  loading?: boolean;
}) {
  const config = {
    Healthy: {
      label: 'Healthy',
      className: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      icon: CheckCircle,
      iconClass: 'text-emerald-500',
    },
    Warning: {
      label: 'Needs Attention',
      className: 'text-amber-700 bg-amber-50 border-amber-200',
      icon: AlertTriangle,
      iconClass: 'text-amber-500',
    },
    Offline: {
      label: 'Offline',
      className: 'text-rose-700 bg-rose-50 border-rose-200',
      icon: AlertTriangle,
      iconClass: 'text-rose-500',
    },
  };

  const cfg = config[status];

  if (loading) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-400 border border-slate-200">
        <Activity size={12} className="animate-pulse" />
        Checking...
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cfg.className}`}
    >
      <cfg.icon size={12} className={cfg.iconClass} />
      {cfg.label}
    </span>
  );
}

function UsageLevelChip({ level }: { level: UsageLevel }) {
  const config = {
    Low: 'bg-slate-100 text-slate-600 border-slate-200',
    Medium: 'bg-sky-50 text-sky-700 border-sky-200',
    High: 'bg-violet-50 text-violet-700 border-violet-200',
  };

  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${config[level]}`}
    >
      {level}
    </span>
  );
}

function TrendChip({ trend }: { trend?: 'Up' | 'Stable' | 'Down' }) {
  if (!trend) return null;

  const config = {
    Up: { label: '↑ Up', className: 'text-emerald-600 bg-emerald-50' },
    Stable: { label: '→ Stable', className: 'text-slate-600 bg-slate-50' },
    Down: { label: '↓ Down', className: 'text-rose-600 bg-rose-50' },
  };

  const cfg = config[trend];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

function SectionHeader({
  title,
  subtitle,
  testId,
}: {
  title: string;
  subtitle?: string;
  testId: string;
}) {
  return (
    <div className="mb-4" data-testid={testId}>
      <h2 className="text-base font-semibold text-[#0a1628]">{title}</h2>
      {subtitle && (
        <p className="text-sm text-[#5a6578] mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

const AdminAIMonitoring: React.FC = () => {
  const {
    stats,
    systemHealth: overallStatus,
    totalSpend,
    highestCostFeature,
    mostActiveFeature,
    isLoading,
    error,
    refresh,
  } = useAIMonitoring();

  // ── Derived data ──────────────────────────────

  const usageAreas = useMemo(
    () => mapStatsToUsageAreas(stats),
    [stats],
  );

  const alerts = useMemo(
    () => deriveAlerts(usageAreas, stats),
    [usageAreas, stats],
  );

  const totalCost = totalSpend;

  const sortedByCost = useMemo(
    () =>
      [...usageAreas].sort((a, b) => b.estimatedCost - a.estimatedCost),
    [usageAreas],
  );

  const sortedByRequests = useMemo(
    () =>
      [...usageAreas].sort((a, b) => b.requests - a.requests),
    [usageAreas],
  );

  const topCostArea = highestCostFeature ? {
    name: highestCostFeature.featureName,
    estimatedCost: highestCostFeature.estimatedCostUSD,
    costPercent: totalCost > 0 ? (highestCostFeature.estimatedCostUSD / totalCost) * 100 : 0,
  } : null;

  const topActivityArea = mostActiveFeature ? {
    name: mostActiveFeature.featureName,
    requests: mostActiveFeature.requestCount,
  } : null;

  // ── Render ────────────────────────────────────

  return (
    <div className="space-y-8" data-testid="ai-usage-dashboard">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-[#0a1628]">AI Usage Dashboard</h1>
          <p className="text-sm text-[#5a6578]">
            Track where AI is being used, what it costs, and what needs attention
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1.5 shrink-0"
          onClick={refresh}
          disabled={isLoading}
          data-testid="refresh-btn"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </motion.div>

      {/* ── Error ── */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-5 py-4"
        >
          <AlertTriangle size={18} className="text-rose-600 shrink-0" />
          <p className="text-sm text-rose-800">{error}</p>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════
          SECTION 1: Top Summary Row (4 cards)
      ══════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        {/* AI Status */}
        <div
          className="bg-white rounded-2xl p-5 shadow-sm border border-[#dde3eb]"
          data-testid="summary-ai-status"
        >
          <div className="flex items-center gap-2 mb-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
                overallStatus === 'Healthy'
                  ? 'bg-gradient-to-br from-emerald-400 to-emerald-600'
                  : overallStatus === 'Degraded'
                  ? 'bg-gradient-to-br from-amber-400 to-amber-600'
                  : 'bg-gradient-to-br from-rose-400 to-rose-600'
              }`}
            >
              {overallStatus === 'Healthy' ? (
                <CheckCircle size={18} className="text-white" />
              ) : overallStatus === 'Degraded' ? (
                <AlertTriangle size={18} className="text-white" />
              ) : (
                <AlertTriangle size={18} className="text-white" />
              )}
            </div>
          </div>
          {isLoading ? (
            <Skeleton className="w-28 h-8 rounded-lg mb-2" />
          ) : (
            <p className="text-2xl font-bold text-[#0a1628] mb-1">
              {overallStatus === 'Healthy'
                ? 'Healthy'
                : overallStatus === 'Degraded'
                ? 'Needs Attention'
                : 'Partial Outage'}
            </p>
          )}
          <p className="text-xs text-[#5a6578] font-medium">
            {overallStatus === 'Healthy'
              ? 'Most AI features are working normally'
              : overallStatus === 'Degraded'
              ? 'Some AI features need attention'
              : 'Several AI features are unavailable'}
          </p>
        </div>

        {/* This Month's AI Cost */}
        <div
          className="bg-white rounded-2xl p-5 shadow-sm border border-[#dde3eb]"
          data-testid="summary-ai-cost"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-sm">
              <DollarSign size={18} className="text-white" />
            </div>
          </div>
          {isLoading ? (
            <Skeleton className="w-24 h-8 rounded-lg mb-2" />
          ) : (
            <p className="text-2xl font-bold text-[#0a1628] mb-1">
              {formatCurrency(totalCost)}
            </p>
          )}
          <p className="text-xs text-[#5a6578] font-medium">
            {isLoading ? '...' : 'Total AI spend this month'}
          </p>
          {!isLoading && totalSpend > 0 && (
            <p className="text-xs text-[#a0aec0] mt-1">
              Cumulative AI cost for current period
            </p>
          )}
        </div>

        {/* Most Expensive Area */}
        <div
          className="bg-white rounded-2xl p-5 shadow-sm border border-[#dde3eb]"
          data-testid="summary-most-expensive"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-sm">
              <TrendingUp size={18} className="text-white" />
            </div>
          </div>
          {isLoading ? (
            <Skeleton className="w-32 h-8 rounded-lg mb-2" />
          ) : (
            <p className="text-2xl font-bold text-[#0a1628] mb-1 truncate">
              {topCostArea?.name ?? 'N/A'}
            </p>
          )}
          <p className="text-xs text-[#5a6578] font-medium">
            {isLoading ? '...' : 'Highest AI cost this month'}
          </p>
          {!isLoading && topCostArea && (
            <p className="text-xs text-[#a0aec0] mt-1">
              {formatCurrency(topCostArea.estimatedCost)} ·{' '}
              {topCostArea.costPercent?.toFixed(0)}% of total
            </p>
          )}
        </div>

        {/* Top AI Activity */}
        <div
          className="bg-white rounded-2xl p-5 shadow-sm border border-[#dde3eb]"
          data-testid="summary-top-activity"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-sm">
              <Flame size={18} className="text-white" />
            </div>
          </div>
          {isLoading ? (
            <Skeleton className="w-32 h-8 rounded-lg mb-2" />
          ) : (
            <p className="text-2xl font-bold text-[#0a1628] mb-1 truncate">
              {topActivityArea?.name ?? 'N/A'}
            </p>
          )}
          <p className="text-xs text-[#5a6578] font-medium">
            {isLoading ? '...' : 'Most active AI feature'}
          </p>
          {!isLoading && topActivityArea && (
            <p className="text-xs text-[#a0aec0] mt-1">
              {formatNumber(topActivityArea.requests)} requests
            </p>
          )}
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════
          SECTION 2: Where AI is Used
      ══════════════════════════════════════════ */}
      <section data-testid="section-ai-usage-areas">
        <SectionHeader
          title="Where AI is used"
          subtitle="All AI-powered features in the platform"
          testId="section-ai-usage-areas-header"
        />
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-5 shadow-sm border border-[#dde3eb]"
              >
                <Skeleton className="w-32 h-5 rounded mb-3" />
                <Skeleton className="w-full h-4 rounded mb-2" />
                <Skeleton className="w-24 h-4 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.05 } },
            }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            {usageAreas.map((area) => (
              <motion.div
                key={area.id}
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  show: { opacity: 1, y: 0 },
                }}
                className="bg-white rounded-2xl p-5 shadow-sm border border-[#dde3eb] hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-semibold text-[#0a1628] leading-tight">
                    {area.name}
                  </h3>
                  <StatusBadgeSimple status={area.status} />
                </div>
                <p className="text-xs text-[#5a6578] mb-3 leading-relaxed">
                  {area.description}
                </p>
                <div className="flex items-center gap-3 text-xs text-[#5a6578]">
                  <span className="flex items-center gap-1">
                    <MessageSquare size={12} />
                    {formatNumber(area.requests)} requests
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign size={12} />
                    {formatCurrency(area.estimatedCost)}
                  </span>
                  <UsageLevelChip level={area.usageLevel} />
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      {/* ══════════════════════════════════════════
          SECTION 3: What Costs the Most
      ══════════════════════════════════════════ */}
      <section data-testid="section-highest-cost">
        <SectionHeader
          title="What costs the most"
          subtitle="AI features ranked by estimated spend this month"
          testId="section-highest-cost-header"
        />
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-4 shadow-sm border border-[#dde3eb]"
              >
                <div className="flex items-center gap-4">
                  <Skeleton className="w-6 h-6 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="w-40 h-4 rounded mb-2" />
                    <Skeleton className="w-full h-2 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedByCost.slice(0, 7).map((area, index) => (
              <motion.div
                key={area.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: index * 0.04 }}
                className="bg-white rounded-2xl p-4 shadow-sm border border-[#dde3eb] flex items-center gap-4"
              >
                {/* Rank */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    index === 0
                      ? 'bg-amber-100 text-amber-700'
                      : index === 1
                      ? 'bg-slate-100 text-slate-600'
                      : index === 2
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-slate-50 text-slate-400'
                  }`}
                >
                  {index + 1}
                </div>

                {/* Info + Bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#0a1628]">
                        {area.name}
                      </span>
                      <StatusBadgeSimple status={area.status} />
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-semibold text-[#0a1628]">
                        {formatCurrency(area.estimatedCost)}
                      </span>
                      <span className="text-[#5a6578] min-w-[40px] text-right">
                        {area.costPercent?.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${area.costPercent ?? 0}%` }}
                      transition={{ duration: 0.6, delay: 0.1 + index * 0.04 }}
                      className={`h-full rounded-full ${
                        index === 0
                          ? 'bg-amber-400'
                          : index === 1
                          ? 'bg-slate-400'
                          : index === 2
                          ? 'bg-orange-400'
                          : 'bg-violet-400'
                      }`}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════
          SECTION 4: Most Active AI Features
      ══════════════════════════════════════════ */}
      <section data-testid="section-highest-usage">
        <SectionHeader
          title="Most active AI features"
          subtitle="Features with the highest request volume this month"
          testId="section-highest-usage-header"
        />
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-4 shadow-sm border border-[#dde3eb]"
              >
                <Skeleton className="w-32 h-5 rounded mb-3" />
                <Skeleton className="w-24 h-8 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {sortedByRequests.slice(0, 6).map((area, index) => (
              <motion.div
                key={area.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.04 }}
                className="bg-white rounded-2xl p-4 shadow-sm border border-[#dde3eb]"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-semibold text-[#0a1628] mb-0.5">
                      {area.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <StatusBadgeSimple status={area.status} />
                      <TrendChip trend={area.trend} />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-[#0a1628]">
                      {formatNumber(area.requests)}
                    </p>
                    <p className="text-xs text-[#5a6578]">requests</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <p className="text-xs text-[#5a6578]">
                    Avg cost: {formatCurrency(area.avgCostPerRequest)}/request
                  </p>
                  <UsageLevelChip level={area.usageLevel} />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════
          SECTION 5: Needs Attention
      ══════════════════════════════════════════ */}
      <section data-testid="section-needs-attention">
        <SectionHeader
          title="Needs attention"
          subtitle="Actionable issues that may need review"
          testId="section-needs-attention-header"
        />
        {isLoading ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#dde3eb]">
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="w-full h-12 rounded-xl" />
              ))}
            </div>
          </div>
        ) : alerts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-800">
                Everything looks normal
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">
                No issues detected with AI features right now
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className={`rounded-2xl p-4 flex items-start gap-3 border ${
                  alert.severity === 'critical'
                    ? 'bg-rose-50 border-rose-200'
                    : alert.severity === 'warning'
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-sky-50 border-sky-200'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    alert.severity === 'critical'
                      ? 'bg-rose-100'
                      : alert.severity === 'warning'
                      ? 'bg-amber-100'
                      : 'bg-sky-100'
                  }`}
                >
                  {alert.severity === 'critical' ? (
                    <AlertTriangle
                      size={16}
                      className="text-rose-600"
                    />
                  ) : alert.severity === 'warning' ? (
                    <Lightbulb size={16} className="text-amber-600" />
                  ) : (
                    <Info size={16} className="text-sky-600" />
                  )}
                </div>
                <p
                  className={`text-sm font-medium ${
                    alert.severity === 'critical'
                      ? 'text-rose-800'
                      : alert.severity === 'warning'
                      ? 'text-amber-800'
                      : 'text-sky-800'
                  }`}
                >
                  {alert.message}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════
          SECTION 6: AI Activity Breakdown Table
      ══════════════════════════════════════════ */}
      <section data-testid="section-ai-breakdown-table">
        <SectionHeader
          title="AI activity breakdown"
          subtitle="Detailed view of all AI features and their usage"
          testId="section-ai-breakdown-table-header"
        />
        <div className="bg-white rounded-2xl shadow-sm border border-[#dde3eb] overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="w-full h-12 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#dde3eb] bg-slate-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-[#5a6578] uppercase tracking-wide">
                      Feature
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#5a6578] uppercase tracking-wide">
                      Status
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#5a6578] uppercase tracking-wide">
                      Requests
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#5a6578] uppercase tracking-wide">
                      Est. Cost
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#5a6578] uppercase tracking-wide">
                      Avg / Request
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#5a6578] uppercase tracking-wide">
                      Last Active
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dde3eb]">
                  {usageAreas.map((area) => (
                    <tr
                      key={area.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <div>
                          <p className="font-medium text-[#0a1628]">
                            {area.name}
                          </p>
                          <p className="text-xs text-[#5a6578] hidden sm:block">
                            {area.description}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadgeSimple status={area.status} />
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-[#0a1628]">
                        {formatNumber(area.requests)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-[#0a1628]">
                        {formatCurrency(area.estimatedCost)}
                      </td>
                      <td className="px-4 py-3 text-right text-[#5a6578]">
                        {formatCurrency(area.avgCostPerRequest)}
                      </td>
                      <td className="px-4 py-3 text-[#5a6578]">
                        {formatTimestamp(area.lastActiveAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default AdminAIMonitoring;