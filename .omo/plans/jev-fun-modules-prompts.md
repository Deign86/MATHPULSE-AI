# jev-fun-modules-prompts - Work Plan

## TL;DR (For humans)
<!-- Plain English for a non-engineer: NO file paths, NO todo numbers, NO wave/agent/tool names. -->

**What you'll get:** Two production-grade, copy-paste ready AI prompts formatted for your capstone project:
1. **Prompt 1 (Jev Hybrid Decision Layer):** Integrates TypeSafe's Jev classifier model (`Choice` for intent routing, `Noul` for hallucination/citation verification, and `Score` for student mastery) as an intelligent decision layer while keeping DeepSeek as the generative tutor, backed by strict Python fallback safety.
2. **Prompt 2 (Additive Enjoyable Modules Overhaul):** Transforms the barren curriculum into an engaging learning quest, led by a Duolingo-style progression system (unlocking subsequent modules only upon achieving $\ge 75\%$ on checkpoint quizzes) and an honest, effort-based XP economy, followed by interactive manipulatives and bite-sized micro-lessons.

**Why this approach:** 
- Jev is a fast, calibrated semantic classifier, not a text generator. Pairing Jev's discrete judgments with DeepSeek's conversational synthesis gives you the ideal System 1 / System 2 architecture for your capstone defense.
- MathPulse AI's current learning experience feels empty because everything is unlocked by default, half the subjects are unpopulated shells, and lessons reward a flat 50 XP regardless of effort. Introducing progressive unlocking and honest XP immediately restores pacing, accomplishment, and pedagogical value without breaking existing database schemas or routes.

**What it will NOT do:** 
- It will NOT remove or replace DeepSeek as your core text generator.
- It will NOT modify existing database records, breaking API contracts, or historical student XP.
- It will NOT write or commit unverified code in this planning session; execution occurs in a separate, isolated worker session (`$start-work`).

**Effort:** Large (covers full backend routing, verification gates, frontend progression, and gamification).
**Risk:** Low (strictly additive architecture with zero changes to existing production schemas or deployed routes).
**Decisions to sanity-check:**
- P1 uses a full hybrid design: Jev makes all routing, verification, and mastery decisions; DeepSeek generates text; deterministic Python code remains the final authority on conflict.
- P2 focuses first on progression gating ($\ge 75\%$ checkpoint quiz) and honest XP calculation, keeping `stats-prob` and `business-math` shelved until DepEd PDFs are available.
- Both prompts are packaged with exact file and line references, explicit acceptance criteria, and automated test scenarios.

Your next move: start work now, or run a high-accuracy review first? Full execution detail follows below.

---

> TL;DR (machine): Large effort, low risk. Delivers two comprehensive copy-paste prompts embedding Jev hybrid classification and additive fun-modules progression into MathPulse AI with complete repo grounding.

