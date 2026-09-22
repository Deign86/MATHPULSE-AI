import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AvatarLayers } from './CompositeAvatar';
import { getAvatarSrc } from '../data/avatarData';

interface DashboardAvatarProps {
  className?: string;
  layers?: AvatarLayers;
}

export const DashboardAvatar: React.FC<DashboardAvatarProps> = ({ className = "w-full h-full", layers }) => {
  const reduceMotion = useReducedMotion();
  const imageClass = "absolute inset-0 w-full h-full object-contain object-bottom";

  const topSrc = getAvatarSrc(layers?.top);
  const bottomSrc = getAvatarSrc(layers?.bottom);
  const shoesSrc = getAvatarSrc(layers?.shoes);
  const accSrc = getAvatarSrc(layers?.accessory);

  return (
    <div className={`relative flex items-end justify-center ${className}`}>
      {/* Static Body */}
      <img
        src="/avatar/avatar_body_base.png"
        alt="Avatar Body"
        className={`${imageClass} z-10`}
      />
      {bottomSrc && (
        <img
          src={bottomSrc}
          alt="Pants"
          className={`${imageClass} z-[12]`}
        />
      )}
      {shoesSrc && (
        <img
          src={shoesSrc}
          alt="Shoes"
          className={`${imageClass} z-[11]`}
        />
      )}
      {topSrc && (
        <img
          src={topSrc}
          alt="Uniform"
          className={`${imageClass} z-[13]`}
        />
      )}

      {/* Swinging Head Container */}
      <motion.div
        className="absolute inset-0 w-full h-full z-30 pointer-events-none"
        style={{ originY: 0.75, originX: 0.5 }}
        animate={reduceMotion ? {} : { rotate: [-2.5, 2.5, -2.5], y: [0, -3, 0] }}
        transition={{
          duration: 4,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      >
        {/* Left Horn */}
        <motion.img
          src="/avatar/left_horn.png"
          alt="Left Horn"
          className={`${imageClass} z-0`}
          style={{ originX: 0.5, originY: 0.45 }}
          animate={reduceMotion ? {} : { rotate: [-4, 4, -4] }}
          transition={{
            duration: 3.5,
            ease: "easeInOut",
            repeat: Infinity,
          }}
        />

        {/* Right Horn */}
        <motion.img
          src="/avatar/right_horn.png"
          alt="Right Horn"
          className={`${imageClass} z-0`}
          style={{ originX: 0.5, originY: 0.45 }}
          animate={reduceMotion ? {} : { rotate: [4, -4, 4] }}
          transition={{
            duration: 3.5,
            ease: "easeInOut",
            repeat: Infinity,
          }}
        />

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
          style={{ originY: "50%", originX: "50%" }}
          animate={reduceMotion ? {} : { scaleY: [1, 0.1, 1] }}
          transition={{
            duration: 0.22,
            repeat: Infinity,
            repeatDelay: 3.6,
            ease: "easeInOut",
          }}
        />

        {/* Accessory attached to head */}
        {accSrc && (
          <img
            src={accSrc}
            alt="Accessory"
            className={`${imageClass} z-[4]`}
          />
        )}
      </motion.div>
    </div>
  );
};

export default DashboardAvatar;

