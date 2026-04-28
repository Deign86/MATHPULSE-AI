import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Bookmark, Hash, Clock, Award, Play, Lock, CheckCircle2, Circle, BookOpen, PenTool, Trophy, Star, Target, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import InteractiveLesson, { Question } from './InteractiveLesson';
import LessonViewer from './LessonViewer';
import { subjects, Module, Lesson, Quiz } from '../data/subjects';
import { useAuth } from '../contexts/AuthContext';
import { completeLesson, completeQuiz, recalculateAndUpdateModuleProgress, subscribeToUserProgress, updateLessonProgressPercent } from '../services/progressService';
import type { UserProgress } from '../types/models';

interface ModuleDetailViewProps {
  module: Module;
  onBack: () => void;
  onEarnXP?: (xp: number, message: string) => void;
}

// Question banks per module/quiz topic
const quizQuestionBanks: Record<string, Question[]> = {};

// Get questions for a quiz based on its ID
const getQuestionsForLesson = (quizId: string, type: 'practice' | 'quiz'): Question[] => {
  return [];
};

const ModuleDetailView: React.FC<ModuleDetailViewProps> = ({ module, onBack, onEarnXP }) => {
  const STANDARD_LESSON_XP = 10;
  const [selectedLesson, setSelectedLesson] = useState<{ lesson: Lesson; type: 'lesson'; returnFromQuiz?: boolean } | { quiz: Quiz; type: 'quiz' } | null>(null);
  const { userProfile } = useAuth();
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);

  const moduleLevel = useMemo(() => {
    const candidate = Number(module.id.split('-').pop());
    return Number.isFinite(candidate) && candidate > 0 ? candidate : 1;
  }, [module.id]);

  const subjectId = useMemo(() => {
    const curriculumSubjectId = (module as Module & { subjectId?: string }).subjectId;
    if (curriculumSubjectId) return curriculumSubjectId;
    const parent = subjects.find((s) => s.modules.some((m) => m.id === module.id));
    return parent?.id ?? null;
  }, [module.id]);

  // Palette (requested) used for per-module accents where the curriculum data isn't differentiated.
  const MODULE_PALETTE = ['#1FA7E1', '#9956DE', '#75D06A', '#FFB356', '#7274ED', '#FF8B8B', '#6ED1CF', '#FB96BB'];

  const moduleAccentHex = useMemo(() => {
    const curriculumAccent = (module as Module & { subjectAccentColor?: string }).subjectAccentColor;
    if (curriculumAccent) return curriculumAccent;
    const parent = subjectId ? subjects.find((s) => s.id === subjectId) : null;
    const idx = parent?.modules?.findIndex((m) => m.id === module.id) ?? 0;
    const safeIdx = idx >= 0 ? idx : 0;
    return MODULE_PALETTE[safeIdx % MODULE_PALETTE.length];
  }, [module, module.id, subjectId]);

  useEffect(() => {
    if (!userProfile?.uid) return;
    return subscribeToUserProgress(userProfile.uid, setUserProgress);
  }, [userProfile?.uid]);

  const dbModuleProgress = useMemo(() => {
    if (!subjectId) return null;
    return userProgress?.subjects?.[subjectId]?.modulesProgress?.[module.id] ?? null;
  }, [module.id, subjectId, userProgress?.subjects]);

  const [returningToLesson, setReturningToLesson] = useState<Lesson | null>(null);

  const completedLessonIds = useMemo(() => {
    const ids = dbModuleProgress?.lessonsCompleted ?? [];
    return new Set(ids);
  }, [dbModuleProgress?.lessonsCompleted]);

  const completedQuizIds = useMemo(() => {
    const ids = dbModuleProgress?.quizzesCompleted ?? [];
    return new Set(ids);
  }, [dbModuleProgress?.quizzesCompleted]);

  const completedLessons = dbModuleProgress?.lessonsCompleted?.length ?? module.lessons.filter(l => l.completed).length;
  const completedQuizzes = dbModuleProgress?.quizzesCompleted?.length ?? module.quizzes.filter(q => q.completed).length;
  const moduleProgressPercentFromDb = dbModuleProgress?.progress ?? module.progress;

  // Calculate overall module progress
  const totalItems = module.lessons.length + module.quizzes.length;
  const completedItems = completedLessons + completedQuizzes;
  const lessonProgressPercent = module.lessons.length ? (completedLessons / module.lessons.length) * 100 : 0;
  const quizProgressPercent = module.quizzes.length ? (completedQuizzes / module.quizzes.length) * 100 : 0;

  // Per-lesson progress (0-100) persisted in Firestore under progress.lessons[lessonId].
  const getLessonProgressPercent = (lessonId: string, isCompleted: boolean) => {
    const pct = userProgress?.lessons?.[lessonId]?.score; // Assuming score stores the percentage here based on models
    if (typeof pct === 'number' && Number.isFinite(pct)) return Math.max(0, Math.min(100, pct));
    return isCompleted ? 100 : 0;
  };

  // Derived module progress that includes partial lesson progress.
  const derivedModuleProgressPercent = useMemo(() => {
    if (!totalItems) return 0;
    const lessonSum = module.lessons.reduce((sum, lesson) => {
      const isCompleted = completedLessonIds.has(lesson.id) || lesson.completed;
      return sum + getLessonProgressPercent(lesson.id, isCompleted);
    }, 0);
    const quizSum = completedQuizzes * 100;
    return Math.round((lessonSum + quizSum) / totalItems);
  }, [completedLessonIds, completedQuizzes, module.lessons, module.quizzes.length, totalItems, userProgress?.lessons]);

  const moduleProgressPercent = moduleProgressPercentFromDb > 0 ? moduleProgressPercentFromDb : derivedModuleProgressPercent;

  const standaloneQuiz = useMemo(() => {
    return (
      module.quizzes.find(
        (quiz) => quiz.type === 'final' || /module\s+quiz|general\s+quiz/i.test(quiz.title),
      ) ?? null
    );
  }, [module.quizzes]);

  const lessonActivityMap = useMemo(() => {
    const mapped = new Map<string, Quiz[]>();

    module.lessons.forEach((lesson) => {
      mapped.set(lesson.id, []);
    });

    const lessonCount = module.lessons.length;
    if (lessonCount === 0) return mapped;

    module.quizzes.forEach((quiz, index) => {
      if (standaloneQuiz?.id === quiz.id) return;
      const lessonIndex = Math.min(index, lessonCount - 1);
      const lesson = module.lessons[lessonIndex];
      if (!lesson) return;

      const bucket = mapped.get(lesson.id) ?? [];
      bucket.push(quiz);
      mapped.set(lesson.id, bucket);
    });

    return mapped;
  }, [module.lessons, module.quizzes, standaloneQuiz?.id]);

  const standaloneInsertIndex = useMemo(() => {
    return Math.max(1, Math.ceil(module.lessons.length / 2));
  }, [module.lessons.length]);

  // If a lesson is selected, show the appropriate viewer
  if (selectedLesson) {
    if (selectedLesson.type === 'lesson') {
      const associatedQuiz = lessonActivityMap.get(selectedLesson.lesson.id)?.[0] ?? null;

      // Show the actual lesson content viewer
      const practiceQuizCompleted = associatedQuiz ? (completedQuizIds.has(associatedQuiz.id) || associatedQuiz.completed) : false;

      return (
        <LessonViewer
          lesson={selectedLesson.lesson}
          lessonCompletionXP={STANDARD_LESSON_XP}
          practiceQuiz={associatedQuiz}
          practiceQuizCompleted={practiceQuizCompleted}
          initialSection={selectedLesson.returnFromQuiz ? -1 : 0}
          onBack={() => {
            setSelectedLesson(null);
            setReturningToLesson(null);
          }}
          onStartPractice={() => {
            if (associatedQuiz) {
              setReturningToLesson(selectedLesson.lesson);
              setSelectedLesson({ type: 'quiz', quiz: associatedQuiz });
            }
          }}
          onProgressUpdate={(percent) => {
            // This is lesson-scoped progress; no subject/module IDs needed.
            if (userProfile?.uid) {
              updateLessonProgressPercent(userProfile.uid, selectedLesson.lesson.id, percent);
            }

            // Optimistic UI update so the module lesson card rim reflects immediately.
            setUserProgress((prev) => {
              if (!prev) return prev;
              const lessonId = selectedLesson.lesson.id;
              const existingPct = prev.lessons?.[lessonId]?.score;
              const safeExistingPct = typeof existingPct === 'number' && Number.isFinite(existingPct) ? existingPct : 0;
              const nextPct = Math.max(safeExistingPct, Math.max(0, Math.min(100, percent)));
              return {
                ...prev,
                lessons: {
                  ...(prev.lessons || {}),
                  [lessonId]: {
                    ...(prev.lessons?.[lessonId] || {}),
                    lessonId,
                    score: nextPct,
                  },
                },
                updatedAt: new Date(),
              };
            });
          }}
          onComplete={(score, totalXP, goToNext) => {
            // Standard lesson rewards are intentionally lower to keep pacing balanced.
            const xpAmount = STANDARD_LESSON_XP;
            console.log('[LessonComplete] XP Award:', xpAmount, 'for', selectedLesson.lesson.title);
            onEarnXP?.(xpAmount, `Completed "${selectedLesson.lesson.title}"`);

            // Persist progress for Competency Matrix (Concept Grasp)
            if (userProfile?.uid && subjectId) {
              void (async () => {
                try {
                  await completeLesson(
                    userProfile.uid,
                    subjectId,
                    module.id,
                    selectedLesson.lesson.id,
                    0,
                    xpAmount
                  );
                  await recalculateAndUpdateModuleProgress(
                    userProfile.uid,
                    subjectId,
                    module.id,
                    module.lessons.length,
                    module.quizzes.length
                  );
                } catch (err) {
                  console.error('[LessonComplete] Failed to persist progress:', err);
                }
              })();
            }

            // Figure out the next index based on current lesson inside module.lessons
            if (goToNext) {
              const currentIdx = module.lessons.findIndex(l => l.id === selectedLesson.lesson.id);
              if (currentIdx !== -1 && currentIdx < module.lessons.length - 1) {
                // Automatically move to the next lesson
                setSelectedLesson({ type: 'lesson', lesson: module.lessons[currentIdx + 1] });
              } else if (currentIdx === module.lessons.length - 1 && module.quizzes.length > 0) {
                // If it was the last lesson, move to the first quiz
                setSelectedLesson({ type: 'quiz', quiz: module.quizzes[0] });
              } else {
                // Nothing left to go to
                setSelectedLesson(null);
              }
            } else {
              setSelectedLesson(null);
            }
          }}
        />
      );
    } else {
      // Show the quiz interface
      const questions = getQuestionsForLesson(selectedLesson.quiz.id, 'quiz');
      return (
        <InteractiveLesson
          lesson={{
            id: parseInt(selectedLesson.quiz.id.split('-').pop() || '1'),
            title: selectedLesson.quiz.title,
            duration: selectedLesson.quiz.duration,
            type: 'quiz',
            completed: selectedLesson.quiz.completed,
            locked: selectedLesson.quiz.locked
          }}
          questions={questions}
          onBack={() => {
            if (returningToLesson) {
              setSelectedLesson({ type: 'lesson', lesson: returningToLesson, returnFromQuiz: true });
              setReturningToLesson(null);
            } else {
              setSelectedLesson(null);
            }
          }}
          onComplete={(score, totalXP) => {
            console.log('[QuizComplete] Score:', score, 'totalXP from calculator:', totalXP);

            // Persist progress — completeQuiz is the single XP authority
            if (userProfile?.uid && subjectId) {
              void (async () => {
                try {
                  await completeQuiz(
                    userProfile.uid,
                    subjectId,
                    module.id,
                    selectedLesson.quiz.id,
                    score,
                    [],
                    0,
                    totalXP
                  );
                  await recalculateAndUpdateModuleProgress(
                    userProfile.uid,
                    subjectId,
                    module.id,
                    module.lessons.length,
                    module.quizzes.length
                  );
                } catch (err) {
                  console.error('[QuizComplete] Failed to persist progress:', err);
                }
              })();
            }

            if (returningToLesson) {
              setSelectedLesson({ type: 'lesson', lesson: returningToLesson, returnFromQuiz: true });
              setReturningToLesson(null);
            } else {
              setSelectedLesson(null);
            }
          }}
        />
      );
    }
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-hide px-4 sm:px-6 xl:px-10 py-6 sm:py-8 relative">
      {/* Header & Navigation */}
      <div className="relative mb-6 xl:mb-8 w-full sm:w-max">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/80 backdrop-blur-xl border border-slate-200/60 text-slate-600 hover:text-indigo-600 font-bold text-sm tracking-wide transition-all hover:-translate-x-1 shadow-sm hover:shadow-md"
        >
          <ArrowLeft size={18} />
          Back
        </button>
      </div>

      {/* Book Cover / Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative mb-6 lg:mb-8 rounded-[2rem] ${module.accentColor} shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] shrink-0 overflow-hidden`}
      >
        {/* Simple black overlay to darken the specific module color */}
        <div className="absolute inset-0 bg-black/60 pointer-events-none z-0" />
        {/* Decorative Textbook Background */}
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none" 
          style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 39px, #ffffff 39px, #ffffff 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, #ffffff 39px, #ffffff 40px)' }}
        />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-sky-500/20 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative p-5 sm:p-7 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8">
          <div className="flex-1 text-white">
            <div className="flex flex-wrap items-center gap-3 mb-4 md:mb-5">
              <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[11px] font-black uppercase tracking-widest text-[#f8fafc] border border-white/20 shadow-sm flex items-center gap-1.5">
                <Bookmark size={14} /> Chapter {module.id.split('-').pop() || '1'}
              </div>
              <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[11px] font-black uppercase tracking-widest text-emerald-400 border border-emerald-400/30">
                Lv {moduleLevel}
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-black text-white mb-3 md:mb-4 tracking-[-0.02em] leading-tight">
              {module.title}
            </h1>
            <p className="text-slate-300 text-sm md:text-[15px] max-w-2xl font-medium leading-relaxed mb-6 md:mb-8">
              {module.description}
            </p>

            {/* Elegant Linear Progress instead of redundant circles/bars */}
            <div className="bg-black/20 backdrop-blur-md rounded-2xl p-4 md:p-5 border border-white/10 max-w-xl">
              <div className="flex justify-between items-end mb-3">
                <div className="flex items-center gap-2.5">
                  <Award size={20} className="text-emerald-400" />
                  <span className="text-[12px] md:text-[13px] font-black text-white uppercase tracking-wider">Module Mastery</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[12px] md:text-[13px] font-bold text-slate-400 mb-0.5">{completedItems}/{totalItems} steps</span>
                  <span className="text-xl md:text-2xl font-black text-white shrink-0 leading-none">{Math.round(moduleProgressPercent)}%</span>
                </div>
              </div>
              <div className="h-3 bg-black/40 rounded-full overflow-hidden shadow-inner ring-1 ring-white/10 p-0.5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${moduleProgressPercent}%` }}
                  transition={{ duration: 1.5, ease: 'easeOut', delay: 0.2 }}
                  className={`h-full rounded-full relative ${moduleProgressPercent === 100 ? 'bg-gradient-to-r from-emerald-400 to-teal-300' : module.accentColor}`}
                >
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSI+PC9yZWN0Pgo8L3N2Zz4=')] opacity-30 mix-blend-overlay" />
                </motion.div>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex w-48 h-48 bg-white/5 rounded-[2rem] border border-white/10 backdrop-blur-md items-center justify-center transform rotate-[-3deg] shadow-2xl relative group hover:rotate-0 transition-all duration-500 shrink-0">
            <div className={`absolute inset-0 opacity-40 rounded-[2rem] ${module.progress === 100 ? 'bg-gradient-to-br from-emerald-400 to-teal-600' : module.accentColor}`} />
            
            {moduleProgressPercent === 100 ? (
              <Trophy size={80} className="text-white drop-shadow-xl z-10 scale-100 group-hover:scale-110 transition-transform duration-500" strokeWidth={1} />
            ) : (
              <BookOpen size={80} className="text-white drop-shadow-xl z-10 scale-100 group-hover:scale-110 transition-transform duration-500" strokeWidth={1} />
            )}
            
            <motion.div animate={{y:[-5,5,-5], rotate:[-10,10,-10]}} transition={{duration:4, repeat:Infinity}} className="absolute top-6 left-6 text-emerald-300 z-20">
              <Star size={20} fill="currentColor" />
            </motion.div>
            <motion.div animate={{y:[5,-5,5], rotate:[10,-10,10]}} transition={{duration:3.5, repeat:Infinity}} className="absolute bottom-8 right-6 text-sky-300 z-20">
              <Hash size={24} />
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Single-column lesson flow with nested activities */}
      <div className="pb-8">
        <div className="relative rounded-[2rem] border border-slate-200 bg-white/90 shadow-sm overflow-hidden">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(153,86,222,0.08),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(31,167,225,0.08),transparent_45%)]" />

          <div className="relative z-10 px-4 sm:px-6 md:px-8 py-5 md:py-6 border-b border-slate-200/70 bg-white/70 backdrop-blur-sm flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display font-black text-xl md:text-2xl text-slate-800 flex items-center gap-3">
              <BookOpen size={24} className="text-sky-500" />
              Study Journey
            </h2>
          </div>

          <div className="relative z-10 px-4 sm:px-6 md:px-8 py-16 md:py-24 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock size={32} className="text-slate-400" />
            </div>
            <h3 className="text-2xl font-display font-black text-slate-800 mb-2">Lessons coming soon</h3>
            <p className="text-slate-500 font-medium">Lessons are currently non-functional and will be available soon.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleDetailView;
