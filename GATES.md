# Gates: codev-reported bugs (quiz review, notifications, daily rewards, first-use guide)

Scope: fix the bugs from the codev's phone screenshots and the onboarding brief. Quiz review marks only the learner's own pick as wrong and stops repeating the quiz title as each question's explanation; opening a notification closes the panel instead of leaving it over the Daily Rewards modal; a claimed day shows as Claimed; the guide is offered once (Play / Skip) to freshly created accounts only, never autoplays for existing accounts, and stays reachable from the ? button and Settings.

- [x] G1: After answering a question, only the option the learner picked on that question is red; the previous question's pick no longer bleeds into the next question's review, and reviewing an earlier question shows its own pick and hint eliminations
  CHECK: npx vitest run src/components/QuizExperience.review.test.tsx 2>&1
  EXPECT: /Tests\s+\d+ passed/
  EVIDENCE: Start at  13:30:16 | Duration  5.47s (transform 2.18s, setup 1.18s, import 2.38s, tests 851ms, environment 894ms)

- [x] G2: The explanation section no longer shows the quiz title (the joined competency text) as an identical header on every question; generated quiz titles no longer read "equations. and Analyze"
  CHECK: npx vitest run src/components/QuizExperience.review.test.tsx src/data 2>&1
  EXPECT: /Tests\s+\d+ passed/
  EVIDENCE: Start at  13:30:23 | Duration  5.89s (transform 4.69s, setup 5.29s, import 2.57s, tests 904ms, environment 1.18s)

- [x] G3: Activating a notification row (click, Enter, Space) closes the notification panel, and only daily-reward notifications open the Daily Rewards modal
  CHECK: npx vitest run src/features/notifications src/components/ModulesPage.test.tsx 2>&1
  EXPECT: /Tests\s+\d+ passed/
  EVIDENCE: Start at  13:30:31 | Duration  11.18s (transform 30.88s, setup 24.03s, import 27.86s, tests 8.52s, environment 13.36s)

- [x] G4: Claiming a daily reward persists the claimed day, so the Daily Rewards modal shows today as Claimed (not Available) next to "Claimed for today"; past unclaimed days are not offered as Available
  CHECK: npx vitest run src/services/__tests__/dailyRewardService.test.ts src/components/__tests__/DailyCheckInModal.test.tsx src/hooks/__tests__/useDailyReward.test.ts 2>&1
  EXPECT: /Tests\s+\d+ passed/
  EVIDENCE: Start at  13:30:44 | Duration  3.66s (transform 2.77s, setup 3.96s, import 1.11s, tests 939ms, environment 2.48s)

- [x] G5: First-use guide: a freshly created account is asked once (Play / Skip); Play starts the guide, Skip shows where to find it (? button, Settings); an existing account is never auto-prompted or autoplayed; the ? button and Settings replay still work
  CHECK: npx vitest run src/hooks/useOnboardingTour.test.tsx src/components/onboarding 2>&1
  EXPECT: /Tests\s+\d+ passed/
  EVIDENCE: Start at  13:30:49 | Duration  14.99s (transform 6.98s, setup 10.81s, import 2.07s, tests 12.35s, environment 6.94s)

- [x] G6: Accounts created by admins/teachers through the backend are also marked as new, so their first login gets the offer
  CHECK: cd backend && set PYTHONPATH=.&& set PYTHONUTF8=1&& set "PYTEST_ADDOPTS=-p no:cacheprovider"&& python -m pytest tests/test_user_provisioning_service.py -q 2>&1
  EXPECT: /^(?!.*\b(failed|errors?)\b).*\d+ passed/m
  EVIDENCE: ....                                                                     [100%] | 4 passed in 2.77s

- [x] G7: TypeScript typecheck passes
  CHECK: npx tsc --noEmit 2>&1 && echo TSC_CLEAN
  EXPECT: TSC_CLEAN
  EVIDENCE: TSC_CLEAN

