// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useAuth } from './AuthContext';

function AuthStatus() {
  const { loading, isLoggedIn, userRole } = useAuth();
  return <output>{`${loading}:${isLoggedIn}:${userRole}`}</output>;
}

describe('AuthContext defaults', () => {
  it('defaults unauthenticated sessions to the student role while loading', () => {
    render(<AuthStatus />);
    expect(screen.getByText('true:false:student')).toBeInTheDocument();
  });
});
