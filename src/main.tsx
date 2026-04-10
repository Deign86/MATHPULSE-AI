import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './critical.css';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { registerBoneyardRegistry } from './bones/registry';

let fullStylesLoadStarted = false;

const loadFullStyles = () => {
  if (fullStylesLoadStarted) return;
  fullStylesLoadStarted = true;

  import('./index.css')
    .catch((error) => {
      console.error('[styles] Deferred full stylesheet failed to load:', error);
    });
};

if (typeof window !== 'undefined') {
  const requestIdle = (
    window as {
      requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
    }
  ).requestIdleCallback;
  const cancelIdle = (
    window as {
      cancelIdleCallback?: (handle: number) => void;
    }
  ).cancelIdleCallback;

  const idleHandle = requestIdle?.(() => {
    loadFullStyles();
  }, { timeout: 1200 });

  window.setTimeout(() => {
    if (idleHandle !== undefined && cancelIdle) {
      cancelIdle(idleHandle);
    }
    loadFullStyles();
  }, 1200);
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);

registerBoneyardRegistry();
