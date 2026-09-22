// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ScientificCalculator from './ScientificCalculator';

afterEach(() => cleanup());

function pressCalcKeys() {
  fireEvent.click(screen.getByRole('button', { name: '2' }));
  fireEvent.click(screen.getByRole('button', { name: '+' }));
  fireEvent.click(screen.getByRole('button', { name: '2' }));
  fireEvent.click(screen.getByRole('button', { name: '×' }));
  fireEvent.click(screen.getByRole('button', { name: '2' }));
  fireEvent.click(screen.getByRole('button', { name: '=' }));
}

describe('ScientificCalculator modal close paths (issue #152)', () => {
  it('Escape calls onClose instead of just clearing the display', () => {
    const onClose = vi.fn();
    render(<ScientificCalculator isOpen onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Escape closes even when the dialog was never clicked (Alt+K open path)', () => {
    const onClose = vi.fn();
    render(<ScientificCalculator isOpen onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Close calculator button is labelled and fires onClose', () => {
    const onClose = vi.fn();
    render(<ScientificCalculator isOpen onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close calculator' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Escape does not unmount inline embeds', () => {
    const onClose = vi.fn();
    render(<ScientificCalculator isOpen onClose={onClose} inline />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('restores focus to the trigger when the modal closes', () => {
    const onClose = vi.fn();
    render(
      <div>
        <button type="button" aria-label="Scientific Calculator">
          open
        </button>
      </div>,
    );
    const trigger = screen.getByRole('button', { name: 'Scientific Calculator' });
    trigger.focus();
    const { rerender } = render(<ScientificCalculator isOpen onClose={onClose} />);
    rerender(<ScientificCalculator isOpen={false} onClose={onClose} />);
    expect(document.activeElement).toBe(trigger);
  });

  it('still evaluates 2+2x2=6 (operator precedence intact)', () => {
    render(<ScientificCalculator isOpen onClose={vi.fn()} />);
    pressCalcKeys();
    const resultLine = screen.getByText(
      (_content, element) => element?.tagName === 'DIV' && element.textContent === '6',
    );
    expect(resultLine).toBeInTheDocument();
  });
});
