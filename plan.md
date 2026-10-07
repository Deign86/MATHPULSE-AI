# Recent Merge Regression Investigation

## Scope
Audit the three most recently merged pull requests on `main` (#204, #206, #197), reproduce regressions introduced or exposed by their combined merge order, fix proven root causes with the smallest safe diff, and verify the repository using `TESTING.md`.

## Contracts
- Treat `origin/main` as the integration truth after refreshing refs.
- Inspect every changed file from the three PRs, with extra attention to files touched by more than one PR.
- Do not change behavior without a reproduced failure, a broken contract, or a demonstrable merge-loss conflict.
- Add or strengthen regression coverage before each code fix when practical.
- Keep fixes local to the proven root cause and preserve unrelated merged behavior.

## Work leaves
1. Establish the exact three merged PRs, merge order, changed-file overlap, and CI/test baseline.
2. Review each PR independently for merge-losses, stale assumptions, and contract conflicts.
3. Reproduce suspected regressions with targeted tests or deterministic checks.
4. Patch proven regressions and add regression tests.
5. Run targeted checks, full CI-equivalent verification, anti-slop, and final diff review.

## Status log
- 2026-10-07: Investigation started; latest merged PRs identified as #204, #206, and #197.
- 2026-10-07: Fixed proven merge regressions in assessment CTA navigation, assessment-alert dismissal persistence, quiz attempt persistence ownership, profile failed-save handling, teacher calendar save state, and Admin Subjects availability totals/realtime reconciliation; final CI-equivalent verification completed.
- 2026-10-07: Post-fix regression sweep passed frontend (551), backend (598), targeted changed-feature tests (27), production build/static checks, and all 79 Functions tests under Firestore+RTDB emulators. Authenticated browser E2E remains credential-gated because no E2E user credentials are configured locally.
