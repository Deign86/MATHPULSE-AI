# MathPulse AI Implementation Plan and Handoff

Last updated: 2026-03-29
Owner context: Teacher Portal backend + import/risk/curriculum generation rollout
Testing mode: Manual testing only (no test-file creation in this plan)

## 1) Current Status Snapshot

This workspace has broad ongoing changes across frontend, backend, and Cloud Functions.
A first implementation slice for Teacher Import has already been delivered and validated.

Scope completed in this chat:
- Course Materials upload vertical slice (backend API + frontend service + Teacher Dashboard wiring).
- Risk ML upgrade path added via normalized v2 endpoint built on existing enhanced model.

## 2) Done (Implemented)

### A. Course Materials Upload API (Backend)
- Added endpoint: `/api/upload/course-materials` in [backend/main.py](backend/main.py)
- Added route policy access for teachers/admins in [backend/main.py](backend/main.py)
- Added upload config/constants for course-material files:
  - extension and mime allowlists
  - text extraction size cap
- Parsing behavior implemented:
  - `.txt` decode
  - `.docx` parse via `python-docx`
  - `.pdf` text extraction via `pdfplumber`
- Response payload includes:
  - fileName, fileType, charCount, wordCount
  - section previews
  - suggestedTopics
  - preview text

### B. Frontend API Wiring
- Added response type `CourseMaterialUploadResponse` in [src/services/apiService.ts](src/services/apiService.ts)
- Added method `uploadCourseMaterials(file)` in [src/services/apiService.ts](src/services/apiService.ts)

### C. Teacher Dashboard Import UI Wiring
- Course Materials box is now functional in [src/components/TeacherDashboard.tsx](src/components/TeacherDashboard.tsx)
- Added dedicated handlers/state for:
  - class records upload loading
  - course materials upload loading
- Added separate drag/drop + click-to-upload input for Course Materials
- Added success/error result messaging and toast notifications

### D. Validation Completed
- Frontend build succeeded (`npm run build`)
- Python syntax compile succeeded for backend (`python -m py_compile backend/main.py`)
- No file-level editor errors reported in modified files

### E. Risk ML Improvement (Kept and Upgraded)
- Decision taken: keep existing risk ML and improve it (no destructive replacement)
- Added normalized risk output model and adapter in [backend/analytics.py](backend/analytics.py)
- Added API endpoint `/api/predict-risk/v2` in [backend/main.py](backend/main.py)
- Added route authorization for `/api/predict-risk/v2` in [backend/main.py](backend/main.py)
- v2 output contract now includes:
  - `risk_level` in `low | medium | high`
  - `risk_score` in `[0,1]` derived from class probabilities
  - `top_factors` in plain teacher language
  - normalized `probabilities` and `model_used`

## 3) Remaining Work (Next Implementation Targets)

Priority order is based on end-to-end teacher flow value.

### P1. Canonical Data Normalization for Class Records
- Expand class-record mapping beyond current narrow fields
- Normalize into canonical shapes:
  - Student `{ student_id, full_name, section, demographics? }`
  - Record `{ student_id, date?, assessment_type, assessment_name, score, max_score, weight?, attendance_flag? }`
  - Attendance `{ student_id, date, status }`
- Preserve ambiguous columns as `unknown_*` instead of dropping

### P2. Partial Success + Parse Diagnostics
- Return per-file and per-row parse warnings/errors
- Keep successful records even when some rows fail
- Add actionable parse error reasons (missing header, password-protected PDF, invalid table)

### P3. Dedup and Upsert
- Add deterministic dedup key strategy:
  - `student_id + term + assessment_name`
- Upsert instead of duplicate insert when re-importing
- Store import metadata/audit lineage

### P4. Risk Refresh Trigger from Imports
- Trigger risk recomputation after successful import
- Use `/api/predict-risk/v2` as the default contract endpoint for downstream teacher workflows
- Ensure v2 output is wired into import pipelines and class dashboards
- Propagate uncertainty when data is partial

### P5. Course Material Intelligence (Grounded)
- Build robust section/chunk extraction persistence
- Extract topic map with prerequisites/objectives
- Persist source references for provenance

### P6. Generation Endpoints (Grounded and Editable)
- Whole-class lesson generation from imported materials + class patterns
- At-risk micro-lessons and adaptive quizzes
- Return editable content blocks + provenance links
- Keep recommendation-only behavior (no auto-grade assignment)

### P7. Class-Scoped Privacy Hardening
- Enforce class ownership checks on upload/read/generate routes
- Add stronger class-context scoping for all imported artifacts

## 4) Manual Testing Checklist (Continuous)

### Upload and Parse
- Upload valid `.txt`, `.docx`, `.pdf` in Teacher Import view
- Confirm response includes sections, topic suggestions, and preview
- Upload unsupported format and verify explicit error
- Upload malformed/empty file and verify safe failure

### UI Behavior
- Validate independent loading spinners for Class Records and Course Materials
- Validate drag/drop and click upload both work
- Validate upload result text and toasts

### Regression Smoke
- Class Records upload still works
- No auth/role regression for teacher access
- Backend still starts and health endpoints remain unaffected

## 5) Known Risks / Notes

- Current topic suggestion extraction is heuristic and should be improved in later grounding phase.
- Course material endpoint currently returns parsed preview data but does not yet persist full topic graph artifacts.
- Workspace is currently a dirty tree with many unrelated changes in parallel; avoid reverting unrelated files.

## 6) Handoff for Next Chat Session

### A. What to read first
- [plan.md](plan.md)
- [backend/main.py](backend/main.py)
- [src/services/apiService.ts](src/services/apiService.ts)
- [src/components/TeacherDashboard.tsx](src/components/TeacherDashboard.tsx)
- [functions/src/triggers/onStudentProfileUpdated.ts](functions/src/triggers/onStudentProfileUpdated.ts)

### B. Recommended immediate next task
Implement P1 (canonical normalization for class records) in backend, then wire frontend display for per-file parse diagnostics.

### C. Suggested first commands
- `npm run build`
- `c:/Users/Deign/Downloads/MATHPULSE-AI/.venv/Scripts/python.exe -m py_compile backend/main.py`

### D. Success criteria for next session
- Class Records import returns normalized entities and unknown field retention
- Import result includes row/file warnings without failing entire import
- Existing upload UX remains functional for both Class Records and Course Materials

## 7) Decision Log

- Manual-testing-first workflow confirmed by user.
- No new automated test files should be added as part of this plan execution.
