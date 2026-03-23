import React, { useEffect, useState } from 'react';
import { BookOpen, Trophy, Clock, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { getUserProgress } from '../services/progressService';
import { UserProgress } from '../types/models';

const QuickStatsWidget = () => {
  const { userProfile } = useAuth();
  const [progress, setProgress] = useState<UserProgress | null>(null);

  useEffect(() => {
    if (!userProfile?.uid) return;
    getUserProgress(userProfile.uid).then(setProgress).catch(console.error);
  }, [userProfile?.uid]);

  // Derive stats from real progress data
  const quizzesThisWeek = (() => {
    if (!progress?.quizAttempts) return 0;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return progress.quizAttempts.filter(q => {
      const d = q.completedAt instanceof Date ? q.completedAt : new Date(q.completedAt);
      return d >= weekAgo;
    }).length;
  })();

  const studyHours = (() => {
    if (!progress?.lessons) return 0;
    const totalSeconds = Object.values(progress.lessons).reduce((sum, l) => sum + (l.timeSpent || 0), 0);
    return Math.round((totalSeconds / 3600) * 10) / 10; // 1 decimal
  })();

  const modulesCompleted = (() => {
    if (!progress?.subjects) return 0;
    return Object.values(progress.subjects).reduce((sum, s) => sum + (s.completedModules || 0), 0);
  })();

  const avgScore = progress?.averageScore ?? 0;

  const stats = [
    { icon: BookOpen, label: 'Quizzes This Week', value: String(quizzesThisWeek), iconBg: 'bg-sky-500/10', iconColor: 'text-sky-500', hasData: quizzesThisWeek > 0 },
    { icon: Clock, label: 'Study Hours', value: studyHours > 0 ? `${studyHours}h` : '0', iconBg: 'bg-rose-500/10', iconColor: 'text-rose-500', hasData: studyHours > 0 },
    { icon: Trophy, label: 'Modules Completed', value: String(modulesCompleted), iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500', hasData: modulesCompleted > 0 },
    { icon: TrendingUp, label: 'Avg. Score', value: `${Math.round(avgScore)}%`, iconBg: 'bg-rose-500/10', iconColor: 'text-rose-500', hasData: avgScore > 0 },
  ];

  return (
    <div>
      <h3 className="font-display font-bold text-base text-[#0a1628] mb-2">This Week's Progress</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
              className="bg-white rounded-xl p-2.5 border border-[#dde3eb] card-elevated group cursor-default"
            >
              <div className={`w-7 h-7 ${stat.iconBg} rounded-lg flex items-center justify-center mb-1.5`}>
                <Icon size={14} className={stat.iconColor} />
              </div>
              <p className="text-lg font-display font-bold text-[#0a1628] leading-tight">{stat.value}</p>
              <p className="text-xs text-[#5a6578] font-body">{stat.label}</p>
              {stat.hasData ? (
                <div className="mt-1 flex items-center gap-1">
                  <TrendingUp size={11} className="text-emerald-500" />
                  <span className="text-xs text-emerald-600 font-body font-semibold">Active</span>
                </div>
              ) : (
                <div className="mt-1">
                  <span className="text-xs text-slate-400 font-body">No data yet</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default QuickStatsWidget;
