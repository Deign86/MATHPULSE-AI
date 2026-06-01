/**
 * Extended settings types for role-specific settings.
 * Base UserSettings lives in models.ts — these extend it for teacher/admin.
 */

export interface TeacherPreferences {
  quizDefaults: {
    timeLimitMinutes: number;
    passingScore: number;
    maxAttempts: number;
  };
  classPreferences: {
    autoEnroll: boolean;
    classVisibility: 'public' | 'private' | 'invite_only';
  };
  studentAnalyticsVisibility: boolean;
  notifyOnSubmission: boolean;
  notifyOnStudentActivity: boolean;
}

export interface AdminSystemConfig {
  maintenanceMode: boolean;
  defaultGradeLevel: string;
  defaultCurriculum: string;
  maxClassSize: number;
  auditLogVisible: boolean;
  aiConfig: {
    modelName: string;
    temperature: number;
    endpoint: string;
  };
}

export const DEFAULT_TEACHER_PREFERENCES: TeacherPreferences = {
  quizDefaults: {
    timeLimitMinutes: 30,
    passingScore: 75,
    maxAttempts: 3,
  },
  classPreferences: {
    autoEnroll: false,
    classVisibility: 'public',
  },
  studentAnalyticsVisibility: true,
  notifyOnSubmission: true,
  notifyOnStudentActivity: false,
};

export const DEFAULT_ADMIN_SYSTEM_CONFIG: AdminSystemConfig = {
  maintenanceMode: false,
  defaultGradeLevel: 'Grade 11',
  defaultCurriculum: 'STEM',
  maxClassSize: 50,
  auditLogVisible: true,
  aiConfig: {
    modelName: 'deepseek-chat',
    temperature: 0.7,
    endpoint: 'https://api.deepseek.com',
  },
};

// ─── Re-exports from models.ts (centralised settings type) ─────────────────

export type { UserSettings } from './models';
export { DEFAULT_USER_SETTINGS } from './models';

// ─── Mobile-specific settings extensions ───────────────────────────────────

/** Platform-specific preferences only present on mobile clients. */
export interface MobileSettings {
  /** System haptic feedback (iOS/Android taptic engine). */
  hapticsEnabled: boolean;
  /** UI language override (e.g. 'en', 'fil'). */
  language: string;
  /** Named theme preset ('light' | 'dark' | 'system'). */
  theme: 'light' | 'dark' | 'system';
}

export const DEFAULT_MOBILE_SETTINGS: MobileSettings = {
  hapticsEnabled: true,
  language: 'en',
  theme: 'system',
};
