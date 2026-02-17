import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

// Firebase configuration for MathPulse AI
// Configuration is loaded from environment variables (.env.local)
// See .env.example for required variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBtKDbf3CoNSJHMX2W-Bfru8qEX2mKm03Y",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mathpulse-ai-2026.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mathpulse-ai-2026",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mathpulse-ai-2026.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "441656461",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:441656461:web:68f877c7bdde7065ec2ec4"
};

// Debug logging
console.log('🔥 Firebase Config:', {
  apiKey: firebaseConfig.apiKey?.substring(0, 10) + '...',
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize Analytics (optional, only in browser)
let analytics = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { analytics };
export default app;
