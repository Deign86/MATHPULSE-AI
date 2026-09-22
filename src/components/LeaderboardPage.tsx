import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { Trophy, Crown, Loader2, User, RefreshCw, Sparkles, Lock, Swords, BookOpen, Flame, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import StudentProfileModal from './StudentProfileModal';
import { useAuth } from '../contexts/AuthContext';
import { getLeaderboard } from '../services/gamificationService';
import { selectDisplayXP, sortByXpDesc } from '../utils/display';
import { StudentProfile } from '../types/models';
import { useFeatureAccess } from '../hooks/useFeatureAccess';

interface LeaderboardStudent {
  id: string;
  uid: string;
  name: string;
  avatar: string;
  level: number;
  totalXP: number;
  section: string;
  rank: {
    global: number;
    section: number;
    change: number;
  };
  stats: {
    quizzesCompleted: number;
    averageScore: number;
    modulesCompleted: number;
    studyHours: number;
  };
  isOnline: boolean;
  isYou?: boolean;
}

interface LeaderboardPageProps {
  currentUserPhoto?: string;
  onBack?: () => void;
  onNavigate?: (tab: string) => void;
}

type TimeFilter = 'daily' | 'weekly' | 'all';

// SAFETY: these literals are exactly the TimeFilter members rendered by the segmented control.
const TIME_FILTERS: TimeFilter[] = ['daily', 'weekly', 'all'];

const formatXP = (xp: number): string => {
  if (xp >= 1000) {
    const k = xp / 1000;
    return k >= 10 ? `${Math.round(k)}k` : `${k.toFixed(1)}k`;
  }
  return `${xp}`;
};

const getFirstName = (fullName: string | undefined): string => {
  if (!fullName) return '---';
  const parts = fullName.trim().split(/\s+/);
  return parts[0] || fullName;
};

const LeaderboardPage: React.FC<LeaderboardPageProps> = ({
  currentUserPhoto,
  onBack: _onBack,
  onNavigate,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const podiumRef = useRef<HTMLDivElement>(null);
  const firstPlaceRef = useRef<HTMLDivElement>(null);
  const [rayCenter, setRayCenter] = useState<{ x: number; y: number }>({ x: 300, y: 280 });

  const { currentUser, userProfile } = useAuth();
  // SAFETY: trusted internal value already conforms to the asserted type.
  const studentProfile = userProfile as StudentProfile;
  const { leaderboard: leaderboardAccess, loading: featureAccessLoading } = useFeatureAccess(currentUser?.uid || null);
  const [activeView] = useState<'school' | 'section'>('section');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('weekly');
  const [selectedStudent, setSelectedStudent] = useState<LeaderboardStudent | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [students, setStudents] = useState<LeaderboardStudent[]>([]);
  const [showStickyPills, setShowStickyPills] = useState(false);

  const myClassSection = [studentProfile?.grade, studentProfile?.section].filter(Boolean).join(' - ');

  // Compute pixel-perfect center coordinates of 1st place avatar relative to page background
  const updateRayCenter = useCallback(() => {
    if (!firstPlaceRef.current || !rootRef.current) return;
    const firstRect = firstPlaceRef.current.getBoundingClientRect();
    const rootRect = rootRef.current.getBoundingClientRect();
    const cx = firstRect.left + firstRect.width / 2 - rootRect.left;
    const cy = firstRect.top + 50 - rootRect.top;
    setRayCenter({ x: cx, y: cy });
  }, []);

  useLayoutEffect(() => {
    updateRayCenter();
  }, [updateRayCenter, students]);

  useEffect(() => {
    window.addEventListener('resize', updateRayCenter);
    return () => window.removeEventListener('resize', updateRayCenter);
  }, [updateRayCenter]);

  // Reversible scroll listener: shows sticky pills when podium scrolls up, hides immediately when scrolling back down
  useEffect(() => {
    const scrollParent = rootRef.current?.closest('main') || window;
    const checkVisibility = () => {
      if (!podiumRef.current) return;
      const rect = podiumRef.current.getBoundingClientRect();
      // Show sticky pills only when the podium has scrolled up past the top header
      // Disappears automatically as soon as the user scrolls back up and the podium re-enters
      setShowStickyPills(rect.bottom < 80);
    };

    scrollParent.addEventListener('scroll', checkVisibility, { passive: true });
    window.addEventListener('scroll', checkVisibility, { passive: true });
    checkVisibility();

    return () => {
      scrollParent.removeEventListener('scroll', checkVisibility);
      window.removeEventListener('scroll', checkVisibility);
    };
  }, [students]);

  // Load leaderboard data from Firebase
  const loadLeaderboard = useCallback(async () => {
    if (!currentUser) {
      setLeaderboardLoading(false);
      return;
    }
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    try {
      const mappedFilter: 'all' | 'week' = timeFilter === 'all' ? 'all' : 'week';
      const entries = await getLeaderboard(currentUser.uid, false, mappedFilter, 25);

      if (!entries || entries.length === 0) {
        setStudents([]);
        return;
      }

      const leaderboardData: LeaderboardStudent[] = entries.map((entry) => ({
        id: entry.userId,
        uid: entry.userId,
        name: entry.name,
        avatar:
          entry.userId === currentUser.uid
            ? (currentUserPhoto || entry.photo || '')
            : (entry.photo || ''),
        level: entry.level,
        totalXP:
          entry.userId === currentUser.uid
            ? selectDisplayXP(studentProfile?.totalXP, studentProfile?.currentXP)
            : entry.xp,
        section: myClassSection || 'Grade 11 - STEM A',
        rank: {
          global: entry.rank,
          section: entry.rank,
          change: 0,
        },
        stats: { quizzesCompleted: 0, averageScore: 0, modulesCompleted: 0, studyHours: 0 },
        isOnline: false,
        isYou: entry.userId === currentUser.uid,
      }));
      setStudents(leaderboardData);
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      setLeaderboardError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLeaderboardLoading(false);
    }
  }, [currentUser, myClassSection, timeFilter, currentUserPhoto]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const getFilteredStudents = () => {
    let filtered = students;
    if (activeView === 'section') {
      const mySection = myClassSection || '';
      if (mySection) {
        filtered = filtered.filter((s) => s.section === mySection);
      }
    }

    // Strict score-descending order (issue #158): sort by XP, never by stale
    // rank labels, and never sort the state array in place.
    return sortByXpDesc(filtered);
  };

  const filteredStudents = getFilteredStudents();

  const youStudent = filteredStudents.find((s) => s.isYou);
  const yourRank = youStudent?.rank.section || (filteredStudents.length + 1);

  // Identify direct rival directly above user in rank (Rival Watch)
  const youIndex = filteredStudents.findIndex((s) => s.isYou);
  const rivalStudent = youIndex > 0 ? filteredStudents[youIndex - 1] : null;
  const rivalXpGap = rivalStudent && youStudent ? Math.max(0, rivalStudent.totalXP - youStudent.totalXP) : 0;

  const topThree = filteredStudents.slice(0, 3);
  const restOfList = filteredStudents.slice(3);

  const handleNavigateTab = (tab: string) => {
    if (onNavigate) {
      onNavigate(tab);
    }
  };

  const renderAvatar = (avatar: string | undefined, size: number) => {
    if (!avatar) return <User size={size} className="text-slate-400 opacity-70" />;
    if (avatar.startsWith('http') || avatar.startsWith('data:')) {
      return <img src={avatar} alt="Avatar" className="w-full h-full object-cover rounded-full" />;
    }
    return <User size={size} className="text-slate-400 opacity-70" />;
  };

  if (leaderboardLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-[450px] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        <p className="text-sm text-slate-500 font-medium">Loading leaderboard...</p>
      </div>
    );
  }

  if (leaderboardError) {
    return (
      <div className="flex flex-col justify-center items-center h-[450px] gap-4">
        <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center">
          <Trophy className="w-7 h-7 text-rose-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-700 mb-1">Couldn't load leaderboard</p>
          <p className="text-xs text-slate-400">{leaderboardError}</p>
        </div>
        <button
          onClick={loadLeaderboard}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-colors cursor-pointer"
        >
          <RefreshCw size={14} />
          Try Again
        </button>
      </div>
    );
  }

  if (featureAccessLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-[450px] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        <p className="text-sm text-slate-500 font-medium">Loading...</p>
      </div>
    );
  }

  if (!leaderboardAccess) {
    return (
      <div className="flex flex-col justify-center items-center h-[450px] gap-4">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
          <Lock className="w-7 h-7 text-slate-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-700 mb-1">Leaderboard Locked</p>
          <p className="text-xs text-slate-400">This feature is temporarily unavailable while you focus on your learning.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="w-full relative min-h-full lg:h-full lg:overflow-hidden flex flex-col font-body text-slate-900 overflow-x-hidden"
    >
      {/* ========================================================================= */}
      {/* 1. ROOT BACKGROUND LAYER: SUNBURST RAYS CENTERED ON 1ST PLACE CHAMPION    */}
      {/* (Spans full width/height, behind all content, never cut off on sides)     */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none -z-20 w-full h-full overflow-hidden bg-gradient-to-br from-[#8545e8] via-[#a365f5] to-[#cf6ea7] dark:from-[#1b0d33] dark:via-[#2a1152] dark:to-[#220d3d]">
        {/* Continuous Rotating Conic Rays with Origin Exactly Centered on 1st Place */}
        <div
          className="absolute pointer-events-none -z-10 w-[320vw] h-[320vw] max-w-none origin-center"
          style={{
            left: `${rayCenter.x}px`,
            top: `${rayCenter.y}px`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <motion.div
            className="w-full h-full origin-center opacity-[0.22]"
            style={{
              background: `repeating-conic-gradient(from 0deg at 50% 50%, 
                 rgba(255,255,255,0.9) 0deg, rgba(255,255,255,0.9) 7deg, 
                 transparent 7deg, transparent 18deg)`,
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 240, repeat: Infinity, ease: 'linear' }}
          />
        </div>

        {/* Ambient warm radial glow centered on 1st Place */}
        <div
          className="absolute pointer-events-none w-[600px] h-[450px] bg-yellow-300/30 rounded-full blur-[110px]"
          style={{
            left: `${rayCenter.x}px`,
            top: `${rayCenter.y}px`,
            transform: 'translate(-50%, -50%)',
          }}
        />
        <div className="absolute bottom-10 left-1/4 w-[480px] h-[320px] bg-white/15 rounded-full blur-[95px]" />
      </div>

      {/* ========================================================================= */}
      {/* 2. TABLET & MOBILE STICKY PLACEMENT PILLS (CONNECTS SEAMLESSLY TO HEADER) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showStickyPills && (
          <motion.div
            key="sticky-placement-header"
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed top-[50px] sm:top-[58px] inset-x-0 z-30 lg:hidden w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-purple-200/80 dark:border-slate-800 shadow-md py-2 px-3 flex items-center justify-center gap-1.5 sm:gap-3 pointer-events-auto"
          >
            {/* Pill 2: 2nd Place Silver */}
            {topThree[1] && (
              <button
                type="button"
                onClick={() => setSelectedStudent(topThree[1])}
                className="flex-1 min-w-0 max-w-[125px] sm:max-w-[155px] flex items-center gap-1.5 p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-300/80 shadow-xs hover:border-slate-400 active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center text-[10px] font-black shrink-0">
                  2
                </div>
                <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-300 shrink-0">
                  {renderAvatar(topThree[1].avatar, 14)}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-[10px] sm:text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate leading-tight">
                    {getFirstName(topThree[1].name)}
                  </p>
                  <p className="text-[9px] text-slate-500 tabular-nums leading-tight">
                    {formatXP(topThree[1].totalXP)}
                  </p>
                </div>
              </button>
            )}

            {/* Pill 1: 1st Place Gold */}
            {topThree[0] && (
              <button
                type="button"
                onClick={() => setSelectedStudent(topThree[0])}
                className="flex-1 min-w-0 max-w-[140px] sm:max-w-[175px] flex items-center gap-1.5 p-1.5 rounded-full bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-950/60 dark:to-yellow-950/60 border-2 border-amber-400 shadow-sm hover:border-amber-500 active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="w-5 h-5 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center text-[10px] font-black shrink-0">
                  👑
                </div>
                <div className="w-6 h-6 rounded-full overflow-hidden border border-amber-400 shrink-0">
                  {renderAvatar(topThree[0].avatar, 14)}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-[10px] sm:text-[11px] font-black text-amber-950 dark:text-amber-200 truncate leading-tight">
                    {getFirstName(topThree[0].name)}
                  </p>
                  <p className="text-[9px] font-bold text-amber-800 dark:text-amber-300 tabular-nums leading-tight">
                    {formatXP(topThree[0].totalXP)} XP
                  </p>
                </div>
              </button>
            )}

            {/* Pill 3: 3rd Place Bronze */}
            {topThree[2] && (
              <button
                type="button"
                onClick={() => setSelectedStudent(topThree[2])}
                className="flex-1 min-w-0 max-w-[125px] sm:max-w-[155px] flex items-center gap-1.5 p-1.5 rounded-full bg-orange-50 dark:bg-slate-800 border border-amber-300/80 shadow-xs hover:border-amber-400 active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                  3
                </div>
                <div className="w-6 h-6 rounded-full overflow-hidden border border-amber-400 shrink-0">
                  {renderAvatar(topThree[2].avatar, 14)}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-[10px] sm:text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate leading-tight">
                    {getFirstName(topThree[2].name)}
                  </p>
                  <p className="text-[9px] text-slate-500 tabular-nums leading-tight">
                    {formatXP(topThree[2].totalXP)}
                  </p>
                </div>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 3. MAIN LAYOUT (DESKTOP: SPLIT VIEW, TABLET/MOBILE: VERTICAL FLOW)        */}
      {/* ========================================================================= */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 lg:pt-6 pb-4 flex-1 lg:h-full lg:overflow-hidden flex flex-col lg:flex-row lg:items-stretch lg:gap-8 relative z-10">
        
        {/* ======================================================================= */}
        {/* LEFT COLUMN (DESKTOP): HIGHLIGHTING TOP 1, 2, 3 PODIUMS ONLY            */}
        {/* (Nothing follows below it on desktop! Whole page does not scroll)       */}
        {/* ======================================================================= */}
        <div className="flex-1 flex flex-col items-center justify-between min-h-0 lg:py-1 relative">
          
          {/* Centered Header Stack (Badge -> Leaderboard -> Filters) */}
          <div className="w-full flex flex-col items-center text-center mb-1">
            {/* 1. Hall of Champions Badge */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/45 backdrop-blur-md border border-white/70 shadow-xs text-purple-900 text-[11px] font-black uppercase tracking-wider mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400 animate-pulse" />
              <span>Hall of Champions</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            </div>

            {/* 2. Leaderboard Title (Centered) */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black tracking-tight text-white drop-shadow-[0_3px_12px_rgba(40,10,80,0.5)] mb-2">
              Leaderboard
            </h1>

            {/* 3. Daily / Weekly / All Time Capsule Pill (Centered below title) */}
            <div className="bg-white/50 backdrop-blur-xl rounded-full p-1 flex gap-1 shadow-sm border border-white/70">
              {TIME_FILTERS.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTimeFilter(mode)}
                  aria-label={`Show ${mode === 'all' ? 'All Time' : mode} leaderboard`}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all capitalize inline-flex justify-center items-center cursor-pointer ${
                    timeFilter === mode
                      ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-md'
                      : 'text-purple-950/80 hover:text-purple-950 hover:bg-white/30'
                  }`}
                >
                  {mode === 'all' ? 'All Time' : mode}
                </button>
              ))}
            </div>
          </div>

          {/* ======================================================================= */}
          {/* 3D CYLINDRICAL PODIUMS WITH PROFILE PICTURES FRAMED INSIDE 3D MEDALS    */}
          {/* ======================================================================= */}
          <div
            ref={podiumRef}
            className="w-full max-w-[620px] flex items-end justify-center gap-3 sm:gap-6 my-auto pt-6 pb-2 relative"
          >
            {/* --------------------------------------------------------------------- */}
            {/* 2ND PLACE (LEFT - SILVER MEDALLION AVATAR + SILVER CYLINDER)           */}
            {/* --------------------------------------------------------------------- */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 90 }}
              className="flex flex-col items-center relative z-10 w-[30%] max-w-[180px]"
            >
              {/* Profile Picture Framed INSIDE 3D Silver Medal */}
              <div
                onClick={() => topThree[1] && setSelectedStudent(topThree[1])}
                className="flex flex-col items-center mb-1 relative z-30 w-full cursor-pointer group"
              >
                {/* 3D Silver Medallion Framing the Avatar */}
                <div className="relative flex flex-col items-center">
                  <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-full p-1 bg-gradient-to-br from-white via-slate-200 to-slate-400 border-[3.5px] border-white shadow-[0_8px_24px_rgba(148,163,184,0.7),inset_0_2px_4px_rgba(255,255,255,0.9)] flex items-center justify-center relative group-hover:scale-105 transition-transform">
                    <div className="w-full h-full rounded-full overflow-hidden bg-slate-800 border-2 border-slate-300">
                      {renderAvatar(topThree[1]?.avatar, 30)}
                    </div>

                    {/* Medal Seal #2 at bottom of coin */}
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-gradient-to-b from-slate-100 to-slate-300 border-2 border-white shadow-md flex items-center justify-center font-black text-[11px] text-slate-800">
                      2
                    </div>
                  </div>

                  {/* Hanging Silver Ribbon Tails */}
                  <div className="flex gap-1 -mt-0.5 z-[-1] pointer-events-none">
                    <div className="w-2.5 h-3.5 bg-gradient-to-b from-slate-400 to-slate-600 rounded-b-xs rotate-12 shadow-sm" />
                    <div className="w-2.5 h-3.5 bg-gradient-to-b from-slate-400 to-slate-600 rounded-b-xs -rotate-12 shadow-sm" />
                  </div>
                </div>

                {/* Name */}
                <h3 className="font-display font-black text-white text-xs sm:text-sm drop-shadow-[0_2px_4px_rgba(20,10,40,0.7)] text-center mt-2 max-w-[120px] truncate">
                  {topThree[1]?.name || '---'}
                </h3>
              </div>

              {/* Score Pill */}
              <div className="px-2.5 py-0.5 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/60 text-white font-bold text-[11px] shadow-sm uppercase tracking-wider relative z-30 mb-2">
                <span className="tabular-nums font-black">{formatXP(topThree[1]?.totalXP || 0)} XP</span>
              </div>

              {/* Clean 3D Silver Cylindrical Pedestal */}
              <div className="w-full relative flex flex-col items-center">
                <div className="w-full h-8 sm:h-9 rounded-[50%] bg-gradient-to-b from-white via-slate-100 to-slate-300 border-2 border-white shadow-[inset_0_2px_5px_rgba(255,255,255,0.95),0_3px_8px_rgba(71,85,105,0.3)] relative z-20 flex items-center justify-center">
                  <div className="w-[82%] h-[58%] rounded-[50%] border border-white/70 bg-white/40" />
                </div>

                <div className="w-full h-[110px] sm:h-[135px] -mt-4 rounded-b-[24px] sm:rounded-b-[30px] bg-gradient-to-r from-slate-400 via-slate-100 via-slate-200 to-slate-400 relative shadow-[0_16px_32px_rgba(0,0,0,0.25)] flex flex-col items-center justify-end pb-3 overflow-hidden border-b-2 border-slate-300">
                  <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1/3 bg-white/40 blur-[2px] pointer-events-none" />
                  <span className="text-white font-black text-5xl sm:text-6xl select-none tabular-nums drop-shadow-[0_2px_10px_rgba(100,116,139,0.5)] relative z-10 leading-none">
                    2
                  </span>
                </div>

                <div className="w-[88%] h-3 rounded-[50%] bg-black/20 blur-xs -mt-1.5 relative z-0" />
              </div>
            </motion.div>

            {/* --------------------------------------------------------------------- */}
            {/* 1ST PLACE (CENTER - GOLD MEDALLION AVATAR + FIRST PLACE REF)           */}
            {/* --------------------------------------------------------------------- */}
            <motion.div
              ref={firstPlaceRef}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, type: 'spring', stiffness: 100 }}
              className="flex flex-col items-center relative z-20 w-[38%] max-w-[220px]"
            >
              {/* Profile Picture Framed INSIDE 3D Gold Medal */}
              <div
                onClick={() => topThree[0] && setSelectedStudent(topThree[0])}
                className="flex flex-col items-center mb-1 relative z-30 w-full cursor-pointer group"
              >
                {/* Floating 3D Gold Crown */}
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                  className="mb-[-14px] z-40"
                >
                  <Crown size={38} className="text-yellow-300 fill-yellow-400 drop-shadow-[0_0_18px_rgba(250,204,21,1)]" />
                </motion.div>

                {/* 3D Gold Medallion Framing the Avatar */}
                <div className="relative flex flex-col items-center">
                  <div className="w-22 h-22 sm:w-26 sm:h-26 rounded-full p-1 bg-gradient-to-br from-yellow-200 via-amber-400 to-yellow-600 border-4 border-yellow-200 shadow-[0_10px_32px_rgba(245,158,11,0.85),inset_0_2px_6px_rgba(255,255,255,0.95)] flex items-center justify-center relative group-hover:scale-105 transition-transform">
                    <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 border-2 border-yellow-300">
                      {renderAvatar(topThree[0]?.avatar, 36)}
                    </div>

                    {/* Medal Seal #1 at bottom of coin */}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-gradient-to-b from-yellow-300 via-amber-400 to-yellow-500 border-2 border-white shadow-lg flex items-center justify-center font-black text-xs text-amber-950">
                      1
                    </div>
                  </div>

                  {/* Hanging Gold Ribbon Tails */}
                  <div className="flex gap-1.5 -mt-1 z-[-1] pointer-events-none">
                    <div className="w-3 h-4.5 bg-gradient-to-b from-amber-500 to-amber-700 rounded-b-xs rotate-12 shadow-sm" />
                    <div className="w-3 h-4.5 bg-gradient-to-b from-amber-500 to-amber-700 rounded-b-xs -rotate-12 shadow-sm" />
                  </div>
                </div>

                {/* Name */}
                <h3 className="font-display font-black text-white text-sm sm:text-base drop-shadow-[0_2px_4px_rgba(20,10,40,0.7)] text-center mt-2.5 max-w-[140px] truncate">
                  {topThree[0]?.name || '---'}
                </h3>
              </div>

              {/* Golden Score Ribbon Badge */}
              <div className="px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-amber-950 font-black text-xs sm:text-[13px] shadow-md border border-yellow-100 flex items-center gap-1.5 uppercase tracking-wider relative z-30 mb-2">
                <span className="text-[10px] text-amber-900/80">SCORE</span>
                <span className="tabular-nums font-black">{formatXP(topThree[0]?.totalXP || 0)} XP</span>
              </div>

              {/* Clean 3D Gold Cylindrical Pedestal */}
              <div className="w-full relative flex flex-col items-center">
                <div className="w-full h-9 sm:h-10 rounded-[50%] bg-gradient-to-b from-yellow-100 via-amber-200 to-yellow-400 border-2 border-yellow-100 shadow-[inset_0_2px_6px_rgba(255,255,255,0.95),0_3px_10px_rgba(180,83,9,0.35)] relative z-20 flex items-center justify-center">
                  <div className="w-[84%] h-[60%] rounded-[50%] border border-yellow-100/70 bg-white/40" />
                </div>

                <div className="w-full h-[150px] sm:h-[185px] -mt-4.5 rounded-b-[28px] sm:rounded-b-[36px] bg-gradient-to-r from-amber-500 via-yellow-200 via-amber-300 to-amber-600 relative shadow-[0_20px_40px_rgba(0,0,0,0.3)] flex flex-col items-center justify-end pb-4 overflow-hidden border-b-2 border-amber-400">
                  <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1/3 bg-white/45 blur-[3px] pointer-events-none" />
                  <span className="text-white font-black text-6xl sm:text-7xl select-none tabular-nums drop-shadow-[0_2px_12px_rgba(245,158,11,0.6)] relative z-10 leading-none">
                    1
                  </span>
                </div>

                <div className="w-[88%] h-3.5 rounded-[50%] bg-black/25 blur-xs -mt-1.5 relative z-0" />
              </div>
            </motion.div>

            {/* --------------------------------------------------------------------- */}
            {/* 3RD PLACE (RIGHT - BRONZE MEDALLION AVATAR + BRONZE CYLINDER)          */}
            {/* --------------------------------------------------------------------- */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 90 }}
              className="flex flex-col items-center relative z-10 w-[30%] max-w-[180px]"
            >
              {/* Profile Picture Framed INSIDE 3D Bronze Medal */}
              <div
                onClick={() => topThree[2] && setSelectedStudent(topThree[2])}
                className="flex flex-col items-center mb-1 relative z-30 w-full cursor-pointer group"
              >
                {/* 3D Bronze Medallion Framing the Avatar */}
                <div className="relative flex flex-col items-center">
                  <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-full p-1 bg-gradient-to-br from-amber-200 via-orange-500 to-amber-800 border-[3.5px] border-orange-200 shadow-[0_8px_24px_rgba(180,83,9,0.7),inset_0_2px_4px_rgba(255,255,255,0.9)] flex items-center justify-center relative group-hover:scale-105 transition-transform">
                    <div className="w-full h-full rounded-full overflow-hidden bg-slate-800 border-2 border-amber-600">
                      {renderAvatar(topThree[2]?.avatar, 30)}
                    </div>

                    {/* Medal Seal #3 at bottom of coin */}
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-gradient-to-b from-amber-500 to-amber-700 border-2 border-orange-100 shadow-md flex items-center justify-center font-black text-[11px] text-white">
                      3
                    </div>
                  </div>

                  {/* Hanging Bronze Ribbon Tails */}
                  <div className="flex gap-1 -mt-0.5 z-[-1] pointer-events-none">
                    <div className="w-2.5 h-3.5 bg-gradient-to-b from-amber-700 to-amber-900 rounded-b-xs rotate-12 shadow-sm" />
                    <div className="w-2.5 h-3.5 bg-gradient-to-b from-amber-700 to-amber-900 rounded-b-xs -rotate-12 shadow-sm" />
                  </div>
                </div>

                {/* Name */}
                <h3 className="font-display font-black text-white text-xs sm:text-sm drop-shadow-[0_2px_4px_rgba(20,10,40,0.7)] text-center mt-2 max-w-[120px] truncate">
                  {topThree[2]?.name || '---'}
                </h3>
              </div>

              {/* Score Pill */}
              <div className="px-2.5 py-0.5 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/60 text-white font-bold text-[11px] shadow-sm uppercase tracking-wider relative z-30 mb-2">
                <span className="tabular-nums font-black">{formatXP(topThree[2]?.totalXP || 0)} XP</span>
              </div>

              {/* Clean 3D Bronze Cylindrical Pedestal */}
              <div className="w-full relative flex flex-col items-center">
                <div className="w-full h-8 sm:h-9 rounded-[50%] bg-gradient-to-b from-orange-100 via-amber-300 to-amber-600 border-2 border-orange-200 shadow-[inset_0_2px_5px_rgba(255,255,255,0.95),0_3px_8px_rgba(180,83,9,0.35)] relative z-20 flex items-center justify-center">
                  <div className="w-[82%] h-[58%] rounded-[50%] border border-orange-100/70 bg-white/40" />
                </div>

                <div className="w-full h-[90px] sm:h-[110px] -mt-4 rounded-b-[24px] sm:rounded-b-[30px] bg-gradient-to-r from-amber-700 via-amber-300 via-orange-300 to-amber-800 relative shadow-[0_16px_32px_rgba(0,0,0,0.25)] flex flex-col items-center justify-end pb-3 overflow-hidden border-b-2 border-amber-600">
                  <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1/3 bg-white/40 blur-[2px] pointer-events-none" />
                  <span className="text-white font-black text-5xl sm:text-6xl select-none tabular-nums drop-shadow-[0_2px_10px_rgba(180,83,9,0.5)] relative z-10 leading-none">
                    3
                  </span>
                </div>

                <div className="w-[88%] h-3 rounded-[50%] bg-black/20 blur-xs -mt-1.5 relative z-0" />
              </div>
            </motion.div>
          </div>

          {/* Bottom Motivator Bar on Desktop */}
          <div className="w-full max-w-[540px] bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl p-2.5 px-4 border border-white/70 dark:border-slate-800 flex items-center justify-between gap-3 text-slate-900 dark:text-white shadow-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-7 h-7 rounded-xl bg-purple-600 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                #{yourRank}
              </span>
              <p className="text-xs font-bold truncate">
                {rivalStudent
                  ? `Only ${rivalXpGap} XP needed to overtake ${rivalStudent.name}!`
                  : 'You hold the #1 rank! Keep mastering drills!'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleNavigateTab('Quiz Battle')}
              className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
            >
              <Zap size={12} className="text-yellow-300 fill-yellow-300" />
              <span>Battle</span>
            </button>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* RIGHT COLUMN: FIXED-HEIGHT CARD CONTAINER (ONLY INNER LIST SCROLLS)     */}
        {/* - Desktop: Locked to viewport height, only the students list scrolls    */}
        {/* - Mobile: Fixed card height (h-[calc(100dvh-140px)]), no endless scroll */}
        {/* ======================================================================= */}
        <div className="w-full lg:w-[390px] xl:w-[430px] shrink-0 mt-6 lg:mt-0 flex flex-col h-[calc(100dvh-140px)] sm:h-[calc(100dvh-150px)] lg:h-full min-h-0">
          <div className="w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl p-4 sm:p-5 border border-white/80 dark:border-slate-800 shadow-[0_18px_45px_rgba(0,0,0,0.12)] flex flex-col h-full min-h-0 relative overflow-hidden">
            {/* Elegant Accent Gradient Border Line */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-amber-400" />

            {/* Panel Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-xs">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-black text-slate-900 dark:text-white text-base leading-snug">
                    Class Standings
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    {myClassSection || 'Senior High STEM'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span>{restOfList.length} Learners</span>
              </div>
            </div>

            {/* Scrollable Rankings List (ONLY this inner list scrolls vertically with visible scrollbar!) */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-2 pt-3 [scrollbar-width:thin] [scrollbar-color:#c084fc_#f1f5f9] dark:[scrollbar-color:#9333ea_#1e293b] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-100 dark:[&::-webkit-scrollbar-track]:bg-slate-800/60 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-purple-300 dark:[&::-webkit-scrollbar-thumb]:bg-purple-600 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-purple-400">
              {restOfList.map((student, index) => {
                const actualRank = student.rank.global || index + 4;
                const isTopTen = actualRank <= 10;

                return (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.03, 0.25) }}
                    onClick={() => setSelectedStudent(student)}
                    className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer border transition-all duration-200 group ${
                      student.isYou
                        ? 'border-purple-500 bg-gradient-to-r from-purple-50/90 to-fuchsia-50/80 dark:from-purple-950/50 dark:to-fuchsia-950/40 shadow-md shadow-purple-500/10 ring-2 ring-purple-400/20'
                        : 'bg-white/80 dark:bg-slate-800/80 border-slate-100 dark:border-slate-700/80 shadow-xs hover:shadow-md hover:bg-white dark:hover:bg-slate-800 hover:border-purple-200 dark:hover:border-purple-800'
                    }`}
                  >
                    {/* Rank Badge */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-display font-black text-xs tabular-nums shrink-0 shadow-xs ${
                        isTopTen
                          ? 'bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/60 dark:to-indigo-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700/60'
                          : 'bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {actualRank}
                    </div>

                    {/* Avatar with Status Ring */}
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center overflow-hidden shrink-0 border-2 border-slate-200 dark:border-slate-600 group-hover:border-purple-300 transition-colors">
                      {renderAvatar(student.avatar, 22)}
                    </div>

                    {/* Student Info */}
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-display font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate">
                          {student.name}
                        </h4>
                        {student.isYou && (
                          <span className="text-[8px] uppercase tracking-wider bg-purple-600 text-white px-1.5 py-0.5 rounded-full font-black shrink-0 shadow-xs">
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          Lv {student.level}
                        </span>
                        <span className="text-[9px] text-slate-300 dark:text-slate-600">•</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {student.section}
                        </span>
                      </div>
                    </div>

                    {/* XP Score Badge */}
                    <div className="text-right shrink-0 flex flex-col items-end">
                      <div className="px-2 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-900/40 flex items-center gap-1">
                        <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <p className="text-xs font-display font-black text-purple-950 dark:text-purple-200 tabular-nums">
                          {formatXP(student.totalXP)}
                          <span className="text-[9px] text-purple-600 dark:text-purple-400 font-bold ml-0.5">
                            XP
                          </span>
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {restOfList.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-slate-400 text-xs font-medium">No other participants found.</p>
                </div>
              )}
            </div>

            {/* Quick Action Footer inside Right Card */}
            <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleNavigateTab('Quiz Battle')}
                className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Swords size={13} />
                <span>Quiz Battle</span>
              </button>
              <button
                type="button"
                onClick={() => handleNavigateTab('Modules')}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <BookOpen size={13} />
                <span>Modules</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Student Profile Modal */}
      <StudentProfileModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />
    </div>
  );
};

export default LeaderboardPage;