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
      className="relative w-full rounded-2xl overflow-hidden p-8 mb-6 bg-gradient-to-br from-white via-sky-50/50 to-white border border-slate-200/80 card-elevated-lg"
    >
      {/* Gradient accent glow */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky-400/50 to-transparent" />
      <div className="absolute top-0 right-0 w-80 h-80 bg-sky-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

      {/* Dot pattern overlay */}
      <div className="absolute inset-0 bg-dot-pattern opacity-40" />

      <div className="relative z-10 flex items-center justify-between">
        <div className="max-w-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="px-3 py-1 rounded-full bg-sky-100 border border-sky-200">
              <span className="text-xs font-body font-semibold text-sky-700">Level {userLevel}</span>
            </div>
            <div className="px-3 py-1 rounded-full bg-amber-50 border border-amber-200">
              <Zap size={12} className="inline -mt-0.5 text-amber-500 mr-1" />
              <span className="text-xs font-body font-semibold text-amber-700">Active</span>
            </div>
          </div>

          <h1 className="text-3xl font-display font-bold text-[#0a1628] mb-1 tracking-tight">
            {getGreeting()}, {userName}! <Hand size={24} className="inline -mt-1" />
          </h1>
          <p className="text-slate-500 mb-6 text-sm font-body">Continue where you left off</p>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm font-body">
              <span className="text-slate-500 font-medium">Weekly Goal Progress</span>
              <span className="text-sky-600 font-semibold">75%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '75%' }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                className="h-full bg-gradient-to-r from-sky-500 to-sky-400 rounded-full shadow-[0_0_12px_rgba(2,132,199,0.3)]"
              />
            </div>
            <p className="text-xs text-slate-400 font-body">Just 2 more lessons to reach your weekly streak!</p>
          </div>
          
          <motion.button
            onClick={onContinueLearning}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="mt-6 bg-gradient-to-r from-sky-600 to-sky-500 text-white px-5 py-2.5 rounded-xl font-body font-semibold text-sm shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 transition-all flex items-center gap-2 group"
          >
            Continue Learning
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </motion.button>
        </div>

        <div className="hidden md:block relative w-56 h-56">
           <div className="absolute inset-0 flex items-center justify-center">
             <div className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-slate-200/60 shadow-2xl">
               <ImageWithFallback 
                 src="https://images.unsplash.com/photo-1707948952408-f7aa2c51db1f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXRlJTIwM2QlMjByb2JvdCUyMGVkdWNhdGlvbiUyMHRlY2hub2xvZ3l8ZW58MXx8fHwxNzcwMTE2NTkzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                 alt="Robot Tutor"
                 className="w-full h-full object-cover"
               />
               <div className="absolute inset-0 bg-gradient-to-t from-white/40 to-transparent" />
             </div>
           </div>
        </div>
      </div>
    </motion.div>
  );
};

export default HeroBanner;