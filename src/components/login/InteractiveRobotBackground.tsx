import React, { useEffect, useRef, useState, useCallback } from 'react';
import mascotScrubMp4 from '../../assets/video/mascot-robot-scrub.mp4';
import mascotPoster from '../../assets/video/mascot-robot-poster.png';

interface InteractiveRobotBackgroundProps {
  onLoaded?: () => void;
}

const SCRUB_START = 0.0;
const SCRUB_END = 2.5; // Monotonic continuous head-turn from Left (0s) to Right (2.5s)
const SPEED = 3.5; // Constant maximum turn velocity (timeline seconds per real second)

export const InteractiveRobotBackground: React.FC<InteractiveRobotBackgroundProps> = ({
  onLoaded,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const targetTimeRef = useRef<number>(1.25); // Default to center looking forward
  const lastTimeRef = useRef<number>(0);
  const isRafActive = useRef<boolean>(false);

  const [isReady, setIsReady] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(isTouch);
  }, []);

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

    if (Math.abs(diff) > 0.015) {
      const delta = Math.sign(diff) * Math.min(Math.abs(diff), maxStep);
      const nextTime = Math.max(SCRUB_START, Math.min(SCRUB_END, current + delta));
      if (!video.seeking) {
        video.currentTime = nextTime;
      }
      requestAnimationFrame(step);
    } else {
      if (!video.seeking && Math.abs(current - target) > 0.001) {
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

  // Pointer move handler across the entire window viewport
  useEffect(() => {
    if (isTouchDevice) return;

    const handlePointerMove = (e: MouseEvent | PointerEvent) => {
      const normalizedX = e.clientX / window.innerWidth;
      const clampedX = Math.max(0, Math.min(1, normalizedX));

      // Pure monotonic mapping: 0% (Left) -> 0.0s, 50% (Center) -> 1.25s, 100% (Right) -> 2.5s
      const newTarget = SCRUB_START + clampedX * (SCRUB_END - SCRUB_START);
      targetTimeRef.current = newTarget;

      startLoop();
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('mousemove', handlePointerMove, { passive: true });

    startLoop();

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('mousemove', handlePointerMove);
    };
  }, [isTouchDevice, startLoop]);

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video) {
      if (isTouchDevice) {
        video.loop = true;
        video.play().catch(() => {});
      } else {
        video.pause();
        video.currentTime = targetTimeRef.current;
        startLoop();
      }
      setIsReady(true);
      onLoaded?.();
    }
  };

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0 bg-[#3a236a]"
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
        onCanPlay={() => setIsReady(true)}
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

      {/* Subtle edge lighting */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-black/35 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/25 pointer-events-none" />
    </div>
  );
};

export default InteractiveRobotBackground;
