// Responsive layout audit for the real, signed-in app (dev only; never bundled).
// Usage (docs/responsive-layout-guide.md): sign in on the dev server, open
// /tests/browser/layout-audit.html on that origin, then in the console:
//   __runPlan([{ label: 'Grades', load: '/grades' }, { label: 'Users', nav: 'User Management' }])
//   __sum('Grades')
// The app runs in a same-origin iframe sized to each test viewport, so media queries, container
// queries, ResizeObservers and JS breakpoints react exactly as on a device of that size.

// Message-loop sleep: background panes throttle setTimeout to ~1 s steps; message tasks are not.
const sleep = ms => new Promise(resolve => {
  const end = performance.now() + ms;
  const { port1, port2 } = new MessageChannel();
  port1.onmessage = () => {
    if (performance.now() >= end) { port1.close(); resolve(); } else port2.postMessage(0);
  };
  port2.postMessage(0);
});

export const SIZES = [
  ['xs', 320, 568], ['phone', 390, 844], ['land', 844, 390], ['tab', 768, 1024],
  ['tabL', 1024, 768], ['lap', 1280, 800], ['desk', 1440, 900], ['wide', 1920, 1080],
];

const INTERACTIVE = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=tab],[role=menuitem],[role=switch],[role=checkbox],[role=radio],[role=option],[role=link],[role=slider]';

// Student routes and the tab each renders (App.tsx pathToTab), so loads wait for the right page.
const STUDENT_TABS = { '/': 'Dashboard', '/modules': 'Modules', '/chat': 'AI Chat', '/assessment': 'Assessment', '/leaderboard': 'Leaderboard', '/grades': 'Grades', '/avatar': 'Avatar Studio', '/profile': 'Profile', '/rewards': 'Rewards', '/settings': 'Settings' };

function frame() {
  let element = document.getElementById('audit-frame');
  if (!element) {
    element = document.createElement('iframe');
    element.id = 'audit-frame';
    element.style.cssText = 'position:absolute;top:0;left:0;border:0;background:#fff;width:1440px;height:900px';
    document.body.appendChild(element);
  }
  return element;
}
// Without a frame (headless runs that size the real viewport), audit the page itself.
const win = () => document.getElementById('audit-frame')?.contentWindow ?? window;
const doc = () => win().document;

window.__size = async (width, height, settle = 900) => {
  const element = frame();
  element.style.width = `${width}px`;
  element.style.height = `${height}px`;
  await sleep(settle);
  return [win().innerWidth, win().innerHeight];
};

// The app boots once from layout-audit-frame.html (keeps animation frames running while the pane
// is hidden), then routes with pushState + popstate like in-app navigation.
window.__load = async (path, width = 1440, height = 900) => {
  const element = frame();
  element.style.width = `${width}px`;
  element.style.height = `${height}px`;
  if (element.dataset.app !== 'ready') {
    await new Promise(resolve => { element.onload = resolve; element.src = '/tests/browser/layout-audit-frame.html'; });
    element.dataset.app = 'ready';
    element.addEventListener('load', () => { element.dataset.app = 'reloaded'; }, { once: true });
  }
  const view = element.contentWindow;
  if (view.location.pathname !== path) {
    view.history.pushState({}, '', path);
    view.dispatchEvent(new view.PopStateEvent('popstate'));
  }
  const expected = STUDENT_TABS[path];
  for (let i = 0; i < 120; i++) {
    const page = doc();
    const pages = [...(page?.querySelectorAll('[data-tour-page]') ?? [])];
    // Student pages: exactly one page, the expected one, fully faded in. Teacher/admin shells have
    // no page markers; their navigation is enough once it has been up for ~2 s.
    const settled = pages.length
      ? pages.length === 1 && pages[0].getAttribute('data-tour-page') === expected && Number(win().getComputedStyle(pages[0]).opacity) > 0.98
      : Boolean(page?.querySelector('[data-tour-nav]')) && i > 8;
    if (settled && !page.querySelector('input[type=password]')) break;
    await sleep(250);
  }
  await sleep(2500);
  return pageName();
};

