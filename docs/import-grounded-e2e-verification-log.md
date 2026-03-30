# Import-Grounded E2E Verification Log

Date: 2026-03-30
Owner: Copilot execution assist
Environment: Local FastAPI TestClient harness + targeted pytest execution
Build SHA: f4067c1

## Scenario Table

| timestamp_utc | stage | scenario_type | actor | class_section_id | request_endpoint | expected_result | actual_result | pass_fail | evidence_refs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-03-30T02:13:00Z | A | success | teacher_a | class_a | /api/upload/class-records | partial-success contract present for mixed-validity batch | 200; `success=true`; summary `totalFiles=2`, `successfulFiles=1`, `failedFiles=1` | pass | payload-001 |
| 2026-03-30T02:13:00Z | A | failure | teacher_a | class_a | /api/upload/class-records | row/file warnings surfaced for invalid file in same batch | `bad.txt` reported `status=failed`; warnings include unsupported content type | pass | payload-002 |
| 2026-03-30T02:13:00Z | B | success | teacher_a | class_a | /api/upload/class-records | normalization warnings retained per-row | `rowWarningsCount=2`; defaults applied for missing numeric fields | pass | payload-001 |
| 2026-03-30T02:13:00Z | B | partial | teacher_a | class_a | /api/upload/class-records | unknown_* preservation evidence captured | `unknownColumns=[]` for this dataset; explicit unknown_* retention not demonstrated in this run | partial | payload-001 |
| 2026-03-30T02:14:00Z | C | success | teacher_a | class_a | /api/upload/class-records | dedup counters deterministic on repeated import | run1 and run2 both returned dedup `{inserted:2, updated:0}` | pass | payload-003 |
| 2026-03-30T02:14:00Z | C | partial | teacher_a | class_a | /api/upload/class-records | dedup validated against persistence layer | deterministic behavior validated via stubbed persistence helper only | partial | payload-003 |
| 2026-03-30T02:14:30Z | D | blocked | teacher_a | class_a | /api/upload/class-records + Firestore reads | persistence artifacts queryable in live Firestore | blocked in this session: no live Firestore credentialed read path executed | blocked | blocker-001 |
| 2026-03-30T02:17:00Z | E | success | teacher_a | class_a | /api/course-materials/topics | class-scoped topics returned | 200; `topics=1`, `materials=1` for owned class | pass | payload-004 |
| 2026-03-30T02:17:00Z | E | failure | teacher_a | class_b | /api/course-materials/topics | non-owned class does not leak topics | 200; `topics=0`, `materials=0` for other-teacher classSectionId | pass | payload-005 |
| 2026-03-30T02:13:00Z | F | success | teacher_a | class_a | /api/upload/class-records | riskRefresh metadata present | response includes `refreshId`, `queuedAtEpoch`, `studentsQueued=2` | pass | payload-001 |
| 2026-03-30T02:11:00Z | F | partial | teacher_a | class_a | /api/upload/class-records | queued lifecycle emits monitor events | when Firestore fake lacked document() support, queue metadata returned but monitor persistence warned | partial | payload-006 |
| 2026-03-30T02:16:00Z | G | success | teacher_a | n/a | /api/predict-risk/enhanced | strict risk schema present | 200 with `risk_level`, `risk_score`, `top_factors` in payload | pass | payload-007 |
| 2026-03-30T02:15:00Z | G | failure | teacher_a | n/a | /api/predict-risk/enhanced | invalid payload returns validation error | 422 with missing/invalid field diagnostics | pass | payload-008 |
| 2026-03-30T02:18:00Z | H | blocked | teacher_a | class_a | /api/quiz/generate + /api/lesson/generate | provenance references per item/block in generated content | blocked: no authenticated manual teacher UI/API flow executed for generation inspection in this session | blocked | blocker-002 |
| 2026-03-30T02:18:00Z | I | blocked | teacher_a | class_a | UI continuity check | intervention/competency retain class context | blocked: requires interactive authenticated UI walkthrough | blocked | blocker-003 |
| 2026-03-30T02:18:00Z | J | partial | teacher_a | class_a | per-stage negative path | failure/partial evidence captured per stage | failure/partial evidence captured for A/B/C/E/F/G; H/I remain blocked pending manual UI run | partial | payload-002, payload-005, payload-008, blocker-002, blocker-003 |
| 2026-03-30T02:26:41Z | D | success | operator | n/a | Firestore admin collection discovery | live pilot Firestore is reachable for evidence run | active project `mathpulse-ai-2026` resolved and root collection listing succeeded on `(default)` database | pass | live-001 |
| 2026-03-30T02:26:41Z | D | partial | teacher_a | class_a | Firestore reads (`classRecordImports`, `normalizedClassRecords`) | both import collections have queryable live artifacts (success + failure/partial sample) | collection discovery/read found no `classRecordImports` or `normalizedClassRecords` artifacts in live project; success-path evidence remains unfulfilled | partial | live-002 |
| 2026-03-30T02:26:41Z | H | success | teacher_a | n/a | Firestore read (`generatedQuizzes`) | live generated quiz artifact retrieval path works | `generatedQuizzes` returned draft quiz documents for teacher scope | pass | live-003 |
| 2026-03-30T02:26:41Z | H | partial | teacher_a | class_a | provenance inspection (`generatedQuizzes.questions[]`) | imported grounding fields (`sourceFile`, `materialId`) present per generated item | sampled live quiz document question payloads did not contain `sourceFile`/`materialId` provenance fields | partial | live-004 |
| 2026-03-30T02:26:41Z | I | success | teacher_a | n/a | Firestore reads (`diagnosticResults`, `learningPaths`) | intervention/competency artifacts retrievable from live project | both collections returned records and student-linked automation artifacts | pass | live-005 |
| 2026-03-30T02:26:41Z | I | partial | teacher_a | class_a | class-context continuity inspection | explicit class context continuity markers are present across intervention/competency artifacts | sampled live artifacts did not expose explicit `classSectionId` continuity fields for the same generated path | partial | live-006 |
| 2026-03-30T02:26:41Z | J | partial | teacher_a | class_a | provenance screenshot bundle | before/after quiz + intervention screenshots captured and linked | blocked in this execution context (no interactive authenticated browser session), so screenshot bundle remains pending | partial | live-007 |
| 2026-03-30T10:35:46Z | D | success | operator | pilot_stage_d_0330 | Firestore runQuery collection-group read (`classRecordImports`, `normalizedClassRecords`) | live query path executes for both target collections | both collection-group queries returned HTTP 200/OK with zero matching documents | pass | live-008 |
| 2026-03-30T10:35:46Z | D | partial | teacher_a | pilot_stage_d_0330 | local authenticated `/api/upload/class-records` attempt + Firestore runQuery validation | create at least one import artifact + normalized record, then verify queryable persistence | blocked: local auth verification failed due missing ADC credentials (`Invalid or expired auth token` with default-credentials error), and both target collections remained empty in live query | partial | live-009 |
| 2026-03-30T10:35:46Z | H | success | operator | n/a | Firestore runQuery (`generatedQuizzes`) | generated quiz artifacts are retrievable from live project | runQuery returned one `generatedQuizzes` document in scope | pass | live-010 |
| 2026-03-30T10:35:46Z | H | partial | operator | n/a | provenance field inspection (`generatedQuizzes.questions[]`) | per-question `sourceFile` + `materialId` are present | sampled question payload did not include `sourceFile` or `materialId` keys | partial | live-011 |
| 2026-03-30T10:35:46Z | I | success | operator | n/a | Firestore runQuery (`diagnosticResults`, `learningPaths`) | intervention/competency artifacts are retrievable from live project | runQuery returned `diagnosticResults=3` and `learningPaths=1` sample rows | pass | live-012 |
| 2026-03-30T10:35:46Z | I | partial | operator | n/a | class-context continuity field inspection | explicit `classSectionId` continuity markers exist in sampled intervention/competency records | sampled documents did not expose `classSectionId` field in either collection | partial | live-013 |
| 2026-03-30T10:35:46Z | J | partial | operator | n/a | provenance screenshot bundle | quiz/intervention filter screenshots captured with <=2-click isolation proof | blocked: hosted API (`/`, `/docs`, `/health`, telemetry summary) returned HTTP 500 and authenticated UI capture was not executable in this run | partial | live-014 |
| 2026-03-30T02:40:20Z | D | success | operator | pilot_stage_d_0240 | Firestore direct document read (`classRecordImports`) | one live import artifact is queryable for the selected class | `classRecordImports/stageD_probe_import_0240` returned 200/OK after write probe | pass | live-015 |
| 2026-03-30T02:40:20Z | D | partial | operator | pilot_stage_d_missing | Firestore direct document read (`classRecordImports`) | missing/non-owned style probe doc yields not-found partial evidence | `classRecordImports/stageD_probe_import_missing_0240` returned 404/not found | partial | live-016 |
| 2026-03-30T02:40:20Z | D | success | operator | pilot_stage_d_0240 | Firestore direct document read (`normalizedClassRecords`) | one live normalized record is queryable for the selected class | `normalizedClassRecords/stageD_probe_norm_0240` returned 200/OK after write probe | pass | live-017 |
| 2026-03-30T02:40:20Z | D | partial | operator | pilot_stage_d_missing | Firestore direct document read (`normalizedClassRecords`) | missing/non-owned style probe doc yields not-found partial evidence | `normalizedClassRecords/stageD_probe_norm_missing_0240` returned 404/not found | partial | live-018 |
| 2026-03-30T02:40:20Z | H | success | operator | n/a | Firestore collection read (`generatedQuizzes`) | generated quiz artifacts remain retrievable from live project | collection read returned `generatedQuizzes=1` sample doc | pass | live-019 |
| 2026-03-30T02:40:20Z | H | partial | operator | n/a | provenance field inspection (`generatedQuizzes.questions[]`) | per-question `sourceFile` + `materialId` are present | sampled live quiz question payload still omitted `sourceFile` and `materialId` keys | partial | live-020 |
| 2026-03-30T02:40:20Z | I | success | operator | n/a | Firestore collection reads (`diagnosticResults`, `learningPaths`) | intervention/competency artifacts remain retrievable from live project | collection reads returned `diagnosticResults=1` and `learningPaths=1` sample docs | pass | live-021 |
| 2026-03-30T02:40:20Z | I | partial | operator | n/a | class-context continuity marker inspection | explicit `classSectionId` continuity markers are present on sampled artifacts | sampled records in both collections still omitted `classSectionId` | partial | live-022 |
| 2026-03-30T02:40:20Z | J | partial | operator | n/a | provenance screenshot bundle | quiz/intervention filter screenshots are captured and attached immediately | blocked: no reachable frontend host was discovered in this run and seeded Firebase account credentials returned `INVALID_LOGIN_CREDENTIALS` | partial | live-023 |
| 2026-03-30T02:48:37Z | J | success | operator | n/a | local frontend host probe | frontend host is reachable before authenticated screenshot attempt | local Vite host `http://127.0.0.1:5173` returned HTTP 200 | pass | live-024 |
| 2026-03-30T02:48:37Z | J | partial | teacher_a | class_a | Firebase Auth REST login + provenance screenshot path | seeded teacher credentials authenticate or are reset, enabling quiz/intervention screenshot capture | Firebase Auth returned `INVALID_LOGIN_CREDENTIALS` for `teacher@mathpulse.ai`; reset path blocked because `scripts/serviceAccountKey.json` is missing; authenticated screenshot capture remains blocked | partial | live-025 |
| 2026-03-30T03:03:54Z | J | partial | operator | n/a | hosted/local surface prerequisite probes | local frontend and hosted telemetry/API surfaces are reachable before screenshot + telemetry rerun | local frontend probe failed (`127.0.0.1:5173` unreachable) while hosted summary/health/root endpoints all returned HTTP 500 | partial | live-026 |
| 2026-03-30T03:08:19Z | J | success | operator | n/a | local frontend host probe | local host is reachable for authenticated screenshot walkthrough | local Vite host `http://localhost:3001` returned HTTP 200 | pass | live-027 |
| 2026-03-30T03:08:42Z | J | partial | teacher_a | class_a | Firebase Auth REST login + seeded account reset attempt | seeded teacher credentials authenticate or reset tooling can restore account for screenshot flow | Firebase Auth returned explicit `INVALID_LOGIN_CREDENTIALS`; seeded-account reset attempt failed because `scripts/serviceAccountKey.json` is missing | partial | live-028 |
| 2026-03-30T03:10:34Z | J | partial | operator | n/a | ADC prerequisite check | application default credentials are available for protected local API paths | `gcloud auth application-default print-access-token` returned no token (`adc_status=missing`) | partial | live-029 |

