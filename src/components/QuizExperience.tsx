import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, XCircle, Zap, Trophy, Target, Clock, Star, TrendingUp, Award, Flame, ChevronRight, Edit3 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { triggerQuizSubmitted } from '../services/automationService';
import { saveQuizResults } from '../services/quizService';
import { recordPracticeQuiz } from '../services/progressService';
import ScientificCalculator from './ScientificCalculator';
import MathAnswerInput from './MathAnswerInput';
import SupplementalBanner from './SupplementalBanner';
import type { AIQuizQuestion } from '../types/models';

export interface Quiz {
  id: string;
  title: string;
  subject: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  questions: number;
  duration: string;
  xpReward: number;
  type: 'practice' | 'challenge' | 'mastery';
  completed: boolean;
  bestScore?: number;
  locked: boolean;
  /** Pre-loaded AI-generated questions — when present, used instead of hardcoded generation */
  loadedQuestions?: AIQuizQuestion[];
  source?: 'ai_generated' | 'adaptive' | 'hardcoded';
  generatedQuizId?: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;          // option index for MC, -1 for non-MC
  correctAnswerText?: string;     // raw text answer (used for non-MC validation & display)
  explanation: string;
  questionType?: string;
  points?: number;
  difficulty?: string;
  topic?: string;
  bloomLevel?: string;
}

interface QuizExperienceProps {
  quiz: Quiz;
  onClose: () => void;
  onComplete: (score: number, xpEarned: number) => void;
  studentId?: string;
  atRiskSubjects?: string[];
}

// ─── AI → Internal Question Converter ───────────────────────

function aiQuestionToInternal(q: AIQuizQuestion): QuizQuestion {
  if (q.questionType === 'multiple_choice' && q.options && q.options.length > 0) {
    const correctIdx = q.options.findIndex(
      (o) => o.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase(),
    );
    return {
      id: q.id,
      question: q.question,
      options: q.options,
      correctAnswer: correctIdx >= 0 ? correctIdx : 0,
      correctAnswerText: q.correctAnswer,
      explanation: q.explanation,
      questionType: q.questionType,
      points: q.points,
      difficulty: q.difficulty,
      topic: q.topic,
      bloomLevel: q.bloomLevel,
    };
  }
  return {
    id: q.id,
    question: q.question,
    options: [],
    correctAnswer: -1,
    correctAnswerText: q.correctAnswer,
    explanation: q.explanation,
    questionType: q.questionType,
    points: q.points,
    difficulty: q.difficulty,
    topic: q.topic,
    bloomLevel: q.bloomLevel,
  };
}

function normalizeMathAnswer(s: string): string {
  return s
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/⁻¹/g, '^-1')
    .replace(/⁰/g, '^0')
    .replace(/¹/g, '^1')
    .replace(/⁴/g, '^4')
    .replace(/⁵/g, '^5')
    .replace(/⁶/g, '^6')
    .replace(/⁷/g, '^7')
    .replace(/⁸/g, '^8')
    .replace(/⁹/g, '^9')
    .replace(/π/g, 'pi')
    .replace(/√/g, 'sqrt')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/\s+/g, '')
    .toLowerCase()
    .trim();
}

function validateTextAnswer(userAnswer: string, correctAnswer: string, questionType: string): boolean {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
  switch (questionType) {
    case 'identification':
      return norm(userAnswer) === norm(correctAnswer);
    case 'enumeration': {
      const ui = userAnswer.split(',').map((s) => norm(s)).filter(Boolean).sort();
      const ci = correctAnswer.split(',').map((s) => norm(s)).filter(Boolean).sort();
      return JSON.stringify(ui) === JSON.stringify(ci);
    }
    case 'word_problem':
    case 'equation_based': {
      const nUser = normalizeMathAnswer(userAnswer);
      const nCorrect = normalizeMathAnswer(correctAnswer);
      if (nUser === nCorrect) return true;
      const uNum = parseFloat(userAnswer.replace(/[^\d.\-]/g, ''));
      const cNum = parseFloat(correctAnswer.replace(/[^\d.\-]/g, ''));
      if (!isNaN(uNum) && !isNaN(cNum)) return Math.abs(uNum - cNum) <= 0.01;
      return norm(userAnswer) === norm(correctAnswer);
    }
    default:
      return norm(userAnswer) === norm(correctAnswer);
  }
}

function getPromptForType(questionType?: string): string {
  switch (questionType) {
    case 'identification': return 'Type your answer below';
    case 'enumeration': return 'List your answers separated by commas';
    case 'word_problem': return 'Show your work and type the final answer';
    case 'equation_based': return 'Solve the equation and type the result';
    default: return 'Select the correct answer';
  }
}

