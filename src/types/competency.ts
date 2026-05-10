/**
 * Competency Matrix Type Definitions
 *
 * Data structure for the Competency Radar Chart on the student dashboard.
 * Each module renders as a separate radar polygon with 5 axis scores.
 */

import type { QuizQuestionType } from './models';

/**
 * The 5 competency axes for the radar chart
 */
export type CompetencyAxisKey =
  | 'overallMastery'
  | 'conceptGrasp'
  | 'application'
  | 'engagement'
  | 'consistency';

/**
 * Display labels for each competency axis
 */
export const COMPETENCY_AXIS_LABELS: Record<CompetencyAxisKey, string> = {
  overallMastery: 'Overall Mastery',
  conceptGrasp: 'Concept Grasp',
  application: 'Application',
  engagement: 'Engagement',
  consistency: 'Consistency',
};

/**
 * Radar chart metrics keys (used as Recharts dataKey)
 */
export const RADAR_METRIC_KEYS: Record<CompetencyAxisKey, string> = {
  overallMastery: 'progress',
  conceptGrasp: 'concept',
  application: 'application',
  engagement: 'engagement',
  consistency: 'consistency',
};

/**
 * Single axis score value (0-100)
 */
export interface CompetencyAxisScore {
  axis: CompetencyAxisKey;
  value: number;
}

/**
 * Scores for all 5 axes for a single module
 */
export interface ModuleCompetencyScores {
  moduleId: string;
  moduleName: string;
  moduleColor: string;
  scores: CompetencyAxisScore[];
}

/**
 * Competency data for a single module, returned from the hook
 */
export interface ModuleCompetency {
  id: string;
  name: string;
  color: string;
  scores: {
    axis: string;
    value: number;
  }[];
}

/**
 * Top-level returned object from useCompetencyMatrix
 */
export interface CompetencyMatrixData {
  modules: ModuleCompetency[];
  topModule: string;
  loading: boolean;
  error: string | null;
}

/**
 * Raw quiz result document from Firestore
 * Collection: users/{userId}/quizResults/{quizId}
 */
export interface FirestoreQuizResult {
  quizId: string;
  moduleId: string;
  subjectId: string;
  score: number; // 0-100
  totalQuestions: number;
  correctAnswers: number;
  questionType: QuizQuestionType;
  timestamp: Date;
  timeSpent: number;
}

/**
 * Module progress document from Firestore
 * Collection: users/{userId}/moduleProgress/{moduleId}
 */
export interface FirestoreModuleProgress {
  moduleId: string;
  subjectId: string;
  sessionsCompleted: number;
  lastActive: Date;
  moduleTitle: string;
  lessonsCompleted: string[];
  quizzesCompleted: string[];
}

/**
 * Cached competency matrix document
 * Collection: users/{userId}/competencyMatrix/{moduleId}
 */
export interface CachedCompetencyMatrix {
  moduleId: string;
  moduleName: string;
  overallMastery: number;
  conceptGrasp: number;
  application: number;
  engagement: number;
  consistency: number;
  computedAt: Date;
}

/**
 * Input for computing competency scores from raw quiz data
 */
export interface CompetencyComputeInput {
  quizResults: FirestoreQuizResult[];
  moduleProgress: Record<string, FirestoreModuleProgress>;
  totalLessons: number;
  totalQuizzes: number;
}

/**
 * Recharts-compatible radar row format
 */
export type RadarRow = {
  metric: string;
  fullMark: number;
  [moduleId: string]: string | number;
};

/**
 * Module info for legend and color mapping
 */
export interface ModuleInfo {
  id: string;
  name: string;
  color: string;
}