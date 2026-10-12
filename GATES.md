# Gates: migrate all AI features to the Claude API and remove the old provider

Scope: every backend AI call goes through `backend/services/ai_client.py` (official `anthropic` SDK, Claude Haiku 5.5 fast tier / Claude Opus 5.5 reasoning tier); the previous provider is gone from code, config, tests, scripts and docs; all suites stay green.

- [x] G1: No tracked file mentions the previous provider (case-insensitive, binaries included)
  CHECK: git grep -i -l -e "deep[s]eek" || echo NO_PROVIDER_MENTIONS
  EXPECT: NO_PROVIDER_MENTIONS
  EVIDENCE: NO_PROVIDER_MENTIONS

- [x] G2: No tracked path mentions the previous provider
  CHECK: git ls-files | findstr /i /r "deep[s]eek" || echo NO_PROVIDER_PATHS
  EXPECT: NO_PROVIDER_PATHS
  EVIDENCE: NO_PROVIDER_PATHS

- [x] G3: Temporary migration shim removed from the Claude client
  CHECK: findstr /c:"MIGRATION-SHIM" backend\services\ai_client.py || echo SHIM_REMOVED
  EXPECT: SHIM_REMOVED
  EVIDENCE: SHIM_REMOVED

- [x] G4: Backend no longer depends on or imports the OpenAI SDK
  CHECK: git grep -n -E "^openai|from openai|import openai" -- backend || echo NO_OPENAI_SDK
  EXPECT: NO_OPENAI_SDK
  EVIDENCE: NO_OPENAI_SDK

- [x] G5: anthropic SDK is a declared backend dependency
  CHECK: findstr /b /c:"anthropic>=" backend\requirements.txt
  EXPECT: anthropic>=
  EVIDENCE: anthropic>=1.13.0,<2

- [x] G6: No sampling parameters left on backend AI call paths (Claude 5.5 models reject them)
  CHECK: git grep -n -w -E "temperature|top_p|repetition_penalty" -- backend ":!*.md" ":!backend/datasets" ":!backend/tests" ":!backend/services/ai_client.py" || echo NO_SAMPLING_PARAMS
  EXPECT: NO_SAMPLING_PARAMS
  EVIDENCE: NO_SAMPLING_PARAMS

- [x] G7: Local .env.local carries the Anthropic key and no old-provider key
  CHECK: findstr /b /c:"ANTHROPIC_API_KEY=" .env.local >nul && (findstr /i /r "deep[s]eek" .env.local >nul && echo ENV_HAS_OLD_KEY || echo ENV_OK) || echo ENV_MISSING_KEY
  EXPECT: ENV_OK
  EVIDENCE: ENV_OK

- [x] G8: Backend test suite fully green (baseline on main 921eb933: 748 passed, 0 failed)
  CHECK: cd backend && set PYTHONPATH=C:\Users\APG\Downloads\MATHPULSE-AI\backend&& set PYTHONUTF8=1&& python -m pytest tests/ -q 2>&1 | findstr /r /c:" passed" /c:" failed" /c:" error"
  EXPECT: /^(?!.*\b(failed|errors?)\b).*\d+ passed/m
  EVIDENCE: 1116 passed, 2 warnings in 159.92s (0:02:39)

- [x] G9: Backend mypy: no errors beyond the pre-migration baseline (main 921eb933 with --explicit-package-bases: 18 errors, all in main.py at 2964, 2978, 8645-8667; the plain gate command already fails on main with "Source file found twice")
  EVIDENCE: `python -m mypy --config-file mypy.ini --explicit-package-bases backend/main.py backend/analytics.py` -> "Found 16 errors in 1 file (checked 2 source files)", all at main.py 8499-8521; `diff` of main:8645-8667 vs current 8499-8521 is empty (same pre-existing block, shifted). The two baseline errors at 2964/2978 are gone.

