import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, useReducedMotion } from 'motion/react';
import quizBattleAvatar from '../assets/quiz_battle_avatar.png';
import { motion } from 'motion/react';
import {
  Check,
  Bot,
  ChevronRight,
  Clock3,
  Copy,
  Crown,
  History,
  Loader2,
  Maximize,
  Menu,
  Minimize,
  Pause,
  Play,
  ShieldCheck,
  Sparkles,
  Swords,
  Target,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  Star,
  Flag,
  Flame,
  Shield,
  Zap,
  Award,
  Medal,
  BookOpen,
  Compass,
  CheckCircle2,
  XCircle,
  TrendingUp,
  RotateCcw,
  Crosshair,
  Activity,
} from 'lucide-react';
import { WarpBackground } from './ui/warp-background';
import { memberOf } from '../utils/memberOf';
import CompositeAvatar from './CompositeAvatar';
import { useAuth } from '../contexts/AuthContext';
import { getActiveSubjectIdsForGrade, subjects, type SubjectId } from '../data/subjects';
import {
  QuizBattleLeaderboardEntry,
  QuizBattleMatchSummary,
  QuizBattleMode,
  QuizBattleQueueType,
  QuizBattleSetupConfig,
  StudentBattleStats,
  StudentProfile,
} from '../types/models';
import {
  connectQuizBattlePresence,
  createQuizBattleBotMatch,
  createQuizBattlePrivateRoom,
  createDefaultQuizBattleSetup,
  disconnectQuizBattlePresence,
  getQuizBattleMatchState,
  getQuizBattlePrivateRoomState,
  getStudentBattleLeaderboard,
  getStudentBattleHistory,
  getStudentBattleStats,
  joinQuizBattlePrivateRoom,
  joinQuizBattleQueue,
  leaveQuizBattlePrivateRoom,
  leaveQuizBattleQueue,
  QuizBattleHeartbeatScope,
  QuizBattleLiveMatchState,
  QuizBattlePrivateRoomState,
  QuizBattleRoundResult,
  requestQuizBattleRematch,
  resumeQuizBattleSession,
  sendQuizBattleHeartbeat,
  startQuizBattleMatch,
  submitQuizBattleAnswer,
  QuizBattleSetupError,
  validateQuizBattleSetup,
} from '../services/quizBattleService';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { Skeleton } from './ui/skeleton';
import { cn } from './ui/utils';
import { BattleTimerBar } from './battle/BattleTimerBar';
import { BattleHeader } from './battle/BattleHeader.tsx';
import { BattleFooter } from './battle/BattleFooter';
import { BattleActiveContent } from './battle/BattleActiveContent';

const DEFAULT_VIEWPORT_SIZE = { width: 1280, height: 720 };

const battleAnimations = `
  @keyframes mascot-float {
    0%, 100% { transform: translateY(0) rotate(-3deg); }
    50% { transform: translateY(-24px) rotate(3deg); }
  }
  @keyframes vs-pulse {
    0%, 100% { transform: scale(1.1); }
    50% { transform: scale(1.15); }
  }
  @keyframes avatar-left {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }
  @keyframes avatar-right {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }
  @keyframes ghost-left {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }
  @keyframes ghost-right {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }
  @keyframes main-avatar {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }
  @keyframes star-float {
    0%, 100% { transform: translateY(-4px); }
    50% { transform: translateY(4px); }
  }
  @keyframes marquee {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes orb-pulse {
    0%, 100% { transform: scale(1); opacity: 0.3; }
    50% { transform: scale(1.2); opacity: 0.6; }
  }
  @keyframes orb-pulse-delayed {
    0%, 100% { transform: scale(1); opacity: 0.2; }
    50% { transform: scale(1.3); opacity: 0.5; }
  }
  @keyframes icon-bob {
    0%, 100% { transform: translateY(-3px); }
    50% { transform: translateY(3px); }
  }
  @keyframes icon-rotate {
    0%, 100% { transform: rotate(-5deg); }
    50% { transform: rotate(5deg); }
  }
  @keyframes reward-pop {
    0% { transform: scale(0.9) translateY(10px); opacity: 0; }
    100% { transform: scale(1) translateY(0); opacity: 1; }
  }
  @keyframes score-pop {
    0% { transform: scale(1); }
    50% { transform: scale(1.4); }
    100% { transform: scale(1); }
  }
  @keyframes overlay-fade-in {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }
  @keyframes overlay-slide-up {
    0% { transform: translateY(40px) scale(0.85); opacity: 0; }
    100% { transform: translateY(0) scale(1); opacity: 1; }
  }
  @keyframes badge-float-in {
    0% { transform: translateY(14px) scale(0.92); opacity: 0; }
    100% { transform: translateY(0) scale(1); opacity: 1; }
  }
  @keyframes badge-float-out {
    0% { transform: translateY(0) scale(1); opacity: 1; }
    100% { transform: translateY(-10px) scale(0.9); opacity: 0; }
  }
  .animate-mascot-float { animation: mascot-float 3.4s ease-in-out infinite; }
  .animate-vs-pulse { animation: vs-pulse 2s ease-in-out infinite; }
  .animate-avatar-left { animation: avatar-left 4s ease-in-out infinite; }
  .animate-avatar-right { animation: avatar-right 4s ease-in-out infinite 0.4s; }
  .animate-ghost-left { animation: ghost-left 3.5s ease-in-out infinite 0.3s; }
  .animate-ghost-right { animation: ghost-right 3.5s ease-in-out infinite 0.6s; }
  .animate-main-avatar { animation: main-avatar 3.5s ease-in-out infinite; }
  .animate-star-float { animation: star-float 3s ease-in-out infinite; }
  .animate-marquee { animation: marquee 15s linear infinite; }
  .animate-orb-pulse { animation: orb-pulse 5s ease-in-out infinite; }
  .animate-orb-pulse-delayed { animation: orb-pulse-delayed 4s ease-in-out infinite 1.5s; }
  .animate-icon-bob { animation: icon-bob 3s ease-in-out infinite; }
  .animate-icon-rotate { animation: icon-rotate 4s ease-in-out infinite; }
  .animate-reward-pop { animation: reward-pop 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
  .animate-score-pop { animation: score-pop 0.5s ease-out forwards; }
  .animate-overlay-slide-up { animation: overlay-slide-up 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
  @media (prefers-reduced-motion: reduce) {
    .animate-vs-pulse, .animate-avatar-left, .animate-avatar-right,
    .animate-ghost-left, .animate-ghost-right, .animate-main-avatar, .animate-star-float,
    .animate-marquee, .animate-orb-pulse, .animate-orb-pulse-delayed,
    .animate-icon-bob, .animate-icon-rotate { animation: none !important; }
  }
`;
const PUBLIC_MATCHMAKING_TIMEOUT_MS = 5 * 60 * 1000;

const RainStorm: React.FC<{ viewportHeight: number }> = ({ viewportHeight }) => (
  <div className="absolute inset-0 pointer-events-none z-[50] overflow-hidden flex justify-between bg-slate-900/10">
    {useMemo(() => [...Array(40)].map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      duration: 0.6 + Math.random() * 0.4,
      delay: Math.random() * 0.4,
    })), [viewportHeight]).map((drop) => (
      <motion.div
        key={drop.id}
        className="absolute w-0.5 h-16 bg-blue-300/40 rounded-full e-left-top"
        // SAFETY: trusted internal value already conforms to the asserted type.
        style={{ ['--left' as any]: drop.left, ['--top' as any]: '-10%' }}
        animate={{ y: [0, viewportHeight * 1.2] }}
        transition={{
          duration: drop.duration,
          ease: 'linear',
          delay: drop.delay,
        }}
      />
    ))}
  </div>
);

const DrawSparks: React.FC<{ viewportHeight: number; viewportWidth: number }> = ({ viewportHeight, viewportWidth }) => {
  const sparks = useMemo(() => [...Array(30)].map((_, i) => ({
    id: i,
    xShift: (Math.random() - 0.5) * viewportWidth * 0.8,
    yShift: (Math.random() - 0.5) * viewportHeight * 0.8,
    scale: Math.random() * 1.5 + 0.5,
    duration: 2 + Math.random() * 1.5,
    delay: Math.random() * 0.35,
  })), [viewportHeight, viewportWidth]);

  return (
    <div className="absolute inset-0 pointer-events-none z-[50] overflow-hidden flex items-center justify-center">
      {sparks.map((spark) => (
        <motion.div
          key={spark.id}
          className="absolute w-2 h-2 bg-amber-400 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.8)] e-left-top"
          // SAFETY: trusted internal value already conforms to the asserted type.
          style={{ ['--left' as any]: '50%', ['--top' as any]: '50%' }}
          animate={{
            y: [0, spark.yShift],
            x: [0, spark.xShift],
            scale: [0, spark.scale, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: spark.duration,
            ease: "easeOut",
            delay: spark.delay,
          }}
        />
      ))}
    </div>
  );
};

const AnimatedCounter: React.FC<{ value: number; label: string; delay?: number; icon?: React.ReactNode }> = ({ value, label, delay = 0, icon }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (value <= 0) return;
    const duration = 1000;
    const steps = 30;
    const stepTime = Math.abs(Math.floor(duration / steps));
    let current = 0;

    const timeout = setTimeout(() => {
      const timer = setInterval(() => {
        current += Math.max(1, Math.floor(value / steps));
        if (current >= value) {
          setCount(value);
          clearInterval(timer);
        } else {
          setCount(current);
        }
      }, stepTime);
      return () => clearInterval(timer);
    }, delay);

    return () => clearTimeout(timeout);
  }, [value, delay]);

  if (value <= 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, transform: 'translateX(-20px)' }}
      animate={{ opacity: 1, transform: 'translateX(0)' }}
      transition={{ delay: delay / 1000, duration: 0.5 }}
      className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3"
    >
      <div className="flex items-center gap-3 text-white/80 font-bold uppercase tracking-wider text-sm">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-black text-amber-400 tabular-nums">
        +{count}
      </div>
    </motion.div>
  );
};

type BattlePageTab = 'hub' | 'setup' | 'battle' | 'history' | 'stats' | 'leaderboard';
type HistoryFilterOption = 'all' | QuizBattleMode | 'wins' | 'losses';

const BATTLE_PAGE_TABS = ['hub', 'setup', 'battle', 'history', 'stats', 'leaderboard'] as const;
const QUIZ_BATTLE_DIFFICULTIES = ['easy', 'medium', 'hard', 'adaptive'] as const;

// Environment probes: these globals exist only in browser runtimes (SSR-safe).
const hasWindow = 'window' in globalThis;
const hasDocument = 'document' in globalThis;

type LaunchState =
  | { status: 'idle' }
  | { status: 'validating' }
  | { status: 'queued'; message: string }
  | { status: 'error'; message: string };

const cardFrameClass =
  'border border-border bg-card text-card-foreground shadow-sm dark:border-[#2b3140] dark:bg-[#181d27] dark:text-[#f5f7fb] dark:shadow-[0_12px_24px_rgba(0,0,0,0.22)]';

const formatResponseTime = (avgResponseMs: number): string => {
  if (avgResponseMs <= 0) return '--';
  return `${(avgResponseMs / 1000).toFixed(2)}s`;
};

const formatOutcomeChip = (outcome: QuizBattleMatchSummary['outcome']): string => {
  if (outcome === 'win') return 'Win';
  if (outcome === 'loss') return 'Loss';
  return 'Draw';
};

const clampNumber = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

