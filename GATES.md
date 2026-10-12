# Gates: AI lesson LaTeX corruption + main shell sideways scroll

Scope: AI lessons showed `\times` as "imes" and `\text{` as "ext{", plus a red `\` before `$$` blocks. Causes: (1) `json.loads` on model JSON with single-backslash TeX decodes `\t`/`\f`/`\b`/`\n`/`\r`, and ~20 call sites bypassed the shared parser; (2) `llm_text._fix_escapes` and the frontend chat formatter turned literal `\t`/`\n` into whitespace even inside TeX; (3) `MathText.escapeCurrencyDollars` paired the inner dollars of `$$...$$`; (4) several components printed AI text as plain text. Cached broken lessons and diagnostic analyses must regenerate. Also: the student main shell (`overflow-hidden`) is scrolled by `scrollIntoView`, shifting AI Chat 125px left / 150px up.

- [x] G1: The main content shell uses overflow-clip, not overflow-hidden
  CHECK: grep -c "relative z-10 overflow-clip" src/App.tsx
  EXPECT: /^1$/m
  EVIDENCE: 1

- [x] G2: Shared parser keeps single-backslash TeX (\times \text \frac \beta \neq \nabla \right \sqrt \cdot \underline) and still decodes real JSON escapes
  CHECK: cd backend && PYTEST_ADDOPTS="-p no:cacheprovider" PYTHONPATH=. PYTHONUTF8=1 python -m pytest tests/test_llm_json.py tests/test_llm_text.py tests/test_parse_json_response.py -q 2>&1
  EXPECT: /^(?!.*\b(failed|errors?)\b).*\d+ passed/m
  EVIDENCE: test_llm_json + test_llm_text + test_rag_regression: 71 passed; lane B run incl. test_parse_json_response: 265 passed

- [x] G3: Cached corrupted lessons and diagnostic analyses become cache misses
  CHECK: grep -c 'LESSON_PROMPT_VERSION = "2026-10-v3"' backend/routes/rag_routes.py && grep -c '_ANALYSIS_CACHE_VERSION = "2026-10-latex"' backend/routes/diagnostic.py
  EXPECT: /^1\s+1$/m
  EVIDENCE: 1 / 1 (read-only Firestore scan: 4 of 11 cached lessons corrupted, all promptVersion 2026-10-v2)

- [x] G4: MathText renders a mid-paragraph `$$...$$` containing words as math (no red `\`), chat formatter keeps `\neq`/`\nabla`
  CHECK: npx vitest run src/components/MathText.test.tsx src/utils/chatMessageFormatting.test.ts 2>&1
  EXPECT: /Tests\s+\d+ passed/
  EVIDENCE: MathText 9 passed; chatMessageFormatting 20 passed

- [x] G5: Full frontend suite, typecheck and anti-slop lint pass
  CHECK: npx tsc --noEmit 2>&1 && echo TSC_CLEAN
  EXPECT: TSC_CLEAN
  EVIDENCE: TSC_CLEAN; oxlint --quiet clean; vitest Test Files 155 passed (155), Tests 966 passed (966)

- [x] G6: Full backend suite passes
  EVIDENCE: pytest tests -q (excluding e2e): 1144 passed, 2 warnings in 124.74s
- [x] G7: PDF exports convert LaTeX to Helvetica-safe text (× ÷ ± ², a/b, sqrt(), <=) and leave currency alone
  CHECK: npx vitest run src/utils/latexToPlainText.test.ts src/utils/pdfExport.test.ts 2>&1
  EXPECT: /Tests\s+\d+ passed/
  EVIDENCE: lane run: src/utils + TeacherDashboard Test Files 21 passed, Tests 139 passed

- [x] G8: Streaming chat holds back an unclosed $$, \[, \( or math-looking $ until it closes; currency and code stay visible
  CHECK: npx vitest run src/utils/chatMessageFormatting.test.ts 2>&1
  EXPECT: /Tests\s+\d+ passed/
  EVIDENCE: 27 passed (red run: 4 failed)

- [x] G9: Full frontend suite stable after both changes
  EVIDENCE: two consecutive full runs: Test Files 156 passed (156), Tests 995 passed (995); tsc clean; oxlint exit 0

Post-deploy check (not a pre-merge gate): reopen the "Represent business transactions…" lesson in the live app and confirm \times, \text and $$ blocks render.
