import React from 'react';
import { motion, Variants } from 'motion/react';

const ModulesMascot: React.FC = () => {
  const imageClass = "absolute inset-0 w-full h-full object-contain";

  // Character head sway animation
  const headSway: Variants = {
    animate: {
      rotate: [-2, 2, -2],
      y: [0, -2, 0],
      transition: {
        repeat: Infinity,
        duration: 4,
        ease: "easeInOut"
      }
    }
  };

  // Blinking animation
  const blink: Variants = {
    animate: {
      scaleY: [1, 0.1, 1],
      transition: {
        repeat: Infinity,
        duration: 0.2,
        repeatDelay: 3.5,
        ease: "easeInOut"
      }
    }
  };

  // Subtle mouth movement (talking/breathing)
  const mouthMove: Variants = {
    animate: {
      scaleY: [1, 1.1, 0.9, 1.05, 1],
      scaleX: [1, 0.98, 1.02, 0.98, 1],
      transition: {
        repeat: Infinity,
        duration: 3,
        ease: "easeInOut"
      }
    }
  };

  return (
    <div className="relative w-full h-[250px] flex items-end justify-center drop-shadow-sm select-none pointer-events-none">
      {/* Base: Desk and Body */}
      <img 
        src="/mascot/modules_avatar_body.png" 
        alt="Desk setup" 
        className={`${imageClass} z-10`}
      />

      {/* Animated Head Group */}
      <motion.div 
        className={`${imageClass} z-20`}
        variants={headSway}
        animate="animate"
        style={{ originY: 0.75, originX: 0.5 }}
      >
        {/* Left Horn */}
        <motion.img 
          src="/mascot/modules_left_horn.png" 
          alt="Left Horn" 
          className={`${imageClass} z-0`}
          style={{ originX: 0.5, originY: 0.45 }}
          animate={{ rotate: [-4, 4, -4] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        />

        {/* Right Horn */}
        <motion.img 
          src="/mascot/modules_right_horn.png" 
          alt="Right Horn" 
          className={`${imageClass} z-0`}
          style={{ originX: 0.5, originY: 0.45 }}
          animate={{ rotate: [4, -4, 4] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        />

        {/* Head Base (with headphones) */}
        <img 
          src="/mascot/modules_head.png" 
          alt="Mascot Head" 
          className={`${imageClass} z-[1]`}
        />

        {/* Eyes */}
        <motion.img 
          src="/mascot/modules_eyes.png" 
          alt="Eyes" 
          className={`${imageClass} z-[2]`}
          style={{ originY: "45%" }}
          variants={blink}
          animate="animate"
        />

        {/* Mouth */}
        <motion.img 
          src="/mascot/modules_mouth.png" 
          alt="Mouth" 
          className={`${imageClass} z-[3]`}
          style={{ originY: "55%" }}
          variants={mouthMove}
          animate="animate"
        />
      </motion.div>
    </div>
  );
};

export default ModulesMascot;
