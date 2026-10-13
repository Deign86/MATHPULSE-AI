# Gates: deterministic prefetch-burst regression test

Scope: `backend/tests/test_regression_rag_lesson.py::test_prefetch_concurrent_burst_never_queues_interactive_behind_the_semaphore` asserted that bob's interactive open finished in under 1.4 s against a fake model that sleeps 0.8 s. It failed once in Deploy FastAPI backend run 38323146786 (commit 15ff95f0) at 1.52 s with statuses [queued, skipped], so the code was correct and the runner was slow. Replace the wall-clock limit with a gate: alice's prefetch generation stays blocked until bob's interactive lesson is back, and that lesson can only come back if it neither waits on `_prefetch_semaphore` nor joins alice's job. Production code does not change.

- [x] G1: The rewritten test passes
  CHECK: cd backend && python -X utf8 -m pytest tests/test_regression_rag_lesson.py -q -p no:cacheprovider -k concurrent_burst 2>&1
  EXPECT: /\b1 passed, \d+ deselected/
  EVIDENCE: .                                                                        [100%] | 1 passed, 24 deselected in 39.42s

- [x] G2: The test has no wall-clock limit left (no perf_counter timing, no 0.8 s model sleep, no 1.4 s bound)
  CHECK: git grep -n -e "time.perf_counter" -e "stream_delay = 0.8" -e "< 1.4" -- backend/tests/test_regression_rag_lesson.py || echo NO_WALL_CLOCK_LIMIT
  EXPECT: /^NO_WALL_CLOCK_LIMIT/
  EVIDENCE: NO_WALL_CLOCK_LIMIT

- [x] G3: A slow runner cannot fail it: with a 0.7 s stall added to every fake generation (temporary `time.sleep(0.7)` in `LessonSeams.stream`, reverted), the old test fails the way CI did and the new test passes
  EVIDENCE: old test: 1 failed, "bob's interactive lesson waited 1.51s behind alice's prefetch slot (statuses=[{'status': 'queued'}, {'status': 'skipped'}])" (CI: 1.52s). New test, same stall: 1 passed (call 1.52s). Run before the final wording edits (docstring, comment, failure message; no logic change)

- [x] G4: It fails when the interactive path acquires `_prefetch_semaphore` (temporary mutation: `async with _prefetch_semaphore:` around the job join in `rag_lesson`, reverted)
  EVIDENCE: final test text: 1 failed after 10.02s, "Failed: bob's interactive lesson waited 10s behind alice's prefetch (its semaphore slot or its job)" (first run, before the wording edits: 10.27s)

- [x] G5: It fails when a prefetch accepted during the burst leaves its job waiting on the semaphore (temporary mutation: no slot claimed in `rag_lesson_prefetch`, `_run_lesson_job` acquires it after the first await, reverted)
  EVIDENCE: final test text: 1 failed in 0.01s, both prefetches accepted, "At index 1 diff: {'status': 'queued'} != {'status': 'skipped'}"

- [x] G6: It fails when bob's interactive open joins alice's in-flight job (temporary mutation: `_get_or_start_lesson` keys jobs as ("", key, forceRefresh), reverted)
  EVIDENCE: final test text: 1 failed after 10.03s, "bob's interactive lesson waited 10s behind alice's prefetch (its semaphore slot or its job)". The old test PASSED under this mutation (1 passed), so its timing check never caught a cross-student join

- [x] G7: Repeated targeted runs are stable (alice always takes the slot, no failures)
  EVIDENCE: temporary parametrize x200, reverted: 200 passed in 56.78s idle; 200 passed in 177.41s with 24 CPU-spinning processes on 12 cores for the whole run (slowest iteration 1.33s). Run before the final wording edits (docstring, comment, failure message; no logic change)

- [x] G8: Full backend suite passes
  EVIDENCE: cd backend && PYTHONPATH="$(pwd)" PYTHONUTF8=1 PYTEST_ADDOPTS="-p no:cacheprovider" python -m pytest tests/ -q on the final test text merged with main d1ee6c4b (#345) -> 1162 passed, 2 warnings in 143.70s (exit 0); then git checkout -- backend/datasets/vectorstore. Before the merge: 1144 passed in 141.15s

- [x] G9: Only the test file changed under backend/ (mutations reverted, Chroma files restored)
  CHECK: git diff --quiet HEAD -- backend ":(exclude)backend/tests/test_regression_rag_lesson.py" && echo ONLY_THE_TEST_CHANGED
  EXPECT: ONLY_THE_TEST_CHANGED
  EVIDENCE: ONLY_THE_TEST_CHANGED

- [x] G10: No untracked or modified files under backend/datasets/vectorstore after the suite
  CHECK: git status --porcelain -- backend/datasets/vectorstore && echo VECTORSTORE_CLEAN
  EXPECT: /^VECTORSTORE_CLEAN\s*$/
  EVIDENCE: VECTORSTORE_CLEAN

- [x] G11: The repo-wide retired-provider name scan still passes
  CHECK: cd backend && python -X utf8 -m pytest tests/test_regression_claude_migration.py -q -p no:cacheprovider -k retired_provider 2>&1
  EXPECT: /^(?!.*\b(failed|errors?)\b).*\d+ passed/m
  EVIDENCE: -- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html | 6 passed, 131 deselected, 1 warning in 32.69s

Post-commit check (not a pre-commit gate): a PR against main is open and left unmerged.
