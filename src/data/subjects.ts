import React from 'react';
import { Calculator, BarChart3 } from 'lucide-react';

// Grade 11 SHS Math only - served to all users
export const SHS_MATH_SUBJECTS = [
  {
    id: 'gen-math',
    code: 'GEN MATH',
    name: 'General Mathematics',
    gradeLevel: 'Grade 11',
    semester: '1st Semester',
    color: 'from-blue-500 to-cyan-500',
    pdfAvailable: true,
    topics: [
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
      { id: 'gen-math-011', name: 'Simple and Compound Interest', unit: 'Financial Mathematics' },
      { id: 'gen-math-012', name: 'Simple and General Annuities', unit: 'Financial Mathematics' },
      { id: 'gen-math-013', name: 'Present and Future Value', unit: 'Financial Mathematics' },
      { id: 'gen-math-014', name: 'Loans, Amortization, and Sinking Funds', unit: 'Financial Mathematics' },
      { id: 'gen-math-015', name: 'Stocks, Bonds, and Market Indices', unit: 'Financial Mathematics' },
      { id: 'gen-math-016', name: 'Business Decision-Making with Mathematical Models', unit: 'Financial Mathematics' },
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
    pdfAvailable: true,
    topics: [
      { id: 'stat-001', name: 'Random Variables', unit: 'Random Variables' },
      { id: 'stat-002', name: 'Discrete Probability Distributions', unit: 'Random Variables' },
      { id: 'stat-003', name: 'Mean and Variance of Discrete RV', unit: 'Random Variables' },
      { id: 'stat-004', name: 'Normal Distribution', unit: 'Normal Distribution' },
      { id: 'stat-005', name: 'Standard Normal Distribution and Z-scores', unit: 'Normal Distribution' },
      { id: 'stat-006', name: 'Areas Under the Normal Curve', unit: 'Normal Distribution' },
      { id: 'stat-007', name: 'Sampling Distributions', unit: 'Sampling and Estimation' },
      { id: 'stat-008', name: 'Central Limit Theorem', unit: 'Sampling and Estimation' },
      { id: 'stat-009', name: 'Point Estimation', unit: 'Sampling and Estimation' },
      { id: 'stat-010', name: 'Confidence Intervals', unit: 'Sampling and Estimation' },
      { id: 'stat-011', name: 'Hypothesis Testing Concepts', unit: 'Hypothesis Testing' },
      { id: 'stat-012', name: 'T-test', unit: 'Hypothesis Testing' },
      { id: 'stat-013', name: 'Z-test', unit: 'Hypothesis Testing' },
      { id: 'stat-014', name: 'Correlation and Regression', unit: 'Correlation and Regression' },
    ]
  },
] as const;

export type SubjectId = 'gen-math' | 'stats-prob';
export type GradeLevel = 'Grade 11';

export const GRADE_LEVELS: GradeLevel[] = ['Grade 11'];

export const SUBJECTS_BY_GRADE: Record<GradeLevel, typeof SHS_MATH_SUBJECTS[number][]> = {
  'Grade 11': SHS_MATH_SUBJECTS,
};

export const ACTIVE_SUBJECT_IDS_BY_GRADE: Record<GradeLevel, SubjectId[]> = {
  'Grade 11': ['gen-math', 'stats-prob'],
};

export function normalizeGradeLevel(rawGrade?: string | null): GradeLevel | null {
  if (!rawGrade) return null;
  const normalized = rawGrade.trim().toLowerCase();
  if (normalized === 'grade 11' || normalized === '11' || normalized.includes('11')) {
    return 'Grade 11';
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

export function getAllTopics(): { id: string; name: string; unit: string }[] {
  return SHS_MATH_SUBJECTS.flatMap(s => [...s.topics]);
}

export function getTopicById(topicId: string): { id: string; name: string; unit: string } | undefined {
  return getAllTopics().find(t => t.id === topicId);
}

export function getTopicsForSubject(id: SubjectId): string[] {
  const subject = getSubjectById(id);
  return subject ? subject.topics.map(t => t.name) : [];
}

export function getUnitsForSubject(id: SubjectId): string[] {
  const subject = getSubjectById(id);
  if (!subject) return [];
  return [...new Set(subject.topics.map(t => t.unit))];
}

// Legacy interfaces
export interface Lesson {
  id: string;
  title: string;
  duration: string;
  completed: boolean;
  locked: boolean;
  videoUrl?: string;
  description?: string;
  subjectId?: string;
  subject?: string;
  quarter?: number;
  competencyCode?: string;
  learningCompetency?: string;
  storagePath?: string;
  sourceFile?: string;
  lessonId?: string;
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
  pdfAvailable?: boolean;
}

// Legacy subjects array for existing components
export const subjects: Subject[] = [
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
    pdfAvailable: true,
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
    pdfAvailable: true,
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
          { id: 'sp-3-l3', title: 'Point Estimation', duration: '16 min', completed: false, locked: false },
          { id: 'sp-3-l4', title: 'Confidence Intervals', duration: '20 min', completed: false, locked: false },
        ],
        quizzes: [
          { id: 'sp-3-q1', title: 'Practice Quiz: Sampling', questions: 12, duration: '18 min', completed: false, locked: false, type: 'practice' },
          { id: 'sp-3-q2', title: 'Module Quiz: Estimation', questions: 16, duration: '24 min', completed: false, locked: false, type: 'module' },
        ]
      },
      {
        id: 'sp-4',
        title: 'Hypothesis Testing',
        description: 'Hypothesis testing concepts, t-test, z-test, and correlation.',
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
];