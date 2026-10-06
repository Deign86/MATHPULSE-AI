import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Button } from '../components/ui/button';
import { 
  X, 
  Clock, 
  Check,
  CheckCircle, 
  ChevronRight, 
  Maximize2, 
  Minimize2,
  Trophy, 
  Target,
  Zap,
  Brain,
  Sparkles
} from 'lucide-react';
import {
  submitDiagnostic,
  type DiagnosticQuestion,
  type DiagnosticResponseItem,
} from '../services/diagnosticService';
import MathText from '../components/MathText';

interface AssessmentPageProps {
  testId: string;
  questions: DiagnosticQuestion[];
  userName: string;
  onComplete: (result: {
    overallRisk: string;
    overallScorePercent: number;
    intervention: string;
    xpEarned: number;
    badgeUnlocked: string;
  }) => void;
  onCancel: () => void;
}

type Step = 'testing' | 'submitting' | 'results';

const AssessmentPage: React.FC<AssessmentPageProps> = ({
  testId,
  questions,
  userName,
  onComplete,
  onCancel,
}) => {
  const [step, setStep] = useState<Step>('testing');
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [responses, setResponses] = useState<DiagnosticResponseItem[]>(() => {
    try {
      const saved = sessionStorage.getItem(`mathpulse_diagnostic_responses_${testId}`);
      if (!saved) return [];
      const parsed: unknown = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      const currentQuestionIds = new Set(questions.map((question) => question.question_id));
      const matchingResponses = parsed.filter((response): response is DiagnosticResponseItem =>
        typeof response === 'object'
        && response !== null
        && 'question_id' in response
        && typeof response.question_id === 'string'
        && currentQuestionIds.has(response.question_id)
        && 'student_answer' in response
        && typeof response.student_answer === 'string'
        && 'time_spent_seconds' in response
        && typeof response.time_spent_seconds === 'number',
      );
      return matchingResponses.length === parsed.length ? matchingResponses : [];
    } catch {
      return [];
    }
  });
  const [currentIndex, setCurrentIndex] = useState(() => {
    try {
      const savedIndex = Number(sessionStorage.getItem(`mathpulse_diagnostic_current_index_${testId}`));
      return Number.isInteger(savedIndex) && savedIndex >= 0
        ? Math.min(savedIndex, Math.max(questions.length - 1, 0))
        : 0;
    } catch {
      return 0;
    }
  });
  const [answerResults, setAnswerResults] = useState<boolean[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartRef = useRef<number>(Date.now());
  const autoSkipRef = useRef(false);
  const submissionStartedRef = useRef(false);

  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex];
  const progressPct = Math.round(((currentIndex + (selectedAnswer ? 1 : 0)) / totalQuestions) * 100);

  const getTimeLimit = (difficulty: string) => {
    if (difficulty === 'easy') return 60;
    if (difficulty === 'hard') return 120;
    return 90; // medium default
  };

  // Ambient animated gradient particles
  const [orbs] = useState(Array.from({ length: 8 }, (_, i) => ({
    id: i,
    size: Math.random() * 90 + 40,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 20 + 15,
    delay: Math.random() * -20,
    color: ['bg-purple-500/10', 'bg-indigo-500/10', 'bg-violet-500/10', 'bg-sky-500/10'][Math.floor(Math.random() * 4)]
  })));

  const reduceMotion = useReducedMotion();

  useEffect(() => {
    try {
      sessionStorage.setItem(`mathpulse_diagnostic_responses_${testId}`, JSON.stringify(responses));
      sessionStorage.setItem(`mathpulse_diagnostic_current_index_${testId}`, String(currentIndex));
    } catch { /* non-fatal checkpoint storage failure */ }
  }, [testId, responses, currentIndex]);

  // Countdown timer with auto-skip
  useEffect(() => {
    const limit = getTimeLimit(currentQuestion?.difficulty || 'medium');
    questionStartRef.current = Date.now();
    autoSkipRef.current = false;
    setTimeLeft(limit);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - questionStartRef.current) / 1000);
      const remaining = Math.max(0, limit - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0 && !autoSkipRef.current) {
        autoSkipRef.current = true;
        clearInterval(timerRef.current!);
      }
    }, 250);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex]);

  // Auto-advance when time expires
  useEffect(() => {
    if (timeLeft === 0 && autoSkipRef.current && step === 'testing') {
      const timeSpentSeconds = getTimeLimit(currentQuestion?.difficulty || 'medium');
      const newResponses = [
        ...responses,
        {
          question_id: currentQuestion.question_id,
          student_answer: (selectedAnswer || '').trim().toUpperCase(),
          time_spent_seconds: timeSpentSeconds,
        },
      ];
      const newAnswerResults = [...answerResults, false];

      setAnswerResults(newAnswerResults);
      setResponses(newResponses);
      setSelectedAnswer(null);

      if (currentIndex < totalQuestions - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        handleSubmit(newResponses);
      }
    }
  }, [timeLeft]);

  // Fullscreen toggle - target the assessment container itself
  const toggleFullscreen = useCallback(() => {
    const container = document.getElementById('assessment-container');
    if (!container) return;
    
    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error('Fullscreen error:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        }).catch(err => {
          console.error('Exit fullscreen error:', err);
        });
      }
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleSelectAnswer = (letter: string) => {
    setSelectedAnswer(letter.trim().toUpperCase());
  };

  const handleNext = () => {
    if (!selectedAnswer) return;

    if (timerRef.current) clearInterval(timerRef.current);

    const timeSpentSeconds = getTimeLimit(currentQuestion?.difficulty || 'medium') - timeLeft;
    const newAnswerResults = [...answerResults, true];

    const newResponses = [
      ...responses,
      {
        question_id: currentQuestion.question_id,
        student_answer: selectedAnswer.trim().toUpperCase(),
        time_spent_seconds: timeSpentSeconds,
      },
    ];

    setAnswerResults(newAnswerResults);
    setResponses(newResponses);
    setSelectedAnswer(null);

    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleSubmit(newResponses);
    }
  };

  const handleSubmit = async (finalResponses: DiagnosticResponseItem[]) => {
    if (submissionStartedRef.current) return;
    submissionStartedRef.current = true;
    setStep('submitting');
    setError(null);

    try {
      sessionStorage.setItem('mathpulse_diagnostic_responses', JSON.stringify(finalResponses));
    } catch { /* non-fatal */ }

    try {
      const result = await submitDiagnostic(testId, finalResponses);
      sessionStorage.removeItem('mathpulse_diagnostic');
      sessionStorage.removeItem('mathpulse_diagnostic_responses');
      sessionStorage.removeItem(`mathpulse_diagnostic_responses_${testId}`);
      sessionStorage.removeItem(`mathpulse_diagnostic_current_index_${testId}`);
      setStep('results');

      // Pipeline: emit diagnostic event (fire-and-forget)
      try {
        const { emitPipelineEvent, getStudentContext } = await import('../services/pipelineService');
        const { auth } = await import('../lib/firebase');
        const ctx = getStudentContext();
        if (ctx && auth.currentUser) {
          emitPipelineEvent({
            student_id: auth.currentUser.uid,
            event_type: 'diagnostic',
            event_data: {
              overall_score: result.overall_score_percent,
              mastery_summary: result.mastery_summary,
            },
            occurred_at: new Date().toISOString(),
            class_id: ctx.classId,
            teacher_id: ctx.teacherId,
          });
        }
      } catch { /* non-critical */ }

      setTimeout(() => {
        onComplete({
          overallRisk: result.overall_risk,
          overallScorePercent: result.overall_score_percent,
          intervention: result.recommended_intervention,
          xpEarned: result.xp_earned,
          badgeUnlocked: result.badge_unlocked,
        });
      }, 3000);
    } catch (err) {
      submissionStartedRef.current = false;
      setStep('testing');
      const message = err instanceof Error ? err.message : 'Submission failed. Your answers are saved locally.';
      setError(message);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const optionLabels = ['A', 'B', 'C', 'D'];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden">
      <div
        id="assessment-container"
        className="bg-gradient-to-br from-[#f8faff] via-[#f1f5fd] to-[#f5f0fc] dark:from-[#080e1a] dark:via-[#0f172a] dark:to-[#18122c] border-0 sm:border border-white/40 dark:border-white/10 rounded-none sm:rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] w-full max-w-4xl h-full sm:h-[92dvh] md:h-[88dvh] max-h-none sm:max-h-[850px] flex flex-col relative z-10 overflow-hidden transition-all duration-300"
      >
        {/* Animated Background Lights */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-400/10 dark:bg-purple-600/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-400/10 dark:bg-sky-600/15 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          {orbs.map((orb) => (
            <motion.div
              key={orb.id}
              className={`absolute rounded-full blur-3xl ${orb.color}`}
              style={{
                width: orb.size * 1.5,
                height: orb.size * 1.5,
                left: `${orb.x}%`,
                top: `${orb.y}%`,
              }}
              animate={reduceMotion ? undefined : {
                x: [0, Math.random() * 80 - 40, 0],
                y: [0, Math.random() * 80 - 40, 0],
                scale: [1, 1.2, 1],
              }}
              transition={reduceMotion ? undefined : {
                duration: orb.duration,
                repeat: Infinity,
                ease: "linear",
                delay: orb.delay
              }}
            />
          ))}
        </div>

        {/* Header - Glossy Gradient Hero Header */}
        <motion.div 
          className="shrink-0 text-white border-b border-white/20 shadow-md relative z-10 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600"
        >
          {/* Top Title Bar */}
          <div className="flex items-center justify-between px-4 sm:px-6 pt-3.5 sm:pt-4 pb-2 sm:pb-2.5 gap-2">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white shrink-0 shadow-inner">
                <Brain size={18} className="drop-shadow-xs" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base md:text-lg font-black text-white truncate leading-tight tracking-tight drop-shadow-xs">
                  Diagnostic Assessment
                </h2>
                <p className="text-purple-100 text-[11px] sm:text-xs font-medium truncate mt-0.5 opacity-90">
                  {currentQuestion.domain} &bull; <span className="capitalize">{currentQuestion.difficulty}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={toggleFullscreen}
                className="w-8 h-8 sm:w-9 sm:h-9 bg-white/15 hover:bg-white/25 active:scale-95 rounded-xl flex items-center justify-center transition-all cursor-pointer backdrop-blur-sm border border-white/10 text-white shadow-xs"
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="w-8 h-8 sm:w-9 sm:h-9 bg-white/15 hover:bg-white/25 active:scale-95 rounded-xl flex items-center justify-center transition-all cursor-pointer backdrop-blur-sm border border-white/10 text-white shadow-xs"
                title="Exit Assessment"
                aria-label="Exit Assessment"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Stats & Question Counter Row */}
          <div className="flex items-center justify-between px-4 sm:px-6 pb-2 sm:pb-2.5">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 backdrop-blur-md border border-white/25 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full flex items-center gap-1.5 text-xs font-bold text-white shadow-2xs">
                <Zap size={13} className="text-amber-300 drop-shadow-xs shrink-0" />
                <span className="tabular-nums font-mono font-black">{responses.length} / {totalQuestions}</span>
              </div>
              <div className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-bold shadow-2xs backdrop-blur-md border ${timeLeft <= 10 ? 'bg-rose-500/90 border-rose-400 text-white animate-pulse' : 'bg-white/20 border-white/25 text-white'}`}>
                <Clock size={13} className="shrink-0 drop-shadow-xs" />
                <span className="tabular-nums font-mono font-black">{formatTime(timeLeft)}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-100 opacity-95">
              <span>Q{currentIndex + 1} of {totalQuestions}</span>
              <span className="opacity-60">&bull;</span>
              <span className="tabular-nums font-mono text-white font-black">{progressPct}%</span>
            </div>
          </div>

          {/* Segmented Progress Bar */}
          <div className="px-4 sm:px-6 pb-3 sm:pb-3.5">
            <div className="flex items-center gap-1 w-full">
              {questions.map((_, idx) => {
                let dotClass = 'bg-white/25';
                if (idx < currentIndex) {
                  dotClass = answerResults[idx] ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-rose-400 shadow-[0_0_6px_rgba(248,113,113,0.8)]';
                } else if (idx === currentIndex) {
                  dotClass = 'bg-white scale-y-125 shadow-[0_0_10px_rgba(255,255,255,0.9)]';
                }
                return (
                  <motion.div
                    key={idx}
                    className={`flex-1 h-1.5 sm:h-2 rounded-full transition-all duration-300 ${dotClass}`}
                  />
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Question Content - Centered, elevated card layout */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 relative flex flex-col justify-center items-center">
          {step === 'testing' && (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="w-full max-w-2xl flex flex-col items-center relative z-10"
              >
                {/* Question Box Card */}
                <div className="w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-5 sm:p-7 md:p-8 text-center flex flex-col items-center mb-4 sm:mb-6 relative overflow-hidden">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 dark:bg-violet-950/60 border border-violet-200/80 dark:border-violet-800/40 text-violet-700 dark:text-violet-300 text-[10px] sm:text-[11px] font-black uppercase tracking-wider mb-3.5 shadow-2xs">
                    <Sparkles size={12} className="text-violet-500" />
                    <span>Item {currentIndex + 1} &bull; {currentQuestion.domain}</span>
                  </div>

                  <h3 className="text-base sm:text-lg md:text-xl font-extrabold text-slate-900 dark:text-white leading-relaxed text-balance">
                    <MathText>{currentQuestion.question_text}</MathText>
                  </h3>

                  <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-3">
                    Select the correct answer
                  </p>
                </div>

                {/* Options Grid */}
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5">
                  {optionLabels.map((letter) => {
                    // SAFETY: trusted internal value already conforms to the asserted type.
                    const optionText = currentQuestion.options[letter as keyof typeof currentQuestion.options];
                    if (!optionText) return null;
                    const isSelected = selectedAnswer === letter;

                    let cardStyle = 'bg-white/90 dark:bg-slate-900/80 border-slate-200/90 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50/40 dark:hover:bg-violet-950/20 hover:shadow-md hover:-translate-y-0.5';
                    if (isSelected) {
                      cardStyle = 'bg-gradient-to-r from-violet-50/95 via-purple-50/70 to-indigo-50/60 dark:from-violet-950/60 dark:via-purple-950/40 dark:to-slate-900 border-violet-500 dark:border-violet-400 shadow-[0_4px_18px_rgba(139,92,246,0.18)] ring-2 ring-violet-500/20';
                    }

                    return (
                      <motion.button
                        key={letter}
                        type="button"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelectAnswer(letter)}
                        className={`w-full text-left p-3 sm:p-4 rounded-2xl border-2 transition-all duration-150 cursor-pointer flex items-center justify-between gap-3 group shadow-2xs ${cardStyle}`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Letter Badge */}
                          <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl font-black text-xs sm:text-sm shrink-0 flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-violet-600 text-white shadow-md scale-105'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-violet-100 dark:group-hover:bg-violet-900/40 group-hover:text-violet-700 dark:group-hover:text-violet-300'
                          }`}>
                            {letter}
                          </div>

                          {/* Math Option Text */}
                          <span className={`font-bold text-xs sm:text-sm md:text-base leading-snug break-words ${
                            isSelected ? 'text-violet-950 dark:text-violet-100' : 'text-slate-800 dark:text-slate-200'
                          }`}>
                            <MathText>{optionText}</MathText>
                          </span>
                        </div>

                        {/* Radio Check Circle */}
                        <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                          isSelected
                            ? 'border-violet-600 bg-violet-600 text-white shadow-xs'
                            : 'border-slate-300 dark:border-slate-600 group-hover:border-violet-400'
                        }`}>
                          {isSelected && <Check size={11} strokeWidth={3.5} />}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Footer - Frosted Glass Bottom Action Bar */}
        <div className="p-3.5 sm:p-4 md:p-5 bg-white/80 dark:bg-slate-900/85 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 shrink-0 relative z-20">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
            <div className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 truncate min-w-0 mr-2">
              {selectedAnswer ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200/70 dark:border-emerald-800/40">
                  <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                  <span>Option {selectedAnswer} selected</span>
                </span>
              ) : (
                <span className="truncate">{timeLeft <= 10 ? `Auto-skipping in ${timeLeft}s...` : 'Select an answer to continue'}</span>
              )}
            </div>

            <Button
              onClick={handleNext}
              disabled={!selectedAnswer}
              className={`font-black px-5 sm:px-7 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl flex items-center gap-2 transition-all text-xs sm:text-sm shrink-0 cursor-pointer ${
                selectedAnswer
                  ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-[0_4px_16px_rgba(124,58,237,0.35)] hover:shadow-[0_6px_22px_rgba(124,58,237,0.45)] active:scale-95'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200/60 dark:border-slate-700/60'
              }`}
            >
              <span>{currentIndex < totalQuestions - 1 ? 'Next Question' : 'Submit Assessment'}</span>
              <ChevronRight size={16} className="shrink-0" />
            </Button>
          </div>
        </div>

        {/* Submitting State Overlay */}
        {step === 'submitting' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl flex items-center justify-center z-50 rounded-none sm:rounded-3xl p-4 sm:p-8"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center p-4 sm:p-8 max-w-sm mx-auto"
            >
              <div className="mx-auto mb-4 h-12 w-12 sm:h-16 sm:w-16 rounded-full border-4 border-violet-600 border-t-transparent animate-spin" />
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2">Analyzing your results...</h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                We&apos;re evaluating your responses and building your personalized learning path.
              </p>
              {error && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl max-w-sm mx-auto">
                  <p className="text-xs sm:text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* Results State */}
        {step === 'results' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl flex items-center justify-center z-50 rounded-none sm:rounded-3xl p-4 sm:p-8 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="text-center p-4 sm:p-8 max-w-md mx-auto"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className={`w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-3xl flex items-center justify-center mb-4 shadow-xl ${
                  responses.length >= totalQuestions * 0.7 ? 'bg-gradient-to-br from-[#75D06A] to-[#6ED1CF]' : 'bg-gradient-to-br from-[#FFB356] to-[#FF8B8B]'
                }`}
              >
                {responses.length >= totalQuestions * 0.7 ? (
                  <Trophy size={40} className="text-white drop-shadow-sm" />
                ) : (
                  <Target size={40} className="text-white drop-shadow-sm" />
                )}
              </motion.div>
              
              <h2 className="text-2xl sm:text-3xl font-black font-display text-slate-900 dark:text-white mb-2">
                Assessment Complete!
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">
                Great job, {userName}! Your personalized learning path is ready.
              </p>

              <div className="bg-gradient-to-br from-[#1FA7E1]/10 to-[#6ED1CF]/10 rounded-2xl p-4 sm:p-5 mb-5 border border-sky-200/50 dark:border-sky-800/40">
                <div className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                  You answered {responses.length} questions
                </div>
                <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                  Results will be available shortly...
                </div>
              </div>

              <p className="text-xs text-slate-400 mb-2">Redirecting to dashboard...</p>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AssessmentPage;
