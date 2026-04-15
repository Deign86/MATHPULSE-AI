import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { onDisconnect, ref as rtdbRef, serverTimestamp as rtdbServerTimestamp, set as rtdbSet } from 'firebase/database';
import { httpsCallable } from 'firebase/functions';
import { auth, cloudFunctions, db, realtimeDb } from '../lib/firebase';
import {
  QuizBattleLifecycleEventType,
  QuizBattleLifecycleState,
  QuizBattleMode,
  QuizBattleLeaderboardEntry,
  QuizBattleMatchSummary,
  QuizBattleSetupConfig,
  StudentBattleStats,
} from '../types/models';

export interface QuizBattleHistoryFilters {
  mode?: QuizBattleMode | 'all';
  subjectId?: string;
  startDate?: Date;
  endDate?: Date;
  limitCount?: number;
}

export interface QuizBattleSetupError {
  field:
    | 'mode'
    | 'subjectId'
    | 'topicId'
    | 'difficulty'
    | 'rounds'
    | 'timePerQuestionSec'
    | 'queueType'
    | 'botDifficulty'
    | 'general';
  message: string;
}

export interface QuizBattleQueueJoinResponse {
  success: boolean;
  status: 'queued' | 'matched' | 'idle';
  queueEntryId?: string;
  matchId?: string;
}

export interface QuizBattleLeaveSessionResponse {
  success: boolean;
  status: 'idle';
}

export interface QuizBattlePrivateRoomState {
  roomId: string;
  roomCode: string;
  ownerStudentId: string;
  participantIds: string[];
  participantCount: number;
  status: 'waiting' | 'ready' | 'cancelled' | 'expired';
  subjectId: string;
  topicId: string;
  difficulty: 'easy' | 'medium' | 'hard';
  rounds: number;
  timePerQuestionSec: number;
  matchId?: string;
  isOwner: boolean;
}

export interface QuizBattlePrivateRoomResponse {
  success: boolean;
  room: QuizBattlePrivateRoomState;
  match?: QuizBattleLiveMatchState;
}

export interface QuizBattleResumeSessionResponse {
  success: boolean;
  sessionType: 'idle' | 'queue' | 'room' | 'match';
  queue?: {
    status: 'searching' | 'matched' | 'cancelled';
    queueType: 'public_matchmaking' | 'private_room';
    matchId?: string;
  };
  room?: QuizBattlePrivateRoomState;
  match?: QuizBattleLiveMatchState;
}

export type QuizBattleHeartbeatScope = 'queue' | 'room' | 'match';
export type { QuizBattleLifecycleEventType, QuizBattleLifecycleState };

export interface QuizBattleBotMatchResponse {
  success: boolean;
  matchId: string;
  status: 'ready';
  botDifficulty: 'easy' | 'medium' | 'hard' | 'adaptive';
}

export interface QuizBattleLiveQuestion {
  roundNumber: number;
  questionId: string;
  prompt: string;
  choices: string[];
}

export interface QuizBattleRoundResult {
  roundNumber: number;
  questionId: string;
  correctOptionIndex: number;
  studentSelectedIndex: number | null;
  studentCorrect: boolean;
  botSelectedIndex: number;
  botCorrect: boolean;
  winner: 'playerA' | 'playerB' | 'draw';
  playerAResponseMs: number;
  botResponseMs: number;
  resolvedAtMs: number;
}

export interface QuizBattleLiveMatchState {
  matchId: string;
  mode: QuizBattleMode;
  status: 'ready' | 'in_progress' | 'completed' | 'cancelled';
  subjectId: string;
  topicId: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'adaptive';
  currentRound: number;
  totalRounds: number;
  timePerQuestionSec: number;
  scoreFor: number;
  scoreAgainst: number;
  opponentName: string;
  roundDeadlineAtMs?: number;
  lifecycle?: QuizBattleLifecycleState;
  currentQuestion: QuizBattleLiveQuestion | null;
  roundResults: QuizBattleRoundResult[];
  outcome?: 'win' | 'loss' | 'draw';
  xpEarned?: number;
}

export interface QuizBattleGenerationAudit {
  success: boolean;
  matchId: string;
  status: 'ready' | 'in_progress' | 'completed' | 'cancelled';
  questionSetSource: string;
  questionSetId: string;
  generatedQuestionCount: number;
  questionFingerprints: string[];
  aiGenerationAttempted: boolean;
  aiGenerationAttempts: number;
  aiGenerationLatencyMs: number;
  aiGenerationModel: string;
  generationFailureReason: string;
  questionSetGeneratedAtMs?: number;
  isAiSource: boolean;
  auditSchemaVersion: 'qb-generation-audit-v1';
}

interface QuizBattleMatchStateCallableResponse {
  success: boolean;
  match: QuizBattleLiveMatchState;
}

