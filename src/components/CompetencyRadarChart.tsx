import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Sparkles, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToUserProgress } from '../services/progressService';
import { subjects } from '../data/subjects';
import type { UserProgress } from '../types/models';

export const CompetencyRadarChart: React.FC = () => {
  const { userProfile } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [modulesList, setModulesList] = useState<{id: string, name: string, color: string}[]>([]);
  const [topModule, setTopModule] = useState<string>('N/A');
  const [loading, setLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // Palette from user request
  const THEME_PALETTE = [
    '#1FA7E1', // Summer Sky
    '#9956DE', // Amethyst
    '#75D06A', // Pastel Green
    '#FFB356', // Texas Rose
    '#7274ED', // Slate Blue
    '#FF8B8B', // Mona Lisa
    '#6ED1CF', // Downy
    '#FB96BB', // Illusion
  ];

  useEffect(() => {
    if (!userProfile?.uid) {
      setLoading(false);
      return;
    }

    // Directly fetch the exact modules the student sees in the Modules page
    const activeSubjectId = 'gen-math';
    const validModules = subjects.find(s => s.id === activeSubjectId)?.modules || [];
    const modsInfo = validModules.map((mod, i) => ({
      id: mod.id,
      name: mod.title.length > 15 ? mod.title.substring(0, 15).trim() + '...' : mod.title,
      color: THEME_PALETTE[i % THEME_PALETTE.length]
    }));
    setModulesList(modsInfo);

    const radarMetrics = [
      { key: 'progress', label: 'Overall Mastery' },
      { key: 'concept', label: 'Concept Grasp' },
      { key: 'application', label: 'Application' },
      { key: 'engagement', label: 'Engagement' },
      { key: 'consistency', label: 'Consistency' },
    ];

    const buildChart = (progress: UserProgress | null) => {
      let highestAvg = -1;
      let bestModName = 'N/A';

      const chartData = radarMetrics.map(metric => {
        const row: any = { metric: metric.label, fullMark: 100 };

        validModules.forEach((mod) => {
          const parentSubject = subjects.find(s => s.modules.some(m => m.id === mod.id));
          const stats = parentSubject ? progress?.subjects?.[parentSubject.id]?.modulesProgress?.[mod.id] : null;

          const prog = stats?.progress || 0;
          // Concept Grasp: use per-lesson progressPercent (partial progress), falling back to completed lessons.
          const lessonProgressMap = progress?.lessons ?? {};
          const lessonsPct = mod.lessons.length
            ? mod.lessons.reduce((sum, lesson) => {
                const pct = lessonProgressMap?.[lesson.id]?.progressPercent;
                if (typeof pct === 'number' && Number.isFinite(pct)) return sum + Math.max(0, Math.min(100, pct));
                const completed = !!stats?.lessonsCompleted?.includes?.(lesson.id);
                return sum + (completed ? 100 : 0);
              }, 0) / mod.lessons.length
            : 0;
          const quizzesPct = mod.quizzes.length ? ((stats?.quizzesCompleted?.length || 0) / mod.quizzes.length) * 100 : 0;

          let score = 0;
          if (metric.key === 'progress') score = prog;
          else if (metric.key === 'concept') score = lessonsPct;
          else if (metric.key === 'application') score = quizzesPct;
          else if (metric.key === 'engagement') score = Math.min(100, (lessonsPct + quizzesPct * 2) / 1.5);
          else if (metric.key === 'consistency') score = Math.min(100, 40 + (prog * 0.6));

          row[mod.id] = score || 0;
        });

        return row;
      });

      validModules.forEach(mod => {
        let total = 0;
        chartData.forEach(row => { total += row[mod.id]; });
        const avg = total / radarMetrics.length;
        if (avg > highestAvg) {
          highestAvg = avg;
          bestModName = modsInfo.find(m => m.id === mod.id)?.name || 'N/A';
        }
      });

      setTopModule(bestModName);
      setData(chartData);
      setLoading(false);
    };

    setLoading(true);
    const unsub = subscribeToUserProgress(userProfile.uid, (progress) => {
      buildChart(progress);
    });
    return () => unsub();
  }, [userProfile?.uid]);

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
        
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 px-4 py-2 rounded-2xl ml-12 sm:ml-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-sm border border-slate-100">
            <Sparkles size={14} className="text-amber-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Top Module</p>
            <p className="text-sm font-bold text-slate-700">
              {topModule}
            </p>
          </div>
        </div>
      </div>

      <div className="h-[300px] sm:h-[360px] w-full relative z-10">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
              <p className="text-sm text-slate-400 font-medium">Analyzing skill vectors...</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius={isHovered ? "75%" : "70%"} data={data}>
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
                  fontFamily: 'Inter, sans-serif'
                }} 
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 100]} 
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                tickCount={6}
                axisLine={false} 
              />
              {modulesList.map((mod, idx) => (
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
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pl.stroke }} />
                                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide truncate max-w-[120px]" title={String(pl.name)}>
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
      
      {/* Legend below the chart to show Which color corresponds to which module */}
      {!loading && modulesList.length > 0 && (
        <div className="flex flex-wrap justify-center items-center gap-3 md:gap-5 mt-[5px] z-10 relative">
          {modulesList.map((mod) => (
            <div key={mod.id} className="flex items-center gap-1.5">
              <div 
                className="w-2.5 h-2.5 rounded-full" 
                style={{ backgroundColor: mod.color }} 
              />
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                {mod.name.length > 15 ? mod.name.substring(0,12) + '...' : mod.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};
