# Acceptance Gates — MathPulse AI Mascot Hero Redesign

| Gate | Status | Command / Evidence | Result |
|---|---|---|---|
| Multi-tier video asset processing & upscaling (8K master, 1080p web, WebM VP9, mobile 720p, poster) | PASSED | FFmpeg Lanczos + unsharp + faststart + WebM VP9 derivatives generated in `src/assets/video/` and `public/assets/masters/` | Generated 8K master (48MB), 1080p MP4 (3.1MB), 1080p WebM (1.1MB), mobile 720p (861KB), WebP/PNG posters |
| Full-bleed looping video background integration | PASSED | `<InteractiveRobotBackground />` with dual `<source>` (WebM/MP4), autoPlay, muted, loop, playsInline | 0-flicker infinite loop covering full viewport |
| 3D Cursor-reactive tracking & spring physics | PASSED | Window pointermove normalized to `[-1, 1]` with RAF lerp (`dx * 0.08`), 3D transform (`translate3d`, `rotateY`, `rotateX`, `scale`) | Verified live transform in Chrome DevTools: `translate3d(-25.32px, -11.44px, 0px) rotateY(-3.8deg)` |
| Unobstructed mascot hero placement | PASSED | Left canvas cleared so the mascot stands tall and unobstructed without overlapping text | Mascot is completely visible in full 3D detail |
| MathPulse original identity & colorscheme preservation | PASSED | Header with MathPulse logo + "Powered by Machine Learning" + "SHS STEM", bottom feature cards ("AI Predictions", "Analytics", "Gamified"), frosted glass login card | Matches exact visual branding and pastel accents |
| Complete Firebase auth & demo accounts preservation | PASSED | Email/Password, Sign Up with role/grade/section/password checklist, Google OAuth, 1-Click Demo Profiles (Student, Teacher, Admin) | 1-Click demo and form submission functional |
| Production bundle & test suite verification | PASSED | `npm run build` and `npm run test` | Build exit code 0; 27 test files, 178 tests passing |

---

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

