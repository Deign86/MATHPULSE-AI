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
import { cloudFunctions, db } from '../lib/firebase';
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

    if (!statsSnap.exists()) {
      return defaultBattleStats(userId);
    }

    const data = statsSnap.data() as Partial<StudentBattleStats>;

    return {
      ...defaultBattleStats(userId),
      ...data,
      userId,
      updatedAt: parseDateValue(data.updatedAt),
    };
  } catch (error) {
    console.error('Error loading battle stats:', error);
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

  try {
    const constraints = [where('studentId', '==', userId), orderBy('endedAt', 'desc'), limit(limitCount)];

    const snap = await getDocs(query(collection(db, 'quizBattleHistory'), ...constraints));

    const mapped = snap.docs.map((entry) =>
      mapHistoryEntry(entry.id, entry.data() as Partial<QuizBattleMatchSummary>),
    );

    return mapped.filter((entry) => {
      if (filters.mode && filters.mode !== 'all' && entry.mode !== filters.mode) return false;
      if (filters.subjectId && entry.subjectId !== filters.subjectId) return false;
      if (filters.startDate && entry.endedAt < filters.startDate) return false;
      if (filters.endDate && entry.endedAt > filters.endDate) return false;
      return true;
    });
  } catch (error) {
    // Fallback path avoids hard-failing the page before Firestore indexes/rules roll out.
    try {
      const fallbackSnap = await getDocs(
        query(collection(db, 'quizBattleHistory'), where('studentId', '==', userId), limit(limitCount)),
      );

      return fallbackSnap.docs
        .map((entry) => mapHistoryEntry(entry.id, entry.data() as Partial<QuizBattleMatchSummary>))
        .sort((a, b) => b.endedAt.getTime() - a.endedAt.getTime());
    } catch (fallbackError) {
      console.error('Error loading battle history:', error, fallbackError);
      return [];
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

  const result = await callable({ setup });
  return result.data;
};

export const leaveQuizBattleQueue = async (): Promise<QuizBattleQueueJoinResponse> => {
  const callable = httpsCallable<Record<string, never>, QuizBattleQueueJoinResponse>(
    cloudFunctions,
    'quizBattleLeaveQueue',
  );

  const result = await callable({});
  return result.data;
};

export const createQuizBattlePrivateRoom = async (
  setup: QuizBattleSetupConfig,
): Promise<QuizBattlePrivateRoomResponse> => {
  const callable = httpsCallable<{ setup: QuizBattleSetupConfig }, QuizBattlePrivateRoomResponse>(
    cloudFunctions,
    'quizBattleCreatePrivateRoom',
  );

  const result = await callable({ setup });
  return result.data;
};

export const createQuizBattleBotMatch = async (
  setup: QuizBattleSetupConfig,
): Promise<QuizBattleBotMatchResponse> => {
  const callable = httpsCallable<{ setup: QuizBattleSetupConfig }, QuizBattleBotMatchResponse>(
    cloudFunctions,
    'quizBattleCreateBotMatch',
  );

  const result = await callable({ setup });
  return result.data;
};
