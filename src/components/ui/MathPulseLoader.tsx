import React from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'motion/react';

interface MathPulseLoaderProps {
  title?: string;
  subtitle?: string;
  className?: string;
  fullScreen?: boolean;
}

const AMBIENT_GLYPHS = [
  { symbol: '+', top: '15%', left: '18%', delay: 0 },
  { symbol: 'π', top: '22%', right: '20%', delay: 0.6 },
  { symbol: '×', bottom: '26%', left: '22%', delay: 1.2 },
  { symbol: '√', bottom: '24%', right: '19%', delay: 1.8 },
  { symbol: '∑', top: '48%', left: '12%', delay: 2.4 },
];

export const MathPulseLoader: React.FC<MathPulseLoaderProps> = ({
  title = 'Loading lesson from DepEd curriculum...',
  subtitle = 'This may take a moment while the AI retrieves curriculum content.',
  className = '',
  fullScreen = true,
}) => {
  const reduceMotion = useReducedMotion();

  const containerClasses = fullScreen
    ? 'fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-50/98 backdrop-blur-md p-6 select-none'
    : `relative flex flex-col items-center justify-center p-8 select-none ${className}`;

  const loaderContent = (
    <div
      className={containerClasses}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={title}
    >
      {/* Floating Ambient Math Glyphs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {AMBIENT_GLYPHS.map((glyph, index) => (
          <motion.span
            key={index}
            className="absolute text-sky-400/25 font-black text-base sm:text-lg select-none"
            style={{
              top: glyph.top,
              bottom: glyph.bottom,
              left: glyph.left,
              right: glyph.right,
            }}
            animate={reduceMotion ? {} : { y: [-4, 4, -4], opacity: [0.2, 0.45, 0.2] }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              delay: glyph.delay,
              ease: 'easeInOut',
            }}
          >
            {glyph.symbol}
          </motion.span>
        ))}
      </div>

      {/* Center Animated Mascot Badge */}
      <div className="relative flex items-center justify-center mb-6">
        {/* Soft Radial Glow Ring */}
        <motion.div
          className="absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-tr from-sky-400/20 via-indigo-400/15 to-rose-400/20 blur-xl"
          animate={reduceMotion ? {} : { scale: [0.95, 1.1, 0.95], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Circular Mascot Podium Frame */}
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-white/90 border-2 border-sky-100/90 shadow-[0_12px_30px_rgba(15,23,42,0.08)] flex items-center justify-center overflow-hidden">
          {/* Subtle Inner Glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-sky-50/50 to-transparent pointer-events-none" />

          {/* Animated Puppet Head (Cropped to eliminate bottom whitespace) */}
          <motion.div
            className="relative w-24 h-24 sm:w-28 sm:h-28"
            animate={reduceMotion ? {} : { rotate: [-3, 3, -3], y: [0, -3, 0] }}
            transition={{ repeat: Infinity, duration: 3.6, ease: 'easeInOut' }}
            style={{ originY: 0.84, originX: 0.5 }}
          >
            {/* Left Horn */}
            <motion.img
              src="/avatar/loader/loader_left_horn.png"
              alt="left horn"
              className="absolute inset-0 w-full h-full object-contain z-0"
              style={{ originX: 0.17, originY: 0.35 }}
              animate={reduceMotion ? {} : { rotate: [-5, 5, -5] }}
              transition={{ repeat: Infinity, duration: 3.2, ease: 'easeInOut' }}
            />

            {/* Right Horn */}
            <motion.img
              src="/avatar/loader/loader_right_horn.png"
              alt="right horn"
              className="absolute inset-0 w-full h-full object-contain z-0"
              style={{ originX: 0.82, originY: 0.35 }}
              animate={reduceMotion ? {} : { rotate: [5, -5, 5] }}
              transition={{ repeat: Infinity, duration: 3.2, ease: 'easeInOut' }}
            />

            {/* Head Base */}
            <img
              src="/avatar/loader/loader_head_base.png"
              alt="MathPulse mascot"
              className="absolute inset-0 w-full h-full object-contain z-10"
            />

            {/* Blinking Eyes */}
            <motion.img
              src="/avatar/loader/loader_eyes.png"
              alt="Avatar eyes"
              className="absolute inset-0 w-full h-full object-contain z-10"
              style={{ originY: '58%', originX: '50%' }}
              animate={reduceMotion ? {} : { scaleY: [1, 0.1, 1] }}
              transition={{
                duration: 0.22,
                repeat: Infinity,
                repeatDelay: 3.4,
                ease: 'easeInOut',
              }}
            />
          </motion.div>
        </div>
      </div>

      {/* Copy: Title & Subtitle */}
      <div className="space-y-1.5 text-center max-w-sm sm:max-w-md px-4 z-10">
        <h3 className="text-slate-800 font-display font-black text-sm sm:text-base tracking-tight leading-snug">
          {title}
        </h3>
        {subtitle && (
          <p className="text-slate-500 text-xs sm:text-sm font-medium leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {/* Progress Track with Gradient Shimmer Bar */}
      <div className="w-52 sm:w-64 h-2 bg-slate-200/80 rounded-full overflow-hidden mt-5 shadow-inner z-10">
        <motion.div
          className="h-full bg-gradient-to-r from-sky-500 via-indigo-500 to-rose-400 rounded-full"
          animate={reduceMotion ? { width: '100%' } : { x: ['-100%', '100%'] }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{ width: '55%' }}
        />
      </div>
    </div>
  );

  if (fullScreen && typeof document !== 'undefined') {
    return createPortal(loaderContent, document.body);
  }

  return loaderContent;
};

export default MathPulseLoader;
