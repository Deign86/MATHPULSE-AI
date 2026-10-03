// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LoginPage from './LoginPage';

describe('LoginPage authentication actions', () => {
  it('offers email sign-in and registration entry points', () => {
    render(<LoginPage />);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /don't have an account\? create one/i })).toBeInTheDocument();
  });
});
