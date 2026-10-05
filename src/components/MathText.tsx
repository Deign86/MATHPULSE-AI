import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

/**
 * MathText — Renders text with inline math support for quiz questions/options.
 * 
 * Converts common plain-text math notation to LaTeX:
 *  - Caret exponents: x^2, (0.8)^h, 2^t, e^x
 *  - Asterisk multiplication: 500 * (0.8)^h → 500 \times (0.8)^h
 *  - Fractions written as a/b
 *  - Already-delimited LaTeX ($...$, $$...$$)
 */

interface MathTextProps {
  children: string;
  className?: string;
}

export function isString<T>(value: T): value is T & string {
  return typeof value === 'string';
}

/** Names that legitimately appear as words inside a pure equation. */
const MATH_FUNCTION_WORDS = new Set([
  'log', 'ln', 'sin', 'cos', 'tan', 'exp', 'max', 'min', 'sec', 'csc', 'cot',
  'lim', 'abs', 'deg', 'rad', 'mod', 'inf', 'sup',
]);

/** Short everyday words that mark a string as prose, not a bare equation. */
const PROSE_CONNECTORS = new Set(['to', 'of', 'is', 'if', 'in', 'on', 'by', 'as', 'or', 'and', 'the']);

/**
 * S7: prose must never be wrapped in $...$ — KaTeX math mode collapses the
 * spaces between numbers and words, turning "500 to 600" into "500to600".
 * A word token that is lowercase and not a known math function word marks
 * the text as prose.
 */
function containsProse(text: string): boolean {
  return text
    .split(/[^A-Za-z]+/)
    .some((token) => {
      if (token.length === 0 || token !== token.toLowerCase()) return false;
      if (PROSE_CONNECTORS.has(token)) return true;
      return token.length >= 3 && !MATH_FUNCTION_WORDS.has(token);
    });
}

/** Convert plain-text math notation to LaTeX-delimited string */
function convertToLatex(text: string): string {
  if (!text) return '';
  
  // Already has $ delimiters — leave as-is
  if (text.includes('$')) return text;
  
  // Check if text contains any math-like patterns (require digit/variable context around operators).
  // S7 fix: a closing paren also counts as math context — "(0.8)^h" has ")" before "^".
  const hasMath = /\d[\^*×÷]|[\^*×÷]\d|\\frac|\\sqrt|\\times|\w\^\w|\)\^|[A-Za-z]_\{[^}]+\}/.test(text);
  if (!hasMath) return text;

  // Strategy: find math expressions within the text and wrap them in $...$
  // Split on sentence structure to avoid wrapping entire sentences
  
  // Pattern: match math expressions that contain ^ or * with numbers/variables
  // Examples: "500 * (0.8)^h", "100 * 2^t", "f(t) = 100 * t^2", "N(h) = 500 * (1.2)^h"
  
  // If the text looks like a full math expression (e.g., an option like "N(h) = 500 * (0.8)^h")
  // Check if it starts with a label like "A: " or similar
  const labelMatch = text.match(/^([A-Z]:\s*)/);
  const label = labelMatch ? labelMatch[1] : '';
  const expr = label ? text.slice(label.length) : text;
  
  // If the expression part contains = and math operators, it's a full equation.
  // S7: only wrap the whole string when it is a pure equation. If it also contains
  // prose words, wrapping it in $...$ sends the sentence through KaTeX, which drops
  // the spaces between numbers and words ("500 to 600" → "500to600"). Prose mixed
  // with math falls through to per-segment wrapping below instead.
  if (expr.includes('=') && (expr.includes('^') || expr.includes('*')) && !containsProse(expr)) {
    const latexExpr = plainToLatex(expr);
    return label ? `${label}$${latexExpr}$` : `$${latexExpr}$`;
  }
  
  // Otherwise, try to wrap individual math segments
  // Find segments that look like math (contain ^, *, or are numeric expressions with variables)
  const result = text.replace(
    /([A-Za-z()\d.]+(?:\s*[*×]\s*[A-Za-z()\d.^{}]+)+|[A-Za-z()\d.]+\^[A-Za-z()\d.{}]+|[A-Za-z]_\{[^}]+\})/g,
    (match) => `$${plainToLatex(match)}$`
  );
  
  return result;
}

/** Convert plain math notation to LaTeX syntax */
function plainToLatex(expr: string): string {
  let result = expr;
  
  // Replace * with \times
  result = result.replace(/\s*\*\s*/g, ' \\times ');
  
  // Replace ^ with proper LaTeX superscript — always wrap in {} for robustness
  result = result.replace(/\^(\{[^}]+\})/g, '^$1'); // already braced — keep as-is
  result = result.replace(/\^([^{])/g, '^{$1}'); // single char → wrap in {}
  
  return result;
}

const MathText: React.FC<MathTextProps> = ({ children, className }) => {
  if (!children || !isString(children)) return null;

  const processed = convertToLatex(children);

  // If no math delimiters after processing, render as plain text
  if (!processed.includes('$')) {
    return <span className={className}>{children}</span>;
  }

  return (
    <span className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children }) => <>{children}</>,
        }}
      >
        {processed}
      </ReactMarkdown>
    </span>
  );
};

export default MathText;
