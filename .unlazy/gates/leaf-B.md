# Gates: Leaf B — Lesson pipeline (rag_routes.py)

Scope: shared in-memory lesson cache + in-flight dedupe, YouTube lookup concurrent with generation, reasoner streamed from DeepSeek with bounded retries, SSE endpoint per contract C1, stage timing logs.

- [ ] G1: Identical lesson requests (differing only in userId/forceRefresh) are served from an in-process cache after the first successful LLM generation; grounded-default fallbacks are NOT cached; forceRefresh bypasses and replaces the entry; concurrent identical requests trigger exactly one generation.
  CHECK: python -m pytest backend/tests/test_rag_lesson_stream.py -q -k "cache or dedupe"
  EXPECT: /^\d+ passed/m
  EVIDENCE: pending

- [ ] G2: YouTube lookup starts concurrently with LLM generation (not after it); a slow video lookup does not add to generation time beyond max(gen, video); failure of video lookup still yields a lesson.
  CHECK: python -m pytest backend/tests/test_rag_lesson_stream.py -q -k video
  EXPECT: /^\d+ passed/m
  EVIDENCE: pending

- [ ] G3: POST /api/rag/lesson/stream emits stage events, a terminal `lesson` event with the same shape as POST /api/rag/lesson, and a terminal `error` event (status+detail) on failure, per contract C1.
  CHECK: python -m pytest backend/tests/test_rag_lesson_stream.py -q -k stream
  EXPECT: /^\d+ passed/m
  EVIDENCE: pending

- [ ] G4: rag_lesson generation streams from deepseek-reasoner (per-read timeout, overall cap <= 300s, no SDK retries) and falls back once to non-streaming deepseek-chat with explicit timeout_sec and max_retries=1.
  CHECK: python -m pytest backend/tests/test_rag_lesson_stream.py -q -k fallback
  EXPECT: /^\d+ passed/m
  EVIDENCE: pending

- [ ] G5: Per-stage timing (retrieve / generate / verify / video / total, ms) logged once per lesson.
  EVIDENCE: pending

- [ ] G6: Existing rag route tests still pass.
  CHECK: python -m pytest backend/tests -q -k "rag_lesson or rag_routes or lesson"
  EXPECT: /^\d+ passed/m
  EVIDENCE: pending
