import { API_URL } from '../lib/api';

// --- Types ---

export interface SystemStats {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalAdmins: number;
  activeUsers24h: number;
  activeUsers7d: number;
  totalQuizzes: number;
  totalLessons: number;
  totalChatSessions: number;
  averageScore: number;
  systemHealth: 'healthy' | 'degraded' | 'down';
  uptimePercent: number;
}

export interface AdminUserRow {
  uid: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  status: 'active' | 'suspended' | 'pending';
  createdAt: string;
  lastActive?: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  targetType: string;
  targetId: string;
  timestamp: string;
  ipAddress?: string;
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: 'deepseek' | 'openai' | 'anthropic' | 'local';
  model: string;
  endpoint?: string;
  enabled: boolean;
  useFor: ('rag' | 'chat' | 'quiz_generation' | 'analytics' | 'insights')[];
  rateLimitPerMinute: number;
  dailyTokenBudget: number;
  tokensUsedToday: number;
}

export interface SystemAlert {
  id: string;
  level: 'info' | 'warning' | 'critical';
  service: string;
  message: string;
  timestamp: string;
  resolved: boolean;
}

export interface AuditLogFilters {
  limit?: number;
  action?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

// --- API calls ---

export async function getSystemStats(token: string): Promise<SystemStats> {
  // Real endpoint: GET /api/admin/school-analytics
  const res = await fetch(`${API_URL}/api/admin/school-analytics`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch stats: ${res.status}`);
  const data = await res.json();
  return data?.analytics ?? data ?? {};
}

export async function listUsers(
  role: 'all' | 'student' | 'teacher' | 'admin',
  token: string,
  search?: string,
): Promise<AdminUserRow[]> {
  // Real endpoint: GET /api/admin/users?page=1&pageSize=50&role=X&search=Y
  let url = `${API_URL}/api/admin/users?page=1&pageSize=50`;
  if (role && role !== 'all') url += `&role=${role}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch users: ${res.status}`);
  const data = await res.json();
  return data?.users ?? data ?? [];
}

export async function createUser(
  payload: { email: string; name: string; role: string; grade?: string; section?: string },
  token: string,
): Promise<AdminUserRow> {
  const res = await fetch(`${API_URL}/api/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to create user: ${res.status}`);
  return res.json();
}

export async function updateUser(
  uid: string,
  updates: Record<string, unknown>,
  token: string,
): Promise<AdminUserRow> {
  const res = await fetch(`${API_URL}/api/admin/users?uid=${encodeURIComponent(uid)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`Failed to update user: ${res.status}`);
  return res.json();
}

export async function deleteUser(
  uid: string,
  token: string,
): Promise<void> {
  const res = await fetch(`${API_URL}/api/admin/users?uid=${encodeURIComponent(uid)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to delete user: ${res.status}`);
}

export async function getAuditLog(
  limitOrFilters: number | AuditLogFilters,
  token: string,
): Promise<AuditLogEntry[]> {
  // Real endpoint: POST /api/admin/audit-log
  const body: Record<string, unknown> = {};
  if (typeof limitOrFilters === 'number') {
    body.limit = limitOrFilters;
  } else {
    Object.assign(body, limitOrFilters);
  }

  const res = await fetch(`${API_URL}/api/admin/audit-log`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to fetch audit log: ${res.status}`);
  const data = await res.json();
  return data?.entries ?? data ?? [];
}

export async function getModelConfigs(token: string): Promise<ModelConfig[]> {
  // Real endpoint: GET /api/admin/model-config
  const res = await fetch(`${API_URL}/api/admin/model-config`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch model configs: ${res.status}`);
  const data = await res.json();
  return data?.configs ?? data?.models ?? data ?? [];
}

export async function updateModelConfig(
  id: string,
  enabled: boolean,
  token: string,
  key?: string,
  value?: unknown,
): Promise<void> {
  // Real endpoint: POST /api/admin/model-config/override
  const body: Record<string, unknown> = key != null
    ? { id, key, value }
    : { id, enabled };
  const res = await fetch(`${API_URL}/api/admin/model-config/override`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to update model: ${res.status}`);
}

export async function getSystemAlerts(token: string): Promise<SystemAlert[]> {
  console.warn('[adminService.getSystemAlerts] Backend endpoint not yet implemented; returning empty result');
  return [];
}
