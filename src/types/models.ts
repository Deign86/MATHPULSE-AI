// User Types
export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  photo?: string;
  avatarLayers?: {
    top?: string;
    bottom?: string;
    shoes?: string;
    accessory?: string;
  };
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentProfile extends User {
  role: 'student';
  lrn?: string;
  grade: string;
  section?: string;
  school: string;
  enrollmentDate: string;
  major: string;
  gpa: string;
  level: number;
  currentXP: number;
  totalXP: number;
  streak: number;
  streakHistory?: string[]; // Array of YYYY-MM-DD strings
  ownedAvatarItems?: string[]; // Array of item IDs user has purchased
  atRiskSubjects: string[];
  hasTakenDiagnostic: boolean;
  iarAssessmentState?:
    | 'not_started'
    | 'in_progress'
    | 'completed'
    | 'skipped_unassessed'
    | 'deep_diagnostic_required'
    | 'deep_diagnostic_in_progress'
    | 'placed';
  iarQuestionSetVersion?: string;
  iarTopicClassifications?: Record<
    'Functions' | 'BusinessMath' | 'Logic',
    'Mastered' | 'NeedsReview' | 'HighRisk'
  >;
  topicScores?: Record<'Functions' | 'BusinessMath' | 'Logic', number>;
  riskFlags?: string[];
  startingQuarterG11?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  priorityTopics?: Array<'Functions' | 'BusinessMath' | 'Logic'>;
  recommendedPace?: 'support_intensive' | 'normal' | 'accelerated';
  g12ReadinessIndicators?: {
    readyForFiniteMath: boolean;
    readyForAdvancedStats: boolean;
    readyForCalcIntro: boolean;
    needsStrongerFunctions: boolean;
    needsStrongerBusinessMath: boolean;
  };
  // Automation fields
  subjectBadges?: Record<string, 'At Risk' | 'On Track'>;
  riskClassifications?: Record<string, {
    status: 'At Risk' | 'On Track';
    score: number;
    confidence: number;
    needsIntervention: boolean;
  }>;
  overallRisk?: 'High' | 'Medium' | 'Low';
  iarMode?: 'iar_only' | 'iar_plus_diagnostic';
  learningPathState?: 'locked_pending_deep_diagnostic' | 'unlocked';
  lastAssessmentType?: 'initial_assessment' | 'followup_diagnostic';
  initialAssessmentCompletedAt?: Date;
  remediationState?: 'not_required' | 'queued' | 'in_progress' | 'completed' | 'expired';
  remediationStatusCounts?: {
    total: number;
    queued: number;
    inProgress: number;
    completed: number;
    expired: number;
    outstanding: number;
  };
  currentCurriculumVersionSetId?: string;
  grade12TransitionGate?: {
    isBlocked: boolean;
    reason: string;
    masteredRatio: number;
    criticalGapCount: number;
    evaluatedTopicCount: number;
    sourceSnapshotId?: string | null;
  };
  unlockCriteriaVersion?: string;
  recommendedNextTopicGroupId?: string;
  recommendationRationale?: string;
  recommendationReasonCode?: string;
}

export interface TeacherProfile extends User {
  role: 'teacher';
  teacherId: string;
  department: string;
  subject: string;
  yearsOfExperience: string;
  qualification: string;
  students: string[]; // Array of student IDs
}

export interface AdminProfile extends User {
  role: 'admin';
  adminId: string;
  position: string;
  department: string;
}

export type ProfileVisibility = 'everyone' | 'students_and_staff' | 'private';
export type StudyTimePreference = 'morning' | 'afternoon' | 'evening' | 'night';
export type QuizDifficultyPreference = 'adaptive' | 'easy' | 'medium' | 'hard';

