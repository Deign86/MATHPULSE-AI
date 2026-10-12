# Gates: admin model overrides survive a backend restart

Scope: the admin-panel model config saved in Firestore (`system_config/active_model_config`) is restored on every backend start once Firebase Admin is initialized, without delaying the port bind; startup without Firebase stays fail-open. Production (stored profile `prod` + override `HF_RAG_MODEL_ID=claude-sonnet-5-5`) keeps reporting `activeModel: claude-sonnet-5-5`.

- [x] G1: Importing `services.inference_client` no longer reads Firestore (that call ran before Firebase Admin existed)
  CHECK: git grep -n -E "^_?load_runtime_config_from_firestore\(\)" -- backend/services/inference_client.py || echo NO_IMPORT_TIME_RESTORE
  EXPECT: NO_IMPORT_TIME_RESTORE
  EVIDENCE: NO_IMPORT_TIME_RESTORE

- [x] G2: After app startup with Firebase Admin initialized, the stored override is in effect: `rag_lesson` routes to claude-sonnet-5-5 and `/api/rag/health` reports `activeModel: claude-sonnet-5-5`, where env alone resolves to claude-haiku-5-5
  CHECK: cd backend && set PYTHONPATH=.&& set PYTHONUTF8=1&& set "PYTEST_ADDOPTS=-p no:cacheprovider"&& python -m pytest "tests/test_model_profiles.py::TestAdminModelConfigSurvivesRestart::test_startup_applies_the_override_saved_in_firestore" -q 2>&1
  EXPECT: /^(?!.*\b(failed|errors?)\b).*1 passed/m
  EVIDENCE: -- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html | 1 passed, 1 warning in 52.53s

- [x] G3: Startup without a Firebase app completes, applies nothing and routes from profile/env; the restore itself does not raise when the default app is missing
  CHECK: cd backend && set PYTHONPATH=.&& set PYTHONUTF8=1&& set "PYTEST_ADDOPTS=-p no:cacheprovider"&& python -m pytest "tests/test_model_profiles.py::TestAdminModelConfigSurvivesRestart::test_startup_without_a_firebase_app_keeps_profile_and_env_routing" -q 2>&1
  EXPECT: /^(?!.*\b(failed|errors?)\b).*1 passed/m
  EVIDENCE: -- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html | 1 passed, 1 warning in 49.30s

- [x] G4: The Firestore read does not delay the port bind: it runs as a background task started before the lifespan yields, like the other startup Firestore work
  EVIDENCE: backend/main.py:612 `asyncio.create_task(asyncio.to_thread(load_runtime_config_from_firestore))` (guarded at :608 by `_firebase_ready`) runs before the lifespan `yield` at :632. Scratch run of app_lifespan with the restore blocked on an Event (scratchpad/lifespan_does_not_wait_for_restore.py) printed "SERVING_WHILE_RESTORE_BLOCKED", then "restore ran after release: True".

- [x] G5: Full backend suite has no failures beyond the pre-change baseline
  CHECK: cd backend && set PYTHONPATH=.&& set PYTHONUTF8=1&& set "PYTEST_ADDOPTS=-p no:cacheprovider"&& python -m pytest tests/ -q 2>&1
  EXPECT: /^(?!.*\b(failed|errors?)\b).*\d+ passed/m
  EVIDENCE: -- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html | 1122 passed, 2 warnings in 160.55s (0:02:40)

- [x] G6: Backend pre-deploy check passes
  CHECK: set PYTHONUTF8=1&& python backend/pre_deploy_check.py 2>&1
  EXPECT: PRE-DEPLOYMENT VALIDATION PASSED
  EVIDENCE: ====================================================================== | Backend is ready for deployment to HF Spaces.

- [x] G7: Test-run artifacts are cleaned up: tracked vectorstore files the suite rewrites are restored and the stream test's `.unlazy/` sample is removed
  CHECK: git status --short -- backend/datasets .unlazy | findstr /r "." || echo TEST_ARTIFACTS_CLEAN
  EXPECT: TEST_ARTIFACTS_CLEAN
  EVIDENCE: TEST_ARTIFACTS_CLEAN
