import { describe, test, type WebRoute } from '@e2e-dev/web';
import { expect } from 'e2e';

const ragWrites = /\/api\/(rag\/documents|admin\/reingest-pdf)/;
const contentWrites = /\/api\/admin\/(upload-pdf|delete-file)/;
const subjectsDirectory = /^Subjects Directory \(\d+\)$/;
const subjectButtonName = /\d+ files?\s*•\s*\d+ chunks$/;
const fileInventoryTab = /^File Inventory\s*\d+$/;
const fileRemoveButtonName = /^Remove (?!Subject$)/;
const sourceFilesLabel = /^Ingested Source Files \(\d+\)$/;
const pipelineStatus = /^(Online|Rebuilding)$/;
const dropZoneHeading = 'Drop PDF here or click to browse';
const samplePdf = 'datasets/curriculum/gen_math_sdo/SHS_GM_Q1_LAS1_LE1.pdf';
const noRagIndex = 'the RAG index has no subjects (or the backend is unreachable), so there is nothing to browse';

// The RAG index, Storage bucket and file inventory are shared production data: abort and record any write a test triggers.
// A failed delete-file call falls back to a direct Firestore delete the guard cannot see, so no test taps an inventory trash button.
const abortWrites = (attempts: string[]) => async (route: WebRoute) => {
  if (route.request.method === 'POST' || route.request.method === 'DELETE') {
    attempts.push(`${route.request.method} ${route.request.url}`);
    await route.abort();
    return;
  }
  await route.continue();
};

