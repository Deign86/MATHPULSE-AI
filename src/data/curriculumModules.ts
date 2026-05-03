import type { Module, Lesson } from './subjects';
import { CURRICULUM_LESSONS } from './curriculum/types';

export type GradeLevel = 'Grade 11' | 'Grade 12';
export type CurriculumQuarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';
export type CurriculumSubjectId =
  | 'gen-math'
  | 'finite-math-1'
  | 'finite-math-2'
  | 'business-math'
  | 'stats-prob'
  | 'org-mgmt';

const COMPETENCY_TO_LESSON: Record<string, { lessonId: string; storagePath: string; sourceFile: string }> =
  Object.fromEntries(
    CURRICULUM_LESSONS.map((l) => [
      l.competencyCode,
      { lessonId: l.lessonId, storagePath: l.storagePath, sourceFile: l.sourceFile },
    ])
  );

export interface CurriculumSourceMeta {
  id: string;
  title: string;
  url: string;
}

export interface CurriculumAssessmentMeta {
  id: string;
  title: string;
  competencyCodes: string[];
  type: 'practice' | 'module';
}

export interface CurriculumModuleBlueprint {
  id: string;
  subjectId: CurriculumSubjectId;
  subject: string;
  quarter: CurriculumQuarter;
  moduleTitle: string;
  moduleDescription: string;
  contentDomain: string;
  competencyGroup: string;
  competencies: Array<{
    code: string;
    outcome: string;
  }>;
  performanceStandard: string;
  realWorldTheme: string;
  grade_level_availability: GradeLevel[];
  recommended_grade_level: GradeLevel;
  sources: CurriculumSourceMeta[];
}

export type CurriculumModuleRuntime = Module & {
  subjectId: CurriculumSubjectId;
  subject: string;
  subjectColor: string;
  subjectAccentColor: string;
  grade_level_availability: GradeLevel[];
  recommended_grade_level: GradeLevel;
  active_grade_level: GradeLevel;
  quarter: CurriculumQuarter;
  content_domain: string;
  competency_group: string;
  competencies: Array<{ code: string; outcome: string }>;
  performance_standard: string;
  real_world_theme: string;
  lesson_count: number;
  quiz_count: number;
  is_visible_for_grade: boolean;
  curriculum_aligned_label: string;
  module_sources: CurriculumSourceMeta[];
  module_assessments: CurriculumAssessmentMeta[];
};

interface SubjectMeta {
  id: CurriculumSubjectId;
  label: string;
  color: string;
  accent: string;
}

const CURRICULUM_SOURCES: CurriculumSourceMeta[] = [
  {
    id: 'deped-strengthened-gm',
    title: 'DepEd Strengthened SHS General Mathematics Guide',
    url: 'https://www.deped.gov.ph/',
  },
  {
    id: 'deped-strengthened-fm1',
    title: 'DepEd Strengthened SHS Finite Mathematics 1 Guide',
    url: 'https://www.deped.gov.ph/',
  },
  {
    id: 'deped-strengthened-fm2',
    title: 'DepEd Strengthened SHS Finite Mathematics 2 Guide',
    url: 'https://www.deped.gov.ph/',
  },
  {
    id: 'deped-approved-exemplars',
    title: 'Approved SHS Lesson Exemplars and Activity Sheets',
    url: 'https://www.deped.gov.ph/',
  },
];

const SUBJECT_META: Record<CurriculumSubjectId, SubjectMeta> = {
  'gen-math': {
    id: 'gen-math',
    label: 'General Mathematics',
    color: '#1f4ea8',
    accent: '#3f7cff',
  },
  'finite-math-1': {
    id: 'finite-math-1',
    label: 'Finite Mathematics 1',
    color: '#8a3a0f',
    accent: '#d97706',
  },
  'finite-math-2': {
    id: 'finite-math-2',
    label: 'Finite Mathematics 2',
    color: '#0f766e',
    accent: '#14b8a6',
  },
  'business-math': {
    id: 'business-math',
    label: 'Business Mathematics',
    color: '#166534',
    accent: '#22c55e',
  },
  'stats-prob': {
    id: 'stats-prob',
    label: 'Statistics and Probability',
    color: '#6b21a8',
    accent: '#a855f7',
  },
  'org-mgmt': {
    id: 'org-mgmt',
    label: 'Organization and Management',
    color: '#9f1239',
    accent: '#f43f5e',
  },
};