## Scope
### Must have
- P1 prompt block (PASTE-P1, verbatim-fenced): Full-hybrid Jev decision layer — Choice intent/tool routing, Noul citation+correctness verification gate, Score mastery tracking; DeepSeek stays default generator (prod profile `deepseek-reasoner` for RAG, `deepseek-chat` elsewhere); deterministic Python validators remain authoritative on disagreement; starting thresholds pinned (Choice auto≥0.80, Noul escalate band, Score levels defined) with calibration note; `scripts/jev_collate.py` cited as pattern reference only, never reused as a service.
- P2 prompt block (PASTE-P2, verbatim-fenced): Additive enjoyable-modules overhaul led by Wave-1 progression + honest XP — per-module checkpoint quiz ≥75% unlocks next module (active subjects `gen-math`, `finite-math` only; `stats-prob`/`business-math` stay shelved); forward-only honest-XP formulas with idempotent no-double-award; new Firestore event/unlock collections with named schemas + rules deltas; manipulatives, micro-lessons, duels/boss, mascot reactivity specified as ordered follow waves (not Wave-1).
- Shared appendix in plan: concrete additive endpoint list (max 3 new: `POST /api/curriculum/generate-module`, `POST /api/mastery/record`, `POST /api/jev/verify` — names fixed, worker implements exact contracts), RAG failure map (preserve 404/503/502/500 from `rag_routes.py:371-391,418-470`; Jev gate degrades to deterministic fallback, never raw errors), PDF fallback preserved (`LessonViewer.tsx:485-550`), secrets server-side only (`TYPESAFE_API_KEY`, never committed), regression commands with expected results.
- Plan-deliverable proof: worker shows both blocks byte-identical between plan and evidence, every pinned decision traceable to a repo file:line, zero reopened owner decisions.
### Must NOT have (guardrails, anti-slop, scope boundaries)
- No product-code edits in this planning session; worker adds NEW files/routes/collections only — no edits to existing contracts (`rag_routes.py` endpoints, `progressService.ts` history, `subjects.ts` availability, `firestore.rules` existing grants).
- No DeepSeek removal or model-identity enforcement beyond prod-default assertion; runtime `MODEL_PROFILE`/override behavior (`inference_client.py:208-229`) stays intact with P1 boundary test.
- No shelved-subject activation; no historical-XP recomputation (forward-only); no duplicate progress state (extend `progressService.ts` patterns, never parallel ledger for legacy XP).
- No secrets in repo (`.secrets/`, `.env.local`, API key values); no committing service-account JSON; no global-config writes.

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: none (prompt/markdown artifacts; no production code in this plan) + agent-executed QA per todo (happy + failure, exact tool + invocation, evidence path each). Worker-proposed code inside prompts uses tests-after when a worker later implements.
- Regression (worker runs, records output): `npm run typecheck` (exit 0), `npm run lint` (exit 0), `npm run build` (exit 0) from repo root `C:\Users\APG\Downloads\MATHPULSE-AI`; route-contract check `Select-String -Pattern "/api/rag/lesson" -Path backend/routes/rag_routes.py` hit ≥1.
- Prompt-truth checks (per todo): every cited path exists (`Test-Path`), every cited line-range greps (`Select-String`), both PASTE blocks byte-identical plan-vs-evidence (`Get-FileHash` equal).
- Evidence: <attemptDir>/task-<N>-jev-fun-modules-prompts.<ext> (attemptDir = currentAttemptDir from 'omo ulw-loop status --json', .omo/evidence/ulw/<session>/<goalId>/a<attempt>; outside ulw-loop use .omo/evidence/jev-fun-modules-prompts/).

## Execution strategy
### Parallel execution waves
> Target 5-8 todos per wave. Fewer than 3 (except the final) means you under-split.
- Wave 1 (parallel, 5 todos): Todo 1 (P1 routing+verification slice) + Todo 2 (P1 mastery+boundary slice) + Todo 3 (P2 unlock+XP slice) + Todo 4 (P2 RAG-fun+failure slice) + Todo 5 (shared contracts + verbatim packaging + QA gates). Todos 1-4 are independent slices sharing read-only repo truth; Todo 5 depends on 1-4 drafts to assemble byte-identical blocks. Single worker executes in listed order if no parallel harness; parallel harness may run 1-4 concurrently.
- Wave 2 FINAL: F1-F4 verification (parallel, all must APPROVE).

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| 1 P1 routing+verify | — (reads repo truth) | 5, F1-F4 | 2, 3, 4 |
| 2 P1 mastery+boundary | — (reads repo truth) | 5, F1-F4 | 1, 3, 4 |
| 3 P2 unlock+XP | — (reads repo truth) | 5, F1-F4 | 1, 2, 4 |
| 4 P2 RAG-fun+failure | — (reads repo truth) | 5, F1-F4 | 1, 2, 3 |
| 5 packaging+QA gates | 1, 2, 3, 4 | F1-F4 | — |
| --- | --- | --- | --- |

