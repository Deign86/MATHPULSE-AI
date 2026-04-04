export type SubjectPreset =
  | 'General Math'
  | 'Algebra'
  | 'Geometry'
  | 'Statistics'
  | 'Pre-Calculus'
  | 'Business Math';

export type BatchCategory =
  | 'algebra'
  | 'geometry'
  | 'statistics'
  | 'business-math'
  | 'pre-calculus';

export interface ComparisonBatchCase {
  id: string;
  category: BatchCategory;
  subject: SubjectPreset;
  label: string;
  prompt: string;
}

export interface LightweightHeuristicResult {
  pass: boolean;
  notes: string[];
  checks: {
    nonEmptyResponse: boolean;
    latencyUnderThreshold: boolean;
    mathRelevant: boolean;
    notRefusal: boolean;
  };
}

export interface QuickCheckResult {
  id: string;
  prompt: string;
  responsePreview: string;
  latencyMs: number;
  pass: boolean;
  notes: string[];
}

export const SUBJECT_PRESETS: SubjectPreset[] = [
  'General Math',
  'Algebra',
  'Geometry',
  'Statistics',
  'Pre-Calculus',
  'Business Math',
];

export const COMPARISON_BATCH_CASES: ComparisonBatchCase[] = [
  {
    id: 'batch-algebra-linear-equation',
    category: 'algebra',
    subject: 'Algebra',
    label: 'Solve linear equation',
    prompt: 'Solve: 2x + 5 = 13',
  },
  {
    id: 'batch-geometry-triangle-angle',
    category: 'geometry',
    subject: 'Geometry',
    label: 'Triangle angle reasoning',
    prompt: 'A triangle has angles 35 and 65 degrees. Find the third angle and explain briefly.',
  },
  {
    id: 'batch-statistics-mean',
    category: 'statistics',
    subject: 'Statistics',
    label: 'Compute mean and median',
    prompt: 'Find the mean and median of 4, 8, 10, 12, 16.',
  },
  {
    id: 'batch-business-profit',
    category: 'business-math',
    subject: 'Business Math',
    label: 'Business profit scenario',
    prompt:
      'A store buys notebooks for 45 pesos each and sells them for 60 pesos each. If 120 notebooks are sold, what is the total revenue and total gross profit?',
  },
  {
    id: 'batch-precalculus-function',
    category: 'pre-calculus',
    subject: 'Pre-Calculus',
    label: 'Function features',
    prompt: 'Given f(x) = x^2 - 4x + 3, find the vertex and x-intercepts.',
  },
];

const REFUSAL_PATTERNS = [
  "i can't",
  'i cannot',
  'sorry, i cannot',
  'unable to',
  'as an ai',
  'cannot help with',
];

const MATH_SIGNAL_PATTERN = /(\d|\+|\-|\*|\/|=|\^|\bsolve\b|\bequation\b|\bfactor\b|\bmean\b|\bvertex\b|\bintercept\b)/i;

export const truncatePreview = (value: string, maxLength = 140): string => {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1)}...`;
};

export const evaluateLightweightHeuristics = (
  responseText: string,
  latencyMs: number,
  latencyThresholdMs: number,
): LightweightHeuristicResult => {
  const normalized = responseText.trim();
  const lowercase = normalized.toLowerCase();

  const nonEmptyResponse = normalized.length > 0;
  const latencyUnderThreshold = latencyMs <= latencyThresholdMs;
  const mathRelevant = MATH_SIGNAL_PATTERN.test(normalized);
  const notRefusal = !REFUSAL_PATTERNS.some((pattern) => lowercase.includes(pattern));

  const notes = [
    nonEmptyResponse ? 'Response is non-empty.' : 'Response is empty.',
    latencyUnderThreshold
      ? `Latency ${latencyMs}ms is under threshold ${latencyThresholdMs}ms.`
      : `Latency ${latencyMs}ms exceeds threshold ${latencyThresholdMs}ms.`,
    mathRelevant ? 'Response appears math-relevant.' : 'Response appears weakly math-relevant.',
    notRefusal ? 'No obvious refusal detected.' : 'Possible refusal language detected.',
  ];

  const pass = nonEmptyResponse && latencyUnderThreshold && mathRelevant && notRefusal;

  return {
    pass,
    notes,
    checks: {
      nonEmptyResponse,
      latencyUnderThreshold,
      mathRelevant,
      notRefusal,
    },
  };
};

export const summarizeDualHeuristics = (
  hf: LightweightHeuristicResult,
  vllm: LightweightHeuristicResult,
): string => {
  if (hf.pass && vllm.pass) {
    return 'Both backends passed lightweight viability checks.';
  }
  if (hf.pass && !vllm.pass) {
    return 'Only base Hugging Face response passed lightweight viability checks.';
  }
  if (!hf.pass && vllm.pass) {
    return 'Only fine-tuned vLLM response passed lightweight viability checks.';
  }
  return 'Both backends failed one or more lightweight viability checks.';
};
