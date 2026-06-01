// jest.setup.js — Global mocks for React Native / Expo modules

// firebase/auth/react-native handled via moduleNameMapper → __mocks__/

// Firebase app (used by lib/firebase.ts)
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({ name: 'test-app' })),
}));

// Firebase auth (used by lib/firebase.ts)
jest.mock('firebase/auth', () => ({
  initializeAuth: jest.fn(() => ({})),
  getAuth: jest.fn(() => ({})),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

// Firebase firestore (used by lib/firebase.ts)
jest.mock('firebase/firestore', () => ({
  initializeFirestore: jest.fn(() => ({})),
  memoryLocalCache: jest.fn(() => ({})),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  getDocs: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(),
  runTransaction: jest.fn(),
  writeBatch: jest.fn(),
  updateDoc: jest.fn(),
  increment: jest.fn(),
  arrayUnion: jest.fn(),
  serverTimestamp: jest.fn(),
  Timestamp: { now: jest.fn(), fromDate: jest.fn() },
}));

// Firebase database
jest.mock('firebase/database', () => ({
  getDatabase: jest.fn(() => ({})),
  ref: jest.fn(),
  push: jest.fn(),
  set: jest.fn(),
  onValue: jest.fn(),
  off: jest.fn(),
  remove: jest.fn(),
  update: jest.fn(),
  query: jest.fn(),
  orderByChild: jest.fn(),
  equalTo: jest.fn(),
  serverTimestamp: jest.fn(),
}));

// Firebase storage & functions
jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(() => ({})),
}));

jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
}));


// AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
  multiMerge: jest.fn(() => Promise.resolve()),
}));

// expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 0, Medium: 1, Heavy: 2, Soft: 3, Rigid: 4 },
  NotificationFeedbackType: { Success: 0, Warning: 1, Error: 2 },
}));

// expo-constants
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        FIREBASE_API_KEY: 'test-api-key',
        FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
        FIREBASE_PROJECT_ID: 'test-project',
        FIREBASE_STORAGE_BUCKET: 'test.appspot.com',
        FIREBASE_MESSAGING_SENDER_ID: '123',
        FIREBASE_APP_ID: 'test-app-id',
        FIREBASE_DATABASE_URL: 'https://test.firebaseio.com',
      },
    },
  },
  expoConfig: {
    extra: {
      FIREBASE_API_KEY: 'test-api-key',
      FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
      FIREBASE_PROJECT_ID: 'test-project',
      FIREBASE_STORAGE_BUCKET: 'test.appspot.com',
      FIREBASE_MESSAGING_SENDER_ID: '123',
      FIREBASE_APP_ID: 'test-app-id',
      FIREBASE_DATABASE_URL: 'https://test.firebaseio.com',
    },
  },
}));

// react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => { };
  return Reanimated;
});

// expo-font (used by many expo components)
jest.mock('expo-font', () => ({
  loadAsync: jest.fn(() => Promise.resolve()),
  isLoaded: jest.fn(() => true),
  isLoading: jest.fn(() => false),
}));

// react-native-sse (used by chatService)
jest.mock('react-native-sse', () => ({
  default: class MockEventSource {
    close = jest.fn();
    addEventListener = jest.fn();
    removeEventListener = jest.fn();
  },
}));
