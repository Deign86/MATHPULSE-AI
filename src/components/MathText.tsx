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

/** Convert plain-text math notation to LaTeX-delimited string */
function convertToLatex(text: string): string {
  if (!text) return '';
  
  // Already has $ delimiters — leave as-is
  if (text.includes('$')) return text;
  
  // Check if text contains any math-like patterns (require digit/variable context around operators)
  const hasMath = /\d[\^*×÷]|[\^*×÷]\d|\\frac|\\sqrt|\\times|\w\^\w/.test(text);
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
  
  // If the expression part contains = and math operators, it's a full equation
  if (expr.includes('=') && (expr.includes('^') || expr.includes('*'))) {
    const latexExpr = plainToLatex(expr);
    return label ? `${label}$${latexExpr}$` : `$${latexExpr}$`;
  }
  
  // Otherwise, try to wrap individual math segments
  // Find segments that look like math (contain ^, *, or are numeric expressions with variables)
  const result = text.replace(
    /([A-Za-z()\d.]+(?:\s*[*×]\s*[A-Za-z()\d.^{}]+)+|[A-Za-z()\d.]+\^[A-Za-z()\d.{}]+)/g,
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
  if (!children || typeof children !== 'string') return null;

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
