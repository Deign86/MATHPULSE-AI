import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import type {
  User,
  StudentProfile,
  TeacherProfile,
  AdminProfile,
  UserRole,
} from '../types/models'

function mapFirebaseUser(firebaseUser: FirebaseUser): User {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email ?? '',
    name: firebaseUser.displayName ?? '',
    role: 'student', // default, overridden by profile
    photo: firebaseUser.photoURL ?? undefined,
    createdAt: new Date(firebaseUser.metadata.creationTime ?? Date.now()),
    updatedAt: new Date(),
  }
}

async function fetchProfile(
  uid: string
): Promise<StudentProfile | TeacherProfile | AdminProfile | null> {
  const userDoc = await getDoc(doc(db, 'users', uid))
  if (!userDoc.exists()) return null
  const data = userDoc.data()
  const base = mapFirebaseUser(auth.currentUser!)
  const profile = { ...base, ...data }
  return profile as StudentProfile | TeacherProfile | AdminProfile
}

async function createProfile(
  firebaseUser: FirebaseUser,
  role: UserRole,
  extraFields: Record<string, unknown> = {}
): Promise<StudentProfile | TeacherProfile | AdminProfile> {
  const base = mapFirebaseUser(firebaseUser)
  const profileData = {
    ...base,
    role,
    ...extraFields,
  }
  await setDoc(doc(db, 'users', firebaseUser.uid), profileData, { merge: true })
  return profileData as StudentProfile | TeacherProfile | AdminProfile
}

export async function signUp(
  email: string,
  password: string,
  name: string,
  role: UserRole,
  extraFields: Record<string, unknown> = {}
): Promise<{ user: User; profile: StudentProfile | TeacherProfile | AdminProfile }> {
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  const firebaseUser = credential.user
  const profile = await createProfile(firebaseUser, role, extraFields)
  return { user: mapFirebaseUser(firebaseUser), profile }
}

export async function signIn(
  email: string,
  password: string
): Promise<{ user: User; profile: StudentProfile | TeacherProfile | AdminProfile }> {
  const credential = await signInWithEmailAndPassword(auth, email, password)
  const firebaseUser = credential.user
  const profile = await fetchProfile(firebaseUser.uid)
  if (!profile) throw new Error('User profile not found')
  return { user: mapFirebaseUser(firebaseUser), profile }
}

export async function logOut(): Promise<void> {
  await signOut(auth)
}

export async function fetchCurrentProfile(): Promise<StudentProfile | TeacherProfile | AdminProfile | null> {
  const currentUser = auth.currentUser
  if (!currentUser) return null
  return fetchProfile(currentUser.uid)
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email)
}

export function listenAuthState(
  callback: (user: FirebaseUser | null) => void
): () => void {
  return onAuthStateChanged(auth, callback)
}