function pageName() {
  const page = doc();
  const tab = page.querySelector('[data-tour-page]')?.getAttribute('data-tour-page');
  const heading = page.querySelector('main h1, main h2, h1')?.textContent?.trim().replace(/\s+/g, ' ').slice(0, 50);
  return tab ? `${tab} (${heading ?? ''})` : heading ?? page.title;
}

let opaque = new WeakMap();
const isOpaque = node => {
  if (!node || node.nodeType !== 1) return true;
  if (opaque.has(node)) return opaque.get(node);
  const visible = Number(win().getComputedStyle(node).opacity) >= 0.05 && isOpaque(node.parentElement);
  opaque.set(node, visible);
  return visible;
};
const isVisible = element => {
  const rect = element.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return false;
  return win().getComputedStyle(element).visibility !== 'hidden' && isOpaque(element);
};

const describe = element => {
  if (!element || element.nodeType !== 1) return String(element);
  const tour = element.closest('[data-tour]')?.getAttribute('data-tour');
  const own = element.getAttribute('aria-label') || element.getAttribute('title') || (element.innerText || element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 36) || element.getAttribute('placeholder') || '';
  return `${element.tagName.toLowerCase()}${own ? ` "${own}"` : ''}${tour ? ` @${tour}` : ''}`;
};

const ownText = element => [...element.childNodes].some(node => node.nodeType === 3 && node.textContent.trim().length > 1);

function pinnedAncestor(element) {
  const view = win();
  for (let node = element; node && node.nodeType === 1; node = node.parentElement) {
    const position = view.getComputedStyle(node).position;
    if (position === 'fixed' || position === 'sticky') return node;
  }
  return null;
}

/**
 * Returns how the element is cut off, or null. Walks every clipping ancestor: a box that scrolls on
 * that axis makes the element reachable, so from there up only the scroller's own box matters; a box
 * that clips without scrolling cuts whatever part lies outside it (the viewport counts when the
 * document cannot scroll, and for fixed containers). Elements clipped away entirely are assumed
 * intentional (collapsed panels, off-screen slides) and ignored.
 */
function cutOff(element) {
  const view = win();
  const rect = element.getBoundingClientRect();
  const partial = ([start, end], boxStart, boxEnd) => (end > boxEnd + 1.5 && start < boxEnd - 1) || (start < boxStart - 1.5 && end > boxStart + 1);
  let x = [rect.left, rect.right];
  let y = [rect.top, rect.bottom];
  const cuts = [];
  const clip = (axis, span, boxStart, boxEnd, by) => {
    if (partial(span, boxStart, boxEnd) && !cuts.some(cut => cut.startsWith(axis))) cuts.push(`${axis} by ${by}`);
    return [Math.max(span[0], boxStart), Math.min(span[1], boxEnd)];
  };
  for (let node = element.parentElement; node && node !== doc().documentElement; node = node.parentElement) {
    const style = view.getComputedStyle(node);
    const box = node.getBoundingClientRect();
    const by = describe(node).slice(0, 28);
    if (style.overflowX !== 'visible') {
      if (/(auto|scroll)/.test(style.overflowX) && node.scrollWidth > node.clientWidth + 1) x = [box.left, box.right];
      else x = clip('x', x, box.left, box.right, by);
    }
    if (style.overflowY !== 'visible') {
      if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) y = [box.top, box.bottom];
      else y = clip('y', y, box.top, box.bottom, by);
    }
    if (x[1] - x[0] < 1 || y[1] - y[0] < 1) return cuts.length ? cuts.join(', ') : null;
    if (style.position === 'fixed') {
      x = clip('x', x, 0, view.innerWidth, 'viewport(fixed)');
      y = clip('y', y, 0, view.innerHeight, 'viewport(fixed)');
      return cuts.length ? cuts.join(', ') : null;
    }
  }
  const root = doc().scrollingElement;
  if (root.scrollWidth <= view.innerWidth + 1) x = clip('x', x, 0, view.innerWidth, 'viewport');
  if (root.scrollHeight <= view.innerHeight + 1) y = clip('y', y, 0, view.innerHeight, 'viewport');
  return cuts.length ? cuts.join(', ') : null;
}

