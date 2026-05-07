/** @vitest-environment jsdom */
import React from 'react';
import { render, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ChatMarkdown from './ChatMarkdown';

describe('ChatMarkdown streaming→final integration', () => {
  it('renders KaTeX HTML after final content replaces streaming partial', async () => {
    const partial = 'The value is $\\frac{x';
    const final = 'The value is $\\frac{x}{2}$';

    const { container, rerender } = render(<ChatMarkdown>{partial}</ChatMarkdown>);

    // Initially, partial/invalid LaTeX should not produce KaTeX output
    expect(container.querySelector('.katex')).toBeNull();

    // Rerender with final content (simulating stream completion)
    await act(async () => {
      rerender(<ChatMarkdown>{final}</ChatMarkdown>);
    });

    // After final content, rehype-katex should have produced KaTeX HTML
    const katexEl = container.querySelector('.katex');
    expect(katexEl).not.toBeNull();
  });
});
