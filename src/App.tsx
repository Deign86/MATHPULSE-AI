import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { DiagnosticCompletionPayload } from './components/DiagnosticAssessmentModal.tsx';
import AppLoadingScreen from './components/AppLoadingScreen.tsx';
import { ChatProvider } from './contexts/ChatContext.tsx';
import { useAuth } from './contexts/AuthContext.tsx';
import { deleteCurrentUserAccount, signOutUser, updateUserProfile, updateUserPassword } from './services/authService.ts';
import { createNotification } from './services/notificationService.ts';
import { updateStreak, awardXP } from './services/gamificationService.ts';
import { getUserProgress } from './services/progressService.ts';
import { AdminProfile, DEFAULT_USER_SETTINGS, StudentProfile, TeacherProfile, User, UserSettings } from './types/models.ts';
import { applyRuntimeSettings, clearClientCache, exportUserDataSnapshot, getUserSettings, upsertUserSettings } from './services/settingsService.ts';
import { Toaster, toast } from 'sonner';
import { AlertTriangle, ArrowRight, Calculator, Crown, Flame, Menu, Zap } from 'lucide-react';

type DiagnosticTopicKey = 'Functions' | 'BusinessMath' | 'Logic';

const DIAGNOSTIC_TOPIC_LABELS: Record<DiagnosticTopicKey, string> = {
  Functions: 'Functions and Graphs',
  BusinessMath: 'Business and Financial Mathematics',
  Logic: 'Logic and Reasoning',
};

const normalizeDiagnosticTopic = (value: string): DiagnosticTopicKey | null => {
  const normalized = value.trim().toLowerCase();

  if (normalized === 'functions' || normalized.includes('function')) return 'Functions';
  if (normalized === 'businessmath' || normalized.includes('business')) return 'BusinessMath';
  if (normalized === 'logic' || normalized.includes('reason')) return 'Logic';
  return null;
};

type ProfileSaveData = Partial<User> &
  Partial<Omit<StudentProfile, keyof User | 'role'>> &
  Partial<Omit<TeacherProfile, keyof User | 'role'>> &
  Partial<Omit<AdminProfile, keyof User | 'role'>>;

