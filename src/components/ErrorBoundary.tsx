/**
 * @file ErrorBoundary.tsx
 * React Error Boundary — catches render errors (including React Minified Error #31)
 * and displays a fallback UI instead of a blank white screen.
 */
import React, { Component, type ErrorInfo, type ReactNode } from 'react';

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
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
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
