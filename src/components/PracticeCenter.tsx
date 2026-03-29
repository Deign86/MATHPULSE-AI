import React, { useState, useEffect } from 'react';
import { Award, Clock, Target, Zap, Trophy, Filter, TrendingUp, CheckCircle, Lock, Play, BookOpen, PenTool } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Quiz } from './QuizExperience';
import { useAuth } from '../contexts/AuthContext';
import { getUserProgress } from '../services/progressService';
import { UserProgress } from '../types/models';
import { subjects } from '../data/subjects';

interface PracticeCenterProps {
  onStartQuiz?: (quiz: Quiz) => void;
  searchQuery?: string;
}

const PracticeCenter: React.FC<PracticeCenterProps> = ({ onStartQuiz, searchQuery = '' }) => {
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
    const searchMatch = !searchQuery || 
      quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      quiz.subject.toLowerCase().includes(searchQuery.toLowerCase());
      
    return typeMatch && subjectMatch && searchMatch;
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
    <div className="h-full flex flex-col px-4 sm:px-6 xl:px-10 py-6 sm:py-8">
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
      <div 
        className="flex-1 overflow-y-auto pr-2 pb-4 scrollbar-hide rounded-[2rem] border border-slate-200 shadow-inner relative"
        style={{
          backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          backgroundPosition: '-12px -12px',
          backgroundColor: '#FAFAFA'
        }}
      >
        {/* Notebook binding / margin line */}
        <div className="absolute left-12 top-0 bottom-0 w-0.5 bg-rose-200/60 pointer-events-none z-0"></div>
        <div className="absolute left-[54px] top-0 bottom-0 w-px bg-rose-100/40 pointer-events-none z-0"></div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5 p-4 md:p-6 relative z-10">
          {filteredQuizzes.map((quiz, index) => {
            const isLocked = quiz.locked;
            const isHard = quiz.difficulty === 'Hard';
            const isChallenge = quiz.type === 'challenge';

            return (
              <motion.div
                key={quiz.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => !isLocked && onStartQuiz?.(quiz)}
                className={`bg-white/90 backdrop-blur-sm rounded-2xl p-4 md:p-5 border-2 relative select-none transition-all duration-300 ${
                  isLocked
                    ? 'border-slate-200 opacity-60 saturate-50 cursor-not-allowed'
                    : quiz.completed
                    ? 'border-teal-200 shadow-sm hover:border-teal-300 hover:shadow-md cursor-pointer'
                    : isHard
                    ? 'border-indigo-200 shadow-sm hover:border-indigo-300 hover:shadow-md cursor-pointer'
                    : 'border-orange-200 shadow-sm hover:border-orange-300 hover:shadow-md cursor-pointer'
                } group`}
              >
                <div className="flex items-center justify-between gap-3 md:gap-4">
                  <div className="flex items-center gap-3 md:gap-4 flex-1">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm transform group-hover:rotate-3 transition-transform ${
                      isLocked ? 'bg-slate-100 text-slate-400' :
                      quiz.completed ? 'bg-teal-500 text-white' :
                      isHard ? 'bg-indigo-500 text-white' : 'bg-orange-500 text-white'
                    }`}>
                      {isLocked ? <Lock size={18} /> :
                       quiz.completed ? <Trophy size={18} /> :
                       <PenTool size={18} />}
                    </div>

                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-[6px] text-[9px] md:text-[10px] font-black uppercase tracking-wider ${
                          isHard ? 'bg-indigo-100 text-indigo-700' :
                          isChallenge ? 'bg-orange-100 text-orange-700' :
                          'bg-sky-100 text-sky-700'
                        }`}>
                          {quiz.type} • {quiz.difficulty}
                        </span>
                        {!isLocked && !quiz.completed && (
                          <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-rose-500 animate-pulse"></span>
                        )}
                      </div>
                      <h3 className={`font-bold text-[14px] md:text-[16px] leading-tight mb-1 md:mb-1.5 transition-colors ${
                        isLocked ? 'text-slate-600' : 'text-[#0a1628]'
                      }`}>
                        {quiz.title}
                      </h3>
                      <p className="text-[11px] md:text-[12px] text-slate-500 mb-1.5 line-clamp-1">{quiz.subject}</p>
                      <div className="flex flex-wrap items-center gap-2 md:gap-3 text-[11px] md:text-[12px] font-bold text-slate-400">
                        <span className="flex items-center gap-1"><BookOpen size={12}/> {quiz.questions} Qs</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="flex items-center gap-1"><Clock size={12}/> {quiz.duration}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="flex items-center gap-1 text-rose-500"><Trophy size={12}/> +{quiz.xpReward} XP</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {quiz.bestScore !== undefined && (
                      <div className="text-right">
                        <div className={`text-xl md:text-2xl font-black leading-none ${quiz.bestScore >= 80 ? 'text-teal-600' : 'text-orange-500'}`}>{quiz.bestScore}%</div>
                        <div className="text-[9px] uppercase tracking-wide text-slate-400 font-bold mt-1">Best Score</div>
                      </div>
                    )}
                    
                    {!isLocked && (
                      <div className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-[11px] md:text-[12px] font-black uppercase tracking-wider shadow-sm transition-all ${
                        quiz.completed 
                          ? 'bg-white border border-slate-200 text-slate-600 group-hover:bg-slate-50' 
                          : 'bg-slate-900 text-white group-hover:bg-slate-600'
                      }`}>
                        {quiz.completed ? 'Review' : 'Start'}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {filteredQuizzes.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500 relative z-10">
            <Target size={48} className="mb-3" />
            <p className="font-medium">No quizzes found</p>
            <p className="text-sm">Try adjusting your filters or search query</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PracticeCenter;