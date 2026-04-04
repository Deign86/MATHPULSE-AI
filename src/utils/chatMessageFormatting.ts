const CODE_SEGMENT_PATTERN = /(```[\s\S]*?```|`[^`\n]+`)/g;
const MATH_SEGMENT_PATTERN = /(\$\$[\s\S]*?\$\$|\$[^$\n]+\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g;
const BARE_TEX_PATTERN = /\\(?:boxed\{[^{}]+\}|frac\{[^{}]+\}\{[^{}]+\}|sqrt\{[^{}]+\}|(?:cdot|times|pm|mp|leq|geq|neq|approx|alpha|beta|gamma|delta|theta|pi|sum|int)(?:_[a-zA-Z0-9]+|_\{[^{}]+\})?(?:\^[a-zA-Z0-9]+|\^\{[^{}]+\})?)/g;

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

  const normalizedNewlines = input.replace(/\r\n?/g, '\n');

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
