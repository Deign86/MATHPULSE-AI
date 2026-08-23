/**
 * @file usePwaInstall.ts
 *
 * Typed hook for the browser's PWA install lifecycle:
 *   - `beforeinstallprompt` → captures the deferred install prompt so the UI
 *     can show an "Install App" button.
 *   - `appinstalled`        → marks the app as installed and hides the prompt.
 *   - `standalone` display mode + iOS `navigator.standalone` → detects when the
 *     app is already running outside the browser tab.
 *
 * iOS Safari does not fire `beforeinstallprompt`, so the hook also exposes
 * `needsIosManualInstall` to guide users through Share → Add to Home Screen.
 */

import { useCallback, useEffect, useState } from 'react';

const hasWindow = 'window' in globalThis;

/**
 * The `beforeinstallprompt` event is not part of the standard TypeScript DOM
 * lib yet, so it is typed locally and cast where the browser dispatches it.
 */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface IosNavigator extends Navigator {
  standalone?: boolean;
}

export interface UsePwaInstallResult {
  /** A deferred install prompt is available and the user can be prompted. */
  canInstall: boolean;
  /** The app is currently running in standalone/fullscreen display mode. */
  isStandalone: boolean;
  /** The browser fired `appinstalled` during this session. */
  isInstalled: boolean;
  /** The user agent is iOS (iPhone/iPad/iPod, or desktop Safari + touch). */
  isIos: boolean;
  /** iOS user still needs the manual "Add to Home Screen" flow. */
  needsIosManualInstall: boolean;
  /** Programmatically trigger the deferred install prompt, if available. */
  promptInstall: () => Promise<boolean>;
}

const isIosDevice = (): boolean => {
  if (!('navigator' in globalThis)) return false;
  const ua = navigator.userAgent;
  const iosTouch =
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return iosTouch;
};

const isStandaloneDisplay = (): boolean => {
  if (!hasWindow) return false;
  const standaloneCss =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches;
  // SAFETY: the iOS-only `standalone` flag is not in the standard Navigator type.
  const iosStandalone = (navigator as IosNavigator | undefined)?.standalone === true;
  return standaloneCss || iosStandalone;
};

export function usePwaInstall(): UsePwaInstallResult {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(isStandaloneDisplay);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(isIosDevice);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      // Prevent the mini-infobar from appearing automatically; the app
      // surfaces its own install button instead.
      event.preventDefault();
      // SAFETY: this handler is registered only for beforeinstallprompt events dispatched by the browser.
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsStandalone(true);
      setInstallPrompt(null);
    };

    const handleDisplayChange = () => {
      setIsStandalone(isStandaloneDisplay());
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    if (window.matchMedia) {
      window.matchMedia('(display-mode: standalone)').addEventListener('change', handleDisplayChange);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (window.matchMedia) {
        window.matchMedia('(display-mode: standalone)').removeEventListener('change', handleDisplayChange);
      }
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!installPrompt) return false;

    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setIsStandalone(true);
        setInstallPrompt(null);
        return true;
      }
    } catch (_) {
      // Some browsers reject the prompt (e.g. user gesture expired). Treat it
      // as a failed install and keep the UI in a recoverable state.
    }

    setInstallPrompt(null);
    return false;
  }, [installPrompt]);

  return {
    canInstall: Boolean(installPrompt) && !isStandalone && !isInstalled,
    isStandalone,
    isInstalled,
    isIos,
    needsIosManualInstall: isIos && !isStandalone && !isInstalled,
    promptInstall,
  };
}
