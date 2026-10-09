import { Bell, Calculator, CircleHelp } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/styles/globals.css';
import Sidebar from '../../src/components/Sidebar';
import MobileBottomNav from '../../src/components/MobileBottomNav';
import SettingsPage from '../../src/components/SettingsPage';
import { GuidedTour, type TourStep } from '../../src/components/onboarding/GuidedTour';
import { PageGuideConfirm } from '../../src/components/onboarding/PageGuideConfirm';
import { studentPageTour, studentTourPages, studentTourSteps } from '../../src/components/onboarding/studentTourSteps';
import { useOnboardingTour } from '../../src/hooks/useOnboardingTour';

// Regions that are large in the real app, so card docking and scrolling are exercised.
const LARGE = new Set(['module-grid', 'chat-messages', 'rewards-content', 'avatar-items', 'leaderboard-standings', 'grades-history']);
const HEADER = new Set(['level', 'notifications', 'page-guide']);

/** Representative feature blocks generated from the step config; optional features are left out, as for a new student. */
function FeatureBlocks({ tab, view }: { tab: string; view: string | undefined }) {
  const steps = studentPageTour(tab)?.steps ?? [];
  const firstView = steps.find(step => step.view)?.view;
  const names = steps
    .filter(step => !step.optional && (!step.view || step.view === (view ?? firstView)))
    .map(step => step.target?.match(/^\[data-tour="([^"]+)"\]/)?.[1])
    .filter((name): name is string => Boolean(name && !HEADER.has(name)));
  return (
    <div className="space-y-5">
      {/* Mirrors the sticky filter/tab bars on Modules and Rewards that must never cover a highlight. */}
      {(tab === 'Modules' || tab === 'Rewards') && <div data-tour-sticky="" className="sticky top-0 z-10 h-20 rounded-xl border bg-slate-100 p-3 dark:bg-slate-800">Sticky filters</div>}
      {names.map(name => (
        <section key={name} data-tour={name} className={`rounded-2xl border bg-white p-4 dark:bg-slate-900 ${LARGE.has(name) ? 'h-[640px]' : 'h-24'}`}>
          {name}
        </section>
      ))}
      <div className="h-[900px] rounded-2xl border border-dashed p-4">Below-the-fold content</div>
    </div>
  );
}

function StudentTourFixture() {
  const [tab, setTab] = useState(() => new URLSearchParams(window.location.search).get('tab') ?? 'Dashboard');
  const [tourStep, setTourStep] = useState<TourStep | null>(null);
  const origin = useRef<string | null>(null);
  const tour = useOnboardingTour('student', 'browser-verification', true, false, tab === 'Dashboard');
  const page = tour.page ? studentPageTour(tour.page) : undefined;
  const navigate = (next: string) => {
    origin.current ??= tab;
    setTab(next);
  };
  const dismiss = () => {
    tour.dismiss();
    setTourStep(null);
    setTab(origin.current ?? 'Dashboard');
    origin.current = null;
  };
  return (
    <div className="flex h-dvh overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="hidden lg:flex"><Sidebar activeTab={tab} setActiveTab={setTab} /></div>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-2 border-b p-4">
          <div data-tour="level" className="rounded-xl bg-purple-100 p-3 text-purple-900">Lv 1 · XP</div>
          <div className="flex gap-2">
            <PageGuideConfirm guide={studentPageTour(tab)?.label ?? null} audience="student" onPlay={() => tour.start(studentPageTour(tab) ? tab : null)}>
              <button data-tour="page-guide" aria-label="Guide for this page" className="rounded-xl bg-white p-3"><CircleHelp size={16} aria-hidden="true" /></button>
            </PageGuideConfirm>
            <button aria-label="Scientific Calculator" className="rounded-xl bg-white p-3"><Calculator size={16} aria-hidden="true" /></button>
            <button data-tour="notifications" aria-label="Notifications" className="rounded-xl bg-white p-3"><Bell size={16} aria-hidden="true" /></button>
            <button data-tour-group="Profile" className="hidden rounded-xl bg-white p-3 md:block" onClick={() => setTab('Profile')}>Profile</button>
          </div>
        </header>
        <main data-testid="page-scroll" className="min-h-0 flex-1 overflow-y-auto pb-32 lg:pb-8" data-tour-page={tab}>
          {tab === 'Settings' ? (
            <SettingsPage profileData={{ name: 'Tour learner', role: 'student' }} onSaveProfile={() => {}} onSaveSettings={async () => {}} onReplayTour={tour.start} tourPages={studentTourPages} />
          ) : (
            <div className="mx-auto max-w-5xl space-y-5 p-5 sm:p-8">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{tab}</h1>
              <FeatureBlocks tab={tab} view={tour.isOpen ? tourStep?.view : undefined} />
            </div>
          )}
        </main>
        <MobileBottomNav activeTab={tab} onSelectTab={setTab} tourMenu={tour.isOpen ? tourStep?.menu ?? null : null} onOpenProfile={() => setTab('Profile')} onOpenSettings={() => setTab('Settings')} />
      </div>
      {tour.isOpen && (
        <GuidedTour key={tour.page ?? 'full'} label={page ? `${page.label} guide` : 'Student guide'} steps={page?.steps ?? studentTourSteps} onNavigate={navigate} onStepChange={setTourStep} onDismiss={dismiss} />
      )}
    </div>
  );
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<StudentTourFixture />);