const SCHOOL_PROGRAM_DEFAULT_SUBJECTS_BY_GRADE: Record<GradeLevel, CurriculumSubjectId[]> = {
  'Grade 11': ['gen-math', 'finite-math-1', 'finite-math-2'],
  'Grade 12': ['finite-math-1', 'finite-math-2'],
};

const COMPETENCY_VERBS_G11 = 'Foundational competency flow with guided examples, step-by-step vocabulary support, and scaffolded checkpoints.';
const COMPETENCY_VERBS_G12 = 'Application-first flow with concise explanations, independent reasoning tasks, and decision-making scenarios.';

const b = (
  id: string,
  subjectId: CurriculumSubjectId,
  quarter: CurriculumQuarter,
  moduleTitle: string,
  moduleDescription: string,
  contentDomain: string,
  competencyGroup: string,
  competencies: Array<{ code: string; outcome: string }>,
  performanceStandard: string,
  realWorldTheme: string,
  grade_level_availability: GradeLevel[],
  recommended_grade_level: GradeLevel,
): CurriculumModuleBlueprint => ({
  id,
  subjectId,
  subject: SUBJECT_META[subjectId].label,
  quarter,
  moduleTitle,
  moduleDescription,
  contentDomain,
  competencyGroup,
  competencies,
  performanceStandard,
  realWorldTheme,
  grade_level_availability,
  recommended_grade_level,
  sources: [
    CURRICULUM_SOURCES[subjectId === 'gen-math' ? 0 : subjectId === 'finite-math-1' ? 1 : 2],
    CURRICULUM_SOURCES[3],
  ],
});

