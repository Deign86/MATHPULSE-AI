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
  const [isSequentialModel, setIsSequentialModel] = useState<boolean>(true);

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
      .then((h) => {
        setActiveModel(h.activeModel ?? "Qwen/Qwen3-235B-A22B");
        setIsSequentialModel(h.isSequentialModel ?? true);
      })
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
      const isSequential = isSequentialModel;

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

      setQuizQuestions((prev) => ({ ...prev, [quiz.id]: questions }));
    } catch {
      setQuizQuestions((prev) => ({ ...prev, [quiz.id]: [] }));
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
              } else if (currentIdx === module.lessons.length - 1 && module.quizzes.length > 0) {
                handleSelectQuiz(module.quizzes[0]);
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
        const isSequential = isSequentialModel;
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

                  return (
                    <React.Fragment key={lesson.id}>
                      <div
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
                        className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-md ${
                          isCompleted ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${
                          isCompleted ? 'bg-emerald-500 text-white' : 'bg-sky-500 text-white'
                        }`}>
                          {stepNum}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className={`font-bold text-sm ${isCompleted ? 'text-slate-500' : 'text-slate-800'}`}>
                            {lesson.title}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                            <Clock size={12} />
                            {lesson.duration}
                            {isCompleted ? ' · Completed' : progressPct > 0 && progressPct < 100 ? ` · ${Math.round(progressPct)}% done` : ''}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <svg width="28" height="28" viewBox="0 0 36 36" className="shrink-0">
                            <circle cx="18" cy="18" r="15" fill="none" stroke="#E2E8F0" strokeWidth="3" />
                            <circle
                              cx="18" cy="18" r="15" fill="none"
                              stroke={isCompleted ? '#75D06A' : '#1FA7E1'}
                              strokeWidth="3"
                              strokeDasharray={`${Math.round(progressPct)} ${100 - Math.round(progressPct)}`}
                              strokeDashoffset="100"
                              transform="rotate(-90 18 18)"
                            />
                          </svg>
                          <button
                            type="button"
                            className={`px-4 py-2 rounded-lg text-xs font-black tracking-wide transition-all ${
                              isCompleted
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                : 'bg-sky-500 text-white hover:bg-sky-600 shadow-sm'
                            }`}
                          >
                            {isCompleted ? 'Review' : 'Start'}
                          </button>
                        </div>
                      </div>

                      {associatedQuizzes.map((quiz, quizIdx) => {
                        const quizStepNum = quizIdx < (stepNumbers.quizzes?.length ?? 0)
                          ? (stepNumbers.quizzes[quizIdx] ?? 0)
                          : 0;
                        const quizCompleted = completedQuizIds.has(quiz.id) || quiz.completed;
                        return (
                          <div
                            key={quiz.id}
                            onClick={() => handleSelectQuiz(quiz)}
                            className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-md ml-10 ${
                              quiz.locked
                                ? 'border-slate-100 bg-slate-50/50 opacity-60'
                                : quizCompleted
                                ? 'border-purple-200 bg-purple-50/50'
                                : 'border-purple-200 bg-white hover:bg-purple-50'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                              quizCompleted ? 'bg-purple-500 text-white' : 'bg-purple-100 text-purple-600'
                            }`}>
                              <PenTool size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className={`font-bold text-sm ${quizCompleted ? 'text-purple-500' : 'text-slate-800'}`}>
                                  {quiz.title}
                                </h3>
                                {quiz.locked && <Lock size={12} className="text-slate-400" />}
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {quiz.questions} questions · {quiz.duration}
                                {quizCompleted ? ' · Completed' : ''}
                              </p>
                            </div>
                            <button
                              type="button"
                              className={`px-4 py-2 rounded-lg text-xs font-black tracking-wide transition-all ${
                                quiz.locked
                                  ? 'bg-slate-100 text-slate-400'
                                  : quizCompleted
                                  ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                  : 'bg-purple-500 text-white hover:bg-purple-600 shadow-sm'
                              }`}
                            >
                              {quiz.locked ? 'Locked' : quizCompleted ? 'Review' : 'Take Quiz'}
                            </button>
                          </div>
                        );
                      })}
                    </React.Fragment>
                  );
                })}

                {standaloneQuiz && (
                  <div
                    onClick={() => handleSelectQuiz(standaloneQuiz)}
                    className={`flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all hover:shadow-lg ml-10 ${
                      completedQuizIds.has(standaloneQuiz.id) || standaloneQuiz.completed
                        ? 'border-amber-300 bg-amber-50/50'
                        : 'border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 bg-amber-400 text-white">
                      <Trophy size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm text-slate-800">
                        Module Quiz: {standaloneQuiz.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {standaloneQuiz.questions} questions · {standaloneQuiz.duration}
                        {standaloneQuiz.completed ? ' · Completed' : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="px-4 py-2 rounded-lg text-xs font-black tracking-wide bg-amber-500 text-white hover:bg-amber-600 shadow-sm transition-all"
                    >
                      Attempt
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleDetailView;