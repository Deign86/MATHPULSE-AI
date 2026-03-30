import React from 'react';
import { Calculator, TrendingUp, BarChart3, Sigma } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// SHS CANONICAL DATA — Single source of truth for Grade 11-12 SHS Math
// Strengthened SHS curriculum rollout
// ─────────────────────────────────────────────────────────────────────────────

export const SHS_MATH_SUBJECTS = [
  {
    id: 'gen-math',
    code: 'GEN MATH',
    name: 'General Mathematics',
    gradeLevel: 'Grade 11',
    semester: '1st Semester',
    color: 'from-blue-500 to-cyan-500',
    topics: [
      // Patterns, Relations, and Functions
      { id: 'gen-math-001', name: 'Patterns and Real-Life Relationships', unit: 'Patterns, Relations, and Functions' },
      { id: 'gen-math-002', name: 'Functions as Mathematical Models', unit: 'Patterns, Relations, and Functions' },
      { id: 'gen-math-003', name: 'Function Notation and Evaluation', unit: 'Patterns, Relations, and Functions' },
      { id: 'gen-math-004', name: 'Domain and Range of Functions', unit: 'Patterns, Relations, and Functions' },
      { id: 'gen-math-005', name: 'Operations on Functions', unit: 'Patterns, Relations, and Functions' },
      { id: 'gen-math-006', name: 'Composite Functions', unit: 'Patterns, Relations, and Functions' },
      { id: 'gen-math-007', name: 'Inverse Functions', unit: 'Patterns, Relations, and Functions' },
      { id: 'gen-math-008', name: 'Graphs of Rational Functions', unit: 'Patterns, Relations, and Functions' },
      { id: 'gen-math-009', name: 'Graphs of Exponential Functions', unit: 'Patterns, Relations, and Functions' },
      { id: 'gen-math-010', name: 'Graphs of Logarithmic Functions', unit: 'Patterns, Relations, and Functions' },
      // Financial Mathematics
      { id: 'gen-math-011', name: 'Simple and Compound Interest', unit: 'Financial Mathematics' },
      { id: 'gen-math-012', name: 'Simple and General Annuities', unit: 'Financial Mathematics' },
      { id: 'gen-math-013', name: 'Present and Future Value', unit: 'Financial Mathematics' },
      { id: 'gen-math-014', name: 'Loans, Amortization, and Sinking Funds', unit: 'Financial Mathematics' },
      { id: 'gen-math-015', name: 'Stocks, Bonds, and Market Indices', unit: 'Financial Mathematics' },
      { id: 'gen-math-016', name: 'Business Decision-Making with Mathematical Models', unit: 'Financial Mathematics' },
      // Logic and Mathematical Reasoning
      { id: 'gen-math-017', name: 'Propositions and Logical Connectives', unit: 'Logic and Mathematical Reasoning' },
      { id: 'gen-math-018', name: 'Truth Values and Truth Tables', unit: 'Logic and Mathematical Reasoning' },
      { id: 'gen-math-019', name: 'Logical Equivalence and Implication', unit: 'Logic and Mathematical Reasoning' },
      { id: 'gen-math-020', name: 'Quantifiers and Negation', unit: 'Logic and Mathematical Reasoning' },
      { id: 'gen-math-021', name: 'Validity of Arguments', unit: 'Logic and Mathematical Reasoning' },
    ]
  },
  {
    id: 'stats-prob',
    code: 'STAT&PROB',
    name: 'Statistics and Probability',
    gradeLevel: 'Grade 11',
    semester: '2nd Semester',
    color: 'from-sky-500 to-cyan-500',
    topics: [
      // Random Variables and Probability Distributions
      { id: 'stat-001', name: 'Random Variables', unit: 'Random Variables' },
      { id: 'stat-002', name: 'Discrete Probability Distributions', unit: 'Random Variables' },
      { id: 'stat-003', name: 'Mean and Variance of Discrete RV', unit: 'Random Variables' },
      { id: 'stat-004', name: 'Normal Distribution', unit: 'Normal Distribution' },
      { id: 'stat-005', name: 'Standard Normal Distribution and Z-scores', unit: 'Normal Distribution' },
      { id: 'stat-006', name: 'Areas Under the Normal Curve', unit: 'Normal Distribution' },
      // Sampling and Estimation
      { id: 'stat-007', name: 'Sampling Distributions', unit: 'Sampling and Estimation' },
      { id: 'stat-008', name: 'Central Limit Theorem', unit: 'Sampling and Estimation' },
      { id: 'stat-009', name: 'Point Estimation', unit: 'Sampling and Estimation' },
      { id: 'stat-010', name: 'Confidence Intervals', unit: 'Sampling and Estimation' },
      // Hypothesis Testing
      { id: 'stat-011', name: 'Hypothesis Testing Concepts', unit: 'Hypothesis Testing' },
      { id: 'stat-012', name: 'T-test', unit: 'Hypothesis Testing' },
      { id: 'stat-013', name: 'Z-test', unit: 'Hypothesis Testing' },
      { id: 'stat-014', name: 'Correlation and Regression', unit: 'Correlation and Regression' },
    ]
  },
  {
    id: 'pre-calc',
    code: 'PRE-CALC',
    name: 'Pre-Calculus',
    gradeLevel: 'Grade 12',
    semester: '1st Semester',
    color: 'from-orange-500 to-red-500',
    topics: [
      // Analytic Geometry
      { id: 'pre-calc-001', name: 'Conic Sections - Parabola', unit: 'Analytic Geometry' },
      { id: 'pre-calc-002', name: 'Conic Sections - Ellipse', unit: 'Analytic Geometry' },
      { id: 'pre-calc-003', name: 'Conic Sections - Hyperbola', unit: 'Analytic Geometry' },
      { id: 'pre-calc-004', name: 'Conic Sections - Circle', unit: 'Analytic Geometry' },
      { id: 'pre-calc-005', name: 'Systems of Nonlinear Equations', unit: 'Analytic Geometry' },
      // Series and Mathematical Induction
      { id: 'pre-calc-006', name: 'Sequences and Series', unit: 'Series and Induction' },
      { id: 'pre-calc-007', name: 'Arithmetic Sequences', unit: 'Series and Induction' },
      { id: 'pre-calc-008', name: 'Geometric Sequences', unit: 'Series and Induction' },
      { id: 'pre-calc-009', name: 'Mathematical Induction', unit: 'Series and Induction' },
      { id: 'pre-calc-010', name: 'Binomial Theorem', unit: 'Series and Induction' },
      // Trigonometry
      { id: 'pre-calc-011', name: 'Angles and Unit Circle', unit: 'Trigonometry' },
      { id: 'pre-calc-012', name: 'Trigonometric Functions', unit: 'Trigonometry' },
      { id: 'pre-calc-013', name: 'Trigonometric Identities', unit: 'Trigonometry' },
      { id: 'pre-calc-014', name: 'Sum and Difference Formulas', unit: 'Trigonometry' },
      { id: 'pre-calc-015', name: 'Inverse Trigonometric Functions', unit: 'Trigonometry' },
      { id: 'pre-calc-016', name: 'Polar Coordinates', unit: 'Trigonometry' },
    ]
  },
  {
    id: 'basic-calc',
    code: 'BASIC CALC',
    name: 'Basic Calculus',
    gradeLevel: 'Grade 12',
    semester: '2nd Semester',
    color: 'from-green-500 to-teal-500',
    topics: [
      // Limits
      { id: 'calc-001', name: 'Limits of Functions', unit: 'Limits' },
      { id: 'calc-002', name: 'Limit Theorems', unit: 'Limits' },
      { id: 'calc-003', name: 'One-Sided Limits', unit: 'Limits' },
      { id: 'calc-004', name: 'Infinite Limits and Limits at Infinity', unit: 'Limits' },
      { id: 'calc-005', name: 'Continuity of Functions', unit: 'Limits' },
      // Derivatives
      { id: 'calc-006', name: 'Definition of the Derivative', unit: 'Derivatives' },
      { id: 'calc-007', name: 'Differentiation Rules', unit: 'Derivatives' },
      { id: 'calc-008', name: 'Chain Rule', unit: 'Derivatives' },
      { id: 'calc-009', name: 'Implicit Differentiation', unit: 'Derivatives' },
      { id: 'calc-010', name: 'Higher-Order Derivatives', unit: 'Derivatives' },
      { id: 'calc-011', name: 'Related Rates', unit: 'Derivatives' },
      { id: 'calc-012', name: 'Extrema and the First Derivative Test', unit: 'Derivatives' },
      { id: 'calc-013', name: 'Concavity and the Second Derivative Test', unit: 'Derivatives' },
      { id: 'calc-014', name: 'Optimization Problems', unit: 'Derivatives' },
      // Integration
      { id: 'calc-015', name: 'Antiderivatives and Indefinite Integrals', unit: 'Integration' },
      { id: 'calc-016', name: 'Definite Integrals and the FTC', unit: 'Integration' },
      { id: 'calc-017', name: 'Integration by Substitution', unit: 'Integration' },
      { id: 'calc-018', name: 'Area Under a Curve', unit: 'Integration' },
    ]
  }
] as const;

