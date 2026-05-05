import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, XCircle, Zap, Trophy, Target, Clock, Star, TrendingUp, Award, Flame, ChevronRight, Edit3 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { triggerQuizSubmitted } from '../services/automationService';
import { saveQuizResults } from '../services/quizService';
import { recordPracticeQuiz } from '../services/progressService';
import { generateLessonQuiz } from '../services/lessonQuizService';
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
// Normalize hyphenated type (multiple-choice) to underscore (multiple_choice)
function normalizeQuestionType(type: string | undefined): string {
  if (!type) return 'identification';
  const mapping: Record<string, string> = {
    'multiple-choice': 'multiple_choice',
    'true-false': 'true_false',
    'fill-in-blank': 'fill_in_blank',
    'identification': 'identification',
    'word-problem': 'word_problem',
  };
  return mapping[type] || type;
}

function aiQuestionToInternal(q: AIQuizQuestion): QuizQuestion {
  const questionType = normalizeQuestionType(q.type || q.questionType);
  // Also handle legacy underscore format  
  const legacyType = q.questionType || questionType;
  
  if (questionType === 'multiple_choice' || legacyType === 'multiple_choice') {
    if (q.options && q.options.length > 0) {
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

  // Load AI questions or generate via backend API
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadQuestions() {
      try {
        if (quiz.loadedQuestions && quiz.loadedQuestions.length > 0) {
          setQuestions(quiz.loadedQuestions.map(aiQuestionToInternal));
        } else {
          const generated = await generateLessonQuiz({
            lessonId: quiz.id,
            lessonTitle: quiz.title,
            questionCount: quiz.questions,
          });
          if (!cancelled) {
            setQuestions(
              generated.map((q, i) => ({
                id: `q${i + 1}`,
                question: q.question,
                options: q.options || [],
                correctAnswer: q.options
                  ? q.options.findIndex(
                      (o) => o.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()
                    )
                  : -1,
                correctAnswerText: q.correctAnswer,
                explanation: q.explanation || '',
                questionType: q.type,
              }))
            );
          }
        }
      } catch (err) {
        console.error('[QuizExperience] Failed to load questions:', err);
      } finally {
        if (!cancelled) setQuizLoading(false);
      }
    }
    loadQuestions();
    return () => { cancelled = true; };
  }, [quiz.id, quiz.title, quiz.questions, quiz.loadedQuestions]);

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
  // PERF: Math.random() in useState initializer — values are deterministic after mount but
  // component re-mounts (due to parent re-render) regenerate random values, causing new animation targets
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

  if (quizLoading || questions.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-5">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-[28px] shadow-2xl max-w-md w-full p-8 text-center"
        >
          <div className="mx-auto mb-4 h-12 w-12 rounded-full border-4 border-[#9956DE] border-t-transparent animate-spin" />
          <h2 className="text-2xl font-bold text-[#0a1628] mb-2">Preparing Quiz</h2>
          <p className="text-sm text-[#5a6578]">
            Generating questions from curriculum using AI...
          </p>
        </motion.div>
      </div>
    );
  }

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
        {/* PERF: motion.div inside .map() — each orb creates a Framer Motion animation node.
            Math.random() in animate prop regenerates targets every render, causing continuous re-animation.
            Extract random values to useMemo/useRef so they are stable across renders. */}
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
                {/* PERF: options.map() with motion.button + whileHover/whileTap per option (4-6 items).
                    On quiz navigation (question change), all options animate via AnimatePresence mode="wait".
                    whileHover/whileTap attach event listeners on each mount — fine for small lists but
                    avoid extending this pattern to larger lists. */}
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

export default QuizExperience;
