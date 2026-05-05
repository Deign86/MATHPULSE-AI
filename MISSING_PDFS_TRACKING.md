# Missing PDFs Tracking — MathPulse AI

> **Purpose:** Track which subjects/modules need teaching module PDFs for RAG lesson generation.
> **Last Updated:** 2026-05-05

---

## Current PDF Availability

### Active (RAG-Ready)
These subjects have SDO teaching module PDFs uploaded to Firebase Storage and indexed in the ChromaDB vectorstore.

| Subject | PDF Filename | Chunks | Storage Path | Status |
|---------|-------------|--------|--------------|--------|
| General Mathematics | `SDO_Navotas_Gen.Math_SHS_1stSem.FV.pdf` | ~53 | `curriculum/gen_math_sdo/` | Active |
| Business Mathematics | `SDO_Navotas_Bus.Math_SHS_1stSem.FV.pdf` | ~58 | `curriculum/business_math/` | Active |
| Statistics & Probability | `SDO_Navotas_STAT_PROB_SHS_1stSem.FV.pdf` | ~62 | `curriculum/stat_prob/` | Active |
| **Total** | | **173** | | |

### Locked / Unavailable in UI
These subjects are defined in the frontend curriculum but lack teaching module PDFs. They are visually locked in the UI with a "Content Unavailable" overlay.

| Subject | Grade | Semester | Why Locked | Frontend Flag |
|---------|-------|----------|------------|---------------|
| Pre-Calculus | 12 | 1st | No PDF sourced | `pdfAvailable: false` |
| Basic Calculus | 12 | 2nd | No PDF sourced | `pdfAvailable: false` |

### Removed from App
These subjects previously had curriculum guide PDFs (shaping papers) but were removed because they contained only learning objectives and course descriptions — insufficient content for RAG lesson generation (<10 chunks each).

| Subject | Grade | PDF Filename | Reason Removed |
|---------|-------|--------------|----------------|
| Finite Mathematics 1 | 12 | `FINITE-MATHEMATICS-1.pdf` | Curriculum guide, not teaching module |
| Finite Mathematics 2 | 12 | `FINITE-MATHEMATICS-2.pdf` | Curriculum guide, not teaching module |
| Organization & Management | 12 | `ORGANIZATION-AND-MANAGEMENT.pdf` | Curriculum guide, not teaching module |

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
4. **Sufficient length** — at least 50 pages to generate meaningful chunks
5. **Text-searchable** — not scanned images without OCR

**Bad PDFs (curriculum guides):**
- Only list competencies, learning outcomes, and time allotments
- No worked examples or practice problems
- Result in <10 usable chunks in ChromaDB
- Example: `FINITE-MATHEMATICS-1.pdf` (DepEd curriculum guide)

**Good PDFs (SDO teaching modules):**
- Full lesson plans with examples, exercises, and assessments
- 80-120 pages of dense mathematical content
- Result in 50-60+ usable chunks in ChromaDB
- Example: `SDO_Navotas_Gen.Math_SHS_1stSem.FV.pdf`

---

## Sourcing Checklist

### Immediate Priority (Unlocks Existing UI)
- [ ] **Pre-Calculus** — Source SDO teaching module PDF (or DepEd-approved exemplar)
- [ ] **Basic Calculus** — Source SDO teaching module PDF (or DepEd-approved exemplar)

### Medium Priority (Restores Removed Subjects)
- [ ] **Finite Mathematics 1** — Find actual teaching module PDF (not curriculum guide)
- [ ] **Finite Mathematics 2** — Find actual teaching module PDF (not curriculum guide)

### Future Priority (New SSHS Subjects)
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
2. Check page count (>50 pages preferred)
3. Run a quick text search to confirm it's text-searchable
4. Upload to Firebase Storage under `curriculum/{subject_id}/`
5. Add entry to `backend/rag/firebase_storage_loader.py::PDF_METADATA`
6. Run ingestion script to add to ChromaDB
7. Verify chunk count with `/api/rag/health`

---

## Ingestion Workflow (When PDFs Are Ready)

```bash
# 1. Upload PDF to Firebase Storage
cd scripts
python upload_all_pdfs.py

# 2. Update PDF_METADATA in backend/rag/firebase_storage_loader.py
# 3. Add curriculum lessons to src/data/curriculum/types.ts
# 4. Add module blueprints to src/data/curriculumModules.ts

# 5. Run ingestion
cd backend
python scripts/ingest_from_storage.py

# 6. Verify chunks
curl https://deign86-mathpulse-api-v3test.hf.space/api/rag/health

# 7. Update frontend flags
# Set pdfAvailable: true in src/data/subjects.ts
# Set isAvailable: true in module blueprints if needed

# 8. Deploy
python scripts/deploy-hf.py
```

---

## Frontend Flag Reference

When a PDF becomes available, update these files:

### `src/data/subjects.ts`
```typescript
{
  id: 'pre-calc',
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
    "curriculum/pre_calc/SDO_Navotas_PreCalc_SHS_1stSem.FV.pdf": {
        "subject": "Pre-Calculus",
        "subjectId": "pre-calc",
        "type": "sdo_module",
        "content_domain": "pre-calculus",
        "quarter": 1,
        "storage_path": "curriculum/pre_calc/SDO_Navotas_PreCalc_SHS_1stSem.FV.pdf",
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

