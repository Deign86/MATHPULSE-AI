import React, { useState, useEffect } from 'react';
import {
  X, Check, ArrowRight, Trophy, Zap, HelpCircle,
  Calculator, Sigma, Divide, Percent, Triangle, Circle, Square, Box, Ruler,
  Binary, FunctionSquare, Scaling, Braces, Star, Award, Target, TrendingUp, Flame,
  Sparkles, Volume2, VolumeX, Maximize, Minimize, Menu, ChevronLeft, ChevronRight
, RefreshCw, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { Button } from './ui/button';
import ScientificCalculator from './ScientificCalculator';

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

export type QuestionType = 'multiple-choice' | 'true-false' | 'fill-in-blank';

export interface Question {
  id: number;
  type: QuestionType;
  question: string;
  options?: string[]; // For multiple choice
  correctAnswer: string; // For all types (text match for fill-in-blank)
  explanation?: string; // Explanation for the correct answer
  optionExplanations?: { [key: string]: string }; // Explanations for each option (for multiple choice)
}

interface Lesson {
  id: number;
  title: string;
  duration: string;
  type: 'video' | 'practice' | 'quiz';
  completed: boolean;
  locked: boolean;
}

interface InteractiveLessonProps {
  lesson: Lesson;
  questions: Question[];
  onComplete: (score: number, extraXP?: number) => void;
  onBack: () => void;
}

// Confetti Component - Optimized with WAAPI-backed animations (transform, opacity only)
const Confetti: React.FC = () => {
  const colors = ['#4F46E5', '#EC4899', '#f43f5e', '#10B981', '#0ea5e9'];
  const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    animationDelay: Math.random() * 0.5,
    backgroundColor: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * 360
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {confettiPieces.map((piece) => (
        <motion.div
          key={piece.id}
          initial={{ y: -20, x: `${piece.left}vw`, opacity: 1, rotate: 0 }}
          animate={{ 
            y: '100vh', 
            rotate: piece.rotation,
            opacity: 0 
          }}
          transition={{ 
            duration: 2 + Math.random() * 2, 
            delay: piece.animationDelay,
            ease: 'easeIn'
          }}
          style={{
            position: 'absolute',
            width: '10px',
            height: '10px',
            backgroundColor: piece.backgroundColor,
            willChange: 'transform, opacity'
          }}
          className="rounded-sm"
        />
      ))}
    </div>
  );
};

