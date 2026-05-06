import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, Zap, ChevronRight, ChevronLeft, Trophy, Brain, Lightbulb, Target } from 'lucide-react';
import type { Question } from '../InteractiveLesson';

interface TryItYourselfQuizProps {
  lessonId: string;
  lessonTitle: string;
  topic: string;
  subjectId?: string;
  competencyCode?: string;
  onComplete?: (score: number, total: number) => void;
  /** Fires when quiz is finished — pass to parent for Firestore persistence and XP award */
  onQuizComplete?: (scorePercent: number) => void;
  onClose?: () => void;
}

/**
 * Inline 10-item quiz for Try It Yourself section.
 * Generates fresh questions per attempt with variance via DeepSeek.
 * Provides immediate feedback and persists score to Firestore.
 */
export const TryItYourselfQuiz: React.FC<TryItYourselfQuizProps> = ({
  lessonId,
  lessonTitle,
  topic,
  subjectId,
  competencyCode,
  onComplete,
  onQuizComplete,
  onClose,
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [answers, setAnswers] = useState<({ correct: boolean; userAnswer: string } | undefined)[]>([]);

  // Calculate score from current answers array
  const score = answers.reduce((acc, curr) => acc + (curr?.correct ? 1 : 0), 0);

  // Generate quiz on mount
  useEffect(() => {
    generateQuiz();
  }, [lessonId]);

  const generateQuiz = async () => {
    setLoading(true);
    setError(null);

    try {
      const { generateLessonQuiz } = await import('../../services/lessonQuizService');
      const generatedQuestions = await generateLessonQuiz({
        lessonId: `${lessonId}-tryit-${Date.now()}`, // Unique ID for variance
        lessonTitle,
        topic,
        subjectId,
        competencyCode,
        questionCount: 10,
      });

      if (generatedQuestions.length === 0) {
        setError('No questions available for this topic.');
        return;
      }

      setQuestions(generatedQuestions);
    } catch (err) {
      console.error('[TryItYourselfQuiz] Generation failed:', err);
      setError('Failed to generate quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = useCallback((answer: string) => {
    if (isAnswered) return;

    const currentQ = questions[currentIndex];
    const correct = answer.toLowerCase().trim() === currentQ.correctAnswer.toLowerCase().trim();

    setSelectedAnswer(answer);
    setIsAnswered(true);
    setIsCorrect(correct);

    setAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[currentIndex] = { correct, userAnswer: answer };
      return newAnswers;
    });
  }, [currentIndex, isAnswered, questions]);

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      const nextAnswer = answers[currentIndex + 1];
      if (nextAnswer) {
        setSelectedAnswer(nextAnswer.userAnswer);
        setIsAnswered(true);
        setIsCorrect(nextAnswer.correct);
      } else {
        setSelectedAnswer(null);
        setIsAnswered(false);
        setIsCorrect(false);
      }
    } else {
      // Quiz complete
      const finalScore = answers.reduce((acc, curr) => acc + (curr?.correct ? 1 : 0), 0);
      const scorePercent = Math.round((finalScore / questions.length) * 100);
      onComplete?.(finalScore, questions.length);
      onQuizComplete?.(scorePercent);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      // Restore previous answer state
      const prevAnswer = answers[currentIndex - 1];
      if (prevAnswer) {
        setSelectedAnswer(prevAnswer.userAnswer);
        setIsAnswered(true);
        setIsCorrect(prevAnswer.correct);
      } else {
        setSelectedAnswer(null);
        setIsAnswered(false);
        setIsCorrect(false);
      }
    }
  };

  const currentQ = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-12 h-12 rounded-full border-4 border-rose-400 border-t-transparent animate-spin mb-4" />
          <p className="text-slate-600 font-medium">Generating your practice quiz...</p>
          <p className="text-slate-400 text-sm mt-1">Creating 10 unique questions with variance</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
            <X className="text-rose-500" size={24} />
          </div>
          <p className="text-slate-700 font-medium mb-2">{error}</p>
          <button
            onClick={generateQuiz}
            className="px-4 py-2 bg-rose-500 text-white rounded-lg font-semibold text-sm hover:bg-rose-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!currentQ) return null;

  const isLastQuestion = currentIndex === questions.length - 1;
  const showNext = isAnswered && !isLastQuestion;
  const showFinish = isAnswered && isLastQuestion;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-500 to-orange-400 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-white">
            <Brain size={20} />
            <span className="font-bold">Practice Quiz</span>
          </div>
          <div className="text-white/90 text-sm font-semibold">
            {score}/{questions.length} correct
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-2 bg-white/30 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-white rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <div className="flex justify-between text-white/80 text-xs mt-1">
          <span>Question {currentIndex + 1} of {questions.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
      </div>

      {/* Question */}
      <div className="p-5">
        {/* Question type badge */}
        <div className="flex items-center gap-2 mb-3">
          {currentIndex < 2 && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full flex items-center gap-1">
              <Lightbulb size={12} /> Recall
            </span>
          )}
          {currentIndex >= 2 && currentIndex < 6 && (
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full flex items-center gap-1">
              <Target size={12} /> Application
            </span>
          )}
          {currentIndex >= 6 && currentIndex < 9 && (
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full flex items-center gap-1">
              <Zap size={12} /> Mixed
            </span>
          )}
          {currentIndex === 9 && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full flex items-center gap-1">
              <Brain size={12} /> Metacognitive
            </span>
          )}
          {currentQ.type === 'true-false' && (
            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full uppercase tracking-wide border border-slate-200">
              True or False
            </span>
          )}
        </div>

        <p className="text-slate-800 text-base font-medium leading-relaxed mb-5">
          {currentQ.question}
        </p>

        {/* Options */}
        <div className="space-y-2">
          {currentQ.type === 'true-false' ? (
            <div className="flex gap-3">
              <button
                onClick={() => handleAnswer('True')}
                disabled={isAnswered}
                className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${
                  isAnswered
                    ? selectedAnswer === 'True'
                      ? currentQ.correctAnswer === 'True'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-rose-500 text-white'
                      : 'bg-slate-200 text-slate-400'
                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                }`}
              >
                True
              </button>
              <button
                onClick={() => handleAnswer('False')}
                disabled={isAnswered}
                className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${
                  isAnswered
                    ? selectedAnswer === 'False'
                      ? currentQ.correctAnswer === 'False'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-rose-500 text-white'
                      : 'bg-slate-200 text-slate-400'
                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                }`}
              >
                False
              </button>
            </div>
          ) : currentQ.options ? (
            currentQ.options.map((option: string, idx: number) => (
              <motion.button
                key={idx}
                whileHover={{ scale: isAnswered ? 1 : 1.01 }}
                whileTap={{ scale: isAnswered ? 1 : 0.99 }}
                onClick={() => handleAnswer(option)}
                disabled={isAnswered}
                className={`
                  w-full p-4 rounded-xl text-left font-medium transition-all border-2
                  ${
                    isAnswered
                      ? option === currentQ.correctAnswer
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                        : option === selectedAnswer
                        ? 'bg-rose-50 border-rose-500 text-rose-700'
                        : 'bg-slate-50 border-slate-200 text-slate-500 opacity-50'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-rose-300 hover:bg-rose-50'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <span className={`
                    w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0
                    ${isAnswered && option === currentQ.correctAnswer
                      ? 'bg-emerald-500 text-white'
                      : isAnswered && option === selectedAnswer
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-200 text-slate-600'}
                  `}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="flex-1">{option}</span>
                  {isAnswered && option === currentQ.correctAnswer && (
                    <Check className="text-emerald-500" size={20} />
                  )}
                  {isAnswered && option === selectedAnswer && option !== currentQ.correctAnswer && (
                    <X className="text-rose-500" size={20} />
                  )}
                </div>
              </motion.button>
            ))
          ) : (
            /* Fill in blank */
            <div className="space-y-3">
              <input
                type="text"
                value={selectedAnswer || ''}
                onChange={(e) => !isAnswered && setSelectedAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isAnswered && selectedAnswer?.trim()) {
                    handleAnswer(selectedAnswer.trim());
                  } else if (e.key === 'Enter' && isAnswered) {
                    handleNext();
                  }
                }}
                disabled={isAnswered}
                placeholder="Type your answer and press Enter or click Submit..."
                className={`
                  w-full p-4 rounded-xl text-slate-700 font-medium border-2 transition-all
                  ${isAnswered
                    ? isCorrect
                      ? 'bg-emerald-50 border-emerald-500'
                      : 'bg-rose-50 border-rose-500'
                    : 'bg-slate-50 border-slate-200 focus:border-rose-400 focus:outline-none'}
                `}
              />
              {isAnswered ? (
                <button
                  onClick={handleNext}
                  className="w-full py-3 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-colors"
                >
                  {isLastQuestion ? 'Finish Quiz' : 'Next Question'}
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (selectedAnswer?.trim()) {
                      handleAnswer(selectedAnswer.trim());
                    }
                  }}
                  disabled={!selectedAnswer?.trim()}
                  className="w-full py-3 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Check size={16} />
                  Submit Answer
                </button>
              )}
            </div>
          )}
        </div>

        {/* Feedback */}
        <AnimatePresence>
          {isAnswered && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-4 p-4 rounded-xl ${
                isCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'
              }`}
            >
              <div className="flex items-start gap-3">
                {isCorrect ? (
                  <Check className="text-emerald-500 mt-0.5 shrink-0" size={20} />
                ) : (
                  <X className="text-rose-500 mt-0.5 shrink-0" size={20} />
                )}
                <div className="flex-1">
                  <p className={`font-bold text-sm ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {isCorrect ? 'Correct!' : 'Not quite right'}
                  </p>
                  {currentQ.explanation && (
                    <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                      {currentQ.explanation}
                    </p>
                  )}
                  {!isCorrect && (
                    <p className="text-rose-600 text-sm mt-1 font-medium">
                      Correct answer: {currentQ.correctAnswer}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        {isAnswered && (
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className={`
                flex items-center gap-1 px-4 py-2 rounded-lg font-semibold text-sm transition-colors
                ${currentIndex === 0
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-600 hover:bg-slate-100'}
              `}
            >
              <ChevronLeft size={18} />
              Previous
            </button>

            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-6 py-2.5 bg-rose-500 text-white rounded-xl font-bold text-sm hover:bg-rose-600 transition-colors shadow-md"
            >
              {isLastQuestion ? 'Finish' : 'Next'}
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Results overlay */}
      {showFinish && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-rose-400 to-orange-400 flex items-center justify-center mx-auto mb-5">
              <Trophy className="text-white" size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Quiz Complete!</h2>
            <p className="text-slate-500 text-sm mb-6">
              You got <span className="font-bold text-rose-500">{score}</span> out of <span className="font-bold">{questions.length}</span> correct
            </p>
            <div className="mb-6">
              <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-400 to-orange-400 rounded-full transition-all duration-1000"
                  style={{ width: `${(score / questions.length) * 100}%` }}
                />
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-colors"
            >
              Continue Learning
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default TryItYourselfQuiz;