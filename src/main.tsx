import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './critical.css';
import { AuthProvider } from './contexts/AuthContext.tsx';

let fullStylesLoadStarted = false;
let resolveFullStylesReady: (() => void) | null = null;

const fullStylesReady = new Promise<void>((resolve) => {
  resolveFullStylesReady = resolve;
});

const finishFullStylesReady = () => {
  if (!resolveFullStylesReady) return;
  const resolve = resolveFullStylesReady;
  resolveFullStylesReady = null;
  resolve();
};

const loadFullStyles = () => {
  if (fullStylesLoadStarted) return;
  fullStylesLoadStarted = true;

  import('./index.css')
    .catch((error) => {
      console.error('[styles] Deferred full stylesheet failed to load:', error);
    })
    .finally(() => {
      finishFullStylesReady();
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

let safetyTimeoutId: ReturnType<typeof window.setTimeout> | undefined;

const fadeOutAndRemoveBootShell = () => {
  const bootShell = document.getElementById('boot-shell');
  if (!bootShell) return;

  if (safetyTimeoutId !== undefined) {
    window.clearTimeout(safetyTimeoutId);
    safetyTimeoutId = undefined;
  }

  bootShell.style.pointerEvents = 'none';
  bootShell.style.transition = 'opacity 160ms ease';

  requestAnimationFrame(() => {
    bootShell.style.opacity = '0';
  });

  window.setTimeout(() => {
    bootShell.remove();
  }, 200);
};

const rootHasRenderedContent = () => {
  if (rootElement.childElementCount > 0) return true;
  const text = rootElement.textContent?.trim() ?? '';
  return text.length > 0;
};

const waitForStylesThenFade = () => {
  Promise.race([
    fullStylesReady,
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, 2200);
    }),
  ]).then(() => {
    requestAnimationFrame(fadeOutAndRemoveBootShell);
  });
};

if (rootHasRenderedContent()) {
  waitForStylesThenFade();
} else {
  const observer = new MutationObserver(() => {
    if (!rootHasRenderedContent()) return;
    observer.disconnect();
    waitForStylesThenFade();
  });

  observer.observe(rootElement, { childList: true, subtree: true, characterData: true });

  // Safety valve: never leave the shell mounted forever if rendering stalls.
  safetyTimeoutId = window.setTimeout(() => {
    safetyTimeoutId = undefined;
    observer.disconnect();
    loadFullStyles();
    if (document.getElementById('boot-shell')) {
      waitForStylesThenFade();
    }
  }, 6000);
}
