// @vitest-environment jsdom
/**
 * @file RequireRole.test.tsx
 * Characterization tests for issue #156 (client-side role gating).
 *
 * TeacherDashboard / AdminDashboard must render behind an explicit role
 * guard: a student (or signed-out) session sees an access-denied panel
 * with a way back to login — never the privileged dashboard.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { RequireRole } from './RequireRole';

afterEach(() => cleanup());

describe('RequireRole guard (issue #156)', () => {
  it('renders the dashboard when the role is allowed', () => {
    render(
      <RequireRole allowed={['admin']} userRole="admin" loading={false} onGoToLogin={vi.fn()}>
        <div>Admin dashboard content</div>
      </RequireRole>,
    );
    expect(screen.getByText('Admin dashboard content')).toBeInTheDocument();
  });

  it('blocks a student from the admin dashboard with a login path', () => {
    const onGoToLogin = vi.fn();
    render(
      <RequireRole allowed={['admin']} userRole="student" loading={false} onGoToLogin={onGoToLogin}>
        <div>Admin dashboard content</div>
      </RequireRole>,
    );
    expect(screen.queryByText('Admin dashboard content')).not.toBeInTheDocument();
    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /back to login/i }));
    expect(onGoToLogin).toHaveBeenCalledTimes(1);
  });

  it('blocks unauthenticated (null role) sessions', () => {
    render(
      <RequireRole allowed={['teacher', 'admin']} userRole={null} loading={false} onGoToLogin={vi.fn()}>
        <div>Teacher dashboard content</div>
      </RequireRole>,
    );
    expect(screen.queryByText('Teacher dashboard content')).not.toBeInTheDocument();
    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
  });
});
