import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Calendar, Flame, CheckCircle, Zap } from 'lucide-react';

const challenges = [
  {
    id: 1,
    title: 'Daily challenge',
    subtitle: 'Do your plan before 09:00 AM',
    bgColor: 'bg-[#6ED1CF]', 
    orbColor: 'bg-[#50B8B6]', 
    avatars: ['https://i.pravatar.cc/150?img=1', 'https://i.pravatar.cc/150?img=5', 'https://i.pravatar.cc/150?img=8'],
    extraCount: 4,
    icon: <Zap size={24} fill="currentColor" className="text-white" />
  },
  {
    id: 2,
    title: 'Weekend Warrior',
    subtitle: 'Complete 3 modules this weekend',
    bgColor: 'bg-[#FF8B8B]', 
    orbColor: 'bg-[#E06A6A]', 
    avatars: ['https://i.pravatar.cc/150?img=12', 'https://i.pravatar.cc/150?img=32'],
    extraCount: 12,
    icon: <Flame size={24} fill="currentColor" className="text-white" />
  },
  {
    id: 3,
    title: 'Speed Runner',
    subtitle: 'Finish a quiz in under 5 mins',
    bgColor: 'bg-[#75D06A]', 
    orbColor: 'bg-[#58B34D]', 
    avatars: ['https://i.pravatar.cc/150?img=44', 'https://i.pravatar.cc/150?img=55', 'https://i.pravatar.cc/150?img=68'],
    extraCount: 8,
    icon: <CheckCircle size={24} className="text-white" />
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
    <div className="bg-white rounded-[24px] p-4 shadow-sm border border-slate-100 flex flex-col gap-6 mt-4 relative overflow-hidden">
      {/* Decorative external background blob just to add a slight pink/purple hue outside, as seen in the image's left side? */}
      
      {/* Swipeable Banner Section */}
      <div className="relative h-[170px] rounded-[-20px] rounded-2xl overflow-hidden cursor-pointer group">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentChallenge.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className={`absolute inset-0 ${currentChallenge.bgColor} p-5 flex flex-col justify-between overflow-hidden`}
          >
            {/* Top Right menu dots */}
            <div className="absolute top-4 right-4 flex gap-1 items-center z-20">
              <div className="w-3 h-1.5 rounded-full bg-white/60"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-white/40"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-white/40"></div>
            </div>

            {/* 3D Decorative Orb */}
            <div className={`absolute -right-4 -top-8 w-36 h-36 rounded-full ${currentChallenge.orbColor} opacity-90 blur-2xl group-hover:scale-110 transition-transform duration-700 pointer-events-none`} />
            
            {/* Front Icon square */}
            <div className={`absolute right-4 bottom-4 w-[52px] h-[52px] rounded-2xl rotate-12 bg-white/20 backdrop-blur-md shadow-sm border border-white/20 group-hover:rotate-45 group-hover:scale-110 transition-transform duration-700 flex items-center justify-center`}>
               {currentChallenge.icon}
            </div>

            <div className="relative z-10 w-3/4">
              <h3 className="font-display font-bold text-[22px] text-white mb-1">
                {currentChallenge.title}
              </h3>
              <p className="text-[13px] font-medium text-white/80 leading-snug">
                {currentChallenge.subtitle}
              </p>
            </div>

            {/* Social Proof Avatars */}
            <div className="flex items-center -space-x-2.5 relative z-10 mt-auto">
              {currentChallenge.avatars.map((avatar, idx) => (
                <img 
                  key={idx} 
                  src={avatar} 
                  alt="User" 
                  className="w-[34px] h-[34px] rounded-full border-2 border-transparent object-cover relative z-[3] z-[2] z-[1]"
                  style={{ borderColor: currentChallenge.bgColor.replace('bg-[', '').replace(']', '') }}
                />
              ))}
              <div 
                className="w-[34px] h-[34px] rounded-full border-2 text-[12px] font-bold flex items-center justify-center text-white relative z-0"
                style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderColor: currentChallenge.bgColor.replace('bg-[', '').replace(']', '') }}
              >
                +{currentChallenge.extraCount}
              </div>
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
              className={`flex flex-col items-center pt-2 pb-3 w-[46px] h-[72px] rounded-[24px] border ${
                day.isToday 
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
