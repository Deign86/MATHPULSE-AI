import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser,
  updateEmail,
  updatePassword,
  deleteUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, getDocFromServer, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { User, UserRole, StudentProfile, TeacherProfile, AdminProfile } from '../types/models';

/** Role-specific additional data passed during signup / profile creation. */
interface AdditionalProfileData {
  name?: string;
  lrn?: string;
  grade?: string;
  section?: string;
  classSectionId?: string;
  adviserTeacherId?: string;
  adviserTeacherName?: string;
  schoolYear?: string;
  school?: string;
  major?: string;
  gpa?: string;
  department?: string;
  subject?: string;
  yearsOfExperience?: string;
  qualification?: string;
  position?: string;
}

export interface AuthServiceError extends Error {
  code?: string;
}

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
const PENDING_AUTH_ROLE_KEY = 'mathpulse.pendingAuthRole';
const LAST_AUTH_ROLE_KEY = 'mathpulse.lastAuthRole';

const ensurePublicSignupRole = (role: UserRole): void => {
  if (role === 'admin') {
    throw new Error('Admin account creation is restricted. Please contact an existing administrator.');
  }
};

const toAuthServiceError = (error: unknown, fallbackMessage: string): AuthServiceError => {
  const firebaseError = error as { code?: string; message?: string };
  const serviceError = new Error(firebaseError.message || fallbackMessage) as AuthServiceError;

  if (firebaseError.code) {
    serviceError.code = firebaseError.code;
  }

  return serviceError;
};

export const setPendingAuthRole = (role: UserRole): void => {
  try {
    localStorage.setItem(PENDING_AUTH_ROLE_KEY, role);
    localStorage.setItem(LAST_AUTH_ROLE_KEY, role);
  } catch {
    // Ignore storage failures; auth can still proceed with fallback role.
  }
};

export const consumePendingAuthRole = (): UserRole | null => {
  try {
    const role = localStorage.getItem(PENDING_AUTH_ROLE_KEY);
    localStorage.removeItem(PENDING_AUTH_ROLE_KEY);
    if (role === 'student' || role === 'teacher' || role === 'admin') {
      return role;
    }
    return null;
  } catch {
    return null;
  }
};

export const getLastAuthRole = (): UserRole | null => {
  try {
    const role = localStorage.getItem(LAST_AUTH_ROLE_KEY);
    if (role === 'student' || role === 'teacher' || role === 'admin') {
      return role;
    }
    return null;
  } catch {
    return null;
  }
};

// Sign up with email and password
export const signUpWithEmail = async (
  email: string,
  password: string,
  name: string,
  role: UserRole,
  additionalData: AdditionalProfileData = {}
): Promise<User> => {
  try {
    ensurePublicSignupRole(role);

    // Create auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Update display name
    await updateProfile(firebaseUser, { displayName: name });

    // Create user profile in Firestore
    const userProfile = await createUserProfile(firebaseUser, role, additionalData);

    return userProfile;
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string };
    console.error('[ERROR] Error signing up:', {
      code: firebaseError.code,
      message: firebaseError.message,
      fullError: error
    });
    throw toAuthServiceError(error, 'Failed to create account');
  }
};

// Sign in with email and password
// Profile auto-creation is handled exclusively by AuthContext's onAuthStateChanged
export const signInWithEmail = async (email: string, password: string): Promise<void> => {
  try {
    console.log('[AUTH] Attempting sign in...', { email });
    await signInWithEmailAndPassword(auth, email, password);
    console.log('[OK] Sign in successful, AuthContext will handle profile creation');
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string };
    console.error('[ERROR] Error signing in:', {
      code: firebaseError.code,
      message: firebaseError.message,
      fullError: error
    });
    throw toAuthServiceError(error, 'Failed to sign in');
  }
};

// Sign in with Google
export const signInWithGoogle = async (role: UserRole = 'student'): Promise<User> => {
  try {
    ensurePublicSignupRole(role);

    const result = await signInWithPopup(auth, googleProvider);
    const firebaseUser = result.user;

    // Check if user profile exists
    let userProfile = await getUserProfile(firebaseUser.uid);

    // If not, create new profile
    if (!userProfile) {
      userProfile = await createUserProfile(firebaseUser, role, {});
    }

    return userProfile;
  } catch (error: unknown) {
    console.error('Error signing in with Google:', error);
    throw toAuthServiceError(error, 'Failed to sign in with Google');
  }
};

// Sign out
export const signOutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error: unknown) {
    console.error('Error signing out:', error);
    throw toAuthServiceError(error, 'Failed to sign out');
  }
};

// Reset password
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: unknown) {
    console.error('Error resetting password:', error);
    throw toAuthServiceError(error, 'Failed to send reset email');
  }
};

