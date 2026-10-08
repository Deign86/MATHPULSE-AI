# Gates: Leaf C — Backend runtime

Scope: no sync LLM/RAG/Firestore-heavy calls on the event loop in AI handlers, bounded timeouts/retries, chat path on deepseek-chat with parallel verification, durable async job status (contract C3), role policy for the SSE route.

- [ ] G1: Shared DeepSeek OpenAI client has max_retries=0; InferenceRequest.max_retries (contract C2) overrides the retry profile.
  CHECK: python -m pytest backend/tests/test_perf_backend_runtime.py -q -k "retries"
  EXPECT: /^\d+ passed/m
  EVIDENCE: pending

- [ ] G2: models.yaml routes verify_solution to deepseek-chat; rag_lesson stays deepseek-reasoner; verify_math_response runs its samples concurrently.
  CHECK: python -m pytest backend/tests/test_perf_backend_runtime.py -q -k "routing or verification"
  EXPECT: /^\d+ passed/m
  EVIDENCE: pending

- [ ] G3: Every sync LLM call inside an `async def` in the owned files runs via asyncio.to_thread (or an async wrapper) with an explicit timeout; list each site fixed with file:line in EVIDENCE. Includes rag_grounded_completion, diagnostic generate, practice generate, predict_risk, quiz_generation_routes, try_it_yourself, personalized lesson, and the vectorstore warm-up.
  EVIDENCE: pending

- [ ] G4: Lifespan installs a default ThreadPoolExecutor sized >= 32 so to_thread work is not capped at cpu+4.
  CHECK: python -m pytest backend/tests/test_perf_backend_runtime.py -q -k executor
  EXPECT: /^\d+ passed/m
  EVIDENCE: pending

- [ ] G5: Async jobs mirror to Firestore aiJobs/{taskId}; startup marks queued/running docs failed with code "interrupted"; GET /api/tasks/{id} falls back to Firestore with owner check (contract C3).
  CHECK: python -m pytest backend/tests/test_perf_backend_runtime.py -q -k "jobs"
  EXPECT: /^\d+ passed/m
  EVIDENCE: pending

- [ ] G6: ROLE_POLICIES has "/api/rag/lesson/stream": ALL_APP_ROLES.
  CHECK: python -m pytest backend/tests/test_perf_backend_runtime.py -q -k role
  EXPECT: /^\d+ passed/m
  EVIDENCE: pending

- [ ] G7: Full backend suite has no new failures vs main (record before/after counts).
  EVIDENCE: pending
