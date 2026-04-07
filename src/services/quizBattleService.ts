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
import { httpsCallable } from 'firebase/functions';
import { auth, cloudFunctions, db } from '../lib/firebase';
import {
  QuizBattleMode,
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
  status: 'queued' | 'idle';
  queueEntryId?: string;
}

export interface QuizBattlePrivateRoomResponse {
  success: boolean;
  roomId: string;
  roomCode: string;
}

export interface QuizBattleBotMatchResponse {
  success: boolean;
  matchId: string;
  status: 'ready';
  botDifficulty: 'easy' | 'medium' | 'hard' | 'adaptive';
}

const DEFAULT_CALLABLE_TIMEOUT_MS = 15000;
const QUIZ_BATTLE_LOCAL_STORE_KEY = 'mathpulse.quizBattle.local';

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
      queueStatus: parsed.queueStatus === 'queued' ? 'queued' : 'idle',
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
  return ['internal', 'not-found', 'unavailable', 'deadline-exceeded'].includes(code);
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

  if (
    normalizedCode === 'unavailable' ||
    normalizedCode === 'internal' ||
    normalizedCode === 'not-found' ||
    normalizedCode === 'deadline-exceeded'
  ) {
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
  const callable = httpsCallable<{ setup: QuizBattleSetupConfig }, QuizBattlePrivateRoomResponse>(
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
        roomId: `local-room-${Date.now()}`,
        roomCode: buildFallbackPrivateRoomCode(),
      };
    }

    throw new Error(mapCallableErrorMessage('creating Quiz Battle private room', error));
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
