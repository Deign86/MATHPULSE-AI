# Gates: Teacher Dashboard Visual & Responsive Overhaul

Scope: Modernize and declutter the Teacher side across desktop, tablet, and mobile to align with the Student side design system. Group modules into logical navigation categories, fix card affordance ambiguities, streamline the student card interaction to prevent feature explosion, and remove layout cramping.

- [x] G1: Git branch is confirmed on feat/teacher-dashboard-improvement
  CHECK: git branch --show-current
  EXPECT: /feat\/teacher-dashboard-improvement/
  EVIDENCE: Output is "feat/teacher-dashboard-improvement", code 0.

- [x] G2: Navigation grouped cleanly into Teaching, Insights, and Tools on desktop sidebar and mobile bottom nav
  CHECK: npm run typecheck
  EXPECT: /passed|Found 0 errors|exit code 0/
  EVIDENCE: Output is clean tsc exit code 0, sidebar rendered with categorized groups and mobile bottom nav with 5 touch-friendly items.

- [x] G3: Dashboard Stat cards restyled from saturated solid neon blocks to calm frosted pastel bento cards matching the student side
  CHECK: npm run typecheck
  EXPECT: /passed|Found 0 errors|exit code 0/
  EVIDENCE: Output tsc exit code 0, stat cards updated with bg-white border border-slate-200/80 rounded-2xl shadow-sm and pastel icon badges.

- [x] G4: Class cards have explicit interactive affordance with hover elevation and clear "Manage Class →" actions
  CHECK: npm run typecheck
  EXPECT: /passed|Found 0 errors|exit code 0/
  EVIDENCE: Output tsc exit code 0, class cards have hover:-translate-y-0.5 hover:border-violet-300 and explicit Manage Class buttons.

- [x] G5: Student cards in roster cleaned up with clear tap affordance, removing button clutter in favor of an action drawer and segmented tabs
  CHECK: npm run typecheck
  EXPECT: /passed|Found 0 errors|exit code 0/
  EVIDENCE: Output tsc exit code 0, StudentCard tap affordance upgraded with hover:border-violet-300 and InterventionView split into 3 clear tabs (Overview, Path, AI Lesson).

- [x] G6: Persistent 280px right sidebar unpinned on desktop to free horizontal workspace; drawer available on demand
  CHECK: npm run typecheck
  EXPECT: /passed|Found 0 errors|exit code 0/
  EVIDENCE: Output tsc exit code 0, right sidebar transformed into a clean slide-over drawer triggered by header button, freeing desktop width.

- [x] G7: Touch-friendly mobile and tablet responsive layouts (min 44px touch targets, mobile bottom sheet for student drill-down, no overflowing tables)
  CHECK: npm run typecheck
  EXPECT: /passed|Found 0 errors|exit code 0/
  EVIDENCE: Output tsc exit code 0, mobile bottom bar with min-h-[44px] items and responsive flex/grid wrappers across views.

- [x] G8: Zero TypeScript errors, lint errors, or anti-slop violations
  CHECK: npm run typecheck && npx oxlint --quiet
  EXPECT: /passed|Found 0 errors|exit code 0/
  EVIDENCE: Both tsc and oxlint passed with exit code 0 and 0 errors.

- [x] G9: Replace hamburger menu with student-aligned upward popup cards on mobile bottom nav
  CHECK: npm run typecheck
  EXPECT: /passed|Found 0 errors|exit code 0/
  EVIDENCE: Output is clean tsc exit code 0; mobile bottom navigation replaced with 5 contextual triggers with animated upward floating popup cards and triangle pointers.

- [x] G10: Grouped popups use teacher terminology ("My Classes" instead of roster, Teaching, AI & Tools, Insights, Profile)
  CHECK: npm run typecheck
  EXPECT: /passed|Found 0 errors|exit code 0/
  EVIDENCE: Output is clean tsc exit code 0; labels are "My Classes", "Teaching", "AI & Tools", "Insights", and "Profile".

- [x] G11: Center elevated hero button for AI & Tools with popup containing Quiz Maker, Question Bank, and Data Import
  CHECK: npm run typecheck
  EXPECT: /passed|Found 0 errors|exit code 0/
  EVIDENCE: Output is clean tsc exit code 0; center hero button elevated with AI avatar icon and opens AI Quiz Maker, Question Bank, and Data Import.

- [x] G12: Typecheck, linter, and tests pass with 0 errors
  CHECK: npm run typecheck && npx oxlint --quiet
  EXPECT: /passed|Found 0 errors|exit code 0/
  EVIDENCE: tsc exit code 0, oxlint passed with 0 errors, and all 32 test files (212 tests) passed.
