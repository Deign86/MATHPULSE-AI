import React, { useState, useEffect } from 'react';
import {
  X, Check, ArrowRight, Trophy, Zap, HelpCircle,
  Calculator, Sigma, Divide, Percent, Triangle, Circle, Square, Box, Ruler,
  Binary, FunctionSquare, Scaling, Braces, Star, Award, Target, TrendingUp, Flame,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';

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
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [showStreakNotification, setShowStreakNotification] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [answerHistory, setAnswerHistory] = useState<boolean[]>([]);
  const [startTime] = useState(Date.now());
  const [streakBonusXP, setStreakBonusXP] = useState(0);

  // Gamification & Flow States
  const [currentPoints, setCurrentPoints] = useState(0);
  const [hintsUsed, setHintsUsed] = useState<Record<number, boolean>>({});
  const [shakeCard, setShakeCard] = useState(false);

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

  const currentQuestion = questions[currentIndex];
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
      setShuffledOptions([...currentQuestion.options].sort(() => Math.random() - 0.5));
    }
  }, [currentIndex, currentQuestion]);

  // Enter key support
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

  const canSubmit = () => {
    if (currentQuestion.type === 'fill-in-blank') {
      return textInput.trim().length > 0;
    }
    return selectedOption !== null;
  };

  const handleHintUse = () => {
    if (!hintsUsed[currentIndex] && !isAnswered) {
      setHintsUsed(prev => ({ ...prev, [currentIndex]: true }));
      setCurrentPoints(prev => Math.max(0, prev - 5));
      playSound('correct');
    }
  };

  const handleAnswer = () => {
    if (!canSubmit()) return;

    let correct = false;
    let userAnswer = '';

    if (currentQuestion.type === 'fill-in-blank') {
      userAnswer = textInput.trim().toLowerCase();
      const correctAnswer = currentQuestion.correctAnswer.toLowerCase().trim();
      // More flexible matching
      correct = userAnswer === correctAnswer || 
                userAnswer.replace(/\s+/g, '') === correctAnswer.replace(/\s+/g, '');
    } else {
      if (!selectedOption) return;
      userAnswer = selectedOption;
      correct = userAnswer === currentQuestion.correctAnswer;
    }

    // IMMEDIATELY LOCK ANSWER (NO SECOND CHANCES)
    setIsCorrect(correct);
    setIsAnswered(true);
    setAnswerHistory([...answerHistory, correct]);

    if (!correct) {
      setShakeCard(true);
      playSound('incorrect');
      setTimeout(() => setShakeCard(false), 500);
      setStreak(0);
      return;
    }

    // CORRECT ANSWER FLOW
    const ptsAwarded = hintsUsed[currentIndex] ? 5 : 10;
    setCurrentPoints(prev => prev + ptsAwarded);
    setScore(s => s + 1);
    const newStreak = streak + 1;
    setStreak(newStreak);
    setMaxStreak(Math.max(maxStreak, newStreak));
    
    // Streak bonus
    if (newStreak > 0 && newStreak % 3 === 0) {
      const bonus = newStreak * 5;
      setStreakBonusXP(prev => prev + bonus);
      setShowStreakNotification(true);
      playSound('streak');
      setTimeout(() => setShowStreakNotification(false), 2000);
    } else {
      playSound('correct');
    }
    
    import('canvas-confetti').then((confetti) => {
      confetti.default({ particleCount: 30, spread: 40, colors: ['#75D06A', '#6ED1CF'], origin: { y: 0.6 } });
    });
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
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

  if (showResult) {
    const percentage = Math.round((score / questions.length) * 100);
    const baseXP = type === 'quiz' ? 100 : 50;
    const scoreXP = Math.round((score / questions.length) * 100);
    const totalXP = baseXP + scoreXP + streakBonusXP;
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(timeTaken / 60);
    const seconds = timeTaken % 60;
    
    return (
      <>
        {showConfetti && <Confetti />}
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-500">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="bg-white rounded-[32px] w-full max-w-lg p-6 text-center shadow-2xl relative overflow-hidden"
            style={{ willChange: 'transform, opacity' }}
          >
             {/* Decorative Background */}
             <div className={`absolute top-0 left-0 w-full h-24 ${theme.gradient} opacity-10 rounded-b-[50%]`}></div>
             
             {/* Topic Background Patterns */}
             <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03]">
                {TopicIcons.map((Icon, i) => (
                  <Icon 
                    key={i} 
                    className="absolute text-[#0a1628]"
                    size={30 + (i % 3) * 15}
                    style={{
                      top: `${Math.random() * 100}%`,
                      left: `${Math.random() * 100}%`,
                      transform: `rotate(${Math.random() * 360}deg)`
                    }}
                  />
                ))}
             </div>

              <div className="relative mb-4 flex justify-center">
                 <motion.div 
                   initial={{ scale: 0, rotate: -180 }}
                   animate={{ scale: 1, rotate: 0 }}
                   transition={{ type: 'spring', damping: 25, stiffness: 200, delay: 0.2 }}
                   className="w-20 h-20 bg-gradient-to-br from-[#FB96BB] to-[#FFB356] rounded-full flex items-center justify-center text-white shadow-2xl shadow-rose-200"
                   style={{ willChange: 'transform' }}
                 >
                   <Trophy size={40} fill="currentColor" />
                 </motion.div>
                 {/* Sparkles - Kept as Motion hybrid for complex infinite rotation that WAAPI can't cleanly support */}
                 <motion.div 
                   animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
                   transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                   className="absolute top-0 right-1/3 text-xl"
                 >
                   <Sparkles size={20} className="text-rose-400" />
                 </motion.div>
                 <motion.div 
                   animate={{ scale: [1, 1.2, 1], rotate: [0, -180, -360] }}
                   transition={{ duration: 2, repeat: Infinity, delay: 0.5, ease: 'easeInOut' }}
                   className="absolute bottom-0 left-1/3 text-xl"
                 >
                   <Sparkles size={20} className="text-rose-400" />
                 </motion.div>
              </div>
             
              <motion.h2 
                 initial={{ y: 20, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 transition={{ duration: 0.4, delay: 0.3, ease: 'easeOut' }}
                 className="text-3xl font-bold text-[#0a1628] mb-2"
                 style={{ willChange: 'transform, opacity' }}
              >
                 {percentage >= 90 ? 'Perfect!' : 
                  percentage >= 80 ? 'Excellent Job!' : 
                  percentage >= 70 ? 'Great Work!' :
                  percentage >= 60 ? 'Good Effort!' : 
                  'Keep Practicing!'}
              </motion.h2>
              
              <motion.p 
                 initial={{ y: 20, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 transition={{ duration: 0.4, delay: 0.4, ease: 'easeOut' }}
                 className="text-[#5a6578] mb-6 font-medium"
                 style={{ willChange: 'transform, opacity' }}
              >
                 You answered {score} out of {questions.length} questions correctly
              </motion.p>
             
              {/* Detailed Stats Grid */}
              <motion.div 
                 initial={{ y: 20, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 transition={{ duration: 0.4, delay: 0.5, ease: 'easeOut' }}
                 className="grid grid-cols-2 gap-3 mb-5"
                 style={{ willChange: 'transform, opacity' }}
              >
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-4 border-2 border-[#7274ED]/30">
                  <div className="flex items-center justify-center mb-1">
                    <Target className="text-sky-600" size={20} />
                  </div>
                  <p className="text-[10px] text-sky-600 font-bold uppercase mb-1 tracking-wider">Accuracy</p>
                  <p className="text-3xl font-black text-sky-700">{percentage}%</p>
                </div>
                
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-4 border-2 border-[#FFB356]/30">
                  <div className="flex items-center justify-center mb-1">
                    <Zap className="text-orange-600" size={20} />
                  </div>
                  <p className="text-[10px] text-orange-600 font-bold uppercase mb-1 tracking-wider">Total XP</p>
                  <p className="text-3xl font-black text-orange-600">+{totalXP}</p>
                </div>

                <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl p-4 border-2 border-[#75D06A]/30">
                  <div className="flex items-center justify-center mb-1">
                    <Flame className="text-[#75D06A]" size={20} />
                  </div>
                  <p className="text-[10px] text-[#75D06A] font-bold uppercase mb-1 tracking-wider">Best Streak</p>
                  <p className="text-3xl font-black text-teal-700">{maxStreak}x</p>
                </div>
                
                <div className="bg-gradient-to-br from-sky-50 to-sky-100 rounded-2xl p-4 border-2 border-[#7274ED]/30">
                  <div className="flex items-center justify-center mb-1">
                    <Award className="text-sky-600" size={20} />
                  </div>
                  <p className="text-[10px] text-sky-600 font-bold uppercase mb-1 tracking-wider">Time</p>
                  <p className="text-3xl font-black text-sky-700">{minutes}:{seconds.toString().padStart(2, '0')}</p>
                </div>
             </motion.div>

              {/* XP Breakdown */}
              <motion.div 
                 initial={{ y: 20, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 transition={{ duration: 0.4, delay: 0.6, ease: 'easeOut' }}
                 className="bg-[#edf1f7] rounded-2xl p-4 mb-5 text-left"
                 style={{ willChange: 'transform, opacity' }}
              >
                <h3 className="font-bold text-[#0a1628] mb-2 flex items-center gap-2 text-sm">
                  <Star className="text-rose-500" size={16} />
                  XP Breakdown
                </h3>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-[#5a6578] text-xs">Base XP ({type})</span>
                    <span className="font-bold text-[#0a1628] text-sm">+{baseXP}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#5a6578] text-xs">Score Bonus ({percentage}%)</span>
                    <span className="font-bold text-[#0a1628] text-sm">+{scoreXP}</span>
                  </div>
                  {streakBonusXP > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-[#5a6578] text-xs">Streak Bonuses</span>
                      <span className="font-bold text-orange-600 text-sm">+{streakBonusXP}</span>
                    </div>
                  )}
                  <div className="border-t-2 border-[#dde3eb] pt-1.5 flex justify-between items-center">
                    <span className="text-[#0a1628] font-bold text-xs">Total XP Earned</span>
                    <span className="font-black text-orange-600">+{totalXP}</span>
                  </div>
                </div>
             </motion.div>

              {/* Answer History */}
              <motion.div 
                 initial={{ y: 20, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 transition={{ duration: 0.4, delay: 0.7, ease: 'easeOut' }}
                 className="flex items-center justify-center gap-1.5 mb-6"
                 style={{ willChange: 'transform, opacity' }}
              >
                 {answerHistory.map((correct, idx) => (
                   <motion.div
                     key={idx}
                     initial={{ scale: 0 }}
                     animate={{ scale: 1 }}
                     transition={{ type: 'spring', damping: 25, stiffness: 200, delay: 0.7 + (idx * 0.05) }}
                     className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                       correct ? 'bg-[#75D06A]/100' : 'bg-red-400'
                     }`}
                     style={{ willChange: 'transform' }}
                   >
                     {correct ? (
                       <Check className="text-white" size={14} />
                     ) : (
                       <X className="text-white" size={14} />
                     )}
                   </motion.div>
                 ))}
              </motion.div>

              <motion.div
                 initial={{ y: 20, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 transition={{ duration: 0.4, delay: 0.8, ease: 'easeOut' }}
                 style={{ willChange: 'transform, opacity' }}
              >
                <Button 
                  onClick={() => onComplete(percentage, totalXP)}
                  className={`w-full py-5 rounded-2xl font-bold ${theme.gradient} text-white hover:opacity-90 shadow-xl hover:shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98]`}
                >
                  Continue Learning
                </Button>
             </motion.div>
          </motion.div>
        </div>
      </>
    );
  }

  return (
    <>
      {showConfetti && <Confetti />}
      <AnimatePresence>
        {showStreakNotification && <StreakNotification streak={streak} />}
      </AnimatePresence>

      <div className="fixed inset-0 z-50 flex flex-col bg-[#edf1f7] overflow-hidden font-sans">
        
        {/* Dynamic Background with Wave Shape */}
        <div className={`absolute top-0 left-0 right-0 h-[45vh] ${theme.gradient} rounded-b-[60px] md:rounded-b-[80px] shadow-2xl z-0 overflow-hidden`}>
          {/* Decorative Circles */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl"></div>
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-white opacity-10 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl"></div>
          <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-white opacity-5 rounded-full blur-xl"></div>
          
          {/* Floating Topic Symbols */}
          <div className="absolute inset-0 overflow-hidden">
            {TopicIcons.map((Icon, i) => (
               <div 
                 key={i}
                 className="absolute text-white/10 animate-pulse"
                 style={{
                   top: `${10 + (i * 15)}%`,
                   left: `${10 + (i * 25) % 80}%`,
                   animationDuration: `${3 + i}s`,
                   transform: `rotate(${i * 45}deg) scale(${1 + (i % 3) * 0.2})`
                 }}
               >
                 <Icon size={48 + (i % 2) * 32} />
               </div>
            ))}
            <div className="absolute -bottom-10 -left-10 text-white/5 rotate-12">
               <MainIcon size={200} />
            </div>
          </div>
        </div>

        {/* Header - Fixed z-index */}
        <header className="relative z-[60] h-20 flex items-center justify-between px-6 pt-2 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <button 
              onClick={onBack} 
              className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-all border border-slate-300 hover:scale-110 active:scale-95"
            >
              <X size={20} />
            </button>
            <div className="text-white">
              <h1 className="font-bold text-lg leading-tight">{title}</h1>
              <div className="flex items-center gap-2 opacity-80 text-xs font-medium uppercase tracking-wide">
                <span>{type}</span>
                <span className="w-1 h-1 bg-white rounded-full"></span>
                <span>Question {currentIndex + 1}/{questions.length}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center flex-1">
            {/* Center placement in header is empty now */}
          </div>

          <div className="flex items-center justify-end gap-4 flex-1">
            {/* Right side placeholder to keep center aligned */}
          </div>
        </header>

        {/* Floating Animated Orbs - Optimized with WAAPI-backed animations */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          {orbs.map((orb) => (
            <motion.div
              key={orb.id}
              className={`absolute rounded-full blur-3xl ${orb.color}`}
              style={{
                width: orb.size,
                height: orb.size,
                left: `${orb.x}%`,
                top: `${orb.y}%`,
                willChange: 'transform'
              }}
              animate={{
                x: [0, Math.random() * 100 - 50, 0],
                y: [0, Math.random() * 100 - 50, 0],
                scale: [1, 1.2, 1],
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

        {/* Main Content */}
        <main className="relative z-10 flex-1 flex flex-col items-center justify-start px-4 sm:px-6 xl:px-10 pb-8 pt-4 md:pt-8 overflow-y-auto">
          
          {/* Progress Bar & Gamification Header */}
          <div className="w-full max-w-lg mb-6 sm:mb-8 px-2 flex items-center justify-between gap-6 shrink-0 mt-2">
            <div className="flex-1">
              <div className="flex justify-between items-center text-[10px] font-bold text-white/80 mb-2 uppercase tracking-wider">
                <span>Progress</span>
                <span className="bg-white/20 px-2 py-0.5 rounded-full flex items-center gap-1"><Zap size={10} /> {currentPoints} pts</span>
              </div>
               <div className="flex items-center justify-between gap-1 w-full backdrop-blur-sm">
                 {questions.map((_, idx) => {
                   let dotClass = 'bg-white/30';
                   if (idx < currentIndex) {
                     dotClass = answerHistory[idx] ? 'bg-[#75D06A]' : 'bg-[#FF8B8B]';
                   } else if (idx === currentIndex) {
                     dotClass = 'bg-white shadow-[0_0_8px_white] scale-y-125';
                   }
                   return (
                     <motion.div
                       key={idx}
                       className={`flex-1 h-2 rounded-full transition-all duration-300 ${dotClass}`}
                       style={{ willChange: 'transform' }}
                     />
                   );
                 })}
               </div>
            </div>

            {/* Breathing Streak Indicator - Optimized with WAAPI-backed animations */}
            <motion.div 
               animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }}
               transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
               className="flex items-center justify-center flex-shrink-0"
               title={`${streak} Streak`}
               style={{ willChange: 'transform, opacity' }}
            >
              <div className="relative flex items-center justify-center w-14 h-14 mt-3">
                <Flame 
                  size={54} 
                  className={`absolute drop-shadow-lg ${
                    streak >= 10 ? 'text-red-600 drop-shadow-[0_0_15px_rgba(220,38,38,0.8)]' : 
                    streak >= 5 ? 'text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.7)]' : 
                    streak >= 3 ? 'text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]' : 
                    streak >= 1 ? 'text-orange-400 drop-shadow-[0_0_6px_rgba(251,146,60,0.5)]' : 
                    'text-yellow-400 opacity-60'
                  }`} 
                  fill="currentColor" 
                  strokeWidth={1} 
                />
                <span className="absolute z-10 text-white font-black text-xl mt-3 drop-shadow-md">{streak}</span>
              </div>
            </motion.div>
          </div>

          {/* Milestone Notification - Optimized with WAAPI-backed animations */}
          {currentIndex === Math.floor(questions.length / 2) && currentIndex > 0 && !isAnswered && (
            <motion.div
              initial={{ scale: 0, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="mb-4 bg-white/20 backdrop-blur-md text-white px-6 py-3 rounded-2xl font-bold shadow-lg"
              style={{ willChange: 'transform' }}
            >
                            <Target size={20} className="inline mr-2 text-white" />
              Halfway there! Keep it up!
            </motion.div>
          )}

          {/* Question Card - Optimized with WAAPI-backed animations */}
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentIndex}
              initial={{ opacity: 0, x: 100 }}
              animate={shakeCard ? { x: [-10, 10, -10, 10, 0], scale: [1, 1.01, 1], opacity: 1 } : { opacity: 1, x: 0 }}
              transition={shakeCard ? { duration: 0.4 } : { type: 'spring', damping: 30, stiffness: 300 }}
              exit={{ opacity: 0, x: -100 }}
              className="w-full max-w-[50rem] mx-auto flex flex-col flex-1 pb-10"
              style={{ willChange: 'transform, opacity' }}
            >
              <div className="bg-white rounded-[32px] sm:rounded-[40px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] overflow-hidden border border-[#dde3eb] flex flex-col relative flex-1 min-h-[450px]">
                
                {/* Visual state top bar - Optimized with WAAPI-backed animations */}
                <motion.div 
                  animate={{
                    backgroundColor: isAnswered
                      ? (isCorrect ? '#75D06A' : '#FF8B8B') // green (correct) or red (incorrect)
                      : '#7C3AED' // purple (default)
                  }}
                  className="h-2 w-full absolute top-0 left-0 z-20"
                  style={{ willChange: 'background-color' }}
                />

                {/* Question Area */}
                <div className="p-6 sm:p-8 md:p-10 shrink-0 flex flex-col items-center justify-center text-center mt-2">
                   <span className={`inline-block px-4 py-1.5 ${theme.bgLight} ${theme.text} rounded-full text-[10px] sm:text-[11px] font-black mb-4 sm:mb-8 uppercase tracking-widest border ${theme.border}`}>
                     {currentQuestion.type === 'multiple-choice' ? 'Multiple Choice' : 
                      currentQuestion.type === 'true-false' ? 'True or False' : 'Fill in the Blank'}
                   </span>
                   <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#0a1628] leading-snug w-full">
                     {currentQuestion.question.includes('___') ? (
                       <span>
                          {currentQuestion.question.split('___').map((part, i, arr) => (
                             <React.Fragment key={i}>
                               {part}
                               {i < arr.length - 1 && (
                                 <input 
                                   type="text" 
                                   disabled={isAnswered}
                                   value={textInput}
                                   onChange={(e) => setTextInput(e.target.value)}
                                   className={`inline-block w-24 mx-2 border-b-4 outline-none text-center bg-transparent font-bold ${isAnswered ? (isCorrect ? 'border-[#75D06A] text-[#75D06A]' : 'border-red-500 text-red-500') : 'border-[#7C3AED] text-[#7C3AED] focus:border-[#75D06A]'}`}
                                 />
                               )}
                             </React.Fragment>
                          ))}
                       </span>
                     ) : (
                       currentQuestion.question
                     )}
                   </h2>

                   {!isAnswered && currentQuestion.explanation && (
                      <button 
                         onClick={handleHintUse}
                         disabled={hintsUsed[currentIndex]}
                         className={`mt-6 flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full transition-all ${
                           hintsUsed[currentIndex] 
                             ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                             : 'bg-orange-100 text-orange-600 hover:bg-orange-200 shadow-sm'
                         }`}
                      >
                        <Zap size={14} />
                        {hintsUsed[currentIndex] ? 'Hint Used' : 'Use Hint (-5 pts)'}
                      </button>
                   )}
                   {hintsUsed[currentIndex] && !isAnswered && (
                      <div className="mt-4 text-sm bg-orange-50 border border-orange-200 text-orange-700 px-4 py-2 rounded-xl">
                         <strong>Hint:</strong> {typeof currentQuestion.explanation === 'string' ? currentQuestion.explanation.substring(0, 80) : 'Check your concepts...'}
                      </div>
                   )}
                </div>

                {/* Answer Area */}
                <div className="p-4 sm:p-6 md:p-8 bg-[#edf1f7]/80 backdrop-blur-sm border-t border-[#dde3eb] flex-1 overflow-y-auto flex flex-col justify-center">
                  {/* Multiple Choice & True/False */}
                  {(currentQuestion.type === 'multiple-choice' || currentQuestion.type === 'true-false') && (
                    <div className="w-full max-w-4xl mx-auto flex flex-col">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full">
                        {(currentQuestion.type === 'true-false' ? ['True', 'False'] : shuffledOptions).map((option, idx) => {
                           let stateClasses = "hover:border-[#dde3eb] hover:shadow-lg bg-white border-[#dde3eb] text-[#5a6578] shadow-sm";
                           
                           if (isAnswered) {
                             if (option === currentQuestion.correctAnswer) {
                               stateClasses = "bg-[#75D06A]/10 border-[#75D06A] text-teal-700 shadow-teal-100 ring-2 ring-teal-200";
                             } else if (option === selectedOption) {
                               // This was their selected WRONG answer
                               stateClasses = "bg-red-50 border-red-500 text-red-700 shadow-red-100 ring-2 ring-red-200 opacity-80";
                             } else {
                               // Disabled other options
                               stateClasses = "bg-[#edf1f7] border-[#dde3eb] text-slate-500 opacity-60 scale-[0.98]";
                             }
                           } else if (selectedOption === option) {
                             stateClasses = `bg-purple-50 border-[#7C3AED] text-[#7C3AED] ring-2 ring-indigo-100 shadow-md scale-[1.02] z-10`;
                           }

                            return (
                             <motion.button
                               key={idx}
                               disabled={isAnswered}
                               onClick={() => setSelectedOption(option)}
                               whileHover={!isAnswered ? { scale: 1.02 } : {}}
                               whileTap={!isAnswered ? { scale: 0.98 } : {}}
                               transition={{ duration: 0.15, ease: 'easeOut' }}
                               className={`
                                 relative p-4 sm:p-5 md:p-6 rounded-2xl md:rounded-[20px] border-2 font-bold text-base sm:text-lg transition-all duration-200 text-left flex items-center justify-between group min-h-[4rem] sm:min-h-[5rem] w-full
                                 ${stateClasses}
                               `}
                               style={{ willChange: 'transform' }}
                             >
                               <span className="relative z-10 break-words line-clamp-3 pr-2 w-full">{option}</span>
                               {isAnswered && option === currentQuestion.correctAnswer && (
                                 <motion.div 
                                   initial={{ scale: 0 }}
                                   animate={{ scale: 1 }}
                                   transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                   className="bg-[#75D06A] p-1 rounded-full"
                                   style={{ willChange: 'transform' }}
                                 >
                                   <Check size={18} className="text-white" />
                                 </motion.div>
                               )}
                               {isAnswered && option === selectedOption && option !== currentQuestion.correctAnswer && (
                                 <motion.div 
                                   initial={{ scale: 0 }}
                                   animate={{ scale: 1 }}
                                   transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                   className="bg-red-100 p-1 rounded-full"
                                   style={{ willChange: 'transform' }}
                                 >
                                   <X size={18} className="text-red-600" />
                                 </motion.div>
                               )}
                              {!isAnswered && (
                                <div className={`w-6 h-6 rounded-full border-2 border-[#dde3eb] group-hover:border-[#dde3eb] transition-colors ${selectedOption === option ? `bg-current border-current ${theme.text}` : ''}`}></div>
                              )}
                            </motion.button>
                           );
                        })}
                      </div>

                       {/* Explanations - Optimized with WAAPI-backed animations */}
                       {isAnswered && (
                         <motion.div
                           initial={{ opacity: 0, y: -10 }}
                           animate={{ opacity: 1, y: 0 }}
                           transition={{ duration: 0.3, ease: 'easeOut' }}
                           className="space-y-3 mt-6 w-full"
                           style={{ willChange: 'transform, opacity' }}
                         >
                          {/* Show explanation for wrong answer first (if wrong) */}
                          {!isCorrect && selectedOption && selectedOption !== currentQuestion.correctAnswer && (
                            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 mt-0.5">
                                  <X size={20} className="text-red-500" />
                                </div>
                                <div>
                                  <p className="font-bold text-red-700 mb-1">Incorrect</p>
                                  <p className="text-red-800 text-sm leading-relaxed">
                                     {typeof currentQuestion.explanation === 'string' ? currentQuestion.explanation : (currentQuestion.explanation as any)?.incorrect}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Always show correct answer explanation */}
                          <div className={`bg-[#75D06A]/10 border-2 border-[#75D06A]/30 rounded-2xl p-4 ${isCorrect ? 'block' : 'hidden'}`}>
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 mt-0.5">
                                <Check size={20} className="text-[#75D06A]" />
                              </div>
                              <div>
                                <p className="font-bold text-teal-700 mb-1">
                                  Correct!
                                </p>
                                <p className="text-teal-800 text-sm leading-relaxed">
                                   {typeof currentQuestion.explanation === 'string' ? currentQuestion.explanation : (currentQuestion.explanation as any)?.correct}
                                </p>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}

                   {/* Fill in the Blank Feedback (Input is in the title now) - Optimized with WAAPI-backed animations */}
                   {currentQuestion.type === 'fill-in-blank' && isAnswered && !isCorrect && (
                     <motion.div 
                       initial={{ opacity: 0, y: -10 }}
                       animate={{ opacity: 1, y: 0 }}
                       transition={{ duration: 0.3, ease: 'easeOut' }}
                       className="mt-4 text-center w-full"
                       style={{ willChange: 'transform, opacity' }}
                     >
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Correct answer</p>
                      <p className="text-[#75D06A] font-black text-2xl bg-[#75D06A]/10 py-3 rounded-2xl border-2 border-[#75D06A]/30 inline-block px-10">{currentQuestion.correctAnswer}</p>
                      {currentQuestion.explanation && (
                         <div className="mt-6 mx-auto max-w-lg bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 flex gap-3 text-left">
                            <X size={20} className="shrink-0 text-red-500" />
                            <div className="text-sm font-medium">
                               {typeof currentQuestion.explanation === 'string' ? currentQuestion.explanation : (currentQuestion.explanation as any)?.incorrect}
                            </div>
                         </div>
                      )}
                    </motion.div>
                  )}
                   {currentQuestion.type === 'fill-in-blank' && isAnswered && isCorrect && currentQuestion.explanation && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className="mt-4 bg-[#75D06A]/10 border border-[#75D06A]/30 text-teal-800 rounded-xl p-4 flex gap-3 text-left max-w-lg mx-auto w-full text-sm font-medium"
                        style={{ willChange: 'transform, opacity' }}
                      >
                         <Check size={20} className="shrink-0 text-[#75D06A]" />
                         <div>
                            <span className="font-bold block mb-1">Correct! </span>
                            {typeof currentQuestion.explanation === 'string' ? currentQuestion.explanation : (currentQuestion.explanation as any)?.correct}
                         </div>
                     </motion.div>
                  )}
                </div>
                
                {/* Footer / Controls */}
                <div className="p-4 sm:p-6 border-t border-[#dde3eb] bg-white flex items-center justify-between shrink-0 gap-4">
                   {!isAnswered ? (
                     <div className="w-full flex gap-3">
                       <Button 
                         onClick={handleAnswer}
                         disabled={!canSubmit()}
                         className={`flex-1 px-10 py-7 rounded-2xl font-bold text-base shadow-xl disabled:opacity-50 disabled:shadow-none transition-all hover:-translate-y-1 hover:brightness-110 disabled:hover:translate-y-0 ${
                           canSubmit() ? 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white' : 'bg-slate-100 text-slate-400 border-2 border-slate-200'
                         }`}
                       >
                         Check Answer
                       </Button>
                     </div>
                   ) : (
                     <Button 
                       onClick={handleNext}
                       className={`w-full px-10 py-7 rounded-2xl font-bold text-base shadow-xl transition-all flex items-center justify-center gap-2 hover:-translate-y-1 ${
                         isCorrect 
                           ? 'bg-[#75D06A]/100 hover:bg-teal-600 text-white shadow-teal-200' 
                            : 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm'
                       }`}
                     >
                       {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Lesson'}
                       <ArrowRight size={20} />
                     </Button>
                   )}
                </div>
              </div>
              
              {/* Bottom helper text */}
              <div className="text-center mt-6">
                <button className="text-white/60 text-xs font-semibold hover:text-sky-700 transition-colors flex items-center gap-1 mx-auto">
                  <HelpCircle size={14} />
                  Press Enter to continue
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </>
  );
};

export default InteractiveLesson;