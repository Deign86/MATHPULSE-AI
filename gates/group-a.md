# Group A P0 Excel import acceptance gates

- [ ] TC-TCH-043: parse spreadsheets before confirmation; preview learner names, LRNs, scores and parser errors; block uploads after parser failure and suppress callbacks for rejected imports.
  CHECK: npm test -- --run src/features/import src/features/DataImport
  EXPECT: targeted frontend tests pass, including workbook parse and preview behavior.
  EVIDENCE: BLOCKED — 9 test files / 19 tests passed; useWorkbookImport.test.tsx cannot resolve root node_modules/@testing-library/jest-dom/dist/vitest.mjs.
- [ ] TC-TCH-074: duplicate LRNs reject the entire class-record or student-account import without changing existing records, roster membership or risk totals.
  CHECK: python -m pytest backend/tests/ -q -k import
  EXPECT: import-focused backend tests pass, including duplicate-LRN atomic rejection.
  EVIDENCE: `python -m pytest backend/tests/ -q -k import` — 21 passed, 563 deselected.
- [x] Frontend typecheck passes.
  CHECK: npm run typecheck
  EXPECT: command exits with status 0.
  EVIDENCE: `npm run typecheck` — passed (`tsc --noEmit`, exit 0).
