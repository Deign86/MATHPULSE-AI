import { describe, expect, it } from 'vitest';
import { normalizeChatMarkdownForRender } from './chatMessageFormatting';

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
});
