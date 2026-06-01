import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateEmail as firebaseUpdateEmail,
  updatePassword as firebaseUpdatePassword,
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { DEFAULT_USER_SETTINGS, UserSettings } from '../types/models';
import {
  AdminSystemConfig,
  DEFAULT_ADMIN_SYSTEM_CONFIG,
  DEFAULT_TEACHER_PREFERENCES,
  TeacherPreferences,
} from '../types/settings';

// ─── Constants ──────────────────────────────────────────────────────────────

const SETTINGS_DOC_ID = 'preferences';
const APPEARANCE_CACHE_KEY = 'mathpulse_appearance';

// ─── Deep-merge helpers (ported 1:1 from web) ────────────────────────────────

const deepCloneDefaults = (): UserSettings =>
  JSON.parse(JSON.stringify(DEFAULT_USER_SETTINGS)) as UserSettings;

export const mergeSettings = (incoming?: Partial<UserSettings> | null): UserSettings => {
  const defaults = deepCloneDefaults();
  if (!incoming) return defaults;

  return {
    ...defaults,
    ...incoming,
    notifications: {
      ...defaults.notifications,
      ...incoming.notifications,
      notificationTypes: {
        ...defaults.notifications.notificationTypes,
        ...incoming.notifications?.notificationTypes,
      },
      quietHours: {
        ...defaults.notifications.quietHours,
        ...incoming.notifications?.quietHours,
      },
    },
    pushPreferences: {
      ...defaults.pushPreferences,
      ...incoming.pushPreferences,
    },
    appearance: {
      ...defaults.appearance,
      ...incoming.appearance,
    },
    privacy: {
      ...defaults.privacy,
      ...incoming.privacy,
    },
    learning: {
      ...defaults.learning,
      ...incoming.learning,
    },
    adminPanel: {
      ...defaults.adminPanel,
      ...incoming.adminPanel,
    },
  };
};

// ─── Firestore document reference ───────────────────────────────────────────

const settingsDocRef = (uid: string) =>
  doc(db, 'users', uid, 'settings', SETTINGS_DOC_ID);

// ─── Core settings CRUD ─────────────────────────────────────────────────────

/**
 * Load user settings from Firestore. If the document does not exist,
 * seed it with defaults and return them.
 */
