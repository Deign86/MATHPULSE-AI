import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Calendar, Flame, CheckCircle, Zap } from 'lucide-react';

const challenges = [
  {
    id: 1,
    title: 'Daily challenge',
    subtitle: 'Do your plan before 09:00 AM',
    bgColor: 'bg-[#a794fa]', // violet match
    avatars: ['https://i.pravatar.cc/150?img=1', 'https://i.pravatar.cc/150?img=5', 'https://i.pravatar.cc/150?img=8'],
    extraCount: 4,
    graphic: 'bg-gradient-to-br from-amber-400 to-amber-500' // Placeholder for 3D graphic
  },
  {
    id: 2,
    title: 'Weekend Warrior',
    subtitle: 'Complete 3 modules this weekend',
    bgColor: 'bg-[#f472b6]', // pink match
    avatars: ['https://i.pravatar.cc/150?img=12', 'https://i.pravatar.cc/150?img=32'],
    extraCount: 12,
    graphic: 'bg-gradient-to-br from-indigo-500 to-purple-500' 
  },
  {
    id: 3,
    title: 'Speed Runner',
    subtitle: 'Finish a quiz in under 5 minutes',
    bgColor: 'bg-[#38bdf8]', // sky match
    avatars: ['https://i.pravatar.cc/150?img=44', 'https://i.pravatar.cc/150?img=55', 'https://i.pravatar.cc/150?img=68'],
    extraCount: 8,
    graphic: 'bg-gradient-to-br from-emerald-400 to-teal-500' 
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
}

const DailyChallengeWidget: React.FC<DailyChallengeWidgetProps> = ({ streakHistory = [] }) => {
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
    <div className="bg-[#f8f9fc] rounded-[24px] p-4 shadow-sm border border-slate-100 flex flex-col gap-5 mt-4">
      {/* Swipeable Banner Section */}
      <div className="relative h-44 rounded-2xl overflow-hidden cursor-pointer group">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentChallenge.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className={`absolute inset-0 ${currentChallenge.bgColor} p-5 flex flex-col justify-between`}
          >
            {/* 3D Decorative Graphics Placeholder */}
            <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full ${currentChallenge.graphic} opacity-80 mix-blend-multiply blur-sm group-hover:scale-110 transition-transform duration-700`} />
            <div className={`absolute right-4 bottom-4 w-16 h-16 rounded-3xl rotate-12 bg-white/30 backdrop-blur-md shadow-xl group-hover:rotate-45 transition-transform duration-700 flex items-center justify-center text-white`}>
               {currentChallenge.id === 1 ? <Zap size={28} /> : currentChallenge.id === 2 ? <Flame size={28} /> : <CheckCircle size={28} />}
            </div>

            <div className="relative z-10 w-2/3">
              <h3 className="font-display font-bold text-[1.4rem] leading-tight text-slate-900 mb-1">
                {currentChallenge.title}
              </h3>
              <p className="text-[11px] font-medium text-slate-800/80 leading-snug">
                {currentChallenge.subtitle}
              </p>
            </div>

            {/* Social Proof Avatars */}
            <div className="flex items-center -space-x-2 relative z-10 mt-auto">
              {currentChallenge.avatars.map((avatar, idx) => (
                <img 
                  key={idx} 
                  src={avatar} 
                  alt="User" 
                  className="w-8 h-8 rounded-full border-2 border-[#a794fa] object-cover" 
                  style={{ borderColor: currentChallenge.bgColor.replace('bg-', '') }} // Match border color to bg
                />
              ))}
              <div 
                className="w-8 h-8 rounded-full border-2 text-[10px] font-bold flex items-center justify-center text-white shadow-sm"
                style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderColor: currentChallenge.bgColor.replace('bg-', '') }}
              >
                +{currentChallenge.extraCount}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Carousel Indicators */}
        <div className="absolute top-4 right-4 flex gap-1 z-20">
          {challenges.map((_, idx) => (
            <div 
              key={idx} 
              className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-4 bg-slate-900' : 'w-1.5 bg-slate-900/30'}`}
            />
          ))}
        </div>
      </div>

      {/* Streak Calendar Section */}
      <div>
        <div className="flex justify-between items-center mb-3 px-1">
           <h4 className="font-display text-base font-bold text-[#0a1628]">Your streak</h4>
        </div>
        <div className="flex justify-between items-center gap-1.5">
          {weekDays.map((day, idx) => (
            <div 
              key={idx} 
              className={`flex flex-col items-center justify-center w-10 h-16 rounded-full border ${
                day.isToday 
                ? 'bg-[#0f172a] text-white border-transparent shadow-md transform -translate-y-1' 
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
              } transition-all duration-200 cursor-pointer`}
            >
              {/* Dot indicator */}
              <div className="h-2 flex items-center justify-center mb-0.5 mt-0.5">
                {day.hasDot && (
                  <div className={`w-1 h-1 rounded-full ${day.isToday ? 'bg-white' : 'bg-slate-400'}`} />
                )}
              </div>
              <span className={`text-[10px] font-medium mb-0.5 ${day.isToday ? 'text-slate-300' : 'text-slate-400'}`}>
                {day.dayName}
              </span>
              <span className={`text-sm font-bold ${day.isToday ? 'text-white' : 'text-slate-700'}`}>
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
