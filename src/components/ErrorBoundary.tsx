/**
 * @file ErrorBoundary.tsx
 * React Error Boundary — catches render errors (including React Minified Error #31)
 * and displays a fallback UI instead of a blank white screen.
 *
 * Also auto-recovers from Vite/Webpack dynamic-import failures (stale chunk
 * after dev server restart, or hash mismatch after a deploy). The first such
 * failure triggers a single hard reload — a sessionStorage flag prevents an
 * infinite reload loop if the underlying module is genuinely broken.
 */
import React, { Component, type ErrorInfo, type ReactNode } from 'react';

const CHUNK_RELOAD_FLAG = 'mathpulse_chunk_reload_attempted';

/** Match Vite's dynamic-import failure plus Webpack's chunk-load failure. */
const CHUNK_LOAD_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /Loading chunk \d+ failed/i,
  /Importing a module script failed/i,
  /error loading dynamically imported module/i,
];

function isChunkLoadError(error: Error | null): boolean {
  if (!error?.message) return false;
  return CHUNK_LOAD_PATTERNS.some((pattern) => pattern.test(error.message));
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught render error:', error.message, errorInfo.componentStack);

    // Auto-reload once on stale dynamic-import errors. Common after a Vite
    // dev server restart or a fresh deploy invalidates the chunk hash that
    // the in-memory React tree still references.
    if (isChunkLoadError(error)) {
      try {
        const alreadyTried = sessionStorage.getItem(CHUNK_RELOAD_FLAG);
        if (!alreadyTried) {
          sessionStorage.setItem(CHUNK_RELOAD_FLAG, String(Date.now()));
          console.warn('[ErrorBoundary] Stale chunk detected — reloading to recover.');
          window.location.reload();
        }
      } catch {
        // sessionStorage unavailable — skip auto-recovery
      }
    }
  }

  handleReset = (): void => {
    // Clear the chunk-reload flag so a fresh failure can recover next time.
    try {
      sessionStorage.removeItem(CHUNK_RELOAD_FLAG);
    } catch {
      /* ignore */
    }
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Stale-chunk auto-recovery: the reload is already firing in
      // componentDidCatch. Render null briefly so we don't flash the error UI
      // before the page reloads. If the reload was already attempted this
      // session, fall through to the manual recovery UI.
      if (isChunkLoadError(this.state.error)) {
        let alreadyTried = false;
        try {
          alreadyTried = Boolean(sessionStorage.getItem(CHUNK_RELOAD_FLAG));
        } catch {
          /* ignore */
        }
        if (!alreadyTried) {
          return null;
        }
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-8 text-center">
          <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="mb-2 text-xl font-semibold text-slate-900">
              Something went wrong
            </h2>
            <p className="mb-6 text-sm text-slate-600">
              The application encountered an unexpected error. Please try refreshing the page.
            </p>
            {this.state.error && (
              <pre className="mb-6 max-h-24 overflow-auto rounded bg-red-50 p-3 text-left text-xs text-red-700">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="ml-3 rounded-lg border border-slate-300 bg-white px-6 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Refresh page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