export interface UserSettings {
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    soundEnabled: boolean;
    notificationTypes: {
      quizReminders: boolean;
      newContent: boolean;
      achievements: boolean;
      streakAlerts: boolean;
      weeklySummary: boolean;
    };
    quietHours: {
      start: string;
      end: string;
    };
  };
  appearance: {
    darkMode: boolean;
    fontSize: number;
    compactView: boolean;
    reduceAnimations: boolean;
  };
  privacy: {
    profileVisibility: ProfileVisibility;
    showActivityStatus: boolean;
    dataSharing: boolean;
  };
  learning: {
    dailyXpGoal: number;
    preferredStudyTime: StudyTimePreference;
    autoPlayLessons: boolean;
    showHints: boolean;
    quizDifficultyPreference: QuizDifficultyPreference;
    studyReminderTime: string;
  };
  adminPanel: {
    siteName: string;
    siteDescription: string;
    defaultLanguage: string;
    maintenanceMode: boolean;
    enforceStrongPasswords: boolean;
    sessionTimeoutMinutes: number;
    aiTutorEnabled: boolean;
    aiAutoRecommendations: boolean;
    aiRiskAlertsEnabled: boolean;
    gradingScale: 'percentage' | 'gpa';
    passingGrade: number;
    parentSummaryEmails: boolean;
    teacherDigestEmails: boolean;
    weeklyPlatformReport: boolean;
    autoBackupEnabled: boolean;
    backupFrequency: 'daily' | 'weekly' | 'monthly';
  };
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  notifications: {
    emailNotifications: true,
    pushNotifications: true,
    soundEnabled: true,
    notificationTypes: {
      quizReminders: true,
      newContent: true,
      achievements: true,
      streakAlerts: true,
      weeklySummary: true,
    },
    quietHours: {
      start: '22:00',
      end: '08:00',
    },
  },
  appearance: {
    darkMode: false,
    fontSize: 16,
    compactView: false,
    reduceAnimations: false,
  },
  privacy: {
    profileVisibility: 'everyone',
    showActivityStatus: true,
    dataSharing: true,
  },
  learning: {
    dailyXpGoal: 100,
    preferredStudyTime: 'evening',
    autoPlayLessons: false,
    showHints: true,
    quizDifficultyPreference: 'adaptive',
    studyReminderTime: '18:00',
  },
  adminPanel: {
    siteName: 'MathPulse AI',
    siteDescription: 'AI-Powered Mathematics Learning Platform',
    defaultLanguage: 'English',
    maintenanceMode: false,
    enforceStrongPasswords: true,
    sessionTimeoutMinutes: 60,
    aiTutorEnabled: true,
    aiAutoRecommendations: true,
    aiRiskAlertsEnabled: true,
    gradingScale: 'percentage',
    passingGrade: 75,
    parentSummaryEmails: true,
    teacherDigestEmails: true,
    weeklyPlatformReport: true,
    autoBackupEnabled: false,
    backupFrequency: 'weekly',
  },
};

// Progress Types
export interface LessonProgress {
  lessonId: string;
  completed: boolean;
  completedAt?: Date;
  timeSpent: number; // in seconds
  score?: number;
}

export interface QuizAttempt {
  quizId: string;
  attemptNumber: number;
  score: number;
  completedAt: Date;
  timeSpent: number;
  answers: QuizAnswer[];
}

export interface QuizAnswer {
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
}

export interface ModuleProgress {
  moduleId: string;
  subjectId: string;
  progress: number; // 0-100
  lessonsCompleted: string[];
  quizzesCompleted: string[];
  startedAt: Date;
  lastAccessedAt: Date;
}

export interface SubjectProgress {
  subjectId: string;
  progress: number; // 0-100
  completedModules: number;
  totalModules: number;
  modulesProgress: { [moduleId: string]: ModuleProgress };
}

export interface UserProgress {
  userId: string;
  subjects: { [subjectId: string]: SubjectProgress };
  lessons: { [lessonId: string]: LessonProgress };
  quizAttempts: QuizAttempt[];
  totalLessonsCompleted: number;
  totalQuizzesCompleted: number;
  averageScore: number;
  updatedAt: Date;
}

