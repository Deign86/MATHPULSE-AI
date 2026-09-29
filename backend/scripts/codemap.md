# backend/scripts/

## Responsibility
Standalone operational scripts for Firestore curriculum/profile maintenance, Firebase Storage and vectorstore transfer, curriculum ingestion, and grade migration.

## Design
- Scripts use direct `if __name__ == "__main__"` entry points rather than a shared CLI framework; Firebase Admin credentials and filesystem locations come from environment/config or script constants.
- Long-form import jobs separate parsing/chunking/metadata construction from persistence; upload/download jobs can use Firebase SDK or `gcloud` fallbacks.
- Main operations: `seed_curriculum`, `register_metadata`, `ingest_curriculum`, `ingest_from_firebase_storage`, `backfill_all_profiles`, `migrate_grade_12_to_grade_11`, vectorstore upload/download, PDF upload/index, and lesson-module merge/upload.

## Flow
1. Resolve local curriculum/vectorstore files and initialize Firebase/Firestore or Chroma as needed.
2. Parse and normalize documents, infer curriculum metadata, chunk text, or enumerate profile/migration records.
3. Persist records to Firestore (`curriculumDocuments`, `curriculumDocs`, `subjects`, `student_profiles`, and migration collections) or Chroma `curriculum_chunks`; upload/download vectorstore and PDFs under Firebase Storage prefixes.
4. Emit progress/logging and exit status from each standalone job.

## Integration
Uses `rag.firebase_storage_loader`, `services.curriculum_service._STATIC_SUBJECTS`, Firebase Admin/Storage, Firestore, ChromaDB, `pypdf`, and optional `gcloud` CLI. `ingest_curriculum.py` reads curriculum sources and writes `datasets/vectorstore/` using `BAAI/bge-small-en-v1.5`; `ingest_from_storage.py` records source metadata in `curriculumDocuments` and indexes `teacher_materials`/curriculum content. Other affected Firestore collections include `managedStudents`, `student_profiles`, `users`, and `progress`.
