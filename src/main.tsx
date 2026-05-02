import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './styles/globals.css';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { registerBoneyardRegistry } from './bones/registry';
import { queryClient } from './lib/queryClient.ts';

if (import.meta.env.DEV) {
  console.log('[DEBUG] VITE_API_URL:', import.meta.env.VITE_API_URL);
  console.log('[DEBUG] VITE_FIREBASE_PROJECT_ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID);
  console.log('[DEBUG] VITE_FIREBASE_STORAGE_BUCKET:', import.meta.env.VITE_FIREBASE_STORAGE_BUCKET);
  console.log('[DEBUG] VITE_FIREBASE_DATABASE_URL:', import.meta.env.VITE_FIREBASE_DATABASE_URL);
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
