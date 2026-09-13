# Acceptance Gates: AI Lessons with New PDFs and RAG Pipeline

- [x] Gate 1: Ingestion script discovers all curriculum files across all 4 directories (`sshs_learning_resources`, `gen_math_sdo`, `general_math`, `stat_prob`).
      CHECK: python scripts/ingest_curriculum.py --dry-run
      EXPECT: Discovered files from all 4 subdirectories.
      EVIDENCE: Discovered 38 files across sshs_learning_resources, gen_math_sdo, general_math, stat_prob. Total estimated chunks: 3,510 ('finite_mathematics_1': 544, 'finite_mathematics_2': 606, 'general_mathematics': 2013, 'statistics_and_probability': 347).

- [x] Gate 2: Chroma vector store ingested with normalized `storage_path` and `subject` metadata.
      CHECK: python -c "import sys; sys.path.insert(0, 'backend'); from rag.vectorstore_loader import get_vectorstore_health; h = get_vectorstore_health(); print('chunks=' + str(h.get('chunkCount')) + ', subjects=' + str(list(h.get('subjects', {}).keys())))"
      EXPECT: chunkCount > 3054 and 'statistics_and_probability' in subjects.
      EVIDENCE: chunks=3510, subjects=['finite_mathematics_1', 'finite_mathematics_2', 'general_mathematics', 'statistics_and_probability'].

- [x] Gate 3: Exact-match and semantic RAG retrieval succeeds for GM11-BF-1 and new PDF topics.
      CHECK: python -c "import sys; sys.path.insert(0, 'backend'); from rag.curriculum_rag import retrieve_lesson_pdf_context; chunks, mode = retrieve_lesson_pdf_context(topic='Represent business transactions and financial goals using variables and equations.', subject='General Mathematics', quarter=1); print('chunks=' + str(len(chunks)) + ', mode=' + str(mode))"
      EXPECT: chunks >= 5 and mode in ('exact', 'hybrid', 'general').
      EVIDENCE: chunks=8, mode=general; exact storage_path query returns chunks=8, mode=exact from SHS_GM_Q1_LE1.md. New PDFs: genmath q2 mod1: 8 exact, stat_prob Full: 8 exact, gen_math_sdo LAS3: 5 exact.

- [x] Gate 4: RAG retrieval unit tests pass in backend test suite.
      CHECK: python -m pytest backend/tests/test_rag_pipeline.py -q
      EXPECT: All tests pass.
      EVIDENCE: 17 passed, 1 warning in 8.57s.

- [x] Gate 5: Frontend LessonViewer and types compile cleanly with 0 type errors.
      CHECK: npm run typecheck
      EXPECT: Found 0 errors.
      EVIDENCE: tsc --noEmit exited 0 with 0 errors.
