import type { TourPage, TourStep } from './GuidedTour';

const at = (name: string) => `[data-tour="${name}"]`;

const dashboard: TourPage = {
  tab: 'Dashboard',
  label: 'Dashboard',
  overview: { tab: 'Dashboard', title: 'Dashboard', description: 'Your home page: level and XP, today\'s goal, your streak, your next modules and a leaderboard preview. Continue Learning picks up where you left off.', target: at('learning-path') },
  steps: [
    { tab: 'Dashboard', title: 'Your home base', description: 'The dashboard greets you and shows your level and avatar. It is the starting point for every study session.', target: at('hero') },
    { tab: 'Dashboard', title: 'Continue Learning', description: 'Continue Learning reopens the lesson you were working on. If you have not started one yet, it takes you to Modules.', target: at('continue-learning') },
    { tab: 'Dashboard', title: 'Level and XP', description: 'Lessons, quizzes and battles earn XP. When the XP bar fills, you level up. Tap the level or XP badge to see your rewards and progress.', target: at('level') },
    { tab: 'Dashboard', title: 'Daily goals', description: 'Your daily goal tracks today\'s lessons. Tap the card to take the initial assessment if it is still pending, or to go to Modules.', target: at('daily-goals') },
    { tab: 'Dashboard', title: 'XP and streak', description: 'These cards show your total XP and how many days in a row you have studied. Study every day to keep your streak going. Tap a card to open your rewards.', target: `${at('xp-streak')}, ${at('xp-card')}` },
    { tab: 'Dashboard', title: 'Topics to review', description: 'After your assessment, topics you should strengthen appear here. Tap a topic to open its module.', target: at('review-topics'), optional: true },
    { tab: 'Dashboard', title: 'Your learning path', description: 'These are your next three modules, with topics you need to strengthen ranked first. Tap a card to open the module, or View All to see every module.', target: at('learning-path') },
    { tab: 'Dashboard', title: 'Competency matrix', description: 'The chart compares your skill level in each module. Use Refresh after finishing activities to update it.', target: at('competency') },
    { tab: 'Dashboard', title: 'Leaderboard preview', description: 'See the top three learners in your section. Tap the card to open the full leaderboard.', target: at('leaderboard-preview') },
    { tab: 'Dashboard', title: 'Ask the tutor anytime', description: 'This button opens L.O.L.I., your AI math tutor, from any page.', target: at('floating-tutor'), optional: true },
    { tab: 'Dashboard', title: 'Scientific calculator', description: 'Open the calculator to evaluate expressions while you study. Keyboard shortcut: Alt+K.', target: '[aria-label="Scientific Calculator"]' },
    { tab: 'Dashboard', title: 'Notifications', description: 'The bell shows reminders, new assignments and battle updates. A number means you have unread notifications.', target: at('notifications') },
    { tab: 'Dashboard', title: 'Guide for this page', description: 'Forgot how a page works? Tap this button on any page to replay only that page\'s guide.', target: at('page-guide') },
  ],
};

