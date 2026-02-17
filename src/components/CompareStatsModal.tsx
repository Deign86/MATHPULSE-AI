import React from 'react';
import { X, Trophy, Target, BookOpen, Flame, Clock, Award, TrendingUp, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CompareStatsModalProps {
  student: any;
  onClose: () => void;
}

const CompareStatsModal: React.FC<CompareStatsModalProps> = ({ student, onClose }) => {
  if (!student) return null;

  // Mock "you" data
  const you = {
    name: 'Alex Johnson',
    avatar: '🧑',
    level: 12,
    totalXP: 1250,
    currentStreak: 15,
    stats: {
      quizzesCompleted: 24,
      averageScore: 87,
      modulesCompleted: 8,
      studyHours: 45,
    }
  };

  const comparisons = [
    {
      category: 'Total XP',
      icon: Trophy,
      yourValue: you.totalXP,
      theirValue: student.totalXP,
      format: (val: number) => val.toString(),
      color: 'indigo'
    },
    {
      category: 'Level',
      icon: Award,
      yourValue: you.level,
      theirValue: student.level,
      format: (val: number) => val.toString(),
      color: 'purple'
    },
    {
      category: 'Current Streak',
      icon: Flame,
      yourValue: you.currentStreak,
      theirValue: student.currentStreak,
      format: (val: number) => `${val} days`,
      color: 'orange'
    },
    {
      category: 'Quizzes Completed',
      icon: BookOpen,
      yourValue: you.stats.quizzesCompleted,
      theirValue: student.stats.quizzesCompleted,
      format: (val: number) => val.toString(),
      color: 'teal'
    },
    {
      category: 'Average Score',
      icon: Target,
      yourValue: you.stats.averageScore,
      theirValue: student.stats.averageScore,
      format: (val: number) => `${val}%`,
      color: 'green'
    },
    {
      category: 'Study Hours',
      icon: Clock,
      yourValue: you.stats.studyHours,
      theirValue: student.stats.studyHours,
      format: (val: number) => `${val}h`,
      color: 'blue'
    },
  ];

  const getWinner = (yourVal: number, theirVal: number) => {
    if (yourVal > theirVal) return 'you';
    if (theirVal > yourVal) return 'them';
    return 'tie';
  };

  const yourWins = comparisons.filter(c => getWinner(c.yourValue, c.theirValue) === 'you').length;
  const theirWins = comparisons.filter(c => getWinner(c.yourValue, c.theirValue) === 'them').length;

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
          className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white relative overflow-hidden">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-xl transition-colors z-10"
            >
              <X size={20} />
            </button>

            <div className="relative z-10">
              <h2 className="text-2xl font-bold mb-6">Head-to-Head Comparison</h2>

              <div className="flex items-center justify-between">
                {/* You */}
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-4xl mb-3">
                    {you.avatar}
                  </div>
                  <h3 className="font-bold text-lg">{you.name}</h3>
                  <p className="text-sm text-purple-100">Level {you.level}</p>
                  <div className="mt-3 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                    <p className="text-sm text-purple-100">Wins</p>
                    <p className="text-2xl font-bold">{yourWins}</p>
                  </div>
                </div>

                {/* VS */}
                <div className="text-4xl font-bold text-white/50">VS</div>

                {/* Them */}
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-4xl mb-3">
                    {student.avatar}
                  </div>
                  <h3 className="font-bold text-lg">{student.name}</h3>
                  <p className="text-sm text-purple-100">Level {student.level}</p>
                  <div className="mt-3 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                    <p className="text-sm text-purple-100">Wins</p>
                    <p className="text-2xl font-bold">{theirWins}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          </div>

          {/* Comparisons */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-300px)]">
            <div className="space-y-4">
              {comparisons.map((comparison, idx) => {
                const Icon = comparison.icon;
                const winner = getWinner(comparison.yourValue, comparison.theirValue);
                const difference = Math.abs(comparison.yourValue - comparison.theirValue);
                const percentDiff = comparison.theirValue > 0 
                  ? Math.round((difference / comparison.theirValue) * 100) 
                  : 0;

                return (
                  <motion.div
                    key={comparison.category}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-slate-50 rounded-2xl p-5"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 bg-${comparison.color}-100 rounded-xl flex items-center justify-center`}>
                        <Icon size={20} className={`text-${comparison.color}-600`} />
                      </div>
                      <h4 className="font-bold text-slate-800">{comparison.category}</h4>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Your stats */}
                      <div className={`flex-1 rounded-xl p-4 transition-all ${
                        winner === 'you' 
                          ? 'bg-green-50 border-2 border-green-300' 
                          : 'bg-white border-2 border-slate-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-slate-500 mb-1">You</p>
                            <p className="text-2xl font-bold text-slate-900">
                              {comparison.format(comparison.yourValue)}
                            </p>
                          </div>
                          {winner === 'you' && (
                            <div className="flex flex-col items-center">
                              <Trophy size={24} className="text-green-600 mb-1" />
                              <span className="text-xs font-bold text-green-600">
                                +{percentDiff}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Their stats */}
                      <div className={`flex-1 rounded-xl p-4 transition-all ${
                        winner === 'them' 
                          ? 'bg-red-50 border-2 border-red-300' 
                          : 'bg-white border-2 border-slate-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-slate-500 mb-1">{student.name.split(' ')[0]}</p>
                            <p className="text-2xl font-bold text-slate-900">
                              {comparison.format(comparison.theirValue)}
                            </p>
                          </div>
                          {winner === 'them' && (
                            <div className="flex flex-col items-center">
                              <Trophy size={24} className="text-red-600 mb-1" />
                              <span className="text-xs font-bold text-red-600">
                                +{percentDiff}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${
                          winner === 'you' ? 'bg-green-500' : winner === 'them' ? 'bg-red-500' : 'bg-slate-400'
                        }`}
                        style={{ 
                          width: `${(comparison.yourValue / (comparison.yourValue + comparison.theirValue)) * 100}%` 
                        }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Overall verdict */}
            <div className="mt-6 p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border-2 border-indigo-200">
              <div className="text-center">
                {yourWins > theirWins ? (
                  <>
                    <div className="text-4xl mb-3">🎉</div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">You're Ahead!</h3>
                    <p className="text-sm text-slate-600">
                      Keep up the great work! You're winning in {yourWins} out of {comparisons.length} categories.
                    </p>
                  </>
                ) : theirWins > yourWins ? (
                  <>
                    <div className="text-4xl mb-3">💪</div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Room to Grow!</h3>
                    <p className="text-sm text-slate-600">
                      {student.name.split(' ')[0]} is ahead in {theirWins} categories. Time to level up!
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-4xl mb-3">🤝</div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Evenly Matched!</h3>
                    <p className="text-sm text-slate-600">
                      You and {student.name.split(' ')[0]} are neck and neck. Great competition!
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CompareStatsModal;
