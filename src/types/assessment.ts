// src/types/assessment.ts
// Competency framework for Initial Assessment feature
// Covers 8 key topic areas from DepEd SHS Math curriculum

import type { Timestamp } from 'firebase/firestore';

// ─── Competency Categories ───────────────────────────────────────────────

export type AssessmentCategory =
  | 'functions'
  | 'sequences'
  | 'logic'
  | 'statistics'
  | 'counting'
  | 'number-theory'
  | 'business-math'
  | 'finite-math';

export type Difficulty = 1 | 2 | 3; // 1=basic, 2=standard, 3=challenge

export const ASSESSMENT_CATEGORY_LABELS: Record<AssessmentCategory, string> = {
  functions: 'Functions and Graphs',
  sequences: 'Sequences and Series',
  logic: 'Logic and Reasoning',
  statistics: 'Statistics and Probability',
  counting: 'Counting Techniques',
  'number-theory': 'Number Theory',
  'business-math': 'Business Mathematics',
  'finite-math': 'Finite Mathematics',
};

// ─── Core Interfaces ─────────────────────────────────────────────────────

export interface Competency {
  id: string; // e.g., "functions-evaluation", "sequences-arithmetic"
  name: string;
  category: AssessmentCategory;
  melcCode?: string; // DepEd MELC reference
  difficulty: Difficulty;
  description: string;
}

export interface CompetencyScore {
  score: number; // 0-100
  correct: number;
  attempted: number;
  lastAttemptedAt?: Date;
}

export interface AssessmentResult {
  uid: string;
  assessmentId: string;
  completedAt: Date;
  rawScore: number; // 0-100
  totalQuestions: number;
  correctAnswers: number;
  timeSpentSeconds: number;
  competencyScores: Record<string, CompetencyScore>;
  recommendations: string[]; // e.g., ["Focus on sequences", "Strength in functions"]
  proficiencyProfile: ProficiencyProfile;
  assessmentType: 'initial' | 'followup' | 'practice';
}

export interface ProficiencyProfile {
  strengths: string[]; // competency ids where score > 80%
  weaknesses: string[]; // competency ids where score < 50%
  borderline: string[]; // competency ids where score 50-80%
  suggestedStartingModule: string; // e.g., "gen-math-q1", "business-math-q1"
  recommendedPace: 'support_intensive' | 'normal' | 'accelerated';
  g12Readiness?: G12ReadinessIndicators;
}

export interface G12ReadinessIndicators {
  readyForFiniteMath: boolean;
  readyForAdvancedStats: boolean;
  readyForCalcIntro: boolean;
  needsStrongerFunctions: boolean;
  needsStrongerBusinessMath: boolean;
  needsStrongerLogic: boolean;
}

// ─── Question Types ───────────────────────────────────────────────────────

export type QuestionType = 'mcq' | 'fill-blank' | 'matching';

export interface AssessmentQuestion {
  questionId: string;
  competencyId: string;
  category: AssessmentCategory;
  topic: string;
  difficulty: Difficulty;
  bloomLevel: string;
  questionText: string;
  questionType: QuestionType;
  options?: AssessmentOption[]; // For MCQ
  correctAnswer: string | number;
  tolerance?: number; // For numeric answers
  acceptableAnswers?: string[]; // For text answers
  curriculumReference?: string;
}

export interface AssessmentOption {
  index: number;
  text: string;
}

// ─── Response Types ──────────────────────────────────────────────────────

export interface StudentResponse {
  questionId: string;
  answer: string | number | null;
  timeSpentSeconds: number;
  isCorrect: boolean;
}

export interface AssessmentSubmission {
  assessmentId: string;
  studentUid: string;
  responses: StudentResponse[];
  totalTimeSpentSeconds: number;
}

// ─── Firestore Document Types ───────────────────────────────────────────