const modules: TourPage = {
  tab: 'Modules',
  label: 'Modules',
  overview: { tab: 'Modules', title: 'Modules', description: 'All your lessons live here, by subject and quarter. You will also find recommended modules, practice quizzes, and quizzes and materials from your teacher. On a phone, Modules is in the bottom bar.', target: '[data-tour-nav="Modules"]', menu: 'Modules' },
  steps: [
    { tab: 'Modules', title: 'Search and filter', description: 'Search by module, lesson or competency. Use the subject, quarter and competency filters to narrow the list, and Reset to clear them.', target: at('module-search'), view: 'modules' },
    { tab: 'Modules', title: 'Assessment focus areas', description: 'Topics your assessment flagged are listed here. View Recommended shows modules that cover them.', target: at('module-focus'), view: 'modules', optional: true },
    { tab: 'Modules', title: 'All modules', description: 'The Modules tab lists every DepEd SHS module for your grade.', target: at('module-tab-modules'), view: 'modules' },
    { tab: 'Modules', title: 'Module cards', description: 'Tap a card to open its lessons, worked examples, practice and quizzes. The bar shows your progress, and Source shows where the content comes from.', target: at('module-grid'), view: 'modules' },
    { tab: 'Modules', title: 'Recommended', description: 'Recommended suggests what to study next, based on your assessment and progress, including modules you have already started.', target: at('module-tab-recommended'), view: 'recommended' },
    { tab: 'Modules', title: 'Suggested next', description: 'Modules that match your weak topics are listed first. Finish your assessment to make these suggestions more accurate.', target: at('recommended-modules'), view: 'recommended' },
    { tab: 'Modules', title: 'Practice', description: 'Practice has quizzes from your teacher and AI-generated practice quizzes.', target: at('module-tab-practice'), view: 'practice' },
    { tab: 'Modules', title: 'Assigned by your teacher', description: 'Quizzes your teacher assigned appear at the top of Practice and Recommended. Tap Take quiz to start one before its due date.', target: at('assigned-quizzes'), view: 'practice' },
    { tab: 'Modules', title: 'Practice stats', description: 'Track how many practice quizzes you have completed, the XP earned, and your average score.', target: at('practice-stats'), view: 'practice' },
    { tab: 'Modules', title: 'Choose your practice', description: 'Pick a subject and a difficulty (Easy, Medium or Hard), then filter topics by Completed or Recommended.', target: at('practice-filters'), view: 'practice' },
    { tab: 'Modules', title: 'Practice topics', description: 'Tap a topic to generate a new practice quiz on it. History shows your earlier attempts.', target: at('practice-topics'), view: 'practice' },
    { tab: 'Modules', title: 'Teacher Uploaded', description: 'Extra materials your teacher uploaded are listed here. It stays empty until your teacher shares a module.', target: at('module-tab-teacher_uploaded'), view: 'teacher_uploaded' },
    { tab: 'Modules', title: 'Teacher modules', description: 'Tap a teacher module to follow its lessons step by step.', target: at('teacher-modules'), view: 'teacher_uploaded' },
  ],
};

const grades: TourPage = {
  tab: 'Grades',
  label: 'Grades & Assessment',
  overview: { tab: 'Grades', title: 'Grades & Assessment', description: 'See your grades, quiz history, assessment results and exam readiness, and download a report. On a phone, Assessment is in the Modules menu.', target: '[data-tour-nav="Grades"]', menu: 'Grades' },
  steps: [
    { tab: 'Grades', title: 'Quarter and export', description: 'Choose a quarter to filter your records. Pick CSV or PDF, then Export Report to download your grades.', target: at('grades-export') },
    { tab: 'Grades', title: 'Grade summary', description: 'Your average, focus subject and quiz count. Tap Average for the full graph, or Practice on the focus card to work on your weakest subject.', target: at('grades-kpis') },
    { tab: 'Grades', title: 'AI diagnostic results', description: 'Your assessment score, the topics to practice, and AI study advice. View Full Analysis opens the detailed breakdown.', target: at('grades-diagnostic'), optional: true },
    { tab: 'Grades', title: 'Subject grades', description: 'Each bar is a subject average compared with the passing line. Tap a bar to filter your recent quizzes by that subject.', target: at('grades-subjects') },
    { tab: 'Grades', title: 'Subject standings', description: 'Subjects ranked from strongest to weakest. Practice opens practice quizzes for that subject.', target: at('grades-standings') },
    { tab: 'Grades', title: 'Recent quizzes', description: 'Your quiz and practice history. Filter it by subject or type, and use Practice on any row to retry the topic.', target: at('grades-history') },
    { tab: 'Grades', title: 'Exam readiness', description: 'How ready you are for your next exam, with milestones to reach. Each milestone opens matching practice.', target: at('grades-readiness') },
  ],
};

