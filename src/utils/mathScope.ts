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
  'root',
  'square root',
  'cube root',
  'nth root',
  'sqrt',
] as const;

const MATH_SCOPE_PATTERNS = [
  /\d+\s*[%+\-*/^=]\s*[-+]?\d*/,
  /\b(?:sin|cos|tan|cot|sec|csc|log|ln|sqrt)\s*\(?/,
  /\b(?:differentiate|integrate|derive|proof|prove)\b/,
  /\b(?:x|y|z)\s*[=+\-*/^]\s*[-+]?\d/,
  /\b(?:square|cube|nth)?\s*root\b/i,
  /\b(?:what is|what's)\s*(?:the\s+)?(?:square\s+)?root\b/i,
  /\b\d+\s*\^\s*\d+/,
] as const;

const CONTINUATION_FOLLOWUP_TOKENS = new Set([
  'go',
  'continue',
  'yes',
  'ok',
  'next',
  'more',
]);

const CONTINUATION_INVITE_PATTERNS = [
  /\bshall\s+we\s+continue\b/i,
  /\b(?:would|do)\s+you\s+like\s+to\s+continue\b/i,
  /\b(?:want|need)\s+me\s+to\s+continue\b/i,
  /\bshould\s+(?:i|we)\s+continue\b/i,
  /\bcontinue\s*\?\s*$/i,
  /\b(?:ready\s+for|go\s+to)\s+the\s+next\s+step\b/i,
  /\bnext\s+step(?:s)?\s*\?\s*$/i,
  /\bkeep\s+going\s*\?\s*$/i,
] as const;

export const CONTINUATION_CONTEXT_CLARIFY_RESPONSE =
  'I can continue once I know which math problem you mean. Please share the problem again or tell me which step to continue.';

export interface ScopeBoundaryHistoryEntry {
  role?: string;
  content?: string;
}

export interface ScopeBoundaryContext {
  history?: ScopeBoundaryHistoryEntry[];
  latestAssistantMessage?: string | null;
}

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

function normalizeContinuationTokenInput(message: string): string {
  return (message ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[\p{P}]+$/gu, '');
}

function isContinuationFollowupToken(message: string): boolean {
  const normalized = normalizeContinuationTokenInput(message);
  if (!normalized) {
    return false;
  }

  return CONTINUATION_FOLLOWUP_TOKENS.has(normalized);
}

function classifyScopeBoundaryWithoutContinuation(message: string): string | null {
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

function getLatestAssistantContextMessage(context?: ScopeBoundaryContext): string | null {
  const directAssistantMessage = (context?.latestAssistantMessage ?? '').trim();
  if (directAssistantMessage) {
    return directAssistantMessage;
  }

  const history = context?.history ?? [];
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const entry = history[i];
    const role = (entry?.role ?? '').toLowerCase();
    const content = (entry?.content ?? '').trim();
    if (!content) {
      continue;
    }
    if (role === 'assistant' || role === 'ai') {
      return content;
    }
  }

  return null;
}

function assistantInvitedContinuation(context?: ScopeBoundaryContext): boolean {
  const latestAssistantMessage = getLatestAssistantContextMessage(context);
  if (!latestAssistantMessage) {
    return false;
  }

  return CONTINUATION_INVITE_PATTERNS.some((pattern) => pattern.test(latestAssistantMessage));
}

function extractLatestUserIntentFromContext(context?: ScopeBoundaryContext): string | null {
  const history = context?.history ?? [];
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const entry = history[i];
    const role = (entry?.role ?? '').toLowerCase();
    const content = (entry?.content ?? '').trim();
    if (!content) {
      continue;
    }
    if (role !== 'user') {
      continue;
    }
    if (isContinuationFollowupToken(content)) {
      continue;
    }
    return content;
  }

  return null;
}

function isGreetingOrThanksBoundaryResponse(response: string): boolean {
  return (
    (GREETING_RESPONSES as readonly string[]).includes(response)
    || (THANKS_RESPONSES as readonly string[]).includes(response)
  );
}

export function getScopeBoundaryResponse(message: string, context?: ScopeBoundaryContext): string | null {
  const boundaryResponse = classifyScopeBoundaryWithoutContinuation(message);
  if (boundaryResponse === null) {
    return null;
  }

  if (!isContinuationFollowupToken(message)) {
    return boundaryResponse;
  }

  if (assistantInvitedContinuation(context)) {
    return null;
  }

  const reconstructedIntent = extractLatestUserIntentFromContext(context);
  if (!reconstructedIntent) {
    return CONTINUATION_CONTEXT_CLARIFY_RESPONSE;
  }

  const reconstructedBoundaryResponse = classifyScopeBoundaryWithoutContinuation(reconstructedIntent);
  if (reconstructedBoundaryResponse === null) {
    return null;
  }

  if (isGreetingOrThanksBoundaryResponse(reconstructedBoundaryResponse)) {
    return CONTINUATION_CONTEXT_CLARIFY_RESPONSE;
  }

  return reconstructedBoundaryResponse;
}
