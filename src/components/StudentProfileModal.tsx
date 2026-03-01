import React from 'react';
import { X, Trophy, Flame, Target, BookOpen, Clock, Award, TrendingUp, UserPlus, UserCheck, Swords, Star, Crown, User, BadgeCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';

interface StudentData {
  avatar: string;
  isOnline: boolean;
  name: string;
  section: string;
  level: number;
  totalXP: number;
  currentStreak: number;
  isFriend: boolean;
  rank: { global: number; section: number; friends: number; change: number };
  stats: { quizzesCompleted: number; averageScore: number; modulesCompleted: number; studyHours: number };
}

interface StudentProfileModalProps {
  student: StudentData | null;
  onClose: () => void;
}

const StudentProfileModal: React.FC<StudentProfileModalProps> = ({ student, onClose }) => {
  if (!student) return null;

  const achievementIconMap: Record<string, React.ReactNode> = {
    trophy: <Trophy size={24} className="text-amber-500" />,
    flame: <Flame size={24} className="text-orange-500" />,
    star: <Star size={24} className="text-amber-400" />,
    'book-open': <BookOpen size={24} className="text-sky-600" />,
    'badge-check': <BadgeCheck size={24} className="text-emerald-600" />,
    crown: <Crown size={24} className="text-amber-500" />,
    target: <Target size={24} className="text-rose-500" />,
  };

  const achievements = [
    { id: 1, icon: 'trophy', title: 'Math Champion', description: 'Completed 50 quizzes', unlocked: true },
    { id: 2, icon: 'flame', title: 'Streak Master', description: '30-day streak', unlocked: true },
    { id: 3, icon: 'star', title: 'Perfect Score', description: 'Got 100% on a quiz', unlocked: true },
    { id: 4, icon: 'book-open', title: 'Knowledge Seeker', description: 'Completed 10 modules', unlocked: true },
    { id: 5, icon: 'badge-check', title: 'Excellence', description: 'Avg score above 90%', unlocked: false },
    { id: 6, icon: 'crown', title: 'Top 10', description: 'Ranked in top 10', unlocked: false },
  ];

  const recentActivity = [
    { action: 'Completed "Advanced Calculus" quiz', score: 95, time: '2 hours ago' },
    { action: 'Achieved 30-day streak milestone', score: null, time: '1 day ago' },
    { action: 'Completed "Functions" module', score: 88, time: '3 days ago' },
  ];

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

              {/* Action buttons */}
              <div className="flex items-center gap-2 mt-6">
                {student.isFriend ? (
                  <Button className="bg-white/[0.08] hover:bg-slate-200/70 text-white rounded-xl backdrop-blur-sm border border-slate-300">
                    <UserCheck size={16} className="mr-2" />
                    Friends
                  </Button>
                ) : (
                  <Button className="bg-sky-600 text-white hover:bg-sky-700 rounded-xl">
                    <UserPlus size={16} className="mr-2" />
                    Add Friend
                  </Button>
                )}
                <Button className="bg-white/[0.08] hover:bg-slate-200/70 text-white rounded-xl backdrop-blur-sm border border-slate-300">
                  <Swords size={16} className="mr-2" />
                  Challenge
                </Button>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
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
                  <Award size={24} className="text-amber-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-[#0a1628]">{student.stats.modulesCompleted}</p>
                  <p className="text-xs text-slate-500 mt-1 font-body">Modules</p>
                </div>
                <div className="bg-white rounded-xl border border-[#dde3eb] p-4 text-center">
                  <Clock size={24} className="text-amber-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-[#0a1628]">{student.stats.studyHours}</p>
                  <p className="text-xs text-slate-500 mt-1 font-body">Hours</p>
                </div>
              </div>
            </div>

            {/* Rankings */}
            <div className="mb-6">
              <h3 className="font-display font-bold text-lg text-[#0a1628] mb-4">Rankings</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <Trophy size={20} className="text-amber-600 mb-2" />
                  <p className="text-2xl font-bold text-amber-900">#{student.rank.global}</p>
                  <p className="text-xs text-amber-700 mt-1 font-body">School</p>
                </div>
                <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
                  <Trophy size={20} className="text-sky-600 mb-2" />
                  <p className="text-2xl font-bold text-sky-900">#{student.rank.section}</p>
                  <p className="text-xs text-sky-700 mt-1 font-body">Section</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <Trophy size={20} className="text-amber-600 mb-2" />
                  <p className="text-2xl font-bold text-amber-900">
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
                  <p className="text-xs text-amber-700 mt-1 font-body">This Week</p>
                </div>
              </div>
            </div>

            {/* Achievements */}
            <div className="mb-6">
              <h3 className="font-display font-bold text-lg text-[#0a1628] mb-4">Achievements</h3>
              <div className="grid grid-cols-3 gap-3">
                {achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className={`rounded-xl p-4 text-center transition-all ${
                      achievement.unlocked
                        ? 'bg-white border-2 border-sky-200'
                        : 'bg-[#edf1f7] opacity-50'
                    }`}
                  >
                    <div className="text-3xl mb-2">{achievementIconMap[achievement.icon] || <Award size={24} className="text-slate-500" />}</div>
                    <p className="font-bold text-xs text-[#0a1628] mb-1 font-body">{achievement.title}</p>
                    <p className="text-xs text-[#5a6578]">{achievement.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h3 className="font-display font-bold text-lg text-[#0a1628] mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {recentActivity.map((activity, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-[#dde3eb]">
                    <div className="w-10 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      {activity.score ? (
                        <Target size={18} className="text-sky-600" />
                      ) : (
                        <Flame size={18} className="text-orange-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-[#0a1628] font-body">{activity.action}</p>
                      <p className="text-xs text-slate-500">{activity.time}</p>
                    </div>
                    {activity.score && (
                      <div className="px-3 py-1 bg-emerald-500/10 text-emerald-700 rounded-lg font-bold text-sm">
                        {activity.score}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default StudentProfileModal;