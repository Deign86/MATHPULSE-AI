export type IARTopicArea = 'Functions' | 'BusinessMath' | 'Logic';
export type IARGradeLevelTag = 'G11' | 'G12Candidate';
export type IARDifficulty = 'basic' | 'standard' | 'challenge';
export type IARAnswerType = 'MCQ' | 'shortAnswerNumeric' | 'shortAnswerText' | 'confidenceLikert';
export type DepEdBasis = 'depedPattern' | 'extension';

export interface IARQuestionBlueprint {
  id: string;
  topicArea: IARTopicArea;
  gradeLevel: IARGradeLevelTag;
  quarter: 1 | 2 | 3 | 4;
  difficulty: IARDifficulty;
  competencyCode?: string;
  competencyDescription: string;
  answerType: IARAnswerType;
  depedBasis: DepEdBasis;
  prompt: string;
  options?: string[];
  correctOptionIndex?: number;
  acceptableNumericAnswers?: number[];
  numericTolerance?: number;
  acceptableTextAnswers?: string[];
  isConfidenceProbe: boolean;
  confidenceForQuestionId?: string;
  scorable: boolean;
  estimatedSeconds: number;
}

export interface IARTopicClassification {
  topicArea: IARTopicArea;
  scorePercent: number;
  classification: 'Mastered' | 'NeedsReview' | 'HighRisk';
}

export const IAR_BLUEPRINT_VERSION = 'iar-v2-deped-g11-core-g12-candidate-shortform';

const confidenceOptions = [
  'Very low confidence',
  'Low confidence',
  'Moderate confidence',
  'High confidence',
];

