# Gates: ignore Unlazy artifacts

Scope: the only uncommitted change left after this session's merges was the untracked `.unlazy/rag-lesson-stream.sample.sse`, which `backend/tests/test_rag_lesson_stream.py` (lines 41, 481-482) rewrites on every backend test run. Ignore `.unlazy/` and the Unlazy stop-hook state file (`.unlazy-hook-state.json`, which the skill's install-hooks.mjs says to ignore).

- [x] G1: Both artifacts are ignored and nothing under `.unlazy/` is tracked
  CHECK: git check-ignore .unlazy/rag-lesson-stream.sample.sse .unlazy-hook-state.json 2>&1
  EXPECT: /\.unlazy-hook-state\.json/
  EVIDENCE: .gitignore:157 matches .unlazy/rag-lesson-stream.sample.sse; .gitignore:158 matches .unlazy-hook-state.json; git ls-files .unlazy -> 0 files

- [x] G2: Working tree is clean apart from the .gitignore change
  EVIDENCE: git status --short -> " M .gitignore" only