export const CURRICULUM_MODULE_BLUEPRINTS: CurriculumModuleBlueprint[] = [
  b('gm-q1-business-finance', 'gen-math', 'Q1', 'Business and Finance', 'Interpret business contexts using mathematical models for pricing, savings, and financial planning.', 'Business Mathematics', 'GM-Q1-BF', [
    { code: 'GM11-BF-1', outcome: 'Represent business transactions and financial goals using variables and equations.' },
    { code: 'GM11-BF-2', outcome: 'Analyze financial options using ratio, percent change, and margin reasoning.' },
    { code: 'GM11-BF-3', outcome: 'Justify practical decisions with mathematically sound comparisons.' },
  ], 'Produces a finance decision brief that explains and defends a chosen option using quantitative evidence.', 'Household budgeting and MSME pricing', ['Grade 11'], 'Grade 11'),
  b('gm-q1-patterns-sequences-series', 'gen-math', 'Q1', 'Patterns, Sequences, and Series', 'Investigate arithmetic and geometric patterns, then model recurring structures in real settings.', 'Patterns and Algebraic Thinking', 'GM-Q1-PSS', [
    { code: 'GM11-PSS-1', outcome: 'Identify and describe arithmetic and geometric patterns in data.' },
    { code: 'GM11-PSS-2', outcome: 'Construct explicit and recursive rules for sequences.' },
    { code: 'GM11-PSS-3', outcome: 'Solve contextual problems involving finite series.' },
  ], 'Creates a pattern model with formula, table, and verbal interpretation for a real-life process.', 'Savings goals and production growth', ['Grade 11'], 'Grade 11'),
  b('gm-q1-financial-application-sequences-series', 'gen-math', 'Q1', 'Financial Application of Sequences and Series', 'Apply sequence and series models in annuities, installment planning, and long-term savings behavior.', 'Financial Applications', 'GM-Q1-FASS', [
    { code: 'GM11-FASS-1', outcome: 'Use arithmetic and geometric series to estimate cumulative financial outcomes.' },
    { code: 'GM11-FASS-2', outcome: 'Compare payment plans and saving schemes using sequence-based models.' },
  ], 'Builds a comparative recommendation report for financial plans grounded in sequence and series computations.', 'Installment plans and savings projections', ['Grade 11'], 'Grade 11'),
  b('gm-q2-measurement-conversion', 'gen-math', 'Q2', 'Measurement and Conversion', 'Convert and validate units in practical settings involving length, area, volume, and rate.', 'Measurement', 'GM-Q2-MC', [
    { code: 'GM11-MC-1', outcome: 'Perform unit conversions accurately across metric and mixed contexts.' },
    { code: 'GM11-MC-2', outcome: 'Evaluate measurement precision and reasonableness in applied tasks.' },
  ], 'Produces an accurate conversion workflow with checks for reasonableness and precision.', 'Construction estimates and food production', ['Grade 11'], 'Grade 11'),
  b('gm-q2-functions-graphs', 'gen-math', 'Q2', 'Functions and Their Graphs', 'Model relationships using function notation, tables, and graphs to explain changing quantities.', 'Functions', 'GM-Q2-FG', [
    { code: 'GM11-FG-1', outcome: 'Represent real-life relationships as functions and interpret domain/range.' },
    { code: 'GM11-FG-2', outcome: 'Analyze function behavior from tables, equations, and graphs.' },
    { code: 'GM11-FG-3', outcome: 'Use graph interpretation to support contextual conclusions.' },
  ], 'Submits a function modeling portfolio with equation selection and graph-based interpretation.', 'Transport fare, utility consumption, and growth trends', ['Grade 11'], 'Grade 11'),
  b('gm-q2-piecewise-functions', 'gen-math', 'Q2', 'Piecewise Functions', 'Use piecewise definitions to model tiered pricing, conditional rates, and policy thresholds.', 'Functions', 'GM-Q2-PF', [
    { code: 'GM11-PF-1', outcome: 'Translate threshold-based scenarios into piecewise functions.' },
    { code: 'GM11-PF-2', outcome: 'Evaluate and graph piecewise functions for decision-making.' },
  ], 'Constructs and defends a piecewise model for a threshold-driven policy scenario.', 'Electricity billing tiers and shipping rates', ['Grade 11'], 'Grade 11'),
  b('gm-q2-statistical-variables', 'gen-math', 'Q2', 'Statistical Variables', 'Differentiate variable types and build data representations suitable for statistical analysis.', 'Data and Statistics', 'GM-Q2-SV', [
    { code: 'GM11-SV-1', outcome: 'Classify variables and choose appropriate data representations.' },
    { code: 'GM11-SV-2', outcome: 'Interpret variable distributions and detect potential data issues.' },
  ], 'Prepares a data profile report with justified variable treatment and representation choices.', 'School survey dashboards', ['Grade 11'], 'Grade 11'),
  b('gm-q3-basic-trigonometry', 'gen-math', 'Q3', 'Basic Trigonometry', 'Solve right-triangle and angle problems using trigonometric ratios in practical contexts.', 'Geometry and Trigonometry', 'GM-Q3-BT', [
    { code: 'GM11-BT-1', outcome: 'Apply trigonometric ratios to solve angle and distance problems.' },
    { code: 'GM11-BT-2', outcome: 'Interpret trigonometric results in measurement contexts.' },
  ], 'Creates a field-measurement solution set that justifies method and interpretation.', 'Building height and slope analysis', ['Grade 11'], 'Grade 11'),
  b('gm-q3-practical-applications-measurement', 'gen-math', 'Q3', 'Practical Applications of Measurement', 'Integrate measurement methods to solve multi-step tasks in planning, costing, and logistics.', 'Measurement Applications', 'GM-Q3-PAM', [
    { code: 'GM11-PAM-1', outcome: 'Select and apply measurement methods in practical multi-step tasks.' },
    { code: 'GM11-PAM-2', outcome: 'Estimate uncertainty and communicate justified approximations.' },
  ], 'Delivers a practical measurement plan with justified estimates and assumptions.', 'Project costing and logistics planning', ['Grade 11'], 'Grade 11'),
  b('gm-q3-transformational-geometry-volume-capacity', 'gen-math', 'Q3', 'Transformational Geometry / Volume and Capacity', 'Use geometric transformations and solid measurement to solve design and storage problems.', 'Geometry', 'GM-Q3-TGVC', [
    { code: 'GM11-TGVC-1', outcome: 'Analyze geometric transformations in patterned and engineered layouts.' },
    { code: 'GM11-TGVC-2', outcome: 'Compute volume and capacity for practical container and space tasks.' },
  ], 'Produces a geometry-based layout and capacity justification for a real constraint.', 'Packaging and facility layout', ['Grade 11'], 'Grade 11'),
  b('gm-q3-random-variables-sampling', 'gen-math', 'Q3', 'Random Variables and Sampling', 'Model uncertainty and sampling behavior to support evidence-based conclusions.', 'Probability and Sampling', 'GM-Q3-RVS', [
    { code: 'GM11-RVS-1', outcome: 'Define random variables and compute basic expected outcomes.' },
    { code: 'GM11-RVS-2', outcome: 'Explain sampling methods and sampling bias in practical studies.' },
    { code: 'GM11-RVS-3', outcome: 'Interpret sampling outcomes in context.' },
  ], 'Presents a sampling design and interpretation memo for a study question.', 'Consumer preference and public opinion studies', ['Grade 11'], 'Grade 11'),
  b('gm-q4-compound-interest-annuities-loans', 'gen-math', 'Q4', 'Compound Interest, Annuities, and Loans', 'Evaluate long-term financial commitments using compound growth and annuity structures.', 'Financial Mathematics', 'GM-Q4-CIAL', [
    { code: 'GM11-CIAL-1', outcome: 'Compute and compare compound interest outcomes across periods and rates.' },
    { code: 'GM11-CIAL-2', outcome: 'Model annuity and loan payment structures for planning decisions.' },
    { code: 'GM11-CIAL-3', outcome: 'Assess affordability and sustainability of borrowing plans.' },
  ], 'Builds a defensible personal finance plan covering savings and borrowing scenarios.', 'Education financing and long-term savings', ['Grade 11'], 'Grade 11'),
  b('gm-q4-hypothesis-testing-regression', 'gen-math', 'Q4', 'Hypothesis Testing and Regression', 'Use inferential reasoning and regression modeling to evaluate data-driven claims.', 'Statistics', 'GM-Q4-HTR', [
    { code: 'GM11-HTR-1', outcome: 'Formulate and interpret hypotheses using context-appropriate tests.' },
    { code: 'GM11-HTR-2', outcome: 'Develop and interpret regression models for trend analysis.' },
  ], 'Produces an evidence report with hypothesis decision and regression-backed interpretation.', 'School performance and market trend analysis', ['Grade 11'], 'Grade 11'),
  b('gm-q4-propositions-syllogisms-fallacies', 'gen-math', 'Q4', 'Logical Propositions, Syllogisms, and Fallacies', 'Evaluate arguments using formal logic, syllogistic forms, and fallacy detection.', 'Logic and Reasoning', 'GM-Q4-PSF', [
    { code: 'GM11-PSF-1', outcome: 'Translate statements into logical propositions and evaluate validity.' },
    { code: 'GM11-PSF-2', outcome: 'Test syllogistic arguments and identify common fallacies.' },
    { code: 'GM11-PSF-3', outcome: 'Construct sound arguments supported by formal reasoning.' },
  ], 'Submits a logic audit that classifies validity and fallacies in real arguments.', 'Media literacy and policy argument review', ['Grade 11'], 'Grade 11'),

  b('fm1-q1-symmetry-nature-art', 'finite-math-1', 'Q1', 'Symmetry in Nature and Art', 'Analyze reflective, rotational, and translational symmetry in natural and cultural patterns.', 'Patterns and Symmetry', 'FM1-Q1-SNA', [
    { code: 'FM1-SNA-1', outcome: 'Identify and classify symmetry types in real and artistic objects.' },
    { code: 'FM1-SNA-2', outcome: 'Explain the role of symmetry in design and communication.' },
  ], 'Creates a symmetry-based design critique grounded in mathematical language.', 'Textile and local design patterns', ['Grade 11', 'Grade 12'], 'Grade 11'),
  b('fm1-q1-geometric-transformations', 'finite-math-1', 'Q1', 'Geometric Transformations', 'Model geometric change through translation, reflection, rotation, and dilation.', 'Transformations', 'FM1-Q1-GT', [
    { code: 'FM1-GT-1', outcome: 'Perform and describe geometric transformations in coordinate form.' },
    { code: 'FM1-GT-2', outcome: 'Compose transformations to solve design and location problems.' },
  ], 'Produces a transformation sequence with rule-based justification.', 'Mapping and graphics layouts', ['Grade 11', 'Grade 12'], 'Grade 11'),
  b('fm1-q1-tessellations-frieze-patterns', 'finite-math-1', 'Q1', 'Tessellations and Frieze Patterns', 'Build repeatable tiling and frieze systems using transformation logic.', 'Transformations', 'FM1-Q1-TFP', [
    { code: 'FM1-TFP-1', outcome: 'Construct valid tessellations with geometric constraints.' },
    { code: 'FM1-TFP-2', outcome: 'Analyze frieze pattern structure and transformation rules.' },
  ], 'Designs and documents a mathematically valid tiling pattern.', 'Architecture and floor planning', ['Grade 11', 'Grade 12'], 'Grade 11'),
  b('fm1-q1-golden-ratio-fibonacci', 'finite-math-1', 'Q1', 'Golden Ratio and Fibonacci Sequence', 'Connect ratio growth patterns and Fibonacci behavior in visual and biological forms.', 'Patterns and Sequences', 'FM1-Q1-GRF', [
    { code: 'FM1-GRF-1', outcome: 'Generate Fibonacci terms and model limiting ratio behavior.' },
    { code: 'FM1-GRF-2', outcome: 'Critique claims of golden ratio usage in practical contexts.' },
  ], 'Presents an evidence-based analysis of ratio claims in selected artifacts.', 'Visual composition and growth modeling', ['Grade 11', 'Grade 12'], 'Grade 11'),
  b('fm1-q1-fractals', 'finite-math-1', 'Q1', 'Fractals', 'Investigate recursive structures and scale behavior in natural and digital systems.', 'Patterns and Recursion', 'FM1-Q1-FRA', [
    { code: 'FM1-FRA-1', outcome: 'Describe fractal properties and recursive generation rules.' },
    { code: 'FM1-FRA-2', outcome: 'Interpret scale and complexity in fractal-based contexts.' },
  ], 'Constructs and explains a recursive pattern artifact.', 'Coastline modeling and visual computing', ['Grade 11', 'Grade 12'], 'Grade 11'),
  b('fm1-q2-matrices-basic-operations', 'finite-math-1', 'Q2', 'Matrices and Basic Operations', 'Use matrices to represent and operate on structured numerical information.', 'Linear Systems', 'FM1-Q2-MBO', [
    { code: 'FM1-MBO-1', outcome: 'Represent contextual data using matrix notation.' },
    { code: 'FM1-MBO-2', outcome: 'Perform and interpret matrix operations in applications.' },
  ], 'Builds a matrix-based model to summarize and compare structured data.', 'Inventory and scheduling models', ['Grade 11', 'Grade 12'], 'Grade 11'),
  b('fm1-q2-row-operations-systems', 'finite-math-1', 'Q2', 'Elementary Row Operations and Systems of Equations', 'Solve systems using row operations and interpret solution sets in context.', 'Linear Systems', 'FM1-Q2-EROS', [
    { code: 'FM1-EROS-1', outcome: 'Apply elementary row operations to transform augmented matrices.' },
    { code: 'FM1-EROS-2', outcome: 'Interpret unique, infinite, and no-solution outcomes.' },
  ], 'Submits a systems-solving workflow with contextual interpretation.', 'Resource allocation and production planning', ['Grade 11', 'Grade 12'], 'Grade 11'),
  b('fm1-q2-determinants-cramers-rule', 'finite-math-1', 'Q2', 'Determinants and Cramer\'s Rule', 'Compute determinants and use Cramer\'s Rule when solution conditions are satisfied.', 'Linear Systems', 'FM1-Q2-DCR', [
    { code: 'FM1-DCR-1', outcome: 'Compute determinants and explain determinant meaning.' },
    { code: 'FM1-DCR-2', outcome: 'Apply Cramer\'s Rule and evaluate method appropriateness.' },
  ], 'Creates a method comparison note for solving linear systems.', 'Engineering design constraints', ['Grade 11', 'Grade 12'], 'Grade 11'),
  b('fm1-q2-linear-programming', 'finite-math-1', 'Q2', 'Linear Programming', 'Optimize objective functions under practical linear constraints.', 'Optimization', 'FM1-Q2-LP', [
    { code: 'FM1-LP-1', outcome: 'Model optimization problems with objective functions and constraints.' },
    { code: 'FM1-LP-2', outcome: 'Determine and justify optimal feasible solutions.' },
    { code: 'FM1-LP-3', outcome: 'Interpret optimization outcomes for decision-makers.' },
  ], 'Delivers an optimization recommendation memo with feasible-region reasoning.', 'Production and staffing optimization', ['Grade 11', 'Grade 12'], 'Grade 12'),

  b('fm2-q1-counting-principles', 'finite-math-2', 'Q1', 'Fundamental Principles of Counting', 'Apply counting rules to enumerate outcomes efficiently in structured tasks.', 'Combinatorics', 'FM2-Q1-FPC', [
    { code: 'FM2-FPC-1', outcome: 'Use multiplication and addition principles in counting tasks.' },
    { code: 'FM2-FPC-2', outcome: 'Model multi-stage counting with constraints.' },
  ], 'Creates a counting strategy guide with justifications for each case.', 'Event planning and scheduling', ['Grade 11', 'Grade 12'], 'Grade 11'),
  b('fm2-q1-permutations-combinations', 'finite-math-2', 'Q1', 'Permutations and Combinations', 'Differentiate arrangement and selection problems and solve each appropriately.', 'Combinatorics', 'FM2-Q1-PC', [
    { code: 'FM2-PC-1', outcome: 'Distinguish permutation vs combination problem structures.' },
    { code: 'FM2-PC-2', outcome: 'Compute and interpret permutation and combination results.' },
  ], 'Produces a problem classification and solution portfolio.', 'Selection committees and lineup design', ['Grade 11', 'Grade 12'], 'Grade 11'),
  b('fm2-q1-probability-events', 'finite-math-2', 'Q1', 'Probability of Events', 'Evaluate event likelihood using classical and empirical probability models.', 'Probability', 'FM2-Q1-PE', [
    { code: 'FM2-PE-1', outcome: 'Compute simple and compound event probabilities.' },
    { code: 'FM2-PE-2', outcome: 'Interpret probability results for practical uncertainty decisions.' },
  ], 'Builds a probability briefing for decision scenarios under risk.', 'Quality checks and risk estimation', ['Grade 11', 'Grade 12'], 'Grade 11'),
  b('fm2-q1-conditional-independent-events', 'finite-math-2', 'Q1', 'Conditional Probability and Independent Events', 'Use conditional structures and independence tests in chained event analysis.', 'Probability', 'FM2-Q1-CPIE', [
    { code: 'FM2-CPIE-1', outcome: 'Compute conditional probabilities using ratio and table methods.' },
    { code: 'FM2-CPIE-2', outcome: 'Test and explain event independence in context.' },
  ], 'Submits an uncertainty analysis showing dependency assumptions and consequences.', 'Medical screening and survey branching', ['Grade 11', 'Grade 12'], 'Grade 12'),
  b('fm2-q2-divisibility-prime-factorization', 'finite-math-2', 'Q2', 'Divisibility and Prime Factorization', 'Apply divisibility tests and prime decomposition in integer reasoning.', 'Number Theory', 'FM2-Q2-DPF', [
    { code: 'FM2-DPF-1', outcome: 'Apply divisibility rules and validate integer claims.' },
    { code: 'FM2-DPF-2', outcome: 'Use prime factorization to solve integer structure problems.' },
  ], 'Produces a number-structure explanation with verified factor methods.', 'Coding checks and numeric validation', ['Grade 11', 'Grade 12'], 'Grade 11'),
  b('fm2-q2-gcd-lcm-diophantine', 'finite-math-2', 'Q2', 'GCD, LCM, and Diophantine Equations', 'Solve integer relation tasks using gcd/lcm methods and linear Diophantine forms.', 'Number Theory', 'FM2-Q2-GLD', [
    { code: 'FM2-GLD-1', outcome: 'Find gcd and lcm efficiently for contextual timing/allocation tasks.' },
    { code: 'FM2-GLD-2', outcome: 'Solve and interpret linear Diophantine equations.' },
  ], 'Creates a whole-number feasibility report for constrained scenarios.', 'Cycle synchronization and packaging', ['Grade 11', 'Grade 12'], 'Grade 12'),
  b('fm2-q2-modular-arithmetic-applications', 'finite-math-2', 'Q2', 'Modular Arithmetic and Applications', 'Use modular systems to reason about cyclic structures and encoded operations.', 'Number Theory', 'FM2-Q2-MAA', [
    { code: 'FM2-MAA-1', outcome: 'Perform modular operations and congruence checks.' },
    { code: 'FM2-MAA-2', outcome: 'Apply modular reasoning to scheduling and encoding contexts.' },
  ], 'Develops a modular arithmetic solution brief for cyclic problems.', 'Time systems and basic cryptography', ['Grade 11', 'Grade 12'], 'Grade 12'),
  b('fm2-q2-graph-theory-basics', 'finite-math-2', 'Q2', 'Graph Theory Basics', 'Represent networks with graph models and analyze core graph properties.', 'Graph Theory', 'FM2-Q2-GTB', [
    { code: 'FM2-GTB-1', outcome: 'Model practical networks using vertices and edges.' },
    { code: 'FM2-GTB-2', outcome: 'Interpret graph degree, connectivity, and basic structures.' },
  ], 'Builds a network representation and interprets key graph metrics.', 'Transportation and communication networks', ['Grade 11', 'Grade 12'], 'Grade 11'),
  b('fm2-q2-eulerian-hamiltonian-paths-circuits', 'finite-math-2', 'Q2', 'Eulerian and Hamiltonian Paths and Circuits', 'Analyze traversal and route constraints in graph-based movement problems.', 'Graph Theory', 'FM2-Q2-EHPC', [
    { code: 'FM2-EHPC-1', outcome: 'Determine Eulerian path/circuit feasibility conditions.' },
    { code: 'FM2-EHPC-2', outcome: 'Evaluate Hamiltonian path/circuit opportunities in practical graphs.' },
  ], 'Presents a traversal feasibility analysis for a route-planning task.', 'Service routing and logistics', ['Grade 11', 'Grade 12'], 'Grade 12'),
  b('fm2-q2-spanning-trees-shortest-paths', 'finite-math-2', 'Q2', 'Spanning Trees and Shortest Paths', 'Optimize network connectivity and route length using standard graph algorithms.', 'Graph Theory and Optimization', 'FM2-Q2-STSP', [
    { code: 'FM2-STSP-1', outcome: 'Construct spanning trees to minimize connection cost.' },
    { code: 'FM2-STSP-2', outcome: 'Apply shortest-path reasoning for efficient routing decisions.' },
    { code: 'FM2-STSP-3', outcome: 'Compare alternative network designs using mathematical criteria.' },
  ], 'Submits an optimization recommendation for network deployment and routing.', 'Telecom rollout and delivery routing', ['Grade 11', 'Grade 12'], 'Grade 12'),
];

