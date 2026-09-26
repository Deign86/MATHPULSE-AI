// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

afterEach(() => cleanup());

describe('App role routing', () => {
  it('does not mount student content for an authenticated unknown role', async () => {
    render(
      <MemoryRouter>
        <App
          authOverride={{
            currentUser: null,
            userProfile: null,
            // SAFETY: Runtime auth profiles can contain roles outside UserRole.
            userRole: 'unknown' as never,
            loading: false,
            isLoggedIn: true,
            refreshProfile: async () => {},
          }}
        />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/access denied/i)).toBeInTheDocument();
    expect(screen.queryByText('Dashboard', { exact: true })).not.toBeInTheDocument();
  });
});
