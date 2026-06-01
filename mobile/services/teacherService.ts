import { API_URL } from '../lib/api';

// --- Types ---

export interface ClassGroup {
  id: string;
  name: string;
  grade: string;
  section: string;
  studentCount: number;
  subject: string;
}

export interface AtRiskStudent {
  uid: string;
  name: string;
  photo?: string;
  grade: string;
  section: string;
  overallRisk: 'High' | 'Medium' | 'Low';
  atRiskSubjects: string[];
  lastActive: string; // ISO date
  averageScore: number;
  trend: 'declining' | 'stable' | 'improving';
  reason: string;
}

export interface TeachingTask {
  id: string;
  title: string;
  classId: string;
  className: string;
  type: 'assignment' | 'quiz' | 'project' | 'review';
  dueDate: string; // ISO
  status: 'draft' | 'published' | 'closed';
  submissions: number;
  totalStudents: number;
}

export interface ClassAnalytics {
  classId: string;
  className: string;
  averageScore: number;
  medianScore: number;
  completionRate: number;
  atRiskCount: number;
  topPerformer: string;
  strugglingTopics: { topic: string; masteryPercent: number }[];
  weeklyTrend: { week: string; averageScore: number }[];
}

export interface AIInsight {
  id: string;
  title: string;
  body: string;
  severity: 'info' | 'warning' | 'critical';
  category: 'engagement' | 'mastery' | 'risk' | 'opportunity';
  generatedAt: string;
  classId?: string;
}

// --- API calls ---

export async function getTeacherClasses(
  teacherId: string,
  token: string,
): Promise<ClassGroup[]> {
  // Real endpoint: GET /api/analytics/imported-class-overview
  const res = await fetch(`${API_URL}/api/analytics/imported-class-overview`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    console.warn(`[teacherService.getTeacherClasses] ${res.status} ${res.statusText}`);
    return [];
  }
  const data = await res.json();
  // Normalize from backend shape (ImportedClassOverviewResponse) to ClassGroup[]
  const classes = data?.classes ?? data ?? [];
  return Array.isArray(classes) ? classes : [];
}

export async function getStudents(
  classId: string,
  teacherId: string,
  token: string,
): Promise<any[]> {
  // Real endpoint: GET /api/analytics/class/{class_id}/students
  const res = await fetch(
    `${API_URL}/api/analytics/class/${encodeURIComponent(classId)}/students`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    console.warn(`[teacherService.getStudents] ${res.status} ${res.statusText}`);
    return [];
  }
  return res.json();
}

export async function getAtRiskStudents(
  teacherId: string,
  token: string,
): Promise<AtRiskStudent[]> {
  // Real endpoint: POST /api/predict-risk/batch
  const res = await fetch(`${API_URL}/api/predict-risk/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ teacherId }),
  });
  if (!res.ok) {
    console.warn(`[teacherService.getAtRiskStudents] ${res.status} ${res.statusText}`);
    return [];
  }
  const data = await res.json();
  return data?.students ?? data?.atRisk ?? data ?? [];
}

export async function getTeachingTasks(
  teacherId: string,
  token: string,
): Promise<TeachingTask[]> {
  console.warn('[teacherService.getTeachingTasks] Backend endpoint not yet implemented; returning empty result');
  return [];
}

export async function getClassAnalytics(
  classId: string,
  token: string,
): Promise<ClassAnalytics> {
  // Real endpoint: GET /api/analytics/class/{class_id}
  const res = await fetch(
    `${API_URL}/api/analytics/class/${encodeURIComponent(classId)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    console.warn(`[teacherService.getClassAnalytics] ${res.status} ${res.statusText}`);
    throw new Error(`Failed to fetch analytics: ${res.status}`);
  }
  return res.json();
}

export async function getAIInsights(
  teacherId: string,
  token: string,
): Promise<AIInsight[]> {
  // Real endpoint: POST /api/analytics/daily-insight
  const res = await fetch(`${API_URL}/api/analytics/daily-insight`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ teacherId }),
  });
  if (!res.ok) {
    console.warn(`[teacherService.getAIInsights] ${res.status} ${res.statusText}`);
    return [];
  }
  const data = await res.json();
  return data?.insights ?? data ?? [];
}
