import React, { useEffect, useRef, useState, useCallback } from 'react';
import mascotScrubMp4 from '../../assets/video/mascot-robot-scrub.mp4';
import mascotPoster from '../../assets/video/mascot-robot-poster.png';

interface InteractiveRobotBackgroundProps {
  onLoaded?: () => void;
}

const SCRUB_START = 0.0;
const SCRUB_END = 2.3; // Calibrated monotonic head-turn from Left (0.0s) -> Center (1.15s) -> Right (2.3s)
const SPEED = 4.5; // Natural turn velocity (timeline seconds per real second; full 2.3s sweep across viewport in ~0.5s)

// Shared with LoginPage, which positions the headline and speech bubble against the moved frame.
export const ROBOT_SCALE = 0.8;
export const ROBOT_SHIFT = '22vw';
const EDGE_FADE_MASK = [
  'linear-gradient(to bottom, transparent, #000 14%)',
  'linear-gradient(to left, transparent, #000 14%)',
  'linear-gradient(to right, transparent, #000 14%)',
].join(', ');

export const InteractiveRobotBackground: React.FC<InteractiveRobotBackgroundProps> = ({
  onLoaded,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const targetTimeRef = useRef<number>(1.15); // Default to center looking forward
  const lastTimeRef = useRef<number>(0);
  const isRafActive = useRef<boolean>(false);

  const [isReady, setIsReady] = useState(false);

  // Main RAF tick: smoothly tracks cursor position at consistent, natural velocity
  const step = useCallback((now: number) => {
    const video = videoRef.current;
    if (!video) {
      isRafActive.current = false;
      return;
    }

    if (!lastTimeRef.current) {
      lastTimeRef.current = now;
    }
    const dt = Math.max(0.001, Math.min(0.05, (now - lastTimeRef.current) / 1000));
    lastTimeRef.current = now;

    const target = targetTimeRef.current;
    const current = video.currentTime;
    const diff = target - current;
    const maxStep = SPEED * dt;

    if (Math.abs(diff) > 0.01 || video.seeking) {
      if (!video.seeking) {
        const delta = Math.sign(diff) * Math.min(Math.abs(diff), maxStep);
        const nextTime = Math.max(SCRUB_START, Math.min(SCRUB_END, current + delta));
        video.currentTime = nextTime;
      }
      requestAnimationFrame(step);
    } else {
      if (Math.abs(current - target) > 0.001) {
        video.currentTime = target;
      }
      isRafActive.current = false;
    }
  }, []);

  const startLoop = useCallback(() => {
    if (!isRafActive.current) {
      isRafActive.current = true;
      lastTimeRef.current = performance.now();
      requestAnimationFrame(step);
    }
  }, [step]);

  // Pointer & mouse & touch move handler across the entire window viewport
  useEffect(() => {
    const updateTarget = (clientX: number) => {
      const normalizedX = clientX / window.innerWidth;
      const clampedX = Math.max(0, Math.min(1, normalizedX));

      // Monotonic mapping: 0% (Left) -> 0.0s, 50% (Center) -> 1.15s, 100% (Right) -> 2.3s
      const newTarget = SCRUB_START + clampedX * (SCRUB_END - SCRUB_START);
      targetTimeRef.current = newTarget;

      const video = videoRef.current;
      if (video && !video.paused) {
        video.pause();
      }

      startLoop();
    };

    const handlePointerMove = (e: PointerEvent) => {
      updateTarget(e.clientX);
    };

    const handleMouseMove = (e: MouseEvent) => {
      updateTarget(e.clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        updateTarget(e.touches[0].clientX);
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    startLoop();

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [startLoop]);

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = targetTimeRef.current;
      startLoop();
      setIsReady(true);
      onLoaded?.();
    }
  };

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0 bg-[linear-gradient(180deg,#2d2267,#3a2e78_55%,#4a3d8f)]"
    >
      {/* Video is scaled down from the bottom-left (ROBOT_SCALE) and shifted right (ROBOT_SHIFT) to
          free the left side for the headline; its exposed edges fade into the matching background. */}
      <div
        className="absolute inset-0 origin-bottom-left"
        style={{
          transform: `translateX(${ROBOT_SHIFT}) scale(${ROBOT_SCALE})`,
          maskImage: EDGE_FADE_MASK,
          WebkitMaskImage: EDGE_FADE_MASK,
          maskComposite: 'intersect',
          WebkitMaskComposite: 'source-in',
        }}
      >
      {/* ─── Video with Pure Consistent Cursor-Controlled Scrubbing ─── */}
      <video
        ref={videoRef}
        muted
        playsInline
        preload="auto"
        controls={false}
        poster={mascotPoster}
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={() => {
          setIsReady(true);
          const video = videoRef.current;
          if (video) {
            video.pause();
            video.currentTime = targetTimeRef.current;
            startLoop();
          }
        }}
        className={`w-full h-full object-cover object-[24%_center] sm:object-[28%_center] lg:object-[25%_center] xl:object-[28%_center] transition-opacity duration-500 ${
          isReady ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <source src={mascotScrubMp4} type="video/mp4" />
      </video>

      {/* Poster fallback */}
      {!isReady && (
        <img
          src={mascotPoster}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-[24%_center] sm:object-[28%_center] lg:object-[25%_center] xl:object-[28%_center]"
        />
      )}
      </div>

      {/* Subtle edge lighting */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-black/35 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/25 pointer-events-none" />
    </div>
  );
};

export default InteractiveRobotBackground;
