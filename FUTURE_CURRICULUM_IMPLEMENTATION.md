# FUTURE_CURRICULUM_IMPLEMENTATION.md

**Suggested filename for this file:** `FUTURE_CURRICULUM_IMPLEMENTATION.md`

---

## 0. What this document is

> **This is a future-work reminder/spec. It describes what needs to be built once complete lesson plans and student modules are ready. It is NOT the implementation itself — it is the blueprint another AI should read to generate the real code.**

The Space must remain bootable without curriculum data. All ingestion is additive, not gating.

---

## 1. Current state (baseline)

| Layer | What exists today |
|---|---|
| Frontend curriculum | Hardcoded TypeScript in `src/data/curriculumModules.ts` (30 module blueprints, 3 DepEd SHS subjects), `src/data/curriculumTemplates.ts` (official competency listings), `src/data/curriculumValidation.ts`, `src/types/models.ts` (type contracts). |
| Backend curriculum | Optional RAG pipeline: `backend/rag/curriculum_rag.py` queries a ChromaDB vectorstore; `backend/rag/vectorstore_loader.py` singleton- loads ChromaDB + SentenceTransformer embedder (`BAAI/bge-small-en-v1.5`). |
| Ingestion | `scripts/ingest_curriculum.py` (duplicated in `backend/scripts/`) — PDF-to-vectorstore pipeline using `pdfplumber` → `RecursiveCharacterTextSplitter` → metadata heuristics → ChromaDB. Triggered optionally in `backend/startup.sh`. |
| Data storage | Firestore (primary, NoSQL), ChromaDB (vector), in-memory caches. **No relational DB, no ORM models.** |
| Startup | `backend/startup_validation.py` runs 5-phase validation (files, imports, env, config, inference client). Ingestion is skipped if no PDFs found — app boots normally. |
| Content sources | PDFs downloaded at runtime from HuggingFace repo (`CURRICULUM_SOURCE_REPO_ID`) or placed manually in `datasets/curriculum/`. Currently empty (only `.gitkeep`). |
| Deployment | Docker multi-stage build → HuggingFace Spaces. **Content changes currently require a rebuild or HF repo update.** |

---

## 2. Desired future state

### 2.1. What "ready" means

You have the following artifacts in hand:

- **Complete lesson plans** — per-module structured lesson content (text, exercises, examples, assessments) covering all quarters for every subject in the program.
- **Student modules** — learner-facing content packages aligned to the lesson plans, with progression sequencing, difficulty tiers, and prerequisites.
- **Competency mappings** — each piece of content mapped to a specific DepEd competency code (e.g. `M11GM-Ia-1`).

### 2.2. Full ingestion pipeline

A single, canonical ingestion pipeline that replaces (or supersedes) the current PDF-only `ingest_curriculum.py`. The pipeline must:

1. Accept   **structured inputs**   — JSON, YAML, Markdown, or a well-defined directory layout (not just raw PDFs). The format is designed to be machine-readable and self-describing.
2. Process   **all subject areas**   in one run (general_math, business_math, stat_prob, finite_math_1, finite_math_2, etc.).
3. Produce:
   - A **vectorstore** (ChromaDB) for RAG (continue using `BAAI/bge-small-en-v1.5`).
   - **Firestore documents** in the `curriculumContent` collection (one doc per lesson/module/competency unit) for direct client queries.
   - A **content manifest** (`ingest_manifest.json`) recording version, content hash, timestamp, counts, and validation results.
4. Be **idempotent** — re-running with the same inputs produces the same outputs; incremental updates are a stretch goal.

### 2.3. Runtime storage layout