export interface AssessmentDoc {
  uid: string;
  assessmentId: string;
  assessmentType: 'initial' | 'followup' | 'practice';
  completedAt: Timestamp;
  rawScore: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpentSeconds: number;
  competencyScores: Record<string, {
    score: number;
    correct: number;
    attempted: number;
  }>;
  recommendations: string[];
  proficiencyProfile: {
    strengths: string[];
    weaknesses: string[];
    borderline: string[];
    suggestedStartingModule: string;
    recommendedPace: 'support_intensive' | 'normal' | 'accelerated';
    g12Readiness?: G12ReadinessIndicators;
  };
}

export interface CompetencyProfileDoc {
  uid: string;
  lastAssessmentDate: Timestamp;
  lastAssessmentType: 'initial' | 'followup' | 'practice';
  overallScore: number;
  competencies: Record<string, {
    score: number;
    correct: number;
    attempted: number;
    lastAttemptedAt: Timestamp | null;
  }>;
  primaryWeakness: string | null;
  primaryStrength: string | null;
  suggestedModule: string;
  updatedAt: Timestamp;
}

// ─── Class Assessment Types ─────────────────────────────────────────────

export interface ClassAssessmentSummary {
  classId: string;
  teacherUid: string;
  totalStudents: number;
  completedAssessments: number;
  averageScore: number;
  competencyAverages: Record<string, number>; // competencyId -> average score
  studentsNeedingIntervention: string[]; // student UIDs with weakness < 40%
  overallRiskDistribution: {
    low: number;
    moderate: number;
    high: number;
    critical: number;
  };
}

// ─── API Response Types ─────────────────────────────────────────────────

export interface GenerateAssessmentResponse {
  assessmentId: string;
  questions: AssessmentQuestion[];
  totalItems: number;
  estimatedMinutes: number;
  categoryDistribution: Record<AssessmentCategory, number>;
}

export interface SubmitAssessmentResponse {
  success: boolean;
  assessmentId: string;
  overallScore: number;
  competencyResults: Record<string, {
    score: number;
    correct: number;
    attempted: number;
  }>;
  recommendations: string[];
  proficiencyProfile: ProficiencyProfile;
  xpEarned: number;
  badgeUnlocked?: string;
  redirectTo?: string;
}

// ─── Competency Registry ────────────────────────────────────────────────