function scrollContainers() {
  const view = win();
  return [...doc().querySelectorAll('body *')].filter(element => {
    const style = view.getComputedStyle(element);
    return /(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 4 && element.clientHeight > 120 && isVisible(element);
  }).concat(doc().scrollingElement.scrollHeight > view.innerHeight + 4 ? [doc().scrollingElement] : []);
}

/** The part of the viewport where the element can show: viewport ∩ every clipping ancestor. */
function shownBox(element) {
  const view = win();
  let box = { left: 0, top: 0, right: view.innerWidth, bottom: view.innerHeight };
  for (let node = element.parentElement; node && node !== doc().documentElement; node = node.parentElement) {
    const style = view.getComputedStyle(node);
    if (style.overflowX !== 'visible' || style.overflowY !== 'visible') {
      const rect = node.getBoundingClientRect();
      box = { left: Math.max(box.left, rect.left), top: Math.max(box.top, rect.top), right: Math.min(box.right, rect.right), bottom: Math.min(box.bottom, rect.bottom) };
    }
    if (style.position === 'fixed') break;
  }
  return box;
}

function hitCheck(element) {
  const rect = element.getBoundingClientRect();
  const box = shownBox(element);
  const left = Math.max(rect.left, box.left);
  const right = Math.min(rect.right, box.right);
  const top = Math.max(rect.top, box.top);
  const bottom = Math.min(rect.bottom, box.bottom);
  // Scrolled out of its own scroller (or clipped away): not on screen, so nothing covers it.
  if (right - left < 4 || bottom - top < 4) return null;
  const hit = doc().elementFromPoint((left + right) / 2, top + Math.min((bottom - top) / 2, 20));
  if (!hit || element.contains(hit) || hit.contains(element)) return null;
  const label = hit.closest('label');
  if (label && label.contains(element)) return null;
  return hit;
}

// Instant jumps: scroll-smooth containers would still be animating when measured.
const jump = (scroller, top) => scroller.scrollTo({ top, behavior: 'instant' });

/**
 * Pinned bars that really cover content right now: fixed bars, and sticky bars stuck to the top of
 * a scrolled container (a sticky table header in a non-scrolling wrapper covers nothing).
 */
function coveringBars() {
  const view = win();
  const height = view.innerHeight;
  return [...doc().querySelectorAll('body *')].flatMap(element => {
    const style = view.getComputedStyle(element);
    if (style.position !== 'fixed' && style.position !== 'sticky') return [];
    const rect = element.getBoundingClientRect();
    if (rect.width < view.innerWidth * 0.5 || rect.height < 1 || rect.height > height * 0.6 || rect.bottom <= 0 || rect.top >= height || !isVisible(element)) return [];
    if (style.position === 'sticky') {
      let scroller = element.parentElement;
      while (scroller && !(/(auto|scroll)/.test(view.getComputedStyle(scroller).overflowY) && scroller.scrollHeight > scroller.clientHeight + 1)) scroller = scroller.parentElement;
      if (!scroller || scroller.scrollTop < 1 || Math.abs(rect.top - scroller.getBoundingClientRect().top) > 2) return [];
    }
    return [{ position: style.position, top: rect.top, bottom: rect.bottom, label: describe(element).slice(0, 40) }];
  });
}

/** Measures the current frame. Scroll positions are restored afterwards. */
window.__audit = async () => {
  opaque = new WeakMap();
  // A hidden pane paints no frames; such readings are marked PAUSED and re-checked with it visible.
  const live = await Promise.race([new Promise(resolve => requestAnimationFrame(() => resolve(true))), sleep(1500).then(() => false)]);
  const view = win();
  const page = doc();
  const width = view.innerWidth;
  const height = view.innerHeight;
  const report = { size: `${width}x${height}`, page: pageName() };
  if (!live) report.PAUSED = 1;
  report.overflowX = Math.max(page.documentElement.scrollWidth, page.body.scrollWidth) - width;
  // The app shells are h-dvh; any document-level scroll means something outgrew the shell.
  report.docScrollY = page.scrollingElement.scrollHeight - height;

  const bottomBars = coveringBars().filter(bar => bar.position === 'fixed' && bar.bottom >= height - 4 && bar.top > height / 2);
  const bottomEdge = Math.min(height, ...bottomBars.map(bar => bar.top));
  const shown = new Set([...page.querySelectorAll('body *')].filter(isVisible));

  // Cut-off content: text or controls partly outside a box that clips without scrolling.
  const clipped = [];
  for (const element of shown) {
    if (element.closest('[aria-hidden="true"]') || view.getComputedStyle(element).pointerEvents === 'none') continue;
    if (!(ownText(element) || element.matches(INTERACTIVE) || element.tagName === 'IMG')) continue;
    const cut = cutOff(element);
    if (cut) {
      const rect = element.getBoundingClientRect();
      clipped.push(`${describe(element)} ${cut} [${Math.round(rect.left)},${Math.round(rect.top)} ${Math.round(rect.width)}x${Math.round(rect.height)}]`);
    }
  }
  report.clipped = [...new Set(clipped)].slice(0, 14);

  // Truncated or clamped text.
  const truncated = [];
  for (const element of shown) {
    const style = view.getComputedStyle(element);
    const clips = style.textOverflow === 'ellipsis' || (/(hidden|clip)/.test(style.overflowX) && style.whiteSpace === 'nowrap');
    if (clips && element.scrollWidth > element.clientWidth + 1 && (element.innerText || '').trim()) truncated.push(`${describe(element)} ${element.clientWidth}/${element.scrollWidth}`);
    else if (style.webkitLineClamp && style.webkitLineClamp !== 'none' && element.scrollHeight > element.clientHeight + 2) truncated.push(`${describe(element)} clamp${style.webkitLineClamp}`);
  }
  report.truncated = [...new Set(truncated)].slice(0, 16);

  // Tap targets on touch-sized viewports. On-screen controls are probed 21px either side of their
  // centre, so invisible hit areas (::after) count; off-screen ones use their box.
  const controls = [...shown].filter(element => element.matches(INTERACTIVE) && !element.disabled && !element.closest('[aria-hidden="true"]'));
  const reaches = (element, x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return false;
    const hit = page.elementFromPoint(x, y);
    return Boolean(hit && (hit === element || element.contains(hit)));
  };
  const effective = element => {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    if (!reaches(element, x, y)) return { width: rect.width, height: rect.height };
    return {
      width: rect.width >= 44 || (reaches(element, x - 21, y) && reaches(element, x + 21, y)) ? Math.max(44, rect.width) : rect.width,
      height: rect.height >= 44 || (reaches(element, x, y - 21) && reaches(element, x, y + 21)) ? Math.max(44, rect.height) : rect.height,
    };
  };
  if (width <= 1024) {
    const small = controls.filter(element => {
      const rect = element.getBoundingClientRect();
      if (rect.width <= 2 || rect.height <= 2) return false;
      if (element.tagName === 'A' && view.getComputedStyle(element).display === 'inline') return false;
      const size = effective(element);
      return size.width < 44 || size.height < 44;
    });
    const tiny = small.filter(element => { const size = effective(element); return size.width < 24 || size.height < 24; });
    report.taps = { controls: controls.length, under44: small.length, under24: tiny.length, tiny: [...new Set(tiny.map(element => { const size = effective(element); return `${describe(element)} ${Math.round(size.width)}x${Math.round(size.height)}`; }))].slice(0, 10) };
  }

  // Grids: column count and cell width, to spot cramped or over-stretched layouts.
  report.grids = [];
  for (const element of shown) {
    const style = view.getComputedStyle(element);
    if (style.display !== 'grid' && style.display !== 'inline-grid') continue;
    const cells = [...element.children].filter(child => shown.has(child));
    if (cells.length < 3) continue;
    const columns = style.gridTemplateColumns.split(' ').filter(Boolean).length;
    const cellWidth = Math.round(Math.min(...cells.map(child => child.getBoundingClientRect().width)));
    if (cellWidth < 150 || (columns === 1 && cellWidth > 760)) report.grids.push(`${describe(element).slice(0, 44)} cols=${columns} cell=${cellWidth} n=${cells.length}`);
  }
  report.grids = [...new Set(report.grids)].slice(0, 10);

  // Covering: walk each scroll container top -> bottom; record controls hidden by pinned bars at the
  // extremes (unreachable) and controls overlapped by anything else (real overlap).
  const overlaps = new Set();
  const unreachable = new Set();
  const containers = scrollContainers();
  const checkView = (phase) => {
    for (const element of controls) {
      if (!element.isConnected) continue;
      const rect = element.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= height) continue;
      const hit = hitCheck(element);
      if (!hit || hit.closest('[role=dialog],[role=alertdialog],[data-radix-popper-content-wrapper],[data-sonner-toaster]')) continue;
      const bar = pinnedAncestor(hit);
      const what = `${describe(element)} by ${describe(bar ?? hit).slice(0, 34)}`;
      if (bar) {
        const barRect = bar.getBoundingClientRect();
        if ((phase === 'end' && barRect.top > height / 2) || (phase === 'start' && barRect.bottom < height / 2)) unreachable.add(`${what} (${phase})`);
      } else overlaps.add(what);
    }
  };
  const saved = containers.map(container => container.scrollTop);
  checkView('start');
  for (const container of containers) {
    const max = container.scrollHeight - container.clientHeight;
    const outer = containers.filter(other => other !== container && other.contains(container));
    for (const fraction of [0.5, 1]) {
      // To reach the last row of an inner list, the user scrolls the outer scrollers to their end too.
      if (fraction === 1) outer.forEach(other => jump(other, other.scrollHeight));
      jump(container, Math.round(max * fraction));
      await sleep(180);
      checkView(fraction === 1 ? 'end' : 'mid');
    }
    // Last content visible above the bottom bar at full scroll (only containers that reach the bar).
    const box = container.getBoundingClientRect();
    if (bottomBars.length && box.top < bottomEdge && box.bottom > bottomEdge + 1 && box.bottom <= height + 2) {
      const inside = [...shown].filter(element => container.contains(element) && !pinnedAncestor(element) && (ownText(element) || element.matches(INTERACTIVE)));
      // Visible part only: rows scrolled out of an inner list are not hidden by the bar.
      const lowest = inside.reduce((max, element) => Math.max(max, Math.min(element.getBoundingClientRect().bottom, shownBox(element).bottom)), 0);
      if (lowest > bottomEdge + 1) unreachable.add(`content bottom ${Math.round(lowest)} > bar top ${Math.round(bottomEdge)} in ${describe(container).slice(0, 24)}`);
    }
    jump(container, 0);
    outer.forEach(other => jump(other, 0));
    await sleep(120);
  }
  containers.forEach((container, index) => jump(container, saved[index]));
  report.overlaps = [...overlaps].slice(0, 12);
  report.unreachable = [...unreachable].slice(0, 12);

  // Usable height between the bars that cover content while scrolled half-way.
  const main = containers.find(container => container.tagName === 'MAIN') ?? containers[0];
  if (main) {
    jump(main, Math.round((main.scrollHeight - main.clientHeight) / 2));
    await sleep(250);
    const covering = coveringBars();
    const topCover = Math.max(main.getBoundingClientRect().top, ...covering.filter(bar => bar.top < height / 2).map(bar => bar.bottom));
    const bottomCover = Math.min(height, ...covering.filter(bar => bar.top >= height / 2).map(bar => bar.top));
    report.freeHeight = Math.round(bottomCover - topCover);
    jump(main, 0);
  }

  report.dialogs = [...page.querySelectorAll('[role=dialog],[role=alertdialog],dialog[open]')].filter(isVisible).map(dialog => {
    const rect = dialog.getBoundingClientRect();
    const fits = rect.top >= -1 && rect.bottom <= height + 1;
    const scrolls = [dialog, ...dialog.querySelectorAll('*')].some(element => /(auto|scroll)/.test(view.getComputedStyle(element).overflowY) && element.scrollHeight > element.clientHeight + 2);
    return `${describe(dialog).slice(0, 40)} ${Math.round(rect.top)}-${Math.round(rect.bottom)}${fits ? '' : scrolls ? ' (scrolls)' : ' CUT-OFF'}`;
  });
  return report;
};

