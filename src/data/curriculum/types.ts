export type GradeLevel = 'Grade 11' | 'Grade 12';
export type CurriculumQuarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export interface CurriculumSourceMeta {
  id: string;
  title: string;
  url: string;
  storagePath: string;
}

export interface CurriculumLesson {
  lessonId: string;
  lessonTitle: string;
  moduleId: string;
  subjectId: string;
  subject: string;
  quarter: number;
  competencyCode: string;
  learningCompetency: string;
  storagePath: string;
  sourceFile: string;
}

export interface CurriculumModule {
  id: string;
  subjectId: string;
  subject: string;
  quarter: CurriculumQuarter;
  moduleTitle: string;
  moduleDescription: string;
  contentDomain: string;
  competencyGroup: string;
  competencies: Array<{ code: string; outcome: string }>;
  performanceStandard: string;
  realWorldTheme: string;
  gradeLevel: GradeLevel[];
  recommendedGradeLevel: GradeLevel;
  lessons: CurriculumLesson[];
  storagePath: string;
  sourceFile: string;
}

export const CURRICULUM_LESSONS: CurriculumLesson[] = [
  {
    lessonId: 'gm-q1-bf-1',
    lessonTitle: 'Represent business transactions and financial goals using variables and equations.',
    moduleId: 'gm-q1-business-finance',
    subjectId: 'gen-math',
    subject: 'General Mathematics',
    quarter: 1,
    competencyCode: 'GM11-BF-1',
    learningCompetency: 'Represent business transactions and financial goals using variables and equations.',
    storagePath: 'curriculum/general_math/GENERAL-MATHEMATICS-1.pdf',
    sourceFile: 'GENERAL-MATHEMATICS-1.pdf',
  },
  {
    lessonId: 'gm-q1-pss-1',
    lessonTitle: 'Identify and describe arithmetic and geometric patterns in data.',
    moduleId: 'gm-q1-patterns-sequences-series',
    subjectId: 'gen-math',
    subject: 'General Mathematics',
    quarter: 1,
    competencyCode: 'GM11-PSS-1',
    learningCompetency: 'Identify and describe arithmetic and geometric patterns in data.',
    storagePath: 'curriculum/general_math/GENERAL-MATHEMATICS-1.pdf',
    sourceFile: 'GENERAL-MATHEMATICS-1.pdf',
  },
  {
    lessonId: 'gm-q1-fass-1',
    lessonTitle: 'Use arithmetic and geometric series to estimate cumulative financial outcomes.',
    moduleId: 'gm-q1-financial-application-sequences-series',
    subjectId: 'gen-math',
    subject: 'General Mathematics',
    quarter: 1,
    competencyCode: 'GM11-FASS-1',
    learningCompetency: 'Use arithmetic and geometric series to estimate cumulative financial outcomes.',
    storagePath: 'curriculum/gen_math_sdo/SDO_Navotas_Gen.Math_SHS_1stSem.FV.pdf',
    sourceFile: 'SDO_Navotas_Gen.Math_SHS_1stSem.FV.pdf',
  },
  {
    lessonId: 'bm-q1-1',
    lessonTitle: 'Translate verbal phrases to mathematical expressions; model business scenarios using linear equations and inequalities.',
    moduleId: 'bm-q1-business-math',
    subjectId: 'business-math',
    subject: 'Business Mathematics',
    quarter: 1,
    competencyCode: 'ABM_BM11BS-Ia-b-1',
    learningCompetency: 'Translate verbal phrases to mathematical expressions; model business scenarios using linear equations and inequalities.',
    storagePath: 'curriculum/business_math/SDO_Navotas_Bus.Math_SHS_1stSem.FV.pdf',
    sourceFile: 'SDO_Navotas_Bus.Math_SHS_1stSem.FV.pdf',
  },
  {
    lessonId: 'stat-q1-1',
    lessonTitle: 'Define and describe random variables and their types.',
    moduleId: 'stat-q1-probability',
    subjectId: 'stats-prob',
    subject: 'Statistics and Probability',
    quarter: 1,
    competencyCode: 'SP_SHS11-Ia-1',
    learningCompetency: 'Define and describe random variables and their types.',
    storagePath: 'curriculum/stat_prob/SDO_Navotas_STAT_PROB_SHS_1stSem.FV.pdf',
    sourceFile: 'SDO_Navotas_STAT_PROB_SHS_1stSem_FV.pdf',
  },
  {
    lessonId: 'fm1-q1-fpc-1',
    lessonTitle: 'Apply the fundamental counting principle in contextual problems.',
    moduleId: 'fm1-q1-counting',
    subjectId: 'finite-math-1',
    subject: 'Finite Mathematics 1',
    quarter: 1,
    competencyCode: 'FM1-SHS11-Ia-1',
    learningCompetency: 'Apply the fundamental counting principle in contextual problems.',
    storagePath: 'curriculum/finite_math/Finite-Mathematics-1-1.pdf',
    sourceFile: 'Finite-Mathematics-1-1.pdf',
  },
  {
    lessonId: 'fm2-q1-matrices-1',
    lessonTitle: 'Represent contextual data using matrix notation.',
    moduleId: 'fm2-q1-matrices',
    subjectId: 'finite-math-2',
    subject: 'Finite Mathematics 2',
    quarter: 1,
    competencyCode: 'FM2-SHS11-Ia-1',
    learningCompetency: 'Represent contextual data using matrix notation.',
    storagePath: 'curriculum/finite_math/Finite-Mathematics-2-1.pdf',
    sourceFile: 'Finite-Mathematics-2-1.pdf',
  },
  {
    lessonId: 'org-mgmt-q1-1',
    lessonTitle: 'Understand the fundamental concepts of organization and management.',
    moduleId: 'org-mgmt-q1',
    subjectId: 'org-mgmt',
    subject: 'Organization and Management',
    quarter: 1,
    competencyCode: 'ABM_OM11-Ia-1',
    learningCompetency: 'Understand the fundamental concepts of organization and management.',
    storagePath: 'curriculum/org_mgmt/SDO_Navotas_SHS_ABM_OrgAndMngt_FirstSem_FV.pdf',
    sourceFile: 'SDO_Navotas_SHS_ABM_OrgAndMngt_FirstSem_FV.pdf',
  },
];

export function getLessonById(lessonId: string): CurriculumLesson | undefined {
  return CURRICULUM_LESSONS.find((l) => l.lessonId === lessonId);
}

export function getLessonsByModule(moduleId: string): CurriculumLesson[] {
  return CURRICULUM_LESSONS.filter((l) => l.moduleId === moduleId);
}

export function getLessonsBySubject(subjectId: string): CurriculumLesson[] {
  return CURRICULUM_LESSONS.filter((l) => l.subjectId === subjectId);
}