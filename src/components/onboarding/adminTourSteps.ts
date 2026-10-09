import type { TourPage, TourStep } from './GuidedTour';

const at = (name: string) => `[data-tour="${name}"]`;
const nav = (tab: string) => `[data-tour-nav="${tab}"]`;
const profileMenu = '[data-tour-group="Profile"]';

// Tabs are AdminDashboard tab ids. The guide only shows screens: it never creates, edits, deletes,
// assigns, uploads, rebuilds, toggles availability or maintenance, exports, or changes the theme.

const overview: TourPage = {
  tab: 'Overview',
  label: 'Overview',
  overview: { tab: 'Overview', title: 'Overview', description: 'Platform health at a glance: staff and section counts, AI tutor use, students who need support, engagement, mastery and recent activity.', target: at('admin-kpis') },
  steps: [
    { tab: 'Overview', title: 'Quick shortcuts', description: 'Jump straight to adding a user, class sections, curriculum uploads or analytics.', target: at('admin-shortcuts') },
    { tab: 'Overview', title: 'Key numbers', description: 'Teaching staff, active sections, AI tutor sessions and students who need support.', target: at('admin-kpis') },
    { tab: 'Overview', title: 'Insights or curriculum', description: 'On smaller screens, switch between the engagement cards and the curriculum cards here.', target: at('admin-overview-switch'), optional: true },
    { tab: 'Overview', title: 'Engagement', description: 'AI tutoring sessions compared with self-study, for the last 7 days or by month.', target: at('admin-engagement'), view: 'insights' },
    { tab: 'Overview', title: 'Academic honor roll', description: 'The top students by mastery. View All opens the full analytics.', target: at('admin-honor-roll'), view: 'insights' },
    { tab: 'Overview', title: 'Academic priority', description: 'The subject with the most students at risk. When students need support, Review in Analytics opens the details.', target: at('admin-priority'), view: 'curriculum' },
    { tab: 'Overview', title: 'Global mastery', description: 'Average mastery across the platform, with passed and in-progress counts.', target: at('admin-mastery'), view: 'curriculum' },
    { tab: 'Overview', title: 'Subject mastery matrix', description: 'Enrollment and progress for each subject. Filter by STEM or Core, or export the table as CSV.', target: at('admin-subject-matrix'), view: 'curriculum' },
    { tab: 'Overview', title: 'Live campus stream', description: 'The latest audit and security events. The Audit Log link shows the full history.', target: at('admin-live-stream'), view: 'curriculum' },
    { tab: 'Overview', title: 'Quick counts', description: 'Students, teachers and AI sessions at a glance.', target: at('admin-quick-stats'), optional: true },
    { tab: 'Overview', title: 'Notifications', description: 'System and security alerts. A number means you have unread notifications.', target: at('notifications') },
    { tab: 'Overview', title: 'Profile and settings', description: 'Open your profile, settings, or sign out from this menu.', target: profileMenu },
    { tab: 'Overview', title: 'Guide for this page', description: 'Tap this button on any page to replay only that page\'s guide.', target: at('page-guide') },
  ],
};

const users: TourPage = {
  tab: 'User Management',
  label: 'User Management',
  overview: { tab: 'User Management', title: 'User Management', description: 'Create, edit, deactivate and delete student, teacher and admin accounts. On a phone, it is in the Manage menu.', target: nav('User Management'), menu: 'management' },
  steps: [
    { tab: 'User Management', title: 'Account counts', description: 'Totals by role and status. Tap a card to filter the list.', target: at('users-kpis') },
    { tab: 'User Management', title: 'Search, filter and add', description: 'Search by name, email or LRN; filter by role, status or section; refresh the list; Add User creates an account and sends a welcome email.', target: at('users-toolbar') },
    { tab: 'User Management', title: 'Users', description: 'Edit, deactivate or delete each account. Select several accounts to change roles or status, reset passwords, export or delete them together.', target: at('users-list') },
  ],
};