const LoginPage = lazy(() => import('./components/LoginPage.tsx'));
const TeacherDashboard = lazy(() => import('./components/TeacherDashboard.tsx'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard.tsx'));
const Sidebar = lazy(() => import('./components/Sidebar.tsx'));
const HeroBanner = lazy(() => import('./components/HeroBanner.tsx'));
const RightSidebar = lazy(() => import('./components/RightSidebar.tsx'));
const XPNotification = lazy(() => import('./components/XPNotification.tsx'));
const NotificationCenter = lazy(() => import('./components/NotificationCenter.tsx'));
const SearchBar = lazy(() => import('./components/SearchBar.tsx'));
const SupplementalBanner = lazy(() => import('./components/SupplementalBanner.tsx'));
const LearningPath = lazy(() => import('./components/LearningPath.tsx'));
const CompetencyRadarChart = lazy(() =>
  import('./components/CompetencyRadarChart.tsx').then((module) => ({
    default: module.CompetencyRadarChart,
  })),
);
const ModulesPage = lazy(() => import('./components/ModulesPage.tsx'));
const AIChatPage = lazy(() => import('./components/AIChatPage.tsx'));
const GradesPage = lazy(() => import('./components/GradesPage.tsx'));
const LeaderboardPage = lazy(() => import('./components/LeaderboardPage.tsx'));
const QuizBattlePage = lazy(() => import('./components/QuizBattlePage.tsx'));
const AvatarShop = lazy(() => import('./components/AvatarShop.tsx'));
const FloatingAITutor = lazy(() => import('./components/FloatingAITutor.tsx'));
const RewardsModal = lazy(() => import('./components/RewardsModal.tsx'));
const ProfileModal = lazy(() => import('./components/ProfileModal.tsx'));
const ConfirmModal = lazy(() => import('./components/ConfirmModal.tsx'));
const SettingsModal = lazy(() => import('./components/SettingsModal.tsx'));
const ScientificCalculator = lazy(() => import('./components/ScientificCalculator.tsx'));
const DiagnosticAssessmentModal = lazy(() => import('./components/DiagnosticAssessmentModal.tsx'));

const App = () => {
  // Get authentication state from context
  const { isLoggedIn, userProfile, userRole, loading, refreshProfile } = useAuth();
  const tabLoadingFallback = (
    <div className="flex min-h-[320px] items-center justify-center text-sm font-semibold text-slate-500">
      Loading content...
    </div>
  );
  const dashboardWidgetFallback = (
    <div className="pb-4 text-sm font-semibold text-slate-500">Loading dashboard content...</div>
  );
  const compactControlFallback = (
    <div className="h-11 w-11 shrink-0 rounded-xl bg-[#edf1f7]" aria-hidden="true" />
  );
  const searchBarFallback = (
    <div className="h-11 w-full rounded-xl bg-[#edf1f7]" aria-hidden="true" />
  );
  const sidebarShellFallback = (
    <div className="h-screen w-72 border-r border-[#dde3eb] bg-white/70" aria-hidden="true" />
  );
  const dashboardPanelFallback = (
    <div className="min-h-[240px] rounded-3xl border border-[#dde3eb] bg-white/70" aria-hidden="true" />
  );

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
  const [dashboardShellDeferredReady, setDashboardShellDeferredReady] = useState(false);

  // Diagnostic State
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [diagnosticAssessmentType, setDiagnosticAssessmentType] = useState<'initial_assessment' | 'followup_diagnostic'>('initial_assessment');
  const [hasTakenDiagnostic, setHasTakenDiagnostic] = useState(studentProfile?.hasTakenDiagnostic || false);
  const [atRiskSubjects, setAtRiskSubjects] = useState<string[]>(studentProfile?.atRiskSubjects || []);
  const [priorityTopics, setPriorityTopics] = useState<DiagnosticTopicKey[]>(
    (studentProfile?.priorityTopics || []) as DiagnosticTopicKey[],
  );
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
      setPriorityTopics((studentProfile.priorityTopics || []) as DiagnosticTopicKey[]);
      setHasTakenDiagnostic(studentProfile.hasTakenDiagnostic || false);
      setLearningPathState(studentProfile.learningPathState || 'unlocked');
      setIarAssessmentState(studentProfile.iarAssessmentState || 'not_started');
      setProfileReady(true);
    } else if (userRole !== 'student') {
      setProfileReady(true);
    }
  }, [userProfile, userRole]);

  useEffect(() => {
    if (!isLoggedIn || userRole !== 'student') {
      setDashboardShellDeferredReady(false);
      return;
    }

    let cancelled = false;
    const revealShell = () => {
      if (!cancelled) {
        setDashboardShellDeferredReady(true);
      }
    };

    const requestIdle = (
      window as {
        requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
      }
    ).requestIdleCallback;
    const cancelIdle = (
      window as {
        cancelIdleCallback?: (handle: number) => void;
      }
    ).cancelIdleCallback;

    const timeoutId = window.setTimeout(revealShell, 800);
    const frameId = window.requestAnimationFrame(() => {
      if (!requestIdle) {
        revealShell();
      }
    });
    const idleId = requestIdle?.(() => {
      revealShell();
    }, { timeout: 500 });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      window.cancelAnimationFrame(frameId);
      if (idleId !== undefined && cancelIdle) {
        cancelIdle(idleId);
      }
    };
  }, [isLoggedIn, userRole]);

  useEffect(() => {
    let cancelled = false;

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
        const { getPendingDeepDiagnosticCount } = await import('./services/automationService.ts');
        const count = await getPendingDeepDiagnosticCount(lrn);
        if (!cancelled) {
          setPendingDeepDiagnosticCount(count);
        }
      } catch (error) {
        console.error('Error loading deep diagnostic assignments:', error);
      }
    };

    void loadPendingDiagnostics();

    return () => {
      cancelled = true;
    };
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

  const normalizedAtRiskTopics = useMemo<DiagnosticTopicKey[]>(() => {
    const seen = new Set<DiagnosticTopicKey>();
    const normalized = atRiskSubjects
      .map((entry) => normalizeDiagnosticTopic(entry))
      .filter((entry): entry is DiagnosticTopicKey => entry !== null)
      .filter((entry) => {
        if (seen.has(entry)) return false;
        seen.add(entry);
        return true;
      });

    return normalized;
  }, [atRiskSubjects]);

  const prioritizedFocusTopics = useMemo<DiagnosticTopicKey[]>(() => {
    const primary = priorityTopics.length > 0 ? priorityTopics : normalizedAtRiskTopics;
    const seen = new Set<DiagnosticTopicKey>();
    return primary.filter((entry) => {
      if (seen.has(entry)) return false;
      seen.add(entry);
      return true;
    });
  }, [priorityTopics, normalizedAtRiskTopics]);

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
    if (isLoggedIn && userRole === 'student' && profileReady && !hasTakenDiagnostic) {
      // Small delay for better UX
      const timer = setTimeout(() => {
        setDiagnosticAssessmentType('initial_assessment');
        setShowDiagnosticModal(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoggedIn, userRole, profileReady, hasTakenDiagnostic]);

  const handleDiagnosticComplete = async (payload: DiagnosticCompletionPayload) => {
    const lrn = (studentProfile as StudentProfile | undefined)?.lrn || userProfile?.uid;

    if (payload.status === 'skipped') {
      setAtRiskSubjects([]);
      setPriorityTopics([]);
      setHasTakenDiagnostic(true);
      setLearningPathState('unlocked');
      setIarAssessmentState('skipped_unassessed');

      if (userProfile?.uid) {
        try {
          await updateUserProfile(userProfile.uid, {
            hasTakenDiagnostic: true,
            atRiskSubjects: [],
            priorityTopics: [],
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

    const normalizedRiskTopics = (payload.atRiskSubjectIds || [])
      .map((entry) => normalizeDiagnosticTopic(entry))
      .filter((entry): entry is DiagnosticTopicKey => entry !== null);
    const normalizedPriorityTopics = (payload.priorityTopics || [])
      .map((entry) => normalizeDiagnosticTopic(entry))
      .filter((entry): entry is DiagnosticTopicKey => entry !== null);

    setAtRiskSubjects(normalizedRiskTopics.length > 0 ? normalizedRiskTopics : (payload.atRiskSubjectIds || []));
    setPriorityTopics(normalizedPriorityTopics);
    setHasTakenDiagnostic(true);
    setIarAssessmentState('in_progress');

    if (userProfile?.uid) {
      try {
        await updateUserProfile(userProfile.uid, {
          hasTakenDiagnostic: true,
          atRiskSubjects: normalizedRiskTopics,
          priorityTopics: normalizedPriorityTopics,
          topicScores: payload.topicScores,
          iarTopicClassifications: payload.topicClassifications,
          g12ReadinessIndicators: payload.g12ReadinessIndicators,
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

    const { resetTestingDataForRole } = await import('./services/testResetService.ts');
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
          case 'b':
            e.preventDefault();
            handleStudentNavigation('Quiz Battle');
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
    return (
      <Suspense fallback={<AppLoadingScreen message="Loading sign in..." />}>
        <LoginPage />
      </Suspense>
    );
  }

  const isStudentProfileHydrated = userRole !== 'student' || profileReady;
  
  if (!isStudentProfileHydrated) {
    return <AppLoadingScreen message="Preparing your dashboard..." />;
  }

  // Show Teacher Dashboard
  if (userRole === 'teacher') {
    return (
      <>
        <Suspense fallback={<AppLoadingScreen message="Loading teacher dashboard..." />}>
          <TeacherDashboard 
            onLogout={handleLogout}
            onOpenProfile={() => setShowProfileModal(true)}
            onOpenSettings={() => setShowSettingsModal(true)}
          />
        </Suspense>
        {showProfileModal && (
          <Suspense fallback={null}>
            <ProfileModal
              isOpen={showProfileModal}
              onClose={() => setShowProfileModal(false)}
              profileData={profileData}
              onSave={handleSaveProfile}
            />
          </Suspense>
        )}
        {showSettingsModal && (
          <Suspense fallback={null}>
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
          </Suspense>
        )}
        <Toaster position="top-right" richColors closeButton />
      </>
    );
  }

  // Show Admin Dashboard
  if (userRole === 'admin') {
    return (
      <>
        <Suspense fallback={<AppLoadingScreen message="Loading admin dashboard..." />}>
          <AdminDashboard 
            onLogout={handleLogout}
            onOpenProfile={() => setShowProfileModal(true)}
            onOpenSettings={() => setShowSettingsModal(true)}
          />
        </Suspense>
        {showProfileModal && (
          <Suspense fallback={null}>
            <ProfileModal
              isOpen={showProfileModal}
              onClose={() => setShowProfileModal(false)}
              profileData={profileData}
              onSave={handleSaveProfile}
            />
          </Suspense>
        )}
        {showSettingsModal && (
          <Suspense fallback={null}>
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
          </Suspense>
        )}
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
          <Suspense fallback={sidebarShellFallback}>
            <Sidebar 
              activeTab={activeTab} 
              setActiveTab={handleStudentNavigation}
              userRole={userRole}
              onOpenSettings={() => setShowSettingsModal(true)}
              onLogout={() => setShowLogoutConfirm(true)}
              sidebarCollapsed={isSidebarCollapsed}
              setSidebarCollapsed={setIsSidebarCollapsed}
            />
          </Suspense>
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
              <Suspense fallback={sidebarShellFallback}>
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
              </Suspense>
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
                <Suspense fallback={searchBarFallback}>
                  <SearchBar
                    onSelect={(result) => {
                      // TODO: Navigate to selected search result
                    }}
                  />
                </Suspense>
              </div>
              {/* Calculator toggle */}
              <button
                onClick={() => setShowCalculator(prev => !prev)}
                className="p-3 rounded-xl bg-[#edf1f7] hover:bg-[#dde3eb] text-[#5a6578] hover:text-primary transition-all group"
                title="Scientific Calculator (Alt+K)"
              >
                <Calculator size={20} className="group-hover:scale-110 transition-transform" />
              </button>
              <Suspense fallback={compactControlFallback}>
                <NotificationCenter userRole={userRole} />
              </Suspense>
              
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
            className={`flex-1 min-h-0 p-3 lg:p-4 ${activeTab === 'AI Chat' ? 'overflow-hidden' : 'overflow-y-auto pb-24 sm:pb-28'}`}
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
                        <Suspense fallback={dashboardPanelFallback}>
                          <HeroBanner 
                            userName={firstName} 
                            userLevel={userLevel}
                            avatarLayers={profileData.avatarLayers}
                            onContinueLearning={() => handleStudentNavigation('Modules')}
                            showAssessmentTooltip={showInitialAssessmentCTA}
                            onOpenAssessment={handleOpenInitialAssessment}
                          />
                        </Suspense>

                        {dashboardShellDeferredReady && hasTakenDiagnostic && normalizedAtRiskTopics.length > 0 && (
                          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 shadow-sm dark:border-amber-400/40 dark:bg-amber-400/10">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="inline-flex items-center gap-2 text-sm font-black text-amber-900 dark:text-amber-200">
                                  <AlertTriangle className="h-4 w-4" />
                                  Assessment Focus Review
                                </p>
                                <p className="mt-1 text-sm text-amber-900/85 dark:text-amber-100/90">
                                  Your latest diagnostic flagged these topics for review. Modules are prioritized based on this focus order.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleStudentNavigation('Modules')}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-amber-700"
                              >
                                Open Modules
                                <ArrowRight className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {prioritizedFocusTopics.map((topic, index) => (
                                <span
                                  key={topic}
                                  className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-amber-900 shadow-sm dark:bg-amber-100/20 dark:text-amber-100"
                                >
                                  {index + 1}. {DIAGNOSTIC_TOPIC_LABELS[topic]}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {dashboardShellDeferredReady && shouldShowSupplementalBanner && (
                          <Suspense fallback={dashboardWidgetFallback}>
                            <SupplementalBanner
                              variant="full"
                              atRiskSubjects={atRiskSubjects}
                              onDismiss={dismissSupplementalBanner}
                              onAction={() => {
                                dismissSupplementalBanner();
                                handleStudentNavigation('Modules');
                              }}
                            />
                          </Suspense>
                        )}

                        {profileReady && dashboardShellDeferredReady && (
                          <Suspense fallback={dashboardWidgetFallback}>
                            <div className="pb-4">
                              <LearningPath
                                onNavigateToModules={(moduleId) => handleStudentNavigation('Modules', moduleId)}
                                atRiskSubjects={atRiskSubjects}
                                priorityTopics={prioritizedFocusTopics}
                              />
                            </div>
                          </Suspense>
                        )}

                        {profileReady && dashboardShellDeferredReady && (
                          <Suspense fallback={dashboardWidgetFallback}>
                            <div className="pb-4">
                              <CompetencyRadarChart />
                            </div>
                          </Suspense>
                        )}
                      </div>

                      <div className="col-span-12 xl:col-span-3 pt-2">
                        {dashboardShellDeferredReady ? (
                          <Suspense fallback={dashboardPanelFallback}>
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
                          </Suspense>
                        ) : (
                          dashboardPanelFallback
                        )}
                      </div>
                    </div>
                  </div>
                ) : activeTab === 'Modules' ? (
                  <Suspense fallback={tabLoadingFallback}>
                    <ModulesPage
                      onEarnXP={handleEarnXP}
                      atRiskSubjects={atRiskSubjects}
                      priorityTopics={prioritizedFocusTopics}
                      initialModuleId={targetModuleId}
                    />
                  </Suspense>
                ) : activeTab === 'Leaderboard' ? (
                  <Suspense fallback={tabLoadingFallback}>
                    <LeaderboardPage currentUserPhoto={profileData.photo} />
                  </Suspense>
                ) : activeTab === 'Quiz Battle' ? (
                  <Suspense fallback={tabLoadingFallback}>
                    <QuizBattlePage />
                  </Suspense>
                ) : activeTab === 'AI Chat' ? (
                  <Suspense fallback={tabLoadingFallback}>
                    <AIChatPage />
                  </Suspense>
                ) : activeTab === 'Grades' ? (
                  <Suspense fallback={tabLoadingFallback}>
                    <GradesPage />
                  </Suspense>
                ) : activeTab === 'Avatar Studio' ? (
                  <Suspense fallback={tabLoadingFallback}>
                    <AvatarShop
                      onSaveProfile={(layers) => {
                        setProfileOverrides((prev) => ({ ...prev, avatarLayers: layers }));
                      }}
                      onNavigateToModules={() => setActiveTab('Modules')}
                    />
                  </Suspense>
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
            <Suspense fallback={null}>
              <div className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-50">
                <FloatingAITutor constraintsRef={constraintsRef} onFullScreen={handleFullScreen} />
              </div>
            </Suspense>
          )}



          {/* XP Notification */}
          <Suspense fallback={null}>
            <XPNotification
              xp={xpNotification.xp}
              message={xpNotification.message}
              show={xpNotification.show}
              onComplete={() => setXpNotification(prev => ({ ...prev, show: false }))}
            />
          </Suspense>

          {/* Rewards Modal */}
          {showRewardsModal && (
            <Suspense fallback={null}>
              <RewardsModal
                isOpen={showRewardsModal}
                onClose={() => setShowRewardsModal(false)}
                userLevel={userLevel}
                currentXP={currentXP}
                xpToNextLevel={xpToNextLevel}
                totalXP={totalXP}
                streak={streak}
              />
            </Suspense>
          )}

          {/* Profile Modal */}
          {showProfileModal && (
            <Suspense fallback={null}>
              <ProfileModal
                isOpen={showProfileModal}
                onClose={() => setShowProfileModal(false)}
                profileData={profileData}
                onSave={handleSaveProfile}
              />
            </Suspense>
          )}

          {/* Logout Confirmation Modal */}
          {showLogoutConfirm && (
            <Suspense fallback={null}>
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
            </Suspense>
          )}

          {/* Settings Modal */}
          {showSettingsModal && (
            <Suspense fallback={null}>
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
            </Suspense>
          )}

          {/* Scientific Calculator */}
          {showCalculator && (
            <Suspense fallback={null}>
              <ScientificCalculator
                isOpen={showCalculator}
                onClose={() => setShowCalculator(false)}
              />
            </Suspense>
          )}

          {/* Diagnostic Assessment Modal */}
          {showDiagnosticModal && (
            <Suspense fallback={null}>
              <DiagnosticAssessmentModal
                isOpen={showDiagnosticModal}
                onClose={() => setShowDiagnosticModal(false)}
                onComplete={handleDiagnosticComplete}
                lrn={(studentProfile as StudentProfile | undefined)?.lrn || userProfile?.uid}
                gradeLevel={(studentProfile as StudentProfile)?.grade}
                workflowMode={iarWorkflowMode}
                assessmentType={diagnosticAssessmentType}
              />
            </Suspense>
          )}
        </div>
      </div>
    </ChatProvider>
    <Toaster position="top-right" richColors closeButton />
    </>
  );
};

export default App;