```
/data/                          # This is the container's persistent volume mount
└── curriculum/                 # Root for all curriculum data
    ├── sources/                # Raw input artifacts (lesson plans, modules, etc.)
    │   ├── lesson-plans/
    │   │   ├── gen-math/
    │   │   │   ├── q1/
    │   │   │   ├── q2/
    │   │   │   ├── q3/
    │   │   │   └── q4/
    │   │   └── ...
    │   └── student-modules/
    │       ├── finite-math-1/
    │       └── ...
    ├── vectorstore/            # ChromaDB persisted files (current default path)
    │   ├── chroma.sqlite3
    │   └── <uuid>/
    ├── ingest_manifest.json    # Version + hash + counts + validation report
    ├── ingest_audit.log        # Structured ingestion log
    └──locked.tag file        # Sent inal during active ingest to block concurrent runs
```

The existing `datasets/vectorstore/` path mapped via `CURRICULUM_VECTORSTORE_DIR` should continue working; the /data path is the canonical mount target.

### 2.4. Validation and logging

**Ingestion-time validation (blocking):**
- Schema conformance (every lesson/module matches the data schema — see §3.2).
- Competency coverage — all expected competency codes for each subject are present.
- Cross-referencing — lesson plans reference valid module IDs; modules reference valid competency codes.
- No duplicate IDs, no orphaned references.
- Content minimums enforced (text length > 240 chars per lesson, exercises present where expected).
- Failed validation **prevents** the Firestore write and logs a clear rejection reason.

**Logging (non-blocking):**
- Structured JSON logs written to `ingest_audit.log` (one JSON object per line).
- Each entry has: timestamp, level, event_type (validation_pass, chunk_stored, firestore_write, error), details dict.
- Summary written to stdout at the end: total docs, chunks, embeddings, errors, wall time.
- Firestore write failures logged individually per doc but don't abort the entire run.

### 2.5. App integration — how lessons/modules are queried and used

| Component | Current source | Post-ingestion source |
|---|---|---|
| `ModulesPage.tsx` | `CURRICULUM_MODULE_BLUEPRINTS` (hardcoded) | Firestore `curriculumContent` + local manifest cache |
| AI Chat (quiz gen) | RAG via ChromaDB | RAG via ChromaDB (same) |
| AI Chat (lesson gen) | RAG via ChromaDB | RAG via ChromaDB (same) |
| DiagnosticAssessmentModal | Hardcoded `diagnosticPolicies.ts` | Firestore policy documents + hardcoded fallback |
| LearningPath recommendations | `src/data/curriculumModules.ts` mappings | Firestore query by competency group |
| Admin dashboard | None | New admin page to view ingestion status, trigger re-ingestion, browse indexed content |

**Key rules:**
1. The frontend **must** degrade to hardcoded fallbacks if Firestore `curriculumContent` is empty.
2. The RAG pipeline must work whether ChromaDB has chunks or not (graceful empty-result handling already exists).
3. The backend should expose an endpoint `GET /api/curriculum/status` returning the `ingest_manifest.json` contents so the admin UI and startup validation can verify what's loaded.
4. Never   require a Docker rebuild for content changes — the Docker image is frozen; all content lives on the volume mount and is loaded at container start.

### 2.6. Runtime-driven content updates

- **No Docker rebuild for any content change.** The image is immutable.
- Workflow for updating content:
  1. Place new/updated source files in `/data/curriculum/sources/` (on the volume mount, via cloud storage sync, rsync, or a CI/CD upload to the HF space persistent storage).
  2. Trigger re-ingestion via `POST /api/curriculum/reingest` (admin-only, authenticated).
  3. The ingestion pipeline locks, clears the previous vectorstore collection and Firestore `curriculumContent` documents, ingests fresh data, writes the new manifest, and unlocks.
  4. The frontend polls `GET /api/curriculum/status` to show ingestion progress.
  5. Alternatively,40 container restart triggers automatic re-ingestion if the manifest hash doesn't match the source hash.

---

## 3. Concrete implementation checklist

### 3.1. Data schema definition

- [ ] Define a JSON Schema (or Pydantic model in Python + Zod schema in TypeScript) for:
  - `CurriculumLessonPlan` — subject, quarter, module_id, lesson_id, competency_codes[], title, learning_objectives[], content (text + exercises[]), difficulty_tier, prerequisites[]
  - `CurriculumStudentModule` — subject, quarter, module_id, lesson_ids[], title, description, grade_level, content_domain, real_world_theme, competency_codes[]
  - `IngestManifest` — version, source_hash, timestamp, counts_per_subject, counts_per_quarter, validation_errors[], ingest_duration_seconds
