# MathPulse AI — Active Context

## Current Session (May 3, 2026)

### What Was Done
- **HF Spaces Vectorstore Load Fix (COMPLETED)** — `/api/rag/health` now reports `chunkCount: 243` with 6 subjects. All root causes resolved:
  1. `startup.sh`: moved var resolution before any echo (set -eu was fatal on unbound VECTORSTORE_DIR)
  2. `download_vectorstore_from_firebase.py`: rewritten as standalone (no backend.rag imports), inline Firebase init
  3. `firebase_storage_loader.py`: `_init_firebase_storage()` now resets `_FIREBASE_INITIALIZED` on bucket() failure
  4. Set `CURRICULUM_VECTORSTORE_DIR=/app/datasets/vectorstore` and `CURRICULUM_DIR=/app/datasets/curriculum` as HF Space variables
  5. Cleared `CURRICULUM_SOURCE_REPO_ID` from HF Space (was causing unnecessary ingestion with 0 records)

### Branch
`main`

### What's Next
1. ~~Verify HF Space `/api/rag/health` shows non-zero chunks~~ ✅ DONE
2. Test `/api/rag/lesson` with auth
3. Test RAG lesson rendering in frontend

## Recent Changes
* [2026-05-03 23:06:48] - ✅ Bug fix COMPLETED: HF Space vectorstore load (chunkCount: 243, 6 subjects). Fixes: (1) startup.sh var order, (2) standalone download script, (3) firebase_storage_loader edge case, (4) HF Space vars for CURRICULUM_VECTORSTORE_DIR/CURRICULUM_DIR, (5) cleared CURRICULUM_SOURCE_REPO_ID. Verified: /api/rag/health returns 243 chunks.
* [2026-05-03 21:49:42] - 🐛 Bug fix: Add startup vectorstore download + env wiring (CURRICULUM_VECTORSTORE_DIR) so HF Space can load ChromaDB from Firebase Storage.
* [2026-05-03 21:35:10] — Deploy fix merged: excluded vectorstore from HF Spaces deploy and added guardrail

## Files Changed (this session)

### MODIFIED (4 files)
- `backend/startup.sh` — Fixed var resolution order, ingestion guard, download script execution
- `backend/scripts/download_vectorstore_from_firebase.py` — Fully standalone rewrite with inline Firebase init
- `backend/rag/firebase_storage_loader.py` — Fixed _FIREBASE_INITIALIZED edge case
- `scripts/set_vectorstore_env.py` — New: sets HF Space variables (temporary, deleted after use)

## HF Space Variable Changes (this session)
- `CURRICULUM_VECTORSTORE_DIR=/app/datasets/vectorstore`
- `CURRICULUM_DIR=/app/datasets/curriculum`
- `CURRICULUM_SOURCE_REPO_ID=` (cleared)