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
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { User, UserRole, StudentProfile, TeacherProfile, AdminProfile } from '../types/models';

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Sign up with email and password
export const signUpWithEmail = async (
  email: string,
  password: string,
  name: string,
  role: UserRole,
  additionalData: any = {}
): Promise<User> => {
  try {
    // Create auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Update display name
    await updateProfile(firebaseUser, { displayName: name });

    // Create user profile in Firestore
    const userProfile = await createUserProfile(firebaseUser, role, additionalData);

    return userProfile;
  } catch (error: any) {
    console.error('🚨 Error signing up:', {
      code: error.code,
      message: error.message,
      fullError: error
    });
    throw new Error(error.message || 'Failed to create account');
  }
};

// Demo account configuration - maps emails to roles and names
const DEMO_ACCOUNTS: Record<string, { role: UserRole; name: string }> = {
  'demo-student@mathpulse.ai': { role: 'student', name: 'Alex Johnson' },
  'demo-teacher@mathpulse.ai': { role: 'teacher', name: 'Prof. Anderson' },
  'demo-admin@mathpulse.ai': { role: 'admin', name: 'Administrator' },
};

// Sign in with email and password
// Profile auto-creation is handled exclusively by AuthContext's onAuthStateChanged
export const signInWithEmail = async (email: string, password: string): Promise<void> => {
  try {
    console.log('🔐 Attempting sign in...', { email });
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Update display name for demo accounts if not set
    const demoInfo = DEMO_ACCOUNTS[email.toLowerCase()];
    if (!userCredential.user.displayName && demoInfo?.name) {
      await updateProfile(userCredential.user, { displayName: demoInfo.name });
    }
    
    console.log('✅ Sign in successful, AuthContext will handle profile creation');
  } catch (error: any) {
    console.error('🚨 Error signing in:', {
      code: error.code,
      message: error.message,
      fullError: error
    });
    throw new Error(error.message || 'Failed to sign in');
  }
};

// Sign in with Google
export const signInWithGoogle = async (role: UserRole = 'student'): Promise<User> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const firebaseUser = result.user;

    // Check if user profile exists
    let userProfile = await getUserProfile(firebaseUser.uid);

    // If not, create new profile
    if (!userProfile) {
      userProfile = await createUserProfile(firebaseUser, role, {});
    }

    return userProfile;
  } catch (error: any) {
    console.error('Error signing in with Google:', error);
    throw new Error(error.message || 'Failed to sign in with Google');
  }
};

// Sign out
export const signOutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error: any) {
    console.error('Error signing out:', error);
    throw new Error(error.message || 'Failed to sign out');
  }
};

// Reset password
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    console.error('Error resetting password:', error);
    throw new Error(error.message || 'Failed to send reset email');
  }
};

// Create user profile in Firestore
export const createUserProfile = async (
  firebaseUser: FirebaseUser,
  role: UserRole,
  additionalData: any
): Promise<User> => {
  const baseProfile = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    name: firebaseUser.displayName || additionalData.name || 'User',
    role,
    photo: firebaseUser.photoURL || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  let userProfile: any = { ...baseProfile };

  // Add role-specific fields
  if (role === 'student') {
    userProfile = {
      ...userProfile,
      studentId: `STU-${Date.now()}`,
      grade: additionalData.grade || '10th Grade',
      school: additionalData.school || '',
      enrollmentDate: new Date().toISOString().split('T')[0],
      major: additionalData.major || 'General',
      gpa: additionalData.gpa || '0.00',
      level: 1,
      currentXP: 0,
      totalXP: 0,
      streak: 0,
      friends: [],
      atRiskSubjects: [],
      hasTakenDiagnostic: false,
    } as StudentProfile;
  } else if (role === 'teacher') {
    userProfile = {
      ...userProfile,
      teacherId: `TCH-${Date.now()}`,
      department: additionalData.department || 'Mathematics',
      subject: additionalData.subject || 'Mathematics',
      yearsOfExperience: additionalData.yearsOfExperience || '0',
      qualification: additionalData.qualification || '',
      students: [],
    } as TeacherProfile;
  } else if (role === 'admin') {
    userProfile = {
      ...userProfile,
      adminId: `ADM-${Date.now()}`,
      position: additionalData.position || 'Administrator',
      department: additionalData.department || 'System',
    } as AdminProfile;
  }

  // Save to Firestore
  await setDoc(doc(db, 'users', firebaseUser.uid), userProfile);

  return userProfile as User;
};

// Get user profile from Firestore
export const getUserProfile = async (uid: string): Promise<User | null> => {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { ...docSnap.data(), uid: docSnap.id } as User;
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

// Update user profile
export const updateUserProfile = async (uid: string, updates: Partial<User>): Promise<void> => {
  try {
    const docRef = doc(db, 'users', uid);
    await setDoc(docRef, { ...updates, updatedAt: serverTimestamp() }, { merge: true });
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