/** Drops empty fields; numbers other than freeHeight are kept only when non-zero. */
const compact = report => {
  const out = {};
  for (const [key, value] of Object.entries(report)) {
    if (key === 'page') continue;
    const keep = Array.isArray(value) ? value.length > 0
      : Number.isFinite(value) ? key === 'freeHeight' || value > 0
      : value !== undefined;
    if (keep) out[key] = value;
  }
  return out;
};

/** Clicks a navigation entry by data-tour-nav id inside the frame (sidebar at desktop sizes). */
window.__nav = async (id) => {
  const target = [...doc().querySelectorAll(`[data-tour-nav="${id}"]`)].find(isVisible);
  if (!target) return `no nav ${id}`;
  target.click();
  await sleep(2500);
  return pageName();
};

/** Opens the profile menu and picks an item (Profile/Settings) inside the frame. */
window.__menu = async (item) => {
  const page = doc();
  const trigger = [...page.querySelectorAll('[data-tour-group="Profile"]')].find(isVisible);
  if (!trigger) return 'no profile menu';
  trigger.dispatchEvent(new (win().PointerEvent)('pointerdown', { bubbles: true, button: 0, pointerType: 'mouse' }));
  await sleep(500);
  const entry = [...page.querySelectorAll('[role="menuitem"]')].find(element => element.textContent.trim().includes(item));
  if (!entry) return `no menu item ${item}`;
  entry.click();
  await sleep(2500);
  return pageName();
};