function adaptDescriptionForGrade(module: CurriculumModuleBlueprint, activeGradeLevel: GradeLevel): string {
  const gradeText = activeGradeLevel === 'Grade 11' ? COMPETENCY_VERBS_G11 : COMPETENCY_VERBS_G12;
  return `${module.moduleDescription} ${gradeText}`;
}

function makeLessons(module: CurriculumModuleBlueprint, activeGradeLevel: GradeLevel) {
  const duration = activeGradeLevel === 'Grade 11' ? '22 min' : '18 min';
  return module.competencies.map((competency, index) => {
    const curriculumMatch = COMPETENCY_TO_LESSON[competency.code];
    return {
      id: curriculumMatch?.lessonId ?? `${module.id}-l${index + 1}`,
      title: competency.outcome,
      duration,
      completed: false,
      locked: index > 0,
      description: `${competency.code} · ${competency.outcome}`,
      competencyCode: competency.code,
      subjectId: module.subjectId as Lesson['subjectId'],
      subject: module.subject,
      quarter: parseInt(module.quarter.replace('Q', '')),
      learningCompetency: competency.outcome,
      ...(curriculumMatch && {
        storagePath: curriculumMatch.storagePath,
        sourceFile: curriculumMatch.sourceFile,
      }),
    };
  });
}

