import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';
import { motion } from 'motion/react';
import { Brain, Sparkles, BookOpen, RefreshCw } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useCompetencyMatrix } from '../hooks/useCompetencyMatrix';
import { db } from '../lib/firebase';
import { Badge } from './ui/badge';

// ─── Shared JEV weakness-metric presentation ─────────────────────────────
// Mirrors the persisted fields written by assessmentService into
// competencyProfiles/{uid} and users/{uid}: bloomLevel (0-3), pCorrect (0-1).

export type BloomLevel = 0 | 1 | 2 | 3;

export interface JevMetrics {
  bloomLevel?: BloomLevel;
  pCorrect?: number;
}

/** Bloom ladder used by the JEV mastery scorer (backend/services/jev_client.py). */
export const BLOOM_LEVEL_LABELS: readonly string[] = [
  'Recall',
  'Procedural',
  'Conceptual',
  'Metacognitive',
];

const BLOOM_BADGE_TONES: readonly string[] = [
  'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/60 dark:text-violet-200 dark:border-violet-800/50',
  'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-200 dark:border-sky-800/50',
  'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800/50',
  'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800/50',
];

const BLOOM_LEVEL_DESCRIPTIONS: readonly string[] = [
  'Remembers definitions or facts',
  'Follows a familiar procedure',
  'Applies concepts to a new problem',
  'Explains and evaluates their own reasoning',
];

/** Narrow an arbitrary Firestore value to a JEV Bloom level. */
export function isBloomLevel(value: unknown): value is BloomLevel {
  return value === 0 || value === 1 || value === 2 || value === 3;
}

/** Narrow untrusted Firestore values to finite numbers. */
export function isFiniteNumber(value: unknown): value is number {
  return Number.isFinite(value);
}

/** Map a Bloom tag from quiz/diagnostic data onto the JEV 0-3 ladder. */
export function bloomLevelFromLabel(label: string | null | undefined): BloomLevel | undefined {
  const key = (label || '').trim().toLowerCase().replace(/ing$/, '');
  switch (key) {
    case 'remember':
      return 0;
    case 'understand':
      return 1;
    case 'apply':
      return 2;
    case 'analyze':
    case 'evaluate':
    case 'create':
      return 3;
    default:
      return undefined;
  }
}

function confidenceTone(pCorrect: number): string {
  if (pCorrect < 0.5) return 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/50';
  if (pCorrect < 0.8) return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800/50';
  return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800/50';
}

