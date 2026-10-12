# Gates: main content shell scrolls sideways on AI Chat

Scope: the student main content shell (`src/App.tsx`) uses `overflow-hidden`, which still allows programmatic scrolling. `scrollIntoView` calls (chat input/messages, Grades, LessonViewer) scroll the shell to reveal the decorative blur orbs that sit outside it, shifting the page 125px left / 150px up. Switch the shell to `overflow-clip` so it can't be scrolled.

- [x] G1: The main content shell uses overflow-clip, not overflow-hidden
  CHECK: grep -c "relative z-10 overflow-clip" src/App.tsx
  EXPECT: /^1$/m
  EVIDENCE: 1

- [x] G2: TypeScript typecheck passes
  CHECK: npx tsc --noEmit 2>&1 && echo TSC_CLEAN
  EXPECT: TSC_CLEAN
  EVIDENCE: TSC_CLEAN

- [x] G3: App-level tests still pass
  CHECK: npx vitest run src/App 2>&1
  EXPECT: /Tests\s+\d+ passed/
  EVIDENCE: Test Files  1 passed (1) | Tests  2 passed (2)

- [x] G4: On the live AI Chat page, scrollIntoView on the chat input scrolls the shell with overflow-hidden (control: scrollTop 150) and does not with overflow-clip (scrollTop 0, scrollLeft 0)
  EVIDENCE: live /chat, 2026-10-12: overflow-hidden -> scrollIntoView left shell at [0,150] (earlier send: [125,150]); overflow clip -> [0,0]
