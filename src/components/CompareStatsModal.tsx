import React from 'react';
import { X, Trophy, Target, BookOpen, Flame, Clock, Award, TrendingUp, TrendingDown, PartyPopper, Dumbbell, Handshake } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CompareStudent {
  name: string;
  avatar: string;
  level: number;
  totalXP: number;
  currentStreak: number;
  stats: { quizzesCompleted: number; averageScore: number; modulesCompleted: number; studyHours: number };
}

interface CompareStatsModalProps {
  student: CompareStudent | null;
  onClose: () => void;
}

const CompareStatsModal: React.FC<CompareStatsModalProps> = ({ student, onClose }) => {
  if (!student) return null;

  // Mock "you" data
  const you = {
    name: 'Alex Johnson',
    avatar: '',
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
      color: 'sky'
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
          className="relative bg-[#f7f9fc] rounded-2xl shadow-2xl border border-[#dde3eb] w-full max-w-3xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-sky-600 to-sky-500 p-6 text-white relative overflow-hidden">
            <div className="accent-line absolute top-0 left-0 right-0"></div>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-xl transition-colors z-10"
            >
              <X size={20} />
            </button>

            <div className="relative z-10">
              <h2 className="text-2xl font-display font-bold mb-6">Head-to-Head Comparison</h2>

              <div className="flex items-center justify-between">
                {/* You */}
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center text-4xl mb-3 border border-slate-300">
                    {you.avatar}
                  </div>
                  <h3 className="font-bold text-lg">{you.name}</h3>
                  <p className="text-sm text-slate-500">Level {you.level}</p>
                  <div className="mt-3 bg-slate-100 backdrop-blur-sm rounded-xl px-4 py-2 border border-slate-200">
                    <p className="text-sm text-slate-500">Wins</p>
                    <p className="text-2xl font-bold">{yourWins}</p>
                  </div>
                </div>

                {/* VS */}
                <div className="text-4xl font-display font-bold text-white/30">VS</div>

                {/* Them */}
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center text-4xl mb-3 border border-slate-300">
                    {student.avatar}
                  </div>
                  <h3 className="font-bold text-lg">{student.name}</h3>
                  <p className="text-sm text-slate-500">Level {student.level}</p>
                  <div className="mt-3 bg-slate-100 backdrop-blur-sm rounded-xl px-4 py-2 border border-slate-200">
                    <p className="text-sm text-slate-500">Wins</p>
                    <p className="text-2xl font-bold">{theirWins}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
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
                    className="bg-white rounded-xl border border-[#dde3eb] p-5"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 bg-${comparison.color}-100 rounded-xl flex items-center justify-center`}>
                        <Icon size={20} className={`text-${comparison.color}-600`} />
                      </div>
                      <h4 className="font-bold text-[#0a1628] font-body">{comparison.category}</h4>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Your stats */}
                      <div className={`flex-1 rounded-xl p-4 transition-all ${
                        winner === 'you' 
                          ? 'bg-emerald-50 border-2 border-emerald-300' 
                          : 'bg-[#f7f9fc] border-2 border-[#dde3eb]'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-slate-500 mb-1 font-body">You</p>
                            <p className="text-2xl font-bold text-[#0a1628]">
                              {comparison.format(comparison.yourValue)}
                            </p>
                          </div>
                          {winner === 'you' && (
                            <div className="flex flex-col items-center">
                              <Trophy size={24} className="text-emerald-600 mb-1" />
                              <span className="text-xs font-bold text-emerald-600">
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
                          : 'bg-[#f7f9fc] border-2 border-[#dde3eb]'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-slate-500 mb-1 font-body">{student.name.split(' ')[0]}</p>
                            <p className="text-2xl font-bold text-[#0a1628]">
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
                    <div className="mt-3 h-2 bg-[#dde3eb] rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${
                          winner === 'you' ? 'bg-emerald-500' : winner === 'them' ? 'bg-red-500' : 'bg-[#a8a5b3]'
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
            <div className="mt-6 p-6 bg-white rounded-xl border-2 border-sky-200">
              <div className="text-center">
                {yourWins > theirWins ? (
                  <>
                    <div className="flex justify-center mb-3"><PartyPopper size={36} className="text-rose-500" /></div>
                    <h3 className="text-xl font-display font-bold text-[#0a1628] mb-2">You're Ahead!</h3>
                    <p className="text-sm text-[#5a6578] font-body">
                      Keep up the great work! You're winning in {yourWins} out of {comparisons.length} categories.
                    </p>
                  </>
                ) : theirWins > yourWins ? (
                  <>
                    <div className="flex justify-center mb-3"><Dumbbell size={36} className="text-sky-500" /></div>
                    <h3 className="text-xl font-display font-bold text-[#0a1628] mb-2">Room to Grow!</h3>
                    <p className="text-sm text-[#5a6578] font-body">
                      {student.name.split(' ')[0]} is ahead in {theirWins} categories. Time to level up!
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex justify-center mb-3"><Handshake size={36} className="text-sky-500" /></div>
                    <h3 className="text-xl font-display font-bold text-[#0a1628] mb-2">Evenly Matched!</h3>
                    <p className="text-sm text-[#5a6578] font-body">
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
