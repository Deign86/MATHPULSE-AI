import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
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
} from 'lucide-react';
import { WarpBackground } from './ui/warp-background';
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
import { BattleHeader } from './battle/BattleHeader';
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
  .animate-mascot-float { animation: mascot-float 4s ease-in-out infinite; }
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
`;
const PUBLIC_MATCHMAKING_TIMEOUT_MS = 5 * 60 * 1000;

const RainStorm: React.FC<{ viewportHeight: number }> = ({ viewportHeight }) => (
  <div className="absolute inset-0 pointer-events-none z-[50] overflow-hidden flex justify-between bg-slate-900/10">
    {[...Array(40)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-0.5 h-16 bg-blue-300/40 rounded-full e-left-top"
        style={{ ['--left' as any]: `${Math.random() * 100}%`, ['--top' as any]: '-10%' }}
        animate={{ y: [0, viewportHeight * 1.2] }}
        transition={{
          duration: 0.6 + Math.random() * 0.4,
          repeat: Infinity,
          ease: 'linear',
          delay: Math.random() * 2,
        }}
      />
    ))}
  </div>
);

const ConfettiBurst: React.FC<{ viewportHeight: number; viewportWidth: number }> = ({ viewportHeight, viewportWidth }) => {
  const colors = ['#10b981', '#8b5cf6', '#0ea5e9', '#f43f5e', '#f59e0b'];
  return (
    <div className="absolute inset-0 pointer-events-none z-[50] overflow-hidden">
      {[...Array(60)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute bottom-[-10%] w-3 h-5 rounded-sm shadow-md e-left-top e-bg"
          style={{ ['--left' as any]: `${20 + Math.random() * 60}%`, ['--bg' as any]: colors[i % colors.length] }}
          animate={{
            y: [0, -viewportHeight * (0.6 + Math.random() * 0.4), viewportHeight * 0.5],
            x: [0, (Math.random() - 0.5) * viewportWidth * 0.8],
            rotate: [0, Math.random() * 720],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: Math.random() * 1.5,
          }}
        />
      ))}
    </div>
  );
};

const DrawSparks: React.FC<{ viewportHeight: number; viewportWidth: number }> = ({ viewportHeight, viewportWidth }) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-[50] overflow-hidden flex items-center justify-center">
      {[...Array(30)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-amber-400 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.8)] e-left-top"
          style={{ ['--left' as any]: '50%', ['--top' as any]: '50%' }}
          animate={{
            y: [(Math.random() - 0.5) * viewportHeight * 0.8],
            x: [(Math.random() - 0.5) * viewportWidth * 0.8],
            scale: [0, Math.random() * 1.5 + 0.5, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            repeat: Infinity,
            ease: "easeOut",
            delay: Math.random() * 1,
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
  if (typeof window === 'undefined') return null;
  if (!globalAudioContext) {
    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioContextCtor) {
      globalAudioContext = new AudioContextCtor();
    }
  }
  return globalAudioContext;
};

const QuizBattlePage: React.FC = () => {
  const { userProfile, userRole } = useAuth();
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
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem('quiz_battle_sound_enabled') !== '0';
  });
  const [battleSoundVolume, setBattleSoundVolume] = useState(() => {
    if (typeof window === 'undefined') return 0.7;
    const stored = Number(window.localStorage.getItem('quiz_battle_sound_volume') || '0.7');
    if (!Number.isFinite(stored)) return 0.7;
    return clampNumber(stored, 0, 1);
  });
  const [connectionState, setConnectionState] = useState<'connected' | 'reconnecting' | 'disconnected'>('connected');
  const [historyFilterMode, setHistoryFilterMode] = useState<'all' | QuizBattleMode>('all');

  const [statsLoading, setStatsLoading] = useState(true);
  const [statsData, setStatsData] = useState<StudentBattleStats | null>(null);
  const [historyData, setHistoryData] = useState<QuizBattleMatchSummary[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<QuizBattleLeaderboardEntry[]>([]);
  const [leaderboardNameMode, setLeaderboardNameMode] = useState<'alias' | 'initials' | 'full'>('alias');
  const [showExactLeaderboardScores, setShowExactLeaderboardScores] = useState(false);

  const [activeMatch, setActiveMatch] = useState<QuizBattleLiveMatchState | null>(null);
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
  const botReadyStartFailuresRef = useRef(0);
  const previousStreakRef = useRef(0);
  const previousScoreRef = useRef<{ matchId: string; scoreFor: number; scoreAgainst: number } | null>(null);
  const scorePulseTimeoutRef = useRef<number | null>(null);
  const popupShownForRoundRef = useRef<number>(-1);
  const isDesignPauseAvailable = import.meta.env.DEV;

  const gradeScopedSubjects = useMemo(() => {
    const allowedSubjectIds = getActiveSubjectIdsForGrade(studentProfile?.grade);
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

  const opponentRoundStreak = useMemo(() => {
    const rounds = activeMatch?.roundResults || [];
    let streak = 0;
    rounds.forEach((result) => {
      streak = result.botCorrect ? streak + 1 : 0;
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
    if (!battleSoundEnabled || battleSoundVolume <= 0 || typeof window === 'undefined') return;

    try {
      const context = getAudioContext();
      if (!context) return;

      if (context.state === 'suspended') {
        void context.resume().catch(() => {});
      }

      const presets: Record<typeof kind, { notes: number[]; duration: number; type: OscillatorType; volume: number }> = {
        tick: { notes: [740], duration: 0.06, type: 'triangle', volume: 0.03 },
        lock: { notes: [520], duration: 0.08, type: 'square', volume: 0.04 },
        result: { notes: [660, 720], duration: 0.08, type: 'sine', volume: 0.04 },
        win: { notes: [920, 1040, 1180], duration: 0.12, type: 'triangle', volume: 0.05 },
        loss: { notes: [260, 220], duration: 0.14, type: 'sawtooth', volume: 0.045 },
        streak: { notes: [780, 920], duration: 0.09, type: 'triangle', volume: 0.045 },
        multiplier: { notes: [660, 880, 1120], duration: 0.08, type: 'triangle', volume: 0.05 },
      };

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
    if (!roomCode || typeof window === 'undefined') return;

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

    const [stats, history] = await Promise.all([
      getStudentBattleStats(studentProfile.uid),
      getStudentBattleHistory(studentProfile.uid, { mode: historyFilterMode, limitCount: 8 }),
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
    return historyData.filter((entry) => entry.mode === historyFilterMode);
  }, [historyData, historyFilterMode]);

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
            const known = error as { message?: string };
            setQueueActive(false);
            setActiveRoom(null);
            setActiveMatch(null);
            setActiveTab('setup');
            setConnectionState(
              typeof window !== 'undefined' && window.navigator.onLine ? 'connected' : 'disconnected',
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
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('quiz_battle_sound_enabled', battleSoundEnabled ? '1' : '0');
  }, [battleSoundEnabled]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('quiz_battle_sound_volume', battleSoundVolume.toFixed(2));
  }, [battleSoundVolume]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

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
    if (typeof document === 'undefined') return undefined;

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
    if (typeof window === 'undefined') {
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

    if (activeMatch.outcome === 'win') {
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
  }, [activeMatch?.matchId, activeMatch?.status, activeMatch?.outcome, playBattleTone]);

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
    if (!lastRoundResult || lastRoundMomentumDelta === null) {
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
        {activeMatch.status === 'completed' && activeMatch.outcome === 'win' && (
          <ConfettiBurst viewportHeight={viewportSize.height} viewportWidth={viewportSize.width} />
        )}
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
                    I give up! 🏳️
                  </motion.div>
                </div>

                <div className="text-center">
                  <h2 className="text-2xl font-black text-white mb-1">Opponent Surrendered</h2>
                  <p className="text-white/50 text-sm">
                    <span className="font-bold text-white/70">{activeMatch.opponentName || 'Your opponent'}</span> left the match. You win! 🏆
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
                    🏆 Claim Victory
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
          <header className="flex items-center justify-between shrink-0 h-16">
            {/* Left: Branding & Bonuses */}
            <div className="flex items-center gap-3 md:gap-5">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/20 ring-1 ring-primary/40 shadow-[0_0_15px_rgba(158,143,255,0.4)]">
                <Swords className="h-6 w-6 text-primary" />
              </div>
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-black text-sm tracking-wide shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                🔥 {playerRoundStreak || 0} Streak
              </div>
              <motion.div
                key={liveXpEarned}
                animate={liveXpEarned > 0 ? { scale: [1, 1.25, 1] } : {}}
                transition={{ duration: 0.35 }}
                className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-400 font-black text-sm tracking-wide shadow-[0_0_10px_rgba(139,92,246,0.2)]"
              >
                ✨ {playerVisualMultiplier.toFixed(2)}x
              </motion.div>
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

            {/* Right: Controls */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full border-white/20 bg-black/20 hover:bg-white/10 text-white"
                onClick={() => {
                  if (typeof document === 'undefined') return;
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
                aria-label={isFullscreen ? 'Exit fullscreen mode' : 'Enter fullscreen mode'}
                title={isFullscreen ? 'Exit fullscreen mode' : 'Enter fullscreen mode'}
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
                onClick={handleToggleDesignPause}
                disabled={!isDesignPauseAvailable}
                aria-label={isDesignPauseAvailable ? 'Toggle design pause' : 'Design pause unavailable'}
                title={isDesignPauseAvailable ? 'Toggle design pause' : 'Design pause unavailable'}
              >
                 <Menu className="h-5 w-5" />
              </Button>
            </div>
          </header>

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
                            {activeMatch.outcome === 'win' ? '🏆 Victory Reward' : activeMatch.outcome === 'draw' ? '🤝 Draw Reward' : '📘 Participation Reward'}
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
                  getAudioContext()?.resume().catch(() => {});
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
          />

      </div>
      </div>
      </>
    );
  }

  return (
    <>
<style>{battleAnimations}</style>
      <WarpBackground bgVideo="/videos/warp_bg.mp4" className="-mx-3 lg:-mx-4 -mt-3 lg:-mt-4 -mb-8 px-4 sm:px-6 xl:px-10 py-6 sm:py-8 min-h-[calc(100vh-3.5rem)] !w-auto overflow-hidden relative">
      <div className="h-full flex flex-col max-w-[1400px] mx-auto w-full">
        <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-3 lg:space-y-4"
      >
        

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as BattlePageTab)}>
          

            <TabsContent value="hub" className="mt-0 outline-none">
              <motion.div
                key="hub"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-5"
              >

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_320px] gap-6 sm:gap-8 lg:gap-10">
                  {/* Left Column: Hero & Battle Modes */}
                  <div className="space-y-3 lg:space-y-4">
                    {/* Hero Banner */}
                    <div className="relative select-none isolate bg-indigo-600 rounded-[2rem] shadow-[0_20px_45px_-15px_rgba(0,0,0,0.3)] shrink-0">
                      {/* Simple black overlay to darken the specific module color */}
                      <div className="absolute inset-0 bg-black/60 pointer-events-none z-0 rounded-[2rem]" />
                      {/* Decorative Textbook Background */}
                      <div 
                        className="absolute inset-0 opacity-10 pointer-events-none rounded-[2rem] overflow-hidden repeating-stripe-bg"
                      />
                      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-sky-500/20 blur-[100px] rounded-full pointer-events-none" />
                      
                      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-6 lg:p-8 h-full min-h-[140px] lg:min-h-[160px]">
                        <div className="flex-1 space-y-3 w-full pr-0 md:pr-[240px] lg:pr-[280px]">
                          <div>
                            <h1 className="flex items-center gap-3 text-3xl sm:text-4xl lg:text-[46px] font-black tracking-tight text-white mb-2 sm:mb-4">
                              <Swords className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-[#d1abff]" strokeWidth={2.5} />   
                              Quiz Battle
                            </h1>
                            <p className="text-base sm:text-lg lg:text-xl text-white mt-1.5 sm:mt-2 max-w-2xl leading-relaxed">
                              Timed student duels with synchronized rounds, instant feedback, and progression rewards.
                            </p>
                            <p className="text-xs lg:text-sm font-semibold uppercase tracking-[0.15em] text-[#8a7fbc] mt-3">
                              Connection: <span className={connectionState === 'connected' ? 'text-emerald-400' : 'text-amber-400'}>{connectionState}</span>
                            </p>
                          </div>
                        </div>
                        
{/* Enlarged Avatar floating without overflow clipping - CSS WAAPI for smooth compositor animation */}
          <div className="hidden md:block absolute right-[-5px] lg:right-[-15px] top-0 lg:top-[5px] w-[200px] lg:w-[260px] shrink-0 pointer-events-none z-20">
            <img
              src={quizBattleAvatar}
              alt="Mascot"
              className="w-full h-full object-contain animate-mascot-float"
            />
          </div>
                      </div>
                    </div>

                    {/* Battle Modes */}
                    <div className="pt-4 lg:pt-6">
                      <h2 className="flex items-center gap-2 pb-4 text-xl lg:text-2xl font-black tracking-wide uppercase text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">
                        <Swords className="h-6 w-6 lg:h-8 lg:w-8 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]" /> BATTLE MODES
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6 relative z-10 w-full mb-2">
                        {/* VS Player Card */}
                        <motion.button
                          type="button"
                          onClick={() => setMode('online')}
                          whileHover={{ scale: 1.025 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ type: "spring", stiffness: 400, damping: 15 }}
                          className="w-full h-[205px] sm:h-[245px] lg:h-[265px] bg-[#8A3FD3] rounded-[22px] border-none relative text-left shadow-[0_8px_30px_rgba(138,63,211,0.2)] hover:shadow-[0_12px_45px_rgba(138,63,211,0.4)] block flex-col group"
                        >
                          {/* Top Highlight border / Inner Shadow effect */}
                          <div className="absolute inset-0 rounded-[22px] shadow-[inset_0_6px_15px_rgba(255,255,255,0.4)] pointer-events-none z-40" />

                          <div className="absolute top-4 -left-4 z-20 w-[100px] h-[40px] opacity-100">
                            <svg viewBox="0 0 100 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full block drop-shadow-md">
                              <path d="M0 0 H94 Q100 0 100 6 V34 Q100 40 94 40 H0 L14 20 Z" fill="#b91c1c"/>
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-end pr-3 font-black text-[13px] text-white tracking-[0.3px] opacity-100 font-nunito">
                              VS Player
                            </div>
                          </div>

                          <div className="rounded-[22px] overflow-hidden relative isolate h-full flex flex-col justify-end">
                            {/* Shine Effect */}
                            <div className="absolute top-0 -left-[150%] w-[100%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12 z-50 pointer-events-none transition-all duration-0 group-hover:duration-[800ms] ease-in-out group-hover:left-[150%]" />
                            
                            <div className="flex-1 w-full flex items-end justify-center relative pt-2 pointer-events-none">
                              {/* Expanded Full-Width Stage (Dark Purple) */}
                              <div className="absolute bottom-0 left-0 w-full h-[70px] sm:h-[95px] bg-[#662AA8] rounded-[50%_50%_0_0/100%_100%_0_0] scale-[1.05] z-0" />
                              
{/* Animated Avatar Clones (VS Match) - CSS WAAPI animations */}
            <div className="relative z-10 flex items-center justify-center mb-[2px] h-[120px] sm:h-[140px] w-full">
              {/* Left Avatar */}
              <img
                src="/avatar/avatar_icon.png"
                alt=""
                className="h-[120%] sm:h-[125%] object-contain relative z-20 origin-bottom right-[-15px] drop-shadow-[0_12px_15px_rgba(0,0,0,0.3)] animate-avatar-left"
              />
              {/* Center VS */}
              <div className="relative z-30 flex flex-col items-center mx-[-20px] scale-[1.1] animate-vs-pulse">
                <span className="font-black italic text-[40px] text-gray-200 tracking-tighter leading-none drop-shadow-[-2px_3px_0px_rgba(0,0,0,0.8)] webkit-text-stroke">
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
                            
                            <div className="relative z-10 w-full px-5 py-3 sm:py-4 text-center bg-[#662AA8]">
                              <p className="text-[13px] font-bold text-white leading-[1.45] font-nunito">
                                Queue or room-code match with another student.
                              </p>
                            </div>
                          </div>
                        </motion.button>

                        {/* VS Bot Card */}
                        <motion.button
                          type="button"
                          onClick={() => setMode('bot')}
                          whileHover={{ scale: 1.025 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ type: "spring", stiffness: 400, damping: 15 }}
                          className="w-full h-[205px] sm:h-[245px] lg:h-[265px] bg-[#1FA7E1] rounded-[22px] border-none relative text-left shadow-[0_8px_30px_rgba(31,167,225,0.2)] hover:shadow-[0_12px_45px_rgba(31,167,225,0.4)] block flex-col group"
                        >
                          {/* Top Highlight border / Inner Shadow effect */}
                          <div className="absolute inset-0 rounded-[22px] shadow-[inset_0_6px_15px_rgba(255,255,255,0.4)] pointer-events-none z-40" />

                          <div className="absolute top-4 -left-4 z-20 w-[100px] h-[40px] opacity-100">
                            <svg viewBox="0 0 100 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full block drop-shadow-md">
                              <path d="M0 0 H94 Q100 0 100 6 V34 Q100 40 94 40 H0 L14 20 Z" fill="#b91c1c"/>
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-end pr-3 font-black text-[13px] text-white tracking-[0.3px] opacity-100 font-nunito">
                              VS Bot
                            </div>
                          </div>

                          <div className="rounded-[22px] overflow-hidden relative isolate h-full flex flex-col justify-end">
                            {/* Shine Effect */}
                            <div className="absolute top-0 -left-[150%] w-[100%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12 z-50 pointer-events-none transition-all duration-0 group-hover:duration-[800ms] ease-in-out group-hover:left-[150%]" />
                            
                            <div className="flex-1 w-full flex items-end justify-center relative pt-2 pointer-events-none">
                              {/* Expanded Full-Width Stage (Dark Blue) */}
                              <div className="absolute bottom-0 left-0 w-full h-[70px] sm:h-[95px] bg-[#127DA6] rounded-[50%_50%_0_0/100%_100%_0_0] scale-[1.05] z-0" />
                              
{/* Ghosting Avatars - CSS WAAPI for smooth compositor animation */}
            <div className="relative z-10 flex items-end justify-center mb-[2px] h-[125px] sm:h-[145px] w-full">
              {/* Left Ghost */}
              <img
                src="/avatar/avatar_icon.png"
                alt=""
                className="absolute opacity-40 blur-[1px] h-full object-contain origin-bottom -translate-x-[45px] sm:-translate-x-[60px] scale-[0.80] sm:scale-[0.85] animate-ghost-left"
              />
              {/* Right Ghost */}
              <img
                src="/avatar/avatar_icon.png"
                alt=""
                className="absolute opacity-40 blur-[1px] h-full object-contain origin-bottom translate-x-[45px] sm:translate-x-[60px] scale-[0.80] sm:scale-[0.85] animate-ghost-right"
              />
              {/* Main Avatar */}
              <img
                src="/avatar/avatar_icon.png"
                alt="VS Bot"
                className="relative opacity-100 scale-100 h-[105%] sm:h-[115%] object-contain drop-shadow-[0_15px_15px_rgba(0,0,0,0.3)] z-20 origin-bottom animate-main-avatar"
              />
            </div>
                            </div>
                            
                            <div className="relative z-10 w-full px-5 py-3 sm:py-4 text-center bg-[#127DA6]">
                              <p className="text-[13px] font-bold text-white leading-[1.45] font-nunito">
                                Instant solo duel with selectable bot difficulty.
                              </p>
                            </div>
                          </div>
                        </motion.button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Mini Widgets */}
                  <div className="space-y-3 lg:space-y-4 flex flex-col h-full justify-between">

                    {/* Hall of Fame Widget Custom Graphic */}
                    <div onClick={() => setActiveTab('leaderboard')} className="relative w-full h-[155px] sm:h-[165px] cursor-pointer group flex items-end justify-center overflow-visible mt-1 mb-2 scale-[0.75] origin-bottom sm:scale-[0.80] lg:scale-[0.85] lg:origin-center">
                       <motion.div 
                          className="relative w-full h-full flex flex-col items-center justify-end"
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.98 }}
                       >
                           {/* Stars (Moved outside the white-filter to preserve colored glowing effect) */}
                           <div className="absolute top-[1px] sm:-top-[30px] w-full flex justify-center items-end px-2 z-0">
                              <Star strokeWidth={0} fill="currentColor" className="w-[35px] h-[35px] text-[#fde047] -rotate-[15deg] -mr-3 mb-1 z-0 drop-shadow-[0_0_15px_rgba(253,224,71,0.6)]" />
                              
<div className="z-10 relative animate-star-float">
                <Star strokeWidth={0} fill="currentColor" className="w-[60px] h-[60px] text-[#fcd34d] drop-shadow-[0_0_25px_rgba(252,211,77,0.9)]" />
              </div>

                              <Star strokeWidth={0} fill="currentColor" className="w-[35px] h-[35px] text-[#fde047] rotate-[15deg] -ml-3 mb-1 z-0 drop-shadow-[0_0_15px_rgba(253,224,71,0.6)]" />
                           </div>

                           {/* Add white stroke filter via combined drop-shadows */}
                           <div className="absolute inset-x-0 bottom-[40px] top-0 z-10 flex flex-col items-center justify-end
                                           filter drop-shadow-[0px_3px_0px_white] drop-shadow-[0px_-3px_0px_white] drop-shadow-[3px_0px_0px_white] drop-shadow-[-3px_0px_0px_white] drop-shadow-[2px_2px_0px_white] drop-shadow-[-2px_-2px_0px_white] drop-shadow-[2px_-2px_0px_white] drop-shadow-[-2px_2px_0px_white]">
                               
                               {/* Podium structure (Flat vector layout) */}
                               <div className="flex items-end justify-center z-20 relative px-4">
                                  {/* Left Pillar */}
                                  <div className="flex flex-col items-center w-[65px] relative">
                                     <div className="w-full h-[14px] bg-[#d24b4b] rounded-[2px] relative z-10 -mb-[1px]"></div>
                                     <div className="w-[85%] h-[50px] bg-[#fe5c5c] rounded-b-[2px] flex flex-col justify-center items-center gap-1.5 pb-1.5">
                                        <div className="w-6 h-1.5 bg-white rounded-full opacity-95" />
                                        <div className="w-6 h-1.5 bg-white rounded-full opacity-95" />
                                     </div>
                                  </div>
                                  
                                  {/* Center Pillar */}
                                  <div className="flex flex-col items-center w-[75px] -mx-[4px] z-20 relative">
                                     <div className="w-full h-[18px] bg-[#f2812d] rounded-[2px] relative z-10 -mb-[1px]"></div>
                                     <div className="w-[85%] h-[75px] bg-[#fa9746] rounded-b-[2px] flex flex-col justify-start items-center pt-4 gap-1.5">
                                        <div className="w-9 h-1.5 bg-white rounded-full opacity-95" />
                                        <div className="w-9 h-1.5 bg-white rounded-full opacity-95" />
                                     </div>
                                  </div>
                                  
                                  {/* Right Pillar */}
                                  <div className="flex flex-col items-center w-[65px] relative">
                                     <div className="w-full h-[14px] bg-[#d24b4b] rounded-[2px] relative z-10 -mb-[1px]"></div>
                                     <div className="w-[85%] h-[50px] bg-[#fe5c5c] rounded-b-[2px] flex flex-col justify-center items-center gap-1.5 pb-1.5">
                                        <div className="w-6 h-1.5 bg-white rounded-full opacity-95" />
                                        <div className="w-6 h-1.5 bg-white rounded-full opacity-95" />
                                     </div>
                                  </div>
                               </div>
                           </div>

                           {/* 3D Ribbon / Banner overlapping the bottom of the podium */}
                           <div className="absolute bottom-2 w-[110%] max-w-[280px] z-30 drop-shadow-2xl">
                               <div className="relative w-full h-[52px] flex justify-center items-center">
                                   {/* Left Cutout Flap */}
                                   <div className="absolute -left-1 top-2 w-[55px] h-[40px] bg-[#8b0d0d] z-0 clip-poly-left"></div>
                                   {/* Right Cutout Flap */}
                                   <div className="absolute -right-1 top-2 w-[55px] h-[40px] bg-[#8b0d0d] z-0 clip-poly-right"></div>
                                   
                                   {/* Front Ribbon Face */}
                                   <div className="absolute inset-x-6 top-0 bottom-0 bg-[#b61515] shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),_inset_0_-4px_4px_rgba(0,0,0,0.2)] z-10 flex flex-col items-center justify-center">
                                       <h3 className="text-lg sm:text-xl font-black text-white tracking-widest leading-none drop-shadow-md font-nunito">Hall of Fame</h3>
                                       <span className="text-[9px] sm:text-[10px] font-bold text-white/90 tracking-widest mt-0.5">View Page &gt;</span>
                                   </div>
                               </div>
                           </div>
                       </motion.div>
                    </div>

                    {/* My Stats Widget (Horizontal Swipe Carousel) */}
                    <div className="relative w-full bg-[#3b3a82] dark:bg-[#2b2b5f] rounded-[24px] overflow-hidden flex flex-col shadow-[0_8px_30px_rgba(59,58,130,0.3)]">
                      {/* Header */}
                      <div className="flex flex-row items-end justify-between px-5 pt-4 pb-2 relative z-10">
                        <h3 className="text-[18px] font-black text-white tracking-wide leading-none drop-shadow-md font-nunito">My Stats</h3>
                        <Button 
                          variant="link" 
                          className="text-white/80 hover:text-white p-0 h-auto font-semibold text-[13px] tracking-wide" 
                          onClick={() => setActiveTab('stats')}
                        >
                          View Stats &gt;
                        </Button>
                      </div>

                      {/* Content: Continuous Auto-scroll Marquee */}
                      <div className="relative z-10 w-full overflow-hidden pb-4">
                        {/* Edge Gradients for smooth fade in/out */}
                        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-[#3b3a82] to-transparent z-20 pointer-events-none dark:from-[#2b2b5f]" />
                        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[#3b3a82] to-transparent z-20 pointer-events-none dark:from-[#2b2b5f]" />
                        
<div className="flex w-max pl-3 animate-marquee">
              {[0, 1].map((i) => (
                            <div key={i} className="flex gap-2.5 pr-2.5">
                              {/* Card 1: Win Rate */}
                              <div className="flex-none w-[60px] sm:w-[65px] lg:w-[70px] xl:w-[75px] aspect-square rounded-[12px] bg-[#f0eaff] p-1.5 flex flex-col justify-between relative overflow-hidden group shadow-sm dark:bg-[#d6ccf5]">
                                <Trophy className="absolute -bottom-1 -right-2 w-6 h-6 sm:w-8 sm:h-8 text-[#a06aec]/10 -rotate-12 transition-transform group-hover:scale-110" />
                                <span className="text-[12px] drop-shadow-sm leading-none">🏆</span>
                                <div className="relative z-10 space-y-[1px]">
                                  <h4 className="text-[12px] sm:text-[14px] lg:text-[16px] font-black text-[#8f5ae2] leading-none tracking-tight">{Math.round((statsData?.winRate || 0))} %</h4>
                                  <p className="text-[6px] lg:text-[7px] font-extrabold text-[#baa4df] uppercase tracking-wider leading-none">Win Rate</p>
                                </div>
                              </div>

                              {/* Card 2: Matches */}
                              <div className="flex-none w-[60px] sm:w-[65px] lg:w-[70px] xl:w-[75px] aspect-square rounded-[12px] bg-[#e1f5f7] p-1.5 flex flex-col justify-between relative overflow-hidden group shadow-sm dark:bg-[#b0e6eb]">
                                <Target className="absolute -bottom-1 -right-2 w-6 h-6 sm:w-8 sm:h-8 text-[#35a8bc]/10 rotate-12 transition-transform group-hover:scale-110" />
                                <span className="text-[12px] drop-shadow-sm leading-none">🎯</span>
                                <div className="relative z-10 space-y-[1px]">
                                  <h4 className="text-[12px] sm:text-[14px] lg:text-[16px] font-black text-[#319ab4] leading-none tracking-tight">{statsData?.matchesPlayed || 0}</h4>
                                  <p className="text-[6px] lg:text-[7px] font-extrabold text-[#7eafbe] uppercase tracking-wider leading-none">Matches</p>
                                </div>
                              </div>

                              {/* Card 3: Avg. Response */}
                              <div className="flex-none w-[60px] sm:w-[65px] lg:w-[70px] xl:w-[75px] aspect-square rounded-[12px] bg-[#fef5e7] p-1.5 flex flex-col justify-between relative overflow-hidden group shadow-sm dark:bg-[#f6ebd2]">
                                <Clock3 className="absolute -bottom-1 -right-2 w-6 h-6 sm:w-8 sm:h-8 text-[#e87a42]/10 -rotate-12 transition-transform group-hover:scale-110" />
                                <span className="text-[12px] drop-shadow-sm leading-none">⏱️</span>
                                <div className="relative z-10 space-y-[1px]">
                                  <h4 className="text-[12px] sm:text-[14px] lg:text-[16px] font-black text-[#db734b] leading-none tracking-tight">{statsData?.averageResponseMs ? (statsData.averageResponseMs / 1000).toFixed(1) : 0}s</h4>
                                  <p className="text-[6px] lg:text-[7px] font-extrabold text-[#d2a893] uppercase tracking-wider leading-none whitespace-nowrap">Response</p>
                                </div>
                              </div>

                              {/* Card 4: Total XP */}
                              <div className="flex-none w-[60px] sm:w-[65px] lg:w-[70px] xl:w-[75px] aspect-square rounded-[12px] bg-[#fdeceb] p-1.5 flex flex-col justify-between relative overflow-hidden group shadow-sm dark:bg-[#fbd3d3]">
                                <Sparkles className="absolute -bottom-1 -right-2 w-6 h-6 sm:w-8 sm:h-8 text-[#df655a]/10 rotate-12 transition-transform group-hover:scale-110" />
                                <span className="text-[12px] drop-shadow-sm leading-none">✨</span>
                                <div className="relative z-10 space-y-[1px]">
                                  <h4 className="text-[12px] sm:text-[14px] lg:text-[16px] font-black text-[#d05c54] leading-none tracking-tight">{studentProfile?.currentXP || 0}</h4>
                                  <p className="text-[6px] lg:text-[7px] font-extrabold text-[#dd9a9a] uppercase tracking-wider leading-none whitespace-nowrap">Total XP</p>
                                </div>
                              </div>
</div>
              ))}
            </div>
                      </div>
                    </div>

                    <Card className={cn(cardFrameClass, 'rounded-[18px] flex flex-col min-h-[200px]')}>
                      <CardHeader className="pb-0 pt-3 px-4 flex flex-row items-center justify-between">
                         <CardTitle className="text-[14px] font-black flex items-center gap-2 text-[#2e2b5e] dark:text-[#f5f7fb]">
                           <History className="h-[16px] w-[16px] text-[#2e2b5e] dark:text-[#9e8fff]" /> Match History
                         </CardTitle>
                         <Button variant="link" size="sm" className="h-auto p-0 text-[12px] font-semibold text-muted-foreground dark:text-[#95a0bb] hover:text-primary transition-colors" onClick={() => setActiveTab('history')}>View All</Button>
                      </CardHeader>
                      <CardContent className="space-y-1.5 px-4 pt-1 pb-3 overflow-y-auto">
                         <div className="text-[11px] text-muted-foreground dark:text-[#8b95ad] mb-1.5 leading-relaxed">
                           Your recent student battles only.
                         </div>
                        {statsLoading ? (
                          <div className="space-y-2">
                            <Skeleton className="h-10 w-full rounded-xl bg-muted dark:bg-[#2a3143]" />
                            <Skeleton className="h-10 w-full rounded-xl bg-muted dark:bg-[#2a3143]" />
                          </div>
                        ) : filteredHistory.length === 0 ? (
                          <p className="text-xs text-center text-muted-foreground dark:text-[#a8b2c9] py-2">No battle history yet.</p>
                        ) : (
                          filteredHistory.slice(0, 3).map((entry) => {
                            const isWin = entry.outcome === 'win';
                            const isLoss = entry.outcome === 'loss';
                            
                            // Generate initials from opponent name (e.g. Practice Bot -> PB)
                            const initials = entry.opponentName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'OP';
                            
                            return (
                              <div key={entry.matchId} className="group relative overflow-hidden rounded-[14px] border border-muted-foreground/15 bg-white dark:bg-[#11151d] dark:border-[#2f3547] p-2 shadow-sm transition-all hover:scale-[1.01] hover:shadow-md">
                                {/* Option 2: The Dynamic Background Gradient Fade */}
                                <div className={cn(
                                  "absolute inset-y-0 right-0 w-[55%] pointer-events-none opacity-[0.2] dark:opacity-[0.25] mix-blend-multiply dark:mix-blend-screen transition-all",
                                  isWin ? "bg-gradient-to-l from-emerald-500 via-emerald-500/40 to-transparent" : 
                                  isLoss ? "bg-gradient-to-l from-rose-500 via-rose-500/40 to-transparent" : 
                                  "bg-gradient-to-l from-amber-400 via-amber-400/40 to-transparent"
                                )} />
                                
                                <div className="flex items-center gap-2.5 relative z-10 w-full">
                                  {/* Left Avatar Bubble */}
                                  <div className={cn(
                                    "w-9 h-9 rounded-full flex items-center justify-center font-black text-[12px] tracking-wide text-white flex-shrink-0 shadow-inner",
                                    isWin ? "bg-[#34d399] dark:bg-[#15803d]" : isLoss ? "bg-[#fb7185] dark:bg-[#be123c]" : "bg-[#fbbf24] dark:bg-[#b45309]" 
                                  )}>
                                    {initials}
                                  </div>
                                  
                                  {/* Center Match Details */}
                                  <div className="flex-grow min-w-0 flex flex-col justify-center">
                                    <p className="text-[13px] font-extrabold text-[#36326e] dark:text-[#e4e7f1] truncate leading-tight">
                                      vs {entry.opponentName}
                                    </p>
                                    <p className="text-[10px] font-bold text-muted-foreground/60 dark:text-[#7f88a3] truncate flex items-center gap-1 mt-0.5">
                                      {entry.subjectId} <span className="w-1 h-1 rounded-full bg-muted-foreground/30" /> {entry.difficulty || 'Medium'} <span className="w-1 h-1 rounded-full bg-muted-foreground/30" /> {entry.rounds || '5'} rnds
                                    </p>
                                  </div>

                                  {/* Right Score & Outcome Text */}
                                  <div className="text-right flex flex-col items-end justify-center pl-2 flex-shrink-0">
                                    <p className="tabular-nums text-[16px] leading-[1.1] font-black text-[#2e2b5e] dark:text-[#f5f7fb] tracking-tighter">
                                      {entry.scoreFor}<span className="text-muted-foreground/40 mx-[1px]">-</span>{entry.scoreAgainst}
                                    </p>   
                                    <p
                                      className={cn(
                                        'text-[9px] font-black uppercase tracking-[0.1em]',
                                        isWin ? 'text-emerald-500 dark:text-emerald-400' : isLoss ? 'text-rose-500 dark:text-rose-400' : 'text-amber-500 dark:text-amber-400'
                                      )}
                                    >
                                      {entry.outcome}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </CardContent>
                    </Card>

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
                className="w-full space-y-6"
              >
                {/* Gamified Header Banner */}
                <motion.div
                  className={cn(cardFrameClass, "relative overflow-hidden rounded-[24px] mb-6 shadow-lg",
                    setupConfig.mode === 'online' 
                      ? "border-purple-500/20 shadow-[0_0_40px_-10px_rgba(138,63,211,0.2)]"
                      : "border-sky-500/20 shadow-[0_0_40px_-10px_rgba(31,167,225,0.2)]"
                  )}
                  whileHover={{ scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  {/* Animated Background Elements */}
                  <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-r",
                    setupConfig.mode === 'online'
                      ? "from-purple-500/20 via-fuchsia-500/10 to-purple-600/5 dark:from-purple-500/20 dark:via-fuchsia-500/10 dark:to-purple-900/10"
                      : "from-sky-500/20 via-cyan-500/10 to-sky-600/5 dark:from-sky-500/20 dark:via-cyan-500/10 dark:to-sky-900/10"
                  )} />
                  
                  <div 
                    className={cn("pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl animate-orb-pulse",
                      setupConfig.mode === 'online' ? "bg-purple-400/20" : "bg-sky-400/20"
                    )}
                  />
                  <div 
                    className={cn("pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full blur-2xl animate-orb-pulse-delayed",
                      setupConfig.mode === 'online' ? "bg-fuchsia-400/30" : "bg-cyan-400/30"
                    )}
                  />
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAiLz4KPHBhdGggZD0iTTAgMEgxdjFIMHoiIGZpbGw9IiM2MzY2ZjEiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPgo8L3N2Zz4=')] opacity-30 dark:opacity-10 mix-blend-overlay" />
                  
                  <div className="relative p-6 sm:p-8 md:px-10 flex items-center gap-5 sm:gap-8 z-10">
                    <Button 
                      variant="ghost" 
                      onClick={() => setActiveTab("hub")} 
                      className={cn(
                        "h-12 w-12 sm:h-14 sm:w-14 p-0 rounded-full hover:scale-105 transition-all backdrop-blur-md shadow-lg shrink-0 flex items-center justify-center group",
                        setupConfig.mode === 'online'
                          ? "bg-white/50 dark:bg-black/40 hover:bg-white/80 dark:hover:bg-black/60 border border-purple-500/30"
                          : "bg-white/50 dark:bg-black/40 hover:bg-white/80 dark:hover:bg-black/60 border border-sky-500/30"
                      )}
                    >
                      <ChevronRight className={cn("h-6 w-6 sm:h-8 sm:w-8 rotate-180 transition-transform group-hover:-translate-x-0.5",
                        setupConfig.mode === 'online' ? "text-purple-800 dark:text-purple-300" : "text-sky-800 dark:text-sky-300"
                      )} />
                    </Button>
                    <div>
                      <h2 className={cn("flex items-center gap-3 text-3xl sm:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br drop-shadow-sm",
                        setupConfig.mode === 'online' 
                          ? "from-purple-600 to-fuchsia-500 dark:from-purple-300 dark:to-fuchsia-200"
                          : "from-sky-600 to-cyan-500 dark:from-sky-300 dark:to-cyan-200"
                      )}>
                        <div className={cn("p-2 rounded-2xl shadow-inner border animate-icon-bob",
                            setupConfig.mode === 'online'
                              ? "bg-purple-100 dark:bg-purple-900/50 border-purple-200 dark:border-purple-700/50"
                              : "bg-sky-100 dark:bg-sky-900/50 border-sky-200 dark:border-sky-700/50"
                          )}
                        >
                          {setupConfig.mode === 'online' 
                            ? <Users className="h-8 w-8 text-purple-600 dark:text-purple-400 drop-shadow-[0_0_8px_rgba(138,63,211,0.5)]" /> 
                            : <Bot className="h-8 w-8 text-sky-600 dark:text-sky-400 drop-shadow-[0_0_8px_rgba(31,167,225,0.5)]" />
                          }
                        </div>
                        {setupConfig.mode === 'online' ? "1v1 Online" : "1v1 vs Bot"}
                      </h2>
                      <p className={cn("text-[10px] sm:text-[12px] font-black uppercase tracking-[0.2em] mt-1.5 drop-shadow-sm",
                        setupConfig.mode === 'online' ? "text-purple-600/80 dark:text-purple-400/80" : "text-sky-600/80 dark:text-sky-400/80"
                      )}>
                        {setupConfig.mode === 'online' ? "CHALLENGE YOUR SCHOOLMATES AND PROVE YOUR SKILLS." : "CHALLENGE THE AI AND SHARPEN YOUR SKILLS."}
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Setup Form Glass Panel */}
                <div className="rounded-[24px] border border-white/40 bg-white/85 dark:border-white/10 dark:bg-black/80 backdrop-blur-xl p-5 sm:p-7 shadow-xl">
                  {/* Two Column Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
                    
                    {/* Left Column: Core Settings */}
                    <div className="space-y-4">
                      <div className="space-y-1.5 group">
                        <label className={cn(
                          "text-[11px] font-black uppercase tracking-[0.12em] ml-1",
                          setupConfig.mode === 'online' ? "text-[#8A3FD3] dark:text-[#a35ceb]" : "text-[#1FA7E1] dark:text-[#4bc1f2]"
                        )}>Category</label>
                        <Select
                          value={setupConfig.subjectId}
                          onValueChange={(value) => setSetupConfig((previous) => ({ ...previous, subjectId: value }))}
                        >
                          <SelectTrigger className={cn('rounded-xl h-11 border-white/20 bg-white/60 dark:bg-black/50 dark:border-white/10 transition-colors shadow-inner', 
                            setupConfig.mode === 'online' ? "hover:border-[#8A3FD3]/50" : "hover:border-[#1FA7E1]/50",
                            errorFor('subjectId') && 'border-rose-400')}>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl backdrop-blur-xl bg-white/90 dark:bg-[#1a1f2e]/90">
                            {gradeScopedSubjects.map((entry) => (
                              <SelectItem key={entry.id} value={entry.id} className="rounded-lg">{entry.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errorFor('subjectId') && <p className="text-xs text-destructive dark:text-rose-300 ml-1">{errorFor('subjectId')}</p>}
                      </div>

                      <div className="space-y-1.5 group">
                        <label className={cn(
                          "text-[11px] font-black uppercase tracking-[0.12em] ml-1",
                          setupConfig.mode === 'online' ? "text-[#8A3FD3] dark:text-[#a35ceb]" : "text-[#1FA7E1] dark:text-[#4bc1f2]"
                        )}>Strand / Topic Group</label>
                        <Select
                          value={setupConfig.topicId}
                          onValueChange={(value) => setSetupConfig((previous) => ({ ...previous, topicId: value }))}
                        >
                          <SelectTrigger className={cn('rounded-xl h-11 border-white/20 bg-white/60 dark:bg-black/50 dark:border-white/10 transition-colors shadow-inner', 
                            setupConfig.mode === 'online' ? "hover:border-[#8A3FD3]/50" : "hover:border-[#1FA7E1]/50",
                            errorFor('topicId') && 'border-rose-400')}>
                            <SelectValue placeholder="Select topic group" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl backdrop-blur-xl bg-white/90 dark:bg-[#1a1f2e]/90">
                            {moduleOptions.map((entry) => (
                              <SelectItem key={entry.value} value={entry.value} className="rounded-lg">{entry.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errorFor('topicId') && <p className="text-xs text-destructive dark:text-rose-300 ml-1">{errorFor('topicId')}</p>}
                      </div>

                      <div className="space-y-1.5 group">
                        <label className={cn(
                          "text-[11px] font-black uppercase tracking-[0.12em] ml-1",
                          setupConfig.mode === 'online' ? "text-[#8A3FD3] dark:text-[#a35ceb]" : "text-[#1FA7E1] dark:text-[#4bc1f2]"
                        )}>
                          {setupConfig.mode === 'online' ? 'Difficulty' : 'Bot Difficulty'}
                        </label>
                        <Select
                          value={setupConfig.mode === 'bot'
                            ? (setupConfig.adaptiveBot ? 'adaptive' : setupConfig.botDifficulty)
                            : setupConfig.difficulty}
                          onValueChange={(value) =>
                            setSetupConfig((previous) =>
                              previous.mode === 'bot'
                                ? {
                                  ...previous,
                                  botDifficulty: value as QuizBattleSetupConfig['botDifficulty'],
                                  adaptiveBot: value === 'adaptive',
                                }
                                : { ...previous, difficulty: value as QuizBattleSetupConfig['difficulty'] },
                            )
                          }
                        >
                          <SelectTrigger className={cn('rounded-xl h-11 border-white/20 bg-white/60 dark:bg-black/50 dark:border-white/10 transition-colors shadow-inner', 
                            setupConfig.mode === 'online' ? "hover:border-[#8A3FD3]/50" : "hover:border-[#1FA7E1]/50")}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl backdrop-blur-xl bg-white/90 dark:bg-[#1a1f2e]/90">
                            <SelectItem value="easy" className="rounded-lg">Easy</SelectItem>
                            <SelectItem value="medium" className="rounded-lg">Medium</SelectItem>
                            <SelectItem value="hard" className="rounded-lg">Hard</SelectItem>
                            {setupConfig.mode === 'bot' && <SelectItem value="adaptive" className="rounded-lg">Adaptive</SelectItem>}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5 group">
                          <label className={cn(
                            "text-[10px] sm:text-[11px] font-black uppercase tracking-[0.12em] ml-1",
                            setupConfig.mode === 'online' ? "text-[#8A3FD3] dark:text-[#a35ceb]" : "text-[#1FA7E1] dark:text-[#4bc1f2]"
                          )}>Questions</label>
                          <Select
                            value={String(setupConfig.rounds)}
                            onValueChange={(value) => setSetupConfig((previous) => ({ ...previous, rounds: Number(value) }))}
                          >
                            <SelectTrigger className={cn('rounded-xl h-11 border-white/20 bg-white/60 dark:bg-black/50 dark:border-white/10 transition-colors shadow-inner', 
                              setupConfig.mode === 'online' ? "hover:border-[#8A3FD3]/50" : "hover:border-[#1FA7E1]/50",
                              errorFor('rounds') && 'border-rose-400')}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl backdrop-blur-xl bg-white/90 dark:bg-[#1a1f2e]/90">
                              {[3, 5, 7, 10, 12, 15].map((entry) => (
                                <SelectItem key={entry} value={String(entry)} className="rounded-lg">{entry}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errorFor('rounds') && <p className="text-xs text-destructive dark:text-rose-300 ml-1">{errorFor('rounds')}</p>}
                        </div>

                        <div className="space-y-1.5 group">
                          <label className={cn(
                            "text-[10px] sm:text-[11px] font-black uppercase tracking-[0.12em] ml-1 line-clamp-1",
                            setupConfig.mode === 'online' ? "text-[#8A3FD3] dark:text-[#a35ceb]" : "text-[#1FA7E1] dark:text-[#4bc1f2]"
                          )}>Time / Q</label>
                          <Select
                            value={String(setupConfig.timePerQuestionSec)}
                            onValueChange={(value) =>
                              setSetupConfig((previous) => ({ ...previous, timePerQuestionSec: Number(value) }))
                            }
                          >
                            <SelectTrigger className={cn('rounded-xl h-11 border-white/20 bg-white/60 dark:bg-black/50 dark:border-white/10 transition-colors shadow-inner', 
                              setupConfig.mode === 'online' ? "hover:border-[#8A3FD3]/50" : "hover:border-[#1FA7E1]/50",
                              errorFor('timePerQuestionSec') && 'border-rose-400')}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl backdrop-blur-xl bg-white/90 dark:bg-[#1a1f2e]/90">
                              {[15, 20, 30, 45, 60, 90].map((entry) => (
                                <SelectItem key={entry} value={String(entry)} className="rounded-lg">{entry} sec</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errorFor('timePerQuestionSec') && <p className="text-xs text-destructive dark:text-rose-300 ml-1">{errorFor('timePerQuestionSec')}</p>}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Modes, Extras, and Actions */}
                    <div className="flex flex-col justify-between space-y-6">
                      <div className="space-y-5">
                        {setupConfig.mode === 'online' && (
                          <div className="space-y-3 rounded-2xl border border-[#8A3FD3]/20 bg-[#8A3FD3]/5 dark:border-[#8A3FD3]/20 p-4">
                            <div className="space-y-2">
                              <label className="text-[11px] font-black uppercase tracking-[0.12em] text-[#8A3FD3] dark:text-[#a35ceb] ml-1">Online Match Type</label>
                              <div className="grid grid-cols-2 gap-3">
                                {[
                                  { value: 'public_matchmaking' as QuizBattleQueueType, label: 'Public Queue' },
                                  { value: 'private_room' as QuizBattleQueueType, label: 'Private Room' },
                                ].map((entry) => (
                                  <Button
                                    key={entry.value}
                                    type="button"
                                    variant={setupConfig.queueType === entry.value ? 'default' : 'outline'}
                                    className={cn(
                                      "rounded-xl h-11 transition-all border-none font-bold text-xs",
                                      setupConfig.queueType === entry.value 
                                        ? "bg-[#8A3FD3] hover:bg-[#7b35c0] text-white shadow-md shadow-[#8A3FD3]/30"
                                        : "bg-white/50 hover:bg-white/80 dark:bg-black/30 dark:hover:bg-black/50 text-[#8A3FD3] dark:text-[#d3a8ff]"
                                    )}
                                    onClick={() =>
                                      setSetupConfig((previous) => ({
                                        ...previous,
                                        queueType: entry.value,
                                      }))
                                    }
                                  >
                                    {entry.label}
                                  </Button>
                                ))}
                              </div>
                            </div>

                            {setupConfig.queueType === 'private_room' && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="pt-2 space-y-2"
                              >
                                <label className="text-[11px] font-black uppercase tracking-[0.12em] text-[#8A3FD3] dark:text-[#a35ceb] ml-1">
                                  Room Code (optional)
                                </label>
                                <Input
                                  value={privateRoomCodeInput}
                                  onChange={(event) =>
                                    setPrivateRoomCodeInput(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))
                                  }
                                  placeholder="Leave blank to create a room"
                                  className="rounded-xl h-12 text-center text-lg uppercase font-bold tracking-[0.25em] border-[#8A3FD3]/30 bg-white/80 dark:bg-black/50 dark:border-[#8A3FD3]/20 focus-visible:ring-[#8A3FD3]/50 shadow-inner"
                                  maxLength={6}
                                />
                                <div className="rounded-xl border border-[#8A3FD3]/30 bg-[#8A3FD3]/10 px-3 py-3 text-[12px] font-semibold text-[#6620a2] leading-snug dark:border-[#8A3FD3]/30 dark:bg-[#8A3FD3]/10 dark:text-[#d3a8ff]">
                                  Enter a room code to join an existing battle, or leave it blank to create a new room and share your code.
                                </div>
                              </motion.div>
                            )}
                          </div>
                        )}

                        <label className={cn("flex flex-col sm:flex-row sm:items-center justify-between rounded-[16px] border bg-white/50 p-4 transition-colors cursor-pointer shadow-sm dark:bg-black/50 group",
                          setupConfig.mode === 'online' ? "border-[#8A3FD3]/20 hover:bg-[#8A3FD3]/5 dark:border-[#8A3FD3]/20 dark:hover:bg-[#8A3FD3]/10" : "border-[#1FA7E1]/20 hover:bg-[#1FA7E1]/5 dark:border-[#1FA7E1]/20 dark:hover:bg-[#1FA7E1]/10"
                        )}>
                          <div className="flex items-center gap-3">
                            <div className={cn("h-11 w-11 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform",
                              setupConfig.mode === 'online' ? "bg-[#8A3FD3]/10 text-[#8A3FD3] dark:text-[#c48bfc]" : "bg-[#1FA7E1]/10 text-[#1FA7E1] dark:text-[#7ad8ff]"
                            )}>
                              {battleSoundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5 opacity-60" />}
                            </div>
                            <div className="mb-3 sm:mb-0">
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Battle Sounds</p>
                              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Cues for countdowns and results.</p>
                            </div>
                          </div>
                          <Switch checked={battleSoundEnabled} onCheckedChange={setBattleSoundEnabled} />
                        </label>

                        <motion.div
                          initial={false}
                          animate={{
                            opacity: battleSoundEnabled ? 1 : 0.45,
                            y: battleSoundEnabled ? 0 : -2,
                          }}
                          className={cn(
                            'rounded-[16px] border bg-white/40 p-4 shadow-sm dark:bg-black/40',
                            setupConfig.mode === 'online'
                              ? 'border-[#8A3FD3]/20 dark:border-[#8A3FD3]/20'
                              : 'border-[#1FA7E1]/20 dark:border-[#1FA7E1]/20'
                          )}
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-700 dark:text-slate-200">SFX Volume</p>
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{Math.round(battleSoundVolume * 100)}%</p>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={1}
                            value={Math.round(battleSoundVolume * 100)}
                            disabled={!battleSoundEnabled}
                            onChange={(event) => {
                              const next = clampNumber(Number(event.target.value) / 100, 0, 1);
                              setBattleSoundVolume(next);
                            }}
                            onMouseUp={() => playBattleTone('tick')}
                            onTouchEnd={() => playBattleTone('tick')}
                            className="h-2 w-full cursor-pointer accent-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label="Battle sound effects volume"
                          />
                        </motion.div>
                      </div>

                      {/* Action Bar (Pinned to Bottom of Column) */}
                      <div className="flex flex-col gap-3">
                        <div aria-live="polite" className="min-h-[24px] text-sm font-medium">
                          {launchState.status === 'queued' && (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={cn("inline-flex items-center gap-1 text-[13px] font-bold px-3 py-1.5 rounded-lg",
                                setupConfig.mode === 'online' ? "text-[#8A3FD3] bg-[#8A3FD3]/10" : "text-[#1FA7E1] bg-[#1FA7E1]/10"
                              )}>
                                {launchState.message}
                              </span>
                              {setupConfig.mode === 'online' && setupConfig.queueType === 'private_room' && activeRoom?.roomCode && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  className={cn(
                                    'h-8 rounded-full border-emerald-500/50 bg-emerald-50 px-4 text-xs font-black uppercase tracking-[0.16em] text-emerald-900 shadow-sm hover:bg-emerald-100 hover:scale-105 transition-all dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20',
                                    copiedRoomCode === activeRoom.roomCode && 'scale-105 bg-emerald-200 dark:bg-emerald-500/30'
                                  )}
                                  onClick={() => void handleCopyRoomCode(activeRoom.roomCode)}
                                  aria-label={`Copy room code ${activeRoom.roomCode}`}
                                >
                                  {copiedRoomCode === activeRoom.roomCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                  {activeRoom.roomCode}
                                </Button>
                              )}
                              {(queueActive || privateRoomBusy) && queueWaitSeconds > 0 && (
                                <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold animate-pulse",
                                  setupConfig.mode === 'online' ? "bg-[#8A3FD3]/10 text-[#8A3FD3]" : "bg-[#1FA7E1]/10 text-[#1FA7E1]"
                                )}>
                                  Waiting {formatWaitClock(queueWaitSeconds)}
                                </span>
                              )}
                            </div>
                          )}
                          {launchState.status === 'error' && (
                            <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-500/20">
                              {launchState.message}
                            </span>
                          )}
                          {launchState.status === 'validating' && (
                            <span className={cn("inline-flex items-center gap-2 font-bold px-3 py-1.5 rounded-lg",
                              setupConfig.mode === 'online' ? "text-[#8A3FD3] bg-[#8A3FD3]/10" : "text-[#1FA7E1] bg-[#1FA7E1]/10"
                            )}>
                              <Loader2 className="h-4 w-4 animate-spin" /> Validating...
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {canCancelOnlineSession && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleCancelOnlineSession}
                              disabled={launchState.status === 'validating'}
                              className="rounded-xl h-14 flex-1 sm:flex-none border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 font-bold px-6"
                            >
                              {activeRoom ? 'Cancel room' : 'Leave queue'}
                            </Button>
                          )}
                          <Button
                            type="button"
                            onClick={submitSetup}
                            disabled={launchState.status === 'validating' || queueActive || privateRoomBusy}
                            className={cn(
                              "rounded-xl h-14 flex-1 px-8 font-black uppercase tracking-wide text-sm shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-white border-0",
                              setupConfig.mode === 'online'
                                ? "bg-[#8A3FD3] hover:bg-[#7b35c0] shadow-[#8A3FD3]/40"
                                : "bg-[#1FA7E1] hover:bg-[#1a95c9] shadow-[#1FA7E1]/40"
                            )}
                          >
                            {launchState.status === 'validating' ? (
                              <span className="inline-flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Starting...</span>
                            ) : (
                              setupConfig.mode === 'online' && setupConfig.queueType === 'private_room'
                                ? (privateRoomCodeInput.trim() ? 'Join Room' : 'Create Room')
                                : 'Start Battle'
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

                      {activeMatch.status === 'in_progress' && activeMatch.currentQuestion && (
                        <>
                          <div className="rounded-xl border border-border bg-muted/40 p-3 dark:border-[#2f3547] dark:bg-[#11151d]">
                            <p className="text-xs text-muted-foreground dark:text-[#9aa4be]">
                              Time left: <span className="font-semibold tabular-nums">{roundSecondsLeft}s</span>{designPauseActive ? ' (paused)' : ''}
                            </p>
                            {designPauseActive && (
                              <p className="mt-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                                Design pause keeps this battle screen static while you edit UI.
                              </p>
                            )}
                          </div>

                          <p className="text-lg font-bold text-foreground dark:text-[#f5f7fb]">
                            {activeMatch.currentQuestion.prompt}
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {activeMatch.currentQuestion.choices.map((choice, index) => (
                              <Button
                                key={index}
                                type="button"
                                variant={
                                  selectedOptionIndex === index
                                    ? 'default'
                                    : 'outline'
                                }
                                onClick={() => setSelectedOptionIndex(index)}
                                disabled={answerSubmitting || roundLocked || designPauseActive}
                                className={cn(
                                  'h-auto min-h-[48px] justify-start text-left font-medium px-4 py-3 rounded-xl whitespace-normal',
                                  selectedOptionIndex === index
                                    ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-[#0B0F19]'
                                    : '',
                                )}
                              >
                                <span className="mr-2 font-semibold">{String.fromCharCode(65 + index)}.</span>
                                {choice}
                              </Button>
                            ))}
                          </div>

                          <div className="flex justify-end">
                            <Button
                              type="button"
                              onClick={() => void submitRoundAnswer(selectedOptionIndex)}
                              disabled={answerSubmitting || roundLocked || designPauseActive}
                              className="rounded-xl"
                            >
                              {designPauseActive ? (
                                <span className="inline-flex items-center gap-2"><Pause className="h-4 w-4" /> Paused for design</span>
                              ) : answerSubmitting ? (
                                <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</span>
                              ) : roundLocked ? (
                                'Waiting for opponent...'
                              ) : (
                                'Lock Answer'
                              )}
                            </Button>
                          </div>
                        </>
                      )}

                      {lastRoundResult && (
                        <div className="rounded-xl border border-border bg-muted/30 p-3 dark:border-[#2f3547] dark:bg-[#11151d]">
                          <p className="text-sm font-semibold text-foreground dark:text-[#ecf0fb]">
                            Last round: {lastRoundResult.studentCorrect ? 'Correct' : 'Incorrect'} · {activeMatch.mode === 'bot' ? 'Bot' : 'Opponent'} {lastRoundResult.botCorrect ? 'Correct' : 'Incorrect'}
                          </p>
                          <p className="text-xs text-muted-foreground dark:text-[#9aa4be]">
                            Correct option: {String.fromCharCode(65 + lastRoundResult.correctOptionIndex)}
                          </p>
                        </div>
                      )}

                      {activeMatch.status === 'completed' && (
                        <div className="space-y-3">
                          <div
                            className={cn(
                              'rounded-2xl border p-4',
                              activeMatch.outcome === 'win'
                                ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-400/40 dark:bg-emerald-900/20'
                                : activeMatch.outcome === 'loss'
                                  ? 'border-rose-300 bg-rose-50 dark:border-rose-400/40 dark:bg-rose-900/20'
                                  : 'border-amber-300 bg-amber-50 dark:border-amber-400/40 dark:bg-amber-900/20',
                            )}
                          >
                            <p className="text-lg font-black tracking-wide text-foreground dark:text-[#ecf0fb]">
                              {activeMatch.outcome === 'win'
                                ? 'Victory!'
                                : activeMatch.outcome === 'loss'
                                  ? 'Match Complete'
                                  : 'Draw Match'}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-foreground dark:text-[#ecf0fb]">
                              Final Score: {activeMatch.scoreFor} - {activeMatch.scoreAgainst}
                            </p>
<p className="text-xs text-muted-foreground dark:text-[#9aa4be]">
                               XP Earned: +{activeMatch.xpBreakdown?.totalXPAwarded ?? activeMatch.xpEarned ?? 0}
                               {activeMatch.xpBreakdown && (
                                 <span className="block">Base: +{activeMatch.xpBreakdown.baseMatchXP} + Performance: +{activeMatch.xpBreakdown.performanceXP}</span>
                               )}
                             </p>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setActiveMatch(null);
                                setActiveRoom(null);
                                setQueueActive(false);
                                setActiveTab('setup');
                              }}
                              className="rounded-xl"
                            >
                              Start New Match
                            </Button>
                            {activeMatch.mode === 'bot' && (
                              <Button
                                type="button"
                                onClick={() => void handleRequestRematch()}
                                disabled={answerSubmitting}
                                className="rounded-xl"
                              >
                                Rematch
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            </TabsContent>

            <TabsContent value="history" className="mt-0 outline-none">
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-4"
              >
                {/* History Banner */}
                <motion.div 
                  className={cn(cardFrameClass, "relative overflow-hidden rounded-[24px] mb-6 border-emerald-500/20 shadow-[0_0_40px_-10px_rgba(16,185,129,0.2)]")}
                  whileHover={{ scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-emerald-600/5 dark:from-emerald-500/20 dark:via-teal-500/10 dark:to-teal-900/10" />
                  
                  {/* Animated Background Elements */}
                  <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl animate-orb-pulse" />
                  <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-teal-400/20 blur-2xl animate-orb-pulse-delayed" />

                  <div className="relative z-10 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-5">
                      <Button variant="ghost" onClick={() => setActiveTab("hub")} className="h-12 w-12 p-0 rounded-full bg-white/50 dark:bg-black/40 hover:bg-white/80 dark:hover:bg-black/60 hover:scale-105 transition-all backdrop-blur-md border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] shrink-0">
                        <ChevronRight className="h-6 w-6 rotate-180 text-emerald-800 dark:text-emerald-300" />
                      </Button>
                      <div>
                        <h2 className="flex items-center gap-3 text-3xl sm:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-emerald-600 to-teal-500 dark:from-emerald-300 dark:to-teal-200 drop-shadow-sm">
                          <div className="bg-emerald-100 dark:bg-emerald-900/50 p-2 rounded-2xl shadow-inner border border-emerald-200 dark:border-emerald-700/50 animate-icon-rotate">
                            <History className="h-8 w-8 text-emerald-600 dark:text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                          </div>
                          Matches History
                        </h2>
                        <p className="text-sm font-bold text-emerald-800/80 dark:text-emerald-100/70 mt-2 tracking-wide uppercase">
                          Review your past duels and track your progress.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <Card className={cn(cardFrameClass, 'rounded-[18px]')}>
                  <CardHeader>
                    <CardTitle className="text-base">Match History</CardTitle>
                    <CardDescription className="text-muted-foreground dark:text-[#b2bad0]">Your recent student battles only.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      {[
                        { value: 'all', label: 'All' },
                        { value: 'online', label: 'Online' },
                        { value: 'bot', label: 'Bot' },
                      ].map((entry) => (
                        <Button
                          key={entry.value}
                          type="button"
                          variant={historyFilterMode === entry.value ? 'default' : 'outline'}
                          onClick={() => setHistoryFilterMode(entry.value as 'all' | QuizBattleMode)}
                          className="rounded-xl h-8 px-3"
                        >
                          {entry.label}
                        </Button>
                      ))}
                    </div>

                    {statsLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-12 w-full rounded-xl bg-muted dark:bg-[#2a3143]" />
                        <Skeleton className="h-12 w-full rounded-xl bg-muted dark:bg-[#2a3143]" />
                      </div>
                    ) : filteredHistory.length === 0 ? (
                      <p className="text-sm text-muted-foreground dark:text-[#a8b2c9]">No matches in this filter yet.</p>
                    ) : (
                      filteredHistory.map((entry) => (
                        <div key={entry.matchId} className="rounded-xl border border-border bg-muted/40 px-3 py-2 flex items-center justify-between gap-3 dark:border-[#2f3547] dark:bg-[#11151d]">
                          <div>
                            <p className="text-sm font-semibold text-foreground dark:text-[#f5f7fb]">vs {entry.opponentName}</p>
                            <p className="text-xs text-muted-foreground dark:text-[#95a0bb] tabular-nums">{entry.scoreFor}-{entry.scoreAgainst} · {entry.accuracy.toFixed(0)}% · +{entry.xpEarned} XP</p>
                          </div>
                          <span className={cn('text-xs font-semibold rounded-full px-2.5 py-1 border', entry.outcome === 'win' ? 'text-emerald-700 border-emerald-200 bg-emerald-50 dark:text-emerald-300 dark:border-emerald-300/40 dark:bg-emerald-900/20' : entry.outcome === 'loss' ? 'text-rose-700 border-rose-200 bg-rose-50 dark:text-rose-300 dark:border-rose-300/40 dark:bg-rose-900/20' : 'text-amber-700 border-amber-200 bg-amber-50 dark:text-amber-300 dark:border-amber-300/40 dark:bg-amber-900/20')}>
                            {formatOutcomeChip(entry.outcome)}
                          </span>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="stats" className="mt-0 outline-none">
              <motion.div
                key="stats"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-4"
              >
                {/* Stats Banner */}
                <motion.div 
                  className={cn(cardFrameClass, "relative overflow-hidden rounded-[24px] mb-6 border-indigo-500/20 shadow-[0_0_40px_-10px_rgba(99,102,241,0.2)]")}
                  whileHover={{ scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-indigo-500/20 via-purple-500/10 to-indigo-600/5 dark:from-indigo-500/20 dark:via-purple-500/10 dark:to-purple-900/10" />
                  
                  {/* Animated Background Elements */}
                  <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl animate-orb-pulse" />
                  <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-purple-400/20 blur-2xl animate-orb-pulse-delayed" />

                  <div className="relative z-10 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-5">
                      <Button variant="ghost" onClick={() => setActiveTab("hub")} className="h-12 w-12 p-0 rounded-full bg-white/50 dark:bg-black/40 hover:bg-white/80 dark:hover:bg-black/60 hover:scale-105 transition-all backdrop-blur-md border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)] shrink-0">
                        <ChevronRight className="h-6 w-6 rotate-180 text-indigo-800 dark:text-indigo-300" />
                      </Button>
                      <div>
                        <h2 className="flex items-center gap-3 text-3xl sm:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 to-purple-500 dark:from-indigo-300 dark:to-purple-200 drop-shadow-sm">
                          <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-2xl shadow-inner border border-indigo-200 dark:border-indigo-700/50 animate-icon-bob">
                            <Target className="h-8 w-8 text-indigo-600 dark:text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                          </div>
                          My Statistics
                        </h2>
                        <p className="text-sm font-bold text-indigo-800/80 dark:text-indigo-100/70 mt-2 tracking-wide uppercase">
                          Analyzing your battlefield performance.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  {[
                    {
                      label: 'Wins',
                      value: statsData?.wins ?? 0,
                      icon: Trophy,
                    },
                  {
                    label: 'Current streak',
                    value: statsData?.currentStreak ?? 0,
                    icon: Sparkles,
                  },
                  {
                    label: 'Avg accuracy',
                    value: `${(statsData?.averageAccuracy || 0).toFixed(1)}%`,
                    icon: ShieldCheck,
                  },
                  {
                    label: 'Avg response',
                    value: formatResponseTime(statsData?.averageResponseMs || 0),
                    icon: Clock3,
                  },
                ].map((entry) => (
                  <Card key={entry.label} className={cn(cardFrameClass, 'rounded-[18px]')}>
                    <CardContent className="pt-6">
                      <p className="text-xs text-muted-foreground dark:text-[#9da7bf]">{entry.label}</p>
                      <p className="mt-1 tabular-nums text-2xl font-black text-foreground dark:text-[#f5f7fb]">{entry.value}</p>
                      <entry.icon className="mt-3 h-4 w-4 text-primary dark:text-[#9e8fff]" />
                    </CardContent>
                  </Card>
                ))}
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="leaderboard" className="mt-0 outline-none">
              <motion.div
                key="leaderboard"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-4"
              >
                {/* Leaderboard Banner */}
                <motion.div 
                  className={cn(cardFrameClass, "relative overflow-hidden rounded-[24px] mb-6 border-amber-500/20 shadow-[0_0_40px_-10px_rgba(245,158,11,0.2)]")}
                  whileHover={{ scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-amber-600/5 dark:from-amber-600/20 dark:via-orange-500/10 dark:to-orange-900/10" />
                  
                  {/* Animated Background Elements */}
                  <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl animate-orb-pulse" />
                  <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-orange-400/20 blur-2xl animate-orb-pulse-delayed" />

                  <div className="relative z-10 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-5">
                      <Button variant="ghost" onClick={() => setActiveTab("hub")} className="h-12 w-12 p-0 rounded-full bg-white/50 dark:bg-black/40 hover:bg-white/80 dark:hover:bg-black/60 hover:scale-105 transition-all backdrop-blur-md border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)] shrink-0">
                        <ChevronRight className="h-6 w-6 rotate-180 text-amber-800 dark:text-amber-300" />
                      </Button>
                      <div>
                        <h2 className="flex items-center gap-3 text-3xl sm:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-amber-600 to-orange-500 dark:from-amber-300 dark:to-orange-200 drop-shadow-sm">
                          <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            className="bg-amber-100 dark:bg-amber-900/50 p-2 rounded-2xl shadow-inner border border-amber-200 dark:border-amber-700/50"
                          >
                            <Trophy className="h-8 w-8 text-amber-600 dark:text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]" />
                          </motion.div>
                          Hall of Fame
                        </h2>
                        <p className="text-sm font-bold text-amber-800/80 dark:text-amber-100/70 mt-2 tracking-wide uppercase">
                          The top-ranked minds across the globe.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <Card className={cn(cardFrameClass, 'rounded-[18px]')}>
                

                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><Crown className="h-4 w-4 text-primary dark:text-[#9e8fff]" /> Hall of Fame</CardTitle>
                    <CardDescription className="text-muted-foreground dark:text-[#b2bad0]">
                      Student-only ranking using trusted backend aggregates.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {leaderboardLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-12 w-full rounded-xl bg-muted dark:bg-[#2a3143]" />
                        <Skeleton className="h-12 w-full rounded-xl bg-muted dark:bg-[#2a3143]" />
                        <Skeleton className="h-12 w-full rounded-xl bg-muted dark:bg-[#2a3143]" />
                      </div>
                    ) : leaderboardRows.length === 0 ? (
                      <p className="text-sm text-muted-foreground dark:text-[#a9b3ca]">No leaderboard entries yet. Finish a battle to place on the board.</p>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                          <div className="rounded-xl border border-border bg-muted/30 p-2.5 dark:border-[#2f3547] dark:bg-[#11151d]">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground dark:text-[#98a2bc]">Name display</p>
                            <Select value={leaderboardNameMode} onValueChange={(value) => setLeaderboardNameMode(value as 'alias' | 'initials' | 'full')}>
                              <SelectTrigger className="mt-1 h-8 rounded-lg">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="alias">Alias</SelectItem>
                                <SelectItem value="initials">Initials</SelectItem>
                                <SelectItem value="full">Full name</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <label className="rounded-xl border border-border bg-muted/30 p-2.5 flex items-center justify-between gap-3 dark:border-[#2f3547] dark:bg-[#11151d]">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground dark:text-[#98a2bc]">Score detail</p>
                              <p className="text-xs text-muted-foreground dark:text-[#98a2bc]">Show exact score values</p>
                            </div>
                            <Switch checked={showExactLeaderboardScores} onCheckedChange={setShowExactLeaderboardScores} />
                          </label>
                        </div>

                        <p className="text-xs text-muted-foreground dark:text-[#95a0bb]">
                          Privacy mode keeps classmate identities and scores obfuscated by default while preserving your own exact rank and score.
                        </p>

                        {leaderboardRows.map((entry) => (
                          <div
                            key={entry.userId}
                            className={cn(
                              'rounded-xl border bg-muted/30 px-3 py-2 flex items-center justify-between dark:bg-[#11151d]',
                              entry.isSelf
                                ? 'border-primary/60 dark:border-[#8d7fff]'
                                : 'border-border dark:border-[#2f3547]',
                            )}
                          >
                            <div>
                              <p className="text-sm font-semibold text-foreground dark:text-[#f5f7fb]">
                                #{entry.rank} {entry.displayName}{entry.isSelf ? ' (You)' : ''}
                              </p>
                              <p className="text-xs text-muted-foreground dark:text-[#95a0bb]">Win rate {entry.winRate.toFixed(1)}% · Best streak {entry.bestStreak}</p>
                            </div>
                            <p className="tabular-nums text-sm font-semibold text-foreground dark:text-[#f5f7fb]">{entry.scoreLabel}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
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
