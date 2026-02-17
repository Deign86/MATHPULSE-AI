import React, { useState } from 'react';
import { Award, Clock, Target, Zap, Trophy, Filter, TrendingUp, CheckCircle, Lock, Play } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './ui/button';

interface Quiz {
  id: string;
  title: string;
  subject: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  questions: number;
  duration: string;
  xpReward: number;
  type: 'practice' | 'challenge' | 'mastery';
  completed: boolean;
  bestScore?: number;
  locked: boolean;
}

interface PracticeCenterProps {
  onStartQuiz?: (quiz: Quiz) => void;
}

const PracticeCenter: React.FC<PracticeCenterProps> = ({ onStartQuiz }) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'practice' | 'challenge' | 'mastery'>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  const quizzes: Quiz[] = [
    // Practice Quizzes
    {
      id: 'p1',
      title: 'Functions Fundamentals Practice',
      subject: 'Pre-Calculus',
      difficulty: 'Easy',
      questions: 10,
      duration: '15 min',
      xpReward: 50,
      type: 'practice',
      completed: true,
      bestScore: 90,
      locked: false
    },
    {
      id: 'p2',
      title: 'Polynomial Operations Review',
      subject: 'General Mathematics',
      difficulty: 'Medium',
      questions: 15,
      duration: '20 min',
      xpReward: 75,
      type: 'practice',
      completed: false,
      locked: false
    },
    {
      id: 'p3',
      title: 'Probability Basics Practice',
      subject: 'Statistics and Probability',
      difficulty: 'Easy',
      questions: 12,
      duration: '18 min',
      xpReward: 60,
      type: 'practice',
      completed: true,
      bestScore: 85,
      locked: false
    },
    {
      id: 'p4',
      title: 'Derivatives Practice Set',
      subject: 'Basic Calculus',
      difficulty: 'Hard',
      questions: 20,
      duration: '30 min',
      xpReward: 100,
      type: 'practice',
      completed: false,
      locked: false
    },

    // Challenge Mode
    {
      id: 'c1',
      title: 'Speed Math Challenge',
      subject: 'General Mathematics',
      difficulty: 'Medium',
      questions: 20,
      duration: '10 min',
      xpReward: 150,
      type: 'challenge',
      completed: false,
      locked: false
    },
    {
      id: 'c2',
      title: 'Trigonometry Blitz',
      subject: 'Pre-Calculus',
      difficulty: 'Hard',
      questions: 15,
      duration: '12 min',
      xpReward: 200,
      type: 'challenge',
      completed: true,
      bestScore: 95,
      locked: false
    },
    {
      id: 'c3',
      title: 'Limits & Continuity Sprint',
      subject: 'Basic Calculus',
      difficulty: 'Hard',
      questions: 18,
      duration: '15 min',
      xpReward: 250,
      type: 'challenge',
      completed: false,
      locked: true
    },

    // Mastery Tests
    {
      id: 'm1',
      title: 'Pre-Calculus Mastery Exam',
      subject: 'Pre-Calculus',
      difficulty: 'Hard',
      questions: 50,
      duration: '90 min',
      xpReward: 500,
      type: 'mastery',
      completed: false,
      locked: false
    },
    {
      id: 'm2',
      title: 'Statistics & Probability Final',
      subject: 'Statistics and Probability',
      difficulty: 'Hard',
      questions: 45,
      duration: '75 min',
      xpReward: 450,
      type: 'mastery',
      completed: false,
      locked: true
    }
  ];

  const filteredQuizzes = quizzes.filter(quiz => {
    const typeMatch = selectedFilter === 'all' || quiz.type === selectedFilter;
    const subjectMatch = selectedSubject === 'all' || quiz.subject === selectedSubject;
    return typeMatch && subjectMatch;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'practice':
        return {
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          border: 'border-blue-200',
          accent: 'bg-blue-500'
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
          bg: 'bg-purple-50',
          text: 'text-purple-700',
          border: 'border-purple-200',
          accent: 'bg-purple-500'
        };
      default:
        return {
          bg: 'bg-slate-50',
          text: 'text-slate-700',
          border: 'border-slate-200',
          accent: 'bg-slate-500'
        };
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-green-100 text-green-700';
      case 'Medium':
        return 'bg-amber-100 text-amber-700';
      case 'Hard':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Practice Center</h1>
        <p className="text-slate-600">Sharpen your skills with quizzes, challenges, and mastery tests</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Award size={24} />
            </div>
            <span className="text-3xl font-bold">12</span>
          </div>
          <p className="text-sm font-medium text-blue-100">Quizzes Completed</p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl p-5 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Zap size={24} />
            </div>
            <span className="text-3xl font-bold">850</span>
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
            <span className="text-3xl font-bold">87%</span>
          </div>
          <p className="text-sm font-medium text-indigo-100">Average Score</p>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2 bg-white rounded-xl p-1 shadow-sm">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              selectedFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSelectedFilter('practice')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              selectedFilter === 'practice'
                ? 'bg-blue-500 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Practice
          </button>
          <button
            onClick={() => setSelectedFilter('challenge')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              selectedFilter === 'challenge'
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Challenge
          </button>
          <button
            onClick={() => setSelectedFilter('mastery')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              selectedFilter === 'mastery'
                ? 'bg-purple-500 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Mastery
          </button>
        </div>

        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:border-indigo-600 focus:outline-none"
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
                    <Lock size={18} className="text-slate-400" />
                  ) : quiz.completed ? (
                    <CheckCircle size={18} className="text-teal-600" />
                  ) : (
                    <Play size={18} className={colors.text} />
                  )}
                </div>

                {/* Title */}
                <h3 className="font-bold text-slate-800 mb-2">{quiz.title}</h3>
                <p className="text-xs text-slate-600 mb-4">{quiz.subject}</p>

                {/* Stats */}
                <div className="flex items-center gap-4 mb-4 text-xs text-slate-500">
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
                  <div className="flex items-center gap-1 text-amber-600 font-bold text-sm">
                    <Trophy size={14} />
                    <span>+{quiz.xpReward} XP</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {filteredQuizzes.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
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