import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
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
}

// Debug logging (no secrets)
console.log('[FIREBASE] Config:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  configured: !!firebaseConfig.apiKey
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
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
  console.log(`[FIREBASE] Functions emulator enabled at ${emulatorHost}:${emulatorPort}`);
}

export const realtimeDb = databaseUrl ? getDatabase(app, databaseUrl) : null;
export const isRealtimeDbEnabled = Boolean(databaseUrl);

// Initialize Analytics (optional, only in browser and if measurementId is configured)
let analytics = null;
if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  analytics = getAnalytics(app);
}

export { analytics };
export default app;
