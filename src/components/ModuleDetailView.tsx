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
import { getRagHealth, generateRagProblem } from '../services/apiService';

interface ModuleDetailViewProps {
  module: Module;
  onBack: () => void;
  onEarnXP?: (xp: number, message: string) => void;
}

const ModuleDetailView: React.FC<ModuleDetailViewProps> = ({ module, onBack, onEarnXP }) => {
  const STANDARD_LESSON_XP = 10;
  const [selectedLesson, setSelectedLesson] = useState<{ lesson: Lesson; type: 'lesson'; returnFromQuiz?: boolean } | { quiz: Quiz; type: 'quiz' } | null>(null);
  const { userProfile } = useAuth();
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<Record<string, Question[]>>({});
  const [loadingQuizId, setLoadingQuizId] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<string>("Qwen/Qwen3-235B-A22B");

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

  useEffect(() => {
    getRagHealth()
      .then((h) => setActiveModel(h.activeModel ?? "Qwen/Qwen3-235B-A22B"))
      .catch(() => {});
  }, []);

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

  const totalItems = module.lessons.length + module.quizzes.length;
  const completedItems = completedLessons + completedQuizzes;

  const getLessonProgressPercent = (lessonId: string, isCompleted: boolean) => {
    const pct = userProgress?.lessons?.[lessonId]?.score;
    if (typeof pct === 'number' && Number.isFinite(pct)) return Math.max(0, Math.min(100, pct));
    return isCompleted ? 100 : 0;
  };

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
    const explicit = module.quizzes.find((quiz) => (quiz as any).isStandalone === true || quiz.type === 'module' || /module\s+quiz|general\s+quiz/i.test(quiz.title));
    if (explicit) return explicit;
    return module.quizzes.find((quiz) => quiz.type === 'practice') ?? module.quizzes[0] ?? null;
  }, [module.quizzes]);

  const lessonActivityMap = useMemo(() => {
    const mapped = new Map<string, Quiz[]>();
    module.lessons.forEach((lesson) => {
      mapped.set(lesson.id, []);
    });
    const lessonCount = module.lessons.length;
    if (lessonCount === 0) return mapped;
    module.quizzes.forEach((quiz, index) => {
      if (standaloneQuiz?.id === quiz.id || quiz.type === 'module') return;
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
    if (module.lessons.length === 0) return 0;
    return Math.max(1, Math.ceil(module.lessons.length / 2));
  }, [module.lessons.length]);

  const buildFallbackQuestions = (quiz: Quiz): Question[] => {
    const count = Math.max(Number(quiz.questions) || 5, 5);
    return Array.from({ length: count }, (_, index) => ({
      id: index + 1,
      type: 'multiple-choice' as const,
      question: `Checkpoint question ${index + 1}: which option best matches ${module.title}?`,
      options: [module.title, 'Skip ahead', 'End session', 'Review later'],
      correctAnswer: module.title,
      explanation: `Fallback checkpoint item ${index + 1} for ${quiz.title}.`,
    }));
  };

  const loadQuestionsForQuiz = async (quiz: Quiz, topic: string) => {
    if (quizQuestions[quiz.id]) return;
    setLoadingQuizId(quiz.id);

    const subject = (module as any).subjectId ?? (module as any).subject ?? "General Mathematics";
    const quarter = (module as any).quarter
      ? parseInt(String((module as any).quarter).replace('Q', ''))
      : 1;

    const difficulties: Array<"easy" | "medium" | "hard"> = ["easy", "easy", "medium", "medium", "hard"];

    try {
      let results;
      const isSequential = activeModel.includes("235B");

      if (isSequential) {
        results = [];
        for (const difficulty of difficulties) {
          const r = await generateRagProblem({ topic, subject, quarter, difficulty });
          results.push(r);
        }
      } else {
        results = await Promise.all(
          difficulties.map((difficulty) =>
            generateRagProblem({ topic, subject, quarter, difficulty })
          )
        );
      }

      const questions: Question[] = results.map((r, i) => ({
        id: i + 1,
        question: r.problem,
        options: [],
        correctAnswer: r.solution,
        explanation: r.competencyReference,
        type: 'fill-in-blank' as const,
      }));

      setQuizQuestions((prev) => ({ ...prev, [quiz.id]: questions.length > 0 ? questions : buildFallbackQuestions(quiz) }));
    } catch {
      setQuizQuestions((prev) => ({ ...prev, [quiz.id]: buildFallbackQuestions(quiz) }));
    } finally {
      setLoadingQuizId(null);
    }
  };

  const handleSelectQuiz = async (quiz: Quiz) => {
    await loadQuestionsForQuiz(quiz, module.title);
    setSelectedLesson({ type: 'quiz', quiz });
  };

  if (selectedLesson) {
    if (selectedLesson.type === 'lesson') {
      const associatedQuiz = lessonActivityMap.get(selectedLesson.lesson.id)?.[0] ?? null;
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
              handleSelectQuiz(associatedQuiz);
            }
          }}
          onProgressUpdate={(percent) => {
            if (userProfile?.uid) {
              updateLessonProgressPercent(userProfile.uid, selectedLesson.lesson.id, percent);
            }
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
            const xpAmount = STANDARD_LESSON_XP;
            onEarnXP?.(xpAmount, `Completed "${selectedLesson.lesson.title}"`);
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
            if (goToNext) {
              const currentIdx = module.lessons.findIndex(l => l.id === selectedLesson.lesson.id);
              if (currentIdx !== -1 && currentIdx < module.lessons.length - 1) {
                setSelectedLesson({ type: 'lesson', lesson: module.lessons[currentIdx + 1] });
              } else if (currentIdx === module.lessons.length - 1 && standaloneQuiz) {
                handleSelectQuiz(standaloneQuiz);
              } else {
                setSelectedLesson(null);
              }
            } else {
              setSelectedLesson(null);
            }
          }}
        />
      );
    } else {
      if (loadingQuizId && loadingQuizId === selectedLesson.quiz.id) {
        const isSequential = activeModel.includes("235B");
        return (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#f0f0f0] gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-[#9956DE] border-t-transparent animate-spin" />
            <p className="text-slate-600 font-semibold text-sm">
              Generating practice problems from DepEd curriculum...
            </p>
            {isSequential && (
              <p className="text-slate-400 text-xs">
                Generating 5 problems one by one — this takes about 30–60 seconds.
              </p>
            )}
          </div>
        );
      }

      const questions = quizQuestions[selectedLesson.quiz.id] ?? [];
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

  const buildLessonStepNumber = () => {
    let counter = 0;
    const result: { lessons: number[]; quizzes: number[]; standaloneQuiz: number } = {
      lessons: [],
      quizzes: [],
      standaloneQuiz: 0,
    };
    module.lessons.forEach((lesson) => {
      counter++;
      result.lessons.push(counter);
      const associatedQuizzes = lessonActivityMap.get(lesson.id) || [];
      associatedQuizzes.forEach(() => {
        counter++;
        result.quizzes.push(counter);
      });
    });
    if (standaloneQuiz) {
      counter++;
      result.standaloneQuiz = counter;
    }
    return result;
  };

  const stepNumbers = buildLessonStepNumber();

  return (
    <div className="h-full overflow-y-auto scrollbar-hide px-4 sm:px-6 xl:px-10 py-6 sm:py-8 relative">
      <div className="relative mb-6 xl:mb-8 w-full sm:w-max">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/80 backdrop-blur-xl border border-slate-200/60 text-slate-600 hover:text-indigo-600 font-bold text-sm tracking-wide transition-all hover:-translate-x-1 shadow-sm hover:shadow-md"
        >
          <ArrowLeft size={18} />
          Back
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative mb-6 lg:mb-8 rounded-[2rem] ${module.accentColor} shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] shrink-0 overflow-hidden`}
      >
        <div className="absolute inset-0 bg-black/60 pointer-events-none z-0" />
        <div className="absolute inset-0 opacity-10 pointer-events-none module-detail-grid-pattern" />
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

      <div className="pb-8">
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

          <div className="relative z-10 px-4 sm:px-6 md:px-8 py-6 md:py-8">
            {module.lessons.length === 0 && module.quizzes.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-slate-500 font-medium">No lessons available for this module yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {module.lessons.map((lesson, lessonIdx) => {
                  const stepNum = stepNumbers.lessons[lessonIdx] ?? (lessonIdx + 1);
                  const isCompleted = completedLessonIds.has(lesson.id) || lesson.completed;
                  const progressPct = getLessonProgressPercent(lesson.id, isCompleted);
                  const associatedQuizzes = lessonActivityMap.get(lesson.id) || [];
                  const lessonAccentHex = MODULE_PALETTE[lessonIdx % MODULE_PALETTE.length];

                  return (
                    <React.Fragment key={lesson.id}>
                      <motion.div
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: lessonIdx * 0.05 }}
                        onClick={() => setSelectedLesson({
                          type: 'lesson',
                          lesson: {
                            ...lesson,
                            subject: (module as any).subjectId ?? (module as any).subject ?? 'General Mathematics',
                            quarter: (module as any).quarter
                              ? parseInt(String((module as any).quarter).replace('Q', ''))
                              : 1,
                          } as any,
                        })}
                        className={`relative rounded-[1.5rem] border overflow-hidden group transition-all duration-500 mb-6 cursor-pointer ${
                          lesson.locked
                            ? 'border-slate-200 opacity-65 saturate-50'
                            : 'border-slate-200/80 hover:border-slate-300 hover:shadow-[0_16px_40px_-15px_rgba(0,0,0,0.12)] hover:-translate-y-0.5'
                        } ${isCompleted ? 'bg-emerald-50/40' : 'bg-white'}`}
                      >
                        <div className="absolute top-0 left-0 right-0 h-[6px] z-20 bg-slate-100 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(2, progressPct)}%` }}
                            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.1 + lessonIdx * 0.05 }}
                            className="h-full relative"
                            style={{ backgroundColor: lessonAccentHex }}
                          />
                        </div>

                        <div className="absolute inset-0 bg-white transition-opacity duration-500 group-hover:opacity-90" style={{ backgroundImage: `linear-gradient(to right, ${lessonAccentHex}44 0%, ${lessonAccentHex}11 50%, white 100%)` }} />
                        <div className="absolute inset-0 opacity-[0.2] pointer-events-none" style={{ backgroundImage: `radial-gradient(circle at 2px 2px, ${lessonAccentHex} 1.5px, transparent 0)`, backgroundSize: '24px 24px' }} />
                        <div className="absolute -top-12 -left-10 h-40 w-40 rounded-full blur-[32px] pointer-events-none transition-transform duration-700 group-hover:scale-[1.3] group-hover:translate-x-4" style={{ backgroundColor: `${lessonAccentHex}22` }} />
                        <div className="absolute -bottom-8 right-8 h-32 w-32 rounded-full blur-2xl pointer-events-none transition-transform duration-700 group-hover:scale-125 group-hover:-translate-y-4" style={{ backgroundColor: `${lessonAccentHex}11` }} />
                        <div className="absolute right-4 top-4 opacity-10 pointer-events-none transition-all duration-500 group-hover:rotate-12 group-hover:scale-110 drop-shadow-sm" style={{ color: lessonAccentHex }}><Hash size={56} strokeWidth={1} /></div>
                        <div className="absolute right-16 bottom-5 opacity-10 pointer-events-none transition-all duration-500 group-hover:-rotate-6 group-hover:-translate-y-2 drop-shadow-sm" style={{ color: lessonAccentHex }}><BookOpen size={40} strokeWidth={1} /></div>

                        <div className="relative z-10 p-4 md:p-5 pt-6 space-y-4">
                          <button
                            type="button"
                            onClick={() => !lesson.locked && setSelectedLesson({ lesson, type: 'lesson' })}
                            className={`w-full text-left flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4 transition shadow-sm ${
                              lesson.locked
                                ? 'cursor-not-allowed border border-slate-200 bg-white/70'
                                : 'cursor-pointer bg-white hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              <div
                                className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors shadow-sm ${
                                  lesson.locked
                                    ? 'bg-slate-100 text-slate-400'
                                    : isCompleted
                                    ? 'text-white'
                                    : 'text-white'
                                }`}
                                style={!lesson.locked ? (isCompleted ? { backgroundColor: '#0ea5e9' } : { backgroundColor: lessonAccentHex }) : {}}
                              >
                                {lesson.locked ? <Lock size={18} /> : isCompleted ? <CheckCircle2 size={24} /> : <Play size={20} className="ml-0.5" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[11px] md:text-[12px] font-black uppercase tracking-wider text-slate-500 mb-0.5">
                                  Lesson {lessonIdx + 1}
                                </p>
                                <h3 className="font-bold text-[16px] md:text-[18px] text-[#0a1628] truncate">{lesson.title}</h3>
                              </div>
                            </div>
                            <div className="flex items-center justify-end">
                              <span className="inline-flex items-center gap-1.5 text-slate-500 text-xs md:text-sm font-semibold bg-slate-100/80 px-3 py-1.5 rounded-xl">
                                <Clock size={14} />
                                {lesson.duration}
                              </span>
                            </div>
                          </button>

                          <div className="flex flex-wrap gap-3 px-1">
                            <button type="button" onClick={() => !lesson.locked && setSelectedLesson({ lesson, type: 'lesson' })} className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-[12px] font-bold shadow-sm transition hover:-translate-y-0.5" style={{ color: lessonAccentHex }}>
                              <BookOpen size={14} /> Study Materials
                            </button>
                            <button type="button" onClick={() => associatedQuizzes[0] && !lesson.locked && handleSelectQuiz(associatedQuizzes[0])} className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-[12px] font-bold shadow-sm transition hover:-translate-y-0.5" style={{ color: lessonAccentHex }}>
                              <Bookmark size={14} /> Flashcards
                            </button>
                          </div>
                        </div>
                      </motion.div>

                      {standaloneQuiz && lessonIdx === standaloneInsertIndex - 1 && (
                        <motion.div
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 + lessonIdx * 0.03 }}
                          className="mt-8 mb-6"
                        >
                          <div className="flex items-center gap-4 mb-6">
                            <div className="flex-1 h-px bg-slate-200" />
                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest text-center">
                              mid-module checkpoint
                            </span>
                            <div className="flex-1 h-px bg-slate-200" />
                          </div>

                          <div
                            onClick={() => !standaloneQuiz.locked && handleSelectQuiz(standaloneQuiz)}
                            className={`relative rounded-[1.5rem] bg-[#533ab6] p-5 shadow-lg overflow-hidden group transition-all hover:shadow-xl hover:-translate-y-1 ${
                              standaloneQuiz.locked ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                            }`}
                          >
                            <div className="absolute right-4 md:right-10 top-1/2 -translate-y-1/2 text-white/5 text-[140px] font-black font-display pointer-events-none group-hover:scale-110 transition-transform duration-500">?</div>

                            <div className="relative z-10 flex flex-wrap items-center gap-4 md:gap-5">
                              <div className="w-14 h-14 rounded-[14px] bg-white/10 backdrop-blur-md border border-white/10 shrink-0 flex items-center justify-center shadow-inner">
                                <Target size={28} className="text-rose-400" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-[#a3b1ee] mb-1 drop-shadow-sm">
                                  Mid-Module Checkpoint
                                </p>
                                <h3 className="font-display font-medium text-[20px] md:text-[22px] text-white leading-tight mb-2 tracking-tight">
                                  {standaloneQuiz.title}
                                </h3>
                                <p className="text-xs font-semibold text-white/80 flex items-center gap-3 flex-wrap">
                                  <span className="inline-flex items-center gap-1"><PenTool size={12} /> {standaloneQuiz.questions} Qs</span>
                                  <span className="inline-flex items-center gap-1"><Clock size={12} /> {standaloneQuiz.duration}</span>
                                  <span className="inline-flex items-center gap-1 text-amber-300 drop-shadow-md"><Zap size={12} className="fill-amber-300" /> +50 XP</span>
                                </p>
                              </div>

                              <button
                                type="button"
                                className={`px-6 py-2.5 rounded-xl text-xs md:text-sm font-bold tracking-wider transition-all backdrop-blur-sm self-center shrink-0 ${
                                  standaloneQuiz.locked
                                    ? 'bg-white/5 text-white/30 border border-white/10 cursor-not-allowed'
                                    : (completedQuizIds.has(standaloneQuiz.id) || standaloneQuiz.completed)
                                    ? 'bg-white/20 text-white border border-white/40 hover:bg-white/30 shadow-sm'
                                    : 'bg-transparent text-white border border-white/40 hover:bg-white/10 shadow-sm'
                                }`}
                              >
                                {(completedQuizIds.has(standaloneQuiz.id) || standaloneQuiz.completed) ? 'REVIEW' : 'START'}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleDetailView;