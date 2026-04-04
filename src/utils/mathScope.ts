export const MATH_ONLY_REFUSAL_MESSAGE =
  'I’m sorry, but I can only answer math-related questions. Please ask me something related to mathematics.';

const MATH_SCOPE_KEYWORDS = [
  'math',
  'mathematics',
  'algebra',
  'geometry',
  'trigonometry',
  'calculus',
  'statistics',
  'probability',
  'arithmetic',
  'equation',
  'inequality',
  'function',
  'graph',
  'slope',
  'derivative',
  'integral',
  'limit',
  'matrix',
  'determinant',
  'fraction',
  'percentage',
  'ratio',
  'polynomial',
  'quadratic',
  'logarithm',
  'exponent',
  'angle',
  'triangle',
  'circle',
  'perimeter',
  'area',
  'volume',
  'mean',
  'median',
  'mode',
  'standard deviation',
  'solve',
  'simplify',
  'factor',
  'evaluate',
  'compute',
  'calculate',
] as const;

const MATH_SCOPE_PATTERNS = [
  /\d+\s*[%+\-*/^=]\s*[-+]?\d*/,
  /\b(?:sin|cos|tan|cot|sec|csc|log|ln|sqrt)\s*\(?/,
  /\b(?:differentiate|integrate|derive|proof|prove)\b/,
  /\b(?:x|y|z)\s*[=+\-*/^]\s*[-+]?\d/,
] as const;

export function isMathRelatedQuery(message: string): boolean {
  const normalized = (message ?? '').trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  if (MATH_SCOPE_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return true;
  }

  return MATH_SCOPE_PATTERNS.some((pattern) => pattern.test(normalized));
}
