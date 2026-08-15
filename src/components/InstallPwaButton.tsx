/**
 * @file InstallPwaButton.tsx
 *
 * Compact header control for the PWA install lifecycle. It:
 *   - shows an install action when `beforeinstallprompt` is available;
 *   - renders nothing once the app is running standalone or after install;
 *   - shows manual "Add to Home Screen" guidance on iOS Safari (which does not
 *     support the deferred install prompt).
 */

import React, { useState } from 'react';
import { Check, Download, Share, Smartphone, X } from 'lucide-react';
import { usePwaInstall } from '@/hooks/usePwaInstall';

const InstallPwaButton: React.FC = () => {
  const { canInstall, isStandalone, isInstalled, needsIosManualInstall, promptInstall } =
    usePwaInstall();
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [installState, setInstallState] = useState<'idle' | 'installing' | 'done'>('idle');

  if (isStandalone || isInstalled) return null;

  const handleInstall = async () => {
    setInstallState('installing');
    const accepted = await promptInstall();
    setInstallState(accepted ? 'done' : 'idle');
  };

  if (needsIosManualInstall) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowIosHelp((current) => !current)}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2.5 rounded-xl bg-[#edf1f7] hover:bg-[#dde3eb] text-[#5a6578] hover:text-primary transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          title="Install MathPulse AI"
          aria-label="Install MathPulse AI"
          aria-expanded={showIosHelp}
        >
          <Smartphone size={18} className="group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline text-xs font-bold">Install app</span>
        </button>

        {showIosHelp && (
          <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-[#dde3eb] bg-white p-4 shadow-xl z-50 text-left">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-bold text-[#0a1628]">Install on iPhone / iPad</p>
              <button
                type="button"
                onClick={() => setShowIosHelp(false)}
                className="p-1 rounded-md text-[#5a6578] hover:bg-[#edf1f7]"
                aria-label="Close install help"
              >
                <X size={16} />
              </button>
            </div>
            <ol className="mt-2 space-y-1.5 text-xs text-[#5a6578] leading-relaxed">
              <li>1. Tap the <Share size={12} className="inline text-current" aria-hidden="true" /> Share button in Safari.</li>
              <li>2. Scroll down and tap <strong>Add to Home Screen</strong>.</li>
              <li>3. Tap <strong>Add</strong> to launch MathPulse like an app.</li>
            </ol>
          </div>
        )}
      </div>
    );
  }

  if (!canInstall) return null;

  return (
    <button
      type="button"
      onClick={handleInstall}
      disabled={installState === 'installing'}
      className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2.5 rounded-xl bg-[#edf1f7] hover:bg-[#dde3eb] text-[#5a6578] hover:text-primary transition-all group disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      title="Install MathPulse AI"
      aria-label="Install MathPulse AI"
    >
      {installState === 'done' ? (
        <Check size={20} className="text-emerald-600" />
      ) : (
        <>
          <Download size={18} className="group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline text-xs font-bold">Install app</span>
        </>
      )}
    </button>
  );
};

export default InstallPwaButton;
