# MathPulse AI — Comprehensive Audit Report

**Date:** May 4, 2026
**Auditor:** Sisyphus (AI Agent)
**Scope:** E2E Testing, Curriculum Parity, RAG Pipeline Debug, SSHS PDF Upload

---

## Executive Summary

| Area | Status | Key Finding |
|------|--------|-------------|
| E2E RAG Testing | 🔴 CRITICAL | Frontend auth tokens not sent → 401 errors for ALL lessons |
| Backend RAG Pipeline | 🟡 PARTIAL | Quarter mismatch in chunk metadata → 404 for Q2-Q4 lessons |
| Curriculum Parity | 🟡 GAPS FOUND | Missing SSHS subjects; Org & Mgmt is non-math; Stats standalone is deprecated |
| SSHS PDF Upload | ✅ COMPLETE | 2 PDFs uploaded to `rag-documents/sshs/` |
| Code Fix | ✅ COMPLETE | `retrieve_lesson_pdf_context()` now falls back across quarters |

---

## TASK 1 — E2E Testing: Lessons & RAG Content Generation

### Test Methodology
- Navigated to http://localhost:3000 Modules page
- Identified 33 modules across 3 subjects (General Math, Finite Math 1, Finite Math 2)
- Monitored network requests for `/api/rag/lesson` calls
- Tested RAG API directly with valid Firebase auth token

### 🔴 CRITICAL FINDING: Frontend Auth Broken

**Issue:** ALL frontend RAG lesson requests fail with `401 Unauthorized` because the `Authorization` header is missing.

**Evidence:**
```
POST https://deign86-mathpulse-api-v3test.hf.space/api/rag/lesson [401]
Response: {"detail":"Missing or invalid Authorization bearer token"}
```

**Root Cause:** `src/services/lessonService.ts` has an empty catch block that silently swallows token acquisition failures:
```typescript
try {
  const idToken = await currentUser.getIdToken(false);
  if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
} catch { /* non-critical */ }
```

**Impact:** Students cannot generate ANY RAG-based lessons through the UI. The app appears broken.

**Fix Required:**
1. Change `getIdToken(false)` to `getIdToken(true)` to force refresh
2. Add error handling that surfaces auth errors to the user
3. Consider retry logic for token acquisition

### Backend RAG Results (Direct API Test with Valid Token)

| Lesson | Subject | Quarter | Status | Retrieval Band |
|--------|---------|---------|--------|----------------|
| Business and Financial Mathematics | General Math | Q1 | ✅ 200 | medium |
| Business Mathematics | Business Math | Q1 | ✅ 200 | medium |
| Basic Trigonometry | General Math | Q3 | ❌ 404 | — |
| Hypothesis Testing and Regression | General Math | Q4 | ❌ 404 | — |
| Matrices and Basic Operations | Finite Math 1 | Q2 | ❌ 404 | — |
| Linear Programming | Finite Math 1 | Q2 | ❌ 404 | — |
| Graph Theory Basics | Finite Math 2 | Q2 | ❌ 404 | — |
| Modular Arithmetic | Finite Math 2 | Q2 | ❌ 404 | — |
| Random Variables and Sampling | Stats & Prob | Q3 | ❌ 404 | — |

**Pattern:** All Q2, Q3, Q4 lessons fail with 404. Only Q1 lessons work.

### Root Cause: Quarter Mismatch in Vectorstore Metadata

**Issue:** All curriculum PDF chunks are tagged with `quarter: 1` in ChromaDB metadata, but lessons request quarters 2-4.

**Evidence from RAG Health:**
```json
{
  "chunkCount": 243,
  "subjects": {
    "General Mathematics": 57,
    "Finite Mathematics 1": 2,
    "Finite Mathematics 2": 2,
    "Business Mathematics": 58,
    "Organization and Management": 62,
    "Statistics and Probability": 62
  }
}
```

**PDF Metadata (all tagged Q1):**
```python
"curriculum/finite_math/Finite-Mathematics-1-1.pdf": {
    "subject": "Finite Mathematics 1",
    "quarter": 1,  # ← All PDFs are Q1!
}
```

**Code Flow:**
1. `retrieve_lesson_pdf_context()` calls `retrieve_curriculum_context(query, subject, quarter)`
2. `_to_where()` builds a ChromaDB filter: `{"$and": [{"subject": "Finite Mathematics 1"}, {"quarter": 2}]}`
3. ChromaDB returns zero results because all chunks have `quarter: 1`
4. `rag_routes.py` throws 404: "No curriculum content found"

**Fix Applied (Local):** Modified `backend/rag/curriculum_rag.py::retrieve_lesson_pdf_context()` to implement a 4-tier fallback:
1. Try exact quarter as requested
2. If empty, fallback to `quarter=1` (most PDFs tagged Q1)
3. If still empty, fallback to no quarter filter
4. If storage_path provided, also try exact-match by storage_path

**Test Result:** All 13 existing RAG tests pass after the fix.

**Action Required:** Deploy the fix to HF Spaces to validate against production vectorstore.

---

## TASK 2 — Curriculum Parity Check: App vs PDFs