function makeAssessments(module: CurriculumModuleBlueprint): CurriculumAssessmentMeta[] {
  const chunks: CurriculumAssessmentMeta[] = [];
  const chunkSize = 2;
  let chunkIndex = 0;

  for (let i = 0; i < module.competencies.length; i += chunkSize) {
    const subset = module.competencies.slice(i, i + chunkSize);
    chunkIndex += 1;
    chunks.push({
      id: `${module.id}-a${chunkIndex}`,
      title: `Competency Check ${chunkIndex}`,
      competencyCodes: subset.map((entry) => entry.code),
      type: chunkIndex === Math.ceil(module.competencies.length / chunkSize) ? 'module' : 'practice',
    });
  }

  return chunks;
}

function makeQuizzes(module: CurriculumModuleBlueprint, assessments: CurriculumAssessmentMeta[]) {
  return assessments.map((assessment, index) => ({
    id: `${module.id}-q${index + 1}`,
    title: assessment.title,
    questions: Math.max(8, assessment.competencyCodes.length * 5),
    duration: assessment.type === 'module' ? '22 min' : '15 min',
    completed: false,
    locked: index > 0,
    type: assessment.type,
  }));
}

function normalizeGradeLevel(rawGrade?: string | null): GradeLevel {
  const normalized = rawGrade?.trim().toLowerCase();
  if (normalized?.includes('12')) return 'Grade 12';
  return 'Grade 11';
}

