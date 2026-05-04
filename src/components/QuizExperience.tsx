import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, XCircle, Zap, Trophy, Target, Clock, Star, TrendingUp, Award, Flame, ChevronRight, Edit3, Sparkles, Volume2, VolumeX, Maximize, Minimize, ChevronLeft, Heart, Key, Check, HelpCircle, RefreshCw, BookOpen } from 'lucide-react';
import { Button } from './ui/button';
import confetti from 'canvas-confetti';
import { triggerQuizSubmitted } from '../services/automationService';
import { saveQuizResults } from '../services/quizService';
import { recordPracticeQuiz } from '../services/progressService';
import ScientificCalculator from './ScientificCalculator';
import MathAnswerInput from './MathAnswerInput';
import SupplementalBanner from './SupplementalBanner';
import type { AIQuizQuestion } from '../types/models';

const quizAnimations = `
  @keyframes score-pop {
    0% { transform: scale(1); }
    50% { transform: scale(1.4); }
    100% { transform: scale(1); }
  }
  @keyframes overlay-slide-up {
    0% { transform: translateY(40px) scale(0.85); opacity: 0; }
    100% { transform: translateY(0) scale(1); opacity: 1; }
  }
  .animate-score-pop { animation: score-pop 0.5s ease-out forwards; }
  .animate-overlay-slide-up { animation: overlay-slide-up 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
`;

const RainStorm: React.FC<{ viewportHeight: number }> = ({ viewportHeight }) => (
  <div className="absolute inset-0 pointer-events-none z-[150] overflow-hidden flex justify-between bg-slate-900/5">
    {React.useMemo(() => [...Array(40)].map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      duration: 0.6 + Math.random() * 0.4,
      delay: Math.random() * 0.4,
    })), [viewportHeight]).map((drop) => (
      <motion.div
        key={drop.id}
        className="absolute w-0.5 h-16 bg-blue-400/30 rounded-full"
        style={{ left: drop.left, top: '-10%' }}
        animate={{ y: [0, viewportHeight * 1.2] }}
        transition={{
          duration: drop.duration,
          ease: 'linear',
          delay: drop.delay,
          repeat: Infinity
        }}
      />
    ))}
  </div>
);



