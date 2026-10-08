# Gates: Integration — AI latency

Scope: all four leaves merged and consistent; full suites green vs baseline; user-visible outcomes measured.

- [ ] I1: All leaf gates files fully checked (or ABANDON lines recorded).
  EVIDENCE: pending

- [ ] I2: Backend full suite: no new failures vs baseline recorded before fan-out.
  EVIDENCE: pending

- [ ] I3: Frontend: vitest, typecheck, lint:anti-slop clean (no new errors).
  EVIDENCE: pending

- [ ] I4: Contract C1 verified end to end: frontend SSE parser consumes the backend's actual event output (in-process backend test client output fed to the frontend parser fixture, or a recorded stream fixture shared by both test suites).
  EVIDENCE: pending

- [ ] I5: Exact-file retrieval timing re-measured on the largest file (459 chunks): before 49.1s encode per call; after, second call ~0s and rebuilt-index query path < 1s.
  EVIDENCE: pending

- [ ] I6: Outward actions (upload rebuilt vectorstore to Firebase Storage, push, PR) only after explicit user approval.
  EVIDENCE: pending