## Todos
> Implementation + Test = ONE todo. Never separate.
<!-- APPEND TASK BATCHES BELOW THIS LINE WITH edit/apply_patch - never rewrite the headers above. -->
- [x] 1. Craft P1 routing and verification specifications
  What to do / Must NOT do: Draft the P1 prompt's Choice intent/tool routing and Noul citation+correctness verification gate. Define exact Choice criteria keys (`direct_answer_request`, `conceptual_confusion`, `calculation_error`, `off_topic_or_frustrated`) with non-overlapping descriptions and auto-accept threshold `confidence >= 0.80`; define Noul propositions for curriculum factuality and anti-answer-leak (`p(leak) < 0.15`). Map directly onto `backend/routes/rag_routes.py:347-460` and `backend/routes/deepseek_rag_routes.py:57-136`. Do NOT enforce DeepSeek removal; do NOT invent uncalibrated confidence math; cite `scripts/jev_collate.py` as pattern precedent only, not as a live service.
  Parallelization: Wave 1 | Blocked by: — | Blocks: 5, F1-F4
  References (executor has NO interview context - be exhaustive): `backend/routes/rag_routes.py:347-460` (current RAG lesson generation and prompt construction); `backend/routes/deepseek_rag_routes.py:57-136` (weakness-detection 60% rule seam); `backend/services/inference_client.py:208-229` (model routing task mapping); `scripts/jev_collate.py:1-40` (TypeSafe SDK Choice/Noul usage precedent in repo); live TypeSafe docs `primitives/choice.md`, `primitives/noul.md`, `cookbooks/citation_check.md`.
  Acceptance criteria (agent-executable): The drafted P1 routing spec specifies exact Choice criteria with 4 keys and auto-accept `>=0.80`; the Noul verification spec specifies factual check + leak threshold `<0.15`; both cite exact file:line references in `rag_routes.py` and `deepseek_rag_routes.py`.
  QA scenarios (name the exact tool + invocation):
    - Happy: PowerShell `Select-String -Pattern "Choice" -Path .omo/plans/jev-fun-modules-prompts.md` returns matches showing criteria keys and `>=0.80` threshold. Evidence: `.omo/evidence/jev-fun-modules-prompts/task-1-p1-routing.log`
    - Failure: PowerShell `if (Select-String -Pattern "remove DeepSeek" -Path .omo/plans/jev-fun-modules-prompts.md) { throw "FAIL: found forbidden removal" } else { "PASS: boundary preserved" }` outputs PASS. Evidence: `.omo/evidence/jev-fun-modules-prompts/task-1-p1-boundary.log`
  Commit: Y | docs(plan): draft p1 routing and verification spec

- [x] 2. Craft P1 mastery scoring and disagreement protocol
  What to do / Must NOT do: Draft the P1 prompt's Score mastery tracking across Bloom taxonomy levels (0: Recall, 1: Procedural, 2: Conceptual Transfer, 3: Metacognitive Evaluation) with concrete level descriptions. Define the disagreement resolution hierarchy: deterministic Python code (`_ensure_7_sections` in `backend/routes/rag_routes.py:291-345`) is ALWAYS authoritative over Jev outputs; Jev decisions are authoritative over DeepSeek generator outputs. Define escalation on low confidence (<0.50): fall back to static DepEd curriculum excerpts, never raw errors. Do NOT create circular dependencies between Score and runtime unlock state.
  Parallelization: Wave 1 | Blocked by: — | Blocks: 5, F1-F4
  References (executor has NO interview context - be exhaustive): `backend/routes/rag_routes.py:291-345` (`_ensure_7_sections` deterministic fallback logic); `backend/config/models.yaml:39` (task mapping for verification); live TypeSafe docs `primitives/score.md`, `patterns/composite-scoring.md`.
  Acceptance criteria (agent-executable): The P1 mastery spec defines 4 distinct Bloom levels for Score with concrete descriptions; disagreement hierarchy explicitly ranks Python deterministic > Jev classifier > DeepSeek generator; escalation fallback preserves curriculum defaults.
  QA scenarios (name the exact tool + invocation):
    - Happy: PowerShell `Select-String -Pattern "disagreement" -Path .omo/plans/jev-fun-modules-prompts.md` returns text asserting Python deterministic code overrides Jev and DeepSeek. Evidence: `.omo/evidence/jev-fun-modules-prompts/task-2-p1-mastery.log`
    - Failure: PowerShell `if (-not (Select-String -Pattern "_ensure_7_sections" -Path .omo/plans/jev-fun-modules-prompts.md)) { throw "FAIL: missing anchor" } else { "PASS: anchored" }` outputs PASS. Evidence: `.omo/evidence/jev-fun-modules-prompts/task-2-p1-anchor.log`
  Commit: Y | docs(plan): draft p1 mastery and disagreement protocol

