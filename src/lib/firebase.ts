import { initializeApp } from 'firebase/app';
import { initializeAuth, browserLocalPersistence, browserSessionPersistence, inMemoryPersistence } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

const isValidRealtimeDatabaseUrl = (value: string): boolean => {
  if (!value) return false;
  if (value.includes('your_project') || value.includes('your_database') || value.includes('your_')) {
    return false;
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:') {
      return false;
    }

    return (
      parsed.hostname.endsWith('.firebaseio.com') ||
      parsed.hostname.endsWith('.firebasedatabase.app')
    );
  } catch {
    return false;
  }
};

const rawDatabaseUrl = (import.meta.env.VITE_FIREBASE_DATABASE_URL || '').trim();
const databaseUrl = isValidRealtimeDatabaseUrl(rawDatabaseUrl) ? rawDatabaseUrl : '';

if (rawDatabaseUrl && !databaseUrl) {
  console.warn(
    '[FIREBASE] VITE_FIREBASE_DATABASE_URL is set but invalid. Expected an https URL ending in .firebaseio.com or .firebasedatabase.app. RTDB presence is disabled.',
  );
}

// Firebase configuration for MathPulse AI
// Configuration is loaded from environment variables (.env.local)
// See .env.example for required variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  ...(databaseUrl ? { databaseURL: databaseUrl } : {}),
};

if (!firebaseConfig.apiKey) {
  console.error('[ERROR] Firebase API key is missing! Copy .env.example to .env.local and fill in your values.');
} else if (import.meta.env.DEV) {
  // Firebase config loaded in dev mode
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
if (import.meta.env.DEV) {
  // Firebase app initialized
}

// Initialize Firebase services with persistence fallback chain.
// browserLocalPersistence (IndexedDB) is preferred, but falls back to
// sessionStorage or memory when third-party storage is blocked by
// browser Tracking Prevention (e.g., ERR_BLOCKED_BY_CLIENT).
// Guard against undefined persistence types in test environments where
// firebase/auth may be partially mocked (test-setup.ts provides only
// getAuth + initializeAuth).
function buildAuthInstance() {
  try {
    const hasValidPersistence = typeof browserLocalPersistence !== 'undefined';
    if (typeof window !== 'undefined' && hasValidPersistence) {
      return initializeAuth(app, {
        persistence: [browserLocalPersistence, browserSessionPersistence, inMemoryPersistence],
      });
    }
    return initializeAuth(app, { persistence: [inMemoryPersistence] });
  } catch {
    // Test environment or partially-mocked firebase/auth — return a safe stub
    return {
      currentUser: null,
    } as ReturnType<typeof initializeAuth>;
  }
}
export const auth = buildAuthInstance();
function buildDbInstance() {
  try {
    if (typeof window !== 'undefined' && typeof persistentLocalCache !== 'undefined') {
      return initializeFirestore(app, { localCache: persistentLocalCache() });
    }
    return initializeFirestore(app, {});
  } catch {
    // Test environment or partially-mocked firebase/firestore — return a safe stub
    return {} as ReturnType<typeof initializeFirestore>;
  }
}
export const db = buildDbInstance();
export const storage = getStorage(app);
export const cloudFunctions = getFunctions(app);



const useFunctionsEmulator =
  String(import.meta.env.VITE_USE_FUNCTIONS_EMULATOR || '').toLowerCase() === 'true';

if (useFunctionsEmulator) {
  const emulatorHost = String(import.meta.env.VITE_FUNCTIONS_EMULATOR_HOST || '127.0.0.1').trim() || '127.0.0.1';
  const emulatorPortRaw = Number(import.meta.env.VITE_FUNCTIONS_EMULATOR_PORT || 5001);
  const emulatorPort = Number.isFinite(emulatorPortRaw) && emulatorPortRaw > 0
    ? Math.floor(emulatorPortRaw)
    : 5001;

  connectFunctionsEmulator(cloudFunctions, emulatorHost, emulatorPort);
}

export const realtimeDb = databaseUrl ? getDatabase(app, databaseUrl) : null;
export const isRealtimeDbEnabled = Boolean(databaseUrl);

// Initialize Analytics (optional, only in browser and if measurementId is configured).
// Wrapped in try/catch to prevent ERR_BLOCKED_BY_CLIENT from crashing the app
// when ad/tracking blockers block Firebase Analytics telemetry URLs.
let analytics = null;
if (typeof window !== 'undefined' && firebaseConfig.measurementId && !firebaseConfig.measurementId.startsWith('your')) {
  try {
    analytics = getAnalytics(app);
  } catch {
    // Analytics is non-critical — silently skip if blocked or unavailable
  }
}

export { analytics };
export default app;
