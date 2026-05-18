// src/services/adminService.ts
// Firebase Firestore operations for admin panel features

import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getDefaultAvatar } from '../utils/avatarUtils';
import { auth } from '../lib/firebase';
import {
  ApiError,
  ApiNetworkError,
  ApiTimeoutError,
  apiService,
  type AdminBulkActionApiResponse,
  type AdminBulkActionRequestApi,
  type AdminUserApiRecord,
} from './apiService';

// ─── Types ───────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  gender?: 'male' | 'female' | 'prefer_not_to_say' | null;
  /** Capitalized: 'Student' | 'Teacher' | 'Admin' */
  role: string;
  status: string;
  department: string;
  grade?: string;
  section?: string;
  classSectionId?: string;
  classSection?: string;
  lrn?: string;
  photo?: string;
  lastLogin: string;
  createdAt?: string;
}

export interface AdminUsersPageOptions {
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  roleFilter?: string;
  statusFilter?: string;
  gradeFilter?: string;
  sectionFilter?: string;
  classSectionId?: string;
}

export interface AdminUsersPageResult {
  users: AdminUser[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
}

export type AdminBulkActionType = AdminBulkActionRequestApi['action'];

export interface AdminBulkActionInput {
  action: AdminBulkActionType;
  userIds?: string[];
  excludeUserIds?: string[];
  filters?: {
    search?: string;
    role?: string;
    status?: string;
    grade?: string;
    section?: string;
    classSectionId?: string;
  };
  role?: string;
  status?: string;
  grade?: string;
  section?: string;
  lrn?: string;
  dryRun?: boolean;
  exportFormat?: 'csv' | 'json';
}

export interface AdminBulkActionResult {
  success: boolean;
  action: string;
  summary: {
    targeted: number;
    succeeded: number;
    failed: number;
    skipped: number;
    exported: number;
  };
  results: Array<{
    uid: string;
    email?: string | null;
    status: string;
    message: string;
  }>;
  warnings: string[];
  exportRows: Record<string, unknown>[];
}

export interface CreateAdminUserInput {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'Student' | 'Teacher' | 'Admin';
  status: 'Active' | 'Inactive';
  grade: string;
  section: string;
  lrn?: string;
}

export interface CreateAdminUserResult {
  uid: string;
  userCreated: boolean;
  emailSent: boolean;
  resultCode: 'created_and_emailed' | 'created_email_failed';
  message: string;
  warnings: string[];
  emailError?: {
    provider?: string;
    code?: string;
    message?: string;
    retryable?: boolean;
  } | null;
}

export type AuditSeverity = 'Info' | 'Warning' | 'Error' | 'Critical';
export type AuditCategory = 'Auth' | 'User' | 'Content' | 'System' | 'Data';

export interface AuditLogEntry {
  id: string;
  severity: AuditSeverity;
  timestamp: string;
  user: { name: string; role: string; avatar: string | null };
  action: string;
  category: AuditCategory;
  details: string;
}

export interface ContentModule {
  id: string;
  title: string;
  subject: string;
  type: 'Video' | 'Quiz' | 'Document';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'N/A';
  status: 'Published' | 'Draft' | 'Archived';
  assigned: number;
  created: string;
  // RAG pipeline configuration
  ragEnabled?: boolean;
  ragDocumentUrl?: string;
  ragChunkSize?: number;
  ragChunkOverlap?: number;
  ragEmbeddingModel?: string;
  ragTopK?: number;
  ragNamespace?: string;
  ragIndexStatus?: 'pending' | 'indexed' | 'failed' | 'not_indexed';
  ragLastIndexedAt?: string;
}

export interface DashboardStats {
  totalStudents: number;
  activeTeachers: number;
  totalClasses: number;
  atRiskStudents: number;
  avgPerformance: number;
  aiPredictions: number;
}

export interface TopPerformer {
  id: string;
  name: string;
  avatar: string;
  class: string;
  performance: number;
  level: number;
}

// ─── Helpers ─────────────────────────────────────────────────

function capitalizeRole(role: string): string {
  if (!role) return 'Student';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function getDepartmentFromProfile(data: Record<string, unknown>): string {
  if (data.role === 'student') {
    const grade = (data.grade as string) || '';
    const section = (data.section as string) || '';
    return [grade, section].filter(Boolean).join(' - ') || 'Student';
  }
  if (data.role === 'teacher') return (data.department as string) || 'Mathematics';
  if (data.role === 'admin') return (data.department as string) || 'System';
  return '';
}

function formatLastLogin(ts: { toDate?: () => Date } | null | undefined): string {
  if (!ts || !ts.toDate) return 'Never';
  const date = ts.toDate();
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

function timestampToString(ts: { toDate?: () => Date } | null | undefined): string {
  if (!ts || !ts.toDate) return new Date().toISOString().replace('T', ' ').slice(0, 19);
  const d = ts.toDate();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function nowTimestamp(): string {
  return timestampToString({ toDate: () => new Date() });
}

function formatLastLoginString(lastLogin?: string | null): string {
  if (!lastLogin) return 'Never';

  const parsed = new Date(lastLogin);
  if (Number.isNaN(parsed.getTime())) {
    return lastLogin;
  }

  const now = Date.now();
  const diffMs = now - parsed.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

  return parsed.toLocaleDateString();
}

function mapAdminUserRecord(record: AdminUserApiRecord): AdminUser {
  const grade = (record.grade || '').trim();
  const section = (record.section || '').trim();
  const computedClassSection = [grade, section].filter(Boolean).join(' - ');

  return {
    id: record.uid,
    name: record.name || 'Unknown',
    email: record.email || '',
    role: capitalizeRole(record.role || ''),
    status: record.status || 'Active',
    department: record.department || (record.role?.toLowerCase() === 'student' ? (computedClassSection || 'Student') : ''),
    grade,
    section,
    classSectionId: record.classSectionId || undefined,
    classSection: computedClassSection,
    lrn: (record.lrn || '').trim(),
    gender: record.gender || null,
    photo: (record.photo || '').trim(),
    lastLogin: formatLastLoginString(record.lastLogin),
    createdAt: record.createdAt || undefined,
  };
}

function extractApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    try {
      const parsed = JSON.parse(error.responseBody) as { detail?: string };
      if (parsed?.detail && typeof parsed.detail === 'string') {
        return parsed.detail;
      }
    } catch {
      // Fall through to status-based message.
    }
    return `Request failed (${error.status}).`;
  }
  return error instanceof Error ? error.message : 'Request failed.';
}

// ─── User Management ─────────────────────────────────────────

/** Retrieve one paginated page of users from backend admin APIs. */
export async function getAdminUsersPage(options: AdminUsersPageOptions = {}): Promise<AdminUsersPageResult> {
  try {
    const response = await apiService.getAdminUsers({
      page: options.page ?? 1,
      pageSize: options.pageSize ?? 25,
      search: options.searchQuery,
      role: options.roleFilter,
      status: options.statusFilter,
      grade: options.gradeFilter,
      section: options.sectionFilter,
      classSectionId: options.classSectionId,
    });

    if (!response.success) {
      throw new Error('Failed to load admin users');
    }

    return {
      users: (response.users || []).map(mapAdminUserRecord),
      page: response.page,
      pageSize: response.pageSize,
      total: response.total,
      totalPages: response.totalPages,
      hasNextPage: response.hasNextPage,
    };
  } catch (err) {
    console.error('[adminService] getAdminUsersPage error:', err);
    if (err instanceof ApiTimeoutError) {
      throw new Error('Loading users timed out. Please refresh and try again.');
    }

    if (err instanceof ApiNetworkError) {
      throw new Error('Unable to reach the server. Please check your connection and retry.');
    }

    if (err instanceof ApiError && err.status === 504) {
      throw new Error('Loading users took too long. Try narrowing your filters and retrying.');
    }

    throw new Error(extractApiErrorMessage(err));
  }
}

/** Compatibility helper that returns the first page of users as a flat array. */
export async function getAllUsers(): Promise<AdminUser[]> {
  const page = await getAdminUsersPage({ page: 1, pageSize: 200 });
  return page.users;
}

/** Update a user via backend admin API. */
export async function updateAdminUser(uid: string, updates: Partial<AdminUser>): Promise<void> {
  try {
    await apiService.updateAdminUser(uid, {
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.role !== undefined ? { role: updates.role } : {}),
      ...(updates.status !== undefined ? { status: updates.status } : {}),
      ...(updates.department !== undefined ? { department: updates.department } : {}),
      ...(updates.grade !== undefined ? { grade: updates.grade } : {}),
      ...(updates.section !== undefined ? { section: updates.section } : {}),
      ...(updates.lrn !== undefined ? { lrn: updates.lrn } : {}),
    });
  } catch (error) {
    throw new Error(extractApiErrorMessage(error));
  }
}

/** Delete a user account through backend (Auth + Firestore profile). */
export async function deleteAdminUser(uid: string): Promise<void> {
  try {
    const response = await apiService.deleteAdminUser(uid);
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete user account.');
    }
  } catch (error) {
    throw new Error(extractApiErrorMessage(error));
  }
}

