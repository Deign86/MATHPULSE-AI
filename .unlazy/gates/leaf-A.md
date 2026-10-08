# Gates: Leaf A — RAG retrieval + context budget

Scope: exact-file retrieval never re-encodes a file twice per process, tries the fast filtered query first, prompt context is capped, and a script can rebuild the broken HNSW index.

- [ ] G1: Exact-file retrieval encodes each file's chunks at most once per process (cache keyed by the file's candidate paths); repeated calls (incl. the 1/1b/1c ladder) reuse cached vectors; filtered `collection.query(where=...)` is attempted first and its success skips encoding entirely.
  CHECK: python -m pytest backend/tests/test_rag_retrieval_perf.py backend/tests/test_160_rag_lesson_retrieval.py -q
  EXPECT: /^\d+ passed/m
  EVIDENCE: pending

- [ ] G2: format_retrieved_chunks caps each excerpt (~1200 chars) and total context (~9000 chars) with a visible truncation marker; covered by a test.
  CHECK: python -m pytest backend/tests/test_rag_retrieval_perf.py -q -k budget
  EXPECT: /^\d+ passed/m
  EVIDENCE: pending

- [ ] G3: backend/scripts/rebuild_vectorstore_index.py rebuilds a store (src dir -> new dst dir, never in place) from documents+metadatas; on a COPY of backend/datasets/vectorstore the rebuilt collection returns all 3510 ids from an unfiltered query and a `query(where={"source_file": ...})` succeeds.
  EVIDENCE: pending

- [ ] G4: Existing RAG tests still pass.
  CHECK: python -m pytest backend/tests -q -k "rag or curriculum or retrieval"
  EXPECT: /^\d+ passed/m
  EVIDENCE: pending
