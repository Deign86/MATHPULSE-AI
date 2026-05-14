import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, RefreshCw, TrendingUp, TrendingDown, Minus, Scale, HelpCircle } from 'lucide-react';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  YAxis,
  Tooltip as RechartsTooltip,
  ReferenceLine,
} from 'recharts';
import { RiskBadge } from './RiskBadge';
import { useStudentRisk } from '../../hooks/useStudentRisk';
import { Button } from '../ui/button';

interface RiskDetailPanelProps {
  studentId: string;
  studentName?: string;
  className?: string;
}

interface ScoreBarProps {
  label: string;
  value: number | null;
  weight: number;
  color: string;
}

const ScoreBar: React.FC<ScoreBarProps> = ({ label, value, weight, color }) => {
  const percentage = value ?? 0;
  const weighted = (percentage * weight).toFixed(1);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-600 font-medium">{label}</span>
        <span className="text-slate-900 font-semibold tabular-nums">
          {value !== null ? `${value.toFixed(0)}%` : '—'}
          <span className="text-slate-400 font-normal text-xs ml-1">
            (w={weight})
          </span>
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

export const RiskDetailPanel: React.FC<RiskDetailPanelProps> = ({
  studentId,
  studentName,
  className = '',
}) => {
  const [expanded, setExpanded] = useState(false);
  const {
    wri,
    riskStatus,
    diagnosticScore,
    externalGradesAvg,
    systemPerformanceAvg,
    weights,
    riskHistory,
    riskUpdatedAt,
    loading,
    recalculate,
    pendingAssessment,
  } = useStudentRisk(studentId);

  // Compute trend from last 2 risk history entries
  const trend = (() => {
    if (!riskHistory || riskHistory.length < 2) return 'stable';
    const recent = riskHistory.slice(-2);
    const diff = recent[1].wri - recent[0].wri;
    if (diff > 2) return 'improving';
    if (diff < -2) return 'declining';
    return 'stable';
  })();

  const TrendIcon = trend === 'improving' ? TrendingUp : trend === 'declining' ? TrendingDown : Minus;

  // Format sparkline data (last 10 entries)
  const sparklineData = (riskHistory ?? [])
    .slice(-10)
    .map((entry) => ({ wri: entry.wri, date: entry.computedAt }));

  // Compute what-if: what would WRI be if each component changed
  const w1 = weights.w1, w2 = weights.w2, w3 = weights.w3;

  return (
    <div className={`bg-white border border-slate-200 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <RiskBadge status={riskStatus} wri={wri} size="md" showScore />
          {studentName && (
            <span className="text-sm font-medium text-slate-700">{studentName}</span>
          )}
          {wri !== null && (
            <span className={`flex items-center gap-1 text-xs ${trend === 'improving' ? 'text-emerald-600' : trend === 'declining' ? 'text-rose-600' : 'text-slate-500'}`}>
              <TrendIcon size={12} />
              <span className="capitalize">{trend}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!pendingAssessment && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                recalculate();
              }}
              disabled={loading}
              className="text-xs h-7 px-2"
            >
              <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
              Recalc
            </Button>
          )}
          <ChevronDown
            size={16}
            className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Pending Assessment State */}
      {pendingAssessment && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 rounded-lg p-3">
            <HelpCircle size={14} className="text-slate-400" />
            <span>Complete the initial diagnostic assessment to calculate WRI.</span>
          </div>
        </div>
      )}

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && !pendingAssessment && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {/* D/G/P Score Bars */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <Scale size={12} />
                  Score Breakdown
                </div>
                <ScoreBar
                  label="Diagnostic (D)"
                  value={diagnosticScore}
                  weight={w1}
                  color="bg-blue-500"
                />
                <ScoreBar
                  label="External Grades (G)"
                  value={externalGradesAvg}
                  weight={w2}
                  color="bg-violet-500"
                />
                <ScoreBar
                  label="System Performance (P)"
                  value={systemPerformanceAvg}
                  weight={w3}
                  color="bg-cyan-500"
                />
              </div>

              {/* WRI Formula Summary */}
              <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                <div className="text-xs font-medium text-slate-600">Formula</div>
                <div className="font-mono text-sm text-slate-700">
                  WRI = ({w1})×D + ({w2})×G + ({w3})×P
                </div>
                <div className="text-xs text-slate-500">
                  = ({w1}×{diagnosticScore?.toFixed(0) ?? '—'}) + ({w2}×{externalGradesAvg?.toFixed(0) ?? '—'}) + ({w3}×{systemPerformanceAvg?.toFixed(0) ?? '—'}){' '}
                  <span className="font-semibold text-slate-700">= {wri ?? '—'}</span>
                </div>
              </div>

              {/* Risk History Sparkline */}
              {sparklineData.length > 1 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Risk Trend
                  </div>
                  <div className="h-16 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sparklineData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                        <YAxis domain={[0, 100]} hide />
                        <ReferenceLine y={68} stroke="#000000" strokeDasharray="3 3" strokeOpacity={0.5} />
                        <ReferenceLine y={75} stroke="#f43f5e" strokeDasharray="3 3" strokeOpacity={0.5} />
                        <ReferenceLine y={80} stroke="#3b82f6" strokeDasharray="3 3" strokeOpacity={0.5} />
                        <ReferenceLine y={88} stroke="#10b981" strokeDasharray="3 3" strokeOpacity={0.5} />
                        <RechartsTooltip
                          formatter={(val: number) => [`${val.toFixed(1)}`, 'WRI']}
                          labelFormatter={(_, payload) =>
                            payload?.[0]?.payload?.date
                              ? new Date(payload[0].payload.date).toLocaleDateString()
                              : ''
                          }
                        />
                        <Line
                          type="monotone"
                          dataKey="wri"
                          stroke="#6366f1"
                          strokeWidth={2}
                          dot={{ r: 2, fill: '#6366f1' }}
                          activeDot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span className="text-black">— 68 (At-Risk floor)</span>
                    <span className="text-rose-500">— 75 (Critical threshold)</span>
                    <span className="text-blue-500">— 80 (Watch threshold)</span>
                    <span className="text-emerald-500">— 88 (Safe threshold)</span>
                  </div>
                </div>
              )}

              {/* Last Updated */}
              {riskUpdatedAt && (
                <div className="text-xs text-slate-400 text-right">
                  Last computed: {riskUpdatedAt.toLocaleString()}
                </div>
              )}

              {/* DepEd Note */}
              <div className="text-xs text-slate-400 italic border-t border-slate-100 pt-2">
                WRI thresholds based on DepEd DO No. 8, s. 2015. WRI is a support tool — final decisions remain with the teacher.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