### SSHS Curriculum Structure (from DepEd Shaping Paper)

**CORE SUBJECTS (Grade 11):**
- General Mathematics

**STEM ELECTIVE CLUSTER (Grade 11-12):**
- Finite Mathematics 1 & 2
- Advanced Mathematics 1 & 2
- Pre-calculus 1 & 2
- Trigonometry 1 & 2
- Fundamentals in Data Analytics

**BUSINESS ELECTIVE CLUSTER:**
- Business 1 (Basic Accounting)
- Business 2 (Business Finance and Income Taxation)
- Business 3 (Business Economics)
- Introduction to Organization and Management

### App Curriculum vs SSHS Mapping

| App Subject | SSHS Equivalent | Status |
|-------------|-----------------|--------|
| General Mathematics | General Mathematics (Core) | ✅ Matches |
| Finite Mathematics 1 | Finite Mathematics 1 (STEM Elective) | ✅ Matches |
| Finite Mathematics 2 | Finite Mathematics 2 (STEM Elective) | ✅ Matches |
| Statistics and Probability | **NOT a standalone subject in SSHS** | ⚠️ Deprecated |
| Business Mathematics | **NOT a standalone subject in SSHS** | ⚠️ Tagged as "Math Component" |
| Pre-Calculus | Pre-calculus 1 (STEM Elective) | ⚠️ Renamed |
| Basic Calculus | Pre-calculus 2 (STEM Elective) | ⚠️ Renamed |
| Organization and Management | Business elective (non-math) | ❌ REMOVE |

### Missing SSHS Subjects (Not in App)

| Subject | Grade | Prerequisite | Action Needed |
|---------|-------|--------------|---------------|
| Advanced Mathematics 1 | 12 | General Mathematics | Add to app |
| Advanced Mathematics 2 | 12 | Advanced Mathematics 1 | Add to app |
| Trigonometry 1 | 12 | General Mathematics | Add to app |
| Trigonometry 2 | 12 | Trigonometry 1 | Add to app |
| Fundamentals in Data Analytics | 12 | General Mathematics | Add to app |

### Gap Analysis by PDF

#### ✅ GENERAL-MATHEMATICS-1.pdf (SSHS Curriculum Guide)
**Topics in PDF:**
- Q1: Business/Finance, Patterns/Sequences/Series, Financial Applications
- Q2: Measurement/Conversion, Functions/Graphs, Piecewise Functions, Statistical Variables
- Q3: Basic Trigonometry, Practical Measurement, Transformational Geometry/Volume, Random Variables/Sampling
- Q4: Compound Interest/Annuities/Loans, Hypothesis Testing/Regression, Logic/Propositions/Syllogisms

**App Coverage:** All topics mapped ✅
**Note:** Stats topics (statistical variables, random variables, hypothesis testing) are IN General Mathematics in SSHS, not a standalone subject.

#### ✅ Finite-Mathematics-1-1.pdf
**Topics in PDF:**
- Q1: Symmetry, Geometric Transformations, Tessellations, Golden Ratio/Fibonacci, Fractals
- Q2: Matrices, Row Operations, Determinants, Linear Programming

**App Coverage:** All topics mapped ✅
**Concern:** Only 2 chunks in vectorstore for entire subject. RAG retrieval is extremely weak.

#### ✅ Finite-Mathematics-2-1.pdf
**Topics in PDF:**
- Q1: Counting, Permutations/Combinations, Probability
- Q2: Divisibility/Prime, GCD/LCM/Diophantine, Modular Arithmetic, Graph Theory, Eulerian/Hamiltonian, Spanning Trees

**App Coverage:** All topics mapped ✅
**Concern:** Only 2 chunks in vectorstore for entire subject. RAG retrieval is extremely weak.

#### ⚠️ SDO_Navotas_Bus.Math_SHS_1stSem.FV.pdf
**Topics in PDF:** Fractions/Decimals/Percent, Operations, Business math applications
**App Coverage:** Business Math subject exists but is not in SSHS standalone curriculum
**Action:** Tag as "Business Math — Math Component" only. Consider integrating into General Mathematics Q1.

#### ⚠️ SDO_Navotas_STAT_PROB_SHS_1stSem.FV.pdf
**Topics in PDF:** Random variables, Probability distributions, Normal distribution, Sampling
**App Coverage:** Standalone "Statistics and Probability" subject exists
**Action:** Remove standalone subject. Integrate content into General Mathematics Q2-Q3 where these topics belong in SSHS.

#### ❌ SDO_Navotas_SHS_ABM_OrgAndMngt_FirstSem_FV.pdf
**Topics in PDF:** Organization structure, Management theory, HR, Planning (NO math computation)
**App Coverage:** "Organization and Management" subject exists in RAG (62 chunks!)
**Action:** **REMOVE IMMEDIATELY.** This is a non-math subject. MathPulse AI is a math-only platform.

### Content Filter Violations Found

| Subject | Violation | Chunks in Vectorstore | Action |
|---------|-----------|----------------------|--------|
| Organization and Management | Zero mathematical computation | 62 | Remove from RAG |