const DrawSparks: React.FC<{ viewportHeight: number; viewportWidth: number }> = ({ viewportHeight, viewportWidth }) => {
  const sparks = React.useMemo(() => [...Array(30)].map((_, i) => ({
    id: i,
    xShift: (Math.random() - 0.5) * viewportWidth * 0.8,
    yShift: (Math.random() - 0.5) * viewportHeight * 0.8,
    scale: Math.random() * 1.5 + 0.5,
    duration: 2 + Math.random() * 1.5,
    delay: Math.random() * 0.35,
  })), [viewportHeight, viewportWidth]);

  return (
    <div className="absolute inset-0 pointer-events-none z-[150] overflow-hidden flex items-center justify-center">
      {sparks.map((spark) => (
        <motion.div
          key={spark.id}
          className="absolute w-2 h-2 bg-amber-400 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.5)]"
          style={{ left: '50%', top: '50%' }}
          animate={{
            y: [0, spark.yShift],
            x: [0, spark.xShift],
            scale: [0, spark.scale, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: spark.duration,
            ease: "easeOut",
            delay: spark.delay,
            repeat: Infinity
          }}
        />
      ))}
    </div>
  );
};

const AnimatedCounter: React.FC<{ value: number; label: string; delay?: number; icon?: React.ReactNode }> = ({ value, label, delay = 0, icon }) => {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (value <= 0) return;
    const duration = 1000;
    const steps = 30;
    const stepTime = Math.abs(Math.floor(duration / steps));
    let current = 0;

    const timeout = setTimeout(() => {
      const timer = setInterval(() => {
        current += Math.max(1, Math.floor(value / steps));
        if (current >= value) {
          setCount(value);
          clearInterval(timer);
        } else {
          setCount(current);
        }
      }, stepTime);
      return () => clearInterval(timer);
    }, delay);

    return () => clearTimeout(timeout);
  }, [value, delay]);

  if (value < 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, transform: 'translateX(-20px)' }}
      animate={{ opacity: 1, transform: 'translateX(0)' }}
      transition={{ delay: delay / 1000, duration: 0.5 }}
      className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl p-3"
    >
      <div className="flex items-center gap-3 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
        {icon}
        {label}
      </div>
      <div className="text-xl font-black text-purple-600 tabular-nums">
        +{count}
      </div>
    </motion.div>
  );
};

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
  const [userRequestedExplanation, setUserRequestedExplanation] = useState(false);
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
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: 1280, height: 720 });

  useEffect(() => {
    const handleResize = () => setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Gamification & Flow States
  const [currentPoints, setCurrentPoints] = useState(0);
  const [eliminatedByHint, setEliminatedByHint] = useState<Record<number, string[]>>({});
  const [wrongAttempted, setWrongAttempted] = useState(false);
  const [shakeCard, setShakeCard] = useState(false);
  const [showRoundResult, setShowRoundResult] = useState(false);
  const [keysCount, setKeysCount] = useState(5);
  const [heartsCount, setHeartsCount] = useState(15);
  const [livesRanOutAt, setLivesRanOutAt] = useState<number | null>(null);
  const [showNoLivesModal, setShowNoLivesModal] = useState(false);
  const [nextHeartCountdown, setNextHeartCountdown] = useState(15 * 60 * 1000);
  const [failedOptions, setFailedOptions] = useState<number[]>([]);
   const [viewIndex, setViewIndex] = useState(0);
   const [achievementPill, setAchievementPill] = useState<'streak' | 'multiplier2' | 'multiplier3' | null>(null);

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
    const durationInMinutes = parseInt(quiz.duration) || 10; // Default to 10 minutes if invalid
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

  // Detect when hearts hit 0
  useEffect(() => {
    if (heartsCount === 0 && !livesRanOutAt) {
      setLivesRanOutAt(Date.now());
      setShowNoLivesModal(true);
    }
  }, [heartsCount, livesRanOutAt]);

  // Countdown timer for next heart
  useEffect(() => {
    if (!showNoLivesModal || !livesRanOutAt) return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - livesRanOutAt;
      const remaining = Math.max(0, 15 * 60 * 1000 - elapsed);
      setNextHeartCountdown(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, [showNoLivesModal, livesRanOutAt]);

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

  const handleHintUse = () => {
    if (keysCount <= 0 || showExplanation) return;
    
    const alreadyEliminated = eliminatedByHint[currentQuestionIndex] || [];
    const wrongChoices = currentQuestion.options
      .filter(opt => opt !== currentQuestion.correctAnswerText)
      .filter(opt => !alreadyEliminated.includes(opt));
    
    if (wrongChoices.length === 0) return;
    
    const randomWrong = wrongChoices[Math.floor(Math.random() * wrongChoices.length)];
    setEliminatedByHint(prev => ({
      ...prev,
      [currentQuestionIndex]: [...alreadyEliminated, randomWrong]
    }));
    setKeysCount(k => Math.max(0, k - 1));
    playSound('correct');
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

  const handleAnswerSelect = (idx: number) => {
    if (showExplanation) return;
    if (isCurrentlyAnswered) return;
    setSelectedAnswer(idx);
    // Auto submit on selection for Practice Center
    setTimeout(() => {
      handleSubmitAnswer(idx);
    }, 150);
  };

  const handleSubmitAnswer = (forcedAnswerIdx?: number) => {
    const isNonMC = currentQuestion.questionType != null && currentQuestion.questionType !== 'multiple_choice';
    const activeAnswerIdx = forcedAnswerIdx !== undefined ? forcedAnswerIdx : selectedAnswer;

    if (isNonMC) {
      if (!textAnswer.trim()) return;
    } else {
      if (activeAnswerIdx === null) return;
    }

    const isCorrect = isNonMC
      ? validateTextAnswer(textAnswer, currentQuestion.correctAnswerText || '', currentQuestion.questionType || '')
      : activeAnswerIdx === currentQuestion.correctAnswer;

    const finalAnswer = isNonMC ? textAnswer : String(activeAnswerIdx);
    const timeSpentQ = Math.round((Date.now() - questionStartTime) / 1000);

    setAnswerRecords((prev) => [
      ...prev,
      { questionId: currentQuestion.id, answer: finalAnswer, correct: isCorrect, timeSpent: timeSpentQ },
    ]);

    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = isCorrect ? 1 : 0;
    setAnswers(newAnswers);
    setLastAnswerCorrect(isCorrect);
    setShowExplanation(true);

    if (!isCorrect) {
      // INCORRECT: shake, deduct heart, no popup, auto-advance after 1.5s
      setShakeCard(true);
      playSound('incorrect');
      setTimeout(() => setShakeCard(false), 500);
      setHeartsCount(prev => Math.max(0, prev - 1));
      setStreak(0);
      setComboMultiplier(1);
      
      // Auto-advance even on incorrect for Practice Center
      setTimeout(() => {
        handleNextQuestion();
      }, 1500);
      return;
    }

     // CORRECT: popup + auto-advance
     playSound('correct');
     const wasHintUsed = (eliminatedByHint[currentQuestionIndex] || []).length > 0;
      const ptsAwarded = wasHintUsed ? 5 : 10;
     setCurrentPoints(prev => prev + ptsAwarded);
     setScore(score + 1);
const newStreak = streak + 1;
      setStreak(newStreak);

      // Achievement pills (only 2 triggers inside "CORRECT!" popup)
      if (newStreak === 2) {
        setAchievementPill('streak');
      } else if (newStreak === 3 && comboMultiplier < 2) {
        setAchievementPill('multiplier2');
      } else if (newStreak === 5 && comboMultiplier < 3) {
        setAchievementPill('multiplier3');
     }

     if (newStreak > 0 && newStreak % 3 === 0) playSound('combo');
     if (newStreak >= 5) { setComboMultiplier(3); }
     else if (newStreak >= 3) { setComboMultiplier(2); }
     else { setComboMultiplier(1); }

    // Use specific canvas confetti for correct answers
    import('canvas-confetti').then((confetti) => {
      confetti.default({ particleCount: 30, spread: 40, colors: ['#75D06A', '#6ED1CF'], origin: { y: 0.6 } });
    });

    setShowRoundResult(true);
    setTimeout(() => {
      setShowRoundResult(false);
      setAchievementPill(null);
      setTimeout(() => handleNextQuestion(), 300);
    }, 1500); // 1.5s total
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      const nextIdx = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIdx);
      setViewIndex(nextIdx);
      setSelectedAnswer(null);
      setTextAnswer('');
      setWrongAttempted(false);
      setFailedOptions([]);
      setQuestionStartTime(Date.now());
      setShowExplanation(false);
      setUserRequestedExplanation(false);
    } else {
      // Quiz complete - calculate score but don't close automatically
      calculateFinalScore();
      setShowResults(true);
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
        particleCount: 80,
        spread: 100,
        origin: { y: -0.2 },
        colors: ['#75D06A', '#6ED1CF', '#9956DE', '#FB96BB', '#FFB356']
      });
   };

  const isCurrentlyAnswered = viewIndex < currentQuestionIndex || (viewIndex === currentQuestionIndex && showExplanation);
  const viewedQuestion = questions[viewIndex] || currentQuestion;

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

   if (showResults) {
     const percentage = Math.round((score / questions.length) * 100);
     const isExcellent = percentage >= 80;
     const isGood = percentage >= 50 && percentage < 80;
     const isNeedsWork = percentage < 50;
     const modalRoot = document.getElementById('modal-root');

     const resultModal = (
       <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
         <style>{quizAnimations}</style>
         {isExcellent && (
           <div className="absolute inset-0 pointer-events-none z-[150]">
             {/* Confetti already fired in calculateFinalScore */}
           </div>
         )}
         {isGood && <DrawSparks viewportHeight={viewportSize.height} viewportWidth={viewportSize.width} />}
         {isNeedsWork && <RainStorm viewportHeight={viewportSize.height} />}

        <motion.div 
           initial={{ opacity: 0, scale: 0.8, y: 40 }}
           animate={{ opacity: 1, scale: 1, y: 0 }}
           transition={{ type: 'spring', damping: 18, stiffness: 200 }}
           className="w-full max-w-xs sm:max-w-sm bg-white border-2 border-slate-200 shadow-[0_25px_60px_rgba(0,0,0,0.15)] rounded-[2rem] p-4 sm:p-5 text-center relative z-10"
        >
            <motion.div 
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 12, stiffness: 150, delay: 0.2 }}
              className="mb-3"
            >
              <img src="/mascot/modules_avatar.png" alt="Mascot" className="w-16 h-16 sm:w-20 sm:h-20 mx-auto drop-shadow-xl animate-mascot-float" />
            </motion.div>

            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={`text-xl sm:text-2xl font-black uppercase tracking-tight mb-1 drop-shadow-sm ${
                isExcellent ? "text-emerald-500" : isGood ? "text-amber-500" : "text-rose-500"
              }`}>
              {isExcellent ? 'EXCELLENT!' : isGood ? 'GOOD JOB!' : 'KEEP TRYING!'}
            </motion.h2>
            <p className="text-slate-400 font-bold text-[10px] mb-3 uppercase tracking-widest">
               Quiz Complete • Score: {score}/{questions.length}
            </p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-slate-50/50 rounded-xl p-3 mb-4 border border-slate-100 flex flex-col gap-2"
            >
              <div>
                <h3 className="text-slate-400 text-[9px] font-black uppercase tracking-widest text-left mb-1.5 ml-1">Performance Details</h3>
                <div className="space-y-1.5">
                  <AnimatedCounter value={score} label="Correct Answers" delay={500} icon={<Check className="h-3 w-3 text-emerald-500" />} />
                  <AnimatedCounter value={currentPoints} label="Total XP Earned" delay={800} icon={<Zap className="h-3 w-3 text-amber-500" />} />
                  
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2, duration: 0.4 }}
                    className="flex items-center justify-between pt-1.5 mt-1 border-t border-slate-100"
                  >
                    <span className="text-slate-400 text-[9px] font-black uppercase tracking-widest">Final Accuracy</span>
                    <span className="text-lg font-black text-slate-800 tabular-nums">{percentage}%</span>
                  </motion.div>
                </div>
              </div>
            </motion.div>

            <div className="flex flex-col gap-2">
               <Button
                 size="lg"
                 onClick={() => {
                   setCurrentQuestionIndex(0);
                   setViewIndex(0);
                   setSelectedAnswer(null);
                   setTextAnswer('');
                   setScore(0);
                   setStreak(0);
                   setComboMultiplier(1);
                   setAnswers([]);
                   setAnswerRecords([]);
                   setCurrentPoints(0);
                   setShowResults(false);
                   setShowExplanation(false);
                   setUserRequestedExplanation(false);
                   setQuestionStartTime(Date.now());
                 }}
                 className="w-full h-10 sm:h-11 rounded-2xl text-xs font-black bg-white hover:bg-slate-50 text-purple-600 border-2 border-purple-100"
               >
                 RETAKE QUIZ
               </Button>
               <Button
                 size="lg"
                 onClick={onClose}
                 className="w-full h-10 sm:h-11 rounded-2xl text-xs font-black bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200"
               >
                 BACK TO PRACTICE CENTER
               </Button>
            </div>
         </motion.div>
       </div>
     );

     return createPortal(resultModal, modalRoot!);
   }

