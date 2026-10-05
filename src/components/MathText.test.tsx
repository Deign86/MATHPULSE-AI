// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MathText from './MathText';

function renderedText(source: string): string {
  const { container } = render(<MathText>{source}</MathText>);
  return (container.textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('MathText spacing (S7)', () => {
  it('keeps spaces between numbers and words in prose that also contains math', () => {
    const out = renderedText('The domain is 500 to 600 when x^2 = 4');
    expect(out).toContain('500 to 600');
    expect(out).not.toContain('500to');
  });

  it('does not send whole sentences through KaTeX when prose is mixed with an equation', () => {
    const { container } = render(<MathText>The population P(t) = 500 * 2^t doubles each year</MathText>);
    const rendered = (container.textContent ?? '').replace(/\s+/g, ' ');
    expect(rendered).toContain('The population');
    expect(rendered).toContain('doubles each year');
    expect(container.querySelector('.katex')).not.toBeNull();
  });

  it('still full-wraps pure equations as a single math expression', () => {
    const { container } = render(<MathText>N(h) = 500 * (0.8)^h</MathText>);
    const katex = container.querySelector('.katex');
    expect(katex).not.toBeNull();
    expect(katex?.textContent).toContain('500');
  });

  it('renders an un-delimited indexed variable as math instead of raw underscores', () => {
    const { container } = render(<MathText>{'a_{n-1}'}</MathText>);
    expect(container.querySelector('.katex')).not.toBeNull();
    expect(container.textContent).not.toContain('_');
  });

  it('renders plain prose without math untouched', () => {
    expect(renderedText('What is the mean of 4, 7, and 12?')).toBe('What is the mean of 4, 7, and 12?');
  });
});
