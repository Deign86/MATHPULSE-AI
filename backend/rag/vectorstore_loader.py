from __future__ import annotations

import os
from pathlib import Path
from threading import Lock
from typing import Any, Dict, Tuple

import chromadb
from sentence_transformers import SentenceTransformer

_VECTORSTORE_LOCK = Lock()
_VECTORSTORE_SINGLETON: Tuple[Any, Any, SentenceTransformer] | None = None


def reset_vectorstore_singleton() -> None:
    global _VECTORSTORE_SINGLETON
    with _VECTORSTORE_LOCK:
        _VECTORSTORE_SINGLETON = None


def _resolve_vectorstore_dir() -> Path:
    raw = os.getenv("CURRICULUM_VECTORSTORE_DIR", "datasets/vectorstore")
    path = Path(raw)
    if path.is_absolute():
        return path

    cwd_candidate = Path.cwd() / path
    if cwd_candidate.exists() or str(Path.cwd()).endswith("MATHPULSE-AI"):
        return cwd_candidate

    backend_candidate = Path(__file__).resolve().parents[2] / path
    return backend_candidate


def get_vectorstore_components(
    collection_name: str = "curriculum_chunks",
    model_name: str = "BAAI/bge-base-en-v1.5",
):
    global _VECTORSTORE_SINGLETON
    if _VECTORSTORE_SINGLETON is None:
        with _VECTORSTORE_LOCK:
            if _VECTORSTORE_SINGLETON is None:
                vectorstore_dir = _resolve_vectorstore_dir()
                vectorstore_dir.mkdir(parents=True, exist_ok=True)
                client = chromadb.PersistentClient(path=str(vectorstore_dir))
                collection = client.get_or_create_collection(
                    name=collection_name,
                    metadata={"hnsw:space": "cosine"},
                )
                embedder = SentenceTransformer(model_name)
                _VECTORSTORE_SINGLETON = (client, collection, embedder)
    return _VECTORSTORE_SINGLETON


def get_vectorstore_health() -> Dict[str, Any]:
    _, collection, _ = get_vectorstore_components()
    payload = collection.get(include=["metadatas"])
    metadatas = payload.get("metadatas") or []
    subjects: Dict[str, int] = {}
    for md in metadatas:
        if not isinstance(md, dict):
            continue
        subject = str(md.get("subject") or "unknown")
        subjects[subject] = subjects.get(subject, 0) + 1
    return {
        "chunkCount": len(payload.get("ids") or []),
        "subjects": subjects,
        "vectorstoreDir": str(_resolve_vectorstore_dir()),
    }