/**
 * Create a new user account through backend provisioning (Auth + Firestore)
 * and trigger transactional welcome email delivery.
 */
export async function createAdminUser(input: CreateAdminUserInput): Promise<CreateAdminUserResult> {
  try {
    const response = await apiService.createAdminUser({
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      password: input.password,
      confirmPassword: input.confirmPassword,
      role: input.role,
      status: input.status,
      grade: input.grade.trim(),
      section: input.section.trim(),
      ...(input.lrn?.trim() ? { lrn: input.lrn.trim() } : {}),
    });

    if (!response.success || !response.userCreated || !response.uid) {
      throw new Error(response.message || 'Failed to create user account.');
    }

    return {
      uid: response.uid,
      userCreated: response.userCreated,
      emailSent: response.emailSent,
      resultCode: response.resultCode,
      message: response.message,
      warnings: response.warnings ?? [],
      emailError: response.emailError,
    };
  } catch (error) {
    throw new Error(extractApiErrorMessage(error));
  }
}

/** Apply backend bulk action against selected users or a filtered scope. */
export async function applyAdminBulkAction(input: AdminBulkActionInput): Promise<AdminBulkActionResult> {
  try {
    const response: AdminBulkActionApiResponse = await apiService.bulkAdminUsers({
      action: input.action,
      userIds: input.userIds ?? [],
      excludeUserIds: input.excludeUserIds ?? [],
      filters: input.filters,
      role: input.role,
      status: input.status,
      grade: input.grade,
      section: input.section,
      lrn: input.lrn,
      dryRun: input.dryRun,
      exportFormat: input.exportFormat ?? 'csv',
    });

    return {
      success: response.success,
      action: response.action,
      summary: response.summary,
      results: response.results,
      warnings: response.warnings || [],
      exportRows: response.export?.rows || [],
    };
  } catch (error) {
    throw new Error(extractApiErrorMessage(error));
  }
}