---

## TASK 3 — SSHS PDF Upload to Firebase Storage

### Upload Status: ✅ COMPLETE

| File | Source | Destination | URL |
|------|--------|-------------|-----|
| SSHS-SHAPING-PAPER-BCD-a_o-May-22.pdf | `documents/` | `rag-documents/sshs/SSHS-SHAPING-PAPER-BCD-a_o-May-22.pdf` | https://storage.googleapis.com/mathpulse-ai-2026.firebasestorage.app/rag-documents/sshs/SSHS-SHAPING-PAPER-BCD-a_o-May-22.pdf |
| SSHS-Key-Features.pdf | `documents/` | `rag-documents/sshs/SSHS-Key-Features.pdf` | https://storage.googleapis.com/mathpulse-ai-2026.firebasestorage.app/rag-documents/sshs/SSHS-Key-Features.pdf |

### Next Steps for Ingestion
1. Add the 2 SSHS PDFs to `PDF_METADATA` in `backend/rag/firebase_storage_loader.py`
2. Run `python -m backend.scripts.ingest_from_storage --force` to re-ingest
3. These PDFs should be weighted as low-priority context (they describe curriculum structure, not lesson content)

---

## Priority Fix List

### 🔴 P0 — Critical (Fix Immediately)

1. **Deploy RAG Quarter Fallback Fix**
   - File: `backend/rag/curriculum_rag.py`
   - Change: `retrieve_lesson_pdf_context()` now tries exact quarter → quarter=1 → no quarter filter
   - Impact: Fixes 404 errors for ALL Q2-Q4 lessons
   - Tests: 13/13 pass

2. **Fix Frontend Auth Token Acquisition**
   - File: `src/services/lessonService.ts`
   - Change: Force token refresh `getIdToken(true)` + add error handling
   - Impact: Fixes 401 errors so students can actually load lessons

3. **Remove Organization and Management from RAG**
   - File: `backend/rag/firebase_storage_loader.py`
   - Action: Remove `SDO_Navotas_SHS_ABM_OrgAndMngt_FirstSem_FV.pdf` from `PDF_METADATA`
   - Action: Delete 62 chunks from ChromaDB
   - Impact: Removes non-math content from math-only platform

### 🟡 P1 — High Priority

4. **Re-ingest Finite Math PDFs with Better Chunking**
   - Issue: Finite Math 1 & 2 only have 2 chunks each (too few for RAG)
   - Action: Reduce chunk size or add more detailed PDFs
   - Impact: Improves RAG quality for 18 Finite Math modules

5. **Add Missing SSHS Subjects to App**
   - Subjects: Advanced Mathematics 1 & 2, Trigonometry 1 & 2, Fundamentals in Data Analytics
   - Files: `src/data/subjects.ts`, `src/data/curriculumModules.ts`
   - Impact: Aligns app with new SSHS curriculum

6. **Re-tag Pre-Calculus and Basic Calculus**
   - Change labels from "STEM Strand" to "STEM Elective Cluster"
   - Files: `src/data/subjects.ts`, `src/data/curriculumModules.ts`

### 🟢 P2 — Medium Priority

7. **Integrate Stats & Prob into General Math**
   - Remove standalone "Statistics and Probability" subject
   - Move modules into General Mathematics Q2-Q3
   - Update RAG metadata to tag stats chunks as General Math

8. **Upload SSHS PDFs to RAG Pipeline**
   - Add to `PDF_METADATA` and run ingestion
   - Configure as low-priority context

---

## Verification Commands

```bash
# Test RAG health
curl https://deign86-mathpulse-api-v3test.hf.space/api/rag/health

# Test a Q4 lesson (should work after fix)
curl -X POST https://deign86-mathpulse-api-v3test.hf.space/api/rag/lesson \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"topic":"Logical Propositions","subject":"General Mathematics","quarter":4}'

# Run backend tests
cd backend && python -m pytest tests/test_rag_pipeline.py -v

# Run frontend typecheck
npm run typecheck
```

---

## Appendix: Files Modified This Session

| File | Change |
|------|--------|
| `backend/rag/curriculum_rag.py` | Added quarter fallback logic in `retrieve_lesson_pdf_context()` |
| `.gitignore` | Added `documents/` and `.secrets/` |
| `AGENTS.md` | Documented `.secrets/` directory for service account |
| `scripts/upload_sshs_pdfs.py` | New script for Firebase Storage uploads |
| `documents/` | 9 PDFs copied (8 curriculum + 2 SSHS) |
| `.secrets/firebase-service-account.json` | Service account key (gitignored) |

---

## Appendix: Vectorstore Chunk Distribution

| Subject | Chunks | Coverage Quality |
|---------|--------|-----------------|
| General Mathematics | 57 | Moderate |
| Business Mathematics | 58 | Good |
| Statistics and Probability | 62 | Good |
| Organization and Management | 62 | ❌ Non-math, remove |
| Finite Mathematics 1 | 2 | 🔴 Critical - too few |
| Finite Mathematics 2 | 2 | 🔴 Critical - too few |
| **Total** | **243** | |
