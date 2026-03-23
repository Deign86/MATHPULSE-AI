import React, { useState, useEffect } from 'react';
import { X, Trophy, Flame, Target, BookOpen, Clock, Award, TrendingUp, Star, Crown, User, BadgeCheck, Loader2 } from 'lucide-react';
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
  currentStreak: number;
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

  const achievementIconMap: Record<string, React.ReactNode> = {
    trophy: <Trophy size={24} className="text-rose-500" />,
    flame: <Flame size={24} className="text-orange-500" />,
    star: <Star size={24} className="text-rose-400" />,
    'book-open': <BookOpen size={24} className="text-sky-600" />,
    'badge-check': <BadgeCheck size={24} className="text-emerald-600" />,
    crown: <Crown size={24} className="text-rose-500" />,
    target: <Target size={24} className="text-rose-500" />,
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-[#f7f9fc] rounded-2xl shadow-2xl border border-[#dde3eb] w-full max-w-2xl max-h-[90vh] overflow-hidden"
        >
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-sky-600 to-sky-500 p-8 text-white relative overflow-hidden">
            <div className="accent-line absolute top-0 left-0 right-0"></div>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-xl transition-colors z-10"
            >
              <X size={20} />
            </button>

            <div className="relative z-10">
              <div className="flex items-start gap-6">
                <div className="relative">
                  <div className="w-24 h-24 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center text-6xl border border-slate-300">
                    {student.avatar}
                  </div>
                  {student.isOnline && (
                    <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-4 border-white"></div>
                  )}
                </div>

                <div className="flex-1">
                  <h2 className="text-3xl font-display font-bold mb-2">{student.name}</h2>
                  <p className="text-slate-500 mb-4">{student.section}</p>

                  <div className="flex items-center gap-4">
                    <div className="bg-slate-100 backdrop-blur-sm rounded-xl px-4 py-2 border border-slate-200">
                      <p className="text-xs text-slate-500">Level</p>
                      <p className="text-xl font-bold">{student.level}</p>
                    </div>
                    <div className="bg-slate-100 backdrop-blur-sm rounded-xl px-4 py-2 border border-slate-200">
                      <p className="text-xs text-slate-500">Total XP</p>
                      <p className="text-xl font-bold">{student.totalXP}</p>
                    </div>
                    <div className="bg-slate-100 backdrop-blur-sm rounded-xl px-4 py-2 border border-slate-200">
                      <p className="text-xs text-slate-500">Streak</p>
                      <p className="text-xl font-bold flex items-center gap-1">
                        <Flame size={16} className="text-orange-300" />
                        {student.currentStreak}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-rose-500/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-320px)]">
            {/* Stats Grid */}
            <div className="mb-6">
              <h3 className="font-display font-bold text-lg text-[#0a1628] mb-4">Performance Stats</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-[#dde3eb] p-4 text-center">
                  <BookOpen size={24} className="text-sky-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-[#0a1628]">{student.stats.quizzesCompleted}</p>
                  <p className="text-xs text-slate-500 mt-1 font-body">Quizzes</p>
                </div>
                <div className="bg-white rounded-xl border border-[#dde3eb] p-4 text-center">
                  <Target size={24} className="text-emerald-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-[#0a1628]">{student.stats.averageScore}%</p>
                  <p className="text-xs text-slate-500 mt-1 font-body">Avg Score</p>
                </div>
                <div className="bg-white rounded-xl border border-[#dde3eb] p-4 text-center">
                  <Award size={24} className="text-rose-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-[#0a1628]">{student.stats.modulesCompleted}</p>
                  <p className="text-xs text-slate-500 mt-1 font-body">Modules</p>
                </div>
                <div className="bg-white rounded-xl border border-[#dde3eb] p-4 text-center">
                  <Clock size={24} className="text-rose-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-[#0a1628]">{student.stats.studyHours}</p>
                  <p className="text-xs text-slate-500 mt-1 font-body">Hours</p>
                </div>
              </div>
            </div>

            {/* Rankings */}
            <div className="mb-6">
              <h3 className="font-display font-bold text-lg text-[#0a1628] mb-4">Rankings</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                  <Trophy size={20} className="text-rose-600 mb-2" />
                  <p className="text-2xl font-bold text-rose-900">#{student.rank.global}</p>
                  <p className="text-xs text-rose-700 mt-1 font-body">School</p>
                </div>
                <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
                  <Trophy size={20} className="text-sky-600 mb-2" />
                  <p className="text-2xl font-bold text-sky-900">#{student.rank.section}</p>
                  <p className="text-xs text-sky-700 mt-1 font-body">Section</p>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                  <Trophy size={20} className="text-rose-600 mb-2" />
                  <p className="text-2xl font-bold text-rose-900">
                    {student.rank.change > 0 ? (
                      <span className="flex items-center gap-1 text-emerald-600">
                        <TrendingUp size={20} />
                        +{student.rank.change}
                      </span>
                    ) : student.rank.change < 0 ? (
                      <span className="flex items-center gap-1 text-red-600">
                        <TrendingUp size={20} className="rotate-180" />
                        {student.rank.change}
                      </span>
                    ) : (
                      '0'
                    )}
                  </p>
                  <p className="text-xs text-rose-700 mt-1 font-body">This Week</p>
                </div>
              </div>
            </div>

            {/* Achievements */}
            <div className="mb-6">
              <h3 className="font-display font-bold text-lg text-[#0a1628] mb-4">Achievements</h3>
              {achievementsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={24} className="text-sky-500 animate-spin" />
                </div>
              ) : achievements.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {achievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className="rounded-xl p-4 text-center transition-all bg-white border-2 border-sky-200"
                    >
                      <div className="text-3xl mb-2">{achievementIconMap[achievement.icon] || <Award size={24} className="text-slate-500 mx-auto" />}</div>
                      <p className="font-bold text-xs text-[#0a1628] mb-1 font-body">{achievement.title}</p>
                      <p className="text-xs text-[#5a6578]">{achievement.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-8 gap-2">
                  <Award size={32} className="text-[#d1cec6]" />
                  <p className="text-sm text-[#5a6578] font-body">No achievements unlocked yet</p>
                </div>
              )}
            </div>

            {/* Recent Activity — loaded from quiz history when available */}
            <div>
              <h3 className="font-display font-bold text-lg text-[#0a1628] mb-4">Recent Activity</h3>
              <div className="flex flex-col items-center py-8 gap-2">
                <BookOpen size={32} className="text-[#d1cec6]" />
                <p className="text-sm text-[#5a6578] font-body">Activity history coming soon</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default StudentProfileModal;