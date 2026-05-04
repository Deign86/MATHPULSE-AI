// src/services/studentDataService.ts
// Unified service for cross-role student data access
// Provides teacher and admin with read access to student-generated data

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// ============================================================================
// TYPES - Cross-role data structures
// ============================================================================

export interface StudentQuizResult {
  userId: string;
  lrn: string;
  name: string;
  quizId: string;
  subjectId: string;
  moduleId?: string;
  score: number;
  attemptedAt: Date;
  timeSpent: number;
  questionCount: number;
  correctCount: number;
}

export interface StudentModuleProgress {
  userId: string;
  lrn: string;
  name: string;
  subjectId: string;
  moduleId: string;
  progress: number; // 0-100
  lessonsCompleted: string[];
  quizzesCompleted: string[];
  lastAccessedAt: Date;
  startedAt: Date;
}

export interface StudentEngagementMetrics {
  userId: string;
  lrn: string;
  name: string;
  currentXP: number;
  totalXP: number;
  level: number;
  streak: number;
  lastActivityDate: Date | null;
  dailyCheckInClaimed: boolean;
  weeklyXP: number;
  monthlyXP: number;
}

export interface StudentDiagnosticResult {
  userId: string;
  lrn: string;
  name: string;
  subjectId: string;
  overallScore: number;
  status: 'At Risk' | 'On Track' | 'Needs Review';
  completedAt: Date;
  weakTopics: string[];
  recommendedTopics: string[];
}

export interface StudentAITutorUsage {
  userId: string;
  lrn: string;
  name: string;
  totalSessions: number;
  totalMessages: number;
  lastSessionAt: Date | null;
  averageSessionLength: number;
  subjectsDiscussed: string[];
}

