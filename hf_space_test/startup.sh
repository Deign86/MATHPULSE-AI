#!/bin/sh
set -eu

if [ -d "/data" ]; then
    : "${CURRICULUM_DIR:=/data/curriculum}"
    : "${VECTORSTORE_DIR:=/data/vectorstore}"
else
    : "${CURRICULUM_DIR:=/app/datasets/curriculum}"
    : "${VECTORSTORE_DIR:=/app/datasets/vectorstore}"
fi

export CURRICULUM_DIR
export VECTORSTORE_DIR

mkdir -p "${CURRICULUM_DIR}" "${VECTORSTORE_DIR}"

_ingest_script="/app/scripts/ingest_curriculum.py"
if [ -f "${_ingest_script}" ]; then
    if [ -n "${CURRICULUM_SOURCE_REPO_ID:-}" ] || find "${CURRICULUM_DIR}" -type f -name '*.pdf' -print -quit >/dev/null 2>&1; then
        echo "INFO: Running curriculum ingestion (optional)..."
        python "${_ingest_script}" && echo "INFO: Curriculum ingestion completed" || echo "WARNING: Curriculum ingestion failed, continuing anyway"
    else
        echo "INFO: No curriculum PDFs present and CURRICULUM_SOURCE_REPO_ID unset; skipping ingest"
    fi
else
    echo "INFO: Curriculum ingestion script not found at ${_ingest_script}; skipping (curriculum is optional)"
fi

_download_script="/app/scripts/download_vectorstore_from_firebase.py"
if [ -f "${_download_script}" ]; then
    echo "INFO: Downloading vectorstore from Firebase Storage..."
    python "${_download_script}" && echo "INFO: Vectorstore download completed" || echo "WARNING: Vectorstore download failed, continuing anyway"
else
    echo "INFO: Vectorstore download script not found at ${_download_script}; skipping (vectorstore is optional)"
fi

exec uvicorn main:app --host 0.0.0.0 --port 7860 --workers 1