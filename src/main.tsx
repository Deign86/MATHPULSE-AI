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

// Suppress browser console.log/info in production builds (localhost:3000 dev shows them)
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
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

registerBoneyardRegistry();