// Streak Notification - Optimized with WAAPI-backed animations (transform, opacity only)
const StreakNotification: React.FC<{ streak: number }> = ({ streak }) => {
  if (streak < 3) return null;

  return (
    <motion.div
      initial={{ scale: 0, y: 50 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed top-24 left-1/2 -translate-x-1/2 z-[70] pointer-events-none"
      style={{ willChange: 'transform, opacity' }}
    >
      <div className="bg-gradient-to-r from-[#FFB356] to-[#FF8B8B] text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
        <Flame size={24} className="animate-pulse" />
        <div>
          <p className="text-lg font-black">{streak}x STREAK!</p>
          <p className="text-xs font-bold opacity-90">+{streak * 5} Bonus XP</p>
        </div>
      </div>
    </motion.div>
  );
};

const InteractiveLesson: React.FC<InteractiveLessonProps> = ({
  lesson,
  questions,
  onComplete,
  onBack,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewIndex, setViewIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [shuffledOptions, setShuffledOptions] = useState<{ id: string; text: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHintPanel, setShowHintPanel] = useState(false);
  const [hintContent, setHintContent] = useState<string | null>(null);
  const [popupMessage, setPopupMessage] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [showStreakNotification, setShowStreakNotification] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [answerHistory, setAnswerHistory] = useState<boolean[]>([]);
  const [startTime] = useState(Date.now());
  const [streakBonusXP, setStreakBonusXP] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showRevealPanel, setShowRevealPanel] = useState(false);
  const [showExplainPanel, setShowExplainPanel] = useState(false);
  const [showRoundResult, setShowRoundResult] = useState(false);

  // Gamification & Flow States
  const [currentPoints, setCurrentPoints] = useState(0);
  const [eliminatedByHint, setEliminatedByHint] = useState<Record<number, string[]>>({});
  const [keysCount, setKeysCount] = useState(5);
  const [heartsCount, setHeartsCount] = useState(15);
  const [livesRanOutAt, setLivesRanOutAt] = useState<number | null>(null);
  const [showNoLivesModal, setShowNoLivesModal] = useState(false);
  const [nextHeartCountdown, setNextHeartCountdown] = useState(15 * 60 * 1000);
  const [revealUsed, setRevealUsed] = useState<Record<number, boolean>>({});
  const [failedOptions, setFailedOptions] = useState<Record<number, string[]>>({});
  const [shakeCard, setShakeCard] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [achievementPill, setAchievementPill] = useState<'streak' | 'multiplier2' | 'multiplier3' | null>(null);

  // Background floating orbs logic
  const [orbs] = useState(Array.from({ length: 15 }, (_, i) => ({
    id: i,
    size: Math.random() * 120 + 60,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 25 + 15,
    delay: Math.random() * -20,
    color: ['bg-white/5', 'bg-indigo-300/10', 'bg-sky-300/10', 'bg-purple-300/10'][Math.floor(Math.random() * 4)]
  })));

  const currentQuestion = questions[viewIndex];
  const isCurrentlyAnswered = viewIndex < currentIndex || (viewIndex === currentIndex && isAnswered);
  const title = lesson.title;
  const type = lesson.type;

  if (!currentQuestion) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
        <div className="w-full max-w-xl rounded-[32px] bg-white p-6 text-center shadow-2xl">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full border-4 border-[#9956DE] border-t-transparent animate-spin" />
          <h2 className="text-2xl font-black text-[#0a1628] mb-2">Preparing checkpoint</h2>
          <p className="text-sm text-[#5a6578] mb-5">
            We are loading or rebuilding the quiz so the module can open safely.
          </p>
          <Button onClick={onBack} className="rounded-xl bg-[#9956DE] hover:bg-[#8544c7] text-white font-bold">
            Back to module
          </Button>
        </div>
      </div>
    );
  }

  // Sound effects using Web Audio API for synthetic sounds
  const playSound = (type: 'correct' | 'incorrect' | 'complete' | 'streak') => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const t = ctx.currentTime;

      const playNote = (freq: number, startTime: number, duration: number, vol = 0.1, waveType: OscillatorType = 'sine') => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = waveType;
        osc.frequency.value = freq;
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(vol, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      if (type === 'correct') {
        playNote(880, t, 0.1, 0.1, 'sine'); // A5
        playNote(1108.73, t + 0.1, 0.2, 0.1, 'sine'); // C#6
      } else if (type === 'incorrect') {
        playNote(300, t, 0.2, 0.05, 'sawtooth');
        playNote(250, t + 0.15, 0.3, 0.05, 'sawtooth');
      } else if (type === 'streak') {
        playNote(440, t, 0.1, 0.05, 'square');
        playNote(554.37, t + 0.1, 0.1, 0.05, 'square');
        playNote(659.25, t + 0.2, 0.1, 0.05, 'square');
        playNote(880, t + 0.3, 0.4, 0.05, 'square');
      } else if (type === 'complete') {
        playNote(523.25, t, 0.1, 0.1); // C5
        playNote(659.25, t + 0.15, 0.1, 0.1); // E5
        playNote(783.99, t + 0.3, 0.1, 0.1); // G5
        playNote(1046.50, t + 0.45, 0.5, 0.1); // C6
      }
    } catch (e) {
      // Silently fail if Audio is blocked
    }
  };

  useEffect(() => {
    if (currentQuestion?.type === 'multiple-choice' && currentQuestion.options) {
      const mapped = currentQuestion.options.map((opt, i) => ({ id: `${currentQuestion.id}-${i}`, text: opt }));
      // simple shuffle
      for (let i = mapped.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [mapped[i], mapped[j]] = [mapped[j], mapped[i]];
      }
      setShuffledOptions(mapped);
    } else {
      setShuffledOptions([]);
    }
  }, [currentIndex, currentQuestion]);

  useEffect(() => {
    setShowRevealPanel(false);
    setShowExplainPanel(false);
  }, [currentIndex]);

  // Enter key support
  // Fullscreen support
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Menu handers
  const toggleAudio = () => setIsAudioEnabled(prev => !prev);
  const toggleRevealPanel = () => setShowRevealPanel((previous) => !previous);
  const toggleExplainPanel = () => setShowExplainPanel((previous) => !previous);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (!isAnswered && canSubmit()) {
          handleAnswer();
        } else if (isAnswered) {
          handleNext();
        }
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [isAnswered, selectedOption, textInput]);

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

  const canSubmit = () => {
    if (currentQuestion.type === 'fill-in-blank') {
      return textInput.trim().length > 0;
    }
    return selectedOption !== null;
  };

  const handleHintUse = () => {
    if (keysCount <= 0 || isAnswered || revealUsed[currentIndex] || showExplainPanel) return;
    
    const alreadyEliminated = eliminatedByHint[currentIndex] || [];
    const wrongChoices = shuffledOptions
      .filter(opt => opt.text !== currentQuestion.correctAnswer)
      .filter(opt => !alreadyEliminated.includes(opt.text));
    
    if (wrongChoices.length === 0) return;
    
    const randomWrong = wrongChoices[Math.floor(Math.random() * wrongChoices.length)];
    setEliminatedByHint(prev => ({
      ...prev,
      [currentIndex]: [...alreadyEliminated, randomWrong.text]
    }));
    setKeysCount(k => Math.max(0, k - 1));
    setCurrentPoints(prev => Math.max(0, prev - 5));
    playSound('correct');
  };

  const handleRevealUse = () => {
    if (revealUsed[currentIndex] || isAnswered || showExplainPanel) return;
    setRevealUsed(prev => ({ ...prev, [currentIndex]: true }));
    setShowRevealPanel(true);
  };

  const showTransientPopup = (msg: string, ms = 1500) => {
    setPopupMessage(msg);
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), ms);
  };

  const handleAnswer = (userSelection?: string) => {
    if (isSubmitting || viewIndex < currentIndex) return;
    if (!userSelection && !canSubmit()) return;
    setIsSubmitting(true);

    let correct = false;
    let userAnswer = '';

    if (currentQuestion.type === 'fill-in-blank') {
      userAnswer = textInput.trim().toLowerCase();
      const correctAnswer = currentQuestion.correctAnswer.toLowerCase().trim();
      correct = userAnswer === correctAnswer || userAnswer.replace(/\s+/g, '') === correctAnswer.replace(/\s+/g, '');
    } else {
      if (userSelection) {
        userAnswer = userSelection;
      } else if (selectedOption) {
        const sel = shuffledOptions.find(o => o.id === selectedOption);
        userAnswer = sel ? sel.text : '';
      } else {
        setIsSubmitting(false);
        return;
      }
      correct = userAnswer === currentQuestion.correctAnswer;
    }

    if (!correct) {
      setShakeCard(true);
      playSound('incorrect');
      setTimeout(() => setShakeCard(false), 500);
      setHeartsCount(prev => Math.max(0, prev - 1));
      setStreak(0);
      
      const newFailed = [...(failedOptions[currentIndex] || []), userAnswer];
      setFailedOptions(prev => ({ ...prev, [currentIndex]: newFailed }));

      if (currentQuestion.type === 'multiple-choice' || currentQuestion.type === 'true-false') {
        const maxAttempts = currentQuestion.options ? currentQuestion.options.length - 1 : 1;
        if (newFailed.length >= maxAttempts) {
          setIsCorrect(false);
          setIsAnswered(true);
          setAnswerHistory(prev => {
            const newHist = [...prev];
            newHist[viewIndex] = false;
            return newHist;
          });
        }
      } else {
        // Fill in blank - 1 attempt? or multiple? Let's say 3 attempts.
        if (newFailed.length >= 3) {
          setIsCorrect(false);
          setIsAnswered(true);
          setAnswerHistory(prev => {
            const newHist = [...prev];
            newHist[viewIndex] = false;
            return newHist;
          });
        }
      }
      setIsSubmitting(false);
      return;
    }

    setIsCorrect(true);
    setIsAnswered(true);
    setAnswerHistory(prev => {
      const newHist = [...prev];
      newHist[viewIndex] = true;
      return newHist;
    });

    const wasHintUsed = (eliminatedByHint[currentIndex] || []).length > 0;
    const ptsAwarded = wasHintUsed ? 5 : 10;
    setCurrentPoints(prev => prev + ptsAwarded);
    setScore(s => s + 1);
    const newStreak = streak + 1;
    setStreak(newStreak);
    setMaxStreak(Math.max(maxStreak, newStreak));

    // Achievement pills (only 2 triggers inside "CORRECT!" popup)
    if (newStreak === 2) {
      setAchievementPill('streak');
    } else if (newStreak === 3 && scoreMultiplier < 2) {
      setAchievementPill('multiplier2');
    } else if (newStreak === 5 && scoreMultiplier < 3) {
      setAchievementPill('multiplier3');
    }

    if (newStreak > 0 && newStreak % 3 === 0) {
      const bonus = newStreak * 5;
      setStreakBonusXP(prev => prev + bonus);
      playSound('streak');
    } else {
      playSound('correct');
    }

    setShowRoundResult(true);
    setTimeout(() => {
      setShowRoundResult(false);
      setAchievementPill(null);
      setTimeout(() => handleNext(), 500);
    }, 1200);

    import('canvas-confetti').then((confetti) => {
      confetti.default({ particleCount: 30, spread: 40, colors: ['#75D06A', '#6ED1CF'], origin: { y: 0.6 } });
    }).finally(() => setIsSubmitting(false));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setViewIndex(prev => prev + 1);
      setIsAnswered(false);
      setSelectedOption(null);
      setTextInput('');
      setIsCorrect(false);
      
    } else {
      finishLesson();
    }
  };

  const finishLesson = () => {
    setShowResult(true);
    setShowConfetti(true);
    playSound('complete');
    setTimeout(() => setShowConfetti(false), 5000);
  };

  const theme = type === 'quiz' 
    ? {
        gradient: 'bg-gradient-to-br from-[#7274ED] via-[#9956DE] to-[#7274ED]',
        text: 'text-[#7274ED]',
        bgLight: 'bg-[#7274ED]/10',
        border: 'border-[#7274ED]/30',
        accent: 'bg-[#7274ED]/100',
        iconColor: 'text-white/20'
      }
    : {
        gradient: 'bg-gradient-to-br from-[#75D06A] via-[#6ED1CF] to-[#75D06A]',
        text: 'text-[#75D06A]',
        bgLight: 'bg-[#75D06A]/10',
        border: 'border-[#75D06A]/30',
        accent: 'bg-[#75D06A]/100',
        iconColor: 'text-white/20'
      };

  const getTopicIcons = () => {
    const t = title.toLowerCase();
    if (t.includes('geometry') || t.includes('shape')) {
      return [Triangle, Circle, Square, Box, Ruler, Scaling];
    }
    if (t.includes('algebra') || t.includes('equation')) {
      return [X, Divide, Braces, FunctionSquare, Calculator, Percent];
    }
    if (t.includes('calculus') || t.includes('derivative') || t.includes('integral')) {
      return [Sigma, FunctionSquare, TrendingUp, Calculator, Divide, Braces];
    }
    if (t.includes('statistics') || t.includes('probability')) {
      return [Target, TrendingUp, Box, Circle, Triangle, Square];
    }
    // Default Math
    return [Calculator, Sigma, Divide, Percent, FunctionSquare, Binary];
  };

  const TopicIcons = getTopicIcons();
  const MainIcon = TopicIcons[0];
  const scoreMultiplier = Math.min(2, 1 + (streak * 0.1));

