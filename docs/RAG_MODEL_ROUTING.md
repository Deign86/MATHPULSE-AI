# RAG Lesson Model Routing — Findings & Handoff

**Date:** 2026-09-19 · **Source:** live E2E session (Chrome DevTools + Jev battery 11/11 PASS)
**Question:** Why do RAG lessons use `deepseek-reasoner` instead of pinning the latest
DeepSeek model (e.g. `deepseek-v4.1-flash`)?
**Short answer:** It is the `prod`-profile default by design, and `deepseek-v4.1-flash`
is not a model ID this backend's provider accepts. Details + implementation paths below.

## 1. Why reasoner (3-layer chain, verified on disk)

1. `backend/config/models.yaml:47` — `routing.task_model_map` sets
   `rag_lesson: deepseek-reasoner`. `rag_primary` (lines 9–23) documents intent:
   extended thinking for complex RAG, temp 0.2, 1800 tokens,
   `enable_thinking_tasks: [rag_lesson, verify_solution, risk_narrative]`.
   `model_capabilities` (30–34): reasoner is `sequential_only` + `supports_thinking`.
   Chat owns every other task (chat, quiz/lesson/practice generation, paths, insights).
2. `backend/services/inference_client.py:40-54` — `_MODEL_PROFILES`:
   `prod` maps `HF_RAG_MODEL_ID → REASONER_MODEL`; `dev`/`budget` map it to
   `CHAT_MODEL`. Task→env-key map (line 205): `rag_lesson → HF_RAG_MODEL_ID`.
   The lesson UI badge (`DEEPSEEK-REASONER`, 76% confidence, observed live) confirms
   this backend runs the default `prod` profile.
3. Overrides exist and are unset: `DEEPSEEK_REASONER_MODEL` / `DEEPSEEK_MODEL` beat
   the profile (`inference_client.py:36`); admin panel can flip profiles at runtime
   (no restart). `backend/routes/admin_model_routes.py:42` documents
   `"prod": "deepseek-reasoner for RAG, deepseek-chat for chat - best quality"`.

## 2. Naming traps (do not confuse)

- **"DeepSeek-V4 Pro"** (Admin → AI Monitoring page) is a *display/promo label*
  (`src/components/admin/ai-monitoring/PromoPricingBanner.tsx:39`, "75% OFF"),
  not a wire model ID. Wire IDs are only `deepseek-chat` / `deepseek-reasoner`
  (defaults in `backend/services/ai_client.py:31`, sent to `DEEPSEEK_BASE_URL`).
- **`deepseek-v4.1-flash`** appears nowhere in the repo. It is a Cavoti merchant
  listing ID (external OpenAI-compatible broker), not a DeepSeek-API model.
  The `deepseek` provider speaks to DeepSeek's API directly, which serves chat
  (V3.x) and reasoner (R1) under the two IDs above.

## 3. Implementation paths (pick one)

### A. RAG on chat (config-only, reversible, no code)
- Set `MODEL_PROFILE=dev` (or `budget`) → `HF_RAG_MODEL_ID = deepseek-chat`.
- Or keep `prod` and set `DEEPSEEK_REASONER_MODEL=deepseek-chat`.
- Trade-off: loses thinking mode for `rag_lesson` (sequential pipeline +
  `supports_thinking` gate); lesson quality may drop on multi-hop topics.
- Verify: `GET /api/rag/health` → `activeModel: deepseek-chat`,
  `isSequentialModel: false`; open any lesson, badge reads `DEEPSEEK-CHAT`.

### B. Pin a different DeepSeek-API model ID (small code)
- Only valid for IDs DeepSeek's API actually serves.
- Set `DEEPSEEK_REASONER_MODEL=<id>` (or `DEEPSEEK_MODEL=<id>` for all tasks).
- If the new ID needs thinking/sequential treatment, add it to
  `model_capabilities` in `backend/config/models.yaml` + `config/models.yaml`
  (both are source of truth per `.github/copilot-instructions.md`) and update
  `is_sequential_model` / `model_supports_thinking` helpers.
- Verify: `npm run check:backend` (pytest + mypy), lesson badge shows new ID.

### C. Wire a Cavoti model (e.g. v4.1-flash) as provider (real work)
1. Provider: point base URL at Cavoti (`TEXT_MODEL_BASE_URL` pattern from the
   E2E session used `https://cavoti.com/v1`) via new env (e.g.
   `CAVOTI_BASE_URL`/`CAVOTI_API_KEY`) in `backend/services/ai_client.py` or a
   new provider module; never commit keys (`.secrets/`, gitignored).
2. Allowlist the ID in both `config/models.yaml` and `backend/config/models.yaml`
   (`routing.task_model_map`, `task_fallback_model_map`, `task_provider_map`).
3. Capability lists: `sequential_only` / `supports_thinking` as applicable.
4. Profiles: decide per-profile mapping in `_MODEL_PROFILES`
   (`inference_client.py:40-59`) — likely new `cavoti` profile or budget override.
5. Tests that hard-assert reasoner (must update):
   - `backend/tests/test_model_profiles.py:43` (`test_prod_rag_is_reasoner`),
     `:127`, `:156-177` (sequential/thinking)
   - `backend/tests/test_rag_pipeline.py:148` (`test_sequential_for_reasoner`)
   - `backend/tests/test_api.py:570-621` (model-selection chains)
6. Verify: `npm run check:backend`, `GET /api/rag/health`, one live lesson open
   (badge + citations + 7 sections), Jev `systemOne` battery on the lesson text.

## 4. Session evidence this is based on
- Live lesson open: NOTEBOOK, `DEEPSEEK-REASONER`, `SHS_GM_Q1_LE1.md p59`,
  7 sections — `artifacts/e2e/modules/lesson.png`.
- `/api/rag/health` live: 3054 chunks, 3 subjects, `activeModel` flips with profile.
- Full sweep: `E2E-REPORT.md` (same session).

## 5. Recommendation
Path A for speed (one env var, instant revert). Path C only if Cavoti pricing
justifies it — and then treat the two `models.yaml` files as authoritative and
keep the reasoner-asserting tests green by updating (not deleting) them.
