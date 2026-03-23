import React, { useState, useEffect } from 'react';
import { Award, Clock, Target, Zap, Trophy, Filter, TrendingUp, CheckCircle, Lock, Play } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Quiz } from './QuizExperience';
import { useAuth } from '../contexts/AuthContext';
import { getUserProgress } from '../services/progressService';
import { UserProgress } from '../types/models';
import { subjects } from '../data/subjects';

interface PracticeCenterProps {
  onStartQuiz?: (quiz: Quiz) => void;
}

const PracticeCenter: React.FC<PracticeCenterProps> = ({ onStartQuiz }) => {
  const { userProfile } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'practice' | 'challenge' | 'mastery'>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [progress, setProgress] = useState<UserProgress | null>(null);

  useEffect(() => {
    if (!userProfile?.uid) return;
    getUserProgress(userProfile.uid).then(setProgress).catch(console.error);
  }, [userProfile?.uid]);

  // Derive stats from real Firebase data
  const totalQuizzesCompleted = progress?.totalQuizzesCompleted || 0;
  const totalXPEarned = (userProfile as any)?.totalXP || 0;
  const avgScore = progress?.averageScore ? Math.round(progress.averageScore) : 0;

  // Build quizzes from subjects data + merge with progress
  const completedQuizIds = new Set(
    progress?.quizAttempts?.map(a => a.quizId) || []
  );
  const bestScores: Record<string, number> = {};
  if (progress?.quizAttempts) {
    for (const attempt of progress.quizAttempts) {
      if (!bestScores[attempt.quizId] || attempt.score > bestScores[attempt.quizId]) {
        bestScores[attempt.quizId] = attempt.score;
      }
    }
  }

  const quizzes: Quiz[] = subjects.flatMap((subject) =>
    subject.modules.flatMap((mod) =>
      mod.quizzes.map((q) => ({
        id: q.id,
        title: q.title,
        subject: subject.title,
        difficulty: (q.type === 'module' ? 'Medium' : 'Easy') as 'Easy' | 'Medium' | 'Hard',
        questions: q.questions,
        duration: q.duration,
        xpReward: q.questions * 5,
        type: (q.type === 'module' ? 'challenge' : 'practice') as Quiz['type'],
        completed: completedQuizIds.has(q.id),
        bestScore: bestScores[q.id],
        locked: q.locked,
      }))
    )
  );

  const filteredQuizzes = quizzes.filter(quiz => {
    const typeMatch = selectedFilter === 'all' || quiz.type === selectedFilter;
    const subjectMatch = selectedSubject === 'all' || quiz.subject === selectedSubject;
    return typeMatch && subjectMatch;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'practice':
        return {
          bg: 'bg-sky-50',
          text: 'text-sky-700',
          border: 'border-sky-200',
          accent: 'bg-sky-500'
        };
      case 'challenge':
        return {
          bg: 'bg-orange-50',
          text: 'text-orange-700',
          border: 'border-orange-200',
          accent: 'bg-orange-500'
        };
      case 'mastery':
        return {
          bg: 'bg-sky-50',
          text: 'text-sky-700',
          border: 'border-sky-200',
          accent: 'bg-sky-500'
        };
      default:
        return {
          bg: 'bg-[#edf1f7]',
          text: 'text-[#0a1628]',
          border: 'border-[#dde3eb]',
          accent: 'bg-[#5a6578]'
        };
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-green-100 text-green-700';
      case 'Medium':
        return 'bg-rose-100 text-rose-700';
      case 'Hard':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-[#edf1f7] text-[#0a1628]';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0a1628] mb-2">Practice Center</h1>
        <p className="text-[#5a6578]">Sharpen your skills with quizzes, challenges, and mastery tests</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-sky-700 to-sky-500 rounded-2xl p-5 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Award size={24} />
            </div>
            <span className="text-3xl font-bold">{totalQuizzesCompleted}</span>
          </div>
          <p className="text-sm font-medium text-sky-100">Quizzes Completed</p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl p-5 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Zap size={24} />
            </div>
            <span className="text-3xl font-bold">{totalXPEarned.toLocaleString()}</span>
          </div>
          <p className="text-sm font-medium text-cyan-100">Total XP Earned</p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Target size={24} />
            </div>
            <span className="text-3xl font-bold">{avgScore}%</span>
          </div>
          <p className="text-sm font-medium text-sky-100">Average Score</p>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2 bg-white rounded-xl p-1 shadow-sm">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              selectedFilter === 'all'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-[#5a6578] hover:bg-[#edf1f7]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSelectedFilter('practice')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              selectedFilter === 'practice'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-[#5a6578] hover:bg-[#edf1f7]'
            }`}
          >
            Practice
          </button>
          <button
            onClick={() => setSelectedFilter('challenge')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              selectedFilter === 'challenge'
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-[#5a6578] hover:bg-[#edf1f7]'
            }`}
          >
            Challenge
          </button>
          <button
            onClick={() => setSelectedFilter('mastery')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              selectedFilter === 'mastery'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-[#5a6578] hover:bg-[#edf1f7]'
            }`}
          >
            Mastery
          </button>
        </div>

        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="px-4 py-2.5 bg-white border-2 border-[#dde3eb] rounded-xl text-sm font-bold text-[#0a1628] focus:border-indigo-600 focus:outline-none"
        >
          <option value="all">All Subjects</option>
          <option value="General Mathematics">General Mathematics</option>
          <option value="Pre-Calculus">Pre-Calculus</option>
          <option value="Statistics and Probability">Statistics and Probability</option>
          <option value="Basic Calculus">Basic Calculus</option>
        </select>
      </div>

      {/* Quizzes Grid */}
      <div className="flex-1 overflow-y-auto pr-2 pb-4 scrollbar-hide">
        <div className="grid grid-cols-2 gap-4">
          {filteredQuizzes.map((quiz, index) => {
            const colors = getTypeColor(quiz.type);
            
            return (
              <motion.div
                key={quiz.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`${colors.bg} rounded-2xl p-5 border ${colors.border} shadow-sm hover:shadow-lg transition-all ${
                  quiz.locked ? 'opacity-60' : 'cursor-pointer hover:scale-[1.02]'
                }`}
                onClick={() => !quiz.locked && onStartQuiz?.(quiz)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`px-3 py-1 rounded-lg text-xs font-bold ${colors.text} ${colors.bg} brightness-95 capitalize`}>
                    {quiz.type}
                  </div>
                  {quiz.locked ? (
                    <Lock size={18} className="text-slate-500" />
                  ) : quiz.completed ? (
                    <CheckCircle size={18} className="text-teal-600" />
                  ) : (
                    <Play size={18} className={colors.text} />
                  )}
                </div>

                {/* Title */}
                <h3 className="font-bold text-[#0a1628] mb-2">{quiz.title}</h3>
                <p className="text-xs text-[#5a6578] mb-4">{quiz.subject}</p>

                {/* Stats */}
                <div className="flex items-center gap-4 mb-4 text-xs text-[#5a6578]">
                  <div className="flex items-center gap-1">
                    <Award size={14} />
                    <span>{quiz.questions} questions</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    <span>{quiz.duration}</span>
                  </div>
                </div>

                {/* Bottom */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-lg text-xs font-bold ${getDifficultyColor(quiz.difficulty)}`}>
                      {quiz.difficulty}
                    </span>
                    {quiz.bestScore && (
                      <span className="px-2 py-1 rounded-lg text-xs font-bold bg-teal-100 text-teal-700">
                        Best: {quiz.bestScore}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-rose-600 font-bold text-sm">
                    <Trophy size={14} />
                    <span>+{quiz.xpReward} XP</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {filteredQuizzes.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <Target size={48} className="mb-3" />
            <p className="font-medium">No quizzes found</p>
            <p className="text-sm">Try adjusting your filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PracticeCenter;