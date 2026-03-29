import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Sidebar from './components/Sidebar';
import HeroBanner from './components/HeroBanner';
import LearningPath from './components/LearningPath';
import RightSidebar from './components/RightSidebar';
import ModulesPage from './components/ModulesPage';
import AvatarShop from './components/AvatarShop';
import CompositeAvatar from './components/CompositeAvatar';
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
import ScientificCalculator from './components/ScientificCalculator';
import SupplementalBanner from './components/SupplementalBanner';
import { ChatProvider } from './contexts/ChatContext';
import { useAuth } from './contexts/AuthContext';
import { signOutUser, updateUserProfile } from './services/authService';
import { updateStreak, awardXP } from './services/gamificationService';
import { getUserProgress } from './services/progressService';
import { AdminProfile, StudentProfile, TeacherProfile, User } from './types/models';
import { triggerStudentEnrolled } from './services/automationService';
import { Toaster, toast } from 'sonner';
import { Crown, Flame, Zap } from 'lucide-react';

type ProfileSaveData = Partial<User> &
  Partial<Omit<StudentProfile, keyof User | 'role'>> &
  Partial<Omit<TeacherProfile, keyof User | 'role'>> &
  Partial<Omit<AdminProfile, keyof User | 'role'>>;

const App = () => {
  // Get authentication state from context
  const { isLoggedIn, userProfile, userRole, loading } = useAuth();

  const [activeTab, setActiveTab] = useState('Dashboard');
  const constraintsRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Sidebar State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Gamification State (derived from Firebase user profile)
  const studentProfile = userProfile as StudentProfile;
  const [userLevel, setUserLevel] = useState(studentProfile?.level || 1);
  const [currentXP, setCurrentXP] = useState(studentProfile?.currentXP || 0);
  const [totalXP, setTotalXP] = useState(studentProfile?.totalXP || 0);
  const xpToNextLevel = Math.floor(100 * Math.pow(1.5, userLevel - 1));
  const [streak, setStreak] = useState(studentProfile?.streak || 0);
  const [showRewardsModal, setShowRewardsModal] = useState(false);
  const [xpNotification, setXpNotification] = useState({ show: false, xp: 0, message: '' });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [profileOverrides, setProfileOverrides] = useState<ProfileSaveData>({});

  // Diagnostic State
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [hasTakenDiagnostic, setHasTakenDiagnostic] = useState(studentProfile?.hasTakenDiagnostic || false);
  const [atRiskSubjects, setAtRiskSubjects] = useState<string[]>(studentProfile?.atRiskSubjects || []);
  const [computedGpa, setComputedGpa] = useState<string>(studentProfile?.gpa || '0.00');

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
      setProfileReady(true);
    } else if (userRole !== 'student') {
      setProfileReady(true);
    }
  }, [userProfile, userRole]);

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

  // Trigger diagnostic on first student login
  useEffect(() => {
    if (isLoggedIn && userRole === 'student' && !hasTakenDiagnostic) {
      // Small delay for better UX
      const timer = setTimeout(() => {
        setShowDiagnosticModal(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoggedIn, userRole, hasTakenDiagnostic]);

  const handleDiagnosticComplete = (riskSubjects: string[]) => {
    setAtRiskSubjects(riskSubjects);
    setHasTakenDiagnostic(true);
    setShowDiagnosticModal(false);
    // Navigate to Dashboard after completing diagnostic
    setActiveTab('Dashboard');
  };

  const handleFullScreen = () => {
    setActiveTab('AI Chat');
  };

  const handleEarnXP = async (xp: number, message: string) => {
    if (!userProfile) return;
    
    try {
      const result = await awardXP(userProfile.uid, xp, 'manual', message);
      
      // Update local state
      setCurrentXP(prev => {
        const newXP = prev + xp;
        if (result.leveledUp) {
          setUserLevel(result.newLevel);
          return newXP % xpToNextLevel;
        }
        return newXP;
      });
      setTotalXP(prev => prev + xp);
      
      // Show notification
      setXpNotification({ show: true, xp, message });
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
    role: userRole,
  };

  const firstName = profileData.name
    .trim()
    .split(/\s+/)
    .find((part) => /\p{L}/u.test(part)) || profileData.name.trim() || 'User';

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f9fc]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-[#5a6578] font-body">Loading MathPulse AI...</p>
        </div>
      </div>
    );
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if not typing in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.altKey) {
        switch(e.key.toLowerCase()) {
          case 'd':
            e.preventDefault();
            setActiveTab('Dashboard');
            break;
          case 'm':
            e.preventDefault();
            setActiveTab('Modules');
            break;
          case 'c':
            e.preventDefault();
            setActiveTab('AI Chat');
            break;
          case 'g':
            e.preventDefault();
            setActiveTab('Grades');
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
  }, [isLoggedIn, userRole]);

  // Show login page if not logged in
  if (!isLoggedIn) {
    return <LoginPage />;
  }

  // Show Teacher Dashboard
  if (userRole === 'teacher') {
    return (
      <>
        <TeacherDashboard 
          onLogout={handleLogout}
          onOpenProfile={() => setShowProfileModal(true)}
        />
        <ProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          profileData={profileData}
          onSave={handleSaveProfile}
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
        />
        <ProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          profileData={profileData}
          onSave={handleSaveProfile}
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
        {/* Sidebar */}
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          userRole={userRole}
          onOpenSettings={() => setShowSettingsModal(true)}
          onLogout={() => setShowLogoutConfirm(true)}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-gradient-to-br from-indigo-200 via-fuchsia-50 to-orange-100 relative z-10 shadow-[rgba(124,58,237,0.05)_0px_0px_30px_inset]">
          <div className="absolute inset-0 bg-math-pattern opacity-30 pointer-events-none mix-blend-multiply z-0" />
          
          {/* Header — compact with inline gamification stats */}
          <header className="bg-white/90 backdrop-blur-md border-b border-[#dde3eb] px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-xl font-display font-bold text-[#0a1628] leading-tight">{activeTab}</h1>
                <p className="text-xs text-[#5a6578] font-body">Welcome back, {profileData.name.split(' ')[0]}!</p>
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
                  title={`${currentXP}/${xpToNextLevel} XP to next level`}
                >
                  <Zap className="h-3.5 w-3.5 text-violet-500" aria-hidden="true" />
                  <span className="text-xs font-display font-bold text-violet-700">{currentXP} XP</span>
                  <div className="w-12 h-1.5 bg-violet-100 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${(currentXP / xpToNextLevel) * 100}%` }} />
                  </div>
                </button>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200/60 rounded-lg">
                  <Flame className="h-3.5 w-3.5 text-orange-500" aria-hidden="true" />
                  <span className="text-xs font-display font-bold text-orange-700">{streak} day{streak !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <SearchBar
                onSelect={(result) => {
                  // TODO: Navigate to selected search result
                }}
              />
              {/* Calculator toggle */}
              <button
                onClick={() => setShowCalculator(prev => !prev)}
                className="p-2 rounded-lg bg-[#edf1f7] hover:bg-[#dde3eb] text-[#5a6578] hover:text-primary transition-all group"
                title="Scientific Calculator (Alt+K)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform"><rect x="4" y="2" width="16" height="20" rx="2" /><line x1="8" x2="16" y1="6" y2="6" /><line x1="16" x2="16" y1="14" y2="18" /><path d="M16 10h.01" /><path d="M12 10h.01" /><path d="M8 10h.01" /><path d="M12 14h.01" /><path d="M8 14h.01" /><path d="M12 18h.01" /><path d="M8 18h.01" /></svg>
              </button>
              <NotificationCenter userRole={userRole} />
              
              <button 
                onClick={() => setShowProfileModal(true)}
                className="flex items-center gap-2.5 w-[152px] h-11 shrink-0 bg-[#edf1f7] hover:bg-[#dde3eb] p-1.5 pr-3 rounded-lg cursor-pointer transition-all group"
                aria-label={`Profile: ${profileData.name}`}
              >
                <CompositeAvatar layers={profileData.avatarLayers} className="w-8 h-8 rounded-lg bg-[#0B1021] shrink-0" fallbackSrc={profileData.photo} />
                <div className="text-left min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#0a1628] leading-none group-hover:text-primary transition-colors font-body truncate">
                    {firstName}
                  </p>
                </div>
              </button>
            </div>
          </header>

          {/* Main Content Area */}
          <main ref={scrollContainerRef} className="flex-1 overflow-y-auto p-3 lg:p-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                {activeTab === 'Dashboard' ? (
                  <div className="pb-8">
                    <div className="grid grid-cols-12 gap-8 lg:gap-10">
                      <div className="col-span-12 xl:col-span-9 flex flex-col gap-10 lg:gap-14 pt-2">
                        <HeroBanner 
                          userName={firstName} 
                          userLevel={userLevel}
                            avatarLayers={profileData.avatarLayers}
                          onContinueLearning={() => setActiveTab('Modules')} 
                        />

                        <SupplementalBanner
                          variant="full"
                          atRiskSubjects={atRiskSubjects}
                          onAction={() => setActiveTab('Modules')}
                        />

                        {profileReady && (
                          <div className="pb-4">
                            <LearningPath onNavigateToModules={() => setActiveTab('Modules')} atRiskSubjects={atRiskSubjects} />
                          </div>
                        )}
                      </div>

                      <div className="col-span-12 xl:col-span-3 pt-2">
                        <RightSidebar 
                          onOpenRewards={() => setShowRewardsModal(true)}
                          onOpenLeaderboard={() => setActiveTab('Leaderboard')}
                          userLevel={userLevel}
                            avatarLayers={profileData.avatarLayers}
                          currentXP={currentXP}
                          xpToNextLevel={xpToNextLevel}
                          streak={streak}
                          streakHistory={studentProfile?.streakHistory || []}
                        />
                      </div>
                    </div>
                  </div>
                ) : activeTab === 'Modules' ? (
                  <ModulesPage onEarnXP={handleEarnXP} atRiskSubjects={atRiskSubjects} />
                ) : activeTab === 'Leaderboard' ? (
                  <LeaderboardPage />
                ) : activeTab === 'Avatar Studio' ? (
                  <AvatarShop onSaveProfile={(layers) => setProfileOverrides(prev => ({ ...prev, avatarLayers: layers }))} />
                ) : activeTab === 'AI Chat' ? (
                  <AIChatPage />
                ) : activeTab === 'Grades' ? (
                  <GradesPage />
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
            <div className="fixed bottom-8 right-8 z-50">
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
                            avatarLayers={profileData.avatarLayers}
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
          />
        </div>
      </div>
    </ChatProvider>
    <Toaster position="top-right" richColors closeButton />
    </>
  );
};

export default App;




