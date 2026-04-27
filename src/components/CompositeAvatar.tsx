import React from 'react';
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

const avatarAnimations = `
  @keyframes head-sway {
    0%, 100% { transform: rotate(-2deg) translateY(0); }
    50% { transform: rotate(2deg) translateY(-3px); }
  }
  @keyframes horn-left {
    0%, 100% { transform: rotate(-4deg); }
    50% { transform: rotate(4deg); }
  }
  @keyframes horn-right {
    0%, 100% { transform: rotate(4deg); }
    50% { transform: rotate(-4deg); }
  }
  @keyframes blink {
    0%, 90%, 100% { transform: scaleY(1); }
    95% { transform: scaleY(0.1); }
  }
  .animate-head-sway {
    transform-origin: 50% 70%;
    animation: head-sway 4s ease-in-out infinite;
  }
  .animate-horn-left {
    transform-origin: 50% 45%;
    animation: horn-left 4s ease-in-out infinite;
  }
  .animate-horn-right {
    transform-origin: 50% 45%;
    animation: horn-right 4s ease-in-out infinite;
  }
  .animate-blink {
    transform-origin: 50% 50%;
    animation: blink 4s ease-in-out infinite;
  }
`;

const CompositeAvatar: React.FC<CompositeAvatarProps> = ({ layers, className = "w-10 h-10 bg-slate-200 rounded-full", fallbackSrc }) => {
  const topSrc = getAvatarSrc(layers?.top);
  const bottomSrc = getAvatarSrc(layers?.bottom);
  const shoesSrc = getAvatarSrc(layers?.shoes);
  const accSrc = getAvatarSrc(layers?.accessory);

  // Base robot components
  const baseBody = <img src="/avatar/avatar_body_base.png" alt="base body" className="absolute inset-0 w-full h-full object-contain z-10" />;

  const headGroup = (
    <>
      <style>{avatarAnimations}</style>
      <div className="absolute inset-0 w-full h-full z-50 pointer-events-none animate-head-sway">
        <img
          src="/avatar/left_horn.png"
          alt="left horn"
          className="absolute inset-0 w-full h-full object-contain animate-horn-left"
        />
        <img
          src="/avatar/right_horn.png"
          alt="right horn"
          className="absolute inset-0 w-full h-full object-contain animate-horn-right"
        />
        <img src="/avatar/avatar_head_base.png" alt="head base" className="absolute inset-0 w-full h-full object-contain z-10" />
        <img
          src="/avatar/eyes_default.png"
          alt="Avatar Eyes"
          className="absolute inset-0 w-full h-full object-contain z-10 animate-blink"
        />
        {accSrc && <img src={accSrc} alt="accessory" className="absolute inset-0 w-full h-full object-contain z-20" />}
      </div>
    </>
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

