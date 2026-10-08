import React, { useId } from 'react';
import { Compass, PlayCircle, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';

interface GuideReplayCardProps {
  /** Role name shown in the heading and button, e.g. "Student". */
  audience: string;
  pages: readonly { tab: string; label: string }[];
  /** Starts the full guide, or one page's guide when given that page's tab. */
  onReplay: (pageTab?: string) => void;
  /** Replaying leaves Settings, so it waits for unsaved edits to be saved or cleared. */
  hasUnsavedEdits: boolean;
  busy: boolean;
}

/** Settings card for replaying the onboarding guide or a single page guide. */
export function GuideReplayCard({ audience, pages, onReplay, hasUnsavedEdits, busy }: GuideReplayCardProps) {
  const headingId = useId();
  const disabled = hasUnsavedEdits || busy;
  return (
    <section data-tour="settings-guide" aria-labelledby={headingId} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300" aria-hidden="true">
            <Compass size={20} />
          </span>
          <div className="min-w-0">
            <h2 id={headingId} className="font-display text-base font-bold text-slate-900 dark:text-white">{audience} guide</h2>
            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">Replay the full walkthrough, or pick one page to review.</p>
          </div>
        </div>
        <Button data-tour="replay" className="min-h-11 w-full shrink-0 gap-2 rounded-xl bg-purple-700 px-5 font-semibold text-white hover:bg-purple-800 sm:w-auto" disabled={disabled} onClick={() => onReplay()}>
          <RotateCcw size={16} aria-hidden="true" />
          Replay {audience.toLowerCase()} guide
        </Button>
      </div>

      {hasUnsavedEdits && (
        <p role="status" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Save or clear your changes before starting the guide.
        </p>
      )}

      {pages.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Page guides</p>
          <div role="group" aria-label="Page guides" className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
            {pages.map(page => (
              <Button
                key={page.tab}
                variant="outline"
                title={`${page.label} guide`}
                className="h-auto min-h-11 min-w-0 justify-start gap-2 whitespace-normal rounded-xl py-2 border-slate-200 bg-slate-50/70 px-3 text-left font-medium text-slate-700 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-800 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-purple-950/40"
                disabled={disabled}
                onClick={() => onReplay(page.tab)}
              >
                <PlayCircle size={16} className="shrink-0 text-purple-600 dark:text-purple-300" aria-hidden="true" />
                <span className="leading-tight">{page.label}</span>
              </Button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
