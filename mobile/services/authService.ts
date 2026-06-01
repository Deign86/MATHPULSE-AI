import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth'
import {
  auth,
  db,
  doc,
  getDoc,
  setDoc,
  firestoreServerTimestamp,
} from '../lib/firebase'
import type {
  User,
  StudentProfile,
  TeacherProfile,
  AdminProfile,
  UserRole,
} from '../types/models'

// ─── Whitelist constants (exported for testability) ──────────────────────────

export const baseAllowed = [
  'name',
  'email',
  'phone',
  'photo',
  'avatarLayers',
  'gender',
] as const

export const roleAllowedMap: Record<UserRole, string[]> = {
  student: ['lrn', 'grade', 'section', 'classSectionId', 'adviserTeacherId',
    'adviserTeacherName', 'schoolYear', 'school', 'enrollmentDate', 'major',
    'gpa', 'level', 'currentXP', 'totalXP', 'coins', 'hintTokens', 'lives',
    'streakShields', 'activeMultiplier', 'atRiskSubjects', 'flaggedTopics',
    'hasTakenDiagnostic', 'iarAssessmentState', 'startingQuarterG11',
    'recommendedPace', 'iarQuestionSetVersion', 'iarTopicClassifications',
    'topicScores', 'learningPathState', 'g12ReadinessIndicators', 'riskFlags',
    'riskClassifications', 'overallRisk', 'subjectBadges',
    'currentCurriculumVersionSetId', 'grade12TransitionGate',
    'unlockCriteriaVersion', 'recommendedNextTopicGroupId',
    'recommendationRationale', 'recommendationReasonCode', 'remediationState',
    'remediationStatusCounts', 'lastAssessmentType',
    'initialAssessmentCompletedAt', 'ownedAvatarItems'],
  teacher: ['department', 'subject', 'yearsOfExperience', 'qualification',
    'teacherId', 'students'],
  admin: ['department', 'position', 'adminId'],
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

export function getRoleDefaults(role: UserRole): Record<string, unknown> {
  const currentYear = new Date().getFullYear()
  switch (role) {
    case 'student':
      return {
        lrn: null,
        grade: null,
        section: null,
        classSectionId: null,
        adviserTeacherId: null,
        adviserTeacherName: null,
        schoolYear: currentYear,
        school: 'MathPulse Academy',
        enrollmentDate: firestoreServerTimestamp(),
        major: null,
        gpa: 0,
        level: 1,
        currentXP: 0,
        totalXP: 0,
        coins: 0,
        hintTokens: 3,
        lives: 5,
        streakShields: 1,
        activeMultiplier: null,
        atRiskSubjects: [],
        flaggedTopics: [],
        hasTakenDiagnostic: false,
        iarAssessmentState: 'not_started',
        startingQuarterG11: 'Q1',
        recommendedPace: 'normal',
        iarQuestionSetVersion: null,
        iarTopicClassifications: {},
        topicScores: {},
        learningPathState: 'uninitiated',
        g12ReadinessIndicators: null,
        riskFlags: [],
        riskClassifications: {},
        overallRisk: null,
        subjectBadges: {},
        currentCurriculumVersionSetId: 'default',
        grade12TransitionGate: 'pending',
        unlockCriteriaVersion: 'v1',
        recommendedNextTopicGroupId: null,
        recommendationRationale: null,
        recommendationReasonCode: null,
        remediationState: 'none',
        remediationStatusCounts: {
          assigned: 0,
          inProgress: 0,
          completed: 0,
          mastered: 0,
        },
        lastAssessmentType: null,
        initialAssessmentCompletedAt: null,
        ownedAvatarItems: [],
      }
    case 'teacher':
      return {
        teacherId: null,
        department: null,
        subject: null,
        yearsOfExperience: 0,
        qualification: null,
        students: [],
      }
    case 'admin':
      return {
        adminId: null,
        position: null,
        department: null,
      }
  }
}

// ─── createProfile — with role-specific defaults ─────────────────────────────

async function createProfile(
  firebaseUser: FirebaseUser,
  role: UserRole,
  extraFields: Record<string, unknown> = {}
): Promise<StudentProfile | TeacherProfile | AdminProfile> {
  const base = mapFirebaseUser(firebaseUser)
  const roleDefaults = getRoleDefaults(role)
  const profileData = {
    ...base,
    role,
    ...roleDefaults,
    ...extraFields,
  }
  await setDoc(doc(db, 'users', firebaseUser.uid), profileData, { merge: true })
  return profileData as StudentProfile | TeacherProfile | AdminProfile
}

// ─── updateUserProfile — whitelist-validated profile update ──────────────────

export async function updateUserProfile(
  uid: string,
  role: UserRole,
  updates: Record<string, unknown>
): Promise<
  | { success: true; writtenKeys: string[] }
  | { success: false; error: string }
> {
  const allowedKeys = new Set([...baseAllowed, ...roleAllowedMap[role]])
  const validUpdates: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue
    if (!allowedKeys.has(key)) continue

    if (key === 'avatarLayers') {
      if (typeof value !== 'object' || value === null) continue

      const avatarLayers = value as Record<string, unknown>
      const requiredKeys = ['top', 'bottom', 'shoes', 'accessory'] as const

      // Must have all 4 keys present
      const missingKeys = requiredKeys.filter((k) => !(k in avatarLayers))
      if (missingKeys.length > 0) {
        return {
          success: false,
          error: `avatarLayers must include all keys: ${requiredKeys.join(', ')}`,
        }
      }

      // Each must be string, null, or undefined
      for (const k of requiredKeys) {
        const v = avatarLayers[k]
        if (v !== null && v !== undefined && typeof v !== 'string') {
          return {
            success: false,
            error: `avatarLayers.${k} must be string, null, or undefined`,
          }
        }
      }

      validUpdates[key] = avatarLayers
      continue
    }

    validUpdates[key] = value
  }

  const writtenKeys = Object.keys(validUpdates)
  await setDoc(
    doc(db, 'users', uid),
    { ...validUpdates, updatedAt: firestoreServerTimestamp() },
    { merge: true }
  )
  return { success: true, writtenKeys }
}

// ─── Auth flow functions ─────────────────────────────────────────────────────

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