// Convenience exports used throughout the app
export type SubjectId = 'gen-math' | 'stats-prob' | 'pre-calc' | 'basic-calc';
export type GradeLevel = 'Grade 11' | 'Grade 12';

export const GRADE_LEVELS: GradeLevel[] = ['Grade 11', 'Grade 12'];

export const SUBJECTS_BY_GRADE: Record<GradeLevel, typeof SHS_MATH_SUBJECTS[number][]> = {
  'Grade 11': SHS_MATH_SUBJECTS.filter(s => s.gradeLevel === 'Grade 11'),
  'Grade 12': SHS_MATH_SUBJECTS.filter(s => s.gradeLevel === 'Grade 12'),
};

// Active subject visibility for the strengthened SHS rollout.
// Keep strict separation by grade level.
// - Grade 11: General Mathematics only (current rollout)
// - Grade 12: Pre-Calculus + Basic Calculus
export const ACTIVE_SUBJECT_IDS_BY_GRADE: Record<GradeLevel, SubjectId[]> = {
  'Grade 11': ['gen-math'],
  'Grade 12': ['pre-calc', 'basic-calc'],
};

export function normalizeGradeLevel(rawGrade?: string | null): GradeLevel | null {
  if (!rawGrade) return null;
  const normalized = rawGrade.trim().toLowerCase();

  if (normalized === 'grade 11' || normalized === '11' || normalized.includes('11')) {
    return 'Grade 11';
  }

  if (normalized === 'grade 12' || normalized === '12' || normalized.includes('12')) {
    return 'Grade 12';
  }

  return null;
}