export interface ClassMasterySummary {
  subjectId: string;
  moduleId: string;
  averageProgress: number;
  studentsCompleted: number;
  studentsInProgress: number;
  studentsNotStarted: number;
  totalStudents: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert Firestore timestamp to Date
 */
const toDate = (ts: unknown): Date | null => {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if (typeof ts === 'string') return new Date(ts);
  if (typeof ts === 'number') return new Date(ts);
  if (typeof ts === 'object' && ts !== null) {
    const maybeTs = ts as { toDate?: () => Date; seconds?: number };
    if (typeof maybeTs.toDate === 'function') return maybeTs.toDate();
    if (typeof maybeTs.seconds === 'number') return new Date(maybeTs.seconds * 1000);
  }
  return null;
};

// ============================================================================
// QUIZ RESULTS - For Teachers and Admins
// ============================================================================

/**
 * Get quiz results for students managed by a teacher
 * @param teacherId - The teacher's UID
 * @param classroomIds - Array of classroom IDs the teacher manages
 */
export async function getQuizResultsByTeacher(
  teacherId: string,
  classroomIds: string[]
): Promise<StudentQuizResult[]> {
  try {
    // Get managed students first
    const studentsQuery = query(
      collection(db, 'managedStudents'),
      where('teacherId', '==', teacherId)
    );
    const studentsSnap = await getDocs(studentsQuery);
    
    const studentLRNs = studentsSnap.docs.map(d => d.id);
    if (studentLRNs.length === 0) return [];

    // Get progress documents for these students
    const progressPromises = studentLRNs.slice(0, 30).map(async (lrn) => {
      const progressRef = doc(db, 'progress', lrn);
      const progressSnap = await getDoc(progressRef);
      if (!progressSnap.exists()) return null;
      
      const data = progressSnap.data();
      const quizAttempts = data.quizAttempts || [];
      
      return quizAttempts.map((q: {
        quizId: string;
        score: number;
        completedAt: Date;
        timeSpent: number;
        answers?: { isCorrect?: boolean }[];
      }) => ({
        userId: data.userId || lrn,
        lrn,
        name: data.name || 'Unknown',
        quizId: q.quizId,
        subjectId: data.subjectId || 'unknown',
        score: q.score || 0,
        attemptedAt: toDate(q.completedAt) || new Date(),
        timeSpent: q.timeSpent || 0,
        questionCount: q.answers?.length || 0,
        correctCount: q.answers?.filter((a: { isCorrect?: boolean }) => a.isCorrect)?.length || 0
      }));
    });

    const results = await Promise.all(progressPromises);
    return results.flat().filter(Boolean).sort((a, b) => 
      b.attemptedAt.getTime() - a.attemptedAt.getTime()
    );
  } catch (error) {
    console.error('[studentDataService] getQuizResultsByTeacher error:', error);
    return [];
  }
}

/**
 * Get quiz results for a specific student (by LRN)
 */
export async function getQuizResultsByStudent(lrn: string): Promise<StudentQuizResult[]> {
  try {
    const progressRef = doc(db, 'progress', lrn);
    const progressSnap = await getDoc(progressRef);
    
    if (!progressSnap.exists()) return [];
    
    const data = progressSnap.data();
    const quizAttempts = data.quizAttempts || [];
    
    return quizAttempts.map((q: {
      quizId: string;
      score: number;
      completedAt: Date;
      timeSpent: number;
      answers?: { isCorrect?: boolean }[];
    }) => ({
      userId: data.userId || lrn,
      lrn,
      name: data.name || 'Unknown',
      quizId: q.quizId,
      subjectId: data.subjectId || 'unknown',
      score: q.score || 0,
      attemptedAt: toDate(q.completedAt) || new Date(),
      timeSpent: q.timeSpent || 0,
      questionCount: q.answers?.length || 0,
      correctCount: q.answers?.filter((a: { isCorrect?: boolean }) => a.isCorrect)?.length || 0
    }));
  } catch (error) {
    console.error('[studentDataService] getQuizResultsByStudent error:', error);
    return [];
  }
}

// ============================================================================
// MODULE PROGRESS - For Teachers and Admins
// ============================================================================

/**
 * Get module progress for students managed by a teacher
 */
export async function getModuleProgressByTeacher(
  teacherId: string,
  subjectId?: string
): Promise<StudentModuleProgress[]> {
  try {
    const studentsQuery = query(
      collection(db, 'managedStudents'),
      where('teacherId', '==', teacherId)
    );
    const studentsSnap = await getDocs(studentsQuery);
    
    const studentLRNs = studentsSnap.docs.map(d => d.id);
    if (studentLRNs.length === 0) return [];

    const progressPromises = studentLRNs.slice(0, 30).map(async (lrn) => {
      const progressRef = doc(db, 'progress', lrn);
      const progressSnap = await getDoc(progressRef);
      if (!progressSnap.exists()) return [];
      
      const data = progressSnap.data();
      const subjects = data.subjects || {};
      const results: StudentModuleProgress[] = [];
      
      for (const [subjId, subjData] of Object.entries(subjects)) {
        if (subjectId && subjId !== subjectId) continue;
        
        const modulesProgress = (subjData as { modulesProgress?: Record<string, unknown> }).modulesProgress || {};
        for (const [modId, modData] of Object.entries(modulesProgress)) {
          const md = modData as {
            progress: number;
            lessonsCompleted: string[];
            quizzesCompleted: string[];
            lastAccessedAt: Date;
            startedAt: Date;
          };
          
          results.push({
            userId: data.userId || lrn,
            lrn,
            name: data.name || 'Unknown',
            subjectId: subjId,
            moduleId: modId,
            progress: md.progress || 0,
            lessonsCompleted: md.lessonsCompleted || [],
            quizzesCompleted: md.quizzesCompleted || [],
            lastAccessedAt: toDate(md.lastAccessedAt) || new Date(),
            startedAt: toDate(md.startedAt) || new Date()
          });
        }
      }
      
      return results;
    });

    const results = await Promise.all(progressPromises);
    return results.flat().filter(Boolean);
  } catch (error) {
    console.error('[studentDataService] getModuleProgressByTeacher error:', error);
    return [];
  }
}

/**
 * Get class-wide mastery summary for a teacher's students
 */
export async function getClassMasterySummary(
  teacherId: string,
  subjectId: string
): Promise<ClassMasterySummary[]> {
  try {
    const progressList = await getModuleProgressByTeacher(teacherId, subjectId);
    
    // Group by module
    const moduleMap = new Map<string, StudentModuleProgress[]>();
    for (const p of progressList) {
      const key = `${p.subjectId}_${p.moduleId}`;
      if (!moduleMap.has(key)) moduleMap.set(key, []);
      moduleMap.get(key)!.push(p);
    }

    const summaries: ClassMasterySummary[] = [];
    for (const [key, students] of moduleMap) {
      const [subjId, modId] = key.split('_');
      const completed = students.filter(s => s.progress >= 100).length;
      const inProgress = students.filter(s => s.progress > 0 && s.progress < 100).length;
      const notStarted = students.filter(s => s.progress === 0).length;
      
      summaries.push({
        subjectId: subjId,
        moduleId: modId,
        averageProgress: Math.round(students.reduce((a, s) => a + s.progress, 0) / students.length),
        studentsCompleted: completed,
        studentsInProgress: inProgress,
        studentsNotStarted: notStarted,
        totalStudents: students.length
      });
    }

    return summaries;
  } catch (error) {
    console.error('[studentDataService] getClassMasterySummary error:', error);
    return [];
  }
}

// ============================================================================
// XP/ENGAGEMENT METRICS - For Teachers
// ============================================================================

/**
 * Get engagement metrics for students managed by a teacher
 */
export async function getEngagementMetricsByTeacher(
  teacherId: string
): Promise<StudentEngagementMetrics[]> {
  try {
    const studentsQuery = query(
      collection(db, 'managedStudents'),
      where('teacherId', '==', teacherId)
    );
    const studentsSnap = await getDocs(studentsQuery);
    
    const studentLRNs = studentsSnap.docs.map(d => d.id);
    if (studentLRNs.length === 0) return [];

    // Get user profiles for XP/streak data
    const metricsPromises = studentLRNs.slice(0, 30).map(async (lrn) => {
      const userRef = doc(db, 'users', lrn);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        return {
          userId: lrn,
          lrn,
          name: 'Unknown',
          currentXP: 0,
          totalXP: 0,
          level: 1,
          streak: 0,
          lastActivityDate: null,
          dailyCheckInClaimed: false,
          weeklyXP: 0,
          monthlyXP: 0
        };
      }
      
      const data = userSnap.data();
      return {
        userId: lrn,
        lrn,
        name: data.name || 'Unknown',
        currentXP: data.currentXP || 0,
        totalXP: data.totalXP || 0,
        level: data.level || 1,
        streak: data.streak || 0,
        lastActivityDate: toDate(data.lastActivityDate),
        dailyCheckInClaimed: !!data.lastActivityDate,
        weeklyXP: data.weeklyXP || 0,
        monthlyXP: data.monthlyXP || 0
      };
    });

    return (await Promise.all(metricsPromises)).filter(Boolean);
  } catch (error) {
    console.error('[studentDataService] getEngagementMetricsByTeacher error:', error);
    return [];
  }
}