export const IAR_QUESTION_BLUEPRINT: IARQuestionBlueprint[] = [
  {
    id: 'iar-fn-01',
    topicArea: 'Functions',
    gradeLevel: 'G11',
    quarter: 1,
    difficulty: 'basic',
    competencyCode: 'M11GM-Ia-2',
    competencyDescription: 'Evaluates a function and solves basic linear expressions.',
    answerType: 'MCQ',
    depedBasis: 'depedPattern',
    prompt: 'Solve for x: 3x - 4 = 17',
    options: ['5', '6', '7', '8'],
    correctOptionIndex: 2,
    isConfidenceProbe: false,
    scorable: true,
    estimatedSeconds: 35,
  },
  {
    id: 'iar-fn-02',
    topicArea: 'Functions',
    gradeLevel: 'G11',
    quarter: 1,
    difficulty: 'standard',
    competencyCode: 'M11GM-Ib-5',
    competencyDescription: 'Finds the domain of a rational function.',
    answerType: 'MCQ',
    depedBasis: 'depedPattern',
    prompt: 'What is the domain of f(x) = 5 / (x - 2)?',
    options: ['All real numbers', 'x > 2', 'x ≠ 2', 'x < 2'],
    correctOptionIndex: 2,
    isConfidenceProbe: false,
    scorable: true,
    estimatedSeconds: 45,
  },
  {
    id: 'iar-fn-03',
    topicArea: 'Functions',
    gradeLevel: 'G11',
    quarter: 2,
    difficulty: 'standard',
    competencyCode: 'M11GM-Ie-f-1',
    competencyDescription: 'Solves exponential equations in real-life growth contexts.',
    answerType: 'shortAnswerNumeric',
    depedBasis: 'depedPattern',
    prompt: 'A quantity doubles every hour. If it starts at 3, what is the value after 4 hours?',
    acceptableNumericAnswers: [48],
    numericTolerance: 0,
    isConfidenceProbe: false,
    scorable: true,
    estimatedSeconds: 55,
  },
  {
    id: 'iar-fn-04',
    topicArea: 'Functions',
    gradeLevel: 'G11',
    quarter: 2,
    difficulty: 'challenge',
    competencyCode: 'M11GM-Ii-4',
    competencyDescription: 'Determines intercepts and asymptotic behavior of logarithmic functions.',
    answerType: 'MCQ',
    depedBasis: 'depedPattern',
    prompt: 'Which statement is true for f(x) = log(x - 1)?',
    options: [
      'Domain is all real numbers.',
      'Vertical asymptote is x = 1.',
      'x-intercept is always 0.',
      'Range is x > 1.',
    ],
    correctOptionIndex: 1,
    isConfidenceProbe: false,
    scorable: true,
    estimatedSeconds: 55,
  },
  {
    id: 'iar-fn-c1',
    topicArea: 'Functions',
    gradeLevel: 'G11',
    quarter: 2,
    difficulty: 'standard',
    competencyCode: 'M11GM-Id-2',
    competencyDescription: 'Determines the inverse of a one-to-one function.',
    answerType: 'shortAnswerNumeric',
    depedBasis: 'depedPattern',
    prompt: 'If f(x) = 2x + 3, what is f⁻¹(11)?',
    acceptableNumericAnswers: [4],
    numericTolerance: 0,
    isConfidenceProbe: false,
    scorable: true,
    estimatedSeconds: 35,
  },
  {
    id: 'iar-bm-01',
    topicArea: 'BusinessMath',
    gradeLevel: 'G11',
    quarter: 3,
    difficulty: 'basic',
    competencyCode: 'M11GM-IIa-b-1',
    competencyDescription: 'Computes simple interest and maturity value.',
    answerType: 'shortAnswerNumeric',
    depedBasis: 'depedPattern',
    prompt: 'Find the simple interest on PHP 8,000 at 5% annual rate for 2 years.',
    acceptableNumericAnswers: [800],
    numericTolerance: 0,
    isConfidenceProbe: false,
    scorable: true,
    estimatedSeconds: 45,
  },
  {
    id: 'iar-bm-02',
    topicArea: 'BusinessMath',
    gradeLevel: 'G11',
    quarter: 3,
    difficulty: 'standard',
    competencyCode: 'M11GM-IIa-2',
    competencyDescription: 'Distinguishes simple and compound interest contexts.',
    answerType: 'MCQ',
    depedBasis: 'depedPattern',
    prompt: 'Which statement correctly describes compound interest?',
    options: [
      'Interest is based only on original principal.',
      'Interest is computed once at maturity.',
      'Interest is computed on principal plus accumulated interest.',
      'Interest is always lower than simple interest.',
    ],
    correctOptionIndex: 2,
    isConfidenceProbe: false,
    scorable: true,
    estimatedSeconds: 45,
  },
  {
    id: 'iar-bm-03',
    topicArea: 'BusinessMath',
    gradeLevel: 'G11',
    quarter: 3,
    difficulty: 'standard',
    competencyCode: 'M11GM-IIc-d-1',
    competencyDescription: 'Computes annuity future value in basic settings.',
    answerType: 'MCQ',
    depedBasis: 'depedPattern',
    prompt: 'A student saves PHP 1,000 monthly for 6 months with no interest. What is the accumulated amount?',
    options: ['PHP 5,000', 'PHP 6,000', 'PHP 7,000', 'PHP 12,000'],
    correctOptionIndex: 1,
    isConfidenceProbe: false,
    scorable: true,
    estimatedSeconds: 40,
  },
  {
    id: 'iar-bm-04',
    topicArea: 'BusinessMath',
    gradeLevel: 'G11',
    quarter: 3,
    difficulty: 'challenge',
    competencyCode: 'M11GM-IIf-3',
    competencyDescription: 'Solves business and consumer loan scenarios.',
    answerType: 'MCQ',
    depedBasis: 'depedPattern',
    prompt: 'A borrower receives PHP 20,000 and repays PHP 22,400 after 1 year. What is the annual simple interest rate?',
    options: ['8%', '10%', '12%', '14%'],
    correctOptionIndex: 2,
    isConfidenceProbe: false,
    scorable: true,
    estimatedSeconds: 60,
  },
  {
    id: 'iar-bm-c1',
    topicArea: 'BusinessMath',
    gradeLevel: 'G11',
    quarter: 3,
    difficulty: 'standard',
    competencyCode: 'M11GM-IIc-d-1',
    competencyDescription: 'Finds future value and present value of annuities.',
    answerType: 'shortAnswerNumeric',
    depedBasis: 'depedPattern',
    prompt: 'Without interest, what is the present value of a 12-month annuity paying PHP 500 each month?',
    acceptableNumericAnswers: [6000],
    numericTolerance: 0,
    isConfidenceProbe: false,
    scorable: true,
    estimatedSeconds: 40,
  },
  {
    id: 'iar-lg-01',
    topicArea: 'Logic',
    gradeLevel: 'G11',
    quarter: 4,
    difficulty: 'basic',
    competencyCode: 'M11GM-IIg-1',
    competencyDescription: 'Identifies and negates propositions.',
    answerType: 'MCQ',
    depedBasis: 'depedPattern',
    prompt: 'If p is "All triangles have three sides," what is not p?',
    options: [
      'Some triangles have three sides.',
      'No triangle has three sides.',
      'At least one triangle does not have three sides.',
      'All triangles are polygons.',
    ],
    correctOptionIndex: 2,
    isConfidenceProbe: false,
    scorable: true,
    estimatedSeconds: 45,
  },
  {
    id: 'iar-lg-02',
    topicArea: 'Logic',
    gradeLevel: 'G11',
    quarter: 4,
    difficulty: 'standard',
    competencyCode: 'M11GM-IIh-1',
    competencyDescription: 'Determines truth values of compound propositions.',
    answerType: 'MCQ',
    depedBasis: 'depedPattern',
    prompt: 'When p is true and q is false, what is the truth value of p -> q?',
    options: ['True', 'False', 'Cannot be determined', 'Both true and false'],
    correctOptionIndex: 1,
    isConfidenceProbe: false,
    scorable: true,
    estimatedSeconds: 40,
  },
  {
    id: 'iar-lg-03',
    topicArea: 'Logic',
    gradeLevel: 'G11',
    quarter: 4,
    difficulty: 'standard',
    competencyCode: 'M11GM-IIi-1',
    competencyDescription: 'Identifies common reasoning fallacies in short arguments.',
    answerType: 'shortAnswerText',
    depedBasis: 'depedPattern',
    prompt: 'A post says, "Everyone in my class passed because we used this lucky pen." Type the best label for this weak reasoning.',
    acceptableTextAnswers: ['false cause', 'false causation', 'post hoc', 'hasty generalization'],
    isConfidenceProbe: false,
    scorable: true,
    estimatedSeconds: 60,
  },
  {
    id: 'iar-lg-04',
    topicArea: 'Logic',
    gradeLevel: 'G11',
    quarter: 4,
    difficulty: 'challenge',
    competencyCode: 'M11GM-IIi-2',
    competencyDescription: 'Determines the validity of categorical syllogisms.',
    answerType: 'MCQ',
    depedBasis: 'depedPattern',
    prompt: 'All squares are rectangles. All rectangles are quadrilaterals. Therefore all squares are quadrilaterals. This argument is:',
    options: ['Valid', 'Invalid', 'A fallacy of composition', 'A contradiction'],
    correctOptionIndex: 0,
    isConfidenceProbe: false,
    scorable: true,
    estimatedSeconds: 55,
  },
  {
    id: 'iar-lg-c1',
    topicArea: 'Logic',
    gradeLevel: 'G11',
    quarter: 4,
    difficulty: 'standard',
    competencyCode: 'M11GM-IIj-1',
    competencyDescription: 'Illustrates methods of proof and disproof.',
    answerType: 'MCQ',
    depedBasis: 'depedPattern',
    prompt: 'To prove "if n is even then n² is even," which method is commonly used?',
    options: ['Direct proof', 'Proof by contradiction only', 'Survey method', 'Graph sketch only'],
    correctOptionIndex: 0,
    isConfidenceProbe: false,
    scorable: true,
    estimatedSeconds: 40,
  },
];

export function classifyTopicScore(scorePercent: number): IARTopicClassification['classification'] {
  if (scorePercent >= 75) return 'Mastered';
  if (scorePercent >= 40) return 'NeedsReview';
  return 'HighRisk';
}

export function getDepEdIARQuestionBlueprint(): IARQuestionBlueprint[] {
  return IAR_QUESTION_BLUEPRINT.filter(
    (question) => question.depedBasis === 'depedPattern' && Boolean(question.competencyCode),
  );
}

export function estimateIarDurationMinutes(questionSet: IARQuestionBlueprint[] = IAR_QUESTION_BLUEPRINT): number {
  const totalSeconds = questionSet.reduce((sum, q) => sum + q.estimatedSeconds, 0);
  return Math.round((totalSeconds / 60) * 10) / 10;
}
