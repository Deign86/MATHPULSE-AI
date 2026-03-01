import React from 'react';
import { Hand, ArrowRight, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { ImageWithFallback } from './figma/ImageWithFallback';

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
      className="relative w-full rounded-2xl overflow-hidden p-8 mb-6 bg-[#1a1625] border border-white/[0.06] card-elevated-lg"
    >
      {/* Gradient accent glow */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
      <div className="absolute top-0 right-0 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

      {/* Dot pattern overlay */}
      <div className="absolute inset-0 bg-dot-pattern opacity-30" />

      <div className="relative z-10 flex items-center justify-between">
        <div className="max-w-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="px-3 py-1 rounded-full bg-violet-500/15 border border-violet-500/20">
              <span className="text-xs font-body font-semibold text-violet-300">Level {userLevel}</span>
            </div>
            <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Zap size={12} className="inline -mt-0.5 text-amber-400 mr-1" />
              <span className="text-xs font-body font-semibold text-amber-300">Active</span>
            </div>
          </div>

          <h1 className="text-3xl font-display font-bold text-white mb-1 tracking-tight">
            {getGreeting()}, {userName}! <Hand size={24} className="inline -mt-1" />
          </h1>
          <p className="text-zinc-400 mb-6 text-sm font-body">Continue where you left off</p>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm font-body">
              <span className="text-zinc-400 font-medium">Weekly Goal Progress</span>
              <span className="text-violet-300 font-semibold">75%</span>
            </div>
            <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '75%' }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full shadow-[0_0_12px_rgba(124,58,237,0.4)]"
              />
            </div>
            <p className="text-xs text-zinc-500 font-body">Just 2 more lessons to reach your weekly streak!</p>
          </div>
          
          <motion.button
            onClick={onContinueLearning}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="mt-6 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-5 py-2.5 rounded-lg font-body font-semibold text-sm shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all flex items-center gap-2 group"
          >
            Continue Learning
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </motion.button>
        </div>

        <div className="hidden md:block relative w-56 h-56">
           <div className="absolute inset-0 flex items-center justify-center">
             <div className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-white/[0.08] shadow-2xl">
               <ImageWithFallback 
                 src="https://images.unsplash.com/photo-1707948952408-f7aa2c51db1f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXRlJTIwM2QlMjByb2JvdCUyMGVkdWNhdGlvbiUyMHRlY2hub2xvZ3l8ZW58MXx8fHwxNzcwMTE2NTkzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                 alt="Robot Tutor"
                 className="w-full h-full object-cover"
               />
               <div className="absolute inset-0 bg-gradient-to-t from-[#1a1625]/60 to-transparent" />
             </div>
           </div>
        </div>
      </div>
    </motion.div>
  );
};

export default HeroBanner;