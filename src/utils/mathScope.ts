const GREETING_PATTERN = /^\s*(?:hi|hello|hey|good\s+(?:morning|afternoon|evening))\b/i;
const THANKS_PATTERN = /\b(?:thanks|thank\s+you|thank\s+u|ty)\b/i;

export const GREETING_RESPONSES = [
  'Hi! I am MathPulse, your math tutor. I can help with algebra, geometry, calculus, and more. What math question would you like to try?',
  'Hello! Great to see you. I am here for math topics and step-by-step solutions whenever you are ready.',
] as const;

export const THANKS_RESPONSES = [
  'You are very welcome. If you want, send another math question and we can work through it together.',
  'Glad I could help. I am here anytime you want to practice more math.',
] as const;

export const NON_MATH_REDIRECT_RESPONSES = [
  'That topic is outside my math scope, but I would be happy to help with mathematics like algebra, calculus, geometry, trigonometry, or statistics.',
  'I focus on math-only support, so I may not be the best for that request. Share a math question and I will guide you step by step.',
  'I am built for math tutoring, so I can best help with mathematical problems and explanations. If you want, ask me any math question next.',
] as const;

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

function pickRandomResponse(options: readonly string[]): string {
  if (options.length === 0) {
    return '';
  }
  return options[Math.floor(Math.random() * options.length)] ?? options[0];
}

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

export function getScopeBoundaryResponse(message: string): string | null {
  const normalized = (message ?? '').trim();
  if (!normalized) {
    return pickRandomResponse(NON_MATH_REDIRECT_RESPONSES);
  }

  if (isMathRelatedQuery(normalized)) {
    return null;
  }

  if (GREETING_PATTERN.test(normalized)) {
    return pickRandomResponse(GREETING_RESPONSES);
  }

  if (THANKS_PATTERN.test(normalized)) {
    return pickRandomResponse(THANKS_RESPONSES);
  }

  return pickRandomResponse(NON_MATH_REDIRECT_RESPONSES);
}
