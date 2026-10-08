# Gates: lane a

Scope: issues #256 #257 #255 #254 #221 #220 #219 #218 #216 #261 #222 #223 #259 (app shell, navigation, shortcuts) in worktree lane-a. CHECK commands run from the worktree root; `node_modules` there is a junction, so the vitest gate writes a throwaway config that allows the main checkout path and deletes it afterwards.

- [x] G256: Alt+P opens Profile, not Settings
  CHECK: grep -n -A2 "case 'p':" src/App.tsx
  EXPECT: handleStudentNavigationRef.current('Profile')
  EVIDENCE: 1051-            e.preventDefault(); | 1052-            handleStudentNavigationRef.current('Profile');
- [x] G257: calculator Alt shortcuts stop before the window handler; Alt+K still passes through to the app toggle
  CHECK: grep -n -A3 "if (e.altKey) {" src/components/ScientificCalculator.tsx
  EXPECT: /if \(key === 'k' \|\| key === 'K'\) return;[\s\S]*e\.stopPropagation\(\);/
  EVIDENCE: 403-        e.preventDefault(); | 404-        e.stopPropagation();
- [x] G255: popstate goes through handleStudentNavigation (sidebar revert on browser Back)
  CHECK: grep -n -A3 "const handlePopState" src/App.tsx
  EXPECT: handleStudentNavigationRef.current(tab)
  EVIDENCE: 266-      handleStudentNavigationRef.current(tab); | 267-    };
- [x] G254: logout resets the history entry to /
  CHECK: grep -n -A6 "const handleLogout" src/App.tsx
  EXPECT: window.history.replaceState({}, '', '/')
  EVIDENCE: 801-      setActiveTab('Dashboard'); | 802-      window.history.replaceState({}, '', '/');
- [x] G221: popstate, the shortcut effect and the mathpulse:navigate effect all call the latest handleStudentNavigation through a ref (1 popstate + 1 effect assignment + 7 shortcuts + 1 notification = 10)
  CHECK: grep -c "handleStudentNavigationRef.current" src/App.tsx
  EXPECT: /^10\s*$/m
  EVIDENCE: 10
- [x] G220: the only remaining setActiveTab literal is handleLogout's Dashboard reset (paired with replaceState in G254); Leaderboard/Modules/AI Chat/Dashboard view changes go through handleStudentNavigation
  CHECK: grep -c "setActiveTab('" src/App.tsx
  EXPECT: /^1\s*$/m
  EVIDENCE: 1
- [x] G219: Progress Paused card offers Sign out and the false "review completed lessons" footer is gone
  CHECK: grep -n "Sign out\|review completed lessons" src/components/ProgressGate.tsx
  EXPECT: /^(?![\s\S]*review completed lessons)[\s\S]*Sign out/
  EVIDENCE: 115:                Sign out
