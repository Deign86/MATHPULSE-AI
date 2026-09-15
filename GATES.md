# Acceptance Gates — Student Side Responsive Modals Audit & Fixes

## Scope
Audit and fix all student-side pop-up modals, dialogs, and overlays to guarantee 100% responsiveness from desktop to mobile screens (graceful collapse, bounded dynamic heights, scrollability, dark mode support, and zero viewport overflow).

- [x] gate1: `DailyCheckInModal.tsx` is responsive on all breakpoints
  EVIDENCE: Verified DailyCheckInModal.tsx uses overflow-y-auto overscroll-contain py-8 sm:py-10, my-auto max-h-[90dvh], dark mode tokens, and responsive Day 7 padding.

- [x] gate2: `ConfirmModal.tsx` is responsive on mobile screens
  EVIDENCE: Verified ConfirmModal.tsx has relative my-auto max-h-[90dvh] overflow-y-auto, close button positioned relative to modal, flex-col-reverse sm:flex-row action buttons, and full dark mode classes.

- [x] gate3: `XPNotification.tsx` floating toast respects mobile viewport width
  EVIDENCE: Verified XPNotification.tsx incorporates max-w-[calc(100vw-2rem)] w-auto px-2, truncate max-w-[200px] sm:max-w-xs, and responsive padding.

- [x] gate4: `RewardsModal.tsx` filter tabs and header stat cards adjust gracefully on narrow screens
  EVIDENCE: Verified RewardsModal.tsx filter tabs container uses w-full xs:w-auto overflow-x-auto no-scrollbar with whitespace-nowrap, and header stat cards use gap-1.5 sm:gap-3 p-2.5 sm:p-4 text-base sm:text-2xl.

- [x] gate5: `ScientificCalculator.tsx` and `FloatingAITutor.tsx` floating dialogs have dynamic viewport boundaries (dvh)
  EVIDENCE: Verified ScientificCalculator.tsx uses max-h-[90dvh], overflow-y-auto max-h-[calc(90dvh-50px)], and FloatingAITutor.tsx uses max-h-[80dvh] container and max-h-[50dvh] scrollable messages area.

- [x] gate6: `InitialAssessmentModal.tsx`, `DiagnosticBreakdown.tsx`, `StudentProfileModal.tsx`, and `ProfileModal.tsx` gracefully collapse on mobile screens
  EVIDENCE: Verified InitialAssessmentModal.tsx collapses to single column on mobile with max-h-[90dvh], DiagnosticBreakdown.tsx uses responsive 3-column metric cards and scrollable segmented tabs, StudentProfileModal.tsx wraps header badges and scales avatar, and ProfileModal.tsx has overflow-y-auto with bounded max-heights.

- [x] gate7: Automated quality checks pass cleanly (Oxlint anti-slop, TypeScript typecheck, Vitest unit test suite, and Vite production build)
  EVIDENCE: Oxlint 0 errors, tsc --noEmit 0 errors, Vitest 31/31 files 210/210 tests passed, and vite build built in 54.74s.

- [x] gate8: Avatar head (LOLI `/avatar/avatar_head_base.png`) replaces user photo in StudentIDCard back and SettingsPage "Dress me up" hover
  EVIDENCE: `StudentIDCard.tsx` line 357 changed to `src="/avatar/avatar_head_base.png"` with `object-contain`; `SettingsPage.tsx` line 411 changed to same asset. tsc --noEmit exits 0.

- [x] gate9: Mobile/tablet dropdown items in SettingsPage use per-tab color palette with colored icon badge and "Active" pill indicator
  EVIDENCE: `SettingsPage.tsx` dropdown items now render each tab using `tab.badgeClass` for background/border, a colored icon badge (`w-8 h-8 rounded-lg`), and a `<Check> Active` pill badge on the selected item. tsc --noEmit exits 0.