const classes: TourPage = {
  tab: 'Class Management',
  label: 'Class Management',
  overview: { tab: 'Class Management', title: 'Class Management', description: 'Every class section and its assigned teacher. On a phone, it is in the Manage menu.', target: nav('Class Management'), menu: 'management' },
  steps: [
    { tab: 'Class Management', title: 'Section totals', description: 'Total sections, sections with a teacher, and sections that still need one.', target: at('classes-stats') },
    { tab: 'Class Management', title: 'Sections and teachers', description: 'Search sections, then choose a teacher and Assign. Reassign and Unassign ask you to confirm first.', target: at('classes-sections') },
  ],
};

const curriculum: TourPage = {
  tab: 'Curriculum Control',
  label: 'Curriculum Control',
  overview: { tab: 'Curriculum Control', title: 'Curriculum Control', description: 'Turn math subjects on or off for students. On a phone, it is in the Curriculum menu.', target: nav('Curriculum Control'), menu: 'curriculum' },
  steps: [
    { tab: 'Curriculum Control', title: 'Subject totals', description: 'How many subjects exist and how many are available to students.', target: at('subjects-stats') },
    { tab: 'Curriculum Control', title: 'Filters', description: 'Search subjects and filter the list.', target: at('subjects-filters') },
    { tab: 'Curriculum Control', title: 'Subjects', description: 'Each switch turns a subject on or off for students. Changes take effect immediately.', target: at('subjects-list') },
    { tab: 'Curriculum Control', title: 'How it works', description: 'Opens a short explanation of how subject availability affects students.', target: '[aria-label="How it works"]' },
  ],
};

const content: TourPage = {
  tab: 'Content',
  label: 'Content',
  overview: { tab: 'Content', title: 'Content', description: 'Upload curriculum PDFs to the AI knowledge base and see every uploaded file. On a phone, it is in the Curriculum menu.', target: nav('Content'), menu: 'curriculum' },
  steps: [
    { tab: 'Content', title: 'Content totals', description: 'Uploaded files and their processing status.', target: at('content-stats'), view: 'upload' },
    { tab: 'Content', title: 'Upload or inventory', description: 'Upload adds a new PDF; Inventory lists every uploaded file.', target: at('content-tabs'), view: 'upload' },
    { tab: 'Content', title: 'Upload a PDF', description: 'Drop or choose a PDF, set its subject, title and quarter, then Deploy Knowledge Source to add it to the AI knowledge base.', target: at('content-upload'), view: 'upload' },
    { tab: 'Content', title: 'Uploaded files', description: 'Every uploaded file with its subject and status. Refresh updates the list; delete removes a file.', target: at('content-inventory'), view: 'inventory' },
  ],
};

const rag: TourPage = {
  tab: 'RAG Manager',
  label: 'RAG Manager',
  overview: { tab: 'RAG Manager', title: 'RAG Manager', description: 'The AI knowledge base behind lessons and tutoring, organised by subject and file. On a phone, it is in the AI menu.', target: nav('RAG Manager'), menu: 'ai' },
  steps: [
    { tab: 'RAG Manager', title: 'Knowledge base totals', description: 'Subjects, documents and chunks in the knowledge base.', target: at('rag-stats') },
    { tab: 'RAG Manager', title: 'Rebuild in progress', description: 'Shows progress while the knowledge base is being rebuilt.', target: at('rag-progress'), optional: true },
    { tab: 'RAG Manager', title: 'Search and actions', description: 'Search files, switch between split and list views, and refresh. Rebuild Knowledge re-ingests every PDF and Clear All empties the knowledge base; both ask you to confirm.', target: at('rag-toolbar') },
    { tab: 'RAG Manager', title: 'Subjects', description: 'Choose a subject to see its files.', target: at('rag-subjects') },
    { tab: 'RAG Manager', title: 'Subject details', description: 'The selected subject\'s files, with options to remove a file or the whole subject.', target: at('rag-detail') },
  ],
};

