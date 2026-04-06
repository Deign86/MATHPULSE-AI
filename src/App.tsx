import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Sidebar from './components/Sidebar';
import HeroBanner from './components/HeroBanner';
import LearningPath from './components/LearningPath';
import RightSidebar from './components/RightSidebar';
import ModulesPage from './components/ModulesPage';
import AIChatPage from './components/AIChatPage';
import FloatingAITutor from './components/FloatingAITutor';
import XPNotification from './components/XPNotification';
import RewardsModal from './components/RewardsModal';
import TeacherDashboard from './components/TeacherDashboard';
import AdminDashboard from './components/AdminDashboard';
import LoginPage from './components/LoginPage';
import ProfileModal from './components/ProfileModal';
import NotificationCenter from './components/NotificationCenter';
import ConfirmModal from './components/ConfirmModal';
import SearchBar from './components/SearchBar';
import GradesPage from './components/GradesPage';
import SettingsModal from './components/SettingsModal';
import LeaderboardPage from './components/LeaderboardPage';
import DiagnosticAssessmentModal from './components/DiagnosticAssessmentModal';
import type { DiagnosticCompletionPayload } from './components/DiagnosticAssessmentModal';
import ScientificCalculator from './components/ScientificCalculator';
import SupplementalBanner from './components/SupplementalBanner';
import AvatarShop from './components/AvatarShop';
import AppLoadingScreen from './components/AppLoadingScreen';
import { CompetencyRadarChart } from './components/CompetencyRadarChart';
import { ChatProvider } from './contexts/ChatContext';
import { useAuth } from './contexts/AuthContext';
import { deleteCurrentUserAccount, signOutUser, updateUserProfile, updateUserPassword } from './services/authService';
import { createNotification } from './services/notificationService';
import { updateStreak, awardXP } from './services/gamificationService';
import { getUserProgress } from './services/progressService';
import { AdminProfile, DEFAULT_USER_SETTINGS, StudentProfile, TeacherProfile, User, UserSettings } from './types/models';
import { triggerStudentEnrolled, getPendingDeepDiagnosticCount } from './services/automationService';
import { resetTestingDataForRole } from './services/testResetService';
import { applyRuntimeSettings, clearClientCache, exportUserDataSnapshot, getUserSettings, upsertUserSettings } from './services/settingsService';
import { Toaster, toast } from 'sonner';
import { Crown, Flame, Zap, Brain, Calculator, Menu } from 'lucide-react';

type ProfileSaveData = Partial<User> &
  Partial<Omit<StudentProfile, keyof User | 'role'>> &
  Partial<Omit<TeacherProfile, keyof User | 'role'>> &
  Partial<Omit<AdminProfile, keyof User | 'role'>>;

