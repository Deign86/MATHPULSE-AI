import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

/**
 * MathText — Renders text with inline math support for quiz questions/options.
 * 
 * Handles:
 *  - LaTeX delimiters: $...$ for inline, $$...$$ for display
 *  - Common patterns: x^2, t^2, \frac{a}{b}, \sqrt{x}
 *  - Auto-wraps bare math patterns (like "100t^2") in $ delimiters
 */

interface MathTextProps {
  children: string;
  className?: string;
}

/** Patterns that indicate math content needing LaTeX wrapping */
const MATH_PATTERNS = [
  /\^[\d{]/,           // x^2, x^{10}
  /_[\d{]/,            // x_1, x_{10}
  /\\frac/,            // \frac{a}{b}
  /\\sqrt/,            // \sqrt{x}
  /\\(?:times|cdot|pm|mp|leq|geq|neq|approx|infty|pi|theta|alpha|beta|sum|int|lim)\b/,
];

/** Auto-wrap bare math expressions in $ delimiters */
function autoWrapMath(text: string): string {
  if (!text) return '';
  
  // Already has $ delimiters — leave as-is
  if (text.includes('$')) return text;
  
  // Check if text contains math-like patterns that need wrapping
  const hasMathPattern = MATH_PATTERNS.some(p => p.test(text));
  if (!hasMathPattern) return text;

  // Wrap individual math expressions within the text
  // Match patterns like: 100t^2, x^{2}, \frac{1}{2}, 3x^2 + 2x
  return text.replace(
    /(?:(?:\d+)?[a-zA-Z]?\^[\d{][^,.\s)]*|\\(?:frac|sqrt|times|cdot|pm|mp|leq|geq|neq|approx|infty|pi|theta|alpha|beta|sum|int|lim)[^,.\s)]*)/g,
    (match) => `$${match}$`
  );
}

const MathText: React.FC<MathTextProps> = ({ children, className }) => {
  if (!children || typeof children !== 'string') return null;

  const processed = autoWrapMath(children);

  // If no math delimiters after processing, render as plain text (faster)
  if (!processed.includes('$')) {
    return <span className={className}>{processed}</span>;
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        p: ({ children }) => <span className={className}>{children}</span>,
      }}
    >
      {processed}
    </ReactMarkdown>
  );
};

export default MathText;
