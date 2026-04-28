from __future__ import annotations

import argparse
import hashlib
import json
import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, List

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from rag.vectorstore_loader import (
    get_vectorstore_components,
    reset_vectorstore_singleton,
)

logger = logging.getLogger(__name__)


def _resolve_data_dir(raw: str | None) -> Path:
    if raw:
        p = Path(raw)
        if p.is_absolute():
            return p
        p = Path.cwd() / raw
        if p.exists():
            return p
    default = Path(__file__).resolve().parents[1] / "datasets"
    return default


def _iter_json_files(data_dir: Path):
    for file in sorted(data_dir.rglob("*")):
        if file.suffix not in {".json", ".jsonl"}:
            continue
        yield file


def _load_records(file_path: Path) -> List[Dict[str, Any]]:
    records: List[Dict[str, Any]] = []
    try:
        raw = file_path.read_text(encoding="utf-8").strip()
        if file_path.suffix == ".jsonl":
            for lineno, line in enumerate(raw.splitlines(), start=1):
                line = line.strip()
                if not line:
                    continue
                try:
                    records.append(json.loads(line))
                except json.JSONDecodeError:
                    logger.warning("Skipping malformed JSONL line %s:%d", file_path.name, lineno)
        else:
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                records.extend(parsed)
            elif isinstance(parsed, dict):
                records.append(parsed)
    except Exception as exc:
        logger.warning("Failed to parse %s: %s", file_path.name, exc)
    return records


def _build_id(source_file: str, page: int, content: str) -> str:
    key = f"{source_file}::{page}::{content[:120]}"
    return hashlib.sha256(key.encode()).hexdigest()[:40]


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest DepEd SHS curriculum JSON/JSONL into ChromaDB")
    parser.add_argument("--data-dir", default=None, help="Directory containing .json/.jsonl files")
    parser.add_argument("--reset", action="store_true", help="Reset the vectorstore singleton before ingestion")
    args = parser.parse_args()

    data_dir = _resolve_data_dir(args.data_dir)
    logger.info("Ingesting from: %s", data_dir)

    if args.reset:
        reset_vectorstore_singleton()
        _, collection, _ = get_vectorstore_components()
        try:
            collection.delete(ids=collection.get(include=[])["ids"])
        except Exception:
            pass
        reset_vectorstore_singleton()

    total_processed = 0
    total_upserted = 0
    total_errors = 0

    _, collection, embedder = get_vectorstore_components()

    for file_path in _iter_json_files(data_dir):
        records = _load_records(file_path)
        documents: List[str] = []
        metadatas: List[Dict[str, Any]] = []
        ids: List[str] = []
        embeddings_list: List[List[float]] = []

        for record in records:
            total_processed += 1
            content = str(record.get("content") or "").strip()
            if not content:
                logger.debug("Skipping empty content in %s", file_path.name)
                continue

            try:
                subject = str(record.get("subject") or "unknown")
                quarter = int(record.get("quarter") or 0)
                page = int(record.get("page") or 0)
                content_domain = str(record.get("content_domain") or "unknown")
                chunk_type = str(record.get("chunk_type") or "unknown")
                source_file = str(record.get("source_file") or file_path.name)

                embedding = embedder.encode(content).tolist()
                chunk_id = _build_id(source_file, page, content)

                metadata = {
                    "subject": subject,
                    "quarter": quarter,
                    "content_domain": content_domain,
                    "chunk_type": chunk_type,
                    "source_file": source_file,
                    "page": page,
                }

                documents.append(content)
                metadatas.append(metadata)
                ids.append(chunk_id)
                embeddings_list.append(embedding)

            except Exception as exc:
                total_errors += 1
                logger.warning("Error processing record in %s: %s", file_path.name, exc)

        if documents:
            try:
                collection.upsert(
                    ids=ids,
                    documents=documents,
                    metadatas=metadatas,
                    embeddings=embeddings_list,
                )
                total_upserted += len(documents)
                logger.info("Upserted %d chunks from %s", len(documents), file_path.name)
            except Exception as exc:
                total_errors += len(documents)
                logger.warning("Failed to upsert batch from %s: %s", file_path.name, exc)

    print(f"=== Ingestion Summary ===")
    print(f"Total records processed: {total_processed}")
    print(f"Total chunks upserted:  {total_upserted}")
    print(f"Total errors:           {total_errors}")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    main()