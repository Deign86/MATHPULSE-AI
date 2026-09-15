import React, { useState } from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';
import { motion } from 'motion/react';
import { Brain, Sparkles, BookOpen, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCompetencyMatrix } from '../hooks/useCompetencyMatrix';

export const CompetencyRadarChart: React.FC = () => {
  const { userProfile } = useAuth();
  const { data, modulesList, topModule, loading, error, isEmpty, refresh } =
    useCompetencyMatrix(userProfile?.uid ?? '');
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
    </motion.div>
  );
};
