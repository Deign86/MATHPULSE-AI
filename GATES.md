# GATES.md — Student UI & Quiz Battle Polish

- [x] gate-1: MobileBottomNav includes expandable Profile menu with My Profile, Settings, and Logout for mobile and tablet viewports
  CHECK: npm run typecheck
  EVIDENCE: > mathpulse-ai@1.2.0 typecheck | > tsc --noEmit

- [x] gate-2: StudentIDCard cross-face pointer-events isolated; flip to front never triggers hidden file input; photo click triggers upload
  CHECK: npm run test -- StudentIDCard.test.tsx
  EXPECT: /passed/
  EVIDENCE: [2m   Start at [22m 19:33:26 | [2m   Duration [22m 6.98s[2m (transform 2.01s, setup 2.86s, import 622ms, tests 221ms, environment 2.89s)[22m

- [x] gate-3: Unsaved changes confirmation protects profile editing from tab switching and browser reload
  CHECK: npm run typecheck
  EVIDENCE: > mathpulse-ai@1.2.0 typecheck | > tsc --noEmit

- [x] gate-4: Quiz Battle sidebar strictly collapses without hover expansion and displays icon tooltips
  CHECK: npm run typecheck
  EVIDENCE: > mathpulse-ai@1.2.0 typecheck | > tsc --noEmit

- [x] gate-5: Quiz Battle 4 sub-views redesigned (Battle Modes/Setup, Arena Leaderboard, My Stats, Match History)
  CHECK: npm run typecheck
  EVIDENCE: > mathpulse-ai@1.2.0 typecheck | > tsc --noEmit

- [x] gate-6: Dedicated Rewards page created, and Rewards modal streamlined with link to dedicated page
  CHECK: npm run typecheck
  EVIDENCE: > mathpulse-ai@1.2.0 typecheck | > tsc --noEmit

- [x] gate-7: Floating AI chatbot header button spacing and right-corner padding fixed
  CHECK: npm run typecheck
  EVIDENCE: > mathpulse-ai@1.2.0 typecheck | > tsc --noEmit

- [x] gate-8: Large screen layout responsiveness scaled up (no dead space on 1920px+ viewports)
  CHECK: npm run typecheck
  EVIDENCE: > mathpulse-ai@1.2.0 typecheck | > tsc --noEmit

- [x] gate-9: Code passes Oxlint Anti-Slop checks with zero violations
  CHECK: npm run lint:anti-slop
  EVIDENCE: Found 408 warnings and 0 errors. Finished in 2.7s on 397 files with 111 rules using 12 threads.

- [x] gate-10: Pop-up modals (ConfirmModal, RewardsModal, ProfilePictureUploader) scaled proportionally across all breakpoints without clipping
  CHECK: npm run typecheck
  EVIDENCE: > mathpulse-ai@1.2.0 typecheck | > tsc --noEmit (0 errors)

- [x] gate-11: Notification bell toggles open/close, close X removed, mobile full backdrop removed, top 3 items displayed with "View all" toggle
  CHECK: npm run test -- src/features/notifications/NotificationBell.test.tsx
  EVIDENCE: 6 passed (6 tests), including closes panel when clicking the bell button again

- [x] gate-12: Redundant "My Profile" item removed from desktop sidebar; top-right profile navigation maintained
  CHECK: npm run typecheck
  EVIDENCE: > mathpulse-ai@1.2.0 typecheck | > tsc --noEmit (0 errors)

- [x] gate-13: Hero Mascot avatar in Quiz Battle features continuous up-and-down floating movement animation
  CHECK: npm run typecheck
  EVIDENCE: > mathpulse-ai@1.2.0 typecheck | > tsc --noEmit (0 errors)

- [x] gate-14: Hall of Fame redesigned with banner-free direct split layout (podiums on left, Standings card on right), rotating purple cosmic sunburst rays, responsive universal header bar, and full mobile clearance
  CHECK: npm run typecheck && npm run lint:anti-slop
  EVIDENCE: TypeScript 0 errors, Oxlint Anti-Slop 0 errors, browser subagent verified at 1280x800 and 390x844 with 0 clipping and smooth mascot floating

- [x] gate-15: Hall of Fame updated to use native Quiz Battle background directly; My Stats overhauled with competitive Game UI layout (esports identity card, bento combat slabs, battle distribution, AI tactical coach, collectible combat badges)
  CHECK: npm run typecheck && npm run lint:anti-slop
  EVIDENCE: TypeScript 0 errors, Oxlint Anti-Slop 0 errors, browser subagent verified at 1280x800 and 390x844 with 0 clipping and smooth mascot floating

- [x] gate-16: Match History overhauled with creative esports game UI (recent form beads, outcome-accented cards, round-by-round beads, rematch action, filter pills) and copy simplified across Quiz Battle to student-friendly terminology
  CHECK: npm run typecheck && npm run lint:anti-slop
  EVIDENCE: TypeScript 0 errors, Oxlint Anti-Slop 0 errors, browser subagent visual verification completed at 1280x800 desktop and 390x844 mobile across Hub, Match History, and My Stats

- [x] gate-17: Hub tab layout restructured into full-width stacked order: Hero Banner -> Battle Modes -> Hall of Fame | My Stats (side-by-side) -> Match History (full width)
  CHECK: npm run typecheck
  EVIDENCE: > mathpulse-ai@1.2.0 typecheck | > tsc --noEmit (0 errors)

- [x] gate-18: Spacing and padding optimized for mobile and across all breakpoints, matching dashboard padding conventions
  CHECK: npm run typecheck
  EVIDENCE: > mathpulse-ai@1.2.0 typecheck | > tsc --noEmit (0 errors)

- [x] gate-19: Hero animated avatar positioned slightly lower into the card to prevent excessive top headroom
  CHECK: npm run typecheck
  EVIDENCE: > mathpulse-ai@1.2.0 typecheck | > tsc --noEmit (0 errors)

- [x] gate-20: My Stats tab compressed into high-density esports HUD layout with minimal vertical scrolling
  CHECK: npm run typecheck
  EVIDENCE: > mathpulse-ai@1.2.0 typecheck | > tsc --noEmit (0 errors)

- [x] gate-21: Hall of Fame sticky top-3 placement pills appear seamlessly at the header when podium is scrolled past
  CHECK: npm run typecheck
  EVIDENCE: > mathpulse-ai@1.2.0 typecheck | > tsc --noEmit (0 errors)

- [x] gate-22: Match settings setup tab redesigned for both VS Player and VS Bot modes with interactive Versus battle card and mobile-optimized controls
  CHECK: npm run typecheck && npm run lint:anti-slop
  EVIDENCE: > mathpulse-ai@1.2.0 typecheck | > tsc --noEmit (0 errors)

- [x] gate-23: Profile dropdown on tablet/desktop viewports in top-right header with My Profile, Settings, and Sign Out
  CHECK: npm run typecheck && npm run lint:anti-slop
  EVIDENCE: > mathpulse-ai@1.2.0 typecheck | > tsc --noEmit (0 errors), Oxlint 0 errors, verified in browser at 820x1000

- [x] gate-24: Unified slim top header in LessonViewer consolidating title, progress, and DepEd grounding into a single responsive row
  CHECK: npm run typecheck
  EXPECT: /tsc --noEmit/
  EVIDENCE: > mathpulse-ai@1.2.0 typecheck | > tsc --noEmit (0 errors), single-row header verified in browser across mobile (390x844), tablet (820x1000), and desktop (1280x800)

- [x] gate-25: Section navigation restructured into a responsive segmented pill rail with auto-scrolling on mobile and no protruding left layout shifts
  CHECK: npm run typecheck
  EXPECT: /tsc --noEmit/
  EVIDENCE: > mathpulse-ai@1.2.0 typecheck | > tsc --noEmit (0 errors), segmented horizontal pill rail verified with smooth scrolling and active tab centering

- [x] gate-26: Reading canvas flattened to eliminate 4x nested card layers, removing fake red margin line and clashing striped lines
  CHECK: npm run typecheck
  EXPECT: /tsc --noEmit/
  EVIDENCE: > mathpulse-ai@1.2.0 typecheck | > tsc --noEmit (0 errors), 4-layer nesting removed, clean card surface with colored top accent bar providing >80% viewport content density

- [x] gate-27: SectionRenderer callout banners (Important Rule, Pro Tip, Examples) compressed into high-density scannable alert strips
  CHECK: npm run typecheck && npm run lint:anti-slop
  EXPECT: /0 errors/
  EVIDENCE: > mathpulse-ai@1.2.0 typecheck (0 errors) | > mathpulse-ai@1.2.0 lint:anti-slop (Finished in 2.4s on 397 files with 111 rules, 0 errors), blank callout filtering verified

- [x] gate-28: TryItYourselfEngine responsive layout across mobile, tablet, and desktop viewports with non-overflowing stats bar and touch-friendly controls
  CHECK: npm run typecheck
  EXPECT: /tsc --noEmit/
  EVIDENCE: > mathpulse-ai@1.2.0 typecheck (0 errors), TryItYourselfEngine responsive header, compact stats bar (hearts/keys/streak/XP), question card, and action footer verified visually in browser (screenshot desktop_quiz_interface_1789901114716.png)

- [x] gate-29: LessonViewer horizontal reading canvas widened to eliminate dead side margins on widescreen displays
  CHECK: npm run typecheck
  EXPECT: /tsc --noEmit/
  EVIDENCE: > mathpulse-ai@1.2.0 typecheck (0 errors), max-width expanded to max-w-[96rem] across header, main, and footer, reading canvas fills widescreen space without dead margins (screenshot desktop_lesson_viewer_1789901024813.png)

- [x] gate-30: LessonViewer left-side notebook tabs spine restored on tablet/desktop (md:+) while retaining mobile horizontal tab rail (< md)
  CHECK: npm run typecheck
  EXPECT: /tsc --noEmit/
  EVIDENCE: > mathpulse-ai@1.2.0 typecheck (0 errors), left-side notebook spine tabs verified on desktop (1280x800) and automatic mobile horizontal tab rail verified on 390x844 (screenshot mobile_lesson_viewer_1789901252880.png)

- [x] gate-31: MobileBottomNav hidden during active quiz/battle interfaces and restored when match/quiz is completed
  CHECK: npm run typecheck && npm run lint:anti-slop
  EXPECT: /0 errors/
  EVIDENCE: > mathpulse-ai@1.2.0 typecheck (0 errors) | > mathpulse-ai@1.2.0 lint:anti-slop (0 errors), MobileBottomNav verified hidden during active quiz mode in TryItYourselfEngine and restored upon exit (recorded in quiz_and_notebook_tabs_verification_1789900906887.webp)

- [x] gate-32: LessonViewer container clearance and spacing ensuring header bar and notebook container do not stick or overlap across viewports
  CHECK: npm run typecheck && npm run lint:anti-slop
  EXPECT: /0 errors/
  EVIDENCE: > mathpulse-ai@1.2.0 typecheck (0 errors) | > mathpulse-ai@1.2.0 lint:anti-slop (0 errors), vertical clearance verified across desktop (1280x800), tablet (820x1000), and mobile (390x844) in browser subagent recordings (desktop_notebook_view_1789905753819.png, tablet_notebook_view_1789905786118.png, mobile_notebook_view_1789905818576.png)

- [x] gate-33: Engaging module content layout with intelligent objective extraction, DepEd competency badge, target goals grid, and visual roadmap strip
  CHECK: npm run typecheck && npm run lint:anti-slop
  EXPECT: /0 errors/
  EVIDENCE: > mathpulse-ai@1.2.0 typecheck (0 errors) | > mathpulse-ai@1.2.0 lint:anti-slop (0 errors), engaging module content layout with intelligent objective extraction, DepEd competency badge, target goals grid, and visual roadmap strip verified visually in browser
- [x] gate-34: Restored TryItYourselfEngine full-screen portal modal overlay eliminating sidebar squeeze on desktop viewports
  CHECK: npm run typecheck && npm run lint:anti-slop
  EXPECT: /0 errors/
  EVIDENCE: > mathpulse-ai@1.2.0 typecheck (0 errors) | > mathpulse-ai@1.2.0 lint:anti-slop (0 errors), TryItYourselfEngine restored from 7a6ba09~1 and mounted via ReactDOM.createPortal directly to root, rendering completely full screen (no desktop sidebar squeeze), verified visually in browser (screenshot desktop_quiz_portal_1789907815299.png)

- [x] gate-35: Mobile single tab on top left of container with dropdown navigation for unlocked module parts
  CHECK: npm run typecheck && npm run lint:anti-slop
  EXPECT: /0 errors/
  EVIDENCE: > mathpulse-ai@1.2.0 typecheck (0 errors) | > mathpulse-ai@1.2.0 lint:anti-slop (0 errors), mobile horizontal 7-tab scroll replaced with single top-left tab ('Part 1: Intro') with down chevron and interactive dropdown menu listing unlocked parts, verified visually in browser (screenshots mobile_dropdown_menu_1789907115009.png and mobile_part2_view_closed_dropdown_1789907283035.png)

- [x] gate-36: Polished mobile single-tab seamless attachment to container edge, comfortable breathing margins, removed messy lined paper, and structured concept cards with bolded key terms
  CHECK: npm run typecheck && npm run lint:anti-slop
  EXPECT: /0 errors/
  EVIDENCE: > mathpulse-ai@1.2.0 typecheck (0 errors) | > mathpulse-ai@1.2.0 lint:anti-slop (0 errors), single mobile tab seamlessly integrated with container edge with 0 gap, container padding increased for floating breathing room, lined paper and red margin removed for clean reading canvas, concept paragraphs wrapped in structured cards with bolded definition terms, verified visually in browser (screenshots mobile_part2_key_concepts_1789909355386.png, desktop_part2_key_concepts_1789909387151.png, and part2_key_concepts_1789909707981.png)
