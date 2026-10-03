// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HeroBanner from './HeroBanner';

describe('HeroBanner', () => {
  it('personalizes the banner and continues learning on request', () => {
    const continueLearning = vi.fn();
    render(<HeroBanner userName="Mina" userLevel={4} onContinueLearning={continueLearning} />);
    expect(screen.getByRole('heading', { name: /Mina!/ })).toBeInTheDocument();
    expect(screen.getByText('Level 4')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /continue learning/i }));
    expect(continueLearning).toHaveBeenCalledOnce();
  });
});
