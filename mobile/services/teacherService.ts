import { API_URL } from '../lib/api';
import {
  db,
  collection,
  getDocs,
  firestoreQuery,
  where,
  orderBy,
  updateDoc,
  doc,
} from '../lib/firebase';

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
  isOverdue: boolean;
}

export interface TeachingTaskFilters {
  status?: 'all' | 'pending' | 'completed' | 'overdue';
  classId?: string;
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

function toFirestoreDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? new Date() : new Date(parsed);
  }
  if (typeof value === 'object' && value) {
    const record = value as { toDate?: () => Date; seconds?: number };
    if (typeof record.toDate === 'function') return record.toDate();
    if (typeof record.seconds === 'number') return new Date(record.seconds * 1000);
  }
  return new Date();
}

export async function getTeachingTasks(
  teacherId: string,
  filters?: TeachingTaskFilters,
): Promise<TeachingTask[]> {
  const now = Date.now();
  const constraints: Parameters<typeof firestoreQuery>[1][] = [
    where('assignedTeacherId', '==', teacherId),
    orderBy('dueDate', 'asc'),
  ];

  const tasksQuery = firestoreQuery(collection(db, 'tasks'), ...constraints);
  const snap = await getDocs(tasksQuery);

  const tasks: TeachingTask[] = snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    const dueDateMs = toFirestoreDate(data.dueDate).getTime();
    const isOverdue = dueDateMs < now && data.status !== 'closed';

    return {
      id: d.id,
      title: typeof data.title === 'string' ? data.title : 'Untitled Task',
      classId: typeof data.classId === 'string' ? data.classId : '',
      className: typeof data.className === 'string' ? data.className : '',
      type: ['assignment', 'quiz', 'project', 'review'].includes(data.type as string)
        ? (data.type as TeachingTask['type'])
        : 'assignment',
      dueDate: typeof data.dueDate === 'string'
        ? data.dueDate
        : toFirestoreDate(data.dueDate).toISOString(),
      status: ['draft', 'published', 'closed'].includes(data.status as string)
        ? (data.status as TeachingTask['status'])
        : 'draft',
      submissions: typeof data.submissions === 'number' ? data.submissions : 0,
      totalStudents: typeof data.totalStudents === 'number' ? data.totalStudents : 0,
      isOverdue,
    };
  });

  let filtered = tasks;

  if (filters?.status && filters.status !== 'all') {
    filtered = filtered.filter((t) => {
      switch (filters.status) {
        case 'pending':
          return t.status === 'published' && !t.isOverdue;
        case 'completed':
          return t.status === 'closed';
        case 'overdue':
          return t.isOverdue;
        default:
          return true;
      }
    });
  }

  if (filters?.classId) {
    filtered = filtered.filter((t) => t.classId === filters.classId);
  }

  return filtered;
}

export async function markTeachingTaskComplete(
  taskId: string,
): Promise<void> {
  await updateDoc(doc(db, 'tasks', taskId), {
    status: 'closed',
  });
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
