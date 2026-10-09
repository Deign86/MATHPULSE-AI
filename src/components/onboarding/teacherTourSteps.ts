import type { TourPage, TourStep } from './GuidedTour';

const at = (name: string) => `[data-tour="${name}"]`;
const nav = (view: string) => `[data-tour-nav="${view}"]`;
const profileMenu = '[data-tour-group="Profile"]';

// Tabs are TeacherDashboard view ids. The guide only shows screens; it never presses a button that
// saves, sends, generates, uploads or assigns. The Intervention Center is described, not opened,
// because opening it starts AI requests for the selected student.

const dashboard: TourPage = {
  tab: 'dashboard',
  label: 'Dashboard',
  overview: { tab: 'dashboard', title: 'Dashboard', description: 'Your daily overview: class totals, average scores, engagement, students who need attention, and quick access to every class.', target: at('teacher-stats') },
  steps: [
    { tab: 'dashboard', title: 'Class snapshot', description: 'Total students, class average, engagement and the number of students who need attention. Tap a card to open the matching class analytics.', target: at('teacher-stats') },
    { tab: 'dashboard', title: 'AI insight', description: 'When the AI spots students at risk, a summary appears here. Review opens class analytics; Dismiss hides it for today.', target: at('teacher-insight'), optional: true },
    { tab: 'dashboard', title: 'My Classes', description: 'Every class you manage, with its risk level. Tap a class to open its analytics, or View all for the full list. Create a class here if you have none yet.', target: at('teacher-classes') },
    { tab: 'dashboard', title: 'Quick counts', description: 'Shortcuts to the competency matrix, at-risk students and class analytics.', target: at('teacher-quick-stats'), optional: true },
    { tab: 'dashboard', title: 'AI insight anytime', description: 'Opens the latest AI summary of your classes, even after you dismiss the banner.', target: '[aria-label="View AI Insight"]' },
    { tab: 'dashboard', title: 'Schedule and activity', description: 'Opens a side panel with your mini calendar, live student activity and reminders.', target: at('teacher-schedule-toggle') },
    { tab: 'dashboard', title: 'Notifications', description: 'Student and system alerts. A number means you have unread notifications.', target: at('notifications') },
    { tab: 'dashboard', title: 'Profile and settings', description: 'Open your profile, settings, or sign out from this menu.', target: profileMenu },
    { tab: 'dashboard', title: 'Guide for this page', description: 'Tap this button on any page to replay only that page\'s guide.', target: at('page-guide') },
  ],
};

const classes: TourPage = {
  tab: 'analytics',
  label: 'My Classes',
  overview: { tab: 'analytics', title: 'My Classes', description: 'Class analytics: scores, completion, risk levels, topic performance and every student in the class. Tap a student to open their Intervention Center. On a phone, My Classes is in the Teaching menu.', target: nav('analytics'), menu: 'teaching' },
  steps: [
    { tab: 'analytics', title: 'Choose a class', description: 'Switch between your classes here. New Class creates another one.', target: `${at('class-switcher')}, ${at('class-empty')}` },
    { tab: 'analytics', title: 'Class details', description: 'The class name, grade, section and adviser.', target: at('class-header'), optional: true },
    { tab: 'analytics', title: 'Class numbers', description: 'Class average, completion, participation and how many students need attention.', target: at('class-kpis'), optional: true },
    { tab: 'analytics', title: 'Students', description: 'Search and filter the class list. Tap a student to open their Intervention Center with an AI diagnosis, learning path and lesson plan. + Add adds students to the class.', target: at('class-students'), optional: true },
    { tab: 'analytics', title: 'Risk distribution', description: 'How many students fall into each risk level.', target: at('class-risk-chart'), optional: true },
    { tab: 'analytics', title: 'Topic performance', description: 'Average accuracy for each topic, so you can see which topics need reteaching.', target: at('class-topic-chart'), optional: true },
    { tab: 'analytics', title: 'Top performers and needs attention', description: 'Your strongest students and those who need support. Tap a name to open their Intervention Center.', target: at('class-highlights'), optional: true },
    { tab: 'analytics', title: 'AI class insights', description: 'An AI summary of the class with suggested next steps. You can refresh it every few minutes.', target: at('class-ai-insights'), optional: true },
    { tab: 'analytics', title: 'Section management', description: 'Expand to move students between sections of this class.', target: at('class-sections'), optional: true },
  ],
};

