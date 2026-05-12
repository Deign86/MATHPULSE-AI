// src/services/diagnosticService.ts
// API client for the diagnostic assessment system.
// Calls POST /api/diagnostic/generate and POST /api/diagnostic/submit
// through the centralized apiFetch wrapper.

import { apiFetch, ApiError, ApiTimeoutError, ApiNetworkError, ApiValidationError } from './apiService';

const API_URL = import.meta.env.VITE_API_URL || 'https://deign86-mathpulse-api-v3test.hf.space';

export { ApiError, ApiTimeoutError, ApiNetworkError, ApiValidationError };

// ─── Types ──────────────────────────────────────────────────────

export interface DiagnosticOption {
  A: string;
  B: string;
  C: string;
  D: string;
}

export interface DiagnosticQuestion {
  question_id: string;
  competency_code: string;
  domain: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  bloom_level: string;
  question_text: string;
  options: DiagnosticOption;
  curriculum_reference: string;
}

export interface DiagnosticGenerateResponse {
  test_id: string;
  questions: DiagnosticQuestion[];
  total_items: number;
  estimated_minutes: number;
}

export interface DiagnosticSubmitResponse {
  success: boolean;
  overall_risk: 'low' | 'moderate' | 'high' | 'critical';
  overall_score_percent: number;
  mastery_summary: {
    mastered: string[];
    developing: string[];
    beginning: string[];
  };
  recommended_intervention: string;
  xp_earned: number;
  badge_unlocked: string;
  redirect_to: string;
}

export interface DiagnosticResponseItem {
  question_id: string;
  student_answer: string;
  time_spent_seconds: number;
}

// ─── API Functions ─────────────────────────────────────────────

/**
 * Generate a diagnostic assessment with retry + timeout.
 * Uses a shorter 30s per-attempt timeout with up to 2 retries (total ~90s max).
 */
export async function generateDiagnostic(
  strand: string,
  gradeLevel: string,
): Promise<DiagnosticGenerateResponse> {
  const url = `${API_URL}/api/diagnostic/generate`;

  const { auth } = await import('../lib/firebase');
  const currentUser = auth.currentUser;
  const getHeaders = async (): Promise<Headers> => {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    if (currentUser) {
      const idToken = await currentUser.getIdToken(false);
      if (idToken) headers.set('Authorization', `Bearer ${idToken}`);
    }
    return headers;
  };

  const attemptRequest = async (signal: AbortSignal): Promise<Response> => {
    return fetch(url, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ strand, grade_level: gradeLevel }),
      signal,
    });
  };

  const parseError = (res: Response, body: string): string => {
    let message = 'Something went wrong. Please try again.';
    try {
      const errorJson = JSON.parse(body);
      if (errorJson.detail) {
        const detail = String(errorJson.detail);
        if (detail.includes('Database unavailable') || detail.includes('unavailable')) {
          message = 'Our servers are temporarily busy. Please try again in a moment.';
        } else if (detail.includes('timeout') || detail.includes('timed out')) {
          message = 'The request timed out. Please check your connection and try again.';
        } else {
          message = detail;
        }
      }
    } catch {
      if (!res.ok && body) {
        message = 'Failed to start assessment. Please try again.';
      }
    }
    return message;
  };

  // Retry with exponential backoff: attempt 1 (30s), attempt 2 (30s) = 60s total max
  const MAX_ATTEMPTS = 2;
  const ATTEMPT_TIMEOUT_MS = 30_000;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);

    try {
      const res = await attemptRequest(controller.signal);

      if (res.ok) {
        clearTimeout(timeout);
        return res.json();
      }

      // 4xx client errors — don't retry, throw immediately
      if (res.status >= 400 && res.status < 500) {
        clearTimeout(timeout);
        const body = await res.text().catch(() => '');
        throw new Error(parseError(res, body));
      }

      // 5xx server errors or network issues — retry if attempts remain
      const body = await res.text().catch(() => '');
      const errorMessage = parseError(res, body);

      clearTimeout(timeout);

      if (attempt < MAX_ATTEMPTS) {
        const backoffMs = attempt * 2_000; // 2s, 4s
        console.warn(`[generateDiagnostic] attempt ${attempt} failed (${res.status}), retrying in ${backoffMs}ms...`);
        await new Promise((r) => setTimeout(r, backoffMs));
        continue;
      }

      throw new Error(errorMessage);
    } catch (err) {
      clearTimeout(timeout);

      // AbortError = timeout
      if (err instanceof DOMException && err.name === 'AbortError') {
        if (attempt < MAX_ATTEMPTS) {
          console.warn(`[generateDiagnostic] attempt ${attempt} timed out, retrying...`);
          continue;
        }
        throw new Error('The request timed out. Please check your connection and try again.');
      }

      // Re-throw business errors (already formatted) and network errors
      throw err;
    }
  }

  // Should not reach here, but satisfy TypeScript
  throw new Error('Failed to generate assessment after multiple attempts.');
}

export async function submitDiagnostic(
  testId: string,
  responses: DiagnosticResponseItem[],
): Promise<DiagnosticSubmitResponse> {
  const url = `${API_URL}/api/diagnostic/submit`;

  const headers = new Headers({ 'Content-Type': 'application/json' });

  const { auth } = await import('../lib/firebase');
  const currentUser = auth.currentUser;
  if (currentUser) {
    const idToken = await currentUser.getIdToken(false);
    if (idToken) headers.set('Authorization', `Bearer ${idToken}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ test_id: testId, responses }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      let message = 'Something went wrong. Please try again.';
      try {
        const errorJson = JSON.parse(body);
        // Return user-friendly message from structured error response
        if (errorJson.detail) {
          const detail = String(errorJson.detail);
          if (detail.includes('session') || detail.includes('not found')) {
            message = 'Your assessment session has expired. Please restart the assessment.';
          } else if (detail.includes('Database unavailable') || detail.includes('unavailable')) {
            message = 'Our servers are temporarily busy. Please try again in a moment.';
          } else if (detail.includes('timeout') || detail.includes('timed out')) {
            message = 'The request timed out. Please check your connection and try again.';
          } else {
            message = detail;
          }
        }
      } catch {
        // If JSON parsing fails, use a generic message
        if (body.includes('404') || body.includes('not found')) {
          message = 'Your assessment session has expired. Please restart the assessment.';
        } else if (body) {
          message = 'Something went wrong. Please try again.';
        }
      }
      throw new Error(message);
    }

    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}
