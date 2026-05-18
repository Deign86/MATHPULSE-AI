import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [responses, setResponses] = useState<DiagnosticResponseItem[]>(() => {
    try {
      const saved = sessionStorage.getItem('mathpulse_diagnostic_responses');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [answerResults, setAnswerResults] = useState<boolean[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartRef = useRef<number>(Date.now());
  const autoSkipRef = useRef(false);

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
          student_answer: selectedAnswer || '',
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
    setSelectedAnswer(letter);
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
        student_answer: selectedAnswer,
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
    setStep('submitting');
    setError(null);

    try {
      sessionStorage.setItem('mathpulse_diagnostic_responses', JSON.stringify(finalResponses));
    } catch { /* non-fatal */ }

    try {
      const result = await submitDiagnostic(testId, finalResponses);
      sessionStorage.removeItem('mathpulse_diagnostic');
      sessionStorage.removeItem('mathpulse_diagnostic_responses');
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <div
        id="assessment-container"
        className="bg-white/95 backdrop-blur-xl border border-white/20 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.3)] w-full max-w-4xl h-[95vh] sm:h-[90vh] md:h-[85vh] flex flex-col relative z-10 overflow-hidden transition-all duration-300"
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
              animate={{
                x: [0, Math.random() * 100 - 50, 0],
                y: [0, Math.random() * 100 - 50, 0],
                scale: [1, 1.3, 1],
              }}
              transition={{
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
          className="shrink-0 text-white border-b border-white/10 shadow-md relative z-10"
          style={{ backgroundColor: '#9956DE' }}
        >
          <div className="flex items-center justify-between p-4 sm:p-5 md:p-6">
            <div className="flex-1 min-w-0 mr-2">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold truncate">Diagnostic Assessment</h2>
              <p className="text-white/80 text-xs sm:text-sm font-medium truncate">
                {currentQuestion.domain} &bull; {currentQuestion.difficulty}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleFullscreen}
                className="w-9 h-9 sm:w-10 sm:h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors"
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
              <button
                onClick={onCancel}
                className="w-9 h-9 sm:w-10 sm:h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex items-center justify-between px-4 sm:px-5 md:px-6 pb-3 sm:pb-4 md:pb-5">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 px-3 py-1 rounded-full flex items-center gap-1">
                <Zap size={16} />
                <span className="font-bold text-sm">{responses.length} / {totalQuestions}</span>
              </div>
            </div>
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${timeLeft <= 10 ? 'bg-red-500/80 animate-pulse' : 'bg-white/20'}`}>
              <Clock size={16} />
              <span className="font-bold text-sm">{formatTime(timeLeft)}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="px-4 sm:px-5 md:px-6 pb-3 sm:pb-4 md:pb-5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Question {currentIndex + 1} of {totalQuestions}</span>
              <span className="text-sm font-bold">{progressPct}%</span>
            </div>
            <div className="flex items-center gap-1">
              {questions.map((_, idx) => {
                let dotClass = 'bg-white/30';
                if (idx < currentIndex) {
                  dotClass = answerResults[idx] ? 'bg-[#75D06A]' : 'bg-[#FF8B8B]';
                } else if (idx === currentIndex) {
                  dotClass = 'bg-white scale-y-150 shadow-[0_0_8px_white]';
                }
                return (
                  <motion.div
                    key={idx}
                    className={`flex-1 h-2 rounded-full transition-all duration-300 ${dotClass}`}
                  />
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Question Content - Scrollable with compact layout */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6 lg:p-8 relative flex flex-col bg-white/70 backdrop-blur-md">
          {step === 'testing' && (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col flex-1 relative z-10"
              >
                {/* Question Card - Compact on small screens */}
                <div className="mb-4 sm:mb-6 shrink-0">
                  <h3 className="font-extrabold text-[#0a1628] leading-snug break-words text-sm sm:text-base md:text-lg lg:text-xl">
                    {currentQuestion.question_text}
                  </h3>
                  <p className="text-xs sm:text-sm font-semibold opacity-70 uppercase tracking-wide text-[#9956DE] mt-2">
                    Select the correct answer
                  </p>
                </div>

                {/* Options - Compact on small screens */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                  {optionLabels.map((letter) => {
                    const optionText = currentQuestion.options[letter as keyof typeof currentQuestion.options];
                    if (!optionText) return null;
                    const isSelected = selectedAnswer === letter;
                    const showCorrectness = !!selectedAnswer;

                    let bgColor = 'bg-[#edf1f7] hover:bg-[#dde3eb] border-[#dde3eb]';
                    if (isSelected) {
                      bgColor = 'bg-purple-50 border-[#9956DE]';
                    }

                    return (
                      <motion.button
                        key={letter}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleSelectAnswer(letter)}
                        className={`w-full text-left p-2.5 sm:p-3 md:p-4 rounded-xl border-2 transition-all ${bgColor} cursor-pointer shadow-sm hover:shadow-md flex items-center min-h-[3rem] sm:min-h-[4rem] md:min-h-[5rem]`}
                      >
                        <div className="flex items-center gap-2 sm:gap-3 w-full min-w-0">
                          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl shrink-0 flex items-center justify-center font-bold text-sm sm:text-base ${
                            isSelected ? 'bg-[#9956DE] text-white shadow-inner' :
                            'bg-white text-[#0a1628] shadow-sm'
                          }`}>
                            {letter}
                          </div>
                          <span className="font-semibold text-[#0a1628] text-xs sm:text-sm md:text-base break-words">{optionText}</span>
                          {isSelected && <CheckCircle size={18} className="ml-auto text-[#9956DE] flex-shrink-0" />}
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
        <div className="p-4 sm:p-5 md:p-6 bg-[#edf1f7] border-t border-[#dde3eb]">
          <div className="flex items-center justify-between">
            <div className="text-sm text-[#5a6578]">
              {selectedAnswer ? (
                <span className="flex items-center gap-2">
                  <TrendingUp size={16} />
                  Ready for the next one!
                </span>
              ) : (
                <span>{timeLeft <= 10 ? `Auto-skipping in ${timeLeft}s...` : 'Select an answer to continue'}</span>
              )}
            </div>
            <Button
              onClick={handleNext}
              disabled={!selectedAnswer}
              className={`font-bold px-6 py-2.5 sm:py-3 rounded-xl flex items-center gap-2 transition-all shadow-md hover:shadow-lg text-sm ${
                selectedAnswer
                  ? 'bg-[#9956DE] hover:bg-[#8850CE] text-white shadow-[#9956DE]/20'
                  : 'bg-[#dde3eb] text-slate-500 cursor-not-allowed'
              }`}
            >
              {currentIndex < totalQuestions - 1 ? 'Next Question' : 'Submit Assessment'}
              <ChevronRight size={18} />
            </Button>
          </div>
        </div>

        {/* Submitting State Overlay */}
        {step === 'submitting' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-white/95 backdrop-blur-xl flex items-center justify-center z-50 rounded-3xl"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center p-8"
            >
              <div className="mx-auto mb-4 h-16 w-16 rounded-full border-4 border-[#9956DE] border-t-transparent animate-spin" />
              <h2 className="text-2xl font-bold text-[#0a1628] mb-2">Analyzing your results...</h2>
              <p className="text-sm text-[#5a6578] max-w-xs mx-auto">
                We&apos;re evaluating your responses and building your personalized learning path.
              </p>
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg max-w-sm mx-auto">
                  <p className="text-sm text-red-700">{error}</p>
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
            className="absolute inset-0 bg-white/95 backdrop-blur-xl flex items-center justify-center z-50 rounded-3xl overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="text-center p-6 sm:p-8 max-w-md mx-auto"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4 ${
                  responses.length >= totalQuestions * 0.7 ? 'bg-gradient-to-br from-[#75D06A] to-[#6ED1CF]' : 'bg-gradient-to-br from-[#FFB356] to-[#FF8B8B]'
                }`}
              >
                {responses.length >= totalQuestions * 0.7 ? (
                  <Trophy size={48} className="text-white" />
                ) : (
                  <Target size={48} className="text-white" />
                )}
              </motion.div>
              
              <h2 className="text-3xl font-bold font-display text-[#0a1628] mb-2">
                Assessment Complete!
              </h2>
              <p className="text-[#5a6578] mb-6">
                Great job, {userName}! Your personalized learning path is ready.
              </p>

              <div className="bg-gradient-to-br from-[#1FA7E1]/10 to-[#6ED1CF]/10 rounded-2xl p-5 mb-5">
                <div className="text-sm text-[#5a6578] mb-2">
                  You answered {responses.length} questions
                </div>
                <div className="text-xs text-[#5a6578]">
                  Results will be available shortly...
                </div>
              </div>

              <p className="text-xs text-slate-400 mb-4">Redirecting to dashboard...</p>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AssessmentPage;
