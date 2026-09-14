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


# FIX(502): Respect EMBEDDING_MODEL env var, default to bge-small-en-v1.5 (matches .env.example).
# bge-base-en-v1.5 was the old hardcoded default — downloading the wrong model on HF Spaces
# cold start triggers a ~130 MB download that can exceed the 60s startup timeout.
_DEFAULT_EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")


def _get_collection_dimension(vectorstore_dir: Path, collection_name: str = "curriculum_chunks") -> int | None:
    db_path = vectorstore_dir / "chroma.sqlite3"
    if not db_path.exists():
        return None
    try:
        import sqlite3
        conn = sqlite3.connect(str(db_path))
        cur = conn.cursor()
        cur.execute("SELECT dimension FROM collections WHERE name = ?", (collection_name,))
        row = cur.fetchone()
        conn.close()
        if row and row[0]:
            return int(row[0])
    except Exception:
        pass
    return None


def get_vectorstore_components(
    collection_name: str = "curriculum_chunks",
    model_name: str = _DEFAULT_EMBEDDING_MODEL,
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

                expected_dim = _get_collection_dimension(vectorstore_dir, collection_name)
                # Auto-align model_name with the collection dimension to prevent 384 vs 768 mismatch
                if expected_dim == 384 and ("bge-base" in model_name or "768" in model_name):
                    model_name = "BAAI/bge-small-en-v1.5"
                elif expected_dim == 768 and ("bge-small" in model_name or "384" in model_name):
                    model_name = "BAAI/bge-base-en-v1.5"

                embedder = SentenceTransformer(model_name)
                actual_dim = getattr(embedder, "get_sentence_embedding_dimension", lambda: None)()
                if expected_dim is not None and actual_dim is not None and actual_dim != expected_dim:
                    if expected_dim == 384:
                        embedder = SentenceTransformer("BAAI/bge-small-en-v1.5")
                    elif expected_dim == 768:
                        embedder = SentenceTransformer("BAAI/bge-base-en-v1.5")

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
