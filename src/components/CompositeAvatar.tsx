import React from 'react';
import { motion } from 'motion/react';
import { getAvatarSrc } from '../data/avatarData';

export interface AvatarLayers {
  top?: string;
  bottom?: string;
  shoes?: string;
  accessory?: string;
}

interface CompositeAvatarProps {
  layers?: AvatarLayers;
  className?: string; // used to set width, height, rounding, etc.
  fallbackSrc?: string; // what to show if no custom layout is given
}

const CompositeAvatar: React.FC<CompositeAvatarProps> = ({ layers, className = "w-10 h-10 bg-slate-200 rounded-full", fallbackSrc }) => {
  const topSrc = getAvatarSrc(layers?.top);
  const bottomSrc = getAvatarSrc(layers?.bottom);
  const shoesSrc = getAvatarSrc(layers?.shoes);
  const accSrc = getAvatarSrc(layers?.accessory);

  // Base robot components
  const baseBody = <img src="/avatar/avatar_body_base.png" alt="base body" className="absolute inset-0 w-full h-full object-contain z-10" />;
  
  const headGroup = (
    <motion.div 
      className="absolute inset-0 w-full h-full z-50 pointer-events-none"
      animate={{ rotate: [-2, 2, -2], y: [0, -3, 0] }}
      transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
      style={{ originY: 0.7, originX: 0.5 }}
    >
      <motion.img 
        src="/avatar/left_horn.png" 
        alt="left horn" 
        className="absolute inset-0 w-full h-full object-contain origin-[50%_45%] z-0"
        animate={{ rotate: [-4, 4, -4] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
      />
      <motion.img 
        src="/avatar/right_horn.png" 
        alt="right horn" 
        className="absolute inset-0 w-full h-full object-contain origin-[50%_45%] z-0"
        animate={{ rotate: [4, -4, 4] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
      />
      <img src="/avatar/avatar_head_base.png" alt="head base" className="absolute inset-0 w-full h-full object-contain z-10" />
      <motion.img
        src="/avatar/eyes_default.png"
        alt="Avatar Eyes"
        className="absolute inset-0 w-full h-full object-contain z-10"
        style={{ originY: "50%" }}
        animate={{ scaleY: [1, 0.1, 1] }}
        transition={{
          duration: 0.2,
          repeat: Infinity,
          repeatDelay: 3.8,
          ease: "easeInOut"
        }}
      />
      {accSrc && <img src={accSrc} alt="accessory" className="absolute inset-0 w-full h-full object-contain z-20" />}
    </motion.div>
  );

  // If no layers defined, render fallback or nothing
  if (!layers || (!layers.top && !layers.bottom && !layers.shoes && !layers.accessory)) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        {baseBody}
        {headGroup}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {baseBody}
      
      {/* Clothing Layers */}
      {bottomSrc && <img src={bottomSrc} alt="bottom" className="absolute inset-0 w-full h-full object-contain z-20" />}
      {shoesSrc && <img src={shoesSrc} alt="shoes" className="absolute inset-0 w-full h-full object-contain z-30" />}
      {topSrc && <img src={topSrc} alt="top" className="absolute inset-0 w-full h-full object-contain z-40" />}
      
      {/* Head and Accessories are animated together */}
      {headGroup}
    </div>
  );
};

export default CompositeAvatar;