/** Clicks the first visible element matching selector inside the frame (tabs within a page). */
window.__click = async (selector, wait = 4500) => {
  const target = [...doc().querySelectorAll(selector)].find(isVisible);
  if (!target) return `no ${selector}`;
  target.click();
  await sleep(wait);
  return pageName();
};

/**
 * Runs a plan of screens. Each step reaches its screen at desktop size (sidebar visible), then
 * measures every size. Step: { label, load?: path, nav?: id, menu?: item, click?: selector }.
 * Progress: window.__plan; results: window.__results[label] and localStorage `audit:<label>`
 * (Vite reloads every open page when a watched file changes, so results survive reloads).
 * Do not include /battle on a real account: opening Quiz Battle resumes an unfinished match.
 */
window.__runPlan = (steps, sizes = SIZES) => {
  window.__results ??= {};
  window.__plan = { done: 0, total: steps.length, current: null };
  (async () => {
    for (const step of steps) {
      window.__plan.current = step.label;
      try {
        await window.__size(1440, 900, 600);
        if (step.load) await window.__load(step.load, 1440, 900);
        if (step.nav) await window.__nav(step.nav);
        if (step.menu) await window.__menu(step.menu);
        if (step.click) await window.__click(step.click);
        const rows = [];
        for (const [name, width, height] of sizes) {
          await window.__size(width, height, 1100);
          rows.push({ name, ...compact(await window.__audit()) });
        }
        window.__results[step.label] = rows;
      } catch (error) {
        window.__results[step.label] = `error: ${error.message}`;
      }
      try { localStorage.setItem(`audit:${step.label}`, JSON.stringify(window.__results[step.label])); } catch { /* quota */ }
      window.__plan.done++;
    }
    window.__plan.current = 'finished';
  })();
  return 'started';
};

