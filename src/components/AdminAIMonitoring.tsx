import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Brain,
  Activity,
  MessageSquare,
  Zap,
  Clock,
  CheckCircle,
  AlertTriangle,
  ServerCrash,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { Button } from './ui/button';
import { apiService } from '../services/apiService';

export type AIMonitoringStats = {
  totalRequests: number;
  requestsToday: number;
  avgResponseTimeMs: number;
  estimatedCostToday: number;
  estimatedCostMonth: number;
  activeModel: string;
  healthStatus: 'healthy' | 'degraded' | 'offline';
  failedRequests: number;
  tutoringSessions: number;
  quizGenerationRequests: number;
  tokenUsage?: number;
  recentActivity: Array<{
    id: string;
    type: string;
    user?: string;
    timestamp: string;
    status: 'success' | 'warning' | 'error';
    details?: string;
  }>;
};

// Fallback/Mock data
const mockData: AIMonitoringStats = {
  totalRequests: 145023,
  requestsToday: 1250,
  avgResponseTimeMs: 840,
  estimatedCostToday: 4.50,
  estimatedCostMonth: 135.20,
  activeModel: 'qwen-2.5-coder-32b-instruct',
  healthStatus: 'healthy',
  failedRequests: 12,
  tutoringSessions: 430,
  quizGenerationRequests: 85,
  tokenUsage: 12450000,
  recentActivity: [
    {
      id: 'log-1',
      type: 'AI Tutor Session',
      user: 'Student A',
      timestamp: '2 mins ago',
      status: 'success',
      details: 'Calculus help request processed.'
    },
    {
      id: 'log-2',
      type: 'Quiz Generation',
      user: 'Teacher B',
      timestamp: '15 mins ago',
      status: 'success',
      details: 'Generated 10 questions for Algebra II.'
    },
    {
      id: 'log-3',
      type: 'Model Inference Timeout',
      user: 'System',
      timestamp: '1 hour ago',
      status: 'error',
      details: 'Request took longer than 15000ms.'
    },
    {
      id: 'log-4',
      type: 'AI Tutor Session',
      user: 'Student C',
      timestamp: '2 hours ago',
      status: 'warning',
      details: 'Content filter triggered.'
    }
  ]
};

