import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

const mascotAnimations = `
  @keyframes head-sway {
    0%, 100% { transform: rotate(-2deg) translateY(0); }
    50% { transform: rotate(2deg) translateY(-2px); }
  }
  @keyframes horn-left-wiggle {
    0%, 100% { transform: rotate(-4deg); }
    50% { transform: rotate(4deg); }
  }
  @keyframes horn-right-wiggle {
    0%, 100% { transform: rotate(4deg); }
    50% { transform: rotate(-4deg); }
  }
  @keyframes blink {
    0%, 90%, 100% { transform: scaleY(1); }
    95% { transform: scaleY(0.1); }
  }
  @keyframes mouth-talk {
    0%, 100% { transform: scaleY(1) scaleX(1); }
    25% { transform: scaleY(1.1) scaleX(0.98); }
    50% { transform: scaleY(0.9) scaleX(1.02); }
    75% { transform: scaleY(1.05) scaleX(0.98); }
  }
  .animate-head-sway {
    transform-origin: 50% 75%;
    animation: head-sway 4s ease-in-out infinite;
  }
  .animate-horn-left {
    transform-origin: 50% 45%;
    animation: horn-left-wiggle 4s ease-in-out infinite;
  }
  .animate-horn-right {
    transform-origin: 50% 45%;
    animation: horn-right-wiggle 4s ease-in-out infinite;
  }
  .animate-blink {
    transform-origin: 50% 45%;
    animation: blink 3.7s ease-in-out infinite;
  }
  .animate-mouth {
    transform-origin: 50% 55%;
    animation: mouth-talk 3s ease-in-out infinite;
  }
`;

interface ModulesMascotProps {
  assessmentDismissed?: boolean;
  initialAssessmentCompleted?: boolean;
}

const ModulesMascot: React.FC<ModulesMascotProps> = ({
  assessmentDismissed,
  initialAssessmentCompleted,
}) => {
  const imageClass = "absolute inset-0 w-full h-full object-contain";
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
      <style>{mascotAnimations}</style>
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
            {/* Speech bubble tail pointing to mascot */}
            <div className="absolute -bottom-2 left-4 w-3 h-3 bg-white border-r border-b border-[#dde3eb] rotate-45" />
          </motion.div>
        )}

        {/* Base: Desk and Body */}
        <img
          src="/mascot/modules_avatar_body.png"
          alt="Desk setup"
          className={`${imageClass} z-10`}
        />

        {/* Animated Head Group - CSS WAAPI animation */}
        <div className={`${imageClass} z-20 animate-head-sway`}>
          {/* Left Horn */}
          <img
            src="/mascot/modules_left_horn.png"
            alt="Left Horn"
            className={`${imageClass} z-0 animate-horn-left`}
          />

          {/* Right Horn */}
          <img
            src="/mascot/modules_right_horn.png"
            alt="Right Horn"
            className={`${imageClass} z-0 animate-horn-right`}
          />

          {/* Head Base (with headphones) */}
          <img
            src="/mascot/modules_head.png"
            alt="Mascot Head"
            className={`${imageClass} z-[1]`}
          />

          {/* Eyes - CSS blink animation */}
          <img
            src="/mascot/modules_eyes.png"
            alt="Eyes"
            className={`${imageClass} z-[2] animate-blink`}
          />

          {/* Mouth - CSS talking animation */}
          <img
            src="/mascot/modules_mouth.png"
            alt="Mouth"
            className={`${imageClass} z-[3] animate-mouth`}
          />
        </div>
      </div>
    </>
  );
};

export default ModulesMascot;
