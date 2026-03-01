import React, { createContext, useContext, useState, useEffect } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { User, UserRole, StudentProfile, TeacherProfile, AdminProfile } from '../types/models';
import { getUserProfile, createUserProfile } from '../services/authService';
import { triggerStudentEnrolled } from '../services/automationService';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  isLoggedIn: boolean;
  userRole: UserRole;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  loading: true,
  isLoggedIn: false,
  userRole: 'student',
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Fetch user profile from Firestore
        let profile = await getUserProfile(user.uid);
        
        // If profile doesn't exist, auto-create it
        if (!profile && user.email) {
          console.log('[WARN] AuthContext: Profile missing, auto-creating...');
          const role: UserRole = 'student';
          const name = user.displayName || 'User';
          
          try {
            profile = await createUserProfile(user, role, { name });
            console.log('[OK] AuthContext: Profile auto-created:', { role, name });

            // Fire automation for new student enrollment
            if (role === 'student') {
              triggerStudentEnrolled({
                studentId: user.uid,
                name,
                email: user.email || '',
                gradeLevel: '',
              }).catch((err) =>
                console.error('[WARN] Automation: enrollment pipeline failed:', err)
              );
            }
          } catch (err) {
            console.error('[ERROR] AuthContext: Failed to auto-create profile:', err);
          }
        }
        
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    userProfile,
    loading,
    isLoggedIn: !!currentUser,
    userRole: (userProfile?.role as UserRole) || 'student',
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
