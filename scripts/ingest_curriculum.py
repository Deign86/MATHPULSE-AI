from __future__ import annotations

import json
import os
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, List

from backend.rag.liteparse_utils import extract_text

BASE_DIR = Path(__file__).resolve().parents[1]
CURRICULUM_DIR = Path(os.getenv("CURRICULUM_DIR", BASE_DIR / "datasets" / "curriculum" / "sshs_learning_resources"))
VECTORSTORE_DIR = Path(os.getenv("VECTORSTORE_DIR", BASE_DIR / "datasets" / "vectorstore"))
COLLECTION_NAME = "curriculum_chunks"
EMBED_MODEL_NAME = os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")
CURRICULUM_SOURCE_REPO_ID = os.getenv("CURRICULUM_SOURCE_REPO_ID", "").strip()
CURRICULUM_SOURCE_REPO_TYPE = os.getenv("CURRICULUM_SOURCE_REPO_TYPE", "dataset").strip() or "dataset"
CURRICULUM_SOURCE_REVISION = os.getenv("CURRICULUM_SOURCE_REVISION", "main").strip() or "main"


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def infer_metadata(path: Path, text: str = "") -> Dict[str, object]:
    parts = [part.lower() for part in path.parts]
    joined = " ".join(parts)
    subject = "finite_mathematics" if "finite mathematics" in joined else "general_mathematics"
    quarter_match = re.search(r"quarter\s*([1-4])|\bq([1-4])\b", joined)
    quarter = int(next(group for group in quarter_match.groups() if group)) if quarter_match else 0
    if "finite math 1" in joined:
        subject = "finite_mathematics_1"
    elif "finite math 2" in joined:
        subject = "finite_mathematics_2"
    resource_type = "learning_activity_sheet" if "learning activity" in joined or "las" in path.stem.lower() else "lesson_exemplar"
    if "curriculum" in joined:
        resource_type = "curriculum_guide"
    elif "budget" in joined:
        resource_type = "budget_of_work"
    return {
        "subject": subject,
        "quarter": quarter,
        "resource_type": resource_type,
        "source_file": path.name,
        "source_path": path.as_posix(),
    }


def discover_curriculum_files(data_dir: Path) -> List[Path]:
    """Prefer LiteParse-generated Markdown and use PDFs only without a twin."""
    markdown_files = sorted(
        file for file in data_dir.rglob("*.md") if file.name.lower() != "readme.md"
    )
    markdown_stems = {file.stem.lower() for file in markdown_files}
    pdf_files = sorted(file for file in data_dir.rglob("*.pdf") if file.stem.lower() not in markdown_stems)
    return markdown_files + pdf_files


def _resolve_source_dir() -> Path:
    if CURRICULUM_DIR.exists():
        return CURRICULUM_DIR
    if not CURRICULUM_SOURCE_REPO_ID:
        raise SystemExit(f"Missing curriculum directory: {CURRICULUM_DIR}")
    from huggingface_hub import snapshot_download

    source_dir = Path(snapshot_download(
        repo_id=CURRICULUM_SOURCE_REPO_ID,
        repo_type=CURRICULUM_SOURCE_REPO_TYPE,
        revision=CURRICULUM_SOURCE_REVISION,
        allow_patterns=["*.pdf", "**/*.pdf", "*.md", "**/*.md"],
    ))
    CURRICULUM_DIR.mkdir(parents=True, exist_ok=True)
    for source_file in source_dir.rglob("*"):
        if source_file.is_file() and source_file.suffix.lower() in {".pdf", ".md"}:
            target = CURRICULUM_DIR / source_file.relative_to(source_dir)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(source_file.read_bytes())
    return CURRICULUM_DIR


def chunk_text(text: str) -> List[str]:
    from langchain_text_splitters import RecursiveCharacterTextSplitter

    splitter = RecursiveCharacterTextSplitter(chunk_size=2000, chunk_overlap=200, separators=["\n\n", "\n", ". ", " ", ""])
    return [chunk.strip() for chunk in splitter.split_text(text) if chunk.strip()]


def _read_source(path: Path) -> str:
    return path.read_text(encoding="utf-8") if path.suffix.lower() == ".md" else extract_text(path)


def build_documents(data_dir: Path) -> tuple[List[str], List[Dict[str, object]], List[str]]:
    documents: List[str] = []
    metadatas: List[Dict[str, object]] = []
    ids: List[str] = []
    for source_file in discover_curriculum_files(data_dir):
        text = _read_source(source_file)
        metadata = infer_metadata(source_file, text)
        for index, chunk in enumerate(chunk_text(text), start=1):
            documents.append(chunk)
            metadatas.append({**metadata, "chunk_index": index})
            ids.append(f"{source_file.stem}-{index}")
    return documents, metadatas, ids


def main(argv: List[str] | None = None) -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Ingest the SSHS curriculum corpus into ChromaDB")
    parser.add_argument("--data-dir", type=Path, default=None)
    parser.add_argument("--vectorstore-dir", type=Path, default=None)
    args = parser.parse_args(argv)

    data_dir = args.data_dir or _resolve_source_dir()
    vectorstore_dir = args.vectorstore_dir or VECTORSTORE_DIR
    files = discover_curriculum_files(data_dir)
    if not files:
        raise SystemExit(f"No Markdown or PDF curriculum files found in {data_dir}")
    vectorstore_dir.mkdir(parents=True, exist_ok=True)
    documents, metadatas, ids = build_documents(data_dir)
    if not documents:
        raise SystemExit("No text extracted from curriculum files")
    import chromadb
    from sentence_transformers import SentenceTransformer

    embedder = SentenceTransformer(EMBED_MODEL_NAME)
    embeddings = embedder.encode(
        documents,
        normalize_embeddings=True,
        show_progress_bar=True,
    ).tolist()
    client = chromadb.PersistentClient(path=str(vectorstore_dir))
    try:
        client.delete_collection(COLLECTION_NAME)
    except Exception:
        pass
    collection = client.create_collection(name=COLLECTION_NAME, metadata={"hnsw:space": "cosine"})
    for start in range(0, len(ids), 500):
        end = start + 500
        collection.add(
            ids=ids[start:end],
            documents=documents[start:end],
            metadatas=metadatas[start:end],
            embeddings=embeddings[start:end],
        )
    summary = {
        "lastIngested": datetime.now(timezone.utc).isoformat(),
        "totalChunks": len(documents),
        "sourceFiles": [path.as_posix() for path in files],
        "chunksPerSubject": dict(Counter(str(meta["subject"]) for meta in metadatas)),
    }
    (vectorstore_dir / "ingest_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(f"Total chunks: {len(documents)}")
    print(f"Source files: {len(files)}")


if __name__ == "__main__":
    main()
