# backend/rag/

## Responsibility
Curriculum document parsing, ingestion, vector-store access, and retrieval of source-grounded lesson context.

## Design
- `curriculum_rag.py` normalizes filters, builds Chroma queries, scores/organizes chunks, and formats lesson/problem prompts.
- `vectorstore_loader.get_vectorstore_components` lazily initializes the Chroma collection and sentence-transformer embedder; health/reset helpers support diagnostics/tests.
- `pdf_ingestion.ingest_pdf` extracts and chunks source PDFs, generates question/embedding data, and records processing state.
- `liteparse_utils`, `pdf_parser`, and `docx_parser` isolate document parsing; `firebase_storage_loader` locates curriculum objects in Firebase Storage.
- `teacher_module_generator.generate_teacher_module` builds structured teacher modules from retrieved material.

## Flow
- `/api/rag/...` (`rag_routes` / `deepseek_rag_routes`) → `retrieve_curriculum_context` or lesson retrieval helpers → `get_vectorstore_components` → Chroma `curriculum_chunks` → formatted context → inference/DeepSeek response.
- `/api/curriculum/generate-module` → `fun_modules_routes.generate_module` → curriculum retrieval + `generate_teacher_module` → structured module response.
- Admin PDF reingestion → `admin_routes` ingestion orchestration → Firebase Storage/document parsing → `pdf_ingestion.ingest_pdf` → chunk/question and vector persistence.
- Exact lesson retrieval uses `retrieve_lesson_pdf_context` / `build_exact_lesson_query`; generic retrieval uses `retrieve_curriculum_context` and metadata filters.

## Integration
- Route consumers live under `backend/routes/`; model access is shared through `services.ai_client` / `services.inference_client`.
- Source PDFs can be loaded from Firebase Storage; retrieval uses the local/configured Chroma vector store and `BAAI/bge-small-en-v1.5`-style sentence-transformer embeddings.
- Firestore is used by ingestion for manifests/question metadata where configured; Chroma is the retrieval index, not the API router's persistence layer.