// Gamification Types
export interface XPActivity {
  activityId: string;
  userId: string;
  type: 'lesson_complete' | 'quiz_complete' | 'streak_bonus' | 'achievement_unlocked';
  xpEarned: number;
  description: string;
  timestamp: Date;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  condition: string; // e.g., "complete_10_lessons"
  unlockedAt?: Date;
}

export interface UserAchievements {
  userId: string;
  achievements: Achievement[];
  totalAchievements: number;
  updatedAt: Date;
}

// Leaderboard Types
export interface LeaderboardEntry {
  userId: string;
  name: string;
  photo?: string;
  xp: number;
  level: number;
  rank: number;
  weeklyXP: number;
  monthlyXP: number;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: 'achievement' | 'message' | 'grade' | 'reminder' | 'risk_alert' | 'automation';
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  createdAt: Date;
}

// Leadership Goal Types
export interface LeadershipGoal {
  id: string;
  userId: string;
  title: string;
  description: string;
  dueDate: Date;
  priority: 'low' | 'medium' | 'high';
  status: 'planned' | 'active' | 'completed';
  category: 'rank' | 'streak' | 'xp' | 'mastery' | 'engagement';
  createdAt: Date;
  completedAt?: Date;
}

// Message Types (for AI Chat)
export interface ChatMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  context?: {
    subjectId?: string;
    moduleId?: string;
    lessonId?: string;
  };
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

// Admin Types
export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  targetType: string;
  targetId: string;
  timestamp: Date;
  ipAddress?: string;
}

export interface SystemStats {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalAdmins: number;
  activeUsers: number;
  totalLessonsCompleted: number;
  totalQuizzesCompleted: number;
  averageEngagementTime: number; // in minutes
  updatedAt: Date;
}

// Automation Types
export interface AssignedQuiz {
  id: string;
  lrn: string;
  subject: string;
  curriculumVersionSetId?: string;
  recommendationTopicGroupId?: string;
  quizConfig?: Record<string, unknown>;
  status: 'pending' | 'completed' | 'expired';
  autoGenerated: boolean;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  assignedAt: Date;
  dueDate: Date;
  completedAt?: Date;
}

export interface LearningPathRecord {
  id?: string;
  lrn: string;
  content: string;
  curriculumVersionSetId?: string;
  recommendationTopicGroupId?: string;
  generatedAt: Date;
  source: 'diagnostic_automation' | 'manual' | 'ai_recommendation';
}

export interface InterventionRecord {
  id?: string;
  lrn: string;
  content: string;
  source: 'diagnostic_automation' | 'teacher_initiated' | 'ai_recommendation';
  createdAt: Date;
}

export type AutomationEventType =
  | 'diagnostic_completed'
  | 'quiz_submitted'
  | 'student_enrolled'
  | 'data_imported'
  | 'content_updated';

// ─── Quiz Pipeline Types ──────────────────────────────────────

export type QuizQuestionType = 'identification' | 'enumeration' | 'multiple_choice' | 'word_problem' | 'equation_based';
export type QuizBloomLevel = 'remember' | 'understand' | 'apply' | 'analyze';
export type QuizDifficulty = 'easy' | 'medium' | 'hard';
export type GeneratedQuizStatus = 'draft' | 'published' | 'assigned' | 'completed';
export type GeneratedQuizSource = 'teacher_generated' | 'auto_remedial' | 'adaptive';

/** Shared question format — contract between QuizMaker output and QuizExperience input */
export interface AIQuizQuestion {
  id: string;
  questionType: QuizQuestionType;
  question: string;
  options?: string[];
  correctAnswer: string;
  bloomLevel: QuizBloomLevel;
  difficulty: QuizDifficulty;
  topic: string;
  subject: string;
  points: number;
  explanation: string;
}

/** A quiz generated by QuizMaker and persisted in Firestore */
export interface GeneratedQuiz {
  id: string;
  title: string;
  gradeLevel: string;
  questions: AIQuizQuestion[];
  totalPoints: number;
  teacherId?: string;
  metadata: {
    topicsCovered: string[];
    difficultyBreakdown: { easy: number; medium: number; hard: number };
    bloomDistribution: Record<string, number>;
    questionTypeBreakdown: Record<string, number>;
    supplementalPurpose: string;
    recommendedTeacherActions: string[];
    generatedAt: string;
    generatedBy: GeneratedQuizSource;
    sourceTaskId?: string;
    assignedTo?: string;
  };
  status: GeneratedQuizStatus;
  source: GeneratedQuizSource;
}