// ============================================================================
// DIAGNOSTIC RESULTS - For Teachers
// ============================================================================

/**
 * Get diagnostic results for students managed by a teacher
 */
export async function getDiagnosticResultsByTeacher(
  teacherId: string
): Promise<StudentDiagnosticResult[]> {
  try {
    const studentsQuery = query(
      collection(db, 'managedStudents'),
      where('teacherId', '==', teacherId)
    );
    const studentsSnap = await getDocs(studentsQuery);
    
    const studentLRNs = studentsSnap.docs.map(d => d.id);
    if (studentLRNs.length === 0) return [];

    const resultsPromises = studentLRNs.slice(0, 30).map(async (lrn) => {
      // Check user profile for diagnostic status
      const userRef = doc(db, 'users', lrn);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) return null;
      
      const data = userSnap.data();
      const hasTakenDiagnostic = data.hasTakenDiagnostic;
      const iarState = data.iarAssessmentState;
      
      if (!hasTakenDiagnostic && iarState !== 'completed') return null;
      
      const riskClassifications = data.riskClassifications || {};
      
      // Get the most at-risk subject
      let worstSubject = 'unknown';
      let worstScore = 100;
      let weakTopics: string[] = [];
      
      for (const [subject, rc] of Object.entries(riskClassifications)) {
        const classification = rc as { score: number; status: string };
        if (classification.score < worstScore) {
          worstScore = classification.score;
          worstSubject = subject;
          weakTopics = [subject];
        }
      }

      return {
        userId: lrn,
        lrn,
        name: data.name || 'Unknown',
        subjectId: worstSubject,
        overallScore: 100 - worstScore,
        status: worstScore >= 80 ? 'On Track' : worstScore >= 60 ? 'Needs Review' : 'At Risk',
        completedAt: toDate(data.iarCompletedAt) || new Date(),
        weakTopics,
        recommendedTopics: data.recommendedTopics || []
      };
    });

    const results = await Promise.all(resultsPromises);
    return results.flat().filter((r): r is StudentDiagnosticResult => r !== null);
  } catch (error) {
    console.error('[studentDataService] getDiagnosticResultsByTeacher error:', error);
    return [];
  }
}

