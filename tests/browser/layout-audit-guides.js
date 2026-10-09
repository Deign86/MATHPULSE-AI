// Walks page guides in the real, signed-in app inside the layout-audit frame (dev only).
// Load in the audit page after layout-audit.js:
//   await import('/tests/browser/layout-audit-guides.js')
//   __guideRun([[844, 390], [1024, 768]], ['Dashboard', 'Modules'])        // student (routes)
//   __guideRun([[844, 390]], ['Overview', 'User Management'], 'role')      // teacher/admin (profile menu)
// Progress and results: window.__guideState; results also go to localStorage `tour:<W>x<H>:<label>`.
// Flags per step mirror tests/browser/student-tour-smoke.mjs: card-offscreen, small-button,
// NO-SPOTLIGHT, HEADER-SHIFTED, order, and OVERLAP only when the card had room beside the
// highlight. text-scrolls (only the explanation scrolls) is how short screens are meant to work.
// Never include Quiz Battle on a real account: opening it resumes an unfinished match.

const sleep = ms => new Promise(resolve => {
  const end = performance.now() + ms;
  const { port1, port2 } = new MessageChannel();
  port1.onmessage = () => {
    if (performance.now() >= end) { port1.close(); resolve(); } else port2.postMessage(0);
  };
  port2.postMessage(0);
});

const view = () => window.__frameWin();
const page = () => view().document;

const anchorName = element => {
  const anchor = element?.closest('[data-tour],[data-tour-nav],[data-tour-group],[aria-label]');
  if (!anchor) return element ? element.tagName.toLowerCase() : 'none';
  for (const key of ['data-tour', 'data-tour-nav', 'data-tour-group', 'aria-label']) if (anchor.hasAttribute(key)) return anchor.getAttribute(key);
  return 'none';
};

async function waitFor(check, tries = 60, interval = 250) {
  for (let i = 0; i < tries; i++) {
    if (check()) return true;
    await sleep(interval);
  }
  return Boolean(check());
}

/** Checks the open guide step by step, pressing Continue until Finish; returns one line per step. */
async function walk() {
  const rows = [];
  let last = 0;
  for (let i = 0; i < 120; i++) {
    await sleep(600);
    await waitFor(() => page().querySelector('[data-tour-dialog]')?.getAttribute('aria-busy') === 'false', 100, 150);
    await sleep(500);
    const dialog = page().querySelector('[data-tour-dialog]');
    if (!dialog) break;
    const width = view().innerWidth;
    const height = view().innerHeight;
    const step = Number(dialog.getAttribute('data-tour-step'));
    const card = dialog.getBoundingClientRect();
    const spot = page().querySelector('[data-tour-overlay] rect[stroke]')?.getBoundingClientRect();
    const issues = [];
    if (step <= last) issues.push('order');
    last = step;
    if (card.left < 0 || card.top < 0 || card.right > width + 1 || card.bottom > height + 1) issues.push('card-offscreen');
    const header = [...page().querySelectorAll('header')].find(element => !element.hasAttribute('data-tour'));
    if (header && Math.abs(header.getBoundingClientRect().top) > 1) issues.push('HEADER-SHIFTED');
    let under = 'none';
    if (!spot) issues.push('NO-SPOTLIGHT');
    else {
      const overlaps = Math.min(card.right, spot.right) - Math.max(card.left, spot.left) > 1 && Math.min(card.bottom, spot.bottom) - Math.max(card.top, spot.top) > 1;
      const roomBeside = Math.max(spot.top - 32, height - spot.bottom - 32) >= card.height || Math.max(spot.left - 32, width - spot.right - 32) >= card.width;
      if (overlaps && roomBeside) issues.push('OVERLAP');
      const body = page().body;
      const previous = body.style.pointerEvents;
      body.style.pointerEvents = 'auto';
      under = anchorName(page().elementsFromPoint(spot.left + spot.width / 2, spot.top + Math.min(spot.height / 2, 30)).find(element => !element.closest('[data-tour-overlay],[data-tour-dialog]')));
      body.style.pointerEvents = previous;
    }
    const copy = dialog.querySelector('[data-tour-copy]');
    if (copy && copy.scrollHeight > copy.clientHeight + 2) issues.push('text-scrolls');
    if ([...dialog.querySelectorAll('button')].some(button => button.getBoundingClientRect().height < 43.5)) issues.push('small-button');
    rows.push(`${step}:${under}${issues.length ? ` <<${issues.join(',')}` : ''}`);
    const next = [...dialog.querySelectorAll('button')].find(button => /Continue|Finish tour/.test(button.textContent));
    if (!next) break;
    next.click();
    if (/Finish/.test(next.textContent)) break;
  }
  await waitFor(() => !page().querySelector('[data-tour-dialog]'), 20);
  rows.push(page().querySelector('[data-tour-dialog]') ? '(guide still open)' : '(closed)');
  return rows.join(' · ');
}

/** Student Settings is a route; teacher and admin Settings open from the profile menu. */
async function openSettings(role) {
  if (!role) {
    await window.__load('/settings', view().innerWidth, view().innerHeight);
  } else if (!page().querySelector('[aria-label="Page guides"]')) {
    const result = await window.__menu('Settings');
    if (result.startsWith('no ')) return false;
  }
  return waitFor(() => page().querySelector('[aria-label="Page guides"]'));
}

window.__guideRun = (sizes, labels, role = '') => {
  window.__guideState = { done: 0, total: sizes.length * labels.length, current: null, results: {} };
  (async () => {
    for (const [width, height] of sizes) {
      // Teacher and admin Settings open from the profile menu, so the app must already be running.
      if (role && !page().querySelector('[data-tour-nav]')) await window.__load('/', width, height);
      await window.__size(width, height, 1500);
      for (const label of labels) {
        const key = `${width}x${height}:${label}`;
        window.__guideState.current = key;
        let text;
        try {
          if (!(await openSettings(role))) throw new Error('Settings not reached');
          await sleep(1200);
          const button = [...page().querySelector('[aria-label="Page guides"]').querySelectorAll('button')].find(element => element.textContent.trim() === label);
          if (!button) throw new Error(`no guide button "${label}"`);
          button.click();
          await sleep(400);
          text = await walk();
        } catch (error) {
          text = `error: ${error.message}`;
        }
        window.__guideState.results[key] = text;
        try { localStorage.setItem(`tour:${key}`, text); } catch { /* quota */ }
        window.__guideState.done++;
        await sleep(1500);
      }
    }
    window.__guideState.current = 'finished';
  })();
  return 'started';
};