function normalizeSubjectAssignments(assignedSubjects: string[] | undefined): CurriculumSubjectId[] | null {
  if (!Array.isArray(assignedSubjects) || assignedSubjects.length === 0) return null;
  const allowed = new Set<CurriculumSubjectId>([
    'gen-math',
    'finite-math-1',
    'finite-math-2',
    'business-math',
    'stats-prob',
    'org-mgmt',
  ]);
  const normalized = assignedSubjects
    .map((entry) => entry.trim().toLowerCase())
    .map((entry) => {
      if (entry === 'gen-math' || entry === 'general-mathematics' || entry === 'general mathematics') return 'gen-math';
      if (entry === 'finite-math-1' || entry === 'finite mathematics 1' || entry === 'fm1') return 'finite-math-1';
      if (entry === 'finite-math-2' || entry === 'finite mathematics 2' || entry === 'fm2') return 'finite-math-2';
      if (entry === 'business-math' || entry === 'business mathematics' || entry === 'bm') return 'business-math';
      if (entry === 'stats-prob' || entry === 'statistics and probability' || entry === 'statistics') return 'stats-prob';
      if (entry === 'org-mgmt' || entry === 'organization and management' || entry === 'abm') return 'org-mgmt';
      return null;
    })
    .filter((entry): entry is CurriculumSubjectId => entry !== null && allowed.has(entry));

  return normalized.length > 0 ? normalized : null;
}