return (
      <>
        <style>{quizAnimations}</style>

{/* Calculator via portal to escape z-index context */}
        {showCalculator && createPortal(
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="fixed right-6 top-1/2 -translate-y-1/2 z-[9999] w-64">
            <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-[0_10px_40px_rgba(0,0,0,0.3)]">
              <div className="flex items-center justify-between mb-2 px-1">
                <h4 className="text-xs font-bold text-[#0a1628] flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600"><rect x="4" y="2" width="16" height="20" rx="2" /><line x1="8" x2="16" y1="6" y2="6" /></svg>
                  Calculator
                </h4>
                <button onClick={() => setShowCalculator(false)} className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"><X size={12} /></button>
              </div>
              <ScientificCalculator isOpen={true} onClose={() => setShowCalculator(false)} inline />
            </div>
          </motion.div>,
          document.getElementById('modal-root')!
        )}

        {/* No Lives Modal */}
        {showNoLivesModal && createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[2rem] p-6 max-w-xs w-full text-center border-2 border-rose-200 shadow-[0_25px_60px_rgba(0,0,0,0.15)]"
            >
              <motion.div 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-6xl mb-4"
              >
                💔
              </motion.div>
              <h2 className="text-2xl font-black text-slate-800 mb-3">Out of Lives!</h2>
              <p className="text-slate-500 text-sm mb-4">
                Your hearts have run out. You can wait for them to refill or head back and review your lessons in the meantime.
              </p>
              <div className="flex items-center justify-center gap-2 mb-2 text-rose-500 font-bold">
                <img src="/icons/quiz_heart.png" alt="Hearts" className="w-5 h-5" />
                <span>0 / 15 hearts</span>
              </div>
              <p className="text-slate-400 text-xs mb-4">
                Next heart in: <span className="font-bold text-slate-600">
                  {Math.floor(nextHeartCountdown / 60000)}:{(Math.floor((nextHeartCountdown % 60000) / 1000)).toString().padStart(2, '0')}
                </span> (15 minutes per heart)
              </p>
              {/* BACKEND HANDOFF NOTE:
                  Heart recovery requires backend support:
                  - Store timestamp of when lives ran out in Firestore under user profile.
                  - On quiz load, check if enough time has passed to recover hearts.
                  - Recovery rate: 1 heart per 15 minutes, up to max (15 hearts).
                  - Until backend is ready, the countdown is UI-only and hearts don't actually recover. */}
              <div className="flex flex-col gap-2">
                <Button onClick={onClose} className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-full">
                  Exit Quiz
                </Button>
                <Button onClick={() => { setShowNoLivesModal(false); }} className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-full">
                  Review Lessons
                </Button>
              </div>
            </motion.div>
          </div>,
          document.getElementById('modal-root')!
        )}


        {/* Correct-only popup */}
      <AnimatePresence>
        {showRoundResult && lastAnswerCorrect && (
          <motion.div
            key="round-result"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] pointer-events-none flex flex-col items-center justify-center"
          >
            <div className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-[2rem] p-6 md:p-8 shadow-[0_30px_80px_rgba(0,0,0,0.15)] flex flex-col items-center min-w-[280px] md:min-w-[320px]">
              <img src="/mascot/modules_avatar.png" alt="Mascot" className="w-24 h-24 md:w-32 md:h-32 mb-4 drop-shadow-[0_10px_20px_rgba(0,0,0,0.15)]" />
              <h2 className="text-3xl md:text-4xl font-black mb-4 uppercase tracking-widest text-emerald-500">Correct!</h2>
              <div className="flex flex-col items-center gap-3 w-full justify-center">
                <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full font-bold border border-emerald-500/30">
                   <span>+ {(eliminatedByHint[currentQuestionIndex] || []).length > 0 ? 5 : 10} XP</span>
                </div>
                {achievementPill === 'streak' && (
                  <div className="flex items-center gap-2 bg-orange-500/20 text-orange-400 px-4 py-1.5 rounded-full text-sm font-bold border border-orange-500/30">
                    <Flame size={14} /> Streak Started!
                  </div>
                )}
                {achievementPill === 'multiplier2' && (
                  <div className="flex items-center gap-2 bg-amber-500/20 text-amber-400 px-4 py-1.5 rounded-full text-sm font-bold border border-amber-500/30">
                    <Zap size={14} /> Multiplier ×2!
                  </div>
                )}
                {achievementPill === 'multiplier3' && (
                  <div className="flex items-center gap-2 bg-amber-500/20 text-amber-400 px-4 py-1.5 rounded-full text-sm font-bold border border-amber-500/30">
                    <Zap size={14} /> Multiplier ×3!
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed inset-0 z-[100] h-screen w-full flex flex-col bg-slate-50 overflow-hidden">
        {/* Sticky Header */}
        <header className="relative shrink-0 flex flex-col items-center justify-start px-4 pt-4 sm:pt-6 pb-6 z-[60] shadow-md overflow-hidden bg-gradient-to-r from-purple-600 to-indigo-400 rounded-b-[32px] sm:rounded-b-[40px] min-h-[110px] sm:min-h-[130px]">
          <div className="absolute inset-0 z-0 pointer-events-none">
             <div className="absolute top-0 left-0 w-64 h-64 bg-white opacity-10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl"></div>
             <div className="absolute bottom-0 right-0 w-80 h-80 bg-white opacity-10 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl"></div>
          </div>

          <div className="w-full max-w-7xl flex items-start justify-between relative z-10 mb-4 sm:mb-6">
            <div className="flex-1 flex items-center gap-2">
               <div className="flex items-center gap-1 bg-white/20 px-3 py-1.5 rounded-full text-white text-sm font-bold">
                 <Clock size={16} /> {formatTime(timeRemaining)}
               </div>
            </div>

            <div className="relative flex items-center justify-center bg-purple-900/40 backdrop-blur-md px-6 sm:px-8 py-3 rounded-full border border-white/10 gap-3 sm:gap-4 shadow-inner">
              <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-yellow-400 shrink-0 shadow-[0_0_10px_rgba(250,204,21,0.6)]"></div>
              <div className="flex flex-col items-start justify-center">
                 <span className="text-[10px] sm:text-[11px] font-black text-purple-200 uppercase tracking-widest leading-none mb-1">Try It Yourself!</span>
                 <span className="font-bold text-white tracking-wide text-base sm:text-lg leading-none truncate max-w-[200px] sm:max-w-[300px]">{quiz.title || quiz.subject}</span>
              </div>
            </div>

            <div className="flex-1 flex justify-end gap-2 sm:gap-3 relative pointer-events-auto">
               <button onClick={() => setIsAudioEnabled(!isAudioEnabled)} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-900/20 text-white flex items-center justify-center hover:bg-purple-900/40 transition-colors shadow-sm border border-white/10">
                 {isAudioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
               </button>
               <button onClick={toggleFullscreen} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-900/20 text-white flex items-center justify-center hover:bg-purple-900/40 transition-colors shadow-sm border border-white/10">
                 {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
               </button>

               <button onClick={onClose} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-900/20 text-white flex items-center justify-center hover:bg-purple-900/40 transition-colors shadow-sm border border-white/10">
                 <X size={20} />
               </button>
            </div>
          </div>

          <div className="w-full max-w-[50rem] flex items-center justify-center px-4 z-10">
             <div className="w-full flex items-center gap-2 sm:gap-3">
                 {questions.map((_, i) => {
                    let dotClass = i <= currentQuestionIndex ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-white/20';
                    return <div key={i} className={`h-1.5 sm:h-2 rounded-full flex-1 transition-all ${dotClass}`} />;
                 })}
             </div>
          </div>
        </header>

        {/* Sticky Stats Bar with Nav Arrows */}
        <div className="w-full max-w-[54rem] mx-auto shrink-0 flex items-center justify-between px-4 sm:px-6 py-2 sm:py-3 z-[50] relative mt-8">
           <button
             onClick={() => setViewIndex(prev => Math.max(0, prev - 1))}
             disabled={viewIndex === 0}
             className={`w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-full flex items-center justify-center shadow-md border-2 transition-all ${viewIndex === 0 ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white text-purple-600 border-purple-100 hover:bg-purple-50 hover:border-purple-200 hover:scale-105 active:scale-95'}`}
           >
             <ChevronLeft size={24} />
           </button>

           <div className="flex items-center justify-center gap-3 sm:gap-5 flex-1">
              <div className="flex items-center gap-2 sm:gap-3 px-8 sm:px-10 py-2 rounded-full bg-white shadow-md border border-slate-200/60 text-rose-500 font-extrabold text-sm sm:text-base">
                 <img src="/icons/quiz_heart.png" alt="Hearts" className="w-5 h-5 object-contain" /> {heartsCount}
              </div>
              <div className="flex items-center gap-2 sm:gap-3 px-8 sm:px-10 py-2 rounded-full bg-white shadow-md border border-slate-200/60 text-yellow-500 font-extrabold text-sm sm:text-base">
                 <img src="/icons/quiz_key.png" alt="Keys" className="w-5 h-5 object-contain" /> {keysCount}
              </div>
              <div className="flex items-center gap-3 sm:gap-4 px-3 py-1.5 pl-5 sm:pl-6 rounded-full bg-white shadow-md border border-slate-200/60">
                 <div className="flex items-center gap-1.5 text-orange-500 font-extrabold text-sm sm:text-base">
                    <img src="/icons/quiz_streak.png" alt="Streak" className="w-5 h-5 object-contain" /> {streak}
                 </div>
                 <div className="bg-emerald-100 text-emerald-800 px-4 py-1.5 rounded-full font-bold text-sm sm:text-base shadow-inner border border-emerald-200/50">
                    + {currentPoints} pts
                 </div>
              </div>
           </div>

           <button
             onClick={() => setViewIndex(prev => Math.min(currentQuestionIndex, prev + 1))}
             disabled={viewIndex >= currentQuestionIndex}
             className={`w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-full flex items-center justify-center shadow-md border-2 transition-all ${viewIndex >= currentQuestionIndex ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white text-purple-600 border-purple-100 hover:bg-purple-50 hover:border-purple-200 hover:scale-105 active:scale-95'}`}
           >
             <ChevronRight size={24} />
           </button>
        </div>

{/* Scrollable Content */}
          <main className="flex-1 overflow-y-auto w-full px-4 sm:px-6 pt-0 pb-6 flex flex-col items-center relative z-10">
           <motion.div
             key={viewIndex}
             initial={{ opacity: 0, x: 20 }}
             animate={shakeCard ? { x: [-10, 10, -10, 10, 0], scale: [1, 1.01, 1], opacity: 1 } : { opacity: 1, x: 0 }}
             className="w-full max-w-3xl flex flex-col mt-2"
           >
             <div className="bg-white rounded-3xl shadow-lg border-t-[6px] border-purple-500 p-6 sm:p-8 text-center flex flex-col items-center mb-6 w-full relative overflow-hidden">
                <div className="bg-slate-100 text-slate-600 px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-widest mb-4 flex items-center shadow-sm">
                   Q{viewIndex + 1} of {questions.length}
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#0a1628] leading-tight w-full">
                  {viewedQuestion.question.includes('___') ? (
                    <span>
                       {viewedQuestion.question.split('___').map((part, i, arr) => (
                          <React.Fragment key={i}>
                            {part}
                            {i < arr.length - 1 && (
                              <input
                                type="text"
                                disabled={isCurrentlyAnswered}
                                value={viewIndex === currentQuestionIndex ? textAnswer : ''}
                                onChange={(e) => setTextAnswer(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !showExplanation) handleSubmitAnswer(); }}
                                className={`inline-block w-24 mx-2 border-b-4 outline-none text-center bg-transparent font-bold ${isCurrentlyAnswered ? 'border-slate-300 text-slate-500' : 'border-[#7C3AED] text-[#7C3AED] focus:border-[#75D06A]'}`}
                              />
                            )}
                          </React.Fragment>
                       ))}
                    </span>
                  ) : viewedQuestion.question}
                </h2>
             </div>

             <div className="w-full flex flex-col items-center">
                {viewedQuestion.questionType === 'multiple_choice' || !viewedQuestion.questionType ? (
                  <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
                     {(viewedQuestion.options || []).map((opt, idx) => {
                        const eliminatedArr = eliminatedByHint[currentQuestionIndex] || [];
                        const isEliminated = eliminatedArr.includes(opt);
                        const eliminatedCount = eliminatedArr.length;
                        const wrongChoicesCount = (viewedQuestion.options || []).length - 1;
                        const allWrongEliminated = wrongChoicesCount > 0 && eliminatedCount >= wrongChoicesCount;
                        
                        let bgColor = 'bg-white hover:bg-slate-50 border-transparent text-slate-700 hover:border-slate-200';
                        let isAllDisabled = false;
                        
                        if (allWrongEliminated) {
                           isAllDisabled = true;
                           const correctOption = viewedQuestion.options?.[viewedQuestion.correctAnswer];
                           if (opt === correctOption) {
                              bgColor = 'bg-emerald-50 border-emerald-400 text-emerald-800';
                           } else {
                              bgColor = 'bg-slate-100 border-slate-200 text-slate-400 opacity-40 line-through';
                           }
                        } else if (isEliminated) {
                           bgColor = 'bg-slate-100 border-slate-200 text-slate-400 opacity-40 line-through cursor-not-allowed';
                        } else if (isCurrentlyAnswered) {
                           const wasCorrect = idx === viewedQuestion.correctAnswer;
                           const wasSelected = (viewIndex === currentQuestionIndex && selectedAnswer === idx) ||
                                               (viewIndex < currentQuestionIndex && answerRecords[viewIndex]?.answer === String(idx));
                           if (wasCorrect) {
                              bgColor = 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-[0_0_15px_rgba(16,185,129,0.2)] scale-[1.02] z-10';
                           } else if (wasSelected) {
                              bgColor = 'bg-rose-50 border-rose-400 text-rose-800 opacity-80';
                           } else {
                              bgColor = 'bg-slate-50 border-slate-200 text-slate-400 opacity-60';
                           }
                        } else if (selectedAnswer === idx) {
                           bgColor = 'bg-purple-50 border-[#9956DE] text-[#9956DE]';
                        }

                        return (
                           <button
                             key={idx}
                             disabled={isAllDisabled || isCurrentlyAnswered || isEliminated}
                             onClick={() => { if (isAllDisabled || isCurrentlyAnswered || isEliminated) return; handleAnswerSelect(idx); }}
                             className={`p-4 sm:p-5 rounded-2xl shadow-sm border-[3px] font-extrabold text-base sm:text-lg text-left transition-all flex items-center justify-between ${bgColor} ${isAllDisabled || isCurrentlyAnswered || isEliminated ? 'cursor-default' : 'hover:shadow-md hover:-translate-y-0.5 active:translate-y-0'}`}
                           >
                              <span className="truncate pr-4">{opt}</span>
                              {isEliminated && <XCircle size={20} className="text-slate-400 shrink-0" />}
                              {isCurrentlyAnswered && idx === viewedQuestion.correctAnswer && <CheckCircle size={22} className="text-emerald-500 shrink-0" />}
                              {isCurrentlyAnswered && selectedAnswer === idx && idx !== viewedQuestion.correctAnswer && <XCircle size={22} className="text-rose-500 shrink-0" />}
                           </button>
                        );
                     })}
                  </div>
                ) : (
                  <div className="w-full max-w-2xl mx-auto flex flex-col gap-4">
                     {!viewedQuestion.question.includes('___') && (
                       <input
                          type="text"
                          disabled={isCurrentlyAnswered}
                          value={viewIndex === currentQuestionIndex ? textAnswer : ''}
                          onChange={(e) => setTextAnswer(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && !showExplanation) handleSubmitAnswer(); }}
                          placeholder="Type your answer here..."
                          className={`w-full p-4 sm:p-5 rounded-2xl border-[3px] font-extrabold text-lg text-center outline-none transition-colors ${
                             isCurrentlyAnswered ? (lastAnswerCorrect ? 'border-emerald-400 text-emerald-700 bg-emerald-50' : 'border-rose-400 text-rose-700 bg-rose-50')
                             : 'border-slate-200 focus:border-[#7C3AED] bg-white text-slate-800'
                          }`}
                       />
                     )}
                  </div>
                 )}

                  {/* Explanation Header: Topic + Module Avatar (only when explain is active) */}
                  {isCurrentlyAnswered && userRequestedExplanation && (
                    <div className="w-full max-w-3xl mt-6 flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-[#0a1628]">{viewedQuestion.topic || quiz?.subject || 'General Math'}</h3>
                        <p className="text-sm text-slate-500">Question {viewIndex + 1} Explanation</p>
                      </div>
                      <img 
                        src={'/icons/default-module-avatar.png'} 
                        alt="Module Avatar" 
                        className="w-12 h-12 rounded-full object-cover border-2 border-slate-200"
                      />
                    </div>
                  )}

                  {/* Explanation after answering - only show if user requested it */}
                  {isCurrentlyAnswered && userRequestedExplanation && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full mt-4 space-y-4 max-w-3xl">
                      <div className={`border-2 rounded-2xl p-5 flex items-start gap-4 ${
                         (viewIndex === currentQuestionIndex ? lastAnswerCorrect : answerRecords[viewIndex]?.correct) ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
                      }`}>
                        {(viewIndex === currentQuestionIndex ? lastAnswerCorrect : answerRecords[viewIndex]?.correct) ? (
                          <CheckCircle size={28} className="text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle size={28} className="text-rose-500 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className={`font-extrabold text-lg mb-1 ${(viewIndex === currentQuestionIndex ? lastAnswerCorrect : answerRecords[viewIndex]?.correct) ? 'text-emerald-700' : 'text-rose-700'}`}>
                             {(viewIndex === currentQuestionIndex ? lastAnswerCorrect : answerRecords[viewIndex]?.correct) ? 'Correct!' : 'Incorrect'}
                          </p>
                          {/* BACKEND HANDOFF NOTE: Placeholder answer explanation.
                               Future backend must provide:
                               - explanationText: string (markdown-supported correct answer explanation)
                               - optional explanationMedia: string (supplementary media URL)
                               - correctAnswerId: string (ID of correct choice for highlighting) */}
                          <p className={`text-base leading-relaxed ${(viewIndex === currentQuestionIndex ? lastAnswerCorrect : answerRecords[viewIndex]?.correct) ? 'text-emerald-800' : 'text-rose-800'}`}>
                            {viewedQuestion.explanation || `Correct Answer: ${viewedQuestion.correctAnswerText || viewedQuestion.options?.[viewedQuestion.correctAnswer]}`}
                          </p>
                        </div>
                      </div>
                   </motion.div>
                  )}
             </div>

</motion.div>
         </main>

        {/* Sticky Footer */}
        <footer className="shrink-0 relative z-[60] flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-r from-purple-600 to-indigo-400 rounded-t-[32px] sm:rounded-t-[40px] shadow-[0_-10px_40px_rgba(0,0,0,0.15)]">
{(() => {
                      const eliminatedCount = (eliminatedByHint[currentQuestionIndex] || []).length;
                      const wrongChoicesCount = (currentQuestion.options || []).length - 1;
                      const allWrongEliminated = wrongChoicesCount > 0 && eliminatedCount >= wrongChoicesCount;
                      const showNextButton = allWrongEliminated || (isCurrentlyAnswered && !lastAnswerCorrect);
                      
                      return showNextButton ? (
                        <button onClick={handleNextQuestion} className="bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-lg px-8 py-4 rounded-full flex items-center justify-center gap-3 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all w-full max-w-md mx-auto">
                          {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'View Results'} <ChevronRight size={24} />
                        </button>
                      ) : viewIndex === currentQuestionIndex && !showExplanation ? (
                        <div className="relative z-10 flex flex-wrap justify-center gap-3 sm:gap-4">
                          {(() => {
                               const canUseHint = keysCount > 0 && !showExplanation && !allWrongEliminated;
                               return (
                                 <button onClick={handleHintUse} disabled={!canUseHint} className="bg-white hover:bg-slate-50 disabled:opacity-70 disabled:cursor-not-allowed text-slate-700 font-bold px-6 sm:px-8 py-3 sm:py-3.5 rounded-full flex items-center gap-2 shadow-lg transition-transform hover:scale-105 active:scale-95 border border-slate-200">
                                   <img src="/icons/quiz_key.png" alt="Key" className="w-5 h-5 object-contain" /> Hint
                                 </button>
                               );
                            })()}
                          {isCurrentlyAnswered && (
                            <button onClick={() => setUserRequestedExplanation(true)} className="bg-white hover:bg-slate-50 text-slate-700 font-bold px-6 sm:px-8 py-3 sm:py-3.5 rounded-full flex items-center gap-2 shadow-lg transition-transform hover:scale-105 active:scale-95 border border-slate-200">
                               <BookOpen size={20} /> Explain
                            </button>
                          )}
                          <button onClick={() => setShowCalculator(prev => !prev)} className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 border border-slate-200 ${showCalculator ? 'bg-purple-100 text-purple-600 border-purple-300' : 'bg-white hover:bg-slate-50 text-slate-700'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" /><line x1="8" x2="16" y1="6" y2="6" /><path d="M16 10h.01" /><path d="M12 10h.01" /><path d="M8 10h.01" /><path d="M12 14h.01" /><path d="M8 14h.01" /><path d="M12 18h.01" /><path d="M8 18h.01" /><line x1="16" x2="16" y1="14" y2="18" /></svg>
                         </button>
                        </div>
                      ) : viewIndex < currentQuestionIndex ? (
                        <button onClick={() => setViewIndex(currentQuestionIndex)} className="bg-white text-slate-700 font-extrabold text-lg px-8 py-4 rounded-full flex items-center justify-center gap-3 shadow-lg hover:bg-slate-50 transition-transform hover:scale-[1.02] active:scale-[0.98] w-full border border-slate-200">
                           <ChevronRight size={20} /> Back to Current Question
                        </button>
                      ) : null;
                    })()}
        </footer>
      </div>
    </>
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

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default QuizExperience;