describe('admin content and RAG manager', { tags: ['admin', 'content-rag'] }, () => {
  test('RAG Manager shows the index stats and Refresh reloads the knowledge index', { session: 'admin' }, async ({ app, browser, screen }) => {
    const writes: string[] = [];
    await browser.route(ragWrites, abortWrites(writes));
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'AI & Intelligence' }).getByRole('button', 'RAG Manager').tap();
    await expect(screen.getByRole('heading', 'RAG Manager', { level: 1 })).toBeVisible();
    const refresh = screen.getByRole('button', 'Refresh');
    await expect(refresh).toBeEnabled({ timeout: 60_000 });

    for (const label of ['Indexed Sections', 'Active Subjects', 'Ingested Documents', 'RAG Pipeline Status']) {
      await expect(screen.getByText(label)).toBeVisible();
    }
    await expect(screen.getByRole('heading', pipelineStatus)).toBeVisible();
    test.skip(!(await screen.getByText(subjectsDirectory).isVisible()), noRagIndex);

    const [response] = await Promise.all([
      browser.waitForResponse('**/api/rag/documents'),
      refresh.tap(),
    ]);
    expect(response.status).toBe(200);
    await expect(refresh).toBeEnabled({ timeout: 60_000 });
    await expect(screen.getByText(subjectsDirectory)).toBeVisible();
    await expect(screen.getByRole('button', subjectButtonName).first()).toBeVisible();
    expect(writes).toEqual([]);
  });

  test('RAG search narrows the subject directory to no matches and clearing restores it', { session: 'admin' }, async ({ app, browser, screen }) => {
    const writes: string[] = [];
    await browser.route(ragWrites, abortWrites(writes));
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'AI & Intelligence' }).getByRole('button', 'RAG Manager').tap();
    await expect(screen.getByRole('heading', 'RAG Manager', { level: 1 })).toBeVisible();
    await expect(screen.getByRole('button', 'Refresh')).toBeEnabled({ timeout: 60_000 });
    const directory = screen.getByText(subjectsDirectory);
    test.skip(!(await directory.isVisible()), noRagIndex);
    const directoryBefore = (await directory.textContent()) ?? '';

    const search = screen.getByPlaceholder('Search subjects or document sources...');
    await search.fill('zz-no-such-source-e2e');
    await expect(screen.getByText(/^Subjects Directory \(0\)$/)).toBeVisible();
    await expect(screen.getByText(/^No subjects match/)).toBeVisible();
    await expect(screen.getByRole('button', subjectButtonName)).toHaveCount(0);

    await search.clear();
    await expect(directory).toHaveText(directoryBefore);
    await expect(screen.getByRole('button', subjectButtonName).first()).toBeVisible();
    expect(writes).toEqual([]);
  });

  test('Split View lists a subject\'s source files and Accordion lists a panel for every subject', { session: 'admin' }, async ({ app, browser, screen }) => {
    const writes: string[] = [];
    await browser.route(ragWrites, abortWrites(writes));
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'AI & Intelligence' }).getByRole('button', 'RAG Manager').tap();
    await expect(screen.getByRole('heading', 'RAG Manager', { level: 1 })).toBeVisible();
    await expect(screen.getByRole('button', 'Refresh')).toBeEnabled({ timeout: 60_000 });
    const directory = screen.getByText(subjectsDirectory);
    test.skip(!(await directory.isVisible()), noRagIndex);
    const subjectTotal = Number((await directory.textContent())?.match(/\((\d+)\)/)?.[1] ?? 0);

    await expect(screen.getByText('Select a subject from the directory to view its file inventory.')).toBeVisible();
    await screen.getByRole('button', subjectButtonName).first().tap();
    await expect(screen.getByRole('button', 'Remove Subject')).toBeVisible();
    await expect(screen.getByText('Active RAG')).toBeVisible();
    await expect(screen.getByText(sourceFilesLabel)).toBeVisible();
    await expect(screen.getByRole('button', fileRemoveButtonName).first()).toBeVisible();

    await screen.getByRole('button', 'Accordion').tap();
    await expect(screen.getByRole('button', 'Remove Subject')).toBeHidden();
    await expect(screen.getByText(/^\d+ sections$/).first()).toBeVisible();
    await expect(screen.getByRole('button', 'Remove')).toHaveCount(subjectTotal);

    await screen.getByRole('button', 'Split View').tap();
    await expect(screen.getByRole('button', 'Remove Subject')).toBeVisible();
    expect(writes).toEqual([]);
  });

  test('an Accordion panel collapses on the first tap of its header and expands on the second', { session: 'admin', tags: ['known-bug'] }, async ({ app, browser, screen }) => {
    const writes: string[] = [];
    await browser.route(ragWrites, abortWrites(writes));
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'AI & Intelligence' }).getByRole('button', 'RAG Manager').tap();
    await expect(screen.getByRole('heading', 'RAG Manager', { level: 1 })).toBeVisible();
    await expect(screen.getByRole('button', 'Refresh')).toBeEnabled({ timeout: 60_000 });
    test.skip(!(await screen.getByText(subjectsDirectory).isVisible()), noRagIndex);

    await screen.getByRole('button', 'Accordion').tap();
    const sectionBadges = screen.getByText(/^\d+ sections$/);
    await expect(sectionBadges.first()).toBeVisible();
    const expandedCount = await sectionBadges.count();
    const firstPanelHeader = screen.getByText(/^\d+ files$/).first();

    await firstPanelHeader.tap();
    await expect.poll(() => sectionBadges.count()).toBeLessThan(expandedCount);
    await firstPanelHeader.tap();
    await expect.poll(() => sectionBadges.count()).toBe(expandedCount);
    expect(writes).toEqual([]);
  });

  test('Rebuild Knowledge asks for confirmation and Cancel starts nothing', { session: 'admin' }, async ({ app, browser, screen }) => {
    const writes: string[] = [];
    await browser.route(ragWrites, abortWrites(writes));
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'AI & Intelligence' }).getByRole('button', 'RAG Manager').tap();
    await expect(screen.getByRole('heading', 'RAG Manager', { level: 1 })).toBeVisible();
    await expect(screen.getByRole('button', 'Refresh')).toBeEnabled({ timeout: 60_000 });
    await expect(screen.getByRole('heading', pipelineStatus)).toBeVisible();
    test.skip(await screen.getByRole('heading', 'Rebuilding').isVisible(), 'a knowledge rebuild is already running, so Rebuild Knowledge is disabled');

    await screen.getByRole('button', 'Rebuild Knowledge').tap();
    const title = screen.getByRole('heading', 'Rebuild AI Knowledge?');
    await expect(title).toBeVisible();
    await expect(screen.getByText(/^This will start a remote re-ingestion from Firebase Storage/)).toBeVisible();
    await expect(screen.getByRole('button', 'Rebuild Knowledge')).toHaveCount(2);
    await screen.getByRole('button', 'Cancel').tap();
    await expect(title).toBeHidden();
    await expect(screen.getByRole('heading', 'Online')).toBeVisible();
    await expect(screen.getByText('AI Knowledge Rebuild in Progress...')).toBeHidden();
    expect(writes).toEqual([]);
  });

  test('Clear All asks to purge every vector and closing the dialog purges nothing', { session: 'admin' }, async ({ app, browser, screen }) => {
    const writes: string[] = [];
    await browser.route(ragWrites, abortWrites(writes));
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'AI & Intelligence' }).getByRole('button', 'RAG Manager').tap();
    await expect(screen.getByRole('heading', 'RAG Manager', { level: 1 })).toBeVisible();
    await expect(screen.getByRole('button', 'Refresh')).toBeEnabled({ timeout: 60_000 });

    await screen.getByRole('button', 'Clear All').tap();
    const title = screen.getByRole('heading', 'Purge All AI Knowledge?');
    await expect(title).toBeVisible();
    await expect(screen.getByText(/^This action will permanently delete ALL vector chunks/)).toBeVisible();
    await expect(screen.getByRole('button', 'Yes, Purge Everything')).toBeVisible();
    await screen.getByRole('button', 'Close dialog').tap();
    await expect(title).toBeHidden();
    await expect(screen.getByRole('button', 'Yes, Purge Everything')).toBeHidden();
    expect(writes).toEqual([]);
  });

  test('Remove Subject, a file\'s Remove button and the accordion Remove each confirm first and Cancel keeps the files', { session: 'admin' }, async ({ app, browser, screen }) => {
    const writes: string[] = [];
    await browser.route(ragWrites, abortWrites(writes));
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'AI & Intelligence' }).getByRole('button', 'RAG Manager').tap();
    await expect(screen.getByRole('heading', 'RAG Manager', { level: 1 })).toBeVisible();
    await expect(screen.getByRole('button', 'Refresh')).toBeEnabled({ timeout: 60_000 });
    test.skip(!(await screen.getByText(subjectsDirectory).isVisible()), noRagIndex);

    await screen.getByRole('button', subjectButtonName).first().tap();
    const filesLabel = screen.getByText(sourceFilesLabel);
    await expect(filesLabel).toBeVisible();
    const filesBefore = (await filesLabel.textContent()) ?? '';

    await screen.getByRole('button', 'Remove Subject').tap();
    const subjectTitle = screen.getByRole('heading', /^Remove Subject: .+\?$/);
    await expect(subjectTitle).toBeVisible();
    await expect(screen.getByText('This will remove all indexed sections and files associated with this subject from the RAG vector store.')).toBeVisible();
    await screen.getByRole('button', 'Cancel').tap();
    await expect(subjectTitle).toBeHidden();

    await screen.getByRole('button', fileRemoveButtonName).first().tap();
    const fileTitle = screen.getByRole('heading', 'Remove Document Source?');
    await expect(fileTitle).toBeVisible();
    await expect(screen.getByText(/^Are you sure you want to remove ".+" from the vector database\?$/)).toBeVisible();
    await expect(screen.getByRole('button', 'Remove File')).toBeVisible();
    await screen.getByRole('button', 'Cancel').tap();
    await expect(fileTitle).toBeHidden();
    await expect(filesLabel).toHaveText(filesBefore);

    await screen.getByRole('button', 'Accordion').tap();
    await screen.getByRole('button', 'Remove').first().tap();
    await expect(subjectTitle).toBeVisible();
    await screen.getByRole('button', 'Cancel').tap();
    await expect(subjectTitle).toBeHidden();
    expect(writes).toEqual([]);
  });

  test('Import Modules shows the upload form and Deploy Knowledge Source stays disabled without a PDF', { session: 'admin' }, async ({ app, browser, screen }) => {
    const writes: string[] = [];
    await browser.route(contentWrites, abortWrites(writes));
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Curriculum' }).getByRole('button', 'Content').tap();
    await expect(screen.getByRole('heading', 'Content', { level: 1 })).toBeVisible();
    await expect(screen.getByText('Upload PDFs for AI-powered content.')).toBeVisible();

    for (const label of ['Total Files in Inventory', 'Indexed AI Sections', 'Active Subjects']) {
      await expect(screen.getByText(label)).toBeVisible();
    }
    await expect(screen.getByRole('button', 'Import Modules')).toBeVisible();
    await expect(screen.getByRole('button', fileInventoryTab)).toBeVisible();
    await expect(screen.getByRole('heading', 'Learning Module Upload')).toBeVisible();
    await expect(screen.getByRole('heading', dropZoneHeading)).toBeVisible();
    for (const tile of ['Curriculum Alignment', 'Intelligent Retrieval', 'Neural Ingestion']) {
      await expect(screen.getByRole('heading', tile)).toBeVisible();
    }
    const deploy = screen.getByRole('button', 'Deploy Knowledge Source');
    await expect(deploy).toBeDisabled();

    await screen.getByRole('combobox').filter({ hasText: 'Select curriculum subject' }).tap();
    await screen.getByRole('option', /^General Mathematics/).tap();
    await expect(screen.getByPlaceholder('e.g. General Mathematics')).toHaveValue('General Mathematics');
    await expect(deploy).toBeDisabled();

    await screen.getByRole('combobox').filter({ hasText: 'First Quarter (Q1)' }).tap();
    await screen.getByRole('option', 'Second Quarter (Q2)').tap();
    await expect(screen.getByRole('combobox').filter({ hasText: 'Second Quarter (Q2)' })).toBeVisible();
    await expect(deploy).toBeDisabled();
    expect(writes).toEqual([]);
  });

  test('Import Modules rejects a non-PDF, shows a chosen PDF and Remove clears it without uploading', { session: 'admin' }, async ({ app, browser, screen }) => {
    const writes: string[] = [];
    await browser.route(contentWrites, abortWrites(writes));
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Curriculum' }).getByRole('button', 'Content').tap();
    await expect(screen.getByRole('heading', 'Content', { level: 1 })).toBeVisible();
    await expect(screen.getByRole('heading', dropZoneHeading)).toBeVisible();
    const fileInput = browser.locator('input[type="file"][accept=".pdf"]');

    await fileInput.setInputFiles('package.json');
    await expect(screen.getByText('Only PDF files are allowed')).toBeVisible();
    await expect(screen.getByRole('heading', dropZoneHeading)).toBeVisible();

    await fileInput.setInputFiles(samplePdf);
    await expect(screen.getByText('SHS_GM_Q1_LAS1_LE1.pdf')).toBeVisible();
    await expect(screen.getByText('PDF Document')).toBeVisible();
    await expect(screen.getByRole('heading', dropZoneHeading)).toBeHidden();
    await expect(screen.getByRole('button', 'Deploy Knowledge Source')).toBeDisabled();

    await screen.getByRole('button', 'Remove').tap();
    await expect(screen.getByRole('heading', dropZoneHeading)).toBeVisible();
    await expect(screen.getByText('SHS_GM_Q1_LAS1_LE1.pdf')).toBeHidden();
    expect(writes).toEqual([]);
  });

  test('File Inventory search, type filter and Refresh narrow and reload the list without deleting anything', { session: 'admin' }, async ({ app, browser, screen }) => {
    const writes: string[] = [];
    await browser.route(contentWrites, abortWrites(writes));
    await app.open('/');
    await expect(screen.getByRole('heading', 'Admin Dashboard')).toBeVisible({ timeout: 45_000 });
    await screen.getByRole('navigation').filter({ hasText: 'Curriculum' }).getByRole('button', 'Content').tap();
    await expect(screen.getByRole('heading', 'Content', { level: 1 })).toBeVisible();

    await screen.getByRole('button', fileInventoryTab).tap();
    const refresh = screen.getByRole('button', 'Refresh');
    await expect(refresh).toBeEnabled({ timeout: 45_000 });
    for (const column of ['File Name', 'Uploaded By', 'Type', 'Date', 'Actions']) {
      await expect(screen.getByRole('columnheader', column)).toBeVisible();
    }
    await refresh.tap();
    await expect(refresh).toBeEnabled({ timeout: 45_000 });

    const search = screen.getByPlaceholder('Search files by name, uploader, or class...');
    await search.fill('zz-no-such-file-e2e');
    await expect(screen.getByText('No uploaded files found')).toBeVisible();
    await expect(screen.getByRole('button', /^Delete /)).toHaveCount(0);
    await screen.getByRole('button', 'Clear inventory search').tap();
    await expect(search).toHaveValue('');
    await expect(screen.getByRole('button', 'Clear inventory search')).toBeHidden();

    await screen.getByRole('combobox').filter({ hasText: 'All Types' }).tap();
    await screen.getByRole('option', 'CSV Records').tap();
    const csvFilter = screen.getByRole('combobox').filter({ hasText: 'CSV Records' });
    await expect(csvFilter).toBeVisible();
    await expect(screen.getByRole('cell', /^(pdf|xlsx)$/i)).toHaveCount(0);
    await csvFilter.tap();
    await screen.getByRole('option', 'All Types').tap();
    await expect(screen.getByRole('combobox').filter({ hasText: 'All Types' })).toBeVisible();
    expect(writes).toEqual([]);
  });
});
