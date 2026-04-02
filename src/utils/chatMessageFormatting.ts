const CODE_SEGMENT_PATTERN = /(```[\s\S]*?```|`[^`\n]+`)/g;
const MATH_SEGMENT_PATTERN = /(\$\$[\s\S]*?\$\$|\$[^$\n]+\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g;
const BARE_TEX_PATTERN = /\\(?:boxed\{[^{}]+\}|frac\{[^{}]+\}\{[^{}]+\}|sqrt\{[^{}]+\}|(?:cdot|times|pm|mp|leq|geq|neq|approx|alpha|beta|gamma|delta|theta|pi|sum|int)(?:_[a-zA-Z0-9]+|_\{[^{}]+\})?(?:\^[a-zA-Z0-9]+|\^\{[^{}]+\})?)/g;
const FENCED_CODE_BLOCK_PATTERN = /```[\s\S]*?```/g;
const FINAL_ANSWER_LINE_PATTERN = /^(?:[-*]\s*)?(?:\*\*)?\s*final\s+answer(?:\*\*)?\s*(?::|=|-)\s*(.+?)\s*$/i;
const FINAL_ANSWER_BLOCK_PATTERN = /^\s*(?:>\s*)?\*\*\s*final\s+answer\s*:?\s*\*\*/i;
const STEP_WITH_PAREN_PATTERN = /^(\s*)(\d+)\)\s*(.*)$/;
const STEP_LABEL_PATTERN = /^(\s*)step\s*(\d+)\s*[:.)-]\s*(.*)$/i;
const TRANSITION_LINE_PATTERN = /^(now|next|then|after that|moving on)\s*:?$/i;

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

function normalizeStepMarker(line: string): string {
  const parenStepMatch = line.match(STEP_WITH_PAREN_PATTERN);
  if (parenStepMatch) {
    const [, indent, number, content] = parenStepMatch;
    const text = content.trim() || `Step ${number}`;
    return `${indent}${number}. ${text}`;
  }

  const labelStepMatch = line.match(STEP_LABEL_PATTERN);
  if (labelStepMatch) {
    const [, indent, number, content] = labelStepMatch;
    const text = content.trim() || `Step ${number}`;
    return `${indent}${number}. ${text}`;
  }

  return line;
}

function collapseBlankLines(lines: string[]): string[] {
  const collapsed: string[] = [];
  let previousWasBlank = false;

  for (const line of lines) {
    const isBlank = line.trim().length === 0;
    if (isBlank) {
      if (!previousWasBlank) {
        collapsed.push('');
      }
      previousWasBlank = true;
      continue;
    }

    collapsed.push(line);
    previousWasBlank = false;
  }

  return collapsed;
}

function protectCodeSegments(input: string): { text: string; segments: string[] } {
  const segments: string[] = [];
  const text = input.replace(CODE_SEGMENT_PATTERN, (match) => {
    const token = `@@CODE_SEGMENT_${segments.length}@@`;
    segments.push(match);
    return token;
  });

  return { text, segments };
}

function restoreCodeSegments(input: string, segments: string[]): string {
  let restored = input;
  for (let index = 0; index < segments.length; index += 1) {
    restored = restored.replace(`@@CODE_SEGMENT_${index}@@`, segments[index]);
  }
  return restored;
}

function ensureFencedCodeSpacing(input: string): string {
  return input.replace(FENCED_CODE_BLOCK_PATTERN, (block: string, offset: number, fullText: string) => {
    const before = offset > 0 ? fullText[offset - 1] : '';
    const afterIndex = offset + block.length;
    const after = afterIndex < fullText.length ? fullText[afterIndex] : '';
    const prefix = before && before !== '\n' ? '\n' : '';
    const suffix = after && after !== '\n' ? '\n' : '';
    return `${prefix}${block}${suffix}`;
  });
}

function applyReadableStructure(input: string): string {
  if (!input.trim()) {
    return '';
  }

  const { text: protectedText, segments } = protectCodeSegments(input);
  const rawLines = protectedText.split('\n');
  const formattedLines: string[] = [];

  let finalAnswer: string | null = null;
  let hasFinalAnswerBlock = false;

  for (let index = 0; index < rawLines.length; index += 1) {
    const rawLine = rawLines[index].replace(/\s+$/g, '');
    const trimmed = rawLine.trim();
    const nextTrimmed = rawLines[index + 1]?.trim() ?? '';

    if (!trimmed) {
      formattedLines.push('');
      continue;
    }

    if (FINAL_ANSWER_BLOCK_PATTERN.test(trimmed) || /^#{1,6}\s*final\s+answer\b/i.test(trimmed)) {
      hasFinalAnswerBlock = true;
    }

    if (TRANSITION_LINE_PATTERN.test(trimmed) && nextTrimmed) {
      continue;
    }

    const normalizedLine = normalizeStepMarker(rawLine);
    const finalAnswerMatch = normalizedLine.match(FINAL_ANSWER_LINE_PATTERN);
    if (finalAnswerMatch) {
      const candidate = finalAnswerMatch[1]
        .trim()
        .replace(/^\*\*|\*\*$/g, '')
        .trim();
      if (candidate) {
        finalAnswer = candidate;
      }
      continue;
    }

    const previousLine = formattedLines[formattedLines.length - 1];
    if (previousLine && previousLine.trim().toLowerCase() === normalizedLine.trim().toLowerCase() && normalizedLine.trim().length > 24) {
      continue;
    }

    formattedLines.push(normalizedLine);
  }

  let output = collapseBlankLines(formattedLines).join('\n').trim();

  if (!hasFinalAnswerBlock && finalAnswer) {
    const finalAnswerLine = `> **Final answer:** ${finalAnswer}`;
    output = output ? `${output}\n\n${finalAnswerLine}` : finalAnswerLine;
  }

  return restoreCodeSegments(output, segments);
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

/**
 * Format assistant output for readability while preserving mathematical correctness.
 * This function is safe to run repeatedly (idempotent behavior).
 */
export function formatAssistantResponseForDisplay(input: string): string {
  return applyReadableStructure(ensureFencedCodeSpacing(normalizeChatMarkdownForRender(input)));
}

/**
 * Storage formatter intentionally matches display formatter so persisted messages
 * keep the same readable structure after reload.
 */
export function formatAssistantResponseForStorage(input: string): string {
  return formatAssistantResponseForDisplay(input);
}
