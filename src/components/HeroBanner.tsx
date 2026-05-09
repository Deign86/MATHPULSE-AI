import React, { lazy, Suspense, useState } from 'react';
import { Hand, ArrowRight, Zap, Brain, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import type { AvatarLayers } from './CompositeAvatar';
import AssessmentResultsModal from './assessment/AssessmentResultsModal';

const DashboardAvatar = lazy(() => import('./DashboardAvatar.tsx'));

interface HeroBannerProps {
  userName?: string;
  userLevel?: number;
  avatarLayers?: AvatarLayers;
  onContinueLearning?: () => void;
  showAssessmentTooltip?: boolean;
  onOpenAssessment?: () => void;
  studentId?: string;
}

const HeroBanner: React.FC<HeroBannerProps> = ({ 
  userName = 'Student', 
  userLevel = 1, 
  avatarLayers, 
  onContinueLearning,
  showAssessmentTooltip,
  onOpenAssessment,
  studentId,
}) => {
  const [showResultsModal, setShowResultsModal] = useState(false);
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
      className="relative w-full mt-0 rounded-[2rem] p-6 lg:p-8 bg-gradient-to-br from-white via-sky-50/50 to-white border border-slate-200/80 card-elevated-lg"
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
      {showAssessmentTooltip && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, x: 10 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ delay: 0.5, type: 'spring' }}
          onClick={onOpenAssessment}
          className="absolute hidden md:block right-[150px] lg:right-[250px] bottom-16 lg:bottom-20 z-30 cursor-pointer drop-shadow-lg group"
        >
          <div className="bg-white px-4 py-3 rounded-2xl rounded-br-sm border-2 border-amber-300 relative transition-all group-hover:bg-amber-50 group-hover:border-amber-400 group-hover:-translate-y-1">
            <div className="flex items-center gap-2">
              <span className="text-amber-500">
                <Brain size={16} />
              </span>
              <p className="text-xs lg:text-sm font-bold text-amber-900 leading-tight">
                Don't forget to take the<br/>Initial Assessment!
              </p>
            </div>
            {/* Speech bubble tail pointing right-down towards avatar */}
            <div className="absolute -right-2 bottom-0 w-4 h-4 bg-white border-2 border-transparent border-r-amber-300 border-b-amber-300 rotate-45 group-hover:bg-amber-50 group-hover:border-r-amber-400 group-hover:border-b-amber-400 transition-colors" />
          </div>
        </motion.div>
      )}

      {/* Success Tooltip showing Assessment is Completed */}
      {!showAssessmentTooltip && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, x: 10 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ delay: 0.5, type: 'spring' }}
          className="absolute hidden md:block right-[150px] lg:right-[250px] bottom-16 lg:bottom-20 z-30 drop-shadow-lg"
        >
          <div className="bg-white px-4 py-3 rounded-2xl rounded-br-sm border-2 border-teal-300 relative transition-all hover:bg-teal-50 hover:-translate-y-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-teal-600">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <p className="text-xs lg:text-sm font-bold text-teal-900 leading-tight">
                Assessment Complete!<br/>
                <span className="text-[10px] lg:text-[11px] font-normal text-teal-700">Your learning path is ready.</span>
              </p>
            </div>
            {/* Speech bubble tail pointing right-down towards avatar */}
            <div className="absolute -right-2 bottom-0 w-4 h-4 bg-white border-2 border-transparent border-r-teal-300 border-b-teal-300 rotate-45 hover:bg-teal-50 transition-colors" />
          </div>
        </motion.div>
      )}

      {/* Results Chat Bubble — persistent after assessment completion */}
      {!showAssessmentTooltip && studentId && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, x: 10 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ delay: 0.7, type: 'spring' }}
          onClick={() => setShowResultsModal(true)}
          className="absolute hidden md:block right-[150px] lg:right-[250px] bottom-36 lg:bottom-44 z-30 cursor-pointer drop-shadow-lg group"
        >
          <div className="bg-gradient-to-r from-sky-500 to-teal-500 px-4 py-3 rounded-2xl rounded-br-sm relative transition-all group-hover:from-sky-600 group-hover:to-teal-600 group-hover:-translate-y-1">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-white" />
              <p className="text-xs lg:text-sm font-bold text-white leading-tight">
                View your latest<br/>assessment results!
              </p>
            </div>
            <div className="absolute -right-2 bottom-0 w-4 h-4 bg-teal-500 rotate-45 group-hover:bg-teal-600 transition-colors" />
          </div>
        </motion.div>
      )}

      {showResultsModal && studentId && (
        <AssessmentResultsModal
          isOpen={showResultsModal}
          onClose={() => setShowResultsModal(false)}
          studentId={studentId}
        />
      )}

      <div
        className="hidden md:block absolute right-0 lg:right-10 bottom-0 w-[150px] lg:w-[270px] pointer-events-none z-20"
        style={{ clipPath: 'inset(-100% -50% 0 -50%)' }}
      >
         <div className="relative w-full aspect-[4/5] translate-y-[21%] lg:translate-y-[19%] drop-shadow-2xl">
           <Suspense fallback={<div className="w-full h-full scale-[1.25] lg:scale-[1.3] origin-bottom" />}>
             <DashboardAvatar layers={avatarLayers} className="w-full h-full scale-[1.25] lg:scale-[1.3] origin-bottom" />
           </Suspense>
         </div>
      </div>
    </motion.div>
  );
};

export default HeroBanner;
