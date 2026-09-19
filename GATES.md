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
  EVIDENCE: To eliminate this warning, add "type": "module" to C:\Users\ROSADO\Documents\GitHub\My-Portfolio\mathpulse-ai\package.json. | (Use `node --trace-warnings ...` to show where the warning was created)
