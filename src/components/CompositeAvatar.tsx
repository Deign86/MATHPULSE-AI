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
  // Base robot components
  const baseBody = <img src="/avatar/avatar_body.png" alt="base" className="absolute inset-0 w-full h-full object-contain z-10" />;
  const leftHorn = (
    <motion.img 
      src="/avatar/left_horn.png" 
      alt="left horn" 
      className="absolute inset-0 w-full h-full object-contain origin-[50%_45%] z-0"
      animate={{ rotate: [-4, 4, -4] }}
      transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
    />
  );
  const rightHorn = (
    <motion.img 
      src="/avatar/right_horn.png" 
      alt="right horn" 
      className="absolute inset-0 w-full h-full object-contain origin-[50%_45%] z-0"
      animate={{ rotate: [4, -4, 4] }}
      transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
    />
  );

  // If no layers defined, render fallback or nothing
  if (!layers || (!layers.top && !layers.bottom && !layers.shoes && !layers.accessory)) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        {leftHorn}
        {rightHorn}
        {baseBody}
      </div>
    );
  }

  const topSrc = getAvatarSrc(layers.top);
  const bottomSrc = getAvatarSrc(layers.bottom);
  const shoesSrc = getAvatarSrc(layers.shoes);
  const accSrc = getAvatarSrc(layers.accessory);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {leftHorn}
      {rightHorn}
      {baseBody}
      
      {/* Clothing Layers */}
      {bottomSrc && <img src={bottomSrc} alt="bottom" className="absolute inset-0 w-full h-full object-contain z-20" />}
      {shoesSrc && <img src={shoesSrc} alt="shoes" className="absolute inset-0 w-full h-full object-contain z-20" />}
      {topSrc && <img src={topSrc} alt="top" className="absolute inset-0 w-full h-full object-contain z-30" />}
      {accSrc && <img src={accSrc} alt="accessory" className="absolute inset-0 w-full h-full object-contain z-40" />}
    </div>
  );
};

export default CompositeAvatar;

