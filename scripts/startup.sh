#!/bin/sh
set -eu

if [ -n "${CURRICULUM_SOURCE_REPO_ID:-}" ] || find /app/datasets/curriculum -type f -name '*.pdf' -print -quit >/dev/null 2>&1; then
    python /app/scripts/ingest_curriculum.py || echo "Curriculum ingest skipped during startup"
else
    echo "No curriculum PDFs present and CURRICULUM_SOURCE_REPO_ID is unset; skipping ingest"
fi

exec uvicorn main:app --host 0.0.0.0 --port 8000 --reload