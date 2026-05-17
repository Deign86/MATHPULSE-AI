import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Award, Clock, Target, Zap, Trophy, BookOpen, PenTool, Loader2, TrendingUp, DollarSign, Brain, Dice5, BarChart3, Crosshair, FlaskConical, ScatterChart } from 'lucide-react';
import { motion } from 'motion/react';
import { Quiz, QuizAnswerRecord } from './QuizExperience';
import { useAuth } from '../contexts/AuthContext';
import { SHS_MATH_SUBJECTS, type SubjectId } from '../data/subjects';
import {
  fetchPracticeStats,
  generatePracticeSession,
  type PracticeStatsResponse,
} from '../services/practiceService';

interface PracticeCenterProps {
  userId: string;
  onStartQuiz?: (quiz: Quiz) => void;
  onQuizEnd?: (quiz: Quiz, answers: QuizAnswerRecord[]) => void;
  searchQuery?: string;
  allowedSubjectIds?: SubjectId[];
}

// A spawnable topic card — each represents a competency the AI can generate quizzes for
interface TopicCard {
  id: string;
  name: string;
  unit: string;
  subject: string;
  subjectId: string;
}

const UNIT_STYLE: Record<string, { icon: React.ElementType; bg: string }> = {
  'Patterns, Relations, and Functions': { icon: TrendingUp, bg: 'bg-indigo-500' },
  'Financial Mathematics': { icon: DollarSign, bg: 'bg-emerald-500' },
  'Logic and Mathematical Reasoning': { icon: Brain, bg: 'bg-purple-500' },
  'Random Variables': { icon: Dice5, bg: 'bg-orange-500' },
  'Normal Distribution': { icon: BarChart3, bg: 'bg-sky-500' },
  'Sampling and Estimation': { icon: Crosshair, bg: 'bg-teal-500' },
  'Hypothesis Testing': { icon: FlaskConical, bg: 'bg-rose-500' },
  'Correlation and Regression': { icon: ScatterChart, bg: 'bg-amber-500' },
};

function getUnitStyle(unit: string) {
  return UNIT_STYLE[unit] || { icon: PenTool, bg: 'bg-slate-500' };
}

