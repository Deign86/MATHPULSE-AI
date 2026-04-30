import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, CheckCircle, Zap, Swords } from 'lucide-react';
import quizBattleBg from '../assets/quiz_battle_avatar.png';

const challenges = [
  {
    id: 1,
    title: 'Quiz Battle',
    subtitle: 'Challenge players worldwide!',
    bgColor: 'bg-[#9956de]',
    orbColor: 'bg-[#6D28D9]',
    icon: <Swords size={24} className="text-white" />,
    buttonText: 'Join Battle',
    actionType: 'quiz-battle',
    avatarText: 'Waiting for you to join...'
  },
  {
    id: 2,
    title: 'Keep It Up!',
    subtitle: 'Maintain your daily learning streak',
    bgColor: 'bg-[#FF8B8B]',
    orbColor: 'bg-[#E06A6A]',
    icon: <Flame size={24} fill="currentColor" className="text-white" />,
    buttonText: null,
    actionType: null,
    avatarText: 'You are doing great!'
  },
  {
    id: 3,
    title: 'Speed Runner',
    subtitle: 'Finish a quiz in under 5 mins',
    bgColor: 'bg-[#75D06A]',
    orbColor: 'bg-[#58B34D]',
    icon: <CheckCircle size={24} className="text-white" />,
    buttonText: null,
    actionType: null,
    avatarText: 'Ready for action!'
  }
];

// Generate the week days for the calendar correctly
const generateWeekDays = (streakHistory: string[] = []) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const currentDayOfWeek = today.getDay();

  const week = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - currentDayOfWeek + i);

    const isToday = i === currentDayOfWeek;

    // Check if user was active on this local date
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const hasDot = streakHistory.includes(dateStr);

    week.push({
      dayName: days[i],
      dateNumber: date.getDate(),
      isToday,
      hasDot
    });
  }
  return week;
};

interface DailyChallengeWidgetProps {
  streakHistory?: string[];
  onNavigateToQuizBattle?: () => void;
  userPhoto?: string;
}

const DailyChallengeWidget: React.FC<DailyChallengeWidgetProps> = ({ streakHistory = [], onNavigateToQuizBattle, userPhoto }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const weekDays = generateWeekDays(streakHistory);

  // Auto-swipe effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % challenges.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const currentChallenge = challenges[currentIndex];

  return (
    <div className="bg-white rounded-[24px] p-4 shadow-sm border border-slate-100 flex flex-col gap-6 mt-4 relative overflow-hidden">
      {/* Decorative external background blob just to add a slight pink/purple hue outside, as seen in the image's left side? */}

      {/* Swipeable Banner Section */}
      <div className="relative h-[185px] rounded-[-20px] rounded-2xl overflow-hidden cursor-pointer group">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentChallenge.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className={`absolute inset-0 ${currentChallenge.bgColor} p-4 sm:p-5 flex flex-col justify-between overflow-hidden`}
          >
            {/* Top Right menu dots */}
            <div className="absolute top-4 right-4 flex gap-1 items-center z-20">
              <div className="w-3 h-1.5 rounded-full bg-white/60"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-white/40"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-white/40"></div>
            </div>

            {/* Background Graphic for Quiz Battle */}
            {currentChallenge.actionType === 'quiz-battle' && (
              <div className="absolute -right-4 -bottom-6 w-32 h-32 opacity-25 mix-blend-overlay pointer-events-none z-0 transform group-hover:scale-105 transition-transform duration-700">
                <img src={quizBattleBg} alt="" className="w-full h-full object-contain" />
              </div>
            )}

            {/* 3D Decorative Orb */}
            <div className={`absolute -right-4 -top-8 w-36 h-36 rounded-full ${currentChallenge.orbColor} opacity-90 blur-2xl group-hover:scale-110 transition-transform duration-700 pointer-events-none`} />

            {/* Front Icon square */}
            <div className={`absolute right-4 top-1/2 -translate-y-1/2 w-[48px] h-[48px] rounded-2xl rotate-12 bg-white/20 backdrop-blur-md shadow-sm border border-white/20 group-hover:rotate-[25deg] group-hover:scale-110 transition-transform duration-700 flex items-center justify-center z-10`}>
              {currentChallenge.icon}
            </div>

            <div className="relative z-10 w-full pr-[60px]">
              <h3 className="font-display font-bold text-[20px] leading-tight text-white mb-0.5">
                {currentChallenge.title}
              </h3>
              <p className="text-[12px] font-medium text-white/90 leading-snug">
                {currentChallenge.subtitle}
              </p>
              {currentChallenge.buttonText && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (currentChallenge.actionType === 'quiz-battle' && onNavigateToQuizBattle) {
                      onNavigateToQuizBattle();
                    }
                  }}
                  className="mt-2.5 bg-white text-[#0a1628] px-2 py-1 rounded-lg font-bold text-xs shadow-sm hover:scale-105 transition-transform uppercase tracking-wider whitespace-nowrap w-fit"
                >
                  {currentChallenge.buttonText}
                </button>
              )}
            </div>

            {/* User Avatar Action Area */}
            <div className="flex items-center gap-2.5 relative z-10 mt-auto pt-2">
              {userPhoto ? (
                <div className="relative group/avatar shrink-0">
                  <div className="absolute inset-0 bg-white/40 blur-md rounded-full animate-pulse" />
                  <img
                    src={userPhoto}
                    alt="You"
                    className="w-8 h-8 rounded-full border-[2px] border-white object-cover relative z-10 shadow-md group-hover/avatar:scale-110 transition-transform"
                  />
                  {currentChallenge.actionType === 'quiz-battle' && (
                    <div className="absolute -bottom-1 -right-1 w-[16px] h-[16px] bg-[#75D06A] border-2 border-[#7C3AED] rounded-full z-20 flex items-center justify-center">
                      <Zap size={8} className="text-white" fill="currentColor" />
                    </div>
                  )}
                </div>
              ) : null}
              <span className="text-[12px] font-bold text-white tracking-wide leading-tight flex-1 pr-[60px]">{currentChallenge.avatarText}</span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Streak Calendar Section */}
      <div>
        <h4 className="font-display text-[15px] font-bold text-[#141b2d] mb-4 px-1">Your streak</h4>
        <div className="flex justify-between items-center gap-1.5 px-0.5">
          {weekDays.map((day, idx) => (
            <div
              key={idx}
              className={`flex flex-col items-center pt-2 pb-3 w-[46px] h-[72px] rounded-[24px] border ${day.isToday
                ? 'bg-[#12192b] text-white border-transparent shadow-[0_8px_16px_rgba(18,25,43,0.3)] transform -translate-y-1'
                : 'bg-white text-slate-400 border-slate-200/80 hover:border-slate-300'
                } transition-all duration-200 cursor-pointer`}
            >
              {/* Dot indicator matching the design exactly */}
              <div className="h-1.5 flex items-center justify-center mb-1.5">
                {day.hasDot ? (
                  <div className={`w-[5px] h-[5px] rounded-full ${day.isToday ? 'bg-white' : 'bg-slate-300'}`} />
                ) : (
                  <div className={`text-[10px] ${day.isToday ? 'text-white/50' : 'text-slate-200'} font-bold`}>+</div>
                )}
              </div>

              <span className={`text-[11px] font-bold mb-1 ${day.isToday ? 'text-slate-300' : 'text-slate-400/80'}`}>
                {day.dayName}
              </span>
              <span className={`text-[15px] font-bold leading-none ${day.isToday ? 'text-white' : 'text-[#334155]'}`}>
                {day.dateNumber}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DailyChallengeWidget;
