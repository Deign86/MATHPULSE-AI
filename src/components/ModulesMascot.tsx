import React from 'react';

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

const ModulesMascot: React.FC = () => {
  const imageClass = "absolute inset-0 w-full h-full object-contain";

  return (
    <>
      <style>{mascotAnimations}</style>
      <div className="relative w-full h-[250px] flex items-end justify-center drop-shadow-sm select-none pointer-events-none">
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
