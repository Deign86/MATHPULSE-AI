import { describe, expect, it } from 'vitest';
import { toChatPreviewText } from './chatPreview';

describe('toChatPreviewText', () => {
  it('strips common markdown wrappers while preserving text content', () => {
    const input = '## Title\n- **Problem:** `3 * 4`\n- [Reference](https://example.com)';

    expect(toChatPreviewText(input)).toBe('Title Problem: 3 * 4 Reference');
  });

  it('preserves multiplication stars in plain math text', () => {
    expect(toChatPreviewText('Compute 3 * 4 = 12')).toBe('Compute 3 * 4 = 12');
  });

  it('normalizes latex delimiters and whitespace', () => {
    const input = 'Answer is $x^2$\n\nAnd $$y = mx + b$$';

    expect(toChatPreviewText(input)).toBe('Answer is x^2 And y = mx + b');
  });

  it('converts bare TeX commands to readable preview text', () => {
    const input = 'Final Answer: \\boxed{3} and \\frac{1}{2}';

    expect(toChatPreviewText(input)).toBe('Final Answer: 3 and 1/2');
  });

  it('removes think-tag content from preview text', () => {
    const input = 'Result<think>hidden reasoning</think>: 42';

    expect(toChatPreviewText(input)).toBe('Result: 42');
  });

  it('removes dangling markdown markers when response is malformed', () => {
    const input = 'Let\'s solve: **Final Answer: 40 boxes';

    expect(toChatPreviewText(input)).toBe("Let's solve: Final Answer: 40 boxes");
  });

  it('limits preview text to 80 characters by default', () => {
    const input = 'a'.repeat(120);
    const output = toChatPreviewText(input);

    expect(output).toHaveLength(80);
    expect(output).toBe(input.slice(0, 80));
  });

  it('returns empty string for empty input', () => {
    expect(toChatPreviewText('')).toBe('');
  });
});
