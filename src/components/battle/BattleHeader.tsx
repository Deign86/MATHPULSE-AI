import React from 'react';
import { motion } from 'framer-motion';
import { Target, Volume2, VolumeX, Maximize, Minimize, Menu } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../ui/utils';

interface BattleHeaderProps {
  playerRoundStreak: number;
  playerVisualMultiplier: number;
  liveXpEarned: number;
  activeMatch: any;
  subjects: any[];
  battleSoundEnabled: boolean;
  onToggleSound: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isDesignPauseAvailable: boolean;
  onTogglePause: () => void;
}

export const BattleHeader: React.FC<BattleHeaderProps> = React.memo(({
  playerRoundStreak,
  playerVisualMultiplier,
  liveXpEarned,
  activeMatch,
  subjects,
  battleSoundEnabled,
  onToggleSound,
  isFullscreen,
  onToggleFullscreen,
  isDesignPauseAvailable,
  onTogglePause,
}) => {
  return (
    <header className="flex items-center justify-between shrink-0 h-16 relative">
      {/* Left: Simplified Stats */}
      <div className="flex items-center">
        <div className="flex items-center gap-3 md:gap-4 px-4 py-2 md:px-5 md:py-2.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold text-sm">
            <span className="text-base">🔥</span> {playerRoundStreak}
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-1.5 text-violet-300 font-bold text-sm">
            <Target className="w-4 h-4" /> {playerVisualMultiplier.toFixed(2)}x
          </div>
          <div className="w-px h-4 bg-white/10" />
          <motion.div
            key={liveXpEarned}
            animate={liveXpEarned > 0 ? { scale: [1, 1.25, 1] } : {}}
            transition={{ duration: 0.35 }}
            className="flex flex-col items-center text-emerald-400 bg-emerald-500/10 px-3 py-0.5 rounded-full border border-emerald-500/20 font-bold shadow-[0_0_10px_rgba(16,185,129,0.15)]"
          >
            <span className="text-sm leading-none">{liveXpEarned} pts</span>
            <span className="text-[8px] leading-none text-emerald-500/70 uppercase tracking-widest font-black">Battle Score</span>
          </motion.div>
        </div>
      </div>

      {/* Middle: Topic */}
      <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-3 bg-black/20 px-5 py-2 rounded-full border border-white/5">
        <div className="w-3.5 h-3.5 rounded-sm bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.5)] shrink-0" />
        <div className="flex flex-col items-start justify-center -space-y-0.5">
          {(() => {
            if (!activeMatch?.topicId) return <span className="font-bold text-white/90 tracking-wide text-sm">Practice Match</span>;
            for (const s of subjects) {
              const m = s.modules?.find((mod: any) => mod.id === activeMatch.topicId);
              if (m) {
                return (
                  <>
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest leading-none">{s.title}</span>
                    <span className="font-bold text-white/90 tracking-wide text-sm leading-none pt-1">{m.title}</span>
                  </>
                );
              }
            }
            return <span className="font-bold text-white/90 tracking-wide text-sm">{activeMatch.topicId.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</span>;
          })()}
        </div>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full border-white/20 bg-black/20 hover:bg-white/10 text-white"
          onClick={onToggleSound}
        >
          {battleSoundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full border-white/20 bg-black/20 hover:bg-white/10 text-white"
          onClick={onToggleFullscreen}
        >
          {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
        </Button>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "h-12 w-12 rounded-full border-white/20 text-white",
            isDesignPauseAvailable
              ? "bg-black/20 hover:bg-white/10"
              : "bg-black/10 opacity-50 cursor-not-allowed",
          )}
          onClick={onTogglePause}
          disabled={!isDesignPauseAvailable}
        >
           <Menu className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
});

BattleHeader.displayName = 'BattleHeader';
