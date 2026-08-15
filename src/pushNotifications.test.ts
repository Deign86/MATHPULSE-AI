import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { safeInternalRoute, pushStatus } from './services/pushNotificationService';

describe('push notification contracts', () => {
  it('accepts only safe app-relative routes', () => {
    expect(safeInternalRoute('/grades?tab=recent#scores')).toBe('/grades?tab=recent#scores');
    expect(safeInternalRoute('/')).toBe('/');
    expect(safeInternalRoute('//evil.example')).toBeNull();
    expect(safeInternalRoute('https://evil.example')).toBeNull();
    expect(safeInternalRoute('/safe\\\\path')).toBeNull();
    expect(safeInternalRoute('/safe\npath')).toBeNull();
  });

  it('maps browser permission and capability to explicit status', () => {
    expect(pushStatus('default', false, false)).toBe('unsupported');
    expect(pushStatus('default', true, false)).toBe('default');
    expect(pushStatus('granted', true, false)).toBe('granted');
    expect(pushStatus('granted', true, true)).toBe('enabled');
    expect(pushStatus('denied', true, false)).toBe('denied');
  });

  it('keeps the two-worker and data-only contracts explicit', () => {
    const fcmWorker = readFileSync(resolve(process.cwd(), 'public/firebase-messaging-sw.js'), 'utf8');
    const appWorker = readFileSync(resolve(process.cwd(), 'public/sw.js'), 'utf8');
    const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    expect(fcmWorker).toContain("importScripts('/firebase-config.js')");
    expect(fcmWorker).toContain('payload.data');
    expect(fcmWorker).toContain('showNotification');
    expect(fcmWorker).toContain('safeInternalRoute');
    expect(fcmWorker).toContain('NOTIFICATION_CLICK');
    expect(appWorker).toContain("'/firebase-messaging-sw.js'");
    expect(appWorker).toContain("'/firebase-config.js'");
    expect(app.match(/<PushNotificationsManager>/g)?.length ?? 0).toBe(1);
  });
});