export function resolveLearnerGradeLevel(rawGrade?: string | null): GradeLevel {
  return normalizeGradeLevel(rawGrade);
}

export function getCurriculumSubjectsForGrade(
  activeGradeLevel: GradeLevel,
  assignedSubjects?: string[],
): CurriculumSubjectId[] {
  const parsedAssignments = normalizeSubjectAssignments(assignedSubjects);
  const defaults = SCHOOL_PROGRAM_DEFAULT_SUBJECTS_BY_GRADE[activeGradeLevel];

  if (!parsedAssignments) {
    return defaults;
  }

  return defaults.filter((subjectId) => parsedAssignments.includes(subjectId));
}

export function getCurriculumModulesForLearner(
  activeGradeLevel: GradeLevel,
  assignedSubjects?: string[],
): CurriculumModuleRuntime[] {
  const visibleSubjects = getCurriculumSubjectsForGrade(activeGradeLevel, assignedSubjects);

  return CURRICULUM_MODULE_BLUEPRINTS
    .filter((module) => module.grade_level_availability.includes(activeGradeLevel))
    .filter((module) => visibleSubjects.includes(module.subjectId))
    .map((module) => {
      const assessments = makeAssessments(module);
      const lessons = makeLessons(module, activeGradeLevel);
      const quizzes = makeQuizzes(module, assessments);
      const subjectMeta = SUBJECT_META[module.subjectId];

      return {
        id: module.id,
        title: module.moduleTitle,
        description: adaptDescriptionForGrade(module, activeGradeLevel),
        lessons,
        quizzes,
        progress: 0,
        color: 'bg-white',
        iconColor: 'text-slate-700',
        accentColor: 'bg-slate-700',
        subjectId: module.subjectId,
        subject: module.subject,
        subjectColor: subjectMeta.color,
        subjectAccentColor: subjectMeta.accent,
        grade_level_availability: module.grade_level_availability,
        recommended_grade_level: module.recommended_grade_level,
        active_grade_level: activeGradeLevel,
        quarter: module.quarter,
        content_domain: module.contentDomain,
        competency_group: module.competencyGroup,
        competencies: module.competencies,
        performance_standard: module.performanceStandard,
        real_world_theme: module.realWorldTheme,
        lesson_count: lessons.length,
        quiz_count: quizzes.length,
        is_visible_for_grade: module.grade_level_availability.includes(activeGradeLevel),
        curriculum_aligned_label: 'Curriculum-aligned',
        module_sources: module.sources,
        module_assessments: assessments,
      };
    });
}

export const CURRICULUM_SUBJECT_META = SUBJECT_META;