const formatWaitClock = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${mins}:${String(rem).padStart(2, '0')}`;
};

const toInitials = (name: string): string => {
  const tokens = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (tokens.length === 0) {
    return 'ST';
  }

  return tokens.map((entry) => entry[0]?.toUpperCase() || '').join('');
};

const renderDuelistAvatar = (photoUrl: string | undefined, name: string) => {
  if (photoUrl && (photoUrl.startsWith('http') || photoUrl.startsWith('data:'))) {
    return <img src={photoUrl} alt={name} className="w-full h-full object-cover rounded-full" />;
  }
  return <span>{toInitials(name)}</span>;
};

const describeLifecycleEvent = (
  lifecycle: QuizBattleLiveMatchState['lifecycle'] | undefined,
  studentId?: string,
): string | null => {
  if (!lifecycle) return null;

  if (lifecycle.eventType === 'round_started') {
    return `Round ${lifecycle.roundNumber} started.`;
  }

  if (lifecycle.eventType === 'answer_locked') {
    if (lifecycle.lockedByStudentId && studentId && lifecycle.lockedByStudentId === studentId) {
      return `Round ${lifecycle.roundNumber}: your answer is locked.`;
    }
    return `Round ${lifecycle.roundNumber}: opponent answer locked.`;
  }

  if (lifecycle.eventType === 'round_result') {
    return `Round ${lifecycle.roundNumber} resolved.`;
  }

  return 'Match completed.';
};

let globalAudioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!hasWindow) return null;
  if (!globalAudioContext) {
    // SAFETY: trusted internal value already conforms to the asserted type.
    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioContextCtor) {
      globalAudioContext = new AudioContextCtor();
    }
  }
  return globalAudioContext;
};

interface QuizBattlePageProps {
  setIsInQuizMode?: (value: boolean) => void;
}

const QuizBattlePage: React.FC<QuizBattlePageProps> = ({ setIsInQuizMode }) => {
  const { userProfile, userRole } = useAuth();
  // SAFETY: trusted internal value already conforms to the asserted type.
  const studentProfile = userProfile as StudentProfile | null;
  const [activeTab, setActiveTab] = useState<BattlePageTab>('hub');
  const [setupConfig, setSetupConfig] = useState<QuizBattleSetupConfig>(createDefaultQuizBattleSetup);
  const [setupErrors, setSetupErrors] = useState<QuizBattleSetupError[]>([]);
  const [launchState, setLaunchState] = useState<LaunchState>({ status: 'idle' });
  const [queueActive, setQueueActive] = useState(false);
  const [activeRoom, setActiveRoom] = useState<QuizBattlePrivateRoomState | null>(null);
  const [privateRoomCodeInput, setPrivateRoomCodeInput] = useState('');
  const [copiedRoomCode, setCopiedRoomCode] = useState<string | null>(null);
  const [queueWaitSeconds, setQueueWaitSeconds] = useState(0);
  const [queueTimeoutDeadlineAtMs, setQueueTimeoutDeadlineAtMs] = useState<number | null>(null);
  const [battleSoundEnabled, setBattleSoundEnabled] = useState(() => {
    if (!hasWindow) return true;
    return window.localStorage.getItem('quiz_battle_sound_enabled') !== '0';
  });
  const [battleSoundVolume, setBattleSoundVolume] = useState(() => {
    if (!hasWindow) return 0.7;
    const stored = Number(window.localStorage.getItem('quiz_battle_sound_volume') || '0.7');
    if (!Number.isFinite(stored)) return 0.7;
    return clampNumber(stored, 0, 1);
  });
  const [connectionState, setConnectionState] = useState<'connected' | 'reconnecting' | 'disconnected'>('connected');
  const [historyFilterMode, setHistoryFilterMode] = useState<HistoryFilterOption>('all');

  const [statsLoading, setStatsLoading] = useState(true);
  const [statsData, setStatsData] = useState<StudentBattleStats | null>(null);
  const [historyData, setHistoryData] = useState<QuizBattleMatchSummary[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<QuizBattleLeaderboardEntry[]>([]);
  const [leaderboardNameMode, setLeaderboardNameMode] = useState<'alias' | 'initials' | 'full'>('full');
  const [showExactLeaderboardScores, setShowExactLeaderboardScores] = useState(true);
  const [showStickyPodiumPills, setShowStickyPodiumPills] = useState(false);
  const hallOfFamePodiumRef = useRef<HTMLDivElement>(null);

  const [activeMatch, setActiveMatch] = useState<QuizBattleLiveMatchState | null>(null);

  useEffect(() => {
    const isLiveMatch = Boolean(
      activeMatch && (activeMatch.status === 'in_progress' || activeMatch.status === 'ready')
    );
    setIsInQuizMode?.(isLiveMatch);
    return () => {
      setIsInQuizMode?.(false);
    };
  }, [activeMatch?.status, setIsInQuizMode]);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [answerSubmitting, setAnswerSubmitting] = useState(false);
  const [roundSecondsLeft, setRoundSecondsLeft] = useState(0);
  const [roundLocked, setRoundLocked] = useState(false);
  const [designPauseActive, setDesignPauseActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewportSize, setViewportSize] = useState(DEFAULT_VIEWPORT_SIZE);
  const [lastRoundResult, setLastRoundResult] = useState<QuizBattleRoundResult | null>(null);
  const [opponentSurrendered, setOpponentSurrendered] = useState(false);
  const [pendingMatchUpdate, setPendingMatchUpdate] = useState<QuizBattleLiveMatchState | null>(null);
  const [floatingMomentum, setFloatingMomentum] = useState<{
    id: number;
    label: string;
    tone: 'positive' | 'negative' | 'neutral';
  } | null>(null);
  const [scorePulseTarget, setScorePulseTarget] = useState<'player' | 'opponent' | null>(null);
  const lifecycleEventRef = useRef<string>('');
  const countdownSoundRef = useRef<number | null>(null);
  const autoSubmitRoundRef = useRef<number | null>(null);
  const autoSubmitRetryAtMsRef = useRef(0);
  const celebratedMatchIdRef = useRef<string>('');
  const reduceMotion = useReducedMotion();
  const botReadyStartFailuresRef = useRef(0);
  const previousStreakRef = useRef(0);
  const previousScoreRef = useRef<{ matchId: string; scoreFor: number; scoreAgainst: number } | null>(null);
  const scorePulseTimeoutRef = useRef<number | null>(null);
  const popupShownForRoundRef = useRef<number>(-1);
  const isDesignPauseAvailable = import.meta.env.DEV;

  const gradeScopedSubjects = useMemo(() => {
    const allowedSubjectIds = getActiveSubjectIdsForGrade(studentProfile?.grade);
    // SAFETY: trusted internal value already conforms to the asserted type.
    return subjects.filter((entry) => allowedSubjectIds.includes(entry.id as SubjectId));
  }, [studentProfile?.grade]);

  const moduleOptions = useMemo(() => {
    const selectedSubject = gradeScopedSubjects.find((entry) => entry.id === setupConfig.subjectId);
    return (selectedSubject?.modules || []).map((module) => ({
      value: module.id,
      label: module.title,
    }));
  }, [gradeScopedSubjects, setupConfig.subjectId]);

  const playerRoundStreak = useMemo(() => {
    const rounds = activeMatch?.roundResults || [];
    let streak = 0;
    rounds.forEach((result) => {
      streak = result.studentCorrect ? streak + 1 : 0;
    });
    return streak;
  }, [activeMatch?.roundResults]);

  const playerVisualMultiplier = useMemo(() => {
    const boost = Math.max(0, playerRoundStreak - 1) * 0.12;
    return Number((1 + Math.min(0.72, boost)).toFixed(2));
  }, [playerRoundStreak]);

  const liveXpEarned = useMemo(() => {
    if (!activeMatch) return 0;
    if (activeMatch.status === 'completed') return activeMatch.xpEarned || 0;
    const rounds = activeMatch.roundResults || [];
    let streak = 0;
    let total = 0;
    for (const r of rounds) {
      if (r.studentCorrect) {
        streak++;
        const streakBonus = streak >= 2 ? Math.min(25, (streak - 1) * 5) : 0;
        total += 10 + streakBonus;
      } else {
        streak = 0;
      }
    }
    return total;
  }, [activeMatch?.status, activeMatch?.xpEarned, activeMatch?.roundResults]);

  const opponentRoundStreak = useMemo(() => {
    const rounds = activeMatch?.roundResults || [];
    let streak = 0;
    rounds.forEach((result) => {
      streak = result.botCorrect ? streak + 1 : 0;
    });
    return streak;
  }, [activeMatch?.roundResults]);

  const opponentVisualMultiplier = useMemo(() => {
    const boost = Math.max(0, opponentRoundStreak - 1) * 0.1;
    return Number((1 + Math.min(0.5, boost)).toFixed(2));
  }, [opponentRoundStreak]);

  const momentumTier = useMemo(() => {
    if (playerRoundStreak >= 5) {
      return {
        label: 'Inferno',
        badgeClass: 'text-amber-300 border-amber-300/50 bg-amber-500/20 shadow-[0_0_18px_rgba(251,191,36,0.35)]',
      };
    }
    if (playerRoundStreak >= 3) {
      return {
        label: 'Heating Up',
        badgeClass: 'text-orange-300 border-orange-300/50 bg-orange-500/15 shadow-[0_0_16px_rgba(249,115,22,0.3)]',
      };
    }
    if (lastRoundResult?.studentCorrect) {
      return {
        label: 'Steady',
        badgeClass: 'text-emerald-300 border-emerald-300/40 bg-emerald-500/15 shadow-[0_0_14px_rgba(16,185,129,0.25)]',
      };
    }
    return {
      label: 'Rebuild',
      badgeClass: 'text-slate-300 border-slate-300/30 bg-slate-500/15 shadow-[0_0_14px_rgba(148,163,184,0.2)]',
    };
  }, [lastRoundResult?.studentCorrect, playerRoundStreak]);

  const lastRoundMomentumDelta = useMemo(() => {
    if (!lastRoundResult) return null;
    const base = lastRoundResult.studentCorrect ? 12 : -8;
    const duelBonus = lastRoundResult.studentCorrect && !lastRoundResult.botCorrect ? 6 : 0;
    const streakBonus = lastRoundResult.studentCorrect ? Math.max(0, (playerRoundStreak - 1) * 2) : 0;
    return base + duelBonus + streakBonus;
  }, [lastRoundResult, playerRoundStreak]);

  const playBattleTone = useCallback((kind: 'tick' | 'lock' | 'result' | 'win' | 'loss' | 'streak' | 'multiplier') => {
    if (!battleSoundEnabled || battleSoundVolume <= 0 || !hasWindow) return;

    try {
      const context = getAudioContext();
      if (!context) return;

      if (context.state === 'suspended') {
        void context.resume().catch(() => { });
      }

      const presets = {
        tick: { notes: [740], duration: 0.06, type: 'triangle', volume: 0.03 },
        lock: { notes: [520], duration: 0.08, type: 'square', volume: 0.04 },
        result: { notes: [660, 720], duration: 0.08, type: 'sine', volume: 0.04 },
        win: { notes: [920, 1040, 1180], duration: 0.12, type: 'triangle', volume: 0.05 },
        loss: { notes: [260, 220], duration: 0.14, type: 'sawtooth', volume: 0.045 },
        streak: { notes: [780, 920], duration: 0.09, type: 'triangle', volume: 0.045 },
        multiplier: { notes: [660, 880, 1120], duration: 0.08, type: 'triangle', volume: 0.05 },
      } satisfies Record<string, { notes: number[]; duration: number; type: OscillatorType; volume: number }>;

      const preset = presets[kind];
      const now = context.currentTime;
      const noteSpacing = 0.07;
      const scaledVolume = clampNumber(preset.volume * battleSoundVolume, 0.004, 0.08);

      preset.notes.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        const startAt = now + index * noteSpacing;

        oscillator.type = preset.type;
        oscillator.frequency.setValueAtTime(frequency, startAt);

        gainNode.gain.setValueAtTime(0.0001, startAt);
        gainNode.gain.exponentialRampToValueAtTime(scaledVolume, startAt + 0.012);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + preset.duration);

        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        oscillator.start(startAt);
        oscillator.stop(startAt + preset.duration + 0.02);
      });
    } catch (error) {
      console.warn('Battle tone playback skipped or blocked:', error);
    }
  }, [battleSoundEnabled, battleSoundVolume]);

  const handleCopyRoomCode = useCallback(async (roomCode: string) => {
    if (!roomCode || !hasWindow) return;

    try {
      await window.navigator.clipboard.writeText(roomCode);
      setCopiedRoomCode(roomCode);
      window.setTimeout(() => {
        setCopiedRoomCode((current) => (current === roomCode ? null : current));
      }, 1600);
    } catch {
      setLaunchState({
        status: 'error',
        message: 'Unable to copy room code automatically. Please copy it manually.',
      });
    }
  }, []);

  const handleToggleDesignPause = useCallback(() => {
    if (!isDesignPauseAvailable) return;

    setDesignPauseActive((previous) => {
      const next = !previous;
      setLaunchState({
        status: 'queued',
        message: next
          ? 'Design pause enabled. Round timer and match sync are frozen on this device.'
          : 'Design pause disabled. Live match sync resumed.',
      });
      return next;
    });
  }, [isDesignPauseAvailable]);

  const clearPublicMatchmakingSession = useCallback((message: string) => {
    setQueueActive(false);
    setActiveRoom(null);
    setActiveMatch(null);
    setQueueWaitSeconds(0);
    setQueueTimeoutDeadlineAtMs(null);
    setLaunchState({
      status: 'error',
      message,
    });
    setActiveTab('setup');
  }, []);

  const refreshBattleInsights = useCallback(async (): Promise<{
    stats: StudentBattleStats | null;
    history: QuizBattleMatchSummary[];
  } | null> => {
    if (!studentProfile?.uid) {
      return null;
    }

    const historyMode = (historyFilterMode === 'online' || historyFilterMode === 'bot') ? historyFilterMode : 'all';
    const [stats, history] = await Promise.all([
      getStudentBattleStats(studentProfile.uid),
      getStudentBattleHistory(studentProfile.uid, { mode: historyMode, limitCount: 20 }),
    ]);

    return { stats, history };
  }, [historyFilterMode, studentProfile?.uid]);

  useEffect(() => {
    if (gradeScopedSubjects.length === 0) return;

    const selectedSubjectValid = gradeScopedSubjects.some((subject) => subject.id === setupConfig.subjectId);
    const nextSubjectId = selectedSubjectValid ? setupConfig.subjectId : gradeScopedSubjects[0].id;
    const selectedSubject = gradeScopedSubjects.find((subject) => subject.id === nextSubjectId);
    const firstModuleId = selectedSubject?.modules?.[0]?.id || '';

    setSetupConfig((previous) => {
      const nextTopicId =
        selectedSubject?.modules?.some((module) => module.id === previous.topicId)
          ? previous.topicId
          : firstModuleId;

      if (previous.subjectId === nextSubjectId && previous.topicId === nextTopicId) {
        return previous;
      }

      return {
        ...previous,
        subjectId: nextSubjectId,
        topicId: nextTopicId,
      };
    });
  }, [gradeScopedSubjects, setupConfig.subjectId]);

  useEffect(() => {
    if (!studentProfile?.uid) {
      setStatsData(null);
      setHistoryData([]);
      setStatsLoading(false);
      return;
    }

    let isMounted = true;
    setStatsLoading(true);

    const load = async () => {
      const result = await refreshBattleInsights();

      if (!isMounted) return;
      if (result) {
        setStatsData(result.stats);
        setHistoryData(result.history);
      }
      setStatsLoading(false);
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [refreshBattleInsights, studentProfile?.uid]);

  const filteredHistory = useMemo(() => {
    if (historyFilterMode === 'all') return historyData;
    if (historyFilterMode === 'wins') return historyData.filter((entry) => entry.outcome === 'win');
    if (historyFilterMode === 'losses') return historyData.filter((entry) => entry.outcome === 'loss');
    return historyData.filter((entry) => entry.mode === historyFilterMode);
  }, [historyData, historyFilterMode]);

  const handleDuelAgain = useCallback((subjectId?: string, mode?: QuizBattleMode, difficulty?: string) => {
    setSetupConfig((prev) => {
      let validSubjectId = prev.subjectId;
      if (subjectId && subjects.some((s) => s.id === subjectId)) {
        // SAFETY: validated subjectId against subjects list.
        validSubjectId = subjectId as SubjectId;
      }
      const validDifficulty: 'easy' | 'medium' | 'hard' =
        difficulty === 'easy' || difficulty === 'medium' || difficulty === 'hard'
          ? difficulty
          : prev.difficulty;
      return {
        ...prev,
        subjectId: validSubjectId,
        mode: mode || prev.mode,
        difficulty: validDifficulty,
      };
    });
    setActiveTab('setup');
  }, []);

  const leaderboardRows = useMemo(() => {
    return leaderboardData.map((entry, index) => {
      const rank = entry.rank || index + 1;
      const isSelf = entry.userId === studentProfile?.uid;
      const alias = `Student-${entry.userId.slice(-4).toUpperCase()}`;

      const displayName =
        leaderboardNameMode === 'full'
          ? entry.displayName
          : leaderboardNameMode === 'initials'
            ? toInitials(entry.displayName)
            : alias;

      const scoreBandStart = Math.floor(entry.leaderboardScore / 25) * 25;
      const scoreLabel = showExactLeaderboardScores || isSelf
        ? `${entry.leaderboardScore} pts`
        : `${scoreBandStart}-${scoreBandStart + 24} pts`;

      return {
        ...entry,
        rank,
        isSelf,
        displayName,
        scoreLabel,
      };
    });
  }, [leaderboardData, leaderboardNameMode, showExactLeaderboardScores, studentProfile?.uid]);

  const [hallOfFameTimeFilter, setHallOfFameTimeFilter] = useState<'all' | 'weekly'>('all');

  // Reversible scroll listener: shows sticky placement pills when Hall of Fame podium scrolls out of view
  useEffect(() => {
    if (activeTab !== 'leaderboard') {
      setShowStickyPodiumPills(false);
      return;
    }

    const scrollParent = hallOfFamePodiumRef.current?.closest('main') || window;
    const checkVisibility = () => {
      if (!hallOfFamePodiumRef.current) return;
      const rect = hallOfFamePodiumRef.current.getBoundingClientRect();
      setShowStickyPodiumPills(rect.bottom < 80);
    };

    scrollParent.addEventListener('scroll', checkVisibility, { passive: true });
    window.addEventListener('scroll', checkVisibility, { passive: true });
    checkVisibility();

    return () => {
      scrollParent.removeEventListener('scroll', checkVisibility);
      window.removeEventListener('scroll', checkVisibility);
    };
  }, [activeTab, leaderboardRows]);

  useEffect(() => {
    if (activeTab !== 'leaderboard' && activeTab !== 'hub') return;

    let isMounted = true;
    setLeaderboardLoading(true);

    const loadLeaderboard = async () => {
      const leaderboard = await getStudentBattleLeaderboard(20);

      if (!isMounted) return;
      setLeaderboardData(leaderboard);
      setLeaderboardLoading(false);
    };

    void loadLeaderboard();

    return () => {
      isMounted = false;
    };
  }, [activeTab]);

  const syncQuizBattleSession = useCallback(async () => {
    if (!studentProfile?.uid) {
      return;
    }

    try {
      const resumed = await resumeQuizBattleSession();

      if (resumed.sessionType === 'match' && resumed.match) {
        let syncedMatch = resumed.match;

        if (resumed.match.mode === 'bot' && resumed.match.status === 'ready') {
          try {
            syncedMatch = await startQuizBattleMatch(resumed.match.matchId);
            botReadyStartFailuresRef.current = 0;
          } catch (error) {
            // SAFETY: trusted internal value already conforms to the asserted type.
            const known = error as { message?: string };
            setQueueActive(false);
            setActiveRoom(null);
            setActiveMatch(null);
            setActiveTab('setup');
            setConnectionState(
              hasWindow && window.navigator.onLine ? 'connected' : 'disconnected',
            );
            setLaunchState({
              status: 'error',
              message: known?.message || 'Unable to resume bot battle. Please start a new match.',
            });
            return;
          }
        }

        setQueueActive(false);
        setActiveRoom(resumed.room || null);
        setActiveMatch(syncedMatch);
        setQueueTimeoutDeadlineAtMs(
          resumed.queue?.expiresAtMs || syncedMatch.expiresAtMs || null,
        );
        setActiveTab('battle');
        setConnectionState('connected');
        return;
      }

      if (resumed.sessionType === 'room' && resumed.room) {
        setQueueActive(false);
        setActiveRoom(resumed.room);
        setActiveMatch((current) => (current?.mode === 'bot' ? current : null));
        setQueueTimeoutDeadlineAtMs(null);
        setConnectionState('connected');
        return;
      }

      if (resumed.sessionType === 'queue') {
        setQueueActive(true);
        setActiveRoom(null);
        setActiveMatch((current) => (current?.mode === 'bot' ? current : null));
        setQueueTimeoutDeadlineAtMs(resumed.queue?.expiresAtMs || null);
        setConnectionState('connected');
        return;
      }

      setQueueActive(false);
      setActiveRoom(null);
      setActiveMatch((current) => (current?.mode === 'bot' ? current : null));
      setQueueTimeoutDeadlineAtMs(null);
      setConnectionState('connected');
    } catch (error) {
      console.warn('Quiz Battle session resume failed:', error);
      setConnectionState('reconnecting');
    }
  }, [studentProfile?.uid]);

  useEffect(() => {
    if (!studentProfile?.uid) {
      return;
    }
    void syncQuizBattleSession();
  }, [studentProfile?.uid, syncQuizBattleSession]);

  useEffect(() => {
    if (!hasWindow) return;
    window.localStorage.setItem('quiz_battle_sound_enabled', battleSoundEnabled ? '1' : '0');
  }, [battleSoundEnabled]);

  useEffect(() => {
    if (!hasWindow) return;
    window.localStorage.setItem('quiz_battle_sound_volume', battleSoundVolume.toFixed(2));
  }, [battleSoundVolume]);

  useEffect(() => {
    if (!hasWindow) return undefined;

    const syncViewport = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setViewportSize({
        width: Number.isFinite(width) && width > 0 ? width : DEFAULT_VIEWPORT_SIZE.width,
        height: Number.isFinite(height) && height > 0 ? height : DEFAULT_VIEWPORT_SIZE.height,
      });
    };

    syncViewport();
    window.addEventListener('resize', syncViewport);
    return () => {
      window.removeEventListener('resize', syncViewport);
    };
  }, []);

  useEffect(() => {
    if (!hasDocument) return undefined;

    const syncFullscreen = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    syncFullscreen();
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreen);
    };
  }, []);

  useEffect(() => {
    const deadlineActive = queueTimeoutDeadlineAtMs !== null;

    if (!(queueActive || (activeRoom && (activeRoom.status === 'waiting' || activeRoom.status === 'ready')) || deadlineActive)) {
      setQueueWaitSeconds(0);
      return;
    }

    const syncWaitClock = () => {
      if (!queueTimeoutDeadlineAtMs) {
        setQueueWaitSeconds((prev) => prev + 1);
        return;
      }

      setQueueWaitSeconds(Math.max(0, Math.ceil((queueTimeoutDeadlineAtMs - Date.now()) / 1000)));
    };

    syncWaitClock();

    const intervalId = window.setInterval(syncWaitClock, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [queueActive, activeRoom?.status, activeRoom?.roomId, queueTimeoutDeadlineAtMs]);

  useEffect(() => {
    if (!queueTimeoutDeadlineAtMs) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const remainingMs = queueTimeoutDeadlineAtMs - Date.now();
      if (remainingMs <= 0) {
        window.clearInterval(intervalId);
        void (async () => {
          try {
            if (queueActive || !activeRoom) {
              await leaveQuizBattleQueue();
            }
          } catch {
            // backend may have already expired the session
          } finally {
            clearPublicMatchmakingSession(
              'Public matchmaking timed out after 5 minutes. Please start again.',
            );
          }
        })();
      }
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeRoom, clearPublicMatchmakingSession, queueActive, queueTimeoutDeadlineAtMs]);

  useEffect(() => {
    if (!hasWindow) {
      return;
    }

    setConnectionState(window.navigator.onLine ? 'connected' : 'disconnected');

    const handleOnline = () => {
      setConnectionState('reconnecting');
      void syncQuizBattleSession();
    };

    const handleOffline = () => {
      setConnectionState('disconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncQuizBattleSession]);

  useEffect(() => {
    const isOnlineMatchActive =
      activeMatch?.mode === 'online' &&
      (activeMatch.status === 'ready' || activeMatch.status === 'in_progress');
    const isBotMatchPreparing = activeMatch?.mode === 'bot' && activeMatch.status === 'ready';
    const isRoomWaiting = Boolean(activeRoom && (activeRoom.status === 'waiting' || activeRoom.status === 'ready'));

    if (!isBotMatchPreparing) {
      botReadyStartFailuresRef.current = 0;
    }

    if (!queueActive && !isRoomWaiting && !isOnlineMatchActive && !isBotMatchPreparing) {
      return;
    }

    if (designPauseActive) {
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        if (activeMatch?.mode === 'bot' && activeMatch.status === 'ready') {
          const started = await startQuizBattleMatch(activeMatch.matchId);
          if (cancelled) return;
          setActiveMatch(started);
          setConnectionState('connected');
          setQueueTimeoutDeadlineAtMs(started.expiresAtMs || null);
          botReadyStartFailuresRef.current = 0;
          if (started.status === 'in_progress') {
            setLaunchState({ status: 'queued', message: 'Practice bot match started.' });
          }
          return;
        }

        if (activeMatch?.mode === 'online') {
          if (activeMatch.status === 'ready') {
            const started = await startQuizBattleMatch(activeMatch.matchId);
            if (cancelled) return;
            setActiveMatch(started);
            setConnectionState('connected');
            setQueueTimeoutDeadlineAtMs(started.expiresAtMs || null);
            if (started.status === 'in_progress') {
              setLaunchState({ status: 'queued', message: 'Match started. Round timer is live.' });
            }
            return;
          }

          const latest = await getQuizBattleMatchState(activeMatch.matchId);
          if (cancelled) return;

          const unshownResult = latest.roundResults
            .filter((r: QuizBattleRoundResult) => r.roundNumber > popupShownForRoundRef.current)
            .sort((a: QuizBattleRoundResult, b: QuizBattleRoundResult) => a.roundNumber - b.roundNumber)[0];

          if (unshownResult) {
            popupShownForRoundRef.current = unshownResult.roundNumber;
            setLastRoundResult(unshownResult);
            setPendingMatchUpdate(latest);
          } else {
            setActiveMatch(latest);
            if (latest.status === 'completed') {
              setQueueActive(false);
              setActiveRoom(null);
              setQueueTimeoutDeadlineAtMs(null);
            }
            if (latest.status === 'cancelled' && activeMatch.status === 'in_progress') {
              setOpponentSurrendered(true);
              setRoundLocked(false);
            }
          }

          setConnectionState('connected');
          return;
        }

        if (activeRoom?.roomId) {
          const roomState = await getQuizBattlePrivateRoomState({ roomId: activeRoom.roomId });
          if (cancelled) return;

          setActiveRoom(roomState.room);

          if (roomState.match) {
            const started = await startQuizBattleMatch(roomState.match.matchId);
            if (cancelled) return;

            setActiveMatch(started);
            setActiveRoom(roomState.room);
            setQueueActive(false);
            setQueueTimeoutDeadlineAtMs(started.expiresAtMs || null);
            setActiveTab('battle');
            setConnectionState('connected');
            setLaunchState({
              status: 'queued',
              message: started.status === 'ready'
                ? 'Opponent connected. Waiting for synchronized start...'
                : 'Private room match started.',
            });
          }
          return;
        }

        if (queueActive) {
          const resumed = await resumeQuizBattleSession();
          if (cancelled) return;

          if (resumed.sessionType === 'match' && resumed.match) {
            const started = await startQuizBattleMatch(resumed.match.matchId);
            if (cancelled) return;

            setActiveMatch(started);
            setActiveRoom(resumed.room || null);
            setQueueActive(false);
            setQueueTimeoutDeadlineAtMs(started.expiresAtMs || null);
            setActiveTab('battle');
            setConnectionState('connected');
            setLaunchState({ status: 'queued', message: 'Opponent found. Preparing synchronized start...' });
            return;
          }

          if (resumed.sessionType === 'room' && resumed.room) {
            setQueueActive(false);
            setActiveRoom(resumed.room);
            setQueueTimeoutDeadlineAtMs(null);
            setConnectionState('connected');
            return;
          }

          setConnectionState('connected');
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('Quiz Battle sync poll failed:', error);
          if (activeMatch?.mode === 'bot' && activeMatch.status === 'ready') {
            botReadyStartFailuresRef.current += 1;
            if (botReadyStartFailuresRef.current >= 3) {
              // SAFETY: trusted internal value already conforms to the asserted type.
              const known = error as { message?: string };
              setQueueActive(false);
              setActiveRoom(null);
              setActiveMatch(null);
              setActiveTab('setup');
              setLaunchState({
                status: 'error',
                message: known?.message || 'Unable to start bot battle. Please try again.',
              });
              setConnectionState('disconnected');
              return;
            }
          }
          setConnectionState('reconnecting');
        }
      }
    };

    void poll();
    const intervalId = window.setInterval(() => {
      void poll();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [
    activeMatch?.matchId,
    activeMatch?.mode,
    activeMatch?.status,
    activeRoom?.roomId,
    activeRoom?.status,
    designPauseActive,
    queueActive,
  ]);

  const heartbeatTarget = useMemo<
    { scope: QuizBattleHeartbeatScope; resourceId: string } | null
  >(() => {
    if (import.meta.env.DEV) {
      return null;
    }

    const allowRoomHeartbeat = true;

    if (activeMatch?.mode === 'online' && (activeMatch.status === 'ready' || activeMatch.status === 'in_progress')) {
      return {
        scope: 'match',
        resourceId: activeMatch.matchId,
      };
    }

    if (allowRoomHeartbeat && activeRoom && (activeRoom.status === 'waiting' || activeRoom.status === 'ready')) {
      return {
        scope: 'room',
        resourceId: activeRoom.roomId,
      };
    }

    if (queueActive && studentProfile?.uid) {
      return {
        scope: 'queue',
        resourceId: studentProfile.uid,
      };
    }

    return null;
  }, [activeMatch, activeRoom, queueActive, studentProfile?.uid]);

  useEffect(() => {
    if (!heartbeatTarget) {
      return;
    }

    let cancelled = false;

    const sendHeartbeat = async () => {
      try {
        await sendQuizBattleHeartbeat(heartbeatTarget.scope, heartbeatTarget.resourceId);
        if (!cancelled) {
          setConnectionState('connected');
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('Quiz Battle heartbeat failed:', error);
          setConnectionState('reconnecting');
        }
      }
    };

    void sendHeartbeat();

    const intervalId = window.setInterval(() => {
      void sendHeartbeat();
    }, 8000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      void disconnectQuizBattlePresence(heartbeatTarget.scope, heartbeatTarget.resourceId);
    };
  }, [heartbeatTarget?.scope, heartbeatTarget?.resourceId]);

  useEffect(() => {
    if (!activeMatch || activeMatch.status !== 'in_progress') {
      setRoundLocked(false);
      autoSubmitRoundRef.current = null;
      autoSubmitRetryAtMsRef.current = 0;
      return;
    }

    autoSubmitRoundRef.current = null;
    autoSubmitRetryAtMsRef.current = 0;

    const deadlineBasedSeconds = activeMatch.roundDeadlineAtMs
      ? Math.max(0, Math.ceil((activeMatch.roundDeadlineAtMs - Date.now()) / 1000))
      : activeMatch.timePerQuestionSec;

    setRoundSecondsLeft(deadlineBasedSeconds);
    setSelectedOptionIndex(null);
    setRoundLocked(false);
  }, [
    activeMatch?.matchId,
    activeMatch?.status,
    activeMatch?.currentRound,
    activeMatch?.timePerQuestionSec,
  ]);

  useEffect(() => {
    if (!designPauseActive) return;
    if (!activeMatch || activeMatch.status !== 'in_progress') {
      setDesignPauseActive(false);
    }
  }, [activeMatch?.matchId, activeMatch?.status, designPauseActive]);

  useEffect(() => {
    const lifecycle = activeMatch?.lifecycle;
    if (!lifecycle?.eventType) return;

    const dedupeKey = `${lifecycle.eventType}:${lifecycle.sequence}`;
    if (lifecycleEventRef.current === dedupeKey) return;
    lifecycleEventRef.current = dedupeKey;

    if (lifecycle.eventType === 'answer_locked') {
      playBattleTone('lock');
    } else if (lifecycle.eventType === 'round_result') {
      playBattleTone('result');
    }
  }, [activeMatch?.lifecycle?.eventType, activeMatch?.lifecycle?.sequence, playBattleTone]);

  useEffect(() => {
    if (!activeMatch || activeMatch.status !== 'completed') return;
    if (celebratedMatchIdRef.current === activeMatch.matchId) return;
    celebratedMatchIdRef.current = activeMatch.matchId;

    playBattleTone(activeMatch.outcome === 'loss' ? 'loss' : 'win');

    if (activeMatch.outcome === 'win' && !reduceMotion) {
      void import('canvas-confetti')
        .then((module) => {
          module.default({
            particleCount: 110,
            spread: 78,
            origin: { y: 0.62 },
            ticks: 160,
          });
        })
        .catch(() => {
          // Non-blocking celebratory effect.
        });
    }
  }, [activeMatch?.matchId, activeMatch?.status, activeMatch?.outcome, playBattleTone, reduceMotion]);

  useEffect(() => {
    if (!activeMatch || activeMatch.status !== 'in_progress' || roundLocked || answerSubmitting || designPauseActive) {
      countdownSoundRef.current = null;
      return;
    }

    if (roundSecondsLeft <= 3 && roundSecondsLeft > 0 && countdownSoundRef.current !== roundSecondsLeft) {
      countdownSoundRef.current = roundSecondsLeft;
      playBattleTone('tick');
    }
  }, [activeMatch?.status, roundSecondsLeft, roundLocked, answerSubmitting, designPauseActive, playBattleTone]);

  useEffect(() => {
    if (!activeMatch || activeMatch.status !== 'in_progress') {
      previousStreakRef.current = 0;
      return;
    }

    if (playerRoundStreak > previousStreakRef.current && playerRoundStreak >= 2) {
      playBattleTone(playerRoundStreak >= 4 ? 'multiplier' : 'streak');
    }

    previousStreakRef.current = playerRoundStreak;
  }, [activeMatch?.matchId, activeMatch?.status, playerRoundStreak, playBattleTone]);

  useEffect(() => {
    if (!activeMatch) {
      previousScoreRef.current = null;
      setScorePulseTarget(null);
      return;
    }

    const previous = previousScoreRef.current;
    if (!previous || previous.matchId !== activeMatch.matchId) {
      previousScoreRef.current = {
        matchId: activeMatch.matchId,
        scoreFor: activeMatch.scoreFor,
        scoreAgainst: activeMatch.scoreAgainst,
      };
      setScorePulseTarget(null);
      return;
    }

    if (activeMatch.scoreFor !== previous.scoreFor || activeMatch.scoreAgainst !== previous.scoreAgainst) {
      const pulseTarget = activeMatch.scoreFor > previous.scoreFor ? 'player' : 'opponent';
      setScorePulseTarget(pulseTarget);

      if (scorePulseTimeoutRef.current) {
        window.clearTimeout(scorePulseTimeoutRef.current);
      }

      scorePulseTimeoutRef.current = window.setTimeout(() => {
        setScorePulseTarget(null);
      }, 850);
    }

    previousScoreRef.current = {
      matchId: activeMatch.matchId,
      scoreFor: activeMatch.scoreFor,
      scoreAgainst: activeMatch.scoreAgainst,
    };
  }, [activeMatch?.matchId, activeMatch?.scoreAgainst, activeMatch?.scoreFor]);

  useEffect(() => {
    return () => {
      if (scorePulseTimeoutRef.current) {
        window.clearTimeout(scorePulseTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!lastRoundResult?.studentCorrect || lastRoundMomentumDelta === null || lastRoundMomentumDelta <= 0) {
      setFloatingMomentum(null);
      return;
    }

    const tone: 'positive' | 'negative' | 'neutral' =
      lastRoundMomentumDelta > 0
        ? 'positive'
        : lastRoundMomentumDelta < 0
          ? 'negative'
          : 'neutral';

    setFloatingMomentum({
      id: Date.now(),
      label: `${lastRoundMomentumDelta >= 0 ? '+' : ''}${lastRoundMomentumDelta} Momentum`,
      tone,
    });

    const timeout = window.setTimeout(() => {
      setFloatingMomentum(null);
    }, 1400);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [lastRoundMomentumDelta, lastRoundResult]);

  useEffect(() => {
    if (lastRoundResult && pendingMatchUpdate) {
      if (lastRoundResult.studentCorrect) {
        playBattleTone('win');
      } else {
        playBattleTone('loss');
      }

      const timeout = window.setTimeout(() => {
        setActiveMatch(pendingMatchUpdate);
        setLastRoundResult(null);
        setSelectedOptionIndex(null);
        setRoundLocked(false);
        setPendingMatchUpdate(null);

        if (pendingMatchUpdate.status === 'completed') {
          setQueueActive(false);
          setActiveRoom(null);
          void refreshBattleInsights();
          popupShownForRoundRef.current = -1;
        }
      }, 1500);

      return () => window.clearTimeout(timeout);
    }
  }, [lastRoundResult, pendingMatchUpdate, playBattleTone, refreshBattleInsights]);

  const submitRoundAnswer = useCallback(
    async (forcedSelection: number | null) => {
      if (!activeMatch || activeMatch.status !== 'in_progress' || roundLocked || designPauseActive) {
        return;
      }

      setAnswerSubmitting(true);
      const submissionWatchdog = window.setTimeout(() => {
        setAnswerSubmitting(false);
        setLaunchState({
          status: 'error',
          message: 'Submission took too long. Syncing latest match state now...',
        });
        void getQuizBattleMatchState(activeMatch.matchId)
          .then((latest) => {
            setActiveMatch(latest);
            if (latest.status === 'completed') {
              setQueueActive(false);
              setActiveRoom(null);
              setQueueTimeoutDeadlineAtMs(null);
            }
          })
          .catch(() => {
            // keep the action retryable for the learner.
          });
      }, 12000);

      try {
        const elapsedMs = activeMatch.roundDeadlineAtMs
          ? clampNumber(
            activeMatch.timePerQuestionSec * 1000 - Math.max(0, activeMatch.roundDeadlineAtMs - Date.now()),
            0,
            activeMatch.timePerQuestionSec * 1000,
          )
          : Math.max(0, (activeMatch.timePerQuestionSec - roundSecondsLeft) * 1000);
        const response = await submitQuizBattleAnswer({
          matchId: activeMatch.matchId,
          roundNumber: activeMatch.currentRound,
          selectedOptionIndex: forcedSelection,
          responseMs: elapsedMs,
        });

        autoSubmitRoundRef.current = null;
        autoSubmitRetryAtMsRef.current = 0;

        if (response.roundResult) {
          popupShownForRoundRef.current = response.roundResult.roundNumber;
          setLastRoundResult(response.roundResult);
          setPendingMatchUpdate(response.match);
        } else {
          setActiveMatch(response.match);
          setLastRoundResult(null);

          if (
            response.match.mode === 'online' &&
            response.match.status === 'in_progress'
          ) {
            setRoundLocked(true);
            setLaunchState({
              status: 'queued',
              message: 'Answer locked. Waiting for opponent to finish the round...',
            });
          } else {
            setSelectedOptionIndex(null);
          }
        }

        if (response.match.status === 'completed') {
          setQueueActive(false);
          setActiveRoom(null);
          setQueueTimeoutDeadlineAtMs(null);
          void refreshBattleInsights();
          setLaunchState({
            status: 'queued',
            message: response.completion
              ? `Match finished (${response.completion.outcome.toUpperCase()}) +${response.completion.xpEarned} XP`
              : 'Match finished. Results saved.',
          });
        }
      } catch (error) {
        // SAFETY: trusted internal value already conforms to the asserted type.
        const known = error as { message?: string };
        const message = known?.message || 'Unable to submit answer right now. Please try again.';
        const shouldSyncLatestMatch =
          forcedSelection === null ||
          message.includes('Round timer elapsed') ||
          message.includes('Expected round') ||
          message.includes('Match is not currently active');

        if (shouldSyncLatestMatch) {
          try {
            const latest = await getQuizBattleMatchState(activeMatch.matchId);
            const advancedRound = latest.currentRound !== activeMatch.currentRound;

            setActiveMatch(latest);
            setSelectedOptionIndex(null);
            setRoundLocked(false);

            if (advancedRound || latest.status === 'completed') {
              autoSubmitRoundRef.current = null;
              autoSubmitRetryAtMsRef.current = 0;
            } else if (forcedSelection === null) {
              autoSubmitRetryAtMsRef.current = Date.now() + 3000;
            }

            if (latest.status === 'completed') {
              setQueueActive(false);
              setActiveRoom(null);
              setQueueTimeoutDeadlineAtMs(null);
              void refreshBattleInsights();
              setLaunchState({
                status: 'queued',
                message: 'Match finished. Results synchronized.',
              });
              return;
            }

            setLaunchState({
              status: 'queued',
              message: 'Round timed out. Synced to the latest battle state.',
            });
            return;
          } catch {
            // If syncing fails, surface the original submission message.
          }
        }

        if (forcedSelection === null) {
          autoSubmitRetryAtMsRef.current = Date.now() + 3000;
        }

        setLaunchState({
          status: 'error',
          message,
        });
      } finally {
        window.clearTimeout(submissionWatchdog);
        setAnswerSubmitting(false);
      }
    },
    [activeMatch, designPauseActive, refreshBattleInsights, roundLocked, roundSecondsLeft],
  );

  useEffect(() => {
    if (!activeMatch || activeMatch.status !== 'in_progress') return;
    if (designPauseActive) return;
    if (answerSubmitting) return;
    if (roundLocked) return;

    const derivedSecondsLeft = activeMatch.roundDeadlineAtMs
      ? Math.max(0, Math.ceil((activeMatch.roundDeadlineAtMs - Date.now()) / 1000))
      : roundSecondsLeft;

    if (activeMatch.roundDeadlineAtMs && derivedSecondsLeft !== roundSecondsLeft) {
      setRoundSecondsLeft(derivedSecondsLeft);
    }

    const shouldAutoSubmitRound = selectedOptionIndex === null
      ? derivedSecondsLeft <= 1
      : derivedSecondsLeft <= 0;

    if (shouldAutoSubmitRound) {
      if (
        autoSubmitRoundRef.current === activeMatch.currentRound &&
        Date.now() < autoSubmitRetryAtMsRef.current
      ) {
        return;
      }

      autoSubmitRoundRef.current = activeMatch.currentRound;
      autoSubmitRetryAtMsRef.current = Date.now() + 3000;
      void submitRoundAnswer(null);
      return;
    }

    const timeout = window.setTimeout(() => {
      if (activeMatch.roundDeadlineAtMs) {
        setRoundSecondsLeft(Math.max(0, Math.ceil((activeMatch.roundDeadlineAtMs - Date.now()) / 1000)));
      } else {
        setRoundSecondsLeft((previous) => Math.max(0, previous - 1));
      }
    }, 1000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [activeMatch, answerSubmitting, designPauseActive, roundLocked, roundSecondsLeft, selectedOptionIndex, submitRoundAnswer]);

  const handleRequestRematch = useCallback(async () => {
    if (!activeMatch || activeMatch.mode !== 'bot') return;

    setAnswerSubmitting(true);
    setLaunchState({ status: 'validating' });

    try {
      const rematch = await requestQuizBattleRematch(activeMatch.matchId);
      const started = await startQuizBattleMatch(rematch.matchId);

      setActiveMatch(started);
      setActiveRoom(null);
      setQueueActive(false);
      setQueueTimeoutDeadlineAtMs(null);
      setLastRoundResult(null);
      setSelectedOptionIndex(null);
      setRoundLocked(false);
      setActiveTab('battle');
      setLaunchState({
        status: 'queued',
        message: `Rematch ready (${rematch.botDifficulty}). Good luck!`,
      });
    } catch (error) {
      // SAFETY: trusted internal value already conforms to the asserted type.
      const known = error as { message?: string };
      setLaunchState({
        status: 'error',
        message: known?.message || 'Unable to start rematch right now.',
      });
    } finally {
      setAnswerSubmitting(false);
    }
  }, [activeMatch]);

  if (userRole !== 'student') {
    return (
      <>
        <style>{battleAnimations}</style>
        <div className="px-4 sm:px-6 xl:px-10 py-6 sm:py-8">
          <Card className={cn(cardFrameClass, 'max-w-2xl')}>
            <CardHeader>
              <CardTitle>Quiz Battle is student-only</CardTitle>
              <CardDescription className="text-muted-foreground dark:text-[#aab3c7]">
                Your account role does not have access to this module.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </>
    );
  }

  const setMode = (mode: QuizBattleMode) => {
    setSetupErrors([]);
    setLaunchState({ status: 'idle' });
    setDesignPauseActive(false);
    setQueueActive(false);
    setActiveRoom(null);
    setPrivateRoomCodeInput('');
    setActiveMatch(null);
    setLastRoundResult(null);
    setSelectedOptionIndex(null);
    setRoundLocked(false);
    setQueueTimeoutDeadlineAtMs(null);
    setSetupConfig((previous) => ({
      ...previous,
      mode,
      queueType: mode === 'online' ? previous.queueType : 'public_matchmaking',
    }));
    setQueueWaitSeconds(0);
    setActiveTab('setup');
  };

  const handleCancelOnlineSession = async () => {
    setLaunchState({ status: 'validating' });

    try {
      if (activeRoom?.roomId) {
        await leaveQuizBattlePrivateRoom({ roomId: activeRoom.roomId });
      } else {
        await leaveQuizBattleQueue();
      }

      setQueueActive(false);
      setActiveRoom(null);
      setActiveMatch((current) => {
        if (!current || current.mode !== 'online') {
          return current;
        }

        return current.status === 'ready' || current.status === 'cancelled' ? null : current;
      });
      setPrivateRoomCodeInput('');
      setQueueWaitSeconds(0);
      setQueueTimeoutDeadlineAtMs(null);

      setLaunchState({
        status: 'queued',
        message: activeRoom?.roomId ? 'Private room cancelled.' : 'Left matchmaking queue.',
      });
    } catch (error) {
      // SAFETY: trusted internal value already conforms to the asserted type.
      const known = error as { message?: string };
      setLaunchState({
        status: 'error',
        message: known?.message || 'Unable to cancel this online session right now. Please try again.',
      });
    }
  };

  const submitSetup = async () => {
    setLaunchState({ status: 'validating' });

    const validationErrors = validateQuizBattleSetup(setupConfig);
    if (validationErrors.length > 0) {
      setSetupErrors(validationErrors);
      setLaunchState({ status: 'error', message: 'Fix the highlighted setup fields before starting.' });
      return;
    }

    setSetupErrors([]);

    try {
      if (setupConfig.mode === 'online') {
        if (setupConfig.queueType === 'private_room') {
          const joinCode = privateRoomCodeInput.trim().toUpperCase();
          const roomResult = joinCode
            ? await joinQuizBattlePrivateRoom(joinCode)
            : await createQuizBattlePrivateRoom(setupConfig);

          setQueueActive(false);
          setActiveRoom(roomResult.room);
          setPrivateRoomCodeInput('');
          setQueueTimeoutDeadlineAtMs(roomResult.match?.expiresAtMs || null);

          if (roomResult.match) {
            const started = await startQuizBattleMatch(roomResult.match.matchId);
            setActiveMatch(started);
            setLastRoundResult(null);
            setSelectedOptionIndex(null);
            setRoundLocked(false);
            setActiveTab('battle');
            setQueueTimeoutDeadlineAtMs(started.expiresAtMs || null);
            setLaunchState({
              status: 'queued',
              message: started.status === 'ready'
                ? `Room ${roomResult.room.roomCode} linked. Waiting for synchronized start...`
                : 'Private room match started.',
            });
            return;
          }

          setActiveMatch(null);
          setQueueTimeoutDeadlineAtMs(null);
          setLaunchState({
            status: 'queued',
            message: joinCode
              ? 'Joined private room. Waiting for opponent...'
              : 'Private room created. Share code:',
          });
          return;
        }

        const queueResponse = await joinQuizBattleQueue(setupConfig);

        if (queueResponse.status === 'matched' && queueResponse.matchId) {
          const started = await startQuizBattleMatch(queueResponse.matchId);
          setQueueActive(false);
          setActiveRoom(null);
          setActiveMatch(started);
          setLastRoundResult(null);
          setSelectedOptionIndex(null);
          setRoundLocked(false);
          setActiveTab('battle');
          setQueueTimeoutDeadlineAtMs(started.expiresAtMs || null);
          setLaunchState({
            status: 'queued',
            message: 'Opponent found. Preparing synchronized start...',
          });
          return;
        }

        setQueueActive(true);
        setActiveRoom(null);
        setActiveMatch(null);
        setQueueTimeoutDeadlineAtMs(queueResponse.expiresAtMs || Date.now() + PUBLIC_MATCHMAKING_TIMEOUT_MS);
        setQueueWaitSeconds(0);
        setLaunchState({ status: 'queued', message: 'Joined matchmaking queue. Waiting for an opponent...' });
        return;
      }

      const botMatch = await createQuizBattleBotMatch(setupConfig);
      const liveMatch = await startQuizBattleMatch(botMatch.matchId);
      setQueueActive(false);
      setActiveRoom(null);
      setActiveMatch(liveMatch);
      setLastRoundResult(null);
      setSelectedOptionIndex(null);
      setRoundLocked(false);
      setRoundSecondsLeft(liveMatch.timePerQuestionSec);
      setQueueTimeoutDeadlineAtMs(null);
      setActiveTab('battle');
      setLaunchState({
        status: 'queued',
        message: `Bot match ${botMatch.matchId.slice(0, 8)} live (${botMatch.botDifficulty}).`,
      });

      void refreshBattleInsights().then((result) => {
        if (result) {
          setStatsData(result.stats);
          setHistoryData(result.history);
        }
      });
    } catch (error) {
      setQueueActive(false);
      // SAFETY: trusted internal value already conforms to the asserted type.
      const known = error as { message?: string };
      setLaunchState({
        status: 'error',
        message: known?.message || 'Unable to start battle. Please try again.',
      });
    }
  };

  const errorFor = (field: QuizBattleSetupError['field']): string | undefined => {
    return setupErrors.find((entry) => entry.field === field)?.message;
  };

  const historyWinRate = statsData?.winRate ?? 0;
  const privateRoomBusy = Boolean(
    setupConfig.mode === 'online' &&
    activeRoom &&
    (activeRoom.status === 'waiting' || activeRoom.status === 'ready') &&
    (!activeMatch || activeMatch.status !== 'completed'),
  );
  const canCancelOnlineSession = Boolean(
    queueActive ||
    (activeRoom &&
      (activeRoom.status === 'waiting' || activeRoom.status === 'ready') &&
      (!activeMatch || activeMatch.status === 'ready' || activeMatch.status === 'cancelled')),
  );

  if (activeMatch && (activeMatch.status === 'in_progress' || activeMatch.status === 'completed')) {
    return (
      <>
        <style>{battleAnimations}</style>
        <div className="fixed inset-0 z-[100] bg-[#0B0F19] text-white flex flex-col overflow-hidden">
          {activeMatch.status === 'completed' && activeMatch.outcome === 'loss' && (
            <RainStorm viewportHeight={viewportSize.height} />
          )}
          {activeMatch.status === 'completed' && activeMatch.outcome === 'draw' && (
            <DrawSparks viewportHeight={viewportSize.height} viewportWidth={viewportSize.width} />
          )}
          {/* Animated BG */}
          <div className="absolute inset-0 z-0 opacity-40">
            <WarpBackground>
              <div className="h-full w-full" />
            </WarpBackground>
          </div>

          {/* Opponent Surrender Overlay */}
          <AnimatePresence>
            {opponentSurrendered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-[120] bg-black/70 backdrop-blur-md flex flex-col items-center justify-center px-6"
              >
                <motion.div
                  initial={{ opacity: 0, transform: 'translateY(40px) scale(0.85)' }}
                  animate={{ opacity: 1, transform: 'translateY(0) scale(1)' }}
                  transition={{ type: 'spring', damping: 18, stiffness: 250, delay: 0.1 }}
                  className="bg-[#1e2433] border border-white/10 rounded-[2rem] p-8 flex flex-col items-center gap-5 max-w-sm w-full shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
                >
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-[#1a2030] border-4 border-rose-500/50 overflow-hidden flex items-end justify-center shadow-xl">
                      {activeMatch.mode === 'bot' ? (
                        <Bot className="h-16 w-16 text-rose-400 mb-2" strokeWidth={1.5} />
                      ) : (
                        <Users className="h-14 w-14 text-slate-500 mb-2" strokeWidth={1.5} />
                      )}
                    </div>
                    <motion.div
                      initial={{ opacity: 0, transform: 'scale(0.5) translateX(-10px)' }}
                      animate={{ opacity: 1, transform: 'scale(1) translateX(0)' }}
                      transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
                      className="absolute -top-2 left-full ml-2 bg-white text-slate-900 text-xs font-black px-3 py-1.5 rounded-2xl rounded-bl-none whitespace-nowrap shadow-lg"
                    >
                      I give up!
                    </motion.div>
                  </div>

                  <div className="text-center">
                    <h2 className="text-2xl font-black text-white mb-1">Opponent Surrendered</h2>
                    <p className="text-white/50 text-sm">
                      <span className="font-bold text-white/70">{activeMatch.opponentName || 'Your opponent'}</span> left the match. You win!
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 w-full">
                    <Button
                      size="lg"
                      className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-white font-black rounded-xl"
                      onClick={() => {
                        setOpponentSurrendered(false);
                        setActiveMatch(null);
                        setActiveRoom(null);
                        setQueueActive(false);
                        setLaunchState({ status: 'idle' });
                        setActiveTab('hub');
                        void refreshBattleInsights();
                      }}
                    >
                      <Trophy size={14} className="inline mr-1" />Claim Victory
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full h-12 border-white/20 text-white/70 hover:bg-white/10 rounded-xl"
                      onClick={() => {
                        setOpponentSurrendered(false);
                        setActiveMatch(null);
                        setActiveRoom(null);
                        setQueueActive(false);
                        setLaunchState({ status: 'idle' });
                        setActiveTab('hub');
                      }}
                    >
                      Back to Arena
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pause Overlay */}
          {designPauseActive && (
            <div className="absolute inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-center justify-center">
              <Card className="w-full max-w-sm border-border/50 bg-[#181d27] shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                <CardHeader className="text-center">
                  <CardTitle className="text-3xl font-black text-white">PAUSED</CardTitle>
                  <CardDescription className="text-base text-muted-foreground mt-2">
                    {activeMatch.mode === 'online'
                      ? "Online match - timer continues in the background! Hurry!"
                      : "Bot match - round timer frozen."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <Button variant="default" size="lg" className="w-full text-lg h-12" onClick={handleToggleDesignPause}>
                    Resume Match
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full text-lg h-12 border-rose-500/20 text-rose-500 hover:bg-rose-500/10"
                    onClick={() => {
                      setDesignPauseActive(false);
                      setActiveMatch(null);
                      setActiveRoom(null);
                      setQueueActive(false);
                      setLaunchState({ status: 'idle' });
                      setActiveTab('setup');
                    }}
                  >
                    Leave Match
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="relative z-10 flex flex-col h-full w-full max-w-[1400px] mx-auto px-4 md:px-8 py-4">

            {/* Header Row */}
            <BattleHeader
              playerRoundStreak={playerRoundStreak}
              playerVisualMultiplier={playerVisualMultiplier}
              liveXpEarned={liveXpEarned}
              activeMatch={activeMatch}
              subjects={subjects}
              battleSoundEnabled={battleSoundEnabled}
              onToggleSound={() => setBattleSoundEnabled((previous) => !previous)}
              isFullscreen={isFullscreen}
              onToggleFullscreen={() => {
                if (!hasDocument) return;
                if (document.fullscreenElement) {
                  document.exitFullscreen().catch((error) => {
                    console.warn('Fullscreen mode unavailable or blocked by browser (exit):', error);
                  });
                } else {
                  document.documentElement.requestFullscreen().catch((error) => {
                    console.warn('Fullscreen mode unavailable or blocked by browser (enter):', error);
                  });
                }
              }}
              isDesignPauseAvailable={isDesignPauseAvailable}
              onTogglePause={handleToggleDesignPause}
            />

            {/* Shrinking Timer Bar */}
            {activeMatch.status === 'in_progress' ? (
              <div className="shrink-0 w-full max-w-4xl mx-auto h-2 bg-white/10 rounded-full overflow-hidden mt-6 mb-4">
                <motion.div
                  className="h-full"
                  animate={{
                    width: `${Math.max(0, (roundSecondsLeft / activeMatch.timePerQuestionSec) * 100)}%`,
                    backgroundColor: roundSecondsLeft > Math.floor(activeMatch.timePerQuestionSec / 2)
                      ? '#10b981'
                      : roundSecondsLeft > 3
                        ? '#f59e0b'
                        : '#ef4444'
                  }}
                  transition={{ duration: 1, ease: "linear" }}
                />
              </div>
            ) : (
              <div className="shrink-0 h-6 md:h-10 w-full" /* Spacer for completed mode */ />
            )}

            <div className="flex-1 flex flex-col justify-center items-center w-full min-h-0 relative">
              {activeMatch.status === 'completed' ? (
                <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-900/50 backdrop-blur-md px-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="w-full max-w-sm sm:max-w-md bg-[#161a25]/90 border border-white/20 shadow-[0_30px_80px_rgba(0,0,0,0.8)] rounded-[1.5rem] p-6 text-center"
                  >
                    <h2 className={cn(
                      "text-3xl font-black uppercase tracking-widest drop-shadow-md mb-2",
                      activeMatch.outcome === 'win' ? "text-emerald-400" : activeMatch.outcome === 'loss' ? "text-rose-400" : "text-amber-400"
                    )}>
                      {activeMatch.outcome === 'win' ? 'VICTORY!' : activeMatch.outcome === 'loss' ? 'DEFEAT' : 'DRAW MATCH'}
                    </h2>
                    <p className="text-white/80 font-bold text-sm mb-4 uppercase tracking-widest">
                      Final Score: {activeMatch.scoreFor} - {activeMatch.scoreAgainst}
                    </p>

                    <div className="bg-black/50 rounded-xl p-4 mb-5 border border-white/5 flex flex-col gap-3">
                      <div>
                        <h3 className="text-white/40 text-[10px] font-black uppercase tracking-widest text-left mb-2">Battle Score</h3>
                        {(() => {
                          const rounds = activeMatch.roundResults || [];
                          let streak = 0;
                          let baseTotal = 0;
                          let streakTotal = 0;
                          for (const r of rounds) {
                            if (r.studentCorrect) {
                              streak++;
                              const bonus = streak >= 2 ? Math.min(15, (streak - 1) * 5) : 0;
                              baseTotal += 10;
                              streakTotal += bonus;
                            } else {
                              streak = 0;
                            }
                          }
                          return (
                            <>
                              <AnimatedCounter value={baseTotal} label="Correct Answers" delay={300} icon={<Check className="h-3 w-3 text-emerald-400" />} />
                              <AnimatedCounter value={streakTotal} label="Streak Bonus" delay={900} icon={<Sparkles className="h-3 w-3 text-amber-400" />} />
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 1.5, duration: 0.4 }}
                                className="flex items-center justify-between pt-1 mt-1 border-t border-white/5"
                              >
                                <span className="text-white/50 text-xs font-bold uppercase tracking-widest">Total</span>
                                <span className="text-base font-black text-white/80">{baseTotal + streakTotal} pts</span>
                              </motion.div>
                            </>
                          );
                        })()}
                      </div>
                      <div className="w-full h-px bg-white/10" />
                      <div>
                        <h3 className="text-white/40 text-[10px] font-black uppercase tracking-widest text-left mb-2">Match Reward</h3>
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 2.0, duration: 0.5, type: 'spring' }}
                          className="flex items-center justify-between"
                        >
                          <span className="text-white/70 text-sm font-bold">
                            {activeMatch.outcome === 'win' ? 'Victory Reward' : activeMatch.outcome === 'draw' ? 'Draw Reward' : 'Participation Reward'}
                          </span>
                          <span className="text-2xl font-black text-amber-400 drop-shadow-md">+{activeMatch.xpEarned || (activeMatch.outcome === 'win' ? 80 : activeMatch.outcome === 'draw' ? 55 : 35)} XP</span>
                        </motion.div>
                        <p className="text-white/25 text-[9px] mt-1 text-right uppercase tracking-widest">Credited to your profile</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 justify-center">
                      <Button
                        size="lg"
                        onClick={() => {
                          setActiveMatch(null);
                          setActiveRoom(null);
                          setQueueActive(false);
                          setActiveTab('hub');
                        }}
                        className="w-full h-12 rounded-xl text-sm font-black bg-white/10 hover:bg-white/20 text-white border border-white/20"
                      >
                        BACK TO ARENA
                      </Button>
                      {activeMatch.mode === 'bot' && (
                        <Button
                          size="lg"
                          onClick={() => void handleRequestRematch()}
                          disabled={answerSubmitting}
                          className="w-full h-12 rounded-xl text-sm font-black bg-violet-600 hover:bg-violet-500 text-white border-b-2 border-violet-800 active:border-b-0 active:translate-y-[2px]"
                        >
                          REMATCH
                        </Button>
                      )}
                    </div>
                  </motion.div>
                </div>
              ) : (
                <BattleActiveContent
                  activeMatch={activeMatch}
                  roundSecondsLeft={roundSecondsLeft}
                  lastRoundResult={lastRoundResult}
                  selectedOptionIndex={selectedOptionIndex}
                  roundLocked={roundLocked}
                  answerSubmitting={answerSubmitting}
                  designPauseActive={designPauseActive}
                  onOptionSelect={(idx) => {
                    if (!!lastRoundResult && lastRoundResult.roundNumber === activeMatch.currentRound) return;
                    if (answerSubmitting || roundLocked) return;
                    getAudioContext()?.resume().catch(() => { });
                    playBattleTone('lock');
                    setSelectedOptionIndex(idx);
                    void submitRoundAnswer(idx);
                  }}
                  floatingMomentum={floatingMomentum}
                  lastRoundMomentumDelta={lastRoundMomentumDelta}
                  studentProfile={studentProfile}
                  quizBattleAvatar={quizBattleAvatar}
                />
              )}
            </div>

            <BattleFooter
              studentProfile={studentProfile}
              activeMatch={activeMatch}
              scorePulseTarget={scorePulseTarget}
              quizBattleAvatar={quizBattleAvatar}
              opponentId={activeRoom?.participantIds?.find(id => id !== userProfile?.uid) || null}
            />

          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{battleAnimations}</style>
      <WarpBackground bgVideo="/videos/warp_bg.mp4" fixedBackground={true} className="w-full min-h-full px-4 sm:px-6 md:px-8 xl:px-12 pt-14 sm:pt-16 lg:pt-20 pb-6 lg:pb-10 overflow-x-hidden relative">
        <div className="h-full flex flex-col max-w-7xl 2xl:max-w-[1680px] 3xl:max-w-[1920px] mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-4 lg:space-y-6"
          >


            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(memberOf(BATTLE_PAGE_TABS, value, 'hub'))}>


              <TabsContent value="hub" className="mt-0 outline-none">
                <motion.div
                  key="hub"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="space-y-6 sm:space-y-8"
                >

                  {/* 1. Hero Banner — Pop-out Overlapping Hero Avatar */}
                  <div className="relative select-none mt-2 sm:mt-4 lg:mt-5 rounded-2xl sm:rounded-3xl lg:rounded-[2rem] border border-white/20 shadow-[0_16px_40px_-12px_rgba(99,102,241,0.35)] shrink-0 overflow-visible">
                    {/* Background & Textures clipped to rounded card */}
                    <div className="absolute inset-0 rounded-2xl sm:rounded-3xl lg:rounded-[2rem] overflow-hidden pointer-events-none z-0">
                      <div className="absolute inset-0 bg-gradient-to-r from-[#7C3AED] via-[#6366F1] to-[#0EA5E9]" />
                      <div className="absolute inset-0 bg-black/40" />
                      <div className="absolute inset-0 bg-math-pattern opacity-10 mix-blend-overlay" />
                      <div className="absolute top-0 right-0 w-[350px] h-[350px] bg-sky-400/20 blur-[90px] rounded-full" />
                    </div>

                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-4 sm:p-5 lg:p-6 min-h-[115px] sm:min-h-[130px] lg:min-h-[145px]">
                      <div className="flex-1 space-y-2 w-full pr-[100px] min-[420px]:pr-[125px] sm:pr-[165px] md:pr-[200px] lg:pr-[240px]">
                        {/* Arena Badge */}
                        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 shadow-xs text-white text-[10px] sm:text-[11px] font-black uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          <span>Live Arena</span>
                          <span className="text-white/40">•</span>
                          <span className="text-emerald-300">1v1 Battles</span>
                        </div>

                        <h1 className="flex items-center gap-2.5 text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white mt-0.5">
                          <Swords className="h-6 w-6 sm:h-8 sm:w-8 lg:h-9 lg:w-9 text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]" strokeWidth={2.4} />
                          Quiz Battle
                        </h1>
                        <p className="text-xs sm:text-sm lg:text-base text-white/90 max-w-xl leading-relaxed font-medium">
                          Fast math battles with instant answers, live scores, and XP rewards.
                        </p>

                        <div className="pt-0.5 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/35 backdrop-blur-md border border-white/15 text-[10px] sm:text-[11px] font-bold text-white/90">
                            <span className={cn("w-2 h-2 rounded-full", connectionState === 'connected' ? "bg-emerald-400 animate-pulse" : "bg-amber-400")} />
                            Connection: <span className={connectionState === 'connected' ? "text-emerald-300 font-black" : "text-amber-300 font-black"}>{connectionState}</span>
                          </span>
                        </div>
                      </div>

                      {/* Battle Avatar Hero — Overlapping in front of container, grounded slightly lower */}
                      <div className="block absolute -right-2 sm:-right-4 md:-right-2 lg:right-1 -top-2 sm:-top-4 md:-top-6 lg:-top-7 w-[115px] min-[420px]:w-[135px] sm:w-[175px] md:w-[215px] lg:w-[245px] shrink-0 pointer-events-none z-30">
                        <motion.div
                          className="w-full h-full origin-bottom"
                          animate={{ y: [0, -10, 0], rotate: [-1.5, 1.5, -1.5] }}
                          transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          <img
                            src={quizBattleAvatar}
                            alt="Battle Hero Avatar"
                            className="w-full h-full object-contain filter drop-shadow-[0_16px_28px_rgba(0,0,0,0.55)] select-none"
                          />
                        </motion.div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Battle Modes */}
                  <div>
                    <h2 className="flex items-center gap-2 pb-3 text-lg sm:text-xl lg:text-2xl font-black tracking-wide uppercase text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]">
                      <Swords className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" /> BATTLE MODES
                    </h2>
                    <div className="grid grid-cols-2 gap-3.5 sm:gap-6 relative z-10 w-full mb-2">
                      {/* VS Player Card */}
                      <motion.button
                        type="button"
                        onClick={() => setMode('online')}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        className="w-full h-[180px] sm:h-[240px] lg:h-[260px] bg-gradient-to-b from-[#8A3FD3] to-[#6C2BAA] rounded-3xl border border-purple-400/30 relative text-left shadow-[0_12px_32px_rgba(138,63,211,0.3)] hover:shadow-[0_16px_48px_rgba(138,63,211,0.5)] block flex-col group cursor-pointer"
                      >
                        {/* Top Highlight border / Inner Shadow effect */}
                        <div className="absolute inset-0 rounded-3xl shadow-[inset_0_4px_12px_rgba(255,255,255,0.35)] pointer-events-none z-40" />

                        <div className="absolute top-4 -left-3 z-20 w-[95px] h-[36px] sm:w-[100px] sm:h-[40px] opacity-100">
                          <svg viewBox="0 0 100 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full block drop-shadow-md">
                            <path d="M0 0 H94 Q100 0 100 6 V34 Q100 40 94 40 H0 L14 20 Z" fill="#b91c1c" />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-end pr-3 font-black text-[12px] sm:text-[13px] text-white tracking-[0.3px] opacity-100 font-nunito">
                            VS Player
                          </div>
                        </div>

                        <div className="rounded-3xl overflow-hidden relative isolate h-full flex flex-col justify-end">
                          {/* Shine Effect */}
                          <div className="absolute top-0 -left-[150%] w-[100%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12 z-50 pointer-events-none transition-all duration-0 group-hover:duration-[800ms] ease-in-out group-hover:left-[150%]" />

                          <div className="flex-1 w-full flex items-end justify-center relative pt-2 pointer-events-none">
                            {/* Expanded Full-Width Stage (Dark Purple) */}
                            <div className="absolute bottom-0 left-0 w-full h-[50px] sm:h-[95px] bg-[#662AA8] rounded-[50%_50%_0_0/100%_100%_0_0] scale-[1.05] z-0" />

                            {/* Animated Avatar Clones (VS Match) - CSS WAAPI animations */}
                            <div className="relative z-10 flex items-center justify-center mb-[2px] h-[80px] sm:h-[140px] w-full">
                              {/* Left Avatar */}
                              <img
                                src="/avatar/avatar_icon.png"
                                alt=""
                                className="h-[120%] sm:h-[125%] object-contain relative z-20 origin-bottom right-[-10px] sm:right-[-15px] drop-shadow-[0_12px_15px_rgba(0,0,0,0.3)] animate-avatar-left"
                              />
                              {/* Center VS */}
                              <div className="relative z-30 flex flex-col items-center mx-[-20px] scale-[1.1] animate-vs-pulse">
                                <span className="font-black italic text-[26px] sm:text-[40px] text-gray-200 tracking-tighter leading-none drop-shadow-[-2px_3px_0px_rgba(0,0,0,0.8)] webkit-text-stroke">
                                  <span className="text-gray-300">V</span><span className="text-gray-400">S</span>
                                </span>
                              </div>
                              {/* Right Avatar (Flipped) */}
                              <img
                                src="/avatar/avatar_icon.png"
                                alt=""
                                className="h-[120%] sm:h-[125%] object-contain relative z-10 scale-x-[-1] origin-bottom left-[-20px] drop-shadow-[0_12px_15px_rgba(0,0,0,0.3)] animate-avatar-right"
                              />
                            </div>
                          </div>

                          <div className="relative z-10 w-full px-3 sm:px-5 py-2.5 sm:py-3.5 text-center bg-[#5c219a] border-t border-white/10">
                            <p className="text-[11px] sm:text-[13px] font-bold text-white leading-snug font-nunito">
                              Match with a classmate or join with a room code.
                            </p>
                          </div>
                        </div>
                      </motion.button>

                      {/* VS Bot Card */}
                      <motion.button
                        type="button"
                        onClick={() => setMode('bot')}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        className="w-full h-[180px] sm:h-[240px] lg:h-[260px] bg-gradient-to-b from-[#1FA7E1] to-[#127DA6] rounded-3xl border border-sky-400/30 relative text-left shadow-[0_12px_32px_rgba(31,167,225,0.3)] hover:shadow-[0_16px_48px_rgba(31,167,225,0.5)] block flex-col group cursor-pointer"
                      >
                        {/* Top Highlight border / Inner Shadow effect */}
                        <div className="absolute inset-0 rounded-3xl shadow-[inset_0_4px_12px_rgba(255,255,255,0.35)] pointer-events-none z-40" />

                        <div className="absolute top-4 -left-3 z-20 w-[95px] h-[36px] sm:w-[100px] sm:h-[40px] opacity-100">
                          <svg viewBox="0 0 100 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full block drop-shadow-md">
                            <path d="M0 0 H94 Q100 0 100 6 V34 Q100 40 94 40 H0 L14 20 Z" fill="#b91c1c" />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-end pr-3 font-black text-[12px] sm:text-[13px] text-white tracking-[0.3px] opacity-100 font-nunito">
                            VS Bot
                          </div>
                        </div>

                        <div className="rounded-3xl overflow-hidden relative isolate h-full flex flex-col justify-end">
                          {/* Shine Effect */}
                          <div className="absolute top-0 -left-[150%] w-[100%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12 z-50 pointer-events-none transition-all duration-0 group-hover:duration-[800ms] ease-in-out group-hover:left-[150%]" />

                          <div className="flex-1 w-full flex items-end justify-center relative pt-2 pointer-events-none">
                            {/* Expanded Full-Width Stage (Dark Blue) */}
                            <div className="absolute bottom-0 left-0 w-full h-[50px] sm:h-[95px] bg-[#127DA6] rounded-[50%_50%_0_0/100%_100%_0_0] scale-[1.05] z-0" />

                            {/* Ghosting Avatars - CSS WAAPI for smooth compositor animation */}
                            <div className="relative z-10 flex items-end justify-center mb-[2px] h-[85px] sm:h-[145px] w-full">
                              {/* Left Ghost */}
                              <img
                                src="/avatar/avatar_icon.png"
                                alt=""
                                className="h-[120%] sm:h-[125%] object-contain relative z-10 origin-bottom left-[15px] sm:left-[20px] scale-90 opacity-40 blur-[1px]"
                              />
                              {/* Center Main Bot */}
                              <img
                                src="/avatar/avatar_icon.png"
                                alt="Bot"
                                className="h-[120%] sm:h-[125%] object-contain relative z-20 origin-bottom drop-shadow-[0_12px_15px_rgba(0,0,0,0.3)] animate-avatar-bot"
                              />
                              {/* Right Ghost */}
                              <img
                                src="/avatar/avatar_icon.png"
                                alt=""
                                className="h-[120%] sm:h-[125%] object-contain relative z-10 origin-bottom right-[15px] sm:right-[20px] scale-90 opacity-40 blur-[1px]"
                              />
                            </div>
                          </div>

                          <div className="relative z-10 w-full px-3 sm:px-5 py-2.5 sm:py-3.5 text-center bg-[#0e688b] border-t border-white/10">
                            <p className="text-[11px] sm:text-[13px] font-bold text-white leading-snug font-nunito">
                              Practice by yourself with adjustable bot difficulty.
                            </p>
                          </div>
                        </div>
                      </motion.button>
                    </div>
                  </div>

                  {/* 3. Hall of Fame | My Stats (Side-by-Side on md+) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-stretch">

                    {/* Hall of Fame Widget — Modern Champions Card */}
                    <div
                      onClick={() => setActiveTab('leaderboard')}
                      className="relative w-full h-full bg-gradient-to-br from-[#7C3AED]/35 via-[#6366F1]/25 to-[#3b3a82]/50 backdrop-blur-xl border border-white/20 hover:border-purple-300/60 rounded-3xl overflow-hidden p-5 sm:p-6 shadow-[0_10px_30px_rgba(124,58,237,0.25)] hover:shadow-[0_14px_40px_rgba(124,58,237,0.4)] cursor-pointer group transition-all duration-300 flex flex-col justify-between active:scale-[0.99]"
                    >
                      {/* Ambient beam highlight */}
                      <div className="absolute top-0 right-0 w-48 h-48 bg-purple-400/20 blur-2xl rounded-full pointer-events-none" />
                      
                      <div className="flex items-center justify-between mb-3 relative z-10">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shadow-inner">
                            <Crown className="w-4 h-4 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                          </div>
                          <div>
                            <h3 className="text-base sm:text-lg font-black text-white font-display tracking-tight leading-none">Hall of Fame</h3>
                            <p className="text-[10px] sm:text-[11px] font-bold text-purple-200 uppercase tracking-wider mt-0.5">Top Arena Players</p>
                          </div>
                        </div>
                        <span className="text-[11px] sm:text-xs font-bold text-white/80 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all inline-flex items-center gap-1">
                          View Board <ChevronRight size={14} />
                        </span>
                      </div>

                      {/* Mini Podium Preview */}
                      <div className="relative z-10 flex items-end justify-center gap-3 pt-3 pb-2 my-auto">
                        {/* 2nd Place Silver */}
                        <div className="flex flex-col items-center w-20 sm:w-24">
                          <div className="w-10 h-10 rounded-full p-0.5 bg-gradient-to-br from-slate-100 to-slate-400 border border-white shadow-md flex items-center justify-center mb-1 overflow-hidden">
                            {leaderboardRows[1]?.photo ? (
                              <img src={leaderboardRows[1].photo} alt="2nd" className="w-full h-full object-cover rounded-full" />
                            ) : (
                              <span className="text-xs font-black text-slate-800">
                                {leaderboardRows[1] ? toInitials(leaderboardRows[1].displayName) : '2'}
                              </span>
                            )}
                          </div>
                          <div className="w-full h-10 rounded-t-xl bg-gradient-to-b from-slate-200/40 to-slate-400/20 border-t border-x border-white/30 flex flex-col items-center justify-center">
                            <span className="text-[10px] sm:text-[11px] font-bold text-white/90 truncate px-1">
                              {leaderboardRows[1] ? leaderboardRows[1].displayName.split(' ')[0] : 'Silver'}
                            </span>
                            {leaderboardRows[1] && (
                              <span className="text-[9px] font-bold text-slate-300">{leaderboardRows[1].scoreLabel}</span>
                            )}
                          </div>
                        </div>

                        {/* 1st Place Gold */}
                        <div className="flex flex-col items-center w-24 sm:w-28">
                          <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-br from-amber-200 via-amber-300 to-amber-500 border-2 border-white shadow-[0_0_15px_rgba(251,191,36,0.6)] flex items-center justify-center mb-1 animate-star-float overflow-hidden">
                            {leaderboardRows[0]?.photo ? (
                              <img src={leaderboardRows[0].photo} alt="1st" className="w-full h-full object-cover rounded-full" />
                            ) : (
                              <Crown className="w-5 h-5 text-amber-900 fill-amber-900" />
                            )}
                          </div>
                          <div className="w-full h-16 rounded-t-xl bg-gradient-to-b from-amber-400/50 to-amber-600/30 border-t border-x border-amber-300/50 flex flex-col items-center justify-center shadow-lg">
                            <span className="text-xs sm:text-sm font-black text-amber-200 drop-shadow-sm truncate px-1">
                              {leaderboardRows[0] ? leaderboardRows[0].displayName.split(' ')[0] : '#1 Champ'}
                            </span>
                            {leaderboardRows[0] && (
                              <span className="text-[10px] font-black text-amber-100">{leaderboardRows[0].scoreLabel}</span>
                            )}
                          </div>
                        </div>

                        {/* 3rd Place Bronze */}
                        <div className="flex flex-col items-center w-20 sm:w-24">
                          <div className="w-10 h-10 rounded-full p-0.5 bg-gradient-to-br from-amber-600 to-amber-800 border border-white shadow-md flex items-center justify-center mb-1 overflow-hidden">
                            {leaderboardRows[2]?.photo ? (
                              <img src={leaderboardRows[2].photo} alt="3rd" className="w-full h-full object-cover rounded-full" />
                            ) : (
                              <span className="text-xs font-black text-amber-100">
                                {leaderboardRows[2] ? toInitials(leaderboardRows[2].displayName) : '3'}
                              </span>
                            )}
                          </div>
                          <div className="w-full h-8 rounded-t-xl bg-gradient-to-b from-amber-700/40 to-amber-900/20 border-t border-x border-amber-500/30 flex flex-col items-center justify-center">
                            <span className="text-[10px] sm:text-[11px] font-bold text-white/90 truncate px-1">
                              {leaderboardRows[2] ? leaderboardRows[2].displayName.split(' ')[0] : 'Bronze'}
                            </span>
                            {leaderboardRows[2] && (
                              <span className="text-[9px] font-bold text-amber-200/80">{leaderboardRows[2].scoreLabel}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/10 text-center relative z-10">
                        <p className="text-[11px] text-purple-200/70 font-medium">Rankings update live after every duel</p>
                      </div>
                    </div>

                    {/* My Stats Widget */}
                    <div className="relative w-full h-full bg-slate-900/60 backdrop-blur-xl border border-white/15 rounded-3xl overflow-hidden flex flex-col justify-between shadow-xl">
                      {/* Header */}
                      <div className="flex flex-row items-center justify-between px-5 sm:px-6 pt-5 pb-2.5 relative z-10">
                        <div>
                          <h3 className="text-base sm:text-lg font-black text-white tracking-wide leading-none drop-shadow-md font-display">My Stats</h3>
                          <p className="text-[10px] sm:text-[11px] font-bold text-purple-300/80 uppercase tracking-wider mt-0.5">Career Combat Summary</p>
                        </div>
                        <Button
                          className="bg-purple-600/80 hover:bg-purple-500 text-white font-bold text-[10px] tracking-widest uppercase rounded-full px-3.5 h-[28px] border border-white/20 shadow-sm transition-all active:scale-95 cursor-pointer"
                          onClick={() => setActiveTab('stats')}
                        >
                          View Stats →
                        </Button>
                      </div>

                      {/* Content: Carousel Row */}
                      <div className="relative z-10 w-full overflow-hidden py-3">
                        {/* Gradient overlays to fade the edges of the carousel */}
                        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-900/80 to-transparent z-20 pointer-events-none"></div>
                        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-900/80 to-transparent z-20 pointer-events-none"></div>

                        <motion.div
                          className="flex w-max"
                          animate={{ x: ["0%", "-33.333333%"] }}
                          transition={{ ease: "linear", duration: 15, repeat: Infinity }}
                        >
                          {[1, 2, 3].map((copyIndex) => (
                            <div key={copyIndex} className="flex gap-3 pr-3">
                              {[
                                {
                                  key: 'totalXP',
                                  bg: 'from-[#FF7B88] to-[#FF5C70]',
                                  shadow: 'shadow-[0_4px_15px_rgba(255,92,112,0.4),inset_0_1px_1px_rgba(255,255,255,0.4)]',
                                  icon: Sparkles,
                                  value: studentProfile?.currentXP || 0,
                                  label: 'Total XP'
                                },
                                {
                                  key: 'winRate',
                                  bg: 'from-[#B467FF] to-[#9D44FF]',
                                  shadow: 'shadow-[0_4px_15px_rgba(157,68,255,0.4),inset_0_1px_1px_rgba(255,255,255,0.4)]',
                                  icon: Trophy,
                                  value: `${Math.round(statsData?.winRate || 0)} %`,
                                  label: 'Win Rate'
                                },
                                {
                                  key: 'matches',
                                  bg: 'from-[#4DB9E9] to-[#2DA1D8]',
                                  shadow: 'shadow-[0_4px_15px_rgba(45,161,216,0.4),inset_0_1px_1px_rgba(255,255,255,0.4)]',
                                  icon: Target,
                                  value: statsData?.matchesPlayed || 0,
                                  label: 'Matches'
                                },
                                {
                                  key: 'response',
                                  bg: 'from-[#48DA94] to-[#2BBF7B]',
                                  shadow: 'shadow-[0_4px_15px_rgba(43,191,123,0.4),inset_0_1px_1px_rgba(255,255,255,0.4)]',
                                  icon: Clock3,
                                  value: statsData?.averageResponseMs ? `${(statsData.averageResponseMs / 1000).toFixed(0)}s` : '0s',
                                  label: 'Response'
                                }
                              ].map((card) => (
                                <div key={card.key} className={cn("w-[92px] sm:w-[104px] shrink-0 aspect-square rounded-[18px] bg-gradient-to-br p-3 flex flex-col justify-between relative overflow-hidden group", card.bg, card.shadow)}>
                                  <div className="absolute -bottom-6 -right-6 text-white/10 transition-transform duration-500 group-hover:scale-110">
                                    <card.icon className="w-20 h-20" />
                                  </div>
                                  <div className="w-7 h-7 rounded-full border border-white/30 flex items-center justify-center relative z-10 shadow-[inset_0_1px_3px_rgba(255,255,255,0.5)]">
                                    <card.icon className="w-3.5 h-3.5 text-white" />
                                  </div>
                                  <div className="relative z-10 flex flex-col">
                                    <h4 className="text-[14px] sm:text-[17px] font-black text-white leading-none tracking-tight drop-shadow-sm">{card.value}</h4>
                                    <p className="text-[8px] sm:text-[9px] font-extrabold text-white/80 uppercase tracking-widest mt-1 truncate">{card.label}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </motion.div>
                      </div>

                      <div className="px-5 pb-4 pt-1 border-t border-white/10 text-center relative z-10">
                        <p className="text-[11px] text-white/60 font-medium">Auto-synced with online matchmaking & bot practice</p>
                      </div>
                    </div>

                  </div>

                  {/* 4. Match History (Full Width) */}
                  <div className="relative w-full bg-slate-900/60 backdrop-blur-xl border border-white/15 rounded-3xl overflow-hidden flex flex-col shadow-xl">
                    <div className="px-5 sm:px-6 pt-5 pb-3 flex flex-row items-center justify-between border-b border-white/10">
                      <div>
                        <h4 className="text-base sm:text-lg font-black flex items-center gap-2 text-white font-display">
                          <History className="h-4 w-4 text-purple-400" /> Recent Match History
                        </h4>
                        <p className="text-[11px] text-white/60 font-medium mt-0.5">
                          Review your most recent duels and score breakdowns
                        </p>
                      </div>
                      <Button variant="link" size="sm" className="h-auto p-0 text-xs font-bold text-purple-300 hover:text-white transition-colors cursor-pointer" onClick={() => setActiveTab('history')}>
                        View Full History →
                      </Button>
                    </div>

                    <div className="p-4 sm:p-5">
                      {statsLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <Skeleton className="h-16 w-full rounded-2xl bg-white/10" />
                          <Skeleton className="h-16 w-full rounded-2xl bg-white/10" />
                          <Skeleton className="h-16 w-full rounded-2xl bg-white/10" />
                        </div>
                      ) : filteredHistory.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-xs sm:text-sm text-white/50">No battle history recorded yet.</p>
                          <p className="text-[11px] text-purple-300/80 mt-1">Jump into a 1v1 battle or bot duel to earn XP and rank up!</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {filteredHistory.slice(0, 6).map((entry) => {
                            const isWin = entry.outcome === 'win';
                            const isLoss = entry.outcome === 'loss';
                            const initials = entry.opponentName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'OP';

                            return (
                              <div key={entry.matchId} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 p-3 shadow-sm transition-all hover:scale-[1.01] hover:border-white/20">
                                {/* Dynamic Background Gradient Fade */}
                                <div className={cn(
                                  "absolute inset-y-0 right-0 w-[55%] pointer-events-none opacity-[0.25] mix-blend-screen transition-all",
                                  isWin ? "bg-gradient-to-l from-emerald-500 via-emerald-500/40 to-transparent" :
                                    isLoss ? "bg-gradient-to-l from-rose-500 via-rose-500/40 to-transparent" :
                                      "bg-gradient-to-l from-amber-400 via-amber-400/40 to-transparent"
                                )} />

                                <div className="flex items-center gap-3 relative z-10 w-full">
                                  {/* Left Avatar Bubble */}
                                  <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center font-black text-[12px] tracking-wide text-white flex-shrink-0 shadow-inner",
                                    isWin ? "bg-emerald-600" : isLoss ? "bg-rose-600" : "bg-amber-600"
                                  )}>
                                    {initials}
                                  </div>

                                  {/* Center Match Details */}
                                  <div className="flex-grow min-w-0 flex flex-col justify-center">
                                    <p className="text-[13px] font-extrabold text-white truncate leading-tight">
                                      vs {entry.opponentName}
                                    </p>
                                    <p className="text-[10px] font-bold text-white/60 truncate flex items-center gap-1 mt-0.5">
                                      {entry.subjectId} <span className="w-1 h-1 rounded-full bg-white/30" /> {entry.difficulty || 'Medium'} <span className="w-1 h-1 rounded-full bg-white/30" /> {entry.rounds || '5'} rnds
                                    </p>
                                  </div>

                                  {/* Right Score & Outcome Text */}
                                  <div className="text-right flex flex-col items-end justify-center pl-2 flex-shrink-0">
                                    <p className="tabular-nums text-[17px] leading-[1.1] font-black text-white tracking-tighter">
                                      {entry.scoreFor}<span className="text-white/40 mx-[1px]">-</span>{entry.scoreAgainst}
                                    </p>
                                    <p
                                      className={cn(
                                        'text-[9px] font-black uppercase tracking-[0.1em]',
                                        isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-amber-400'
                                      )}
                                    >
                                      {entry.outcome}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                </motion.div>
              </TabsContent>

              <TabsContent value="setup" className="mt-0 outline-none">
                <motion.div
                  key="setup"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="w-full space-y-4 sm:space-y-6"
                >
                  {/* Top Bar: Back to Hub + Mode Switcher */}
                  <div className="w-full flex items-center justify-between gap-3 px-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab("hub")}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 hover:text-white backdrop-blur-md border border-white/20 text-xs font-bold transition-all cursor-pointer shadow-xs"
                      aria-label="Back to Arena Hub"
                    >
                      <ChevronRight className="h-4 w-4 rotate-180" />
                      <span>Back to Hub</span>
                    </button>

                    {/* Interactive Mode Switcher Pill */}
                    <div className="flex items-center bg-slate-900/80 backdrop-blur-md p-1 rounded-full border border-white/15 shadow-md">
                      <button
                        type="button"
                        onClick={() => setMode('online')}
                        className={cn(
                          "px-3 sm:px-4 py-1.5 rounded-full text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer",
                          setupConfig.mode === 'online'
                            ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm"
                            : "text-white/60 hover:text-white"
                        )}
                      >
                        <Users size={13} />
                        <span>VS Player</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode('bot')}
                        className={cn(
                          "px-3 sm:px-4 py-1.5 rounded-full text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer",
                          setupConfig.mode === 'bot'
                            ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-sm"
                            : "text-white/60 hover:text-white"
                        )}
                      >
                        <Bot size={13} />
                        <span>VS Bot</span>
                      </button>
                    </div>
                  </div>

                  {/* INTERACTIVE VERSUS SHOWDOWN CARD */}
                  <div className={cn(
                    "relative overflow-hidden rounded-3xl border backdrop-blur-2xl p-4 sm:p-6 shadow-2xl transition-all duration-500",
                    setupConfig.mode === 'online'
                      ? "bg-gradient-to-br from-purple-950/60 via-slate-900/85 to-indigo-950/60 border-purple-500/30 shadow-[0_12px_40px_rgba(138,63,211,0.25)]"
                      : "bg-gradient-to-br from-sky-950/60 via-slate-900/85 to-blue-950/60 border-sky-500/30 shadow-[0_12px_40px_rgba(31,167,225,0.25)]"
                  )}>
                    {/* Atmospheric Ambient Glows */}
                    <div className={cn(
                      "absolute top-0 right-0 w-72 h-72 rounded-full blur-[100px] pointer-events-none opacity-40",
                      setupConfig.mode === 'online' ? "bg-purple-500" : "bg-sky-500"
                    )} />
                    <div className={cn(
                      "absolute bottom-0 left-0 w-72 h-72 rounded-full blur-[100px] pointer-events-none opacity-30",
                      setupConfig.mode === 'online' ? "bg-fuchsia-500" : "bg-cyan-500"
                    )} />

                    {/* Matchup Layout */}
                    <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
                      
                      {/* Left Fighter: YOU */}
                      <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-start">
                        <div className="relative shrink-0">
                          <div className={cn(
                            "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl p-0.5 bg-gradient-to-br border-2 shadow-xl flex items-center justify-center relative overflow-hidden",
                            setupConfig.mode === 'online' ? "from-purple-400 to-indigo-600 border-purple-300" : "from-sky-400 to-blue-600 border-sky-300"
                          )}>
                            {studentProfile?.photo ? (
                              <img src={studentProfile.photo} alt="You" className="w-full h-full object-cover rounded-xl" />
                            ) : (
                              <CompositeAvatar layers={studentProfile?.avatarLayers || {}} className="w-full h-full object-contain" />
                            )}
                          </div>
                          <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-md bg-emerald-500 text-slate-950 text-[9px] font-black uppercase shadow-xs">
                            YOU
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-1">
                            <ShieldCheck size={12} className="text-emerald-400" /> Ready
                          </p>
                          <h3 className="text-base sm:text-lg font-black text-white truncate font-display">
                            {studentProfile?.name || 'You (Duelist)'}
                          </h3>
                          <p className="text-[11px] text-slate-400 font-medium">
                            XP: <span className="text-amber-300 font-bold">{studentProfile?.currentXP || 0}</span>
                          </p>
                        </div>
                      </div>

                      {/* Center: Animated VS Crest & Battle Parameters */}
                      <div className="flex flex-col items-center justify-center my-1 sm:my-0 shrink-0">
                        <div className="relative flex items-center justify-center">
                          <div className={cn(
                            "w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center font-black italic text-lg sm:text-xl text-white shadow-xl border relative z-10",
                            setupConfig.mode === 'online'
                              ? "bg-gradient-to-br from-purple-600 to-rose-600 border-white/30 shadow-[0_0_20px_rgba(217,70,239,0.5)]"
                              : "bg-gradient-to-br from-sky-500 to-indigo-600 border-white/30 shadow-[0_0_20px_rgba(56,189,248,0.5)]"
                          )}>
                            <span className="tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">VS</span>
                          </div>
                          <div className={cn(
                            "absolute inset-0 rounded-full animate-ping opacity-30",
                            setupConfig.mode === 'online' ? "bg-purple-500" : "bg-sky-400"
                          )} />
                        </div>
                        <div className="mt-2 text-center">
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                            setupConfig.mode === 'online'
                              ? "bg-purple-500/20 text-purple-200 border-purple-400/40"
                              : "bg-sky-500/20 text-sky-200 border-sky-400/40"
                          )}>
                            {setupConfig.rounds} Rounds • {setupConfig.timePerQuestionSec}s Blitz
                          </span>
                        </div>
                      </div>

                      {/* Right Fighter: Challenger / Bot */}
                      <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-end flex-row-reverse sm:flex-row text-right sm:text-left">
                        <div className="min-w-0">
                          <p className={cn(
                            "text-xs font-black uppercase tracking-wider flex items-center gap-1 justify-end sm:justify-start",
                            setupConfig.mode === 'online' ? "text-amber-300" : "text-sky-300"
                          )}>
                            {setupConfig.mode === 'online' ? <Users size={12} /> : <Bot size={12} />}
                            {setupConfig.mode === 'online'
                              ? (setupConfig.queueType === 'private_room' ? 'Room Duel' : 'Matchmaking')
                              : 'AI Opponent'}
                          </p>
                          <h3 className="text-base sm:text-lg font-black text-white truncate font-display">
                            {setupConfig.mode === 'online'
                              ? (setupConfig.queueType === 'private_room' ? 'Classmate Room' : 'Live Challenger')
                              : setupConfig.adaptiveBot
                                ? 'Neural Bot (Adaptive)'
                                : setupConfig.botDifficulty === 'hard'
                                  ? 'Grandmaster Bot'
                                  : setupConfig.botDifficulty === 'medium'
                                    ? 'Tactician Bot'
                                    : 'Recruit Bot'}
                          </h3>
                          <p className="text-[11px] text-slate-400 font-medium">
                            {setupConfig.mode === 'online' ? 'Real-time 1v1' : 'Instant AI Practice'}
                          </p>
                        </div>
                        <div className="relative shrink-0">
                          <div className={cn(
                            "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl p-0.5 bg-gradient-to-br border-2 shadow-xl flex items-center justify-center relative overflow-hidden",
                            setupConfig.mode === 'online'
                              ? "from-amber-400 to-rose-600 border-amber-300/60 bg-slate-900"
                              : "from-sky-400 to-cyan-600 border-sky-300/60 bg-slate-900"
                          )}>
                            {setupConfig.mode === 'online' ? (
                              <div className="w-full h-full bg-slate-950/80 rounded-xl flex items-center justify-center relative">
                                <Users className="w-7 h-7 text-amber-300 animate-pulse" />
                                <div className="absolute inset-0 rounded-xl border border-amber-400/30 animate-ping opacity-25" />
                              </div>
                            ) : (
                              <div className="w-full h-full bg-slate-950/80 rounded-xl flex items-center justify-center relative">
                                <Bot className="w-8 h-8 text-sky-300" />
                              </div>
                            )}
                          </div>
                          <span className={cn(
                            "absolute -bottom-1 -left-1 px-1.5 py-0.2 rounded-md text-[9px] font-black uppercase shadow-xs text-slate-950",
                            setupConfig.mode === 'online' ? "bg-amber-400" : "bg-sky-400"
                          )}>
                            {setupConfig.mode === 'online' ? '1v1' : 'AI BOT'}
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* SETTINGS FORM GLASS PANEL */}
                  <div className="rounded-3xl border border-white/15 bg-slate-900/85 backdrop-blur-2xl p-4 sm:p-6 lg:p-7 shadow-2xl">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">

                      {/* Left Column: Academic & Difficulty Settings */}
                      <div className="space-y-4 sm:space-y-5">
                        
                        {/* Subject Domain Selection */}
                        <div className="space-y-1.5">
                          <label className={cn(
                            "text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ml-0.5",
                            setupConfig.mode === 'online' ? "text-purple-400" : "text-sky-400"
                          )}>
                            <BookOpen size={13} />
                            Subject & Domain
                          </label>
                          <Select
                            value={setupConfig.subjectId}
                            onValueChange={(value) => setSetupConfig((previous) => ({ ...previous, subjectId: value }))}
                          >
                            <SelectTrigger className={cn(
                              'rounded-2xl h-11 border-white/15 bg-slate-950/70 text-white font-bold transition-all shadow-sm',
                              setupConfig.mode === 'online' ? "focus:border-purple-500 focus:ring-purple-500/20" : "focus:border-sky-500 focus:ring-sky-500/20",
                              errorFor('subjectId') && 'border-rose-400'
                            )}>
                              <SelectValue placeholder="Select subject" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl backdrop-blur-xl bg-slate-900/95 border-white/15 text-white">
                              {gradeScopedSubjects.map((entry) => (
                                <SelectItem key={entry.id} value={entry.id} className="rounded-xl font-medium focus:bg-purple-600/30 focus:text-white">{entry.title}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errorFor('subjectId') && <p className="text-xs text-rose-400 ml-1 font-bold">{errorFor('subjectId')}</p>}
                        </div>

                        {/* Strand / Topic Selection */}
                        <div className="space-y-1.5">
                          <label className={cn(
                            "text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ml-0.5",
                            setupConfig.mode === 'online' ? "text-purple-400" : "text-sky-400"
                          )}>
                            <Compass size={13} />
                            Curriculum Topic Group
                          </label>
                          <Select
                            value={setupConfig.topicId}
                            onValueChange={(value) => setSetupConfig((previous) => ({ ...previous, topicId: value }))}
                          >
                            <SelectTrigger className={cn(
                              'rounded-2xl h-11 border-white/15 bg-slate-950/70 text-white font-bold transition-all shadow-sm',
                              setupConfig.mode === 'online' ? "focus:border-purple-500 focus:ring-purple-500/20" : "focus:border-sky-500 focus:ring-sky-500/20",
                              errorFor('topicId') && 'border-rose-400'
                            )}>
                              <SelectValue placeholder="Select topic group" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl backdrop-blur-xl bg-slate-900/95 border-white/15 text-white">
                              {moduleOptions.map((entry) => (
                                <SelectItem key={entry.value} value={entry.value} className="rounded-xl font-medium focus:bg-purple-600/30 focus:text-white">{entry.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errorFor('topicId') && <p className="text-xs text-rose-400 ml-1 font-bold">{errorFor('topicId')}</p>}
                        </div>

                        {/* Gamified Difficulty Selector with XP Multipliers */}
                        <div className="space-y-2">
                          <label className={cn(
                            "text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ml-0.5",
                            setupConfig.mode === 'online' ? "text-purple-400" : "text-sky-400"
                          )}>
                            <Swords size={13} />
                            {setupConfig.mode === 'online' ? 'Combat Difficulty' : 'Bot AI Difficulty'}
                          </label>
                          <div className={cn("grid gap-2", setupConfig.mode === 'bot' ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3")}>
                            {[
                              { id: 'easy', label: 'Easy', desc: 'Warmup', multiplier: '1.0x XP', icon: Shield, color: 'emerald', border: 'border-emerald-500/40', bg: 'bg-emerald-500/15 text-emerald-300' },
                              { id: 'medium', label: 'Medium', desc: 'Balanced', multiplier: '1.5x XP', icon: Swords, color: 'amber', border: 'border-amber-500/40', bg: 'bg-amber-500/15 text-amber-300' },
                              { id: 'hard', label: 'Hard', desc: 'Inferno', multiplier: '2.0x XP', icon: Flame, color: 'rose', border: 'border-rose-500/40', bg: 'bg-rose-500/15 text-rose-300' },
                              ...(setupConfig.mode === 'bot' ? [
                                { id: 'adaptive', label: 'Adaptive', desc: 'Smart AI', multiplier: '2.5x XP', icon: Zap, color: 'purple', border: 'border-purple-500/40', bg: 'bg-purple-500/15 text-purple-300' }
                              ] : []),
                            ].map((tier) => {
                              const isSelected = setupConfig.mode === 'bot'
                                ? (tier.id === 'adaptive' ? setupConfig.adaptiveBot : (!setupConfig.adaptiveBot && setupConfig.botDifficulty === tier.id))
                                : setupConfig.difficulty === tier.id;
                              const Icon = tier.icon;
                              return (
                                <button
                                  key={tier.id}
                                  type="button"
                                  onClick={() => {
                                    setSetupConfig((previous) =>
                                      previous.mode === 'bot'
                                        ? {
                                          ...previous,
                                          botDifficulty: memberOf(QUIZ_BATTLE_DIFFICULTIES, tier.id, previous.botDifficulty),
                                          adaptiveBot: tier.id === 'adaptive',
                                        }
                                        : { ...previous, difficulty: memberOf(['easy', 'medium', 'hard'] as const, tier.id, previous.difficulty) }
                                    );
                                  }}
                                  className={cn(
                                    'p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer group',
                                    isSelected
                                      ? cn(tier.bg, tier.border, 'ring-2 ring-offset-1 ring-offset-slate-900 shadow-md scale-[1.02] font-black',
                                        tier.color === 'emerald' ? 'ring-emerald-400' : tier.color === 'amber' ? 'ring-amber-400' : tier.color === 'rose' ? 'ring-rose-400' : 'ring-purple-400')
                                      : 'bg-slate-950/60 border-white/10 text-slate-300 hover:border-white/25 hover:bg-slate-950/80'
                                  )}
                                >
                                  <Icon size={18} className={cn('transition-transform group-hover:scale-110', isSelected && 'scale-110')} />
                                  <span className="text-xs font-black leading-tight mt-0.5">{tier.label}</span>
                                  <span className="text-[9px] font-bold text-amber-300/90 leading-none">{tier.multiplier}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Duel Question Rounds (Mobile Friendly Grid) */}
                        <div className="space-y-1.5">
                          <label className={cn(
                            "text-xs font-black uppercase tracking-wider flex items-center justify-between ml-0.5",
                            setupConfig.mode === 'online' ? "text-purple-400" : "text-sky-400"
                          )}>
                            <span className="flex items-center gap-1.5"><Target size={13} /> Total Questions</span>
                            <span className="text-xs text-amber-300 font-bold">{setupConfig.rounds} Rounds</span>
                          </label>
                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            {[3, 5, 7, 10, 12, 15].map((count) => (
                              <button
                                key={count}
                                type="button"
                                onClick={() => setSetupConfig((prev) => ({ ...prev, rounds: count }))}
                                className={cn(
                                  'h-10 rounded-xl font-display font-black text-xs transition-all border cursor-pointer flex items-center justify-center',
                                  setupConfig.rounds === count
                                    ? setupConfig.mode === 'online'
                                      ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-500/30'
                                      : 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/30'
                                    : 'bg-slate-950/60 border-white/10 text-slate-300 hover:bg-slate-950/90 hover:border-white/20'
                                )}
                              >
                                {count} Qs
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Time Per Question Limit */}
                        <div className="space-y-1.5">
                          <label className={cn(
                            "text-xs font-black uppercase tracking-wider flex items-center justify-between ml-0.5",
                            setupConfig.mode === 'online' ? "text-purple-400" : "text-sky-400"
                          )}>
                            <span className="flex items-center gap-1.5"><Clock3 size={13} /> Timer Per Question</span>
                            <span className="text-xs text-amber-300 font-bold">{setupConfig.timePerQuestionSec}s</span>
                          </label>
                          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                            {[
                              { sec: 15, label: '15s Blitz' },
                              { sec: 20, label: '20s Fast' },
                              { sec: 30, label: '30s Normal' },
                              { sec: 45, label: '45s Deep' },
                              { sec: 60, label: '60s Long' },
                            ].map((timer) => (
                              <button
                                key={timer.sec}
                                type="button"
                                onClick={() => setSetupConfig((prev) => ({ ...prev, timePerQuestionSec: timer.sec }))}
                                className={cn(
                                  'h-10 rounded-xl font-bold text-[11px] transition-all border cursor-pointer flex flex-col items-center justify-center leading-tight',
                                  setupConfig.timePerQuestionSec === timer.sec
                                    ? setupConfig.mode === 'online'
                                      ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-500/30'
                                      : 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/30'
                                    : 'bg-slate-950/60 border-white/10 text-slate-300 hover:bg-slate-950/90 hover:border-white/20'
                                )}
                              >
                                <span className="font-black">{timer.sec}s</span>
                              </button>
                            ))}
                          </div>
                        </div>

                      </div>

                      {/* Right Column: Modes, Audio, and Battle Launch Action */}
                      <div className="flex flex-col justify-between space-y-4 sm:space-y-5">
                        <div className="space-y-4">
                          {/* Online Matchmaking Selection (VS Player Mode Only) */}
                          {setupConfig.mode === 'online' && (
                            <div className="space-y-3 rounded-2xl border border-purple-500/30 bg-purple-950/20 p-4 shadow-sm">
                              <label className="text-xs font-black uppercase tracking-wider text-purple-300 ml-0.5 flex items-center gap-1.5">
                                <Users size={13} /> Matchmaking Mode
                              </label>
                              <div className="grid grid-cols-2 gap-2.5">
                                {[
                                  // SAFETY: trusted internal value already conforms to the asserted type.
                                  { value: 'public_matchmaking' as QuizBattleQueueType, label: 'Public Queue', desc: 'Find live student' },
                                  // SAFETY: trusted internal value already conforms to the asserted type.
                                  { value: 'private_room' as QuizBattleQueueType, label: 'Private Room', desc: 'Join via 6-digit code' },
                                ].map((entry) => (
                                  <button
                                    key={entry.value}
                                    type="button"
                                    className={cn(
                                      "p-3 rounded-2xl text-left transition-all border cursor-pointer",
                                      setupConfig.queueType === entry.value
                                        ? "bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-500/25"
                                        : "bg-slate-950/60 text-slate-300 border-white/10 hover:bg-slate-950/90 hover:border-white/20"
                                    )}
                                    onClick={() =>
                                      setSetupConfig((previous) => ({
                                        ...previous,
                                        queueType: entry.value,
                                      }))
                                    }
                                  >
                                    <p className="font-black text-xs">{entry.label}</p>
                                    <p className={cn("text-[10px] mt-0.5", setupConfig.queueType === entry.value ? "text-purple-100" : "text-slate-400")}>{entry.desc}</p>
                                  </button>
                                ))}
                              </div>

                              {setupConfig.queueType === 'private_room' && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  className="pt-2 space-y-2"
                                >
                                  <label className="text-xs font-black uppercase tracking-wider text-purple-300 ml-0.5">
                                    Room Code (Optional)
                                  </label>
                                  <Input
                                    value={privateRoomCodeInput}
                                    onChange={(event) =>
                                      setPrivateRoomCodeInput(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))
                                    }
                                    placeholder="Leave blank to create new room"
                                    className="rounded-2xl h-11 text-center text-lg uppercase font-mono font-black tracking-[0.25em] border-purple-400/40 bg-slate-950 text-amber-300 shadow-inner"
                                    maxLength={6}
                                  />
                                  <p className="text-[11px] font-medium text-purple-300/80 leading-snug px-0.5">
                                    Enter 6-digit code to join a classmate's duel, or start a match to generate an invite code.
                                  </p>
                                </motion.div>
                              )}
                            </div>
                          )}

                          {/* Sound FX Toggle & Volume */}
                          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3.5 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center",
                                  setupConfig.mode === 'online' ? "bg-purple-900/40 text-purple-300" : "bg-sky-900/40 text-sky-300"
                                )}>
                                  {battleSoundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} className="opacity-50" />}
                                </div>
                                <div>
                                  <p className="text-xs font-black text-white">Battle Sound FX</p>
                                  <p className="text-[10px] text-slate-400">Timers, answer clicks, and fanfare</p>
                                </div>
                              </div>
                              <Switch checked={battleSoundEnabled} onCheckedChange={setBattleSoundEnabled} />
                            </div>

                            {battleSoundEnabled && (
                              <div className="pt-1 flex items-center gap-2.5">
                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Volume</span>
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  step={1}
                                  value={Math.round(battleSoundVolume * 100)}
                                  onChange={(event) => {
                                    const next = clampNumber(Number(event.target.value) / 100, 0, 1);
                                    setBattleSoundVolume(next);
                                  }}
                                  onMouseUp={() => playBattleTone('tick')}
                                  onTouchEnd={() => playBattleTone('tick')}
                                  className="h-1.5 flex-1 cursor-pointer accent-purple-500 rounded-lg"
                                  aria-label="Battle sound volume"
                                />
                                <span className="text-[11px] font-mono font-bold text-slate-400 tabular-nums w-7 text-right">
                                  {Math.round(battleSoundVolume * 100)}%
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Bar & Launch Button */}
                        <div className="flex flex-col gap-2.5 pt-2">
                          <div aria-live="polite" className="min-h-[20px] text-sm font-medium">
                            {launchState.status === 'queued' && (
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={cn("inline-flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-xl",
                                  setupConfig.mode === 'online' ? "text-purple-300 bg-purple-900/40 border border-purple-500/30" : "text-sky-300 bg-sky-900/40 border border-sky-500/30"
                                )}>
                                  <Loader2 size={13} className="animate-spin" />
                                  {launchState.message}
                                </span>
                                {setupConfig.mode === 'online' && setupConfig.queueType === 'private_room' && activeRoom?.roomCode && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className={cn(
                                      'h-7 rounded-full border-emerald-500/50 bg-emerald-950/60 px-3 text-xs font-black uppercase tracking-wider text-emerald-300 shadow-sm hover:bg-emerald-900/60',
                                      copiedRoomCode === activeRoom.roomCode && 'bg-emerald-900'
                                    )}
                                    onClick={() => void handleCopyRoomCode(activeRoom.roomCode)}
                                  >
                                    {copiedRoomCode === activeRoom.roomCode ? <Check size={12} /> : <Copy size={12} />}
                                    Code: {activeRoom.roomCode}
                                  </Button>
                                )}
                                {(queueActive || privateRoomBusy) && queueWaitSeconds > 0 && (
                                  <span className="text-xs font-mono font-bold text-amber-300 animate-pulse">
                                    ⏱ {formatWaitClock(queueWaitSeconds)}
                                  </span>
                                )}
                              </div>
                            )}
                            {launchState.status === 'error' && (
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-300 bg-rose-950/40 px-3 py-1.5 rounded-xl border border-rose-800">
                                <XCircle size={14} />
                                {launchState.message}
                              </span>
                            )}
                            {launchState.status === 'validating' && (
                              <span className="inline-flex items-center gap-2 text-xs font-bold text-purple-300">
                                <Loader2 size={14} className="animate-spin" /> Preparing battle arena...
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2.5">
                            {canCancelOnlineSession && (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleCancelOnlineSession}
                                disabled={launchState.status === 'validating'}
                                className="rounded-2xl h-12 sm:h-13 border-white/20 font-bold px-4 text-white hover:bg-white/10 cursor-pointer"
                              >
                                {activeRoom ? 'Cancel Room' : 'Leave Queue'}
                              </Button>
                            )}
                            <Button
                              type="button"
                              onClick={submitSetup}
                              disabled={launchState.status === 'validating' || queueActive || privateRoomBusy}
                              className={cn(
                                "rounded-2xl h-12 sm:h-13 flex-1 px-6 font-black uppercase tracking-wider text-xs sm:text-sm shadow-xl hover:scale-[1.01] active:scale-95 transition-all text-white border-0 flex items-center justify-center gap-2 cursor-pointer",
                                setupConfig.mode === 'online'
                                  ? "bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-500/30"
                                  : "bg-gradient-to-r from-sky-500 via-cyan-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 shadow-sky-500/30"
                              )}
                            >
                              {launchState.status === 'validating' ? (
                                <>
                                  <Loader2 size={16} className="animate-spin" />
                                  <span>Entering Arena...</span>
                                </>
                              ) : (
                                <>
                                  <Swords size={16} />
                                  <span>
                                    {setupConfig.mode === 'online' && setupConfig.queueType === 'private_room'
                                      ? (privateRoomCodeInput.trim() ? 'Join Duel Room' : 'Host Duel Room')
                                      : setupConfig.mode === 'online' ? 'Find Duel Opponent' : 'Start Bot Battle'}
                                  </span>
                                </>
                              )}
                            </Button>
                          </div>
                        </div>

                      </div>

                    </div>
                  </div>

                </motion.div>
              </TabsContent>

              <TabsContent value="battle" className="mt-0 outline-none">
                <motion.div
                  key="battle"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="space-y-4"
                >
                  {!activeMatch ? (
                    activeRoom ? (
                      <Card className={cn(cardFrameClass, 'rounded-[18px]')}>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary dark:text-[#9e8fff]" />Private Room Lobby</CardTitle>
                          <CardDescription className="text-muted-foreground dark:text-[#b2bad0]">
                            Room {activeRoom.roomCode} · {activeRoom.participantCount}/2 students connected.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="rounded-xl border border-border bg-muted/30 p-3 dark:border-[#2f3547] dark:bg-[#11151d]">
                            <p className="text-sm font-semibold text-foreground dark:text-[#ecf0fb]">
                              {activeRoom.status === 'ready'
                                ? 'Opponent connected. Syncing start...'
                                : 'Waiting for another student to join this room.'}
                            </p>
                            <p className="text-xs text-muted-foreground dark:text-[#9aa4be]">
                              Share room code {activeRoom.roomCode} with your classmate.
                            </p>
                            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                              {(activeRoom.status === 'waiting' || activeRoom.status === 'ready') && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-8 rounded-lg"
                                  onClick={handleCancelOnlineSession}
                                  disabled={launchState.status === 'validating'}
                                >
                                  Cancel room
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="outline"
                                className="h-8 rounded-lg"
                                onClick={() => void handleCopyRoomCode(activeRoom.roomCode)}
                              >
                                {copiedRoomCode === activeRoom.roomCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                {copiedRoomCode === activeRoom.roomCode ? 'Copied' : 'Copy code'}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ) : queueActive ? (
                      <Card className={cn(cardFrameClass, 'rounded-[18px]')}>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary dark:text-[#9e8fff]" />Public Matchmaking</CardTitle>
                          <CardDescription className="text-muted-foreground dark:text-[#b2bad0]">
                            Searching for a student with the same setup...
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    ) : (
                      <Card className={cn(cardFrameClass, 'rounded-[18px]')}>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2"><Swords className="h-4 w-4 text-primary dark:text-[#9e8fff]" />No active battle</CardTitle>
                          <CardDescription className="text-muted-foreground dark:text-[#b2bad0]">
                            Start from Setup to create a bot match, private room, or public queue session.
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    )
                  ) : (
                    <Card className={cn(cardFrameClass, 'rounded-[18px]')}>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center justify-between gap-3">
                          <span className="inline-flex items-center gap-2">
                            {activeMatch.mode === 'bot'
                              ? <Bot className="h-4 w-4 text-primary dark:text-[#9e8fff]" />
                              : <Users className="h-4 w-4 text-primary dark:text-[#9e8fff]" />}
                            vs {activeMatch.opponentName}
                          </span>
                          <div className="inline-flex items-center gap-2">
                            {isDesignPauseAvailable && activeMatch.status === 'in_progress' && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleToggleDesignPause}
                                className="h-8 rounded-lg"
                              >
                                {designPauseActive ? (
                                  <span className="inline-flex items-center gap-1.5">
                                    <Play className="h-3.5 w-3.5" />
                                    Resume
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5">
                                    <Pause className="h-3.5 w-3.5" />
                                    Pause
                                  </span>
                                )}
                              </Button>
                            )}
                            <span className="text-sm font-bold tabular-nums">{activeMatch.scoreFor} - {activeMatch.scoreAgainst}</span>
                          </div>
                        </CardTitle>
                        <CardDescription className="text-muted-foreground dark:text-[#b2bad0]">
                          {activeMatch.status === 'completed'
                            ? `Completed in ${activeMatch.totalRounds} rounds.`
                            : activeMatch.status === 'ready'
                              ? activeMatch.mode === 'online'
                                ? 'Waiting for both players to confirm and start together.'
                                : 'Finalizing practice bot session start.'
                              : `Round ${activeMatch.currentRound} of ${activeMatch.totalRounds}${designPauseActive ? ' (paused for design)' : ''}`}
                        </CardDescription>
                        {describeLifecycleEvent(activeMatch.lifecycle, studentProfile?.uid) && (
                          <p className="text-xs font-medium text-muted-foreground dark:text-[#9aa4be]">
                            {describeLifecycleEvent(activeMatch.lifecycle, studentProfile?.uid)}
                          </p>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {activeMatch.status === 'ready' && (
                          <div className="rounded-xl border border-border bg-muted/30 p-4 dark:border-[#2f3547] dark:bg-[#11151d] flex flex-col gap-3">
                            <p className="text-sm font-semibold text-foreground dark:text-[#ecf0fb]">
                              {activeMatch.mode === 'online'
                                ? 'Waiting for both players to lock in start...'
                                : 'Starting practice bot round...'}
                            </p>
                            {activeMatch.mode === 'online' && activeMatch.expiresAtMs && (
                              <p className="text-xs font-medium text-muted-foreground dark:text-[#9aa4be]">
                                Public match expires in <span className="font-semibold tabular-nums">{formatWaitClock(queueWaitSeconds)}</span> if the synchronized start does not happen.
                              </p>
                            )}
                            {/* Fallback cancel button prevents the UI from getting stuck if backend readiness fails. */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-rose-500 border-rose-200 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-900/30"
                              onClick={() => {
                                setActiveMatch(null);
                                setActiveRoom(null);
                                setQueueActive(false);
                                setLaunchState({ status: 'idle' });
                                setActiveTab('setup');
                              }}
                            >
                              Force Cancel
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              </TabsContent>

              {/* MATCH HISTORY TAB — CREATIVE ESPORTS GAME UI */}
              <TabsContent value="history" className="mt-0 outline-none">
                <motion.div
                  key="history"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="w-full max-w-7xl 2xl:max-w-[1680px] 3xl:max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 pt-2 sm:pt-4 pb-12 space-y-5 sm:space-y-6 relative z-10 font-body"
                >
                  {(() => {
                    const totalPlayed = historyData.length;
                    const winCount = historyData.filter(h => h.outcome === 'win').length;
                    const lossCount = historyData.filter(h => h.outcome === 'loss').length;
                    const winRatio = totalPlayed > 0 ? Math.round((winCount / totalPlayed) * 100) : 0;
                    const totalXpEarned = historyData.reduce((sum, h) => sum + (h.xpEarned || 0), 0);
                    const recent5 = historyData.slice(0, 5);

                    return (
                      <>
                        {/* TOP UTILITY ROW */}
                        <div className="w-full flex items-center justify-between gap-2 px-1">
                          <button
                            type="button"
                            onClick={() => setActiveTab("hub")}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 hover:text-white backdrop-blur-md border border-white/20 text-xs font-bold transition-all cursor-pointer shadow-xs"
                            aria-label="Back to Arena Hub"
                          >
                            <ChevronRight className="h-4 w-4 rotate-180" />
                            <span>Back to Arena Hub</span>
                          </button>

                          <div className="flex items-center gap-2">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/70 backdrop-blur-md border border-sky-500/30 text-sky-300 text-[11px] font-black uppercase tracking-wider">
                              <History className="w-3.5 h-3.5 text-sky-400" />
                              <span>Match Logs</span>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            </div>

                            <button
                              type="button"
                              onClick={() => setActiveTab('setup')}
                              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                            >
                              <Swords size={13} />
                              <span>1v1 Match</span>
                            </button>
                          </div>
                        </div>

                        {/* RECENT FORM & SUMMARY OVERVIEW CARD */}
                        <div className="relative rounded-3xl bg-slate-900/85 backdrop-blur-2xl border border-purple-500/30 p-5 sm:p-6 shadow-[0_16px_40px_rgba(0,0,0,0.35)] overflow-hidden">
                          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-sky-400 via-purple-500 to-emerald-400" />
                          <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/10 blur-[90px] rounded-full pointer-events-none" />

                          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
                            {/* Left: Recent Form Tracker */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <h2 className="text-xl sm:text-2xl font-black font-display text-white">
                                  Match History
                                </h2>
                                <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-white/10 text-[11px] font-bold text-slate-300">
                                  {totalPlayed} Matches Played
                                </span>
                              </div>

                              {/* Last 5 Matches Visual Beads */}
                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                <span className="text-xs text-slate-400 font-bold mr-1">Recent Form:</span>
                                {recent5.length === 0 ? (
                                  <span className="text-xs text-slate-500 font-medium">No matches yet</span>
                                ) : (
                                  recent5.map((match, idx) => {
                                    const won = match.outcome === 'win';
                                    const lost = match.outcome === 'loss';
                                    return (
                                      <div
                                        key={match.matchId || idx}
                                        title={`vs ${match.opponentName}: ${won ? 'Victory' : lost ? 'Defeat' : 'Draw'}`}
                                        className={cn(
                                          "w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shadow-xs border transition-transform hover:scale-110",
                                          won
                                            ? "bg-emerald-500/20 border-emerald-400/60 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                                            : lost
                                              ? "bg-rose-500/20 border-rose-400/60 text-rose-300"
                                              : "bg-amber-500/20 border-amber-400/60 text-amber-300"
                                        )}
                                      >
                                        {won ? 'W' : lost ? 'L' : 'D'}
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>

                            {/* Right: Key Totals Badges */}
                            <div className="flex items-center gap-3 sm:gap-4 bg-slate-950/60 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/10 w-full lg:w-auto justify-around sm:justify-end">
                              <div className="text-center px-2">
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Wins</p>
                                <p className="text-lg sm:text-xl font-black text-emerald-400 tabular-nums">
                                  {winCount}
                                </p>
                              </div>
                              <div className="h-8 w-px bg-white/15" />
                              <div className="text-center px-2">
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Win Rate</p>
                                <p className="text-lg sm:text-xl font-black text-white tabular-nums">
                                  {winRatio}%
                                </p>
                              </div>
                              <div className="h-8 w-px bg-white/15" />
                              <div className="text-center px-2">
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">XP Gained</p>
                                <p className="text-lg sm:text-xl font-black text-amber-300 tabular-nums">
                                  +{totalXpEarned}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Dynamic Filter Capsule Bar */}
                          <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5">
                            {[
                              { value: 'all', label: `All (${historyData.length})`, icon: Swords },
                              { value: 'online', label: `VS Players (${historyData.filter(h => h.mode === 'online').length})`, icon: Users },
                              { value: 'bot', label: `VS Bot (${historyData.filter(h => h.mode === 'bot').length})`, icon: Bot },
                              { value: 'wins', label: `Wins (${winCount})`, icon: Trophy },
                              { value: 'losses', label: `Losses (${lossCount})`, icon: Shield },
                            ].map((filterItem) => {
                              const Icon = filterItem.icon;
                              const isCurrent = historyFilterMode === filterItem.value;
                              return (
                                <button
                                  key={filterItem.value}
                                  type="button"
                                  // SAFETY: filter values strictly conform to HistoryFilterOption type.
                                  onClick={() => setHistoryFilterMode(filterItem.value as HistoryFilterOption)}
                                  className={cn(
                                    "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                                    isCurrent
                                      ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md font-black"
                                      : "bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/10"
                                  )}
                                >
                                  <Icon size={12} />
                                  <span>{filterItem.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* MATCH CARDS LIST */}
                        <div className="space-y-3.5">
                          {statsLoading ? (
                            <div className="space-y-3">
                              <Skeleton className="h-24 w-full rounded-2xl bg-slate-900/60" />
                              <Skeleton className="h-24 w-full rounded-2xl bg-slate-900/60" />
                              <Skeleton className="h-24 w-full rounded-2xl bg-slate-900/60" />
                            </div>
                          ) : filteredHistory.length === 0 ? (
                            <div className="text-center py-16 px-4 bg-slate-900/60 rounded-3xl border border-dashed border-purple-500/30">
                              <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-950/60 text-purple-400 flex items-center justify-center mb-3 shadow-inner border border-purple-500/30">
                                <Swords size={28} />
                              </div>
                              <h4 className="text-base font-black text-white font-display">No Matches in This Filter</h4>
                              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                                Play a battle against a classmate or practice with the bot to add games here!
                              </p>
                              <Button
                                type="button"
                                onClick={() => setActiveTab('setup')}
                                className="mt-4 h-10 px-5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs cursor-pointer shadow-md"
                              >
                                Play a Match Now
                              </Button>
                            </div>
                          ) : (
                            filteredHistory.map((entry) => {
                              const isWin = entry.outcome === 'win';
                              const isLoss = entry.outcome === 'loss';
                              const roundsCount = entry.rounds || 5;

                              return (
                                <motion.div
                                  key={entry.matchId}
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className={cn(
                                    "relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border transition-all shadow-md hover:shadow-lg backdrop-blur-xl",
                                    isWin
                                      ? "bg-slate-900/85 border-l-4 border-l-emerald-400 border-white/10 hover:border-emerald-500/40"
                                      : isLoss
                                        ? "bg-slate-900/85 border-l-4 border-l-rose-500 border-white/10 hover:border-rose-500/40"
                                        : "bg-slate-900/85 border-l-4 border-l-amber-400 border-white/10 hover:border-amber-500/40"
                                  )}
                                >
                                  {/* Left: Outcome Badge + Opponent Details */}
                                  <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                                    {/* Outcome Badge */}
                                    <div className="shrink-0">
                                      <span
                                        className={cn(
                                          "px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs",
                                          isWin
                                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                                            : isLoss
                                              ? "bg-rose-500/20 text-rose-300 border border-rose-400/40 shadow-[0_0_12px_rgba(244,63,94,0.3)]"
                                              : "bg-amber-500/20 text-amber-300 border border-amber-400/40"
                                        )}
                                      >
                                        {isWin ? <Trophy size={13} /> : isLoss ? <Shield size={13} /> : null}
                                        <span>{isWin ? 'VICTORY' : isLoss ? 'DEFEAT' : 'DRAW'}</span>
                                      </span>
                                    </div>

                                    {/* Opponent Avatar */}
                                    <div className="w-11 h-11 rounded-2xl bg-slate-800 border border-white/15 flex items-center justify-center shrink-0 text-white font-black text-sm">
                                      {entry.mode === 'bot' ? <Bot size={20} className="text-sky-400" /> : <span>{toInitials(entry.opponentName)}</span>}
                                    </div>

                                    {/* Opponent Info & Tags */}
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <h4 className="text-base font-black text-white font-display truncate">
                                          vs {entry.opponentName}
                                        </h4>
                                        <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-white/10 text-[10px] font-bold text-slate-300">
                                          {entry.mode === 'online' ? '1v1 Match' : 'Practice Bot'}
                                        </span>
                                      </div>

                                      <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">
                                        {entry.subjectId}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Center: Match Score & Round Beads */}
                                  <div className="flex items-center gap-4 sm:gap-6 self-start lg:self-center py-1 lg:py-0">
                                    {/* Score */}
                                    <div className="flex items-center gap-2 font-display text-2xl sm:text-3xl font-black tabular-nums">
                                      <span className={isWin ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "text-white"}>
                                        {entry.scoreFor}
                                      </span>
                                      <span className="text-slate-600 font-light">-</span>
                                      <span className={isLoss ? "text-rose-400" : "text-slate-400"}>
                                        {entry.scoreAgainst}
                                      </span>
                                    </div>

                                    {/* Round Beads */}
                                    <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1.5 rounded-xl border border-white/10">
                                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 mr-0.5">Rounds</span>
                                      {Array.from({ length: roundsCount }).map((_, roundIdx) => {
                                        const wonThisRound = roundIdx < entry.scoreFor;
                                        return (
                                          <div
                                            key={roundIdx}
                                            title={`Round ${roundIdx + 1}: ${wonThisRound ? 'Correct' : 'Missed'}`}
                                            className={cn(
                                              "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black transition-transform hover:scale-110",
                                              wonThisRound
                                                ? "bg-emerald-500 text-white shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                                                : "bg-rose-500/70 text-white"
                                            )}
                                          >
                                            {wonThisRound ? '✓' : '—'}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Right: Accuracy, Speed, XP & Rematch Button */}
                                  <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 self-end lg:self-center">
                                    <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-400">
                                      <span>🎯 {entry.accuracy.toFixed(0)}%</span>
                                      {entry.averageResponseMs > 0 && (
                                        <span>⚡ {(entry.averageResponseMs / 1000).toFixed(1)}s</span>
                                      )}
                                    </div>

                                    <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 tabular-nums">
                                      +{entry.xpEarned} XP
                                    </span>

                                    <Button
                                      type="button"
                                      onClick={() => handleDuelAgain(entry.subjectId, entry.mode, entry.difficulty)}
                                      className="h-8 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                                      title="Play again with these settings"
                                    >
                                      <RotateCcw size={12} />
                                      <span>Rematch</span>
                                    </Button>
                                  </div>
                                </motion.div>
                              );
                            })
                          )}
                        </div>
                      </>
                    );
                  })()}
                </motion.div>
              </TabsContent>

              <TabsContent value="stats" className="mt-0 outline-none">
                <motion.div
                  key="stats"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="w-full max-w-7xl 2xl:max-w-[1680px] 3xl:max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-1 sm:pt-3 pb-8 space-y-3 sm:space-y-4 relative z-10 font-body"
                >
                  {(() => {
                    const totalMatches = statsData?.matchesPlayed || 0;
                    const winCount = statsData?.wins || 0;
                    const lossCount = statsData?.losses || 0;
                    const drawCount = statsData?.draws || 0;
                    const winRate = totalMatches > 0 ? Math.round((winCount / totalMatches) * 100) : 0;
                    const accuracy = statsData?.averageAccuracy || 0;
                    const responseTime = statsData?.averageResponseMs || 0;
                    const currentStreak = statsData?.currentStreak || 0;
                    const bestStreak = statsData?.bestStreak || Math.max(currentStreak, winCount);

                    // Find student's standing on the ladder
                    const youRow = leaderboardRows.find((r) => r.isSelf);
                    const ladderRank = youRow?.rank || null;

                    // Duelist Tier Title
                    const getTierInfo = () => {
                      if (totalMatches === 0) {
                        return { title: 'Unranked Contender', tier: 'Unranked', badgeColor: 'bg-slate-800 text-slate-300 border-slate-700', ringColor: 'from-slate-500 to-slate-700', border: 'border-slate-600' };
                      }
                      if (winRate >= 75 && totalMatches >= 5) {
                        return { title: 'Grandmaster Duelist', tier: 'Grandmaster', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-400/40', ringColor: 'from-amber-400 to-yellow-500', border: 'border-amber-400/60' };
                      }
                      if (winRate >= 60) {
                        return { title: 'Diamond Contender', tier: 'Diamond', badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-400/40', ringColor: 'from-sky-400 to-blue-500', border: 'border-sky-400/60' };
                      }
                      if (winRate >= 45) {
                        return { title: 'Gold Strategist', tier: 'Gold', badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/40', ringColor: 'from-yellow-400 to-amber-500', border: 'border-yellow-400/60' };
                      }
                      return { title: 'Bronze Challenger', tier: 'Bronze', badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-400/40', ringColor: 'from-orange-400 to-amber-600', border: 'border-orange-400/60' };
                    };

                    const tierInfo = getTierInfo();

                    // Accuracy Tier
                    const getAccuracyTier = () => {
                      if (accuracy >= 85) return { label: 'S Tier Precision', color: 'text-sky-400' };
                      if (accuracy >= 70) return { label: 'A Tier High Accuracy', color: 'text-emerald-400' };
                      if (accuracy >= 50) return { label: 'B Tier Balanced', color: 'text-amber-400' };
                      return { label: 'Calibrating', color: 'text-slate-400' };
                    };

                    const accuracyTier = getAccuracyTier();

                    // Speed Tier
                    const getSpeedTier = () => {
                      if (responseTime > 0 && responseTime < 3500) return { label: '⚡ Fast Answers', color: 'text-amber-400' };
                      if (responseTime > 0 && responseTime < 6000) return { label: '⚡ Quick Answers', color: 'text-purple-400' };
                      return { label: '⏱️ Careful Solver', color: 'text-slate-300' };
                    };

                    const speedTier = getSpeedTier();

                    // Collectible Badges
                    const badges = [
                      {
                        id: 'reflex',
                        title: 'Lightning Reflexes',
                        desc: 'Solve under 4.0s',
                        icon: Zap,
                        unlocked: responseTime > 0 && responseTime < 4000,
                        progress: responseTime > 0 && responseTime < 4000 ? 'UNLOCKED ✨' : responseTime > 0 ? `${formatResponseTime(responseTime)}` : '0s',
                        color: 'text-amber-400',
                        bg: 'from-amber-500/15 via-yellow-500/5 to-slate-900',
                        border: 'border-amber-500/30',
                      },
                      {
                        id: 'streak',
                        title: 'Win Streak Master',
                        desc: 'Win 3 in a row',
                        icon: Flame,
                        unlocked: bestStreak >= 3,
                        progress: bestStreak >= 3 ? 'UNLOCKED ✨' : `${currentStreak}/3`,
                        color: 'text-rose-400',
                        bg: 'from-rose-500/15 via-orange-500/5 to-slate-900',
                        border: 'border-rose-500/30',
                      },
                      {
                        id: 'accuracy',
                        title: 'Math Marksman',
                        desc: '80%+ accuracy',
                        icon: Target,
                        unlocked: accuracy >= 80,
                        progress: accuracy >= 80 ? 'UNLOCKED ✨' : `${accuracy.toFixed(0)}%/80%`,
                        color: 'text-sky-400',
                        bg: 'from-sky-500/15 via-blue-500/5 to-slate-900',
                        border: 'border-sky-500/30',
                      },
                      {
                        id: 'gladiator',
                        title: 'Match Veteran',
                        desc: 'Play 5+ matches',
                        icon: Trophy,
                        unlocked: totalMatches >= 5,
                        progress: totalMatches >= 5 ? 'UNLOCKED ✨' : `${totalMatches}/5`,
                        color: 'text-emerald-400',
                        bg: 'from-emerald-500/15 via-teal-500/5 to-slate-900',
                        border: 'border-emerald-500/30',
                      },
                    ];

                    return (
                      <>
                        {/* TOP UTILITY ROW */}
                        <div className="w-full flex items-center justify-between gap-2 px-1">
                          <button
                            type="button"
                            onClick={() => setActiveTab("hub")}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 hover:text-white backdrop-blur-md border border-white/20 text-xs font-bold transition-all cursor-pointer shadow-xs"
                            aria-label="Back to Arena Hub"
                          >
                            <ChevronRight className="h-4 w-4 rotate-180" />
                            <span>Back to Arena Hub</span>
                          </button>

                          <div className="flex items-center gap-2">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/70 backdrop-blur-md border border-purple-500/30 text-purple-300 text-[11px] font-black uppercase tracking-wider">
                              <Activity className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                              <span>Player Stats</span>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            </div>

                            <button
                              type="button"
                              onClick={() => setActiveTab('setup')}
                              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                            >
                              <Swords size={13} />
                              <span>1v1 Match</span>
                            </button>
                          </div>
                        </div>

                        {/* COMPACT ESPORTS PLAYER IDENTITY CARD */}
                        <div className="relative rounded-2xl sm:rounded-3xl bg-slate-900/85 backdrop-blur-2xl border border-purple-500/30 p-4 sm:p-5 shadow-[0_12px_32px_rgba(0,0,0,0.3)] overflow-hidden">
                          {/* Accent Top Gradient Line */}
                          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-400 via-rose-400 to-amber-400" />
                          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/15 blur-[80px] rounded-full pointer-events-none" />

                          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
                            {/* Left: Player Avatar, Title, Name, Division */}
                            <div className="flex items-center gap-3.5 sm:gap-4 w-full md:w-auto">
                              <div className="relative shrink-0">
                                <div className={cn(
                                  "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl p-0.5 bg-gradient-to-br border-2 shadow-lg flex items-center justify-center relative overflow-hidden",
                                  tierInfo.ringColor,
                                  tierInfo.border
                                )}>
                                  {studentProfile?.photo ? (
                                    <img src={studentProfile.photo} alt="Profile" className="w-full h-full object-cover rounded-xl" />
                                  ) : (
                                    <CompositeAvatar layers={studentProfile?.avatarLayers || {}} className="w-full h-full object-contain" />
                                  )}
                                </div>
                                <div className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-md bg-slate-950 border border-white/20 text-[9px] font-black text-amber-300 shadow-md uppercase">
                                  {tierInfo.tier}
                                </div>
                              </div>

                              <div className="space-y-0.5 min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className={cn("px-2 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider flex items-center gap-1", tierInfo.badgeColor)}>
                                    <Crown size={10} />
                                    {tierInfo.title}
                                  </span>
                                  {ladderRank && (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-black">
                                      #{ladderRank} Rank
                                    </span>
                                  )}
                                </div>

                                <h2 className="text-xl sm:text-2xl font-black font-display tracking-tight text-white truncate">
                                  {studentProfile?.name || 'Student Duelist'}
                                </h2>

                                <p className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
                                  <span>{[studentProfile?.grade, studentProfile?.section].filter(Boolean).join(' • ') || 'Senior High STEM'}</span>
                                  <span>•</span>
                                  <span className="text-purple-300 font-bold">Math Duelist</span>
                                </p>
                              </div>
                            </div>

                            {/* Right: Circular Win Rate Gauge + Record Slices */}
                            <div className="flex items-center gap-4 sm:gap-5 bg-slate-950/60 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 px-4 border border-white/10 w-full md:w-auto justify-around sm:justify-end">
                              {/* HUD Radial */}
                              <div className="flex items-center gap-2.5">
                                <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                                  <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                                    <path
                                      className="text-slate-800"
                                      strokeWidth="3.5"
                                      stroke="currentColor"
                                      fill="none"
                                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                    <path
                                      className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                                      strokeDasharray={`${winRate}, 100`}
                                      strokeWidth="3.5"
                                      strokeLinecap="round"
                                      stroke="currentColor"
                                      fill="none"
                                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                  </svg>
                                  <div className="absolute flex flex-col items-center">
                                    <span className="font-black text-xs text-white tabular-nums leading-none">
                                      {winRate}%
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Win Rate</p>
                                  <p className="text-sm font-black text-white tabular-nums">
                                    {winCount}W - {lossCount}L
                                  </p>
                                </div>
                              </div>

                              <div className="h-8 w-px bg-white/15" />

                              {/* Battles Fought */}
                              <div className="text-center sm:text-left">
                                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Total Battles</p>
                                <p className="text-lg font-black text-white tabular-nums">
                                  {totalMatches}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 4 COMPACT CORE METRIC SLABS */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
                          {/* 1. Total Wins */}
                          <div className="relative overflow-hidden rounded-2xl p-3.5 sm:p-4 bg-gradient-to-br from-emerald-500/15 via-emerald-950/20 to-slate-900/90 border border-emerald-500/40 shadow-md flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                                <Trophy size={12} className="text-emerald-400" /> Wins
                              </span>
                              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-500/30">
                                <Trophy size={12} />
                              </div>
                            </div>
                            <div>
                              <p className="text-2xl sm:text-3xl font-black font-display text-white tabular-nums tracking-tight">
                                {winCount}
                              </p>
                              <div className="mt-1.5 flex items-center justify-between text-[10px] font-bold text-emerald-400">
                                <span>{winRate}% Ratio</span>
                                <span className="text-slate-400">{lossCount} Defeats</span>
                              </div>
                            </div>
                          </div>

                          {/* 2. Win Streak */}
                          <div className="relative overflow-hidden rounded-2xl p-3.5 sm:p-4 bg-gradient-to-br from-rose-500/15 via-orange-950/20 to-slate-900/90 border border-rose-500/40 shadow-md flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-rose-400 flex items-center gap-1">
                                <Flame size={12} className={currentStreak >= 2 ? "animate-pulse text-orange-400" : "text-rose-400"} /> Streak
                              </span>
                              <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-300 flex items-center justify-center border border-rose-500/30">
                                <Flame size={12} className={currentStreak >= 2 ? "animate-pulse" : ""} />
                              </div>
                            </div>
                            <div>
                              <div className="flex items-baseline gap-1.5">
                                <p className="text-2xl sm:text-3xl font-black font-display text-white tabular-nums tracking-tight">
                                  {currentStreak}
                                </p>
                                <span className="text-[10px] font-bold text-rose-300">Active</span>
                              </div>
                              <p className="text-[10px] font-bold text-rose-400 mt-1 flex items-center gap-1">
                                <Sparkles size={10} /> Best: {bestStreak} Wins
                              </p>
                            </div>
                          </div>

                          {/* 3. Accuracy */}
                          <div className="relative overflow-hidden rounded-2xl p-3.5 sm:p-4 bg-gradient-to-br from-sky-500/15 via-blue-950/20 to-slate-900/90 border border-sky-500/40 shadow-md flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-sky-400 flex items-center gap-1">
                                <Target size={12} className="text-sky-400" /> Accuracy
                              </span>
                              <div className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-300 flex items-center justify-center border border-sky-500/30">
                                <Target size={12} />
                              </div>
                            </div>
                            <div>
                              <p className="text-2xl sm:text-3xl font-black font-display text-white tabular-nums tracking-tight">
                                {accuracy.toFixed(1)}%
                              </p>
                              <p className={cn("text-[10px] font-bold mt-1 flex items-center gap-1", accuracyTier.color)}>
                                <ShieldCheck size={11} /> {accuracyTier.label}
                              </p>
                            </div>
                          </div>

                          {/* 4. Solve Speed */}
                          <div className="relative overflow-hidden rounded-2xl p-3.5 sm:p-4 bg-gradient-to-br from-purple-500/15 via-indigo-950/20 to-slate-900/90 border border-purple-500/40 shadow-md flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-purple-400 flex items-center gap-1">
                                <Zap size={12} className="text-amber-400" /> Speed
                              </span>
                              <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center border border-purple-500/30">
                                <Zap size={12} />
                              </div>
                            </div>
                            <div>
                              <p className="text-2xl sm:text-3xl font-black font-display text-white tabular-nums tracking-tight">
                                {formatResponseTime(responseTime)}
                              </p>
                              <p className={cn("text-[10px] font-bold mt-1 flex items-center gap-1", speedTier.color)}>
                                <Clock3 size={11} /> {speedTier.label}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* COMPACT DEEP DIVE FORMATION (2-COLUMN GRID) */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4">
                          {/* LEFT COLUMN: MATCH RECORD & QUICK TIPS (7 cols) */}
                          <div className="lg:col-span-7 space-y-3 sm:space-y-3.5">
                            {/* Match Record Card */}
                            <div className="rounded-2xl sm:rounded-3xl bg-slate-900/85 backdrop-blur-2xl border border-purple-500/30 p-4 sm:p-5 shadow-lg relative overflow-hidden">
                              <div className="flex items-center justify-between mb-2.5">
                                <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                                  <Trophy size={14} className="text-amber-400" /> Combat Record
                                </h4>
                                <span className="text-[11px] font-bold text-slate-400">
                                  {totalMatches} Total Matches
                                </span>
                              </div>

                              {/* Segmented Combat Ratio Bar */}
                              <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex p-0.5 border border-white/10 shadow-inner">
                                <div
                                  title={`Wins: ${winCount}`}
                                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-l-full transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                  style={{ width: `${totalMatches ? Math.max(2, Math.round((winCount / totalMatches) * 100)) : 0}%` }}
                                />
                                {drawCount > 0 && (
                                  <div
                                    title={`Draws: ${drawCount}`}
                                    className="h-full bg-gradient-to-r from-amber-400 to-yellow-400 transition-all duration-500"
                                    style={{ width: `${totalMatches ? Math.round((drawCount / totalMatches) * 100) : 0}%` }}
                                  />
                                )}
                                <div
                                  title={`Losses: ${lossCount}`}
                                  className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-r-full transition-all duration-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"
                                  style={{ width: `${totalMatches ? Math.max(2, Math.round((lossCount / totalMatches) * 100)) : 0}%` }}
                                />
                              </div>

                              {/* 3 Mini Status Readouts */}
                              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-xs">
                                <div className="p-2 rounded-xl bg-slate-950/60 border border-emerald-500/20 text-center">
                                  <span className="text-[10px] text-emerald-400 font-bold block">Wins</span>
                                  <p className="text-base font-black text-white tabular-nums leading-tight">
                                    {winCount} <span className="text-[10px] font-normal text-slate-400">({winRate}%)</span>
                                  </p>
                                </div>

                                <div className="p-2 rounded-xl bg-slate-950/60 border border-rose-500/20 text-center">
                                  <span className="text-[10px] text-rose-400 font-bold block">Losses</span>
                                  <p className="text-base font-black text-white tabular-nums leading-tight">
                                    {lossCount} <span className="text-[10px] font-normal text-slate-400">({totalMatches ? Math.round((lossCount / totalMatches) * 100) : 0}%)</span>
                                  </p>
                                </div>

                                <div className="p-2 rounded-xl bg-slate-950/60 border border-amber-500/20 text-center">
                                  <span className="text-[10px] text-amber-400 font-bold block">Draws</span>
                                  <p className="text-base font-black text-white tabular-nums leading-tight">
                                    {drawCount}
                                  </p>
                                </div>
                              </div>

                              {/* Quick Battle Tips (Compact) */}
                              <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1.5">
                                <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/50 border border-white/5 text-[11px] text-slate-300">
                                  <Flame size={13} className="text-orange-400 shrink-0" />
                                  <span className="truncate">
                                    {currentStreak >= 2 ? `Active ${currentStreak}-game win streak! Momentum multiplier active.` : 'Win matches consecutively to trigger multiplier bonuses.'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/50 border border-white/5 text-[11px] text-slate-300">
                                  <Zap size={13} className="text-amber-400 shrink-0" />
                                  <span className="truncate">Answers submitted within 5 seconds earn lightning speed bonus XP.</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* RIGHT COLUMN: ARENA BADGES & TROPHY CASE (5 cols) */}
                          <div className="lg:col-span-5">
                            <div className="rounded-2xl sm:rounded-3xl bg-slate-900/85 backdrop-blur-2xl border border-purple-500/30 p-4 sm:p-5 shadow-lg relative overflow-hidden h-full flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                                      <Award size={14} />
                                    </div>
                                    <div>
                                      <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                                        Badges
                                      </h4>
                                    </div>
                                  </div>

                                  <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold text-[10px]">
                                    {badges.filter(b => b.unlocked).length} / {badges.length} Unlocked
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {badges.map((badge) => {
                                    const IconComponent = badge.icon;
                                    return (
                                      <div
                                        key={badge.id}
                                        className={cn(
                                          "p-2.5 rounded-xl border bg-gradient-to-r flex items-center justify-between gap-2",
                                          badge.bg,
                                          badge.border,
                                          badge.unlocked ? "shadow-sm" : "opacity-75"
                                        )}
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <div className={cn(
                                            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border",
                                            badge.unlocked
                                              ? "bg-slate-900 shadow-xs border-white/20"
                                              : "bg-slate-950/80 border-white/10 text-slate-600"
                                          )}>
                                            <IconComponent size={13} className={badge.unlocked ? badge.color : "text-slate-500"} />
                                          </div>
                                          <div className="min-w-0">
                                            <p className="text-[11px] font-black text-white truncate leading-tight">
                                              {badge.title}
                                            </p>
                                            <p className="text-[9px] text-slate-400 truncate">
                                              {badge.desc}
                                            </p>
                                          </div>
                                        </div>

                                        <span className={cn(
                                          "px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shrink-0",
                                          badge.unlocked
                                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
                                            : "bg-slate-800/80 text-slate-400 border border-white/10"
                                        )}>
                                          {badge.progress}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="pt-3 mt-3 border-t border-slate-800/80 flex gap-2">
                                <Button
                                  type="button"
                                  onClick={() => setActiveTab('setup')}
                                  className="flex-1 h-8 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                                >
                                  <Swords size={12} />
                                  <span>1v1 Match</span>
                                </Button>
                                <Button
                                  type="button"
                                  onClick={() => handleDuelAgain(undefined, 'bot')}
                                  className="flex-1 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  <Bot size={12} />
                                  <span>Practice Bot</span>
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </motion.div>
              </TabsContent>

                <TabsContent value="leaderboard" className="mt-0 outline-none">
                  <motion.div
                    key="leaderboard"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    className="w-full relative min-h-full lg:h-full lg:overflow-hidden flex flex-col font-body text-slate-900"
                  >
                    {/* TABLET & MOBILE STICKY PLACEMENT PILLS (CONNECTS SEAMLESSLY TO HEADER) */}
                    <AnimatePresence>
                      {showStickyPodiumPills && (
                        <motion.div
                          key="hof-sticky-podium-header"
                          initial={{ y: -30, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: -30, opacity: 0 }}
                          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                          className="fixed top-[50px] sm:top-[58px] inset-x-0 z-40 w-full bg-slate-900/95 backdrop-blur-xl border-b border-purple-500/30 shadow-xl py-2 px-3 flex items-center justify-center gap-1.5 sm:gap-3 pointer-events-auto"
                        >
                          {/* Pill 2: 2nd Place Silver */}
                          {leaderboardRows[1] && (
                            <div className="flex-1 min-w-0 max-w-[125px] sm:max-w-[155px] flex items-center gap-1.5 p-1.5 rounded-full bg-slate-800/90 border border-slate-400/50 shadow-xs">
                              <div className="w-5 h-5 rounded-full bg-slate-300 text-slate-900 flex items-center justify-center text-[10px] font-black shrink-0">
                                2
                              </div>
                              <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-300 shrink-0">
                                {renderDuelistAvatar(leaderboardRows[1].photo, leaderboardRows[1].displayName)}
                              </div>
                              <div className="min-w-0 flex-1 text-left">
                                <p className="text-[10px] sm:text-[11px] font-bold text-white truncate leading-tight">
                                  {leaderboardRows[1].displayName.split(' ')[0]}
                                </p>
                                <p className="text-[9px] text-slate-300 tabular-nums leading-tight">
                                  {leaderboardRows[1].scoreLabel}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Pill 1: 1st Place Gold */}
                          {leaderboardRows[0] && (
                            <div className="flex-1 min-w-0 max-w-[140px] sm:max-w-[175px] flex items-center gap-1.5 p-1.5 rounded-full bg-gradient-to-r from-amber-500/25 to-yellow-500/25 border-2 border-amber-400 shadow-md">
                              <div className="w-5 h-5 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center text-[10px] font-black shrink-0">
                                👑
                              </div>
                              <div className="w-6 h-6 rounded-full overflow-hidden border border-amber-400 shrink-0">
                                {renderDuelistAvatar(leaderboardRows[0].photo, leaderboardRows[0].displayName)}
                              </div>
                              <div className="min-w-0 flex-1 text-left">
                                <p className="text-[10px] sm:text-[11px] font-black text-amber-200 truncate leading-tight">
                                  {leaderboardRows[0].displayName.split(' ')[0]}
                                </p>
                                <p className="text-[9px] font-bold text-amber-300 tabular-nums leading-tight">
                                  {leaderboardRows[0].scoreLabel}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Pill 3: 3rd Place Bronze */}
                          {leaderboardRows[2] && (
                            <div className="flex-1 min-w-0 max-w-[125px] sm:max-w-[155px] flex items-center gap-1.5 p-1.5 rounded-full bg-slate-800/90 border border-amber-600/50 shadow-xs">
                              <div className="w-5 h-5 rounded-full bg-amber-700 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                                3
                              </div>
                              <div className="w-6 h-6 rounded-full overflow-hidden border border-amber-600 shrink-0">
                                {renderDuelistAvatar(leaderboardRows[2].photo, leaderboardRows[2].displayName)}
                              </div>
                              <div className="min-w-0 flex-1 text-left">
                                <p className="text-[10px] sm:text-[11px] font-bold text-white truncate leading-tight">
                                  {leaderboardRows[2].displayName.split(' ')[0]}
                                </p>
                                <p className="text-[9px] text-slate-300 tabular-nums leading-tight">
                                  {leaderboardRows[2].scoreLabel}
                                </p>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* MAIN SPLIT LAYOUT (ADAPTS SEAMLESSLY TO AVAILABLE SCREEN SPACE) */}
                    <div className="w-full max-w-7xl 2xl:max-w-[1680px] 3xl:max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 pt-2 sm:pt-4 lg:pt-5 pb-4 flex-1 lg:h-full lg:overflow-hidden flex flex-col lg:flex-row lg:items-stretch lg:gap-8 relative z-10">
                    
                    {/* LEFT COLUMN: TOP 1, 2, 3 PODIUMS & COMPACT TITLE STACK */}
                    <div className="flex-1 flex flex-col items-center justify-between min-h-0 lg:py-1 relative">
                      
                      {/* Compact Header Stack: Back to Hub + Arena Champions Badge + Title + Time Filter */}
                      <div className="w-full flex flex-col items-center text-center mb-1">
                        {/* Top Utility Row */}
                        <div className="w-full flex items-center justify-between mb-1.5 px-1">
                          <button
                            type="button"
                            onClick={() => setActiveTab("hub")}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 hover:text-white backdrop-blur-md border border-white/20 text-xs font-bold transition-all cursor-pointer shadow-xs"
                            aria-label="Back to Hub"
                          >
                            <ChevronRight className="h-4 w-4 rotate-180" />
                            <span>Back to Arena Hub</span>
                          </button>

                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-amber-200 text-[11px] font-black uppercase tracking-wider">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                            <span>Battle Arena Champions</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          </div>
                        </div>

                        {/* Title */}
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black tracking-tight text-white drop-shadow-[0_3px_12px_rgba(40,10,80,0.5)] mb-2">
                          Hall of Fame
                        </h1>

                        {/* Filter Pill: All Time vs Season 1 */}
                        <div className="bg-white/15 backdrop-blur-xl rounded-full p-1 flex gap-1 shadow-sm border border-white/20 mb-2">
                          <button
                            type="button"
                            onClick={() => setHallOfFameTimeFilter('all')}
                            className={cn(
                              "px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer",
                              hallOfFameTimeFilter === 'all'
                                ? "bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black shadow-md"
                                : "text-white/80 hover:text-white hover:bg-white/10"
                            )}
                          >
                            All Time
                          </button>
                          <button
                            type="button"
                            onClick={() => setHallOfFameTimeFilter('weekly')}
                            className={cn(
                              "px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer",
                              hallOfFameTimeFilter === 'weekly'
                                ? "bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black shadow-md"
                                : "text-white/80 hover:text-white hover:bg-white/10"
                            )}
                          >
                            Season 1
                          </button>
                        </div>
                      </div>

                      {/* 3D CYLINDRICAL PODIUMS */}
                      <div ref={hallOfFamePodiumRef} className="w-full max-w-[620px] flex items-end justify-center gap-3 sm:gap-6 my-auto pt-1 pb-1 relative">
                        {/* 2ND PLACE (SILVER) */}
                        <motion.div
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1, type: 'spring', stiffness: 90 }}
                          className="flex flex-col items-center relative z-10 w-[30%] max-w-[180px]"
                        >
                          <div className="flex flex-col items-center mb-1 relative z-30 w-full">
                            <div className="relative flex flex-col items-center">
                              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full p-1 bg-gradient-to-br from-white via-slate-200 to-slate-400 border-[3.5px] border-white shadow-[0_8px_24px_rgba(148,163,184,0.7),inset_0_2px_4px_rgba(255,255,255,0.9)] flex items-center justify-center relative">
                                <div className="w-full h-full rounded-full overflow-hidden bg-slate-800 border-2 border-slate-300">
                                  {renderDuelistAvatar(leaderboardRows[1]?.photo, leaderboardRows[1]?.displayName || '---')}
                                </div>
                                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-gradient-to-b from-slate-100 to-slate-300 border-2 border-white shadow-md flex items-center justify-center font-black text-[11px] text-slate-800">
                                  2
                                </div>
                              </div>
                              <div className="flex gap-1 -mt-0.5 z-[-1] pointer-events-none">
                                <div className="w-2.5 h-3.5 bg-gradient-to-b from-slate-400 to-slate-600 rounded-b-xs rotate-12 shadow-sm" />
                                <div className="w-2.5 h-3.5 bg-gradient-to-b from-slate-400 to-slate-600 rounded-b-xs -rotate-12 shadow-sm" />
                              </div>
                            </div>

                            <h3 className="font-display font-black text-white text-xs sm:text-sm drop-shadow-[0_2px_4px_rgba(20,10,40,0.7)] text-center mt-2 max-w-[120px] truncate">
                              {leaderboardRows[1]?.displayName || '---'}
                              {leaderboardRows[1]?.isSelf && ' (You)'}
                            </h3>
                          </div>

                          <div className="px-2.5 py-0.5 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/60 text-white font-bold text-[11px] shadow-sm uppercase tracking-wider relative z-30 mb-2">
                            <span className="tabular-nums font-black">{leaderboardRows[1]?.scoreLabel || '0 pts'}</span>
                          </div>

                          <div className="w-full relative flex flex-col items-center">
                            <div className="w-full h-8 sm:h-9 rounded-[50%] bg-gradient-to-b from-white via-slate-100 to-slate-300 border-2 border-white shadow-[inset_0_2px_5px_rgba(255,255,255,0.95),0_3px_8px_rgba(71,85,105,0.3)] relative z-20 flex items-center justify-center">
                              <div className="w-[82%] h-[58%] rounded-[50%] border border-white/70 bg-white/40" />
                            </div>
                            <div className="w-full h-[90px] sm:h-[110px] lg:h-[115px] -mt-4 rounded-b-[24px] sm:rounded-b-[30px] bg-gradient-to-r from-slate-400 via-slate-100 via-slate-200 to-slate-400 relative shadow-[0_16px_32px_rgba(0,0,0,0.25)] flex flex-col items-center justify-end pb-3 overflow-hidden border-b-2 border-slate-300">
                              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1/3 bg-white/40 blur-[2px] pointer-events-none" />
                              <span className="text-white font-black text-4xl sm:text-5xl select-none tabular-nums drop-shadow-[0_2px_10px_rgba(100,116,139,0.5)] relative z-10 leading-none">
                                2
                              </span>
                            </div>
                            <div className="w-[88%] h-3 rounded-[50%] bg-black/20 blur-xs -mt-1.5 relative z-0" />
                          </div>
                        </motion.div>

                        {/* 1ST PLACE (GOLD) */}
                        <motion.div
                          initial={{ opacity: 0, y: 40 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.05, type: 'spring', stiffness: 100 }}
                          className="flex flex-col items-center relative z-20 w-[38%] max-w-[220px]"
                        >
                          <div className="flex flex-col items-center mb-1 relative z-30 w-full">
                            <motion.div
                              animate={{ y: [0, -5, 0] }}
                              transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                              className="mb-[-14px] z-40"
                            >
                              <Crown size={38} className="text-yellow-300 fill-yellow-400 drop-shadow-[0_0_18px_rgba(250,204,21,1)]" />
                            </motion.div>

                            <div className="relative flex flex-col items-center">
                              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full p-1 bg-gradient-to-br from-yellow-200 via-amber-400 to-yellow-600 border-4 border-yellow-200 shadow-[0_10px_32px_rgba(245,158,11,0.85),inset_0_2px_6px_rgba(255,255,255,0.95)] flex items-center justify-center relative">
                                <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 border-2 border-yellow-300">
                                  {renderDuelistAvatar(leaderboardRows[0]?.photo, leaderboardRows[0]?.displayName || '---')}
                                </div>
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-gradient-to-b from-yellow-300 via-amber-400 to-yellow-500 border-2 border-white shadow-lg flex items-center justify-center font-black text-xs text-amber-950">
                                  1
                                </div>
                              </div>
                              <div className="flex gap-1.5 -mt-1 z-[-1] pointer-events-none">
                                <div className="w-3 h-4.5 bg-gradient-to-b from-amber-500 to-amber-700 rounded-b-xs rotate-12 shadow-sm" />
                                <div className="w-3 h-4.5 bg-gradient-to-b from-amber-500 to-amber-700 rounded-b-xs -rotate-12 shadow-sm" />
                              </div>
                            </div>

                            <h3 className="font-display font-black text-white text-sm sm:text-base drop-shadow-[0_2px_4px_rgba(20,10,40,0.7)] text-center mt-2 max-w-[140px] truncate">
                              {leaderboardRows[0]?.displayName || '---'}
                              {leaderboardRows[0]?.isSelf && ' (You)'}
                            </h3>
                          </div>

                          <div className="px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-amber-950 font-black text-xs sm:text-[13px] shadow-md border border-yellow-100 flex items-center gap-1.5 uppercase tracking-wider relative z-30 mb-2">
                            <span className="text-[10px] text-amber-900/80">SCORE</span>
                            <span className="tabular-nums font-black">{leaderboardRows[0]?.scoreLabel || '0 pts'}</span>
                          </div>

                          <div className="w-full relative flex flex-col items-center">
                            <div className="w-full h-9 sm:h-10 rounded-[50%] bg-gradient-to-b from-yellow-100 via-amber-200 to-yellow-400 border-2 border-yellow-100 shadow-[inset_0_2px_6px_rgba(255,255,255,0.95),0_3px_10px_rgba(180,83,9,0.35)] relative z-20 flex items-center justify-center">
                              <div className="w-[84%] h-[60%] rounded-[50%] border border-yellow-100/70 bg-white/40" />
                            </div>
                            <div className="w-full h-[125px] sm:h-[150px] lg:h-[160px] -mt-4.5 rounded-b-[28px] sm:rounded-b-[36px] bg-gradient-to-r from-amber-500 via-yellow-200 via-amber-300 to-amber-600 relative shadow-[0_20px_40px_rgba(0,0,0,0.3)] flex flex-col items-center justify-end pb-4 overflow-hidden border-b-2 border-amber-400">
                              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1/3 bg-white/45 blur-[3px] pointer-events-none" />
                              <span className="text-white font-black text-5xl sm:text-6xl select-none tabular-nums drop-shadow-[0_2px_12px_rgba(245,158,11,0.6)] relative z-10 leading-none">
                                1
                              </span>
                            </div>
                            <div className="w-[88%] h-3.5 rounded-[50%] bg-black/25 blur-xs -mt-1.5 relative z-0" />
                          </div>
                        </motion.div>

                        {/* 3RD PLACE (BRONZE) */}
                        <motion.div
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15, type: 'spring', stiffness: 90 }}
                          className="flex flex-col items-center relative z-10 w-[30%] max-w-[180px]"
                        >
                          <div className="flex flex-col items-center mb-1 relative z-30 w-full">
                            <div className="relative flex flex-col items-center">
                              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full p-1 bg-gradient-to-br from-amber-200 via-orange-500 to-amber-800 border-[3.5px] border-orange-200 shadow-[0_8px_24px_rgba(180,83,9,0.7),inset_0_2px_4px_rgba(255,255,255,0.9)] flex items-center justify-center relative">
                                <div className="w-full h-full rounded-full overflow-hidden bg-slate-800 border-2 border-amber-600">
                                  {renderDuelistAvatar(leaderboardRows[2]?.photo, leaderboardRows[2]?.displayName || '---')}
                                </div>
                                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-gradient-to-b from-amber-600 to-amber-800 border-2 border-white shadow-md flex items-center justify-center font-black text-[11px] text-white">
                                  3
                                </div>
                              </div>
                              <div className="flex gap-1 -mt-0.5 z-[-1] pointer-events-none">
                                <div className="w-2.5 h-3.5 bg-gradient-to-b from-amber-700 to-amber-900 rounded-b-xs rotate-12 shadow-sm" />
                                <div className="w-2.5 h-3.5 bg-gradient-to-b from-amber-700 to-amber-900 rounded-b-xs -rotate-12 shadow-sm" />
                              </div>
                            </div>

                            <h3 className="font-display font-black text-white text-xs sm:text-sm drop-shadow-[0_2px_4px_rgba(20,10,40,0.7)] text-center mt-2 max-w-[120px] truncate">
                              {leaderboardRows[2]?.displayName || '---'}
                              {leaderboardRows[2]?.isSelf && ' (You)'}
                            </h3>
                          </div>

                          <div className="px-2.5 py-0.5 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/60 text-white font-bold text-[11px] shadow-sm uppercase tracking-wider relative z-30 mb-2">
                            <span className="tabular-nums font-black">{leaderboardRows[2]?.scoreLabel || '0 pts'}</span>
                          </div>

                          <div className="w-full relative flex flex-col items-center">
                            <div className="w-full h-8 sm:h-9 rounded-[50%] bg-gradient-to-b from-amber-100 via-amber-200 to-amber-400 border-2 border-amber-200 shadow-[inset_0_2px_5px_rgba(255,255,255,0.95),0_3px_8px_rgba(180,83,9,0.3)] relative z-20 flex items-center justify-center">
                              <div className="w-[82%] h-[58%] rounded-[50%] border border-amber-200/70 bg-white/40" />
                            </div>
                            <div className="w-full h-[75px] sm:h-[90px] lg:h-[95px] -mt-4 rounded-b-[24px] sm:rounded-b-[30px] bg-gradient-to-r from-amber-700 via-amber-400 via-amber-500 to-amber-700 relative shadow-[0_16px_32px_rgba(0,0,0,0.25)] flex flex-col items-center justify-end pb-3 overflow-hidden border-b-2 border-amber-600">
                              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1/3 bg-white/40 blur-[2px] pointer-events-none" />
                              <span className="text-white font-black text-4xl sm:text-5xl select-none tabular-nums drop-shadow-[0_2px_10px_rgba(180,83,9,0.5)] relative z-10 leading-none">
                                3
                              </span>
                            </div>
                            <div className="w-[88%] h-3 rounded-[50%] bg-black/20 blur-xs -mt-1.5 relative z-0" />
                          </div>
                        </motion.div>
                      </div>

                      {/* Bottom Alert Banner: You vs Nemesis / Next Rank */}
                      {(() => {
                        const youRow = leaderboardRows.find((r) => r.isSelf);
                        const youIdx = leaderboardRows.findIndex((r) => r.isSelf);
                        const yourRank = youRow?.rank || (leaderboardRows.length + 1);
                        const rivalDuelist = youIdx > 0 ? leaderboardRows[youIdx - 1] : null;
                        const rivalPointGap = rivalDuelist && youRow ? Math.max(0, rivalDuelist.leaderboardScore - youRow.leaderboardScore) : 0;

                        return (
                          <div className="w-full max-w-[540px] bg-slate-900/70 backdrop-blur-md rounded-2xl p-2.5 px-4 border border-white/20 flex items-center justify-between gap-3 text-white shadow-md mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-7 h-7 rounded-xl bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                                #{yourRank}
                              </span>
                              <p className="text-xs font-bold truncate">
                                {rivalDuelist
                                  ? `Only ${rivalPointGap} pts needed to overtake ${rivalDuelist.displayName}!`
                                  : youIdx === 0
                                    ? '👑 You hold the #1 Crown! Keep dominating arena duels!'
                                    : 'Duel peers and bots to earn points and claim your podium spot!'}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDuelAgain(undefined, 'online')}
                              className="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 text-xs font-black shrink-0 transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              <Zap size={12} className="text-slate-950 fill-slate-950" />
                              <span>Battle</span>
                            </button>
                          </div>
                        );
                      })()}
                    </div>

                    {/* RIGHT COLUMN: FIXED-HEIGHT CARD CONTAINER (ONLY INNER LIST SCROLLS) */}
                    <div className="w-full lg:w-[390px] xl:w-[430px] shrink-0 mt-6 lg:mt-0 flex flex-col h-auto lg:h-full min-h-0">
                      <div className="w-full bg-slate-900/90 backdrop-blur-2xl rounded-3xl p-4 sm:p-5 border border-purple-500/30 shadow-[0_18px_45px_rgba(0,0,0,0.25)] flex flex-col h-auto lg:h-full min-h-0 relative overflow-hidden">
                        {/* Top Accent Gradient Line */}
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600" />

                        {/* Panel Header */}
                        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 shrink-0">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-2xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-xs">
                              <Trophy className="w-4 h-4" />
                            </div>
                            <div>
                              <h3 className="font-display font-black text-white text-base leading-snug">
                                Arena Standings
                              </h3>
                              <p className="text-[11px] text-slate-400 leading-tight">
                                Senior High STEM Duelists
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 font-bold text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            <span>{Math.max(0, leaderboardRows.length - 3)} Duelists</span>
                          </div>
                        </div>

                        {/* Scrollable Rankings List */}
                        <div className="flex-1 min-h-0 max-h-[360px] lg:max-h-none overflow-y-auto space-y-2.5 pr-2 pt-3 [scrollbar-width:thin] [scrollbar-color:#f59e0b_#1e293b] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-800/60 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-amber-600 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-amber-500">
                          {leaderboardRows.slice(3).map((entry, index) => {
                            const actualRank = entry.rank || index + 4;
                            const isTopTen = actualRank <= 10;
                            return (
                              <motion.div
                                key={entry.userId}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: Math.min(index * 0.03, 0.25) }}
                                className={cn(
                                  "flex items-center gap-3 p-3 rounded-2xl border transition-all duration-200 group",
                                  entry.isSelf
                                    ? "border-amber-400 bg-gradient-to-r from-amber-950/50 to-orange-950/40 shadow-md ring-2 ring-amber-400/20"
                                    : "bg-slate-800/80 border-slate-700/80 shadow-xs hover:shadow-md hover:bg-slate-800 hover:border-amber-800"
                                )}
                              >
                                {/* Rank Badge */}
                                <div
                                  className={cn(
                                    "w-8 h-8 rounded-xl flex items-center justify-center font-display font-black text-xs tabular-nums shrink-0 shadow-xs",
                                    isTopTen
                                      ? "bg-gradient-to-br from-amber-900/60 to-orange-900/60 text-amber-300 border border-amber-700/60"
                                      : "bg-slate-700/80 text-slate-300"
                                  )}
                                >
                                  {actualRank}
                                </div>

                                {/* Avatar */}
                                <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center overflow-hidden shrink-0 border-2 border-slate-600 group-hover:border-amber-300 transition-colors">
                                  {renderDuelistAvatar(entry.photo, entry.displayName)}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0 pr-1">
                                  <div className="flex items-center gap-1.5">
                                    <h4 className="font-display font-bold text-white text-xs sm:text-sm truncate">
                                      {entry.displayName}
                                    </h4>
                                    {entry.isSelf && (
                                      <span className="text-[8px] uppercase tracking-wider bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded-full font-black shrink-0 shadow-xs">
                                        You
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-slate-400">
                                      {entry.winRate.toFixed(0)}% Win
                                    </span>
                                    {entry.bestStreak > 0 && (
                                      <>
                                        <span className="text-[9px] text-slate-600">•</span>
                                        <span className="text-[10px] text-rose-500 flex items-center gap-0.5 font-bold">
                                          <Flame size={10} className="fill-rose-500" /> {entry.bestStreak}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Score Badge */}
                                <div className="text-right shrink-0 flex flex-col items-end">
                                  <div className="px-2 py-0.5 rounded-lg bg-amber-950/50 border border-amber-900/40 flex items-center gap-1">
                                    <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
                                    <p className="text-xs font-display font-black text-amber-200 tabular-nums">
                                      {entry.scoreLabel}
                                    </p>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}

                          {leaderboardRows.length <= 3 && (
                            <div className="text-center py-12">
                              <p className="text-slate-400 text-xs font-medium">No other contenders found.</p>
                            </div>
                          )}
                        </div>

                        {/* Quick Action Footer inside Right Card */}
                        <div className="pt-3 mt-2 border-t border-slate-800 flex gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleDuelAgain(undefined, 'online')}
                            className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Swords size={13} />
                            <span>Enter Duel</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuelAgain(undefined, 'bot')}
                            className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Bot size={13} />
                            <span>Practice Bot</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </WarpBackground>
    </>
  );
};

export default QuizBattlePage;
