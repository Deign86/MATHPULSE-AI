// User Types
export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  photo?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentProfile extends User {
  role: 'student';
  studentId: string;
  grade: string;
  school: string;
  enrollmentDate: string;
  major: string;
  gpa: string;
  level: number;
  currentXP: number;
  totalXP: number;
  streak: number;
  friends: string[]; // Array of user IDs
  atRiskSubjects: string[];
  hasTakenDiagnostic: boolean;
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

// Friends Types
export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserPhoto?: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  respondedAt?: Date;
}

export interface Friendship {
  id: string;
  user1Id: string;
  user2Id: string;
  createdAt: Date;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: 'friend_request' | 'achievement' | 'message' | 'grade' | 'reminder';
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  createdAt: Date;
}

// Task Types
export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  dueDate: Date;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in-progress' | 'completed';
  category: string;
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
