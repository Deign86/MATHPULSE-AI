# Curriculum SOT Migration Gates

- [x] G1 Repository safety backup exists before destructive data changes.
  EVIDENCE: branch `chore/curriculum-sot-migration`, tag `pre-sot-migration`; `.tmp/backup-pre-sot/` created. No local `datasets/vectorstore/` existed to export.
- [x] G2 New curriculum corpus is inventoried and documented as the source of truth.
  CHECK: test -d datasets/curriculum/sshs_learning_resources && test -f datasets/curriculum/sshs_learning_resources/README.md
  EXPECT: corpus directory and README exist
  EVIDENCE: `datasets/curriculum/sshs_learning_resources/README.md`; discovery measured 30 Markdown sources, 0 duplicate PDF fallbacks, 0 README files.
- [x] G3 All ingestion dependencies use LiteParse and no active ingestion path imports pdfplumber.
  CHECK: rg -n "pdfplumber|from pdfplumber|import pdfplumber" requirements.txt backend/requirements.txt backend/rag backend/scripts backend/routes scripts
  EXPECT: no matches
  EVIDENCE: command returned no matches; `liteparse>=2.4.0` is present in both requirements files.
- [x] G4 LiteParse ingestion preserves the existing loader contract and has focused automated coverage.
  CHECK: python -m pytest backend/tests/test_liteparse_curriculum.py backend/tests/test_pdf_parser.py -q
  EXPECT: focused parser tests pass
  EVIDENCE: 4 passed in 0.07s; all modified Python files compiled. Full RAG suite: 10 passed, 3 environment/import failures (missing `openai`, `rag` package path).
- [x] G5 Stale persisted vectorstore/cache references are removed or explicitly excluded from the repository source of truth.
  EVIDENCE: no local `datasets/vectorstore/` existed; canonical ingestion recreates `curriculum_chunks` from the SSHS corpus; service worker cache bumped to `1.1.0-curriculum-sot`; legacy subject-specific cleanup deletion removed.
- [x] G6 Documentation and service-worker cache version reflect the new corpus and parser.
  CHECK: rg -n "LiteParse|sshs_learning_resources" AGENTS.md README.md FUTURE_CURRICULUM_IMPLEMENTATION.md MISSING_PDFS_TRACKING.md public/sw.js
  EXPECT: all target files contain current migration references
  EVIDENCE: references present in all five target documents/service-worker files; cache version `1.1.0-curriculum-sot`.
- [x] G7 Frontend and backend validation complete.
  CHECK: npm run typecheck && npm run build
  EXPECT: commands exit 0
  EVIDENCE: `npm run typecheck` passed; `npm run build` passed in 22.30s. Backend focused tests passed; full RAG suite remains environment-blocked as recorded in G4.