const App = () => {
  // Get authentication state from context
  const { isLoggedIn, userProfile, userRole, loading, refreshProfile } = useAuth();

  const [activeTab, setActiveTab] = useState('Dashboard');
  const constraintsRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Sidebar State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // Gamification State (derived from Firebase user profile)
  const studentProfile = userProfile as StudentProfile;
  const [userLevel, setUserLevel] = useState(studentProfile?.level || 1);
  const [currentXP, setCurrentXP] = useState(studentProfile?.currentXP || 0);
  const [totalXP, setTotalXP] = useState(studentProfile?.totalXP || 0);
  const xpToNextLevel = Math.floor(100 * Math.pow(1.5, userLevel - 1));
  let sumRequiredForCurrentLevel = 0;
  for (let i = 1; i < userLevel; i++) {
    sumRequiredForCurrentLevel += Math.floor(100 * Math.pow(1.5, i - 1));
  }
  const progressXPInLevel = Math.max(0, totalXP - sumRequiredForCurrentLevel);
  const [streak, setStreak] = useState(studentProfile?.streak || 0);
  const [showRewardsModal, setShowRewardsModal] = useState(false);
  const [xpNotification, setXpNotification] = useState({ show: false, xp: 0, message: '' });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [profileOverrides, setProfileOverrides] = useState<ProfileSaveData>({});
  const [targetModuleId, setTargetModuleId] = useState<string | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [dismissedSupplementalSignature, setDismissedSupplementalSignature] = useState<string>('');

  // Diagnostic State
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [diagnosticAssessmentType, setDiagnosticAssessmentType] = useState<'initial_assessment' | 'followup_diagnostic'>('initial_assessment');
  const [hasTakenDiagnostic, setHasTakenDiagnostic] = useState(studentProfile?.hasTakenDiagnostic || false);
  const [atRiskSubjects, setAtRiskSubjects] = useState<string[]>(studentProfile?.atRiskSubjects || []);
  const [computedGpa, setComputedGpa] = useState<string>(studentProfile?.gpa || '0.00');
  const [learningPathState, setLearningPathState] = useState<StudentProfile['learningPathState']>(
    studentProfile?.learningPathState || 'unlocked',
  );
  const [iarAssessmentState, setIarAssessmentState] = useState<StudentProfile['iarAssessmentState']>(
    studentProfile?.iarAssessmentState || 'not_started',
  );
  const [pendingDeepDiagnosticCount, setPendingDeepDiagnosticCount] = useState(0);
  const iarWorkflowMode =
    import.meta.env.VITE_IAR_WORKFLOW_MODE === 'iar_plus_diagnostic'
      ? 'iar_plus_diagnostic'
      : 'iar_only';

  // Load computed GPA from progress data
  useEffect(() => {
    if (isLoggedIn && userRole === 'student' && userProfile) {
      getUserProgress(userProfile.uid).then((progress) => {
        if (progress && progress.averageScore > 0) {
          const gpa = Math.min(progress.averageScore / 25, 4.0).toFixed(2);
          setComputedGpa(gpa);
        }
      }).catch(err => console.error('Error loading progress for GPA:', err));
    }
  }, [isLoggedIn, userRole, userProfile]);

  // Update local state when userProfile changes
  const [profileReady, setProfileReady] = useState(false);
  useEffect(() => {
    if (studentProfile && userRole === 'student') {
      setUserLevel(studentProfile.level || 1);
      setCurrentXP(studentProfile.currentXP || 0);
      setTotalXP(studentProfile.totalXP || 0);
      setStreak(studentProfile.streak || 0);
      setAtRiskSubjects(studentProfile.atRiskSubjects || []);
      setHasTakenDiagnostic(studentProfile.hasTakenDiagnostic || false);
      setLearningPathState(studentProfile.learningPathState || 'unlocked');
      setIarAssessmentState(studentProfile.iarAssessmentState || 'not_started');
      setProfileReady(true);
    } else if (userRole !== 'student') {
      setProfileReady(true);
    }
  }, [userProfile, userRole]);

  useEffect(() => {
    const loadPendingDiagnostics = async () => {
      if (!isLoggedIn || userRole !== 'student') {
        setPendingDeepDiagnosticCount(0);
        return;
      }

      const lrn = (studentProfile as StudentProfile | undefined)?.lrn || userProfile?.uid;
      if (!lrn || learningPathState !== 'locked_pending_deep_diagnostic') {
        setPendingDeepDiagnosticCount(0);
        return;
      }

      try {
        const count = await getPendingDeepDiagnosticCount(lrn);
        setPendingDeepDiagnosticCount(count);
      } catch (error) {
        console.error('Error loading deep diagnostic assignments:', error);
      }
    };

    void loadPendingDiagnostics();
  }, [isLoggedIn, userRole, userProfile?.uid, studentProfile?.lrn, learningPathState]);

  const isLearningPathLocked =
    userRole === 'student' &&
    (learningPathState === 'locked_pending_deep_diagnostic' ||
      iarAssessmentState === 'deep_diagnostic_required' ||
      iarAssessmentState === 'deep_diagnostic_in_progress') &&
    (pendingDeepDiagnosticCount > 0 ||
      iarAssessmentState === 'deep_diagnostic_required' ||
      iarAssessmentState === 'deep_diagnostic_in_progress');

  const showInitialAssessmentCTA =
    userRole === 'student' && iarAssessmentState === 'skipped_unassessed';

  const handleOpenInitialAssessment = () => {
    setDiagnosticAssessmentType('initial_assessment');
    setShowDiagnosticModal(true);
  };

  const handleStudentNavigation = (tab: string, moduleId?: string) => {
    if (tab === 'Modules' && isLearningPathLocked) {
      toast.info(
        `Complete your deep diagnostic (${pendingDeepDiagnosticCount} outstanding) to unlock modules and regular practice.`,
      );
      setDiagnosticAssessmentType('followup_diagnostic');
      setShowDiagnosticModal(true);
      setActiveTab('Dashboard');
      return;
    }

    if (moduleId) {
      setTargetModuleId(moduleId);
    } else if (tab === 'Modules' && activeTab !== 'Modules') { // Only clear if not navigating within modules itself or passing an explicit id doesn't happen
      setTargetModuleId(null);
    }

    setActiveTab(tab);
    setIsMobileSidebarOpen(false);
  };

  // Update streak when user logs in (students only)
  useEffect(() => {
    if (isLoggedIn && userRole === 'student' && userProfile) {
      updateStreak(userProfile.uid).then((newStreak) => {
        setStreak(newStreak);
      });
    }
  }, [isLoggedIn, userRole, userProfile]);

  useEffect(() => {
    setProfileOverrides({});
  }, [userProfile?.uid]);

  const atRiskSignature = [...atRiskSubjects].sort().join('|');
  const supplementalDismissStorageKey = userProfile?.uid
    ? `mathpulse_supplemental_dismissed_${userProfile.uid}`
    : null;

  useEffect(() => {
    if (!supplementalDismissStorageKey) {
      setDismissedSupplementalSignature('');
      return;
    }

    try {
      const stored = localStorage.getItem(supplementalDismissStorageKey) || '';
      setDismissedSupplementalSignature(stored);
    } catch {
      setDismissedSupplementalSignature('');
    }
  }, [supplementalDismissStorageKey]);

  const dismissSupplementalBanner = () => {
    if (!atRiskSignature) return;

    setDismissedSupplementalSignature(atRiskSignature);
    if (!supplementalDismissStorageKey) return;

    try {
      localStorage.setItem(supplementalDismissStorageKey, atRiskSignature);
    } catch {
      // Ignore localStorage errors safely.
    }
  };

  const resetSupplementalBannerDismissal = () => {
    setDismissedSupplementalSignature('');
    if (!supplementalDismissStorageKey) return;

    try {
      localStorage.removeItem(supplementalDismissStorageKey);
    } catch {
      // Ignore localStorage errors safely.
    }
  };

  const shouldShowSupplementalBanner =
    atRiskSubjects.length > 0 && dismissedSupplementalSignature !== atRiskSignature;

  useEffect(() => {
    const loadSettings = async () => {
      if (!userProfile?.uid) {
        setUserSettings(DEFAULT_USER_SETTINGS);
        return;
      }

      try {
        const settings = await getUserSettings(userProfile.uid);
        setUserSettings(settings);
      } catch (error) {
        console.error('Error loading user settings:', error);
        setUserSettings(DEFAULT_USER_SETTINGS);
      }
    };

    void loadSettings();
  }, [userProfile?.uid]);

  useEffect(() => {
    applyRuntimeSettings(userSettings);
  }, [userSettings]);

  // Trigger diagnostic on first student login
  useEffect(() => {
    if (isLoggedIn && userRole === 'student' && !hasTakenDiagnostic) {
      // Small delay for better UX
      const timer = setTimeout(() => {
        setDiagnosticAssessmentType('initial_assessment');
        setShowDiagnosticModal(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoggedIn, userRole, hasTakenDiagnostic]);

  const handleDiagnosticComplete = async (payload: DiagnosticCompletionPayload) => {
    const lrn = (studentProfile as StudentProfile | undefined)?.lrn || userProfile?.uid;

    if (payload.status === 'skipped') {
      setAtRiskSubjects([]);
      setHasTakenDiagnostic(true);
      setLearningPathState('unlocked');
      setIarAssessmentState('skipped_unassessed');

      if (userProfile?.uid) {
        try {
          await updateUserProfile(userProfile.uid, {
            hasTakenDiagnostic: true,
            atRiskSubjects: [],
            learningPathState: 'unlocked',
            remediationState: 'not_required',
            iarAssessmentState: 'skipped_unassessed',
            recommendedNextTopicGroupId: 'g11-q1-functions-foundations',
            recommendationRationale: 'Default Grade 11 Q1 path after explicit IAR skip.',
            recommendedPace: 'normal',
            startingQuarterG11: 'Q1',
            currentCurriculumVersionSetId:
              (studentProfile as StudentProfile | undefined)?.currentCurriculumVersionSetId ||
              'g11-core-genmath-legacy-detail-strengthened-structure',
          });

          await createNotification(
            userProfile.uid,
            'reminder',
            'IAR Skipped: You are on default path',
            'You are currently marked as Unassessed and placed on Grade 11 Quarter 1 default flow. Take the Initial Assessment anytime for personalized placement.',
          );
        } catch (error) {
          console.error('Failed to persist skipped IAR state:', error);
        }
      }

      toast.message('Assessment skipped. Default Grade 11 Q1 path applied.', {
        description: 'You can take the Initial Assessment later for personalized recommendations.',
      });
      setShowDiagnosticModal(false);
      setActiveTab('Dashboard');
      return;
    }

    // Fresh diagnostic completion should always re-surface supplemental banner once.
    resetSupplementalBannerDismissal();

    setAtRiskSubjects(payload.atRiskSubjectIds || []);
    setHasTakenDiagnostic(true);
    setIarAssessmentState('in_progress');

    if (userProfile?.uid) {
      try {
        await updateUserProfile(userProfile.uid, {
          hasTakenDiagnostic: true,
          iarAssessmentState: 'in_progress',
          iarQuestionSetVersion: payload.questionSetVersion,
        });
      } catch (error) {
        console.error('Failed to persist completed IAR payload:', error);
      }
    }

    if (diagnosticAssessmentType === 'followup_diagnostic') {
      toast.success('Deep diagnostic submitted. Module unlock will update after assignment-state verification.');
    }

    if (diagnosticAssessmentType === 'initial_assessment' && lrn) {
      if ((payload.atRiskSubjectIds || []).length > 0 && iarWorkflowMode === 'iar_plus_diagnostic') {
        toast.info('Initial assessment submitted. Deep diagnostics for weak areas will run before full module unlock.');
      } else {
        toast.success('Initial assessment completed. Personalized path is now active.');
      }
    }

    setShowDiagnosticModal(false);
    setActiveTab('Dashboard');
  };

  const handleFullScreen = () => {
    setActiveTab('AI Chat');
  };

  const handleEarnXP = async (xp: number, message: string) => {
    if (!userProfile) return;
    
    try {
      const result = await awardXP(userProfile.uid, xp, 'manual', message);
      
      // Update local state and propagate to AuthContext's userProfile references 
      // so other components like AvatarShop see the accurate current XP without needing to refresh
      setCurrentXP(result.xp);
      if (result.leveledUp) {
        setUserLevel(result.newLevel);
      }
      setTotalXP(prev => prev + xp);

      // Refresh AuthContext profile to ensure globally read XP states are up to date 
      // without needing to mutate Object references.
      await refreshProfile();
      
      // Show notification
      setXpNotification({ show: true, xp: xp, message });
    } catch (error) {
      console.error('Error awarding XP:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOutUser();
      setProfileOverrides({});
      setActiveTab('Dashboard');
      setShowLogoutConfirm(false);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleSaveProfile = async (data: ProfileSaveData) => {
    if (!userProfile) {
      setShowProfileModal(false);
      setShowSettingsModal(false);
      return;
    }

    const updates: Record<string, unknown> = {};
    const allowedKeys: Array<keyof ProfileSaveData> = [
      'name',
      'email',
      'phone',
      'photo',
      'avatarLayers',
      'lrn',
      'grade',
      'section',
      'school',
      'enrollmentDate',
      'major',
      'gpa',
      'department',
      'subject',
      'yearsOfExperience',
      'qualification',
      'position',
    ];

    allowedKeys.forEach((key) => {
      if (data[key] !== undefined) {
        updates[key] = data[key];
      }
    });

    try {
      await updateUserProfile(userProfile.uid, updates as ProfileSaveData);
      setProfileOverrides((prev) => ({ ...prev, ...(updates as ProfileSaveData) }));
      setShowProfileModal(false);
      setShowSettingsModal(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handleSaveSettings = async (settingsUpdates: Partial<UserSettings>) => {
    if (!userProfile?.uid) return;

    try {
      const merged = await upsertUserSettings(userProfile.uid, settingsUpdates);
      setUserSettings(merged);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
      throw error;
    }
  };

  const handleUpdatePassword = async (nextPassword: string) => {
    try {
      await updateUserPassword(nextPassword);
      toast.success('Password updated successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update password';
      toast.error(message);
      throw error;
    }
  };

  const handleExportData = async () => {
    if (!userProfile?.uid) return;

    const snapshot = await exportUserDataSnapshot(userProfile.uid);
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `mathpulse-data-export-${userProfile.uid}-${Date.now()}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    toast.success('Data export downloaded');
  };

  const handleClearCache = async () => {
    await clearClientCache();
    toast.success('Local cache cleared');
  };

  const handleDeleteAccount = async () => {
    if (!userProfile?.uid || userRole !== 'admin') {
      throw new Error('Only admin accounts can delete this account from settings.');
    }

    try {
      await deleteCurrentUserAccount(userProfile.uid);
      toast.success('Account deleted successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to delete account';
      toast.error(message);
      throw error;
    }
  };

  const handleResetTestingData = async () => {
    if (!userProfile) {
      throw new Error('No active profile found.');
    }

    const lrn = userRole === 'student'
      ? (studentProfile as StudentProfile | undefined)?.lrn || userProfile.uid
      : undefined;

    const result = await resetTestingDataForRole({
      uid: userProfile.uid,
      role: userRole,
      lrn,
    });

    if (userRole === 'student') {
      setUserLevel(1);
      setCurrentXP(0);
      setTotalXP(0);
      setStreak(0);
      setAtRiskSubjects([]);
      setHasTakenDiagnostic(false);
      setLearningPathState('unlocked');
      setIarAssessmentState('not_started');
      setComputedGpa('0.00');
      setPendingDeepDiagnosticCount(0);
      setActiveTab('Dashboard');
    }

    toast.success(result.summary);
  };

  // Get profile data from userProfile or use defaults
  const profileData = userProfile ? {
    uid: userProfile.uid,
    name: userProfile.name,
    email: userProfile.email,
    phone: userProfile.phone || '',
    photo: userProfile.photo || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=200&h=200&fit=crop',
    avatarLayers: userProfile.avatarLayers,
    role: userProfile.role,
    ...(userRole === 'student' && studentProfile ? {
      lrn: studentProfile.lrn,
      grade: studentProfile.grade,
      section: studentProfile.section,
      school: studentProfile.school,
      enrollmentDate: studentProfile.enrollmentDate,
      major: studentProfile.major,
      gpa: computedGpa,
    } : {}),
    ...profileOverrides,
  } : {
    uid: undefined,
    name: 'User',
    email: '',
    phone: '',
    photo: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=200&h=200&fit=crop',
    avatarLayers: undefined,
    role: userRole,
  };

  const firstName = profileData.name
    .trim()
    .split(/\s+/)
    .find((part) => /\p{L}/u.test(part)) || profileData.name.trim() || 'User';

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if not typing in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.altKey) {
        switch(e.key.toLowerCase()) {
          case 'd':
            e.preventDefault();
            handleStudentNavigation('Dashboard');
            break;
          case 'm':
            e.preventDefault();
            handleStudentNavigation('Modules');
            break;
          case 'c':
            e.preventDefault();
            handleStudentNavigation('AI Chat');
            break;
          case 'g':
            e.preventDefault();
            handleStudentNavigation('Grades');
            break;
          case 's':
            e.preventDefault();
            setShowSettingsModal(true);
            break;
          case 'p':
            e.preventDefault();
            setShowProfileModal(true);
            break;
          case 'k':
            e.preventDefault();
            setShowCalculator(prev => !prev);
            break;
        }
      }
    };

    if (isLoggedIn && userRole === 'student') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isLoggedIn, userRole, isLearningPathLocked, pendingDeepDiagnosticCount]);

  if (loading) {
    return <AppLoadingScreen />;
  }

  // Show login page if not logged in
  if (!isLoggedIn) {
    return <LoginPage />;
  }

  const isStudentProfileHydrated = userRole !== 'student' || profileReady;
  
  if (!isStudentProfileHydrated) {
    return <AppLoadingScreen message="Preparing your dashboard..." />;
  }

  // Show Teacher Dashboard
  if (userRole === 'teacher') {
    return (
      <>
        <TeacherDashboard 
          onLogout={handleLogout}
          onOpenProfile={() => setShowProfileModal(true)}
          onOpenSettings={() => setShowSettingsModal(true)}
        />
        <ProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          profileData={profileData}
          onSave={handleSaveProfile}
        />
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          profileData={profileData}
          onSave={handleSaveProfile}
          settingsData={userSettings}
          onSaveSettings={handleSaveSettings}
          onApplySettingsPreview={setUserSettings}
          onUpdatePassword={handleUpdatePassword}
          onExportData={handleExportData}
          onClearCache={handleClearCache}
          onDeleteAccount={handleDeleteAccount}
          onResetData={handleResetTestingData}
        />
        <Toaster position="top-right" richColors closeButton />
      </>
    );
  }

  // Show Admin Dashboard
  if (userRole === 'admin') {
    return (
      <>
        <AdminDashboard 
          onLogout={handleLogout}
          onOpenProfile={() => setShowProfileModal(true)}
          onOpenSettings={() => setShowSettingsModal(true)}
        />
        <ProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          profileData={profileData}
          onSave={handleSaveProfile}
        />
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          profileData={profileData}
          onSave={handleSaveProfile}
          settingsData={userSettings}
          onSaveSettings={handleSaveSettings}
          onApplySettingsPreview={setUserSettings}
          onUpdatePassword={handleUpdatePassword}
          onExportData={handleExportData}
          onClearCache={handleClearCache}
          onDeleteAccount={handleDeleteAccount}
          onResetData={handleResetTestingData}
        />
        <Toaster position="top-right" richColors closeButton />
      </>
    );
  }

  // Show Student Dashboard (existing code)
  return (
    <>
    <ChatProvider>
      <div className="flex h-screen w-full bg-[#f8faff] overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Sidebar 
            activeTab={activeTab} 
            setActiveTab={handleStudentNavigation}
            userRole={userRole}
            onOpenSettings={() => setShowSettingsModal(true)}
            onLogout={() => setShowLogoutConfirm(true)}
            sidebarCollapsed={isSidebarCollapsed}
            setSidebarCollapsed={setIsSidebarCollapsed}
          />
        </div>

        {/* Mobile Sidebar Overlay */}
        {isMobileSidebarOpen && (
          <>
            <button
              aria-label="Close navigation"
              className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[1px] lg:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 z-50 p-3 lg:hidden">
              <Sidebar
                mode="mobile"
                onRequestClose={() => setIsMobileSidebarOpen(false)}
                activeTab={activeTab}
                setActiveTab={handleStudentNavigation}
                userRole={userRole}
                onOpenSettings={() => {
                  setShowSettingsModal(true);
                  setIsMobileSidebarOpen(false);
                }}
                onLogout={() => {
                  setShowLogoutConfirm(true);
                  setIsMobileSidebarOpen(false);
                }}
                sidebarCollapsed={false}
              />
            </div>
          </>
        )}

        {/* Main Content */}
        <div className="flex-1 min-h-0 flex flex-col min-w-0 bg-gradient-to-br from-indigo-200 via-fuchsia-50 to-orange-100 relative z-10 shadow-[rgba(124,58,237,0.05)_0px_0px_30px_inset]">
          <div className="absolute inset-0 bg-math-pattern opacity-30 pointer-events-none mix-blend-multiply z-0" />
          
          {/* Header — compact with inline gamification stats */}
          <header className="bg-white/90 backdrop-blur-md border-b border-[#dde3eb] px-3 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sticky top-0 z-30 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <button
                className="lg:hidden p-2 rounded-xl bg-[#edf1f7] hover:bg-[#dde3eb] text-[#5a6578] hover:text-primary transition-colors"
                onClick={() => setIsMobileSidebarOpen(true)}
                aria-label="Open navigation"
              >
                <Menu size={20} />
              </button>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-display font-bold text-[#0a1628] leading-tight truncate">{activeTab}</h1>
                <p className="text-xs text-[#5a6578] font-body truncate">Welcome back, {profileData.name.split(' ')[0]}!</p>
              </div>
              {/* Inline gamification badges — always visible */}
              <div className="hidden md:flex items-center gap-2 ml-2">
                <button
                  onClick={() => setShowRewardsModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 rounded-lg transition-colors cursor-pointer group"
                  title="View Rewards & Progress"
                >
                  <Crown className="h-3.5 w-3.5 text-rose-500" aria-hidden="true" />
                  <span className="text-xs font-display font-bold text-rose-700">Lv {userLevel}</span>
                </button>
                <button
                  onClick={() => setShowRewardsModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 hover:bg-violet-100 border border-violet-200/60 rounded-lg transition-colors cursor-pointer"
                  title={`${progressXPInLevel}/${xpToNextLevel} XP to next level`}
                >
                  <Zap className="h-3.5 w-3.5 text-violet-500" aria-hidden="true" />
                  <span className="text-xs font-display font-bold text-violet-700">{currentXP} XP</span>
                  <div className="w-12 h-1.5 bg-violet-100 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${(progressXPInLevel / xpToNextLevel) * 100}%` }} />
                  </div>
                </button>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200/60 rounded-lg">
                  <Flame className="h-3.5 w-3.5 text-orange-500" aria-hidden="true" />
                  <span className="text-xs font-display font-bold text-orange-700">{streak} day{streak !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap md:flex-nowrap items-center gap-2 min-w-0">
              <div className="hidden md:block flex-1 min-w-0 max-w-[420px]">
                <SearchBar
                  onSelect={(result) => {
                    // TODO: Navigate to selected search result
                  }}
                />
              </div>
              {/* Calculator toggle */}
              <button
                onClick={() => setShowCalculator(prev => !prev)}
                className="p-3 rounded-xl bg-[#edf1f7] hover:bg-[#dde3eb] text-[#5a6578] hover:text-primary transition-all group"
                title="Scientific Calculator (Alt+K)"
              >
                <Calculator size={20} className="group-hover:scale-110 transition-transform" />
              </button>
              <NotificationCenter userRole={userRole} />
              
              <button 
                onClick={() => setShowProfileModal(true)}
                className="flex items-center gap-2.5 h-11 shrink-0 bg-[#edf1f7] hover:bg-[#dde3eb] p-1.5 pr-3 rounded-lg cursor-pointer transition-all group"
                aria-label={`Profile: ${profileData.name}`}
              >
                <img 
                  src={profileData.photo}
                  alt={profileData.name}
                  className="w-8 h-8 rounded-lg object-cover"
                />
                <div className="hidden sm:block text-left min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#0a1628] leading-none group-hover:text-primary transition-colors font-body truncate">
                    {firstName}
                  </p>
                </div>
              </button>
            </div>
          </header>

          {/* Main Content Area */}
          <main
            ref={scrollContainerRef}
            className={`flex-1 min-h-0 p-3 lg:p-4 ${activeTab === 'AI Chat' ? 'overflow-hidden' : 'overflow-y-auto'}`}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className={activeTab === 'AI Chat' ? 'h-full min-h-0' : ''}
              >
                {activeTab === 'Dashboard' ? (
                  <div className="px-4 sm:px-6 xl:px-10 py-6 sm:py-8">
                    <div className="grid grid-cols-12 gap-6 sm:gap-8 lg:gap-10">
                      <div className="col-span-12 xl:col-span-9 flex flex-col gap-10 lg:gap-14 pt-0">
                        <HeroBanner 
                          userName={firstName} 
                          userLevel={userLevel}
                          avatarLayers={profileData.avatarLayers}
                          onContinueLearning={() => handleStudentNavigation('Modules')}
                          showAssessmentTooltip={showInitialAssessmentCTA}
                          onOpenAssessment={handleOpenInitialAssessment}
                        />

                        {shouldShowSupplementalBanner && (
                          <SupplementalBanner
                            variant="full"
                            atRiskSubjects={atRiskSubjects}
                            onDismiss={dismissSupplementalBanner}
                            onAction={() => {
                              dismissSupplementalBanner();
                              handleStudentNavigation('Modules');
                            }}
                          />
                        )}

                        {profileReady && (
                          <div className="pb-4">
                            <LearningPath onNavigateToModules={(moduleId) => handleStudentNavigation('Modules', moduleId)} atRiskSubjects={atRiskSubjects} />
                          </div>
                        )}

                        {profileReady && (
                          <div className="pb-4">
                            <CompetencyRadarChart />
                          </div>
                        )}
                      </div>

                      <div className="col-span-12 xl:col-span-3 pt-2">
                        <RightSidebar 
                          onOpenRewards={() => setShowRewardsModal(true)}
                          onOpenLeaderboard={() => setActiveTab('Leaderboard')}
                          onNavigateToModules={() => setActiveTab('Modules')}
                          userLevel={userLevel}
                          currentXP={progressXPInLevel}
                          xpToNextLevel={xpToNextLevel}
                          overallXP={currentXP}
                          streak={streak}
                          streakHistory={studentProfile?.streakHistory || []}
                        />
                      </div>
                    </div>
                  </div>
                ) : activeTab === 'Modules' ? (
                  <ModulesPage onEarnXP={handleEarnXP} atRiskSubjects={atRiskSubjects} initialModuleId={targetModuleId} />
                ) : activeTab === 'Leaderboard' ? (
                  <LeaderboardPage currentUserPhoto={profileData.photo} />
                ) : activeTab === 'AI Chat' ? (
                  <AIChatPage />
                ) : activeTab === 'Grades' ? (
                  <GradesPage />
                ) : activeTab === 'Avatar Studio' ? (
                  <AvatarShop
                    onSaveProfile={(layers) => {
                      setProfileOverrides((prev) => ({ ...prev, avatarLayers: layers }));
                    }}
                    onNavigateToModules={() => setActiveTab('Modules')}
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-[#a8a5b3] font-medium font-body">
                    {activeTab} Content Coming Soon
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Floating AI Tutor - persistent across tabs except dedicated AI Chat page */}
          {activeTab !== 'AI Chat' && (
            <div className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-50">
              <FloatingAITutor constraintsRef={constraintsRef} onFullScreen={handleFullScreen} />
            </div>
          )}



          {/* XP Notification */}
          <XPNotification
            xp={xpNotification.xp}
            message={xpNotification.message}
            show={xpNotification.show}
            onComplete={() => setXpNotification(prev => ({ ...prev, show: false }))}
          />

          {/* Rewards Modal */}
          <RewardsModal
            isOpen={showRewardsModal}
            onClose={() => setShowRewardsModal(false)}
            userLevel={userLevel}
            currentXP={currentXP}
            xpToNextLevel={xpToNextLevel}
            totalXP={totalXP}
            streak={streak}
          />

          {/* Profile Modal */}
          <ProfileModal
            isOpen={showProfileModal}
            onClose={() => setShowProfileModal(false)}
            profileData={profileData}
            onSave={handleSaveProfile}
          />

          {/* Logout Confirmation Modal */}
          <ConfirmModal
            isOpen={showLogoutConfirm}
            onClose={() => setShowLogoutConfirm(false)}
            onConfirm={handleLogout}
            title="Confirm Logout"
            message="Are you sure you want to log out? Your progress is saved automatically."
            confirmText="Logout"
            cancelText="Stay"
            type="warning"
            icon="logout"
          />

          {/* Settings Modal */}
          <SettingsModal
            isOpen={showSettingsModal}
            onClose={() => setShowSettingsModal(false)}
            profileData={profileData}
            onSave={handleSaveProfile}
            settingsData={userSettings}
            onSaveSettings={handleSaveSettings}
            onApplySettingsPreview={setUserSettings}
            onUpdatePassword={handleUpdatePassword}
            onExportData={handleExportData}
            onClearCache={handleClearCache}
            onDeleteAccount={handleDeleteAccount}
            onResetData={handleResetTestingData}
          />

          {/* Scientific Calculator */}
          <ScientificCalculator
            isOpen={showCalculator}
            onClose={() => setShowCalculator(false)}
          />

          {/* Diagnostic Assessment Modal */}
          <DiagnosticAssessmentModal
            isOpen={showDiagnosticModal}
            onClose={() => setShowDiagnosticModal(false)}
            onComplete={handleDiagnosticComplete}
            lrn={(studentProfile as StudentProfile | undefined)?.lrn || userProfile?.uid}
            gradeLevel={(studentProfile as StudentProfile)?.grade}
            workflowMode={iarWorkflowMode}
            assessmentType={diagnosticAssessmentType}
          />
        </div>
      </div>
    </ChatProvider>
    <Toaster position="top-right" richColors closeButton />
    </>
  );
};

export default App;
