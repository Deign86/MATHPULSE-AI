/** @vitest-environment jsdom */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AiText from './AiText';
import MathText from './MathText';

describe('AiText', () => {
  it('renders markdown emphasis instead of raw asterisks', () => {
    const { container } = render(<AiText>{'Use **PEMDAS** first'}</AiText>);
    expect(container.querySelector('strong')?.textContent).toBe('PEMDAS');
    expect(container.textContent).not.toContain('**');
  });

  it('converts \\(..\\) delimiters and typesets math', () => {
    const { container } = render(<AiText>{'The slope is \\(m = 2\\).'}</AiText>);
    expect(container.querySelector('.katex')).not.toBeNull();
    expect(container.textContent).not.toContain('\\(');
  });

  it('strips think tags and literal newlines', () => {
    const { container } = render(<AiText>{'<think>plan</think>Step 1\\nStep 2'}</AiText>);
    expect(container.textContent).not.toContain('plan');
    expect(container.textContent).toContain('Step 1');
  });

  it('inline mode produces no block paragraph', () => {
    const { container } = render(<p><AiText inline>{'A *hint* here'}</AiText></p>);
    expect(container.querySelector('p p')).toBeNull();
    expect(container.querySelector('em')?.textContent).toBe('hint');
  });

  it('renders nothing for empty input', () => {
    const { container } = render(<AiText>{'   '}</AiText>);
    expect(container.innerHTML).toBe('');
  });
});

describe('MathText markdown consistency', () => {
  it('renders bold even when the string has no math', () => {
    const { container } = render(<MathText>{'Find the **domain** of f'}</MathText>);
    expect(container.querySelector('strong')?.textContent).toBe('domain');
  });

  it('leaves plain option labels untouched', () => {
    const { container } = render(<MathText>{'All of the above'}</MathText>);
    expect(container.textContent).toBe('All of the above');
    expect(container.querySelector('strong')).toBeNull();
  });

  it('typesets \\(..\\) delimited math', () => {
    const { container } = render(<MathText>{'Solve \\(x^2 = 4\\)'}</MathText>);
    expect(container.querySelector('.katex')).not.toBeNull();
  });
});
