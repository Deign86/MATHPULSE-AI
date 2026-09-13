import React, { useEffect, useState, useRef } from 'react';
import { ChevronRight, Flame, Crown, Loader2, User, Target, ArrowRight, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { subscribeToLeaderboard } from '../services/gamificationService';
import type { LeaderboardEntry } from '../types/models';

interface RightSidebarProps {
  currentUserId: string;
  onOpenRewards: () => void;
  onOpenLeaderboard?: () => void;
  onNavigateToModules?: () => void;
  onNavigateToQuizBattle?: () => void;
  userLevel: number;
  userPhoto?: string;
  currentXP: number;
  overallXP?: number;
  xpToNextLevel: number;
  onLogout?: () => void;
  onOpenProfile?: () => void;
  userName?: string;
  userRole?: string;
  hasCompletedDiagnostic?: boolean | null;
  onOpenAssessment?: () => void;
}

const formatXP = (xp: number): string => {
  if (xp >= 1000) {
    const k = xp / 1000;
    return k >= 10 ? `${Math.round(k)}k` : `${k.toFixed(1)}k`;
  }
  return `${xp}`;
};

const PodiumAvatar: React.FC<{
  entry?: LeaderboardEntry;
  rank: number;
  isYou: boolean;
  userPhoto?: string;
  rankColor: { bg: string; border: string; badge: string; shadow: string };
}> = ({ entry, rank, isYou, userPhoto, rankColor }) => {
  // Prefer the live leaderboard photo (auto-updates via Firestore subscription),
  // fall back to userPhoto prop which carries the freshly uploaded PFP URL
  const photoSrc = isYou ? (entry?.photo || userPhoto) : entry?.photo;
  const name = isYou ? 'You' : (entry?.name || '---');
  const xp = entry?.xp || 0;

  return (
    <>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 + rank * 0.1 }}
        className="relative mb-2"
      >
        {rank === 1 && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
            <Crown size={22} className="text-amber-400 drop-shadow-md mb-1" fill="#fbbf24" strokeWidth={1.5} />
          </div>
        )}
        <div
          className={`w-10 h-10 rounded-full border-[3px] ${rank === 1 ? 'w-[52px] h-[52px]' : ''} ${rankColor.border} z-10 relative overflow-hidden ${rankColor.shadow} bg-white`}
        >
          {photoSrc ? (
            <img
              src={photoSrc}
              alt={name}
              className="w-full h-full object-cover"
              onError={(e) => {
                // SAFETY: trusted internal value already conforms to the asserted type.
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
              <User size={rank === 1 ? 22 : 16} className="text-slate-400" />
            </div>
          )}
        </div>
        <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 ${rankColor.badge} text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-20 shadow-sm`}>
          {rank}
        </div>
      </motion.div>
      <div className="mt-2 text-center">
        <span className={`block ${rank === 1 ? 'text-[13px] font-black' : 'text-[12px] font-bold'} text-[#0a1628] truncate max-w-[80px]`}>
          {name}
        </span>
        <span className={`block ${rank === 1 ? 'text-[11px]' : 'text-[10px]'} ${rankColor.badge.replace('bg-', 'text-').replace('-500', '-600').replace('-400', '-600').replace('amber', 'amber')} font-bold`}>
          {formatXP(xp)} XP
        </span>
      </div>
    </>
  );
};

const RightSidebar: React.FC<RightSidebarProps> = ({
  currentUserId,
  onOpenRewards,
  onOpenLeaderboard,
  onNavigateToModules,
  onNavigateToQuizBattle,
  userLevel,
  userPhoto,
  currentXP,
  xpToNextLevel,
  hasCompletedDiagnostic,
  onOpenAssessment,
}) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(true);
  const [lbError, setLbError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!currentUserId) {
      setLbLoading(false);
      return;
    }

    setLbLoading(true);
    setLbError(null);

    const unsubscribe = subscribeToLeaderboard(
      (entries) => {
        setLeaderboard(entries);
        setLbLoading(false);
        setLbError(null);
        // Clear the fallback timeout now that data has arrived
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      },
      currentUserId,
      false,
      'all',
      3,
    );

    unsubscribeRef.current = unsubscribe;

    // Fallback timeout — only fires if Firestore subscription silently fails
    // (e.g. permissions issue or collection doesn't exist). onSnapshot error
    // handler also calls callback([]) so this is a secondary safety net.
    timeoutRef.current = setTimeout(() => {
      setLbLoading(false);
      setLbError('Leaderboard data unavailable');
    }, 15000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [currentUserId]);

  const topThree = leaderboard.slice(0, 3);
  const userInTopThree = topThree.some((e) => e.userId === currentUserId);

  const podiumColors = [
    { bg: 'from-amber-100 to-amber-50', border: 'border-amber-400', badge: 'bg-amber-500', shadow: 'shadow-md' },
    { bg: 'from-slate-200 to-slate-100', border: 'border-sky-400', badge: 'bg-sky-500', shadow: 'shadow-sm' },
    { bg: 'from-orange-50 to-slate-50', border: 'border-orange-400', badge: 'bg-orange-500', shadow: 'shadow-sm' },
  ];

  const podiumHeights = ['74px', '54px', '38px'];
  const podiumWidths = ['w-[78px]', 'w-[70px]', 'w-[70px]'];

  const renderPodiumEntry = (
    entry: LeaderboardEntry | undefined,
    rankIndex: number,
    rankDisplay: number,
    label: string,
    colorIdx: number,
  ) => (
    <div className="flex flex-col items-center relative z-10">
      <PodiumAvatar
        entry={entry}
        rank={rankDisplay}
        isYou={label === 'You'}
        userPhoto={userPhoto}
        rankColor={podiumColors[colorIdx]}
      />
      <motion.div
        initial={{ height: 0 }}
        animate={{ height: podiumHeights[rankIndex] }}
        transition={{ delay: 0.2 + rankIndex * 0.1, duration: 0.5, ease: 'easeOut' }}
        className={`${podiumWidths[rankIndex]} bg-gradient-to-b ${podiumColors[colorIdx].bg} rounded-t-xl rounded-b-md border-t-2 border-white/20 flex items-center justify-center relative shadow-[inset_0_-4px_6px_rgba(0,0,0,0.05),0_4px_6px_rgba(0,0,0,0.05)]`}
      >
        <span className={`${colorIdx === 0 ? 'text-amber-400 text-3xl' : 'text-slate-400 text-2xl'} font-black opacity-40 translate-y-1`}>
          {rankDisplay}
        </span>
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/70 rounded-t-xl" />
      </motion.div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3 sm:gap-4">
      {/* Daily Goals Slab */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center justify-between gap-3 p-4 rounded-2xl md:rounded-3xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 text-white shadow-[0_8px_20px_-4px_rgba(16,185,129,0.3)] border border-emerald-400/40 relative overflow-hidden"
      >
        <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md border border-white/40 shadow-inner flex items-center justify-center shrink-0">
          <Target className="w-5 h-5 text-white stroke-[2.4] drop-shadow-sm" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs sm:text-sm font-display font-black text-white leading-none drop-shadow-sm">
              Daily Goals
            </h3>
            <span className="text-[10px] sm:text-[11px] font-bold text-white bg-black/20 backdrop-blur-md px-2 py-0.5 rounded-full tabular-nums border border-white/20">
              2 / 5 Lessons
            </span>
          </div>
          <p className="text-[10px] sm:text-xs text-white/90 mt-1.5 font-medium leading-snug truncate">
            {hasCompletedDiagnostic ? 'Maintain your daily practice pace' : 'Complete Initial Diagnostic'}
          </p>
          <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden mt-2 shadow-inner">
            <div className="h-full bg-white rounded-full w-[40%] shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!hasCompletedDiagnostic && hasCompletedDiagnostic !== null && onOpenAssessment) {
              onOpenAssessment();
            } else {
              onNavigateToModules?.();
            }
          }}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 font-bold border border-white shadow-md flex items-center justify-center transition-all shrink-0 active:translate-y-[1px] cursor-pointer"
          aria-label="View Daily Goals"
        >
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      </motion.div>

      {/* Balanced 2-Column Twin Slabs (Current XP & Streak) */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {/* Current XP Slab — Rewards & Achievements styling */}
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          onClick={onOpenRewards}
          className="flex items-center gap-2 2xl:gap-2.5 p-3 2xl:p-3.5 rounded-2xl relative overflow-hidden bg-gradient-to-br from-[#9956DE] via-[#7274ED] to-[#1FA7E1] border border-white/25 shadow-[0_8px_20px_-4px_rgba(114,116,237,0.35)] text-left hover:shadow-[0_12px_24px_-4px_rgba(114,116,237,0.45)] hover:-translate-y-0.5 transition-all active:scale-[0.98] cursor-pointer group"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(251,150,187,0.28),transparent_42%),radial-gradient(circle_at_85%_84%,rgba(31,167,225,0.24),transparent_40%)] pointer-events-none" />
          <div className="w-8 h-8 2xl:w-9 2xl:h-9 rounded-xl 2xl:rounded-2xl bg-white/20 backdrop-blur-md border border-white/40 shadow-inner flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform relative z-10">
            <Trophy className="w-4 h-4 text-white stroke-[2.2] drop-shadow-sm" />
          </div>
          <div className="min-w-0 flex-1 relative z-10">
            <span className="block text-[9.5px] 2xl:text-[10px] font-bold text-white/90 uppercase tracking-wide 2xl:tracking-wider leading-none drop-shadow-sm whitespace-nowrap">
              <span className="hidden 2xl:inline">CURRENT </span>XP
            </span>
            <span className="block text-base sm:text-lg font-display font-black text-white tabular-nums leading-tight mt-1 drop-shadow-sm">
              {currentXP}
            </span>
          </div>
        </motion.button>

        {/* Streak Slab */}
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          onClick={onOpenRewards}
          className="flex items-center gap-2 2xl:gap-2.5 p-3 2xl:p-3.5 rounded-2xl backdrop-blur-xl bg-gradient-to-br from-amber-50/80 via-orange-50/35 to-white dark:from-amber-950/25 dark:via-slate-900/70 dark:to-slate-900/70 border border-orange-200/70 dark:border-orange-800/40 shadow-sm hover:border-orange-300 hover:shadow-md transition-all active:scale-[0.98] text-left cursor-pointer group"
        >
          <div className="w-8 h-8 2xl:w-9 2xl:h-9 rounded-xl 2xl:rounded-2xl bg-gradient-to-b from-amber-400 to-orange-400 border-t border-white/50 shadow-[0_2.5px_0_rgba(234,88,12,0.4),0_4px_10px_rgba(251,146,60,0.22)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Flame className="w-4 h-4 text-white fill-white drop-shadow-sm" strokeWidth={1.8} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[9.5px] 2xl:text-[10px] font-bold text-orange-600/80 dark:text-orange-400 uppercase tracking-tight 2xl:tracking-wider leading-none whitespace-nowrap truncate">
              Streak
            </span>
            <span className="block text-base sm:text-lg font-display font-black text-slate-900 dark:text-white tabular-nums leading-tight mt-1">
              7 Days
            </span>
          </div>
        </motion.button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        onClick={onOpenLeaderboard}
        className="sm:col-span-2 xl:col-span-1 bg-white rounded-2xl md:rounded-3xl border border-slate-200/80 hover:shadow-md hover:border-amber-200/60 transition-all group overflow-hidden cursor-pointer"
      >
        <div className="p-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center border border-amber-200/60 transition-colors group-hover:bg-amber-100/50">
              <Crown size={14} className="text-amber-500" />
            </div>
            <h3 className="font-display font-bold text-sm text-[#0a1628]">Leaderboards</h3>
          </div>
          <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 group-hover:text-amber-500 transition-transform" />
        </div>

        <div className="pt-8 pb-3 px-2 bg-gradient-to-b from-slate-50/30 to-white flex items-end justify-center gap-1.5 min-h-[170px]">
          {lbLoading ? (
            <div className="flex flex-col items-center justify-center h-full py-8">
              <Loader2 className="w-5 h-5 animate-spin text-amber-400 mb-2" />
              <span className="text-xs text-slate-400">Loading rankings...</span>
            </div>
          ) : lbError || topThree.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8">
              <User className="w-8 h-8 text-slate-300 mb-2" />
              <span className="text-xs text-slate-400 text-center">
                {lbError || 'No rankings available yet'}
              </span>
            </div>
          ) : (
            <>
              {renderPodiumEntry(topThree[1], 1, 2, topThree[1]?.name || '---', 1)}
              {renderPodiumEntry(topThree[0], 0, 1, topThree[0]?.name || '---', 0)}
              {renderPodiumEntry(topThree[2], 2, 3, topThree[2]?.name || '---', 2)}
            </>
          )}
        </div>
      </motion.div>

    </div>
  );
};

export default RightSidebar;