/** Chip naming the Bloom level a JEV check estimated. Renders nothing when the level is absent. */
export const JevBloomBadge: React.FC<{
  bloomLevel?: BloomLevel;
  size?: 'sm' | 'xs';
  showIcon?: boolean;
  className?: string;
}> = ({ bloomLevel, size = 'sm', showIcon = true, className }) => {
  if (bloomLevel === undefined) return null;
  return (
    <Badge
      variant="secondary"
      title={`Bloom mastery level ${bloomLevel} of 3 — ${BLOOM_LEVEL_DESCRIPTIONS[bloomLevel]}`}
      className={`${size === 'xs' ? 'text-[9px] px-1.5 py-0 gap-1' : 'text-[10px] px-2 py-0.5 gap-1'} font-black uppercase tracking-wider rounded-full ${BLOOM_BADGE_TONES[bloomLevel]} ${className ?? ''}`}
    >
      {showIcon && <Brain className={size === 'xs' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />}
      {BLOOM_LEVEL_LABELS[bloomLevel]}
    </Badge>
  );
};

/** Chip showing the modeled probability of a correct answer. Renders nothing when pCorrect is absent. */
export const JevConfidenceBadge: React.FC<{
  pCorrect?: number | null;
  size?: 'sm' | 'xs';
  className?: string;
}> = ({ pCorrect, size = 'sm', className }) => {
  if (pCorrect === undefined || pCorrect === null || !Number.isFinite(pCorrect)) return null;
  const percent = Math.round(Math.max(0, Math.min(1, pCorrect)) * 100);
  return (
    <Badge
      variant="outline"
      title="Jev estimate: modeled chance the student answers the next question on this topic correctly"
      className={`${size === 'xs' ? 'text-[9px] px-1.5 py-0' : 'text-[10px] px-2 py-0.5'} font-black tabular-nums rounded-full border-transparent ${confidenceTone(pCorrect)} ${className ?? ''}`}
    >
      {percent}% ready
    </Badge>
  );
};

/** Read persisted JEV metrics for one student from competencyProfiles/{uid}. */
export async function fetchJevProfile(uid: string): Promise<JevMetrics> {
  const metricsByUid = await fetchJevProfiles([uid]);
  return metricsByUid.get(uid) ?? {};
}

/** Batch-read persisted JEV metrics for many students from competencyProfiles. */
export async function fetchJevProfiles(uids: readonly string[]): Promise<Map<string, JevMetrics>> {
  const metricsByUid = new Map<string, JevMetrics>();
  const uniqueUids = Array.from(new Set(uids.filter(Boolean)));
  const JEV_BATCH_SIZE = 25;

  for (let index = 0; index < uniqueUids.length; index += JEV_BATCH_SIZE) {
    const batch = uniqueUids.slice(index, index + JEV_BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((uid) => getDoc(doc(db, 'competencyProfiles', uid))),
    );
    results.forEach((result, batchIndex) => {
      if (result.status !== 'fulfilled' || !result.value.exists()) return;
      const stored = result.value.data();
      const metrics: JevMetrics = {};
      if (isBloomLevel(stored.bloomLevel)) metrics.bloomLevel = stored.bloomLevel;
      if (isFiniteNumber(stored.pCorrect)) {
        metrics.pCorrect = Math.max(0, Math.min(1, stored.pCorrect));
      }
      metricsByUid.set(batch[batchIndex], metrics);
    });
  }

  return metricsByUid;
}

/** Live JEV metrics for the signed-in student profile. Null while loading or when unassessed. */
export function useJevStudentMetrics(uid: string | undefined): JevMetrics | null {
  const [metrics, setMetrics] = useState<JevMetrics | null>(null);

  useEffect(() => {
    if (!uid) {
      setMetrics(null);
      return;
    }
    let cancelled = false;
    void fetchJevProfile(uid).then((result) => {
      if (!cancelled) setMetrics(result.bloomLevel !== undefined || result.pCorrect !== undefined ? result : null);
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  return metrics;
}

export const CompetencyRadarChart: React.FC = () => {
  const { userProfile } = useAuth();
  const { data, modulesList, topModule, loading, error, isEmpty, refresh } =
    useCompetencyMatrix(userProfile?.uid ?? '');
  const jevMetrics = useJevStudentMetrics(userProfile?.uid);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden bg-gradient-to-b from-white/95 via-white/85 to-slate-50/75 dark:from-slate-900/95 dark:via-slate-900/85 dark:to-slate-950/75 backdrop-blur-xl rounded-2xl md:rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-4 sm:p-5 lg:p-6 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Soft ambient glows */}
      <div className="absolute -right-16 -top-16 w-48 h-48 bg-purple-400/10 dark:bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-sky-400/10 dark:bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-5 relative z-10 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-[0_4px_12px_rgba(139,92,246,0.3)]">
            <Brain size={20} className="stroke-[2.2]" />
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 leading-none">
              Skill Analytics
            </span>
            <h3 className="text-sm sm:text-base font-display font-black text-slate-900 dark:text-white leading-tight mt-0.5">
              Competency Matrix
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Realtime performance across modules</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Top Module badge */}
          {!loading && !isEmpty && !error && (
            <div className="flex items-center gap-1.5 bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 px-3 py-1.5 rounded-full shadow-sm">
              <Sparkles size={12} className="text-amber-500 fill-amber-500/30" />
              <span className="text-[10px] sm:text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                {topModule}
              </span>
            </div>
          )}

          {/* Refresh */}
          {!loading && (
            <button
              onClick={refresh}
              className="w-8 h-8 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:border-purple-300 transition-colors shadow-sm active:scale-95 cursor-pointer"
              title="Refresh"
            >
              <RefreshCw size={13} className="text-slate-500 dark:text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* Chart area */}
      <div className="h-[300px] sm:h-[360px] w-full relative z-10">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-[#9956DE]/20 border-t-[#9956DE] rounded-full animate-spin" />
              <p className="text-[13px] text-slate-400 font-medium">Analyzing skill vectors...</p>
            </div>
          </div>
        ) : isEmpty || error ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center border border-slate-200">
              <BookOpen size={24} className="text-slate-400" />
            </div>
            <div className="text-center">
              <p className="text-[13px] font-semibold text-slate-600 mb-1">
                {error ? 'Unable to load competency data' : 'No activity yet'}
              </p>
              <p className="text-[12px] text-slate-400 max-w-[260px]">
                {error || 'Complete quizzes and lessons to see your competency matrix here.'}
              </p>
            </div>
            {error && (
              <button
                onClick={refresh}
                className="px-4 py-2 text-[12px] font-semibold bg-[#9956DE] text-white rounded-full hover:bg-[#8b45d1] transition-colors shadow-md"
              >
                Try Again
              </button>
            )}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius={isHovered ? '75%' : '70%'} data={data}>
              <PolarGrid stroke="#cbd5e1" strokeDasharray="3 3" opacity={0.6} polarRadius={[20, 40, 60, 80, 100]} />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                tickCount={6}
                axisLine={false}
              />
              {modulesList.map((mod) => (
                <Radar
                  key={mod.id}
                  name={mod.name}
                  dataKey={mod.id}
                  stroke={mod.color}
                  strokeWidth={2.2}
                  fill={mod.color}
                  fillOpacity={0.25}
                  dot={{ r: 3.5, fill: '#fff', stroke: mod.color, strokeWidth: 2 }}
                  activeDot={{ r: 5.5, fill: mod.color, stroke: '#fff', strokeWidth: 2.5 }}
                  isAnimationActive={true}
                  animationDuration={1500}
                  animationEasing="ease-out"
                />
              ))}
              <Tooltip
                cursor={false}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-[0_12px_32px_rgba(0,0,0,0.15)] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4">
                        <p className="font-display font-bold text-slate-800 dark:text-white text-[13px] mb-2">
                          {payload[0].payload.metric}
                        </p>
                        <div className="flex flex-col gap-1.5">
                          {payload.map((pl) => {
                            // SAFETY: this radar chart's series are numeric; recharts types payload values loosely.
                            const roundedValue = Math.round(pl.value as number);
                            return (
                            <div key={pl.name} className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pl.stroke }} />
                                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[140px]">
                                  {String(pl.name)}
                                </span>
                              </div>
                              <span className="text-[13px] font-bold" style={{ color: pl.stroke }}>
                                {roundedValue}%
                              </span>
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend */}
      {!loading && !isEmpty && !error && modulesList.length > 0 && (
        <div className="flex flex-wrap justify-center items-center gap-2.5 mt-4 relative z-10">
          {modulesList.map((mod) => (
            <div key={mod.id} className="flex items-center gap-1.5 bg-white/80 dark:bg-slate-800/80 px-3 py-1 rounded-full border border-slate-200/70 dark:border-slate-700/70 shadow-xs">
              <div className="w-2 h-2 rounded-full shadow-xs" style={{ backgroundColor: mod.color }} />
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {mod.name.length > 18 ? mod.name.substring(0, 15) + '...' : mod.name}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Jev mastery strip — shows what level the weakness check placed the student at */}
      {!loading && !error && (
        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 relative z-10 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Jev mastery check
          </span>
          {jevMetrics ? (
            <>
              <JevBloomBadge bloomLevel={jevMetrics.bloomLevel} />
              <JevConfidenceBadge pCorrect={jevMetrics.pCorrect} />
            </>
          ) : (
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
              No mastery check yet — scores shown are from your practice accuracy. Take the diagnostic to unlock it.
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
};