export const loadUserSettings = async (uid: string): Promise<UserSettings> => {
  const ref = settingsDocRef(uid);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    const defaults = deepCloneDefaults();
    await setDoc(ref, {
      ...defaults,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return defaults;
  }

  return mergeSettings(snapshot.data() as Partial<UserSettings>);
};

/**
 * Merge partial updates into the user's settings document.
 * Uses deep-merge so nested keys (e.g. `pushPreferences.achievement`)
 * are set without clobbering siblings.
 */
export const upsertUserSettings = async (
  uid: string,
  updates: Partial<UserSettings>,
): Promise<UserSettings> => {
  const current = await loadUserSettings(uid);
  const merged = mergeSettings({ ...current, ...updates });

  await setDoc(
    settingsDocRef(uid),
    {
      ...merged,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return merged;
};

/**
 * Reset the user's settings to hard-coded defaults, overwriting the
 * Firestore document completely.
 */
export const resetUserSettingsToDefaults = async (
  uid: string,
): Promise<UserSettings> => {
  const defaults = deepCloneDefaults();
  await setDoc(
    settingsDocRef(uid),
    {
      ...defaults,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return defaults;
};

// ─── Appearance cache (mirrors web's localStorage bridge) ───────────────────

/**
 * RN-compatible replacement for `applyRuntimeSettings` / `applySettingsFromCache`.
 *
 * On the web these functions write CSS custom properties and class names to
 * `<html>`. On React Native there is no global DOM, so this is a no-op that
 * logs the changes to help with debugging.
 *
 * Callers (e.g. `useSettingsStore`) should use the `appearance` slice
 * directly to drive themed components.
 */
export const applySettingsToDOM = (settings: UserSettings): void => {
  const { darkMode, fontSize, compactView, reduceAnimations } =
    settings.appearance;
  console.log(
    '[settingsService] applySettingsToDOM (no-op on RN)',
    JSON.stringify({ darkMode, fontSize, compactView, reduceAnimations }),
  );
};

/**
 * Returns the appearance slice that was cached locally (if any).
 * On the web this reads `localStorage`; on mobile it reads AsyncStorage.
 */
export const getCachedAppearance = async (): Promise<UserSettings['appearance'] | null> => {
  try {
    const AsyncStorage = await import(
      '@react-native-async-storage/async-storage'
    );
    const cached = await AsyncStorage.default.getItem(APPEARANCE_CACHE_KEY);
    if (!cached) return null;
    return JSON.parse(cached) as UserSettings['appearance'];
  } catch {
    return null;
  }
};

/**
 * Persist the appearance slice to AsyncStorage so it can be rehydrated
 * on the next launch before Firestore responds (prevents flash).
 */
export const cacheAppearance = async (
  appearance: UserSettings['appearance'],
): Promise<void> => {
  try {
    const AsyncStorage = await import(
      '@react-native-async-storage/async-storage'
    );
    await AsyncStorage.default.setItem(
      APPEARANCE_CACHE_KEY,
      JSON.stringify(appearance),
    );
  } catch {
    /* storage quota exceeded — non-critical */
  }
};

// ─── Data export ────────────────────────────────────────────────────────────

/**
 * Export all user-owned data as a JSON snapshot.
 * Mirrors web `exportUserDataSnapshot`.
 */
export const exportUserData = async (
  uid: string,
): Promise<Record<string, unknown>> => {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  const settingsSnap = await getDoc(settingsDocRef(uid));

  const ownerCollections = [
    'progress',
    'xpActivities',
    'achievements',
    'notifications',
    'tasks',
    'chatSessions',
    'chatMessages',
  ];

  const byUserId = await Promise.all(
    ownerCollections.map(async (collectionName) => {
      const q = query(
        collection(db, collectionName),
        where('userId', '==', uid),
      );
      const snap = await getDocs(q);
      return {
        collectionName,
        items: snap.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        })),
      };
    }),
  );

  return {
    exportedAt: new Date().toISOString(),
    user: userSnap.exists() ? { id: userSnap.id, ...userSnap.data() } : null,
    settings: settingsSnap.exists()
      ? settingsSnap.data()
      : deepCloneDefaults(),
    collections: byUserId.reduce<Record<string, unknown[]>>((acc, entry) => {
      acc[entry.collectionName] = entry.items;
      return acc;
    }, {}),
  };
};

// ─── Re-authentication ──────────────────────────────────────────────────────

export const reauthenticate = async (
  currentPassword: string,
): Promise<void> => {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('No user logged in');
  const credential = EmailAuthProvider.credential(
    user.email,
    currentPassword,
  );
  await reauthenticateWithCredential(user, credential);
};

export const changeEmail = async (
  currentPassword: string,
  newEmail: string,
): Promise<void> => {
  await reauthenticate(currentPassword);
  if (!auth.currentUser) throw new Error('Re-auth failed');
  await firebaseUpdateEmail(auth.currentUser, newEmail);
};

export const changePassword = async (
  currentPassword: string,
  newPassword: string,
): Promise<void> => {
  await reauthenticate(currentPassword);
  if (!auth.currentUser) throw new Error('Re-auth failed');
  await firebaseUpdatePassword(auth.currentUser, newPassword);
};

export const deleteAccount = async (
  currentPassword: string,
  uid: string,
): Promise<void> => {
  await reauthenticate(currentPassword);
  const user = auth.currentUser;
  if (!user) throw new Error('Re-auth failed');

  // Best-effort Firestore cleanup
  try {
    await deleteDoc(doc(db, 'users', uid));
    await deleteDoc(settingsDocRef(uid));
  } catch {
    /* non-critical if docs already missing */
  }

  await deleteUser(user);
};

// ─── Teacher Preferences ────────────────────────────────────────────────────

const teacherPrefsRef = (uid: string) =>
  doc(db, 'users', uid, 'settings', 'teacherPreferences');

export const getTeacherPreferences = async (
  uid: string,
): Promise<TeacherPreferences> => {
  const snap = await getDoc(teacherPrefsRef(uid));
  if (!snap.exists()) return { ...DEFAULT_TEACHER_PREFERENCES };
  return {
    ...DEFAULT_TEACHER_PREFERENCES,
    ...(snap.data() as Partial<TeacherPreferences>),
  };
};

export const updateTeacherPreferences = async (
  uid: string,
  updates: Partial<TeacherPreferences>,
): Promise<TeacherPreferences> => {
  const current = await getTeacherPreferences(uid);
  const merged = {
    ...current,
    ...updates,
    quizDefaults: { ...current.quizDefaults, ...updates.quizDefaults },
    classPreferences: {
      ...current.classPreferences,
      ...updates.classPreferences,
    },
  };
  await setDoc(
    teacherPrefsRef(uid),
    { ...merged, updatedAt: serverTimestamp() },
    { merge: true },
  );
  return merged;
};

// ─── Admin System Config ────────────────────────────────────────────────────

const systemConfigRef = () => doc(db, 'system', 'config');

export const getAdminSystemConfig = async (): Promise<AdminSystemConfig> => {
  const snap = await getDoc(systemConfigRef());
  if (!snap.exists()) return { ...DEFAULT_ADMIN_SYSTEM_CONFIG };
  return {
    ...DEFAULT_ADMIN_SYSTEM_CONFIG,
    ...(snap.data() as Partial<AdminSystemConfig>),
  };
};

export const updateAdminSystemConfig = async (
  updates: Partial<AdminSystemConfig>,
): Promise<AdminSystemConfig> => {
  const current = await getAdminSystemConfig();
  const merged = {
    ...current,
    ...updates,
    aiConfig: { ...current.aiConfig, ...updates.aiConfig },
  };
  await setDoc(
    systemConfigRef(),
    { ...merged, updatedAt: serverTimestamp() },
    { merge: true },
  );
  return merged;
};
