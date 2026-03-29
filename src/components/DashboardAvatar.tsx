import React from 'react';
import { motion } from 'motion/react';

interface DashboardAvatarProps {
  className?: string;
}

export const DashboardAvatar: React.FC<DashboardAvatarProps> = ({ className = "w-full h-full" }) => {
  const imageClass = "absolute inset-0 w-full h-full object-contain object-bottom";

  return (
    <div className={`relative flex items-end justify-center ${className}`}>
      {/* Static Body */}
      <img 
        src="/avatar/avatar_body_base.png" 
        alt="Avatar Body"
        className={`${imageClass} z-10`} 
      />
      <img
        src="/avatar/pants_black.png"
        alt="Pants"
        className={`${imageClass} z-[12]`}
      />
      <img
        src="/avatar/shoes_black.png"
        alt="Shoes"
        className={`${imageClass} z-[11]`}
      />
      <img
        src="/avatar/uniform_blue.png"
        alt="Uniform"
        className={`${imageClass} z-[13]`}
      />

      {/* Swinging Head Container */}
      <motion.div
        className="absolute inset-0 w-full h-full z-30"
        style={{ originY: "80%" }}
        animate={{ rotate: [-2, 2, -2] }}
        transition={{
          duration: 4,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      >
        {/* Head Base */}
        <img 
          src="/avatar/avatar_head_base.png" 
          alt="Avatar Head"
          className={`${imageClass} z-[1]`} 
        />

        {/* Blinking Eyes */}
        <motion.img 
          src="/avatar/eyes_default.png" 
          alt="Avatar Eyes"
          className={`${imageClass} z-[2]`}
          style={{ originY: "50%" }}
          animate={{ scaleY: [1, 0.1, 1] }}
          transition={{
            duration: 0.2,
            repeat: Infinity,
            repeatDelay: 3.8,
            ease: "easeInOut"
          }}
        />

        {/* Wiggling Horns */}
        <motion.div
          className={`${imageClass} z-[3]`}
          style={{ originY: "bottom" }}
          animate={{ rotate: [1, -1, 1] }}
          transition={{
            duration: 3.5,
            ease: "easeInOut",
            repeat: Infinity,
          }}
        >
          <img 
            src="/avatar/left_horn.png" 
            alt="Left Horn"
            className={imageClass} 
          />
          <img 
            src="/avatar/right_horn.png" 
            alt="Right Horn"
            className={imageClass} 
          />
        </motion.div>
      </motion.div>
    </div>
  );
};

export default DashboardAvatar;
