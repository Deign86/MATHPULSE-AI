/**
 * settingsService.test.ts
 *
 * Test spec for the mobile settings service.
 *
 * Uses ambient Jest-style declarations (no vitest/jest dependency) so
 * that the file compiles clean without a test runner. Pure functions
 * (mergeSettings) are tested directly; async Firestore functions are
 * documented with expected behaviour — full runtime tests need a
 * Firebase mock layer (planned for Wave 4).
 */

declare function describe(name: string, fn: () => void): void;
declare function it(name: string, fn: () => void): void;
declare function expect<T>(actual: T): {
  toBe(expected: unknown): void;
  not: { toBe(expected: unknown): void };
  toBeDefined(): void;
  toBeUndefined(): void;
};

vi.mock('../lib/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-uid' } },
  doc: vi.fn(),
  collection: vi.fn(),
  firestoreQuery: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false, data: () => ({}) })),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  setDoc: vi.fn(() => Promise.resolve()),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  runTransaction: vi.fn(),
  writeBatch: vi.fn(),
  firestoreServerTimestamp: vi.fn(() => new Date('2026-06-01T00:00:00Z')),
  increment: (n: number) => ({ __inc: n }),
  arrayUnion: (...items: unknown[]) => items,
  onSnapshot: vi.fn(() => vi.fn()),
}));

import {
  mergeSettings,
  loadUserSettings,
  upsertUserSettings,
  resetUserSettingsToDefaults,
  reauthenticate,
  changeEmail,
  changePassword,
  exportUserData,
  applySettingsToDOM,
  getCachedAppearance,
  cacheAppearance,
} from '../services/settingsService';
import { DEFAULT_USER_SETTINGS } from '../types/models';
import type { UserSettings } from '../types/models';

// ── Helpers ─────────────────────────────────────────────────────────────────

function ps(overrides: Partial<UserSettings>): Partial<UserSettings> {
  return overrides;
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('mergeSettings', () => {
  it('returns deep-cloned defaults when incoming is null', () => {
    const result = mergeSettings(null);
    expect(result).not.toBe(DEFAULT_USER_SETTINGS);
    expect(result.appearance.darkMode).toBe(false);
    expect(result.notifications.emailNotifications).toBe(true);
  });

  it('returns deep-cloned defaults when incoming is undefined', () => {
    const result = mergeSettings(undefined);
    expect(result.pushPreferences.achievement).toBe(true);
  });

  it('overrides top-level scalar with incoming value', () => {
    const result = mergeSettings(
      ps({
        appearance: {
          darkMode: true,
          fontSize: 20,
          compactView: true,
          reduceAnimations: true,
        },
      }),
    );
    expect(result.appearance.darkMode).toBe(true);
    expect(result.appearance.fontSize).toBe(20);
  });

  it('deep-merges without clobbering sibling keys at same level', () => {
    const d = DEFAULT_USER_SETTINGS;
    const result = mergeSettings(
      ps({
        pushPreferences: {
          pushEnabled: d.pushPreferences.pushEnabled,
          achievement: false,
          quiz_battle: d.pushPreferences.quiz_battle,
          daily_reward: d.pushPreferences.daily_reward,
          assignment: d.pushPreferences.assignment,
          grade_posted: d.pushPreferences.grade_posted,
          streak_reminder: d.pushPreferences.streak_reminder,
          leaderboard: d.pushPreferences.leaderboard,
          system: d.pushPreferences.system,
        },
      }),
    );
    expect(result.pushPreferences.achievement).toBe(false);
    expect(result.pushPreferences.quiz_battle).toBe(true);
  });

  it('deep-merges nested notificationTypes and quietHours', () => {
    const d = DEFAULT_USER_SETTINGS;
    const result = mergeSettings(
      ps({
        notifications: {
          emailNotifications: d.notifications.emailNotifications,
          pushNotifications: d.notifications.pushNotifications,
          soundEnabled: d.notifications.soundEnabled,
          notificationTypes: {
            quizReminders: d.notifications.notificationTypes.quizReminders,
            newContent: d.notifications.notificationTypes.newContent,
            achievements: false,
            streakAlerts: false,
            weeklySummary: d.notifications.notificationTypes.weeklySummary,
          },
          quietHours: {
            start: '23:00',
            end: d.notifications.quietHours.end,
          },
        },
      }),
    );
    expect(result.notifications.notificationTypes.achievements).toBe(false);
    expect(result.notifications.quietHours.start).toBe('23:00');
    expect(result.notifications.notificationTypes.quizReminders).toBe(true);
  });

  it('does not mutate the original DEFAULT_USER_SETTINGS', () => {
    const before = DEFAULT_USER_SETTINGS.appearance.fontSize;
    mergeSettings(
      ps({
        appearance: {
          darkMode: true,
          fontSize: 99,
          compactView: false,
          reduceAnimations: false,
        },
      }),
    );
    expect(DEFAULT_USER_SETTINGS.appearance.fontSize).toBe(before);
  });
});

describe('settingsService module shape', () => {
  it('exports loadUserSettings', () => {
    expect(typeof loadUserSettings).toBe('function');
  });

  it('exports upsertUserSettings', () => {
    expect(typeof upsertUserSettings).toBe('function');
  });

  it('exports resetUserSettingsToDefaults', () => {
    expect(typeof resetUserSettingsToDefaults).toBe('function');
  });

  it('exports reauthenticate', () => {
    expect(typeof reauthenticate).toBe('function');
  });

  it('exports changeEmail', () => {
    expect(typeof changeEmail).toBe('function');
  });

  it('exports changePassword', () => {
    expect(typeof changePassword).toBe('function');
  });

  it('exports exportUserData', () => {
    expect(typeof exportUserData).toBe('function');
  });

  it('exports applySettingsToDOM (no-op on RN)', () => {
    expect(typeof applySettingsToDOM).toBe('function');
    const result = applySettingsToDOM(DEFAULT_USER_SETTINGS);
    expect(result).toBeUndefined();
  });

  it('exports getCachedAppearance', () => {
    expect(typeof getCachedAppearance).toBe('function');
  });

  it('exports cacheAppearance', () => {
    expect(typeof cacheAppearance).toBe('function');
  });
});
