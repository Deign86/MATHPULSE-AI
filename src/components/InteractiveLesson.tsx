import React, { useState, useEffect } from 'react';
import { 
  X, Check, ArrowRight, Volume2, RotateCcw, Trophy, Zap, Flag, HelpCircle,
  Calculator, Sigma, Divide, Percent, Triangle, Circle, Square, Box, Ruler, 
  Binary, Atom, FunctionSquare, Scaling, Braces, Star, Award, Target, TrendingUp, Flame
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Progress } from './ui/progress';

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
  onComplete: (score: number) => void;
  onBack: () => void;
}

// Confetti Component
const Confetti: React.FC = () => {
  const colors = ['#4F46E5', '#EC4899', '#F59E0B', '#10B981', '#8B5CF6'];
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
          }}
          className="rounded-sm"
        />
      ))}
    </div>
  );
};

// Streak Notification
const StreakNotification: React.FC<{ streak: number }> = ({ streak }) => {
  if (streak < 3) return null;

  return (
    <motion.div
      initial={{ scale: 0, y: 50 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0, opacity: 0 }}
      className="fixed top-24 left-1/2 -translate-x-1/2 z-[70] pointer-events-none"
    >
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
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

  const currentQuestion = questions[currentIndex];
  const title = lesson.title;
  const type = lesson.type;

  // Sound effects with better error handling
  const playSound = (type: 'correct' | 'incorrect' | 'complete' | 'streak') => {
    const sounds = {
      correct: 'data:audio/wav;base64,UklGRhIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YW4AAAAAAAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/w==',
      incorrect: 'data:audio/wav;base64,UklGRhIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YW4AAAAAAAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/w==',
      complete: 'data:audio/wav;base64,UklGRhIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YW4AAAAAAAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/w==',
      streak: 'data:audio/wav;base64,UklGRhIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YW4AAAAAAAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/w=='
    };
    
    try {
      const audio = new Audio(sounds[type]);
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (e) {
      // Silently fail
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

    setIsCorrect(correct);
    setIsAnswered(true);
    setAnswerHistory([...answerHistory, correct]);

    if (correct) {
      setScore(s => s + 1);
      const newStreak = streak + 1;
      setStreak(newStreak);
      setMaxStreak(Math.max(maxStreak, newStreak));
      
      // Streak bonus
      if (newStreak >= 3) {
        const bonus = newStreak * 5;
        setStreakBonusXP(prev => prev + bonus);
        setShowStreakNotification(true);
        playSound('streak');
        setTimeout(() => setShowStreakNotification(false), 2000);
      } else {
        playSound('correct');
      }
    } else {
      setStreak(0);
      playSound('incorrect');
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      // Milestone celebration
      if (currentIndex + 1 === Math.floor(questions.length / 2)) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
      
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
        gradient: 'bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800',
        text: 'text-indigo-900',
        bgLight: 'bg-indigo-50',
        border: 'border-indigo-200',
        accent: 'bg-indigo-500',
        iconColor: 'text-indigo-200'
      }
    : {
        gradient: 'bg-gradient-to-br from-teal-500 via-emerald-500 to-teal-700',
        text: 'text-teal-900',
        bgLight: 'bg-teal-50',
        border: 'border-teal-200',
        accent: 'bg-teal-500',
        iconColor: 'text-teal-200'
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 animate-in fade-in duration-500">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="bg-white rounded-[32px] w-full max-w-lg p-6 text-center shadow-2xl relative overflow-hidden"
          >
             {/* Decorative Background */}
             <div className={`absolute top-0 left-0 w-full h-24 ${theme.gradient} opacity-10 rounded-b-[50%]`}></div>
             
             {/* Topic Background Patterns */}
             <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03]">
                {TopicIcons.map((Icon, i) => (
                  <Icon 
                    key={i} 
                    className="absolute text-slate-900"
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
                  transition={{ type: 'spring', delay: 0.2 }}
                  className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white shadow-2xl shadow-amber-200"
                >
                  <Trophy size={40} fill="currentColor" />
                </motion.div>
                {/* Sparkles */}
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute top-0 right-1/3 text-xl"
                >
                  ✨
                </motion.div>
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], rotate: [0, -180, -360] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                  className="absolute bottom-0 left-1/3 text-xl"
                >
                  ✨
                </motion.div>
             </div>
             
             <motion.h2 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold text-slate-800 mb-2"
             >
                {percentage >= 90 ? 'Perfect! 🎉' : 
                 percentage >= 80 ? 'Excellent Job! 🌟' : 
                 percentage >= 70 ? 'Great Work! 👏' :
                 percentage >= 60 ? 'Good Effort! 💪' : 
                 'Keep Practicing! 📚'}
             </motion.h2>
             
             <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-slate-500 mb-6 font-medium"
             >
                You answered {score} out of {questions.length} questions correctly
             </motion.p>
             
             {/* Detailed Stats Grid */}
             <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-2 gap-3 mb-5"
             >
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-4 border-2 border-indigo-200">
                  <div className="flex items-center justify-center mb-1">
                    <Target className="text-indigo-600" size={20} />
                  </div>
                  <p className="text-[10px] text-indigo-600 font-bold uppercase mb-1 tracking-wider">Accuracy</p>
                  <p className="text-3xl font-black text-indigo-700">{percentage}%</p>
                </div>
                
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-4 border-2 border-orange-200">
                  <div className="flex items-center justify-center mb-1">
                    <Zap className="text-orange-600" size={20} />
                  </div>
                  <p className="text-[10px] text-orange-600 font-bold uppercase mb-1 tracking-wider">Total XP</p>
                  <p className="text-3xl font-black text-orange-600">+{totalXP}</p>
                </div>

                <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl p-4 border-2 border-teal-200">
                  <div className="flex items-center justify-center mb-1">
                    <Flame className="text-teal-600" size={20} />
                  </div>
                  <p className="text-[10px] text-teal-600 font-bold uppercase mb-1 tracking-wider">Best Streak</p>
                  <p className="text-3xl font-black text-teal-700">{maxStreak}x</p>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-4 border-2 border-purple-200">
                  <div className="flex items-center justify-center mb-1">
                    <Award className="text-purple-600" size={20} />
                  </div>
                  <p className="text-[10px] text-purple-600 font-bold uppercase mb-1 tracking-wider">Time</p>
                  <p className="text-3xl font-black text-purple-700">{minutes}:{seconds.toString().padStart(2, '0')}</p>
                </div>
             </motion.div>

             {/* XP Breakdown */}
             <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="bg-slate-50 rounded-2xl p-4 mb-5 text-left"
             >
                <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2 text-sm">
                  <Star className="text-amber-500" size={16} />
                  XP Breakdown
                </h3>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-xs">Base XP ({type})</span>
                    <span className="font-bold text-slate-800 text-sm">+{baseXP}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-xs">Score Bonus ({percentage}%)</span>
                    <span className="font-bold text-slate-800 text-sm">+{scoreXP}</span>
                  </div>
                  {streakBonusXP > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 text-xs">Streak Bonuses</span>
                      <span className="font-bold text-orange-600 text-sm">+{streakBonusXP}</span>
                    </div>
                  )}
                  <div className="border-t-2 border-slate-200 pt-1.5 flex justify-between items-center">
                    <span className="text-slate-700 font-bold text-xs">Total XP Earned</span>
                    <span className="font-black text-orange-600">+{totalXP}</span>
                  </div>
                </div>
             </motion.div>

             {/* Answer History */}
             <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="flex items-center justify-center gap-1.5 mb-6"
             >
                {answerHistory.map((correct, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.7 + (idx * 0.05) }}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      correct ? 'bg-teal-500' : 'bg-red-400'
                    }`}
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
                transition={{ delay: 0.8 }}
             >
                <Button 
                  onClick={() => onComplete(percentage)}
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

      <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 overflow-hidden font-sans">
        
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
        <header className="relative z-[60] h-20 flex items-center justify-between px-6 pt-2">
          <div className="flex items-center gap-4 flex-1">
            <button 
              onClick={onBack} 
              className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-all border border-white/10 hover:scale-110 active:scale-95"
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

          <div className="flex items-center gap-4">
            <motion.div 
              animate={streak >= 3 ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.5, repeat: streak >= 3 ? Infinity : 0 }}
              className="flex items-center gap-2 bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10"
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white shadow-sm ${
                streak >= 3 ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-orange-500'
              }`}>
                <Flame size={14} fill="currentColor" />
              </div>
              <span className="text-sm font-bold text-white">{streak}</span>
            </motion.div>
          </div>
        </header>

        {/* Main Content */}
        <main className="relative z-10 flex-1 flex flex-col items-center justify-start px-4 pb-8 pt-4 md:pt-8 overflow-y-auto">
          
          {/* Progress Bar */}
          <div className="w-full max-w-md mb-8 px-2">
            <div className="flex justify-between text-[10px] font-bold text-white/80 mb-2 uppercase tracking-wider">
              <span>Progress</span>
              <span>{Math.round(((currentIndex) / questions.length) * 100)}%</span>
            </div>
            <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden backdrop-blur-sm">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${((currentIndex) / questions.length) * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="h-full bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"
              />
            </div>
          </div>

          {/* Milestone Notification */}
          {currentIndex === Math.floor(questions.length / 2) && currentIndex > 0 && (
            <motion.div
              initial={{ scale: 0, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="mb-4 bg-white/20 backdrop-blur-md text-white px-6 py-3 rounded-2xl font-bold shadow-lg"
            >
              🎯 Halfway there! Keep it up!
            </motion.div>
          )}

          {/* Question Card */}
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentIndex}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full max-w-3xl"
            >
              <div className="bg-white rounded-[40px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] overflow-hidden border border-slate-100 min-h-[450px] flex flex-col relative">
                
                {/* Question Area */}
                <div className="p-8 md:p-12 flex-1 flex flex-col items-center justify-center text-center">
                   <span className={`inline-block px-4 py-1.5 ${theme.bgLight} ${theme.text} rounded-full text-[11px] font-black mb-8 uppercase tracking-widest border ${theme.border}`}>
                     {currentQuestion.type === 'multiple-choice' ? 'Multiple Choice' : 
                      currentQuestion.type === 'true-false' ? 'True or False' : 'Fill in the Blank'}
                   </span>
                   <h2 className="text-2xl md:text-3xl font-bold text-slate-800 leading-snug max-w-2xl">
                     {currentQuestion.question}
                   </h2>
                </div>

                {/* Answer Area */}
                <div className="p-6 md:p-10 bg-slate-50/80 backdrop-blur-sm border-t border-slate-100">
                  {/* Multiple Choice & True/False */}
                  {(currentQuestion.type === 'multiple-choice' || currentQuestion.type === 'true-false') && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(currentQuestion.type === 'true-false' ? ['True', 'False'] : shuffledOptions).map((option, idx) => {
                           let stateClasses = "hover:border-slate-300 hover:shadow-lg bg-white border-slate-200 text-slate-600 shadow-sm";
                           
                           if (isAnswered) {
                             if (option === currentQuestion.correctAnswer) {
                               stateClasses = "bg-teal-50 border-teal-500 text-teal-700 shadow-teal-100 ring-2 ring-teal-200";
                             } else if (option === selectedOption) {
                               stateClasses = "bg-red-50 border-red-500 text-red-700 shadow-red-100 ring-2 ring-red-200";
                             } else {
                               stateClasses = "bg-slate-50 border-slate-100 text-slate-300 opacity-60 scale-[0.98]";
                             }
                           } else if (selectedOption === option) {
                             stateClasses = `${theme.bgLight} ${theme.border} ${theme.text} ring-2 ring-indigo-100 shadow-md scale-[1.02] z-10`;
                           }

                           return (
                            <motion.button
                              key={idx}
                              disabled={isAnswered}
                              onClick={() => setSelectedOption(option)}
                              whileHover={!isAnswered ? { scale: 1.02 } : {}}
                              whileTap={!isAnswered ? { scale: 0.98 } : {}}
                              className={`
                                relative p-6 rounded-2xl border-2 font-bold text-lg transition-all duration-200 text-left flex items-center justify-between group
                                ${stateClasses}
                              `}
                            >
                              <span className="relative z-10">{option}</span>
                              {isAnswered && option === currentQuestion.correctAnswer && (
                                <motion.div 
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="bg-teal-100 p-1 rounded-full"
                                >
                                  <Check size={18} className="text-teal-600" />
                                </motion.div>
                              )}
                              {isAnswered && option === selectedOption && option !== currentQuestion.correctAnswer && (
                                <motion.div 
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="bg-red-100 p-1 rounded-full"
                                >
                                  <X size={18} className="text-red-600" />
                                </motion.div>
                              )}
                              {!isAnswered && (
                                <div className={`w-6 h-6 rounded-full border-2 border-slate-200 group-hover:border-slate-300 transition-colors ${selectedOption === option ? `bg-current border-current ${theme.text}` : ''}`}></div>
                              )}
                            </motion.button>
                           );
                        })}
                      </div>

                      {/* Explanations */}
                      {isAnswered && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-3 mt-6"
                        >
                          {/* Show explanation for wrong answer first (if wrong) */}
                          {!isCorrect && selectedOption && selectedOption !== currentQuestion.correctAnswer && (
                            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 mt-0.5">
                                  <X size={18} className="text-red-600" />
                                </div>
                                <div>
                                  <p className="font-bold text-red-700 mb-1">Not quite</p>
                                  <p className="text-red-800 text-sm leading-relaxed">
                                    {currentQuestion.optionExplanations?.[selectedOption] || 
                                     `${selectedOption} is not the correct answer. Review the concept and try again.`}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Always show correct answer explanation */}
                          <div className="bg-teal-50 border-2 border-teal-200 rounded-2xl p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 mt-0.5">
                                <Check size={18} className="text-teal-600" />
                              </div>
                              <div>
                                <p className="font-bold text-teal-700 mb-1">
                                  {isCorrect ? "That's right!" : "Right answer"}
                                </p>
                                <p className="text-teal-800 text-sm leading-relaxed">
                                  {currentQuestion.explanation || 
                                   currentQuestion.optionExplanations?.[currentQuestion.correctAnswer] ||
                                   `${currentQuestion.correctAnswer} is the correct answer.`}
                                </p>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* Fill in the Blank */}
                  {currentQuestion.type === 'fill-in-blank' && (
                    <div className="max-w-md mx-auto">
                      <div className="relative group">
                        <Input
                          disabled={isAnswered}
                          value={textInput}
                          onChange={(e) => setTextInput(e.target.value)}
                          placeholder="Type your answer here..."
                          className={`
                            py-8 px-6 text-xl rounded-2xl border-2 font-bold transition-all text-center placeholder:font-medium placeholder:text-slate-300
                            ${isAnswered 
                              ? isCorrect 
                                ? 'bg-teal-50 border-teal-500 text-teal-800' 
                                : 'bg-red-50 border-red-500 text-red-800'
                              : 'bg-white border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 shadow-sm'
                            }
                          `}
                        />
                        {isAnswered && (
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute right-4 top-1/2 -translate-y-1/2"
                          >
                            {isCorrect ? (
                              <div className="bg-teal-100 p-1.5 rounded-full">
                                <Check className="text-teal-600" size={20} />
                              </div>
                            ) : (
                              <div className="bg-red-100 p-1.5 rounded-full">
                                <X className="text-red-600" size={20} />
                              </div>
                            )}
                          </motion.div>
                        )}
                      </div>
                      {isAnswered && !isCorrect && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-4 text-center"
                        >
                          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Correct answer</p>
                          <p className="text-teal-600 font-black text-xl">{currentQuestion.correctAnswer}</p>
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Footer / Controls */}
                <div className="p-6 border-t border-slate-100 bg-white flex items-center justify-between">
                   <Button 
                     variant="ghost" 
                     size="sm"
                     className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl"
                   >
                     <Flag size={16} className="mr-2" /> Report
                   </Button>

                   {!isAnswered ? (
                     <Button 
                       onClick={handleAnswer}
                       disabled={!canSubmit()}
                       className={`px-10 py-7 rounded-2xl font-bold text-base ${theme.gradient} text-white shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:shadow-none transition-all hover:-translate-y-1 hover:brightness-110 disabled:hover:translate-y-0`}
                     >
                       Check Answer
                     </Button>
                   ) : (
                     <Button 
                       onClick={handleNext}
                       className={`px-10 py-7 rounded-2xl font-bold text-base shadow-xl transition-all flex items-center gap-2 hover:-translate-y-1 ${
                         isCorrect 
                           ? 'bg-teal-500 hover:bg-teal-600 text-white shadow-teal-200' 
                           : 'bg-slate-800 hover:bg-slate-900 text-white shadow-slate-300'
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
                <button className="text-white/60 text-xs font-semibold hover:text-white transition-colors flex items-center gap-1 mx-auto">
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