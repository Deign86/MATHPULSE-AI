import React from 'react';
import { Hand, ArrowRight, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import DashboardAvatar from './DashboardAvatar';

interface HeroBannerProps {
  userName?: string;
  userLevel?: number;
  onContinueLearning?: () => void;
}

const HeroBanner: React.FC<HeroBannerProps> = ({ userName = 'Student', userLevel = 1, onContinueLearning }) => {
  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full mt-6 lg:mt-1 rounded-[2rem] p-6 lg:p-8 bg-gradient-to-br from-white via-sky-50/50 to-white border border-slate-200/80 card-elevated-lg"
    >
      {/* Background elements wrapped in overflow-hidden */}
      <div className="absolute inset-0 overflow-hidden rounded-[2rem] pointer-events-none">
        {/* Gradient accent glow */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky-400/50 to-transparent" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

        {/* Dot pattern overlay */}
        <div className="absolute inset-0 bg-dot-pattern opacity-40" />
      </div>

      <div className="relative z-10 flex min-h-[140px] lg:min-h-[160px] items-center justify-between gap-6 pb-0">
        <div className="flex-1 min-w-0 pr-40 lg:pr-[280px] py-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="px-3 md:px-4 py-1.5 rounded-full bg-sky-100 border border-sky-200">
              <span className="text-xs md:text-sm font-body font-bold text-sky-700">Level {userLevel}</span>
            </div>
            <div className="px-3 md:px-4 py-1.5 rounded-full bg-rose-50 border border-rose-200">
              <Zap size={14} className="inline -mt-0.5 text-rose-500 mr-1" />
              <span className="text-xs md:text-sm font-body font-bold text-rose-700">Active</span>
            </div>
          </div>

          <h1 className="text-xl md:text-2xl lg:text-3xl font-display font-black text-[#0a1628] mb-1.5 tracking-tight leading-[1.1]">
            {getGreeting()}, {userName}! <Hand size={20} className="inline -mt-1 ml-1" />
          </h1>
          <p className="text-slate-500 mb-1 text-xs md:text-sm font-body font-bold">Today is a great day to move one step forward in math mastery.</p>
          <p className="text-[11px] md:text-xs text-slate-400 font-body mb-4">Focus on your next recommended lesson and keep your momentum.</p>
          
          <motion.button
            onClick={onContinueLearning}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="mt-2 bg-gradient-to-r from-purple-600 to-[#9956DE] text-white px-5 py-2 rounded-xl font-body font-bold text-sm shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all flex items-center gap-2 group"
          >
            Continue Learning
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </motion.button>
        </div>
      </div>

      {/* Avatar Container: Anchored to the exact bottom of the banner, clipped directly at the banner's baseline */}
      <div 
        className="hidden md:block absolute right-0 lg:right-10 bottom-0 w-[160px] lg:w-[250px] pointer-events-none z-20"
        style={{ clipPath: 'inset(-100% -50% 0 -50%)' }}
      >
         <div className="relative w-full aspect-[4/5] translate-y-[21%] lg:translate-y-[19%] drop-shadow-2xl">
           <DashboardAvatar className="w-full h-full scale-[1.25] lg:scale-[1.3] origin-bottom" />
         </div>
      </div>
    </motion.div>
  );
};

export default HeroBanner;