interface QuizBattleGenerationAuditCallableResponse extends QuizBattleGenerationAudit {}

interface QuizBattlePrivateRoomCallableResponse {
  success: boolean;
  room: QuizBattlePrivateRoomState;
  match?: QuizBattleLiveMatchState;
}

interface QuizBattleHeartbeatResponse {
  success: boolean;
  scope: QuizBattleHeartbeatScope;
  resourceId: string;
}

export interface QuizBattleSubmitAnswerResponse {
  success: boolean;
  duplicate: boolean;
  roundResult: QuizBattleRoundResult | null;
  completion?: {
    outcome: 'win' | 'loss' | 'draw';
    xpEarned: number;
  };
  match: QuizBattleLiveMatchState;
}

const DEFAULT_CALLABLE_TIMEOUT_MS = 15000;
const QUIZ_BATTLE_LOCAL_STORE_KEY = 'mathpulse.quizBattle.local';
const QUIZ_BATTLE_STRICT_GENERATION_AUDIT =
  String(import.meta.env.VITE_QUIZ_BATTLE_STRICT_GENERATION_AUDIT || '').toLowerCase() === 'true';

type LocalQuizBattleStore = {
  stats: StudentBattleStats;
  history: QuizBattleMatchSummary[];
  queueStatus: QuizBattleQueueJoinResponse['status'];
};

const isBrowser = typeof window !== 'undefined';

const isDevLocalFallbackEnabled = (): boolean => {
  return isBrowser && Boolean(import.meta.env.DEV);
};

const getActiveStudentId = (): string => {
  const userId = auth.currentUser?.uid;
  if (!userId) {
    return 'local-student';
  }

  return userId;
};

const getLocalStoreKey = (userId: string): string => `${QUIZ_BATTLE_LOCAL_STORE_KEY}.${userId}`;

const readLocalStore = (userId: string): LocalQuizBattleStore => {
  const emptyStore: LocalQuizBattleStore = {
    stats: defaultBattleStats(userId),
    history: [],
    queueStatus: 'idle',
  };

  if (!isBrowser) {
    return emptyStore;
  }

  try {
    const raw = window.localStorage.getItem(getLocalStoreKey(userId));
    if (!raw) return emptyStore;

    const parsed = JSON.parse(raw) as Partial<LocalQuizBattleStore>;

    const history = Array.isArray(parsed.history)
      ? parsed.history.map((entry) => mapHistoryEntry(entry.matchId || 'local-match', entry))
      : [];

    const parsedStats = parsed.stats
      ? {
          ...defaultBattleStats(userId),
          ...parsed.stats,
          userId,
          updatedAt: parseDateValue(parsed.stats.updatedAt),
        }
      : defaultBattleStats(userId);

    return {
      stats: parsedStats,
      history,
      queueStatus: parsed.queueStatus === 'queued' || parsed.queueStatus === 'matched'
        ? parsed.queueStatus
        : 'idle',
    };
  } catch (error) {
    console.error('Error reading local Quiz Battle fallback store:', error);
    return emptyStore;
  }
};

const writeLocalStore = (userId: string, store: LocalQuizBattleStore): void => {
  if (!isBrowser) {
    return;
  }

  try {
    window.localStorage.setItem(getLocalStoreKey(userId), JSON.stringify(store));
  } catch (error) {
    console.error('Error writing local Quiz Battle fallback store:', error);
  }
};

const getFallbackCode = (error: unknown): string => {
  const asRecord = (error as Record<string, unknown>) || {};
  const codeValue = typeof asRecord.code === 'string' ? asRecord.code : '';

  if (!codeValue) return '';

  return codeValue.startsWith('functions/') ? codeValue.replace('functions/', '') : codeValue;
};

const shouldUseLocalFallbackForError = (error: unknown): boolean => {
  if (!isDevLocalFallbackEnabled()) {
    return false;
  }

  const code = getFallbackCode(error);
  if (['internal', 'not-found', 'unavailable', 'deadline-exceeded'].includes(code)) {
    return true;
  }

  const asRecord = (error as Record<string, unknown>) || {};
  const message = (
    typeof asRecord.message === 'string'
      ? asRecord.message
      : error instanceof Error
        ? error.message
        : ''
  ).toLowerCase();

  if (!message) {
    return false;
  }

  return (
    message.includes('cors policy') ||
    message.includes('no access-control-allow-origin') ||
    message.includes('failed to fetch') ||
    message.includes('network error') ||
    message.includes('err_failed')
  );
};