- [ ] Place the Pydantic models in `backend/models/curriculum.py`.
- [ ] Place the TypeScript types in `src/types/curriculum.ts` (extend existing file).

### 3.2. Canonical ingestion script

- [ ] Delete `scripts/ingest_curriculum.py` and `backend/scripts/ingest_curriculum.py` (or keep as historical reference but mark deprecated).
- [ ] Create `backend/curriculum/ingest.py` as the single source of truth.
- [ ] Implement:
  - [ ] `load_sources(path)` — walks `/data/curriculum/sources/`, loads all JSON/YAML/MD files.
  - [ ] `validate_against_schema(loaded_data)` — schema + cross-reference + coverage checks.
  - [ ] `chunk_for_vectorstore(lessons)` — text splitting (2000 char chunks, 200 overlap, same as current), metadata extracted from structured fields (no more keyword heuristics).
  - [ ] `embed_and_store(chunks)` — SentenceTransformer → ChromaDB, collection `curriculum_chunks` (replaces existing).
  - [ ] `push_to_firestore(lessons, modules)` — batch writes to `curriculumContent/{docId}`.
  - [ ] `write_manifest(summary)` — outputs `ingest_manifest.json`.
  - [ ] `acquire_lock() / release_lock()` — file-based lock via `/data/curriculum/.lock`.
- [ ] Add a CLI entry point: `python -m backend.curriculum.ingest [--force] [--source-dir PATH]` that works inside and outside Docker.

### 3.3. Startup integration