// ============================================================================
// AI TUTOR USAGE - For Teachers
// ============================================================================

/**
 * Get AI tutor usage stats for students managed by a teacher
 */
export async function getAITutorUsageByTeacher(
  teacherId: string
): Promise<StudentAITutorUsage[]> {
  try {
    const studentsQuery = query(
      collection(db, 'managedStudents'),
      where('teacherId', '==', teacherId)
    );
    const studentsSnap = await getDocs(studentsQuery);
    
    const studentLRNs = studentsSnap.docs.map(d => d.id);
    if (studentLRNs.length === 0) return [];

    const usagePromises = studentLRNs.slice(0, 30).map(async (lrn) => {
      // Get chat sessions for this student
      const sessionsQuery = query(
        collection(db, 'chatSessions'),
        where('userId', '==', lrn),
        orderBy('updatedAt', 'desc')
      );
      const sessionsSnap = await getDocs(sessionsQuery);
      
      let totalMessages = 0;
      const subjects = new Set<string>();
      let lastSession: Date | null = null;
      
      for (const sessionDoc of sessionsSnap.docs) {
        const sessionData = sessionDoc.data();
        const messages = sessionData.messages || [];
        totalMessages += messages.length;
        
        // Extract subjects from context
        for (const msg of messages) {
          if (msg.context?.subjectId) {
            subjects.add(msg.context.subjectId);
          }
        }
        
        const updatedAt = toDate(sessionData.updatedAt);
        if (updatedAt && (!lastSession || updatedAt.getTime() > lastSession.getTime())) {
          lastSession = updatedAt;
        }
      }

      // Get user name
      const userRef = doc(db, 'users', lrn);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};

      return {
        userId: lrn,
        lrn,
        name: userData.name || 'Unknown',
        totalSessions: sessionsSnap.size,
        totalMessages,
        lastSessionAt: lastSession,
        averageSessionLength: sessionsSnap.size > 0 ? Math.round(totalMessages / sessionsSnap.size) : 0,
        subjectsDiscussed: Array.from(subjects)
      };
    });

    return (await Promise.all(usagePromises)).filter(Boolean);
  } catch (error) {
    console.error('[studentDataService] getAITutorUsageByTeacher error:', error);
    return [];
  }
}

// ============================================================================
// ADMIN AGGREGATED STATS
// ============================================================================