const calendar: TourPage = {
  tab: 'calendar',
  label: 'Schedule & Calendar',
  overview: { tab: 'calendar', title: 'Schedule & Calendar', description: 'Your month at a glance: classes, deadlines and events. Add events for your classes here. On a phone, it is in the Teaching menu.', target: nav('calendar'), menu: 'teaching' },
  steps: [
    { tab: 'calendar', title: 'Month and navigation', description: 'Move between months with the arrows. The count shows how many events this month has.', target: at('calendar-month') },
    { tab: 'calendar', title: 'Month grid', description: 'Tap a day to see its agenda. On larger screens, tap an event to view it.', target: at('calendar-grid') },
    { tab: 'calendar', title: 'Day agenda', description: 'Events for the selected day. Add Event creates a class schedule, deadline or reminder.', target: at('calendar-agenda'), optional: true },
  ],
};

const topicMastery: TourPage = {
  tab: 'topic_mastery',
  label: 'Topic Mastery',
  overview: { tab: 'topic_mastery', title: 'Topic Mastery', description: 'How well students have mastered each math topic, and which modules are available to them. On a phone, it is in the Insights menu.', target: nav('topic_mastery'), menu: 'insights' },
  steps: [
    { tab: 'topic_mastery', title: 'Mastery or module availability', description: 'Mastery Matrix shows topic results. Module Availability controls which modules students can open.', target: at('mastery-tabs'), view: 'mastery' },
    { tab: 'topic_mastery', title: 'Filters', description: 'Filter by class section, subject and grade, or search for a topic.', target: at('mastery-filters'), view: 'mastery' },
    { tab: 'topic_mastery', title: 'Topic totals', description: 'Total topics, mastered topics, topics that need work, and excluded topics.', target: at('mastery-kpis'), view: 'mastery' },
    { tab: 'topic_mastery', title: 'Topics', description: 'Each topic\'s mastery level. Exclude removes a topic from AI-generated quizzes; select several topics to exclude or include them together.', target: at('mastery-topics'), view: 'mastery' },
  ],
};

const competency: TourPage = {
  tab: 'competency',
  label: 'Competency Matrix',
  overview: { tab: 'competency', title: 'Competency Matrix', description: 'Every student\'s competency level across topics, with risk filters. On a phone, it is in the Insights menu.', target: nav('competency'), menu: 'insights' },
  steps: [
    { tab: 'competency', title: 'Search and filter', description: 'Search for a student, filter by risk level, or refresh the data.', target: at('competency-filters') },
    { tab: 'competency', title: 'Competency totals', description: 'Total students, how many need attention, class average and engagement.', target: at('competency-kpis') },
    { tab: 'competency', title: 'Curriculum topics', description: 'The topics imported for this class.', target: at('competency-topics'), optional: true },
    { tab: 'competency', title: 'Competency table', description: 'Each row is a student and each column a competency. Tap View to expand a student\'s details. On a phone, swipe sideways to see more columns.', target: at('competency-table') },
  ],
};

const quizMaker: TourPage = {
  tab: 'quiz_maker',
  label: 'AI Quiz Maker',
  overview: { tab: 'quiz_maker', title: 'AI Quiz Maker', description: 'Create curriculum-aligned quizzes with AI, then save, publish or assign them. On a phone, it is in the AI Tools menu.', target: nav('quiz_maker'), menu: 'tools' },
  steps: [
    { tab: 'quiz_maker', title: 'Create or browse', description: 'Create builds a new quiz. Quiz Bank lists quizzes you have saved, published or assigned.', target: at('quiz-tabs') },
    { tab: 'quiz_maker', title: 'Four steps', description: 'Setup, Topics, Question Style, then Preview. Move through them with Next; nothing is generated until you press Generate Quiz on the last step.', target: at('quiz-stepper'), optional: true },
    { tab: 'quiz_maker', title: 'Quiz guidelines', description: 'Tips for writing good AI quizzes. Expand to read them.', target: at('quiz-guidelines'), optional: true },
    { tab: 'quiz_maker', title: 'Basic settings', description: 'Name the quiz, choose the grade and set the number of questions.', target: at('quiz-setup'), optional: true },
  ],
};

const questionBank: TourPage = {
  tab: 'question_bank',
  label: 'Question Bank',
  overview: { tab: 'question_bank', title: 'Question Bank', description: 'Turn curriculum PDFs into quiz questions and browse the questions they produced. On a phone, it is in the AI Tools menu.', target: nav('question_bank'), menu: 'tools' },
  steps: [
    { tab: 'question_bank', title: 'Bank totals', description: 'PDFs uploaded, questions extracted and PDFs processed.', target: at('qbank-stats') },
    { tab: 'question_bank', title: 'Process a PDF', description: 'Enter the PDF\'s storage path, grade and topic, then Ingest PDF to extract questions. Grade and topic also filter the question list.', target: at('qbank-ingest') },
    { tab: 'question_bank', title: 'Processing status', description: 'Progress of each PDF being processed. Refresh to update.', target: at('qbank-status') },
    { tab: 'question_bank', title: 'Questions', description: 'The questions extracted for the selected grade and topic.', target: at('qbank-questions') },
  ],
};

