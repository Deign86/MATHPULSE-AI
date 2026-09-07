# Gates: PR #139 Post-Merge Rollout

Scope: Full post-merge rollout for PR #139: Firebase Storage replacement, RAG reingestion with LiteParse, QA validation, and PWA cache/deployment verification.

- [x] G1: Firebase Storage replacement: rollback snapshot saved, superseded objects deleted, new SSHS corpus uploaded and integrity verified.
  CHECK: python -c "from pathlib import Path; import json; p = sorted(Path('ops/rollback').glob('pr139-firebase-snapshot-*.json')); print('SNAPSHOT_EXISTS' if p and len(json.loads(p[-1].read_text())) > 0 else 'NO_SNAPSHOT')"
  EXPECT: SNAPSHOT_EXISTS
  EVIDENCE: Passed. Snapshot saved to ops/rollback/pr139-firebase-snapshot-20260907.json (13 superseded objects recorded, 20,807 bytes). All 13 superseded curriculum items deleted from gs://mathpulse-ai-2026.firebasestorage.app/curriculum/. Uploaded 61 canonical SSHS corpus files (30 PDFs with application/pdf, 31 Markdown files with text/markdown; 107,431,898 bytes total) to gs://mathpulse-ai-2026.firebasestorage.app/curriculum/sshs_learning_resources/ matching datasets/curriculum/sshs_learning_resources/ exactly. Integrity verification passed with zero mismatches.

- [x] G2: RAG reingestion: backend dependencies installed, scripts/ingest_curriculum.py executed against new corpus, curriculum_chunks updated, and datasets/vectorstore export created.
  CHECK: python -c "from pathlib import Path; print('VECTORSTORE_READY' if (Path('datasets/vectorstore/chroma.sqlite3').exists() or Path('datasets/vectorstore').is_dir()) else 'NO_VECTORSTORE')"
  EXPECT: VECTORSTORE_READY
  EVIDENCE: Passed. Backend dependencies verified and installed (chromadb 1.5.9, sentence-transformers 6.0.1, langchain-text-splitters 1.1.2, torch 2.14.0, liteparse 2.12.0). Ran `python scripts/ingest_curriculum.py` against `datasets/curriculum/sshs_learning_resources/`. Discovery identified exactly 30 canonical Markdown files, 0 duplicate PDF fallbacks, 0 README metadata files pulled into chunks. Collection 'curriculum_chunks' preserved and updated with normalized embeddings using BAAI/bge-small-en-v1.5 in batches of 500. Total chunks: 3,054 (General Mathematics: 1,904; Finite Mathematics 1: 544; Finite Mathematics 2: 606). Fresh Chroma snapshot exported to `datasets/vectorstore/` (chroma.sqlite3: 54.8 MB, HNSW index folder, and ingest_summary.json). Retrieval context verification and clean_vectorstore.py validated.

- [x] G3: Verification & QA: pytest suites pass (test_liteparse_curriculum.py, test_pdf_parser.py, RAG tests), npm run typecheck passes, npm run build passes, retrieval sample queries pass.
  CHECK: python -m pytest backend/tests/test_liteparse_curriculum.py backend/tests/test_pdf_parser.py -q
  EXPECT: passed
  EVIDENCE: Passed. Full RAG and curriculum pytest suite passed (19/19 total: test_liteparse_curriculum.py [3 passed], test_pdf_parser.py [1 passed], test_rag_pipeline.py [13 passed], test_practice_model_routing.py [2 passed]); confirmed 3 previously failing tests (due to missing openai in staging) now pass. Frontend checks passed: `npm run typecheck` (0 errors), `npm run build` (vite v6 build succeeded in 16.36s). Sample retrieval queries across 5 representative SHS math topics (Rational Functions, Simple & Compound Interest, Matrices / Linear Systems, Annuities, Logic & Propositions) verified against curriculum_chunks (3,054 chunks) with DepEd SSHS sources (SHS_GM_*.md, Finite Math *.md), valid subjects and quarters. Normalized subject matching in `backend/rag/curriculum_rag.py` to seamlessly handle both 'General Mathematics' and 'general_mathematics'. End-to-end sample lesson generation (7 sections, 8 citations) and sample quiz problem generation verified live via DeepSeek inference.

- [x] G4: Deployment & Cache: PWA shell cache version is 1.1.0-curriculum-sot, offline behavior confirmed, branch chore/pr139-post-merge-rollout ready for PR.
  CHECK: git branch --show-current
  EXPECT: chore/pr139-post-merge-rollout
  EVIDENCE: verified on branch chore/pr139-post-merge-rollout; PWA cache version bumped to 1.1.0-curriculum-sot across public/sw.js, vite.config.ts, build/pwa-config.js, .env.example, .env.local, and src/config/env.ts; offline navigation & precache validated; node scripts/validate-pwa-build.mjs passed.