export const COMPETENCY_REGISTRY: Competency[] = [
  // Functions (Grade 11 - Q1/Q2)
  { id: 'functions-evaluation', name: 'Function Evaluation', category: 'functions', difficulty: 1, description: 'Evaluate functions at given values', melcCode: 'M11GM-Ia-2' },
  { id: 'functions-domain-range', name: 'Domain and Range', category: 'functions', difficulty: 2, description: 'Find domain and range of functions', melcCode: 'M11GM-Ib-1' },
  { id: 'functions-piecewise', name: 'Piecewise Functions', category: 'functions', difficulty: 2, description: 'Analyze piecewise-defined functions', melcCode: 'M11GM-Ic-1' },
  { id: 'functions-composition', name: 'Function Composition', category: 'functions', difficulty: 3, description: 'Compose and decompose functions', melcCode: 'M11GM-Ie-1' },
  { id: 'functions-inverse', name: 'Inverse Functions', category: 'functions', difficulty: 3, description: 'Find and verify inverse functions', melcCode: 'M11GM-If-1' },

  // Sequences (Grade 11 - Q2)
  { id: 'sequences-arithmetic', name: 'Arithmetic Sequences', category: 'sequences', difficulty: 1, description: 'Identify and analyze arithmetic sequences', melcCode: 'M11GM-IIa-1' },
  { id: 'sequences-geometric', name: 'Geometric Sequences', category: 'sequences', difficulty: 2, description: 'Identify and analyze geometric sequences', melcCode: 'M11GM-IIb-1' },
  { id: 'sequences-series', name: 'Series and Summation', category: 'sequences', difficulty: 3, description: 'Compute sums of arithmetic and geometric series', melcCode: 'M11GM-IIc-1' },

  // Logic (Grade 11 - Q3)
  { id: 'logic-propositions', name: 'Propositions and Truth Values', category: 'logic', difficulty: 1, description: 'Evaluate logical propositions', melcCode: 'M11GM-IIIa-1' },
  { id: 'logic-connectives', name: 'Logical Connectives', category: 'logic', difficulty: 2, description: 'Use AND, OR, NOT connectives', melcCode: 'M11GM-IIIb-1' },
  { id: 'logic-validity', name: 'Logical Validity and Proofs', category: 'logic', difficulty: 3, description: 'Construct and evaluate logical arguments', melcCode: 'M11GM-IIIc-1' },

  // Statistics (Grade 11 - Q3/Q4)
  { id: 'stats-data-analysis', name: 'Data Analysis and Representation', category: 'statistics', difficulty: 1, description: 'Analyze and interpret statistical data', melcCode: 'M11GM-IVa-1' },
  { id: 'stats-central-tendency', name: 'Measures of Central Tendency', category: 'statistics', difficulty: 2, description: 'Calculate mean, median, mode', melcCode: 'M11GM-IVb-1' },
  { id: 'stats-variability', name: 'Measures of Variability', category: 'statistics', difficulty: 2, description: 'Calculate variance and standard deviation', melcCode: 'M11GM-IVb-2' },
  { id: 'stats-normal-distribution', name: 'Normal Distribution', category: 'statistics', difficulty: 3, description: 'Apply normal distribution concepts', melcCode: 'M11GM-IVc-1' },

  // Probability (Grade 11 - Q4)
  { id: 'prob-basic', name: 'Basic Probability', category: 'statistics', difficulty: 1, description: 'Calculate simple probabilities', melcCode: 'M11GM-IVd-1' },
  { id: 'prob-conditional', name: 'Conditional Probability', category: 'statistics', difficulty: 3, description: 'Analyze conditional probability', melcCode: 'M11GM-IVe-1' },

  // Counting (Grade 11 - Q4)
  { id: 'counting-permutations', name: 'Permutations', category: 'counting', difficulty: 2, description: 'Calculate arrangements with order', melcCode: 'M11GM-IVf-1' },
  { id: 'counting-combinations', name: 'Combinations', category: 'counting', difficulty: 2, description: 'Calculate selections without order', melcCode: 'M11GM-IVf-2' },
  { id: 'counting-pigeonhole', name: 'Pigeonhole Principle', category: 'counting', difficulty: 3, description: 'Apply pigeonhole principle', melcCode: 'M11GM-IVg-1' },

  // Number Theory (Grade 12 - Finite Math)
  { id: 'number-gcd-lcm', name: 'GCD and LCM', category: 'number-theory', difficulty: 1, description: 'Find greatest common divisor and least common multiple', melcCode: 'M12GM-Ia-1' },
  { id: 'number-modular', name: 'Modular Arithmetic', category: 'number-theory', difficulty: 2, description: 'Perform modular arithmetic operations', melcCode: 'M12GM-Ib-1' },
  { id: 'number-diophantine', name: 'Diophantine Equations', category: 'number-theory', difficulty: 3, description: 'Solve linear Diophantine equations', melcCode: 'M12GM-Ic-1' },

  // Business Math (Grade 12)
  { id: 'business-simple-interest', name: 'Simple Interest', category: 'business-math', difficulty: 1, description: 'Calculate simple interest', melcCode: 'M12GM-IIa-1' },
  { id: 'business-compound', name: 'Compound Interest', category: 'business-math', difficulty: 2, description: 'Calculate compound interest and growth', melcCode: 'M12GM-IIb-1' },
  { id: 'business-annuities', name: 'Annuities', category: 'business-math', difficulty: 3, description: 'Calculate present and future value of annuities', melcCode: 'M12GM-IIc-1' },
  { id: 'business-depreciation', name: 'Depreciation', category: 'business-math', difficulty: 2, description: 'Calculate depreciation methods', melcCode: 'M12GM-IId-1' },

  // Finite Math (Grade 12)
  { id: 'finite-matrices', name: 'Matrix Operations', category: 'finite-math', difficulty: 2, description: 'Perform matrix addition, multiplication', melcCode: 'M12GM-IIIa-1' },
  { id: 'finite-systems', name: 'Systems of Linear Equations', category: 'finite-math', difficulty: 3, description: 'Solve systems using matrices', melcCode: 'M12GM-IIIb-1' },
  { id: 'finite-graphs', name: 'Graph Theory Basics', category: 'finite-math', difficulty: 2, description: 'Analyze basic graph properties', melcCode: 'M12GM-IVa-1' },
];

