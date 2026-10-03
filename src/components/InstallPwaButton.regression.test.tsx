// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import * as pwaInstall from '../hooks/usePwaInstall';
import InstallPwaButton from './InstallPwaButton';

afterEach(cleanup);

describe('PWA install button regressions', () => {
  it('offers install and invokes the deferred browser prompt', async () => {
    const promptInstall = vi.fn(async () => true);
    vi.spyOn(pwaInstall, 'usePwaInstall').mockReturnValue({
      canInstall: true, isStandalone: false, isInstalled: false, isIos: false, needsIosManualInstall: false, promptInstall,
    });
    render(<InstallPwaButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Install MathPulse AI' }));
    expect(promptInstall).toHaveBeenCalledOnce();
  });

  it('hides the action when the app is already installed', () => {
    vi.spyOn(pwaInstall, 'usePwaInstall').mockReturnValue({
      canInstall: false, isStandalone: true, isInstalled: true, isIos: false, needsIosManualInstall: false, promptInstall: vi.fn(async () => false),
    });
    render(<InstallPwaButton />);
    expect(screen.queryByRole('button', { name: 'Install MathPulse AI' })).toBeNull();
  });
});