const analytics: TourPage = {
  tab: 'Analytics',
  label: 'Analytics',
  overview: { tab: 'Analytics', title: 'Analytics', description: 'Learning outcomes, curriculum progress and engagement across the platform. On a phone, it is in the Insights menu.', target: nav('Analytics'), menu: 'insights' },
  steps: [
    { tab: 'Analytics', title: 'Range, refresh and export', description: 'Choose 7, 30 or 90 days or all time, refresh the data, or export a CSV report.', target: at('analytics-toolbar') },
    { tab: 'Analytics', title: 'Key numbers', description: 'The headline figures for the selected range.', target: at('analytics-kpis') },
    { tab: 'Analytics', title: 'Outcomes, curriculum, engagement', description: 'Switch between learning outcomes, subject progress and student engagement.', target: at('analytics-tabs') },
    { tab: 'Analytics', title: 'Outcomes', description: 'Average scores over time and how students split across mastery levels.', target: at('analytics-outcomes') },
  ],
};

const auditLog: TourPage = {
  tab: 'Audit Log',
  label: 'Audit Log',
  overview: { tab: 'Audit Log', title: 'Audit Log', description: 'A record of sign-ins, account changes and other security events. On a phone, it is in the Insights menu.', target: nav('Audit Log'), menu: 'insights' },
  steps: [
    { tab: 'Audit Log', title: 'Sync and export', description: 'Sync loads the latest events; Export CSV downloads them.', target: at('audit-toolbar') },
    { tab: 'Audit Log', title: 'Event totals', description: 'Event counts by type and severity.', target: at('audit-kpis') },
    { tab: 'Audit Log', title: 'Search and filter', description: 'Search by user, action or details, and filter by category, severity or role.', target: at('audit-filters') },
    { tab: 'Audit Log', title: 'Events', description: 'Every recorded event. Inspect shows the full details.', target: at('audit-events') },
  ],
};

const profile: TourPage = {
  tab: 'Profile',
  label: 'Profile',
  overview: { tab: 'Profile', title: 'Profile', description: 'Your administrator ID card and account details. Open it from the profile menu at the top right.', target: profileMenu },
  steps: [
    { tab: 'Profile', title: 'Administrator ID card', description: 'Tap the card to flip it. The camera button changes your photo; save to keep it.', target: at('admin-id-card') },
    { tab: 'Profile', title: 'Your details', description: 'Edit your basic information and credentials, then Save Changes.', target: at('admin-profile-form') },
  ],
};

const settings: TourPage = {
  tab: 'Settings',
  label: 'Settings',
  overview: { tab: 'Settings', title: 'Settings', description: 'Appearance, notifications, password and platform maintenance. Open it from the profile menu at the top right.', target: profileMenu },
  steps: [
    { tab: 'Settings', title: 'Settings sections', description: 'Appearance, Notifications, Security and Data. Data includes maintenance mode, which locks the platform for everyone until you turn it off.', target: at('admin-settings-sections') },
    { tab: 'Settings', title: 'Options', description: 'Change the options in the open section. Theme changes preview immediately; Save keeps them.', target: at('admin-settings-panel') },
    { tab: 'Settings', title: 'Guides anytime', description: 'Replay the full admin tour, or choose one page\'s guide here.', target: at('settings-guide') },
  ],
};

// Same order as the sidebar groups (Management, AI & Intelligence, Curriculum, Insights & Security) and phone menus.
export const adminTourPages: readonly TourPage[] = [overview, users, classes, rag, curriculum, content, analytics, auditLog, profile, settings];

const welcome: TourStep = {
  tab: 'Overview',
  title: 'Welcome to MathPulse AI',
  description: 'This short tour shows what each admin page is for. Every page also has its own step-by-step guide, so you do not need to remember everything now.',
  target: at('admin-hero'),
};

const pageGuides: TourStep = {
  tab: 'Overview',
  title: 'Step-by-step help on every page',
  description: 'For detailed instructions, tap this button on any page to play that page\'s guide. Settings lists every page guide and lets you replay this tour.',
  target: at('page-guide'),
};

/** First-use guide: one general step per page; details live in each page's own guide. */
export const adminTourSteps: readonly TourStep[] = [welcome, ...adminTourPages.map(page => page.overview), pageGuides];

export function adminPageTour(tab: string): TourPage | undefined {
  return adminTourPages.find(page => page.tab === tab);
}
