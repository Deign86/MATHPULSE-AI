// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as authService from '../services/authService';
import LoginPage from './LoginPage';

const resetPasswordSpy = vi.spyOn(authService, 'resetPassword');

describe('LoginPage password reset', () => {
  beforeEach(() => {
    resetPasswordSpy.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the forgot password button on the sign-in view', () => {
    render(<LoginPage />);

    expect(screen.getByRole('button', { name: 'Forgot password?' })).toBeInTheDocument();
  });

  it('opens the reset view when forgot password is clicked', () => {
    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));

    expect(screen.getByRole('button', { name: 'Send reset link' })).toBeInTheDocument();
  });

  it('shows an error for an empty email without calling resetPassword', () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));

    const submitButton = screen.getByRole('button', { name: 'Send reset link' });
    const form = submitButton.closest('form');
    if (!form) {
      throw new Error('Password reset form was not rendered');
    }
    fireEvent.submit(form);

    expect(screen.getByRole('alert')).toHaveTextContent(/email/i);
    expect(resetPasswordSpy).not.toHaveBeenCalled();
  });

  it('shows neutral success when the reset email has no matching account', async () => {
    resetPasswordSpy.mockRejectedValue({ code: 'auth/user-not-found' });
    render(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'student@example.com' },
    });

    const submitButton = screen.getByRole('button', { name: 'Send reset link' });
    const form = submitButton.closest('form');
    if (!form) {
      throw new Error('Password reset form was not rendered');
    }
    fireEvent.submit(form);

    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(resetPasswordSpy).toHaveBeenCalledWith('student@example.com');
  });
});
