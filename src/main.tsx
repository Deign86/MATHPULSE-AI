import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './styles/globals.css';
// Ensure KaTeX styles are loaded globally so math rendering remains consistent
import 'katex/dist/katex.min.css';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { registerBoneyardRegistry } from './bones/registry';
import { queryClient } from './lib/queryClient.ts';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { applySettingsFromCache } from './services/settingsService.ts';

// Apply cached theme/font before React renders to prevent flash
applySettingsFromCache();

// Clear the ErrorBoundary's stale-chunk reload flag on each fresh load. If
// the new bundle loaded successfully (we made it this far in main.tsx), the
// flag from the previous reload is no longer needed — clearing it now lets a
// future stale-chunk failure also auto-recover.
try {
  sessionStorage.removeItem('mathpulse_chunk_reload_attempted');
} catch {
  /* ignore */
}

// Global error handlers — catch unhandled errors and promise rejections
// that would otherwise result in silent failures or blank screens.
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    console.error('[global] Uncaught error:', event.error?.message ?? event.message);
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('[global] Unhandled promise rejection:', event.reason?.message ?? event.reason);
    // Prevent the default browser console warning
    event.preventDefault();
  });
}

// Suppress browser console.log/info in production builds (localhost dev shows them)
if (!import.meta.env.DEV) {
  // Preserve original for any emergency debugging needs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const _noop = (..._args: any[]) => {};
  console.log = _noop;
  console.info = _noop;
  console.debug = _noop;
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <ErrorBoundary>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </ErrorBoundary>
);

registerBoneyardRegistry();
