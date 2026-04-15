import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import quizBattleAvatar from '../assets/quiz_battle_avatar.png';
// { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { Skeleton } from './ui/skeleton';
import { cn } from './ui/utils';

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

const QuizBattlePage: React.FC = () => {
  const { userProfile, userRole } = useAuth();
  const studentProfile = userProfile as StudentProfile | null;
  const [activeTab, setActiveTab] = useState<BattlePageTab>('hub');
  const [setupConfig, setSetupConfig] = useState<QuizBattleSetupConfig>(createDefaultQuizBattleSetup);
  const [setupErrors, setSetupErrors] = useState<QuizBattleSetupError[]>([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [launchState, setLaunchState] = useState<LaunchState>({ status: 'idle' });
  const [queueActive, setQueueActive] = useState(false);
  const [activeRoom, setActiveRoom] = useState<QuizBattlePrivateRoomState | null>(null);
  const [privateRoomCodeInput, setPrivateRoomCodeInput] = useState('');
  const [copiedRoomCode, setCopiedRoomCode] = useState<string | null>(null);
  const [queueWaitSeconds, setQueueWaitSeconds] = useState(0);
  const [battleSoundEnabled, setBattleSoundEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem('quiz_battle_sound_enabled') !== '0';
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
  const [lastRoundResult, setLastRoundResult] = useState<QuizBattleRoundResult | null>(null);
  const lifecycleEventRef = useRef<string>('');
  const countdownSoundRef = useRef<number | null>(null);
  const autoSubmitRoundRef = useRef<number | null>(null);
  const autoSubmitRetryAtMsRef = useRef(0);
  const celebratedMatchIdRef = useRef<string>('');

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

  const playBattleTone = useCallback((kind: 'tick' | 'lock' | 'result' | 'win' | 'loss') => {
    if (!battleSoundEnabled || typeof window === 'undefined') return;

    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;

    try {
      const context = new AudioContextCtor();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      const presets: Record<typeof kind, { frequency: number; duration: number; type: OscillatorType; volume: number }> = {
        tick: { frequency: 740, duration: 0.06, type: 'triangle', volume: 0.035 },
        lock: { frequency: 520, duration: 0.08, type: 'square', volume: 0.04 },
        result: { frequency: 660, duration: 0.1, type: 'sine', volume: 0.045 },
        win: { frequency: 920, duration: 0.18, type: 'triangle', volume: 0.05 },
        loss: { frequency: 240, duration: 0.16, type: 'sawtooth', volume: 0.045 },
      };

      const preset = presets[kind];
      const now = context.currentTime;

      oscillator.type = preset.type;
      oscillator.frequency.setValueAtTime(preset.frequency, now);

      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.exponentialRampToValueAtTime(preset.volume, now + 0.015);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + preset.duration);

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + preset.duration + 0.02);

      window.setTimeout(() => {
        void context.close();
      }, Math.ceil((preset.duration + 0.06) * 1000));
    } catch (error) {
      console.debug('Battle tone playback skipped:', error);
    }
  }, [battleSoundEnabled]);

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
        setQueueActive(false);
        setActiveRoom(resumed.room || null);
        setActiveMatch(resumed.match);
        setActiveTab('battle');
        setConnectionState('connected');
        return;
      }

      if (resumed.sessionType === 'room' && resumed.room) {
        setQueueActive(false);
        setActiveRoom(resumed.room);
        setActiveMatch((current) => (current?.mode === 'bot' ? current : null));
        setConnectionState('connected');
        return;
      }

      if (resumed.sessionType === 'queue') {
        setQueueActive(true);
        setActiveRoom(null);
        setActiveMatch((current) => (current?.mode === 'bot' ? current : null));
        setConnectionState('connected');
        return;
      }

      setQueueActive(false);
      setActiveRoom(null);
      setActiveMatch((current) => (current?.mode === 'bot' ? current : null));
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
    if (!(queueActive || (activeRoom && (activeRoom.status === 'waiting' || activeRoom.status === 'ready')))) {
      setQueueWaitSeconds(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      setQueueWaitSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [queueActive, activeRoom?.status, activeRoom?.roomId]);

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
    const isRoomWaiting = Boolean(activeRoom && (activeRoom.status === 'waiting' || activeRoom.status === 'ready'));

    if (!queueActive && !isRoomWaiting && !isOnlineMatchActive) {
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        if (activeMatch?.mode === 'online') {
          if (activeMatch.status === 'ready') {
            const started = await startQuizBattleMatch(activeMatch.matchId);
            if (cancelled) return;
            setActiveMatch(started);
            setConnectionState('connected');
            if (started.status === 'in_progress') {
              setLaunchState({ status: 'queued', message: 'Match started. Round timer is live.' });
            }
            return;
          }

          const latest = await getQuizBattleMatchState(activeMatch.matchId);
          if (cancelled) return;
          setActiveMatch(latest);
          if (latest.status === 'completed') {
            setQueueActive(false);
            setActiveRoom(null);
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
            setActiveTab('battle');
            setConnectionState('connected');
            setLaunchState({ status: 'queued', message: 'Opponent found. Preparing synchronized start...' });
            return;
          }

          if (resumed.sessionType === 'room' && resumed.room) {
            setQueueActive(false);
            setActiveRoom(resumed.room);
            setConnectionState('connected');
            return;
          }

          setConnectionState('connected');
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('Quiz Battle sync poll failed:', error);
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
    if (!activeMatch || activeMatch.status !== 'in_progress' || roundLocked || answerSubmitting) {
      countdownSoundRef.current = null;
      return;
    }

    if (roundSecondsLeft <= 3 && roundSecondsLeft > 0 && countdownSoundRef.current !== roundSecondsLeft) {
      countdownSoundRef.current = roundSecondsLeft;
      playBattleTone('tick');
    }
  }, [activeMatch?.status, roundSecondsLeft, roundLocked, answerSubmitting, playBattleTone]);

  const submitRoundAnswer = useCallback(
    async (forcedSelection: number | null) => {
      if (!activeMatch || activeMatch.status !== 'in_progress' || roundLocked) {
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

        setActiveMatch(response.match);
        setLastRoundResult(response.roundResult);
        setSelectedOptionIndex(null);

        if (
          response.match.mode === 'online' &&
          response.match.status === 'in_progress' &&
          !response.roundResult
        ) {
          setRoundLocked(true);
          setLaunchState({
            status: 'queued',
            message: 'Answer locked. Waiting for opponent to finish the round...',
          });
        }

        if (response.match.status === 'completed') {
          setQueueActive(false);
          setActiveRoom(null);
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
    [activeMatch, refreshBattleInsights, roundLocked, roundSecondsLeft],
  );

  useEffect(() => {
    if (!activeMatch || activeMatch.status !== 'in_progress') return;
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
  }, [activeMatch, answerSubmitting, roundLocked, roundSecondsLeft, selectedOptionIndex, submitRoundAnswer]);

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
    );
  }

  const setMode = (mode: QuizBattleMode) => {
    setSetupErrors([]);
    setLaunchState({ status: 'idle' });
    setQueueActive(false);
    setActiveRoom(null);
    setPrivateRoomCodeInput('');
    setActiveMatch(null);
    setLastRoundResult(null);
    setSelectedOptionIndex(null);
    setRoundLocked(false);
    setSetupConfig((previous) => ({
      ...previous,
      mode,
      queueType: mode === 'online' ? previous.queueType : 'public_matchmaking',
    }));
    setQueueWaitSeconds(0);
    setActiveTab('setup');
  };

  const handleSetupModeChange = (mode: QuizBattleMode) => {
    setSetupErrors([]);
    setLaunchState({ status: 'idle' });
    setQueueActive(false);
    setActiveRoom(null);
    setPrivateRoomCodeInput('');
    setActiveMatch(null);
    setLastRoundResult(null);
    setSelectedOptionIndex(null);
    setRoundLocked(false);
    setQueueWaitSeconds(0);
    setSetupConfig((previous) => ({
      ...previous,
      mode,
      queueType: mode === 'online' ? previous.queueType : 'public_matchmaking',
    }));
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

          if (roomResult.match) {
            const started = await startQuizBattleMatch(roomResult.match.matchId);
            setActiveMatch(started);
            setLastRoundResult(null);
            setSelectedOptionIndex(null);
            setRoundLocked(false);
            setActiveTab('battle');
            setLaunchState({
              status: 'queued',
              message: started.status === 'ready'
                ? `Room ${roomResult.room.roomCode} linked. Waiting for synchronized start...`
                : 'Private room match started.',
            });
            return;
          }

          setActiveMatch(null);
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
          setLaunchState({
            status: 'queued',
            message: 'Opponent found. Preparing synchronized start...',
          });
          return;
        }

        setQueueActive(true);
        setActiveRoom(null);
        setActiveMatch(null);
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

  return (
    <WarpBackground className="-mx-3 lg:-mx-4 -mt-3 lg:-mt-4 -mb-8 px-4 sm:px-6 xl:px-10 py-6 sm:py-8 min-h-[calc(100vh-3.5rem)] !w-auto overflow-hidden relative">
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
                        className="absolute inset-0 opacity-10 pointer-events-none rounded-[2rem] overflow-hidden" 
                        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 39px, #ffffff 39px, #ffffff 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, #ffffff 39px, #ffffff 40px)' }}
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
                        
                        {/* Enlarged Avatar floating without overflow clipping */}
                        <div className="hidden md:block absolute right-[-5px] lg:right-[-15px] top-0 lg:top-[5px] w-[200px] lg:w-[260px] shrink-0 pointer-events-none z-20">
                          <motion.img 
                             src={quizBattleAvatar} 
                             alt="Mascot" 
                             className="w-full h-full object-contain" 
                             animate={{ y: [0, -24, 0], rotate: [-3, 3, -3] }}
                             transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
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
                            <div className="absolute inset-0 flex items-center justify-end pr-3 font-black text-[13px] text-white tracking-[0.3px] opacity-100" style={{ fontFamily: "'Nunito', sans-serif" }}>
                              VS Player
                            </div>
                          </div>

                          <div className="rounded-[22px] overflow-hidden relative isolate h-full flex flex-col justify-end">
                            {/* Shine Effect */}
                            <div className="absolute top-0 -left-[150%] w-[100%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12 z-50 pointer-events-none transition-all duration-0 group-hover:duration-[800ms] ease-in-out group-hover:left-[150%]" />
                            
                            <div className="flex-1 w-full flex items-end justify-center relative pt-2 pointer-events-none">
                              {/* Expanded Full-Width Stage (Dark Purple) */}
                              <div className="absolute bottom-0 left-0 w-full h-[70px] sm:h-[95px] bg-[#662AA8] rounded-[50%_50%_0_0/100%_100%_0_0] scale-[1.05] z-0" />
                              
                              {/* Animated Avatar Clones (VS Match) */}
                              <div className="relative z-10 flex items-center justify-center mb-[2px] h-[120px] sm:h-[140px] w-full">
                                {/* Left Avatar */}
                                <motion.img 
                                  src="/avatar/avatar_icon.png" 
                                  alt="" 
                                  className="h-[120%] sm:h-[125%] object-contain relative z-20 origin-bottom right-[-15px] drop-shadow-[0_12px_15px_rgba(0,0,0,0.3)]"
                                  animate={{ y: [0, -5, 0] }}
                                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                />
                                {/* Center VS */}
                                <motion.div 
                                  className="relative z-30 flex flex-col items-center mx-[-20px] scale-[1.1]"
                                  animate={{ scale: [1.1, 1.15, 1.1] }}
                                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                >
                                  <span className="font-black italic text-[40px] text-gray-200 tracking-tighter leading-none drop-shadow-[-2px_3px_0px_rgba(0,0,0,0.8)]" style={{ WebkitTextStroke: "1.5px #666" }}>
                                    <span className="text-gray-300">V</span><span className="text-gray-400">S</span>
                                  </span>
                                </motion.div>
                                {/* Right Avatar (Flipped) */}
                                <motion.img 
                                  src="/avatar/avatar_icon.png" 
                                  alt="" 
                                  className="h-[120%] sm:h-[125%] object-contain relative z-10 scale-x-[-1] origin-bottom left-[-20px] drop-shadow-[0_12px_15px_rgba(0,0,0,0.3)]"
                                  animate={{ y: [0, -4, 0] }}
                                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                                />
                              </div>
                            </div>
                            
                            <div className="relative z-10 w-full px-5 py-3 sm:py-4 text-center bg-[#662AA8]">
                              <p className="text-[13px] font-bold text-white leading-[1.45]" style={{ fontFamily: "'Nunito', sans-serif" }}>
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
                            <div className="absolute inset-0 flex items-center justify-end pr-3 font-black text-[13px] text-white tracking-[0.3px] opacity-100" style={{ fontFamily: "'Nunito', sans-serif" }}>
                              VS Bot
                            </div>
                          </div>

                          <div className="rounded-[22px] overflow-hidden relative isolate h-full flex flex-col justify-end">
                            {/* Shine Effect */}
                            <div className="absolute top-0 -left-[150%] w-[100%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12 z-50 pointer-events-none transition-all duration-0 group-hover:duration-[800ms] ease-in-out group-hover:left-[150%]" />
                            
                            <div className="flex-1 w-full flex items-end justify-center relative pt-2 pointer-events-none">
                              {/* Expanded Full-Width Stage (Dark Blue) */}
                              <div className="absolute bottom-0 left-0 w-full h-[70px] sm:h-[95px] bg-[#127DA6] rounded-[50%_50%_0_0/100%_100%_0_0] scale-[1.05] z-0" />
                              
                              {/* Ghosting Avatars */}
                              <div className="relative z-10 flex items-end justify-center mb-[2px] h-[125px] sm:h-[145px] w-full">
                                {/* Left Ghost */}
                                <motion.img 
                                  src="/avatar/avatar_icon.png" 
                                  alt="" 
                                  className="absolute opacity-40 blur-[1px] h-full object-contain origin-bottom -translate-x-[45px] sm:-translate-x-[60px] scale-[0.80] sm:scale-[0.85]"
                                  animate={{ y: [0, -3, 0] }}
                                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                                />
                                {/* Right Ghost */}
                                <motion.img 
                                  src="/avatar/avatar_icon.png" 
                                  alt="" 
                                  className="absolute opacity-40 blur-[1px] h-full object-contain origin-bottom translate-x-[45px] sm:translate-x-[60px] scale-[0.80] sm:scale-[0.85]"
                                  animate={{ y: [0, -3, 0] }}
                                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                                />
                                {/* Main Avatar */}
                                <motion.img 
                                  src="/avatar/avatar_icon.png" 
                                  alt="VS Bot" 
                                  className="relative opacity-100 scale-100 h-[105%] sm:h-[115%] object-contain drop-shadow-[0_15px_15px_rgba(0,0,0,0.3)] z-20 origin-bottom"
                                  animate={{ y: [0, -5, 0] }}
                                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                                />
                              </div>
                            </div>
                            
                            <div className="relative z-10 w-full px-5 py-3 sm:py-4 text-center bg-[#127DA6]">
                              <p className="text-[13px] font-bold text-white leading-[1.45]" style={{ fontFamily: "'Nunito', sans-serif" }}>
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
                              
                              <motion.div animate={{ y: [-4, 4, -4] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="z-10 relative">
                                <Star strokeWidth={0} fill="currentColor" className="w-[60px] h-[60px] text-[#fcd34d] drop-shadow-[0_0_25px_rgba(252,211,77,0.9)]" />
                              </motion.div>

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
                                   <div className="absolute -left-1 top-2 w-[55px] h-[40px] bg-[#8b0d0d] z-0" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%, 25% 50%, 0 0)'}}></div>
                                   {/* Right Cutout Flap */}
                                   <div className="absolute -right-1 top-2 w-[55px] h-[40px] bg-[#8b0d0d] z-0" style={{ clipPath: 'polygon(0 0, 0 100%, 100% 100%, 75% 50%, 100% 0)'}}></div>
                                   
                                   {/* Front Ribbon Face */}
                                   <div className="absolute inset-x-6 top-0 bottom-0 bg-[#b61515] shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),_inset_0_-4px_4px_rgba(0,0,0,0.2)] z-10 flex flex-col items-center justify-center">
                                       <h3 className="text-lg sm:text-xl font-black text-white tracking-widest leading-none drop-shadow-md" style={{ fontFamily: "'Nunito', sans-serif" }}>Hall of Fame</h3>
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
                        <h3 className="text-[18px] font-black text-white tracking-wide leading-none drop-shadow-md" style={{ fontFamily: "'Nunito', sans-serif" }}>My Stats</h3>
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
                        
                        <motion.div 
                          className="flex w-max pl-3"
                          animate={{ x: ["0%", "-50%"] }}
                          transition={{ ease: "linear", duration: 15, repeat: Infinity }}
                        >
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
                        </motion.div>
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
              <Button 
                variant="ghost" 
                onClick={() => setActiveTab("hub")} 
                className="mb-5 h-11 w-11 p-0 rounded-full bg-white/50 dark:bg-black/40 hover:bg-white/80 dark:hover:bg-black/60 hover:scale-105 transition-all backdrop-blur-md border border-primary/30 shadow-[0_0_15px_rgba(99,102,241,0.2)] shrink-0 flex items-center justify-center group"
              >
                <ChevronRight className="h-5 w-5 rotate-180 text-primary dark:text-[#9e8fff] transition-transform group-hover:-translate-x-0.5" />
              </Button>
              <motion.div
                key="setup"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-4"
              >
                <Card className={cn(cardFrameClass, 'rounded-[18px]')}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-primary dark:text-[#9e8fff]" /> Battle Setup</CardTitle>
                    <CardDescription className="text-muted-foreground dark:text-[#b2bad0]">
                      Configure a student-safe match and start quickly.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground dark:text-[#c7cfe3]">Mode</label>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            variant={setupConfig.mode === 'online' ? 'default' : 'outline'}
                            onClick={() => handleSetupModeChange('online')}
                            className="h-10 rounded-xl"
                          >
                            1v1 Online
                          </Button>
                          <Button
                            type="button"
                            variant={setupConfig.mode === 'bot' ? 'default' : 'outline'}
                            onClick={() => handleSetupModeChange('bot')}
                            className="h-10 rounded-xl"
                          >
                            1v1 vs Bot
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground dark:text-[#c7cfe3]">Category</label>
                        <Select
                          value={setupConfig.subjectId}
                          onValueChange={(value) => setSetupConfig((previous) => ({ ...previous, subjectId: value }))}
                        >
                          <SelectTrigger className={cn('rounded-xl', errorFor('subjectId') && 'border-rose-400')}>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {gradeScopedSubjects.map((entry) => (
                              <SelectItem key={entry.id} value={entry.id}>{entry.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errorFor('subjectId') && <p className="text-xs text-destructive dark:text-rose-300">{errorFor('subjectId')}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground dark:text-[#c7cfe3]">Strand / Topic Group</label>
                        <Select
                          value={setupConfig.topicId}
                          onValueChange={(value) => setSetupConfig((previous) => ({ ...previous, topicId: value }))}
                        >
                          <SelectTrigger className={cn('rounded-xl', errorFor('topicId') && 'border-rose-400')}>
                            <SelectValue placeholder="Select topic group" />
                          </SelectTrigger>
                          <SelectContent>
                            {moduleOptions.map((entry) => (
                              <SelectItem key={entry.value} value={entry.value}>{entry.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errorFor('topicId') && <p className="text-xs text-destructive dark:text-rose-300">{errorFor('topicId')}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground dark:text-[#c7cfe3]">Difficulty</label>
                        <Select
                          value={setupConfig.mode === 'bot' ? setupConfig.botDifficulty : setupConfig.difficulty}
                          onValueChange={(value) =>
                            setSetupConfig((previous) =>
                              previous.mode === 'bot'
                                ? { ...previous, botDifficulty: value as QuizBattleSetupConfig['botDifficulty'] }
                                : { ...previous, difficulty: value as QuizBattleSetupConfig['difficulty'] },
                            )
                          }
                        >
                          <SelectTrigger className="rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                            {setupConfig.mode === 'bot' && <SelectItem value="adaptive">Adaptive</SelectItem>}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground dark:text-[#c7cfe3]">Number of Questions</label>
                        <Select
                          value={String(setupConfig.rounds)}
                          onValueChange={(value) => setSetupConfig((previous) => ({ ...previous, rounds: Number(value) }))}
                        >
                          <SelectTrigger className={cn('rounded-xl', errorFor('rounds') && 'border-rose-400')}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[3, 5, 7, 10, 12, 15].map((entry) => (
                              <SelectItem key={entry} value={String(entry)}>{entry}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errorFor('rounds') && <p className="text-xs text-destructive dark:text-rose-300">{errorFor('rounds')}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground dark:text-[#c7cfe3]">Time per Question</label>
                        <Select
                          value={String(setupConfig.timePerQuestionSec)}
                          onValueChange={(value) =>
                            setSetupConfig((previous) => ({ ...previous, timePerQuestionSec: Number(value) }))
                          }
                        >
                          <SelectTrigger className={cn('rounded-xl', errorFor('timePerQuestionSec') && 'border-rose-400')}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[15, 20, 30, 45, 60, 90].map((entry) => (
                              <SelectItem key={entry} value={String(entry)}>{entry} sec</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errorFor('timePerQuestionSec') && <p className="text-xs text-destructive dark:text-rose-300">{errorFor('timePerQuestionSec')}</p>}
                      </div>
                    </div>

                    <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                      <CollapsibleTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-between rounded-xl"
                        >
                          Advanced settings
                          <ChevronRight className={cn('h-4 w-4 transition-transform', advancedOpen && 'rotate-90')} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-3 rounded-xl border border-border bg-muted/40 p-3 space-y-3 dark:border-[#2e364a] dark:bg-[#11151d]">
                        {setupConfig.mode === 'online' ? (
                          <div className="space-y-3">
                            <label className="text-xs font-semibold text-foreground dark:text-[#c7cfe3]">Online Match Type</label>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { value: 'public_matchmaking' as QuizBattleQueueType, label: 'Public Queue' },
                                { value: 'private_room' as QuizBattleQueueType, label: 'Private Room' },
                              ].map((entry) => (
                                <Button
                                  key={entry.value}
                                  type="button"
                                  variant={setupConfig.queueType === entry.value ? 'default' : 'outline'}
                                  className="rounded-xl h-9"
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

                            {setupConfig.queueType === 'private_room' && (
                              <div className="space-y-2">
                                <label className="text-xs font-semibold text-foreground dark:text-[#c7cfe3]">
                                  Room Code (optional)
                                </label>
                                <Input
                                  value={privateRoomCodeInput}
                                  onChange={(event) =>
                                    setPrivateRoomCodeInput(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))
                                  }
                                  placeholder="Leave blank to create a room"
                                  className="rounded-xl uppercase tracking-[0.15em]"
                                  maxLength={6}
                                />
                                <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-[13px] font-semibold text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                                  Enter a room code to join an existing battle, or leave it blank to create a new room and share your code.
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            <label className="flex items-center justify-between rounded-xl border border-border bg-card p-3 dark:border-[#2f3547] dark:bg-[#171d2a]">
                              <div>
                                <p className="text-sm font-semibold text-foreground dark:text-[#ecf0fb]">Adaptive Bot</p>
                                <p className="text-xs text-muted-foreground dark:text-[#a9b3ca]">Tune response timing and accuracy to your recent trend.</p>
                              </div>
                              <Switch
                                checked={setupConfig.adaptiveBot}
                                onCheckedChange={(checked) =>
                                  setSetupConfig((previous) => ({
                                    ...previous,
                                    adaptiveBot: checked,
                                    botDifficulty: checked ? 'adaptive' : previous.botDifficulty === 'adaptive' ? 'medium' : previous.botDifficulty,
                                  }))
                                }
                              />
                            </label>
                            <label className="flex items-center justify-between rounded-xl border border-border bg-card p-3 dark:border-[#2f3547] dark:bg-[#171d2a]">
                              <div className="flex items-center gap-2">
                                {battleSoundEnabled ? <Volume2 className="h-4 w-4 text-primary dark:text-[#9e8fff]" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
                                <div>
                                  <p className="text-sm font-semibold text-foreground dark:text-[#ecf0fb]">Battle Sounds</p>
                                  <p className="text-xs text-muted-foreground dark:text-[#a9b3ca]">Play audio cues for countdowns and results.</p>
                                </div>
                              </div>
                              <Switch checked={battleSoundEnabled} onCheckedChange={setBattleSoundEnabled} />
                            </label>
                          </>
                        )}

                        {setupConfig.mode === 'online' && (
                          <label className="flex items-center justify-between rounded-xl border border-border bg-card p-3 dark:border-[#2f3547] dark:bg-[#171d2a]">
                            <div className="flex items-center gap-2">
                              {battleSoundEnabled ? <Volume2 className="h-4 w-4 text-primary dark:text-[#9e8fff]" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
                              <div>
                                <p className="text-sm font-semibold text-foreground dark:text-[#ecf0fb]">Battle Sounds</p>
                                <p className="text-xs text-muted-foreground dark:text-[#a9b3ca]">Play audio cues for countdowns and results.</p>
                              </div>
                            </div>
                            <Switch checked={battleSoundEnabled} onCheckedChange={setBattleSoundEnabled} />
                          </label>
                        )}
                      </CollapsibleContent>
                    </Collapsible>

                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                      <div aria-live="polite" className="min-h-[24px] text-sm text-muted-foreground dark:text-[#b6bfd5]">
                        {launchState.status === 'queued' && (
                          <div className="flex flex-wrap items-center gap-2">
                            {launchState.message}
                            {setupConfig.mode === 'online' && setupConfig.queueType === 'private_room' && activeRoom?.roomCode && (
                              <Button
                                type="button"
                                variant="outline"
                                className={cn(
                                  'h-7 rounded-full border-amber-300/70 bg-amber-100/80 px-3 text-[11px] font-black uppercase tracking-[0.16em] text-amber-900 hover:bg-amber-200 dark:border-amber-500/50 dark:bg-amber-500/15 dark:text-amber-200 dark:hover:bg-amber-500/25',
                                  copiedRoomCode === activeRoom.roomCode
                                    ? 'border-emerald-400/80 bg-emerald-100 text-emerald-900 dark:border-emerald-400/70 dark:bg-emerald-500/20 dark:text-emerald-200'
                                    : null,
                                )}
                                onClick={() => void handleCopyRoomCode(activeRoom.roomCode)}
                                aria-label={`Copy room code ${activeRoom.roomCode}`}
                              >
                                {copiedRoomCode === activeRoom.roomCode ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                {activeRoom.roomCode}
                              </Button>
                            )}
                            {(queueActive || privateRoomBusy) && queueWaitSeconds > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary dark:bg-[#8c7dff]/20 dark:text-[#c7c0ff]">
                                Waiting {formatWaitClock(queueWaitSeconds)}
                              </span>
                            )}
                          </div>
                        )}
                        {launchState.status === 'error' && (
                          <span className="text-destructive dark:text-rose-300">{launchState.message}</span>
                        )}
                        {launchState.status === 'validating' && (
                          <span className="inline-flex items-center gap-2 text-foreground dark:text-[#d5dcf0]"><Loader2 className="h-4 w-4 animate-spin" /> Validating setup...</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {canCancelOnlineSession && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancelOnlineSession}
                            disabled={launchState.status === 'validating'}
                            className="rounded-xl"
                          >
                            {activeRoom ? 'Cancel room' : 'Leave queue'}
                          </Button>
                        )}
                        <Button
                          type="button"
                          onClick={submitSetup}
                          disabled={launchState.status === 'validating' || queueActive || privateRoomBusy}
                          className="rounded-xl"
                        >
                          {launchState.status === 'validating' ? (
                            <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Starting...</span>
                          ) : (
                            setupConfig.mode === 'online' && setupConfig.queueType === 'private_room'
                              ? (privateRoomCodeInput.trim() ? 'Join room' : 'Create room')
                              : 'Start battle'
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
                        <span className="text-sm font-bold tabular-nums">{activeMatch.scoreFor} - {activeMatch.scoreAgainst}</span>
                      </CardTitle>
                      <CardDescription className="text-muted-foreground dark:text-[#b2bad0]">
                        {activeMatch.status === 'completed'
                          ? `Completed in ${activeMatch.totalRounds} rounds.`
                          : activeMatch.status === 'ready'
                            ? 'Waiting for both players to confirm and start together.'
                            : `Round ${activeMatch.currentRound} of ${activeMatch.totalRounds}`}
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
                                : 'Preparing match session...'}
                            </p>
                            {/* Fallback Cancel Button to prevent getting permanently stuck during backend disruption */}
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
                              Time left: <span className="font-semibold tabular-nums">{roundSecondsLeft}s</span>
                            </p>
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
                                disabled={answerSubmitting || roundLocked}
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
                              disabled={answerSubmitting || roundLocked}
                              className="rounded-xl"
                            >
                              {answerSubmitting ? (
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
                              XP Earned: +{activeMatch.xpEarned || 0}
                            </p>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
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
                  <motion.div 
                    className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.div 
                    className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-teal-400/20 blur-2xl"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.5, 0.2] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  />

                  <div className="relative z-10 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-5">
                      <Button variant="ghost" onClick={() => setActiveTab("hub")} className="h-12 w-12 p-0 rounded-full bg-white/50 dark:bg-black/40 hover:bg-white/80 dark:hover:bg-black/60 hover:scale-105 transition-all backdrop-blur-md border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] shrink-0">
                        <ChevronRight className="h-6 w-6 rotate-180 text-emerald-800 dark:text-emerald-300" />
                      </Button>
                      <div>
                        <h2 className="flex items-center gap-3 text-3xl sm:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-emerald-600 to-teal-500 dark:from-emerald-300 dark:to-teal-200 drop-shadow-sm">
                          <motion.div
                            animate={{ rotate: [-5, 5, -5] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="bg-emerald-100 dark:bg-emerald-900/50 p-2 rounded-2xl shadow-inner border border-emerald-200 dark:border-emerald-700/50"
                          >
                            <History className="h-8 w-8 text-emerald-600 dark:text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                          </motion.div>
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
                  <motion.div 
                    className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.div 
                    className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-purple-400/20 blur-2xl"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.5, 0.2] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
                  />

                  <div className="relative z-10 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-5">
                      <Button variant="ghost" onClick={() => setActiveTab("hub")} className="h-12 w-12 p-0 rounded-full bg-white/50 dark:bg-black/40 hover:bg-white/80 dark:hover:bg-black/60 hover:scale-105 transition-all backdrop-blur-md border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)] shrink-0">
                        <ChevronRight className="h-6 w-6 rotate-180 text-indigo-800 dark:text-indigo-300" />
                      </Button>
                      <div>
                        <h2 className="flex items-center gap-3 text-3xl sm:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 to-purple-500 dark:from-indigo-300 dark:to-purple-200 drop-shadow-sm">
                          <motion.div
                            animate={{ y: [-3, 3, -3] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-2xl shadow-inner border border-indigo-200 dark:border-indigo-700/50"
                          >
                            <Target className="h-8 w-8 text-indigo-600 dark:text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                          </motion.div>
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
                  <motion.div 
                    className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.div 
                    className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-orange-400/20 blur-2xl"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.5, 0.2] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  />

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
  );
};

export default QuizBattlePage;