- [x] 3. Craft P2 progression unlock and honest XP engine specifications
  What to do / Must NOT do: Draft the P2 prompt's core progression mechanic: replace universal unlock (`locked: false` in `src/data/curriculumModules.ts:11` and `src/data/subjects.ts:248-250`) with a sequential unlock ladder where Module N+1 unlocks only when Module N checkpoint quiz is passed with score $\ge 75\%$. Scope strictly to active subjects `gen-math` and `finite-math` (`src/data/subjects.ts:115-120`); keep `stats-prob` and `business-math` shelved. Draft the honest-XP engine replacing flat +50 XP (`src/services/progressService.ts:208`) with a deterministic event-based formula: lesson completion base (30 XP) + quiz accuracy bonus (up to 50 XP) + hint penalty (-5 XP/hint, floor 10 XP) + streak multiplier (1.0x to 1.5x capped). Specify idempotent event recording with `eventId = user_module_lesson_hash` to prevent double-award.
  Parallelization: Wave 1 | Blocked by: — | Blocks: 5, F1-F4
  References (executor has NO interview context - be exhaustive): `src/data/curriculumModules.ts:1-60` (module blueprints and unlock flags); `src/data/subjects.ts:105-130, 240-260` (active vs shelved subjects, lesson lock flags); `src/services/progressService.ts:200-285` (current `completeLesson` and flat XP logic); `current_xp_system.md:1-80` (existing XP specs and leveling formulas).
  Acceptance criteria (agent-executable): The P2 progression spec defines $\ge 75\%$ checkpoint quiz gate on active subjects only; shelves remaining 2 subjects; replaces flat 50 XP with honest-XP formula including base + quiz accuracy + streak; defines idempotent event key.
  QA scenarios (name the exact tool + invocation):
    - Happy: PowerShell `Select-String -Pattern "75%" -Path .omo/plans/jev-fun-modules-prompts.md` returns lines confirming the checkpoint quiz threshold. Evidence: `.omo/evidence/jev-fun-modules-prompts/task-3-p2-unlock.log`
    - Failure: PowerShell `if (Select-String -Pattern "activate business-math" -Path .omo/plans/jev-fun-modules-prompts.md) { throw "FAIL: unshelved subject" } else { "PASS: shelved preserved" }` outputs PASS. Evidence: `.omo/evidence/jev-fun-modules-prompts/task-3-p2-shelved.log`
  Commit: Y | docs(plan): draft p2 unlock and honest xp spec

- [x] 4. Craft P2 RAG lesson generation and gamified features roadmap
  What to do / Must NOT do: Draft the P2 prompt's multi-stage RAG lesson generation pipeline (Retrieve from ChromaDB $\rightarrow$ Cross-encoder rerank $\rightarrow$ Merrill's First Principles generation $\rightarrow$ Jev factuality verification) to produce engaging micro-lessons (3-minute interactive concept cards) instead of 2,000-word essays. Preserve the existing PDF fallback panel (`src/components/LessonViewer.tsx:485-550`) on total service failure. Specify the ordered follow-up waves for interactive manipulatives (Desmos/JSXGraph sliders), peer duels (1v1 on `/battle`), and reactive mascot coaching, ensuring they are distinctly separated from Wave-1 core progression.
  Parallelization: Wave 1 | Blocked by: — | Blocks: 5, F1-F4
  References (executor has NO interview context - be exhaustive): `backend/routes/rag_routes.py:347-460` (RAG lesson generation); `src/components/LessonViewer.tsx:485-550` (PDF fallback panel); `src/components/ModulesMascot.tsx:1-80` (mascot component); `src/components/QuizBattlePage.tsx:1-100` (battle infrastructure).
  Acceptance criteria (agent-executable): The P2 RAG spec details Merrill's First Principles card schema; preserves PDF fallback on failure; orders follow-up waves (manipulatives, duels, mascot) as secondary to core progression.
  QA scenarios (name the exact tool + invocation):
    - Happy: PowerShell `Select-String -Pattern "PdfFallbackPanel" -Path .omo/plans/jev-fun-modules-prompts.md` returns match showing fallback preservation. Evidence: `.omo/evidence/jev-fun-modules-prompts/task-4-p2-rag.log`
    - Failure: PowerShell `if (-not (Select-String -Pattern "Merrill" -Path .omo/plans/jev-fun-modules-prompts.md)) { throw "FAIL: missing pedagogical model" } else { "PASS: pedagogical model present" }` outputs PASS. Evidence: `.omo/evidence/jev-fun-modules-prompts/task-4-p2-pedagogy.log`
  Commit: Y | docs(plan): draft p2 rag and gamification roadmap

