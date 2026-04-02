import { describe, expect, it } from 'vitest';
import {
  formatAssistantResponseForDisplay,
  formatAssistantResponseForStorage,
  normalizeChatMarkdownForRender,
} from './chatMessageFormatting';

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

describe('formatAssistantResponseForDisplay', () => {
  it('normalizes step markers and removes transitional filler lines', () => {
    const input = [
      '1) Multiply first',
      '7 x 8 = 56',
      'Now:',
      '2) Subtract 9',
      '56 - 9 = 47',
    ].join('\n');

    const output = formatAssistantResponseForDisplay(input);

    expect(output).toContain('1. Multiply first');
    expect(output).toContain('2. Subtract 9');
    expect(output).not.toContain('Now:');
  });

  it('promotes explicit final-answer lines into a highlighted blockquote line', () => {
    const input = [
      'Step 1: Multiply 7 x 8',
      '7 x 8 = 56',
      'Final answer: 9916',
    ].join('\n');

    const output = formatAssistantResponseForDisplay(input);

    expect(output).toContain('1. Multiply 7 x 8');
    expect(output).toContain('> **Final answer:** 9916');
    expect(output).not.toContain('Final answer: 9916');
  });

  it('preserves code fences while formatting surrounding prose', () => {
    const input = [
      '1) Review this snippet',
      '```txt',
      'Now:',
      'Final answer: leave this untouched',
      '```',
      'Final answer: done',
    ].join('\n');

    const output = formatAssistantResponseForDisplay(input);

    expect(output).toContain('1. Review this snippet');
    expect(output).toContain('```txt\nNow:\nFinal answer: leave this untouched\n```');
    expect(output).toContain('> **Final answer:** done');
  });

  it('is idempotent when applied repeatedly', () => {
    const input = [
      'Step 1: Solve equation',
      'x + 2 = 5',
      'x = 3',
      'Final answer: x = 3',
    ].join('\n');

    const once = formatAssistantResponseForDisplay(input);
    const twice = formatAssistantResponseForDisplay(once);

    expect(twice).toBe(once);
  });
});

describe('formatAssistantResponseForStorage', () => {
  it('matches the display formatter output', () => {
    const input = '1) Test\nFinal answer: 42';

    expect(formatAssistantResponseForStorage(input)).toBe(formatAssistantResponseForDisplay(input));
  });
});