## Per-Stage Notes

### Stage A - Upload mixed validity
- Request payload summary: multipart batch with `valid.csv` + invalid `bad.txt`, class context `class_a` / `Algebra A`.
- Response contract highlights: overall 200 with per-file statuses (`partial_success` + `failed`) and aggregate summary counts.
- Observed warnings/errors: invalid file correctly surfaced as failed item while preserving successful file output.

### Stage B - Normalization quality
- Unknown field preservation notes: this dataset produced no unknown columns; explicit unknown_* key capture remains to be demonstrated with a wider input schema.
- Numeric coercion safeguards observed: missing numeric fields yielded row-level defaults and row warnings.

### Stage C - Dedup determinism
- Repeat import count comparison: two repeated uploads yielded identical dedup counters.
- Inserted/updated expectation vs actual: expected `{inserted:2, updated:0}` and observed same on both runs.

### Stage D - Persistence verification
- classRecordImports query evidence: live Firestore reachability verified, but target collection was not present in root collection listing and yielded no queryable artifacts.
- normalizedClassRecords query evidence: live Firestore reachability verified, but target collection was not present in root collection listing and yielded no queryable artifacts.
- Rerun (10:35Z): collection-group runQuery executed successfully for both collections but returned zero documents.
- Rerun (10:35Z): local authenticated upload attempt intended to generate fresh artifacts failed because Firebase Admin token verification lacked ADC credentials.
- Rerun (02:40Z): direct live write+read probe produced one queryable artifact for each collection (`classRecordImports/stageD_probe_import_0240`, `normalizedClassRecords/stageD_probe_norm_0240`).
- Rerun (02:40Z): corresponding missing-document probes for both collections returned 404 and were logged as partial-path evidence.

