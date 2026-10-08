/** @vitest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ConfirmModal from '../ConfirmModal';

describe('ConfirmModal', () => {
  it('does not render content into DOM when isOpen is false', () => {
    const handleClose = vi.fn();
    const handleConfirm = vi.fn();

    render(
      <ConfirmModal
        isOpen={false}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title="Test Title"
        message="Test Message"
      />
    );

    expect(screen.queryByText('Test Title')).toBeNull();
  });

  it('renders into document.body with z-[100] when isOpen is true', () => {
    const handleClose = vi.fn();
    const handleConfirm = vi.fn();

    render(
      <div id="container-root">
        <ConfirmModal
          isOpen={true}
          onClose={handleClose}
          onConfirm={handleConfirm}
          title="Confirm Action"
          message="Are you sure you want to proceed?"
          confirmText="Yes, Proceed"
          cancelText="Never mind"
        />
      </div>
    );

    // Modal should be visible in document
    const titleEl = screen.getByText('Confirm Action');
    expect(titleEl).toBeInTheDocument();

    // Verify it portaled outside of #container-root into document.body
    const container = document.getElementById('container-root');
    expect(container?.contains(titleEl)).toBe(false);
    expect(document.body.contains(titleEl)).toBe(true);

    // Backdrop should contain z-[100]
    const backdrop = document.querySelector('.z-\\[100\\]');
    expect(backdrop).not.toBeNull();
  });

  it('triggers onConfirm and onClose when buttons are clicked', () => {
    const handleClose = vi.fn();
    const handleConfirm = vi.fn();

    render(
      <ConfirmModal
        isOpen={true}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title="Delete Item"
        message="Will delete item"
        confirmText="Delete"
        cancelText="Cancel"
      />
    );

    fireEvent.click(screen.getByText('Delete'));
    expect(handleConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Cancel'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('exposes an alert dialog labelled by its title and described by its message', () => {
    render(<ConfirmModal isOpen onClose={vi.fn()} onConfirm={vi.fn()} title="Purge index" message="This cannot be undone." />);
    const dialog = screen.getByRole('alertdialog', { name: 'Purge index' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-describedby')).toBe(screen.getByText('This cannot be undone.').id);
  });

  it('closes on Escape while open and stops listening once closed', () => {
    const handleClose = vi.fn();
    const { rerender } = render(<ConfirmModal isOpen onClose={handleClose} onConfirm={vi.fn()} title="Escape me" message="Sure?" />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);

    rerender(<ConfirmModal isOpen={false} onClose={handleClose} onConfirm={vi.fn()} title="Escape me" message="Sure?" />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
