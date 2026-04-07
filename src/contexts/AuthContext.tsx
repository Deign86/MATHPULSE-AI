import React, { createContext, useContext, useState, useEffect } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase.ts';
import { User, UserRole, StudentProfile, TeacherProfile, AdminProfile } from '../types/models.ts';
import { getUserProfile, createUserProfile, consumePendingAuthRole, getLastAuthRole } from '../services/authService.ts';

interface AuthContextType {
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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setCurrentUser(user);

      if (user) {
        const requestedRole = consumePendingAuthRole() || getLastAuthRole() || inferRoleFromKnownDemoEmail(user.email) || 'student';
        const safeRequestedRole: UserRole = requestedRole === 'admin' ? 'student' : requestedRole;

        // Fetch user profile from Firestore
        let profile = await getUserProfile(user.uid);
        
        // If profile doesn't exist, auto-create it
        if (!profile && user.email) {
          console.log('[WARN] AuthContext: Profile missing, auto-creating...');
          const role: UserRole = safeRequestedRole;
          const name = user.displayName || 'User';
          
          try {
            profile = await createUserProfile(user, role, { name });
            console.log('[OK] AuthContext: Profile auto-created:', { role, name });

            // Fire automation for new student enrollment
            if (role === 'student') {
              import('../services/automationService.ts')
                .then(({ triggerStudentEnrolled }) =>
                  triggerStudentEnrolled({
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
        } else {
          setResolvedRole(safeRequestedRole);
          // Keep login functional when profile storage is temporarily unavailable.
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

    return unsubscribe;
  }, []);

  const refreshProfile = async () => {
    if (currentUser) {
      const profile = await getUserProfile(currentUser.uid);
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