const aiChat: TourPage = {
  tab: 'AI Chat',
  label: 'AI Chat',
  overview: { tab: 'AI Chat', title: 'AI Chat', description: 'Ask L.O.L.I., your AI math tutor, for explanations, worked examples and practice problems. Your past chats are saved here. On a phone, AI Chat is in the center menu.', target: '[data-tour-nav="AI Chat"]', menu: 'AI Chat' },
  steps: [
    { tab: 'AI Chat', title: 'Start a conversation', description: 'Tap New to start a fresh chat with L.O.L.I. Use one chat per topic so your history stays easy to find.', target: `${at('chat-new')}, ${at('chat-start')}`, view: 'list' },
    { tab: 'AI Chat', title: 'Find past chats', description: 'Search your earlier conversations by title or content.', target: at('chat-search'), view: 'list', optional: true },
    { tab: 'AI Chat', title: 'Your conversations', description: 'Tap a conversation to continue it. On a phone, use Back in a chat to return to this list.', target: `${at('chat-history')}, ${at('chat-recent')}`, view: 'list', optional: true },
    { tab: 'AI Chat', title: 'Messages', description: 'L.O.L.I.\'s explanations appear here. Hover over or tap a reply to copy it. Check important answers against your modules.', target: at('chat-messages'), view: 'conversation', optional: true },
    { tab: 'AI Chat', title: 'Quick prompts', description: 'One tap asks for a step-by-step explanation, an SHS practice problem, a simpler version of a concept, or a check of your solution.', target: `${at('chat-prompts')}, ${at('chat-topics')}`, view: 'conversation' },
    { tab: 'AI Chat', title: 'Ask your question', description: 'Type a math question and press Enter or Send. Include the full problem and what you have tried so far.', target: `${at('chat-input')}, ${at('chat-start')}`, view: 'conversation' },
  ],
};

const quizBattle: TourPage = {
  tab: 'Quiz Battle',
  label: 'Quiz Battle',
  overview: { tab: 'Quiz Battle', title: 'Quiz Battle', description: 'Compete in timed math rounds against other students or a practice bot, and track your battle stats. On a phone, Quiz Battle is in the battle menu.', target: '[data-tour-nav="Quiz Battle"]', menu: 'Quiz Battle', view: 'hub' },
  steps: [
    { tab: 'Quiz Battle', title: 'Battle modes', description: 'VS Player matches you with another student or a private room. VS Bot is practice against the computer. The tour shows the setup without starting a match.', target: at('battle-modes'), view: 'hub' },
    { tab: 'Quiz Battle', title: 'Hall of Fame', description: 'The top battlers this season. Tap it for the full battle leaderboard.', target: at('hall-of-fame'), view: 'hub' },
    { tab: 'Quiz Battle', title: 'My battle stats', description: 'Your battle XP, win rate, matches played and average answer speed. View Stats shows the full breakdown.', target: at('battle-stats'), view: 'hub' },
    { tab: 'Quiz Battle', title: 'Match history', description: 'Your last three matches. View All lists every match, with filters and Rematch.', target: at('battle-history'), view: 'hub' },
    { tab: 'Quiz Battle', title: 'Player or bot', description: 'After you pick a mode, the setup screen opens. Switch between VS Player and VS Bot here.', target: at('battle-mode-switch'), view: 'setup' },
    { tab: 'Quiz Battle', title: 'Subject', description: 'Choose the subject for the questions. Only subjects for your grade are shown.', target: at('battle-subject'), view: 'setup' },
    { tab: 'Quiz Battle', title: 'Topic', description: 'Narrow the questions to one topic in that subject.', target: at('battle-topic'), view: 'setup' },
    { tab: 'Quiz Battle', title: 'Difficulty', description: 'Harder difficulty earns more XP. Bot battles also offer Adaptive, which adjusts to how you are doing.', target: at('battle-difficulty'), view: 'setup' },
    { tab: 'Quiz Battle', title: 'Rounds', description: 'Set how many questions the battle has, from 3 to 15.', target: at('battle-rounds'), view: 'setup' },
    { tab: 'Quiz Battle', title: 'Timer', description: 'Set the seconds allowed per question, from 15 to 60.', target: at('battle-timer'), view: 'setup' },
    { tab: 'Quiz Battle', title: 'Public match or private room', description: 'Public matchmaking pairs you with any available student. Private room: leave the code blank to host a room, or enter a friend\'s 6-character code to join theirs.', target: at('battle-room'), view: 'setup', optional: true },
    { tab: 'Quiz Battle', title: 'Sound effects', description: 'Turn battle sounds on or off and set the volume.', target: at('battle-sound'), view: 'setup' },
    { tab: 'Quiz Battle', title: 'Start the battle', description: 'When your settings are ready, press this button to find an opponent, host or join a room, or start a bot battle.', target: at('battle-start'), view: 'setup' },
  ],
};