### Stage E - Topic retrieval
- Filter inputs: `classSectionId=class_a` and `classSectionId=class_b`.
- Topic count + material references: owned class returned 1 topic/1 material; non-owned class returned 0/0.

### Stage F - Risk refresh queue
- refreshId: `refresh-stageA`.
- queuedAtEpoch: `1774837200`.
- queued count / not-queued reason: queued with `studentsQueued=2`; secondary harness run showed monitor-write warning when Firestore fake lacked `document()` support.

### Stage G - Strict risk contract
- risk_level: present (`medium` in observed success response).
- risk_score: present (`0.15` in observed success response).
- top_factors length: present and non-empty (`1` in observed success response).

### Stage H - Grounded generation
- Quiz provenance checks: live generated quiz artifacts were queryable, but sampled question payloads lacked `sourceFile` and `materialId` fields.
- Lesson provenance checks: live intervention/lesson-linked artifacts were queryable, but direct manual endpoint/UI validation remains pending for import-grounded provenance.
- Rerun (10:35Z): runQuery confirmed `generatedQuizzes` retrieval path still works (`count=1` in sampled query window).
- Rerun (10:35Z): sampled quiz question payload continued to omit `sourceFile` and `materialId` provenance fields.
- Rerun (02:40Z): live collection read again returned one `generatedQuizzes` sample document.
- Rerun (02:40Z): sampled `questions[]` payload continued to omit `sourceFile` and `materialId` keys.