const dataImport: TourPage = {
  tab: 'import',
  label: 'Data Import',
  overview: { tab: 'import', title: 'Data Import', description: 'Upload class spreadsheets, curriculum documents and student account rosters, and fix imported class records. On a phone, it is in the AI Tools menu.', target: nav('import'), menu: 'tools' },
  steps: [
    { tab: 'import', title: 'Target class', description: 'Choose the class your upload belongs to.', target: at('import-class') },
    { tab: 'import', title: 'Upload files', description: 'Upload a class spreadsheet (grades and records) or curriculum documents. You confirm every upload before it is processed.', target: at('import-uploads') },
    { tab: 'import', title: 'Student accounts', description: 'Preview a roster file to create student accounts, then confirm the import.', target: at('import-roster') },
    { tab: 'import', title: 'Module availability', description: 'Jump to Topic Mastery to choose which modules students can open.', target: at('import-availability'), optional: true },
    { tab: 'import', title: 'Data health', description: 'Edit Class Records fixes imported scores; View Mapping Logs shows how columns were matched.', target: at('import-health') },
    { tab: 'import', title: 'Recent uploads', description: 'Your latest uploads and their processing status.', target: at('import-recent') },
  ],
};

const notifications: TourPage = {
  tab: 'notifications',
  label: 'Notifications',
  overview: { tab: 'notifications', title: 'Notifications', description: 'Student and system alerts, grouped by day. Open them from the bell at the top of the page.', target: at('notifications') },
  steps: [
    { tab: 'notifications', title: 'Filters', description: 'Show all, unread or important notifications. Mark all as read clears the unread count.', target: at('notif-filters') },
    { tab: 'notifications', title: 'Your notifications', description: 'Grouped by Today, Yesterday and Earlier. Opening an unread notification marks it read.', target: at('notif-list') },
  ],
};

const profile: TourPage = {
  tab: 'profile',
  label: 'Profile',
  overview: { tab: 'profile', title: 'Profile', description: 'Your faculty ID card and teacher details. Open it any time from the profile menu at the top right of the other pages.', target: at('teacher-id-card') },
  steps: [
    { tab: 'profile', title: 'Faculty ID card', description: 'Tap the card to flip it. The camera button changes your photo; save to keep it.', target: at('teacher-id-card') },
    { tab: 'profile', title: 'Edit your details', description: 'Tap Edit Profile to change your details, then Save. Save before leaving the page.', target: at('teacher-profile-actions') },
    { tab: 'profile', title: 'Teacher information', description: 'Your basic information and teaching credentials.', target: at('teacher-profile-info') },
    { tab: 'profile', title: 'Account settings', description: 'A shortcut to Settings for your password and preferences.', target: at('teacher-profile-help'), optional: true },
  ],
};

const settings: TourPage = {
  tab: 'settings',
  label: 'Settings',
  overview: { tab: 'settings', title: 'Settings', description: 'Theme, notifications, password and data options, plus every page guide. Open it from the profile menu at the top right of the other pages.', target: at('settings-guide') },
  steps: [
    { tab: 'settings', title: 'Settings sections', description: 'Appearance, Notifications, Security and Data. Choose one to see its options.', target: at('teacher-settings-sections') },
    { tab: 'settings', title: 'Options', description: 'Change the options in the open section. Theme changes preview immediately.', target: at('teacher-settings-panel') },
    { tab: 'settings', title: 'Save your changes', description: 'Save Settings keeps your changes; Discard undoes them.', target: at('teacher-settings-save'), optional: true },
    { tab: 'settings', title: 'Guides anytime', description: 'Replay the full teacher tour, or choose one page\'s guide here.', target: at('settings-guide') },
  ],
};

export const teacherTourPages: readonly TourPage[] = [dashboard, classes, calendar, topicMastery, competency, quizMaker, questionBank, dataImport, notifications, profile, settings];

const welcome: TourStep = {
  tab: 'dashboard',
  title: 'Welcome to MathPulse AI',
  description: 'This short tour shows what each teacher page is for. Every page also has its own step-by-step guide, so you do not need to remember everything now.',
  target: at('teacher-stats'),
};

const pageGuides: TourStep = {
  tab: 'dashboard',
  title: 'Step-by-step help on every page',
  description: 'For detailed instructions, tap this button on any page to play that page\'s guide. Settings lists every page guide and lets you replay this tour.',
  target: at('page-guide'),
};

/** First-use guide: one general step per page (the dashboard overview doubles as the welcome). */
export const teacherTourSteps: readonly TourStep[] = [welcome, ...teacherTourPages.slice(1).map(page => page.overview), pageGuides];

export function teacherPageTour(tab: string): TourPage | undefined {
  return teacherTourPages.find(page => page.tab === tab);
}
