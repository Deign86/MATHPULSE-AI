const CODE_SEGMENT_PATTERN = /(```[\s\S]*?```|`[^`\n]+`)/g;
const MATH_SEGMENT_PATTERN = /(\$\$[\s\S]*?\$\$|\$[^$\n]+\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g;
const BARE_TEX_PATTERN = /\\(?:boxed\{[^{}]+\}|frac\{[^{}]+\}\{[^{}]+\}|sqrt\{[^{}]+\}|(?:cdot|times|pm|mp|leq|geq|neq|approx|alpha|beta|gamma|delta|theta|pi|sum|int)(?:_[a-zA-Z0-9]+|_\{[^{}]+\})?(?:\^[a-zA-Z0-9]+|\^\{[^{}]+\})?)/g;
const FENCED_CODE_BLOCK_PATTERN = /```[\s\S]*?```/g;
const FINAL_ANSWER_LINE_PATTERN = /^(?:[-*]\s*)?(?:\*\*)?\s*final\s+answer(?:\*\*)?\s*(?::|=|-)\s*(.+?)\s*$/i;
const FINAL_ANSWER_BLOCK_PATTERN = /^\s*(?:>\s*)?\*\*\s*final\s+answer\s*:?\s*\*\*/i;
const STEP_WITH_PAREN_PATTERN = /^(\s*)(\d+)\)\s*(.*)$/;
const STEP_LABEL_PATTERN = /^(\s*)step\s*(\d+)\s*[:.)-]\s*(.*)$/i;
const TRANSITION_LINE_PATTERN = /^(now|next|then|after that|moving on)\s*:?$/i;
const NUMBERED_STEP_PATTERN = /^(\s*)(\d+)[.)]\s*(.+)$/;
const STEP_INLINE_EQUATION_PATTERN = /^(\s*)(\d+)[.)]\s*(.+?)\s*(?::|-)\s*\[\s*([^\[\]\n]{1,260}?)\s*\]\s*$/;
const STEP_INLINE_PAREN_EQUATION_PATTERN = /^(\s*)(\d+)[.)]\s*(.+?)\s*(?::|-)\s*\(\s*([^()\n]{1,260}?)\s*\)\.?\s*$/;
const INLINE_EQUATION_PATTERN = /^(\s*)(.+?)\s*(?::|-)\s*\[\s*([^\[\]\n]{1,260}?)\s*\]\s*$/;
const INLINE_PAREN_EQUATION_PATTERN = /^(\s*)(.+?)\s*(?::|-)\s*\(\s*([^()\n]{1,260}?)\s*\)\.?\s*$/;
const BRACKET_EQUATION_ONLY_PATTERN = /^\[\s*([^\[\]\n]{1,260}?)\s*\]\s*$/;
const PAREN_EQUATION_ONLY_PATTERN = /^\(\s*([^()\n]{1,260}?)\s*\)\.?\s*$/;
const EQUATION_CONTENT_PATTERN = /(?:\d|=|\+|-|\*|\/|\^|\(|\)|×|÷|\u221A|\\(?:frac|sqrt|times|cdot|boxed))/;

const TIMING_HEADER_PATTERN = /^(timing results|breakdown of response time|observations)\b/i;
const TIMING_LINE_PATTERN = /\b\d+\s*ms\b/i;

function sanitizeTutorArtifacts(input: string, stripSquareBracketEquationWrappers: boolean): string {
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

  let sanitized = kept
    .join('\n')
    // Normalize frequent TeX command artifacts to readable symbols/text.
    .replace(/(^|[^\\])\\times/g, '$1×')
    .replace(/(^|[^\\])\\cdot/g, '$1·')
    .replace(/(^|[^\\])\\boxed\{([^{}]+)\}/g, '$1$2');

  if (stripSquareBracketEquationWrappers) {
    // Remove square-bracket wrappers around inline equation snippets.
    sanitized = sanitized.replace(/\[\s*([^\[\]\n]{1,180}?)\s*\]/g, '$1');
  }

  return sanitized
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
    return `${indent}${number}) ${text}`;
  }

  const labelStepMatch = line.match(STEP_LABEL_PATTERN);
  if (labelStepMatch) {
    const [, indent, number, content] = labelStepMatch;
    const text = content.trim() || `Step ${number}`;
    return `${indent}${number}) ${text}`;
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

function looksLikeEquationContent(content: string): boolean {
  return EQUATION_CONTENT_PATTERN.test(content);
}

function trimStepLabelText(content: string): string {
  return content
    .replace(/\s*(?::|-)\s*$/, '')
    .trim();
}

function toItalicFormula(formula: string): string {
  const escaped = formula.trim().replace(/([*_])/g, '\\$1');
  return `*${escaped}*`;
}

function getLastNonBlankLine(lines: string[]): string | null {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (lines[index].trim().length > 0) {
      return lines[index];
    }
  }
  return null;
}

function insertStepSeparatorIfNeeded(lines: string[], indent: string): void {
  const hasVisibleContent = lines.some((line) => line.trim().length > 0);
  if (!hasVisibleContent) {
    return;
  }

  const lastNonBlank = getLastNonBlankLine(lines);
  if (lastNonBlank?.trim() === '---') {
    return;
  }

  if (lines.length > 0 && lines[lines.length - 1] !== '') {
    lines.push('');
  }

  lines.push(`${indent}---`);
  lines.push('');
}

function applyReadableStructure(input: string): string {
  if (!input.trim()) {
    return '';
  }

  const { text: protectedText, segments } = protectCodeSegments(input);
  const rawLines = protectedText.split('\n');
  const formattedLines: string[] = [];
  const stepLikeLineCount = rawLines.reduce((count, line) => (
    /^\s*(?:\d+[.)]|step\s*\d+\s*[:.)-])/i.test(line.trim()) ? count + 1 : count
  ), 0);
  const useStepSectionFormatting = stepLikeLineCount >= 2;

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

    const stepInlineEquationMatch = normalizedLine.match(STEP_INLINE_EQUATION_PATTERN);
    if (useStepSectionFormatting && stepInlineEquationMatch) {
      const [, indent, stepNumber, stepLabel, equation] = stepInlineEquationMatch;
      if (looksLikeEquationContent(equation)) {
        const headingText = trimStepLabelText(stepLabel) || `Step ${stepNumber}`;
        insertStepSeparatorIfNeeded(formattedLines, indent);
        formattedLines.push(`${indent}${stepNumber}) ${headingText}`);
        formattedLines.push('');
        formattedLines.push(`${indent}${toItalicFormula(equation)}`);
        formattedLines.push('');
        continue;
      }
    }

    const stepInlineParenEquationMatch = normalizedLine.match(STEP_INLINE_PAREN_EQUATION_PATTERN);
    if (useStepSectionFormatting && stepInlineParenEquationMatch) {
      const [, indent, stepNumber, stepLabel, equation] = stepInlineParenEquationMatch;
      if (looksLikeEquationContent(equation)) {
        const headingText = trimStepLabelText(stepLabel) || `Step ${stepNumber}`;
        insertStepSeparatorIfNeeded(formattedLines, indent);
        formattedLines.push(`${indent}${stepNumber}) ${headingText}`);
        formattedLines.push('');
        formattedLines.push(`${indent}${toItalicFormula(equation)}`);
        formattedLines.push('');
        continue;
      }
    }

    const inlineEquationMatch = normalizedLine.match(INLINE_EQUATION_PATTERN);
    if (inlineEquationMatch) {
      const [, indent, statement, equation] = inlineEquationMatch;
      if (looksLikeEquationContent(equation)) {
        const cleanedStatement = trimStepLabelText(statement);
        if (cleanedStatement) {
          formattedLines.push(`${indent}${cleanedStatement}`);
          formattedLines.push('');
        }
        formattedLines.push(`${indent}${toItalicFormula(equation)}`);
        formattedLines.push('');
        continue;
      }
    }

    const inlineParenEquationMatch = normalizedLine.match(INLINE_PAREN_EQUATION_PATTERN);
    if (inlineParenEquationMatch) {
      const [, indent, statement, equation] = inlineParenEquationMatch;
      if (looksLikeEquationContent(equation)) {
        const cleanedStatement = trimStepLabelText(statement);
        if (cleanedStatement) {
          formattedLines.push(`${indent}${cleanedStatement}`);
          formattedLines.push('');
        }
        formattedLines.push(`${indent}${toItalicFormula(equation)}`);
        formattedLines.push('');
        continue;
      }
    }

    const standaloneBracketEquationMatch = trimmed.match(BRACKET_EQUATION_ONLY_PATTERN);
    if (standaloneBracketEquationMatch && looksLikeEquationContent(standaloneBracketEquationMatch[1])) {
      formattedLines.push(toItalicFormula(standaloneBracketEquationMatch[1]));
      continue;
    }

    const standaloneParenEquationMatch = trimmed.match(PAREN_EQUATION_ONLY_PATTERN);
    if (standaloneParenEquationMatch && looksLikeEquationContent(standaloneParenEquationMatch[1])) {
      formattedLines.push(toItalicFormula(standaloneParenEquationMatch[1]));
      continue;
    }

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

    const numberedStepMatch = normalizedLine.match(NUMBERED_STEP_PATTERN);
    if (useStepSectionFormatting && numberedStepMatch) {
      const [, indent, stepNumber, stepLabel] = numberedStepMatch;
      const headingText = trimStepLabelText(stepLabel) || `Step ${stepNumber}`;
      insertStepSeparatorIfNeeded(formattedLines, indent);
      formattedLines.push(`${indent}${stepNumber}) ${headingText}`);
      continue;
    }

    const previousLine = formattedLines[formattedLines.length - 1];
    if (previousLine && previousLine.trim().toLowerCase() === normalizedLine.trim().toLowerCase() && normalizedLine.trim().length > 24) {
      continue;
    }

    formattedLines.push(normalizedLine);
  }

  let output = collapseBlankLines(formattedLines).join('\n').trim();

  // Keep separators between steps, but avoid a trailing separator before the final answer block.
  output = output
    .replace(/\n\s*---\s*\n\n(?=> \*\*Final answer:\*\*)/g, '\n\n')
    .replace(/\n\s*---\s*$/g, '');

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
export function normalizeChatMarkdownForRender(
  input: string,
  options?: {
    stripSquareBracketEquationWrappers?: boolean;
  },
): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const stripSquareBracketEquationWrappers = options?.stripSquareBracketEquationWrappers ?? true;

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
        stripSquareBracketEquationWrappers,
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
  return applyReadableStructure(
    ensureFencedCodeSpacing(
      normalizeChatMarkdownForRender(input, { stripSquareBracketEquationWrappers: false }),
    ),
  );
}

/**
 * Storage formatter intentionally matches display formatter so persisted messages
 * keep the same readable structure after reload.
 */
export function formatAssistantResponseForStorage(input: string): string {
  return formatAssistantResponseForDisplay(input);
}