export function getActiveSubjectIdsForGrade(rawGrade?: string | null): SubjectId[] {
  const gradeLevel = normalizeGradeLevel(rawGrade);
  if (!gradeLevel) {
    return SHS_MATH_SUBJECTS.map((subject) => subject.id as SubjectId);
  }

  return ACTIVE_SUBJECT_IDS_BY_GRADE[gradeLevel];
}

export function getSubjectById(id: SubjectId) {
  return SHS_MATH_SUBJECTS.find(s => s.id === id);
}

export function getTopicsBySubject(subjectId: SubjectId) {
  return getSubjectById(subjectId)?.topics ?? [];
}

export function getAllTopics(): { id: string; name: string; unit: string }[] {
  return SHS_MATH_SUBJECTS.flatMap(s => [...s.topics]);
}

export function getTopicById(topicId: string): { id: string; name: string; unit: string } | undefined {
  return getAllTopics().find(t => t.id === topicId);
}

// Keep legacy aliases for backward compatibility
export function getTopicsForSubject(id: SubjectId): string[] {
  const subject = getSubjectById(id);
  return subject ? subject.topics.map(t => t.name) : [];
}

export function getUnitsForSubject(id: SubjectId): string[] {
  const subject = getSubjectById(id);
  if (!subject) return [];
  return [...new Set(subject.topics.map(t => t.unit))];
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY INTERFACES — kept for backward compatibility with existing components
// (ModulesPage, SubjectDetailView, ModuleDetailView, LessonViewer, etc.)
// ─────────────────────────────────────────────────────────────────────────────

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  completed: boolean;
  locked: boolean;
  videoUrl?: string;
  description?: string;
}

