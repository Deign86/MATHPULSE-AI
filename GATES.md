# Gates: quiz token budgets + chat intent check in parallel

Scope: (1) the three quiz-generation paths in backend/main.py budget enough output tokens for Claude Haiku 5.5 (benchmark: a 10-question quiz hit the 3200-token cap on every attempt, retried, and one run returned 502 after 61 s); (2) `/api/chat` starts the answer while the first-turn intent check runs, instead of after it (benchmark: first turn 3.62 s = intent ~1.4 s + answer ~2.1 s). Added after the Opus review: (3) `_run_hf_blocking` keeps a cancelled call's slot until its worker thread returns; (4) the other per-question budgets sized for the old model (practice set, teacher module quiz, Quiz Battle rewrite). PR CI, merge and the production deploy are checked after this commit (the pre-commit hook needs every gate here to pass) and reported on the PR.

- [x] G1: Quiz budgets fit the largest allowed quiz at Haiku's measured verbosity, in all three paths
  EVIDENCE: main.py `_quiz_output_token_budget(n) = min(16000, max(3072, n * 500))`, used by generate, JSON repair and strict regeneration; route max 12 questions -> 6000, request-model max 30 -> 15000 (under the 16000 cap). tests/test_quiz_token_budget.py (7 cases) fails when any path is put back to 320/260 per question; 16 passed with the quiz + chat files.

- [x] G2: Chat runs the intent check and the answer concurrently; the guided-hint reply still wins when the check says so, and an intent failure still falls back to the answer
  EVIDENCE: tests/test_chat_jev_socratic.py: concurrency test (deadlocks if sequential — mutation proved), guided reply wins and cancels the in-flight answer, intent failure -> answer, answer failure + guided -> guided reply with no leaked task error (loop exception handler + gc). Each new test fails under its targeted mutation.

- [x] G3: Backend test suite fully green
  CHECK: cd backend && set PYTHONPATH=C:\Users\APG\Downloads\MATHPULSE-AI\backend&& set PYTHONUTF8=1&& python -m pytest tests/ -q 2>&1 | findstr /r /c:" passed" /c:" failed" /c:" error"
  EXPECT: /^(?!.*\b(failed|errors?)\b).*\d+ passed/m
  EVIDENCE: 1162 passed, 2 warnings in 116.25s (0:01:56)

- [x] G4: Backend mypy: no new errors (baseline 16, all in the pre-existing main.py block)
  EVIDENCE: `python -m mypy --config-file mypy.ini --explicit-package-bases backend/main.py backend/analytics.py` -> "Found 16 errors in 1 file", all `object | Any` index/attr errors at main.py:8573-8595 (the pre-existing block, shifted by the new code).

- [x] G5: Live re-measure: a 10-question quiz completes in one model call with no 502 and is faster than the old 17.8 s; chat first turn is faster than 3.62 s
  EVIDENCE: real Haiku 5.5 through the routes (MODEL_PROFILE=prod, Firebase off, auth mocked), budget 4500 at the time: quiz 14.22 s / 14.86 s / 13.23 s in one call each (end_turn, 3332-3778 output tokens); 1 of 4 took 25.39 s with a strict-regeneration second call because the first reply parsed to fewer than 10 questions (stopped at 3974 of 4500, not truncated); no 502s. Before the fix: 23.5 s, 41.2 s and a 502 after 60.7 s. Chat first turn 1.71 / 2.36 / 2.90 s (median 2.36 s vs 3.62 s); guided reply 1.68 s. Budget since raised to 500/question for verbose topics (worst run used 397 tokens/question).

- [x] G6: Opus adversarial review: every confirmed finding fixed or dispositioned
  EVIDENCE: verdict "safe to merge for correctness". (1) medium, cancelled caller freed its slot while its thread kept calling the model -> fixed, G9. (2) answer started even when the verdict was already in -> not started any more (main.py chat_tutor; test_a_verdict_that_is_already_in_means_the_answer_is_never_created). (3) two "AI must not run" guards could not fail (abandoned-task errors are swallowed) -> rewritten with AsyncMock + assert_not_awaited in test_chat_jev_socratic.py and test_jev_hybrid_backend.py; both fail once an answer is allowed to start, while the old raising versions still pass. (4) finished answer vs guided verdict untested -> test_guided_reply_wins_over_an_answer_that_already_finished (fails if a finished answer wins). (5) TIMING [model_call] counted the verdict wait -> `_timed_chat_answer` times the call itself; stepped-clock test expects 1250ms with a 5 s verdict wait. (6) same bug class in other budgets -> G10. routes/quiz_generation_routes.py `/generate` (6000 for 20) is never mounted (main.py does not include that router; both frontend request shapes reach main.py's route via the topic/questionCount aliases) -> no change.

- [x] G7: No tracked file mentions the retired provider
  CHECK: git grep -i -l -e "deep[s]eek" || echo NO_PROVIDER_MENTIONS
  EXPECT: NO_PROVIDER_MENTIONS
  EVIDENCE: NO_PROVIDER_MENTIONS

- [x] G9: A cancelled caller keeps its `_run_hf_blocking` slot until its worker thread returns, so concurrent model calls never exceed HF_BLOCKING_CALL_CONCURRENCY
  EVIDENCE: tests/test_event_loop_offload.py: cancelled calls keep their slots (fails on the old `async with`, without shield, or never releasing), a caller cancelled while queued neither leaks nor adds a slot, an abandoned call's failure is not left unretrieved. Probe with the real backend, burst of 48 chats whose guided reply wins: answer threads peak 16 (the limit) vs 28 before the fix; abandoned wave: 0 free slots while 16 threads still run, vs 16 free and a peak of 32 before.

- [x] G10: Practice set (20 questions), teacher module quiz (10) and Quiz Battle rewrite (20 rounds) budgets fit their largest request and can be written before their caller stops waiting
  EVIDENCE: practice.py 8192 -> 10000 (20 x 500; ~40 s of output vs the 90 s timeout); teacher_materials.py 4096 -> 5000 (10 x 500); variance_engine.py 4000 -> 6000 (20 rounds x 300; ~24 s of output vs the Cloud Function's 30 s wait — the worker's 15000 would have taken up to 60 s). test_practice_router.py, test_teacher_materials.py and test_json_output_call_sites.py::test_variance_engine_fits_a_full_battle_inside_the_callers_wait fail at the old values; the battle test also fails at 15000 (mutation run: 6000 passed, 4000 failed, 15000 failed).