const PracticeCenter: React.FC<PracticeCenterProps> = ({ userId, onStartQuiz, searchQuery = '', allowedSubjectIds }) => {
  const { userProfile } = useAuth();
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [practiceStats, setPracticeStats] = useState<PracticeStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [generatingTopic, setGeneratingTopic] = useState<string | null>(null);

  const availableSubjects = useMemo(() => {
    if (!allowedSubjectIds || allowedSubjectIds.length === 0) return SHS_MATH_SUBJECTS;
    return SHS_MATH_SUBJECTS.filter((s) => allowedSubjectIds.includes(s.id as SubjectId));
  }, [allowedSubjectIds]);

  // Build dynamic topic cards from curriculum
  const topicCards: TopicCard[] = useMemo(() => {
    return availableSubjects.flatMap((subject) =>
      subject.topics.map((topic) => ({
        id: topic.id,
        name: topic.name,
        unit: topic.unit,
        subject: subject.name,
        subjectId: subject.id,
      }))
    );
  }, [availableSubjects]);

  // Filter topics
  const filteredTopics = useMemo(() => {
    return topicCards.filter((topic) => {
      const subjectMatch = selectedSubject === 'all' || topic.subject === selectedSubject;
      const searchMatch = !searchQuery ||
        topic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        topic.unit.toLowerCase().includes(searchQuery.toLowerCase()) ||
        topic.subject.toLowerCase().includes(searchQuery.toLowerCase());
      return subjectMatch && searchMatch;
    });
  }, [topicCards, selectedSubject, searchQuery]);

  useEffect(() => {
    if (!userId) return;
    setStatsLoading(true);
    fetchPracticeStats(userId)
      .then(setPracticeStats)
      .catch(console.error)
      .finally(() => setStatsLoading(false));
  }, [userId]);

  // Derive stats
  const totalQuizzesCompleted = practiceStats?.quizzesCompleted ?? 0;
  const totalXPEarned = practiceStats?.totalXPEarned ?? (userProfile as any)?.totalXP ?? 0;
  const avgScore = practiceStats?.averageScore ?? 0;

  const handleStartQuiz = useCallback(async (topic: TopicCard) => {
    if (!userId || generatingTopic) return;

    setGeneratingTopic(topic.id);
    try {
      const difficultyMap: Record<string, 'Practice' | 'Challenge' | 'Mastery'> = {
        'Easy': 'Practice',
        'Medium': 'Challenge',
        'Hard': 'Mastery',
      };

      const response = await generatePracticeSession({
        userId,
        subject: topic.subject,
        competency: topic.name,
        difficulty: difficultyMap[selectedDifficulty],
        count: 5,
      });

      const aiQuiz: Quiz = {
        id: response.session_id,
        title: `Practice Quiz: ${topic.name} (AI)`,
        subject: topic.subject,
        difficulty: selectedDifficulty,
        questions: response.questions.length,
        duration: "10 min",
        xpReward: selectedDifficulty === 'Hard' ? 75 : selectedDifficulty === 'Medium' ? 50 : 25,
        type: 'practice',
        loadedQuestions: response.questions.map((q) => ({
          id: q.id,
          questionType: 'multiple_choice' as const,
          question: q.question,
          options: q.options,
          correctAnswer: q.options[q.correct_index],
          bloomLevel: (['remember', 'understand', 'apply', 'analyze'].includes(q.bloomsLevel?.toLowerCase() || '') ? q.bloomsLevel!.toLowerCase() : 'understand') as 'remember' | 'understand' | 'apply' | 'analyze',
          difficulty: selectedDifficulty.toLowerCase() as 'easy' | 'medium' | 'hard',
          topic: topic.name,
          subject: topic.subject,
          points: 10,
          explanation: q.explanation,
        })),
        generatedQuizId: response.session_id,
        source: 'ai_generated',
        completed: false,
        locked: false,
      };

      onStartQuiz?.(aiQuiz);
    } catch (e) {
      console.error('Failed to generate practice quiz:', e);
    } finally {
      setGeneratingTopic(null);
    }
  }, [userId, selectedDifficulty, generatingTopic, onStartQuiz]);

  return (
    <div className="px-4 sm:px-6 xl:px-10 py-4 sm:py-6">

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-sky-700 to-sky-500 rounded-xl sm:rounded-2xl p-3 sm:p-5 text-white shadow-lg"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1 sm:mb-3 gap-1 sm:gap-0">
            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
              <Award size={16} className="sm:hidden" />
              <Award size={24} className="hidden sm:block" />
            </div>
            <span className="text-xl sm:text-3xl font-bold">{totalQuizzesCompleted}</span>
          </div>
          <p className="text-[10px] sm:text-sm font-medium text-sky-100 leading-tight">Quizzes Completed</p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl sm:rounded-2xl p-3 sm:p-5 text-white shadow-lg"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1 sm:mb-3 gap-1 sm:gap-0">
            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
              <Zap size={16} className="sm:hidden" />
              <Zap size={24} className="hidden sm:block" />
            </div>
            <span className="text-xl sm:text-3xl font-bold">{totalXPEarned.toLocaleString()}</span>
          </div>
          <p className="text-[10px] sm:text-sm font-medium text-cyan-100 leading-tight">Total XP Earned</p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl sm:rounded-2xl p-3 sm:p-5 text-white shadow-lg"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1 sm:mb-3 gap-1 sm:gap-0">
            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
              <Target size={16} className="sm:hidden" />
              <Target size={24} className="hidden sm:block" />
            </div>
            <span className="text-xl sm:text-3xl font-bold">{Math.round(avgScore)}%</span>
          </div>
          <p className="text-[10px] sm:text-sm font-medium text-sky-100 leading-tight">Average Score</p>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-6">
        {/* Subject select */}
        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="w-full sm:w-auto px-3 sm:px-4 py-2 sm:py-2.5 bg-white border-2 border-[#dde3eb] rounded-xl text-xs sm:text-sm font-bold text-[#0a1628] focus:border-indigo-600 focus:outline-none"
        >
          <option value="all">All Subjects</option>
          {availableSubjects.map((subject) => (
            <option key={subject.id} value={subject.name}>{subject.name}</option>
          ))}
        </select>

        {/* Difficulty filter pills */}
        <div className="flex items-center gap-1.5 sm:gap-2 bg-white rounded-xl p-1 shadow-sm">
          <span className="px-2 text-xs font-bold text-slate-400">Difficulty:</span>
          {(['Easy', 'Medium', 'Hard'] as const).map((diff) => (
            <button
              key={diff}
              onClick={() => setSelectedDifficulty(diff)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${selectedDifficulty === diff
                ? diff === 'Easy' ? 'bg-green-500 text-white shadow-sm'
                  : diff === 'Medium' ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-red-500 text-white shadow-sm'
                : 'text-[#5a6578] hover:bg-[#edf1f7]'
              }`}
            >
              {diff}
            </button>
          ))}
        </div>
      </div>

      {/* Loading Overlay */}
      {generatingTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 flex flex-col items-center gap-3 shadow-xl">
            <Loader2 size={36} className="animate-spin text-indigo-600" />
            <p className="font-bold text-slate-700">Generating Quiz...</p>
            <p className="text-sm text-slate-500">AI is crafting questions from curriculum</p>
          </div>
        </div>
      )}

      {/* Topics Grid */}
      <div
        className="pr-2 pb-4 rounded-[2rem] border border-slate-200 shadow-inner relative"
        style={{
          backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          backgroundPosition: '-12px -12px',
          backgroundColor: '#FAFAFA'
        }}
      >
        <div className="absolute left-12 top-0 bottom-0 w-0.5 bg-rose-200/60 pointer-events-none z-0"></div>
        <div className="absolute left-[54px] top-0 bottom-0 w-px bg-rose-100/40 pointer-events-none z-0"></div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5 p-4 md:p-6 relative z-10">
          {filteredTopics.map((topic, index) => (
            <motion.div
              key={topic.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => handleStartQuiz(topic)}
              className={`bg-white/90 backdrop-blur-sm rounded-2xl p-4 md:p-5 border-2 relative select-none transition-all duration-300 ${
                generatingTopic === topic.id
                  ? 'border-indigo-300 opacity-80 cursor-wait'
                  : generatingTopic
                    ? 'border-slate-200 opacity-60 cursor-not-allowed'
                    : 'border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md cursor-pointer'
              } group`}
            >
              <div className="flex items-center justify-between gap-3 md:gap-4">
                <div className="flex items-center gap-3 md:gap-4 flex-1">
                  {(() => { const { icon: UnitIcon, bg } = getUnitStyle(topic.unit); return (
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm transform group-hover:rotate-3 transition-transform ${bg} text-white`}>
                      <UnitIcon size={18} />
                    </div>
                  ); })()}

                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-[6px] text-[9px] md:text-[10px] font-black uppercase tracking-wider ${
                        selectedDifficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                        selectedDifficulty === 'Medium' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        AI {"\u2022"} {selectedDifficulty}
                      </span>
                      <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    </div>
                    <h3 className="font-bold text-[14px] md:text-[16px] leading-tight mb-1 md:mb-1.5 text-[#0a1628] transition-colors">
                      {topic.name}
                    </h3>
                    <p className="text-[11px] md:text-[12px] text-slate-500 mb-1.5 line-clamp-1">{topic.subject} — {topic.unit}</p>
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 text-[11px] md:text-[12px] font-bold text-slate-400">
                      <span className="flex items-center gap-1"><BookOpen size={12} /> 5 Qs</span>
                      <span className="hidden sm:inline">{"\u2022"}</span>
                      <span className="flex items-center gap-1"><Clock size={12} /> 10 min</span>
                      <span className="hidden sm:inline">{"\u2022"}</span>
                      <span className="flex items-center gap-1 text-rose-500">
                        <Trophy size={12} /> +{selectedDifficulty === 'Hard' ? 75 : selectedDifficulty === 'Medium' ? 50 : 25} XP
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <div className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-[11px] md:text-[12px] font-black uppercase tracking-wider shadow-sm transition-all ${
                    generatingTopic === topic.id
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'bg-indigo-500 text-white group-hover:bg-indigo-600 shadow-indigo-200'
                  }`}>
                    {generatingTopic === topic.id ? 'Loading...' : 'Start'}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredTopics.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500 relative z-10">
            <Target size={48} className="mb-3" />
            <p className="font-medium">No topics found</p>
            <p className="text-sm">Try adjusting your filters or search query</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PracticeCenter;