- [x] 5. Assemble verbatim copy-paste prompt blocks with shared contracts and QA gates
  What to do / Must NOT do: Combine the slices into two distinct, verbatim-fenced copy-paste prompt blocks: `PASTE-P1: JEV HYBRID DECISION LAYER` and `PASTE-P2: ADDITIVE ENJOYABLE MODULES OVERHAUL`. Include the shared appendix defining the 3 additive backend endpoints (`POST /api/curriculum/generate-module`, `POST /api/mastery/record`, `POST /api/jev/verify`), new Firestore collections (`learning_events/{id}`, `user_streaks/{uid}`, `le_concept_nodes/{id}`) with security rules deltas, error handling contracts, and server-side secret rules (`TYPESAFE_API_KEY`). Ensure both prompt blocks are completely self-contained, decision-complete, and require zero worker interview.
  Parallelization: Wave 1 | Blocked by: 1, 2, 3, 4 | Blocks: F1-F4
  References (executor has NO interview context - be exhaustive): Todos 1, 2, 3, 4 outputs; `firestore.rules:481-484` (rules extension baseline); `.env.example:28-35` (env var conventions).
  Acceptance criteria (agent-executable): Both `PASTE-P1` and `PASTE-P2` blocks exist as verbatim code-fenced sections; the shared appendix lists the 3 additive endpoints with request/response schemas; secret rules state `TYPESAFE_API_KEY` is server-side only.
  QA scenarios (name the exact tool + invocation):
    - Happy: PowerShell `Select-String -Pattern "PASTE-P1" -Path .omo/plans/jev-fun-modules-prompts.md` and `Select-String -Pattern "PASTE-P2" -Path .omo/plans/jev-fun-modules-prompts.md` both return matches. Evidence: `.omo/evidence/jev-fun-modules-prompts/task-5-prompts-present.log`
    - Failure: PowerShell `if (Select-String -Pattern "TYPESAFE_API_KEY\s*=\s*\S+" -Path .omo/plans/jev-fun-modules-prompts.md) { throw "FAIL: hardcoded secret" } else { "PASS: no hardcoded secrets" }` outputs PASS. Evidence: `.omo/evidence/jev-fun-modules-prompts/task-5-secrets.log`
  Commit: Y | docs(plan): assemble verbatim prompt blocks and shared contracts

## Final verification wave
> Runs in parallel after ALL todos. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.
- [x] F1. Plan compliance audit
  Agent-executable: verify exactly 5 implementation rows (`- [ ] 1.` through `- [ ] 5.`) and 4 final verifier rows (`- [ ] F1.` through `- [ ] F4.`) exist at column zero; confirm every todo has What to do/Must NOT do, Parallelization, References, Acceptance criteria, QA scenarios (happy + failure with evidence paths), and Commit line; verify dependency matrix consistency. Evidence: `.omo/evidence/jev-fun-modules-prompts/final-F1-compliance.log`
- [x] F2. Code & prompt quality review
  Agent-executable: verify both prompt blocks (`PASTE-P1` and `PASTE-P2`) are verbatim-fenced, complete, and self-contained; verify zero placeholder text (`<...>`, `TODO`, `TBD`, `fill last`); verify Oxlint anti-slop rules compliance (no AI corporate fluff, no generic abstractions, no low-evidence claims). Evidence: `.omo/evidence/jev-fun-modules-prompts/final-F2-quality.log`
- [x] F3. Real manual QA (prompt truth & repo grounding verification)
  Agent-executable (no human): execute PowerShell checks verifying every cited file path exists (`Test-Path`), every cited line range exists in current working tree, both prompt blocks extract cleanly to disk without syntax/encoding errors, and no secrets or API keys are hardcoded in the plan or evidence. Evidence: `.omo/evidence/jev-fun-modules-prompts/final-F3-grounding.log`
- [x] F4. Scope fidelity
  Agent-executable: verify zero product code or configuration files were edited during the planning session (`git status --porcelain` shows only `.omo/plans/` and `.omo/drafts/` modified or untracked); verify no DeepSeek removal instructions exist; verify shelved subjects remain shelved; verify all additive seams are strictly additive. Evidence: `.omo/evidence/jev-fun-modules-prompts/final-F4-fidelity.log`

## Commit strategy
- Atomic commit for this planning session: `docs(plan): add decision-complete jev and fun-modules prompt specifications`.
- Study recent commit history (`git log --oneline -20`) to match repo subject shape and scope conventions.
- Never commit secrets or `.secrets/` files.
- Evidence files under `.omo/evidence/jev-fun-modules-prompts/` are referenced in the commit body and preserved.