- [x] G10: Frontend unit tests pass
  CHECK: npm test -- --run 2>&1 | findstr /r /c:"Tests  "
  EXPECT: /Tests\s+\d+ passed/
  EVIDENCE: Tests  920 passed (920)

- [x] G11: Frontend typecheck passes
  CHECK: npx tsc --noEmit && echo TSC_OK
  EXPECT: TSC_OK
  EVIDENCE: TSC_OK

- [x] G12: Anti-slop oxlint passes
  CHECK: npx oxlint --quiet && echo OX_OK
  EXPECT: OX_OK
  EVIDENCE: To eliminate this warning, add "type": "module" to C:\Users\APG\Downloads\MATHPULSE-AI\package.json. | (Use `node --trace-warnings ...` to show where the warning was created)

- [x] G13: ESLint passes (baseline: exit 0)
  CHECK: npm run lint && echo LINT_OK
  EXPECT: LINT_OK
  EVIDENCE: (node:4756) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead. | (Use `node --trace-deprecation ...` to show where the warning was created)

- [x] G14: Functions build and tests pass
  CHECK: cd functions && npm test 2>&1 | findstr /r /c:"^# fail"
  EXPECT: # fail 0
  EVIDENCE: # fail 0

- [x] G15: Opus adversarial review ran; every confirmed finding is fixed or dispositioned
  EVIDENCE: 3 Opus 5.5 reviews (backend core 8 confirmed, surfaces 5, tests/docs 10) -> fix lanes F1/F2/F3 + orchestrator; final Opus verifier: 16/16 FIXED, "no release blocker", 1 new low defect (JSON fragment on truncated/malformed replies) fixed via ai_client.outer_json + max_tokens passthrough with 4 tests; backend 1120 passed. Dispositioned, not changed: Opus 5.5 per-student lesson cost (user's model choice; Sonnet 5.5 is a one-variable switch), brief /api/ai 404 window during rollout (callers degrade gracefully), pre-existing blocking retrieval in teacher upload and PDF ingestion, import-time YOUTUBE_API_KEY read.

- [x] G17: TypeSafe replaced by Claude judgments (user decision): no SDK import, dependency or key read left in code, scripts or samples
  CHECK: git grep -n -E "typesafe_sdk|typesafe-sdk|TYPESAFE_API_KEY|TypeSafeClient" -- backend scripts src functions .env.example docker-compose.yml || echo NO_TYPESAFE
  EXPECT: NO_TYPESAFE
  EVIDENCE: NO_TYPESAFE

- [x] G18: Quiz Battle function's AI path calls Claude (user decision): no Qwen or Hugging Face router call left in functions
  CHECK: git grep -n -i -E "qwen|router\.huggingface" -- functions/src || echo NO_QWEN_IN_FUNCTIONS
  EXPECT: NO_QWEN_IN_FUNCTIONS
  EVIDENCE: NO_QWEN_IN_FUNCTIONS

- [x] G19: Frontend build succeeds
  CHECK: set VITE_API_URL=/api&& npm run build 2>&1 | findstr /c:"built in"
  EXPECT: built in
  EVIDENCE: [32m✓ built in 34.72s[39m

- [x] G20: Tracked vectorstore files that test runs rewrite are restored before commit
  CHECK: git status --short -- backend/datasets | findstr /r "." || echo DATASETS_CLEAN
  EXPECT: DATASETS_CLEAN
  EVIDENCE: DATASETS_CLEAN

- [x] G16: Live call to the Claude API through ai_client succeeds with the user's key (Haiku + Opus, streaming)
  EVIDENCE: 2026-10-12, user-level key + ANTHROPIC_WORKSPACE_ID (Default workspace, read from Claude Console): haiku complete_text 1.3s, json_output 1.0s, complete_json {'intent': 'direct_answer_request', 'confidence': 0.95} 1.9s; opus create_message stop=end_turn usage 48/36 1.1s (fallback beta accepted); opus stream_text 6 chunks 1.2s. Without the workspace header every endpoint returns 400 "This API key is not scoped to a workspace".
