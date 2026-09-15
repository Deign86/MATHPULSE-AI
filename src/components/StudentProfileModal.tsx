import React, { useState, useEffect } from 'react';
import { recordGet } from '../utils/memberOf';
import { X, Trophy, Flame, Target, BookOpen, Clock, Award, TrendingUp, Star, Crown, BadgeCheck, Loader2, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getUserAchievements } from '../services/gamificationService';
import { Achievement } from '../types/models';

interface StudentData {
  uid?: string;
  avatar: string;
  isOnline: boolean;
  name: string;
  section: string;
  level: number;
  totalXP: number;
  rank: { global: number; section: number; change: number };
  stats: { quizzesCompleted: number; averageScore: number; modulesCompleted: number; studyHours: number };
}

interface StudentProfileModalProps {
  student: StudentData | null;
  onClose: () => void;
}

const StudentProfileModal: React.FC<StudentProfileModalProps> = ({ student, onClose }) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [achievementsLoading, setAchievementsLoading] = useState(false);

  useEffect(() => {
    if (!student?.uid) return;
    setAchievementsLoading(true);
    getUserAchievements(student.uid)
      .then(setAchievements)
      .catch(err => console.error('Failed to load achievements:', err))
      .finally(() => setAchievementsLoading(false));
  }, [student?.uid]);

  if (!student) return null;

  const achievementIconMap = {
    trophy: <Trophy size={24} className="text-amber-500" />,
    flame: <Flame size={24} className="text-orange-500" />,
    star: <Star size={24} className="text-yellow-400" />,
    'book-open': <BookOpen size={24} className="text-purple-600" />,
    'badge-check': <BadgeCheck size={24} className="text-emerald-600" />,
    crown: <Crown size={24} className="text-amber-500" />,
    target: <Target size={24} className="text-rose-500" />,
  };

  const renderModalAvatar = (avatar: string | undefined) => {
    if (!avatar) return <User size={44} className="text-white/80" />;
    if (avatar.startsWith('http') || avatar.startsWith('data:')) {
      return <img src={avatar} alt={student.name} className="w-full h-full object-cover" />;
    }
    if (avatar.length <= 4) {
      return <span className="text-4xl">{avatar}</span>;
    }
    return <User size={44} className="text-white/80" />;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative my-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-white/80 dark:border-slate-800 w-full max-w-2xl max-h-[90dvh] overflow-hidden flex flex-col"
        >
          {/* Header with vibrant purple/indigo gradient */}
          <div className="bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 p-5 sm:p-8 text-white relative overflow-hidden shrink-0">
            <button
              onClick={onClose}
              aria-label="Close profile modal"
              className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 bg-black/20 hover:bg-black/30 text-white rounded-xl transition-colors z-10 cursor-pointer shadow-xs"
            >
              <X size={18} />
            </button>

            <div className="relative z-10">
              <div className="flex flex-col xs:flex-row items-center xs:items-start text-center xs:text-left gap-4 sm:gap-5">
                {/* Avatar with clean image renderer (fixes raw URL string bug) */}
                <div className="relative shrink-0">
                  <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center overflow-hidden border-2 border-white/40 shadow-lg">
                    {renderModalAvatar(student.avatar)}
                  </div>
                  {student.isOnline && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-emerald-500 rounded-full border-2 border-white shadow-sm" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="text-xl sm:text-3xl font-display font-black text-white mb-1 truncate">
                    {student.name}
                  </h2>
                  <p className="text-purple-100 text-xs sm:text-sm font-medium mb-2.5 truncate">
                    {student.section}
                  </p>

                  <div className="flex items-center justify-center xs:justify-start gap-2.5 sm:gap-3">
                    <div className="bg-white/15 backdrop-blur-md rounded-xl px-3 py-1 sm:px-3.5 sm:py-1.5 border border-white/25">
                      <p className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-purple-200">Level</p>
                      <p className="text-sm sm:text-lg font-black text-white tabular-nums">{student.level}</p>
                    </div>
                    <div className="bg-white/15 backdrop-blur-md rounded-xl px-3 py-1 sm:px-3.5 sm:py-1.5 border border-white/25">
                      <p className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-purple-200">Total XP</p>
                      <p className="text-sm sm:text-lg font-black text-white tabular-nums">{student.totalXP.toLocaleString()} XP</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative background blurs */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-400/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl pointer-events-none" />
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 max-h-[calc(90dvh-240px)] space-y-5 sm:space-y-6">
            {/* Stats Grid */}
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-white mb-3">
                Performance Stats
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-700/80 p-3.5 text-center shadow-xs">
                  <BookOpen size={20} className="text-purple-600 dark:text-purple-400 mx-auto mb-1.5" />
                  <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{student.stats.quizzesCompleted}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Quizzes</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-700/80 p-3.5 text-center shadow-xs">
                  <Target size={20} className="text-emerald-600 dark:text-emerald-400 mx-auto mb-1.5" />
                  <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{student.stats.averageScore}%</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Avg Score</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-700/80 p-3.5 text-center shadow-xs">
                  <Award size={20} className="text-fuchsia-600 dark:text-fuchsia-400 mx-auto mb-1.5" />
                  <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{student.stats.modulesCompleted}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Modules</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-700/80 p-3.5 text-center shadow-xs">
                  <Clock size={20} className="text-amber-600 dark:text-amber-400 mx-auto mb-1.5" />
                  <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{student.stats.studyHours}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Hours</p>
                </div>
              </div>
            </div>

            {/* Rankings */}
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-white mb-3">
                Rankings
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 rounded-2xl p-3.5 shadow-xs">
                  <Trophy size={18} className="text-purple-600 dark:text-purple-400 mb-1.5" />
                  <p className="text-xl font-bold text-purple-950 dark:text-purple-200 tabular-nums">#{student.rank.global}</p>
                  <p className="text-[11px] text-purple-700 dark:text-purple-300 mt-0.5">School</p>
                </div>
                <div className="bg-fuchsia-50 dark:bg-fuchsia-950/40 border border-fuchsia-200/80 dark:border-fuchsia-800/60 rounded-2xl p-3.5 shadow-xs">
                  <Trophy size={18} className="text-fuchsia-600 dark:text-fuchsia-400 mb-1.5" />
                  <p className="text-xl font-bold text-fuchsia-950 dark:text-fuchsia-200 tabular-nums">#{student.rank.section}</p>
                  <p className="text-[11px] text-fuchsia-700 dark:text-fuchsia-300 mt-0.5">Section</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-2xl p-3.5 shadow-xs">
                  <Trophy size={18} className="text-amber-600 dark:text-amber-400 mb-1.5" />
                  <p className="text-xl font-bold text-amber-950 dark:text-amber-200 tabular-nums">
                    {student.rank.change > 0 ? (
                      <span className="flex items-center gap-1 text-emerald-600 tabular-nums">
                        <TrendingUp size={18} />
                        +{student.rank.change}
                      </span>
                    ) : student.rank.change < 0 ? (
                      <span className="flex items-center gap-1 text-rose-600 tabular-nums">
                        <TrendingUp size={18} className="rotate-180" />
                        {student.rank.change}
                      </span>
                    ) : (
                      '0'
                    )}
                  </p>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">This Week</p>
                </div>
              </div>
            </div>

            {/* Achievements */}
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-white mb-3">
                Achievements
              </h3>
              {achievementsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 size={22} className="text-purple-600 animate-spin" />
                </div>
              ) : achievements.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {achievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className="rounded-2xl p-3.5 text-center bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/80 shadow-xs"
                    >
                      <div className="text-2xl mb-1.5">{recordGet(achievementIconMap, achievement.icon) ?? <Award size={22} className="text-slate-500 mx-auto" />}</div>
                      <p className="font-bold text-xs text-slate-900 dark:text-white mb-0.5">{achievement.title}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2">{achievement.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-6 gap-1.5 text-center">
                  <Award size={28} className="text-slate-300 dark:text-slate-600" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">No achievements unlocked yet</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default StudentProfileModal;