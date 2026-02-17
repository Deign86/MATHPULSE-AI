import React from 'react';
import { X, Trophy, Flame, Target, BookOpen, Clock, Award, TrendingUp, UserPlus, UserCheck, Swords } from 'lucide-react';
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

  const achievements = [
    { id: 1, icon: '🏆', title: 'Math Champion', description: 'Completed 50 quizzes', unlocked: true },
    { id: 2, icon: '🔥', title: 'Streak Master', description: '30-day streak', unlocked: true },
    { id: 3, icon: '⭐', title: 'Perfect Score', description: 'Got 100% on a quiz', unlocked: true },
    { id: 4, icon: '📚', title: 'Knowledge Seeker', description: 'Completed 10 modules', unlocked: true },
    { id: 5, icon: '💯', title: 'Excellence', description: 'Avg score above 90%', unlocked: false },
    { id: 6, icon: '👑', title: 'Top 10', description: 'Ranked in top 10', unlocked: false },
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
          className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        >
          {/* Header with gradient */}
          <div className="bg-gradient-to-br from-blue-600 via-cyan-500 to-cyan-600 p-8 text-white relative overflow-hidden">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-xl transition-colors z-10"
            >
              <X size={20} />
            </button>

            <div className="relative z-10">
              <div className="flex items-start gap-6">
                <div className="relative">
                  <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-6xl">
                    {student.avatar}
                  </div>
                  {student.isOnline && (
                    <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-4 border-white"></div>
                  )}
                </div>

                <div className="flex-1">
                  <h2 className="text-3xl font-bold mb-2">{student.name}</h2>
                  <p className="text-cyan-100 mb-4">{student.section}</p>

                  <div className="flex items-center gap-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                      <p className="text-xs text-cyan-100">Level</p>
                      <p className="text-xl font-bold">{student.level}</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                      <p className="text-xs text-cyan-100">Total XP</p>
                      <p className="text-xl font-bold">{student.totalXP}</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                      <p className="text-xs text-cyan-100">Streak</p>
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
                  <Button className="bg-white/20 hover:bg-white/30 text-white rounded-xl backdrop-blur-sm">
                    <UserCheck size={16} className="mr-2" />
                    Friends
                  </Button>
                ) : (
                  <Button className="bg-white text-blue-600 hover:bg-white/90 rounded-xl">
                    <UserPlus size={16} className="mr-2" />
                    Add Friend
                  </Button>
                )}
                <Button className="bg-white/20 hover:bg-white/30 text-white rounded-xl backdrop-blur-sm">
                  <Swords size={16} className="mr-2" />
                  Challenge
                </Button>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-320px)]">
            {/* Stats Grid */}
            <div className="mb-6">
              <h3 className="font-bold text-lg text-slate-800 mb-4">Performance Stats</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-slate-50 rounded-2xl p-4 text-center">
                  <BookOpen size={24} className="text-indigo-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-slate-900">{student.stats.quizzesCompleted}</p>
                  <p className="text-xs text-slate-500 mt-1">Quizzes</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 text-center">
                  <Target size={24} className="text-teal-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-slate-900">{student.stats.averageScore}%</p>
                  <p className="text-xs text-slate-500 mt-1">Avg Score</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 text-center">
                  <Award size={24} className="text-purple-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-slate-900">{student.stats.modulesCompleted}</p>
                  <p className="text-xs text-slate-500 mt-1">Modules</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 text-center">
                  <Clock size={24} className="text-orange-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-slate-900">{student.stats.studyHours}</p>
                  <p className="text-xs text-slate-500 mt-1">Hours</p>
                </div>
              </div>
            </div>

            {/* Rankings */}
            <div className="mb-6">
              <h3 className="font-bold text-lg text-slate-800 mb-4">Rankings</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
                  <Trophy size={20} className="text-yellow-600 mb-2" />
                  <p className="text-2xl font-bold text-yellow-900">#{student.rank.global}</p>
                  <p className="text-xs text-yellow-700 mt-1">School</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                  <Trophy size={20} className="text-blue-600 mb-2" />
                  <p className="text-2xl font-bold text-blue-900">#{student.rank.section}</p>
                  <p className="text-xs text-blue-700 mt-1">Section</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
                  <Trophy size={20} className="text-purple-600 mb-2" />
                  <p className="text-2xl font-bold text-purple-900">
                    {student.rank.change > 0 ? (
                      <span className="flex items-center gap-1 text-green-600">
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
                  <p className="text-xs text-purple-700 mt-1">This Week</p>
                </div>
              </div>
            </div>

            {/* Achievements */}
            <div className="mb-6">
              <h3 className="font-bold text-lg text-slate-800 mb-4">Achievements</h3>
              <div className="grid grid-cols-3 gap-3">
                {achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className={`rounded-2xl p-4 text-center transition-all ${
                      achievement.unlocked
                        ? 'bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200'
                        : 'bg-slate-50 opacity-50'
                    }`}
                  >
                    <div className="text-3xl mb-2">{achievement.icon}</div>
                    <p className="font-bold text-xs text-slate-800 mb-1">{achievement.title}</p>
                    <p className="text-xs text-slate-500">{achievement.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h3 className="font-bold text-lg text-slate-800 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {recentActivity.map((activity, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      {activity.score ? (
                        <Target size={18} className="text-indigo-600" />
                      ) : (
                        <Flame size={18} className="text-orange-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800">{activity.action}</p>
                      <p className="text-xs text-slate-500">{activity.time}</p>
                    </div>
                    {activity.score && (
                      <div className="px-3 py-1 bg-green-100 text-green-700 rounded-lg font-bold text-sm">
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