// ─── Helper Functions ───────────────────────────────────────────────────

export function getCompetenciesByCategory(category: AssessmentCategory): Competency[] {
  return COMPETENCY_REGISTRY.filter(c => c.category === category);
}

export function getCompetencyById(id: string): Competency | undefined {
  return COMPETENCY_REGISTRY.find(c => c.id === id);
}

export function getCategoriesForGrade(gradeLevel: string): AssessmentCategory[] {
  if (gradeLevel === 'Grade 11') {
    return ['functions', 'sequences', 'logic', 'statistics', 'counting'];
  }
  // Grade 12
  return ['functions', 'sequences', 'number-theory', 'business-math', 'finite-math'];
}

export function calculateProficiencyProfile(
  competencyScores: Record<string, CompetencyScore>
): { strengths: string[]; weaknesses: string[]; borderline: string[] } {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const borderline: string[] = [];

  for (const [competencyId, score] of Object.entries(competencyScores)) {
    if (score.score >= 80) {
      strengths.push(competencyId);
    } else if (score.score < 50) {
      weaknesses.push(competencyId);
    } else {
      borderline.push(competencyId);
    }
  }

  return { strengths, weaknesses, borderline };
}

export function getSuggestedModuleFromWeaknesses(weaknesses: string[]): string {
  if (weaknesses.length === 0) {
    return 'gen-math-q1';
  }

  // Map competencies to suggested modules
  const weaknessToModule: Record<string, string> = {
    'functions-evaluation': 'gen-math-q1',
    'functions-domain-range': 'gen-math-q1',
    'functions-piecewise': 'gen-math-q2',
    'functions-composition': 'gen-math-q2',
    'functions-inverse': 'gen-math-q2',
    'sequences-arithmetic': 'gen-math-q2',
    'sequences-geometric': 'gen-math-q2',
    'sequences-series': 'gen-math-q2',
    'logic-propositions': 'gen-math-q3',
    'logic-connectives': 'gen-math-q3',
    'logic-validity': 'gen-math-q3',
    'stats-data-analysis': 'gen-math-q3',
    'stats-central-tendency': 'gen-math-q4',
    'stats-variability': 'gen-math-q4',
    'stats-normal-distribution': 'gen-math-q4',
    'prob-basic': 'gen-math-q4',
    'prob-conditional': 'gen-math-q4',
    'counting-permutations': 'gen-math-q4',
    'counting-combinations': 'gen-math-q4',
    'counting-pigeonhole': 'gen-math-q4',
    'number-gcd-lcm': 'business-math-q1',
    'number-modular': 'business-math-q1',
    'number-diophantine': 'business-math-q1',
    'business-simple-interest': 'business-math-q1',
    'business-compound': 'business-math-q2',
    'business-annuities': 'business-math-q2',
    'business-depreciation': 'business-math-q2',
    'finite-matrices': 'stats-prob-q1',
    'finite-systems': 'stats-prob-q1',
    'finite-graphs': 'stats-prob-q2',
  };

  // Return the first weakness's suggested module
  for (const w of weaknesses) {
    if (weaknessToModule[w]) {
      return weaknessToModule[w];
    }
  }

  return 'gen-math-q1';
}