// Screen list for the user manual. Each shot: steps to reach the screen, then
// highlight targets whose on-screen rectangles feed the zoom callouts in manual.html.
// Target spec: { label } aria-label, { text } visible text (string or list), { css } selector,
// min [w, h] smallest acceptable box, pick 'first' | 'last' by vertical position.
// Shots marked `once: true` (they create data, e.g. an AI chat) only run when named explicitly.
const NAV = 'button,a,[role=menuitem]';
const open = (menuLabel, item, exact = true) => [
  { click: { label: menuLabel } },
  { click: { css: NAV, text: item, exact, pick: 'first' }, wait: 3500 },
];
const home = { goto: '/', wait: 7000 };
const STUDENT_MENU = {
  modules: 'Module Options: Modules and Assessment',
  ai: 'AI Options: AI Chat and Avatar Studio',
  battle: 'Battle Options: Quiz Battle and Leaderboard',
  profile: 'Profile options for John Dela Cruz',
};
const TEACHER_MENU = {
  teaching: 'Teaching Options: My Classes and Calendar',
  ai: 'AI Tools: Quiz Maker, Question Bank, Data Import',
  insights: 'Insights Options: Topic Mastery and Module Availability',
};

export const SHOTS = {
  public: [
    {
      name: 'p-login',
      steps: [{ goto: '/', wait: 5000 }],
      highlights: {
        form: { css: 'form', min: [250, 150] },
        google: { css: 'button', text: 'Continue with Google' },
        forgot: { css: 'button', text: 'Forgot password?', exact: true },
      },
    },
    {
      name: 'p-forgot',
      steps: [{ click: { css: 'button', text: 'Forgot password?', exact: true } }],
      highlights: { form: { text: ['Email Address', 'Send reset link'], min: [250, 90] } },
    },
    {
      name: 'p-signup',
      steps: [{ goto: '/', wait: 5000 }, { click: { text: 'Create one', exact: true } }],
      highlights: {
        role: { text: ['Account Type', 'Student', 'Teacher'], min: [250, 50] },
        section: { text: ['Grade Level', 'Section'], min: [250, 50] },
      },
    },
  ],
  studentIos: [
    {
      name: 's-install-ios',
      steps: [{ click: { label: 'Install MathPulse AI' } }],
      highlights: {
        help: { text: ['Install on iPhone', 'Add to Home Screen'], min: [250, 80] },
        button: { label: 'Install MathPulse AI' },
      },
    },
  ],
  student: [
    {
      name: 's-dashboard',
      steps: [],
      highlights: {
        stats: { text: ['Lv 5', 'XP'], min: [150, 30] },
        goals: { text: ['Daily Goals', 'Lesson Progress'], min: [300, 100] },
        streak: { text: ['Streak', 'Day'], min: [150, 60] },
        cta: { css: 'button', text: 'Continue Learning' },
      },
    },
    {
      name: 's-menu-modules',
      steps: [{ click: { label: STUDENT_MENU.modules }, wait: 3000 }],
      highlights: {
        menu: { text: ['Modules', 'Assessment'], min: [150, 80] },
        nav: { css: 'nav', min: [350, 50], pick: 'last' },
      },
      after: [{ click: { label: 'Close menu' } }],
    },
    {
      name: 's-modules',
      steps: open(STUDENT_MENU.modules, 'Modules'),
      highlights: {
        search: { text: ['All Quarters', 'Filters'], min: [300, 30] },
        input: { css: 'input[placeholder^="Search modules"]' },
        card: { text: ['Business and Finance', 'Progress'], min: [300, 120] },
      },
    },
    {
      name: 's-module-detail',
      steps: [...open(STUDENT_MENU.modules, 'Modules'), { click: { text: 'Business and Finance', exact: true, pick: 'first' }, wait: 5000 }],
      highlights: {
        mastery: { text: ['Module Mastery', '%'], min: [300, 40] },
        lesson: { text: ['Lesson 1', 'Study Materials', 'Quiz'], min: [300, 150] },
      },
    },
    {
      name: 's-grades',
      steps: [home, ...open(STUDENT_MENU.modules, 'Assessment')],
      highlights: {
        stats: { text: ['Average', 'Focus', 'Quizzes'], min: [300, 120] },
        diagnostic: { text: ['Initial Diagnostic Results', 'View Full Analysis'], min: [300, 100] },
        export: { css: 'button', text: 'Export Report' },
      },
    },
    {
      name: 's-ai-chat',
      steps: open(STUDENT_MENU.ai, 'AI Chat'),
      highlights: {
        header: { text: ['L.O.L.I.', 'New'], min: [300, 60] },
        newChat: { label: 'New chat' },
      },
    },
    {
      name: 's-chat-convo',
      once: true,
      steps: [
        ...open(STUDENT_MENU.ai, 'AI Chat'),
        { click: { label: 'New chat' }, wait: 3000 },
        { type: ['textarea[placeholder="Ask me anything about math..."], input[placeholder="Ask me anything about math..."]', 'How do I find the vertex of y = x^2 - 4x + 3?'] },
        { click: { label: 'Send message' }, wait: 45000 },
      ],
    },
    {
      name: 's-avatar',
      steps: open(STUDENT_MENU.ai, 'Avatar Studio'),
      highlights: {
        items: { text: ['Blue Uniform', 'Pink Uniform'], min: [300, 100] },
        xp: { text: 'XP', css: 'div,span', min: [60, 20], pick: 'first' },
      },
    },
    {
      name: 's-quiz-battle',
      steps: open(STUDENT_MENU.battle, 'Quiz Battle'),
      highlights: { modes: { text: ['VS Player', 'VS Bot'], min: [300, 120] } },
    },
    {
      name: 's-leaderboard',
      steps: [home, ...open(STUDENT_MENU.battle, 'Leaderboard')],
      highlights: {
        tabs: { text: ['Daily', 'Weekly', 'All Time'], min: [150, 25] },
        gap: { text: ['XP needed', 'Battle'], min: [300, 30] },
      },
    },
    {
      name: 's-profile',
      steps: [home, ...open(STUDENT_MENU.profile, 'My Profile')],
      highlights: { pass: { text: ['Student Pass', 'Learner Name'], min: [300, 150] } },
    },
    {
      name: 's-settings',
      steps: open(STUDENT_MENU.profile, 'Settings'),
      highlights: { theme: { text: ['Settings Section', 'Display & Theme'], min: [300, 40] } },
    },
    {
      name: 's-menu-profile',
      steps: [home, { click: { label: STUDENT_MENU.profile } }],
      highlights: { menu: { text: ['My Profile', 'Settings', 'Sign Out'], min: [150, 120] } },
      after: [{ click: { label: 'Close menu' } }],
    },
    {
      name: 's-notifications',
      steps: [home, { click: { label: 'Notifications' } }],
      highlights: { panel: { text: ['Notifications', 'Mark read'], min: [300, 200] } },
      after: [{ key: 'Escape' }],
    },
    {
      name: 's-calculator',
      steps: [home, { click: { label: 'Scientific Calculator' } }],
      highlights: { verify: { text: 'Verify with SymPy', min: [100, 15] } },
      after: [{ key: 'Escape' }],
    },
  ],
  teacher: [
    {
      name: 't-dashboard',
      steps: [],
      highlights: {
        insight: { text: ['MathPulse AI Insight', 'Review'], min: [300, 60] },
        stats: { text: ['Total Students', 'Class Average', 'Engagement', 'Needs Attention'], min: [300, 150] },
        classes: { text: ['Grade 11', 'Manage'], min: [300, 50], pick: 'first' },
      },
    },
    {
      name: 't-classes',
      steps: open(TEACHER_MENU.teaching, 'My Classes'),
      highlights: {
        picker: { text: ['Dashboard', 'New Class'], min: [300, 30] },
        stats: { text: ['Class Average', 'Completion', 'Participation', 'Needs Attention'], min: [300, 120] },
        filters: { text: ['All Students', 'Top Performers', 'Needs Attention'], min: [250, 25] },
      },
    },
    {
      name: 't-calendar',
      steps: open(TEACHER_MENU.teaching, 'Schedule & Calendar'),
      highlights: {
        month: { text: ['events'], css: 'div', min: [300, 40], pick: 'first' },
        add: { css: 'button', text: 'Add Event' },
      },
    },
    {
      name: 't-quiz-maker',
      steps: open(TEACHER_MENU.ai, 'AI Quiz Maker'),
      highlights: {
        tabs: { text: ['Create Quiz', 'Quiz Bank'], min: [300, 30] },
        steps: { text: ['Setup', '2', '3', '4'], min: [300, 30] },
        next: { css: 'button', text: 'Next: Select Topics' },
      },
    },
    {
      name: 't-question-bank',
      steps: open(TEACHER_MENU.ai, 'Question Bank'),
      highlights: { ingest: { text: ['Ingest New PDF', 'Grade Level'], min: [300, 150] } },
    },
    {
      name: 't-data-import',
      steps: open(TEACHER_MENU.ai, 'Data Import'),
      highlights: {
        target: { text: ['Target Class Context', 'All Classes'], min: [300, 80] },
        upload: { text: ['Upload Class Spreadsheet', 'Supported Formats'], min: [300, 100], pick: 'first' },
      },
    },
    {
      name: 't-topic-mastery',
      steps: open(TEACHER_MENU.insights, 'Topic Mastery'),
      highlights: { tabs: { text: ['Mastery Matrix', 'Competency Matrix'], min: [300, 30] } },
    },
    {
      name: 't-module-availability',
      steps: open(TEACHER_MENU.insights, 'Module Availability'),
      highlights: {
        stats: { text: ['Available', 'Teacher Material', 'Coming Soon', 'Unavailable'], min: [300, 120] },
        configure: { css: 'button', text: 'Configure', pick: 'first' },
      },
    },
    {
      name: 't-ai-insight',
      steps: [home, { click: { label: 'View AI Insight' } }],
      highlights: { modal: { text: ['Detailed AI Insight', 'Minimize to Menu'], min: [300, 120] } },
      after: [{ key: 'Escape' }],
    },
  ],
  admin: [
    {
      name: 'a-overview',
      steps: [],
      highlights: {
        actions: { text: ['Add Faculty or Student', 'Class Sections', 'Upload Curriculum', 'Analytics Hub'], min: [300, 100] },
        stats: { text: ['Teaching Faculty', 'Active Sections', 'AI Tutor Sessions', 'Academic Support Need'], min: [300, 150] },
      },
    },
    {
      name: 'a-menu-manage',
      steps: [{ click: { label: 'Management Menu' } }],
      highlights: { menu: { text: ['Users', 'Classes', 'Accounts & Roles'], min: [200, 80] } },
      after: [{ click: { label: 'Close menu' } }],
    },
    {
      name: 'a-users',
      steps: open('Management Menu', 'Accounts & Roles', false),
      settle: 9000,
      blurNames: true,
      highlights: {
        stats: { text: ['All Users', 'Active', 'Admins', 'Teachers', 'Students'], min: [300, 150] },
        tools: { css: 'input[placeholder^="Search name"]', min: [100, 20] },
        actions: { text: ['Edit', 'Deactivate'], min: [250, 40], pick: 'first' },
      },
    },
    {
      name: 'a-classes',
      steps: open('Management Menu', 'Sections & Faculty', false),
      highlights: {
        stats: { text: ['Total Sections', 'With Teacher', 'No Teacher'], min: [300, 50] },
        assign: { text: ['Assigned Teacher', 'Unassign Teacher'], min: [300, 120], pick: 'first' },
      },
    },
    {
      name: 'a-rag',
      steps: open('AI and RAG Pipeline', 'Vector Store & Health', false),
      highlights: {
        stats: { text: ['Indexed Sections', 'Active Subjects', 'Ingested Documents', 'RAG Pipeline Status'], min: [300, 150] },
        rebuild: { css: 'button', text: 'Rebuild Knowledge' },
      },
    },
    {
      name: 'a-curriculum',
      steps: open('Curriculum Menu', 'Senior High Strands', false),
      highlights: { subject: { text: ['General Mathematics', 'Available'], min: [300, 80], pick: 'first' } },
    },
    {
      name: 'a-content-pdfs',
      steps: open('Curriculum Menu', 'Upload Modules', false),
      highlights: {
        upload: { text: ['Learning Module Upload', 'Drop PDF here'], min: [300, 150] },
        tabs: { text: ['Import Modules', 'File Inventory'], min: [250, 25] },
      },
    },
    {
      name: 'a-analytics',
      steps: open('Insights Menu', 'Performance Trends', false),
      highlights: {
        range: { text: ['7D', '30D', '90D', 'ALL'], min: [200, 25] },
        export: { css: 'button', text: 'Export Report' },
      },
    },
    {
      name: 'a-audit-log',
      steps: open('Insights Menu', 'Security Events', false),
      highlights: {
        export: { css: 'button', text: 'Export CSV' },
        event: { text: ['Inspect', 'System'], min: [300, 80], pick: 'first' },
      },
    },
    {
      name: 'a-profile-menu',
      steps: [home, { click: { label: 'Profile menu: Administrator' }, real: true }],
      highlights: { menu: { text: ['My Profile', 'Settings', 'Sign Out'], min: [150, 100] } },
      after: [{ key: 'Escape' }],
    },
  ],
};
