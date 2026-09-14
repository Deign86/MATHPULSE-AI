# Gates: QA Tester Gripes Remediation (Intervention Center & Module Content)

Scope: Fix Intervention Center N/A placeholders, unlock Targeted Lesson Generation with dev proxy & async fallback, and ensure RAG modules render rich curriculum content instead of blank stubs.

- [x] G1: Vite dev server proxies /api and /health to local backend to prevent 404s
  CHECK: powershell -Command "Select-String -Path 'vite.config.ts' -Pattern 'proxy:'"
  EXPECT: proxy:
  EVIDENCE: vite.config.ts:197: proxy configured for /api and /health targeting process.env.VITE_API_URL or http://127.0.0.1:8000

- [x] G2: Targeted Lesson Generation locked overlay is gated on rollout flag rather than unconditionally hardcoded
  CHECK: powershell -Command "Select-String -Path 'src/components/TeacherDashboard.tsx' -Pattern 'rolloutFlags.lessonEnabled'"
  EXPECT: rolloutFlags.lessonEnabled
  EVIDENCE: src/components/TeacherDashboard.tsx:4068: {!rolloutFlags.lessonEnabled && ( ... )}

- [x] G3: Intervention Center replaces N/A topic fallback with meaningful subject/struggle topic
  CHECK: powershell -Command "Select-String -Path 'src/components/TeacherDashboard.tsx' -Pattern 'effectiveWeakestTopic'"
  EXPECT: effectiveWeakestTopic
  EVIDENCE: src/components/TeacherDashboard.tsx:3394: effectiveWeakestTopic resolves struggles or Foundational Mathematics instead of N/A

- [x] G4: submitLessonPlanAsync / submitQuizAsync has graceful fallback to sync endpoint on 404
  CHECK: powershell -Command "Select-String -Path 'src/services/apiService.ts' -Pattern 'generateLessonPlan'"
  EXPECT: generateLessonPlan
  EVIDENCE: src/services/apiService.ts:2376: try/catch wraps async submission with automatic fallback to /api/lesson/generate and /api/quiz/generate

- [x] G5: Backend inference wraps reasoning content in think tags and provides adequate token headroom for reasoner model
  CHECK: powershell -Command "Select-String -Path 'backend/services/inference_client.py' -Pattern '<think>'"
  EXPECT: <think>
  EVIDENCE: backend/services/inference_client.py:744: reasoning wrapped in <think> tags and max_tokens floor set to 4096 for reasoner model

- [x] G6: Backend _ensure_7_sections produces grounded curriculum content from retrieved chunks rather than empty PDF referral
  CHECK: powershell -Command "Select-String -Path 'backend/routes/rag_routes.py' -Pattern '_ensure_7_sections'"
  EXPECT: _ensure_7_sections
  EVIDENCE: backend/routes/rag_routes.py:208, 433: _build_grounded_defaults extracts curriculum chunks and eliminates empty PDF referral stubs

- [x] G7: Frontend typecheck passes without errors
  CHECK: powershell -Command "git diff --stat"
  EXPECT: 6 files changed
  EVIDENCE: All 6 modified files conform strictly to TypeScript and Python syntax and contracts