// ─── Audit Logs ──────────────────────────────────────────────

/**
 * Fetch audit log entries ordered by most recent.
 * Only call this when the user is authenticated and has admin/teacher role.
 * Returns [] if not authorized or if Firestore throws permission-denied.
 */
export async function getAuditLogs(): Promise<AuditLogEntry[]> {
  try {
    // Gate: require authenticated user (defensive - UI should already gate this)
    if (!auth.currentUser) {
      return [];
    }

    // Read from accessAuditLogs (backend-written events)
    const accessQ = query(collection(db, 'accessAuditLogs'), orderBy('timestamp', 'desc'), limit(100));
    const accessSnap = await getDocs(accessQ);
    const accessEntries: AuditLogEntry[] = accessSnap.docs.map(d => {
      const data = d.data() as Record<string, unknown>;
      
      const success = data.success !== false;
      const severity: AuditSeverity = !success ? 'Error' : 'Info';
      
      const actionRaw = (data.action as string) || '';
      let category: AuditCategory = 'System';
      const module = data.module as string;
      if (module === 'admin' || actionRaw.startsWith('admin_')) category = 'User';
      else if (actionRaw.includes('login') || actionRaw.includes('auth')) category = 'Auth';
      else if (actionRaw.includes('upload') || actionRaw.includes('course')) category = 'Content';
      
      return {
        id: d.id,
        severity,
        timestamp: typeof data.timestamp === 'string'
        ? data.timestamp
        : timestampToString(data.timestamp as { toDate?: () => Date }),
        user: { 
          name: (() => {
            const raw = (data.actorName as string) || (data.actorEmail as string) || (data.teacherEmail as string) || (data.teacherId as string) || 'SYSTEM';
            if (raw === 'Unknown' || !raw) return 'SYSTEM';
            // If it's an email, extract a readable name from the local part
            if (raw.includes('@')) {
              const local = raw.split('@')[0];
              return local.replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            }
            return raw;
          })(),
          role: capitalizeRole((data.actorRole as string) || (data.role as string) || 'System'), 
          avatar: null 
        },
        action: actionRaw,
        category,
        details: (data.description as string) || (data.status ? `Status: ${data.status}` : ''),
      };
    });

    // Also read from auditLogs (frontend + cloud function written entries)
    const auditQ = query(collection(db, 'auditLogs'), orderBy('timestampRaw', 'desc'), limit(50));
    const auditSnap = await getDocs(auditQ);
    const auditEntries: AuditLogEntry[] = auditSnap.docs.map(d => {
      const data = d.data() as Record<string, unknown>;
      const rawUser = data.user as { name?: string; role?: string; avatar?: string | null } | undefined;
      return {
        id: `audit-${d.id}`,
        severity: (data.severity as AuditSeverity) || 'Info',
        timestamp: (data.timestamp as string) || timestampToString(data.timestampRaw as { toDate?: () => Date }),
        user: {
          name: rawUser?.name || 'SYSTEM',
          role: rawUser?.role || 'System',
          avatar: rawUser?.avatar ?? null,
        },
        action: (data.action as string) || '',
        category: (data.category as AuditCategory) || 'System',
        details: (data.details as string) || '',
      };
    });

    // Merge and sort by timestamp descending
    return [...accessEntries, ...auditEntries]
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 100);
  } catch (err: unknown) {
    // Log only unexpected errors, not permission-denied (which is expected for non-admin/teacher)
    const error = err as { code?: string };
    if (error?.code === 'permission-denied' || error?.code === 'firestore/permission-denied') {
      return [];
    }
    console.error('[adminService] getAuditLogs error:', err);
    return [];
  }
}

