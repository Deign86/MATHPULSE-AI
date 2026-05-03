import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../components/ui/button';
import { ChevronRight, Clock, Loader2, CheckCircle } from 'lucide-react';
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
  const [responses, setResponses] = useState<DiagnosticResponseItem[]>([]);
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

    try {
      const result = await submitDiagnostic(testId, finalResponses);
      sessionStorage.removeItem('mathpulse_diagnostic');
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
      const message = err instanceof Error ? err.message : 'Submission failed';
      setError(message);
      setStep('testing');
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const optionLabels = ['A', 'B', 'C', 'D'];

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {step === 'testing' && (
        <div className="flex flex-col h-full max-w-2xl mx-auto w-full px-4 sm:px-6">
          {/* Header */}
          <div className="flex items-center justify-between py-4 border-b border-[#dde3eb]">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-[#5a6578]">
                Question {currentIndex + 1} of {totalQuestions}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock size={12} />
                {formatTime(timeSpent)}
              </span>
            </div>
            <button
              onClick={onCancel}
              className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors"
            >
              Cancel
            </button>
          </div>

          {/* Progress Bar */}
          <div className="h-1.5 bg-[#edf1f7] rounded-full overflow-hidden mt-3">
            <motion.div
              className="h-full bg-purple-600 rounded-full origin-left"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: progressPct / 100 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{ willChange: 'transform' }}
            />
          </div>
          <p className="text-[11px] text-slate-400 text-right mt-1">{progressPct}%</p>

          {/* Question Card */}
          <div className="flex-1 flex flex-col justify-center py-6 space-y-6">
            <div className="bg-[#edf1f7] p-5 rounded-2xl border border-[#dde3eb]">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
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
                    className={`w-full text-left p-3.5 rounded-xl border-2 transition-all font-medium text-sm flex items-center gap-3 ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50 text-[#0a1628]'
                        : 'border-[#dde3eb] hover:border-purple-400 hover:bg-purple-50/50 text-[#0a1628]'
                    } ${selectedAnswer && !isSelected ? 'opacity-50' : ''}`}
                  >
                    <span
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        isSelected
                          ? 'bg-purple-600 text-white'
                          : 'bg-white border border-[#dde3eb] text-[#5a6578]'
                      }`}
                    >
                      {letter}
                    </span>
                    <span className="flex-1">{optionText}</span>
                    {isSelected && <ChevronRight size={18} className="text-purple-600 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Next Button */}
          <div className="py-4 border-t border-[#dde3eb]">
            <Button
              onClick={handleNext}
              disabled={!selectedAnswer}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-40"
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
            className="space-y-4"
          >
            <Loader2 size={48} className="animate-spin text-purple-600 mx-auto" />
            <h2 className="text-xl font-bold text-[#0a1628]">Analyzing your results...</h2>
            <p className="text-sm text-[#5a6578] max-w-xs mx-auto">
              We&apos;re evaluating your responses and building your personalized learning path.
            </p>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
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
            <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={40} className="text-teal-600" />
            </div>
            <h2 className="text-xl font-bold text-[#0a1628]">Assessment Complete!</h2>
            <p className="text-sm text-[#5a6578] max-w-xs mx-auto">
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
