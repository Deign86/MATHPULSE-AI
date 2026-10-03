// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as pushNotifications from '../hooks/usePushNotifications';
import PushNotificationsManager, { usePushNotificationControls } from './PushNotificationsManager';
import { createElement, useState } from 'react';

afterEach(cleanup);

describe('push notification manager regressions', () => {
  it('provides lifecycle controls to descendants without remounting consumers', () => {
    const enable = vi.fn(async () => true);
    const Consumer = () => {
      const controls = usePushNotificationControls();
      return <button onClick={() => void controls.enable()}>{controls.status}</button>;
    };
    // SAFETY: status and lifecycle methods are the complete public hook contract consumed here.
    vi.spyOn(pushNotifications, 'usePushNotifications').mockReturnValue({
      status: 'enabled', enable, disable: vi.fn(async () => {}), refresh: vi.fn(async () => {}),
    } as never);
    render(createElement(PushNotificationsManager, null, createElement(Consumer)));
    screen.getByRole('button', { name: 'enabled' }).click();
    expect(enable).toHaveBeenCalledOnce();
  });

  it('provides safe unsupported defaults outside the manager provider', async () => {
    const Consumer = () => {
      const controls = usePushNotificationControls();
      const [enabled, setEnabled] = useState<boolean | null>(null);
      return <button onClick={() => void controls.enable().then(setEnabled)}>{enabled === null ? controls.status : String(enabled)}</button>;
    };
    render(<Consumer />);
    fireEvent.click(screen.getByRole('button', { name: 'unsupported' }));
    await waitFor(() => expect(screen.getByRole('button').textContent).toBe('false'));
  });
});
