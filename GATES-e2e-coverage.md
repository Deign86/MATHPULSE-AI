# Gates: e2e coverage of every feature for every role

Scope: write tester-army/e2e tests under `tests/e2e/` that cover every user-facing MathPulse feature for student, teacher, admin, and signed-out users. Per the user (2026-10-08): do not run the suites or explorations; verify statically.

- [x] G1: ChatGPT subscription login serves the agent model
  CHECK: npx e2e models openai
  EXPECT: gpt-6-luna
  EVIDENCE: `npx e2e models openai` listed 10 models incl. `gpt-6-luna` after `npx e2e login openai` ("ChatGPT login stored; the token refreshes itself.")

- [x] G2: Signed-in sessions exist for every account (`tests/e2e/auth.setup.e2e.ts`: student, student2, teacher, admin)
  EVIDENCE: pilot run `✓ web tests/e2e/auth.setup.e2e.ts (1 test) 52.67s` (student session saved against the live build); file declares one `test.setup` per account

- [x] G3: Feature map lists every user-facing feature per role, with a completeness-critic pass
  EVIDENCE: workflow wf_326608dd-152 (6/6 agents ok): crosscutting 24, admin 22, existing-coverage 15, teacher 25, student 30 entries + critic 13 additions/corrections; saved to scratchpad/feature-map.json

- [x] G4: Every feature area in the map is assigned to a lane and has tests (area list in tests/e2e/codemap.md)
  EVIDENCE: 18 writer lanes covered every mapped area (public, session, notif-pwa, student-shell, modules-lessons, quizzes, ai-chat, assessment, battle, identity, teacher-home, intervention, quizmaker, import-mastery, teacher-account, admin-users, admin-systems, admin-account); features not coverable safely are declared skips with reasons (7 declared `skipped:` in `e2e list`, plus runtime test.skip guards for absent data)

- [x] G5: `e2e list` collects every new test without a collection error
  CHECK: bash -c 'set -a; . ./.e2e/creds.env; set +a; E2E_TELEMETRY_DISABLED=1 npx e2e list 2>&1 | tail -3'
  EXPECT: /tests\/e2e\//
  EVIDENCE: `e2e list` exit 0, 400 tests collected (396 tests in 45 files + 4 setup), 61 tagged known-bug

- [x] G6: New tests typecheck
  EVIDENCE: `npx tsc -p scratchpad/tsconfig.e2e.json` (tests/e2e/**/*.ts + e2e.config.ts, strict) → exit 0, no output

- [x] G7: New tests pass anti-slop lint
  CHECK: npx oxlint --quiet tests/e2e e2e.config.ts
  EXPECT: /^(?![\s\S]*\berror\b)/
  EVIDENCE: `npx oxlint --quiet tests/e2e e2e.config.ts` → no diagnostics; pre-commit hook "Anti-slop checks passed" on commit 345d1004

- [x] G8: Every deterministic locator string in new tests exists in src/ (verified by an independent review pass)
  EVIDENCE: 18/18 Sonnet reviewer lanes completed (workflow wf_9e761315-c51): 4080 locator call sites grep-checked, 106 problems fixed in place

- [x] G9: No new test performs destructive or cross-user writes on the live Firebase project (review pass)
  EVIDENCE: reviewers applied 26 safety fixes; grep finds no tap on 'Yes, Reset Data' / 'Yes, Purge Everything' / 'Confirm import' / 'Publish Lesson Plan' / 'Deploy Knowledge Source' / 'Update Password'; the only 'Onboard User' taps are validation-blocked submits (admin-console.e2e.ts:215,221) followed by Cancel

ABANDON: G4 completeness-critic second pass and gap-fill round — stopped on 2026-10-08 when the user asked to focus on merging; per-lane coverage and declared skips stand instead.

- [x] G10: One GitHub issue per verified bug found while reading source for the tests (or none found, stated)
  CHECK: gh issue list --label bug --state open --limit 200 --json number --jq length
  EXPECT: /^9[6-9]|^[1-9]\d{2}/
  EVIDENCE: 108 merged suspects → 2 Sonnet refute-votes each (workflow wf_fca5602d-f0f, 54/54 agents ok) → 96 confirmed, 12 refuted (B01 B02 B07 B12 B13 B40 B50 B65 B66 B69 B84 B87); issues #211-#306 opened (96, labels bug + frontend/backend/teacher-ui); `gh issue list --label bug --state open` → 96

- [x] G11: Merged to main
  EVIDENCE: PR #210 merged 2026-10-08T08:43:57Z as d1116bd6 after 7/7 CI checks passed (mergeStateStatus CLEAN)

ABANDON: bug-bash explore runs, repro tests, and run-based verification (former G3, G6-G8) — user asked on 2026-10-08 not to run tests ("it takes too long"); servers stopped.
