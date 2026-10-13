# Gates: stop the repetition stripper from deleting model replies

Scope: `call_hf_chat` (backend/main.py) passes every non-streaming model reply through `_strip_repetition`, written in February for small models that looped. The stripper records a block at each line in several lengths, so two lengths at the same line that collapse to the same text after `strip()` (any paragraph followed by a blank line) count as a "repeat". Normal Markdown loses paragraphs, sometimes all of them. Measured on the merged perf build: an ordinary first-turn chat returned HTTP 200 with an empty reply from 202 output tokens, and other replies kept only their last paragraph (430-char reply -> 107 chars offline). Pretty-printed quiz JSON is cut to half and stops parsing. 18 call sites in main.py use this path (non-streaming chat, step guides, quiz generation, solution checks, learning paths, insights); `/api/chat/stream` does not. PR CI, merge and the production deploy are checked after this commit and reported on the PR.

- [x] G1: Model replies reach callers unchanged: a multi-paragraph Markdown tutor reply and a pretty-printed 10-question quiz both come back from call_hf_chat intact
  CHECK: cd backend && python -X utf8 -m pytest tests/test_model_reply_passthrough.py -q -p no:cacheprovider 2>&1 | findstr /r /c:" passed" /c:" failed" /c:" error"
  EXPECT: /^(?!.*\b(failed|errors?)\b).*\d+ passed/m
  EVIDENCE: 3 passed in 27.88s

- [x] G2: The new tests fail when the stripper is put back
  EVIDENCE: with origin/main's backend/main.py (stripper present) swapped in: "3 failed in 181.47s" (both call_hf_chat cases and the /api/chat route case); fixed main.py restored afterwards (0 references to _strip_repetition). Offline probe of the old stripper: a 430-char five-paragraph tutor reply -> 107 chars (last paragraph only, matching the truncated benchmark reply "Once you find that value, ..."); a 182-char reply -> its last line; 10-question pretty-printed quiz JSON 4486 -> 2232 chars and invalid JSON.

- [x] G3: Backend test suite fully green
  CHECK: cd backend && set PYTHONPATH=C:\Users\APG\Downloads\MATHPULSE-AI\backend&& set PYTHONUTF8=1&& python -m pytest tests/ -q 2>&1 | findstr /r /c:" passed" /c:" failed" /c:" error"
  EXPECT: /^(?!.*\b(failed|errors?)\b).*\d+ passed/m
  EVIDENCE: 1165 passed, 2 warnings in 147.70s (0:02:27)

- [x] G4: Backend mypy: no new errors (baseline 16, all in the pre-existing main.py block)
  EVIDENCE: `python -m mypy --config-file mypy.ini --explicit-package-bases backend/main.py backend/analytics.py` -> "Found 16 errors in 1 file", all `object | Any` index/attr errors at main.py:8545-8567 (the pre-existing block, 28 lines up).

- [x] G5: Live re-measure with the production models: no empty chat reply, every reply as long as its output tokens imply, and each 10-question quiz in one model call
  EVIDENCE: live run on this fix (MODEL_PROFILE=prod, Haiku 5.5 through the real routes, Firebase off): first-turn chat replies 747 / 1269 / 452 chars from 273 / 468 / 195 output tokens (2.3-2.7 chars per token), none empty, 2.09 / 3.22 / 2.01 s; guided reply 1.64 s. The same benchmark on the merged code before this fix: 0 / 267 / 123 chars from 202 / 387 / 257 tokens. Quizzes 13.29 / 13.01 / 11.51 s, one call each (end_turn, 3119-3338 tokens); "Domain and Range of Functions" needed a second call in both earlier runs (22.38 s, 25.39 s).

- [x] G6: No tracked file mentions the retired provider
  CHECK: git grep -i -l -e "deep[s]eek" || echo NO_PROVIDER_MENTIONS
  EXPECT: NO_PROVIDER_MENTIONS
  EVIDENCE: NO_PROVIDER_MENTIONS
