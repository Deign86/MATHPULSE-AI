import React, { useEffect, useRef, useState, useCallback } from 'react';
import mascotScrubMp4 from '../../assets/video/mascot-robot-scrub.mp4';
import mascotPoster from '../../assets/video/mascot-robot-poster.png';

interface InteractiveRobotBackgroundProps {
  onLoaded?: () => void;
}

const SCRUB_START = 0.0;
const SCRUB_END = 2.5; // Monotonic head-turn from left (0s) to right (2.5s)
const IDLE_START = 7.4; // Neutral forward position
const IDLE_END = 8.4; // Peak cute head-tilt position
const IDLE_TIMEOUT_MS = 2500; // Start idle head-tilt after 2.5s of inactivity

export const InteractiveRobotBackground: React.FC<InteractiveRobotBackgroundProps> = ({
  onLoaded,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const targetTimeRef = useRef<number>(1.25); // Start at center looking forward
  const lastTimeRef = useRef<number>(0);
  const lastActivityTimeRef = useRef<number>(Date.now());
  const isIdleRef = useRef<boolean>(false);
  const idleCurrentTimeRef = useRef<number>(IDLE_START);
  const idleDirectionRef = useRef<number>(1); // 1 = forward, -1 = reverse (boomerang)
  const isRafActive = useRef<boolean>(false);

  const [isReady, setIsReady] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(isTouch);
  }, []);

  // Main RAF tick: handles constant-velocity mouse scrubbing and seamless boomerang idle animation
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

    const timeSinceActivity = Date.now() - lastActivityTimeRef.current;
    const shouldBeIdle = !isTouchDevice && timeSinceActivity > IDLE_TIMEOUT_MS;

    if (shouldBeIdle) {
      // ─── IDLE MODE: 100% Seamless Boomerang (Ping-Pong) Loop (Zero Cuts) ───
      if (!isIdleRef.current) {
        isIdleRef.current = true;
        idleCurrentTimeRef.current = IDLE_START;
        idleDirectionRef.current = 1;
      }

      // Smooth 0.75x organic speed for natural, gentle lifelike movement
      const IDLE_PLAYBACK_SPEED = 0.75;
      idleCurrentTimeRef.current += dt * IDLE_PLAYBACK_SPEED * idleDirectionRef.current;

      // Boomerang ping-pong bounce:
      // Forward: 7.4s (neutral) → 8.4s (peak tilt & smile)
      // Reverse: 8.4s (peak tilt & smile) → 7.4s (neutral)
      if (idleCurrentTimeRef.current >= IDLE_END) {
        idleCurrentTimeRef.current = IDLE_END;
        idleDirectionRef.current = -1; // Reverse backward smoothly
      } else if (idleCurrentTimeRef.current <= IDLE_START) {
        idleCurrentTimeRef.current = IDLE_START;
        idleDirectionRef.current = 1; // Play forward smoothly
      }

      if (!video.seeking) {
        video.currentTime = idleCurrentTimeRef.current;
      }
      requestAnimationFrame(step);
    } else {
      // ─── ACTIVE MODE: Constant-velocity monotonic cursor tracking ───
      isIdleRef.current = false;
      const target = targetTimeRef.current;
      const current = video.currentTime;

      // If video was playing in the idle range (> SCRUB_END), snap back to target
      if (current > SCRUB_END) {
        if (!video.seeking) {
          video.currentTime = target;
        }
        requestAnimationFrame(step);
        return;
      }

      const diff = target - current;

      // Constant maximum velocity: 3.5s timeline / second
      const SPEED = 3.5;
      const maxStep = SPEED * dt;

      if (Math.abs(diff) > 0.02) {
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
        requestAnimationFrame(step);
      }
    }
  }, [isTouchDevice]);

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
      const wasIdle = isIdleRef.current;
      lastActivityTimeRef.current = Date.now();
      isIdleRef.current = false;

      const normalizedX = e.clientX / window.innerWidth;
      const clampedX = Math.max(0, Math.min(1, normalizedX));

      const newTarget = SCRUB_START + clampedX * (SCRUB_END - SCRUB_START);
      targetTimeRef.current = newTarget;

      if (wasIdle && videoRef.current) {
        idleCurrentTimeRef.current = IDLE_START;
        idleDirectionRef.current = 1;
        videoRef.current.currentTime = newTarget;
      }

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
      {/* ─── Video with Interactive Scrubbing + 100% Seamless Boomerang Idle Loop ─── */}
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
