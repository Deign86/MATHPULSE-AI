# Curriculum Source Tracking — MathPulse AI

**Source of truth:** `datasets/curriculum/sshs_learning_resources/`.
The corpus contains DepEd Strengthened Senior High School Mathematics Learning Activity Sheets and Lesson Exemplars, including Finite Mathematics and General Mathematics resources organized by quarter. Parsed Markdown is preferred for ingestion; LiteParse parses a PDF only when no same-stem Markdown file exists.

## Parser and ingestion status

- Parser: LiteParse (`liteparse>=2.4.0`), local parsing with `result.text`.
- Canonical entrypoint: `python scripts/ingest_curriculum.py`.
- Chroma collection: `curriculum_chunks`, cosine distance.
- Embeddings: `EMBEDDING_MODEL` or `BAAI/bge-small-en-v1.5`.
- Duplicate rule: a parsed Markdown/PDF pair contributes one source, with Markdown preferred.

## Manual review

Review resources with scanned pages, dense tables, charts, or empty LiteParse output before production ingestion. Record the relative path and correction in this file. No unresolved LiteParse failures are currently recorded.

## Verification checklist

1. Confirm each source has readable Markdown or LiteParse text.
2. Run `python scripts/ingest_curriculum.py` against the corpus.
3. Check `/api/rag/health` and spot-check retrieval for General Mathematics and Finite Mathematics topics.
4. Confirm generated lesson citations reference `sshs_learning_resources` paths.
