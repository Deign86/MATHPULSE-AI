import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { ErrorBoundary } from './ErrorBoundary.tsx';

interface TabErrorBoundaryProps {
  routeName: string;
  onHome?: () => void;
  children: React.ReactNode;
}

/**
 * Per-route error boundary (issue #159 item 5).
 *
 * The app drives views through `activeTab` state rather than React-Router
 * routes, so each tab gets its own boundary keyed by route name — the
 * equivalent of a per-route `errorElement`. A crash in one tab shows a
 * visible retry card instead of the app-wide fallback or a blank screen.
 */
export const TabErrorBoundary: React.FC<TabErrorBoundaryProps> = ({
  routeName,
  onHome,
  children,
}) => {
  const [retryCount, setRetryCount] = useState(0);
  return (
    <ErrorBoundary
      key={`${routeName}-${retryCount}`}
      fallback={
        <div
          role="alert"
          data-testid={`route-error-${routeName}`}
          className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Couldn&apos;t load {routeName}
          </h2>
          <p className="max-w-sm text-sm text-slate-500">
            Something went wrong in this section. Your progress is saved — try
            again or head back to the dashboard.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRetryCount((count) => count + 1)}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-violet-700"
            >
              Try again
            </button>
            {onHome && (
              <button
                type="button"
                onClick={onHome}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Back to Dashboard
              </button>
            )}
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
};

export default TabErrorBoundary;
