const CODE_SEGMENT_PATTERN = /(```[\s\S]*?```|`[^`\n]+`)/g;
const MATH_SEGMENT_PATTERN = /(\$\$[\s\S]*?\$\$|\$[^$\n]+\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g;
const BARE_TEX_PATTERN = /\\(?:boxed\{[^{}]+\}|frac\{[^{}]+\}\{[^{}]+\}|sqrt\{[^{}]+\}|(?:cdot|times|pm|mp|leq|geq|neq|approx|alpha|beta|gamma|delta|theta|pi|sum|int)(?:_[a-zA-Z0-9]+|_\{[^{}]+\})?(?:\^[a-zA-Z0-9]+|\^\{[^{}]+\})?)/g;

const TIMING_HEADER_PATTERN = /^(timing results|breakdown of response time|observations)\b/i;
const TIMING_LINE_PATTERN = /\b\d+\s*ms\b/i;

function sanitizeTutorArtifacts(input: string): string {
  const lines = input.split('\n');
  const kept: string[] = [];
  let inTimingBlock = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (TIMING_HEADER_PATTERN.test(line)) {
      inTimingBlock = true;
      continue;
    }

    if (inTimingBlock) {
      if (!line) {
        continue;
      }
      if (TIMING_LINE_PATTERN.test(line) || /^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line) || /^total response time\b/i.test(line)) {
        continue;
      }
      // Exit timing block when normal content resumes.
      inTimingBlock = false;
    }

    kept.push(rawLine);
  }

  return kept
    .join('\n')
    // Remove square-bracket wrappers around inline equation snippets.
    .replace(/\[\s*([^\[\]\n]{1,180}?)\s*\]/g, '$1')
    // Normalize frequent TeX command artifacts to readable symbols/text.
    .replace(/(^|[^\\])\\times/g, '$1×')
    .replace(/(^|[^\\])\\cdot/g, '$1·')
    .replace(/(^|[^\\])\\boxed\{([^{}]+)\}/g, '$1$2')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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

  const normalizedNewlines = input.replace(/\r\n?/g, '\n');

  const codeAwareSegments = normalizedNewlines.split(CODE_SEGMENT_PATTERN);

  return codeAwareSegments
    .map((segment, index) => {
      // Keep fenced/inline code untouched.
      if (index % 2 === 1) {
        return segment;
      }

      const unescapedAndSanitized = sanitizeTutorArtifacts(
        segment
        .replace(/\\\\(?=(?:boxed|frac|sqrt|cdot|times|pm|mp|leq|geq|neq|approx|alpha|beta|gamma|delta|theta|pi|sum|int)\b|[()[\]{}])/g, '\\')
        .replace(/\\n/g, '\n'),
      );

      const mathAwareSegments = unescapedAndSanitized.split(MATH_SEGMENT_PATTERN);

      return mathAwareSegments
        .map((mathSegment, mathIndex) => (mathIndex % 2 === 1 ? mathSegment : wrapBareTexCommands(mathSegment)))
        .join('');
    })
    .join('');
}
