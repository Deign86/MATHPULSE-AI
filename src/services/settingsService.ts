import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { clearQueryClientCache } from '../lib/queryClient';
import { DEFAULT_USER_SETTINGS, UserSettings } from '../types/models';
import { clearHintCache } from '../utils/hintCache';

const SETTINGS_DOC_ID = 'preferences';

const deepCloneDefaults = (): UserSettings => JSON.parse(JSON.stringify(DEFAULT_USER_SETTINGS)) as UserSettings;

const mergeSettings = (incoming?: Partial<UserSettings> | null): UserSettings => {
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

const settingsDocRef = (uid: string) => doc(db, 'users', uid, 'settings', SETTINGS_DOC_ID);

export const getUserSettings = async (uid: string): Promise<UserSettings> => {
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

export const upsertUserSettings = async (
  uid: string,
  updates: Partial<UserSettings>,
): Promise<UserSettings> => {
  const current = await getUserSettings(uid);
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

export const resetUserSettingsToDefaults = async (uid: string): Promise<UserSettings> => {
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

export const applyRuntimeSettings = (settings: UserSettings): void => {
  const root = document.documentElement;
  root.style.setProperty('--font-size', `${settings.appearance.fontSize}px`);
  root.dataset.density = settings.appearance.compactView ? 'compact' : 'comfortable';

  if (settings.appearance.reduceAnimations) {
    root.classList.add('reduced-motion');
  } else {
    root.classList.remove('reduced-motion');
  }

  if (settings.appearance.darkMode) {
    root.classList.add('smart-dark');
  } else {
    root.classList.remove('smart-dark');
  }
};

export const clearClientCache = async (): Promise<void> => {
  try {
    await clearQueryClientCache();
    clearHintCache();

    localStorage.clear();
    sessionStorage.clear();

    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }
  } catch (error) {
    console.error('Failed clearing client cache:', error);
    throw new Error('Unable to clear cache on this device.');
  }
};

export const exportUserDataSnapshot = async (uid: string): Promise<Record<string, unknown>> => {
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
      const q = query(collection(db, collectionName), where('userId', '==', uid));
      const snap = await getDocs(q);
      return {
        collectionName,
        items: snap.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })),
      };
    }),
  );

  return {
    exportedAt: new Date().toISOString(),
    user: userSnap.exists() ? { id: userSnap.id, ...userSnap.data() } : null,
    settings: settingsSnap.exists() ? settingsSnap.data() : deepCloneDefaults(),
    collections: byUserId.reduce<Record<string, unknown[]>>((acc, entry) => {
      acc[entry.collectionName] = entry.items;
      return acc;
    }, {}),
  };
};
