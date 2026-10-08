import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

const auditFooter = /^Showing \d+–\d+ of \d+ events$/;
const inspectButtonName = /^View details for/;
const missingEventQuery = 'zz-no-such-event-e2e';
const emptyAuditMessage = 'No audit events match current criteria';
const chartSurface = 'svg.recharts-surface';

describe('admin analytics and audit log', { tags: ['admin', 'analytics-audit'] }, () => {
  test('Analytics shows KPI cards and outcome charts, and Refresh platform telemetry reloads them', { session: 'admin' }, async ({ app, browser, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Insights & Security' }).getByRole('button', 'Analytics').tap();
    await expect(screen.getByRole('heading', 'Analytics', { level: 1 })).toBeVisible();
    const refresh = screen.getByRole('button', 'Refresh platform telemetry');
    await expect(refresh).toBeEnabled({ timeout: 45_000 });

    await expect(screen.getByText('Realtime Telemetry')).toBeVisible();
    for (const title of ['Active Learners', 'Mastery Average', 'Quizzes Taken', 'At-Risk Students']) {
      await expect(screen.getByText(title)).toBeVisible();
    }
    await expect(screen.getByText(/^\d+ students with quiz activity • 30D$/)).toBeVisible();
    await expect(screen.getByRole('heading', 'Average Quiz Score by Range')).toBeVisible();
    await expect(screen.getByRole('heading', 'Mastery Cohorts')).toBeVisible();
    await expect(screen.getByText('Pass Rate')).toBeVisible();
    await expect(browser.locator(chartSurface)).toHaveCount(2);

    await refresh.tap();
    await expect(refresh).toBeEnabled({ timeout: 45_000 });
    await expect(screen.getByText(/^\d+ students with quiz activity • 30D$/)).toBeVisible();
    await expect(browser.locator(chartSurface)).toHaveCount(2);
  });

  test('time range pills relabel the KPIs and the sub-tabs show the curriculum and engagement panels', { session: 'admin' }, async ({ app, browser, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Insights & Security' }).getByRole('button', 'Analytics').tap();
    await expect(screen.getByRole('heading', 'Analytics', { level: 1 })).toBeVisible();
    const refresh = screen.getByRole('button', 'Refresh platform telemetry');
    await expect(refresh).toBeEnabled({ timeout: 45_000 });

    for (const range of ['7D', '90D', 'ALL', '30D']) {
      await screen.getByRole('button', range).tap();
      await expect(screen.getByText(new RegExp(`^\\d+ students with quiz activity • ${range}$`))).toBeVisible();
      await expect(refresh).toBeEnabled({ timeout: 45_000 });
    }

    await screen.getByRole('button', 'Curriculum & Subject Health').tap();
    await expect(screen.getByRole('heading', 'Curriculum & Subject Performance Matrix')).toBeVisible();
    for (const column of ['Subject', 'Enrolled', 'Quiz Submissions', 'Average Score', 'Curriculum Completion', 'Mastery Status']) {
      await expect(screen.getByRole('columnheader', column)).toBeVisible();
    }
    await expect(screen.getByRole('heading', 'Mastery Cohorts')).toBeHidden();

    await screen.getByRole('button', 'Engagement & Leaderboards').tap();
    await expect(screen.getByRole('heading', 'Gamification & Retention Drivers')).toBeVisible();
    await expect(screen.getByRole('heading', 'Top Performing STEM Classes')).toBeVisible();
    await expect(screen.getByRole('heading', 'Weekly Study Activity Trends')).toBeVisible();
    for (const label of ['Achievements Unlocked', 'Platform XP Earned', 'Active Streaks']) {
      await expect(screen.getByText(label)).toBeVisible();
    }
    await expect(browser.locator(chartSurface)).toHaveCount(1);

    await screen.getByRole('button', 'Learning Outcomes & Trajectory').tap();
    await expect(screen.getByRole('heading', 'Mastery Cohorts')).toBeVisible();
    await expect(browser.locator(chartSurface)).toHaveCount(2);
  });

  test('Export Report downloads the analytics CSV named for the selected range', { session: 'admin' }, async ({ app, browser, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Insights & Security' }).getByRole('button', 'Analytics').tap();
    await expect(screen.getByRole('heading', 'Analytics', { level: 1 })).toBeVisible();
    const exportReport = screen.getByRole('button', 'Export Report');
    await expect(exportReport).toBeEnabled({ timeout: 45_000 });

    const monthReport = await browser.waitForDownload(() => exportReport.tap());
    expect(monthReport.suggestedFilename).toMatch(/^MathPulse_Analytics_30d_\d{4}-\d{2}-\d{2}\.csv$/);

    await screen.getByRole('button', '7D').tap();
    await expect(exportReport).toBeEnabled({ timeout: 45_000 });
    const weekReport = await browser.waitForDownload(() => exportReport.tap());
    expect(weekReport.suggestedFilename).toMatch(/^MathPulse_Analytics_7d_\d{4}-\d{2}-\d{2}\.csv$/);
  });

  test('Manage Sections on Top Performing STEM Classes opens Class Management', { session: 'admin', tags: ['known-bug'] }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Insights & Security' }).getByRole('button', 'Analytics').tap();
    await expect(screen.getByRole('heading', 'Analytics', { level: 1 })).toBeVisible();
    await screen.getByRole('button', 'Engagement & Leaderboards').tap();
    await expect(screen.getByRole('heading', 'Top Performing STEM Classes')).toBeVisible();

    await screen.getByText('Manage Sections').tap();
    await expect(screen.getByRole('heading', 'Class Management', { level: 1 })).toBeVisible();
  });

  test('Audit Log shows KPI cards and the event table, and Refresh logs and Synchronize logs reload it', { session: 'admin' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Insights & Security' }).getByRole('button', 'Audit Log').tap();
    await expect(screen.getByRole('heading', 'Audit Log', { level: 1 })).toBeVisible();
    const refreshLogs = screen.getByRole('button', 'Refresh logs');
    const synchronizeLogs = screen.getByRole('button', 'Synchronize logs');
    await expect(refreshLogs).toBeEnabled({ timeout: 45_000 });

    await expect(screen.getByText('Audit Pipeline Active')).toBeVisible();
    await expect(screen.getByText(/^Tracking \d+ recorded administrative events$/)).toBeVisible();
    for (const title of ['Total Audit Events', 'Security & Warnings', 'Admin Operations', 'Platform Integrity']) {
      await expect(screen.getByText(title)).toBeVisible();
    }
    for (const column of ['Severity', 'Timestamp', 'Actor', 'Action & Details', 'Component', 'Inspect']) {
      await expect(screen.getByRole('columnheader', column)).toBeVisible();
    }
    await expect(screen.getByText(auditFooter)).toBeVisible();

    await refreshLogs.tap();
    await expect(refreshLogs).toBeEnabled({ timeout: 45_000 });
    await expect(screen.getByText(auditFooter)).toBeVisible();
    await synchronizeLogs.tap();
    await expect(synchronizeLogs).toBeEnabled({ timeout: 45_000 });
    await expect(screen.getByText(auditFooter)).toBeVisible();
  });

  test('audit search with no matches shows the empty state, and Clear search and Reset Filters restore the list', { session: 'admin' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Insights & Security' }).getByRole('button', 'Audit Log').tap();
    await expect(screen.getByRole('heading', 'Audit Log', { level: 1 })).toBeVisible();
    await expect(screen.getByRole('button', 'Refresh logs')).toBeEnabled({ timeout: 45_000 });
    const footer = screen.getByText(auditFooter);
    const footerBefore = (await footer.textContent()) ?? '';

    const search = screen.getByPlaceholder('Search actor, action, or event details…');
    await search.fill(missingEventQuery);
    await expect(screen.getByText(emptyAuditMessage, { visible: true })).toBeVisible();
    await expect(footer).toHaveText('Showing 0–0 of 0 events');
    await expect(screen.getByText('Filtered View')).toBeVisible();
    await expect(screen.getByRole('button', inspectButtonName)).toHaveCount(0);

    await screen.getByRole('button', 'Clear search').tap();
    await expect(search).toHaveValue('');
    await expect(footer).toHaveText(footerBefore);
    await expect(screen.getByText('Filtered View')).toBeHidden();

    await search.fill(missingEventQuery);
    await expect(footer).toHaveText('Showing 0–0 of 0 events');
    await screen.getByRole('button', 'Reset Filters').tap();
    await expect(search).toHaveValue('');
    await expect(footer).toHaveText(footerBefore);
    await expect(screen.getByRole('button', 'Reset Filters')).toBeHidden();
  });

  test('Severity, Category and Role filters narrow the events and Reset Filters clears all three', { session: 'admin' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Insights & Security' }).getByRole('button', 'Audit Log').tap();
    await expect(screen.getByRole('heading', 'Audit Log', { level: 1 })).toBeVisible();
    await expect(screen.getByRole('button', 'Refresh logs')).toBeEnabled({ timeout: 45_000 });
    const footer = screen.getByText(auditFooter);
    const footerBefore = (await footer.textContent()) ?? '';
    const eventTotal = async () => Number((await footer.textContent())?.match(/of (\d+) events/)?.[1] ?? 0);
    const totalBefore = await eventTotal();

    await screen.getByRole('combobox').filter({ hasText: 'All Severities' }).tap();
    await screen.getByRole('option', 'Information').tap();
    await expect(screen.getByRole('combobox').filter({ hasText: 'Information' })).toBeVisible();
    await expect(screen.getByRole('cell', /^(Warning|Error|Critical)$/)).toHaveCount(0);
    await expect(screen.getByText('Filtered View')).toBeVisible();
    await expect.poll(eventTotal).toBeLessThanOrEqual(totalBefore);

    await screen.getByRole('combobox').filter({ hasText: 'All Categories' }).tap();
    await screen.getByRole('option', 'Authentication').tap();
    await expect(screen.getByRole('combobox').filter({ hasText: 'Authentication' })).toBeVisible();
    await expect(screen.getByRole('cell', /^(System|Data|User|Content)$/)).toHaveCount(0);

    await screen.getByRole('combobox').filter({ hasText: 'All Roles' }).tap();
    await screen.getByRole('option', 'Administrator').tap();
    await expect(screen.getByRole('combobox').filter({ hasText: 'Administrator' })).toBeVisible();
    await expect.poll(eventTotal).toBeLessThanOrEqual(totalBefore);

    await screen.getByRole('button', 'Reset Filters').tap();
    for (const label of ['All Categories', 'All Severities', 'All Roles']) {
      await expect(screen.getByRole('combobox').filter({ hasText: label })).toBeVisible();
    }
    await expect(screen.getByText('Filtered View')).toBeHidden();
    await expect(footer).toHaveText(footerBefore);
  });

  test('page size and Previous/Next page through the audit events', { session: 'admin' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Insights & Security' }).getByRole('button', 'Audit Log').tap();
    await expect(screen.getByRole('heading', 'Audit Log', { level: 1 })).toBeVisible();
    await expect(screen.getByRole('button', 'Refresh logs')).toBeEnabled({ timeout: 45_000 });
    const footer = screen.getByText(auditFooter);
    const previous = screen.getByRole('button', 'Previous page');
    const next = screen.getByRole('button', 'Next page');
    await expect(previous).toBeDisabled();

    await screen.getByRole('combobox').filter({ hasText: '25 / page' }).tap();
    await screen.getByRole('option', '10 / page').tap();
    await expect(screen.getByRole('combobox').filter({ hasText: '10 / page' })).toBeVisible();
    await expect(footer).toHaveText(/^Showing (0–0|1–([1-9]|10)) of \d+ events$/);
    await expect(screen.getByText(/^1 \/ \d+$/)).toBeVisible();
    const total = Number((await footer.textContent())?.match(/of (\d+) events/)?.[1] ?? 0);
    test.skip(total <= 10, 'ten or fewer audit events, so there is no second page');

    await next.tap();
    await expect(footer).toHaveText(new RegExp(`^Showing 11–\\d+ of ${total} events$`));
    await expect(screen.getByText(/^2 \/ \d+$/)).toBeVisible();
    await expect(previous).toBeEnabled();
    await previous.tap();
    await expect(footer).toHaveText(`Showing 1–10 of ${total} events`);
    await expect(previous).toBeDisabled();
  });

  test('Inspect opens the audit event detail dialog, which Close and Escape dismiss', { session: 'admin' }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Insights & Security' }).getByRole('button', 'Audit Log').tap();
    await expect(screen.getByRole('heading', 'Audit Log', { level: 1 })).toBeVisible();
    await expect(screen.getByRole('button', 'Refresh logs')).toBeEnabled({ timeout: 45_000 });
    const inspect = screen.getByRole('button', inspectButtonName).first();
    test.skip(!(await inspect.isVisible()), 'the audit trail has no events to inspect');

    await inspect.tap();
    const details = screen.getByRole('dialog');
    await expect(details).toBeVisible();
    await expect(details.getByText('Complete audit event record and execution payload')).toBeVisible();
    await expect(details.getByText('Action & Payload Details')).toBeVisible();
    await expect(details.getByRole('button', 'Copy Details')).toBeVisible();
    await details.getByRole('button', 'Close').first().tap();
    await expect(details).toBeHidden();

    await inspect.tap();
    await expect(details).toBeVisible();
    await details.press('Escape');
    await expect(details).toBeHidden();
  });

  test('Export CSV downloads the audit log', { session: 'admin' }, async ({ app, browser, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Insights & Security' }).getByRole('button', 'Audit Log').tap();
    await expect(screen.getByRole('heading', 'Audit Log', { level: 1 })).toBeVisible();
    await expect(screen.getByRole('button', 'Refresh logs')).toBeEnabled({ timeout: 45_000 });
    const exportCsv = screen.getByRole('button', 'Export CSV');
    test.skip(await exportCsv.isDisabled(), 'the audit trail has no events, so Export CSV is disabled');

    const auditExport = await browser.waitForDownload(() => exportCsv.tap());
    expect(auditExport.suggestedFilename).toMatch(/^MathPulse_AuditLogs_\d{4}-\d{2}-\d{2}\.csv$/);
    await expect(screen.getByText('Audit log exported successfully')).toBeVisible();
  });

  test('the filter-toolbar Export button has an accessible name', { session: 'admin', tags: ['known-bug'] }, async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Insights & Security' }).getByRole('button', 'Audit Log').tap();
    await expect(screen.getByRole('heading', 'Audit Log', { level: 1 })).toBeVisible();
    await expect(screen.getByRole('button', 'Refresh logs')).toBeEnabled({ timeout: 45_000 });

    await expect(screen.getByRole('button', 'Export')).toBeVisible();
  });
});