- [x] G8: Anti-slop oxlint reports no errors
  CHECK: npx oxlint --quiet 2>&1 && echo OXLINT_CLEAN
  EXPECT: OXLINT_CLEAN
  EVIDENCE: (Use `node --trace-warnings ...` to show where the warning was created) | OXLINT_CLEAN

- [x] G9: Full frontend test suite has no failures beyond the pre-change baseline
  EVIDENCE: `npx vitest run --passWithNoTests` → "Test Files 155 passed (155) / Tests 961 passed (961)"; baseline before edits was 151 files / 920 tests, all passing. Backend files touched (test_user_provisioning_service, test_api, test_practice_router, test_quiz_generation_regression): 156 passed. eslint on the 27 changed .ts/.tsx files: exit 0.

- [x] G10: Each fix was adversarially reviewed and every confirmed finding was fixed or explicitly rejected with a reason
  EVIDENCE: Independent reviewers (quiz: Opus, notifications: Sonnet, onboarding: Opus) returned verdict "ship" with low findings only. The daily-rewards lane (Haiku) crashed before its review, so its diff was reviewed by hand: correct, and extended so today's card follows canClaim (claims made before claimedDays was saved). Fixed from low findings: offer shown only on the home page (useOnboardingTour.ts offerOpen), focus moves to the ? button after "Got it" (FirstUseGuidePrompt.tsx), stale hooks codemap + docs/*-onboarding-guide.md. Each new test was mutation-checked (fails with the fix removed: "Tests 3 failed | 22 passed"). Rejected: start() not answering the offer (needs a guide played from Settings before the offer appears; would need the flag split from the home-page condition); keyboard focus after a notification opens the Daily Rewards modal (the modal takes focus); questionId uniqueness (same lookup as the results screen and backend submit); repeated non-title topics (the generator stamps the quiz title, which is now hidden).

## Dead code found during the fixes

- [x] G11: The legacy src/components/NotificationDropdown.tsx is deleted and no source, test or codemap still names it (the live panel is features/notifications/NotificationPanel.tsx)
  CHECK: rg -n NotificationDropdown src tests & rg -n -g codemap.md NotificationDropdown . & if not exist src\components\NotificationDropdown.tsx echo DROPDOWN_GONE
  EXPECT: /^\s*DROPDOWN_GONE\s*$/
  EVIDENCE: DROPDOWN_GONE

- [x] G12: The never-called handleShowAnswer is removed from QuizExperience.tsx and nothing in the frontend, backend or functions still writes or special-cases 'show_answer' records
  CHECK: rg -n "handleShowAnswer|show_answer" src tests backend functions & echo SCAN_DONE
  EXPECT: /^\s*SCAN_DONE\s*$/
  EVIDENCE: SCAN_DONE

- [x] G13: TypeScript typecheck passes after the removals
  CHECK: npx tsc --noEmit 2>&1 && echo TSC_CLEAN
  EXPECT: TSC_CLEAN
  EVIDENCE: TSC_CLEAN

- [x] G14: Anti-slop oxlint reports no errors after the removals
  CHECK: npx oxlint --quiet 2>&1 && echo OXLINT_CLEAN
  EXPECT: OXLINT_CLEAN
  EVIDENCE: (Use `node --trace-warnings ...` to show where the warning was created) | OXLINT_CLEAN

- [x] G15: eslint passes on the touched source file
  CHECK: npx eslint src/components/QuizExperience.tsx 2>&1 && echo ESLINT_CLEAN
  EXPECT: ESLINT_CLEAN
  EVIDENCE: (Use `node --trace-deprecation ...` to show where the warning was created) | ESLINT_CLEAN

- [x] G16: Quiz and notification tests pass
  CHECK: npx vitest run src/components/QuizExperience src/features/notifications 2>&1 && echo VITEST_OK
  EXPECT: /Tests\s+\d+ passed[\s\S]*VITEST_OK/
  EVIDENCE: Test Files  17 passed (17) | Tests  103 passed (103) | VITEST_OK
