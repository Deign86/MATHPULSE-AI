import { motion } from "motion/react";
import type React from "react";
import { type HTMLAttributes, useCallback, useMemo } from "react";
import { cn } from "./utils"; // using repo's existing utils path

export interface WarpBackgroundProps extends HTMLAttributes<HTMLDivElement> {
   children: React.ReactNode;
   perspective?: number;
   beamsPerSide?: number;
   beamSize?: number;
   beamDelayMax?: number;
   beamDelayMin?: number;
   beamDuration?: number;
   gridColor?: string;
}

const Beam = ({
   width,
   x,
   delay,
   duration,
}: {
   width: string | number;
   x: string | number;
   delay: number;
   duration: number;
}) => {
   // Use softer hues (blues, purples, cyans) to avoid harsh neon colors
   const hexColors = ["#9956DE", "#7274ED", "#1FA7E1", "#6ED1CF", "#75D06A", "#FFB356", "#FF8B8B", "#FB96BB"];
   const color = hexColors[Math.floor(Math.random() * hexColors.length)];
   const ar = Math.floor(Math.random() * 10) + 1;

   return (
      <motion.div
         style={
            {
               "--x": `${x}`,
               "--width": `${width}`,
               "--aspect-ratio": `${ar}`,
               // Brighter gamified effect against the dark background. appending 'cc' for 80% opacity.
               "--background": `linear-gradient(${color}cc, transparent)`,
            } as React.CSSProperties
         }
         className={`absolute left-[var(--x)] top-0 [aspect-ratio:1/var(--aspect-ratio)] [background:var(--background)] [width:var(--width)]`}
         initial={{ y: "100cqmax", x: "-50%" }}
         animate={{ y: "-100%", x: "-50%" }}
         transition={{
            duration,
            delay,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
         }}
      />
   );
};

export const WarpBackground: React.FC<WarpBackgroundProps> = ({
   children,
   perspective = 100,
   className,
   beamsPerSide = 6,
   beamSize = 4,
   beamDelayMax = 1.5,
   beamDelayMin = 0,
   beamDuration = 4, // Slightly faster for more frequent, engaging animation
   gridColor = "rgba(100, 116, 139, 0.08)", // Very light grid color
   ...props
}) => {
   const generateBeams = useCallback(() => {
      const beams = [];
      const cellsPerSide = Math.floor(100 / beamSize);
      const step = cellsPerSide / beamsPerSide;

      for (let i = 0; i < beamsPerSide; i++) {
         const x = Math.floor(i * step);
         // Pre-warm animation: add negative delay based on duration to start mid-flight
         const delay =
            Math.random() * (beamDelayMax - beamDelayMin) + beamDelayMin - (Math.random() * beamDuration);
         beams.push({ x, delay });
      }
      return beams;
   }, [beamsPerSide, beamSize, beamDelayMax, beamDelayMin, beamDuration]);

   const topBeams = useMemo(() => generateBeams(), [generateBeams]);
   const rightBeams = useMemo(() => generateBeams(), [generateBeams]);
   const bottomBeams = useMemo(() => generateBeams(), [generateBeams]);
   const leftBeams = useMemo(() => generateBeams(), [generateBeams]);

   return (
      <div className={cn("relative w-full h-full", className)} {...props}>
         <div
            style={
               {
                  "--perspective": `${perspective}px`,
                  "--grid-color": gridColor,
                  "--beam-size": `${beamSize}%`,
               } as React.CSSProperties
            }
            className={
               // Set the background container to absolutely fill the parent WarpBackground context
               "pointer-events-none absolute inset-0 overflow-hidden [clip-path:inset(0)] [container-type:size] [perspective:var(--perspective)] [transform-style:preserve-3d] -z-10 bg-[#42389d]"
            }
         >
            <div className="absolute [transform-style:preserve-3d] [background-size:var(--beam-size)_var(--beam-size)] [background:linear-gradient(var(--grid-color)_0_1px,_transparent_1px_var(--beam-size))_50%_-0.5px_/var(--beam-size)_var(--beam-size),linear-gradient(90deg,_var(--grid-color)_0_1px,_transparent_1px_var(--beam-size))_50%_50%_/var(--beam-size)_var(--beam-size)] [container-type:inline-size] [height:100cqmax] [transform-origin:50%_0%] [transform:rotateX(-90deg)] [width:100cqi]">
               {topBeams.map((beam, index) => (
                  <Beam
                     key={`top-${index}`}
                     width={`${beamSize}%`}
                     x={`${beam.x * beamSize}%`}
                     delay={beam.delay}
                     duration={beamDuration}
                  />
               ))}
            </div>
            <div className="absolute top-full [transform-style:preserve-3d] [background-size:var(--beam-size)_var(--beam-size)] [background:linear-gradient(var(--grid-color)_0_1px,_transparent_1px_var(--beam-size))_50%_-0.5px_/var(--beam-size)_var(--beam-size),linear-gradient(90deg,_var(--grid-color)_0_1px,_transparent_1px_var(--beam-size))_50%_50%_/var(--beam-size)_var(--beam-size)] [container-type:inline-size] [height:100cqmax] [transform-origin:50%_0%] [transform:rotateX(-90deg)] [width:100cqi]">
               {bottomBeams.map((beam, index) => (
                  <Beam
                     key={`bottom-${index}`}
                     width={`${beamSize}%`}
                     x={`${beam.x * beamSize}%`}
                     delay={beam.delay}
                     duration={beamDuration}
                  />
               ))}
            </div>
            <div className="absolute left-0 top-0 [transform-style:preserve-3d] [background-size:var(--beam-size)_var(--beam-size)] [background:linear-gradient(var(--grid-color)_0_1px,_transparent_1px_var(--beam-size))_50%_-0.5px_/var(--beam-size)_var(--beam-size),linear-gradient(90deg,_var(--grid-color)_0_1px,_transparent_1px_var(--beam-size))_50%_50%_/var(--beam-size)_var(--beam-size)] [container-type:inline-size] [height:100cqmax] [transform-origin:0%_0%] [transform:rotate(90deg)_rotateX(-90deg)] [width:100cqh]">
               {leftBeams.map((beam, index) => (
                  <Beam
                     key={`left-${index}`}
                     width={`${beamSize}%`}
                     x={`${beam.x * beamSize}%`}
                     delay={beam.delay}
                     duration={beamDuration}
                  />
               ))}
            </div>
            <div className="absolute right-0 top-0 [transform-style:preserve-3d] [background-size:var(--beam-size)_var(--beam-size)] [background:linear-gradient(var(--grid-color)_0_1px,_transparent_1px_var(--beam-size))_50%_-0.5px_/var(--beam-size)_var(--beam-size),linear-gradient(90deg,_var(--grid-color)_0_1px,_transparent_1px_var(--beam-size))_50%_50%_/var(--beam-size)_var(--beam-size)] [container-type:inline-size] [height:100cqmax] [width:100cqh] [transform-origin:100%_0%] [transform:rotate(-90deg)_rotateX(-90deg)]">
               {rightBeams.map((beam, index) => (
                  <Beam
                     key={`right-${index}`}
                     width={`${beamSize}%`}
                     x={`${beam.x * beamSize}%`}
                     delay={beam.delay}
                     duration={beamDuration}
                  />
               ))}
            </div>
         </div>
         <div className="relative z-10 w-full h-full">{children}</div>
      </div>
   );
};