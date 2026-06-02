import Constants from 'expo-constants';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, memoryLocalCache, doc, getDoc, setDoc, getDocs, collection, query as firestoreQuery, where, orderBy, limit, onSnapshot, runTransaction, writeBatch, updateDoc, increment, arrayUnion, serverTimestamp as firestoreServerTimestamp, } from 'firebase/firestore';
import { getDatabase, ref, push, set, onValue, off, remove, update, query, orderByChild, equalTo, serverTimestamp, } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.FIREBASE_API_KEY ?? process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: Constants.expoConfig?.extra?.FIREBASE_AUTH_DOMAIN ?? process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: Constants.expoConfig?.extra?.FIREBASE_PROJECT_ID ?? process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: Constants.expoConfig?.extra?.FIREBASE_STORAGE_BUCKET ?? process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: Constants.expoConfig?.extra?.FIREBASE_MESSAGING_SENDER_ID ?? process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: Constants.expoConfig?.extra?.FIREBASE_APP_ID ?? process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  databaseURL: Constants.expoConfig?.extra?.FIREBASE_REALTIME_DATABASE_URL ?? process.env.EXPO_PUBLIC_FIREBASE_REALTIME_DATABASE_URL,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, {
  localCache: memoryLocalCache(),
});

export const storage = getStorage(app);
export const cloudFunctions = getFunctions(app);
export const realtimeDb = getDatabase(app, firebaseConfig.databaseURL as string);
export const isRealtimeDbEnabled = Boolean(firebaseConfig.databaseURL);

export {
  ref,
  push,
  set,
  onValue,
  off,
  remove,
  update,
  query,
  orderByChild,
  equalTo,
  serverTimestamp,
};

// Firestore helpers (re-exported for services)
export {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  firestoreQuery,
  where,
  orderBy,
  limit,
  onSnapshot,
  runTransaction,
  writeBatch,
  updateDoc,
  increment,
  arrayUnion,
  firestoreServerTimestamp,
};
