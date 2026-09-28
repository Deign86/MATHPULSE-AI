# src/components/

## Responsibility
- Page-level React components and reusable feature components consumed by the app shell; domain-specific subtrees are documented in their own maps.
- Files: AddStudentsModal, AdminAnalytics, AdminAuditLog, AdminContent, AdminDashboard, AdminPriorityModules, AdminRagManager, AdminSettings, AdminUserManagement, AIChatPage, AppLoadingScreen, AtRiskStudyBrief, AvatarShop, BloomsTaxonomyModal, ChatMarkdown, ClassesOverviewMenu, CompetencyRadarChart, CompositeAvatar, ConfirmModal, CreateClassModal, CreateStudentAccountModal, CurriculumSourceBadge, DailyChallengeWidget, DailyCheckInModal, DashboardAvatar, ErrorBoundary, FloatingAITutor, GradesPage, HeroBanner, InstallPwaButton, InterventionStepGuide, LeaderboardPage, LessonViewer, LearningPath, LivePopup, LoginPage, LogoutActionButton, MasteryHeatmap, MathAnswerInput, MathText, MobileBottomNav, ModuleDetailView, ModuleFolderCard, ModuleStepGuide, ModulesMascot, ModulesPage, NotificationDropdown, OnlineOfflineBanner, PracticeCenter, ProfileModal, ProfilePage, ProfilePictureUploader, ProgressGate, PushNotificationsManager, QuestionBankPanel, QuizBattlePage, QuizExperience, QuizMaker, RecentActivityWidget, RequireRole, RewardsModal, RewardsPage, RightSidebar, ScientificCalculator, SettingsModal, SettingsPage, Sidebar, StudentCompetencyTable, StudentIDCard, StudentProfileModal, SupplementalBanner, SupplementalPillCarousel, TabErrorBoundary, TeacherCalendarView, TeacherDashboard, TeacherModuleStatusControl, TeacherNotificationsView, TeacherStatCard, TopicMasteryView, TryItYourselfEngine, UserAvatar, XPNotification; tests: ChatMarkdown, GradesPage, LoginPage, ModulesPage, PracticeCenter, RequireRole, ScientificCalculator, Sidebar, StudentIDCard.

## Design
- Components divide into routed/page surfaces, dashboard widgets, modal workflows, math-learning views, and role/navigation guards; state is local unless shared through contexts or service hooks.
- Representative props/state: `ConfirmModal` receives open/title/message and callbacks; `ClassesOverviewMenu` receives class data and selection callback; `AppLoadingScreen` accepts loading text; stateful pages own selected tabs, filters, modal visibility, or form inputs.

## Flow
- User navigates or acts on a page → page/component updates local state or calls its feature service/context → loading, content, empty, and error states render; modal callbacks return outcomes to their parent.

## Integration
- App/router pages compose these components; `AuthContext`, `NotificationContext`, and chat context supply shared identity/notifications/chat where applicable.
- Learning/admin/teacher components consume typed API services, Firebase-backed services, and curriculum/domain data; `RequireRole` gates pages by role; UI primitives come from `components/ui/`.
