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

  it('renders plain prose without math untouched', () => {
    expect(renderedText('What is the mean of 4, 7, and 12?')).toBe('What is the mean of 4, 7, and 12?');
  });
});

describe('MathText block mode (STU-012)', () => {
  it('renders bare-subscript formula lines as KaTeX', () => {
    const { container } = render(<MathText block>S_n = n/2 [2a + (n-1)d]</MathText>);
    expect(container.querySelector('.katex')).not.toBeNull();
  });

  it('renders braced subscripts without mangling them', () => {
    const { container } = render(<MathText block>{'a_n = a_{n-1} + 4'}</MathText>);
    const katex = container.querySelector('.katex');
    expect(katex).not.toBeNull();
    expect(katex?.textContent).toContain('a');
  });

  it('leaves prose without equation signals alone even in spirit', () => {
    expect(renderedText('Review your notes before the quiz')).toBe(
      'Review your notes before the quiz',
    );
  });
});
