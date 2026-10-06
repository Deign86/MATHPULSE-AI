import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Button } from '../components/ui/button';
import { 
  X, 
  Clock, 
  CheckCircle, 
  ChevronRight, 
  Maximize2, 
  Minimize2,
  Trophy, 
  Target,
  Zap,
  TrendingUp
} from 'lucide-react';
import {
  submitDiagnostic,
  type DiagnosticQuestion,
  type DiagnosticResponseItem,
} from '../services/diagnosticService';

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

  // Animated orbs
  const [orbs] = useState(Array.from({ length: 10 }, (_, i) => ({
    id: i,
    size: Math.random() * 80 + 30,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 20 + 15,
    delay: Math.random() * -20,
    color: ['bg-purple-500/10', 'bg-blue-500/10', 'bg-cyan-500/10', 'bg-emerald-500/10'][Math.floor(Math.random() * 4)]
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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden">
      <div
        id="assessment-container"
        className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-0 sm:border border-white/20 dark:border-white/10 rounded-none sm:rounded-3xl shadow-2xl w-full max-w-4xl h-full sm:h-[92dvh] md:h-[88dvh] max-h-none sm:max-h-[850px] flex flex-col relative z-10 overflow-hidden transition-all duration-300"
      >
        {/* Animated Orbs Background */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          {orbs.map((orb) => (
            <motion.div
              key={orb.id}
              className={`absolute rounded-full blur-3xl ${orb.color.replace('/10', '/30')}`}
              style={{
                width: orb.size * 1.5,
                height: orb.size * 1.5,
                left: `${orb.x}%`,
                top: `${orb.y}%`,
              }}
              animate={reduceMotion ? undefined : {
                x: [0, Math.random() * 100 - 50, 0],
                y: [0, Math.random() * 100 - 50, 0],
                scale: [1, 1.3, 1],
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

        {/* Header */}
        <motion.div 
          className="shrink-0 text-white border-b border-white/10 shadow-md relative z-10 bg-[#9956DE]"
        >
          {/* Top Title Bar */}
          <div className="flex items-center justify-between px-3.5 sm:px-5 md:px-6 pt-3 sm:pt-4 pb-2 sm:pb-2.5 gap-2">
            <div className="flex-1 min-w-0 mr-2">
              <h2 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold truncate leading-tight">
                Diagnostic Assessment
              </h2>
              <p className="text-white/80 text-[11px] sm:text-xs font-medium truncate mt-0.5">
                {currentQuestion.domain} &bull; {currentQuestion.difficulty}
              </p>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={toggleFullscreen}
                className="w-8 h-8 sm:w-9 sm:h-9 bg-white/20 hover:bg-white/30 active:scale-95 rounded-xl flex items-center justify-center transition-all cursor-pointer"
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="w-8 h-8 sm:w-9 sm:h-9 bg-white/20 hover:bg-white/30 active:scale-95 rounded-xl flex items-center justify-center transition-all cursor-pointer"
                title="Exit Assessment"
                aria-label="Exit Assessment"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Stats & Question Counter Row */}
          <div className="flex items-center justify-between px-3.5 sm:px-5 md:px-6 pb-2 sm:pb-2.5">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="bg-white/20 px-2.5 py-0.5 sm:py-1 rounded-full flex items-center gap-1 text-xs sm:text-sm font-bold shadow-2xs">
                <Zap size={14} className="shrink-0" />
                <span className="tabular-nums">{responses.length} / {totalQuestions}</span>
              </div>
              <div className={`flex items-center gap-1 px-2.5 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-bold shadow-2xs ${timeLeft <= 10 ? 'bg-red-500/90 text-white animate-pulse' : 'bg-white/20'}`}>
                <Clock size={14} className="shrink-0" />
                <span className="tabular-nums">{formatTime(timeLeft)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold opacity-90">
              <span>Question {currentIndex + 1} of {totalQuestions}</span>
              <span className="opacity-70">&bull;</span>
              <span className="tabular-nums">{progressPct}%</span>
            </div>
          </div>

          {/* Segmented Progress Bar */}
          <div className="px-3.5 sm:px-5 md:px-6 pb-2.5 sm:pb-3.5">
            <div className="flex items-center gap-0.5 sm:gap-1 w-full">
              {questions.map((_, idx) => {
                let dotClass = 'bg-white/30';
                if (idx < currentIndex) {
                  dotClass = answerResults[idx] ? 'bg-[#75D06A]' : 'bg-[#FF8B8B]';
                } else if (idx === currentIndex) {
                  dotClass = 'bg-white scale-y-125 shadow-[0_0_8px_white]';
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

        {/* Question Content - Scrollable with compact layout */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 md:p-6 lg:p-8 relative flex flex-col bg-white/70 dark:bg-slate-900/70 backdrop-blur-md">
          {step === 'testing' && (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col flex-1 relative z-10"
              >
                {/* Question Card - Responsive on all screens */}
                <div className="mb-3 sm:mb-5 shrink-0">
                  <h3 className="font-extrabold text-[#0a1628] dark:text-white leading-snug sm:leading-relaxed break-words text-sm sm:text-base md:text-lg lg:text-xl">
                    {currentQuestion.question_text}
                  </h3>
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#9956DE] dark:text-purple-400 mt-1.5 sm:mt-2">
                    Select the correct answer
                  </p>
                </div>

                {/* Options - Single column on mobile, 2 columns on tablet/desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4 mt-1 sm:mt-2">
                  {optionLabels.map((letter) => {
                    // SAFETY: trusted internal value already conforms to the asserted type.
                    const optionText = currentQuestion.options[letter as keyof typeof currentQuestion.options];
                    if (!optionText) return null;
                    const isSelected = selectedAnswer === letter;

                    let bgColor = 'bg-[#edf1f7] hover:bg-[#dde3eb] border-[#dde3eb] dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:border-slate-700/80';
                    if (isSelected) {
                      bgColor = 'bg-purple-50 dark:bg-purple-950/40 border-[#9956DE] shadow-sm';
                    }

                    return (
                      <motion.button
                        key={letter}
                        type="button"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleSelectAnswer(letter)}
                        className={`w-full text-left p-2.5 sm:p-3.5 md:p-4 rounded-xl sm:rounded-2xl border-2 transition-all ${bgColor} cursor-pointer shadow-2xs hover:shadow-sm flex items-center min-h-[3rem] sm:min-h-[3.75rem] md:min-h-[4.25rem]`}
                      >
                        <div className="flex items-center gap-2 sm:gap-3 w-full min-w-0">
                          <div className={`w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-lg sm:rounded-xl shrink-0 flex items-center justify-center font-bold text-xs sm:text-sm ${
                            isSelected ? 'bg-[#9956DE] text-white shadow-inner' :
                            'bg-white dark:bg-slate-700 text-[#0a1628] dark:text-white shadow-2xs'
                          }`}>
                            {letter}
                          </div>
                          <span className="font-semibold text-[#0a1628] dark:text-slate-100 text-xs sm:text-sm md:text-base break-words flex-1 min-w-0 leading-snug">{optionText}</span>
                          {isSelected && <CheckCircle size={18} className="ml-auto text-[#9956DE] dark:text-purple-400 shrink-0" />}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 md:p-5 bg-[#edf1f7] dark:bg-slate-800/90 border-t border-[#dde3eb] dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs sm:text-sm text-[#5a6578] dark:text-slate-300 font-medium truncate min-w-0 mr-2">
              {selectedAnswer ? (
                <span className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300 font-semibold truncate">
                  <TrendingUp size={15} className="shrink-0" />
                  <span className="truncate">Ready for the next one!</span>
                </span>
              ) : (
                <span className="truncate">{timeLeft <= 10 ? `Auto-skipping in ${timeLeft}s...` : 'Select an answer to continue'}</span>
              )}
            </div>
            <Button
              onClick={handleNext}
              disabled={!selectedAnswer}
              className={`font-bold px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl flex items-center gap-1.5 sm:gap-2 transition-all shadow-md text-xs sm:text-sm shrink-0 cursor-pointer ${
                selectedAnswer
                  ? 'bg-[#9956DE] hover:bg-[#8850CE] text-white shadow-[#9956DE]/20 active:scale-95'
                  : 'bg-[#dde3eb] dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
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
              <div className="mx-auto mb-4 h-12 w-12 sm:h-16 sm:w-16 rounded-full border-4 border-[#9956DE] border-t-transparent animate-spin" />
              <h2 className="text-xl sm:text-2xl font-bold text-[#0a1628] dark:text-white mb-2">Analyzing your results...</h2>
              <p className="text-xs sm:text-sm text-[#5a6578] dark:text-slate-300 max-w-xs mx-auto leading-relaxed">
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
                className={`w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-2xl flex items-center justify-center mb-4 shadow-lg ${
                  responses.length >= totalQuestions * 0.7 ? 'bg-gradient-to-br from-[#75D06A] to-[#6ED1CF]' : 'bg-gradient-to-br from-[#FFB356] to-[#FF8B8B]'
                }`}
              >
                {responses.length >= totalQuestions * 0.7 ? (
                  <Trophy size={40} className="text-white drop-shadow-sm" />
                ) : (
                  <Target size={40} className="text-white drop-shadow-sm" />
                )}
              </motion.div>
              
              <h2 className="text-2xl sm:text-3xl font-bold font-display text-[#0a1628] dark:text-white mb-2">
                Assessment Complete!
              </h2>
              <p className="text-xs sm:text-sm text-[#5a6578] dark:text-slate-300 mb-5 leading-relaxed">
                Great job, {userName}! Your personalized learning path is ready.
              </p>

              <div className="bg-gradient-to-br from-[#1FA7E1]/10 to-[#6ED1CF]/10 rounded-2xl p-4 sm:p-5 mb-5 border border-sky-200/50 dark:border-sky-800/40">
                <div className="text-xs sm:text-sm font-semibold text-[#5a6578] dark:text-slate-300 mb-1">
                  You answered {responses.length} questions
                </div>
                <div className="text-[11px] sm:text-xs text-[#5a6578] dark:text-slate-400">
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
