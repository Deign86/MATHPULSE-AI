# Jev Collation Ledger — issues 150-164
_Live TypeSafe run 2026-09-20 16:26 UTC; model `jev-1.13.0`; 51 Jev calls, 19.3s total; key via env only, never logged._

## Per-issue verdicts
| # | Title | Area (conf) | Sev | Repro | Reach | Composite | Pri | Noul | Wave | Plan |
|---|-------|-------------|-----|-------|-------|-----------|-----|------|------|------|
| 150 | Backend CORS rejects direct VITE_API_URL calls from Vite dev server | backend-data (0.44) | 1.58 | 1.17 | 1.06 | 0.432 | P1 | 0.09 | 2 | DIFF->curator |
| 151 | /assessment deep-link renders 'Content Coming Soon' placeholder | ux-frontend (1.0) | 2.21 | 1.12 | 1.66 | 0.555 | P1 | 0.14 | 3 | DIFF->curator |
| 152 | Scientific calculator modal cannot be closed (Escape and Close button dead) | ux-frontend (1.0) | 1.94 | 1.29 | 1.42 | 0.522 | P1 | 0.1 | 3 | DIFF->curator |
| 153 | AIChatPage React warnings: button-in-button nesting and missing forwardRef on Input | ux-frontend (1.0) | 1.71 | 1.13 | 2.18 | 0.537 | P1 | 0.1 | 3 | DIFF->curator |
| 154 | [P0] Quiz Battle answers never score: stale roundNumber race (400/504) | battle (1.0) | 3.65 | 1.84 | 1.69 | 0.827 | P0 | 0.97 | 1 | match |
| 155 | [P0] Battle stats/history crash: this.toMillis is not a function (zod-cloned Timestamp) | ux-frontend (0.48) | 1.99 | 1.89 | 1.9 | 0.643 | P1 | 0.79 | 3 | DIFF->curator |
| 156 | [Security] Hardcoded demo creds + client-side role gating + cross-role notification leak | auth-security (1.0) | 4.0 | 0.99 | 2.96 | 0.87 | P0 | 0.96 | 2 | match |
| 157 | [P1] Prod bundle hits test HF backend unauthenticated (RAG/DeepSeek endpoints) | auth-security (0.7) | 3.42 | 1.02 | 2.78 | 0.787 | P0 | 0.92 | 2 | match |
| 158 | [P1] Notifications + dashboard data disagree (badge 12 vs 100+, XP 486 vs 586, order, dupes) | ux-frontend (1.0) | 2.19 | 1.03 | 2.15 | 0.582 | P1 | 0.12 | 3 | match |
| 159 | [P2] Overkill hygiene bundle: latency, overlay trap, boundaries, swallowed rejections, meta, auth nits | ux-frontend (1.0) | 2.11 | 1.02 | 2.7 | 0.616 | P1 | 0.44 | 3 | DIFF->curator |
| 160 | [P1] rag: POST /api/rag/lesson returns 503 retrieval_failed (Chroma Error finding id) | backend-data (1.0) | 3.0 | 2.0 | 2.02 | 0.793 | P0 | 0.32 | 2 | match |
| 161 | [P1] memory: GET /api/memory/health returns 500 NameError (undefined name server-side) | backend-data (1.0) | 2.69 | 2.0 | 1.38 | 0.701 | P0 | 0.19 | 2 | match |
| 162 | [P2] assessment: Assessment Complete banner never opens results modal (routes to Grades instead) | ux-frontend (1.0) | 1.08 | 1.89 | 1.34 | 0.483 | P1 | 0.06 | 3 | match |
| 163 | [P2] activity-feed: subscribeToActivities Firestore permissions denial on Teacher Dashboard | auth-security (1.0) | 1.98 | 2.0 | 1.71 | 0.64 | P1 | 0.22 | 2 | match |
| 164 | [Security / UX] Obfuscate internal RAG telemetry and model metadata in Curriculum Grounding Evidence modal for student users | auth-security (0.46) | 2.39 | 1.12 | 1.86 | 0.594 | P1 | 0.36 | 2 | DIFF->curator |

## Duplicate verdicts
Prefilter (deterministic token Jaccard>=0.15): 6 pairs scored with 3-level pairwise Score; all other pairs verdict=0 (unrelated, no Jev call needed).
**True duplicates: 0** (level=2 with confidence>=0.7).
- #160 x #161: jaccard=0.502 level=0 (unrelated: different problems, different fixes) conf=0.88
- #162 x #163: jaccard=0.403 level=0 (unrelated: different problems, different fixes) conf=1.0
- #161 x #162: jaccard=0.371 level=0 (unrelated: different problems, different fixes) conf=1.0
- #160 x #163: jaccard=0.361 level=0 (unrelated: different problems, different fixes) conf=1.0
- #161 x #163: jaccard=0.354 level=0 (unrelated: different problems, different fixes) conf=0.99
- #160 x #162: jaccard=0.348 level=0 (unrelated: different problems, different fixes) conf=1.0

