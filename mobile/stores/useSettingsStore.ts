import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserSettings } from '../types/models';
import { DEFAULT_USER_SETTINGS } from '../types/models';
import {
  loadUserSettings,
  upsertUserSettings,
  resetUserSettingsToDefaults,
  cacheAppearance,
  getCachedAppearance,
  applySettingsToDOM,
} from '../services/settingsService';

// ─── Types ──────────────────────────────────────────────────────────────────

interface SettingsState {
  /** Currently authenticated uid (set by `loadSettings`, used by `updateSetting`). */
  uid: string | null;

  /** Fully resolved (deep-merged) settings. Starts as defaults, replaced on `loadSettings`. */
  settings: UserSettings;
  isLoading: boolean;
  error: string | null;
}

interface SettingsActions {
  /**
   * Hydrate from Firestore + local cache (cache-first to prevent flash).
   * Called once after auth state resolves; stores `uid` for later mutations.
   */
  loadSettings: (uid: string) => Promise<void>;

  /**
   * Update a single top-level or nested setting key via dot-notation.
   * Example: `updateSetting('appearance.darkMode', true)`
   * Persists to Firestore AND local AsyncStorage cache.
   */
  updateSetting: (key: string, value: unknown) => Promise<void>;

  /** Reset ALL settings to factory defaults (Firestore + local). */
  resetSettings: () => Promise<void>;

  /** Clear the error flag (called on UI dismiss). */
  clearError: () => void;
}

// ─── Cache keys ─────────────────────────────────────────────────────────────

const FULL_CACHE_KEY = 'mathpulse_user_settings';

// ─── Dot-path helpers ───────────────────────────────────────────────────────

/**
 * Immutably set a nested value at a dot-separated path, creating intermediate
 * objects as needed. Returns a new top-level object.
 */
function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const keys = path.split('.');
  if (keys.length === 0) return obj;

  const clone = (o: unknown): unknown => {
    if (Array.isArray(o)) return [...o];
    if (o && typeof o === 'object') {
      const c: Record<string, unknown> = {};
      for (const k of Object.keys(o as Record<string, unknown>)) {
        c[k] = clone((o as Record<string, unknown>)[k]);
      }
      return c;
    }
    return o;
  };

  const result = clone(obj) as Record<string, unknown>;
  let current = result;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
  return result;
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useSettingsStore = create<SettingsState & SettingsActions>(
  (set, get) => ({
    // State
    uid: null,
    settings: JSON.parse(
      JSON.stringify(DEFAULT_USER_SETTINGS),
    ) as UserSettings,
    isLoading: false,
    error: null,

    // ── Actions ───────────────────────────────────────────────────────────

    loadSettings: async (uid: string) => {
      set({ uid, isLoading: true, error: null });

      // 1. Try cache-first for appearance to prevent flash
      try {
        const cachedAppearance = await getCachedAppearance();
        if (cachedAppearance) {
          set((state) => ({
            settings: {
              ...state.settings,
              appearance: cachedAppearance,
            },
          }));
        }
      } catch {
        /* cache read is best-effort */
      }

      // 2. Also try full cache restore
      try {
        const fullCache = await AsyncStorage.getItem(FULL_CACHE_KEY);
        if (fullCache) {
          set({ settings: JSON.parse(fullCache) as UserSettings });
        }
      } catch {
        /* full cache read is best-effort */
      }

      // 3. Fetch from Firestore (always authoritative)
      try {
        const remote = await loadUserSettings(uid);
        set({ settings: remote, isLoading: false });

        // Persist to local cache for next cold start
        try {
          await AsyncStorage.setItem(FULL_CACHE_KEY, JSON.stringify(remote));
          await cacheAppearance(remote.appearance);
        } catch {
          /* cache write is best-effort */
        }

        applySettingsToDOM(remote);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load settings';
        set({ error: message, isLoading: false });
      }
    },

    updateSetting: async (key: string, value: unknown) => {
      const { uid, settings } = get();
      if (!uid) {
        set({ error: 'Not authenticated — call loadSettings(uid) first' });
        return;
      }

      // Save snapshot for potential rollback
      const previous = settings;

      // Optimistically apply change locally (immutable deep clone via setNestedValue)
      const optimistic = setNestedValue(
        settings as unknown as Record<string, unknown>,
        key,
        value,
      ) as unknown as UserSettings;
      set({ settings: optimistic, error: null });

      // Build a deep partial from the dot-path for the API
      const partial = setNestedValue({}, key, value) as Partial<UserSettings>;

      try {
        // Persist to Firestore in the background (deep-merge, returns authoritative merged doc)
        const merged = await upsertUserSettings(uid, partial);
        set({ settings: merged, error: null });

        // Persist to local cache
        try {
          await AsyncStorage.setItem(FULL_CACHE_KEY, JSON.stringify(merged));
          if (key.startsWith('appearance')) {
            await cacheAppearance(merged.appearance);
          }
        } catch {
          /* best-effort */
        }

        applySettingsToDOM(merged);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to update setting';
        // Rollback to previous snapshot on error
        set({ settings: previous, error: message });
      }
    },

    resetSettings: async () => {
      const { uid } = get();
      if (!uid) {
        set({ error: 'Not authenticated — call loadSettings(uid) first' });
        return;
      }

      set({ isLoading: true, error: null });
      try {
        const defaults = await resetUserSettingsToDefaults(uid);
        set({ settings: defaults, isLoading: false });

        try {
          await AsyncStorage.setItem(
            FULL_CACHE_KEY,
            JSON.stringify(defaults),
          );
          await cacheAppearance(defaults.appearance);
        } catch {
          /* best-effort */
        }

        applySettingsToDOM(defaults);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to reset settings';
        set({ error: message, isLoading: false });
      }
    },

    clearError: () => set({ error: null }),
  }),
);
