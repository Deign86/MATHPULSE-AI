import React from 'react';
import { ShieldAlert } from 'lucide-react';
import type { UserRole } from '../types/models';

interface RequireRoleProps {
  allowed: UserRole[];
  userRole: UserRole | null;
  loading: boolean;
  onGoToLogin: () => void;
  children: React.ReactNode;
}

export const RequireRole: React.FC<RequireRoleProps> = ({
  allowed,
  userRole,
  loading,
  onGoToLogin,
  children,
}) => {
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status" aria-live="polite">
        <p className="text-sm text-slate-500">Verifying access…</p>
      </div>
    );
  }
  if (userRole === null || !allowed.includes(userRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
          <ShieldAlert size={32} className="mx-auto text-rose-500" aria-hidden="true" />
          <h1 className="mt-4 text-lg font-bold text-slate-900">Access denied</h1>
          <p className="mt-2 text-sm text-slate-500">
            Your account does not have permission to view this dashboard. Please sign in with an
            authorized account.
          </p>
          <button
            type="button"
            onClick={onGoToLogin}
            className="mt-6 w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition-colors min-h-[44px]"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};
