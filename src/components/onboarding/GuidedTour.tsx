import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ArrowLeft, ArrowRight, Compass, Loader2, X } from 'lucide-react';
import { Button } from '../ui/button';

export interface TourStep {
  title: string;
  description: string;
  target?: string;
  tab: string;
  /** Navigation hint, e.g. which phone submenu to open. */
  menu?: string;
  /** In-page view the host should show, e.g. a sub-tab that is unmounted by default. */
  view?: string;
  /** Feature that exists only in some account states; skipped when it does not render. */
  optional?: boolean;
}

/** How long an optional feature may take to render before its step is skipped. */
export interface TourPage {
  tab: string;
  label: string;
  /** One general step for the first-use guide: what the page is for and where to find it. */
  overview: TourStep;
  /** The detailed, feature-by-feature page guide (the ? button and Settings). */
  steps: readonly TourStep[];
}

const OPTIONAL_WAIT_MS = 1500;
/** How long the card stays hidden while a page loads the step's feature (some teacher views fetch for ~10 s). */
const TARGET_WAIT_MS = 12000;
/** Short loads finish without flashing the loading indicator. */
const LOADING_HINT_DELAY_MS = 600;
/** Longest a loading screen (`data-tour-loading`) may hold a step before it is shown anyway. */
const LOADING_WAIT_MS = 20000;
/** After navigating, the page must stay free of loading screens this long before the card shows. */
const NAVIGATION_SETTLE_MS = 250;
const MIN_SPOTLIGHT_HEIGHT = 96;

interface GuidedTourProps {
  steps: readonly TourStep[];
  label?: string;
  onNavigate: (tab: string) => void;
  onDismiss: () => void;
  onStepChange?: (step: TourStep) => void;
}

interface VisibleBand {
  top: number;
  bottom: number;
}

interface Spotlight {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Comma-separated selectors are fallbacks in priority order, not document order. */
function visibleTarget(selector: string): HTMLElement | null {
  for (const option of selector.split(/,(?![^[]*\])/)) {
    for (const candidate of document.querySelectorAll<HTMLElement>(option)) {
      const bounds = candidate.getBoundingClientRect();
      if (bounds.width > 0 && bounds.height > 0 && getComputedStyle(candidate).visibility !== 'hidden') {
        return candidate;
      }
    }
  }
  return null;
}

/**
 * Loading screens on screen (the full-screen page loader, or a page's own loaders). While one shows,
 * the page behind a step is not ready: its feature may be missing, or covered so the highlight
 * would show the loader.
 */
function loadingScreens(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[data-tour-loading]')].filter(loader => {
    const bounds = loader.getBoundingClientRect();
    const onScreen = bounds.width > 0 && bounds.height > 0 && bounds.bottom > 0 && bounds.right > 0
      && bounds.top < window.innerHeight && bounds.left < window.innerWidth;
    return onScreen && getComputedStyle(loader).visibility !== 'hidden';
  });
}

/**
 * Hosts that animate page changes mark the mounted page with `data-tour-page`; the old page stays on
 * screen while it fades out, so a step on another page waits until its own page has mounted.
 */
function pageMounted(tab: string): boolean {
  const pages = [...document.querySelectorAll('[data-tour-page]')];
  return pages.length === 0 || pages.some(page => page.getAttribute('data-tour-page') === tab);
}

/**
 * A loading overlay drawn over the feature. Only fixed overlays (the full-screen loader) sit on top:
 * a page's own loader can share the feature's position yet lie behind it, e.g. under a phone menu.
 */
function coveredByLoader(target: HTMLElement, loaders: readonly HTMLElement[]): boolean {
  const bounds = target.getBoundingClientRect();
  const x = bounds.left + bounds.width / 2;
  const y = bounds.top + bounds.height / 2;
  return loaders.some(loader => {
    if (target.contains(loader) || getComputedStyle(loader).position !== 'fixed') return false;
    const cover = loader.getBoundingClientRect();
    return x >= cover.left && x <= cover.right && y >= cover.top && y <= cover.bottom;
  });
}

const EDGE = 16;

/**
 * The band of the viewport left uncovered by pinned bars (`data-tour-sticky`) lying over the target:
 * bars in the upper half of the screen push the top edge down, bars in the lower half pull the bottom up.
 */
