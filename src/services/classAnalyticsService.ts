// src/services/classAnalyticsService.ts
// Service layer for Class Analytics backend API

import { auth } from '../lib/firebase';

const API_URL = import.meta.env.VITE_API_URL || 'https://deign86-mathpulse-api-v3test.hf.space';

// ─── Types ────────────────────────────────────────────────────

export interface StudentAnalyticsSummary {
  student_id: string;
  student_name: string;
  avatar_url: string | null;
  grade_level: string;
  section: string;
  avg_score: number;
  quiz_attempt_count: number;
  last_active: string | null;
  risk_level: 'Low Risk' | 'Medium Risk' | 'High Risk' | 'Critical' | 'Unassessed';
  engagement_level: 'Low' | 'Medium' | 'High';
  weakest_topic: string | null;
  accuracy_by_topic: Record<string, number>;
  completion_rate: number;
}

export interface TopicPerformance {
  topic: string;
  class_accuracy: number;
  struggling_count: number;
  mastered_count: number;
}

export interface ClassInsights {
  class_id: string;
  generated_at: string;
  class_summary: string;
  top_weak_topics: string[];
  recommended_actions: string[];
  class_strengths: string;
  risk_distribution: Record<string, number>;
  topic_performance: TopicPerformance[];
}

export interface ClassAnalyticsReport {
  class_id: string;
  class_name: string;
  grade_level: string;
  section: string;
  teacher_id: string;
  student_count: number;
  class_average: number;
  completion_rate: number;
  participation_rate: number;
  attention_count: number;
  students: StudentAnalyticsSummary[];
  insights: ClassInsights | null;
  generated_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const idToken = await currentUser.getIdToken(false);
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
    } catch { /* non-critical */ }
  }
  return headers;
}

// ─── API Functions ────────────────────────────────────────────

export async function getClassAnalytics(classId: string, refresh = false): Promise<ClassAnalyticsReport> {
  const headers = await getAuthHeaders();
  const url = `${API_URL}/api/analytics/class/${encodeURIComponent(classId)}${refresh ? '?refresh=true' : ''}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`GET class analytics failed: ${res.status}`);
  }
  return res.json();
}

export async function getClassStudents(
  classId: string,
  filter: 'all' | 'top_performers' | 'needs_attention' = 'all'
): Promise<StudentAnalyticsSummary[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${API_URL}/api/analytics/class/${encodeURIComponent(classId)}/students?filter=${filter}`,
    { headers }
  );
  if (!res.ok) {
    throw new Error(`GET class students failed: ${res.status}`);
  }
  return res.json();
}

export async function getClassTopics(classId: string): Promise<TopicPerformance[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${API_URL}/api/analytics/class/${encodeURIComponent(classId)}/topics`,
    { headers }
  );
  if (!res.ok) {
    throw new Error(`GET class topics failed: ${res.status}`);
  }
  return res.json();
}

export async function refreshClassInsights(classId: string): Promise<ClassInsights> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${API_URL}/api/analytics/class/${encodeURIComponent(classId)}/refresh-insights`,
    { method: 'POST', headers }
  );
  if (!res.ok) {
    if (res.status === 429) {
      throw new Error('Insights can only be refreshed once every 5 minutes.');
    }
    throw new Error(`POST refresh insights failed: ${res.status}`);
  }
  return res.json();
}

export async function invalidateClassCache(classId: string): Promise<void> {
  const headers = await getAuthHeaders();
  await fetch(
    `${API_URL}/api/analytics/class/${encodeURIComponent(classId)}/invalidate-cache`,
    { method: 'POST', headers }
  );
}