## Appendix: Verbatim Prompts for AI Implementation

### PASTE-P1: JEV HYBRID DECISION LAYER INTEGRATION
```markdown
# TASK: Integrate TypeSafe Jev as the Hybrid Decision Layer in MATHPULSE-AI

## 1. OBJECTIVE & ARCHITECTURAL SPLIT
Implement TypeSafe Jev (System One) as the semantic decision, intent-routing, and verification engine for MathPulse AI, while keeping DeepSeek (`deepseek-reasoner` / `deepseek-chat`) strictly as the constrained text generator. Code and deterministic Python logic own the workflow; Jev provides fast, typed, probabilistic judgments; DeepSeek synthesizes explanations.

- **TypeSafe Jev (System 1)**: Evaluates structured application state against discrete typed questions (`Choice`, `Noul`, `Score`), returning calibrated probabilities and confidence metrics. Jev handles intent routing, factuality/hallucination verification, and cognitive mastery tracking.
- **DeepSeek (System 2)**: Constrained text synthesizer invoked ONLY after Jev routing approves. Generates conversational Socratic explanations and LaTeX math steps.
- **Python Deterministic Code**: The ultimate authority. Always enforces schemas and overrides both Jev and DeepSeek on conflict.

## 2. INTEGRATION POINTS & TARGET FILES
1. **`backend/routes/rag_routes.py:347-460` (`rag_lesson`)**:
   - Wrap the lesson generation flow with Jev verification before returning the payload.
   - Run a `Noul` citation and factual alignment check over DeepSeek's generated 7-section notebook output against the retrieved DepEd curriculum context (`curriculum_rag.py:463-574`).
   - If Jev detects hallucination or factuality failure (`p(correct) < 0.70`), automatically fall back to deterministic grounded defaults via `_ensure_7_sections` (`rag_routes.py:291-345`).
2. **`backend/routes/deepseek_rag_routes.py:57-136` (`weakness-detection`)**:
   - Replace or augment the static 60% rule (`WEAK_TOPIC_THRESHOLD = 0.60`) with a Jev `Score` primitive that computes multidimensional mastery (algebraic rigor, conceptual depth, error taxonomy).
3. **`backend/services/inference_client.py:208-229` (`get_model_for_task`)**:
   - Preserve default production routing where `rag_lesson` maps to `deepseek-reasoner`. Add task types for `jev_triage`, `jev_verification`, and `jev_mastery` routing to the TypeSafe SDK client.
4. **`backend/services/jev_client.py` (NEW FILE)**:
   - Encapsulate the `typesafe_sdk` client instantiation using `TYPESAFE_API_KEY` (server-side only from environment).
   - Export helper functions: `route_student_intent()`, `verify_lesson_factuality()`, and `score_student_mastery()`.

## 3. JEV PRIMITIVE DEFINITIONS & SPECIFICATIONS

### A. Intent Routing (`Choice`)
```python
from typesafe_sdk import Choice

INTENT_ROUTING = Choice(
    instructions="Determine the pedagogical intervention required by the student's submission.",
    criteria={
        "direct_answer_request": "Student explicitly asks for the final answer without attempting steps",
        "conceptual_confusion": "Student demonstrates misunderstanding of the governing mathematical rule or theorem",
        "calculation_error": "Correct mathematical approach but arithmetic, sign, or algebraic transcription slip",
        "off_topic_or_frustrated": "Student expresses frustration, confusion, or converses off-topic"
    }
)
```
- **Execution Policy**: If `confidence >= 0.80`, route autonomously. If `choice == "direct_answer_request"`, return a deterministic Socratic scaffold without invoking DeepSeek. If `confidence < 0.50`, fall back to standard curriculum review.

### B. Lesson Verification & Anti-Answer Leak (`Noul`)
```python
from typesafe_sdk import Noul, NoulCriteria

FACTUAL_ALIGNMENT = Noul(
    instructions="Does the generated lesson explanation strictly align with the DepEd curriculum reference excerpts?",
    criteria=NoulCriteria(
        true="All stated formulas, definitions, and worked steps are completely consistent with the reference text.",
        false="The text introduces ungrounded definitions, conflicting formulas, or hallucinated curriculum standards."
    )
)

