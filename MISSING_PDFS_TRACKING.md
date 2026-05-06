# Missing PDFs Tracking — MathPulse AI

> **Purpose:** Track which subjects/modules need teaching module PDFs for RAG lesson generation.
> **Last Updated:** 2026-05-06

---

## Current PDF Availability

### Active (RAG-Ready)
These subjects have SDO teaching module PDFs uploaded to Firebase Storage and indexed in the ChromaDB vectorstore.

| Subject | PDF Filename | Chunks | Storage Path | Status |
|---------|-------------|--------|--------------|--------|
| General Mathematics (Q1) | `SDO_Navotas_Gen.Math_SHS_1stSem.FV.pdf` | 53 | `curriculum/gen_math_sdo/` | Active |
| General Mathematics (Q2) | `SDO_Navotas_GenMath_SHS_Q2.FV.pdf` | 29 | `curriculum/gen_math_q2/` | Active |
| Business Mathematics | `SDO_Navotas_Bus.Math_SHS_1stSem.FV.pdf` | 58 | `curriculum/business_math/` | Active |
| Statistics & Probability | `SDO_Navotas_STAT_PROB_SHS_1stSem.FV.pdf` | 62 | `curriculum/stat_prob/` | Active |
| Basic Calculus (Q3) | `SDO_Navotas_BasicCalc_SHS_Q3.FV.pdf` | 73 | `curriculum/basic_calc/` | Active |
| **Total** | | **275** | | |

### Locked / Unavailable in UI
These subjects are defined in the frontend curriculum but lack teaching module PDFs. They are visually locked in the UI with a "Content Unavailable" overlay.

| Subject | Grade | Semester | Why Locked | Frontend Flag |
|---------|-------|----------|------------|---------------|
| Pre-Calculus | 12 | 1st | No PDF sourced | `pdfAvailable: false` |

### Removed from App
These subjects previously had curriculum guide PDFs (shaping papers) but were removed because they contained only learning objectives and course descriptions — insufficient content for RAG lesson generation (<10 chunks each).

| Subject | Grade | PDF Filename | Reason Removed |
|---------|-------|--------------|----------------|
| Finite Mathematics 1 | 12 | `Finite-Mathematics-1-1.pdf` | Curriculum guide, not teaching module |
| Finite Mathematics 2 | 12 | `Finite-Mathematics-2-1.pdf` | Curriculum guide, not teaching module |
| Organization & Management | 12 | `SDO_Navotas_SHS_ABM_OrgAndMngt_FirstSem_FV.pdf` | Removed from app |

### Not Yet in App
These Strengthened SHS subjects are not yet in the app at all. They need both curriculum data entry AND teaching module PDFs.

| Subject | Grade | Semester | Status |
|---------|-------|----------|--------|
| Advanced Mathematics 1 | 12 | TBD | Not sourced |
| Advanced Mathematics 2 | 12 | TBD | Not sourced |
| Trigonometry 1 | 12 | TBD | Not sourced |
| Trigonometry 2 | 12 | TBD | Not sourced |
| Fundamentals in Data Analytics | 12 | TBD | Not sourced |

---

## What Makes a "Good" Teaching Module PDF?

For RAG lesson generation to work well, a PDF must have:

1. **Actual lesson content** — not just learning objectives or competencies
2. **Worked examples** — step-by-step problem solutions
3. **Practice problems** — exercises with solutions
4. **Sufficient length** — at least 30 pages to generate meaningful chunks (merging shorter modules OK)
5. **Text-searchable** — not scanned images without OCR

**Bad PDFs (curriculum guides):**
- Only list competencies, learning outcomes, and time allotments
- No worked examples or practice problems
- Result in <10 usable chunks in ChromaDB
- Example: `Finite-Mathematics-1-1.pdf` (DepEd curriculum guide, 5 pages)

**Good PDFs (SDO teaching modules):**
- Full lesson plans with examples, exercises, and assessments
- 30+ pages of dense mathematical content (or merged from shorter modules)
- Result in 50-60+ usable chunks in ChromaDB
- Example: `SDO_Navotas_BasicCalc_SHS_Q3.FV.pdf` (173 pages from 8 merged modules)

---

## Sourcing Checklist

### Immediate Priority (Unlocks Existing UI)
- [x] **Basic Calculus Q3** — Sourced via DepEd lesson exemplar bundle (8 modules, 173 pages, merged) ✅ 2026-05-06
- [ ] **Pre-Calculus** — Source SDO teaching module PDF (or DepEd-approved exemplar)