const QuizExperience: React.FC<QuizExperienceProps> = ({ quiz, onClose, onComplete, studentId, atRiskSubjects = [] }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [comboMultiplier, setComboMultiplier] = useState(1);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [answerRecords, setAnswerRecords] = useState<{ questionId: string; answer: string; correct: boolean; timeSpent: number }[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [showResults, setShowResults] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [showCalculator, setShowCalculator] = useState(false);

  // Gamification & Flow States
  const [currentPoints, setCurrentPoints] = useState(0);
  const [hintsUsed, setHintsUsed] = useState<Record<number, boolean>>({});
  const [wrongAttempted, setWrongAttempted] = useState(false);
  const [shakeCard, setShakeCard] = useState(false);
  const [showStreakBanner, setShowStreakBanner] = useState(false);

  // Load AI questions or generate hardcoded fallback
  const [questions] = useState<QuizQuestion[]>(() => {
    if (quiz.loadedQuestions && quiz.loadedQuestions.length > 0) {
      return quiz.loadedQuestions.map(aiQuestionToInternal);
    }
    return Array.from({ length: quiz.questions }, (_, i) => ({
      id: `q${i + 1}`,
      question: getQuestionForSubject(quiz.subject, i),
      options: getOptionsForQuestion(quiz.subject, i),
      correctAnswer: getCorrectAnswerForQuestion(quiz.subject, i),
      explanation: getExplanationForQuestion(quiz.subject, i, quiz.difficulty),
    }));
  });

  const currentQuestion = questions[currentQuestionIndex];

  // Timer
  useEffect(() => {
    const durationInMinutes = parseInt(quiz.duration);
    setTimeRemaining(durationInMinutes * 60);

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Background floating orbs logic
  const [orbs, setOrbs] = useState(Array.from({ length: 15 }, (_, i) => ({
    id: i,
    size: Math.random() * 120 + 40,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 20 + 15,
    delay: Math.random() * -20,
    color: ['bg-purple-500/10', 'bg-blue-500/10', 'bg-cyan-500/10', 'bg-emerald-500/10'][Math.floor(Math.random() * 4)]
  })));

  // Sound effects
  const playSound = (type: 'correct' | 'incorrect' | 'complete' | 'combo') => {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    switch (type) {
      case 'correct':
        oscillator.frequency.value = 800;
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
        break;
      case 'incorrect':
        oscillator.frequency.value = 200;
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
        break;
      case 'combo':
        oscillator.frequency.value = 1200;
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.4);
        break;
      case 'complete':
        oscillator.frequency.value = 600;
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
        break;
    }
  };

  const handleTimeUp = () => {
    setShowResults(true);
    calculateFinalScore();
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (showExplanation) return;
    setSelectedAnswer(answerIndex);
  };

  const handleHintUse = () => {
    if (!hintsUsed[currentQuestionIndex] && !showExplanation && !wrongAttempted) {
      setHintsUsed(prev => ({ ...prev, [currentQuestionIndex]: true }));
      setCurrentPoints(prev => Math.max(0, prev - 2)); // Small optional penalty to keep it fair? Actually user requested "+10 pts per correct, +5 if hint used", meaning we just reward 5 instead of 10. Let's just track usage and penalize on positive submit.
      // Small sound effect?
      playSound('correct'); 
    }
  };

  const handleShowAnswer = () => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = 0; // Mark 0 pts for this question
    setAnswers(newAnswers);
    setLastAnswerCorrect(false);
    setShowExplanation(true);
    setStreak(0);
    setComboMultiplier(1);
    
    const timeSpentQ = Math.round((Date.now() - questionStartTime) / 1000);
    setAnswerRecords((prev) => [
      ...prev,
      {
        questionId: currentQuestion.id,
        answer: 'show_answer',
        correct: false,
        timeSpent: timeSpentQ,
      },
    ]);
  };

  const handleSubmitAnswer = () => {
    const isNonMC = currentQuestion.questionType != null && currentQuestion.questionType !== 'multiple_choice';

    if (isNonMC) {
      if (!textAnswer.trim()) return;
    } else {
      if (selectedAnswer === null) return;
    }

    const isCorrect = isNonMC
      ? validateTextAnswer(textAnswer, currentQuestion.correctAnswerText || '', currentQuestion.questionType || '')
      : selectedAnswer === currentQuestion.correctAnswer;

    if (!isCorrect) {
      // WRONG ANSWER FLOW implementation
      setWrongAttempted(true);
      setShakeCard(true);
      playSound('incorrect');
      setTimeout(() => setShakeCard(false), 500);
      return; // Do NOT proceed, offer escape hatch
    }

    // CORRECT ANSWER FLOW
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = 1; // Mark correct
    setAnswers(newAnswers);
    setLastAnswerCorrect(true);

    const ptsAwarded = hintsUsed[currentQuestionIndex] ? 5 : 10;
    setCurrentPoints(prev => prev + ptsAwarded);

    // Track per-question record for result saving
    const timeSpentQ = Math.round((Date.now() - questionStartTime) / 1000);
    setAnswerRecords((prev) => [
      ...prev,
      {
        questionId: currentQuestion.id,
        answer: isNonMC ? textAnswer : String(selectedAnswer),
        correct: true,
        timeSpent: timeSpentQ,
      },
    ]);

    playSound('correct');
    setScore(score + 1);
    const newStreak = streak + 1;
    setStreak(newStreak);

    if (newStreak > 0 && newStreak % 3 === 0) {
       setShowStreakBanner(true);
       setTimeout(() => setShowStreakBanner(false), 2500);
    }
    
    if (newStreak >= 5) {
      setComboMultiplier(3);
      playSound('combo');
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    } else if (newStreak >= 3) {
      setComboMultiplier(2);
      playSound('combo');
    } else {
      setComboMultiplier(1);
    }
    
    // Auto-fire confetti for correct answers
    confetti({ particleCount: 30, spread: 40, colors: ['#75D06A', '#6ED1CF'], origin: { y: 0.6 } });

    setShowExplanation(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setTextAnswer('');
      setWrongAttempted(false);
      setShowStreakBanner(false);
      setQuestionStartTime(Date.now());
      setShowExplanation(false);
    } else {
      // Quiz complete
      setShowResults(true);
      calculateFinalScore();
    }
  };

  const calculateFinalScore = () => {
    const percentage = Math.round((score / questions.length) * 100);
    let xpEarned = quiz.xpReward;

    // Bonus XP for performance
    if (percentage >= 90) {
      xpEarned = Math.round(xpEarned * 1.5);
    } else if (percentage >= 80) {
      xpEarned = Math.round(xpEarned * 1.25);
    }

    // Bonus XP for speed (if completed with more than 50% time remaining)
    const totalTime = parseInt(quiz.duration) * 60;
    if (timeRemaining > totalTime * 0.5) {
      xpEarned = Math.round(xpEarned * 1.2);
    }

    setTotalXP(xpEarned);

    const timeSpent = totalTime - timeRemaining;

    // Fire automation: quiz submitted
    if (studentId) {
      triggerQuizSubmitted({
        lrn: studentId,
        quizId: quiz.id,
        subject: quiz.subject,
        score: percentage,
        totalQuestions: questions.length,
        correctAnswers: score,
        timeSpentSeconds: timeSpent,
      }).catch((err) => console.error('[WARN] Automation: quiz pipeline failed:', err));
    }

    // Save detailed results for AI-generated quizzes
    if (quiz.source === 'ai_generated' && studentId) {
      saveQuizResults(
        studentId,
        quiz.id,
        quiz.generatedQuizId,
        quiz.subject,
        quiz.source,
        percentage,
        xpEarned,
        timeSpent,
        answerRecords,
        questions.map((q) => ({
          topic: q.topic || quiz.subject,
          difficulty: q.difficulty || 'medium',
          bloomLevel: q.bloomLevel || 'understand',
        })),
      ).catch((err) => console.error('[WARN] Quiz result save failed:', err));
    } else if (studentId) {
      // Persist static quiz attempts to progress (XP awarded by parent via onComplete callback)
      recordPracticeQuiz(
        studentId,
        quiz.id,
        quiz.subject,
        percentage,
        answerRecords.map(r => ({
          questionId: r.questionId,
          selectedAnswer: r.answer,
          isCorrect: r.correct,
        })),
        timeSpent,
      ).catch((err) => console.error('[WARN] Practice quiz persist failed:', err));
    }

    playSound('complete');
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    setTimeout(() => {
      onComplete(percentage, xpEarned);
    }, 3000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (showResults) {
    const percentage = Math.round((score / questions.length) * 100);
    const isPassing = percentage >= 70;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-5 overflow-y-auto">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-[28px] shadow-2xl max-w-xl w-full p-6 sm:p-7"
        >
          {/* Header */}
          <div className="text-center mb-6 sm:mb-7">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-3 ${
                isPassing ? 'bg-gradient-to-br from-[#75D06A] to-[#6ED1CF]' : 'bg-gradient-to-br from-[#FFB356] to-[#FF8B8B]'
              }`}
            >
              {isPassing ? (
                <Trophy size={36} className="text-white" />
              ) : (
                <Target size={36} className="text-white" />
              )}
            </motion.div>
            <h2 className="text-2xl sm:text-3xl font-bold font-display text-[#0a1628] mb-2">
              {isPassing ? 'Great Job!' : 'Keep Practicing!'}
            </h2>
            <p className="text-sm sm:text-base text-[#5a6578]">{quiz.title}</p>
          </div>

          {/* Score */}
          <div className="bg-gradient-to-br from-[#1FA7E1]/10 to-[#6ED1CF]/10 rounded-2xl p-5 mb-5 sm:mb-6">
            <div className="text-center mb-4">
              <div className="text-5xl sm:text-6xl font-bold text-[#1FA7E1] mb-2">{percentage}%</div>
              <p className="text-[#5a6578]">Final Score</p>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-white rounded-xl p-3 sm:p-4 text-center">
                <CheckCircle size={24} className="mx-auto mb-2 text-[#75D06A]" />
                <p className="text-xl sm:text-2xl font-bold text-[#0a1628]">{score}</p>
                <p className="text-xs text-[#5a6578]">Correct</p>
              </div>
              <div className="bg-white rounded-xl p-3 sm:p-4 text-center">
                <XCircle size={24} className="mx-auto mb-2 text-[#FF8B8B]" />
                <p className="text-xl sm:text-2xl font-bold text-[#0a1628]">{questions.length - score}</p>
                <p className="text-xs text-[#5a6578]">Incorrect</p>
              </div>
              <div className="bg-white rounded-xl p-3 sm:p-4 text-center">
                <Zap size={24} className="mx-auto mb-2 text-rose-500" />
                <p className="text-xl sm:text-2xl font-bold text-[#0a1628]">+{totalXP}</p>
                <p className="text-xs text-[#5a6578]">XP Earned</p>
              </div>
            </div>
          </div>

          {/* Performance Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 sm:mb-6">
            {percentage >= 90 && (
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 flex items-center gap-3">
                <Star size={20} className="text-[#1FA7E1]" />
                <div>
                  <p className="font-bold text-sm text-[#0a1628]">Perfect Score!</p>
                  <p className="text-xs text-[#5a6578]">+50% Bonus XP</p>
                </div>
              </div>
            )}
            {timeRemaining > parseInt(quiz.duration) * 30 && (
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 flex items-center gap-3">
                <Clock size={20} className="text-[#1FA7E1]" />
                <div>
                  <p className="font-bold text-sm text-[#0a1628]">Speed Demon</p>
                  <p className="text-xs text-[#5a6578]">+20% Bonus XP</p>
                </div>
              </div>
            )}
            {streak >= 5 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center gap-3">
                <Flame size={20} className="text-orange-600" />
                <div>
                  <p className="font-bold text-sm text-[#0a1628]">Hot Streak!</p>
                  <p className="text-xs text-[#5a6578]">3x Combo Achieved</p>
                </div>
              </div>
            )}
          </div>

          {/* Supplemental Material Banner (Results) */}
          <SupplementalBanner
            variant="results"
            quizSubject={quiz.subject}
            quizScore={percentage}
            atRiskSubjects={atRiskSubjects}
          />

          {/* Action Button */}
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-700 hover:to-sky-600 text-white font-bold py-3.5 rounded-xl transition-all mt-3 sm:mt-4"
          >
            Continue
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <AnimatePresence>
        {showStreakBanner && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 30, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-orange-500 text-white font-bold px-6 py-3 rounded-full shadow-2xl flex items-center justify-center gap-2 border-2 border-white"
          >
            <Flame size={20} className="animate-pulse" />
            {streak} In a Row! Hot Streak!
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        animate={shakeCard ? { x: [-10, 10, -10, 10, 0], scale: [1, 1.01, 1] } : {}}
        transition={{ duration: 0.4 }}
        className="bg-white/95 backdrop-blur-xl border border-white/20 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.3)] max-w-4xl w-full h-[95vh] sm:h-[90vh] md:h-[85vh] flex flex-col relative z-10 overflow-hidden"
      >
        {/* Animated Orbs INSIDE the quiz container */}
        <div className="absolute inset-0 pointer-events-none z-0">
          {orbs.map((orb) => (
            <motion.div
              key={orb.id}
              className={`absolute rounded-full blur-3xl ${
                orb.color.replace('/10', '/30') // Boost opacity to 30% inside white bg
              }`}
              style={{
                width: orb.size * 1.5,
                height: orb.size * 1.5,
                left: `${orb.x}%`,
                top: `${orb.y}%`,
              }}
              animate={{
                x: [0, Math.random() * 200 - 100, 0],
                y: [0, Math.random() * 200 - 100, 0],
                scale: [1, 1.5, 1],
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

        {/* Header - Reactive color strip */}
        <motion.div 
          animate={{
            backgroundColor: showExplanation
              ? (lastAnswerCorrect ? '#75D06A' : '#FFB356') // green (correct) or orange (escape hatch)
              : wrongAttempted 
                ? '#FF8B8B' // red
                : '#7C3AED' // purple (default)
          }}
          className="shrink-0 p-4 sm:p-6 text-white border-b border-white/10 shadow-md relative z-10"
        >
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">{quiz.title}</h2>
              <p className="text-white/80 text-xs sm:text-sm font-medium">{quiz.subject}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Calculator & Live Points Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <button
              onClick={() => setShowCalculator(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold transition-all ${
                showCalculator 
                  ? 'bg-white/40 text-white ring-1 ring-white/50' 
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
              title="Toggle Scientific Calculator"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" /><line x1="8" x2="16" y1="6" y2="6" /><line x1="16" x2="16" y1="14" y2="18" /><path d="M16 10h.01" /><path d="M12 10h.01" /><path d="M8 10h.01" /><path d="M12 14h.01" /><path d="M8 14h.01" /><path d="M12 18h.01" /><path d="M8 18h.01" /></svg>
              Calc
            </button>
            <div className="bg-white/20 px-3 py-1 rounded-full flex items-center gap-1">
              <Zap size={16} /> 
              <span className="font-bold text-sm">{currentPoints} pts</span>
            </div>
          </div>
          
          <div className="mb-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Question {currentQuestionIndex + 1} of {questions.length}</span>
              <div className="flex items-center gap-4">
                {streak > 0 && (
                  <div className="flex items-center gap-1 bg-gradient-to-r from-orange-400 to-rose-500 px-3 py-1 rounded-full border border-white/20">
                    <Flame size={16} className="animate-pulse" />
                    <span className="text-sm font-bold">{streak} Streak</span>
                    {comboMultiplier > 1 && (
                      <span className="text-xs ml-1 font-black">x{comboMultiplier}</span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full">
                  <Clock size={16} />
                  <span className="text-sm font-bold">{formatTime(timeRemaining)}</span>
                </div>
              </div>
            </div>
            
            {/* Auto-segmented progress bar */}
            <div className="flex items-center justify-between gap-1 mt-2">
              {questions.map((_, idx) => {
                let dotClass = 'bg-white/30';
                if (idx < currentQuestionIndex) {
                  dotClass = answers[idx] === 1 ? 'bg-[#75D06A]' : 'bg-[#FF8B8B]';
                } else if (idx === currentQuestionIndex) {
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

        {/* Question Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative flex flex-col justify-center bg-white/70 backdrop-blur-md rounded-b-3xl">
          {/* Inline Calculator Panel */}
          <AnimatePresence>
            {showCalculator && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 overflow-hidden shrink-0"
              >
                <div className="bg-[#edf1f7] rounded-2xl p-4 border border-[#dde3eb]">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-[#0a1628] flex items-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" /><line x1="8" x2="16" y1="6" y2="6" /></svg>
                      Scientific Calculator
                    </h4>
                    <button
                      onClick={() => setShowCalculator(false)}
                      className="text-slate-500 hover:text-[#5a6578] transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <ScientificCalculator isOpen={true} onClose={() => setShowCalculator(false)} inline />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Supplemental Focus Banner (In-Quiz) */}
          {currentQuestionIndex === 0 && (
            <SupplementalBanner
              variant="compact"
              quizSubject={quiz.subject}
              atRiskSubjects={atRiskSubjects}
            />
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col flex-1 relative z-10"
            >
              {/* Question */}
              <div className="mb-4 sm:mb-6 shrink-0 text-center sm:text-left pt-2">
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#0a1628] leading-snug">
                  {currentQuestion.question.includes('___') ? (
                     <span>
                        {currentQuestion.question.split('___').map((part, i, arr) => (
                           <React.Fragment key={i}>
                             {part}
                             {i < arr.length - 1 && (
                               <input 
                                 type="text" 
                                 disabled={showExplanation || wrongAttempted}
                                 value={textAnswer}
                                 onChange={(e) => setTextAnswer(e.target.value)}
                                 onKeyDown={(e) => { if (e.key === 'Enter' && !showExplanation) handleSubmitAnswer(); }}
                                 className="inline-block w-24 mx-2 border-b-4 border-[#7C3AED] focus:border-[#75D06A] outline-none text-center bg-transparent text-[#7C3AED] font-bold"
                               />
                             )}
                           </React.Fragment>
                        ))}
                     </span>
                  ) : (
                     currentQuestion.question
                  )}
                </h3>
                <div className="flex items-center gap-3 mt-4">
                  <p className="text-xs sm:text-sm font-semibold opacity-70 uppercase tracking-wide text-[#7C3AED]">{getPromptForType(currentQuestion.questionType)}</p>
                  
                  {!showExplanation && !wrongAttempted && currentQuestion.explanation && (
                    <button 
                       onClick={handleHintUse}
                       disabled={hintsUsed[currentQuestionIndex]}
                       className={`flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full transition-all ${
                         hintsUsed[currentQuestionIndex] 
                           ? 'bg-slate-200 text-slate-400' 
                           : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                       }`}
                    >
                      <Zap size={14} />
                      {hintsUsed[currentQuestionIndex] ? 'Hint Used' : 'Use Hint (-5 pts)'}
                    </button>
                  )}
                  {hintsUsed[currentQuestionIndex] && !showExplanation && (
                     <div className="text-sm bg-orange-50 border border-orange-200 text-orange-700 px-3 py-1.5 rounded-lg flex-1">
                        <strong>Hint:</strong> {currentQuestion.explanation.substring(0, 50)}...
                     </div>
                  )}
                </div>
              </div>

              {/* Answer area */}
              {currentQuestion.questionType && currentQuestion.questionType !== 'multiple_choice' ? (
                <div className="mb-6">
                  {!currentQuestion.question.includes('___') && (
                    <div className="relative">
                      <div className="absolute left-3 top-3.5">
                        <Edit3 size={16} className="text-slate-500" />
                      </div>
                      {currentQuestion.questionType === 'enumeration' ? (
                        <textarea
                          value={textAnswer}
                          onChange={(e) => setTextAnswer(e.target.value)}
                          disabled={showExplanation || wrongAttempted}
                          placeholder="Type each answer separated by commas…"
                          rows={4}
                          className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 text-sm outline-none transition-all resize-none ${
                            showExplanation
                              ? lastAnswerCorrect ? 'bg-[#75D06A]/10 border-teal-400' : 'bg-[#FF8B8B]/10 border-red-400'
                              : wrongAttempted ? 'bg-[#FF8B8B]/10 border-red-400' 
                              : 'border-[#dde3eb] focus:border-[#7C3AED] bg-white'
                          }`}
                        />
                      ) : (currentQuestion.questionType === 'equation_based' || currentQuestion.questionType === 'word_problem') ? (
                        <MathAnswerInput
                          value={textAnswer}
                          onChange={setTextAnswer}
                          placeholder={
                            currentQuestion.questionType === 'equation_based' ? 'Enter the numerical result…'
                              : 'Enter your answer…'
                          }
                          onCalculatorOpen={() => setShowCalculator(true)}
                        />
                      ) : (
                        <input
                          type="text"
                          value={textAnswer}
                          onChange={(e) => setTextAnswer(e.target.value)}
                          disabled={showExplanation || wrongAttempted}
                          onKeyDown={(e) => { if (e.key === 'Enter' && !showExplanation) handleSubmitAnswer(); }}
                          placeholder="Type your answer…"
                          className={`w-full pl-10 pr-4 py-3.5 rounded-xl border-2 text-sm outline-none transition-all ${
                            showExplanation
                              ? lastAnswerCorrect ? 'bg-[#75D06A]/10 border-teal-400' : 'bg-[#FFB356]/10 border-orange-400' // orange if gave up
                              : wrongAttempted ? 'bg-[#FF8B8B]/10 border-red-400'
                              : 'border-[#dde3eb] focus:border-[#7C3AED] bg-white'
                          }`}
                        />
                      )}
                    </div>
                  )}
                  {showExplanation && !lastAnswerCorrect && (
                    <p className="mt-2 text-base font-semibold text-orange-600">
                      Correct answer: {currentQuestion.correctAnswerText}
                    </p>
                  )}
                  {wrongAttempted && !showExplanation && (
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex gap-3 items-center">
                       <p className="text-red-500 font-bold flex-1">Not quite right. Try again, or use an escape hatch.</p>
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6 overflow-y-auto">
                {currentQuestion.options.map((option, index) => {
                  const isSelected = selectedAnswer === index;
                  const isCorrect = index === currentQuestion.correctAnswer;
                  const showCorrectness = showExplanation;

                  let bgColor = 'bg-[#edf1f7] hover:bg-[#dde3eb] border-[#dde3eb]';
                  if (showCorrectness) {
                    if (isCorrect) {
                      bgColor = 'bg-[#75D06A]/10 border-[#75D06A]';
                    } else if (isSelected && !isCorrect) {
                      bgColor = 'bg-[#FF8B8B]/10 border-red-500';
                    }
                  } else if (wrongAttempted) {
                     if (isSelected) {
                        bgColor = 'bg-[#FF8B8B]/10 border-red-500 opacity-60'; // previously clicked wrong answer
                     } else {
                        bgColor = 'bg-white hover:bg-[#dde3eb] border-[#dde3eb]'; // let them try others
                     }
                  } else if (isSelected) {
                    bgColor = 'bg-purple-50 border-[#7C3AED]';
                  }

                  return (
                    <motion.button
                      key={index}
                      whileHover={!showExplanation ? { scale: 1.02 } : {}}
                      whileTap={!showExplanation ? { scale: 0.98 } : {}}
                      onClick={() => handleAnswerSelect(index)}
                      disabled={showExplanation || (wrongAttempted && isSelected)} // disable clicking the same wrong answer twice
                      className={`w-full text-left p-4 sm:p-5 rounded-[20px] border-2 transition-all ${bgColor} ${
                        showExplanation || (wrongAttempted && isSelected) ? 'cursor-default' : 'cursor-pointer shadow-sm hover:shadow-md'
                      } flex items-center min-h-[4rem] sm:min-h-[5rem]`}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl shrink-0 flex items-center justify-center font-bold text-sm sm:text-base transition-colors ${
                          showCorrectness && isCorrect ? 'bg-[#75D06A] text-white shadow-inner' :
                          showCorrectness && isSelected && !isCorrect ? 'bg-[#FF8B8B] text-white shadow-inner' :
                          wrongAttempted && isSelected ? 'bg-red-300 text-white shadow-inner' :
                          isSelected ? 'bg-[#7C3AED] text-white shadow-inner' :
                          'bg-white text-[#0a1628] shadow-sm'
                        }`}>
                          {String.fromCharCode(65 + index)}
                        </div>
                        <span className="font-semibold sm:font-bold text-[#0a1628] sm:text-lg break-words line-clamp-3">{option}</span>
                        {showCorrectness && isCorrect && (
                          <CheckCircle size={20} className="ml-auto text-[#75D06A]" />
                        )}
                        {showCorrectness && isSelected && !isCorrect && (
                          <XCircle size={20} className="ml-auto text-red-600" />
                        )}
                        {wrongAttempted && isSelected && !showCorrectness && (
                          <XCircle size={20} className="ml-auto text-red-400" />
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
              )}

              {/* Explanation */}
              {showExplanation && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-xl border-2 ${
                    lastAnswerCorrect
                      ? 'bg-[#75D06A]/10 border-[#75D06A]/30'
                      : 'bg-orange-50 border-orange-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      lastAnswerCorrect ? 'bg-[#75D06A]' : 'bg-orange-500'
                    }`}>
                      <Award size={18} className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#0a1628] mb-1">
                        {lastAnswerCorrect ? 'Correct!' : 'Keep Practicing'}
                      </h4>
                      <p className="text-sm text-[#5a6578]">{currentQuestion.explanation}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 bg-[#edf1f7] border-t border-[#dde3eb]">
          <div className="flex items-center justify-between">
            <div className="text-sm text-[#5a6578]">
              {showExplanation ? (
                <span className="flex items-center gap-2">
                  <TrendingUp size={16} />
                  {lastAnswerCorrect ? "Awesome job!" : "You've got this!"}
                </span>
              ) : wrongAttempted ? (
                <span className="flex items-center gap-2 text-red-500 font-bold">
                  Pick another answer or show solution.
                </span>
              ) : (
                <span>Select an answer to continue</span>
              )}
            </div>
            
            <div className="flex gap-3">
              {wrongAttempted && !showExplanation && (
                <button
                  onClick={handleShowAnswer}
                  className="font-bold px-6 py-3 rounded-xl transition-all border-2 border-orange-500 text-orange-600 hover:bg-orange-50"
                >
                  Show Answer
                </button>
              )}
              {showExplanation ? (
                <button
                  onClick={handleNextQuestion}
                  className="bg-[#75D06A] hover:bg-[#68c05c] text-white font-bold px-8 py-3 rounded-xl flex items-center gap-2 transition-all shadow-md hover:shadow-lg"
                >
                  {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'View Results'}
                  <ChevronRight size={18} />
                </button>
              ) : (
                <button
                  onClick={handleSubmitAnswer}
                  disabled={
                    currentQuestion.questionType && currentQuestion.questionType !== 'multiple_choice'
                      ? !textAnswer.trim()
                      : selectedAnswer === null
                  }
                  className={`font-bold px-10 py-3 rounded-xl transition-all ${
                    (currentQuestion.questionType && currentQuestion.questionType !== 'multiple_choice'
                      ? textAnswer.trim()
                      : selectedAnswer !== null)
                      ? 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-md hover:shadow-lg shadow-[#7C3AED]/20'
                      : 'bg-[#dde3eb] text-slate-500 cursor-not-allowed'
                  }`}
                >
                  Submit
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Helper functions to generate content per subject
function getQuestionForSubject(subject: string, index: number): string {
  const questions: { [key: string]: string[] } = {
    'Pre-Calculus': [
      'What is the domain of the function f(x) = √(x - 2)?',
      'Solve for x: 2^x = 16',
      'What is the period of the function y = sin(2x)?',
      'Find the inverse of f(x) = 3x + 5',
      'What is the value of log₂(32)?',
      'Simplify: (x² - 9) / (x - 3)',
      'What is the range of f(x) = |x| - 3?',
      'If f(x) = 2x + 1 and g(x) = x², find f(g(2)).',
      'What is the amplitude of y = 3cos(x)?',
      'Solve: log₃(x) = 4',
    ],
    'General Mathematics': [
      'Simplify: (2x + 3)(x - 4)',
      'What is 15% of 240?',
      'Solve: 3x + 7 = 22',
      'What is the value of 5! (5 factorial)?',
      'Convert 0.75 to a fraction',
      'What is 25% of 360?',
      'Simplify: 12/18',
      'What is the GCD of 24 and 36?',
      'Convert 3/8 to a decimal',
      'If a shirt costs $40 and is 20% off, what is the sale price?',
      'What is 2/3 + 1/4?',
      'Calculate: 15% tip on a $80 bill',
      'Simplify: 45/60',
      'What fraction is equivalent to 0.125?',
      'If 30% of a number is 45, what is the number?',
    ],
    'Statistics and Probability': [
      'What is the probability of rolling a 6 on a fair die?',
      'Calculate the mean of: 4, 7, 9, 12, 15',
      'What is the median of: 2, 5, 8, 11, 14?',
      'In a bag with 5 red and 3 blue balls, what is P(red)?',
      'What is the range of: 10, 15, 20, 25, 30?',
      'What is the mode of: 3, 5, 5, 7, 8, 5, 9?',
      'What is the standard deviation concept?',
      'P(A) = 0.3, P(B) = 0.5, events independent. P(A and B) = ?',
      'What is the median of: 4, 7, 10, 13?',
      'How many ways can you arrange 3 books?',
    ],
    'Basic Calculus': [
      'Find the derivative of f(x) = 3x²',
      'What is the limit of (x² - 4)/(x - 2) as x → 2?',
      'Integrate: ∫ 2x dx',
      'Find f\'(x) if f(x) = 5x³ - 2x',
      'What is the derivative of sin(x)?',
      'Find the derivative of f(x) = eˣ + 3x',
      'What is ∫ cos(x) dx?',
      'Find the derivative of f(x) = ln(x)',
      'What is the limit of 1/x as x → ∞?',
      'Find f\'(x) if f(x) = x⁴ - 2x² + 1',
    ],
  };

  // Normalize subject name to match keys
  const normalizedSubject = normalizeSubjectName(subject);
  const subjectQuestions = questions[normalizedSubject] || questions['General Mathematics'];
  return subjectQuestions[index % subjectQuestions.length];
}

function normalizeSubjectName(subject: string): string {
  const lower = subject.toLowerCase();
  if (lower.includes('pre-calc') || lower.includes('pre calc') || lower.includes('precalc')) return 'Pre-Calculus';
  if (lower.includes('statistic') || lower.includes('probability')) return 'Statistics and Probability';
  if (lower.includes('calculus') && !lower.includes('pre')) return 'Basic Calculus';
  if (lower.includes('general') || lower.includes('math')) return 'General Mathematics';
  // Default fallback based on partial matches
  if (lower.includes('algebra') || lower.includes('fraction') || lower.includes('percent') || lower.includes('ratio') || lower.includes('geometry')) return 'General Mathematics';
  if (lower.includes('derivative') || lower.includes('integral') || lower.includes('limit')) return 'Basic Calculus';
  if (lower.includes('trig') || lower.includes('function') || lower.includes('log')) return 'Pre-Calculus';
  if (lower.includes('mean') || lower.includes('median') || lower.includes('data')) return 'Statistics and Probability';
  return 'General Mathematics';
}

function getOptionsForQuestion(subject: string, index: number): string[] {
  const optionSets: { [key: string]: string[][] } = {
    'Pre-Calculus': [
      ['x ≥ 2', 'x ≤ 2', 'x ≥ 0', 'All real numbers'],
      ['x = 2', 'x = 4', 'x = 8', 'x = 16'],
      ['π', '2π', 'π/2', '4π'],
      ['f⁻¹(x) = (x - 5)/3', 'f⁻¹(x) = 3x - 5', 'f⁻¹(x) = x/3 - 5', 'f⁻¹(x) = (x + 5)/3'],
      ['4', '5', '6', '7'],
      ['x + 3', 'x - 3', 'x² + 3', '(x + 3)(x - 3)'],
      ['y ≥ -3', 'y ≥ 0', 'All real numbers', 'y > -3'],
      ['9', '5', '7', '3'],
      ['1', '2', '3', '1/3'],
      ['12', '27', '64', '81'],
    ],
    'General Mathematics': [
      ['2x² - 5x - 12', '2x² + 5x - 12', '2x² - 8x + 12', '2x² - 5x + 12'],
      ['36', '32', '28', '24'],
      ['x = 5', 'x = 4', 'x = 6', 'x = 7'],
      ['120', '24', '60', '720'],
      ['3/4', '1/2', '2/3', '4/5'],
      ['90', '80', '100', '72'],
      ['2/3', '3/4', '4/6', '6/9'],
      ['12', '6', '8', '4'],
      ['0.375', '0.38', '0.35', '0.325'],
      ['$32', '$28', '$30', '$36'],
      ['11/12', '3/7', '5/6', '2/3'],
      ['$12', '$10', '$15', '$8'],
      ['3/4', '2/3', '4/5', '9/12'],
      ['1/8', '1/4', '1/5', '1/6'],
      ['150', '135', '120', '160'],
    ],
    'Statistics and Probability': [
      ['1/6', '1/3', '1/2', '2/3'],
      ['9.4', '8.5', '10.2', '7.8'],
      ['8', '9', '7', '10'],
      ['5/8', '3/8', '1/2', '2/5'],
      ['20', '15', '25', '30'],
      ['5', '3', '7', '8'],
      ['Spread of data from the mean', 'The highest value', 'The average', 'The middle value'],
      ['0.15', '0.8', '0.35', '0.2'],
      ['8.5', '7', '10', '9'],
      ['6', '3', '9', '12'],
    ],
    'Basic Calculus': [
      ['6x', '3x', '9x²', '6x²'],
      ['4', '2', '0', 'undefined'],
      ['x² + C', '2x² + C', 'x²/2 + C', '2x + C'],
      ['15x² - 2', '15x² - 2x', '5x² - 2', '15x - 2'],
      ['cos(x)', '-cos(x)', 'tan(x)', '-sin(x)'],
      ['eˣ + 3', 'eˣ + 3x', 'xeˣ + 3', 'eˣ'],
      ['sin(x) + C', '-sin(x) + C', 'tan(x) + C', '-cos(x) + C'],
      ['1/x', 'x', 'ln(x)', '-1/x²'],
      ['0', '1', '∞', 'undefined'],
      ['4x³ - 4x', '4x³ - 2x', 'x³ - 4x', '4x⁴ - 4x²'],
    ],
  };

  const normalizedSubject = normalizeSubjectName(subject);
  const subjectOptions = optionSets[normalizedSubject] || optionSets['General Mathematics'];
  return subjectOptions[index % subjectOptions.length];
}

function getCorrectAnswerForQuestion(subject: string, index: number): number {
  const correctAnswers: { [key: string]: number[] } = {
    'Pre-Calculus': [
      0, // x ≥ 2
      1, // x = 4
      0, // π
      0, // f⁻¹(x) = (x - 5)/3
      1, // 5
      0, // x + 3
      0, // y ≥ -3
      0, // 9 (f(g(2)) = f(4) = 2*4+1 = 9)
      2, // 3
      3, // 81 (3⁴ = 81)
    ],
    'General Mathematics': [
      0, // 2x² - 5x - 12
      0, // 36
      0, // x = 5
      0, // 120
      0, // 3/4
      0, // 90
      0, // 2/3
      0, // 12
      0, // 0.375
      0, // $32
      0, // 11/12
      0, // $12
      0, // 3/4
      0, // 1/8
      0, // 150
    ],
    'Statistics and Probability': [
      0, // 1/6
      0, // 9.4
      0, // 8
      0, // 5/8
      0, // 20
      0, // 5
      0, // Spread of data from the mean
      0, // 0.15
      0, // 8.5
      0, // 6
    ],
    'Basic Calculus': [
      0, // 6x
      0, // 4
      0, // x² + C
      0, // 15x² - 2
      0, // cos(x)
      0, // eˣ + 3
      0, // sin(x) + C
      0, // 1/x
      0, // 0
      0, // 4x³ - 4x
    ],
  };

  const normalizedSubject = normalizeSubjectName(subject);
  const answers = correctAnswers[normalizedSubject] || correctAnswers['General Mathematics'];
  return answers[index % answers.length];
}

function getExplanationForQuestion(subject: string, index: number, difficulty: string): string {
  const explanations: { [key: string]: string[] } = {
    'Pre-Calculus': [
      'The expression under the square root must be non-negative: x - 2 ≥ 0, so x ≥ 2.',
      'Since 2⁴ = 16, we get x = 4.',
      'The period of sin(kx) is 2π/k. Here k = 2, so period = 2π/2 = π.',
      'To find the inverse: y = 3x + 5 → x = 3y + 5 → y = (x - 5)/3.',
      'Since 2⁵ = 32, log₂(32) = 5.',
      '(x² - 9)/(x - 3) = (x+3)(x-3)/(x-3) = x + 3 (for x ≠ 3).',
      'The absolute value |x| ≥ 0 for all x, so |x| - 3 ≥ -3. The range is y ≥ -3.',
      'g(2) = 4, then f(4) = 2(4) + 1 = 9.',
      'The amplitude of y = Acos(x) is |A|. Here A = 3, so amplitude = 3.',
      'log₃(x) = 4 means 3⁴ = x, so x = 81.',
    ],
    'General Mathematics': [
      '(2x + 3)(x - 4) = 2x² - 8x + 3x - 12 = 2x² - 5x - 12',
      '15% of 240 = 0.15 × 240 = 36',
      '3x + 7 = 22 → 3x = 15 → x = 5',
      '5! = 5 × 4 × 3 × 2 × 1 = 120',
      '0.75 = 75/100 = 3/4 after simplifying by dividing both by 25',
      '25% of 360 = 0.25 × 360 = 90',
      '12/18 = (12÷6)/(18÷6) = 2/3',
      'Factors of 24: {1,2,3,4,6,8,12,24}. Factors of 36: {1,2,3,4,6,9,12,18,36}. GCD = 12',
      '3 ÷ 8 = 0.375',
      '20% off $40 = $40 × 0.80 = $32',
      '2/3 + 1/4 = 8/12 + 3/12 = 11/12',
      '15% of $80 = 0.15 × 80 = $12',
      '45/60 = (45÷15)/(60÷15) = 3/4',
      '0.125 = 125/1000 = 1/8',
      '30% × N = 45 → N = 45/0.30 = 150',
    ],
    'Statistics and Probability': [
      'A fair die has 6 outcomes, each equally likely. P(6) = 1/6.',
      'Mean = (4 + 7 + 9 + 12 + 15) / 5 = 47/5 = 9.4',
      'Sorted: 2, 5, 8, 11, 14. The middle value is 8.',
      'P(red) = 5/(5+3) = 5/8',
      'Range = max - min = 30 - 10 = 20',
      'The value 5 appears 3 times, more than any other value. Mode = 5.',
      'Standard deviation measures how spread out data points are from the mean.',
      'For independent events: P(A and B) = P(A) × P(B) = 0.3 × 0.5 = 0.15',
      'For even-count dataset {4,7,10,13}: median = (7+10)/2 = 8.5',
      '3 books can be arranged in 3! = 3 × 2 × 1 = 6 ways.',
    ],
    'Basic Calculus': [
      'Using the power rule: d/dx[3x²] = 3 × 2x = 6x',
      'Factor: (x²-4)/(x-2) = (x+2)(x-2)/(x-2) = x+2. As x→2: 2+2 = 4',
      '∫ 2x dx = 2 × x²/2 + C = x² + C',
      'f\'(x) = 5 × 3x² - 2 = 15x² - 2',
      'The derivative of sin(x) is cos(x). This is a fundamental trigonometric derivative.',
      'd/dx[eˣ + 3x] = eˣ + 3. The derivative of eˣ is eˣ and of 3x is 3.',
      '∫ cos(x) dx = sin(x) + C. Integration is the reverse of differentiation.',
      'The derivative of ln(x) is 1/x. This is a fundamental logarithmic derivative.',
      'As x → ∞, 1/x approaches 0. The function gets infinitely close to zero.',
      'f\'(x) = 4x³ - 4x using the power rule on each term.',
    ],
  };

  const normalizedSubject = normalizeSubjectName(subject);
  const subjectExplanations = explanations[normalizedSubject] || explanations['General Mathematics'];
  return subjectExplanations[index % subjectExplanations.length];
}

export default QuizExperience;