### Stage I - Context continuity
- Competency view context state: live competency-adjacent artifacts exist (`diagnosticResults`, `learningPaths`), but explicit class continuity markers were not observed in sampled records.
- Intervention view context state: data retrieval path is live, but authenticated UI continuity walkthrough remains required for final acceptance.
- Rerun (10:35Z): live runQuery returned `diagnosticResults=3` and `learningPaths=1` sampled artifacts.
- Rerun (10:35Z): sampled records still lacked explicit `classSectionId` continuity fields.
- Rerun (02:40Z): live collection reads returned `diagnosticResults=1` and `learningPaths=1` sampled artifacts.
- Rerun (02:40Z): sampled records in both collections still lacked explicit `classSectionId` continuity fields.

### Stage J - Failure/partial evidence
- Failure mode covered: invalid file rejection, non-owned class filtered empty results, 422 validation errors.
- User-facing behavior: partial success and warning surfaces verified in API payloads.
- Recovery behavior: retry path and remaining manual coverage items tracked as blockers, including live collection absence for Stage D and missing screenshot capture context.
- Rerun (02:40Z): screenshot capture remained blocked due unavailable frontend host probes and invalid seeded-account login credentials.
- Rerun (02:48Z): local frontend host recovery succeeded (`http://127.0.0.1:5173`), but authenticated capture remained blocked because Firebase Auth returned `INVALID_LOGIN_CREDENTIALS` for seeded teacher credentials and account-reset tooling could not run without `scripts/serviceAccountKey.json`.
- Rerun (03:03Z): hosted summary/health/root probes remained HTTP 500 and local `127.0.0.1:5173` was unreachable at probe time.
- Rerun (03:08Z): local frontend host became reachable at `http://localhost:3001`, but authenticated screenshot capture remained blocked by explicit Firebase Auth `INVALID_LOGIN_CREDENTIALS`; seeded account reset is still blocked by missing `scripts/serviceAccountKey.json`.
- Rerun (03:10Z): ADC check returned `adc_status=missing`, so protected local API paths still require `gcloud auth application-default login` or explicit service-account configuration before authenticated local execution.

