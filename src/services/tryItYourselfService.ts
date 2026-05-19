/**
 * Try It Yourself Quiz State Service
 * Communicates with backend for server-side XP calculation and state tracking.
 */
import { apiFetch } from './apiService';

interface ResolveQuestionParams {
  userId: string;
  sessionId: string;
  questionId: string;
  resolution: 'correct' | 'revealed';
  attempts: number;
  hintsUsed: number;
}

interface ResolveQuestionResult {
  xpAwarded: number;
  status: string;
  struggleFlag: boolean;
}

interface UseHintParams {
  userId: string;
  sessionId: string;
  questionId: string;
  currentHintTier: number;
}

interface UseHintResult {
  hintsUsed: number;
  xpMultiplier: number;
  acknowledged: boolean;
}

interface CompleteSessionParams {
  userId: string;
  sessionId: string;
  questionResults: Array<{
    questionId: string;
    resolution: 'correct' | 'revealed';
    attempts: number;
    hintsUsed: number;
    topic?: string;
  }>;
}

interface CompleteSessionResult {
  totalXP: number;
  questionsResolved: number;
  questionsRevealed: number;
  averageAttempts: number;
  struggleTopics: string[];
}

export async function resolveQuestion(params: ResolveQuestionParams): Promise<ResolveQuestionResult> {
  return apiFetch<ResolveQuestionResult>('/api/try-it-yourself/resolve-question', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
}

export async function useHint(params: UseHintParams): Promise<UseHintResult> {
  return apiFetch<UseHintResult>('/api/try-it-yourself/use-hint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
}

export async function completeSession(params: CompleteSessionParams): Promise<CompleteSessionResult> {
  return apiFetch<CompleteSessionResult>('/api/try-it-yourself/complete-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
}
interface ShadowRetryParams {
  userId: string;
  sessionId: string;
  struggleTopics: string[];
  subject: string;
  difficulty?: string;
  count?: number;
}

interface ShadowRetryResult {
  variants: Array<{
    id: number;
    type: string;
    question: string;
    options?: string[];
    correctAnswer: string;
    explanation: string;
    hints?: string[];
    bloomLevel?: string;
  }>;
  generated: boolean;
}

export async function fetchShadowRetries(params: ShadowRetryParams): Promise<ShadowRetryResult> {
  return apiFetch<ShadowRetryResult>('/api/try-it-yourself/shadow-retry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
}


// --- Generate Round (Adaptive Phase Progression) ---

interface GenerateRoundParams {
  userId: string;
  sessionId: string;
  questionIds: string[];
}

interface PhaseGroup {
  phase: number;
  label: string; // "Foundation" | "Application" | "Complexity" | "Gauntlet"
  questionIds: string[];
}

export interface GenerateRoundResult {
  phases: PhaseGroup[];
  questionStatuses: Record<string, string>; // questionId -> "New" | "Retry" | "Learning" | "Mastered"
}

export async function generateRound(params: GenerateRoundParams): Promise<GenerateRoundResult> {
  return apiFetch<GenerateRoundResult>('/api/try-it-yourself/generate-round', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
}
