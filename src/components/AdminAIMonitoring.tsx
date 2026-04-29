import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  Cpu,
  Zap,
  Clock,
  CheckCircle,
  AlertTriangle,
  ServerCrash,
  RefreshCw,
  HardDrive,
  DollarSign,
  Gauge,
  Database,
  Calendar,
} from 'lucide-react';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import {
  fetchHFMonitoringData,
  resolveHealthStatus,
} from '../services/huggingfaceMonitoringService';
import type { HFMonitoringData } from '../types/hfMonitoring';

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

function formatPeriodRange(start: string, end: string): string {
  if (!start || !end) return 'N/A';
  const s = start.split('T')[0];
  const e = end.split('T')[0];
  return `${s} — ${e}`;
}

function MetricCard({
  label,
  value,
  subvalue,
  icon: Icon,
  color,
  testId,
  loading,
  testIdLabel,
}: {
  label: string;
  value: string;
  subvalue?: string;
  icon: React.ElementType;
  color: string;
  testId: string;
  loading?: boolean;
  testIdLabel?: string;
}) {
  return (
    <div
      className="bg-white rounded-2xl p-5 shadow-sm border border-[#dde3eb]"
      data-testid={testId}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-sm`}
        >
          <Icon size={20} className="text-white" />
        </div>
      </div>
      {loading ? (
        <>
          <Skeleton className="w-20 h-8 rounded-lg mb-2" />
          <Skeleton className="w-32 h-4 rounded" />
        </>
      ) : (
        <>
          <p className="text-2xl font-bold text-[#0a1628] mb-1">{value}</p>
          <p className="text-sm text-[#5a6578] font-medium" data-testid={testIdLabel}>
            {label}
          </p>
          {subvalue && <p className="text-xs text-[#a0aec0] mt-1">{subvalue}</p>}
        </>
      )}
    </div>
  );
}

function StatusBadge({
  status,
  loading,
}: {
  status: HFMonitoringData['modelStatus'];
  loading?: boolean;
}) {
  const map = {
    Operational: {
      label: 'Operational',
      className: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      icon: CheckCircle,
    },
    Loading: {
      label: 'Loading',
      className: 'text-orange-600 bg-orange-50 border-orange-200',
      icon: Activity,
    },
    Degraded: {
      label: 'Degraded',
      className: 'text-rose-600 bg-rose-50 border-rose-200',
      icon: AlertTriangle,
    },
    Unknown: {
      label: 'Unknown',
      className: 'text-slate-600 bg-slate-50 border-slate-200',
      icon: ServerCrash,
    },
  };

  const cfg = map[status] ?? map.Unknown;

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${
        loading ? 'border-slate-200 bg-slate-50' : cfg.className
      }`}
      data-testid="health-badge"
    >
      {loading ? (
        <Activity size={16} className="text-slate-400" />
      ) : (
        <cfg.icon size={16} />
      )}
      <span className="text-sm font-bold">
        {loading ? 'Checking...' : cfg.label}
      </span>
    </div>
  );
}

