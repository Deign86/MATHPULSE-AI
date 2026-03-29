# Session Changelog - 2026-03-29

## Overview
This session introduced a full Initial Assessment and Recommendation (IAR) workflow expansion across Cloud Functions, frontend models/UI, and backend API surfaces, with reassessment automation, curriculum/version governance, and deep-diagnostic lifecycle handling.

High-level scope:
- Added new IAR scoring, recommendation, reassessment, backfill, and runtime-check automation modules.
- Added new profile update + inactivity sweep triggers.
- Extended callable trigger suite with admin backfill and manual reassessment support.
- Expanded frontend data model/contracts and student flow state handling.
- Added course-material upload and parsing API support (PDF/DOCX/TXT).
- Removed legacy tests and one-off local Python helper scripts.

## Memory-Informed Continuity Notes
Used persistent repo memory while preparing this documentation:
- auth-role-selection memory: preserve intended role behavior during profile creation flows.
- hf-space-frontend-deploy memory: preserve media deployment via Git LFS strategy.

These notes were considered while describing behavior-level impacts and deployment context.

## Backend API (FastAPI) Changes
### backend/main.py
- Added role policy coverage for `/api/upload/course-materials`.
- Added full `POST /api/upload/course-materials` endpoint with:
  - extension allow-list: `.pdf`, `.docx`, `.txt`
  - MIME checks and request size limits
  - parser paths:
    - TXT decoding (utf-8 with fallback)
    - DOCX extraction via `python-docx`
    - PDF extraction via `pdfplumber` with page-limit guard
  - text normalization, section inference, topic suggestion extraction, and preview payload
  - robust error handling for parse failures and protected PDFs

### src/services/apiService.ts
- Added `CourseMaterialUploadResponse` type.
- Added `apiService.uploadCourseMaterials(file)` with validation and multipart upload to `/api/upload/course-materials`.

## Cloud Functions & Automation Pipeline Changes
### New modules
- `functions/src/automations/iarAssessmentScoring.ts`
  - topic scoring/classification (Mastered/NeedsReview/HighRisk)
  - derives IAR assessment insights and state transitions
- `functions/src/automations/learningPathEngine.ts`
  - recommendation logic for next topic group with prerequisite-aware normalization
- `functions/src/automations/reassessmentEngine.ts`
  - detects reassessment reasons (profile changes/inactivity)
  - computes inactivity threshold checks
  - requests reassessment with audit metadata
- `functions/src/automations/backfillCurriculumVersion.ts`
  - dry-run/commit backfill utilities for curriculum version/lifecycle fields
  - patch validation and sanity checks
- `functions/src/automations/runtimeChecks.ts`
  - targeted runtime policy/lifecycle/version propagation checks
- `functions/src/config/diagnosticPolicies.ts`
  - runtime diagnostic policy model, resolver/evaluator, and sanity checks

### Modified automation and trigger files
- `functions/src/automations/diagnosticProcessor.ts`
  - significant expansion of diagnostic completion handling and lifecycle transitions
  - deeper intervention and progression handling (including deep-diagnostic pathways)
- `functions/src/automations/quizProcessor.ts`
  - updated integration points for revised workflow handling
- `functions/src/config/constants.ts`
  - new workflow mode constants (`iar_only`, `iar_plus_diagnostic`)
  - deep-diagnostic assignment statuses, inactivity scan config, G12 gate thresholds, sequencing constants
- `functions/src/triggers/onDiagnosticComplete.ts`
  - refactored into reusable handler functions
  - idempotent processing + explicit failure-state writes
  - passes workflow/assessment metadata through processing
- `functions/src/triggers/manualTriggers.ts`
  - `manualProcessStudent` now supports lifecycle control inputs
  - added `manualBackfillCurriculumVersion` callable (admin-only)
  - added `manualRequestReassessment` + handler (teacher/admin)
- `functions/src/triggers/onStudentProfileUpdated.ts` (new)
  - user profile update trigger for reassessment decisioning
  - scheduled inactivity reassessment sweep function
- `functions/src/index.ts`
  - exports new profile update/inactivity sweep triggers
  - exports new manual callable operations

## Frontend App, UI, and Workflow State Changes
### Core app orchestration
- `src/App.tsx`
  - introduced IAR workflow mode and assessment type wiring (`initial_assessment`, `followup_diagnostic`)
  - introduced learning-path lock handling tied to deep diagnostic assignment state
  - added pending deep-diagnostic count fetch and gating behavior
  - added initial-assessment CTA for unassessed/skipped states
  - improved student navigation guard/redirect when modules are locked
  - integrated testing reset action and settings modal reset callback

### Assessment UI and scoring flow
- `src/components/DiagnosticAssessmentModal.tsx`
  - expanded payload contract and strongly typed completion payload
  - added IAR blueprint-driven question/answer handling
  - computes topic summaries, classifications, and readiness indicators
  - supports workflow mode and assessment type controls

### Additional updated UI surfaces
- `src/components/AdminDashboard.tsx`
- `src/components/GradesPage.tsx`
- `src/components/LeaderboardPage.tsx`
- `src/components/LearningPath.tsx`
- `src/components/ModulesPage.tsx`
- `src/components/PracticeCenter.tsx`
- `src/components/RewardsModal.tsx`
- `src/components/RightSidebar.tsx`
- `src/components/ScientificCalculator.tsx`
- `src/components/SettingsModal.tsx`
- `src/components/TeacherDashboard.tsx`
- `src/components/TopicMasteryView.tsx`