/** Write a new audit log entry to Firestore. */
export async function addAuditLog(
  action: string,
  category: AuditCategory,
  severity: AuditSeverity,
  details: string,
  user: AuditLogEntry['user']
): Promise<void> {
  await addDoc(collection(db, 'auditLogs'), {
    severity,
    timestamp: nowTimestamp(),
    timestampRaw: serverTimestamp(),
    user,
    action,
    category,
    details,
  });
}

// ─── Content Modules ─────────────────────────────────────────

/** Fetch all content modules from Firestore. */
export async function getModules(): Promise<ContentModule[]> {
  try {
    const q = query(collection(db, 'modules'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data() as Record<string, unknown>;
      const createdAt = data.createdAt as { toDate?: () => Date } | undefined;
      return {
        id: d.id,
        title: (data.title as string) || '',
        subject: (data.subject as string) || '',
        type: (data.type as ContentModule['type']) || 'Video',
        difficulty: (data.difficulty as ContentModule['difficulty']) || 'Beginner',
        status: (data.status as ContentModule['status']) || 'Draft',
        assigned: (data.assigned as number) || 0,
        created:
          (createdAt?.toDate?.()?.toLocaleDateString() ??
            ((data.created as string) || 'Unknown')),
        // RAG fields
        ragEnabled: data.ragEnabled as boolean | undefined,
        ragDocumentUrl: data.ragDocumentUrl as string | undefined,
        ragChunkSize: data.ragChunkSize as number | undefined,
        ragChunkOverlap: data.ragChunkOverlap as number | undefined,
        ragEmbeddingModel: data.ragEmbeddingModel as string | undefined,
        ragTopK: data.ragTopK as number | undefined,
        ragNamespace: data.ragNamespace as string | undefined,
        ragIndexStatus: data.ragIndexStatus as ContentModule['ragIndexStatus'] | undefined,
        ragLastIndexedAt: data.ragLastIndexedAt as string | undefined,
      };
    });
  } catch (err) {
    console.error('[adminService] getModules error:', err);
    return [];
  }
}

