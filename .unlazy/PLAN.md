# Plan: AI latency / hang / error reduction (branch perf/ai-latency)

Depth: tree 3   Mode: orchestrated (4 parallel leaves, disjoint files)

## User decisions (2026-10-09)
- AI chat: prefer speed (deepseek-chat everywhere on the chat path, incl. verify_solution).
- Lesson generation: keep full reasoning depth (deepseek-reasoner stays for rag_lesson).
- Shared lesson cache: lives from first generation until process restart (in-memory, no TTL; restart clears it).
- Phase 5: SSE streaming for student lessons; durable job status for teacher quiz/lesson-plan jobs.

## Measured root causes
- Chroma HNSW index only contains 511 of 3510 chunks (full unfiltered query returns 511). `query+where` and
  `get(include=embeddings)` raise "Error finding id". Exact-file retrieval therefore re-encodes every chunk of the
  file on each call: 459 chunks = 49.1s on a 12-core dev box; retrieve_lesson_pdf_context repeats it up to 3x.
- OpenAI SDK default max_retries=2 stacks under app retries (3) and fallback chain; 90s per-attempt timeout for a
  4096+ token reasoner lesson; middleware caps non-streaming requests at 120s -> 504s.

## Contract

### C1 SSE lesson stream (leaf B produces, leaf D consumes)
`POST /api/rag/lesson/stream`, JSON body = RagLessonRequest + optional `forceRefresh: bool` (default false).
Auth/validation failures return normal HTTP status codes before streaming. Otherwise 200 `text/event-stream`:
- `event: stage` `data: {"stage": "retrieving"|"generating"|"verifying"|"finalizing"|"cached"}`
- `event: progress` `data: {"phase": "thinking"|"writing", "chars": <int>}` (throttled, >= 1s apart, optional)
- `event: lesson` `data: <RagLessonResponse JSON, identical shape to POST /api/rag/lesson>` (terminal)
- `event: error` `data: {"status": <int>, "detail": <same object the HTTPException.detail would carry>}` (terminal)
- `: ping` comment line every 15s while work is in progress.
`POST /api/rag/lesson` keeps its exact response shape and shares the same cache/in-flight dedupe.
`forceRefresh` is excluded from the cache key, as is `userId`.

### C2 InferenceRequest (leaf C owns inference_client.py, leaf B uses it)
`InferenceRequest` gains `max_retries: Optional[int] = None`; when set, `_call_deepseek` uses it instead of the
task retry profile. `timeout_sec` already exists and is honored.

### C3 Async job durability (leaf C produces, leaf D consumes)
Backend mirrors every `_async_tasks` create/update to Firestore `aiJobs/{taskId}` (server-only, fail-open).
On startup, any `aiJobs` doc with status queued|running is marked `failed` with
`error = {"code": "interrupted", "message": "Generation was interrupted by a server restart."}`.
`GET /api/tasks/{id}` falls back to the Firestore doc when the task is not in memory (same owner/admin check).
Frontend: after a successful async submit, never also run the sync endpoint. If polling yields
status failed with error.code == "interrupted", or 404, resubmit the async job once. Sync endpoint is used only when
the async submit itself fails (404 disabled / network error on submit).

### Data ownership
- Leaf A: backend/rag/curriculum_rag.py, backend/scripts/rebuild_vectorstore_index.py (new), backend/tests/test_rag_retrieval_perf.py (new)
- Leaf B: backend/routes/rag_routes.py, backend/tests/test_rag_lesson_stream.py (new)
- Leaf C: backend/main.py, backend/services/ai_client.py, backend/services/inference_client.py,
  backend/config/models.yaml, backend/routes/{diagnostic,practice,quiz_generation_routes,try_it_yourself,deepseek_rag_routes}.py,
  backend/tests/test_perf_backend_runtime.py (new), plus edits to existing backend tests that pin changed behavior
- Leaf D: src/** only

## Tree
- 1 AI latency
  - A RAG retrieval + context budget ........ gates/leaf-A.md
  - B Lesson pipeline: cache, dedupe, parallel video, SSE ........ gates/leaf-B.md
  - C Backend runtime: event loop, timeouts/retries, chat speed, durable jobs ........ gates/leaf-C.md
  - D Frontend: lesson stream UI, job polling, refiring effects ........ gates/leaf-D.md
  - Integration ........ ../GATES.md

## Status log
- plan written, contract fixed
- leaves A,B,C,D dispatched in parallel (A,C sonnet; B,D default model); baseline backend run started
