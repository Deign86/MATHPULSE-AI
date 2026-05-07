import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './styles/globals.css';
// Ensure KaTeX styles are loaded globally so math rendering remains consistent
import 'katex/dist/katex.min.css';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { registerBoneyardRegistry } from './bones/registry';
import { queryClient } from './lib/queryClient.ts';

if (import.meta.env.DEV) {
  // Debug env vars available via browser console if needed
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <App />
    </AuthProvider>
  </QueryClientProvider>
);

registerBoneyardRegistry();