const AdminAIMonitoring: React.FC = () => {
  const [stats, setStats] = useState<AIMonitoringStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const response = await apiService.getInferenceMetrics();
        if (!mounted) return;

        if (response.success) {
          const m = response.metrics;
          
          // Map backend stats to UI representation
          setStats({
            totalRequests: m.requests_total || 0,
            requestsToday: m.requests_total || 0, // Persistent across restarts now
            avgResponseTimeMs: m.avg_latency_ms || 0,
            estimatedCostToday: 0.00, // HF Spaces flat rate pricing
            estimatedCostMonth: 0.00,
            activeModel: m.active_model || import.meta.env.VITE_HF_MATH_MODEL_ID || 'qwen-2.5-coder-32b-instruct',
            healthStatus: m.requests_error > (m.requests_total * 0.2) ? 'degraded' : 'healthy',
            failedRequests: m.requests_error || 0,
            tutoringSessions: m.task_counts?.chat || 0,
            quizGenerationRequests: m.task_counts?.quiz_generation || 0,
            tokenUsage: m.token_usage || (m.requests_total || 0) * 850,
            recentActivity: [
              {
                id: 'log-sys-1',
                type: 'System Uptime',
                timestamp: 'Just now',
                status: 'success',
                details: `Uptime: ${Math.floor(m.uptime_sec / 3600)}h ${Math.floor((m.uptime_sec % 3600) / 60)}m`
              },
              {
                id: 'log-sys-2',
                type: 'Success Rate',
                timestamp: 'Last hour',
                status: m.requests_error > 0 ? 'warning' : 'success',
                details: `${m.requests_ok} successful out of ${m.requests_total} total requests.`
              },
              ...(m.fallback_attempts > 0 ? [{
                id: 'log-sys-3',
                type: 'Fallback Triggered',
                timestamp: 'Recent',
                status: 'warning' as const,
                details: `Model fallback triggered ${m.fallback_attempts} times.`
              }] : [])
            ]
          });
        }
      } catch (err) {
        console.error('Failed to load AI metrics', err);
        if (mounted) setError('Failed to load real-time AI metrics.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchMetrics();
    return () => { mounted = false; };
  }, []);

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'degraded': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'offline': return 'text-rose-600 bg-rose-50 border-rose-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle size={16} className="text-emerald-500" />;
      case 'degraded': return <AlertTriangle size={16} className="text-orange-500" />;
      case 'offline': return <ServerCrash size={16} className="text-rose-500" />;
      default: return <Activity size={16} className="text-slate-500" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <div className="w-2 h-2 rounded-full bg-emerald-500" />;
      case 'warning': return <div className="w-2 h-2 rounded-full bg-orange-500" />;
      case 'error': return <div className="w-2 h-2 rounded-full bg-rose-500" />;
      default: return <div className="w-2 h-2 rounded-full bg-slate-500" />;
    }
  };

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
          <p className="text-sm text-[#5a6578]">Monitor inference health, usage, and estimated costs</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-xs text-[#5a6578] font-medium">Active Provider</span>
            <span className="text-sm font-bold text-[#0a1628] flex items-center gap-1.5">
              <Cpu size={14} className="text-sky-500" />
              {loading ? '...' : stats?.activeModel}
            </span>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${loading ? 'border-slate-200 bg-slate-50 text-slate-500' : getHealthColor(stats?.healthStatus || '')}`}>
            {loading ? <Activity size={16} /> : getHealthIcon(stats?.healthStatus || '')}
            <span className="text-sm font-bold capitalize">{loading ? 'Checking...' : stats?.healthStatus}</span>
          </div>
        </div>
      </motion.div>

      {/* Info banner for placeholders */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex items-center gap-3 bg-sky-50 border border-sky-200 rounded-2xl px-5 py-4"
      >
        <Activity size={18} className="text-sky-600 shrink-0" />
        <p className="text-sm text-sky-800">
          <span className="font-semibold">Live Metrics.</span>{' '}
          This panel displays real-time inference statistics from the backend server.
          {error && <span className="text-rose-600 ml-2">({error})</span>}
        </p>
      </motion.div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total AI Requests', value: stats?.totalRequests.toLocaleString(), icon: Brain, color: 'from-sky-500 to-blue-600' },
          { label: 'Requests Today', value: stats?.requestsToday.toLocaleString(), icon: TrendingUp, color: 'from-teal-500 to-emerald-600' },
          { label: 'Avg Response Time', value: `${stats?.avgResponseTimeMs}ms`, icon: Clock, color: 'from-violet-500 to-purple-600' },
          { label: 'Failed Requests', value: stats?.failedRequests.toLocaleString(), icon: AlertTriangle, color: 'from-rose-500 to-orange-600' }
        ].map((metric, idx) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: idx * 0.06 }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-[#dde3eb]"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${metric.color} flex items-center justify-center shadow-sm`}>
                <metric.icon size={20} className="text-white" />
              </div>
            </div>
            {loading ? (
               <div className="w-20 h-8 bg-[#edf1f7] rounded-lg animate-pulse mb-2" />
            ) : (
              <p className="text-2xl font-bold text-[#0a1628] mb-1">{metric.value}</p>
            )}
            <p className="text-sm text-[#5a6578] font-medium">{metric.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Usage Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-[#dde3eb]"
        >
          <div className="flex items-center gap-2 mb-5">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Zap size={20} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0a1628]">Usage Breakdown</h2>
              <p className="text-xs text-[#5a6578]">Distribution by feature (Today)</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <MessageSquare size={18} className="text-sky-500" />
                <span className="text-sm font-semibold text-[#0a1628]">AI Tutoring Sessions</span>
              </div>
              <span className="text-sm font-bold text-sky-600">{loading ? '...' : stats?.tutoringSessions}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <Brain size={18} className="text-violet-500" />
                <span className="text-sm font-semibold text-[#0a1628]">Quiz Generations</span>
              </div>
              <span className="text-sm font-bold text-violet-600">{loading ? '...' : stats?.quizGenerationRequests}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <Cpu size={18} className="text-orange-500" />
                <span className="text-sm font-semibold text-[#0a1628]">Token Usage</span>
              </div>
              <span className="text-sm font-bold text-orange-600">
                {loading ? '...' : stats?.tokenUsage?.toLocaleString()}
              </span>
            </div>
          </div>
          
          <div className="mt-6 pt-5 border-t border-[#dde3eb]">
            <h3 className="text-sm font-semibold text-[#0a1628] mb-3">Estimated Cost</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <p className="text-xs text-emerald-600 font-medium mb-1">Today</p>
                <p className="text-lg font-bold text-emerald-700">{loading ? '...' : `$${stats?.estimatedCostToday.toFixed(2)}`}</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <p className="text-xs text-emerald-600 font-medium mb-1">This Month</p>
                <p className="text-lg font-bold text-emerald-700">{loading ? '...' : `$${stats?.estimatedCostMonth.toFixed(2)}`}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Recent Activity Log */}
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
                <h2 className="text-lg font-bold text-[#0a1628]">Recent Activity</h2>
                <p className="text-xs text-[#5a6578]">Latest API interactions</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="text-xs" disabled>View All Logs</Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                   <div key={i} className="h-16 bg-slate-50 rounded-xl border border-slate-100 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {stats?.recentActivity.map((log) => (
                  <div key={log.id} className="flex items-start gap-4 p-3 rounded-xl border border-[#dde3eb] hover:bg-slate-50 transition-colors">
                    <div className="mt-1.5">{getStatusIcon(log.status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-sm font-bold text-[#0a1628] truncate">{log.type}</span>
                        <span className="text-xs text-[#a0aec0] whitespace-nowrap">{log.timestamp}</span>
                      </div>
                      <p className="text-xs text-[#5a6578] truncate mb-1">
                        {log.user ? <span className="font-medium text-slate-700">{log.user}: </span> : null}
                        {log.details}
                      </p>
                    </div>
                  </div>
                ))}
                {stats?.recentActivity.length === 0 && (
                  <div className="text-center py-8 text-[#5a6578] text-sm">No recent activity.</div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminAIMonitoring;
