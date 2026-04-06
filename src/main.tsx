import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';

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

if (rootHasRenderedContent()) {
  requestAnimationFrame(fadeOutAndRemoveBootShell);
} else {
  const observer = new MutationObserver(() => {
    if (!rootHasRenderedContent()) return;
    observer.disconnect();
    requestAnimationFrame(fadeOutAndRemoveBootShell);
  });

  observer.observe(rootElement, { childList: true, subtree: true, characterData: true });

  // Safety valve: never leave the shell mounted forever if rendering stalls.
  safetyTimeoutId = window.setTimeout(() => {
    safetyTimeoutId = undefined;
    observer.disconnect();
    if (document.getElementById('boot-shell')) {
      requestAnimationFrame(fadeOutAndRemoveBootShell);
    }
  }, 6000);
}
