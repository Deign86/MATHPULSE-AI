import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './styles/globals.css';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { registerBoneyardRegistry } from './bones/registry';
import { queryClient } from './lib/queryClient.ts';

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
