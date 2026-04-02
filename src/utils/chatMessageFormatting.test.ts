import { describe, expect, it } from 'vitest';
import { normalizeChatMarkdownForRender } from './chatMessageFormatting';

describe('normalizeChatMarkdownForRender', () => {
  it('strips bare \\boxed wrappers to readable values', () => {
    const input = 'Final Answer: \\boxed{3}.';

    expect(normalizeChatMarkdownForRender(input)).toBe('Final Answer: 3.');
  });

  it('keeps math delimiters while stripping \\boxed wrappers inside them', () => {
    const input = 'Final Answer: $\\boxed{3}$.';

    expect(normalizeChatMarkdownForRender(input)).toBe('Final Answer: $3$.');
  });

  it('keeps code fences untouched', () => {
    const input = '```text\\n\\boxed{3}\\n```';

    expect(normalizeChatMarkdownForRender(input)).toBe(input);
  });

  it('normalizes escaped newlines and double-escaped TeX commands', () => {
    const input = 'Step 1\\nFinal Answer: \\\\boxed{7}';

    expect(normalizeChatMarkdownForRender(input)).toBe('Step 1\nFinal Answer: 7');
  });

  it('removes timing breakdown noise and keeps the math answer content', () => {
    const input = [
      'Timing Results: It took approximately 381 ms.',
      'Breakdown of Response Time:',
      '1. Problem Parsing: 20 ms',
      '2. Final Answer Presentation: 30 ms',
      '',
      'Final Answer: (99922)',
    ].join('\n');

    expect(normalizeChatMarkdownForRender(input)).toBe('Final Answer: (99922)');
  });

  it('converts inline \\times and \\boxed artifacts to readable output', () => {
    const input = 'Compute (7 \\times 8). Final answer: \\boxed{56}';

    expect(normalizeChatMarkdownForRender(input)).toBe('Compute (7 × 8). Final answer: 56');
  });

  it('strips equation square-bracket wrappers used by some model outputs', () => {
    const input = 'First: [ 7 × 8 = 56 ] then continue.';

    expect(normalizeChatMarkdownForRender(input)).toBe('First: 7 × 8 = 56 then continue.');
  });
});
