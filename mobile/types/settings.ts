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