const randomInRange = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const computeSimulatedBotScore = (
  rounds: number,
  difficulty: QuizBattleSetupConfig['botDifficulty'],
): { scoreFor: number; scoreAgainst: number; accuracy: number; averageResponseMs: number } => {
  const cappedRounds = Math.max(3, rounds);
  const difficultyPenalty =
    difficulty === 'easy' ? 0 : difficulty === 'medium' ? 1 : difficulty === 'hard' ? 2 : 1;

  const basePlayer = randomInRange(Math.max(0, cappedRounds - 3 - difficultyPenalty), cappedRounds);
  const baseBot = randomInRange(Math.max(0, cappedRounds - 4 + difficultyPenalty), cappedRounds);

  const scoreFor = Math.min(cappedRounds, Math.max(0, basePlayer));
  const scoreAgainst = Math.min(cappedRounds, Math.max(0, baseBot));
  const accuracy = Math.max(0, Math.min(100, (scoreFor / cappedRounds) * 100 + randomInRange(-8, 6)));
  const averageResponseMs = randomInRange(1800, 6200);

  return {
    scoreFor,
    scoreAgainst,
    accuracy,
    averageResponseMs,
  };
};

const persistSimulatedBotResult = (
  setup: QuizBattleSetupConfig,
): QuizBattleBotMatchResponse => {
  const studentId = getActiveStudentId();
  const localStore = readLocalStore(studentId);
  const matchId = `local-bot-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const scoring = computeSimulatedBotScore(setup.rounds, setup.botDifficulty);
  const outcome: QuizBattleMatchSummary['outcome'] =
    scoring.scoreFor > scoring.scoreAgainst
      ? 'win'
      : scoring.scoreFor < scoring.scoreAgainst
        ? 'loss'
        : 'draw';
  const now = new Date();

  const historyEntry: QuizBattleMatchSummary = {
    matchId,
    mode: 'bot',
    status: 'completed',
    subjectId: setup.subjectId,
    topicId: setup.topicId,
    difficulty: setup.botDifficulty,
    rounds: setup.rounds,
    timePerQuestionSec: setup.timePerQuestionSec,
    scoreFor: scoring.scoreFor,
    scoreAgainst: scoring.scoreAgainst,
    outcome,
    accuracy: scoring.accuracy,
    averageResponseMs: scoring.averageResponseMs,
    bestStreak: localStore.stats.bestStreak,
    xpEarned: outcome === 'win' ? 60 : outcome === 'draw' ? 40 : 20,
    opponentName: 'Practice Bot',
    opponentType: 'bot',
    createdAt: now,
    endedAt: now,
  };

  const matchesPlayed = localStore.stats.matchesPlayed + 1;
  const wins = localStore.stats.wins + (outcome === 'win' ? 1 : 0);
  const losses = localStore.stats.losses + (outcome === 'loss' ? 1 : 0);
  const draws = localStore.stats.draws + (outcome === 'draw' ? 1 : 0);
  const currentStreak = outcome === 'win' ? localStore.stats.currentStreak + 1 : 0;
  const bestStreak = Math.max(localStore.stats.bestStreak, currentStreak);

  const updatedStats: StudentBattleStats = {
    ...localStore.stats,
    matchesPlayed,
    wins,
    losses,
    draws,
    winRate: matchesPlayed > 0 ? (wins / matchesPlayed) * 100 : 0,
    averageAccuracy:
      matchesPlayed > 0
        ? ((localStore.stats.averageAccuracy * localStore.stats.matchesPlayed) + scoring.accuracy) /
          matchesPlayed
        : scoring.accuracy,
    averageResponseMs:
      matchesPlayed > 0
        ? Math.round(
            ((localStore.stats.averageResponseMs * localStore.stats.matchesPlayed) +
              scoring.averageResponseMs) /
              matchesPlayed,
          )
        : scoring.averageResponseMs,
    currentStreak,
    bestStreak,
    favoriteTopicId: setup.topicId,
    leaderboardScore: localStore.stats.leaderboardScore + historyEntry.xpEarned,
    updatedAt: now,
  };

  writeLocalStore(studentId, {
    stats: updatedStats,
    history: [historyEntry, ...localStore.history].slice(0, 50),
    queueStatus: 'idle',
  });

  return {
    success: true,
    matchId,
    status: 'ready',
    botDifficulty: setup.botDifficulty,
  };
};

const setFallbackQueueStatus = (status: QuizBattleQueueJoinResponse['status']): void => {
  const studentId = getActiveStudentId();
  const store = readLocalStore(studentId);
  writeLocalStore(studentId, {
    ...store,
    queueStatus: status,
  });
};

const buildFallbackPrivateRoomCode = (): string => {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
};

const buildFallbackPrivateRoomState = (roomCode?: string): QuizBattlePrivateRoomState => {
  const activeStudentId = getActiveStudentId();
  return {
    roomId: `local-room-${Date.now()}`,
    roomCode: roomCode || buildFallbackPrivateRoomCode(),
    ownerStudentId: activeStudentId,
    participantIds: [activeStudentId],
    participantCount: 1,
    status: 'waiting',
    subjectId: 'gen-math',
    topicId: 'functions',
    difficulty: 'medium',
    rounds: 5,
    timePerQuestionSec: 30,
    isOwner: true,
  };
};

const canUseRealtimePresence = (): boolean => {
  return isBrowser && Boolean(auth.currentUser?.uid) && Boolean(realtimeDb);
};

const buildPresencePath = (
  scope: QuizBattleHeartbeatScope,
  resourceId: string,
  userId: string,
): string => {
  return `quizBattlePresence/${scope}/${resourceId}/${userId}`;
};

export const connectQuizBattlePresence = async (
  scope: QuizBattleHeartbeatScope,
  resourceId: string,
): Promise<void> => {
  if (!canUseRealtimePresence() || !resourceId.trim() || !realtimeDb) {
    return;
  }

  const userId = auth.currentUser?.uid;
  if (!userId) {
    return;
  }

  const presenceRef = rtdbRef(realtimeDb, buildPresencePath(scope, resourceId, userId));

  try {
    await rtdbSet(presenceRef, {
      studentId: userId,
      scope,
      resourceId,
      online: true,
      heartbeatAt: rtdbServerTimestamp(),
      updatedAt: rtdbServerTimestamp(),
    });

    await onDisconnect(presenceRef).update({
      online: false,
      updatedAt: rtdbServerTimestamp(),
      disconnectedAt: rtdbServerTimestamp(),
    });
  } catch (error) {
    console.warn('Realtime presence connect failed:', error);
  }
};

export const disconnectQuizBattlePresence = async (
  scope: QuizBattleHeartbeatScope,
  resourceId: string,
): Promise<void> => {
  if (!canUseRealtimePresence() || !resourceId.trim() || !realtimeDb) {
    return;
  }

  const userId = auth.currentUser?.uid;
  if (!userId) {
    return;
  }

  const presenceRef = rtdbRef(realtimeDb, buildPresencePath(scope, resourceId, userId));

  try {
    await rtdbSet(presenceRef, {
      studentId: userId,
      scope,
      resourceId,
      online: false,
      updatedAt: rtdbServerTimestamp(),
      disconnectedAt: rtdbServerTimestamp(),
    });
  } catch (error) {
    console.warn('Realtime presence disconnect failed:', error);
  }
};

const mapCallableErrorMessage = (operation: string, error: unknown): string => {
  const fallback = `Unable to continue while ${operation}. Please try again.`;

  if (error instanceof Error && error.message.startsWith('Timed out while')) {
    return error.message;
  }

  const asRecord = (error as Record<string, unknown>) || {};
  const normalizedCode = getFallbackCode(error);
  const messageValue = typeof asRecord.message === 'string' ? asRecord.message.trim() : '';

  if (normalizedCode === 'unauthenticated') {
    return 'Your session has expired. Sign in again before starting a battle.';
  }

  if (normalizedCode === 'permission-denied') {
    return 'Only student accounts can access Quiz Battle matchmaking.';
  }

  if (normalizedCode === 'invalid-argument') {
    return messageValue || 'Battle setup is invalid. Review the selected options and try again.';
  }

  if (normalizedCode === 'already-exists') {
    return messageValue || 'This room is already full. Try another room code.';
  }

  if (normalizedCode === 'failed-precondition') {
    return messageValue || 'Battle state changed. Please refresh and continue.';
  }

  if (
    normalizedCode === 'unavailable' ||
    normalizedCode === 'internal' ||
    normalizedCode === 'not-found' ||
    normalizedCode === 'deadline-exceeded'
  ) {
    if (/question generation temporarily unavailable/i.test(messageValue)) {
      return messageValue;
    }
    return 'Quiz Battle service is temporarily unavailable. Please retry in a moment.';
  }

  // For any other unhandled code, return the generic fallback to avoid
  // surfacing raw backend/Firebase messages to users.
  return fallback;
};

const invokeWithTimeout = async <T>(
  operation: string,
  promise: Promise<T>,
  timeoutMs = DEFAULT_CALLABLE_TIMEOUT_MS,
): Promise<T> => {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`Timed out while ${operation}. Please try again.`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
};

const parseDateValue = (value: unknown): Date => {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? new Date() : new Date(parsed);
  }
  if (typeof value === 'number') return new Date(value);

  if (typeof value === 'object') {
    const ts = value as { toDate?: () => Date; seconds?: number };
    if (typeof ts.toDate === 'function') return ts.toDate();
    if (typeof ts.seconds === 'number') return new Date(ts.seconds * 1000);
  }

  return new Date();
};

export const createDefaultQuizBattleSetup = (): QuizBattleSetupConfig => ({
  mode: 'online',
  subjectId: 'gen-math',
  topicId: '',
  difficulty: 'medium',
  rounds: 5,
  timePerQuestionSec: 30,
  queueType: 'public_matchmaking',
  botDifficulty: 'medium',
  adaptiveBot: false,
});

export const validateQuizBattleSetup = (
  config: QuizBattleSetupConfig,
): QuizBattleSetupError[] => {
  const errors: QuizBattleSetupError[] = [];

  if (!config.subjectId.trim()) {
    errors.push({ field: 'subjectId', message: 'Choose a category before starting.' });
  }

  if (!config.topicId.trim()) {
    errors.push({ field: 'topicId', message: 'Choose a strand or topic before starting.' });
  }

  if (config.rounds < 3 || config.rounds > 20) {
    errors.push({ field: 'rounds', message: 'Questions must be between 3 and 20.' });
  }

  if (config.timePerQuestionSec < 10 || config.timePerQuestionSec > 180) {
    errors.push({ field: 'timePerQuestionSec', message: 'Timer must be between 10s and 180s.' });
  }

  if (config.mode === 'bot' && config.queueType !== 'public_matchmaking') {
    errors.push({
      field: 'queueType',
      message: 'Bot battles use instant start and do not support private room mode.',
    });
  }

  return errors;
};

const defaultBattleStats = (userId: string): StudentBattleStats => ({
  userId,
  matchesPlayed: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  winRate: 0,
  averageAccuracy: 0,
  averageResponseMs: 0,
  bestStreak: 0,
  currentStreak: 0,
  favoriteTopicId: undefined,
  leaderboardScore: 0,
  updatedAt: new Date(),
});

export const getStudentBattleStats = async (userId: string): Promise<StudentBattleStats> => {
  try {
    const statsRef = doc(db, 'studentBattleStats', userId);
    const statsSnap = await getDoc(statsRef);

    const localStats = isDevLocalFallbackEnabled()
      ? readLocalStore(userId).stats
      : null;

    if (!statsSnap.exists()) {
      if (localStats && localStats.matchesPlayed > 0) {
        return localStats;
      }
      return defaultBattleStats(userId);
    }

    const data = statsSnap.data() as Partial<StudentBattleStats>;

    const remoteStats: StudentBattleStats = {
      ...defaultBattleStats(userId),
      ...data,
      userId,
      updatedAt: parseDateValue(data.updatedAt),
    };

    if (localStats && localStats.matchesPlayed > remoteStats.matchesPlayed) {
      return localStats;
    }

    return remoteStats;
  } catch (error) {
    console.error('Error loading battle stats:', error);

    if (isDevLocalFallbackEnabled()) {
      const localStats = readLocalStore(userId).stats;
      if (localStats.matchesPlayed > 0) {
        return localStats;
      }
    }

    return defaultBattleStats(userId);
  }
};

export const subscribeToStudentBattleStats = (
  userId: string,
  callback: (stats: StudentBattleStats) => void,
): (() => void) => {
  const statsRef = doc(db, 'studentBattleStats', userId);

  return onSnapshot(
    statsRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(defaultBattleStats(userId));
        return;
      }

      const data = snapshot.data() as Partial<StudentBattleStats>;
      callback({
        ...defaultBattleStats(userId),
        ...data,
        userId,
        updatedAt: parseDateValue(data.updatedAt),
      });
    },
    (error) => {
      console.error('Error subscribing to battle stats:', error);
      callback(defaultBattleStats(userId));
    },
  );
};

const mapHistoryEntry = (entryId: string, value: Partial<QuizBattleMatchSummary>): QuizBattleMatchSummary => ({
  matchId: value.matchId || entryId,
  mode: value.mode || 'online',
  status: value.status || 'completed',
  subjectId: value.subjectId || 'gen-math',
  topicId: value.topicId || 'unknown-topic',
  difficulty: value.difficulty || 'medium',
  rounds: value.rounds || 0,
  timePerQuestionSec: value.timePerQuestionSec || 0,
  scoreFor: value.scoreFor || 0,
  scoreAgainst: value.scoreAgainst || 0,
  outcome: value.outcome || 'draw',
  accuracy: value.accuracy || 0,
  averageResponseMs: value.averageResponseMs || 0,
  bestStreak: value.bestStreak || 0,
  xpEarned: value.xpEarned || 0,
  opponentName: value.opponentName || 'Unknown opponent',
  opponentType: value.opponentType || 'student',
  createdAt: parseDateValue(value.createdAt),
  endedAt: parseDateValue(value.endedAt),
});

export const getStudentBattleHistory = async (
  userId: string,
  filters: QuizBattleHistoryFilters = {},
): Promise<QuizBattleMatchSummary[]> => {
  const limitCount = filters.limitCount || 25;
  const localHistory = isDevLocalFallbackEnabled()
    ? readLocalStore(userId).history
    : [];

  const applyFilters = (entries: QuizBattleMatchSummary[]): QuizBattleMatchSummary[] => {
    const merged = entries.filter((entry) => {
      if (filters.mode && filters.mode !== 'all' && entry.mode !== filters.mode) return false;
      if (filters.subjectId && entry.subjectId !== filters.subjectId) return false;
      if (filters.startDate && entry.endedAt < filters.startDate) return false;
      if (filters.endDate && entry.endedAt > filters.endDate) return false;
      return true;
    });

    return merged
      .sort((a, b) => b.endedAt.getTime() - a.endedAt.getTime())
      .slice(0, limitCount);
  };

  const mergeWithLocal = (entries: QuizBattleMatchSummary[]): QuizBattleMatchSummary[] => {
    if (localHistory.length === 0) {
      return applyFilters(entries);
    }

    const deduped = new Map<string, QuizBattleMatchSummary>();
    [...localHistory, ...entries].forEach((entry) => {
      deduped.set(entry.matchId, entry);
    });

    return applyFilters(Array.from(deduped.values()));
  };

  try {
    const constraints = [where('studentId', '==', userId), orderBy('endedAt', 'desc'), limit(limitCount)];

    const snap = await getDocs(query(collection(db, 'quizBattleHistory'), ...constraints));

    const mapped = snap.docs.map((entry) =>
      mapHistoryEntry(entry.id, entry.data() as Partial<QuizBattleMatchSummary>),
    );

    return mergeWithLocal(mapped);
  } catch (error) {
    // Fallback path avoids hard-failing the page before Firestore indexes/rules roll out.
    try {
      const fallbackSnap = await getDocs(
        query(collection(db, 'quizBattleHistory'), where('studentId', '==', userId), limit(limitCount)),
      );

      const remoteFallback = fallbackSnap.docs
        .map((entry) => mapHistoryEntry(entry.id, entry.data() as Partial<QuizBattleMatchSummary>))
        .sort((a, b) => b.endedAt.getTime() - a.endedAt.getTime());

      return mergeWithLocal(remoteFallback);
    } catch (fallbackError) {
      console.error('Error loading battle history:', error, fallbackError);
      return applyFilters(localHistory);
    }
  }
};

export const joinQuizBattleQueue = async (
  setup: QuizBattleSetupConfig,
): Promise<QuizBattleQueueJoinResponse> => {
  const callable = httpsCallable<{ setup: QuizBattleSetupConfig }, QuizBattleQueueJoinResponse>(
    cloudFunctions,
    'quizBattleJoinQueue',
  );

  try {
    const result = await invokeWithTimeout(
      'joining Quiz Battle matchmaking queue',
      callable({ setup }),
    );
    return result.data;
  } catch (error) {
    if (shouldUseLocalFallbackForError(error)) {
      setFallbackQueueStatus('queued');
      return {
        success: true,
        status: 'queued',
        queueEntryId: `local-queue-${Date.now()}`,
      };
    }

    throw new Error(mapCallableErrorMessage('joining Quiz Battle matchmaking queue', error));
  }
};

export const leaveQuizBattleQueue = async (): Promise<QuizBattleQueueJoinResponse> => {
  const callable = httpsCallable<Record<string, never>, QuizBattleQueueJoinResponse>(
    cloudFunctions,
    'quizBattleLeaveQueue',
  );

  try {
    const result = await invokeWithTimeout(
      'leaving Quiz Battle matchmaking queue',
      callable({}),
    );
    return result.data;
  } catch (error) {
    if (shouldUseLocalFallbackForError(error)) {
      setFallbackQueueStatus('idle');
      return {
        success: true,
        status: 'idle',
      };
    }

    throw new Error(mapCallableErrorMessage('leaving Quiz Battle matchmaking queue', error));
  }
};

export const createQuizBattlePrivateRoom = async (
  setup: QuizBattleSetupConfig,
): Promise<QuizBattlePrivateRoomResponse> => {
  const callable = httpsCallable<{ setup: QuizBattleSetupConfig }, QuizBattlePrivateRoomCallableResponse>(
    cloudFunctions,
    'quizBattleCreatePrivateRoom',
  );

  try {
    const result = await invokeWithTimeout(
      'creating Quiz Battle private room',
      callable({ setup }),
    );
    return result.data;
  } catch (error) {
    if (shouldUseLocalFallbackForError(error)) {
      return {
        success: true,
        room: buildFallbackPrivateRoomState(),
      };
    }

    throw new Error(mapCallableErrorMessage('creating Quiz Battle private room', error));
  }
};

export const joinQuizBattlePrivateRoom = async (
  roomCode: string,
): Promise<QuizBattlePrivateRoomResponse> => {
  const callable = httpsCallable<{ roomCode: string }, QuizBattlePrivateRoomCallableResponse>(
    cloudFunctions,
    'quizBattleJoinPrivateRoom',
  );

  try {
    const result = await invokeWithTimeout(
      'joining Quiz Battle private room',
      callable({ roomCode }),
      20000,
    );
    return result.data;
  } catch (error) {
    if (shouldUseLocalFallbackForError(error)) {
      return {
        success: true,
        room: buildFallbackPrivateRoomState(roomCode.trim().toUpperCase() || undefined),
      };
    }

    throw new Error(mapCallableErrorMessage('joining Quiz Battle private room', error));
  }
};

export const getQuizBattlePrivateRoomState = async (payload: {
  roomId?: string;
  roomCode?: string;
}): Promise<QuizBattlePrivateRoomResponse> => {
  const callable = httpsCallable<
    { roomId?: string; roomCode?: string },
    QuizBattlePrivateRoomCallableResponse
  >(cloudFunctions, 'quizBattleGetPrivateRoomState');

  try {
    const result = await invokeWithTimeout(
      'loading Quiz Battle private room state',
      callable(payload),
      20000,
    );
    return result.data;
  } catch (error) {
    if (shouldUseLocalFallbackForError(error)) {
      return {
        success: true,
        room: buildFallbackPrivateRoomState(payload.roomCode?.trim().toUpperCase() || undefined),
      };
    }

    throw new Error(mapCallableErrorMessage('loading Quiz Battle private room state', error));
  }
};

export const leaveQuizBattlePrivateRoom = async (payload: {
  roomId?: string;
  roomCode?: string;
} = {}): Promise<QuizBattleLeaveSessionResponse> => {
  const callable = httpsCallable<
    { roomId?: string; roomCode?: string },
    QuizBattleLeaveSessionResponse
  >(cloudFunctions, 'quizBattleLeavePrivateRoom');

  try {
    const result = await invokeWithTimeout(
      'leaving Quiz Battle private room',
      callable(payload),
      20000,
    );
    return result.data;
  } catch (error) {
    if (shouldUseLocalFallbackForError(error)) {
      return {
        success: true,
        status: 'idle',
      };
    }

    throw new Error(mapCallableErrorMessage('leaving Quiz Battle private room', error));
  }
};

export const resumeQuizBattleSession = async (): Promise<QuizBattleResumeSessionResponse> => {
  const callable = httpsCallable<Record<string, never>, QuizBattleResumeSessionResponse>(
    cloudFunctions,
    'quizBattleResumeSession',
  );

  try {
    const result = await invokeWithTimeout(
      'resuming Quiz Battle session',
      callable({}),
      20000,
    );
    return result.data;
  } catch (error) {
    if (shouldUseLocalFallbackForError(error)) {
      return {
        success: true,
        sessionType: 'idle',
      };
    }

    throw new Error(mapCallableErrorMessage('resuming Quiz Battle session', error));
  }
};

export const sendQuizBattleHeartbeat = async (
  scope: QuizBattleHeartbeatScope,
  resourceId: string,
): Promise<void> => {
  if (!resourceId.trim()) {
    return;
  }

  const callable = httpsCallable<
    { scope: QuizBattleHeartbeatScope; resourceId: string },
    QuizBattleHeartbeatResponse
  >(cloudFunctions, 'quizBattleHeartbeat');

  await connectQuizBattlePresence(scope, resourceId);

  try {
    await invokeWithTimeout(
      'sending Quiz Battle heartbeat',
      callable({ scope, resourceId }),
      12000,
    );
  } catch (error) {
    if (!shouldUseLocalFallbackForError(error)) {
      throw new Error(mapCallableErrorMessage('sending Quiz Battle heartbeat', error));
    }
  }
};

export const createQuizBattleBotMatch = async (
  setup: QuizBattleSetupConfig,
): Promise<QuizBattleBotMatchResponse> => {
  const callable = httpsCallable<{ setup: QuizBattleSetupConfig }, QuizBattleBotMatchResponse>(
    cloudFunctions,
    'quizBattleCreateBotMatch',
  );

  try {
    const result = await invokeWithTimeout(
      'starting Quiz Battle bot match',
      callable({ setup }),
    );
    return result.data;
  } catch (error) {
    if (shouldUseLocalFallbackForError(error)) {
      return persistSimulatedBotResult(setup);
    }

    throw new Error(mapCallableErrorMessage('starting Quiz Battle bot match', error));
  }
};

export const getQuizBattleGenerationAudit = async (
  matchId: string,
): Promise<QuizBattleGenerationAudit> => {
  const callable = httpsCallable<{ matchId: string }, QuizBattleGenerationAuditCallableResponse>(
    cloudFunctions,
    'quizBattleGetGenerationAudit',
  );

  const result = await invokeWithTimeout(
    'verifying Quiz Battle generation metadata',
    callable({ matchId }),
    20000,
  );

  return result.data;
};

export const startQuizBattleMatch = async (
  matchId: string,
): Promise<QuizBattleLiveMatchState> => {
  const callable = httpsCallable<{ matchId: string }, QuizBattleMatchStateCallableResponse>(
    cloudFunctions,
    'quizBattleStartMatch',
  );

  try {
    const result = await invokeWithTimeout(
      'starting Quiz Battle match',
      callable({ matchId }),
      20000,
    );
    const match = result.data.match;

    if (match.mode === 'online') {
      try {
        const audit = await getQuizBattleGenerationAudit(matchId);
        console.info('[QUIZ_BATTLE_GENERATION_AUDIT]', audit);

        if (QUIZ_BATTLE_STRICT_GENERATION_AUDIT && !audit.isAiSource) {
          throw new Error(
            `Quiz Battle generation audit failed: expected AI source, got "${audit.questionSetSource || 'unknown'}".`,
          );
        }
      } catch (auditError) {
        if (auditError instanceof Error && auditError.message.startsWith('Quiz Battle generation audit failed')) {
          throw auditError;
        }

        console.warn('Quiz Battle generation audit unavailable:', auditError);
        if (QUIZ_BATTLE_STRICT_GENERATION_AUDIT) {
          throw new Error('Unable to verify Quiz Battle generation metadata. Please retry in a moment.');
        }
      }
    }

    return match;
  } catch (error) {
    throw new Error(mapCallableErrorMessage('starting Quiz Battle match', error));
  }
};

export const getQuizBattleMatchState = async (
  matchId: string,
): Promise<QuizBattleLiveMatchState> => {
  const callable = httpsCallable<{ matchId: string }, QuizBattleMatchStateCallableResponse>(
    cloudFunctions,
    'quizBattleGetMatchState',
  );

  try {
    const result = await invokeWithTimeout(
      'loading Quiz Battle match state',
      callable({ matchId }),
      20000,
    );
    return result.data.match;
  } catch (error) {
    throw new Error(mapCallableErrorMessage('loading Quiz Battle match state', error));
  }
};

export const submitQuizBattleAnswer = async (payload: {
  matchId: string;
  roundNumber: number;
  selectedOptionIndex: number | null;
  responseMs: number;
  idempotencyKey?: string;
}): Promise<QuizBattleSubmitAnswerResponse> => {
  const callable = httpsCallable<
    {
      matchId: string;
      roundNumber: number;
      selectedOptionIndex: number | null;
      responseMs: number;
      idempotencyKey: string;
    },
    QuizBattleSubmitAnswerResponse
  >(cloudFunctions, 'quizBattleSubmitAnswer');

  try {
    const result = await invokeWithTimeout(
      'submitting Quiz Battle answer',
      callable({
        ...payload,
        idempotencyKey:
          payload.idempotencyKey ||
          `client-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      }),
      20000,
    );
    return result.data;
  } catch (error) {
    throw new Error(mapCallableErrorMessage('submitting Quiz Battle answer', error));
  }
};

