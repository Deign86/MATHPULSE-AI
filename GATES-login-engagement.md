# Gates: Login engagement copy (desktop + mobile)

Scope: Login page shows student-facing engagement text on both layouts: mascot speech bubble (per view), friendlier subtitles, and a feature strip naming real features (AI tutor, Quiz Battle, XP/avatar shop).

- [x] G1: Mobile shows mascot speech bubble above head; text changes for sign-in / sign-up / reset
  EVIDENCE: 375x812 bubble text: sign-in 'Welcome back! Your streak is waiting.', reset 'No worries! Let's get you back in.', sign-up 'Hi! I'm your math buddy. Let's level up together!' (screenshots); headline 'Math gets easier with a buddy.' above it on sign-in/reset

- [x] G2: Desktop (xl) shows speech bubble beside the robot head without overlapping the robot or card
  EVIDENCE: 1440x900: copy block x 619-878px, card left 912px, robot headphone ends ~530px; screenshot shows bubble beside head, headline + subtext in the gap. Hidden on sign-up and below xl (no room next to the wider sign-up card)

- [x] G3: Feature strip (AI tutor, Quiz Battle, Earn XP) visible inside the card on mobile and desktop
  EVIDENCE: li texts: 'AI Tutor/Step-by-step help', 'Quiz Battle/Face your classmates', 'Earn XP/Unlock avatar gear' at 375px; visible in card at 1440px screenshot

- [x] G4: No horizontal scroll at 375px; mascot face still not covered by card
  EVIDENCE: 375px: scrollWidth 375 == innerWidth; eyes at y=373, card top 445 (covers chin only)

- [x] G5: LoginPage tests pass
  CHECK: npx vitest run src/components/LoginPage
  EXPECT: /Tests\s+\d+ passed/
  EVIDENCE: Tests  5 passed (5)

- [x] G6: Typecheck + lint clean for LoginPage
  EVIDENCE: tsc output LoginPage matches = 0; oxlint --quiet and eslint on LoginPage.tsx: no findings

## Round 2: text placement + background decor

- [x] G7: Desktop speech bubble pinned to the robot head at any viewport (CSS calc on the object-cover video frame)
  EVIDENCE: bubble left vs head right edge: 1920x1080 749 vs ~720; 1440x900 579 vs 555; 1280x800 515 vs 494; 1366x768 533 vs 512; 1280x1024 559 vs 531. Bubble right < card left in all (803<912, 739<792, 757<868, 783<792)
- [x] G8: Desktop headline sits above the card, hidden below 800px viewport height
  EVIDENCE: 1440x900 headline visible, scrollHeight 900; 1366x768 headline hidden, scrollHeight 768 (no scroll)
- [x] G9: Mobile background decor (grid, glow, orbit ring, math glyphs, sparkles); desktop gets grid + glyphs + sparkles at xl
  EVIDENCE: screenshots 375x812 and 1440x900; desktop decor elements overlapping card = [] (measured)
- [x] G10: Tests/typecheck/lint still clean
  EVIDENCE: Tests 5 passed (5); tsc LoginPage matches 0; oxlint + eslint no findings
- [x] G11: Desktop headline always visible at lg+ (compact 24px under 800px height instead of hidden); mobile sparkles moved off the headline
  EVIDENCE: headline shown at 1366x650 (24px, scrollH 668), 1366x768 (24px, scrollH 768), 1100x700 (24px, scrollH 700), 1536x730 (24px, scrollH 730), 1440x900 (36px, scrollH 900); screenshot 1536x730

## Round 3: headline top-left, smaller robot

- [x] G12: Desktop robot video scaled to 0.8 from bottom-left, top/right edges faded into matching gradient; headline top-left clear of robot at all tested sizes
  EVIDENCE: headline bottom vs pulse-line top: 1920x1080 133<300; 1440x900 133<250; 1366x768 82<213; 1280x800 178<222; 1536x730 82<159; 1366x650 82<142. scrollHeight == viewport height in all.
- [x] G13: Bubble stays beside the head and left of the card after scaling
  EVIDENCE: bubble left vs head right / bubble right vs card left: 1920 599>576 / 855<1152; 1440 463>444 / 687<912; 1366x768 426>410 / 650<875; 1280 412>395 / 636<792; 1536 479>461 / 735<960
- [x] G14: Tests/typecheck/lint clean (LoginPage + InteractiveRobotBackground)
  EVIDENCE: Tests 5 passed (5); tsc matches 0; oxlint + eslint no findings

## Round 4: robot right, text down + bigger

- [x] G15: Robot shifted right (translateX 22vw), headline vertically centered on the left and enlarged; no overlaps
  EVIDENCE: text right < robot left < robot right < card left: 1920x1080 605<645<998<1152 (60px font); 1488x697 462<500<774<936 (44px); 1366x768 422<459<710<875 (44px); 1280x800 377<415<676<792 (48px); 1366x650 422<459<710<875. Bubble above head (bottom < pulse top: 284<300, 136<148, 201<213, 210<222, 131<142). scrollHeight == viewport height.
- [x] G16: Tests/typecheck/lint clean
  EVIDENCE: Tests 5 passed (5); tsc matches 0; oxlint + eslint no findings
- [x] G17: Desktop headline sized to its column (container query, clamp 2.25rem..7.5rem / 17.5cqw) so it fills the space left of the robot
  EVIDENCE: font / widest line right / robot left: 1920x910 99px / 572 / 645; 2560x1300 101px / 582 / 860; 1366x650 67px / 399 / 459; 1280x800 59px / 357 / 415; 1100x700 48px / 300 / 354. scrollHeight == viewport height in all. Tests 5 passed (5); tsc 0; oxlint + eslint clean.
