import {
  realtimeDb,
  ref,
  push,
  set,
  onValue,
  off,
  remove,
  update,
  query,
  orderByChild,
  equalTo,
  serverTimestamp,
} from '../lib/firebase';
import type { DatabaseReference, Unsubscribe } from 'firebase/database';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// ── RTDB Schema ──────────────────────────────────────────────────────
// matchmaking/
//   queue/
//     {pushId}/
//       userId: string
//       userName: string
//       gradeLevel: number
//       topic: string
//       joinedAt: number (serverTimestamp)
//   sessions/
//     {sessionId}/
//       player1: { userId, userName, score }
//       player2: { userId, userName, score }
//       questions: GeneratedQuestion[]
//       status: 'pending' | 'active' | 'complete'
//       topic: string
//       gradeLevel: number
//       createdAt: number
//       result: { winner: string, scores: Record<string, number>, completedAt: number } | null
// ──────────────────────────────────────────────────────────────────────

export interface QueueEntry {
  userId: string;
  userName: string;
  gradeLevel: number;
  topic: string;
  joinedAt: number;
}

export interface GeneratedQuestion {
  id: number;
  type: string;
  question: string;
  options: string[] | null;
  correctAnswer?: string;
  explanation: string;
  bloomLevel: string;
  points: number;
  xpReward: number;
}

export interface SessionPlayer {
  userId: string;
  userName: string;
  score: number;
}

export interface SessionResult {
  winner: string;
  scores: Record<string, number>;
  completedAt: number;
}

export interface SessionData {
  player1: SessionPlayer;
  player2: SessionPlayer;
  questions: GeneratedQuestion[];
  status: 'pending' | 'active' | 'complete';
  topic: string;
  gradeLevel: number;
  createdAt: number;
  result: SessionResult | null;
}

export interface MatchFoundResult {
  sessionId: string;
  questions: GeneratedQuestion[];
  opponent: {
    userId: string;
    userName: string;
  };
}

export interface BattleSubmitResult {
  success: boolean;
  outcome?: 'win' | 'loss' | 'draw';
  playerScore?: number;
  opponentScore?: number;
}

// ── Helpers ──────────────────────────────────────────────────────────

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function checkSameTopic(a: { topic: string; gradeLevel: number }, b: { topic: string; gradeLevel: number }): boolean {
  return a.topic === b.topic && a.gradeLevel === b.gradeLevel;
}

// ── API calls ────────────────────────────────────────────────────────

async function fetchQuestionsFromBackend(
  sessionId: string,
  playerIds: string[],
  topic: string,
  gradeLevel: number,
  questionCount: number,
): Promise<GeneratedQuestion[]> {
  const res = await fetch(`${API_URL}/api/quiz-battle/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grade_level: gradeLevel,
      topic,
      question_count: questionCount,
      session_id: sessionId,
      player_ids: playerIds,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to generate questions: ${res.status}`);
  }

  const data = await res.json();
  return data.questions as GeneratedQuestion[];
}

async function submitResultsToBackend(
  sessionId: string,
  playerId: string,
  score: number,
  answers: { questionId: number; selectedAnswer: string; isCorrect: boolean }[],
): Promise<void> {
  const res = await fetch(`${API_URL}/api/quiz-battle/results`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      player_id: playerId,
      score,
      answers,
    }),
  });

  if (!res.ok) {
    console.warn(`Failed to submit results: ${res.status}`);
  }
}

// ── Matchmaking ──────────────────────────────────────────────────────

/**
 * Join the matchmaking queue and wait for an opponent.
 * When a match is found, removes both players from queue, creates a session,
 * generates questions from the backend, and returns the match data.
 */
export function findMatch(
  userId: string,
  userName: string,
  gradeLevel: number,
  topic: string,
): Promise<MatchFoundResult> {
  return new Promise((resolve, reject) => {
    if (!realtimeDb) {
      reject(new Error('Realtime Database is not available'));
      return;
    }

    const queueRef = ref(realtimeDb, 'matchmaking/queue');
    const newEntryRef = push(queueRef);

    const queueEntry = {
      userId,
      userName,
      gradeLevel,
      topic,
      joinedAt: serverTimestamp(),
    };

    let unsubQueue: Unsubscribe | null = null;
    let matched = false;

    const cleanup = () => {
      if (unsubQueue) {
        off(queueRef, 'value', unsubQueue);
        unsubQueue = null;
      }
      if (!matched) {
        remove(newEntryRef).catch(() => {});
      }
    };

    // Listen for changes in the queue — on any change, check if we can pair
    unsubQueue = onValue(
      query(queueRef),
      async (snapshot) => {
        if (matched) return;

        const queueData = snapshot.val() as Record<string, QueueEntry> | null;
        if (!queueData) return;

        const entries = Object.entries(queueData) as [string, QueueEntry][];

        // Find our own entry
        const ourEntry = entries.find(([, e]) => e.userId === userId);
        if (!ourEntry) {
          // Our entry was already removed (matched by someone else)
          matched = true;
          cleanup();
          return;
        }

        const ourKey = ourEntry[0];

        // Look for another player with same topic and grade
        const opponent = entries.find(
          ([key, e]) => key !== ourKey && checkSameTopic(e, { topic, gradeLevel }),
        );

        if (!opponent) return;

        matched = true;
        const opponentEntry = opponent[1];
        const opponentKey = opponent[0];

        // Remove both from queue
        const opponentRef = ref(realtimeDb, `matchmaking/queue/${opponentKey}`);
        await Promise.all([remove(newEntryRef), remove(opponentRef)]);

        cleanup();

        // Create session
        const sessionId = generateSessionId();
        const playerIds = [userId, opponentEntry.userId];

        try {
          const questionCount = 5;
          const questions = await fetchQuestionsFromBackend(
            sessionId,
            playerIds,
            topic,
            gradeLevel,
            questionCount,
          );

          const sessionRef = ref(realtimeDb, `matchmaking/sessions/${sessionId}`);
          const sessionData: SessionData = {
            player1: { userId, userName, score: 0 },
            player2: { userId: opponentEntry.userId, userName: opponentEntry.userName, score: 0 },
            questions,
            status: 'active',
            topic,
            gradeLevel,
            createdAt: Date.now(),
            result: null,
          };

          await set(sessionRef, sessionData);

          resolve({
            sessionId,
            questions,
            opponent: {
              userId: opponentEntry.userId,
              userName: opponentEntry.userName,
            },
          });
        } catch (err) {
          reject(err);
        }
      },
      (err) => {
        if (!matched) {
          cleanup();
          reject(err);
        }
      },
    );
  });
}

