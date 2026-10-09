"""Rebuild a Chroma curriculum store into a NEW directory with a complete HNSW index.

The shipped store keeps all 3510 documents/metadatas in sqlite but its HNSW
index only holds a fraction of the ids, so filtered queries raise
"Error finding id". This re-embeds the stored passages (same model and
settings as ingest_curriculum.py: no query prefix, normalized) into a fresh
collection.

Usage: python backend/scripts/rebuild_vectorstore_index.py <src_dir> <dst_dir>
Never writes to <src_dir>; <dst_dir> must be missing or empty.
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path
from typing import Any, Dict, List

COLLECTION_NAME = "curriculum_chunks"
EMBED_MODEL_NAME = "BAAI/bge-small-en-v1.5"
PAGE_SIZE = 500
ADD_BATCH = 500


def _read_all(collection: Any) -> Dict[str, List[Any]]:
    ids: List[str] = []
    documents: List[str] = []
    metadatas: List[Dict[str, Any]] = []
    total = collection.count()
    offset = 0
    while offset < total:
        page = collection.get(limit=PAGE_SIZE, offset=offset, include=["documents", "metadatas"])
        page_ids = page.get("ids") or []
        if not page_ids:
            break
        ids.extend(page_ids)
        documents.extend(page.get("documents") or [])
        metadatas.extend(page.get("metadatas") or [])
        offset += len(page_ids)
    return {"ids": ids, "documents": documents, "metadatas": metadatas}


def rebuild(src: Path, dst: Path) -> None:
    src = src.resolve()
    dst = dst.resolve()
    if src == dst:
        raise SystemExit("dst must differ from src (no in-place rebuild)")
    if dst.exists() and any(dst.iterdir()):
        raise SystemExit(f"dst exists and is not empty: {dst}")

    import chromadb
    from sentence_transformers import SentenceTransformer

    src_collection = chromadb.PersistentClient(path=str(src)).get_collection(COLLECTION_NAME)
    collection_metadata = dict(src_collection.metadata or {"hnsw:space": "cosine"})
    data = _read_all(src_collection)
    ids, documents, metadatas = data["ids"], data["documents"], data["metadatas"]
    if not ids or not (len(ids) == len(documents) == len(metadatas)):
        raise SystemExit(f"unexpected source data: {len(ids)} ids, {len(documents)} docs, {len(metadatas)} metadatas")
    print(f"Read {len(ids)} chunks from {src}")

    embedder = SentenceTransformer(EMBED_MODEL_NAME)
    embeddings = embedder.encode(
        documents, batch_size=64, normalize_embeddings=True, show_progress_bar=True
    ).tolist()

    dst.mkdir(parents=True, exist_ok=True)
    dst_collection = chromadb.PersistentClient(path=str(dst)).create_collection(
        name=COLLECTION_NAME, metadata=collection_metadata
    )
    for start in range(0, len(ids), ADD_BATCH):
        end = start + ADD_BATCH
        dst_collection.add(
            ids=ids[start:end],
            documents=documents[start:end],
            metadatas=metadatas[start:end],
            embeddings=embeddings[start:end],
        )

    for entry in src.iterdir():
        if entry.is_file() and not entry.name.startswith("chroma.sqlite3") and entry.suffix != ".npy":
            shutil.copy2(entry, dst / entry.name)

    # Verify on a fresh client so we test what a server would load from disk.
    check = chromadb.PersistentClient(path=str(dst)).get_collection(COLLECTION_NAME)
    count = check.count()
    probe = embeddings[0]
    unfiltered = check.query(query_embeddings=[probe], n_results=count, include=["distances"])
    unfiltered_ids = len(unfiltered["ids"][0])
    source_file = metadatas[0].get("source_file")
    filtered = check.query(
        query_embeddings=[probe],
        n_results=3,
        where={"source_file": source_file},
        include=["documents", "metadatas", "distances"],
    )
    print(f"count={count} unfiltered_query_ids={unfiltered_ids}")
    print(f"filtered query source_file={source_file!r} -> {len(filtered['ids'][0])} ids, distances={filtered['distances'][0]}")
    if unfiltered_ids != count:
        raise SystemExit("verification failed: index still incomplete")


def main(argv: List[str]) -> None:
    if len(argv) != 3:
        raise SystemExit(__doc__)
    rebuild(Path(argv[1]), Path(argv[2]))


if __name__ == "__main__":
    main(sys.argv)
