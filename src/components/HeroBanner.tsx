import React, { lazy, Suspense, useState, useEffect } from 'react';
import { ArrowRight, Zap, Brain, CheckCircle, X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Skeleton } from './ui/skeleton';
import type { AvatarLayers } from './CompositeAvatar';
import AssessmentResultsModal from './assessment/AssessmentResultsModal';
import { subscribeToHeroBannerModalSummary } from '../services/heroBannerSummaryService';
import type { HeroBannerModalSummary } from '../types/models';

const DashboardAvatar = lazy(() => import('./DashboardAvatar.tsx'));

interface HeroBannerProps {
  userName?: string;
  userLevel?: number;
  avatarLayers?: AvatarLayers;
  onContinueLearning?: () => void;
  showAssessmentTooltip?: boolean;
  onOpenAssessment?: () => void;
  studentId?: string;
  assessmentCompleted?: boolean;
}

const HeroBanner: React.FC<HeroBannerProps> = ({
  userName = 'Student',
  userLevel = 1,
  avatarLayers,
  onContinueLearning,
  showAssessmentTooltip,
  onOpenAssessment,
  studentId,
  assessmentCompleted = false,
}) => {
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [heroBannerSummary, setHeroBannerSummary] = useState<HeroBannerModalSummary | null>(null);

  const dismissStorageKey = studentId
    ? `mathpulse:dismissed_assessment_complete_tooltip_${studentId}`
    : 'mathpulse:dismissed_assessment_complete_tooltip';

  const [isAssessmentCompleteDismissed, setIsAssessmentCompleteDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(dismissStorageKey) === 'true';
    } catch {
      return false;
    }
  });

  const handleDismissAssessmentComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAssessmentCompleteDismissed(true);
    try {
      localStorage.setItem(dismissStorageKey, 'true');
    } catch {
      // Ignore localStorage errors safely
    }
  };

  const handleNavigateGrades = () => {
    setIsAssessmentCompleteDismissed(true);
    try {
      localStorage.setItem(dismissStorageKey, 'true');
    } catch {
      // Ignore localStorage errors safely
    }
    window.dispatchEvent(new CustomEvent('mathpulse:navigate', { detail: { tab: 'Grades' } }));
  };

  // Subscribe to hero banner modal summary when modal is open
  useEffect(() => {
    if (!showResultsModal || !studentId) return;

    const unsubscribe = subscribeToHeroBannerModalSummary(studentId, (summary) => {
      setHeroBannerSummary(summary);
    });
    return () => unsubscribe();
  }, [showResultsModal, studentId]);

  const reduceMotion = useReducedMotion();

  // Clear summary when modal closes
  useEffect(() => {
    if (!showResultsModal) {
      setHeroBannerSummary(null);
    }
  }, [showResultsModal]);

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0.15 : 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full mt-0 rounded-3xl md:rounded-[2rem] p-4 sm:p-5 md:p-6 lg:p-8 bg-gradient-to-br from-white via-sky-50/50 to-white border border-slate-200/80 card-elevated-lg shadow-sm overflow-visible"
    >
      {/* Background elements wrapped in overflow-hidden */}
      <div className="absolute inset-0 overflow-hidden rounded-3xl md:rounded-[2rem] pointer-events-none">
        {/* Gradient accent glow */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky-400/50 to-transparent" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

        {/* Dot pattern overlay */}
        <div className="absolute inset-0 bg-dot-pattern opacity-40" />
      </div>

      {/* Unified Banner Content across Mobile, Tablet, and Desktop */}
      <div className="relative z-10 min-h-[140px] sm:min-h-[150px] lg:min-h-[165px] flex items-center justify-between gap-4 pb-0">
        <div className="flex-1 max-w-[210px] sm:max-w-md lg:max-w-xl pr-2 sm:pr-4 lg:pr-8 py-1">
          {/* Top Badges */}
          <div className="flex items-center gap-1.5 sm:gap-2 mb-2">
            <div className="px-2.5 sm:px-4 py-0.5 sm:py-1.5 rounded-full bg-sky-100 border border-sky-200">
              <span className="text-xs sm:text-sm font-body font-bold text-sky-700">Level {userLevel}</span>
            </div>
            <div className="px-2.5 sm:px-4 py-0.5 sm:py-1.5 rounded-full bg-rose-50 border border-rose-200 flex items-center gap-1">
              <Zap size={13} className="text-rose-500" />
              <span className="text-xs sm:text-sm font-body font-bold text-rose-700">Active</span>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-display font-black text-[#0a1628] mb-1 tracking-tight leading-[1.15]">
            {getGreeting()}, {userName}!
          </h1>

          {/* Subtitle */}
          <p className="text-slate-500 mb-1 text-xs sm:text-sm font-body font-bold leading-snug">
            Today is a great day to move one step forward in math mastery.
          </p>
          <p className="hidden sm:block text-xs text-slate-400 font-body mb-3">
            Focus on your next recommended lesson and keep your momentum.
          </p>

          {/* Continue Learning Action Button */}
          <motion.button
            onClick={onContinueLearning}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="mt-1 sm:mt-2 bg-gradient-to-r from-purple-600 to-[#9956DE] text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-body font-bold text-xs sm:text-sm shadow-md shadow-purple-500/20 hover:shadow-purple-500/30 transition-all flex items-center gap-1.5 sm:gap-2 group w-fit min-h-[38px] sm:min-h-[44px] active:scale-95"
          >
            <span>Continue Learning</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform stroke-[2.5]" />
          </motion.button>
        </div>
      </div>

      {/* Speech Bubble Tooltips */}
      {showAssessmentTooltip && (
        <motion.button
          type="button"
          aria-label="Open initial assessment"
          initial={{ opacity: 0, scale: 0.9, x: 10 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ delay: reduceMotion ? 0 : 0.5, type: 'spring' }}
          onClick={onOpenAssessment}
          className="absolute right-[85px] sm:right-[120px] md:right-[150px] lg:right-[230px] bottom-10 sm:bottom-14 lg:bottom-16 z-30 cursor-pointer drop-shadow-lg group text-left focus-visible:outline-2 focus-visible:outline-amber-500"
        >
          <div className="bg-white px-2.5 sm:px-4 py-1.5 sm:py-3 rounded-2xl rounded-br-sm border-2 border-amber-300 relative transition-all group-hover:bg-amber-50 group-hover:border-amber-400 group-hover:-translate-y-0.5">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-amber-500 shrink-0">
                <Brain size={14} className="sm:w-4 sm:h-4" />
              </span>
              <p className="text-[10px] sm:text-xs lg:text-sm font-bold text-amber-900 leading-tight">
                Don't forget to take the<br className="hidden sm:inline" /> Initial Assessment!
              </p>
            </div>
            <div className="absolute -right-1.5 sm:-right-2 bottom-0 w-3 h-3 sm:w-4 sm:h-4 bg-white border-2 border-transparent border-r-amber-300 border-b-amber-300 rotate-45 group-hover:bg-amber-50 group-hover:border-r-amber-400 group-hover:border-b-amber-400 transition-colors" />
          </div>
        </motion.button>
      )}

      {/* Closeable & Non-Persistent Assessment Complete Speech Bubble */}
      {assessmentCompleted && !showAssessmentTooltip && !isAssessmentCompleteDismissed && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, x: 10 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ delay: reduceMotion ? 0 : 0.5, type: 'spring' }}
          className="absolute right-[85px] sm:right-[120px] md:right-[150px] lg:right-[230px] bottom-10 sm:bottom-14 lg:bottom-16 z-30 drop-shadow-lg group text-left"
        >
          <div
            onClick={handleNavigateGrades}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleNavigateGrades(); }}
            className="bg-white pl-3.5 sm:pl-4 pr-8 sm:pr-9 py-2 sm:py-3 rounded-2xl rounded-br-sm border-2 border-teal-300 relative transition-all group-hover:bg-teal-50 group-hover:border-teal-400 group-hover:-translate-y-0.5 cursor-pointer"
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-teal-100 rounded-full flex items-center justify-center shrink-0">
                <CheckCircle size={13} className="text-teal-600" />
              </div>
              <div>
                <p className="text-[11px] sm:text-xs lg:text-sm font-bold text-teal-900 leading-tight">
                  Assessment Complete!
                </p>
                <p className="text-[9px] sm:text-[10px] lg:text-[11px] font-normal text-teal-700">
                  View results &amp; history
                </p>
              </div>
            </div>

            {/* Close Button to Dismiss and Prevent Covering Content */}
            <button
              type="button"
              aria-label="Dismiss assessment complete notification"
              title="Close"
              onClick={handleDismissAssessmentComplete}
              className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-teal-100/60 transition-colors z-40"
            >
              <X size={13} />
            </button>

            <div className="absolute -right-1.5 sm:-right-2 bottom-0 w-3 h-3 sm:w-4 sm:h-4 bg-white border-2 border-transparent border-r-teal-300 border-b-teal-300 rotate-45 group-hover:bg-teal-50 group-hover:border-r-teal-400 group-hover:border-b-teal-400 transition-colors" />
          </div>
        </motion.div>
      )}

      {showResultsModal && studentId && (
        <AssessmentResultsModal
          isOpen={showResultsModal}
          onClose={() => setShowResultsModal(false)}
          studentId={studentId}
          heroBannerSummary={heroBannerSummary}
        />
      )}

      {/* Uncropped Headroom Avatar Container across Mobile, Tablet, and Desktop (Legs cropped at bottom border only) */}
      <div
        className="absolute right-0 sm:right-2 md:right-4 lg:right-8 bottom-0 w-[120px] sm:w-[150px] md:w-[175px] lg:w-[230px] xl:w-[250px] pointer-events-none z-20"
        style={{ clipPath: 'inset(-100% -50% 0 -50%)' }}
      >
        <div className="relative w-full aspect-[4/5] translate-y-[17%] sm:translate-y-[18%] md:translate-y-[16%] lg:translate-y-[15%] drop-shadow-2xl">
          <Suspense fallback={<Skeleton className="w-full aspect-[4/5] scale-[1.15] lg:scale-[1.18] origin-bottom" aria-label="Loading avatar" />}>
            <DashboardAvatar layers={avatarLayers} className="w-full h-full scale-[1.15] lg:scale-[1.18] origin-bottom" />
          </Suspense>
        </div>
      </div>
    </motion.div>
  );
};

export default HeroBanner;