export interface PlatformStats {
  totalStudents: number;
  totalTeachers: number;
  totalAdmins: number;
  activeStudents: number;
  totalQuizzesTaken: number;
  totalLessonsCompleted: number;
  averageMasteryScore: number;
  totalChatSessions: number;
  totalChatMessages: number;
}

/**
 * Get platform-wide aggregated stats for admin
 */
export async function getPlatformStats(): Promise<PlatformStats> {
  try {
    // Get all users
    const usersSnap = await getDocs(collection(db, 'users'));
    let students = 0, teachers = 0, admins = 0, activeStudents = 0;
    
    for (const userDoc of usersSnap.docs) {
      const data = userDoc.data();
      if (data.role === 'student') {
        students++;
        if (data.lastActivityDate) activeStudents++;
      } else if (data.role === 'teacher') {
        teachers++;
      } else if (data.role === 'admin') {
        admins++;
      }
    }

    // Get progress stats
    const progressSnap = await getDocs(collection(db, 'progress'));
    let totalQuizzes = 0, totalLessons = 0, totalScore = 0;
    
    for (const progDoc of progressSnap.docs) {
      const data = progDoc.data();
      totalQuizzes += (data.quizAttempts?.length || 0);
      totalLessons += (data.totalLessonsCompleted || 0);
      totalScore += (data.averageScore || 0);
    }

    const avgMastery = progressSnap.size > 0 ? Math.round(totalScore / progressSnap.size) : 0;

    // Get chat stats
    const chatSnap = await getDocs(collection(db, 'chatSessions'));
    let totalMessages = 0;
    for (const chatDoc of chatSnap.docs) {
      const data = chatDoc.data();
      totalMessages += (data.messages?.length || 0);
    }

    return {
      totalStudents: students,
      totalTeachers: teachers,
      totalAdmins: admins,
      activeStudents,
      totalQuizzesTaken: totalQuizzes,
      totalLessonsCompleted: totalLessons,
      averageMasteryScore: avgMastery,
      totalChatSessions: chatSnap.size,
      totalChatMessages: totalMessages
    };
  } catch (error) {
    console.error('[studentDataService] getPlatformStats error:', error);
    return {
      totalStudents: 0,
      totalTeachers: 0,
      totalAdmins: 0,
      activeStudents: 0,
      totalQuizzesTaken: 0,
      totalLessonsCompleted: 0,
      averageMasteryScore: 0,
      totalChatSessions: 0,
      totalChatMessages: 0
    };
  }
}

/**
 * Get content stats for admin (modules, quizzes)
 */
export interface ContentStats {
  totalModules: number;
  publishedModules: number;
  draftModules: number;
  totalQuizzes: number;
  publishedQuizzes: number;
  draftQuizzes: number;
}

/**
 * Get content statistics for admin dashboard
 */
export async function getContentStats(): Promise<ContentStats> {
  try {
    // Get modules
    const modulesSnap = await getDocs(collection(db, 'modules'));
    let published = 0, draft = 0;
    for (const modDoc of modulesSnap.docs) {
      const data = modDoc.data();
      if (data.status === 'Published') published++;
      else draft++;
    }

    // Get quizzes
    const quizzesSnap = await getDocs(collection(db, 'generatedQuizzes'));
    let quizPublished = 0, quizDraft = 0;
    for (const quizDoc of quizzesSnap.docs) {
      const data = quizDoc.data();
      if (data.status === 'published') quizPublished++;
      else quizDraft++;
    }

    return {
      totalModules: modulesSnap.size,
      publishedModules: published,
      draftModules: draft,
      totalQuizzes: quizzesSnap.size,
      publishedQuizzes: quizPublished,
      draftQuizzes: quizDraft
    };
  } catch (error) {
    console.error('[studentDataService] getContentStats error:', error);
    return {
      totalModules: 0,
      publishedModules: 0,
      draftModules: 0,
      totalQuizzes: 0,
      publishedQuizzes: 0,
      draftQuizzes: 0
    };
  }
}