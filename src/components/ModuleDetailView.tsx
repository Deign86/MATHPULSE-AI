import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeft, Bookmark, Hash, Clock, Award, Play, Lock, CheckCircle2, Circle, BookOpen, PenTool, Trophy, Star, Target, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import InteractiveLesson, { Question } from './InteractiveLesson';
import QuizExperience, { Quiz as QuizExperienceQuiz } from './QuizExperience';
import LessonViewer from './LessonViewer';
import { subjects, Module, Lesson, Quiz } from '../data/subjects';
import { useAuth } from '../contexts/AuthContext';
import { completeLesson, completeQuiz, recalculateAndUpdateModuleProgress, subscribeToUserProgress, updateLessonProgressPercent } from '../services/progressService';
import { db } from '../lib/firebase';
import { getQuestionCountForQuiz } from '../services/lessonQuizService';
import type { UserProgress, AIQuizQuestion } from '../types/models';

import { generatePracticeSession } from '../services/practiceService';
import { Loader2 } from 'lucide-react';

interface ModuleDetailViewProps {
  module: Module;
  onBack: () => void;
  onEarnXP?: (xp: number, message: string) => void;
  isInQuizMode?: boolean;
  setIsInQuizMode?: (value: boolean) => void;
}

const ModuleDetailView: React.FC<ModuleDetailViewProps> = ({ module, onBack, onEarnXP, isInQuizMode = false, setIsInQuizMode }) => {
  const STANDARD_LESSON_XP = 10;
  const [selectedLesson, setSelectedLesson] = useState<{ lesson: Lesson; type: 'lesson'; returnFromQuiz?: boolean } | { quiz: Quiz; type: 'quiz' } | null>(null);
  const { userProfile } = useAuth();
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [iarCompleted, setIarCompleted] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<(AIQuizQuestion | Question)[] | null>(null);

  // Check if the Initial Assessment has been completed before showing REVIEW markers
  useEffect(() => {
    if (!userProfile?.uid) return;

    const checkIarStatus = async () => {
      try {
        const [legacySnap, profileSnap] = await Promise.all([
          getDoc(doc(db, 'diagnosticResults', userProfile.uid)),
          getDoc(doc(db, 'competencyProfiles', userProfile.uid)),
        ]);
        const legacyDone = legacySnap.exists() && legacySnap.data()?.status === 'completed';
        const enhancedDone = profileSnap.exists() && (profileSnap.data()?.overallScore ?? 0) > 0;
        setIarCompleted(legacyDone || enhancedDone);
      } catch {
        setIarCompleted(false);
      }
    };

    checkIarStatus();
  }, [userProfile?.uid]);

  // Store onEarnXP in a ref to avoid triggering callback recreation on parent re-renders
  // This prevents the infinite render loop when parent passes a new onEarnXP function reference
  const onEarnXPRef = useRef(onEarnXP);
  useEffect(() => { onEarnXPRef.current = onEarnXP; }, [onEarnXP]);

  // Keep selectedLesson in a ref so stable callbacks can read the latest value
  const selectedLessonRef = useRef(selectedLesson);
  useEffect(() => { selectedLessonRef.current = selectedLesson; }, [selectedLesson]);

  // Restore previously selected lesson from sessionStorage (BUG 9c fix)
  // On page refresh, this re-opens the lesson instead of showing the module overview
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(`mathpulse_module_${module.id}_selectedLesson`);
      if (saved) {
        const { lessonId } = JSON.parse(saved);
        const lesson = module.lessons.find(l => l.id === lessonId);
        if (lesson) {
          setSelectedLesson({ lesson, type: 'lesson' });
        }
      }
    } catch { /* non-fatal — module overview shows by default */ }
  }, []); // Empty deps = run once on mount

  // Persist selected lesson to sessionStorage whenever it changes
  useEffect(() => {
    if (selectedLesson?.type === 'lesson' && selectedLesson.lesson) {
      try {
        sessionStorage.setItem(`mathpulse_module_${module.id}_selectedLesson`, JSON.stringify({
          lessonId: selectedLesson.lesson.id,
        }));
      } catch { /* non-fatal */ }
    } else if (selectedLesson === null) {
      try {
        sessionStorage.removeItem(`mathpulse_module_${module.id}_selectedLesson`);
      } catch { /* non-fatal */ }
    }
  }, [selectedLesson, module.id]);

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

  // Generate AI quiz questions when a quiz is selected
  useEffect(() => {
    if (!selectedLesson || selectedLesson.type !== 'quiz' || !userProfile?.uid) return;
    let cancelled = false;

    const parentSubject = subjects.find((s) => s.modules.some((m) => m.id === module.id));
    const subjectTitle = parentSubject?.title ?? 'General Mathematics';

    (async () => {
      try {
        const response = await generatePracticeSession({
          userId: userProfile.uid,
          subject: subjectTitle,
          competency: selectedLesson.quiz.title.replace(/^(Practice Quiz|Module Quiz):\s*/i, ''),
          difficulty: selectedLesson.quiz.type === 'module' ? 'Challenge' : 'Practice',
          count: selectedLesson.quiz.questions || 5,
        });

        if (cancelled) return;
        // Convert backend response to AIQuizQuestion[] format for QuizExperience
        const questions = response.questions.map((q: any, i: number) => ({
          id: q.id || 'q-' + i,
          questionType: 'multiple_choice' as const,
          question: q.question,
          options: q.options,
          correctAnswer: q.options[q.correct_index],
          bloomLevel: (q.bloom_level?.toLowerCase() || 'understand') as 'remember' | 'understand' | 'apply' | 'analyze',
          difficulty: 'medium' as const,
          topic: selectedLesson.quiz.title,
          subject: subjectTitle,
          points: 10,
          explanation: q.explanation || '',
        }));

        setQuizQuestions(questions);
      } catch (err) {
        console.error('[ModuleDetailView] Quiz generation failed:', err);
        // Fallback: generate basic questions so the quiz isn't stuck
        const count = selectedLesson.quiz.questions || 5;
        const fallback: Question[] = Array.from({ length: count }).map((_, i) => {
          const a = Math.floor(Math.random() * 20) + 2;
          const b = Math.floor(Math.random() * 20) + 2;
          const correct = (a + b).toString();
          return {
            id: i + 1,
            type: 'multiple-choice' as const,
            question: `Compute: ${a} + ${b}`,
            options: [correct, (a * b).toString(), Math.abs(a - b).toString(), (a + b + 1).toString()],
            correctAnswer: correct,
            explanation: `${a} + ${b} = ${correct}`,
          };
        });
        if (!cancelled) setQuizQuestions(fallback);
      }
    })();

    return () => { cancelled = true; };
  }, [selectedLesson, userProfile?.uid, module.id]);

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
    // Prefer explicitly-marked final/general module quizzes
    const explicit = module.quizzes.find(
      (quiz) => quiz.type === 'final' || /module\s+quiz|general\s+quiz/i.test(quiz.title),
    );
    if (explicit) return explicit;

    // Prefer an explicit flag if present (some content entries may mark this)
    const flagged = module.quizzes.find((q) => (q as any).isStandalone === true);
    if (flagged) return flagged;

    // Fallback: if there are any quizzes, treat the first one as the mid-module checkpoint
    return module.quizzes.length ? module.quizzes[0] : null;
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

  // Stable callbacks defined at top level (before any conditionals) to comply with Rules of Hooks
  // NOTE: These are internal callbacks, distinct from the onBack/onEarnXP props passed to the component
  const handleBack = useCallback(() => {
    setSelectedLesson(null);
    setReturningToLesson(null);
  }, []);

  const handleStartPractice = useCallback(() => {
    const currentLesson = selectedLessonRef.current?.type === 'lesson' ? selectedLessonRef.current.lesson : null;
    if (!currentLesson) return;
    // Synthesize practice quiz the same way it's done in the render
    const practiceQuiz: Quiz = {
      id: `${currentLesson.id}-practice`,
      title: `Practice Quiz: ${currentLesson.title}`,
      questions: getQuestionCountForQuiz('practice'),
      duration: currentLesson.duration,
      completed: false,
      locked: false,
      type: 'practice' as const,
    };
    setReturningToLesson(currentLesson);
    setSelectedLesson({ type: 'quiz', quiz: practiceQuiz });
  }, []);

  const handleComplete = useCallback((score?: number, totalXP?: number, goToNext?: boolean) => {
    const current = selectedLessonRef.current;
    if (current?.type !== 'lesson' || !current.lesson) return;
    const currentLesson = current.lesson;

    // Standard lesson rewards are intentionally lower to keep pacing balanced.
    const xpAmount = STANDARD_LESSON_XP;
    onEarnXPRef.current?.(xpAmount, `Completed "${currentLesson.title}"`);

    // Persist progress for Competency Matrix (Concept Grasp)
    if (userProfile?.uid && subjectId) {
      void (async () => {
        try {
          await completeLesson(
            userProfile.uid,
            subjectId,
            module.id,
            currentLesson.id,
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
      const currentIdx = module.lessons.findIndex(l => l.id === currentLesson.id);
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
  }, [subjectId, module.id, module.lessons.length, module.quizzes.length]);

  const handleProgressUpdate = useCallback((percent: number) => {
    if (!userProfile?.uid || !selectedLessonRef.current || selectedLessonRef.current.type !== 'lesson') return;
    const lessonId = selectedLessonRef.current.lesson.id;
    // Persist partial lesson progress to Firestore
    void (async () => {
      try {
        await updateLessonProgressPercent(userProfile.uid!, lessonId, percent);
      } catch (err) {
        console.warn('[ModuleDetailView] Failed to persist lesson progress:', err);
      }
    })();
  }, [userProfile?.uid, module.id]);

  // If a lesson is selected, show the appropriate viewer
  if (selectedLesson) {
    if (selectedLesson.type === 'lesson') {
      const associatedQuiz = lessonActivityMap.get(selectedLesson.lesson.id)?.[0] ?? null;

      // Show the actual lesson content viewer
      const practiceQuizCompleted = associatedQuiz ? (completedQuizIds.has(associatedQuiz.id) || associatedQuiz.completed) : false;

      // Determine what comes next after this lesson
      const currentIdx = module.lessons.findIndex(l => l.id === selectedLesson.lesson.id);
      let nextContentLabel: string | undefined;
      if (currentIdx !== -1 && currentIdx < module.lessons.length - 1) {
        nextContentLabel = 'Continue to Next Lesson';
      } else if (currentIdx === module.lessons.length - 1 && module.quizzes.length > 0) {
        const nextQuiz = module.quizzes[0];
        if (nextQuiz.type === 'module') nextContentLabel = 'Take Mid-Module Checkpoint';
        else if (nextQuiz.type === 'final') nextContentLabel = 'Take Final Assessment';
        else nextContentLabel = 'Start Practice Quiz';
      }

      return (
        <LessonViewer
          lesson={selectedLesson.lesson}
          lessonCompletionXP={STANDARD_LESSON_XP}
          practiceQuiz={associatedQuiz}
          practiceQuizCompleted={practiceQuizCompleted}
          initialSection={selectedLesson.returnFromQuiz ? -1 : 0}
          nextContentLabel={nextContentLabel}
          onBack={handleBack}
          onStartPractice={handleStartPractice}
          onProgressUpdate={handleProgressUpdate}
          onComplete={handleComplete}
        />
      );
    } else {
      // Show the quiz interface — questions loaded via quizQuestions state
      if (!quizQuestions) {
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 flex flex-col items-center gap-3 shadow-xl">
              <Loader2 size={36} className="animate-spin text-indigo-600" />
              <p className="font-bold text-slate-700">Generating Quiz...</p>
              <p className="text-sm text-slate-500">AI is crafting questions for {selectedLesson.quiz.title}</p>
            </div>
          </div>
        );
      }
      return (
        <QuizExperience
          quiz={{
            id: selectedLesson.quiz.id,
            title: selectedLesson.quiz.title,
            subject: subjects.find(s => s.modules.some(m => m.id === module.id))?.title || 'Mathematics',
            difficulty: 'Medium',
            questions: quizQuestions.length,
            duration: selectedLesson.quiz.duration || '15 min',
            xpReward: 50,
            type: 'practice',
            completed: selectedLesson.quiz.completed,
            locked: false,
            loadedQuestions: quizQuestions as AIQuizQuestion[],
            source: 'ai_generated',
          }}
          onClose={() => {
            setQuizQuestions(null);
            if (returningToLesson) {
              setSelectedLesson({ type: 'lesson', lesson: returningToLesson, returnFromQuiz: true });
              setReturningToLesson(null);
            } else {
              setSelectedLesson(null);
            }
            if (setIsInQuizMode) setIsInQuizMode(false);
          }}
          onComplete={(score, xpEarned) => {
            if (userProfile?.uid && subjectId) {
              void (async () => {
                try {
                  await completeQuiz(userProfile.uid, subjectId, module.id, selectedLesson.quiz.id, score, [], 0, xpEarned);
                  await recalculateAndUpdateModuleProgress(userProfile.uid, subjectId, module.id, module.lessons.length, module.quizzes.length);
                  await subscribeToUserProgress(userProfile.uid, setUserProgress);
                } catch (err) { console.warn('[Quiz] Progress persist failed:', err); }
                if (onEarnXP) onEarnXP(xpEarned ?? 0, 'Quiz Complete! +' + (xpEarned ?? 0) + ' XP');
              })();
            }
          }}
          studentId={userProfile?.uid}
        />
      );
    }
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-hide px-4 md:px-6 lg:px-10 py-4 md:py-6 lg:py-8 relative">
      {/* Header & Navigation */}
      <div className="relative mb-4 lg:mb-6 xl:mb-8 w-full lg:w-max">
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
        <div className="absolute inset-0 opacity-10 pointer-events-none module-detail-grid-pattern" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-sky-500/20 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative p-5 md:p-6 lg:p-8 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-5">
          <div className="flex-1 text-white">
            <div className="flex flex-wrap items-center gap-2 mb-2 md:mb-2.5">
              <div className="px-2.5 py-0.5 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-[#f8fafc] border border-white/20 shadow-sm flex items-center gap-1">
                <Bookmark size={12} /> Chapter {module.id.split('-').pop() || '1'}
              </div>
              <div className="px-2.5 py-0.5 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-400 border border-emerald-400/30">
                Lv {moduleLevel}
              </div>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <span className="flex lg:hidden text-white/80 shrink-0">
                <BookOpen size={18} strokeWidth={1.5} />
              </span>
              <h1 className="text-lg md:text-2xl lg:text-3xl font-display font-black text-white tracking-[-0.02em] leading-tight">
                {module.title}
              </h1>
            </div>
            <p className="text-slate-300 text-xs md:text-sm max-w-2xl font-medium leading-relaxed mb-3">
              {module.description}
            </p>

            {/* Elegant Linear Progress instead of redundant circles/bars */}
            <div className="bg-black/20 backdrop-blur-md rounded-xl p-2 md:p-3 border border-white/10 max-w-xl">
              <div className="flex justify-between items-end gap-2">
                <div className="flex items-center gap-1.5">
                  <Award size={16} className="text-emerald-400" />
                  <span className="text-[11px] md:text-xs font-black text-white uppercase tracking-wider">Module Mastery</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[10px] md:text-xs font-bold text-slate-400">{completedItems}/{totalItems}</span>
                  <span className="text-base md:text-lg font-black text-white shrink-0 leading-none">{Math.round(moduleProgressPercent)}%</span>
                </div>
              </div>
              <div className="h-2 bg-black/40 rounded-full overflow-hidden shadow-inner ring-1 ring-white/10 p-0.5 mt-2">
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

          <div className="hidden lg:flex w-32 h-32 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md items-center justify-center transform rotate-[-3deg] shadow-2xl relative group hover:rotate-0 transition-all duration-500 shrink-0">
            <div className={`absolute inset-0 opacity-40 rounded-2xl ${module.progress === 100 ? 'bg-gradient-to-br from-emerald-400 to-teal-600' : module.accentColor}`} />

            {moduleProgressPercent === 100 ? (
              <Trophy size={56} className="text-white drop-shadow-xl z-10 scale-100 group-hover:scale-110 transition-transform duration-500" strokeWidth={1} />
            ) : (
              <BookOpen size={56} className="text-white drop-shadow-xl z-10 scale-100 group-hover:scale-110 transition-transform duration-500" strokeWidth={1} />
            )}

            <motion.div animate={{ y: [-5, 5, -5], rotate: [-10, 10, -10] }} transition={{ duration: 4, repeat: Infinity }} className="absolute top-4 left-4 text-emerald-300 z-20">
              <Star size={16} fill="currentColor" />
            </motion.div>
            <motion.div animate={{ y: [5, -5, 5], rotate: [10, -10, 10] }} transition={{ duration: 3.5, repeat: Infinity }} className="absolute bottom-6 right-4 text-sky-300 z-20">
              <Hash size={18} />
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Single-column lesson flow with nested activities */}
      <div className="flex-1 overflow-y-auto pr-2 pb-8 scrollbar-hide">
        <div className="relative rounded-[2rem] border border-slate-200 bg-white/90 shadow-sm overflow-hidden">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(153,86,222,0.08),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(31,167,225,0.08),transparent_45%)]" />

          <div className="relative z-10 px-4 sm:px-6 md:px-8 py-5 md:py-6 border-b border-slate-200/70 bg-white/70 backdrop-blur-sm flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display font-black text-xl md:text-2xl text-slate-800 flex items-center gap-3">
              <BookOpen size={24} className="text-sky-500" />
              Study Journey
            </h2>
            <div className="flex items-center gap-2.5">
              <div className="text-xs md:text-sm font-bold bg-sky-100 text-sky-700 px-3 py-1 rounded-full shadow-sm border border-sky-200/50">
                Lessons {completedLessons}/{module.lessons.length}
              </div>
              <div className="text-xs md:text-sm font-bold bg-rose-100 text-rose-700 px-3 py-1 rounded-full shadow-sm border border-rose-200/50">
                Quizzes {completedQuizzes}/{module.quizzes.length}
              </div>
            </div>
          </div>

          <div className="relative z-10 px-3 md:px-6 lg:px-8 py-4 md:py-6 space-y-4 md:space-y-5">
            {module.lessons.map((lesson, index) => {
              const isCompleted = completedLessonIds.has(lesson.id) || lesson.completed;
              const lessonPct = getLessonProgressPercent(lesson.id, isCompleted);
              const lessonAccentHex = MODULE_PALETTE[index % MODULE_PALETTE.length];

              return (
                <React.Fragment key={lesson.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`relative rounded-[1.5rem] border overflow-hidden group transition-all duration-500 mb-4 md:mb-6 ${
                      lesson.locked
                        ? 'border-slate-200 opacity-65 saturate-50'
                        : 'border-slate-200/80 hover:border-slate-300 hover:shadow-[0_16px_40px_-15px_rgba(0,0,0,0.12)] hover:-translate-y-0.5'
                    }`}
                  >
                    <div className="absolute top-0 left-0 right-0 h-[6px] z-20 bg-slate-100 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(2, lessonPct)}%` }}
                        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.1 + index * 0.05 }}
                        className="h-full relative"
                        style={{ backgroundColor: lessonAccentHex }}
                      >
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSI+PC9yZWN0Pgo8L3N2Zz4=')] opacity-30 mix-blend-overlay" />
                      </motion.div>
                    </div>

                    <div
                      className="absolute inset-0 bg-white transition-opacity duration-500 group-hover:opacity-90"
                      style={{
                        backgroundImage: `linear-gradient(to right, ${lessonAccentHex}44 0%, ${lessonAccentHex}11 50%, white 100%)`
                      }}
                    />
                    <div
                      className="absolute inset-0 opacity-[0.2] pointer-events-none"
                      style={{
                        backgroundImage: `radial-gradient(circle at 2px 2px, ${lessonAccentHex} 1.5px, transparent 0)`,
                        backgroundSize: '24px 24px'
                      }}
                    />
                    <div className="absolute -top-12 -left-10 h-40 w-40 rounded-full blur-[32px] pointer-events-none transition-transform duration-700 group-hover:scale-[1.3] group-hover:translate-x-4" style={{ backgroundColor: `${lessonAccentHex}22` }} />
                    <div className="absolute -bottom-8 right-8 h-32 w-32 rounded-full blur-2xl pointer-events-none transition-transform duration-700 group-hover:scale-125 group-hover:-translate-y-4" style={{ backgroundColor: `${lessonAccentHex}11` }} />

                    <div className="absolute right-4 top-4 opacity-10 pointer-events-none transition-all duration-500 group-hover:rotate-12 group-hover:scale-110 drop-shadow-sm" style={{ color: lessonAccentHex }}><Hash size={56} strokeWidth={1} /></div>
                    <div className="absolute right-16 bottom-5 opacity-10 pointer-events-none transition-all duration-500 group-hover:-rotate-6 group-hover:-translate-y-2 drop-shadow-sm" style={{ color: lessonAccentHex }}><BookOpen size={40} strokeWidth={1} /></div>

                    <div className="relative z-10 p-3 md:p-5 pt-5 md:pt-6 space-y-3 md:space-y-4">
                      <button
                        type="button"
                        onClick={() => !lesson.locked && setSelectedLesson({ lesson, type: 'lesson' })}
                        className={`w-full text-left flex flex-wrap items-center justify-between gap-2 md:gap-3 rounded-2xl px-3 md:px-5 py-3 md:py-4 transition shadow-sm ${
                          lesson.locked
                            ? 'cursor-not-allowed border border-slate-200 bg-white/70'
                            : 'cursor-pointer bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 md:gap-4 min-w-0">
                          <div
                            className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shrink-0 transition-colors shadow-sm ${
                              lesson.locked
                                ? 'bg-slate-100 text-slate-400'
                                : isCompleted
                                  ? 'text-white'
                                  : 'text-white'
                            }`}
                            style={!lesson.locked ? (isCompleted ? { backgroundColor: '#0ea5e9' } : { backgroundColor: lessonAccentHex }) : {}}
                          >
                            {lesson.locked ? <Lock size={16} /> : isCompleted ? <CheckCircle2 size={20} /> : <Play size={18} className="ml-0.5" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] md:text-[12px] font-black uppercase tracking-wider text-slate-500 mb-0.5">
                              Lesson {index + 1}
                            </p>
                            <h3 className="font-bold text-[14px] md:text-[18px] text-[#0a1628] leading-tight line-clamp-2">{lesson.title}</h3>
                          </div>
                        </div>
                        <div className="flex items-center justify-end shrink-0">
                          <span className="inline-flex items-center gap-1 text-slate-500 text-[11px] md:text-sm font-semibold bg-slate-100/80 px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl">
                            <Clock size={12} />
                            {lesson.duration}
                          </span>
                        </div>
                      </button>

                      <div className="flex flex-wrap gap-2 md:gap-3 px-0.5 md:px-1">
                        <button type="button" className="inline-flex items-center gap-1 rounded-full bg-white px-3 md:px-4 py-1 md:py-1.5 text-[11px] md:text-[12px] font-bold shadow-sm transition hover:-translate-y-0.5" style={{ color: lessonAccentHex }}>
                          <BookOpen size={12} /> Study Materials
                        </button>
                        <button type="button" className="inline-flex items-center gap-1 rounded-full bg-white px-3 md:px-4 py-1 md:py-1.5 text-[11px] md:text-[12px] font-bold shadow-sm transition hover:-translate-y-0.5" style={{ color: lessonAccentHex }}>
                          <Bookmark size={12} /> Quiz
                        </button>
                      </div>

                      {/* Practice Activities removed from ModuleDetailView rendering */}
                    </div>
                  </motion.div>

                  {standaloneQuiz && index === standaloneInsertIndex - 1 && (
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + index * 0.03 }}
                      className="mt-4 md:mt-6 mb-4 md:mb-6"
                    >
                      <div className="flex items-center gap-2 md:gap-4 mb-4 md:mb-6">
                        <div className="flex-1 h-px bg-slate-200" />
                        <span className="text-[10px] md:text-xs font-bold text-indigo-400 uppercase tracking-widest text-center">
                          mid-module checkpoint
                        </span>
                        <div className="flex-1 h-px bg-slate-200" />
                      </div>

                      <div className="relative rounded-[1.5rem] bg-[#533ab6] p-3 md:p-5 shadow-lg overflow-hidden group transition-all hover:shadow-xl hover:-translate-y-1">
                        <div className="absolute right-2 md:right-10 top-1/2 -translate-y-1/2 text-white/5 text-[80px] md:text-[140px] font-black font-display pointer-events-none group-hover:scale-110 transition-transform duration-500">?</div>

                        <div className="relative z-10 flex flex-wrap items-center gap-3 md:gap-5">
                          <div className="w-12 h-12 md:w-14 md:h-14 rounded-[12px] md:rounded-[14px] bg-white/10 backdrop-blur-md border border-white/10 shrink-0 flex items-center justify-center shadow-inner">
                            <Target size={22} className="text-rose-400" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-[#a3b1ee] mb-0.5 md:mb-1 drop-shadow-sm">
                              COMPETENCY CHECK · General Quiz
                            </p>
                            <h3 className="font-display font-medium text-[16px] md:text-[22px] text-white leading-tight mb-1 md:mb-2 tracking-tight">
                              {standaloneQuiz.title}
                            </h3>
                            <p className="text-[11px] md:text-xs font-semibold text-white/80 flex flex-wrap items-center gap-2 md:gap-3">
                              <span className="inline-flex items-center gap-1"><PenTool size={11} /> {standaloneQuiz.questions} Qs</span>
                              <span className="inline-flex items-center gap-1"><Clock size={11} /> {standaloneQuiz.duration}</span>
                              <span className="inline-flex items-center gap-1 text-amber-300 drop-shadow-md"><Zap size={11} className="fill-amber-300" /> +50 XP</span>
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => !standaloneQuiz.locked && (setSelectedLesson({ quiz: standaloneQuiz, type: 'quiz' }), setIsInQuizMode && setIsInQuizMode(true))}
                            className={`px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-[11px] md:text-sm font-bold tracking-wider transition-all backdrop-blur-sm self-center shrink-0 ${
                              standaloneQuiz.locked
                                ? 'bg-white/5 text-white/30 border border-white/10 cursor-not-allowed'
                                : (iarCompleted && (completedQuizIds.has(standaloneQuiz.id) || standaloneQuiz.completed))
                                  ? 'bg-white/20 text-white border border-white/40 hover:bg-white/30 shadow-sm'
                                  : 'bg-transparent text-white border border-white/40 hover:bg-white/10 shadow-sm'
                            }`}
                          >
                            {(iarCompleted && (completedQuizIds.has(standaloneQuiz.id) || standaloneQuiz.completed)) ? 'REVIEW' : 'START'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </React.Fragment>
              );
            })}

            {module.lessons.length === 0 && standaloneQuiz && (
              <div className="relative rounded-[1.5rem] bg-[#533ab6] p-5 shadow-lg overflow-hidden group">
                <div className="absolute right-4 md:right-10 top-1/2 -translate-y-1/2 text-white/5 text-[140px] font-black font-display pointer-events-none group-hover:scale-110 transition-transform duration-500">?</div>
                <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 md:gap-5">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-14 h-14 rounded-[14px] bg-white/10 backdrop-blur-md border border-white/10 shrink-0 flex items-center justify-center shadow-inner">
                      <Target size={28} className="text-rose-400" />
                    </div>
                    <div>
                      <p className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-[#a3b1ee] mb-1 drop-shadow-sm">COMPETENCY CHECK · General Quiz</p>
                      <h3 className="font-display font-medium text-[20px] md:text-[22px] text-white leading-tight mb-2 tracking-tight">{standaloneQuiz.title}</h3>
                      <p className="text-xs font-semibold text-white/80 flex items-center gap-3">
                        <span className="inline-flex items-center gap-1"><PenTool size={12} /> {standaloneQuiz.questions} Qs</span>
                        <span className="inline-flex items-center gap-1"><Clock size={12} /> {standaloneQuiz.duration}</span>
                        <span className="inline-flex items-center gap-1 text-amber-300 drop-shadow-md"><Zap size={12} className="fill-amber-300" /> +50 XP</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => !standaloneQuiz.locked && (setSelectedLesson({ quiz: standaloneQuiz, type: 'quiz' }), setIsInQuizMode && setIsInQuizMode(true))}
                    className={`px-6 py-2.5 rounded-xl text-xs md:text-sm font-bold tracking-wider transition-all backdrop-blur-sm self-center shrink-0 ${
                      standaloneQuiz.locked
                        ? 'bg-white/5 text-white/30 border border-white/10 cursor-not-allowed'
: (iarCompleted && (completedQuizIds.has(standaloneQuiz.id) || standaloneQuiz.completed))
                              ? 'bg-white/20 text-white border border-white/40 hover:bg-white/30 shadow-sm'
                              : 'bg-transparent text-white border border-white/40 hover:bg-white/10 shadow-sm'
                          }`}
                        >
                          {(iarCompleted && (completedQuizIds.has(standaloneQuiz.id) || standaloneQuiz.completed)) ? 'REVIEW' : 'START'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleDetailView;