/** Answer record saved per-question when a student completes a quiz */
export interface QuizAnswerRecord {
  questionId: string;
  answer: string;
  correct: boolean;
  timeSpent: number;
}

// Review Types
export interface SubjectReview {
  id: string;
  subjectId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  rating: number; // 1-5
  comment?: string;
  createdAt: Date;
}

export interface SubjectStats {
  subjectId: string;
  averageRating: number;
  totalReviews: number;
  updatedAt: Date;
}

// Curriculum and Recommendation Contracts
export type QuarterKey = 'Q1' | 'Q2' | 'Q3' | 'Q4';
export type CurriculumProgram = 'legacy_k12' | 'strengthened_shs_pilot_2025' | 'strengthened_shs_full_2026';
export type CurriculumConfidence = 'high' | 'medium' | 'low';
export type CurriculumSourceTier =
  | 'official_primary'
  | 'official_secondary'
  | 'supplemental_mirror'
  | 'inferred';

export interface CurriculumSourceReference {
  id: string;
  title: string;
  url: string;
  tier: CurriculumSourceTier;
  confidence: CurriculumConfidence;
  notes?: string;
}

export interface CurriculumVersionSet {
  id: string;
  label: string;
  program: CurriculumProgram;
  effectiveSchoolYear: string;
  gradeLevel: 'Grade 11' | 'Grade 12';
  isActive: boolean;
  sourceReferenceIds: string[];
  assumptions?: string[];
}

export interface CompetencyMapping {
  code: string;
  description: string;
  confidence: CurriculumConfidence;
  sourceReferenceIds: string[];
}

export interface CurriculumTopicGroupDescriptor {
  id: string;
  gradeLevel: 'Grade 11' | 'Grade 12';
  subjectId: string;
  subjectName: string;
  quarter: QuarterKey;
  sequence: number;
  topicGroup: string;
  minHours: number;
  maxHours: number;
  competencies: CompetencyMapping[];
  prerequisiteTopicGroupIds?: string[];
}

export interface CurriculumDescriptor {
  id: string;
  versionSetId: string;
  gradeLevel: 'Grade 11' | 'Grade 12';
  isCore: boolean;
  subjectName: string;
  totalHours: number;
  quarterHourAllocation: Record<QuarterKey, number>;
  topicGroups: CurriculumTopicGroupDescriptor[];
}

export interface TopicDiagnosticPolicy {
  topicGroupId: string;
  minItemCount: number;
  difficultyMix: {
    basic: number;
    proficient: number;
    advanced: number;
  };
  masteredThreshold: number;
  needsReviewThreshold: number;
}

export interface DiagnosticPolicy {
  id: string;
  versionSetId: string;
  gradeLevel: 'Grade 11' | 'Grade 12';
  thresholds: {
    mastered: number;
    needsReview: number;
    criticalGap: number;
  };
  byTopicGroup: TopicDiagnosticPolicy[];
}

export interface LearnerMasterySnapshot {
  id?: string;
  userId: string;
  gradeLevel: 'Grade 11' | 'Grade 12';
  versionSetId: string;
  generatedAt: Date;
  byTopicGroup: Record<string, {
    score: number;
    status: 'mastered' | 'needs_review' | 'critical_gap';
    evidenceCount: number;
  }>;
}

export interface RecommendationLog {
  id?: string;
  userId: string;
  lrn?: string;
  versionSetId: string;
  curriculumVersionSetId?: string;
  generatedAt: Date;
  source: 'iar' | 'diagnostic' | 'ongoing_performance';
  recommendedTopicGroupId: string;
  rationale: string;
  reasonCode?: string;
  status: 'active' | 'completed' | 'superseded';
  supersededBy?: string;
}
