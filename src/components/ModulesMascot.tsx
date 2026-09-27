import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface ModulesMascotProps {
  assessmentDismissed?: boolean;
  initialAssessmentCompleted?: boolean;
}

const ModulesMascot: React.FC<ModulesMascotProps> = ({
  assessmentDismissed,
  initialAssessmentCompleted,
}) => {
  const reduceMotion = useReducedMotion();
  const imageClass = 'absolute inset-0 w-full h-full object-contain';
  const [showReminder, setShowReminder] = useState(false);

  useEffect(() => {
    const REMINDER_KEY = 'mathpulse_assessment_reminder_shown';
    if (
      assessmentDismissed &&
      !initialAssessmentCompleted &&
      !sessionStorage.getItem(REMINDER_KEY)
    ) {
      setShowReminder(true);
    } else {
      setShowReminder(false);
    }
  }, [assessmentDismissed, initialAssessmentCompleted]);

  const handleReminderClick = () => {
    sessionStorage.setItem('mathpulse_assessment_reminder_shown', 'true');
    setShowReminder(false);
    window.dispatchEvent(new CustomEvent('mathpulse:open-assessment'));
  };

  return (
    <>
      <div className="relative w-full h-[250px] flex items-end justify-center drop-shadow-sm select-none pointer-events-none">
        {showReminder && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            className="absolute top-0 right-0 z-50 max-w-[180px] bg-white rounded-2xl shadow-lg border border-[#dde3eb] p-3 cursor-pointer pointer-events-auto"
            onClick={handleReminderClick}
          >
            <p className="text-[11px] font-bold text-[#0a1628] leading-snug">
              Psst! Complete your assessment for a personalized path!
            </p>
            <div className="mt-1.5 flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-[#5a6578] font-medium">Tap to start</span>
            </div>
            {/* Speech bubble tail */}
            <div className="absolute -bottom-2 left-4 w-3 h-3 bg-white border-r border-b border-[#dde3eb] rotate-45" />
          </motion.div>
        )}

        {/* Static Body + Desk — no animation, no will-change needed */}
        <img
          src="/mascot/modules_avatar_body.png"
          alt="Desk setup"
          className={`${imageClass} z-10`}
          draggable={false}
        />

        {/*
          Animated Head Group
          - Only `rotate` (no y-translation) so the compositor handles a single
            transform property rather than a compound translate+rotate matrix.
          - `will-change: transform` promotes the subtree to its own GPU layer,
            preventing main-thread layout recalculation on each frame.
        */}
        <motion.div
          className="absolute inset-0 w-full h-full z-20 pointer-events-none"
          style={{ originY: 0.75, originX: 0.5, willChange: 'transform' }}
          animate={reduceMotion ? {} : { rotate: [-2, 2, -2] }}
          transition={{
            duration: 4,
            ease: 'easeInOut',
            repeat: Infinity,
          }}
        >
          {/* Left Horn */}
          <motion.img
            src="/mascot/modules_left_horn.png"
            alt=""
            aria-hidden="true"
            className={`${imageClass} z-0`}
            style={{ originX: 0.5, originY: 0.45, willChange: 'transform' }}
            animate={reduceMotion ? {} : { rotate: [-4, 4, -4] }}
            transition={{
              duration: 3.5,
              ease: 'easeInOut',
              repeat: Infinity,
            }}
          />

          {/* Right Horn */}
          <motion.img
            src="/mascot/modules_right_horn.png"
            alt=""
            aria-hidden="true"
            className={`${imageClass} z-0`}
            style={{ originX: 0.5, originY: 0.45, willChange: 'transform' }}
            animate={reduceMotion ? {} : { rotate: [4, -4, 4] }}
            transition={{
              duration: 3.5,
              ease: 'easeInOut',
              repeat: Infinity,
            }}
          />

          {/* Head Base (with headphones) — static, no extra animation */}
          <img
            src="/mascot/modules_head.png"
            alt="Mascot Head"
            className={`${imageClass} z-[1]`}
            draggable={false}
          />

          {/* Blinking Eyes — single-property scaleY for cheapest GPU path */}
          <motion.img
            src="/mascot/modules_eyes.png"
            alt=""
            aria-hidden="true"
            className={`${imageClass} z-[2]`}
            style={{ originX: '50%', originY: '50%', willChange: 'transform' }}
            animate={reduceMotion ? {} : { scaleY: [1, 0.1, 1] }}
            transition={{
              duration: 0.22,
              repeat: Infinity,
              repeatDelay: 3.6,
              ease: 'easeInOut',
            }}
          />

          {/*
            Mouth — single-property scaleY only (dropped simultaneous scaleX
            to avoid dual-property paint on every frame).
          */}
          <motion.img
            src="/mascot/modules_mouth.png"
            alt=""
            aria-hidden="true"
            className={`${imageClass} z-[3]`}
            style={{ originX: '50%', originY: '55%', willChange: 'transform' }}
            animate={reduceMotion ? {} : { scaleY: [1, 1.12, 0.92, 1.06, 1] }}
            transition={{
              duration: 3,
              ease: 'easeInOut',
              repeat: Infinity,
            }}
          />
        </motion.div>
      </div>
    </>
  );
};

export default ModulesMascot;