const leaderboard: TourPage = {
  tab: 'Leaderboard',
  label: 'Leaderboard',
  overview: { tab: 'Leaderboard', title: 'Leaderboard', description: 'See how your XP ranks against your section, daily, weekly or all time. On desktop it is Leadership Board; on a phone, it is in the battle menu.', target: '[data-tour-nav="Leaderboard"]', menu: 'Leaderboard' },
  steps: [
    { tab: 'Leaderboard', title: 'Time period', description: 'Switch between Daily, Weekly and All Time rankings.', target: at('leaderboard-period') },
    { tab: 'Leaderboard', title: 'Top three', description: 'The top three learners in this period. Tap a learner to see their profile.', target: at('leaderboard-podium') },
    { tab: 'Leaderboard', title: 'Your rank', description: 'Your current rank and how much XP you need to pass the learner ahead of you. Battle takes you straight to Quiz Battle.', target: at('leaderboard-rank') },
    { tab: 'Leaderboard', title: 'Class standings', description: 'Everyone else in your section, with your row marked "You". The buttons below go to Quiz Battle and Modules to earn more XP.', target: at('leaderboard-standings') },
  ],
};

const avatarStudio: TourPage = {
  tab: 'Avatar Studio',
  label: 'Avatar Studio',
  overview: { tab: 'Avatar Studio', title: 'Avatar Studio', description: 'Dress your avatar with items you own or buy with XP. On a phone, Avatar Studio is in the center menu.', target: '[data-tour-nav="Avatar Studio"]', menu: 'Avatar Studio' },
  steps: [
    { tab: 'Avatar Studio', title: 'Live preview', description: 'Your avatar updates here as you try on items, before you save.', target: at('avatar-preview') },
    { tab: 'Avatar Studio', title: 'Surprise outfit and XP', description: 'The dice randomly picks an outfit from items you own. The XP button shows your balance and leads to lessons where you can earn more.', target: `${at('avatar-tools')}, [aria-label="Surprise Outfit"]` },
    { tab: 'Avatar Studio', title: 'Categories', description: 'Browse Tops, Bottoms, Shoes, Accessories and Exclusive items.', target: at('avatar-categories') },
    { tab: 'Avatar Studio', title: 'Items', description: 'Tap an item to wear it, or tap it again to take it off. Locked items show an XP price to buy them. Exclusive items can be previewed for a few seconds.', target: at('avatar-items') },
    { tab: 'Avatar Studio', title: 'Save or reset', description: 'Save Changes keeps your new look. Reset undoes changes you have not saved. Both turn on after you change something.', target: at('avatar-save') },
  ],
};

const rewards: TourPage = {
  tab: 'Rewards',
  label: 'Rewards',
  overview: { tab: 'Rewards', title: 'Rewards', description: 'Your badges, daily quests and level milestones. Tap your level badge at the top of any page to get here.', target: at('level') },
  steps: [
    { tab: 'Rewards', title: 'Level progress', description: 'Your current level and the percent left until the next one.', target: at('rewards-level') },
    { tab: 'Rewards', title: 'Your totals', description: 'Badges unlocked, career XP, your current streak and daily quests completed.', target: at('rewards-metrics') },
    { tab: 'Rewards', title: 'Achievements, quests and journey', description: 'Achievements lists your badges, Daily Quests shows today\'s challenges, and Progression Journey shows upcoming level milestones. On Achievements, filter by All, Unlocked or Incomplete.', target: at('rewards-tabs') },
    { tab: 'Rewards', title: 'Badges and progress', description: 'Each badge shows what it requires and how close you are. Pick a category to narrow the list.', target: at('rewards-content') },
  ],
};

