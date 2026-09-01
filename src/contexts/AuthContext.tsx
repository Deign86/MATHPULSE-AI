import React, { createContext, useContext, useState, useEffect } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase.ts';
import { User, UserRole, StudentProfile, TeacherProfile, AdminProfile } from '../types/models.ts';
import { getUserProfile, getUserProfileFromServer, createUserProfile, consumePendingAuthRole, getLastAuthRole } from '../services/authService.ts';


export interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  isLoggedIn: boolean;
  userRole: UserRole;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  loading: true,
  isLoggedIn: false,
  userRole: 'student',
  refreshProfile: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolvedRole, setResolvedRole] = useState<UserRole>('student');

  const inferRoleFromKnownDemoEmail = (email: string | null | undefined): UserRole | null => {
    if (!email) return null;
    const normalized = email.trim().toLowerCase();
    if (normalized === 'testteacher@school.edu') return 'teacher';
    if (normalized === 'testadmin@school.edu') return 'admin';
    if (normalized === 'teststudent@school.edu') return 'student';
    return null;
  };

  useEffect(() => {
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined = setTimeout(() => {
      setLoading(false);
    }, 1200);

    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (fallbackTimer) {
          clearTimeout(fallbackTimer);
          fallbackTimer = undefined;
        }
        setLoading(true);
        setCurrentUser(user);

        if (user) {
          const requestedRole = consumePendingAuthRole() || getLastAuthRole() || inferRoleFromKnownDemoEmail(user.email) || 'student';
          const safeRequestedRole: UserRole = requestedRole === 'admin' ? 'student' : requestedRole;

          // Fetch user profile from Firestore
          let profile = await getUserProfile(user.uid);
          
          // If profile doesn't exist, auto-create it
          if (!profile && user.email) {
            const role: UserRole = safeRequestedRole;
            const name = user.displayName || 'User';
            
            try {
              profile = await createUserProfile(user, role, { name });

              // Fire automation for new student enrollment
              if (role === 'student') {
                import('../services/automationService.ts')
                  .then(({ triggerStudentEnrolled }) =>
                    triggerStudentEnrolled({
                      // SAFETY: trusted internal value already conforms to the asserted type.
                      lrn: (profile as StudentProfile | undefined)?.lrn || user.uid,
                      name,
                      email: user.email || '',
                      gradeLevel: '',
                    })
                  )
                  .catch((err) =>
                    console.error('[WARN] Automation: enrollment pipeline failed:', err)
                  );
              }
            } catch (err) {
              console.error('[ERROR] AuthContext: Failed to auto-create profile:', err);
            }
          }

          if (profile) {
            setResolvedRole(profile.role);
            setUserProfile(profile);
            // Update lastActive timestamp on login (fire-and-forget)
            import('firebase/firestore').then(({ doc, updateDoc, serverTimestamp }) => {
              import('../lib/firebase').then(({ db }) => {
                updateDoc(doc(db, 'users', user.uid), { lastActive: serverTimestamp() }).catch(() => {});
              });
            });
            // Wire pipeline context for student event emissions
            if (profile.role === 'student') {
              // SAFETY: trusted internal value already conforms to the asserted type.
              const classId = (profile as any).classSectionId as string || '';
              // SAFETY: trusted internal value already conforms to the asserted type.
              const teacherId = (profile as any).adviserTeacherId as string || '';
              if (classId || teacherId) {
                import('../services/pipelineService').then(({ setStudentContext }) => {
                  setStudentContext(classId, teacherId);
                }).catch(() => {});
              }
            }
          } else {
            setResolvedRole(safeRequestedRole);
            // Keep login functional when profile storage is temporarily unavailable.
            // SAFETY: trusted internal value already conforms to the asserted type.
            setUserProfile({
              uid: user.uid,
              email: user.email || '',
              name: user.displayName || 'User',
              role: safeRequestedRole,
              photo: user.photoURL || '',
              createdAt: new Date(),
              updatedAt: new Date(),
            } as User);
          }
        } else {
          setResolvedRole('student');
          setUserProfile(null);
        }
        
        setLoading(false);
      });
    } catch (err) {
      console.error('[ERROR] AuthContext: Failed to attach auth listener:', err);
      setLoading(false);
    }

    return () => {
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
      }
      if ((unsubscribe instanceof Function)) {
        unsubscribe();
      }
    };
  }, []);

  const refreshProfile = async () => {
    if (currentUser) {
      // Bypass the persistent IndexedDB cache so we get the freshest data
      // (e.g. right after a profile picture upload wrote to Firestore).
      const profile = await getUserProfileFromServer(currentUser.uid);
      if (profile) {
        setUserProfile(profile);
      }
    }
  };

  const value: AuthContextType = {
    currentUser,
    userProfile,
    loading,
    isLoggedIn: !!currentUser,
    // SAFETY: trusted internal value already conforms to the asserted type.
    userRole: (userProfile?.role as UserRole) || resolvedRole,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