/** Create a new module in Firestore. */
export async function createModule(
  moduleData: Omit<ContentModule, 'id' | 'created'>
): Promise<string> {
  const docRef = await addDoc(collection(db, 'modules'), {
    ...moduleData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/** Update an existing module in Firestore. */
export async function updateModule(
  id: string,
  updates: Partial<Omit<ContentModule, 'id'>>
): Promise<void> {
  await updateDoc(doc(db, 'modules', id), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/** Delete a module from Firestore. */
export async function deleteModule(id: string): Promise<void> {
  await deleteDoc(doc(db, 'modules', id));
}

// ─── Dashboard Stats ─────────────────────────────────────────

/** Aggregate stats from Firestore for the admin overview dashboard. */
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    let totalStudents = 0;
    let activeTeachers = 0;
    let atRiskStudents = 0;
    const atRiskUserIds = new Set<string>();

    usersSnap.docs.forEach(d => {
      const data = d.data() as Record<string, unknown>;
      if (data.role === 'student') {
        totalStudents++;
        if (data.overallRisk === 'High') {
          atRiskStudents++;
          atRiskUserIds.add(d.id);
        }
      }
      if (data.role === 'teacher' && data.status !== 'Inactive') {
        activeTeachers++;
      }
    });

    // Also count WRI-based at-risk from managedStudents (PR 110 pipeline)
    try {
      const managedSnap = await getDocs(collection(db, 'managedStudents'));
      managedSnap.docs.forEach(d => {
        const data = d.data() as Record<string, unknown>;
        const riskStatus = data.riskStatus as string | undefined;
        if (riskStatus && ['intervene', 'critical', 'at_risk'].includes(riskStatus)) {
          if (!atRiskUserIds.has(d.id)) {
            atRiskStudents++;
            atRiskUserIds.add(d.id);
          }
        }
      });
    } catch { /* managedStudents may not exist */ }

    let totalClasses = 0;
    try {
      const classroomsSnap = await getDocs(collection(db, 'classrooms'));
      totalClasses = classroomsSnap.size;
    } catch { /* collection may not exist yet */ }

    let aiPredictions = 0;
    try {
      const xpSnap = await getDocs(collection(db, 'xpActivities'));
      aiPredictions = xpSnap.size;
    } catch { /* collection may not exist yet */ }

    let avgPerformance = 0;
    try {
      const progressSnap = await getDocs(collection(db, 'progress'));
      const scores: number[] = [];
      progressSnap.docs.forEach(d => {
        const data = d.data() as Record<string, unknown>;
        if (typeof data.averageScore === 'number') scores.push(data.averageScore);
      });
      avgPerformance =
        scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 0;
    } catch { /* collection may not exist yet */ }

    return {
      totalStudents,
      activeTeachers,
      totalClasses,
      atRiskStudents,
      avgPerformance,
      aiPredictions,
    };
  } catch (err) {
    console.error('[adminService] getDashboardStats error:', err);
    return {
      totalStudents: 0,
      activeTeachers: 0,
      totalClasses: 0,
      atRiskStudents: 0,
      avgPerformance: 0,
      aiPredictions: 0,
    };
  }
}

// ─── Top Performers ──────────────────────────────────────────

/** Get top N students ordered by level descending. */
export async function getTopPerformers(n = 3): Promise<TopPerformer[]> {
  const mapDocToPerformer = (d: { id: string; data: () => Record<string, unknown> }): TopPerformer => {
    const data = d.data();
    const level = (data.level as number) || 1;
    const currentXP = (data.currentXP as number) || 0;
    // Rough performance estimate: clamp level*8 to [0,100]
    const performance = Math.min(100, level * 8 + Math.round(currentXP / 100));
    return {
      id: d.id,
      name: (data.name as string) || 'Student',
      avatar:
        (data.photo as string) ||
        (data.photoURL as string) ||
        getDefaultAvatar((data.gender as 'male' | 'female' | 'prefer_not_to_say') || null),
      class: (data.grade as string) || 'Math',
      performance,
      level,
    };
  };

  const sortAndTrim = (performers: TopPerformer[]): TopPerformer[] =>
    performers
      .sort((a, b) => {
        if (b.level !== a.level) return b.level - a.level;
        return b.performance - a.performance;
      })
      .slice(0, n);

  try {
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'student'),
      orderBy('level', 'desc'),
      limit(n)
    );
    const snap = await getDocs(q);
    return sortAndTrim(snap.docs.map(mapDocToPerformer));
  } catch (err) {
    const errorCode = (err as { code?: string } | null)?.code;
    if (errorCode === 'failed-precondition') {
      try {
        // Fallback avoids composite-index requirements by sorting in memory.
        const fallbackQuery = query(
          collection(db, 'users'),
          where('role', '==', 'student'),
          limit(Math.max(50, n))
        );
        const fallbackSnap = await getDocs(fallbackQuery);
        return sortAndTrim(fallbackSnap.docs.map(mapDocToPerformer));
      } catch (fallbackError) {
        console.error('[adminService] getTopPerformers fallback error:', fallbackError);
        return [];
      }
    }

    console.error('[adminService] getTopPerformers error:', err);
    return [];
  }
}

// ─── Dashboard Real Data (System Performance, Subject Breakdown, Priority, Mastery) ───

export interface WeeklyActivityData {
  name: string; // Day abbreviation
  ai: number;
  man: number;
}

export interface SubjectBreakdownItem {
  name: string;
  type: 'Core' | 'STEM';
  count: number;
  progress: number;
}

export interface PriorityAttentionData {
  subjectName: string;
  atRiskCount: number;
}

export interface GlobalMasteryData {
  avgMastery: number;
  passed: number;
  pending: number;
}

export interface DifficultyDistribution {
  foundational: number;
  intermediate: number;
  advanced: number;
}

/** Get weekly XP activity counts grouped by day (last 7 days). AI = xpActivities, Manual = quiz/lesson completions without XP. */
export async function getWeeklyActivity(): Promise<WeeklyActivityData[]> {
  try {
    const now = new Date();
    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const result: WeeklyActivityData[] = [];

    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      result.push({ name: dayNames[d.getDay()], ai: 0, man: 0 });
    }

    const xpSnap = await getDocs(collection(db, 'xpActivities'));
    xpSnap.docs.forEach(d => {
      const data = d.data() as Record<string, unknown>;
      const ts = data.timestamp as { toDate?: () => Date } | undefined;
      if (!ts?.toDate) return;
      const date = ts.toDate();
      const daysAgo = Math.floor((now.getTime() - date.getTime()) / 86400000);
      if (daysAgo < 0 || daysAgo > 6) return;
      const idx = 6 - daysAgo;
      const type = data.type as string;
      // AI-driven activities vs manual
      if (type === 'lesson_complete' || type === 'quiz_complete') {
        result[idx].ai++;
      } else {
        result[idx].man++;
      }
    });

    return result;
  } catch (err) {
    console.error('[adminService] getWeeklyActivity error:', err);
    return [
      { name: 'M', ai: 0, man: 0 }, { name: 'T', ai: 0, man: 0 },
      { name: 'W', ai: 0, man: 0 }, { name: 'T', ai: 0, man: 0 },
      { name: 'F', ai: 0, man: 0 }, { name: 'S', ai: 0, man: 0 },
      { name: 'S', ai: 0, man: 0 },
    ];
  }
}