function uncoveredBand(target: HTMLElement, viewportTop: number, bottomEdge: number): VisibleBand {
  const bounds = target.getBoundingClientRect();
  const middle = (viewportTop + bottomEdge) / 2;
  let top = viewportTop;
  let bottom = bottomEdge;
  for (const element of document.querySelectorAll<HTMLElement>('[data-tour-sticky]')) {
    if (element.contains(target) || target.contains(element)) continue;
    const bar = element.getBoundingClientRect();
    if (!bar.height || bar.right <= bounds.left || bar.left >= bounds.right || bar.bottom <= bounds.top || bar.top >= bounds.bottom) continue;
    if (bar.top + bar.height / 2 < middle) top = Math.max(top, bar.bottom);
    else bottom = Math.min(bottom, bar.top);
  }
  return { top, bottom };
}

function scrollParent(element: HTMLElement): HTMLElement | null {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(parent).overflowY) && parent.scrollHeight > parent.clientHeight) return parent;
  }
  return null;
}

/**
 * Brings the target to the top of each user-scrollable ancestor, innermost first, and reveals it in
 * horizontal rows. Unlike scrollIntoView, this never scrolls `overflow: hidden` layout shells, which
 * would push fixed headers off screen and leave the app shifted after the guide closes.
 */
function scrollTargetToTop(target: HTMLElement) {
  for (let node = target; node.parentElement; node = node.parentElement) {
    // Pinned elements do not move when their ancestors scroll.
    if (getComputedStyle(node).position === 'fixed') return;
    const parent = node.parentElement;
    const style = getComputedStyle(parent);
    if (/(auto|scroll)/.test(style.overflowY) && parent.scrollHeight > parent.clientHeight) {
      parent.scrollBy({ top: target.getBoundingClientRect().top - parent.getBoundingClientRect().top, behavior: 'instant' });
    }
    if (/(auto|scroll)/.test(style.overflowX) && parent.scrollWidth > parent.clientWidth) {
      const bounds = target.getBoundingClientRect();
      const row = parent.getBoundingClientRect();
      if (bounds.left < row.left) parent.scrollBy({ left: bounds.left - row.left - 8, behavior: 'instant' });
      else if (bounds.right > row.right) parent.scrollBy({ left: bounds.right - row.right + 8, behavior: 'instant' });
    }
  }
}