export interface Quiz {
  id: string;
  title: string;
  questions: number;
  duration: string;
  completed: boolean;
  score?: number;
  locked: boolean;
  type: 'practice' | 'module' | 'final';
}

export interface Module {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
  quizzes: Quiz[];
  progress: number;
  color: string;
  iconColor: string;
  accentColor: string;
}

export interface Subject {
  id: string;
  title: string;
  description: string;
  modules: Module[];
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  iconColor: string;
  accentColor: string;
  progress: number;
  totalModules: number;
  completedModules: number;
  rating?: number;
  reviewCount?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY subjects[] — rebuilt from SHS curriculum (Grade 11-12 only)
// ─────────────────────────────────────────────────────────────────────────────

export const subjects: Subject[] = [
  // GENERAL MATHEMATICS — Grade 11, 1st Semester
  {
    id: 'gen-math',
    title: 'General Mathematics',
    description: 'Functions, business math, and logic for Grade 11 Senior High School students.',
    icon: Calculator,
    color: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    accentColor: 'bg-indigo-600',
    progress: 0,
    totalModules: 3,
    completedModules: 0,
    rating: 4.9,
    reviewCount: 204,
    modules: [
      {
        id: 'gm-1',
        title: 'Functions and Their Graphs',
        description: 'Evaluate, compose, and represent functions including rational, exponential, and logarithmic types.',
        color: 'bg-indigo-50',
        iconColor: 'text-indigo-600',
        accentColor: 'bg-indigo-600',
        progress: 0,
        lessons: [
          { id: 'gm-1-l1', title: 'Patterns and Real-Life Relationships', duration: '15 min', completed: false, locked: false },
          { id: 'gm-1-l2', title: 'Functions as Mathematical Models', duration: '16 min', completed: false, locked: false },
          { id: 'gm-1-l3', title: 'Operations on Functions', duration: '18 min', completed: false, locked: false },
          { id: 'gm-1-l4', title: 'Composite Functions', duration: '18 min', completed: false, locked: false },
          { id: 'gm-1-l5', title: 'Function Notation and Evaluation', duration: '16 min', completed: false, locked: false },
          { id: 'gm-1-l6', title: 'Domain and Range of Functions', duration: '18 min', completed: false, locked: false },
          { id: 'gm-1-l7', title: 'Inverse Functions', duration: '18 min', completed: false, locked: false },
          { id: 'gm-1-l8', title: 'Graphs of Rational Functions', duration: '20 min', completed: false, locked: false },
          { id: 'gm-1-l9', title: 'Graphs of Exponential Functions', duration: '20 min', completed: false, locked: false },
          { id: 'gm-1-l10', title: 'Graphs of Logarithmic Functions', duration: '22 min', completed: false, locked: false },
        ],
        quizzes: [
          { id: 'gm-1-q1', title: 'Practice Quiz: Functions', questions: 10, duration: '15 min', completed: false, locked: false, type: 'practice' },
          { id: 'gm-1-q2', title: 'Module Quiz: Functions and Graphs', questions: 15, duration: '20 min', completed: false, locked: false, type: 'module' },
        ]
      },
      {
        id: 'gm-2',
        title: 'Business Mathematics',
        description: 'Simple and compound interest, annuities, stocks, and bonds.',
        color: 'bg-indigo-50',
        iconColor: 'text-indigo-600',
        accentColor: 'bg-indigo-600',
        progress: 0,
        lessons: [
          { id: 'gm-2-l1', title: 'Simple and Compound Interest', duration: '18 min', completed: false, locked: false },
          { id: 'gm-2-l2', title: 'Simple and General Annuities', duration: '20 min', completed: false, locked: false },
          { id: 'gm-2-l3', title: 'Present and Future Value', duration: '18 min', completed: false, locked: false },
          { id: 'gm-2-l4', title: 'Loans, Amortization, and Sinking Funds', duration: '20 min', completed: false, locked: false },
          { id: 'gm-2-l5', title: 'Stocks, Bonds, and Market Indices', duration: '18 min', completed: false, locked: false },
          { id: 'gm-2-l6', title: 'Business Decision-Making with Mathematical Models', duration: '20 min', completed: false, locked: false },
        ],
        quizzes: [
          { id: 'gm-2-q1', title: 'Practice Quiz: Interest', questions: 12, duration: '18 min', completed: false, locked: false, type: 'practice' },
          { id: 'gm-2-q2', title: 'Module Quiz: Business Math', questions: 15, duration: '20 min', completed: false, locked: false, type: 'module' },
        ]
      },
      {
        id: 'gm-3',
        title: 'Logic',
        description: 'Propositions, truth tables, logical equivalence, and valid arguments.',
        color: 'bg-indigo-50',
        iconColor: 'text-indigo-600',
        accentColor: 'bg-indigo-600',
        progress: 0,
        lessons: [
          { id: 'gm-3-l1', title: 'Propositions and Connectives', duration: '15 min', completed: false, locked: false },
          { id: 'gm-3-l2', title: 'Truth Values and Truth Tables', duration: '18 min', completed: false, locked: false },
          { id: 'gm-3-l3', title: 'Logical Equivalence and Implication', duration: '18 min', completed: false, locked: false },
          { id: 'gm-3-l4', title: 'Quantifiers and Negation', duration: '18 min', completed: false, locked: false },
          { id: 'gm-3-l5', title: 'Validity of Arguments', duration: '22 min', completed: false, locked: false },
        ],
        quizzes: [
          { id: 'gm-3-q1', title: 'Practice Quiz: Logic', questions: 10, duration: '15 min', completed: false, locked: false, type: 'practice' },
          { id: 'gm-3-q2', title: 'Module Quiz: Logic', questions: 12, duration: '18 min', completed: false, locked: true, type: 'module' },
        ]
      },
    ]
  },

  // PRE-CALCULUS — Grade 12, 1st Semester
  {
    id: 'pre-calc',
    title: 'Pre-Calculus',
    description: 'Analytic geometry, trigonometry, and series for Grade 12 STEM students.',
    icon: TrendingUp,
    color: 'bg-teal-50',
    iconColor: 'text-teal-600',
    accentColor: 'bg-teal-500',
    progress: 0,
    totalModules: 3,
    completedModules: 0,
    rating: 4.7,
    reviewCount: 192,
    modules: [
      {
        id: 'pc-1',
        title: 'Analytic Geometry',
        description: 'Conic sections: circles, parabolas, ellipses, and hyperbolas.',
        color: 'bg-teal-50',
        iconColor: 'text-teal-600',
        accentColor: 'bg-teal-500',
        progress: 0,
        lessons: [
          { id: 'pc-1-l1', title: 'Conic Sections - Parabola', duration: '22 min', completed: false, locked: false },
          { id: 'pc-1-l2', title: 'Conic Sections - Ellipse', duration: '24 min', completed: false, locked: false },
          { id: 'pc-1-l3', title: 'Conic Sections - Hyperbola', duration: '24 min', completed: false, locked: false },
          { id: 'pc-1-l4', title: 'Conic Sections - Circle', duration: '18 min', completed: false, locked: false },
          { id: 'pc-1-l5', title: 'Systems of Nonlinear Equations', duration: '20 min', completed: false, locked: false },
        ],
        quizzes: [
          { id: 'pc-1-q1', title: 'Practice Quiz: Conics', questions: 14, duration: '20 min', completed: false, locked: false, type: 'practice' },
          { id: 'pc-1-q2', title: 'Module Quiz: Analytic Geometry', questions: 18, duration: '25 min', completed: false, locked: false, type: 'module' },
        ]
      },
      {
        id: 'pc-2',
        title: 'Series and Induction',
        description: 'Sequences, series, mathematical induction, and the binomial theorem.',
        color: 'bg-teal-50',
        iconColor: 'text-teal-600',
        accentColor: 'bg-teal-500',
        progress: 0,
        lessons: [
          { id: 'pc-2-l1', title: 'Sequences and Series', duration: '18 min', completed: false, locked: false },
          { id: 'pc-2-l2', title: 'Arithmetic Sequences', duration: '18 min', completed: false, locked: false },
          { id: 'pc-2-l3', title: 'Geometric Sequences', duration: '20 min', completed: false, locked: false },
          { id: 'pc-2-l4', title: 'Mathematical Induction', duration: '24 min', completed: false, locked: false },
          { id: 'pc-2-l5', title: 'Binomial Theorem', duration: '22 min', completed: false, locked: false },
        ],
        quizzes: [
          { id: 'pc-2-q1', title: 'Practice Quiz: Sequences & Series', questions: 12, duration: '18 min', completed: false, locked: false, type: 'practice' },
          { id: 'pc-2-q2', title: 'Module Quiz: Series and Induction', questions: 16, duration: '24 min', completed: false, locked: false, type: 'module' },
        ]
      },
      {
        id: 'pc-3',
        title: 'Trigonometry',
        description: 'Trigonometric functions, identities, equations, and the unit circle.',
        color: 'bg-teal-50',
        iconColor: 'text-teal-600',
        accentColor: 'bg-teal-500',
        progress: 0,
        lessons: [
          { id: 'pc-3-l1', title: 'Angles and Unit Circle', duration: '18 min', completed: false, locked: false },
          { id: 'pc-3-l2', title: 'Trigonometric Functions', duration: '22 min', completed: false, locked: false },
          { id: 'pc-3-l3', title: 'Trigonometric Identities', duration: '22 min', completed: false, locked: false },
          { id: 'pc-3-l4', title: 'Sum and Difference Formulas', duration: '20 min', completed: false, locked: false },
          { id: 'pc-3-l5', title: 'Inverse Trigonometric Functions', duration: '20 min', completed: false, locked: false },
          { id: 'pc-3-l6', title: 'Polar Coordinates', duration: '22 min', completed: false, locked: false },
        ],
        quizzes: [
          { id: 'pc-3-q1', title: 'Practice Quiz: Trig Functions', questions: 15, duration: '22 min', completed: false, locked: false, type: 'practice' },
          { id: 'pc-3-q2', title: 'Module Quiz: Trigonometry', questions: 20, duration: '30 min', completed: false, locked: true, type: 'module' },
        ]
      },
    ]
  },

  // STATISTICS AND PROBABILITY — Grade 11, 2nd Semester
  {
    id: 'stats-prob',
    title: 'Statistics and Probability',
    description: 'Random variables, distributions, sampling, and hypothesis testing for Grade 11 students.',
    icon: BarChart3,
    color: 'bg-sky-50',
    iconColor: 'text-sky-600',
    accentColor: 'bg-sky-500',
    progress: 0,
    totalModules: 4,
    completedModules: 0,
    rating: 4.8,
    reviewCount: 160,
    modules: [
      {
        id: 'sp-1',
        title: 'Random Variables and Probability Distributions',
        description: 'Discrete random variables, probability distributions, mean, and variance.',
        color: 'bg-sky-50',
        iconColor: 'text-sky-600',
        accentColor: 'bg-sky-500',
        progress: 0,
        lessons: [
          { id: 'sp-1-l1', title: 'Random Variables', duration: '16 min', completed: false, locked: false },
          { id: 'sp-1-l2', title: 'Discrete Probability Distributions', duration: '18 min', completed: false, locked: false },
          { id: 'sp-1-l3', title: 'Mean and Variance of Discrete RV', duration: '20 min', completed: false, locked: false },
        ],
        quizzes: [
          { id: 'sp-1-q1', title: 'Practice Quiz: Random Variables', questions: 10, duration: '15 min', completed: false, locked: false, type: 'practice' },
          { id: 'sp-1-q2', title: 'Module Quiz: Probability Distributions', questions: 15, duration: '20 min', completed: false, locked: false, type: 'module' },
        ]
      },
      {
        id: 'sp-2',
        title: 'Normal Distribution',
        description: 'The normal curve, standard normal distribution, z-scores, and areas under the curve.',
        color: 'bg-sky-50',
        iconColor: 'text-sky-600',
        accentColor: 'bg-sky-500',
        progress: 0,
        lessons: [
          { id: 'sp-2-l1', title: 'Normal Distribution', duration: '16 min', completed: false, locked: false },
          { id: 'sp-2-l2', title: 'Standard Normal Distribution and Z-scores', duration: '18 min', completed: false, locked: false },
          { id: 'sp-2-l3', title: 'Areas Under the Normal Curve', duration: '18 min', completed: false, locked: false },
        ],
        quizzes: [
          { id: 'sp-2-q1', title: 'Practice Quiz: Normal Distribution', questions: 12, duration: '18 min', completed: false, locked: false, type: 'practice' },
          { id: 'sp-2-q2', title: 'Module Quiz: Z-Scores & Normal Curve', questions: 14, duration: '20 min', completed: false, locked: false, type: 'module' },
        ]
      },
      {
        id: 'sp-3',
        title: 'Sampling and Estimation',
        description: 'Sampling distributions, central limit theorem, point estimation, and confidence intervals.',
        color: 'bg-sky-50',
        iconColor: 'text-sky-600',
        accentColor: 'bg-sky-500',
        progress: 0,
        lessons: [
          { id: 'sp-3-l1', title: 'Sampling Distributions', duration: '18 min', completed: false, locked: false },
          { id: 'sp-3-l2', title: 'Central Limit Theorem', duration: '20 min', completed: false, locked: false },
          { id: 'sp-3-l3', title: 'Point Estimation', duration: '18 min', completed: false, locked: false },
          { id: 'sp-3-l4', title: 'Confidence Intervals', duration: '22 min', completed: false, locked: false },
        ],
        quizzes: [
          { id: 'sp-3-q1', title: 'Practice Quiz: Sampling', questions: 14, duration: '20 min', completed: false, locked: false, type: 'practice' },
          { id: 'sp-3-q2', title: 'Module Quiz: Estimation', questions: 16, duration: '24 min', completed: false, locked: true, type: 'module' },
        ]
      },
      {
        id: 'sp-4',
        title: 'Hypothesis Testing',
        description: 'Hypothesis testing concepts, T-test, Z-test, and correlation & regression.',
        color: 'bg-sky-50',
        iconColor: 'text-sky-600',
        accentColor: 'bg-sky-500',
        progress: 0,
        lessons: [
          { id: 'sp-4-l1', title: 'Hypothesis Testing Concepts', duration: '20 min', completed: false, locked: false },
          { id: 'sp-4-l2', title: 'T-test', duration: '22 min', completed: false, locked: false },
          { id: 'sp-4-l3', title: 'Z-test', duration: '22 min', completed: false, locked: false },
          { id: 'sp-4-l4', title: 'Correlation and Regression', duration: '24 min', completed: false, locked: false },
        ],
        quizzes: [
          { id: 'sp-4-q1', title: 'Practice Quiz: Hypothesis Testing', questions: 14, duration: '22 min', completed: false, locked: false, type: 'practice' },
          { id: 'sp-4-q2', title: 'Module Quiz: Hypothesis Testing', questions: 18, duration: '28 min', completed: false, locked: true, type: 'module' },
        ]
      },
    ]
  },

  // BASIC CALCULUS — Grade 12, 2nd Semester
  {
    id: 'basic-calc',
    title: 'Basic Calculus',
    description: 'Limits, derivatives, and integrals for Grade 12 STEM students.',
    icon: Sigma,
    color: 'bg-orange-50',
    iconColor: 'text-orange-600',
    accentColor: 'bg-orange-500',
    progress: 0,
    totalModules: 3,
    completedModules: 0,
    rating: 4.9,
    reviewCount: 216,
    modules: [
      {
        id: 'bc-1',
        title: 'Limits',
        description: 'Limits of functions, limit theorems, one-sided limits, infinite limits, and continuity.',
        color: 'bg-orange-50',
        iconColor: 'text-orange-600',
        accentColor: 'bg-orange-500',
        progress: 0,
        lessons: [
          { id: 'bc-1-l1', title: 'Limits of Functions', duration: '20 min', completed: false, locked: false },
          { id: 'bc-1-l2', title: 'Limit Theorems', duration: '22 min', completed: false, locked: false },
          { id: 'bc-1-l3', title: 'One-Sided Limits', duration: '18 min', completed: false, locked: false },
          { id: 'bc-1-l4', title: 'Infinite Limits and Limits at Infinity', duration: '20 min', completed: false, locked: false },
          { id: 'bc-1-l5', title: 'Continuity of Functions', duration: '20 min', completed: false, locked: false },
        ],
        quizzes: [
          { id: 'bc-1-q1', title: 'Practice Quiz: Limits', questions: 12, duration: '20 min', completed: false, locked: false, type: 'practice' },
          { id: 'bc-1-q2', title: 'Module Quiz: Limits & Continuity', questions: 16, duration: '25 min', completed: false, locked: false, type: 'module' },
        ]
      },
      {
        id: 'bc-2',
        title: 'Derivatives',
        description: 'Differentiation rules, chain rule, implicit differentiation, related rates, and optimization.',
        color: 'bg-orange-50',
        iconColor: 'text-orange-600',
        accentColor: 'bg-orange-500',
        progress: 0,
        lessons: [
          { id: 'bc-2-l1', title: 'Definition of the Derivative', duration: '22 min', completed: false, locked: false },
          { id: 'bc-2-l2', title: 'Differentiation Rules', duration: '20 min', completed: false, locked: false },
          { id: 'bc-2-l3', title: 'Chain Rule', duration: '24 min', completed: false, locked: false },
          { id: 'bc-2-l4', title: 'Implicit Differentiation', duration: '26 min', completed: false, locked: false },
          { id: 'bc-2-l5', title: 'Higher-Order Derivatives', duration: '20 min', completed: false, locked: false },
          { id: 'bc-2-l6', title: 'Related Rates', duration: '26 min', completed: false, locked: false },
          { id: 'bc-2-l7', title: 'Extrema and the First Derivative Test', duration: '22 min', completed: false, locked: false },
          { id: 'bc-2-l8', title: 'Concavity and the Second Derivative Test', duration: '22 min', completed: false, locked: false },
          { id: 'bc-2-l9', title: 'Optimization Problems', duration: '24 min', completed: false, locked: false },
        ],
        quizzes: [
          { id: 'bc-2-q1', title: 'Practice Quiz: Derivatives', questions: 14, duration: '22 min', completed: false, locked: false, type: 'practice' },
          { id: 'bc-2-q2', title: 'Module Quiz: Differentiation', questions: 18, duration: '28 min', completed: false, locked: false, type: 'module' },
        ]
      },
      {
        id: 'bc-3',
        title: 'Integration',
        description: 'Antiderivatives, definite integrals, the fundamental theorem of calculus, and applications.',
        color: 'bg-orange-50',
        iconColor: 'text-orange-600',
        accentColor: 'bg-orange-500',
        progress: 0,
        lessons: [
          { id: 'bc-3-l1', title: 'Antiderivatives and Indefinite Integrals', duration: '20 min', completed: false, locked: false },
          { id: 'bc-3-l2', title: 'Definite Integrals and the FTC', duration: '24 min', completed: false, locked: false },
          { id: 'bc-3-l3', title: 'Integration by Substitution', duration: '22 min', completed: false, locked: false },
          { id: 'bc-3-l4', title: 'Area Under a Curve', duration: '24 min', completed: false, locked: false },
        ],
        quizzes: [
          { id: 'bc-3-q1', title: 'Practice Quiz: Antiderivatives', questions: 14, duration: '22 min', completed: false, locked: false, type: 'practice' },
          { id: 'bc-3-q2', title: 'Module Quiz: Integration', questions: 20, duration: '32 min', completed: false, locked: true, type: 'module' },
        ]
      },
    ]
  },
];
