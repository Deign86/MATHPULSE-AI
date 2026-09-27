---
slug: jev-fun-modules-prompts
status: drafting
intent: clear
review_required: false
pending-action: write .omo/plans/jev-fun-modules-prompts.md
approach: Produce ONE decision-complete plan file embedding TWO copy-paste prompts (P1 Jev classifier integration as hybrid decision layer over DeepSeek generator; P2 additive enjoyable-modules overhaul fully utilizing RAG+LLM), each with repo file:line refs, acceptance gates, and agent-executed QA — no product-code edits in planning session.
---

# Draft: jev-fun-modules-prompts

## Components (topology ledger)
<!-- Lock the SHAPE before depth. One row per top-level component that can succeed or fail independently. -->
<!-- id | outcome (one line) | status: active|deferred | evidence path -->
- C1 | P1 Jev-as-decision-layer prompt (Choice routing, Noul verification, Score mastery; DeepSeek stays generator) | active | backend/routes/rag_routes.py:347, backend/routes/deepseek_rag_routes.py:57, backend/services/inference_client.py:208, scripts/jev_collate.py
- C2 | P2 additive fun-modules prompt (skill-tree unlocks, honest-XP rebalance, manipulatives, micro-lessons, peer duels; RAG retrieve→rerank→generate→verify) | active | src/components/ModulesPage.tsx, src/components/LessonViewer.tsx, src/data/curriculumModules.ts:38-57, current_xp_system.md
- C3 | Shared guardrails + delivery (additive-only seams, Must-NOT-have, prompt packaging as verbatim copy-paste blocks) | active | src/data/curriculumModules.ts:59-80, backend/routes/rag_routes.py:291-345, firestore.rules:481-484, .omo/plans/jev-review-omo-integration.md

## Open assumptions (announced defaults)
<!-- Record any default you adopt instead of asking, so the user can veto it at the gate. -->
<!-- assumption | adopted default | rationale | reversible? -->
- Jev shape | Hybrid: Jev decides/routes/verifies, DeepSeek generates (no full DeepSeek removal) | Jev is non-generative classifier; repo already constrains DeepSeek as generator with Python guardrails | yes (prompt can narrow scope)
- Additive only | No edits to existing routes/schemas; new endpoints/collections only (e.g. POST /api/curriculum/generate-module, new Firestore collections) | User said additive overhaul; preserves progress/XP flows | yes
- Secrets | TYPESAFE_API_KEY server-side only, never committed | TypeSafe skill + repo .secrets/ convention | yes

## Findings (cited - path:lines)
- RAG lesson flow: LessonViewer.tsx → useLessonContent.ts → lessonService.ts:136-141 POST /api/rag/lesson → rag_routes.py:347 → curriculum_rag.py 4-tier retrieval → inference_client.py:208 model routing (prod=deepseek-reasoner) → _ensure_7_sections rag_routes.py:291-345 → YouTube enrich → sessionStorage cache.
- DeepSeek roles: pure constrained generator for lessons/problems/previews (rag_routes.py:420-460, deepseek_rag_routes.py:155-202); mixed/shared for weakness-detection gated by 60% rule (deepseek_rag_routes.py:61-136); sole decider only for verify_solution.
- Barren causes: all locks forced false (curriculumModules.ts:11, subjects.ts:248-250); 2/4 subjects shelved (subjects.ts:120); rigid 7-tab template; PDF-fallback trap (LessonViewer.tsx:485-550); flat +50XP (progressService.ts:208); solitary silos, static mascot.
- Existing Jev seam: scripts/jev_collate.py + artifacts/e2e/jev-collation-ledger.md using typesafe_sdk Choice/Score/Noul — additive quality-gate pattern already in repo.
- Jev primitives: Choice (routing, confidence>=0.80 auto), Noul (P(yes), no separate confidence), Score (ordered levels, composite normalized) + verify-and-escalate loop; docs https://docs.typesafe.ai/llms.txt.
- Fun pipeline: retrieve→rerank→generate→verify + BKT/IRT/FSRS mastery + honest-XP over immutable events + IWF/Bloom/SymPy guardrails; additive tree under learning_engine/ with /api/v2/learning/* (external research, adapted to Firestore/FastAPI).

## Decisions (with rationale)
- intent=CLEAR, classification=Architecture, review_required=false — outcome (two prompts in one plan) is known; only owner-decision forks remain; no explicit high-accuracy modifier.
- One request → one plan file .omo/plans/jev-fun-modules-prompts.md embedding both verbatim prompts (no reduced MVP subset).
- Planner writes no product code; execution via separate worker ($start-work).
- USER-CONFIRMED 2026-09-22: P1=Full hybrid (Choice routing + Noul verification + Score mastery; DeepSeek stays generator) — best classifier-vs-generator capstone story.
- USER-CONFIRMED 2026-09-22: P2 lead=Progression + XP (skill-tree unlocks >=75% + honest-XP rebalance first; manipulatives/micro-lessons/duels as follow waves).
- USER-CONFIRMED 2026-09-22: Delivery=Two verbatim blocks in one plan (PASTE P1, PASTE P2) with refs + acceptance + QA.
- Test strategy default (vetoable at gate): tests-after + agent-executed QA per todo (happy+failure, exact tool+invocation, evidence path); TDD only where worker adds new pure logic (BKT update, XP calc, guardrails).

## Scope IN
- P1 prompt: Jev Choice/Noul/Score integration points, state/instructions/criteria shapes, confidence gates, DeepSeek-as-generator boundary, additive files/endpoints, acceptance + QA per prompt.
- P2 prompt: additive enjoyable-modules upgrade fully using RAG+LLM (progression, XP rebalance, manipulatives, micro-lessons, duels, mascot), additive files/endpoints/collections, acceptance + QA per prompt.
- Shared: Must-NOT-have, secrets handling, evidence paths, commit guidance for worker.

## Scope OUT (Must NOT have)
- No product-code edits in planning session; no DeepSeek removal; no breaking schema/route changes; no secrets committed; no rewriting existing .omo/plans.

## Open questions
- Q1 Jev first-scope: full triage+verify+mastery vs verify-only vs routing-only?
- Q2 Fun priority for capstone demo: progression+XP vs manipulatives vs duels vs micro-lessons?
- Q3 Delivery + QA: two separate blocks vs one combined block; test strategy TDD/tests-after/none (agent QA always included)?

## Approval gate
status: approved
<!-- When exploration is exhausted and unknowns are answered, set status: awaiting-approval. -->
<!-- That durable record is the loop guard: on a later turn read it and resume at the gate instead of re-running exploration. -->
- User approved 2026-09-22: plan generated at .omo/plans/jev-fun-modules-prompts.md.
- Next action: present handoff brief and ask start-or-review question. Planner makes no edits to product code.
