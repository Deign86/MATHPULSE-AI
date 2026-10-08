import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

const closeInterruptions =
  "if an Initial Assessment or Daily Rewards dialog is open, close it with its X close button without starting, skipping or claiming anything (never press 'Skip for now'); otherwise do nothing";
const greeting = /^Good (Morning|Afternoon|Evening), .+!$/;

describe('student shell shortcuts and calculator', { tags: ['student', 'shell-shortcuts'] }, () => {
  test('Alt+M, Alt+C, Alt+G, Alt+S, Alt+B and Alt+D route to their tabs', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeInterruptions);
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();

    const shortcutTarget = screen.getByRole('button', 'Scientific Calculator');

    await shortcutTarget.press('Alt+m');
    await expect(browser).toHaveURL('/modules');
    await expect(screen.getByRole('heading', 'Curriculum Modules', { level: 1 })).toBeVisible({ timeout: 30_000 });

    await shortcutTarget.press('Alt+c');
    await expect(browser).toHaveURL('/chat');
    await expect(screen.getByPlaceholder('Search conversations...')).toBeVisible({ timeout: 30_000 });

    await shortcutTarget.press('Alt+g');
    await expect(browser).toHaveURL('/grades');
    await expect(screen.getByRole('heading', 'Grades & Assessment')).toBeVisible({ timeout: 30_000 });

    await shortcutTarget.press('Alt+s');
    await expect(browser).toHaveURL('/settings');
    await expect(screen.getByText('Settings Sheet')).toBeVisible({ timeout: 30_000 });

    await shortcutTarget.press('Alt+b');
    await expect(browser).toHaveURL('/battle');
    await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible({ timeout: 30_000 });

    await shortcutTarget.press('Alt+d');
    await expect(browser).toHaveURL('/');
    await expect(screen.getByRole('heading', greeting)).toBeVisible({ timeout: 30_000 });
  });

  test('Alt+P opens the Profile page', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeInterruptions);
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();

    await screen.getByRole('button', 'Scientific Calculator').press('Alt+p');
    await expect(browser).toHaveURL('/profile');
    await expect(screen.getByRole('heading', 'My Profile')).toBeVisible({ timeout: 30_000 });
  });

  test('shortcuts are ignored while typing in a text field', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await app.open('/modules');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeInterruptions);
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();

    const search = screen.getByRole('textbox', 'Search modules');
    await expect(search).toBeVisible({ timeout: 30_000 });
    await search.fill('E2E');
    await search.press('Alt+d');

    await expect(screen.getByRole('heading', greeting)).not.toBeVisible();
    await expect(browser).toHaveURL('/modules');
    await expect(search).toHaveValue('E2E');

    await search.clear();
    await screen.getByRole('button', 'Scientific Calculator').press('Alt+d');
    await expect(browser).toHaveURL('/');
    await expect(screen.getByRole('heading', greeting)).toBeVisible({ timeout: 30_000 });
  });

  test('leaving Quiz Battle with Alt+D restores the expanded sidebar', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeInterruptions);
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();
    await expect(screen.getByRole('button', 'Collapse sidebar')).toBeVisible();

    const shortcutTarget = screen.getByRole('button', 'Scientific Calculator');
    await shortcutTarget.press('Alt+b');
    await expect(browser).toHaveURL('/battle');
    await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByRole('button', 'Collapse sidebar')).toBeHidden();

    await shortcutTarget.press('Alt+d');
    await expect(screen.getByRole('heading', greeting)).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByRole('button', 'Collapse sidebar')).toBeVisible();
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();
  });

  test('sidebar collapse toggle hides the labels and hovering reveals Expand sidebar', { session: 'student' }, async ({ app, agent, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeInterruptions);
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();

    await screen.getByRole('button', 'Collapse sidebar').tap();
    await expect(screen.getByRole('button', 'Dashboard')).toBeHidden();
    await expect(screen.getByRole('button', 'Leadership Board')).toBeHidden();
    await expect(screen.getByRole('heading', 'MathPulse AI')).toBeHidden();

    await screen.getByRole('heading', greeting).hover();
    await screen.getByRole('complementary').hover();
    const expand = screen.getByRole('button', 'Expand sidebar');
    await expect(expand).toBeVisible();
    await expand.tap();

    await screen.getByRole('heading', greeting).hover();
    await expect(screen.getByRole('button', 'Collapse sidebar')).toBeVisible();
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();
    await expect(screen.getByRole('heading', 'MathPulse AI')).toBeVisible();
  });

  test('Quiz Battle force-collapses the sidebar and leaving it from the sidebar restores the labels', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeInterruptions);
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();

    await screen.getByRole('button', 'Quiz Battle').tap();
    await expect(screen.getByRole('heading', 'Quiz Battle')).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByRole('button', 'Collapse sidebar')).toBeHidden();
    await expect(screen.getByRole('button', 'Dashboard')).toBeHidden();

    const dashboardIcon = screen.getByRole('complementary').getByRole('button').first();
    await dashboardIcon.hover();
    await expect(screen.getByRole('tooltip', 'Dashboard')).toBeVisible();
    await dashboardIcon.tap();

    await expect(browser).toHaveURL('/');
    await expect(screen.getByRole('heading', greeting)).toBeVisible({ timeout: 30_000 });
    await expect(screen.getByRole('button', 'Collapse sidebar')).toBeVisible();
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible();
  });

  test('header button opens the Scientific Calculator, which computes 7 + 8 and closes', { session: 'student' }, async ({ app, agent, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeInterruptions);
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();

    await screen.getByRole('button', 'Scientific Calculator').tap();
    const calculator = screen.getByRole('dialog', 'Scientific Calculator');
    await expect(calculator).toBeVisible();
    await expect(calculator.getByRole('heading', 'Scientific Calculator')).toBeVisible();

    await calculator.getByRole('button', 'DEG').tap();
    await expect(calculator.getByRole('button', 'RAD')).toBeVisible();
    await calculator.getByRole('button', 'RAD').tap();
    await expect(calculator.getByRole('button', 'DEG')).toBeVisible();

    await calculator.getByRole('button', '7').tap();
    await calculator.getByRole('button', '+').tap();
    await calculator.getByRole('button', '8').tap();
    await calculator.getByRole('button', '=').tap();
    await expect(calculator.getByText('7+8 =')).toBeVisible();
    await expect(calculator.getByText('15')).toBeVisible();

    await calculator.getByRole('button', 'AC').tap();
    await expect(calculator.getByText('15')).toBeHidden();

    await calculator.getByRole('button', 'Close calculator').tap();
    await expect(calculator).toBeHidden();
  });

  test('Verify with SymPy checks the last expression through the backend', { session: 'student', timeout: 240_000 }, async ({ app, agent, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeInterruptions);
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();

    await screen.getByRole('button', 'Scientific Calculator').tap();
    const calculator = screen.getByRole('dialog', 'Scientific Calculator');
    await calculator.getByRole('button', '4').tap();
    await calculator.getByRole('button', '+').tap();
    await calculator.getByRole('button', '5').tap();
    await calculator.getByRole('button', '=').tap();
    await expect(calculator.getByText('4+5 =')).toBeVisible();

    await calculator.getByRole('button', 'Verify with SymPy').tap();
    await expect(calculator.getByText('SymPy Verified')).toBeVisible({ timeout: 60_000 });
    await expect(calculator.getByText('Numerical result: 9')).toBeVisible();
    await expect(calculator.getByText('Verification unavailable')).toBeHidden();
    await expect(calculator.getByRole('button', 'Verify with SymPy')).toBeEnabled();
  });

  test('a failed SymPy verification is not labelled SymPy Verified', { session: 'student', tags: ['known-bug'] }, async ({ app, agent, screen, browser }) => {
    await browser.route('**/api/calculator/evaluate', async (route) => {
      await route.abort();
    });
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeInterruptions);
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();

    await screen.getByRole('button', 'Scientific Calculator').tap();
    const calculator = screen.getByRole('dialog', 'Scientific Calculator');
    await calculator.getByRole('button', '4').tap();
    await calculator.getByRole('button', '+').tap();
    await calculator.getByRole('button', '5').tap();
    await calculator.getByRole('button', '=').tap();
    await calculator.getByRole('button', 'Verify with SymPy').tap();

    await expect(calculator.getByText('Verification unavailable')).toBeVisible({ timeout: 30_000 });
    await expect(calculator.getByText('SymPy Verified')).toBeHidden();
  });

  test('calculator accepts keyboard input and Enter evaluates', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeInterruptions);
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();

    await screen.getByRole('button', 'Scientific Calculator').tap();
    const calculator = screen.getByRole('dialog', 'Scientific Calculator');
    await calculator.getByRole('heading', 'Scientific Calculator').tap();
    await browser.keyboard.type('12*3');
    await expect(calculator.getByText('12×3')).toBeVisible();
    await browser.keyboard.press('Enter');

    await expect(calculator.getByText('12×3 =')).toBeVisible();
    await expect(calculator.getByText('36')).toBeVisible();
    await expect(browser).toHaveURL('/');
  });

  test('Alt+K toggles the calculator and Escape closes it', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeInterruptions);
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();

    const calculator = screen.getByRole('dialog', 'Scientific Calculator');
    await screen.getByRole('button', 'Scientific Calculator').press('Alt+k');
    await expect(calculator).toBeVisible();

    await browser.keyboard.press('Alt+k');
    await expect(calculator).toBeHidden();

    await browser.keyboard.press('Alt+k');
    await expect(calculator).toBeVisible();

    await browser.keyboard.press('Escape');
    await expect(calculator).toBeHidden();
  });

  test('minimizing the calculator keeps the last result and expanding restores the keypad', { session: 'student' }, async ({ app, agent, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeInterruptions);
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();

    await screen.getByRole('button', 'Scientific Calculator').tap();
    const calculator = screen.getByRole('dialog', 'Scientific Calculator');
    await calculator.getByRole('button', '9').tap();
    await calculator.getByRole('button', '×').tap();
    await calculator.getByRole('button', '9').tap();
    await calculator.getByRole('button', '=').tap();
    await expect(calculator.getByText('81')).toBeVisible();

    await calculator.getByRole('button', 'Minimize calculator').tap();
    await expect(calculator.getByRole('button', '9')).toBeHidden();
    await expect(calculator.getByText('81')).toBeVisible();

    await calculator.getByRole('button', 'Expand calculator').tap();
    await expect(calculator.getByRole('button', '9')).toBeVisible();
    await expect(calculator.getByText('81')).toBeVisible();
    await expect(calculator.getByRole('button', 'Minimize calculator')).toBeVisible();

    await calculator.getByRole('button', 'Close calculator').tap();
    await expect(calculator).toBeHidden();
  });

  test('calculator Keyboard shortcuts panel lists the Alt key bindings', { session: 'student' }, async ({ app, agent, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeInterruptions);
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();

    await screen.getByRole('button', 'Scientific Calculator').tap();
    const calculator = screen.getByRole('dialog', 'Scientific Calculator');
    const shortcuts = calculator.getByRole('button', 'Keyboard shortcuts');
    await shortcuts.tap();
    await expect(calculator.getByText('Alt+Shift+S')).toBeVisible();
    await expect(calculator.getByText('DEG/RAD')).toBeVisible();

    await shortcuts.tap();
    await expect(calculator.getByText('DEG/RAD')).toBeHidden();
  });

  test('calculator Alt+C inserts cos( without leaving the current page', { session: 'student' }, async ({ app, agent, screen, browser }) => {
    await app.open('/');
    await expect(screen.getByRole('button', 'Dashboard')).toBeVisible({ timeout: 45_000 });
    await agent.act(closeInterruptions);
    await expect(screen.getByRole('dialog', 'Initial Assessment')).toBeHidden();

    await screen.getByRole('button', 'Scientific Calculator').tap();
    const calculator = screen.getByRole('dialog', 'Scientific Calculator');
    await calculator.getByRole('button', '1').tap();
    await browser.keyboard.press('Alt+c');

    await expect(calculator.getByText('1cos(')).toBeVisible();
    await expect(browser).toHaveURL('/');
    await expect(screen.getByPlaceholder('Search conversations...')).toBeHidden();
    await expect(screen.getByRole('heading', greeting)).toBeVisible();
  });
});
