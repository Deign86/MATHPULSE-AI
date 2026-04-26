import React, { useEffect, useState, useRef } from 'react';
import { ChevronRight, Trophy, Flame, Star, Crown, Loader2, User } from 'lucide-react';
import { motion } from 'motion/react';
import DailyChallengeWidget from './DailyChallengeWidget';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
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
  streak: number;
  streakHistory?: string[];
  onLogout?: () => void;
  onOpenProfile?: () => void;
  userName?: string;
  userRole?: string;
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
  const photoSrc = isYou ? (userPhoto || entry?.photo) : entry?.photo;
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
  streak,
  streakHistory = [],
}) => {
  const progressPercentage = (currentXP / xpToNextLevel) * 100;
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(true);
  const [lbError, setLbError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

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
      },
      currentUserId,
      false,
      'all',
      3,
    );

    unsubscribeRef.current = unsubscribe;

    const timeout = setTimeout(() => {
      if (setLbLoading) {
        setLbLoading(false);
        setLbError('Leaderboard data unavailable');
      }
    }, 12000);

    return () => {
      clearTimeout(timeout);
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
    <div className="space-y-2.5">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        onClick={onOpenRewards}
        className="rounded-2xl border border-[#9956DE]/25 cursor-pointer transition-all group relative overflow-hidden bg-gradient-to-br from-[#9956DE] via-[#7274ED] to-[#1FA7E1] hover:shadow-[0_16px_40px_rgba(114,116,237,0.28)] hover:-translate-y-0.5"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(251,150,187,0.32),transparent_42%),radial-gradient(circle_at_85%_84%,rgba(117,208,106,0.24),transparent_40%)]" />

        <div className="relative z-10 p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="shrink-0 w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center border border-white/35 backdrop-blur-sm">
                <Trophy size={14} className="text-white" />
              </div>
              <h3 className="font-display font-bold text-[13px] leading-tight text-white tracking-wide">Rewards & <br className="hidden 2xl:block" /> Achievements</h3>
            </div>
            <ChevronRight size={14} className="shrink-0 text-white/80 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
          </div>

          <div className="flex items-center justify-between gap-1 mb-3 bg-white/10 p-1.5 rounded-xl border border-white/20 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-xs font-body px-1 text-white">
              <Crown size={12} className="text-[#FFB356]" />
              <span className="font-bold">Lv {userLevel}</span>
            </div>
            <div className="w-px h-3 bg-white/35" />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onNavigateToModules?.();
                  }}
                  className="flex items-center gap-1.5 text-xs font-body px-1 text-white cursor-pointer transition-colors active:scale-95"
                >
                  <Star size={12} className="text-[#6ED1CF]" />
                  <span className="font-bold whitespace-nowrap">{currentXP} XP</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-slate-900 text-white border border-slate-700">
                Review more lessons to earn more XP!
              </TooltipContent>
            </Tooltip>
            <div className="w-px h-3 bg-white/35" />
            <div className="flex items-center gap-1.5 text-xs font-body px-1 text-white">
              <Flame size={12} className="text-[#FF8B8B]" />
              <span className="font-bold">{streak}d</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[11px] font-body text-white/90">Next: Level {userLevel + 1}</span>
              <span className="text-[11px] font-body font-semibold text-white">{Math.round(progressPercentage)}%</span>
            </div>
            <div className="h-2 bg-white/25 rounded-full overflow-hidden border border-white/20">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-[#6ED1CF] via-[#75D06A] to-[#FFB356] rounded-full"
              />
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <DailyChallengeWidget streakHistory={streakHistory} onNavigateToQuizBattle={onNavigateToQuizBattle} userPhoto={userPhoto} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        onClick={onOpenLeaderboard}
        className="bg-white rounded-xl border border-slate-200/80 hover:shadow-md hover:border-amber-200/60 transition-all group overflow-hidden cursor-pointer"
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