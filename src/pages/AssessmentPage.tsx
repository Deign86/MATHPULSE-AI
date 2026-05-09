import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../components/ui/button';
import { Brain, ChevronRight, Clock, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
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
    // Restore saved responses on mount so refreshing mid-assessment doesn't lose progress
    try {
      const saved = sessionStorage.getItem('mathpulse_diagnostic_responses');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [timeSpent, setTimeSpent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartRef = useRef<number>(Date.now());

  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex];
  const progressPct = Math.round(((currentIndex + (selectedAnswer ? 1 : 0)) / totalQuestions) * 100);

  const startTimer = useCallback(() => {
    questionStartRef.current = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - questionStartRef.current) / 1000));
    }, 200);
  }, []);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, startTimer]);

  const handleSelectAnswer = (letter: string) => {
    if (selectedAnswer) return;
    setSelectedAnswer(letter);
  };

  const handleNext = () => {
    if (!selectedAnswer) return;

    if (timerRef.current) clearInterval(timerRef.current);

    const timeSpentSeconds = Math.floor((Date.now() - questionStartRef.current) / 1000);

    const newResponses = [
      ...responses,
      {
        question_id: currentQuestion.question_id,
        student_answer: selectedAnswer,
        time_spent_seconds: timeSpentSeconds,
      },
    ];

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

    // Backup responses before submit so a failure doesn't lose progress
    try {
      sessionStorage.setItem('mathpulse_diagnostic_responses', JSON.stringify(finalResponses));
    } catch { /* non-fatal */ }

    try {
      const result = await submitDiagnostic(testId, finalResponses);
      sessionStorage.removeItem('mathpulse_diagnostic');
      sessionStorage.removeItem('mathpulse_diagnostic_responses');
      setStep('results');

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
      // User-friendly error is already formatted by diagnosticService
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
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
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-sky-50 to-white flex flex-col">
      {step === 'testing' && (
        <div className="flex flex-col h-full max-w-2xl mx-auto w-full px-4 sm:px-6">
          {/* Header */}
          <div className="flex items-center justify-between py-4 border-b border-sky-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-sky-100 rounded-xl flex items-center justify-center">
                <Brain size={18} className="text-sky-600" />
              </div>
              <span className="text-sm font-bold text-sky-700">
                Question {currentIndex + 1} of {totalQuestions}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock size={12} />
                {formatTime(timeSpent)}
              </span>
            </div>
            <button
              onClick={onCancel}
              className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>

          {/* Progress Bar */}
          <div className="h-1.5 bg-sky-100 rounded-full overflow-hidden mt-3">
            <motion.div
              className="h-full bg-gradient-to-r from-sky-500 to-sky-600 rounded-full origin-left"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: progressPct / 100 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{ willChange: 'transform' }}
            />
          </div>
          <p className="text-[11px] text-slate-400 text-right mt-1">{progressPct}%</p>

          {/* Question Card */}
          <div className="flex-1 flex flex-col justify-center py-6 space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-sky-600 mb-2">
                {currentQuestion.domain} &bull; {currentQuestion.difficulty}
              </p>
              <h3 className="text-lg font-bold text-[#0a1628] leading-relaxed">
                {currentQuestion.question_text}
              </h3>
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 gap-2.5">
              {optionLabels.map((letter) => {
                const optionText = currentQuestion.options[letter as keyof typeof currentQuestion.options];
                if (!optionText) return null;
                const isSelected = selectedAnswer === letter;

                return (
                  <button
                    key={letter}
                    onClick={() => handleSelectAnswer(letter)}
                    disabled={!!selectedAnswer}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all font-medium text-sm flex items-center gap-3 shadow-sm ${
                      isSelected
                        ? 'border-sky-500 bg-sky-50 text-[#0a1628]'
                        : 'border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 text-[#0a1628]'
                    } ${selectedAnswer && !isSelected ? 'opacity-50' : ''}`}
                  >
                    <span
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        isSelected
                          ? 'bg-sky-500 text-white shadow-md'
                          : 'bg-white border border-slate-200 text-slate-500'
                      }`}
                    >
                      {letter}
                    </span>
                    <span className="flex-1">{optionText}</span>
                    {isSelected && <ChevronRight size={18} className="text-sky-500 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Next Button */}
          <div className="py-4 border-t border-sky-100">
            <Button
              onClick={handleNext}
              disabled={!selectedAnswer}
              className="w-full bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-40 shadow-md shadow-sky-200"
            >
              {currentIndex < totalQuestions - 1 ? 'Next Question' : 'Submit Assessment'}
            </Button>
          </div>
        </div>
      )}

      {step === 'submitting' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6 max-w-sm"
          >
            {!error ? (
              <>
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 bg-sky-100 rounded-full animate-ping opacity-75"></div>
                  <div className="relative w-20 h-20 bg-sky-100 rounded-full flex items-center justify-center">
                    <Brain size={36} className="text-sky-600" />
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#0a1628]">Analyzing your results...</h2>
                  <p className="text-sm text-slate-500 mt-2">
                    We&apos;re evaluating your responses and building your personalized learning path.
                  </p>
                </div>
                <Loader2 size={24} className="animate-spin text-sky-500 mx-auto" />
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle size={32} className="text-amber-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#0a1628]">Something went wrong</h2>
                  <p className="text-sm text-slate-500 mt-2">{error}</p>
                </div>
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={() => {
                      setError(null);
                      setStep('testing');
                    }}
                    className="bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-sky-200 flex items-center justify-center gap-2 mx-auto"
                  >
                    <RefreshCw size={16} />
                    Try Again
                  </Button>
                  <button
                    onClick={onCancel}
                    className="text-sm text-slate-400 hover:text-slate-600 font-medium transition-colors"
                  >
                    Return to dashboard
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}

{step === 'results' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="space-y-4"
          >
            <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-teal-100">
              <CheckCircle size={40} className="text-teal-600" />
            </div>
            <h2 className="text-xl font-bold text-[#0a1628]">Assessment Complete!</h2>
            <p className="text-sm text-slate-500 max-w-xs mx-auto">
              Great job, {userName}! Your personalized learning path is ready.
            </p>
            <p className="text-xs text-slate-400">Redirecting to dashboard...</p>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AssessmentPage;