- [ ] In `backend/startup.sh` (or a Python startup hook in `main.py`'s `app_lifespan`):
  - [ ] Check if `/data/curriculum/ingest_manifest.json` exists and its hash matches the source directory hash.
  - [ ] If mismatch or missing manifest → run `ingest.py` synchronously BEFORE the server starts accepting traffic.
  - [ ] If manifest matches → skip ingestion, log "curriculum up to date".
  - [ ] If sources directory is empty → skip entirely (maintain current graceful-skip behavior).

### 3.4. API endpoints

- [ ] `GET /api/curriculum/status` — returns `ingest_manifest.json` + current lock status + last ingest duration.
- [ ] `POST /api/curriculum/reingest` — admin-only, triggers async ingestion, returns a `task_id`.
- [ ] `GET /api/curriculum/reingest/{task_id}` — returns progress (queued / running / done / failed) with error details if failed.
- [ ]`GET /api/curriculum/lesson/{lesson_id}` — returns a single lesson from Firestore.
- [ ] `GET /api/curriculum/module/{module_id}` — returns a single module with its lesson list from Firestore.

### 3.5. Firestore data model

```
curriculumContent/
  {subject}_module_{module_id}/
    - subject: string
    - module_id: string
    - title: string
    - description: string
    - grade_level: string
    - quarter: "Q1"|"Q2"|"Q3"|"Q4"
    - competency_codes: string[]
    - lesson_ids: string[]
    - content_domain: string
    - real_world_theme: string
    - version_set_id: string
    - ingested_at: timestamp

  {subject}_lesson_{lesson_id}/
    - subject: string
    - module_id: string
    - lesson_id: string
    - title: string
    - learning_objectives: string[]
    - competency_codes: string[]
    - content_text: string (long)
    - exercises: [] (array of {question, answer, difficulty})
    - difficulty_tier: number
    - prerequisites: string[]
    - ingested_at: timestamp
```

### 3.6. Frontend integration points

- [ ] Create `src/services/curriculumService.ts` — functions to:
  - [ ] `fetchCurriculumStatus()` → manifest data from API
  - [ ] `fetchModule(moduleId)` → from Firestore
  - [ ] `fetchLesson(lessonId)` → from Firestore
  - [ ] `fetchModulesForSubject(subject, quarter)` → Firestore query
  - [ ] `getCurriculumModulesForLearner(grade, subjects)` → Firestore-based but falls back to hardcoded `CURRICULUM_MODULE_BLUEPRINTS`
- [ ] Update `ModulesPage.tsx` to use `curriculumService.ts` preferentially, falling back to hardcoded data.
- [ ] Update `ModuleDetailView.tsx` and `LessonViewer.tsx` to pull content from Firestore when available.
- [ ] Add an **Admin page** (`src/components/admin/CurriculumAdmin.tsx`) showing:
  - Manifest status.
  - Re-ingestion trigger button.
  - Progress indicator during active ingestion.
  - Browseable indexed content.
- [ ]lever existing `CurriculumSourceBadge.tsx` — enhance it to show whether content came from Firestore or hardcoded fallback.

### 3.7. Content update workflow

- [ ] Ensure Docker image is content-free (current Dockerfile already separates build from runtime; verify no JSON/curriculum data is baked into the image).
- **Update flow:**
  - [ ] CI/CD places new source files on the HF Space persistent storage under `/data/curriculum/sources/`.
  - [ ] Admin triggers re-ingestion via the admin UI or API.
  - [ ] Or   the next container restart auto-detects the source change and re-ingests.

### 3.8. Validation and coverage checks

- [ ] Use existing `src/data/curriculumTemplates.ts` as the competency coverage checklist — every competency code in `G11_GENERAL_MATH_DESCRIPTOR` and `G12_MATH_ELECTIVE_TEMPLATES` must be covered by at least one lesson.
- [ ] Reject ingestion if coverage < 100%. (Make the threshold configurable via env var `CURRICULUM_MIN_COVERAGE` defaulting to `1.0`.)
- [ ]Validate quarter-hour allocations against template values.

---

## 4. How to use this doc later

> **If you are an AI or a developer reading this file to implement the curriculum pipeline, follow these steps:**

1. **Read this entire document.**
2. Locate the existing codebase:
   - `backend/rag/curriculum_rag.py` — RAG query logic.
   - `backend/rag/vectorstore_loader.py` — ChromaDB singleton.
   - `src/data/curriculumModules.ts` — hardcoded module blueprints (keep as fallback).
   - `src/data/curriculumTemplates.ts` — competency code master list.
   - `src/types/curriculum.ts` and `src/types/models.ts` — type contracts.
   - `backend/startup.sh` — container entrypoint.
   - `backend/main.py` — FastAPI app with startup hooks.
   - `src/components/ModulesPage.tsx`, `ModuleDetailView.tsx`, `LessonViewer.tsx` — frontend integration points.
3. Work through the checklist in §3 **in order**:
   - Schema definitions first (both Python Pydantic + TypeScript Zod).
   - Ingestion script second (`backend/curriculum/ingest.py`).
   - Startup hooks third.
   - API endpoints fourth.
   - Frontend services and UI updates fifth.
4. **Never break the boot-without-curriculum invariant** — every change must be gated with a check: "is curriculum data present?" If no, fall back to current behavior.
5. **Never require a Docker rebuild for content changes.**
6. Run existing tests (`pytest` in backend, `vitest` in frontend) after each step. Add new tests for the ingestion pipeline.
7. If you encounter ambiguity about the input format (lesson plans/modules), assume JSON with the schemas defined in §3.1 and ask for clarification if the actual data doesn't match.

---

## 5. Environment variables reference

| Variable | Default | Purpose |
|---|---|---|
| `CURRICULUM_SOURCE_DIR` | `/data/curriculum/sources` | Root of source content files |
| `CURRICULUM_VECTORSTORE_DIR` | `datasets/vectorstore` | ChromaDB persisted data directory |
| `CURRICULUM_MIN_COVERAGE` | `1.0` | Minimum competency coverage fraction (0.0–1.0) |
| `CURRICULUM_AUTO_INGEST` | `true` | Auto-reingest on startup if source hash changed |
| `CURRICULUM_STRICT_STARTUP` | `false` | If true, fail startup when curriculum missing; if false, boot without |