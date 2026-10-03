// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ScientificCalculator from './ScientificCalculator';

describe('ScientificCalculator invalid expression handling', () => {
  it('keeps the calculator usable when equals is pressed with no input', () => {
    render(<ScientificCalculator isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '=' }));
    expect(screen.getByRole('dialog', { name: 'Scientific Calculator' })).toBeInTheDocument();
  });
});
