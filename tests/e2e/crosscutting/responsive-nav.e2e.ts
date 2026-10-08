import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

const closeStudentPrompts =
  'if an Initial Assessment or Daily Rewards dialog is open, close it without starting or claiming anything; otherwise do nothing';
const greeting = /^Good (Morning|Afternoon|Evening), .+!$/;
const phone = { width: 390, height: 844 };
const tablet = { width: 820, height: 1180 };
const staffViewports = [
  { label: 'phone', size: phone },
  { label: 'tablet', size: tablet },
] as const;
// Corner taps skip the covered-element check: the 'Close menu' backdrop sits under the nav buttons, and it may also cover the page behind an open menu.
const cornerTap = { x: 4, y: 4 };

describe('responsive bottom navigation', { tags: ['any', 'responsive-nav'] }, () => {
  test('student phone Module Options menu opens Assessment and Modules', { session: 'student', tags: ['student', 'phone'] }, async ({ app, agent, browser, screen }) => {
    await browser.setViewport(phone);
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeStudentPrompts);
    await expect(screen.getByRole('dialog')).toBeHidden({ timeout: 10_000 });
    const nav = screen.getByRole('navigation', 'Mobile and Tablet navigation');
    const moduleOptions = nav.getByRole('button', 'Module Options: Modules and Assessment');

    await expect(moduleOptions).toHaveAttribute('aria-expanded', 'false');
    await moduleOptions.tap();
    await expect(moduleOptions).toHaveAttribute('aria-expanded', 'true');
    await expect(nav.getByRole('button', 'Modules')).toBeVisible();
    await nav.getByRole('button', 'Assessment').tap();
    await expect(browser).toHaveURL('/grades');
    await expect(screen.getByText('Grades & Assessment')).toBeVisible({ timeout: 30_000 });
    await expect(nav.getByRole('button', 'Assessment')).toBeHidden();
    await expect(moduleOptions).toHaveAttribute('aria-expanded', 'false');

    await moduleOptions.tap();
    await nav.getByRole('button', 'Modules').tap();
    await expect(browser).toHaveURL('/modules');
  });

  test('student phone AI Options menu opens AI Chat and Avatar Studio', { session: 'student', tags: ['student', 'phone'] }, async ({ app, agent, browser, screen }) => {
    await browser.setViewport(phone);
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeStudentPrompts);
    await expect(screen.getByRole('dialog')).toBeHidden({ timeout: 10_000 });
    const nav = screen.getByRole('navigation', 'Mobile and Tablet navigation');
    const aiOptions = nav.getByRole('button', 'AI Options: AI Chat and Avatar Studio');

    await aiOptions.tap();
    await expect(aiOptions).toHaveAttribute('aria-expanded', 'true');
    await expect(nav.getByRole('button', 'Avatar Studio')).toBeVisible();
    await nav.getByRole('button', 'AI Chat').tap();
    await expect(browser).toHaveURL('/chat');
    await expect(nav.getByRole('button', 'AI Chat')).toBeHidden();

    await aiOptions.tap();
    await nav.getByRole('button', 'Avatar Studio').tap();
    await expect(browser).toHaveURL('/avatar');
    await expect(aiOptions).toHaveAttribute('aria-expanded', 'false');
  });

  test('student phone Battle Options menu opens Leaderboard and Quiz Battle', { session: 'student', tags: ['student', 'phone'] }, async ({ app, agent, browser, screen }) => {
    await browser.setViewport(phone);
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeStudentPrompts);
    await expect(screen.getByRole('dialog')).toBeHidden({ timeout: 10_000 });
    const nav = screen.getByRole('navigation', 'Mobile and Tablet navigation');
    const battleOptions = nav.getByRole('button', 'Battle Options: Quiz Battle and Leaderboard');

    await battleOptions.tap();
    await expect(battleOptions).toHaveAttribute('aria-expanded', 'true');
    await expect(nav.getByRole('button', 'Quiz Battle')).toBeVisible();
    await nav.getByRole('button', 'Leaderboard').tap();
    await expect(browser).toHaveURL('/leaderboard');
    await expect(nav.getByRole('button', 'Leaderboard')).toBeHidden();

    await battleOptions.tap();
    await nav.getByRole('button', 'Quiz Battle').tap();
    await expect(browser).toHaveURL('/battle');
    await expect(screen.getByText('Live Arena')).toBeVisible({ timeout: 30_000 });
  });

  test('student phone Profile options menu lists My Profile, Settings and Sign Out', { session: 'student', tags: ['student', 'phone'] }, async ({ app, agent, browser, screen }) => {
    await browser.setViewport(phone);
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeStudentPrompts);
    await expect(screen.getByRole('dialog')).toBeHidden({ timeout: 10_000 });
    const nav = screen.getByRole('navigation', 'Mobile and Tablet navigation');
    const profileOptions = nav.getByRole('button', /^Profile options for /);

    await expect(screen.getByRole('button', /^Profile menu: /)).toBeHidden();
    await profileOptions.tap();
    await expect(profileOptions).toHaveAttribute('aria-expanded', 'true');
    await expect(nav.getByText('MathPulse Learner')).toBeVisible();
    await expect(nav.getByRole('button', 'Sign Out')).toBeVisible();
    await nav.getByRole('button', 'My Profile').tap();
    await expect(browser).toHaveURL('/profile');
    await expect(profileOptions).toHaveAttribute('aria-current', 'page');

    await profileOptions.tap();
    await nav.getByRole('button', 'Settings').tap();
    await expect(browser).toHaveURL('/settings');
    await expect(nav.getByRole('button', 'Sign Out')).toBeHidden();
    await expect(profileOptions).toHaveAttribute('aria-current', 'page');
  });

  test('student phone menus replace each other and close from the backdrop or an outside tap', { session: 'student', tags: ['student', 'phone'] }, async ({ app, agent, browser, screen }) => {
    await browser.setViewport(phone);
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeStudentPrompts);
    await expect(screen.getByRole('dialog')).toBeHidden({ timeout: 10_000 });
    const nav = screen.getByRole('navigation', 'Mobile and Tablet navigation');
    const moduleOptions = nav.getByRole('button', 'Module Options: Modules and Assessment');
    const aiOptions = nav.getByRole('button', 'AI Options: AI Chat and Avatar Studio');

    await expect(nav.getByRole('button', 'Dashboard')).toHaveAttribute('aria-current', 'page');
    await moduleOptions.tap();
    await expect(nav.getByRole('button', 'Assessment')).toBeVisible();
    await aiOptions.tap();
    await expect(nav.getByRole('button', 'AI Chat')).toBeVisible();
    await expect(nav.getByRole('button', 'Assessment')).toBeHidden();
    await expect(moduleOptions).toHaveAttribute('aria-expanded', 'false');

    await nav.getByRole('button', 'Close menu').tap({ position: cornerTap });
    await expect(nav.getByRole('button', 'AI Chat')).toBeHidden();
    await expect(aiOptions).toHaveAttribute('aria-expanded', 'false');
    await expect(nav.getByRole('button', 'Close menu')).toBeHidden();

    await nav.getByRole('button', 'Battle Options: Quiz Battle and Leaderboard').tap();
    await expect(nav.getByRole('button', 'Leaderboard')).toBeVisible();
    await screen.getByRole('heading', greeting).tap({ position: cornerTap });
    await expect(nav.getByRole('button', 'Leaderboard')).toBeHidden();
    await expect(browser).toHaveURL('/');
  });

  test('student tablet bar shows every tab directly with no popup menus', { session: 'student', tags: ['student', 'tablet'] }, async ({ app, agent, browser, screen }) => {
    await browser.setViewport(tablet);
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeStudentPrompts);
    await expect(screen.getByRole('dialog')).toBeHidden({ timeout: 10_000 });
    const nav = screen.getByRole('navigation', 'Mobile and Tablet navigation');

    await expect(nav.getByRole('button', 'Module Options: Modules and Assessment')).toBeHidden();
    await expect(nav.getByRole('button', /^Profile options for /)).toBeHidden();
    await expect(screen.getByRole('button', /^Profile menu: /)).toBeVisible();
    await expect(nav.getByRole('button', 'Dashboard')).toHaveAttribute('aria-current', 'page');

    const tabletTabs = [
      { name: 'Assessment', path: '/grades' },
      { name: 'AI Chat', path: '/chat' },
      { name: 'Leaderboard', path: '/leaderboard' },
      { name: 'Avatar Studio', path: '/avatar' },
      { name: 'Quiz Battle', path: '/battle' },
      { name: 'Dashboard', path: '/' },
      { name: 'Modules', path: '/modules' },
    ] as const;
    for (const tab of tabletTabs) {
      await nav.getByRole('button', tab.name).tap();
      await expect(browser).toHaveURL(tab.path);
      await expect(nav.getByRole('button', tab.name)).toHaveAttribute('aria-current', 'page');
    }
  });

  for (const viewport of staffViewports) {
    test(`teacher ${viewport.label} bottom nav popups reach every teaching view`, { session: 'teacher', tags: ['teacher', viewport.label], timeout: 180_000 }, async ({ app, browser, screen }) => {
      await browser.setViewport(viewport.size);
      await app.open('/');
      await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 45_000 });
      const nav = screen.getByRole('navigation', 'Bottom Navigation');
      const teaching = nav.getByRole('button', 'Teaching Options: My Classes and Calendar');
      const aiTools = nav.getByRole('button', 'AI Tools: Quiz Maker, Question Bank, Data Import');
      const insights = nav.getByRole('button', 'Insights Options: Topic Mastery and Competency Matrix');

      await expect(nav.getByRole('button', 'Dashboard')).toHaveAttribute('aria-current', 'page');
      await teaching.tap();
      await expect(teaching).toHaveAttribute('aria-expanded', 'true');
      await expect(nav.getByRole('button', 'Schedule & Calendar')).toBeVisible();
      await nav.getByRole('button', 'My Classes').tap();
      await expect(screen.getByRole('heading', 'Class Analytics', { level: 1 })).toBeVisible({ timeout: 30_000 });
      await expect(nav.getByRole('button', 'My Classes')).toBeHidden();
      await teaching.tap();
      await nav.getByRole('button', 'Schedule & Calendar').tap();
      await expect(screen.getByRole('heading', 'Academic Calendar', { level: 1 })).toBeVisible({ timeout: 30_000 });

      await aiTools.tap();
      await expect(aiTools).toHaveAttribute('aria-expanded', 'true');
      await nav.getByRole('button', 'AI Quiz Maker').tap();
      await expect(screen.getByRole('heading', 'AI Quiz Maker', { level: 1 })).toBeVisible({ timeout: 30_000 });
      await aiTools.tap();
      await nav.getByRole('button', 'Question Bank').tap();
      await expect(screen.getByRole('heading', 'Question Bank', { level: 1 })).toBeVisible({ timeout: 30_000 });
      await aiTools.tap();
      await nav.getByRole('button', 'Data Import').tap();
      await expect(screen.getByRole('heading', 'Data Import', { level: 1 })).toBeVisible({ timeout: 30_000 });

      await insights.tap();
      await expect(insights).toHaveAttribute('aria-expanded', 'true');
      await nav.getByRole('button', 'Topic Mastery').tap();
      await expect(screen.getByRole('heading', 'Topic Mastery', { level: 1 })).toBeVisible({ timeout: 30_000 });
      await insights.tap();
      await nav.getByRole('button', 'Competency Matrix').tap();
      await expect(screen.getByRole('heading', 'Student Competency', { level: 1 })).toBeVisible({ timeout: 30_000 });

      await insights.tap();
      await nav.getByRole('button', 'Close menu').tap({ position: cornerTap });
      await expect(nav.getByRole('button', 'Topic Mastery')).toBeHidden();
      await expect(insights).toHaveAttribute('aria-expanded', 'false');
      await teaching.tap();
      await expect(nav.getByRole('button', 'My Classes')).toBeVisible();
      await screen.getByRole('heading', 'Student Competency', { level: 1 }).tap({ position: cornerTap });
      await expect(nav.getByRole('button', 'My Classes')).toBeHidden();

      await nav.getByRole('button', 'Dashboard').tap();
      await expect(screen.getByRole('heading', 'Teacher Dashboard')).toBeVisible({ timeout: 30_000 });
      await expect(nav.getByRole('button', 'Dashboard')).toHaveAttribute('aria-current', 'page');
    });

    test(`admin ${viewport.label} bottom nav menus reach every console tab`, { session: 'admin', tags: ['admin', viewport.label], timeout: 180_000 }, async ({ app, browser, screen }) => {
      await browser.setViewport(viewport.size);
      await app.open('/');
      await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
      const nav = screen.getByRole('navigation', 'Admin mobile and tablet navigation');
      const manage = nav.getByRole('button', 'Management Menu');
      const ai = nav.getByRole('button', 'AI and RAG Pipeline');
      const curriculum = nav.getByRole('button', 'Curriculum Menu');
      const insights = nav.getByRole('button', 'Insights Menu');
      const destinations = [
        { menu: manage, option: /^Users/, heading: 'User Management' },
        { menu: manage, option: /^Classes/, heading: 'Class Management' },
        { menu: ai, option: /^RAG Manager/, heading: 'RAG Manager' },
        { menu: curriculum, option: /^Curriculum Control/, heading: 'Curriculum Control' },
        { menu: curriculum, option: /^Content PDFs/, heading: 'Content' },
        { menu: insights, option: /^Analytics/, heading: 'Analytics' },
        { menu: insights, option: /^Audit Log/, heading: 'Audit Log' },
      ];

      await expect(nav.getByRole('button', 'Dashboard Overview')).toHaveAttribute('aria-current', 'page');
      for (const destination of destinations) {
        await destination.menu.tap();
        await expect(destination.menu).toHaveAttribute('aria-expanded', 'true');
        await nav.getByRole('button', destination.option).tap();
        await expect(screen.getByRole('heading', destination.heading, { level: 1 })).toBeVisible({ timeout: 30_000 });
        await expect(destination.menu).toHaveAttribute('aria-expanded', 'false');
      }

      await insights.tap();
      await nav.getByRole('button', 'Close menu').tap({ position: cornerTap });
      await expect(nav.getByRole('button', /^Analytics/)).toBeHidden();
      await expect(insights).toHaveAttribute('aria-expanded', 'false');
      await manage.tap();
      await expect(nav.getByRole('button', /^Users/)).toBeVisible();
      await screen.getByRole('heading', 'Audit Log', { level: 1 }).tap({ position: cornerTap });
      await expect(nav.getByRole('button', /^Users/)).toBeHidden();

      await nav.getByRole('button', 'Dashboard Overview').tap();
      await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 30_000 });
      await expect(nav.getByRole('button', 'Dashboard Overview')).toHaveAttribute('aria-current', 'page');
    });
  }
});