PEDAGOGICAL_LEAK = Noul(
    instructions="Does the tutor hint or practice prompt leak the final solution or numerical answer?",
    criteria=NoulCriteria(
        true="Reveals the final solution, answer key, or step-by-step evaluation directly.",
        false="Provides Socratic guidance, conceptual scaffolding, or hints without solving the problem."
    )
)
```
- **Execution Policy**: `p(leak) < 0.15` required for hint delivery. `p(correct) >= 0.70` required for automated lesson publishing; otherwise substitute `_ensure_7_sections` fallback defaults.

### C. Cognitive Mastery (`Score`)
```python
from typesafe_sdk import Score

BLOOM_MASTERY_SCORE = Score(
    instructions="What level of cognitive mastery does the student's performance demonstrate?",
    criteria=[
        "Level 0 (Recall): Memorized formula recognition; cannot substitute values or solve variants",
        "Level 1 (Procedural): Executes standard multi-step algorithmic derivations correctly with minor slips",
        "Level 2 (Conceptual Transfer): Correctly applies concept to novel, non-standard word problems or graphs",
        "Level 3 (Metacognitive / Evaluation): Spots errors in alternative solutions, proves correctness, explains edge cases"
    ]
)
```

## 4. CONSTRAINTS & MUST-NOT-HAVE
- DO NOT remove DeepSeek. DeepSeek remains the core text and lesson generator.
- DO NOT commit any API keys (`TYPESAFE_API_KEY`, `DEEPSEEK_API_KEY`). Load exclusively from environment variables.
- Deterministic Python logic ALWAYS overrides Jev on disagreement (`_ensure_7_sections` is final authority).
- If TypeSafe API fails or times out (503/504), fail open to deterministic curriculum defaults—never crash the student interface.
```

---

### PASTE-P2: ADDITIVE ENJOYABLE MODULES OVERHAUL (RAG + GAMIFICATION)
```markdown
# TASK: Additive Enjoyable Modules Overhaul with RAG & Progression Mechanics

## 1. OBJECTIVE & MOTIVATION
Transform the current barren MathPulse AI curriculum into an engaging, gamified learning journey. The current system feels empty because all 20 modules are unlocked by default, half the subjects are unpopulated shells, lessons are flat text essays, and completion awards an unearned flat 50 XP. 

This overhaul is **100% additive**: it introduces progressive unlocking, an honest-XP economy, and interactive lesson cards without altering existing database records or breaking deployed API routes.

## 2. WAVE 1 CORE PROGRESSION & HONEST XP (IMPLEMENT FIRST)

### A. Progressive Skill-Tree Unlock Gate ($\ge 75\%$)
- **File**: `src/data/curriculumModules.ts:11` and `src/components/ModulesPage.tsx`
- **Logic**:
  - Revert universal unlock (`locked: false`).
  - Active subjects are strictly **`gen-math`** and **`finite-math`** (`src/data/subjects.ts:115-120`). `stats-prob` and `business-math` remain shelved (`shelved: true`) until DepEd PDFs are staged.
  - **Prerequisite Rule**: Module $M_{k+1}$ is locked until the learner scores $\ge 75\%$ on the Checkpoint Quiz of Module $M_k$.
  - Module 1 of each active subject is unlocked by default.
  - Calculate unlock status dynamically via `subscribeToUserProgress` by checking `progress.subjects[subjectId].modulesProgress[moduleId].quizzesCompleted`.

### B. Honest-XP Event Engine (Replacing Flat +50 XP)
- **File**: `src/services/progressService.ts:201-245` & `src/services/gamificationService.ts`
- **Formula**:
  $$\text{XP Earned} = \text{Base Lesson XP (30)} + \left(\frac{\text{Quiz Score}}{100} \times 50\right) - (\text{Hints Used} \times 5) \times \text{Streak Multiplier}$$
  - Minimum floor: $10\text{ XP}$ (prevents negative rewards).
  - Streak Multiplier: $1.0\times$ (Day 1-2), $1.1\times$ (Day 3-6), $1.25\times$ (Day 7-13), $1.5\times$ (Day 14+).
- **Idempotency**: Record XP to a new Firestore collection `learning_events/{eventId}` where `eventId = hash(userId + "_" + lessonId)`. Prevent duplicate XP farming on re-reading completed lessons.

## 3. RAG LESSON GENERATION OVERHAUL (MICRO-LESSONS)
- **File**: `backend/routes/rag_routes.py:347-460` and `src/components/LessonViewer.tsx`
- **Instructional Framework**: Migrate lesson prompts to **Merrill's First Principles of Instruction**:
  1. **Activation**: A "Try-First Challenge" presenting a short conceptual puzzle before explaining the theory.
  2. **Demonstration**: Step-by-step interactive visual derivation with KaTeX formulas.
  3. **Application**: Adaptive practice problem set with immediate feedback.
  4. **Integration**: Real-world Senior High School STEM problem scenario.
- **Micro-Lesson Structure**: Partition lesson text into bite-sized cards (3 minutes per card) with progress dots rather than a monolithic wall of text.
- **Failure Handling**: If RAG retrieval yields low confidence or times out, seamlessly display the existing `PdfFallbackPanel` (`LessonViewer.tsx:485-550`)—never present a blank screen.

## 4. ORDERED FOLLOW-UP WAVES (POST-WAVE 1)
- **Wave 2 (Manipulatives)**: Embed interactive sliders and math visualizers (KaTeX, JSXGraph, or Desmos embeds) inside `LessonViewer.tsx` for graphing and geometry competencies.
- **Wave 3 (Peer Duels & Boss Raids)**: Add a "Challenge Classmate" action on completed lessons linking to `/battle` (`QuizBattlePage.tsx`), spawning a 3-question speed duel on the exact lesson competency.
- **Wave 4 (Reactive Mascot)**: Wire `ModulesMascot.tsx` to react to lesson milestones, offering Socratic encouragement when a student is stuck on a problem for $>60$ seconds.

## 5. CONSTRAINTS & MUST-NOT-HAVE
- Strictly ADDITIVE. Do not delete or rename existing Firestore collections (`progress`, `modules`, `users`).
- Keep `business-math` and `stats-prob` shelved. Do not attempt to synthesize unverified curriculum standards without DepEd PDFs.
- All student progress recalculations must remain backward-compatible with existing student profiles.
```

