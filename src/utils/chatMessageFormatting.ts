const CODE_SEGMENT_PATTERN = /(```[\s\S]*?```|`[^`\n]+`)/g;
const MATH_SEGMENT_PATTERN = /(\$\$[\s\S]*?\$\$|\$[^$\n]+\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g;
const BARE_TEX_PATTERN = /\\(?:boxed\{[^{}]+\}|frac\{[^{}]+\}\{[^{}]+\}|sqrt\{[^{}]+\}|(?:cdot|times|pm|mp|leq|geq|neq|approx|alpha|beta|gamma|delta|theta|pi|sum|int)(?:_[a-zA-Z0-9]+|_\{[^{}]+\})?(?:\^[a-zA-Z0-9]+|\^\{[^{}]+\})?)/g;
const THINK_TAG_BLOCK_PATTERN = /<\s*think\b[^>]*>[\s\S]*?<\s*\/\s*think\s*>/gi;
const THINK_TAG_PATTERN = /<\s*\/?\s*think\b[^>]*>/gi;
const THINK_CLOSE_TAG_PATTERN = /<\s*\/\s*think\s*>/gi;
const ESCAPED_THINK_TAG_PATTERN = /&lt;\s*(\/?)\s*think\b([\s\S]*?)&gt;/gi;
const TRAILING_THINK_PREFIX_PATTERN = /(?:<\s*\/?\s*t(?:h(?:i(?:n(?:k)?)?)?)?)\s*$/i;
const TRAILING_ESCAPED_THINK_PREFIX_PATTERN = /(?:&lt;\s*\/?\s*t(?:h(?:i(?:n(?:k)?)?)?)?)\s*$/i;
const FINAL_SECTION_MARKER_PATTERN = /\bfinal\s+answer\s*:|(?:^|\n)\s*#{1,6}\s+\S|(?:^|\n)\s*(?:answer|solution)\s*:|(?:^|\n)\s*here(?:'s| is)\b|(?:^|\n)\s*(?:\d+[.)]|[-*])\s+\S/i;
const THINKING_PREAMBLE_PATTERN = /^\s*(?:okay|alright|let\s+me|i\s+should|i\s+need\s+to|i\s+will|wait|hmm|maybe|the\s+user\s+asked|let\s+us|let's)\b/i;

interface ThinkTagStripOptions {
  streamingSafeTail?: boolean;
  preserveUnclosedThinkBlocks?: boolean;
}

function normalizeEscapedThinkTags(input: string): string {
  return input.replace(ESCAPED_THINK_TAG_PATTERN, (_match, slash, suffix) => `<${slash ? '/' : ''}think${suffix}>`);
}

function findLastMatchEnd(input: string, pattern: RegExp): number {
  pattern.lastIndex = 0;
  let lastEnd = -1;
  let match: RegExpExecArray | null = pattern.exec(input);
  while (match) {
    lastEnd = match.index + match[0].length;
    match = pattern.exec(input);
  }
  return lastEnd;
}

function extractAfterOrphanThinkClose(input: string): string {
  const normalized = normalizeEscapedThinkTags(input);
  if (/<\s*think\b/i.test(normalized)) {
    return '';
  }

  const lastCloseEnd = findLastMatchEnd(normalized, THINK_CLOSE_TAG_PATTERN);
  if (lastCloseEnd === -1) {
    return '';
  }

  return normalized.slice(lastCloseEnd).trim();
}

function pruneThinkingPreamble(input: string): string {
  const normalized = input.replace(/\r\n?/g, '\n').trim();
  if (!normalized) {
    return '';
  }

  const markerMatch = FINAL_SECTION_MARKER_PATTERN.exec(normalized);
  if (markerMatch && typeof markerMatch.index === 'number') {
    return normalized.slice(markerMatch.index).trim();
  }

  const lines = normalized.split('\n').map((line) => line.trim());
  const planningLineCount = lines.filter((line) => line && THINKING_PREAMBLE_PATTERN.test(line)).length;

  // If this looks like planning monologue with no clear final section marker,
  // do not surface it to users.
  if (planningLineCount >= 2) {
    return '';
  }

  return normalized;
}

export function stripThinkTags(input: string, options: ThinkTagStripOptions = {}): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let sanitized = normalizeEscapedThinkTags(input);

  // Remove fully closed think blocks first.
  let previous = '';
  while (sanitized !== previous) {
    previous = sanitized;
    sanitized = sanitized.replace(THINK_TAG_BLOCK_PATTERN, '');
  }

  // Hide unfinished think blocks while streaming.
  if (!options.preserveUnclosedThinkBlocks) {
    const lowered = sanitized.toLowerCase();
    const lastOpenIndex = lowered.lastIndexOf('<think');
    const lastCloseIndex = lowered.lastIndexOf('</think>');
    if (lastOpenIndex !== -1 && lastOpenIndex > lastCloseIndex) {
      sanitized = sanitized.slice(0, lastOpenIndex);
    }
  }

  sanitized = sanitized.replace(THINK_TAG_PATTERN, '');

  if (options.streamingSafeTail) {
    sanitized = sanitized
      .replace(TRAILING_THINK_PREFIX_PATTERN, '')
      .replace(TRAILING_ESCAPED_THINK_PREFIX_PATTERN, '');
  }

  return sanitized;
}

export function formatAssistantResponseForStreaming(input: string): string {
  return stripThinkTags(input, { streamingSafeTail: true }).trim();
}

export function formatAssistantResponseForStorage(input: string): string {
  const orphanCloseRecovery = extractAfterOrphanThinkClose(input);
  if (orphanCloseRecovery) {
    return orphanCloseRecovery;
  }

  const strictSanitized = stripThinkTags(input, { streamingSafeTail: true }).trim();
  if (strictSanitized) {
    return strictSanitized;
  }

  // Some model variants emit leading think tags without a clean close boundary.
  // Keep only likely final answer content and suppress planning-style preambles.
  const permissiveSanitized = stripThinkTags(input, {
    streamingSafeTail: true,
    preserveUnclosedThinkBlocks: true,
  }).trim();

  return pruneThinkingPreamble(permissiveSanitized);
}

function wrapBareTexCommands(segment: string): string {
  return segment.replace(BARE_TEX_PATTERN, (expression) => `$${expression}$`);
}

/**
 * Normalize model output before markdown rendering so common raw TeX commands
 * (for example \boxed{3}) are rendered as math instead of plain text.
 */
export function normalizeChatMarkdownForRender(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const withoutThinkTags = formatAssistantResponseForStorage(input);
  const normalizedNewlines = withoutThinkTags.replace(/\r\n?/g, '\n');

  const codeAwareSegments = normalizedNewlines.split(CODE_SEGMENT_PATTERN);

  return codeAwareSegments
    .map((segment, index) => {
      // Keep fenced/inline code untouched.
      if (index % 2 === 1) {
        return segment;
      }

      const unescaped = segment
        .replace(/\\\\(?=(?:boxed|frac|sqrt|cdot|times|pm|mp|leq|geq|neq|approx|alpha|beta|gamma|delta|theta|pi|sum|int)\b|[()[\]{}])/g, '\\')
        .replace(/\\n/g, '\n');

      const mathAwareSegments = unescaped.split(MATH_SEGMENT_PATTERN);

      return mathAwareSegments
        .map((mathSegment, mathIndex) => (mathIndex % 2 === 1 ? mathSegment : wrapBareTexCommands(mathSegment)))
        .join('');
    })
    .join('');
}