These updates align UI/UX with the expanded assessment + progression lifecycle and role-level controls.

## Data Model, Curriculum, and Policy Artifacts
### New frontend data files
- `src/data/iarBlueprint.ts`
- `src/data/curriculumTemplates.ts`
- `src/data/curriculumValidation.ts`
- `src/data/diagnosticPolicies.ts`

### Modified core models/content
- `src/types/models.ts`
  - expanded StudentProfile and related types for IAR state, diagnostics, readiness, recommendation, and lifecycle tracking
- `src/data/subjects.ts`
  - updated curriculum/subject data hooks aligned with new pathways

## Service Layer Changes
- `src/services/authService.ts`
  - student profile initialization now sets baseline IAR fields
- `src/services/automationService.ts`
  - expanded trigger payload typing and metadata
  - added deep-diagnostic assignment status updates for follow-up workflows
  - added `getPendingDeepDiagnosticCount()` helper
- `src/services/testResetService.ts` (new)
  - role-aware reset utility for test/dev state cleanup

## Security/Rules and Environment
- `firestore.rules`
  - rule updates to support new workflow data paths and operations
- `functions/.env.mathpulse-ai-2026` (new)
  - environment template for reassessment scheduler and workflow mode override

## Build/Dependencies/Testing Configuration
- `package.json`
  - added `jsdom`
  - removed vitest scripts
- `package-lock.json`
  - dependency graph updates reflecting package changes
- `vite.config.ts`
  - removed vitest config block and reference

## Deletions/Cleanup
Removed legacy or one-off files:
- tests removed:
  - `backend/tests/__init__.py`
  - `backend/tests/test_api.py`
  - `src/services/__tests__/apiService.test.ts`
  - `src/services/__tests__/apiUtils.test.ts`
- utility scripts removed:
  - `color_update.py`
  - `color_update2.py`
  - `fix_color.py`
  - `fix_color_final.py`
  - `rename_loli.py`
  - `replace_icons.py`
  - `resize_icons.py`
  - `update_hover.py`
  - `update_module.py`
  - `update_module_regex.py`

Additional session artifact:
- `plan.md` (handoff plan and phased implementation notes)

## Exact File Inventory (Status + Numstat)
```
M  backend/main.py                                           +179  -0
D  backend/tests/__init__.py                                 +0    -0
D  backend/tests/test_api.py                                 +0    -513
D  color_update.py                                           +0    -20
D  color_update2.py                                          +0    -28
M  firestore.rules                                           +25   -0
D  fix_color.py                                              +0    -29
D  fix_color_final.py                                        +0    -27
M  functions/src/automations/diagnosticProcessor.ts          +662  -8
M  functions/src/automations/quizProcessor.ts                +5    -0
A  functions/src/automations/backfillCurriculumVersion.ts
A  functions/src/automations/iarAssessmentScoring.ts
A  functions/src/automations/learningPathEngine.ts
A  functions/src/automations/reassessmentEngine.ts
A  functions/src/automations/runtimeChecks.ts
M  functions/src/config/constants.ts                         +78   -0
A  functions/src/config/diagnosticPolicies.ts
M  functions/src/index.ts                                    +8    -0
M  functions/src/triggers/manualTriggers.ts                  +236  -1
M  functions/src/triggers/onDiagnosticComplete.ts            +102  -54
A  functions/src/triggers/onStudentProfileUpdated.ts
A  functions/.env.mathpulse-ai-2026
A  plan.md
M  package-lock.json                                         +530  -0
M  package.json                                              +2    -3
M  src/App.tsx                                               +236  -15
M  src/components/AdminDashboard.tsx                         +10   -6
M  src/components/DiagnosticAssessmentModal.tsx              +399  -120
M  src/components/GradesPage.tsx                             +51   -19
M  src/components/LeaderboardPage.tsx                        +10   -3
M  src/components/LearningPath.tsx                           +14   -4
M  src/components/ModulesPage.tsx                            +7    -3
M  src/components/PracticeCenter.tsx                         +25   -8
M  src/components/RewardsModal.tsx                           +39   -39
M  src/components/RightSidebar.tsx                           +26   -23
M  src/components/ScientificCalculator.tsx                   +35   -4
M  src/components/SettingsModal.tsx                          +56   -24
M  src/components/TeacherDashboard.tsx                       +153  -35
M  src/components/TopicMasteryView.tsx                       +23   -11
A  src/data/curriculumTemplates.ts
A  src/data/curriculumValidation.ts
A  src/data/diagnosticPolicies.ts
A  src/data/iarBlueprint.ts
M  src/data/subjects.ts                                      +33   -0
M  src/services/apiService.ts                                +34   -0
M  src/services/authService.ts                               +3    -0
M  src/services/automationService.ts                         +66   -2
A  src/services/testResetService.ts
D  src/services/__tests__/apiService.test.ts                 +0    -546
D  src/services/__tests__/apiUtils.test.ts                   +0    -382
M  src/types/models.ts                                       +169  -0
D  update_hover.py                                           +0    -42
D  update_module.py                                          +0    -293
D  update_module_regex.py                                    +0    -307
M  vite.config.ts                                            +0    -7
```

## Notes for Reviewers
- This is a broad, cross-layer change touching automation workflows, policy evaluation, and student UX state management.
- Most functional risk is concentrated in diagnostic lifecycle transitions and the newly expanded state machine interactions.
- Test deletions are included in this commit and should be intentionally reviewed as part of QA strategy.
