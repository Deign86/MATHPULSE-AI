# Curriculum Source-of-Truth Migration

## Scope
Replace the repository curriculum corpus with `datasets/curriculum/sshs_learning_resources`, migrate ingestion from pdfplumber to LiteParse based on the installed package contract, remove stale vectorstore artifacts safely, update docs/cache versioning, and verify RAG/backend/frontend behavior.

## Contracts
- Corpus owner: `datasets/curriculum/sshs_learning_resources/`.
- Ingestion entrypoint is `scripts/ingest_curriculum.py --data-dir <dir>`; the legacy backend JSON/JSONL loader remains separate.
- Existing Chroma collection name and embedding model remain unchanged unless code inspection proves otherwise.
- Backup must precede deletion; local-only generated vectorstore is not committed as source data.
- One implementation writer owns repository code changes; reviewers inspect after implementation.

## Work leaves
1. Reconnaissance: current data layout, parser call sites, requirements, vectorstore tracking, tests, cache version.
2. Corpus and safety: backup/inventory, source README, old corpus/vectorstore handling.
3. LiteParse migration: parser adapter and ingestion call-site updates with tests.
4. Docs and PWA cache: documentation, tracking, service-worker cache bump.
5. Integration verification: tests, typecheck/build, stale-reference and diff review.

## Status log
- 2026-02-??: gates and plan created; reconnaissance pending.