// Create user profile in Firestore
export const createUserProfile = async (
  firebaseUser: FirebaseUser,
  role: UserRole,
  additionalData: AdditionalProfileData
): Promise<User> => {
  const generatedLrn = `${Date.now()}`.slice(-12).padStart(12, '0');
  const baseProfile = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    name: firebaseUser.displayName || additionalData.name || 'User',
    role,
    photo: firebaseUser.photoURL || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // Build role-specific profile data to persist in Firestore.
  // serverTimestamp() returns FieldValue (not Date), so we use a plain object
  // and cast to User on return — Firestore handles the timestamp conversion.
  const roleFields = (() => {
    switch (role) {
      case 'student':
        return {
          lrn: additionalData.lrn || generatedLrn,
          grade: additionalData.grade || 'Grade 11',
          section: additionalData.section || 'Section A',
          classSectionId: additionalData.classSectionId || '',
          adviserTeacherId: additionalData.adviserTeacherId || '',
          adviserTeacherName: additionalData.adviserTeacherName || '',
          schoolYear: additionalData.schoolYear || '',
          school: additionalData.school || '',
          enrollmentDate: new Date().toISOString().split('T')[0],
          major: additionalData.major || 'General',
          gpa: additionalData.gpa || '0.00',
          level: 1,
          currentXP: 0,
          totalXP: 0,
          streak: 0,
          atRiskSubjects: [] as string[],
          hasTakenDiagnostic: false,
          iarAssessmentState: 'not_started' as const,
          startingQuarterG11: 'Q1' as const,
          recommendedPace: 'normal' as const,
        };
      case 'teacher':
        return {
          teacherId: `TCH-${Date.now()}`,
          department: additionalData.department || 'Mathematics',
          subject: additionalData.subject || 'Mathematics',
          yearsOfExperience: additionalData.yearsOfExperience || '0',
          qualification: additionalData.qualification || '',
          students: [] as string[],
        };
      case 'admin':
        return {
          adminId: `ADM-${Date.now()}`,
          position: additionalData.position || 'Administrator',
          department: additionalData.department || 'System',
        };
    }
  })();

  const userProfile = { ...baseProfile, ...roleFields };

  // Save to Firestore
  await setDoc(doc(db, 'users', firebaseUser.uid), userProfile);

  return userProfile as unknown as User;
};

// Get user profile from Firestore
export const getUserProfile = async (uid: string): Promise<User | null> => {
  try {
    console.log('[FIRESTORE DEBUG] getUserProfile called for uid:', uid);
    const docRef = doc(db, 'users', uid);
    console.log('[FIRESTORE DEBUG] Calling getDoc');
    const docSnap = await getDoc(docRef);
    console.log('[FIRESTORE DEBUG] getDoc completed');

    if (docSnap.exists()) {
      return { ...docSnap.data(), uid: docSnap.id } as User;
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

/**
 * Fetch user profile directly from the server, bypassing the persistent
 * IndexedDB cache. Use this after mutations (e.g. profile picture upload)
 * where the cache is likely stale.  Falls back to the cached read if the
 * server is unreachable.
 */
export const getUserProfileFromServer = async (uid: string): Promise<User | null> => {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDocFromServer(docRef);
    if (docSnap.exists()) {
      return { ...docSnap.data(), uid: docSnap.id } as User;
    }
    return null;
  } catch (error) {
    console.warn('[getUserProfileFromServer] Server read failed, falling back to cache:', error);
    return getUserProfile(uid);
  }
};

// Update user profile
export const updateUserProfile = async (
  uid: string,
  updates: Partial<User> &
    Partial<Omit<StudentProfile, keyof User | 'role'>> &
    Partial<Omit<TeacherProfile, keyof User | 'role'>> &
    Partial<Omit<AdminProfile, keyof User | 'role'>>
): Promise<void> => {
  try {
    console.log('[FIRESTORE DEBUG] updateUserProfile called for uid:', uid);
    const currentProfile = await getUserProfile(uid);
    console.log('[FIRESTORE DEBUG] currentProfile fetched:', currentProfile);
    if (!currentProfile) {
      throw new Error('Profile not found');
    }

    const baseAllowed = ['name', 'email', 'phone', 'photo', 'avatarLayers'];
    const roleAllowedMap: Record<UserRole, string[]> = {
      student: ['lrn', 'grade', 'section', 'school', 'enrollmentDate', 'major', 'gpa'],
      teacher: ['department', 'subject', 'yearsOfExperience', 'qualification'],
      admin: ['department', 'position'],
    };

    const allowedKeys = new Set([...baseAllowed, ...roleAllowedMap[currentProfile.role]]);
    const sanitizedUpdates: Record<string, unknown> = {};

    Object.entries(updates as Record<string, unknown>).forEach(([key, value]) => {
      if (value === undefined || !allowedKeys.has(key)) {
        return;
      }

      if (key === 'avatarLayers' && typeof value === 'object' && value !== null) {
        const avatarLayers = value as Record<string, unknown>;

        sanitizedUpdates[key] = {
          top: typeof avatarLayers.top === 'string' ? avatarLayers.top : '',
          bottom: typeof avatarLayers.bottom === 'string' ? avatarLayers.bottom : '',
          shoes: typeof avatarLayers.shoes === 'string' ? avatarLayers.shoes : '',
          accessory: typeof avatarLayers.accessory === 'string' ? avatarLayers.accessory : '',
        };

        return;
      }

      sanitizedUpdates[key] = value;
    });

    console.log('[FIRESTORE DEBUG] sanitizedUpdates:', sanitizedUpdates);
    const docRef = doc(db, 'users', uid);
    console.log('[FIRESTORE DEBUG] Calling setDoc');
    await setDoc(docRef, { ...sanitizedUpdates, updatedAt: serverTimestamp() }, { merge: true });
    console.log('[FIRESTORE DEBUG] setDoc completed');
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

// Update auth email
export const updateUserEmail = async (newEmail: string): Promise<void> => {
  if (!auth.currentUser) throw new Error('No user logged in');
  await updateEmail(auth.currentUser, newEmail);
};

// Update auth password
export const updateUserPassword = async (newPassword: string): Promise<void> => {
  if (!auth.currentUser) throw new Error('No user logged in');
  await updatePassword(auth.currentUser, newPassword);
};

// Get current user
export const getCurrentUser = (): FirebaseUser | null => {
  return auth.currentUser;
};

export const deleteCurrentUserAccount = async (uid: string): Promise<void> => {
  if (!auth.currentUser) {
    throw new Error('No user logged in');
  }

  await deleteUser(auth.currentUser);

  try {
    await deleteDoc(doc(db, 'users', uid));
  } catch (error) {
    console.warn('User auth deleted but profile document cleanup failed:', error);
  }
};