const AdminAIMonitoring: React.FC = () => {
  const [data, setData] = useState<HFMonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchHFMonitoringData();
      setData(result);
      setLastRefreshed(new Date().toISOString());
    } catch (err) {
      console.error('Failed to load HF monitoring data', err);
      setError('Unable to load AI monitoring data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const healthStatus = data ? resolveHealthStatus(data) : 'Loading';

  return (
    <div className="space-y-6">
      {/* Header / Health Status */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-[#0a1628]">AI Platform Monitoring</h1>
          <p className="text-sm text-[#5a6578]">
            Live Hugging Face inference health and usage metrics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-xs text-[#5a6578] font-medium">Active Provider</span>
            <span className="text-sm font-bold text-[#0a1628] flex items-center gap-1.5">
              <Cpu size={14} className="text-sky-500" />
              {loading ? '...' : (data?.modelId ?? 'Qwen/Qwen3-32B')}
            </span>
          </div>
          <StatusBadge
            status={data?.modelStatus ?? 'Unknown'}
            loading={loading}
          />
        </div>
      </motion.div>

      {/* Error Banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-5 py-4"
          data-testid="monitoring-error"
        >
          <AlertTriangle size={18} className="text-rose-600 shrink-0" />
          <p className="text-sm text-rose-800">{error}</p>
        </motion.div>
      )}

      {/* Primary Metrics Grid — 4 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          label="AI Usage Cost This Month"
          value={loading ? '...' : `$${(data?.inferenceBalance ?? 0).toFixed(2)}`}
          subvalue={loading ? undefined : `Total: $${(data?.totalPeriodCost ?? 0).toFixed(2)} this period`}
          icon={DollarSign}
          color="from-emerald-500 to-teal-600"
          testId="metric-card"
          loading={loading}
          testIdLabel="metric-label"
        />
        <MetricCard
          label="Platform API Calls"
          value={
            loading
              ? '...'
              : `${data?.hubApiCallsUsed ?? 0} of ${data?.hubApiCallsLimit?.toLocaleString() ?? '2,500'}`
          }
          icon={Gauge}
          color="from-sky-500 to-blue-600"
          testId="metric-card"
          loading={loading}
          testIdLabel="metric-label"
        />
        <MetricCard
          label="Free GPU Time Used"
          value={
            loading
              ? '...'
              : `${data?.zeroGpuMinutesUsed ?? 0} of ${data?.zeroGpuMinutesLimit ?? 25} min`
          }
          icon={Zap}
          color="from-violet-500 to-purple-600"
          testId="metric-card"
          loading={loading}
          testIdLabel="metric-label"
        />
        <MetricCard
          label="Live Model Latency"
          value={loading ? '...' : `${data?.avgResponseTimeMs ?? 0}ms`}
          subvalue={
            !loading && data
              ? data.avgResponseTimeMs > 5000
                ? 'Slow — model may be cold'
                : 'Within normal range'
              : undefined
          }
          icon={Clock}
          color="from-orange-500 to-red-600"
          testId="metric-card"
          loading={loading}
          testIdLabel="metric-label"
        />
      </div>

      {/* Secondary Metrics + Info Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Billing Period Details */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-[#dde3eb]"
        >
          <div className="flex items-center gap-2 mb-5">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Calendar size={20} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0a1628]">Billing Period</h2>
              <p className="text-xs text-[#5a6578]">Current billing cycle dates</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <DollarSign size={18} className="text-emerald-500" />
                <span className="text-sm font-semibold text-[#0a1628]">Period Cost</span>
              </div>
              <span className="text-sm font-bold text-emerald-600">
                {loading ? '...' : `$${(data?.totalPeriodCost ?? 0).toFixed(2)}`}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <Calendar size={18} className="text-sky-500" />
                <span className="text-sm font-semibold text-[#0a1628]">Period Dates</span>
              </div>
              <span className="text-xs font-medium text-sky-600">
                {loading
                  ? '...'
                  : formatPeriodRange(data?.periodStart ?? '', data?.periodEnd ?? '')}
              </span>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-[#dde3eb]">
            <h3 className="text-sm font-semibold text-[#0a1628] mb-3">Storage</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <HardDrive size={18} className="text-orange-500" />
                  <span className="text-sm font-semibold text-[#0a1628]">Public Storage</span>
                </div>
                <span className="text-sm font-bold text-orange-600">
                  {loading
                    ? '...'
                    : `${(data?.publicStorageUsedTB ?? 0).toFixed(2)} TB / ${(data?.publicStorageLimitTB ?? 11.2).toFixed(1)} TB`}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Recent Activity / Last Refreshed */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="xl:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-[#dde3eb] flex flex-col"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                <Activity size={20} className="text-slate-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#0a1628]">System Status</h2>
                <p className="text-xs text-[#5a6578]">Hugging Face model and API health</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={loadData}
              disabled={loading}
              data-testid="refresh-btn"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Refresh
            </Button>
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Model Status */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <Cpu size={16} className="text-sky-500" />
                <span className="text-sm font-semibold text-[#0a1628]">AI Model Status</span>
              </div>
              {loading ? (
                <Skeleton className="w-24 h-6 rounded" />
              ) : (
                <div className="flex items-center gap-2">
                  {healthStatus === 'Operational' && (
                    <CheckCircle size={16} className="text-emerald-500" />
                  )}
                  {healthStatus === 'Loading' && (
                    <Activity size={16} className="text-orange-500" />
                  )}
                  {healthStatus === 'Degraded' && (
                    <AlertTriangle size={16} className="text-rose-500" />
                  )}
                  <span
                    className={`text-lg font-bold ${
                      healthStatus === 'Operational'
                        ? 'text-emerald-600'
                        : healthStatus === 'Loading'
                          ? 'text-orange-600'
                          : 'text-rose-600'
                    }`}
                  >
                    {healthStatus === 'Operational' && 'Operational'}
                    {healthStatus === 'Loading' && 'Starting up, please wait…'}
                    {healthStatus === 'Degraded' && 'Degraded'}
                  </span>
                </div>
              )}
              <p className="text-xs text-[#a0aec0] mt-2">
                {loading ? '...' : data?.modelId ?? 'Qwen/Qwen3-32B'}
              </p>
            </div>

            {/* Last Refreshed */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={16} className="text-violet-500" />
                <span className="text-sm font-semibold text-[#0a1628]">Last Refreshed</span>
              </div>
              {loading ? (
                <Skeleton className="w-32 h-6 rounded" />
              ) : (
                <p
                  className="text-sm font-bold text-[#0a1628]"
                  data-testid="last-refreshed"
                >
                  {formatTimestamp(lastRefreshed)}
                </p>
              )}
              <p className="text-xs text-[#a0aec0] mt-2" data-testid="last-refreshed">
                Last updated from Hugging Face
              </p>
            </div>

            {/* Period Info */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 sm:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <Database size={16} className="text-teal-500" />
                <span className="text-sm font-semibold text-[#0a1628]">API Rate Limit</span>
              </div>
              {loading ? (
                <Skeleton className="w-40 h-6 rounded" />
              ) : (
                <p className="text-sm font-bold text-[#0a1628]">
                  {data?.hubApiCallsUsed ?? 0} of {data?.hubApiCallsLimit?.toLocaleString() ?? '2,500'}{' '}
                  requests used
                </p>
              )}
              <p className="text-xs text-[#a0aec0] mt-2">
                Hub API — resets every 5 minutes
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminAIMonitoring;