import { API_URL } from '../lib/api';

// --- Types ---

export type SubjectBreakdown = {
  subjectId: string;
  subjectName: string;
  masteryPercent: number;
  status: string;
};

export type StudentProgress = {
  overallMasteryPercent: number;
  subjectBreakdown: SubjectBreakdown[];
  weeklyGoal: { targetXP: number; currentXP: number };
  streak: { current: number; best: number };
};

// --- API calls ---

export async function getStudentProgress(
  userId: string,
  token: string,
): Promise<StudentProgress> {
  const res = await fetch(
    `${API_URL}/api/analytics/student-summary?userId=${encodeURIComponent(userId)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch progress: ${res.status}`);
  }
  return res.json();
}

export async function getSubjectBreakdown(
  userId: string,
  token: string,
): Promise<SubjectBreakdown[]> {
  const res = await fetch(`${API_URL}/api/progress/evaluate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) {
    console.warn(`[progressService.getSubjectBreakdown] ${res.status} ${res.statusText}`);
    return [];
  }
  const data = await res.json();
  return data?.subjectBreakdown ?? data?.subjects ?? data ?? [];
}

export async function getWeeklyXP(
  _userId: string,
  _token?: string,
): Promise<{ week: string; xp: number }[]> {
  console.warn('[progressService.getWeeklyXP] Backend endpoint not yet implemented; returning empty result');
  return [];
}

export async function getStreakInfo(
  _userId: string,
  _token?: string,
): Promise<{ current: number; best: number } | null> {
  console.warn('[progressService.getStreakInfo] Backend endpoint not yet implemented; returning null');
  return null;
}