/** One line per size: issues only (intentional line-clamps omitted); `*` marks PAUSED readings. */
window.__sum = label => {
  let rows = window.__results?.[label];
  if (rows === undefined) {
    try { rows = JSON.parse(localStorage.getItem(`audit:${label}`) ?? 'null') ?? undefined; } catch { rows = undefined; }
  }
  if (!Array.isArray(rows)) return String(rows);
  return rows.map(row => {
    const parts = [`${row.name}${row.PAUSED ? '*' : ''}`];
    if (row.overflowX) parts.push(`overflowX ${row.overflowX}`);
    if (row.docScrollY) parts.push(`docScrollY ${row.docScrollY}`);
    const cut = (row.truncated ?? []).filter(entry => !/clamp\d/.test(entry));
    if (cut.length) parts.push(`truncated [${cut.join('; ')}]`);
    for (const key of ['clipped', 'unreachable', 'overlaps', 'grids', 'dialogs']) if (row[key]?.length) parts.push(`${key} [${row[key].join('; ')}]`);
    if (row.freeHeight !== undefined) parts.push(`free ${row.freeHeight}`);
    if (row.taps) parts.push(`taps ${row.taps.under44}/${row.taps.controls} under 44${row.taps.tiny.length ? ` (tiny: ${row.taps.tiny.join(' | ')})` : ''}`);
    return parts.join(' ');
  }).join('\n');
};

