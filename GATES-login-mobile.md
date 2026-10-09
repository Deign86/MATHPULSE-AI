# Gates: Login mobile layout (mascot not hidden by card)

Scope: Below `lg`, the login page shows the mascot peeking above a bottom-sheet card (inspo: mascot head over card edge); desktop keeps the cursor-tracking video background.

- [x] G1: Mobile layout renders mascot head above the card, not covered by it
  EVIDENCE: 375x812: head img 235-507px, visible head ends at 454px, card top 443px -> card covers only the chin (11px); face fully visible (screenshot verified). Asset public/avatar/avatar_icon.png already RGBA-transparent (61% alpha<10), no bg removal needed

- [x] G2: Cursor-tracking video background only mounts at `lg` and up (no video download on phones)
  EVIDENCE: document.querySelectorAll('video').length = 0 at 375px and 768px; = 1 at 1440px (DESKTOP_QUERY matchMedia gate)

- [x] G3: Sign-up (long form) and reset views still usable on a 375px phone; no horizontal scroll
  EVIDENCE: 375x812 sign-up fits (scrollHeight 812); 360x640 sign-up scrolls vertically; reset view renders; scrollWidth == innerWidth at 375 and 768

- [x] G4: Desktop (>=1024px) layout unchanged: video background + right-aligned card
  EVIDENCE: 1440x900: video background + right-aligned card, mobile mascot wrapper display:none

- [x] G5: LoginPage tests pass
  CHECK: npx vitest run src/components/LoginPage
  EXPECT: /Tests\s+\d+ passed/
  EVIDENCE: Tests  5 passed (5) (LoginPage.test.tsx + LoginPage.regression.test.tsx)

- [x] G6: Typecheck clean for LoginPage
  CHECK: npx tsc --noEmit -p . 2>&1 | grep -c "LoginPage" || true
  EXPECT: /^0$/
  EVIDENCE: grep -c LoginPage on tsc output = 0; oxlint --quiet and eslint on LoginPage.tsx: no errors