### Medium Priority (Restores Removed Subjects)
- [ ] **Finite Mathematics 1** — Find actual teaching module PDF (not curriculum guide)
- [ ] **Finite Mathematics 2** — Find actual teaching module PDF (not curriculum guide)

### Future Priority (New SHS Subjects)
- [ ] **Advanced Mathematics 1** — Source teaching module PDF
- [ ] **Advanced Mathematics 2** — Source teaching module PDF
- [ ] **Trigonometry 1** — Source teaching module PDF
- [ ] **Trigonometry 2** — Source teaching module PDF
- [ ] **Fundamentals in Data Analytics** — Source teaching module PDF

---

## Where to Source PDFs

### Primary Sources
1. **DepEd Learning Resource Portal** (lrmds.deped.gov.ph)
2. **Regional SDO websites** — Many divisions upload teaching modules
3. **SHS teachers' groups** — Facebook groups, Google Drive shares
4. **School Learning Action Cells (LAC)** — Internal teacher-developed materials

### What to Ask For
When requesting materials from teachers or SDOs, ask specifically for:
> "Teaching module or lesson exemplar with worked examples and practice problems — NOT the curriculum guide."

### Quality Check Before Upload
Before adding a new PDF to the system:
1. Open the PDF and verify it has worked examples
2. Check page count (30+ pages preferred; shorter modules can be merged)
3. Run a quick text search to confirm it's text-searchable
4. Upload to Firebase Storage under `curriculum/{subject_id}/`
5. Add entry to `backend/rag/firebase_storage_loader.py::PDF_METADATA`
6. Run ingestion script to add to ChromaDB
7. Verify chunk count with `/api/rag/health`

---

## Ingestion Workflow (When PDFs Are Ready)

```bash
# 1. Upload PDF to Firebase Storage
cd backend/scripts
python upload_lesson_modules.py

# 2. Update PDF_METADATA in backend/rag/firebase_storage_loader.py
# 3. Add curriculum lessons to src/data/curriculum/types.ts
# 4. Add module blueprints to src/data/curriculumModules.ts

# 5. Run ingestion
cd backend
python -m backend.scripts.ingest_from_storage --force

# 6. Verify chunks
curl https://deign86-mathpulse-api-v3test.hf.space/api/rag/health

# 7. Update frontend flags
# Set pdfAvailable: true in src/data/subjects.ts
# Set isAvailable: true in module blueprints if needed

# 8. Deploy
python scripts/deploy-hf.py
```

---

## Admin Upload Feature

The admin panel now has a **Module PDFs** tab (in the Content section) with:
- **PDF Upload Card** — drag-and-drop or file picker, subject/semester/quarter selector, upload + auto-ingest
- **RAG Index Status Table** — shows chunk counts per subject, status badges, re-ingest buttons

Backend endpoints:
- `POST /api/admin/upload-pdf` — multipart/form-data upload → Firebase Storage + RAG ingestion
- `POST /api/admin/reingest-pdf` — force reindex an existing subject
- `GET /api/rag/health` — check chunk counts and status

---

## Frontend Flag Reference

When a PDF becomes available, update these files:

### `src/data/subjects.ts`
```typescript
{
  id: 'basic-calc',
  // ...
  pdfAvailable: true, // <-- CHANGE THIS
}
```

### `src/data/curriculumModules.ts` (if adding new blueprints)
```typescript
export const CURRICULUM_MODULE_BLUEPRINTS: CurriculumModuleBlueprint[] = [
  // Add new module blueprints here
];
```

### `backend/rag/firebase_storage_loader.py`
```python
PDF_METADATA: Dict[str, dict] = {
    "curriculum/basic_calc/SDO_Navotas_BasicCalc_SHS_Q3.FV.pdf": {
        "subject": "Basic Calculus",
        "subjectId": "basic-calc",
        "type": "sdo_module",
        "content_domain": "calculus",
        "quarter": 3,
        "storage_path": "curriculum/basic_calc/SDO_Navotas_BasicCalc_SHS_Q3.FV.pdf",
    },
    # ...
}
```

---

## Notes

- The `.gitignore` excludes `documents/` and `.secrets/` directories for local PDF storage
- Firebase Storage bucket: `mathpulse-ai-2026.firebasestorage.app`
- Vectorstore auto-downloads from Firebase Storage on HF Space startup
- Each new subject typically adds 50-60 chunks to the vectorstore
- Shorter module PDFs (<30 pages) can be merged into a single bundle before upload
- Local merged PDFs are stored in `datasets/lesson_modules/merged/` before upload