/**
 * Touch hit boxes: scrolls the page's main scroller and records, per control, the largest box seen
 * (the element plus `::after` hit areas, found by elementFromPoint scans from its centre, capped at
 * 61px). Returns the controls whose best box is under 44px. Run with touch emulation on, so
 * `pointer-coarse:` styles apply (see docs/responsive-layout-guide.md).
 */
window.__touchSweep = async () => {
  const view = win();
  const page = doc();
  const best = new Map();
  const owns = (element, x, y) => {
    if (x < 0 || y < 0 || x >= view.innerWidth || y >= view.innerHeight) return false;
    const hit = page.elementFromPoint(x, y);
    return Boolean(hit && (hit === element || element.contains(hit)));
  };
  const measure = () => {
    for (const element of page.querySelectorAll(INTERACTIVE)) {
      if (element.disabled || element.closest('[aria-hidden="true"]')) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2 || rect.top < 0 || rect.bottom > view.innerHeight || rect.left < 0 || rect.right > view.innerWidth) continue;
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      if (!owns(element, x, y)) continue;
      const reach = (dx, dy) => { let steps = 0; while (steps < 30 && owns(element, x + dx * (steps + 1), y + dy * (steps + 1))) steps++; return steps; };
      const size = [reach(-1, 0) + reach(1, 0) + 1, reach(0, -1) + reach(0, 1) + 1];
      const key = describe(element).slice(0, 60);
      const previous = best.get(key);
      // A control partly behind a bar at one scroll position keeps its best reading.
      if (!previous || Math.min(size[0], 44) * Math.min(size[1], 44) > Math.min(previous[0], 44) * Math.min(previous[1], 44)) best.set(key, size);
    }
  };
  const scroller = [...page.querySelectorAll('*')]
    .filter(element => /(auto|scroll)/.test(view.getComputedStyle(element).overflowY) && element.scrollHeight > element.clientHeight + 50 && element.clientHeight > 200)
    .sort((a, b) => b.clientHeight - a.clientHeight)[0];
  if (scroller) {
    const max = scroller.scrollHeight - scroller.clientHeight;
    for (let top = 0; top <= max + 299; top += 300) {
      jump(scroller, Math.min(top, max));
      await sleep(250);
      measure();
    }
    jump(scroller, 0);
  } else measure();
  return [...best].filter(([, size]) => size[0] < 44 || size[1] < 44).map(([key, size]) => `${size[0]}x${size[1]} ${key}`);
};

window.__frameDoc = doc;
window.__frameWin = win;
