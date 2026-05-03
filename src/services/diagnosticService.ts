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

export async function generateDiagnostic(
  strand: string,
  gradeLevel: string,
): Promise<DiagnosticGenerateResponse> {
  const url = `${API_URL}/api/diagnostic/generate`;

  const headers = new Headers({ 'Content-Type': 'application/json' });

  const { auth } = await import('../lib/firebase');
  const currentUser = auth.currentUser;
  if (currentUser) {
    const idToken = await currentUser.getIdToken(false);
    if (idToken) headers.set('Authorization', `Bearer ${idToken}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ strand, grade_level: gradeLevel }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => 'Unknown error');
      throw new Error(`Diagnostic generation failed (${res.status}): ${body.slice(0, 300)}`);
    }

    return res.json();
  } finally {
    clearTimeout(timeout);
  }
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
      const body = await res.text().catch(() => 'Unknown error');
      throw new Error(`Diagnostic submission failed (${res.status}): ${body.slice(0, 300)}`);
    }

    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}
