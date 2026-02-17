import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Sidebar from './components/Sidebar';
import DynamicHeader from './components/DynamicHeader';
import ScrollIndicator from './components/ScrollIndicator';
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
import QuickStatsWidget from './components/QuickStatsWidget';
import LeaderboardPage from './components/LeaderboardPage';
import AddFriendsModal from './components/AddFriendsModal';
import DiagnosticAssessmentModal from './components/DiagnosticAssessmentModal';
import { ChatProvider } from './contexts/ChatContext';
import { useAuth } from './contexts/AuthContext';
import { signOutUser } from './services/authService';
import { updateStreak, awardXP } from './services/gamificationService';
import { StudentProfile } from './types/models';
import { triggerStudentEnrolled } from './services/automationService';

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
  const [showAddFriendsModal, setShowAddFriendsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Diagnostic State
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [hasTakenDiagnostic, setHasTakenDiagnostic] = useState(studentProfile?.hasTakenDiagnostic || false);
  const [atRiskSubjects, setAtRiskSubjects] = useState<string[]>(studentProfile?.atRiskSubjects || []);

  // Update local state when userProfile changes
  useEffect(() => {
    if (studentProfile && userRole === 'student') {
      setUserLevel(studentProfile.level || 1);
      setCurrentXP(studentProfile.currentXP || 0);
      setTotalXP(studentProfile.totalXP || 0);
      setStreak(studentProfile.streak || 0);
      setAtRiskSubjects(studentProfile.atRiskSubjects || []);
      setHasTakenDiagnostic(studentProfile.hasTakenDiagnostic || false);
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
      setActiveTab('Dashboard');
      setShowLogoutConfirm(false);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleSaveProfile = (data: { name?: string; email?: string; phone?: string; photo?: string }) => {
    // TODO: Save to Firebase (update user profile)
    setShowProfileModal(false);
  };

  // Get profile data from userProfile or use defaults
  const profileData = userProfile ? {
    name: userProfile.name,
    email: userProfile.email,
    phone: userProfile.phone || '',
    photo: userProfile.photo || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=200&h=200&fit=crop',
    role: userProfile.role,
    ...(userRole === 'student' && studentProfile ? {
      studentId: studentProfile.studentId,
      grade: studentProfile.grade,
      school: studentProfile.school,
      enrollmentDate: studentProfile.enrollmentDate,
      major: studentProfile.major,
      gpa: studentProfile.gpa,
    } : {}),
  } : {
    name: 'User',
    email: '',
    phone: '',
    photo: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=200&h=200&fit=crop',
    role: userRole,
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading MathPulse AI...</p>
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
      </>
    );
  }

  // Show Student Dashboard (existing code)
  return (
    <ChatProvider>
      <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
        {/* Sidebar */}
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          userRole={userRole}
          onOpenSettings={() => setShowSettingsModal(true)}
          onLogout={() => setShowLogoutConfirm(true)}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{activeTab}</h1>
              <p className="text-sm text-slate-500 mt-0.5">Welcome back, {profileData.name.split(' ')[0]}!</p>
            </div>
            <div className="flex items-center gap-3">
              <SearchBar
                onSelect={(result) => {
                  // TODO: Navigate to selected search result
                }}
              />
              <NotificationCenter userRole={userRole} />
              
              <button 
                onClick={() => setShowProfileModal(true)}
                className="flex items-center gap-3 bg-slate-100 hover:bg-slate-200 p-1.5 pr-4 rounded-xl cursor-pointer transition-all group"
              >
                <img 
                  src={profileData.photo}
                  alt={profileData.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
                <div className="text-left">
                  <p className="text-sm font-bold text-slate-800 leading-none group-hover:text-indigo-600 transition-colors">
                    {profileData.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 capitalize">{userRole}</p>
                </div>
              </button>
            </div>
          </header>

          {/* Main Grid */}
          <main ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-12 gap-6">
              {/* Left Column - Main Content */}
              <div className={
                activeTab === 'Dashboard' 
                  ? 'col-span-7 space-y-6' 
                  : 'col-span-12'
              }>
                {/* Page Content with Transitions */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    {activeTab === 'Dashboard' ? (
                      <div className="space-y-6 pb-6">
                        <HeroBanner 
                          userName={profileData.name.split(' ')[0]} 
                          userLevel={userLevel}
                          onContinueAlgebra={() => setActiveTab('Modules')} 
                        />
                        <LearningPath onNavigateToModules={() => setActiveTab('Modules')} atRiskSubjects={atRiskSubjects} />
                      </div>
                    ) : activeTab === 'Modules' ? (
                      <ModulesPage onEarnXP={handleEarnXP} atRiskSubjects={atRiskSubjects} />
                    ) : activeTab === 'Leaderboard' ? (
                      <LeaderboardPage />
                    ) : activeTab === 'AI Chat' ? (
                      <AIChatPage />
                    ) : activeTab === 'Grades' ? (
                      <GradesPage />
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-slate-400 font-medium">
                        {activeTab} Content Coming Soon
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Right Column - Sidebar (5 cols) - Only on Dashboard */}
              {activeTab === 'Dashboard' && (
                <div className="col-span-5">
                  <RightSidebar 
                    onOpenRewards={() => setShowRewardsModal(true)}
                    userLevel={userLevel}
                    currentXP={currentXP}
                    xpToNextLevel={xpToNextLevel}
                    streak={streak}
                  />
                </div>
              )}
            </div>
          </main>

          {/* Floating AI Tutor - FAB positioned at bottom-right with 32px padding */}
          {activeTab === 'Dashboard' && (
            <div className="fixed bottom-8 right-8 z-50">
              <FloatingAITutor constraintsRef={constraintsRef} onFullScreen={handleFullScreen} />
            </div>
          )}

          {/* Scroll Indicator */}
          {activeTab === 'Dashboard' && (
            <ScrollIndicator scrollContainerRef={scrollContainerRef} />
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
          />

          {/* Add Friends Modal */}
          <AddFriendsModal
            isOpen={showAddFriendsModal}
            onClose={() => setShowAddFriendsModal(false)}
          />

          {/* Diagnostic Assessment Modal */}
          <DiagnosticAssessmentModal
            isOpen={showDiagnosticModal}
            onClose={() => setShowDiagnosticModal(false)}
            onComplete={handleDiagnosticComplete}
            studentId={userProfile?.uid}
            gradeLevel={(studentProfile as StudentProfile)?.grade}
          />
        </div>
      </div>
    </ChatProvider>
  );
};

export default App;