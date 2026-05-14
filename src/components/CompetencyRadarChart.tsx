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
      className="relative overflow-hidden bg-white rounded-[16px] border border-slate-200 shadow-sm p-6 lg:p-8 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Decorative circle */}
      <div className="absolute -right-12 -bottom-12 w-32 h-32 bg-[#9956DE]/5 rounded-full transition-transform duration-500 group-hover:scale-[1.8] group-hover:-translate-y-4 group-hover:-translate-x-4" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 relative z-10 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-[#a855f7] to-[#9333ea] flex items-center justify-center shadow-[0_4px_12px_rgba(168,85,247,0.2)]">
            <Brain size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-slate-900">Competency Matrix</h3>
            <p className="text-[12px] text-slate-500">Realtime performance across modules</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Top Module badge */}
          {!loading && !isEmpty && !error && (
            <div className="flex items-center gap-2 bg-[#f5f3ff] border border-[#e0e7ff] px-3 py-1.5 rounded-full">
              <Sparkles size={12} className="text-amber-500" />
              <span className="text-[11px] font-bold text-[#9956DE] uppercase tracking-wider">{topModule}</span>
            </div>
          )}

          {/* Refresh */}
          {!loading && (
            <button
              onClick={refresh}
              className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-[#f5f3ff] hover:border-[#9956DE]/30 transition-colors shadow-sm"
              title="Refresh"
            >
              <RefreshCw size={13} className="text-slate-400" />
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
            <div className="w-14 h-14 rounded-[16px] bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center border border-slate-200">
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
              <PolarGrid stroke="#e2e8f0" strokeDasharray="4 4" polarRadius={[20, 40, 60, 80, 100]} />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }}
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
                  fillOpacity={0.3}
                  dot={{ r: 3, fill: '#fff', stroke: mod.color, strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: mod.color, stroke: '#fff', strokeWidth: 2 }}
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
                      <div className="bg-white/95 backdrop-blur-[12px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-slate-100 rounded-[12px] p-4">
                        <p className="font-bold text-slate-800 text-[13px] mb-2">
                          {payload[0].payload.metric}
                        </p>
                        <div className="flex flex-col gap-1.5">
                          {payload.map((pl) => (
                            <div key={pl.name} className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pl.stroke }} />
                                <span className="text-[11px] font-semibold text-slate-600 truncate max-w-[120px]">
                                  {String(pl.name)}
                                </span>
                              </div>
                              <span className="text-[13px] font-bold" style={{ color: pl.stroke }}>
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
        <div className="flex flex-wrap justify-center items-center gap-3 mt-4 relative z-10">
          {modulesList.map((mod) => (
            <div key={mod.id} className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: mod.color }} />
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                {mod.name.length > 15 ? mod.name.substring(0, 12) + '...' : mod.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};