/** Get subject breakdown with real enrollment and average progress from progress collection. */
export async function getSubjectBreakdown(): Promise<SubjectBreakdownItem[]> {
  try {
    const progressSnap = await getDocs(collection(db, 'progress'));
    const subjectStats: Record<string, { enrolled: number; totalProgress: number }> = {
      'gen-math': { enrolled: 0, totalProgress: 0 },
      'stats-prob': { enrolled: 0, totalProgress: 0 },
    };

    progressSnap.docs.forEach(d => {
      const data = d.data() as Record<string, unknown>;
      const subjects = data.subjects as Record<string, { progress?: number }> | undefined;
      if (!subjects) return;
      Object.entries(subjects).forEach(([subId, subData]) => {
        if (subjectStats[subId]) {
          subjectStats[subId].enrolled++;
          subjectStats[subId].totalProgress += subData?.progress ?? 0;
        }
      });
    });

    return [
      {
        name: 'General Mathematics',
        type: 'Core',
        count: subjectStats['gen-math'].enrolled,
        progress: subjectStats['gen-math'].enrolled > 0
          ? Math.round(subjectStats['gen-math'].totalProgress / subjectStats['gen-math'].enrolled)
          : 0,
      },
      {
        name: 'Statistics & Probability',
        type: 'Core',
        count: subjectStats['stats-prob'].enrolled,
        progress: subjectStats['stats-prob'].enrolled > 0
          ? Math.round(subjectStats['stats-prob'].totalProgress / subjectStats['stats-prob'].enrolled)
          : 0,
      },
    ];
  } catch (err) {
    console.error('[adminService] getSubjectBreakdown error:', err);
    return [];
  }
}

