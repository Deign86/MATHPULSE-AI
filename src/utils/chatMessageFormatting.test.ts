import { describe, expect, it } from 'vitest';
import {
  formatAssistantResponseForStorage,
  formatAssistantResponseForStreaming,
  normalizeChatMarkdownForRender,
} from './chatMessageFormatting';

describe('normalizeChatMarkdownForRender', () => {
  it('wraps bare \\boxed expressions in inline math delimiters', () => {
    const input = 'Final Answer: \\boxed{3}.';

    expect(normalizeChatMarkdownForRender(input)).toBe('Final Answer: $\\boxed{3}$.');
  });

  it('does not double-wrap math already inside delimiters', () => {
    const input = 'Final Answer: $\\boxed{3}$.';

    expect(normalizeChatMarkdownForRender(input)).toBe(input);
  });

it('keeps code fences untouched', () => {
    const input = '```text\n\\boxed{3}\n```';

    expect(normalizeChatMarkdownForRender(input)).toBe(input);
  });

  it('converts bracket-wrapped math to LaTeX inline delimiters', () => {
    const input = '[ \\frac{365}{365} \\times \\frac{364}{365} ]';

    expect(normalizeChatMarkdownForRender(input)).toBe('$$\\frac{365}{365} \\times \\frac{364}{365}$$');
  });

  it('converts bracket-wrapped display math to LaTeX delimiters', () => {
    const input = '[ x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a} ]';

    expect(normalizeChatMarkdownForRender(input)).toBe('$$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$');
  });

  it('normalizes escaped newlines and double-escaped TeX commands', () => {
    const input = 'Step 1\\nFinal Answer: \\\\boxed{7}';

    expect(normalizeChatMarkdownForRender(input)).toBe('Step 1\nFinal Answer: $\\boxed{7}$');
  });

  it('keeps TeX commands that start with \\n inside math', () => {
    expect(normalizeChatMarkdownForRender('$a \\neq b$')).toBe('$a \\neq b$');
    expect(normalizeChatMarkdownForRender('$\\nabla f$')).toBe('$\\nabla f$');
    expect(normalizeChatMarkdownForRender('$\\nu + \\not\\in$')).toBe('$\\nu + \\not\\in$');
  });

  it('keeps \\t and \\r TeX commands intact', () => {
    const input = '$x \\times y \\to \\theta \\text{ok} \\right) \\rho$';
    expect(normalizeChatMarkdownForRender(input)).toBe(input);
  });

  it('still converts real escaped newlines', () => {
    expect(normalizeChatMarkdownForRender('Step 1\\nStep 2')).toBe('Step 1\nStep 2');
    expect(normalizeChatMarkdownForRender('a\\n\\nb')).toBe('a\n\nb');
    expect(normalizeChatMarkdownForRender('a\\nThe next')).toBe('a\nThe next');
  });

  it('unescapes double-escaped common commands', () => {
    expect(normalizeChatMarkdownForRender('$x \\\\le y \\\\infty \\\\mathbb{R}$')).toBe('$x \\le y \\infty \\mathbb{R}$');
  });

  it('removes raw think blocks from rendered markdown', () => {
    const input = 'Solve this<think>internal reasoning</think>\nFinal Answer: \\boxed{3}';

    expect(normalizeChatMarkdownForRender(input)).toBe('Solve this\nFinal Answer: $\\boxed{3}$');
  });

  it('removes escaped think blocks from rendered markdown', () => {
    const input = 'Visible&lt;think&gt;secret&lt;/think&gt;text';

    expect(normalizeChatMarkdownForRender(input)).toBe('Visibletext');
  });

  it('hides trailing partial think tags during streaming normalization', () => {
    const input = 'Visible answer <thi';

    expect(normalizeChatMarkdownForRender(input)).toBe('Visible answer');
  });
});

describe('formatAssistantResponseForStorage', () => {
  it('removes unterminated think blocks before persistence', () => {
    const input = 'Answer<think>internal reasoning';

    expect(formatAssistantResponseForStorage(input)).toBe('Answer');
  });

  it('recovers content when output starts with an unclosed think block', () => {
    const input = '<think>Multiply numerators and denominators to multiply fractions.';

    expect(formatAssistantResponseForStorage(input)).toBe('Multiply numerators and denominators to multiply fractions.');
  });

  it('keeps only content after orphan closing think tags', () => {
    const input = 'Plan step 1\nPlan step 2</think>\n# Final Answer\n**Multiply numerators and denominators.**';

    expect(formatAssistantResponseForStorage(input)).toBe('# Final Answer\n**Multiply numerators and denominators.**');
  });

  it('suppresses planning-style text when no final answer marker is present', () => {
    const input = '<think>Okay, the user asked about fractions.\nLet me structure this clearly.\nI should include examples.';

    expect(formatAssistantResponseForStorage(input)).toBe('');
  });

  it('extracts final section marker from leaked think content', () => {
    const input = '<think>Okay, I will draft the solution.\nWait, I should be concise.\nFinal Answer: **Use cross-cancellation first.**';

    expect(formatAssistantResponseForStorage(input)).toBe('Final Answer: **Use cross-cancellation first.**');
  });

  it('removes orphan think closing tags before persistence', () => {
    const input = 'Answer</think>';

    expect(formatAssistantResponseForStorage(input)).toBe('Answer');
  });
});

describe('formatAssistantResponseForStreaming', () => {
  it('hides leading unclosed think blocks while streaming', () => {
    const input = '<think>draft reasoning';

    expect(formatAssistantResponseForStreaming(input)).toBe('');
  });

  it('holds back an unclosed inline math span', () => {
    expect(formatAssistantResponseForStreaming('Use $\\frac{1}{')).toBe('Use');
  });

  it('holds back an unclosed display math span', () => {
    expect(formatAssistantResponseForStreaming('Area is $$A = \\pi')).toBe('Area is');
    expect(formatAssistantResponseForStreaming('Total:\n\n$$ G = 550 \\times')).toBe('Total:');
  });

  it('keeps currency amounts visible', () => {
    expect(formatAssistantResponseForStreaming('It costs $500 per week')).toBe('It costs $500 per week');
  });

  it('keeps completed spans and holds back only the open one', () => {
    expect(formatAssistantResponseForStreaming('x is $x^2$ and $\\sqrt{')).toBe('x is $x^2$ and');
    expect(formatAssistantResponseForStreaming('x is $x^2$ and $$y=1$$ done')).toBe('x is $x^2$ and $$y=1$$ done');
  });

  it('leaves code untouched', () => {
    const fenced = '```\n$\\frac\n```';
    expect(formatAssistantResponseForStreaming(fenced)).toBe(fenced);
    expect(formatAssistantResponseForStreaming('Run `$x^` now')).toBe('Run `$x^` now');
    expect(formatAssistantResponseForStreaming('Try ```\n$\\frac')).toBe('Try ```\n$\\frac');
  });

  it('ignores escaped dollar signs', () => {
    expect(formatAssistantResponseForStreaming('Pay \\$x^2 now')).toBe('Pay \\$x^2 now');
  });

  it('holds back unclosed \\( and \\[ spans', () => {
    expect(formatAssistantResponseForStreaming('Then \\(x^2 +')).toBe('Then');
    expect(formatAssistantResponseForStreaming('Then \\[x = \\frac{1}')).toBe('Then');
    expect(formatAssistantResponseForStreaming('Then \\(x\\) and \\[y')).toBe('Then \\(x\\) and');
  });
});