## Final execution wave order (wave, composite desc, noul desc)
1. Wave 1 — #154 [P0] Quiz Battle answers never score: stale roundNumber race (400/504) [P0/battle, comp=0.827, noul=0.97]
2. Wave 2 — #156 [Security] Hardcoded demo creds + client-side role gating + cross-role notification leak [P0/auth-security, comp=0.87, noul=0.96]
3. Wave 2 — #160 [P1] rag: POST /api/rag/lesson returns 503 retrieval_failed (Chroma Error finding id) [P0/backend-data, comp=0.793, noul=0.32]
4. Wave 2 — #157 [P1] Prod bundle hits test HF backend unauthenticated (RAG/DeepSeek endpoints) [P0/auth-security, comp=0.787, noul=0.92]
5. Wave 2 — #161 [P1] memory: GET /api/memory/health returns 500 NameError (undefined name server-side) [P0/backend-data, comp=0.701, noul=0.19]
6. Wave 2 — #163 [P2] activity-feed: subscribeToActivities Firestore permissions denial on Teacher Dashboard [P1/auth-security, comp=0.64, noul=0.22]
7. Wave 2 — #164 [Security / UX] Obfuscate internal RAG telemetry and model metadata in Curriculum Grounding Evidence modal for student users [P1/auth-security, comp=0.594, noul=0.36]
8. Wave 2 — #150 Backend CORS rejects direct VITE_API_URL calls from Vite dev server [P1/backend-data, comp=0.432, noul=0.09]
9. Wave 3 — #155 [P0] Battle stats/history crash: this.toMillis is not a function (zod-cloned Timestamp) [P1/ux-frontend, comp=0.643, noul=0.79]
10. Wave 3 — #159 [P2] Overkill hygiene bundle: latency, overlay trap, boundaries, swallowed rejections, meta, auth nits [P1/ux-frontend, comp=0.616, noul=0.44]
11. Wave 3 — #158 [P1] Notifications + dashboard data disagree (badge 12 vs 100+, XP 486 vs 586, order, dupes) [P1/ux-frontend, comp=0.582, noul=0.12]
12. Wave 3 — #151 /assessment deep-link renders 'Content Coming Soon' placeholder [P1/ux-frontend, comp=0.555, noul=0.14]
13. Wave 3 — #153 AIChatPage React warnings: button-in-button nesting and missing forwardRef on Input [P1/ux-frontend, comp=0.537, noul=0.1]
14. Wave 3 — #152 Scientific calculator modal cannot be closed (Escape and Close button dead) [P1/ux-frontend, comp=0.522, noul=0.1]
15. Wave 3 — #162 [P2] assessment: Assessment Complete banner never opens results modal (routes to Grades instead) [P1/ux-frontend, comp=0.483, noul=0.06]

## Curator queue (Choice/Score conf<0.7, Noul 0.3-0.7, or wave diff)
- #150: area Choice confidence 0.44; severity Score confidence 0.58; wave 2 differs from plan wave 3 -> plan wins pending review -> disposition: plan wave stands; human confirms at fix time
- #151: severity Score confidence 0.63; reach Score confidence 0.46; wave 3 differs from plan wave 4 -> plan wins pending review -> disposition: plan wave stands; human confirms at fix time
- #152: repro Score confidence 0.56; reach Score confidence 0.51; wave 3 differs from plan wave 4 -> plan wins pending review -> disposition: plan wave stands; human confirms at fix time
- #153: reach Score confidence 0.46; wave 3 differs from plan wave 4 -> plan wins pending review -> disposition: plan wave stands; human confirms at fix time
- #154: reach Score confidence 0.45 -> disposition: accept Jev values; low risk to ordering
- #155: area Choice confidence 0.48; reach Score confidence 0.66; wave 3 differs from plan wave 1 -> plan wins pending review -> disposition: plan wave stands; human confirms at fix time
- #157: severity Score confidence 0.63 -> disposition: accept Jev values; low risk to ordering
- #159: rerank Noul 0.44 in uncertain band; wave 3 differs from plan wave 4 -> plan wins pending review -> disposition: plan wave stands; human confirms at fix time
- #160: reach Score confidence 0.52; rerank Noul 0.32 in uncertain band -> disposition: accept Jev values; low risk to ordering
- #161: reach Score confidence 0.52 -> disposition: accept Jev values; low risk to ordering
- #162: reach Score confidence 0.64 -> disposition: accept Jev values; low risk to ordering
- #164: area Choice confidence 0.46; severity Score confidence 0.49; rerank Noul 0.36 in uncertain band; wave 2 differs from plan wave 3 -> plan wins pending review -> disposition: plan wave stands; human confirms at fix time

## Cookbook patterns applied
- hierarchical_classification: Choice over 5 areas (https://docs.typesafe.ai/cookbooks/hierarchical_classification.md)
- composite-scoring: severity+repro+reach normalized 0-1, weights 0.5/0.25/0.25 in code (https://docs.typesafe.ai/patterns/composite-scoring.md)
- entity_alignment: pairwise 3-level Score on prefiltered pairs only (https://docs.typesafe.ai/cookbooks/entity_alignment.md)
- rerank_typesafe: one Noul per issue vs triage query, sort by noul (https://docs.typesafe.ai/cookbooks/rerank_typesafe.md)
- confidence: gating per https://docs.typesafe.ai/confidence.md; raw answers in .omo/evidence/task-2-jev-raw.json (citation_check)