const profile: TourPage = {
  tab: 'Profile',
  label: 'Profile',
  overview: { tab: 'Profile', title: 'Profile', description: 'Your Student ID pass and your personal and school details. Open it from the profile menu (top right on tablet and desktop, bottom right on a phone).', target: '[data-tour-nav="Profile"], [data-tour-group="Profile"]', menu: 'Profile' },
  steps: [
    { tab: 'Profile', title: 'Student ID pass', description: 'Tap the card to flip it. Use the camera badge to change your profile photo; it saves right away.', target: at('profile-id-card') },
    { tab: 'Profile', title: 'Avatar Studio shortcut', description: 'Jump straight to Avatar Studio to change your avatar.', target: at('profile-avatar') },
    { tab: 'Profile', title: 'Edit your details', description: 'Tap Edit to change your details, then Save, or Cancel to discard. Save before leaving the page.', target: at('profile-edit') },
    { tab: 'Profile', title: 'Basic information', description: 'Your name, phone number and gender. Change updates your sign-in email after you confirm your password.', target: at('profile-basic') },
    { tab: 'Profile', title: 'School and grade', description: 'Your school, grade, section and LRN. Ask your teacher or admin if anything here is wrong.', target: at('profile-school') },
  ],
};

const settings: TourPage = {
  tab: 'Settings',
  label: 'Settings',
  overview: { tab: 'Settings', title: 'Settings', description: 'Change the theme, notifications and your password, and manage your data. Settings is in the same profile menu.', target: '[data-tour-nav="Settings"], [data-tour-group="Profile"]', menu: 'Profile' },
  steps: [
    { tab: 'Settings', title: 'Profile shortcuts', description: 'Your photo, level and grade, with shortcuts to your Student ID pass and Avatar Studio.', target: at('settings-profile') },
    { tab: 'Settings', title: 'Settings sections', description: 'Display & Theme sets light or dark mode and animations. Alerts & Reminders controls notifications. Login & Password changes your password. My Data & Files exports your data and clears the cache.', target: at('settings-sections') },
    { tab: 'Settings', title: 'Adjust your preferences', description: 'Change options in the open section, such as theme, daily XP target, practice level and study time.', target: at('settings-panel') },
    { tab: 'Settings', title: 'Save your changes', description: 'The button reads Save Changes when you have edits. Save before leaving so your changes are kept.', target: at('settings-save') },
    { tab: 'Settings', title: 'Guides anytime', description: 'Replay the full guide, or choose one page\'s guide here. You can also tap the guide button at the top of any page.', target: at('settings-guide') },
  ],
};

export const studentTourPages: readonly TourPage[] = [dashboard, modules, grades, aiChat, quizBattle, leaderboard, avatarStudio, rewards, profile, settings];

const welcome: TourStep = {
  tab: 'Dashboard',
  title: 'Welcome to MathPulse AI',
  description: 'This short tour shows what each page is for. Every page also has its own step-by-step guide, so you do not need to remember everything now.',
  target: at('hero'),
};

const pageGuides: TourStep = {
  tab: 'Settings',
  title: 'Step-by-step help on every page',
  description: 'For detailed instructions, tap this button on any page to play that page\'s guide. Settings lists every page guide and lets you replay this tour.',
  target: at('page-guide'),
};

/** First-use guide: one general step per page; details live in each page's own guide. */
export const studentTourSteps: readonly TourStep[] = [welcome, ...studentTourPages.map(page => page.overview), pageGuides];
export function studentPageTour(tab: string): TourPage | undefined {
  return studentTourPages.find(page => page.tab === tab);
}