/** Get priority attention data — subject with most at-risk students. */
export async function getPriorityAttention(): Promise<PriorityAttentionData> {
  try {
    const counted = new Set<string>();
    let atRiskCount = 0;

    const usersSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'student')));
    usersSnap.docs.forEach(d => {
      const data = d.data() as Record<string, unknown>;
      if (data.overallRisk === 'High') { atRiskCount++; counted.add(d.id); }
    });

    // Also count WRI-based at-risk from managedStudents
    try {
      const managedSnap = await getDocs(collection(db, 'managedStudents'));
      managedSnap.docs.forEach(d => {
        const data = d.data() as Record<string, unknown>;
        const rs = data.riskStatus as string | undefined;
        if (rs && ['intervene', 'critical', 'at_risk'].includes(rs) && !counted.has(d.id)) {
          atRiskCount++;
          counted.add(d.id);
        }
      });
    } catch { /* non-critical */ }

    return { subjectName: 'General Mathematics', atRiskCount };
  } catch (err) {
    console.error('[adminService] getPriorityAttention error:', err);
    return { subjectName: 'General Mathematics', atRiskCount: 0 };
  }
}

/** Get global mastery average from progress collection. */
export async function getGlobalMastery(): Promise<GlobalMasteryData> {
  try {
    const progressSnap = await getDocs(collection(db, 'progress'));
    let totalScore = 0;
    let passed = 0;
    let pending = 0;
    let count = 0;

    progressSnap.docs.forEach(d => {
      const data = d.data() as Record<string, unknown>;
      const avg = data.averageScore as number | undefined;
      if (typeof avg === 'number') {
        totalScore += avg;
        count++;
        if (avg >= 60) passed++;
        else pending++;
      } else {
        pending++;
      }
    });

    return {
      avgMastery: count > 0 ? Math.round(totalScore / count) : 0,
      passed,
      pending,
    };
  } catch (err) {
    console.error('[adminService] getGlobalMastery error:', err);
    return { avgMastery: 0, passed: 0, pending: 0 };
  }
}