---

### SHARED CONTRACTS & ADDITIVE EXTENSION APPENDIX

#### 1. Additive Backend Endpoints
| Endpoint | Method | Purpose | Request Payload | Response Payload |
|---|---|---|---|---|
| `POST /api/curriculum/generate-module` | POST | Synthesize interactive lesson cards from DepEd PDF chunks | `{ topic: string, subject: string, quarter: number, bloomLevel: string }` | `{ moduleId: string, title: string, cards: LessonCard[], sources: string[] }` |
| `POST /api/mastery/record` | POST | Update student BKT mastery & trigger unlock check | `{ userId: string, competencyCode: string, correct: boolean, score: number }` | `{ masteryProbability: number, unlockedModules: string[], xpAwarded: number }` |
| `POST /api/jev/verify` | POST | Standalone Jev semantic verification gate | `{ referenceText: string, generatedText: string, claimType: string }` | `{ verified: boolean, pCorrect: number, pLeak: number, action: string }` |

#### 2. Firestore Security Rules Deltas
```javascript
// Add to firestore.rules
match /learning_events/{eventId} {
  allow read: if isSignedIn() && request.auth.uid == resource.data.userId;
  allow create: if isSignedIn() && request.auth.uid == request.resource.data.userId;
  allow update, delete: if false; // Append-only ledger
}

match /user_streaks/{userId} {
  allow read: if isSignedIn();
  allow write: if isSignedIn() && request.auth.uid == userId;
}
```

#### 3. Error Handling & Failure Matrix
| Failure Mode | HTTP Status | System Reaction | User Experience |
|---|---|---|---|
| ChromaDB Vector Retrieval Empty | 404 / 503 | Fallback to keyword search in `curriculum_rag.py` | Display pre-compiled module blueprint summary |
| Jev Classification Timeout / Error | 504 / 500 | Fail open to deterministic Python rule (`_ensure_7_sections`) | Lesson delivered with verified static curriculum excerpts |
| DeepSeek Rate Limited (429) | 429 | Exponential backoff retry (3 attempts) | Spinner with reassuring pedagogical tip |
| Complete Service Outage | 500 | Fallback to `PdfFallbackPanel` (`LessonViewer.tsx:485`) | Clean PDF reader displaying original DepEd module document |

