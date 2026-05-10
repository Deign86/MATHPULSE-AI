import React, { useState } from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';
import { motion } from 'motion/react';
import { Brain, Sparkles, BookOpen } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCompetencyMatrix } from '../hooks/useCompetencyMatrix';

type RadarRow = { metric: string; fullMark: number; [key: string]: string | number };

export const CompetencyRadarChart: React.FC = () => {
  const { userProfile } = useAuth();
  const { data, modulesList, topModule, loading, error, isEmpty, refresh } =
    useCompetencyMatrix(userProfile?.uid ?? '');
  const [isHovered, setIsHovered] = useState(false);

  const handleRefresh = () => { refresh(); };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden bg-white/80 backdrop-blur-xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] p-6 lg:p-8 isolate group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-violet-400/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-rose-400/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 relative z-10 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-violet-100 text-violet-600 rounded-xl">
              <Brain size={20} className="stroke-[2.5]" />
            </span>
            <h3 className="text-xl font-display font-extrabold text-[#0a1628] tracking-tight">
              Competency Matrix
            </h3>
          </div>
          <p className="text-sm text-[#5a6578] font-body ml-12">Your realtime performance across modules</p>
        </div>

        {/* Top Module badge */}
        {!loading && !isEmpty && !error && (
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 px-4 py-2 rounded-2xl ml-12 sm:ml-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-sm border border-slate-100">
              <Sparkles size={14} className="text-amber-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Top Module</p>
              <p className="text-sm font-bold text-slate-700">{topModule}</p>
            </div>
          </div>
        )}

        {/* Refresh button */}
        {!loading && (
          <button
            onClick={handleRefresh}
            className="sm:ml-auto text-xs font-semibold text-slate-400 hover:text-violet-600 transition-colors px-2 py-1 rounded-lg hover:bg-violet-50"
            title="Refresh competency data"
          >
            Refresh
          </button>
        )}
      </div>

      {/* Chart area */}
      <div className="h-[300px] sm:h-[360px] w-full relative z-10">
        {loading ? (
          /* Loading skeleton */
          <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
              <p className="text-sm text-slate-400 font-medium">Analyzing skill vectors...</p>
            </div>
          </div>
        ) : isEmpty || error ? (
          /* Empty state — no activity yet */
          <div className="w-full h-full flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
              <BookOpen size={28} className="text-slate-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-600 mb-1">
                {error ? 'Unable to load competency data' : 'No activity yet'}
              </p>
              <p className="text-xs text-slate-400 max-w-[260px]">
                {error
                  ? error
                  : 'Complete quizzes and lessons to see your competency matrix here.'}
              </p>
            </div>
            {error && (
              <button
                onClick={handleRefresh}
                className="px-4 py-2 text-xs font-semibold bg-violet-100 text-violet-700 rounded-xl hover:bg-violet-200 transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius={isHovered ? '75%' : '70%'} data={data}>
              <PolarGrid
                stroke="#e2e8f0"
                strokeDasharray="4 4"
                polarRadius={[20, 40, 60, 80, 100]}
              />
              <PolarAngleAxis
                dataKey="metric"
                tick={{
                  fill: '#475569',
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: 'Inter, sans-serif',
                }}
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
                  strokeWidth={2}
                  fill={mod.color}
                  fillOpacity={0.35}
                  dot={{
                    r: 3,
                    fill: '#fff',
                    stroke: mod.color,
                    strokeWidth: 2,
                  }}
                  activeDot={{
                    r: 5,
                    fill: mod.color,
                    stroke: '#fff',
                    strokeWidth: 2,
                  }}
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
                      <div className="bg-white/95 backdrop-blur shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-slate-100 rounded-xl p-4">
                        <p className="font-display font-bold text-slate-800 text-sm mb-3">
                          {payload[0].payload.metric}
                        </p>
                        <div className="flex flex-col gap-2">
                          {payload.map((pl) => (
                            <div key={pl.name} className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: pl.stroke }}
                                />
                                <span
                                  className="text-xs font-bold text-slate-600 uppercase tracking-wide truncate max-w-[120px]"
                                  title={String(pl.name)}
                                >
                                  {String(pl.name)}
                                </span>
                              </div>
                              <span className="text-sm font-black" style={{ color: pl.stroke }}>
                                {Math.round(pl.value as number)}%
                              </span>
                            </div>
                          ))}
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
        <div className="flex flex-wrap justify-center items-center gap-3 md:gap-5 mt-[5px] z-10 relative">
          {modulesList.map((mod) => (
            <div key={mod.id} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: mod.color }}
              />
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                {mod.name.length > 15 ? mod.name.substring(0, 12) + '...' : mod.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};