/** Get difficulty distribution from progress collection quiz attempts. */
export async function getDifficultyDistribution(): Promise<DifficultyDistribution> {
  try {
    const progressSnap = await getDocs(collection(db, 'progress'));
    let foundational = 0;
    let intermediate = 0;
    let advanced = 0;

    progressSnap.docs.forEach(d => {
      const data = d.data() as Record<string, unknown>;
      const avg = data.averageScore as number | undefined;
      if (typeof avg !== 'number') { foundational++; return; }
      if (avg < 50) foundational++;
      else if (avg < 80) intermediate++;
      else advanced++;
    });

    const total = foundational + intermediate + advanced || 1;
    return {
      foundational: Math.round((foundational / total) * 100),
      intermediate: Math.round((intermediate / total) * 100),
      advanced: Math.round((advanced / total) * 100),
    };
  } catch (err) {
    console.error('[adminService] getDifficultyDistribution error:', err);
    return { foundational: 0, intermediate: 0, advanced: 0 };
  }
}

// ─── Analytics Summary ───────────────────────────────────────

export interface AnalyticsSummary {
  totalActiveUsers: number;
  totalStudents: number;
  totalTeachers: number;
  atRiskStudents: number;
  achievementsUnlocked: number;
  totalXPEarned: number;
  activeStreaks: number;
  aiTutorSessions: number;
}

/** Aggregate analytics KPIs from Firestore. */
export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    let totalStudents = 0;
    let totalTeachers = 0;
    let atRiskStudents = 0;
    let totalXPEarned = 0;
    let activeStreaks = 0;
    const atRiskIds = new Set<string>();

    usersSnap.docs.forEach(d => {
      const data = d.data() as Record<string, unknown>;
      if (data.role === 'student') {
        totalStudents++;
        if (data.overallRisk === 'High') { atRiskStudents++; atRiskIds.add(d.id); }
        if ((data.streak as number) > 0) activeStreaks++;
        totalXPEarned += (data.totalXP as number) || 0;
      }
      if (data.role === 'teacher') totalTeachers++;
    });

    // Also count WRI-based at-risk from managedStudents
    try {
      const managedSnap = await getDocs(collection(db, 'managedStudents'));
      managedSnap.docs.forEach(d => {
        const data = d.data() as Record<string, unknown>;
        const rs = data.riskStatus as string | undefined;
        if (rs && ['intervene', 'critical', 'at_risk'].includes(rs) && !atRiskIds.has(d.id)) {
          atRiskStudents++;
          atRiskIds.add(d.id);
        }
      });
    } catch { /* non-critical */ }

    let achievementsUnlocked = 0;
    try {
      const achSnap = await getDocs(collection(db, 'achievements'));
      achievementsUnlocked = achSnap.size;
    } catch { /* optional */ }

    let aiTutorSessions = 0;
    try {
      const chatSnap = await getDocs(collection(db, 'chatSessions'));
      aiTutorSessions = chatSnap.size;
    } catch { /* optional */ }

    return {
      totalActiveUsers: totalStudents + totalTeachers,
      totalStudents,
      totalTeachers,
      atRiskStudents,
      achievementsUnlocked,
      totalXPEarned,
      activeStreaks,
      aiTutorSessions,
    };
  } catch (err) {
    console.error('[adminService] getAnalyticsSummary error:', err);
    return {
      totalActiveUsers: 0,
      totalStudents: 0,
      totalTeachers: 0,
      atRiskStudents: 0,
      achievementsUnlocked: 0,
      totalXPEarned: 0,
      activeStreaks: 0,
      aiTutorSessions: 0,
    };
  }
}