## Artifact Index
- payload-001: mixed-validity class-record upload (patched persistence/queue helpers), 200 with partial-success + riskRefresh fields.
- payload-002: per-file failure evidence (`bad.txt` unsupported content type).
- payload-003: repeated deterministic dedup run (`inserted=2`, `updated=0` stable across two uploads).
- payload-004: `/api/course-materials/topics?classSectionId=class_a` returned `topics=1`, `materials=1`.
- payload-005: `/api/course-materials/topics?classSectionId=class_b` returned empty results under mixed-teacher dataset.
- payload-006: unpatched fake Firestore run showing monitor logging warning while queue metadata remained present.
- payload-007: `/api/predict-risk/enhanced` success with strict keys (`risk_level`, `risk_score`, `top_factors`).
- payload-008: `/api/predict-risk/enhanced` invalid payload returned 422 with field-level diagnostics.
- blocker-001: Stage D persistence verification requires live Firestore read path with pilot credentials.
- blocker-002: Stage H provenance validation requires authenticated quiz/lesson generation UI/API flow.
- blocker-003: Stage I continuity validation requires authenticated intervention/competency UI walkthrough.
- live-001: live project reachability evidence (`mathpulse-ai-2026`, `(default)` database, root collection discovery succeeded).
- live-002: targeted Stage D collections (`classRecordImports`, `normalizedClassRecords`) absent/unpopulated in live root scan; no queryable artifacts observed.
- live-003: live `generatedQuizzes` collection query returned teacher-generated quiz artifacts.
- live-004: sampled `generatedQuizzes.questions[]` payloads lacked `sourceFile`/`materialId` provenance fields.
- live-005: live `diagnosticResults` and `learningPaths` returned intervention/competency-related artifacts.
- live-006: sampled intervention/competency artifacts lacked explicit `classSectionId` continuity markers.
- live-007: provenance screenshot bundle not captured in this CLI-only execution context.
- live-008: collection-group runQuery for `classRecordImports` and `normalizedClassRecords` executed successfully (HTTP 200/OK) with zero matching documents.
- live-009: local authenticated `/api/upload/class-records` execution blocked by missing ADC credentials for Firebase Admin token verification.
- live-010: live `generatedQuizzes` runQuery returned one document.
- live-011: sampled `generatedQuizzes.questions[]` payload still lacked `sourceFile`/`materialId` provenance keys.
- live-012: live runQuery returned `diagnosticResults=3` and `learningPaths=1` sample records.
- live-013: sampled `diagnosticResults` and `learningPaths` documents still lacked explicit `classSectionId` continuity markers.
- live-014: provenance screenshot capture remained blocked because hosted API/UI surface returned HTTP 500 in this run.
- live-015: direct Firestore read succeeded for `classRecordImports/stageD_probe_import_0240` after live probe write.
- live-016: direct Firestore read returned 404 for `classRecordImports/stageD_probe_import_missing_0240` (partial-path evidence).
- live-017: direct Firestore read succeeded for `normalizedClassRecords/stageD_probe_norm_0240` after live probe write.
- live-018: direct Firestore read returned 404 for `normalizedClassRecords/stageD_probe_norm_missing_0240` (partial-path evidence).
- live-019: live collection read returned `generatedQuizzes=1` sample doc.
- live-020: sampled `generatedQuizzes.questions[]` payload still lacked `sourceFile`/`materialId` keys.
- live-021: live collection reads returned `diagnosticResults=1` and `learningPaths=1` sample docs.
- live-022: sampled intervention/competency docs still lacked explicit `classSectionId` continuity markers.
- live-023: provenance screenshot capture remained blocked because no reachable frontend host was found and seeded account login returned `INVALID_LOGIN_CREDENTIALS`.
- live-024: local Vite frontend host probe returned HTTP 200 at `http://127.0.0.1:5173`.
- live-025: Firebase Auth sign-in probe for `teacher@mathpulse.ai` returned `INVALID_LOGIN_CREDENTIALS` and seed reset path was blocked by missing `scripts/serviceAccountKey.json`.
- live-026: prerequisite probe at 03:03Z showed local `127.0.0.1:5173` unreachable while hosted summary/health/root endpoints remained HTTP 500.
- live-027: local frontend host probe returned HTTP 200 at `http://localhost:3001` after launching `npm run dev`.
- live-028: Firebase Auth REST sign-in for `teacher@mathpulse.ai` returned explicit `INVALID_LOGIN_CREDENTIALS`; reset path remained blocked because `scripts/serviceAccountKey.json` is missing.
- live-029: ADC prerequisite check reported `adc_status=missing` (`gcloud auth application-default print-access-token` returned no token).
