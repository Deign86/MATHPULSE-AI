import { describe, expect, it } from 'vitest';
import { formatAssistantResponseForStorage, normalizeChatMarkdownForRender } from './chatMessageFormatting';

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
    const input = '```text\\n\\boxed{3}\\n```';

    expect(normalizeChatMarkdownForRender(input)).toBe(input);
  });

  it('normalizes escaped newlines and double-escaped TeX commands', () => {
    const input = 'Step 1\\nFinal Answer: \\\\boxed{7}';

    expect(normalizeChatMarkdownForRender(input)).toBe('Step 1\nFinal Answer: $\\boxed{7}$');
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

    expect(normalizeChatMarkdownForRender(input)).toBe('Visible answer ');
  });
});

describe('formatAssistantResponseForStorage', () => {
  it('removes unterminated think blocks before persistence', () => {
    const input = 'Answer<think>internal reasoning';

    expect(formatAssistantResponseForStorage(input)).toBe('Answer');
  });

  it('removes orphan think closing tags before persistence', () => {
    const input = 'Answer</think>';

    expect(formatAssistantResponseForStorage(input)).toBe('Answer');
  });
});
