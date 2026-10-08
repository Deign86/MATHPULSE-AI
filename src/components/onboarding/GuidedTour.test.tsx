// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GuidedTour, type TourStep } from './GuidedTour';
class TestResizeObserver { observe() {} unobserve() {} disconnect() {} }
vi.stubGlobal('ResizeObserver', TestResizeObserver);
afterEach(cleanup);
const steps: TourStep[] = [
  { title: 'Find your grades', description: 'Open Assessment to see your progress.', target: '[data-tour="grades"]', tab: 'Dashboard' },
  { title: 'Your assessment screen', description: 'Review your grades here.', target: '[data-tour="missing"]', tab: 'Grades' },
];
describe('guided spotlight tour', () => {
  it('navigates screens through Continue and Back, and finishes explicitly', async () => {
    const navigate = vi.fn();
    const dismiss = vi.fn();
    render(<GuidedTour steps={steps} onNavigate={navigate} onDismiss={dismiss} />);
    expect(await screen.findByRole('dialog')).toHaveAccessibleName('Find your grades');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Your assessment screen')).toBeInTheDocument();
    expect(navigate).toHaveBeenLastCalledWith('Grades');
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByText('Find your grades')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Finish tour' }));
    expect(dismiss).toHaveBeenCalledOnce();
  });
  it('keeps a missing target step usable and supports Skip and Escape', async () => {
    const dismiss = vi.fn();
    render(<GuidedTour steps={steps} onNavigate={() => {}} onDismiss={dismiss} />);
    expect(await screen.findByRole('button', { name: 'Continue' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Skip tour' }));
    expect(dismiss).toHaveBeenCalledOnce();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(dismiss).toHaveBeenCalledTimes(2);
  });
});

describe('tour focus restoration', () => {
  it('restores focus without removing the replay button from keyboard navigation', async () => {
    function ReplayHarness() {
      const [open, setOpen] = React.useState(true);
      return <><button data-tour="replay">Replay student guide</button>{open && <GuidedTour steps={steps} onNavigate={() => {}} onDismiss={() => setOpen(false)} />}</>;
    }
    render(<ReplayHarness />);
    const replay = screen.getByRole('button', { name: 'Replay student guide', hidden: true });
    vi.spyOn(replay, 'getBoundingClientRect').mockReturnValue(new DOMRect(10, 10, 160, 44));
    fireEvent.click(await screen.findByRole('button', { name: 'Skip tour' }));
    await waitFor(() => expect(replay).toHaveFocus());
    expect(replay).not.toHaveAttribute('tabindex', '-1');
  });
});

function placeAt(element: HTMLElement, top: number) {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(new DOMRect(20, top, 200, 60));
}

describe('tour scrolling and step resolution', () => {
  function scrollArea(overflow: 'auto' | 'hidden') {
    const area = document.createElement('div');
    area.style.overflowY = overflow;
    Object.defineProperty(area, 'scrollHeight', { value: 5000 });
    Object.defineProperty(area, 'clientHeight', { value: 700 });
    area.scrollBy = vi.fn();
    return area;
  }

  it('scrolls a drifted target back into view, including scroll that happened before launch', async () => {
    const page = scrollArea('auto');
    const target = document.createElement('div');
    target.dataset.tour = 'drift';
    placeAt(target, 2000);
    page.append(target);
    document.body.append(page);
    render(<GuidedTour steps={[{ title: 'Drift', description: 'Scroll check', target: '[data-tour="drift"]', tab: 'Dashboard' }]} onNavigate={() => {}} onDismiss={() => {}} />);
    await screen.findByRole('dialog');
    expect(page.scrollBy).toHaveBeenCalledTimes(1);
    placeAt(target, -900);
    fireEvent.scroll(window);
    await waitFor(() => expect(page.scrollBy).toHaveBeenCalledTimes(2));
    page.remove();
  });

  it('never scrolls overflow-hidden layout shells, which would push fixed headers off screen', async () => {
    const shell = scrollArea('hidden');
    const page = scrollArea('auto');
    const target = document.createElement('div');
    target.dataset.tour = 'deep';
    placeAt(target, 1500);
    page.append(target);
    shell.append(page);
    document.body.append(shell);
    render(<GuidedTour steps={[{ title: 'Deep', description: 'Shell check', target: '[data-tour="deep"]', tab: 'Dashboard' }]} onNavigate={() => {}} onDismiss={() => {}} />);
    await screen.findByRole('dialog');
    expect(page.scrollBy).toHaveBeenCalled();
    expect(shell.scrollBy).not.toHaveBeenCalled();
    shell.remove();
  });

  it('uses fallback selectors in the order written, not document order', async () => {
    const later = document.createElement('div');
    later.dataset.tour = 'secondary';
    placeAt(later, 300);
    const preferred = document.createElement('div');
    preferred.dataset.tour = 'primary';
    placeAt(preferred, 100);
    document.body.append(later, preferred);
    render(<GuidedTour steps={[{ title: 'Pick', description: 'Priority', target: '[data-tour="primary"], [data-tour="secondary"]', tab: 'Dashboard' }]} onNavigate={() => {}} onDismiss={() => {}} />);
    await screen.findByRole('dialog');
    await waitFor(() => expect(document.querySelector('[data-tour-overlay] rect[stroke]')).toHaveAttribute('y', '94'));
    later.remove();
    preferred.remove();
  });

  it('skips optional features that are not on screen, in both directions', async () => {
    const anchor = document.createElement('div');
    anchor.dataset.tour = 'present';
    placeAt(anchor, 100);
    document.body.append(anchor);
    const optionalSteps: TourStep[] = [
      { title: 'First', description: 'Present', target: '[data-tour="present"]', tab: 'Dashboard' },
      { title: 'Only sometimes', description: 'Absent', target: '[data-tour="absent"]', tab: 'Dashboard', optional: true },
      { title: 'Last', description: 'Present again', target: '[data-tour="present"]', tab: 'Dashboard' },
    ];
    render(<GuidedTour steps={optionalSteps} onNavigate={() => {}} onDismiss={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Last', {}, { timeout: 3000 })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByText('First', {}, { timeout: 3000 })).toBeInTheDocument();
    anchor.remove();
  });
});

describe('pinned bars', () => {
  it('ignores pinned bars that do not overlap the highlighted feature', async () => {
    const target = document.createElement('div');
    target.dataset.tour = 'avatar';
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(new DOMRect(700, 16, 40, 40));
    const tabs = document.createElement('div');
    tabs.dataset.tourSticky = '';
    vi.spyOn(tabs, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 72, 760, 130));
    document.body.append(target, tabs);
    render(<GuidedTour steps={[{ title: 'Avatar', description: 'Profile menu', target: '[data-tour="avatar"]', tab: 'Rewards' }]} onNavigate={() => {}} onDismiss={() => {}} />);
    await screen.findByRole('dialog');
    await waitFor(() => expect(document.querySelector('[data-tour-overlay] rect[stroke]')).toHaveAttribute('y', '10'));
    target.remove();
    tabs.remove();
  });

  it('trims the highlight above a bottom bar that covers part of the feature', async () => {
    const target = document.createElement('div');
    target.dataset.tour = 'tall';
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 100, 300, 900));
    const nav = document.createElement('nav');
    nav.dataset.tourSticky = '';
    vi.spyOn(nav, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 700, 1024, 68));
    document.body.append(target, nav);
    render(<GuidedTour steps={[{ title: 'Tall', description: 'Covered by nav', target: '[data-tour="tall"]', tab: 'Rewards' }]} onNavigate={() => {}} onDismiss={() => {}} />);
    await screen.findByRole('dialog');
    await waitFor(() => {
      const spot = document.querySelector('[data-tour-overlay] rect[stroke]');
      expect(Number(spot?.getAttribute('y')) + Number(spot?.getAttribute('height'))).toBeLessThanOrEqual(700);
    });
    target.remove();
    nav.remove();
  });
});

describe('keyboard focus while a page loads', () => {
  it('moves focus into the card once its feature appears', async () => {
    render(<><button>Page control</button><GuidedTour steps={[{ title: 'Late feature', description: 'Loads after navigation', target: '[data-tour="late"]', tab: 'Dashboard' }]} onNavigate={() => {}} onDismiss={() => {}} /></>);
    const dialog = await screen.findByRole('dialog');
    screen.getByRole('button', { name: 'Page control', hidden: true }).focus();
    const late = document.createElement('div');
    late.dataset.tour = 'late';
    vi.spyOn(late, 'getBoundingClientRect').mockReturnValue(new DOMRect(20, 100, 200, 60));
    document.body.append(late);
    fireEvent.scroll(window);
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    late.remove();
  });
});
