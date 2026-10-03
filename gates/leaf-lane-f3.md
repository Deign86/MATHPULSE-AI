# Lane F3 acceptance gates

Scope: Add two focused teacher-domain e2e tests, with no production/config changes.

- [x] G1: Teacher dashboard test covers teacher sign-in, class/roster visibility, and risk badges.
  CHECK: npx e2e list --reporter json
  EXPECT: teacher-dashboard.e2e.ts
  EVIDENCE: `npx e2e list --reporter json` output listed `tests/e2e/teacher/teacher-dashboard.e2e.ts` with title `teacher signs in and sees classes with risk badges`.

- [x] G2: Intervention/import test covers intervention entry and Data Import view without uploading.
  CHECK: npx e2e list --reporter json
  EXPECT: interventions-import.e2e.ts
  EVIDENCE: `npx e2e list --reporter json` output listed `tests/e2e/teacher/interventions-import.e2e.ts` with title `teacher opens intervention center and Data Import without uploading`.

- [x] G3: Both teacher tests are discovered without invalid configuration.
  CHECK: npx e2e list --reporter json
  EXPECT: /teacher-dashboard\.e2e\.ts[\s\S]*interventions-import\.e2e\.ts|interventions-import\.e2e\.ts[\s\S]*teacher-dashboard\.e2e\.ts/
  EVIDENCE: The JSON output listed both teacher test paths and showed each with `"disposition": "run"`; no `INVALID_CONFIG` occurred.

- [x] G4: No e2e run is started while another lane owns the dev-server port.
  EVIDENCE: Only `npx e2e list --reporter json` was run; no `npx e2e run` command was issued.