/**
 * Remove the current player from the matchmaking queue.
 */
export async function cancelMatch(userId: string): Promise<void> {
  if (!realtimeDb) return;

  const queueRef = ref(realtimeDb, 'matchmaking/queue');
  const snapshot = await new Promise<Record<string, QueueEntry> | null>((resolve) => {
    const unsub = onValue(
      query(queueRef),
      (snap) => {
        off(queueRef, 'value', unsub);
        resolve(snap.val() as Record<string, QueueEntry> | null);
      },
      () => {
        off(queueRef, 'value', unsub);
        resolve(null);
      },
    );
  });

  if (!snapshot) return;

  for (const [key, entry] of Object.entries(snapshot)) {
    if (entry.userId === userId) {
      const entryRef = ref(realtimeDb, `matchmaking/queue/${key}`);
      await remove(entryRef);
      return;
    }
  }
}

// ── Battle ───────────────────────────────────────────────────────────

/**
 * Submit the player's score and answers to the backend and RTDB.
 */
export async function submitResult(
  sessionId: string,
  playerId: string,
  score: number,
  answers: { questionId: number; selectedAnswer: string; isCorrect: boolean }[],
): Promise<BattleSubmitResult> {
  // Write result to RTDB
  if (realtimeDb) {
    const scoreRef = ref(realtimeDb, `matchmaking/sessions/${sessionId}`);
    const snapshot = await new Promise<SessionData | null>((resolve) => {
      const unsub = onValue(
        query(scoreRef),
        (snap) => {
          off(scoreRef, 'value', unsub);
          resolve(snap.val() as SessionData | null);
        },
        () => {
          off(scoreRef, 'value', unsub);
          resolve(null);
        },
      );
    });

    if (snapshot) {
      // Update the player's score
      const isPlayer1 = snapshot.player1.userId === playerId;
      const updatedPlayer = { score };

      const updates: Record<string, unknown> = {};
      if (isPlayer1) {
        updates.player1 = { ...snapshot.player1, ...updatedPlayer };
      } else {
        updates.player2 = { ...snapshot.player2, ...updatedPlayer };
      }

      // Check if both players have submitted
      const otherScore = isPlayer1 ? snapshot.player2.score : snapshot.player1.score;
      const otherSubmitted = otherScore > 0;

      if (otherSubmitted) {
        // Both submitted — determine winner and mark complete
        const p1 = isPlayer1 ? score : snapshot.player1.score;
        const p2 = isPlayer1 ? snapshot.player2.score : score;
        const winner =
          p1 > p2 ? snapshot.player1.userId : p2 > p1 ? snapshot.player2.userId : 'draw';

        updates.status = 'complete';
        updates.result = {
          winner,
          scores: {
            [snapshot.player1.userId]: p1,
            [snapshot.player2.userId]: p2,
          },
          completedAt: Date.now(),
        };
      }

      await update(scoreRef, updates);
    }
  }

  // Submit to backend
  try {
    await submitResultsToBackend(sessionId, playerId, score, answers);
  } catch (err) {
    console.warn('Backend result submission failed:', err);
  }

  return {
    success: true,
  };
}

/**
 * Listen for real-time session updates (opponent's score, match completion).
 */
export function listenForSession(
  sessionId: string,
  callback: (data: SessionData | null) => void,
): Unsubscribe {
  if (!realtimeDb) {
    return () => {};
  }

  const sessionRef = ref(realtimeDb, `matchmaking/sessions/${sessionId}`);
  const unsub = onValue(
    query(sessionRef),
    (snapshot) => {
      const data = snapshot.val() as SessionData | null;
      callback(data);
    },
    (err) => {
      console.warn('Session listener error:', err);
      callback(null);
    },
  );

  return () => off(sessionRef, 'value', unsub);
}

/**
 * Get the current session data once.
 */
export async function getSessionData(sessionId: string): Promise<SessionData | null> {
  if (!realtimeDb) return null;

  const sessionRef = ref(realtimeDb, `matchmaking/sessions/${sessionId}`);

  return new Promise<SessionData | null>((resolve) => {
    const unsub = onValue(
      query(sessionRef),
      (snapshot) => {
        off(sessionRef, 'value', unsub);
        resolve(snapshot.val() as SessionData | null);
      },
      () => {
        off(sessionRef, 'value', unsub);
        resolve(null);
      },
    );
  });
}