export function GuidedTour({ steps, label = 'Feature guide', onNavigate, onDismiss, onStepChange }: GuidedTourProps) {
  const [index, setIndex] = useState(0);
  const direction = useRef<1 | -1>(1);
  const [spotlight, setSpotlight] = useState<Spotlight | null>(null);
  const [targetFound, setTargetFound] = useState(false);
  const [position, setPosition] = useState({ left: 16, top: 16, maxHeight: 512 });
  const cardRef = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onNavigate, onStepChange });
  callbacks.current = { onNavigate, onStepChange };
  const maskId = useId();
  const step = steps[index];

  useEffect(() => {
    if (!step) return;
    callbacks.current.onNavigate(step.tab);
    callbacks.current.onStepChange?.(step);
  }, [step]);

  // The card stays hidden while a lazily loaded page renders the step's feature, so it never
  // jumps into place. Optional features that never render are skipped in the direction of travel.
  // The wait starts over while a loading screen is up or the feature is on screen, so a slow page
  // is neither skipped nor shown half-loaded, and a feature that disappears counts as missing.
  const found = useRef(false);
  const loading = useRef(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [waitedOut, setWaitedOut] = useState(-1);
  useEffect(() => {
    if (!step?.target) return;
    const optional = Boolean(step.optional);
    const limit = optional ? OPTIONAL_WAIT_MS : TARGET_WAIT_MS;
    const started = performance.now();
    let since = started;
    const timer = window.setInterval(() => {
      const now = performance.now();
      if (found.current || (loading.current && now - started < LOADING_WAIT_MS)) {
        since = now;
        return;
      }
      if (now - since < limit) return;
      window.clearInterval(timer);
      if (!optional) {
        setWaitedOut(index);
        return;
      }
      setIndex(previous => {
        const next = previous + direction.current;
        if (next >= 0 && next < steps.length) return next;
        direction.current = 1;
        return Math.min(previous + 1, steps.length - 1);
      });
    }, 100);
    return () => window.clearInterval(timer);
  }, [step, index, steps.length]);
  const waiting = Boolean(step?.target) && !targetFound && waitedOut !== index;
  // Optional steps wait silently unless a loading screen is the reason.
  const showsLoading = waiting && (!step?.optional || pageLoading);
  const [showLoadingHint, setShowLoadingHint] = useState(false);
  useEffect(() => {
    setShowLoadingHint(false);
    if (!showsLoading) return;
    const timer = window.setTimeout(() => setShowLoadingHint(true), LOADING_HINT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [showsLoading, step]);
  // A hidden card cannot hold focus; return it once the card appears so keyboard users stay in the guide.
  useEffect(() => {
    if (!waiting && cardRef.current && !cardRef.current.contains(document.activeElement)) cardRef.current.focus();
  }, [waiting]);

  const goTo = (delta: 1 | -1) => {
    direction.current = delta;
    setIndex(previous => previous + delta);
  };

  useLayoutEffect(() => {
    if (!step) return;
    const started = performance.now();
    // A step on another page than the one before it swaps the page, which can mount loaders a moment later.
    const navigated = steps[index - direction.current]?.tab !== step.tab;
    let quietSince = started;
    let revealed = false;
    let frame = 0;
    // Last on-screen position we left the target at; only an outside scroll moves it.
    let placed: { target: HTMLElement; top: number } | null = null;
    // Bars can appear after scrolling (e.g. a pinned top-three strip); uncovering is retried a few times.
    let uncoverAttempts = 0;
    let watchedTarget: HTMLElement | null = null;
    let watchedCard: HTMLDivElement | null = null;
    const measure = () => {
      const viewport = window.visualViewport;
      const viewportLeft = viewport?.offsetLeft ?? 0;
      const viewportTop = viewport?.offsetTop ?? 0;
      const width = viewport?.width ?? window.innerWidth;
      const height = viewport?.height ?? window.innerHeight;
      const rightEdge = viewportLeft + width;
      const bottomEdge = viewportTop + height;
      const now = performance.now();
      const loaders = loadingScreens();
      loading.current = loaders.length > 0 || !pageMounted(step.tab);
      setPageLoading(loading.current);
      if (loading.current) quietSince = now;
      let target = step.target ? visibleTarget(step.target) : null;
      // Until the card first shows it waits for the step's page and its loaders (and, after navigating,
      // for the page to settle); afterwards only a loader drawn over the feature hides it again.
      // Both up to a limit.
      if (target && now - started < LOADING_WAIT_MS) {
        const settling = !revealed && (loading.current || (navigated && now - quietSince < NAVIGATION_SETTLE_MS));
        if (settling || coveredByLoader(target, loaders)) target = null;
      }
      if (target) revealed = true;
      found.current = Boolean(target);
      setTargetFound(found.current);
      if (target) {
        const current = target.getBoundingClientRect();
        const band = uncoveredBand(target, viewportTop, bottomEdge);
        const fits = current.height <= band.bottom - band.top - EDGE * 2;
        const offscreen = fits
          ? current.top < band.top + 4 || current.bottom > band.bottom - 4
          : Math.abs(current.top - (band.top + 8)) > 48;
        const isNewTarget = placed?.target !== target;
        const drifted = !isNewTarget && Math.abs((placed?.top ?? 0) - current.top) > 4 && offscreen;
        // Each new target goes to the top (clear of fixed bottom bars, leaving one large gap for the
        // explanation); later drift from momentum is corrected; an unreachable position is not retried.
        if (isNewTarget) uncoverAttempts = 0;
        if (isNewTarget || drifted) scrollTargetToTop(target);
        // Sticky filter/tab bars and floating headers would sit on top of the feature; scroll past them.
        const barBottom = uncoveredBand(target, viewportTop, bottomEdge).top;
        const covered = barBottom > viewportTop ? barBottom + 8 - target.getBoundingClientRect().top : 0;
        if (covered > 8 && uncoverAttempts < 3) {
          uncoverAttempts += 1;
          scrollParent(target)?.scrollBy({ top: -covered, behavior: 'instant' });
        }
        placed = { target, top: target.getBoundingClientRect().top };
      }
      if (watchedTarget !== target) {
        if (watchedTarget) resize.unobserve(watchedTarget);
        watchedTarget = target;
        if (target) resize.observe(target);
      }
      if (cardRef.current && watchedCard !== cardRef.current) {
        watchedCard = cardRef.current;
        resize.observe(watchedCard);
      }
      const bounds = target?.getBoundingClientRect();
      let nextSpotlight: Spotlight | null = null;
      if (target && bounds && bounds.bottom > viewportTop && bounds.top < bottomEdge) {
        // Highlight only the part not hidden behind pinned bars (e.g. the phone's bottom navigation).
        const { top: visibleTop, bottom: visibleBottom } = uncoveredBand(target, viewportTop, bottomEdge);
        const left = Math.max(viewportLeft + 4, bounds.left - 6);
        const top = Math.max(visibleTop + 4, bounds.top - 6);
        const right = Math.min(rightEdge - 4, bounds.right + 6);
        const bottom = Math.min(visibleBottom - 4, bounds.bottom + 6);
        if (right > left && bottom > top) nextSpotlight = { left, top, width: right - left, height: bottom - top };
      }
      const cardWidth = cardRef.current?.offsetWidth || Math.min(384, width - 32);
      const cardHeight = cardRef.current?.offsetHeight || 260;
      const copy = cardRef.current?.querySelector<HTMLElement>('[data-tour-copy]');
      const desiredHeight = Math.min(height - 32, cardHeight + Math.max(0, (copy?.scrollHeight || 0) - (copy?.clientHeight || 0)));
      const minimumHeight = copy ? cardHeight - copy.offsetHeight + Math.min(40, copy.scrollHeight) : 160;
      if (nextSpotlight) {
        const fitsBeside = bottomEdge - 32 - (nextSpotlight.top + nextSpotlight.height) >= desiredHeight
          || nextSpotlight.top - 32 - viewportTop >= desiredHeight
          || nextSpotlight.left + nextSpotlight.width + 32 + cardWidth <= rightEdge
          || nextSpotlight.left - 32 - cardWidth >= viewportLeft;
        // Oversized regions (grids, charts, lists): spotlight their top part so the explanation never covers it.
        const cappedBottom = bottomEdge - 32 - desiredHeight;
        if (!fitsBeside && cappedBottom - nextSpotlight.top >= MIN_SPOTLIGHT_HEIGHT) {
          nextSpotlight = { ...nextSpotlight, height: cappedBottom - nextSpotlight.top };
        }
      }
      setSpotlight(previous => JSON.stringify(previous) === JSON.stringify(nextSpotlight) ? previous : nextSpotlight);
      let maxHeight = height - 32;
      let top = viewportTop + Math.max(16, (height - desiredHeight) / 2);
      let left = viewportLeft + (width - cardWidth) / 2;
      if (nextSpotlight) {
        const below = bottomEdge - 16 - (nextSpotlight.top + nextSpotlight.height + 16);
        const above = nextSpotlight.top - 16 - (viewportTop + 16);
        left = nextSpotlight.left + nextSpotlight.width / 2 - cardWidth / 2;
        if (below >= desiredHeight) {
          top = nextSpotlight.top + nextSpotlight.height + 16;
        } else if (above >= desiredHeight) {
          top = nextSpotlight.top - desiredHeight - 16;
        } else if (nextSpotlight.left + nextSpotlight.width + 16 + cardWidth <= rightEdge - 16) {
          left = nextSpotlight.left + nextSpotlight.width + 16;
        } else if (nextSpotlight.left - cardWidth - 16 >= viewportLeft + 16) {
          left = nextSpotlight.left - cardWidth - 16;
        } else if (Math.max(below, above) >= minimumHeight) {
          // Short screens keep the target visible by scrolling only the explanation.
          maxHeight = Math.max(below, above);
          top = below >= above ? nextSpotlight.top + nextSpotlight.height + 16 : viewportTop + 16;
        } else {
          // Large regions: dock to the roomier edge so most of the region stays visible.
          left = viewportLeft + (width - cardWidth) / 2;
          top = below >= above ? bottomEdge : viewportTop;
        }
      }
      const nextPosition = {
        left: Math.max(viewportLeft + 16, Math.min(left, rightEdge - cardWidth - 16)),
        top: Math.max(viewportTop + 16, Math.min(top, bottomEdge - Math.min(desiredHeight, maxHeight) - 16)),
        maxHeight,
      };
      setPosition(previous => previous.left === nextPosition.left && previous.top === nextPosition.top && previous.maxHeight === nextPosition.maxHeight ? previous : nextPosition);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    // Observe lazy-loaded pages, expandable menus and route transitions.
    const observer = new MutationObserver(schedule);
    const resize = new ResizeObserver(schedule);
    observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
    if (cardRef.current) resize.observe(cardRef.current);
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    window.visualViewport?.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('scroll', schedule);
    const settle = window.setInterval(schedule, 250);
    measure();
    return () => {
      observer.disconnect();
      resize.disconnect();
      cancelAnimationFrame(frame);
      clearInterval(settle);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      window.visualViewport?.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('scroll', schedule);
    };
  }, [step, index, steps]);

  if (!step) return null;
  const last = index === steps.length - 1;

  return (
    <DialogPrimitive.Root open onOpenChange={open => { if (!open) onDismiss(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[100000]" data-tour-overlay="">
          <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
            <defs>
              <mask id={maskId}>
                <rect width="100%" height="100%" fill="white" />
                {spotlight && <rect x={spotlight.left} y={spotlight.top} width={spotlight.width} height={spotlight.height} rx="12" fill="black" />}
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(15,23,42,0.62)" mask={`url(#${maskId})`} />
            {spotlight && <rect x={spotlight.left} y={spotlight.top} width={spotlight.width} height={spotlight.height} rx="12" fill="none" stroke="#c4b5fd" strokeWidth="3" />}
          </svg>
        </DialogPrimitive.Overlay>
        <DialogPrimitive.Content
          ref={cardRef}
          data-tour-dialog=""
          data-tour-step={index + 1}
          className={`fixed z-[100001] flex w-[calc(100vw-2rem)] max-w-sm flex-col rounded-2xl border border-purple-200 bg-white p-[16px] sm:p-5 text-slate-900 shadow-2xl outline-none dark:border-purple-800 dark:bg-slate-900 dark:text-slate-100 ${waiting ? 'invisible' : ''}`}
          aria-busy={waiting}
          style={{ left: position.left, top: position.top, maxHeight: position.maxHeight, paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
          onPointerDownOutside={event => event.preventDefault()}
          onInteractOutside={event => event.preventDefault()}
          onCloseAutoFocus={event => {
            event.preventDefault();
            window.setTimeout(() => {
              // Another guide opened meanwhile (e.g. the next page guide); it owns focus now.
              if (document.querySelector('[data-tour-dialog]')) return;
              const replay = visibleTarget('[data-tour="replay"]');
              // Any role: the page heading, then the first visible navigation entry.
              const fallback = visibleTarget('[data-tour-page] h1, [data-tour-page] h2, main h1, header h1, [data-tour-nav]');
              const focusTarget = replay || fallback;
              if (focusTarget) {
                if (!focusTarget.matches('button, a[href], input, select, textarea, [tabindex]')) {
                  focusTarget.setAttribute('tabindex', '-1');
                  focusTarget.addEventListener('blur', () => focusTarget.removeAttribute('tabindex'), { once: true });
                }
                focusTarget.focus({ preventScroll: true });
              }
            }, 400);
          }}
        >
          {showsLoading && showLoadingHint && (
            // Shown inside the hidden card so it stays in the dialog's focus and reading order.
            // The card's own Skip button is hidden while waiting, and phones have no Escape key.
            <div className="visible fixed left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-white py-1 pl-4 pr-1 text-sm font-medium text-slate-700 shadow-lg dark:bg-slate-900 dark:text-slate-200">
              <span role="status" className="flex items-center gap-2">
                <Loader2 size={16} className="motion-safe:animate-spin text-purple-600" aria-hidden="true" />
                Loading this page…
              </span>
              <Button variant="ghost" size="sm" className="rounded-full text-purple-700 hover:text-purple-800 dark:text-purple-300 pointer-coarse:h-11" onClick={onDismiss}>
                Skip guide
              </Button>
            </div>
          )}
          <div className="mb-[12px] flex shrink-0 items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-purple-700 dark:text-purple-300">
              <Compass size={18} className="shrink-0" aria-hidden="true" />
              <span aria-live="polite" aria-atomic="true">{label} · Step {index + 1} of {steps.length}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-[44px] w-[44px]" aria-label="Skip tour" title="Skip tour" onClick={onDismiss}>
              <X aria-hidden="true" />
            </Button>
          </div>
          <div data-tour-copy="" aria-live="polite" aria-atomic="true" className="min-h-0 overflow-y-auto overscroll-contain">
            <DialogPrimitive.Title className="mb-2 text-xl font-bold leading-snug">{step.title}</DialogPrimitive.Title>
            <DialogPrimitive.Description className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{step.description}</DialogPrimitive.Description>
          </div>
          <div className="mt-[16px] h-1 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
            <div className="h-full rounded-full bg-purple-600" style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
          </div>
          <div className="mt-[16px] flex shrink-0 flex-wrap items-center justify-between gap-2">
            <div className="flex w-full min-w-0 flex-wrap justify-between gap-2 min-[400px]:w-auto">
              <Button variant="outline" className="h-auto min-h-[44px] px-2 has-[>svg]:px-2" disabled={index === 0} onClick={() => goTo(-1)}>
                <ArrowLeft className="hidden min-[400px]:block" aria-hidden="true" />Back
              </Button>
              <Button className="h-auto min-h-[44px] bg-purple-700 px-2 has-[>svg]:px-2 text-white hover:bg-purple-800" onClick={() => last ? onDismiss() : goTo(1)}>
                {last ? 'Finish tour' : 'Continue'}<ArrowRight className="hidden min-[400px]:block" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
