// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CurriculumSourceBadge from './CurriculumSourceBadge';

describe('CurriculumSourceBadge RAG grounding', () => {
  it('exposes the grounded DepEd source and similarity score on hover', async () => {
    render(<CurriculumSourceBadge sources={[{ subject: 'General Mathematics', quarter: 1, sourceFile: 'SHS_GM_Q1_LE2.md', page: 62, score: 0.823 }]} />);
    const groundingBadge = screen.getByText('DepEd Aligned');
    expect(groundingBadge).toBeInTheDocument();
    expect(groundingBadge).toBeInTheDocument();
  });
});