- [x] G218: a signed-out visitor can open the sign-in form from the maintenance page
  CHECK: grep -n "Admin sign in\|showMaintenanceSignIn))" src/App.tsx
  EXPECT: /!showMaintenanceSignIn\)\) \{[\s\S]*Admin sign in/
  EVIDENCE: 1087:  if (maintenanceMode && (isLoggedIn ? userRole !== 'admin' : !showMaintenanceSignIn)) { | 1107:              Admin sign in
- [x] G216: AI Chat main reserves the bottom-nav height below lg
  CHECK: grep -c "activeTab === 'AI Chat' ? 'overflow-hidden p-0 pb-\[4.5rem\] lg:pb-0'" src/App.tsx
  EXPECT: /^1\s*$/m
  EVIDENCE: 1
- [x] G261: HeroBanner keeps a stored dismissal when completion resolves from unknown (null) to true, and still clears it on a real false-to-true completion
  CHECK: node -e "require('fs').writeFileSync('vitest.lane-a.tmp.config.ts', \"import { defineConfig, mergeConfig } from 'vitest/config';\nimport base from './vitest.config';\nexport default mergeConfig(base, defineConfig({ server: { fs: { allow: ['C:/Users/APG/Downloads/MATHPULSE-AI'] } } }));\n\")" && npx vitest run --config vitest.lane-a.tmp.config.ts src/components/HeroBanner.test.tsx src/components/AIChatPage.test.tsx src/App.test.tsx & del vitest.lane-a.tmp.config.ts
  EXPECT: /Test Files\s+3 passed \(3\)[\s\S]*Tests\s+8 passed \(8\)/
  EVIDENCE: Start at  18:00:04 | Duration  7.79s (transform 6.20s, setup 4.83s, import 8.60s, tests 861ms, environment 4.38s)
- [x] G222: RightSidebar Current XP receives displayXP (Rewards page and modal keep the in-level XP for their level bar)
  CHECK: grep -n -A8 "<RightSidebar" src/App.tsx
  EXPECT: currentXP={displayXP}
  EVIDENCE: 1643-                              userPhoto={profileData.photo} | 1644-                              currentXP={displayXP}
- [x] G223: no fabricated "2 of 5 Lessons" badge or 40% bar in either Daily Goals card
  CHECK: grep -c "2 of 5 Lessons\|w-\[40%\]" src/App.tsx src/components/RightSidebar.tsx
  EXPECT: /App\.tsx:0[\s\S]*RightSidebar\.tsx:0/
  EVIDENCE: src/App.tsx:0 | src/components/RightSidebar.tsx:0
- [x] G259: Streak slab reads "1 Day" for a one-day streak
  CHECK: grep -n "currentStreak === 1" src/components/RightSidebar.tsx
  EXPECT: {currentStreak} {currentStreak === 1 ? 'Day' : 'Days'}
  EVIDENCE: 362:              {currentStreak} {currentStreak === 1 ? 'Day' : 'Days'}
- [x] G-E2E: known-bug removed from the tests these issues name; only the SymPy badge test (other lane) and the Gold Crown preview test (not in scope) stay tagged
  CHECK: grep -c "known-bug" tests/e2e/student/shortcuts-calculator.e2e.ts tests/e2e/regression/quiz-battle.e2e.ts tests/e2e/crosscutting/session-logout.e2e.ts tests/e2e/student/avatar-studio.e2e.ts tests/e2e/crosscutting/routing-guards.e2e.ts tests/e2e/learning/ai-chat.e2e.ts tests/e2e/student/dashboard.e2e.ts tests/e2e/student/gamification.e2e.ts
  EXPECT: /shortcuts-calculator\.e2e\.ts:1[\s\S]*quiz-battle\.e2e\.ts:0[\s\S]*session-logout\.e2e\.ts:0[\s\S]*avatar-studio\.e2e\.ts:1[\s\S]*routing-guards\.e2e\.ts:0[\s\S]*ai-chat\.e2e\.ts:0[\s\S]*dashboard\.e2e\.ts:0[\s\S]*gamification\.e2e\.ts:0/
  EVIDENCE: tests/e2e/student/dashboard.e2e.ts:0 | tests/e2e/student/gamification.e2e.ts:0
- [x] G-TSC: typecheck passes
  CHECK: npx tsc --noEmit && echo TSC_OK
  EXPECT: TSC_OK
  EVIDENCE: TSC_OK
- [x] G-LINT: eslint passes on every changed source file
  CHECK: npx eslint src/App.tsx src/components/ProgressGate.tsx src/components/HeroBanner.tsx src/components/HeroBanner.test.tsx src/components/RightSidebar.tsx src/components/ScientificCalculator.tsx --max-warnings=0 && echo LINT_OK
  EXPECT: LINT_OK
  EVIDENCE: (node:14244) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead. | (Use `node --trace-deprecation ...` to show where the warning was created)
- [x] G-OX: oxlint anti-slop passes
  CHECK: npx oxlint --quiet && echo OX_OK
  EXPECT: OX_OK
  EVIDENCE: To eliminate this warning, add "type": "module" to C:\Users\APG\Downloads\MATHPULSE-AI\.worktrees\lane-a\package.json. | (Use `node --trace-warnings ...` to show where the warning was created)
