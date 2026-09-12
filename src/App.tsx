import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppLoadingScreen from './components/AppLoadingScreen.tsx';
import { ProgressGate } from './components/ProgressGate.tsx';
import { ChatProvider } from './contexts/ChatContext.tsx';
import { useAuth } from './contexts/AuthContext.tsx';
import { deleteCurrentUserAccount, signOutUser, updateUserProfile, updateUserPassword } from './services/authService.ts';
import { awardXP } from './services/gamificationService.ts';
import { updateCompetencyProfile } from './services/assessmentService.ts';
import { getUserProgress } from './services/progressService.ts';
import { AdminProfile, DEFAULT_USER_SETTINGS, StudentProfile, TeacherProfile, User, UserSettings } from './types/models.ts';
import { applyRuntimeSettings, clearClientCache, exportUserDataSnapshot, getUserSettings, upsertUserSettings } from './services/settingsService.ts';
import { Toaster, toast } from 'sonner';
import { NotificationProvider } from '@/features/notifications';
import { deactivateCurrentSessionToken } from './services/pushNotificationService';
import PushNotificationsManager from './components/PushNotificationsManager';
import InstallPwaButton from './components/InstallPwaButton.tsx';
import OnlineOfflineBanner from './components/OnlineOfflineBanner.tsx';
import { AlertTriangle, ArrowRight, Bot, Calculator, Crown, Flame, Menu, Swords, Target, Zap } from 'lucide-react';
import UserAvatar from './components/UserAvatar.tsx';
import { type DiagnosticTopicKey, DIAGNOSTIC_TOPIC_LABELS, normalizeDiagnosticTopic } from './lib/diagnosticTopics.ts';
import { getCurriculumModulesForLearner, resolveLearnerGradeLevel } from './data/curriculumModules';
import { deleteDoc, doc, getDoc, getDocFromServer, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './lib/firebase';
import { saveAssessmentResult } from './services/gradesService';
import { buildHeroBannerModalSummary, saveHeroBannerModalSummary } from './services/heroBannerSummaryService';
import { useCapacitorBackButton } from './hooks/useCapacitorBackButton';
import MobileBottomNav from './components/MobileBottomNav';

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
const NotificationBell = lazy(() => import('@/features/notifications').then(m => ({ default: m.NotificationBell })));

const SupplementalBanner = lazy(() => import('./components/SupplementalBanner.tsx'));
const SupplementalPillCarousel = lazy(() => import('./components/SupplementalPillCarousel.tsx'));
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
const InitialAssessmentModal = lazy(() => import('./components/assessment/InitialAssessmentModal.tsx'));
const AssessmentPage = lazy(() => import('./pages/AssessmentPage.tsx'));
const DiagnosticBreakdown = lazy(() => import('./components/assessment/DiagnosticBreakdown.tsx'));

type ActiveAppModal = null | 'rewards' | 'profile' | 'settings' | 'calculator' | 'logout_confirm' | 'diagnostic_breakdown';

const App = () => {
  // Get authentication state from context
  const { isLoggedIn, userProfile, userRole, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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

  const sidebarShellFallback = (
    <div className="h-dvh w-72 border-r border-[#dde3eb] bg-white/70" aria-hidden="true" />
  );
  const dashboardPanelFallback = (
    <div className="min-h-[240px] rounded-3xl border border-[#dde3eb] bg-white/70" aria-hidden="true" />
  );

  const [activeTab, setActiveTab] = useState('Dashboard');
  const avatarUnsavedRef = useRef(false);
  const [pendingAvatarNav, setPendingAvatarNav] = useState<string | null>(null);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Sidebar State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Maintenance Mode
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceChecked, setMaintenanceChecked] = useState(false);

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'general'));
        if (snap.exists() && snap.data()?.maintenanceMode === true) {
          setMaintenanceMode(true);
          // Sign out non-admin users
          if (isLoggedIn && userRole !== 'admin') {
            if (userProfile?.uid) await deactivateCurrentSessionToken(userProfile.uid);
            await signOutUser();
          }
        } else {
          setMaintenanceMode(false);
        }
      } catch {
        // If we can't read settings, don't block
      }
      setMaintenanceChecked(true);
    };
    checkMaintenance();
  }, [isLoggedIn, userRole]);
  
  // Gamification State (derived from Firebase user profile)
  // SAFETY: student sessions always carry a StudentProfile; teacher/admin roles never read these fields.
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
  // SAFETY: React.CSSProperties omits CSS custom properties; the XP fill width is asserted at the style boundary.
  const xpFillStyle = { '--w': `${Math.max(0, Math.min(100, (progressXPInLevel / xpToNextLevel) * 100))}%` } as React.CSSProperties;
  // (Streak derived from Daily Reward system via RightSidebar)

  // Curriculum data for navigation
  const activeGradeLevel = resolveLearnerGradeLevel(studentProfile?.grade);
  const assignedSubjects = useMemo(() => {
    // SAFETY: learner curriculum fields are optional profile extensions persisted by the import flow.
    const curriculumAssignments = studentProfile as (StudentProfile & {
      learnerCurriculumAssignments?: { subjects?: string[] };
    }) | null;
    // SAFETY: legacy assigned-subject lists are optional string arrays on the profile.
    const assignedLists = studentProfile as (StudentProfile & {
      assignedSubjects?: string[];
      curriculumAssignedSubjects?: string[];
    }) | null;
    const rawAssignments = curriculumAssignments?.learnerCurriculumAssignments?.subjects
      ?? assignedLists?.assignedSubjects
      ?? assignedLists?.curriculumAssignedSubjects
      ?? [];
    return Array.isArray(rawAssignments) ? rawAssignments : [];
  }, [studentProfile]);
  const curriculumRuntimeModules = useMemo(
    () => getCurriculumModulesForLearner(activeGradeLevel, assignedSubjects),
    [activeGradeLevel, assignedSubjects],
  );

  const moduleStatusMap = useMemo(
    () => Object.fromEntries(curriculumRuntimeModules.map(m => [m.id, m.moduleStatus])),
    [curriculumRuntimeModules],
  );

  // App-level Navigation State
  const [sidebarRevertState, setSidebarRevertState] = useState<{ collapsed: boolean }>({ collapsed: false });

  // URL path mapping for tab navigation
  /** Tab label to URL path for sidebar navigation routes. */
  interface RouteTabMap { [route: string]: string }

  const tabToPath: RouteTabMap = {
    'Dashboard': '/',
    'Modules': '/modules',
    'AI Chat': '/chat',
    'Assessment': '/assessment',
    'Quiz Battle': '/battle',
    'Leaderboard': '/leaderboard',
    'Grades': '/grades',
    'Avatar Studio': '/avatar',
  };

  const pathToTab: RouteTabMap = {
    '/': 'Dashboard',
    '/modules': 'Modules',
    '/chat': 'AI Chat',
    '/assessment': 'Assessment',
    '/battle': 'Quiz Battle',
    '/leaderboard': 'Leaderboard',
    '/grades': 'Grades',
    '/avatar': 'Avatar Studio',
  };

  // Sync activeTab from URL on mount and location change
  useEffect(() => {
    const tab = pathToTab[location.pathname] || 'Dashboard';
    setActiveTab(tab);
  }, [location.pathname]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const tab = pathToTab[window.location.pathname] || 'Dashboard';
      setActiveTab(tab);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleStudentNavigation = (tab: string, moduleId?: string) => {
    // Guard: check if Avatar Studio has unsaved changes
    if (activeTab === 'Avatar Studio' && avatarUnsavedRef.current && tab !== 'Avatar Studio') { setPendingAvatarNav(tab); return; }
    if (moduleId) {
      setTargetModuleId(moduleId);
    } else if (tab === 'Modules' && activeTab !== 'Modules') {
      setTargetModuleId(null);
    }

    if (tab === 'Quiz Battle' && activeTab !== 'Quiz Battle') {
      setSidebarRevertState({ collapsed: isSidebarCollapsed });
      setIsSidebarCollapsed(true);
    } else if (activeTab === 'Quiz Battle' && tab !== 'Quiz Battle') {
      setIsSidebarCollapsed(sidebarRevertState.collapsed);
    }

    setActiveTab(tab);
    // Also update URL for deep-link support
    const path = tabToPath[tab];
    if (path && window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setIsMobileSidebarOpen(false);
  };

  const [activeModal, setActiveModal] = useState<ActiveAppModal>(null);
  const [xpNotification, setXpNotification] = useState({ show: false, xp: 0, message: '' });
  const [profileOverrides, setProfileOverrides] = useState<ProfileSaveData>({});
  const [targetModuleId, setTargetModuleId] = useState<string | null>(null);
  const [isInQuizMode, setIsInQuizMode] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [dismissedSupplementalSignature, setDismissedSupplementalSignature] = useState<string>('');
  const [dashboardShellDeferredReady, setDashboardShellDeferredReady] = useState(false);

  // Diagnostic / Assessment State
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [hasCompletedDiagnostic, setHasCompletedDiagnostic] = useState<boolean | null>(null);
  const [assessmentDismissed, setAssessmentDismissed] = useState(false);
  const [initialAssessmentCompleted, setInitialAssessmentCompleted] = useState(false);
  const [diagnosticCheckVersion, setDiagnosticCheckVersion] = useState(0);
  const [showAssessmentPage, setShowAssessmentPage] = useState(false);
  const [assessmentTestId, setAssessmentTestId] = useState<string>('');
  const [assessmentQuestions, setAssessmentQuestions] = useState<any[]>([]);
  const [atRiskSubjects, setAtRiskSubjects] = useState<string[]>(studentProfile?.atRiskSubjects || []);
  const [priorityTopics, setPriorityTopics] = useState<DiagnosticTopicKey[]>(
    studentProfile?.priorityTopics || [],
  );
  const [computedGpa, setComputedGpa] = useState<string>(studentProfile?.gpa || '0');

  // Capacitor Android hardware / gesture back button handling
  useCapacitorBackButton({
    activeModals: [
      () => {
        if (isMobileSidebarOpen) {
          setIsMobileSidebarOpen(false);
          return true;
        }
        return false;
      },
      () => {
        if (activeModal !== null) {
          setActiveModal(null);
          return true;
        }
        return false;
      },
      () => {
        if (showDiagnosticModal) {
          setShowDiagnosticModal(false);
          return true;
        }
        return false;
      },
      () => {
        if (showAssessmentPage) {
          setShowAssessmentPage(false);
          return true;
        }
        return false;
      },
      () => {
        if (targetModuleId) {
          setTargetModuleId(null);
          return true;
        }
        return false;
      },
      () => {
        if (pendingAvatarNav) {
          setPendingAvatarNav(null);
          return true;
        }
        return false;
      },
      () => {
        if (activeTab !== 'Dashboard') {
          handleStudentNavigation('Dashboard');
          return true;
        }
        return false;
      },
    ],
  });

  // Load computed general average from progress data (DepEd percentage-based)
  useEffect(() => {
    if (isLoggedIn && userRole === 'student' && userProfile) {
      getUserProgress(userProfile.uid).then((progress) => {
        if (progress && progress.averageScore > 0) {
          setComputedGpa(Math.round(progress.averageScore).toString());
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
      setAtRiskSubjects(studentProfile.atRiskSubjects || []);
      setPriorityTopics(studentProfile.priorityTopics || []);
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

    // SAFETY: requestIdleCallback/cancelIdleCallback are not in the standard TS DOM lib; feature-detected here.
    const idleAwareWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const requestIdle = idleAwareWindow.requestIdleCallback;
    const cancelIdle = idleAwareWindow.cancelIdleCallback;

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
    setProfileOverrides({});
  }, [userProfile?.uid]);

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
    setShowDiagnosticModal(true);
  };

  useEffect(() => {
    const handler = () => setShowDiagnosticModal(true);
    window.addEventListener('mathpulse:open-assessment', handler);
    return () => window.removeEventListener('mathpulse:open-assessment', handler);
  }, []);

  // Firestore-based diagnostic check on student login
  useEffect(() => {
    if (!isLoggedIn || userRole !== 'student' || !profileReady || !userProfile?.uid) return;

    let cancelled = false;
    const checkDiagnostic = async () => {
      try {
        setAssessmentDismissed(!!studentProfile?.assessmentDismissed);
        setInitialAssessmentCompleted(!!studentProfile?.initialAssessmentCompleted);

        // Check legacy diagnostic results (force server read to avoid stale cache after reset)
        const legacySnap = await getDocFromServer(doc(db, 'diagnosticResults', userProfile.uid))
          .catch(() => getDoc(doc(db, 'diagnosticResults', userProfile.uid)));
        // Check new competency profile (force server read to avoid stale cache after reset)
        const profileSnap = await getDocFromServer(doc(db, 'competencyProfiles', userProfile.uid))
          .catch(() => getDoc(doc(db, 'competencyProfiles', userProfile.uid)));

        if (cancelled) return;

        const hasLegacyComplete = legacySnap.exists() && legacySnap.data()?.status === 'completed';
        const hasEnhancedComplete = profileSnap.exists() && profileSnap.data()?.overallScore > 0;

        if (!hasLegacyComplete && !hasEnhancedComplete) {
          setHasCompletedDiagnostic(false);
          const timer = setTimeout(() => {
            if (!cancelled && !assessmentDismissed && !initialAssessmentCompleted) {
              // Also check session-only dismiss — X button sets sessionStorage, not Firestore
              const sessionDismissed = sessionStorage.getItem('mathpulse_iar_session_dismissed') === 'true';
              if (!sessionDismissed) {
                setShowDiagnosticModal(true);
              }
            }
          }, 1000);
          return () => clearTimeout(timer);
        } else {
          setHasCompletedDiagnostic(true);
          // Load risk data from legacy or enhanced
          if (legacySnap.exists()) {
            const data = legacySnap.data();
            if (data?.riskProfile) {
              setAtRiskSubjects(data.riskProfile.weak_domains || []);
              setPriorityTopics(data.riskProfile.critical_gaps || []);
            }
          }
          // Also load competency profile data if available
          if (profileSnap.exists()) {
            const profileData = profileSnap.data();
            if (profileData?.primaryWeakness) {
              // Merge with existing at-risk subjects
              setAtRiskSubjects(prev => [...new Set([...prev, profileData.primaryWeakness])]);
            }
          }
        }
      } catch (err) {
        console.error('[diagnostic] Firestore check failed:', err);
      }
    };
    void checkDiagnostic();
    return () => { cancelled = true; };
  }, [isLoggedIn, userRole, profileReady, userProfile?.uid, diagnosticCheckVersion]);

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

  // Diagnostic modal handlers
  const handleDiagnosticStart = (testId: string, questions: any[]) => {
    setShowDiagnosticModal(false);
    setAssessmentTestId(testId);
    setAssessmentQuestions(questions);
    setShowAssessmentPage(true);
  };

  const handleAssessmentComplete = async (result: {
    overallRisk: string;
    overallScorePercent: number;
    intervention: string;
    xpEarned: number;
    badgeUnlocked: string;
    competencyScores?: Record<string, { score: number; correct: number; attempted: number }>;
    proficiencyProfile?: {
      strengths: string[];
      weaknesses: string[];
      borderline: string[];
      suggestedStartingModule: string;
      recommendedPace: 'support_intensive' | 'normal' | 'accelerated';
    };
  }) => {
    setShowAssessmentPage(false);
    setHasCompletedDiagnostic(true);
    setActiveModal('diagnostic_breakdown');

    if (result.xpEarned > 0 && userProfile?.uid) {
      try {
        await awardXP(userProfile.uid, result.xpEarned, 'manual', 'Diagnostic assessment completed');
        toast.success(`Assessment complete! +${result.xpEarned} XP earned. ${result.badgeUnlocked.replace('_', ' ')} badge unlocked!`);
      } catch (err) {
        toast.success('Assessment complete!');
      }
    } else {
      toast.success('Assessment complete!');
    }

    // Save enhanced competency profile if available
    if (userProfile?.uid && result.competencyScores && result.proficiencyProfile) {
      try {
        await updateCompetencyProfile(userProfile.uid, {
          uid: userProfile.uid,
          assessmentId: `assessment-${Date.now()}`,
          completedAt: new Date(),
          rawScore: result.overallScorePercent,
          totalQuestions: Object.values(result.competencyScores).reduce((sum, s) => sum + s.attempted, 0),
          correctAnswers: Object.values(result.competencyScores).reduce((sum, s) => sum + s.correct, 0),
          timeSpentSeconds: 0,
          competencyScores: result.competencyScores,
          recommendations: result.proficiencyProfile.weaknesses.map(w => `Focus on ${w}`),
          proficiencyProfile: result.proficiencyProfile,
          assessmentType: 'initial',
        });
      } catch (err) {
        console.error('[WARN] Failed to save competency profile:', err);
      }
    }

    // Build and save hero banner modal summary
    if (userProfile?.uid) {
      try {
        const heroBannerSummary = buildHeroBannerModalSummary({
          assessmentId: assessmentTestId ? `assessment-${assessmentTestId}` : `assessment-${Date.now()}`,
          overallScorePercent: result.overallScorePercent,
          overallRisk: result.overallRisk,
          intervention: result.intervention,
          proficiencyProfile: result.proficiencyProfile,
        });
        await saveHeroBannerModalSummary(userProfile.uid, heroBannerSummary);
      } catch (err) {
        console.error('[App] Failed to save hero banner summary:', err);
      }
    }

    if (userProfile?.uid) {
      try {
        const snap = await getDoc(doc(db, 'diagnosticResults', userProfile.uid));
        if (snap.exists()) {
          const data = snap.data();
          if (data?.riskProfile) {
            setAtRiskSubjects(data.riskProfile.weak_domains || []);
            setPriorityTopics(data.riskProfile.critical_gaps || []);
          }
        }
        resetSupplementalBannerDismissal();
      } catch (err) {
        console.error('[diagnostic] Failed to refresh risk data:', err);
      }

      try {
        await updateDoc(doc(db, 'users', userProfile.uid), {
          initialAssessmentCompleted: true,
          assessmentDismissed: false,
          assessmentCompletedAt: serverTimestamp(),
        });
        await awardXP(userProfile.uid, 50, 'initial_assessment', 'Initial assessment completed');
      } catch (err) {
        console.error('[App] Failed to persist assessment completion:', err);
      }

      // Persist to grades service for GradesPage
      try {
        await saveAssessmentResult({
          uid: userProfile.uid,
          testId: assessmentTestId || 'diagnostic',
          title: 'Diagnostic Assessment',
          subject: 'General Mathematics',
          type: 'diagnostic',
          score: result.overallScorePercent,
          totalQuestions: Object.values(result.competencyScores || {}).reduce((sum, s) => sum + s.attempted, 0),
          risk: result.overallRisk,
          intervention: result.intervention,
          xpEarned: result.xpEarned,
          badgeUnlocked: result.badgeUnlocked,
        });
      } catch (err) {
        console.error('[App] Failed to persist grade result:', err);
      }
    }
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
      if (userProfile?.uid) await deactivateCurrentSessionToken(userProfile.uid);
      await signOutUser();
      setProfileOverrides({});
      setActiveTab('Dashboard');
      setActiveModal(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleSaveProfile = async (data: ProfileSaveData) => {
    if (!userProfile) {
      setActiveModal(null);
      return;
    }

    const updates: Partial<ProfileSaveData> = {};
    const allowedKeys: Array<keyof ProfileSaveData> = [
      'name',
      'email',
      'phone',
      'photo',
      'avatarLayers',
      'gender',
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
        Object.assign(updates, { [key]: data[key] });
      }
    });

    try {
      await updateUserProfile(userProfile.uid, updates);
      setProfileOverrides((prev) => ({ ...prev, ...updates }));
      setActiveModal(null);
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

    // SAFETY: student sessions always carry a StudentProfile with the LRN field.
    const studentLrn = (studentProfile as StudentProfile | undefined)?.lrn;
    const lrn = userRole === 'student'
      ? studentLrn || userProfile.uid
      : undefined;

    // Immediately delete diagnostic documents BEFORE resetting state.
    // This guarantees checkDiagnostic sees them gone even if the async
    // reset is slow or the Firestore cache hasn't propagated yet.
    if (userRole === 'student') {
      await deleteDoc(doc(db, 'diagnosticResults', userProfile.uid)).catch(() => undefined);
      await deleteDoc(doc(db, 'competencyProfiles', userProfile.uid)).catch(() => undefined);
    }

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
      setAtRiskSubjects([]);
      setPriorityTopics([]);
      setHasCompletedDiagnostic(null);
      setAssessmentDismissed(false);
      setInitialAssessmentCompleted(false);
      setComputedGpa('0');
      setActiveTab('Dashboard');
      // Refresh AuthContext profile so stale assessment fields are re-read from Firestore
      void refreshProfile();
      // Re-trigger diagnostic check so modal shows if assessment was properly reset
      setDiagnosticCheckVersion(v => v + 1);
    }

    toast.success(result.summary);
  };

  // Get profile data from userProfile or use defaults
  const profileData = userProfile ? {
    uid: userProfile.uid,
    name: userProfile.name,
    email: userProfile.email,
    phone: userProfile.phone || '',
    photo: userProfile.photo || '',
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
    } : undefined),
    ...profileOverrides,
  } : {
    uid: undefined,
    name: 'User',
    email: '',
    phone: '',
    photo: '',
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
            setActiveModal('settings');
            break;
          case 'p':
            e.preventDefault();
            setActiveModal('profile');
            break;
          case 'k':
            e.preventDefault();
            setActiveModal(prev => prev === 'calculator' ? null : 'calculator');
            break;
        }
      }
    };

    if (isLoggedIn && userRole === 'student') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isLoggedIn, userRole]);

  // Listen for notification-driven navigation events
  useEffect(() => {
    const handleNotificationNavigate = (e: Event) => {
      // SAFETY: navigation events are dispatched by this app's notification flows as CustomEvent with a detail object.
      const detail = (e as CustomEvent).detail;
      if (detail?.tab && isLoggedIn) {
        handleStudentNavigation(detail.tab);
      }
    };

    window.addEventListener('mathpulse:navigate', handleNotificationNavigate);
    return () => window.removeEventListener('mathpulse:navigate', handleNotificationNavigate);
  }, [isLoggedIn]);

  if (loading) {
    return <AppLoadingScreen />;
  }

  // Maintenance mode: block non-admin users
  if (maintenanceMode && (!isLoggedIn || userRole !== 'admin')) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#f8fafc] p-6">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-[#1e293b] mb-2">System Under Maintenance</h1>
          <p className="text-sm text-[#64748b] leading-relaxed mb-4">
            MathPulse AI is currently undergoing scheduled maintenance. All user sessions have been paused and your progress has been saved.
          </p>
          <p className="text-xs text-[#94a3b8]">
            Please check back shortly. We apologize for the inconvenience.
          </p>
        </div>
      </div>
    );
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

  const withPushManager = (content: React.ReactNode) => (
    <PushNotificationsManager>{content}</PushNotificationsManager>
  );

  let authenticatedContent: React.ReactNode;

  // Show Teacher Dashboard
  if (userRole === 'teacher') {
    authenticatedContent = (
      <NotificationProvider>
      <>
        <Suspense fallback={<AppLoadingScreen message="Loading teacher dashboard..." />}>
          <TeacherDashboard 
            onLogout={handleLogout}
            onOpenProfile={() => setActiveModal('profile')}
            onOpenSettings={() => setActiveModal('settings')}
          />
        </Suspense>
        {activeModal === 'profile' && (
          <Suspense fallback={null}>
            <ProfileModal
              isOpen={activeModal === 'profile'}
              onClose={() => setActiveModal(null)}
              profileData={profileData}
              onSave={handleSaveProfile}
            />
          </Suspense>
        )}
        {activeModal === 'settings' && (
          <Suspense fallback={null}>
            <SettingsModal
              isOpen={activeModal === 'settings'}
              onClose={() => setActiveModal(null)}
              profileData={profileData}
              onSave={handleSaveProfile}
              settingsData={userSettings}
              onSaveSettings={handleSaveSettings}
              onApplySettingsPreview={setUserSettings}
              onExportData={handleExportData}
              onClearCache={handleClearCache}
              onResetData={handleResetTestingData}
             />
           </Suspense>
         )}
         <Toaster position="top-right" richColors closeButton />
       </>
      </NotificationProvider>
    );
  } else if (userRole === 'admin') {
    authenticatedContent = (
      <NotificationProvider>
      <>
        <Suspense fallback={<AppLoadingScreen message="Loading admin dashboard..." />}>
          <AdminDashboard 
            onLogout={handleLogout}
            onOpenProfile={() => setActiveModal('profile')}
            onOpenSettings={() => setActiveModal('settings')}
          />
        </Suspense>
        {activeModal === 'profile' && (
          <Suspense fallback={null}>
            <ProfileModal
              isOpen={activeModal === 'profile'}
              onClose={() => setActiveModal(null)}
              profileData={profileData}
              onSave={handleSaveProfile}
            />
          </Suspense>
        )}
        {activeModal === 'settings' && (
          <Suspense fallback={null}>
            <SettingsModal
              isOpen={activeModal === 'settings'}
              onClose={() => setActiveModal(null)}
              profileData={profileData}
              onSave={handleSaveProfile}
              settingsData={userSettings}
              onSaveSettings={handleSaveSettings}
              onApplySettingsPreview={setUserSettings}
              onExportData={handleExportData}
              onClearCache={handleClearCache}
              onResetData={handleResetTestingData}
            />
          </Suspense>
        )}
         <Toaster position="top-right" richColors closeButton />
       </>
      </NotificationProvider>
    );
  } else {
    // Show Student Dashboard (existing code)
    const studentDashboard = (
    <NotificationProvider>
    <>
    <ChatProvider>
      <div className="flex h-dvh w-full bg-[#f8faff] overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Suspense fallback={sidebarShellFallback}>
            <Sidebar 
              activeTab={activeTab} 
              setActiveTab={handleStudentNavigation}
              userRole={userRole}
              onOpenSettings={() => setActiveModal('settings')}
              onLogout={() => setActiveModal('logout_confirm')}
              sidebarCollapsed={isSidebarCollapsed}
              setSidebarCollapsed={setIsSidebarCollapsed}
              forceCollapsed={activeTab === 'Quiz Battle'}
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
                    setActiveModal('settings');
                    setIsMobileSidebarOpen(false);
                  }}
                  onLogout={() => {
                    setActiveModal('logout_confirm');
                    setIsMobileSidebarOpen(false);
                  }}
                  sidebarCollapsed={false}
                />
              </Suspense>
            </div>
          </>
        )}

        {/* Main Content */}
        <div className="flex-1 min-h-0 flex flex-col min-w-0 bg-gradient-to-br from-[#f8faff] via-[#f1f5fd] to-[#f5f0fc] dark:from-[#050d18] dark:via-[#0c1527] dark:to-[#120e24] relative z-10 overflow-hidden shadow-[rgba(124,58,237,0.04)_0px_0px_30px_inset]">
          {/* Ambient glowing gradient orbs */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-purple-200/30 via-indigo-100/20 to-transparent rounded-full blur-3xl pointer-events-none -translate-y-1/3 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[450px] h-[450px] bg-gradient-to-tr from-sky-200/25 via-purple-100/15 to-transparent rounded-full blur-3xl pointer-events-none translate-y-1/3 -translate-x-1/4" />
          <div className="absolute inset-0 bg-math-pattern opacity-10 mix-blend-overlay pointer-events-none z-0" />
          
          {/* Desktop Header — compact with inline gamification stats (hidden on mobile/tablet where bottom nav and top status row are active) */}
          <header className="hidden lg:flex bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-white/60 dark:border-white/10 px-6 py-3 flex-row items-center justify-between gap-3 sticky top-0 z-30 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
            <div className="flex items-center gap-3 min-w-0">
              <InstallPwaButton />
              <div className="min-w-0">
                <h1 className="text-xl font-display font-bold text-[#0a1628] leading-tight truncate">
                  {activeTab === 'Grades' ? 'Assessment' : activeTab === 'Leaderboard' ? 'Leadership Board' : activeTab}
                </h1>
                <p className="text-xs text-[#5a6578] font-body truncate">Welcome back, {profileData.name.split(' ')[0]}!</p>
              </div>
              {/* Inline gamification badges — always visible */}
              <div className="flex items-center gap-2 ml-2">
                <button
                  onClick={() => setActiveModal('rewards')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-b from-rose-50 to-rose-100/90 hover:from-rose-100 hover:to-rose-150 border border-rose-200/80 rounded-xl shadow-[0_2px_0_#fecdd3,0_4px_10px_rgba(244,63,94,0.08)] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer group focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:outline-none"
                  title="View Rewards & Progress"
                  aria-label="View Rewards and Level Progress"
                >
                  <Crown className="h-3.5 w-3.5 text-rose-500 drop-shadow-sm" aria-hidden="true" />
                  <span className="text-xs font-display font-black text-rose-700">Lv {userLevel}</span>
                </button>
                <button
                  onClick={() => setActiveModal('rewards')}
                  className="flex items-center gap-2.5 px-3 py-1.5 bg-gradient-to-b from-violet-50 to-violet-100/80 hover:from-violet-100 hover:to-violet-150 border border-violet-200/80 rounded-xl shadow-[0_2px_0_#ddd6fe,0_4px_10px_rgba(139,92,246,0.1)] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer w-[190px] xl:w-[220px] focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none"
                  title={`${progressXPInLevel}/${xpToNextLevel} XP to next level`}
                  aria-label={`View XP: ${currentXP} XP earned`}
                >
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Zap className="h-3.5 w-3.5 text-violet-500 drop-shadow-sm" aria-hidden="true" />
                    <span className="text-xs font-display font-black text-violet-700 whitespace-nowrap">{currentXP} XP</span>
                  </div>
                  <div className="h-2 flex-1 min-w-0 bg-violet-200/60 dark:bg-violet-950/60 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all" style={xpFillStyle} />
                  </div>
                </button>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-b from-amber-50 to-amber-100/80 border border-amber-200/80 rounded-xl shadow-[0_2px_0_#fde68a,0_4px_10px_rgba(245,158,11,0.08)]">
                  <Flame className="h-3.5 w-3.5 text-amber-600 drop-shadow-sm" aria-hidden="true" />
                  <span className="text-xs font-display font-black text-amber-800">Daily Rewards</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

              {/* Calculator toggle */}
              <button
                onClick={() => setActiveModal(prev => prev === 'calculator' ? null : 'calculator')}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl backdrop-blur-xl bg-white/70 dark:bg-slate-900/60 border border-white/80 dark:border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.9)] hover:bg-white/90 hover:shadow-[0_6px_20px_rgba(14,165,233,0.18)] hover:border-sky-200/80 text-slate-700 hover:text-sky-500 transition-all flex items-center justify-center group focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none cursor-pointer active:scale-95"
                title="Scientific Calculator (Alt+K)"
                aria-label="Scientific Calculator (Alt+K)"
              >
                <Calculator size={19} className="stroke-[2.2] group-hover:scale-110 transition-transform" />
              </button>
              <Suspense fallback={compactControlFallback}>
                <NotificationBell />
              </Suspense>
              
              <button 
                onClick={() => setActiveModal('profile')}
                className="flex items-center gap-2.5 h-10 sm:h-11 shrink-0 backdrop-blur-xl bg-white/70 dark:bg-slate-900/60 hover:bg-white/90 border border-white/80 dark:border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.9)] p-1.5 pr-3 rounded-2xl cursor-pointer transition-all group focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none active:scale-95"
                aria-label={`Profile: ${profileData.name}`}
              >
                <UserAvatar
                  src={profileData.photo}
                  name={profileData.name}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl"
                />
                <div className="hidden sm:block text-left min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#0a1628] leading-none group-hover:text-primary transition-colors font-body truncate">
                    {firstName}
                  </p>
                </div>
              </button>
            </div>
          </header>

          <OnlineOfflineBanner />

          {/* Main Content Area */}
          <main
            ref={scrollContainerRef}
            className={`flex-1 min-h-0 ${activeTab === 'AI Chat' || activeTab === 'Modules' || activeTab === 'Avatar Studio' ? 'overflow-hidden p-0' : 'pt-3.5 sm:pt-4 md:pt-2.5 lg:pt-0 overflow-y-auto pb-28 sm:pb-32 lg:pb-8'}`}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className={activeTab === 'AI Chat' || activeTab === 'Modules' || activeTab === 'Avatar Studio' ? 'h-full min-h-0' : ''}
              >
                {activeTab === 'Dashboard' ? (
                  <div className="px-5 sm:px-8 xl:px-12 py-3 sm:py-5 lg:py-7">
                    <div className="grid grid-cols-12 gap-4 sm:gap-6 lg:gap-10">
                      <div className="col-span-12 xl:col-span-9 flex flex-col gap-4 sm:gap-5 md:gap-6 lg:gap-8 pt-0">
                        {/* Mobile/Tablet Compact Top Bar: Level & XP on Left, Utility Controls on Right */}
                        <div className="lg:hidden flex items-center justify-between gap-2 mb-1 sm:mb-2">
                          {/* Upper Left: Level Badge & XP Counter (XP hidden on narrow mobile <= 350px, shown on 360px+ and tablet) */}
                          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                            <button
                              type="button"
                              onClick={() => setActiveModal('rewards')}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-b from-rose-50 to-rose-100/90 border border-rose-200/80 shadow-[0_2px_0_#fecdd3,0_3px_8px_rgba(244,63,94,0.08)] active:translate-y-[1px] active:shadow-none hover:bg-rose-50 transition-all shrink-0 cursor-pointer"
                              title="Level Progress"
                              aria-label={`Level ${userLevel}`}
                            >
                              <Crown className="w-3.5 h-3.5 text-rose-500 drop-shadow-sm" />
                              <span className="text-xs font-display font-black text-rose-700 dark:text-rose-400">Lv {userLevel}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setActiveModal('rewards')}
                              className="hidden min-[360px]:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-gradient-to-b from-violet-50 to-violet-100/90 border border-violet-200/80 shadow-[0_2px_0_#ddd6fe,0_3px_8px_rgba(139,92,246,0.1)] active:translate-y-[1px] active:shadow-none hover:bg-violet-50 transition-all shrink-0 cursor-pointer"
                              title={`${progressXPInLevel}/${xpToNextLevel} XP`}
                              aria-label={`XP: ${currentXP}`}
                            >
                              <Zap className="w-3.5 h-3.5 text-violet-500 shrink-0 drop-shadow-sm" />
                              <span className="text-xs font-display font-black text-violet-700 dark:text-violet-300 tabular-nums shrink-0">{currentXP} XP</span>
                              <div className="w-14 sm:w-20 h-2 bg-violet-200/60 dark:bg-violet-950/60 rounded-full overflow-hidden shadow-inner shrink-0">
                                <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all" style={xpFillStyle} />
                              </div>
                            </button>
                          </div>

                          {/* Upper Right: Calculator, Notification Bell (Mobile & Tablet), Profile Avatar (Tablet only - on mobile it is in bottom nav) */}
                          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => setActiveModal(prev => prev === 'calculator' ? null : 'calculator')}
                              className="w-9 h-9 rounded-2xl backdrop-blur-xl bg-white/70 dark:bg-slate-900/60 border border-white/80 dark:border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.9)] hover:bg-white/90 hover:shadow-[0_6px_20px_rgba(14,165,233,0.18)] hover:border-sky-200/80 text-slate-700 hover:text-sky-500 transition-all flex items-center justify-center cursor-pointer active:scale-95"
                              title="Scientific Calculator"
                              aria-label="Scientific Calculator"
                            >
                              <Calculator size={16} className="stroke-[2.2]" />
                            </button>

                            <Suspense fallback={compactControlFallback}>
                              <div className="scale-90 origin-center">
                                <NotificationBell />
                              </div>
                            </Suspense>

                            {/* Profile button on top right: hidden on mobile (< md) because it's on bottom right of the navbar; shown on tablet (md: to lg:) */}
                            <button
                              type="button"
                              onClick={() => setActiveModal('profile')}
                              className="hidden md:flex w-9 h-9 rounded-2xl overflow-hidden backdrop-blur-xl bg-white/70 dark:bg-slate-900/60 border border-white/80 dark:border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.9)] items-center justify-center hover:ring-2 hover:ring-purple-400 transition-all active:scale-95 cursor-pointer"
                              aria-label={`Profile: ${profileData.name}`}
                            >
                              <UserAvatar
                                src={profileData.photo}
                                name={profileData.name}
                                className="w-full h-full rounded-none"
                              />
                            </button>
                          </div>
                        </div>

                        <Suspense fallback={dashboardPanelFallback}>
                          <HeroBanner
                            userName={firstName}
                            userLevel={userLevel}
                            avatarLayers={profileData.avatarLayers}
                            onContinueLearning={() => handleStudentNavigation('Modules')}
                            showAssessmentTooltip={!hasCompletedDiagnostic && hasCompletedDiagnostic !== null}
                            onOpenAssessment={handleOpenInitialAssessment}
                            studentId={userProfile?.uid}
                            assessmentCompleted={hasCompletedDiagnostic === true}
                          />
                        </Suspense>

                        {/* Mobile Daily Goals / Assessment Slab (Complete Emerald Green System Card) */}
                        <div className="lg:hidden flex items-center justify-between gap-3.5 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 text-white shadow-[0_8px_20px_-4px_rgba(16,185,129,0.3)] border border-emerald-400/40 relative overflow-hidden">
                          {/* Target Emblem */}
                          <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md border border-white/40 shadow-inner flex items-center justify-center shrink-0">
                            <Target className="w-5 h-5 text-white stroke-[2.4] drop-shadow-sm" />
                          </div>

                          {/* Center Progress Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="text-xs sm:text-sm font-display font-black text-white leading-none drop-shadow-sm">
                                Daily Goals
                              </h3>
                              <span className="text-[10px] sm:text-[11px] font-bold text-white bg-black/20 backdrop-blur-md px-2.5 py-0.5 rounded-full tabular-nums border border-white/20">
                                2 / 5 Lessons
                              </span>
                            </div>
                            <p className="text-[10px] sm:text-xs text-white/90 mt-1.5 font-medium leading-snug">
                              {hasCompletedDiagnostic ? 'Maintain your daily practice pace' : 'Complete Initial Diagnostic Assessment'}
                            </p>
                            <div className="h-1.5 sm:h-2 w-full bg-black/20 rounded-full overflow-hidden mt-2 sm:mt-2.5 shadow-inner">
                              <div className="h-full bg-white rounded-full w-[40%] shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
                            </div>
                          </div>

                          {/* Action button */}
                          <button
                            type="button"
                            onClick={() => {
                              if (!hasCompletedDiagnostic && hasCompletedDiagnostic !== null) {
                                handleOpenInitialAssessment();
                              } else {
                                handleStudentNavigation('Modules');
                              }
                            }}
                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 font-bold border border-white shadow-md flex items-center justify-center transition-all shrink-0 active:translate-y-[1px] cursor-pointer"
                            aria-label="View Daily Goals"
                          >
                            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                          </button>
                        </div>

                        {/* Mobile Balanced 2-Column Twin Slabs (Cohesive System-Tinted Slabs) */}
                        <div className="lg:hidden grid grid-cols-2 gap-3.5 sm:gap-4">
                          {/* Coins / XP Slab — Amethyst Tinted Card with 3D royal keycap */}
                          <button
                            type="button"
                            onClick={() => setActiveModal('rewards')}
                            className="flex items-center gap-3 p-4 sm:p-4.5 rounded-2xl backdrop-blur-xl bg-gradient-to-br from-purple-50/85 via-indigo-50/45 to-white dark:from-purple-950/30 dark:via-slate-900/70 dark:to-slate-900/70 border border-purple-200/80 dark:border-purple-800/50 shadow-[0_4px_16px_rgba(124,58,237,0.05),inset_0_1px_1px_rgba(255,255,255,0.9)] text-left hover:border-purple-300 hover:shadow-md transition-all active:scale-[0.98] cursor-pointer group"
                          >
                            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-b from-violet-500 via-purple-600 to-indigo-700 border-t border-white/50 shadow-[0_2.5px_0_#5b21b6,0_5px_12px_rgba(139,92,246,0.25)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                              <Crown className="w-5 h-5 text-amber-300 fill-amber-300 stroke-amber-400 stroke-[1.8] drop-shadow-sm" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="block text-[10px] sm:text-[11px] font-bold text-purple-600/80 dark:text-purple-400 uppercase tracking-wider leading-none">
                                XP Coins
                              </span>
                              <span className="block text-lg sm:text-xl font-display font-black text-slate-900 dark:text-white tabular-nums leading-tight mt-1.5">
                                {currentXP}
                              </span>
                            </div>
                          </button>

                          {/* Streak Slab — Warm Apricot-Orange Tinted Card with pure white flame icon (no black outline) */}
                          <button
                            type="button"
                            onClick={() => setActiveModal('rewards')}
                            className="flex items-center gap-3 p-4 sm:p-4.5 rounded-2xl backdrop-blur-xl bg-gradient-to-br from-amber-50/80 via-orange-50/35 to-white dark:from-amber-950/25 dark:via-slate-900/70 dark:to-slate-900/70 border border-orange-200/70 dark:border-orange-800/40 shadow-sm hover:border-orange-300 hover:shadow-md transition-all active:scale-[0.98] cursor-pointer group"
                          >
                            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-b from-amber-400 to-orange-400 border-t border-white/50 shadow-[0_2.5px_0_rgba(234,88,12,0.4),0_4px_10px_rgba(251,146,60,0.22)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                              <Flame className="w-5 h-5 text-white fill-white drop-shadow-sm" strokeWidth={1.8} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="block text-[10px] sm:text-[11px] font-bold text-orange-600/80 dark:text-orange-400 uppercase tracking-wider leading-none">
                                Streak
                              </span>
                              <span className="block text-lg sm:text-xl font-display font-black text-slate-900 dark:text-white tabular-nums leading-tight mt-1.5">
                                7 Days
                              </span>
                            </div>
                          </button>
                        </div>

                        {dashboardShellDeferredReady && hasCompletedDiagnostic && normalizedAtRiskTopics.length > 0 && (
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
                                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-amber-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
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

                        {dashboardShellDeferredReady && (studentProfile?.flaggedTopics?.length || atRiskSubjects.length > 0) && (
                          <Suspense fallback={dashboardWidgetFallback}>
                            <SupplementalPillCarousel
                              flaggedTopics={studentProfile?.flaggedTopics || []}
                              atRiskSubjects={atRiskSubjects}
                              moduleStatusMap={moduleStatusMap}
                              studentId={userProfile?.uid}
                              onTopicClick={(moduleId) => {
                                handleStudentNavigation('Modules', moduleId);
                              }}
                              onNavigateToPrerequisite={(moduleId) => {
                                handleStudentNavigation('Modules', moduleId);
                              }}
                            />
                          </Suspense>
                        )}

                        {profileReady && dashboardShellDeferredReady && (
                          <Suspense fallback={dashboardWidgetFallback}>
                            <div className="mt-2 sm:mt-3.5 md:mt-5 pb-4">
                              <LearningPath
                                modules={curriculumRuntimeModules}
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
                              currentUserId={userProfile?.uid || ''}
                              onOpenRewards={() => setActiveModal('rewards')}
                              onOpenLeaderboard={() => setActiveTab('Leaderboard')}
                              onNavigateToModules={() => setActiveTab('Modules')}
                              onNavigateToQuizBattle={() => handleStudentNavigation('Quiz Battle')}
                              userLevel={userLevel}
                              userPhoto={profileData.photo}
                              currentXP={progressXPInLevel}
                              xpToNextLevel={xpToNextLevel}
                              overallXP={currentXP}
                              userName={firstName}
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
                      isInQuizMode={isInQuizMode}
                      setIsInQuizMode={setIsInQuizMode}
                      hasCompletedDiagnostic={hasCompletedDiagnostic ?? false}
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
                        setProfileOverrides((prev) => ({
                          ...prev,
                          avatarLayers: layers,
                        }));
                      }}
                      onNavigateToModules={() => handleStudentNavigation('Modules')}
                      unsavedChangesRef={avatarUnsavedRef}
                      pendingNavigation={pendingAvatarNav}
                      onConfirmLeave={() => { const nav = pendingAvatarNav; setPendingAvatarNav(null); if (nav) setTimeout(() => handleStudentNavigation(nav), 0); }}
                      onCancelNavigation={() => setPendingAvatarNav(null)}
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

          {/* Floating AI Tutor - persistent across tabs except dedicated AI Chat page and quiz mode */}
          {(activeTab !== 'AI Chat' && !isInQuizMode) && (
            <Suspense fallback={null}>
              <div className="hidden lg:block fixed bottom-8 right-8 z-30">
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
          {activeModal === 'rewards' && (
            <Suspense fallback={null}>
              <RewardsModal
                isOpen={activeModal === 'rewards'}
                onClose={() => setActiveModal(null)}
                userLevel={userLevel}
                currentXP={progressXPInLevel}
                xpToNextLevel={xpToNextLevel}
                totalXP={totalXP}
                userId={userProfile?.uid || ''}
              />
            </Suspense>
          )}

          {/* Profile Modal */}
          {activeModal === 'profile' && (
            <Suspense fallback={null}>
              <ProfileModal
                isOpen={activeModal === 'profile'}
                onClose={() => setActiveModal(null)}
                profileData={profileData}
                onSave={handleSaveProfile}
              />
            </Suspense>
          )}

          {/* Logout Confirmation Modal */}
          {activeModal === 'logout_confirm' && (
            <Suspense fallback={null}>
              <ConfirmModal
                isOpen={activeModal === 'logout_confirm'}
                onClose={() => setActiveModal(null)}
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
          {activeModal === 'settings' && (
            <Suspense fallback={null}>
              <SettingsModal
                isOpen={activeModal === 'settings'}
                onClose={() => setActiveModal(null)}
                profileData={profileData}
                onSave={handleSaveProfile}
                settingsData={userSettings}
                onSaveSettings={handleSaveSettings}
                onApplySettingsPreview={setUserSettings}
                onExportData={handleExportData}
                onClearCache={handleClearCache}
                onResetData={handleResetTestingData}
              />
            </Suspense>
          )}

          {/* Scientific Calculator */}
          {activeModal === 'calculator' && (
            <Suspense fallback={null}>
              <ScientificCalculator
                isOpen={activeModal === 'calculator'}
                onClose={() => setActiveModal(null)}
              />
            </Suspense>
          )}

          {/* Initial Assessment Modal */}
          {showDiagnosticModal && !showAssessmentPage && (
            <Suspense fallback={null}>
              <InitialAssessmentModal
                isOpen={showDiagnosticModal && !showAssessmentPage}
                onClose={() => setShowDiagnosticModal(false)}
                onDismiss={() => {
                  setShowDiagnosticModal(false);
                  setAssessmentDismissed(true);
                }}
                userId={userProfile?.uid || ''}
                strand={studentProfile?.major || 'STEM'}
                gradeLevel={studentProfile?.grade || 'Grade 11'}
                onAssessmentStart={handleDiagnosticStart}
                onAssessmentComplete={handleAssessmentComplete}
              />
            </Suspense>
          )}

          {/* Assessment Page (full-screen question-by-question) */}
          {showAssessmentPage && (
            <Suspense fallback={null}>
              <AssessmentPage
                testId={assessmentTestId}
                questions={assessmentQuestions}
                userName={firstName}
                onComplete={handleAssessmentComplete}
                onCancel={() => {
                  setShowAssessmentPage(false);
                  setActiveTab('Dashboard');
                }}
              />
            </Suspense>
          )}

          {/* Diagnostic Breakdown (full-screen after completion) */}
          {activeModal === 'diagnostic_breakdown' && userProfile?.uid && (
            <Suspense fallback={null}>
              <DiagnosticBreakdown
                userId={userProfile.uid}
                mode="fullscreen"
                onClose={() => {
                  setActiveModal(null);
                  setActiveTab('Dashboard');
                }}
              />
            </Suspense>
          )}

          {/* Mobile Bottom Navigation Bar (Hidden during full-screen assessment) */}
          {!showAssessmentPage && (
            <MobileBottomNav
              activeTab={activeTab}
              onSelectTab={handleStudentNavigation}
              onOpenProfile={() => setActiveModal('profile')}
              profilePhoto={profileData.photo}
              profileName={profileData.name}
            />
          )}
        </div>
      </div>
    </ChatProvider>
    <Toaster position="top-right" richColors closeButton />
    </>
    </NotificationProvider>
  );

    authenticatedContent = <ProgressGate>{studentDashboard}</ProgressGate>;
  }

  // Exactly one lifecycle manager wraps all role branches. Settings consumes
  // its controls through context, so role switching never duplicates hooks.
  return withPushManager(authenticatedContent);
};

export default App;
