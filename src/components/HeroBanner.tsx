import React, { lazy, Suspense, useState, useEffect } from 'react';
import { ArrowRight, Zap, Brain, CheckCircle } from 'lucide-react';
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
      className="relative w-full mt-0 rounded-3xl md:rounded-[2rem] p-5 md:p-6 lg:p-8 bg-gradient-to-br from-white via-sky-50/50 to-white border border-slate-200/80 card-elevated-lg shadow-sm"
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

      {/* Mobile Layout (< md): Reference-Proportioned 2-Column Hero Card */}
      <div className="md:hidden relative z-10 flex flex-col gap-3">
        {/* Main Reference Card: Vibrant Gradient with 2-Column Layout */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-purple-600 via-indigo-600 to-[#7C3AED] text-white p-4 sm:p-5 shadow-lg shadow-purple-500/20 border border-purple-400/30">
          {/* Subtle paper-cut lighting overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_70%)] pointer-events-none" />
          <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-12 gap-3 items-center">
            {/* Left Column: Module details, Progress, and Continue ▶ Pill */}
            <div className="col-span-7 sm:col-span-8 flex flex-col items-start min-w-0 pr-1">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-[11px] font-semibold text-purple-100 mb-1.5 tracking-wide">
                Continue Learning
              </span>

              <h2 className="text-lg sm:text-xl font-display font-black text-white leading-tight tracking-tight truncate w-full">
                General Mathematics
              </h2>

              <p className="text-xs text-purple-100/90 font-medium mt-0.5">
                Lesson 4 of 20
              </p>

              {/* Progress bar + percentage */}
              <div className="w-full flex items-center gap-2 mt-2.5 mb-3">
                <div className="flex-1 h-2 bg-black/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full w-[40%] shadow-sm" />
                </div>
                <span className="text-[11px] font-bold text-white tabular-nums shrink-0">
                  40%
                </span>
              </div>

              {/* Compact Pill Action: Continue ▶ */}
              <motion.button
                onClick={onContinueLearning}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="inline-flex items-center gap-2 bg-white text-purple-700 hover:bg-purple-50 px-4 py-2 rounded-full font-display font-bold text-xs shadow-md shadow-black/10 transition-all min-h-[38px]"
                aria-label="Continue learning General Mathematics"
              >
                <span>Continue</span>
                <ArrowRight size={13} className="text-purple-700 stroke-[2.5]" />
              </motion.button>
            </div>

            {/* Right Column: Dedicated Avatar Spotlight (Zero collision, framed inside card) */}
            <div className="col-span-5 sm:col-span-4 flex justify-end items-center">
              <div className="w-24 sm:w-28 h-32 sm:h-36 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 shadow-inner relative overflow-hidden flex items-end justify-center p-1">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.25),transparent_70%)] pointer-events-none" />
                <div className="relative w-full aspect-[4/5] translate-y-1 drop-shadow-lg">
                  <Suspense fallback={<Skeleton className="w-full h-full rounded-xl" aria-label="Loading avatar" />}>
                    <DashboardAvatar layers={avatarLayers} className="w-full h-full scale-[1.28] origin-bottom" />
                  </Suspense>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Assessment Action Alerts (if available) */}
        {showAssessmentTooltip && (
          <button
            type="button"
            onClick={onOpenAssessment}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border-2 border-amber-300 bg-amber-50/95 text-amber-900 text-xs font-bold hover:bg-amber-100 transition-colors shadow-sm text-left"
          >
            <div className="flex items-center gap-2">
              <Brain size={16} className="text-amber-600 shrink-0" />
              <span>Initial Assessment is Ready!</span>
            </div>
            <ArrowRight size={14} className="text-amber-700 shrink-0" />
          </button>
        )}

        {assessmentCompleted && !showAssessmentTooltip && (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('mathpulse:navigate', { detail: { tab: 'Grades' } }))}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-teal-300 bg-teal-50/95 text-teal-900 text-xs font-bold hover:bg-teal-100 transition-colors shadow-sm text-left"
          >
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-teal-600 shrink-0" />
              <span>Assessment Complete · View History</span>
            </div>
            <ArrowRight size={14} className="text-teal-700 shrink-0" />
          </button>
        )}
      </div>

      {/* Desktop Layout (md: and above): Spacious horizontal banner with desktop avatar */}
      <div className="hidden md:flex relative z-10 min-h-[140px] lg:min-h-[160px] items-center justify-between gap-6 pb-0">
        <div className="flex-1 max-w-xl pr-4 lg:pr-8 py-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="px-4 py-1.5 rounded-full bg-sky-100 border border-sky-200">
              <span className="text-sm font-body font-bold text-sky-700">Level {userLevel}</span>
            </div>
            <div className="px-4 py-1.5 rounded-full bg-rose-50 border border-rose-200">
              <Zap size={14} className="inline -mt-0.5 text-rose-500 mr-1" />
              <span className="text-sm font-body font-bold text-rose-700">Active</span>
            </div>
          </div>

          <h1 className="text-2xl lg:text-3xl font-display font-black text-[#0a1628] mb-1.5 tracking-tight leading-[1.1]">
            {getGreeting()}, {userName}!
          </h1>
          <p className="text-slate-500 mb-1 text-sm font-body font-bold">Today is a great day to move one step forward in math mastery.</p>
          <p className="text-xs text-slate-400 font-body mb-4">Focus on your next recommended lesson and keep your momentum.</p>

          <motion.button
            onClick={onContinueLearning}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="mt-2 bg-gradient-to-r from-purple-600 to-[#9956DE] text-white px-5 py-2.5 rounded-xl font-body font-bold text-sm shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all flex items-center gap-2 group w-fit min-h-[44px]"
          >
            Continue Learning
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </motion.button>
        </div>
      </div>

      {/* Desktop Speech Bubble Tooltips */}
      {showAssessmentTooltip && (
        <motion.button
          type="button"
          aria-label="Open initial assessment"
          initial={{ opacity: 0, scale: 0.9, x: 10 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ delay: reduceMotion ? 0 : 0.5, type: 'spring' }}
          onClick={onOpenAssessment}
          className="absolute hidden md:block right-[120px] lg:right-[250px] bottom-16 lg:bottom-20 z-30 cursor-pointer drop-shadow-lg group text-left focus-visible:outline-2 focus-visible:outline-amber-500"
        >
          <div className="bg-white px-4 py-3 rounded-2xl rounded-br-sm border-2 border-amber-300 relative transition-all group-hover:bg-amber-50 group-hover:border-amber-400 group-hover:-translate-y-1">
            <div className="flex items-center gap-2">
              <span className="text-amber-500">
                <Brain size={16} />
              </span>
              <p className="text-xs lg:text-sm font-bold text-amber-900 leading-tight">
                Don't forget to take the<br />Initial Assessment!
              </p>
            </div>
            <div className="absolute -right-2 bottom-0 w-4 h-4 bg-white border-2 border-transparent border-r-amber-300 border-b-amber-300 rotate-45 group-hover:bg-amber-50 group-hover:border-r-amber-400 group-hover:border-b-amber-400 transition-colors" />
          </div>
        </motion.button>
      )}

      {assessmentCompleted && !showAssessmentTooltip && (
        <motion.button
          type="button"
          aria-label="View assessment results and history"
          initial={{ opacity: 0, scale: 0.9, x: 10 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ delay: reduceMotion ? 0 : 0.5, type: 'spring' }}
          onClick={() => window.dispatchEvent(new CustomEvent('mathpulse:navigate', { detail: { tab: 'Grades' } }))}
          className="absolute hidden md:block right-[120px] lg:right-[250px] bottom-16 lg:bottom-20 z-30 cursor-pointer drop-shadow-lg group text-left focus-visible:outline-2 focus-visible:outline-teal-500"
        >
          <div className="bg-white px-4 py-3 rounded-2xl rounded-br-sm border-2 border-teal-300 relative transition-all group-hover:bg-teal-50 group-hover:border-teal-400 group-hover:-translate-y-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center shrink-0">
                <CheckCircle size={14} className="text-teal-600" />
              </div>
              <p className="text-xs lg:text-sm font-bold text-teal-900 leading-tight">
                Assessment Complete!<br />
                <span className="text-[10px] lg:text-[11px] font-normal text-teal-700">View results &amp; history</span>
              </p>
            </div>
            <div className="absolute -right-2 bottom-0 w-4 h-4 bg-white border-2 border-transparent border-r-teal-300 border-b-teal-300 rotate-45 group-hover:bg-teal-50 group-hover:border-r-teal-400 group-hover:border-b-teal-400 transition-colors" />
          </div>
        </motion.button>
      )}

      {showResultsModal && studentId && (
        <AssessmentResultsModal
          isOpen={showResultsModal}
          onClose={() => setShowResultsModal(false)}
          studentId={studentId}
          heroBannerSummary={heroBannerSummary}
        />
      )}

      {/* Desktop Avatar Container: Anchored to the exact bottom of the banner on md: and above */}
      <div
        className="hidden md:block absolute right-0 bottom-0 lg:right-10 w-[150px] lg:w-[270px] pointer-events-none z-20"
        style={{ clipPath: 'inset(-100% -50% 0 -50%)' }}
      >
        <div className="relative w-full aspect-[4/5] md:translate-y-[21%] lg:translate-y-[19%] drop-shadow-2xl">
          <Suspense fallback={<Skeleton className="w-full aspect-[4/5] md:scale-[1.25] lg:scale-[1.3] origin-bottom" aria-label="Loading avatar" />}>
            <DashboardAvatar layers={avatarLayers} className="w-full h-full md:scale-[1.25] lg:scale-[1.3] origin-bottom" />
          </Suspense>
        </div>
      </div>
    </motion.div>
  );
};

export default HeroBanner;