export const requestQuizBattleRematch = async (
  matchId: string,
): Promise<QuizBattleBotMatchResponse> => {
  const callable = httpsCallable<{ matchId: string }, QuizBattleBotMatchResponse>(
    cloudFunctions,
    'quizBattleRequestRematch',
  );

  try {
    const result = await invokeWithTimeout(
      'creating Quiz Battle rematch',
      callable({ matchId }),
      20000,
    );
    return result.data;
  } catch (error) {
    throw new Error(mapCallableErrorMessage('creating Quiz Battle rematch', error));
  }
};

export const getStudentBattleLeaderboard = async (
  limitCount = 20,
): Promise<QuizBattleLeaderboardEntry[]> => {
  try {
    const leaderboardQuery = query(
      collection(db, 'studentBattleLeaderboard'),
      orderBy('leaderboardScore', 'desc'),
      limit(limitCount),
    );

    const snap = await getDocs(leaderboardQuery);
    return snap.docs.map((entry, index) => {
      const data = entry.data() as Partial<QuizBattleLeaderboardEntry>;
      return {
        userId: data.userId || entry.id,
        displayName: data.displayName || 'Student',
        photo: data.photo,
        rank: data.rank || index + 1,
        leaderboardScore: data.leaderboardScore || 0,
        winRate: data.winRate || 0,
        bestStreak: data.bestStreak || 0,
      };
    });
  } catch (error) {
    console.error('Error loading Quiz Battle leaderboard:', error);
    return [];
  }
};
