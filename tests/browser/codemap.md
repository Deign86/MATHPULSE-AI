# tests/browser/

## Responsibility
- Real-browser checks that unit tests cannot make: the guided-tour engine at eight viewports, and layout audits of the real app at the eight target sizes.
- Files: `student-tour-smoke.mjs` + `student-tour.html` + `StudentTourFixture.tsx` (headless tour smoke test on a fixture), `layout-audit.html` + `layout-audit-frame.html` + `layout-audit.js` + `layout-audit-guides.js` (in-browser audit of the signed-in app), `layout-audit-login.mjs` (headless audit of the sign-in page).

## Design
- The tour smoke test starts its own Vite server (port 5187) and drives Edge through Playwright; it asserts card placement, 44px buttons, spotlights, focus trapping and pinned-bar cover.
- The layout audit runs inside a same-origin iframe sized to each viewport, so media queries, container queries and JS breakpoints behave as on a real device. The frame page drives `requestAnimationFrame` from a message loop so animations settle while the Browser pane is hidden. Results persist in `localStorage` because Vite reloads open pages on file changes.

## Flow
- Signed-in audit: sign in on the dev server → open `/tests/browser/layout-audit.html` → `__runPlan(steps)` / `__sum(label)`, `__touchSweep()` with touch emulation, `__guideRun(sizes, labels)` for page guides.
- Sign-in audit: `node tests/browser/layout-audit-login.mjs [outDir]` against the dev server on 5174 → `report.json` and one screenshot per size.

## Integration
- Dev only: none of these files are imported by `src/` or bundled. Conventions and caveats (no Quiz Battle on real accounts, no edits during a run): `docs/responsive-layout-guide.md`.
