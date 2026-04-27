import React from 'react';
import { AvatarLayers } from './CompositeAvatar';
import { getAvatarSrc } from '../data/avatarData';

const avatarAnimations = `
  @keyframes head-sway {
    0%, 100% { transform: rotate(-2deg); }
    50% { transform: rotate(2deg); }
  }
  @keyframes blink {
    0%, 90%, 100% { transform: scaleY(1); }
    95% { transform: scaleY(0.1); }
  }
  @keyframes horn-wiggle {
    0%, 100% { transform: rotate(1deg); }
    50% { transform: rotate(-1deg); }
  }
  .animate-head-sway {
    transform-origin: 50% 80%;
    animation: head-sway 4s ease-in-out infinite;
  }
  .animate-blink {
    transform-origin: 50% 50%;
    animation: blink 4s ease-in-out infinite;
  }
  .animate-horn-wiggle {
    transform-origin: 50% 100%;
    animation: horn-wiggle 3.5s ease-in-out infinite;
  }
`;

interface DashboardAvatarProps {
  className?: string;
  layers?: AvatarLayers;
}

export const DashboardAvatar: React.FC<DashboardAvatarProps> = ({ className = "w-full h-full", layers }) => {
  const imageClass = "absolute inset-0 w-full h-full object-contain object-bottom";

  const topSrc = getAvatarSrc(layers?.top);
  const bottomSrc = getAvatarSrc(layers?.bottom);
  const shoesSrc = getAvatarSrc(layers?.shoes);
  const accSrc = getAvatarSrc(layers?.accessory);

  return (
    <>
      <style>{avatarAnimations}</style>
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

        {/* Swinging Head Container - CSS WAAPI animation */}
        <div className="absolute inset-0 w-full h-full z-30 animate-head-sway">
          {/* Head Base */}
          <img
            src="/avatar/avatar_head_base.png"
            alt="Avatar Head"
            className={`${imageClass} z-[1]`}
          />

          {/* Blinking Eyes - CSS animation */}
          <img
            src="/avatar/eyes_default.png"
            alt="Avatar Eyes"
            className={`${imageClass} z-[2] animate-blink`}
          />

          {/* Wiggling Horns - CSS animation */}
          <div className={`${imageClass} z-[3] animate-horn-wiggle`}>
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
          </div>

          {/* Accessory attached to head */}
          {accSrc && (
            <img
              src={accSrc}
              alt="Accessory"
              className={`${imageClass} z-[4]`}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default DashboardAvatar;
