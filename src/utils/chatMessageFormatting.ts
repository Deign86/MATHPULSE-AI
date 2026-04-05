const CODE_SEGMENT_PATTERN = /(```[\s\S]*?```|`[^`\n]+`)/g;
const MATH_SEGMENT_PATTERN = /(\$\$[\s\S]*?\$\$|\$[^$\n]+\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g;
const BARE_TEX_PATTERN = /\\(?:boxed\{[^{}]+\}|frac\{[^{}]+\}\{[^{}]+\}|sqrt\{[^{}]+\}|(?:cdot|times|pm|mp|leq|geq|neq|approx|alpha|beta|gamma|delta|theta|pi|sum|int)(?:_[a-zA-Z0-9]+|_\{[^{}]+\})?(?:\^[a-zA-Z0-9]+|\^\{[^{}]+\})?)/g;
const THINK_TAG_BLOCK_PATTERN = /<\s*think\b[^>]*>[\s\S]*?<\s*\/\s*think\s*>/gi;
const THINK_TAG_PATTERN = /<\s*\/?\s*think\b[^>]*>/gi;
const ESCAPED_THINK_TAG_PATTERN = /&lt;\s*(\/?)\s*think\b([\s\S]*?)&gt;/gi;
const TRAILING_THINK_PREFIX_PATTERN = /(?:<\s*\/?\s*t(?:h(?:i(?:n(?:k)?)?)?)?)\s*$/i;
const TRAILING_ESCAPED_THINK_PREFIX_PATTERN = /(?:&lt;\s*\/?\s*t(?:h(?:i(?:n(?:k)?)?)?)?)\s*$/i;

interface ThinkTagStripOptions {
  streamingSafeTail?: boolean;
}

function normalizeEscapedThinkTags(input: string): string {
  return input.replace(ESCAPED_THINK_TAG_PATTERN, (_match, slash, suffix) => `<${slash ? '/' : ''}think${suffix}>`);
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
  const lowered = sanitized.toLowerCase();
  const lastOpenIndex = lowered.lastIndexOf('<think');
  const lastCloseIndex = lowered.lastIndexOf('</think>');
  if (lastOpenIndex !== -1 && lastOpenIndex > lastCloseIndex) {
    sanitized = sanitized.slice(0, lastOpenIndex);
  }

  sanitized = sanitized.replace(THINK_TAG_PATTERN, '');

  if (options.streamingSafeTail) {
    sanitized = sanitized
      .replace(TRAILING_THINK_PREFIX_PATTERN, '')
      .replace(TRAILING_ESCAPED_THINK_PREFIX_PATTERN, '');
  }

  return sanitized;
}

export function formatAssistantResponseForStorage(input: string): string {
  return stripThinkTags(input, { streamingSafeTail: true }).trim();
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

  const withoutThinkTags = stripThinkTags(input, { streamingSafeTail: true });
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
