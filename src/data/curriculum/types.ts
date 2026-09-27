export type GradeLevel = 'Grade 11';
export type CurriculumQuarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export interface CurriculumSourceMeta {
  id: string;
  title: string;
  url: string;
  storagePath?: string;
}

export function getFirebaseStoragePdfUrl(storagePath?: string): string {
  if (!storagePath) return '';
  const clean = storagePath.replace(/^\/+/, '');
  return `https://firebasestorage.googleapis.com/v0/b/mathpulse-ai-2026.firebasestorage.app/o/${encodeURIComponent(clean)}?alt=media`;
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
  // =========================================================================
  // Quarter 1: General Mathematics (SSHS Learning Resources)
  // =========================================================================
  {
    lessonId: 'gm-q1-bf-1',
    lessonTitle: 'Represent business transactions and financial goals using variables and equations.',
    moduleId: 'gm-q1-business-finance',
    subjectId: 'gen-math',
    subject: 'General Mathematics',
    quarter: 1,
    competencyCode: 'GM11-BF-1',
    learningCompetency: 'Represent business transactions and financial goals using variables and equations.',
    storagePath: 'curriculum/sshs_learning_resources/General Mathematics/Quarter 1/Lesson Exemplars/PDF/SHS_GM_Q1_LE1.pdf',
    sourceFile: 'SHS_GM_Q1_LE1.pdf',
  },
  {
    lessonId: 'gm-q1-bf-2',
    lessonTitle: 'Analyze financial options using ratio, percent change, and margin reasoning.',
    moduleId: 'gm-q1-business-finance',
    subjectId: 'gen-math',
    subject: 'General Mathematics',
    quarter: 1,
    competencyCode: 'GM11-BF-2',
    learningCompetency: 'Analyze financial options using ratio, percent change, and margin reasoning.',
    storagePath: 'curriculum/sshs_learning_resources/General Mathematics/Quarter 1/Lesson Exemplars/PDF/SHS_GM_Q1_LE1.pdf',
    sourceFile: 'SHS_GM_Q1_LE1.pdf',
  },
  {
    lessonId: 'gm-q1-bf-3',
    lessonTitle: 'Justify practical decisions with mathematically sound comparisons.',
    moduleId: 'gm-q1-business-finance',
    subjectId: 'gen-math',
    subject: 'General Mathematics',
    quarter: 1,
    competencyCode: 'GM11-BF-3',
    learningCompetency: 'Justify practical decisions with mathematically sound comparisons.',
    storagePath: 'curriculum/sshs_learning_resources/General Mathematics/Quarter 1/Learning Activity Sheets/PDF/SHS_GM_Q1_LAS1.pdf',
    sourceFile: 'SHS_GM_Q1_LAS1.pdf',
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
    storagePath: 'curriculum/sshs_learning_resources/General Mathematics/Quarter 1/Lesson Exemplars/PDF/SHS_GM_Q1_LE2.pdf',
    sourceFile: 'SHS_GM_Q1_LE2.pdf',
  },
  {
    lessonId: 'gm-q1-pss-2',
    lessonTitle: 'Construct explicit and recursive rules for sequences.',
    moduleId: 'gm-q1-patterns-sequences-series',
    subjectId: 'gen-math',
    subject: 'General Mathematics',
    quarter: 1,
    competencyCode: 'GM11-PSS-2',
    learningCompetency: 'Construct explicit and recursive rules for sequences.',
    storagePath: 'curriculum/sshs_learning_resources/General Mathematics/Quarter 1/Lesson Exemplars/PDF/SHS_GM_Q1_LE2.pdf',
    sourceFile: 'SHS_GM_Q1_LE2.pdf',
  },
  {
    lessonId: 'gm-q1-pss-3',
    lessonTitle: 'Solve contextual problems involving finite series.',
    moduleId: 'gm-q1-patterns-sequences-series',
    subjectId: 'gen-math',
    subject: 'General Mathematics',
    quarter: 1,
    competencyCode: 'GM11-PSS-3',
    learningCompetency: 'Solve contextual problems involving finite series.',
    storagePath: 'curriculum/sshs_learning_resources/General Mathematics/Quarter 1/Learning Activity Sheets/PDF/SHS_GM_Q1_LAS2.pdf',
    sourceFile: 'SHS_GM_Q1_LAS2.pdf',
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
    storagePath: 'curriculum/sshs_learning_resources/General Mathematics/Quarter 1/Lesson Exemplars/PDF/SHS_GM_Q1_LE3.pdf',
    sourceFile: 'SHS_GM_Q1_LE3.pdf',
  },
  {
    lessonId: 'gm-q1-fass-2',
    lessonTitle: 'Compare payment plans and saving schemes using sequence-based models.',
    moduleId: 'gm-q1-financial-application-sequences-series',
    subjectId: 'gen-math',
    subject: 'General Mathematics',
    quarter: 1,
    competencyCode: 'GM11-FASS-2',
    learningCompetency: 'Compare payment plans and saving schemes using sequence-based models.',
    storagePath: 'curriculum/sshs_learning_resources/General Mathematics/Complete Course (Term 1)/PDF/General Mathematics_LE.pdf',
    sourceFile: 'General Mathematics_LE.pdf',
  },

  // =========================================================================
  // Quarter 2: General Mathematics (SSHS Learning Resources & SDO Modules)
  // =========================================================================
  {
    lessonId: 'gm-q2-mc-1',
    lessonTitle: 'Perform unit conversions accurately across metric and mixed contexts.',
    moduleId: 'gm-q2-measurement-conversion',
    subjectId: 'gen-math',
    subject: 'General Mathematics',
    quarter: 2,
    competencyCode: 'GM11-MC-1',
    learningCompetency: 'Perform unit conversions accurately across metric and mixed contexts.',
    storagePath: 'curriculum/sshs_learning_resources/General Mathematics/Quarter 2/Lesson Exemplars/PDF/SHS_GM_Q2_LE4.pdf',
    sourceFile: 'SHS_GM_Q2_LE4.pdf',
  },
  {
    lessonId: 'gm-q2-mc-2',
    lessonTitle: 'Evaluate measurement precision and reasonableness in applied tasks.',
    moduleId: 'gm-q2-measurement-conversion',
    subjectId: 'gen-math',
    subject: 'General Mathematics',
    quarter: 2,
    competencyCode: 'GM11-MC-2',
    learningCompetency: 'Evaluate measurement precision and reasonableness in applied tasks.',
    storagePath: 'curriculum/sshs_learning_resources/General Mathematics/Quarter 2/Lesson Exemplars/PDF/SHS_GM_Q2_LE4.pdf',
    sourceFile: 'SHS_GM_Q2_LE4.pdf',
  },
  {
    lessonId: 'gm-q2-fg-1',
    lessonTitle: 'Represent real-life relationships as functions and interpret domain/range.',
    moduleId: 'gm-q2-functions-graphs',
    subjectId: 'gen-math',
    subject: 'General Mathematics',
    quarter: 2,
    competencyCode: 'GM11-FG-1',
    learningCompetency: 'Represent real-life relationships as functions and interpret domain/range.',
    storagePath: 'curriculum/sshs_learning_resources/General Mathematics/Quarter 2/Lesson Exemplars/PDF/SHS_GM_Q2_LE5.pdf',
    sourceFile: 'SHS_GM_Q2_LE5.pdf',
  },
  {
    lessonId: 'gm-q2-fg-2',
    lessonTitle: 'Analyze function behavior from tables, equations, and graphs.',
    moduleId: 'gm-q2-functions-graphs',
    subjectId: 'gen-math',
    subject: 'General Mathematics',
    quarter: 2,
    competencyCode: 'GM11-FG-2',
    learningCompetency: 'Analyze function behavior from tables, equations, and graphs.',
    storagePath: 'curriculum/sshs_learning_resources/General Mathematics/Quarter 2/Lesson Exemplars/PDF/SHS_GM_Q2_LE5.pdf',
    sourceFile: 'SHS_GM_Q2_LE5.pdf',
  },
  {
    lessonId: 'gm-q2-fg-3',
    lessonTitle: 'Use graph interpretation to support contextual conclusions.',
    moduleId: 'gm-q2-functions-graphs',
    subjectId: 'gen-math',
    subject: 'General Mathematics',
    quarter: 2,
    competencyCode: 'GM11-FG-3',
    learningCompetency: 'Use graph interpretation to support contextual conclusions.',
    storagePath: 'curriculum/sshs_learning_resources/General Mathematics/Quarter 2/Lesson Exemplars/PDF/SHS_GM_Q2_LE5.pdf',
    sourceFile: 'SHS_GM_Q2_LE5.pdf',
  },
  {
    lessonId: 'gm-q2-pf-1',
    lessonTitle: 'Translate threshold-based scenarios into piecewise functions.',
    moduleId: 'gm-q2-piecewise-functions',
    subjectId: 'gen-math',
    subject: 'General Mathematics',
    quarter: 2,
    competencyCode: 'GM11-PF-1',
    learningCompetency: 'Translate threshold-based scenarios into piecewise functions.',
    storagePath: 'curriculum/sshs_learning_resources/General Mathematics/Quarter 2/Lesson Exemplars/PDF/SHS_GM_Q2_LE5.pdf',
    sourceFile: 'SHS_GM_Q2_LE5.pdf',
  },
  {
    lessonId: 'gm-q2-pf-2',
    lessonTitle: 'Evaluate and graph piecewise functions for decision-making.',
    moduleId: 'gm-q2-piecewise-functions',
    subjectId: 'gen-math',
    subject: 'General Mathematics',
    quarter: 2,
    competencyCode: 'GM11-PF-2',
    learningCompetency: 'Evaluate and graph piecewise functions for decision-making.',
    storagePath: 'curriculum/sshs_learning_resources/General Mathematics/Quarter 2/Learning Activity Sheets/PDF/SHS_GM_Q2_LAS2.pdf',
    sourceFile: 'SHS_GM_Q2_LAS2.pdf',
  },
  {
    lessonId: 'gm-q2-sv-1',
    lessonTitle: 'Classify variables and choose appropriate data representations.',
    moduleId: 'gm-q2-statistical-variables',
    subjectId: 'gen-math',
    subject: 'General Mathematics',
    quarter: 2,
    competencyCode: 'GM11-SV-1',
    learningCompetency: 'Classify variables and choose appropriate data representations.',
    storagePath: 'curriculum/sshs_learning_resources/General Mathematics/Quarter 2/Lesson Exemplars/PDF/SHS_GM_Q2_LE6.pdf',
    sourceFile: 'SHS_GM_Q2_LE6.pdf',
  },
  {
    lessonId: 'gm-q2-sv-2',
    lessonTitle: 'Interpret variable distributions and detect potential data issues.',
    moduleId: 'gm-q2-statistical-variables',
    subjectId: 'gen-math',
    subject: 'General Mathematics',
    quarter: 2,
    competencyCode: 'GM11-SV-2',
    learningCompetency: 'Interpret variable distributions and detect potential data issues.',
    storagePath: 'curriculum/sshs_learning_resources/General Mathematics/Quarter 2/Lesson Exemplars/PDF/SHS_GM_Q2_LE6.pdf',
    sourceFile: 'SHS_GM_Q2_LE6.pdf',
  },
  {
    lessonId: 'gm-q2-ci-1',
    lessonTitle: 'Compute and compare simple and compound interest, maturity, and present values.',
    moduleId: 'gm-q2-compound-interest',
    subjectId: 'gen-math',
    subject: 'General Mathematics',
    quarter: 2,
    competencyCode: 'GM11-Q2-CI-1',
    learningCompetency: 'Compute and compare simple and compound interest, maturity, and present values.',
    storagePath: 'curriculum/general_math/genmath_q2_mod1_simpleandcompoundinterests_v2.pdf',
    sourceFile: 'genmath_q2_mod1_simpleandcompoundinterests_v2.pdf',
  },
  {
    lessonId: 'gm-q2-ci-2',
    lessonTitle: 'Solve real-life problems involving maturity value and present value of simple and compound interests.',
    moduleId: 'gm-q2-compound-interest',
    subjectId: 'gen-math',
    subject: 'General Mathematics',
    quarter: 2,
    competencyCode: 'GM11-Q2-CI-2',
    learningCompetency: 'Solve real-life problems involving maturity value and present value of simple and compound interests.',
    storagePath: 'curriculum/general_math/genmath_q2_mod2_interestmaturityfutureandpresentvaluesinsimpleandcompoundinterests_v2.pdf',
    sourceFile: 'genmath_q2_mod2_interestmaturityfutureandpresentvaluesinsimpleandcompoundinterests_v2.pdf',
  },
  {
    lessonId: 'gm-q2-ann-1',
    lessonTitle: 'Illustrate and calculate future and present values of simple and general annuities.',
    moduleId: 'gm-q2-annuities',
    subjectId: 'gen-math',
    subject: 'General Mathematics',
    quarter: 2,
    competencyCode: 'GM11-Q2-ANN-1',
    learningCompetency: 'Illustrate and calculate future and present values of simple and general annuities.',
    storagePath: 'curriculum/general_math/genmath_q2_mod4_simpleandgeneralannuities_v2.pdf',
    sourceFile: 'genmath_q2_mod4_simpleandgeneralannuities_v2.pdf',
  },

  // =========================================================================
  // Quarter 3: General Mathematics (SSHS Learning Resources)
  // =========================================================================
  {
    lessonId: 'gm-q3-bt-1',
    lessonTitle: 'Apply trigonometric ratios to solve angle and distance problems.',
    moduleId: 'gm-q3-basic-trigonometry',
    subjectId: 'gen-math',
    subject: 'General Mathematics',
    quarter: 3,
    competencyCode: 'GM11-BT-1',
    learningCompetency: 'Apply trigonometric ratios to solve angle and distance problems.',
    storagePath: 'curriculum/sshs_learning_resources/General Mathematics/Quarter 3/Lesson Exemplars/PDF/SHS_GM_Q3_LE7.pdf',
    sourceFile: 'SHS_GM_Q3_LE7.pdf',
  },
  {
    lessonId: 'gm-q3-bt-2',
    lessonTitle: 'Interpret trigonometric results in measurement contexts.',
    moduleId: 'gm-q3-basic-trigonometry',
    subjectId: 'gen-math',
    subject: 'General Mathematics',
    quarter: 3,
    competencyCode: 'GM11-BT-2',
    learningCompetency: 'Interpret trigonometric results in measurement contexts.',
    storagePath: 'curriculum/sshs_learning_resources/General Mathematics/Quarter 3/Learning Activity Sheets/PDF/SHS_GM_Q3_LAS_LE7.pdf',
    sourceFile: 'SHS_GM_Q3_LAS_LE7.pdf',
  },
  {
    lessonId: 'gm-q3-pam-1',
    lessonTitle: 'Select and apply measurement methods in practical multi-step tasks.',
    moduleId: 'gm-q3-practical-applications-measurement',
    subjectId: 'gen-math',
    subject: 'General Mathematics',
    quarter: 3,
    competencyCode: 'GM11-PAM-1',
    learningCompetency: 'Select and apply measurement methods in practical multi-step tasks.',
    storagePath: 'curriculum/sshs_learning_resources/General Mathematics/Quarter 3/Lesson Exemplars/PDF/SHS_GM_Q3_LE8.pdf',
    sourceFile: 'SHS_GM_Q3_LE8.pdf',
  },
  {
    lessonId: 'gm-q3-pam-2',
    lessonTitle: 'Estimate uncertainty and communicate justified approximations.',
    moduleId: 'gm-q3-practical-applications-measurement',
    subjectId: 'gen-math',
    subject: 'General Mathematics',
    quarter: 3,
    competencyCode: 'GM11-PAM-2',
    learningCompetency: 'Estimate uncertainty and communicate justified approximations.',
    storagePath: 'curriculum/sshs_learning_resources/General Mathematics/Quarter 3/Learning Activity Sheets/PDF/SHS_GM_Q3_LAS_LE8.pdf',
    sourceFile: 'SHS_GM_Q3_LAS_LE8.pdf',
  },
  {
    lessonId: 'gm-q3-tgvc-1',
    lessonTitle: 'Analyze geometric transformations in patterned and engineered layouts.',
    moduleId: 'gm-q3-transformational-geometry-volume-capacity',
    subjectId: 'gen-math',
    subject: 'General Mathematics',
    quarter: 3,
    competencyCode: 'GM11-TGVC-1',
    learningCompetency: 'Analyze geometric transformations in patterned and engineered layouts.',
    storagePath: 'curriculum/sshs_learning_resources/General Mathematics/Quarter 3/Lesson Exemplars/PDF/SHS_GM_Q3_LE8.pdf',
    sourceFile: 'SHS_GM_Q3_LE8.pdf',
  },
  {
    lessonId: 'gm-q3-tgvc-2',
    lessonTitle: 'Compute volume and capacity for practical container and space tasks.',
    moduleId: 'gm-q3-transformational-geometry-volume-capacity',
    subjectId: 'gen-math',
    subject: 'General Mathematics',
    quarter: 3,
    competencyCode: 'GM11-TGVC-2',
    learningCompetency: 'Compute volume and capacity for practical container and space tasks.',
    storagePath: 'curriculum/sshs_learning_resources/General Mathematics/Quarter 3/Lesson Exemplars/PDF/SHS_GM_Q3_LE8.pdf',
    sourceFile: 'SHS_GM_Q3_LE8.pdf',
  },
  {
    lessonId: 'gm-q3-rvs-1',
    lessonTitle: 'Define random variables and compute basic expected outcomes.',
    moduleId: 'gm-q3-random-variables-sampling',
    subjectId: 'gen-math',
    subject: 'General Mathematics',
    quarter: 3,
    competencyCode: 'GM11-RVS-1',
    learningCompetency: 'Define random variables and compute basic expected outcomes.',
    storagePath: 'curriculum/sshs_learning_resources/General Mathematics/Quarter 3/Lesson Exemplars/PDF/SHS_GM_Q3_LE9.pdf',
    sourceFile: 'SHS_GM_Q3_LE9.pdf',
  },
  {
    lessonId: 'gm-q3-rvs-2',
    lessonTitle: 'Explain sampling methods and sampling bias in practical studies.',
    moduleId: 'gm-q3-random-variables-sampling',
    subjectId: 'gen-math',
    subject: 'General Mathematics',
    quarter: 3,
    competencyCode: 'GM11-RVS-2',
    learningCompetency: 'Explain sampling methods and sampling bias in practical studies.',
    storagePath: 'curriculum/sshs_learning_resources/General Mathematics/Quarter 3/Lesson Exemplars/PDF/SHS_GM_Q3_LE9.pdf',
    sourceFile: 'SHS_GM_Q3_LE9.pdf',
  },
  {
    lessonId: 'gm-q3-rvs-3',
    lessonTitle: 'Interpret sampling outcomes in context.',
    moduleId: 'gm-q3-random-variables-sampling',
    subjectId: 'gen-math',
    subject: 'General Mathematics',
    quarter: 3,
    competencyCode: 'GM11-RVS-3',
    learningCompetency: 'Interpret sampling outcomes in context.',
    storagePath: 'curriculum/sshs_learning_resources/General Mathematics/Quarter 3/Learning Activity Sheets/PDF/SHS_GM_Q3_LAS_LE9.pdf',
    sourceFile: 'SHS_GM_Q3_LAS_LE9.pdf',
  },

  // =========================================================================
  // Quarter 4: General Mathematics (SSHS Learning Resources)
  // =========================================================================
  {
    lessonId: 'gm-q4-cial-1',
    lessonTitle: 'Compute and compare compound interest outcomes across periods and rates.',
    moduleId: 'gm-q4-compound-interest-annuities-loans',
    subjectId: 'gen-math',
    subject: 'General Mathematics',
    quarter: 4,
    competencyCode: 'GM11-CIAL-1',
    learningCompetency: 'Compute and compare compound interest outcomes across periods and rates.',
    storagePath: 'curriculum/sshs_learning_resources/General Mathematics/Quarter 4/Lesson Exemplars/PDF/SHS_GM_Q4_LE10.pdf',
    sourceFile: 'SHS_GM_Q4_LE10.pdf',
  },
  {
    lessonId: 'gm-q4-cial-2',
    lessonTitle: 'Model annuity and loan payment structures for planning decisions.',
    moduleId: 'gm-q4-compound-interest-annuities-loans',
    subjectId: 'gen-math',
    subject: 'General Mathematics',
    quarter: 4,
    competencyCode: 'GM11-CIAL-2',
    learningCompetency: 'Model annuity and loan payment structures for planning decisions.',
    storagePath: 'curriculum/sshs_learning_resources/General Mathematics/Quarter 4/Lesson Exemplars/PDF/SHS_GM_Q4_LE10.pdf',
    sourceFile: 'SHS_GM_Q4_LE10.pdf',
  },
  {
    lessonId: 'gm-q4-cial-3',
    lessonTitle: 'Assess affordability and sustainability of borrowing plans.',
    moduleId: 'gm-q4-compound-interest-annuities-loans',
    subjectId: 'gen-math',
    subject: 'General Mathematics',
    quarter: 4,
    competencyCode: 'GM11-CIAL-3',
    learningCompetency: 'Assess affordability and sustainability of borrowing plans.',
    storagePath: 'curriculum/sshs_learning_resources/General Mathematics/Quarter 4/Learning Activity Sheets/PDF/SHS_GM_Q4_LAS_LE10.pdf',
    sourceFile: 'SHS_GM_Q4_LAS_LE10.pdf',
  },
  {
    lessonId: 'gm-q4-htr-1',
    lessonTitle: 'Formulate and interpret hypotheses using context-appropriate tests.',
    moduleId: 'gm-q4-hypothesis-testing-regression',
    subjectId: 'gen-math',
    subject: 'General Mathematics',
    quarter: 4,
    competencyCode: 'GM11-HTR-1',
    learningCompetency: 'Formulate and interpret hypotheses using context-appropriate tests.',
    storagePath: 'curriculum/sshs_learning_resources/General Mathematics/Quarter 4/Lesson Exemplars/PDF/SHS_GM_Q4_LE11.pdf',
    sourceFile: 'SHS_GM_Q4_LE11.pdf',
  },
  {
    lessonId: 'gm-q4-htr-2',
    lessonTitle: 'Develop and interpret regression models for trend analysis.',
    moduleId: 'gm-q4-hypothesis-testing-regression',
    subjectId: 'gen-math',
    subject: 'General Mathematics',
    quarter: 4,
    competencyCode: 'GM11-HTR-2',
    learningCompetency: 'Develop and interpret regression models for trend analysis.',
    storagePath: 'curriculum/sshs_learning_resources/General Mathematics/Quarter 4/Lesson Exemplars/PDF/SHS_GM_Q4_LE11.pdf',
    sourceFile: 'SHS_GM_Q4_LE11.pdf',
  },
  {
    lessonId: 'gm-q4-psf-1',
    lessonTitle: 'Translate statements into logical propositions and evaluate validity.',
    moduleId: 'gm-q4-propositions-syllogisms-fallacies',
    subjectId: 'gen-math',
    subject: 'General Mathematics',
    quarter: 4,
    competencyCode: 'GM11-PSF-1',
    learningCompetency: 'Translate statements into logical propositions and evaluate validity.',
    storagePath: 'curriculum/sshs_learning_resources/General Mathematics/Quarter 4/Lesson Exemplars/PDF/SHS_GM_Q4_LE12.pdf',
    sourceFile: 'SHS_GM_Q4_LE12.pdf',
  },
  {
    lessonId: 'gm-q4-psf-2',
    lessonTitle: 'Test syllogistic arguments and identify common fallacies.',
    moduleId: 'gm-q4-propositions-syllogisms-fallacies',
    subjectId: 'gen-math',
    subject: 'General Mathematics',
    quarter: 4,
    competencyCode: 'GM11-PSF-2',
    learningCompetency: 'Test syllogistic arguments and identify common fallacies.',
    storagePath: 'curriculum/sshs_learning_resources/General Mathematics/Quarter 4/Lesson Exemplars/PDF/SHS_GM_Q4_LE12.pdf',
    sourceFile: 'SHS_GM_Q4_LE12.pdf',
  },
  {
    lessonId: 'gm-q4-psf-3',
    lessonTitle: 'Construct sound arguments supported by formal reasoning.',
    moduleId: 'gm-q4-propositions-syllogisms-fallacies',
    subjectId: 'gen-math',
    subject: 'General Mathematics',
    quarter: 4,
    competencyCode: 'GM11-PSF-3',
    learningCompetency: 'Construct sound arguments supported by formal reasoning.',
    storagePath: 'curriculum/sshs_learning_resources/General Mathematics/Quarter 4/Learning Activity Sheets/PDF/SHS_GM_Q4_LAS_LE12.pdf',
    sourceFile: 'SHS_GM_Q4_LAS_LE12.pdf',
  },

  // =========================================================================
  // Business Mathematics (Core Curriculum)
  // =========================================================================
  {
    lessonId: 'bm-q1-1',
    lessonTitle: 'Translate verbal phrases to mathematical expressions; model business scenarios using linear equations and inequalities.',
    moduleId: 'bm-q1-business-math',
    subjectId: 'business-math',
    subject: 'Business Mathematics',
    quarter: 1,
    competencyCode: 'ABM_BM11BS-Ia-b-1',
    learningCompetency: 'Translate verbal phrases to mathematical expressions; model business scenarios using linear equations and inequalities.',
    storagePath: 'curriculum/sshs_learning_resources/General Mathematics/Complete Course (Term 1)/PDF/General Mathematics_LE.pdf',
    sourceFile: 'General Mathematics_LE.pdf',
  },

  // =========================================================================
  // Statistics and Probability (SSHS & Core Curriculum)
  // =========================================================================
  {
    lessonId: 'stat-q1-1',
    lessonTitle: 'Define and describe random variables and their types.',
    moduleId: 'stat-q1-probability',
    subjectId: 'stats-prob',
    subject: 'Statistics and Probability',
    quarter: 1,
    competencyCode: 'SP_SHS11-Ia-1',
    learningCompetency: 'Define and describe random variables and their types.',
    storagePath: 'curriculum/stat_prob/Full.pdf',
    sourceFile: 'Full.pdf',
  },
  {
    lessonId: 'stat-q1-2',
    lessonTitle: 'Calculate mean, variance, and standard deviation of discrete random variables.',
    moduleId: 'stat-q1-probability',
    subjectId: 'stats-prob',
    subject: 'Statistics and Probability',
    quarter: 1,
    competencyCode: 'SP_SHS11-Ia-2',
    learningCompetency: 'Calculate mean, variance, and standard deviation of discrete random variables.',
    storagePath: 'curriculum/stat_prob/Full.pdf',
    sourceFile: 'Full.pdf',
  },
  {
    lessonId: 'stat-q1-3',
    lessonTitle: 'Illustrate normal distributions and compute standard probabilities using z-scores.',
    moduleId: 'stat-q1-probability',
    subjectId: 'stats-prob',
    subject: 'Statistics and Probability',
    quarter: 1,
    competencyCode: 'SP_SHS11-Ia-3',
    learningCompetency: 'Illustrate normal distributions and compute standard probabilities using z-scores.',
    storagePath: 'curriculum/stat_prob/Full.pdf',
    sourceFile: 'Full.pdf',
  },
  {
    lessonId: 'stat-q1-4',
    lessonTitle: 'Illustrate the Central Limit Theorem and apply sampling distribution theory.',
    moduleId: 'stat-q1-probability',
    subjectId: 'stats-prob',
    subject: 'Statistics and Probability',
    quarter: 1,
    competencyCode: 'SP_SHS11-Ia-4',
    learningCompetency: 'Illustrate the Central Limit Theorem and apply sampling distribution theory.',
    storagePath: 'curriculum/stat_prob/Full.pdf',
    sourceFile: 'Full.pdf',
  },

  // =========================================================================
  // Finite Mathematics (SSHS Learning Resources)
  // =========================================================================
  {
    lessonId: 'fm-q1-1',
    lessonTitle: 'Systems of Linear Equations and Matrix Operations',
    moduleId: 'fm-q1-finite-math',
    subjectId: 'finite-math',
    subject: 'Finite Mathematics',
    quarter: 1,
    competencyCode: 'FM11-MS-1',
    learningCompetency: 'Model and solve systems of linear equations using matrix representations and operations.',
    storagePath: 'curriculum/sshs_learning_resources/Finite Mathematics/Finite Math 1/PDF/Finite Math 1_LE.pdf',
    sourceFile: 'Finite Math 1_LE.pdf',
  },
  {
    lessonId: 'fm-q2-1',
    lessonTitle: 'Linear Optimization and Simplex Algorithm',
    moduleId: 'fm-q2-finite-math',
    subjectId: 'finite-math',
    subject: 'Finite Mathematics',
    quarter: 2,
    competencyCode: 'FM11-LP-1',
    learningCompetency: 'Solve real-world optimization problems using geometric methods and the simplex algorithm.',
    storagePath: 'curriculum/sshs_learning_resources/Finite Mathematics/Finite Math 2/PDF/Finite Math 2_LE.pdf',
    sourceFile: 'Finite Math 2_LE.pdf',
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