// Global test setup - stub Firebase SDK functions so no real app is initialized.
// Uses vi.spyOn on the imported namespaces instead of vi.mock so consumers keep
// live bindings while every network/IO entry point is a controllable stub.
// NOTE: vitest.config.ts inlines the firebase deps (server.deps.inline) so these
// module namespaces are configurable in the setup graph.
import { vi } from 'vitest';
import type { FirebaseApp } from 'firebase/app';
import * as firebaseApp from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import * as firestore from 'firebase/firestore';
import * as firebaseStorage from 'firebase/storage';
import * as firebaseFunctions from 'firebase/functions';
import * as firebaseAnalytics from 'firebase/analytics';
import * as firebaseDatabase from 'firebase/database';

vi.spyOn(firebaseApp, 'initializeApp').mockImplementation(
  // SAFETY: stub app handle; consumers only read `name` in tests.
  () => ({ name: 'mock-app' }) as FirebaseApp,
);

const authStub = () => ({
  currentUser: null,
  onAuthStateChanged: () => () => {},
});

vi.spyOn(firebaseAuth, 'getAuth').mockImplementation(
  // SAFETY: stub Auth; exercised paths only touch currentUser/onAuthStateChanged.
  () => authStub() as Auth,
);
vi.spyOn(firebaseAuth, 'initializeAuth').mockImplementation(
  // SAFETY: stub Auth; exercised paths only touch currentUser/onAuthStateChanged.
  () => authStub() as Auth,
);
vi.spyOn(firebaseAuth, 'browserLocalPersistence', 'get').mockReturnValue(
  // SAFETY: persistence value is only passed back into initializeAuth stubs.
  {} as typeof firebaseAuth.browserLocalPersistence,
);
vi.spyOn(firebaseAuth, 'browserSessionPersistence', 'get').mockReturnValue(
  // SAFETY: persistence value is only passed back into initializeAuth stubs.
  {} as typeof firebaseAuth.browserSessionPersistence,
);
vi.spyOn(firebaseAuth, 'inMemoryPersistence', 'get').mockReturnValue(
  // SAFETY: persistence value is only passed back into initializeAuth stubs.
  {} as typeof firebaseAuth.inMemoryPersistence,
);
vi.spyOn(firebaseAuth, 'onAuthStateChanged').mockImplementation(vi.fn());
vi.spyOn(firebaseAuth, 'signOut').mockImplementation(async () => stub({}));
vi.spyOn(firebaseAuth, 'signInWithEmailAndPassword').mockImplementation(vi.fn());
vi.spyOn(firebaseAuth, 'createUserWithEmailAndPassword').mockImplementation(vi.fn());
vi.spyOn(firebaseAuth, 'sendPasswordResetEmail').mockImplementation(vi.fn());
vi.spyOn(firebaseAuth, 'updateProfile').mockImplementation(vi.fn());
vi.spyOn(firebaseAuth, 'GoogleAuthProvider').mockImplementation(vi.fn());
vi.spyOn(firebaseAuth, 'signInWithPopup').mockImplementation(vi.fn());

const stubFirestore = () =>
  // SAFETY: Firestore instances are opaque handles; tests never touch their members.
  ({}) as ReturnType<typeof firestore.initializeFirestore>;

vi.spyOn(firestore, 'initializeFirestore').mockImplementation(() => stubFirestore());
vi.spyOn(firestore, 'getFirestore').mockImplementation(() => stubFirestore());
vi.spyOn(firestore, 'persistentLocalCache').mockImplementation(
  // SAFETY: cache settings object is only handed to initializeFirestore stubs.
  () => ({}) as ReturnType<typeof firestore.persistentLocalCache>,
);
vi.spyOn(firestore, 'memoryLocalCache').mockImplementation(
  // SAFETY: cache settings object is only handed to initializeFirestore stubs.
  () => ({}) as ReturnType<typeof firestore.memoryLocalCache>,
);
vi.spyOn(firestore, 'doc').mockImplementation(vi.fn());
vi.spyOn(firestore, 'getDoc').mockImplementation(vi.fn());
vi.spyOn(firestore, 'getDocFromServer').mockImplementation(vi.fn());
vi.spyOn(firestore, 'setDoc').mockImplementation(vi.fn());
vi.spyOn(firestore, 'updateDoc').mockImplementation(vi.fn());
vi.spyOn(firestore, 'deleteDoc').mockImplementation(vi.fn());
vi.spyOn(firestore, 'collection').mockImplementation(vi.fn());
vi.spyOn(firestore, 'query').mockImplementation(vi.fn());
vi.spyOn(firestore, 'where').mockImplementation(vi.fn());
vi.spyOn(firestore, 'getDocs').mockImplementation(vi.fn());
vi.spyOn(firestore, 'serverTimestamp').mockImplementation(vi.fn());

// SAFETY: storage/functions/analytics/database instances are opaque handles;
// tests never touch their members, so an empty object satisfies every consumer.
const stubAny = () => ({}) as never;

vi.spyOn(firebaseStorage, 'getStorage').mockImplementation(stubAny);

vi.spyOn(firebaseFunctions, 'getFunctions').mockImplementation(stubAny);
vi.spyOn(firebaseFunctions, 'connectFunctionsEmulator').mockImplementation(vi.fn());

vi.spyOn(firebaseAnalytics, 'getAnalytics').mockImplementation(stubAny);

vi.spyOn(firebaseDatabase, 'getDatabase').mockImplementation(stubAny);