if (showResult) {
    const percentage = Math.round((score / questions.length) * 100);
    const isExcellent = percentage >= 80;
    const isGood = percentage >= 50 && percentage < 80;
    const isNeedsWork = percentage < 50;
    const baseXP = type === 'quiz' ? 100 : 50;
    const scoreXP = Math.round((score / questions.length) * 100);
    const totalXP = baseXP + scoreXP + streakBonusXP;
    const modalRoot = document.getElementById('modal-root');

    const resultModal = (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40">
        {showConfetti && <Confetti />}
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
              <img src="/mascot/modules_avatar.png" alt="Mascot" className="w-16 h-16 sm:w-20 sm:h-20 mx-auto drop-shadow-xl" />
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
                  <AnimatedCounter value={score} label="Correct Answers" delay={500} icon={<Check size={14} className="h-3 w-3 text-emerald-500" />} />
                  <AnimatedCounter value={currentPoints} label="Total XP Earned" delay={800} icon={<Zap size={14} className="h-3 w-3 text-amber-500" />} />
                  
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
                   setCurrentIndex(0);
                   setViewIndex(0);
                   setSelectedOption(null);
                   setTextInput('');
                   setScore(0);
                   setStreak(0);
                   setMaxStreak(0);
                   setCurrentPoints(0);
                   setAnswerHistory([]);
                   setIsAnswered(false);
                   setIsCorrect(false);
setShowResult(false);
                    setEliminatedByHint({});
                   setRevealUsed({});
                   setFailedOptions({});
                 }}
                 className="w-full h-10 sm:h-11 rounded-2xl text-xs font-black bg-white hover:bg-slate-50 text-purple-600 border-2 border-purple-100"
               >
                 RETAKE QUIZ
               </Button>
               <Button
                 size="lg"
                 onClick={() => onComplete(percentage, totalXP)}
                 className="w-full h-10 sm:h-11 rounded-2xl text-xs font-black bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200"
               >
                 BACK TO MODULE
               </Button>
            </div>
        </motion.div>
      </div>
    );

    return createPortal(resultModal, modalRoot!);
  }

  return (
    <>
      {showConfetti && <Confetti />}
      {/* Calculator via portal to escape z-index context */}
      {showCalculator && createPortal(
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="fixed right-6 top-1/2 -translate-y-1/2 z-[9999] w-64">
          <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-[0_10px_40px_rgba(0,0,0,0.2)]">
            <div className="flex items-center justify-between mb-2 px-1">
              <h4 className="text-xs font-bold text-[#0a1628] flex items-center gap-2">
                <Calculator size={14} className="text-purple-600" /> Calculator
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
            <div className="flex flex-col gap-2">
              <Button onClick={onBack} className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-full">
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

      <AnimatePresence>
        {showPopup && popupMessage && (
          <motion.div
            key="popup"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[75] pointer-events-none"
            style={{ willChange: 'transform, opacity' }}
          >
            <div className="bg-white/90 px-4 py-2 rounded-2xl shadow-xl font-bold text-sm">
              {popupMessage}
            </div>
          </motion.div>
        )}
        {showRoundResult && (
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
              <h2 className={`text-3xl md:text-4xl font-black mb-4 uppercase tracking-widest ${isCorrect ? "text-emerald-500" : "text-rose-500"}`}>
                {isCorrect ? "Correct!" : "Incorrect"}
              </h2>
              {isCorrect ? (
                 <div className="flex flex-col items-center gap-3 w-full justify-center">
                    <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full font-bold border border-emerald-500/30">
                       <span>+ {(eliminatedByHint[currentIndex] || []).length > 0 ? 5 : 10} XP</span>
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
              ) : (
                 <div className="bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold px-5 py-2 rounded-xl text-center">
                    Correct: {currentQuestion.correctAnswer}
                 </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed inset-0 z-50 h-screen w-full flex flex-col bg-slate-50 overflow-hidden">
        {/* Sticky Header */}
        <header className={`relative shrink-0 flex flex-col items-center justify-start px-4 pt-4 sm:pt-6 pb-6 z-[60] shadow-md overflow-hidden ${theme.gradient} rounded-b-[32px] sm:rounded-b-[40px] min-h-[110px] sm:min-h-[130px]`}>
          <div className="absolute inset-0 z-0 pointer-events-none">
             <div className="absolute top-0 left-0 w-64 h-64 bg-white opacity-10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl"></div>
             <div className="absolute bottom-0 right-0 w-80 h-80 bg-white opacity-10 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl"></div>
             {TopicIcons.map((Icon, i) => (
               <div key={i} className="absolute text-white/10" style={{ top: `${10 + (i * 15)}%`, left: `${10 + (i * 25) % 80}%`, transform: `rotate(${i * 45}deg) scale(${1 + (i % 3) * 0.2})`}}>
                 <Icon size={48 + (i % 2) * 32} />
               </div>
             ))}
          </div>

          <div className="w-full max-w-7xl flex items-start justify-between relative z-10 mb-4 sm:mb-6">
            <div className="flex-1 pointer-events-none"></div>

            <div className="relative flex items-center justify-center bg-purple-900/40 backdrop-blur-md px-6 sm:px-8 py-3 rounded-full border border-white/10 gap-3 sm:gap-4 shadow-inner">
              <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-yellow-400 shrink-0 shadow-[0_0_10px_rgba(250,204,21,0.6)]"></div>
              <div className="flex flex-col items-start justify-center">
                 <span className="text-[10px] sm:text-[11px] font-black text-purple-200 uppercase tracking-widest leading-none mb-1">Try It Yourself!</span>
                 <span className="font-bold text-white tracking-wide text-base sm:text-lg leading-none truncate max-w-[200px] sm:max-w-[300px]">LESSON {lesson.id || '1'}</span>
              </div>
            </div>

            <div className="flex-1 flex justify-end gap-2 sm:gap-3 relative pointer-events-auto">
               <button onClick={toggleAudio} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-900/20 text-white flex items-center justify-center hover:bg-purple-900/40 transition-colors shadow-sm border border-white/10">
                 {isAudioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
               </button>
               <button onClick={toggleFullscreen} className="hidden sm:flex w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-900/20 text-white items-center justify-center hover:bg-purple-900/40 transition-colors shadow-sm border border-white/10">
                 {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
               </button>
               <button onClick={() => setShowMenu(true)} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-900/20 text-white flex items-center justify-center hover:bg-purple-900/40 transition-colors shadow-sm border border-white/10">
                 <Menu size={20} />
               </button>
            </div>
          </div>

          <div className="w-full max-w-[50rem] flex items-center justify-center px-4 z-10">
             <div className="w-full flex items-center gap-2 sm:gap-3">
                 {questions.map((_, i) => (
                    <div key={i} className={`h-1.5 sm:h-2 rounded-full flex-1 transition-all ${i <= currentIndex ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-white/20'}`} />
                 ))}
             </div>
          </div>
        </header>

        {/* Menu Modal */}
        <AnimatePresence>
          {showMenu && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowMenu(false)}>
              <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white rounded-[32px] p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-200 flex flex-col gap-4 text-center">
                <h2 className="text-2xl font-black text-[#0a1628]">Pause Menu</h2>
                <Button onClick={() => setShowMenu(false)} className="w-full py-6 rounded-2xl bg-slate-100 text-slate-700 font-bold">Continue Quiz</Button>
                <Button onClick={onBack} className="w-full py-6 rounded-2xl bg-red-500 text-white font-bold">Exit Quiz</Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sticky Stats Bar with Nav Arrows */}
        <div className="w-full max-w-[54rem] mx-auto shrink-0 flex items-center justify-between px-4 sm:px-6 py-2 sm:py-3 z-[50] relative mt-4">
           <button 
             onClick={() => setViewIndex(prev => Math.max(0, prev - 1))} 
             disabled={viewIndex === 0}
             className={`w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-full flex items-center justify-center shadow-md border-2 transition-all ${viewIndex === 0 ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white text-purple-600 border-purple-100 hover:bg-purple-50 hover:border-purple-200 hover:scale-105 active:scale-95'}`}
           >
             <ChevronLeft size={24} />
           </button>

           <div className="flex items-center justify-center gap-3 sm:gap-5 flex-1">
              {/* Hearts */}
              <div className="flex items-center gap-2 sm:gap-3 px-8 sm:px-10 py-2 rounded-full bg-white shadow-md border border-slate-200/60 text-rose-500 font-extrabold text-sm sm:text-base">
                 <img src="/icons/quiz_heart.png" alt="Hearts" className="w-5 h-5 object-contain" />
                 {heartsCount}
              </div>
              {/* Keys */}
              <div className="flex items-center gap-2 sm:gap-3 px-8 sm:px-10 py-2 rounded-full bg-white shadow-md border border-slate-200/60 text-yellow-500 font-extrabold text-sm sm:text-base">
                 <img src="/icons/quiz_key.png" alt="Keys" className="w-5 h-5 object-contain" />
                 {keysCount}
              </div>
              {/* Streak/Points */}
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
             onClick={() => setViewIndex(prev => Math.min(currentIndex, prev + 1))} 
             disabled={viewIndex >= currentIndex}
             className={`w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-full flex items-center justify-center shadow-md border-2 transition-all ${viewIndex >= currentIndex ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white text-purple-600 border-purple-100 hover:bg-purple-50 hover:border-purple-200 hover:scale-105 active:scale-95'}`}
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
                {(() => {
                   // Generate Tag type
                   const tags = [
                     { label: 'New', color: 'bg-blue-100 text-blue-700', icon: <Star size={14} className="mr-1.5" /> },
                     { label: 'Learning', color: 'bg-amber-100 text-amber-700', icon: <TrendingUp size={14} className="mr-1.5" /> },
                     { label: 'Retry', color: 'bg-rose-100 text-rose-700', icon: <RefreshCw size={14} className="mr-1.5" /> },
                     { label: 'Mastered', color: 'bg-emerald-100 text-emerald-700', icon: <Trophy size={14} className="mr-1.5" /> }
                   ];
                   const tag = tags[viewIndex % 4];
                   
                   return (
                     <div className={`${tag.color} px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-widest mb-6 flex items-center shadow-sm`}>
                        {tag.icon} {tag.label}
                     </div>
                   );
                })()}
                
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#0a1628] leading-tight w-full">
                  {currentQuestion.question.includes('___') ? (
                    <span>
                       {currentQuestion.question.split('___').map((part, i, arr) => (
                          <React.Fragment key={i}>
                            {part}
                            {i < arr.length - 1 && (
                              <input 
                                type="text" 
                                disabled={isCurrentlyAnswered || revealUsed[viewIndex] || showExplainPanel || (failedOptions[viewIndex]?.length > 0)}
                                value={textInput}
                                onChange={(e) => setTextInput(e.target.value)}
                                className={`inline-block w-24 mx-2 border-b-4 outline-none text-center bg-transparent font-bold ${isCurrentlyAnswered ? (answerHistory[viewIndex] ? 'border-[#75D06A] text-[#75D06A]' : 'border-rose-500 text-rose-500') : 'border-[#7C3AED] text-[#7C3AED] focus:border-[#75D06A]'}`}
                              />
                            )}
                          </React.Fragment>
                       ))}
                    </span>
                  ) : (
                    currentQuestion.question
                  )}
                </h2>
             </div>

             <div className="w-full flex flex-col items-center">
                {(currentQuestion.type === 'multiple-choice' || currentQuestion.type === 'true-false') && (
                  <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
                     {(currentQuestion.type === 'true-false' ? ['True', 'False'] : shuffledOptions).map((opt, idx) => {
                        const optionText = typeof opt === 'string' ? opt : opt.text;
                        const optionId = typeof opt === 'string' ? `${currentQuestion.id}-${idx}` : opt.id;
                        
                        const failedArr = failedOptions[viewIndex] || [];
                        const isFailed = failedArr.includes(optionText);
                        const isRevealed = revealUsed[viewIndex] || showExplainPanel;
                        const eliminatedArr = eliminatedByHint[currentIndex] || [];
                        const isEliminated = eliminatedArr.includes(optionText);
                        const eliminatedCount = eliminatedArr.length;
                        const wrongChoicesCount = shuffledOptions.filter(o => o.text !== currentQuestion.correctAnswer).length;
                        const allWrongEliminated = viewIndex === currentIndex && wrongChoicesCount > 0 && eliminatedCount >= wrongChoicesCount;
                        
                        let bgColor = 'bg-white hover:bg-slate-50 border-transparent text-slate-700 hover:border-slate-200';
                        let isAllDisabled = false;
                        if (allWrongEliminated) {
                           isAllDisabled = true;
                           if (optionText === currentQuestion.correctAnswer) {
                              bgColor = 'bg-emerald-50 border-emerald-400 text-emerald-800';
                           } else {
                              bgColor = 'bg-slate-100 border-slate-200 text-slate-400 opacity-40 line-through';
                           }
                        } else if (isEliminated) {
                           bgColor = 'bg-slate-100 border-slate-200 text-slate-400 opacity-40 line-through cursor-not-allowed';
                        } else if (isRevealed) {
                           if (optionText === currentQuestion.correctAnswer) {
                              bgColor = 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-[0_0_15px_rgba(16,185,129,0.2)] scale-[1.02] z-10';
                           } else {
                              bgColor = 'bg-slate-50 border-slate-200 text-slate-400 opacity-60';
                           }
                        } else if (isCurrentlyAnswered) {
                           if (optionText === currentQuestion.correctAnswer) {
                              bgColor = 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-[0_0_15px_rgba(16,185,129,0.2)] scale-[1.02] z-10';
                           } else if (isFailed) {
                              bgColor = 'bg-rose-50 border-rose-400 text-rose-800 opacity-60';
                           } else {
                              bgColor = 'bg-slate-50 border-slate-200 text-slate-400 opacity-60';
                           }
                        } else if (isFailed) {
                           bgColor = 'bg-rose-50 border-rose-400 text-rose-800 opacity-60';
                        } else if (selectedOption === optionId) {
                           bgColor = 'bg-purple-50 border-[#9956DE] text-[#9956DE]';
                        }

                        return (
                           <button
                             key={optionId}
                             disabled={isAllDisabled || isCurrentlyAnswered || isFailed || isRevealed || isEliminated}
                             onClick={() => {
                               if (isAllDisabled || isCurrentlyAnswered || isSubmitting || isFailed || isRevealed || isEliminated) return;
                               setSelectedOption(optionId);
                               handleAnswer(optionText);
                             }}
                             className={`p-4 sm:p-5 rounded-2xl shadow-sm border-[3px] font-extrabold text-base sm:text-lg text-left transition-all flex items-center justify-between ${bgColor} ${isCurrentlyAnswered || isRevealed || isEliminated ? 'cursor-default' : 'hover:shadow-md hover:-translate-y-0.5 active:translate-y-0'}`}
                           >
                              <span className="truncate pr-4">{optionText}</span>
                              {isEliminated && <X size={20} className="text-slate-400 shrink-0" />}
                              {isRevealed && optionText === currentQuestion.correctAnswer && <Check size={24} className="text-emerald-500 shrink-0" />}
                              {isCurrentlyAnswered && optionText === currentQuestion.correctAnswer && !isRevealed && <Check size={24} className="text-emerald-500 shrink-0" />}
                              {(isCurrentlyAnswered || isFailed) && isFailed && <X size={24} className="text-rose-500 shrink-0" />}
                           </button>
                        );
                     })}
                  </div>
                )}

                {/* Explanation Panel - Only shows when user clicks Explain button */}
                {showExplainPanel && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full mt-6 space-y-4 max-w-3xl">
                     <div className="border-2 rounded-2xl p-5 flex items-start gap-4 bg-sky-50 border-sky-200">
                       <img src="/mascot/modules_avatar.png" className="w-10 h-10 shrink-0" alt="AI Explain" />
                       <div>
                         <p className="font-extrabold text-lg mb-1 text-sky-700">
                            Explanation
                         </p>
                         <p className="text-base leading-relaxed text-sky-800">
                           {/* BACKEND HANDOFF: Explain feature placeholder.
                                When backend is ready, replace static explanation text with:
                                - AI-generated explanation: explanationText: string (markdown)
                                - Correct answer highlight: correctAnswerId: string
                                - Optional media: explanationMedia: string (URL)
                                The Explain button should trigger an API call to the AI explanation service.
                                Until then, the static `question.explanation` field is used as a placeholder. */}
                           {currentQuestion.explanation || `The correct answer is: ${currentQuestion.correctAnswer}`}
                         </p>
                       </div>
                     </div>
                  </motion.div>
                )}
</div>
            </motion.div>
          </main>

        {/* Sticky Footer */}
        <footer className={`shrink-0 relative z-[60] flex flex-col items-center justify-center p-4 sm:p-6 ${theme.gradient} rounded-t-[32px] sm:rounded-t-[40px] shadow-[0_-10px_40px_rgba(0,0,0,0.15)]`}>
<div className="absolute inset-0 z-0 pointer-events-none opacity-20">
               {TopicIcons.slice(0, 3).map((Icon, i) => (
                <div key={i} className="absolute text-white" style={{ top: `${20 + (i * 20)}%`, left: `${20 + (i * 30)}%`, transform: `rotate(${i * 30}deg) scale(1.5)`}}>
                  <Icon size={32} />
                </div>
              ))}
            </div>

            <div className="relative z-10 flex flex-col gap-3">
              {/* Past question state */}
              {viewIndex < currentIndex ? (
                <button onClick={toggleExplainPanel} className="bg-white text-slate-700 font-extrabold text-lg px-8 py-4 rounded-full flex items-center justify-center gap-3 shadow-lg hover:bg-slate-50 transition-transform hover:scale-[1.02] active:scale-[0.98] w-full border border-slate-200">
                  <img src="/mascot/modules_avatar.png" className="w-6 h-6 drop-shadow-sm" alt="AI Explain" />
                  Ask AI to Explain
                </button>
              ) : (
                <>
                  {/* Derive helper values */}
                  {(() => {
                    const eliminatedCount = (eliminatedByHint[currentIndex] || []).length;
                    const wrongChoicesCount = shuffledOptions.filter(opt => opt.text !== currentQuestion.correctAnswer).length;
                    const allWrongEliminated = wrongChoicesCount > 0 && eliminatedCount >= wrongChoicesCount;
                    const showNextButton = 
                      (isAnswered && !isCorrect) ||
                      revealUsed[currentIndex] ||
                      showExplainPanel ||
                      allWrongEliminated;

                    // After EXPLAIN clicked - only Next Question
                    if (showExplainPanel) {
                      return (
                        <button onClick={handleNext} className="bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-lg px-8 py-4 rounded-full flex items-center justify-center gap-3 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all w-full">
                          {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Lesson'} <ArrowRight size={24} />
                        </button>
                      );
                    }
                    
                    // After REVEAL clicked - Explain + Next Question
                    if (revealUsed[currentIndex]) {
                      return (
                        <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
                          <button onClick={toggleExplainPanel} className="bg-white hover:bg-slate-50 text-slate-700 font-bold px-6 sm:px-8 py-3 sm:py-3.5 rounded-full flex items-center gap-2 shadow-lg transition-transform hover:scale-105 active:scale-95 border border-slate-200">
                            <img src="/mascot/modules_avatar.png" className="w-5 h-5 drop-shadow-sm" alt="AI Explain" />
                            Explain
                          </button>
                          <button onClick={handleNext} className="bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-lg px-8 py-3 sm:py-3.5 rounded-full flex items-center justify-center gap-2 shadow-xl hover:scale-105 active:scale-95">
                            {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Lesson'} <ArrowRight size={20} />
                          </button>
                        </div>
                      );
                    }
                    
                    // All wrong eliminated or wrong after attempts - only Next Question
                    if (showNextButton) {
                      return (
                        <button onClick={handleNext} className="bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-lg px-8 py-4 rounded-full flex items-center justify-center gap-3 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all w-full">
                          {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Lesson'} <ArrowRight size={24} />
                        </button>
                      );
                    }
                    
                    // Normal state - all action buttons
                    const canUseHint = keysCount > 0 && !isAnswered && !revealUsed[currentIndex] && !showExplainPanel && !allWrongEliminated;
                    return (
                      <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
                        <button onClick={handleHintUse} disabled={!canUseHint} className="bg-white hover:bg-slate-50 disabled:opacity-70 disabled:cursor-not-allowed text-slate-700 font-bold px-6 sm:px-8 py-3 sm:py-3.5 rounded-full flex items-center gap-2 shadow-lg transition-transform hover:scale-105 active:scale-95 border border-slate-200">
                           <img src="/icons/quiz_key.png" alt="Hint" className="w-5 h-5 object-contain" />
                           Hint
                        </button>
                        <button onClick={handleRevealUse} disabled={revealUsed[currentIndex] || isAnswered || showExplainPanel} className="bg-white hover:bg-slate-50 disabled:opacity-70 disabled:cursor-not-allowed text-slate-700 font-bold px-6 sm:px-8 py-3 sm:py-3.5 rounded-full flex items-center gap-2 shadow-lg transition-transform hover:scale-105 active:scale-95 border border-slate-200">
                           <HelpCircle size={18} className="text-purple-500" />
                           Reveal
                        </button>
                        <button onClick={toggleExplainPanel} className="bg-white hover:bg-slate-50 text-slate-700 font-bold px-6 sm:px-8 py-3 sm:py-3.5 rounded-full flex items-center gap-2 shadow-lg transition-transform hover:scale-105 active:scale-95 border border-slate-200">
                           <img src="/mascot/modules_avatar.png" className="w-5 h-5 drop-shadow-sm" alt="AI Explain" />
                           Explain
                        </button>
                        <button onClick={() => setShowCalculator(prev => !prev)} className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 border border-slate-200 ${showCalculator ? 'bg-purple-100 text-purple-600 border-purple-300' : 'bg-white hover:bg-slate-50 text-slate-700'}`}>
                           <Calculator size={20} />
                        </button>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
        </footer>
      </div>
    </>
  );
};

export default InteractiveLesson;
