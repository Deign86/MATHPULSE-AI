from __future__ import annotations

import hashlib
import json
import os
import re
from collections import Counter
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, List

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))
if str(BASE_DIR / "backend") not in sys.path:
    sys.path.insert(0, str(BASE_DIR / "backend"))

try:
    from backend.rag.liteparse_utils import extract_text
except ImportError:
    from rag.liteparse_utils import extract_text
CURRICULUM_DIR = Path(os.getenv("CURRICULUM_DIR", BASE_DIR / "datasets" / "curriculum"))
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
    stem_lower = path.stem.lower()

    clean_joined = re.sub(r"problems?", "", joined)
    clean_stem = re.sub(r"problems?", "", stem_lower)
    if "stat" in clean_joined or "prob" in clean_joined or "stat" in clean_stem or "prob" in clean_stem:
        subject = "statistics_and_probability"
    elif "finite math 1" in joined or "finite_mathematics_1" in joined:
        subject = "finite_mathematics_1"
    elif "finite math 2" in joined or "finite_mathematics_2" in joined:
        subject = "finite_mathematics_2"
    elif "finite" in joined or "finite" in stem_lower:
        subject = "finite_mathematics"
    else:
        subject = "general_mathematics"

    name_and_parts = f"{joined} {stem_lower}"
    quarter_match = re.search(
        r"quarter\s*([1-4])|[_\-\b\s]q([1-4])[_\-\b\s.]|^q([1-4])[_\-\b\s.]|[\b_]q([1-4])[\b_]",
        name_and_parts,
    )
    quarter = 0
    if quarter_match:
        quarter = int(next(group for group in quarter_match.groups() if group))
    else:
        mod_match = re.search(r"module\s*([1-4])|[\b_]mod([1-4])[\b_]", name_and_parts)
        if mod_match:
            quarter = int(next(group for group in mod_match.groups() if group))

    resource_type = "learning_activity_sheet" if "learning activity" in joined or "las" in stem_lower else "lesson_exemplar"
    if "curriculum" in joined:
        resource_type = "curriculum_guide"
    elif "budget" in joined:
        resource_type = "budget_of_work"

    try:
        storage_path = path.resolve().relative_to((BASE_DIR / "datasets").resolve()).as_posix()
    except ValueError:
        norm_posix = path.as_posix()
        if "datasets/" in norm_posix:
            storage_path = norm_posix.split("datasets/", 1)[1]
        elif "curriculum" in norm_posix:
            storage_path = "curriculum" + norm_posix.split("curriculum", 1)[1]
        else:
            storage_path = f"curriculum/{path.name}"

    if subject == "statistics_and_probability":
        content_domain = "statistics"
    elif "business" in joined or "bus_math" in joined:
        content_domain = "business_math"
    else:
        content_domain = "general"

    return {
        "subject": subject,
        "quarter": quarter,
        "content_domain": content_domain,
        "resource_type": resource_type,
        "source_file": path.name,
        "source_path": path.as_posix(),
        "storage_path": storage_path,
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


def _clean_text(text: str) -> str:
    if not text:
        return ""
    # Strip lone surrogate characters that invalidate UTF-8 encoding in Rust tokenizers
    return text.encode("utf-8", "ignore").decode("utf-8")


def chunk_text(text: str) -> List[str]:
    from langchain_text_splitters import RecursiveCharacterTextSplitter

    cleaned = _clean_text(text)
    splitter = RecursiveCharacterTextSplitter(chunk_size=2000, chunk_overlap=200, separators=["\n\n", "\n", ". ", " ", ""])
    return [_clean_text(chunk.strip()) for chunk in splitter.split_text(cleaned) if chunk.strip()]


def _read_source(path: Path) -> str:
    if path.suffix.lower() == ".md":
        raw = path.read_text(encoding="utf-8", errors="ignore")
    else:
        try:
            import pypdf
            reader = pypdf.PdfReader(path)
            extracted = "\n".join(page.extract_text() or "" for page in reader.pages)
            if len(extracted.strip()) >= 100:
                raw = extracted
            else:
                raw = extract_text(path)
        except Exception:
            raw = extract_text(path)
    return _clean_text(raw)


def build_documents(data_dir: Path) -> tuple[List[str], List[Dict[str, object]], List[str]]:
    documents: List[str] = []
    metadatas: List[Dict[str, object]] = []
    ids: List[str] = []
    for source_file in discover_curriculum_files(data_dir):
        text = _read_source(source_file)
        metadata = infer_metadata(source_file, text)
        storage_path = str(metadata.get("storage_path") or source_file.stem)
        path_hash = hashlib.md5(storage_path.encode("utf-8")).hexdigest()[:8]
        for index, chunk in enumerate(chunk_text(text), start=1):
            documents.append(chunk)
            metadatas.append({**metadata, "chunk_index": index})
            ids.append(f"{path_hash}-{source_file.stem}-{index}")
    return documents, metadatas, ids


def main(argv: List[str] | None = None) -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Ingest the SSHS curriculum corpus into ChromaDB")
    parser.add_argument("--data-dir", type=Path, default=None)
    parser.add_argument("--vectorstore-dir", type=Path, default=None)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print discovered files, inferred metadata (subject, quarter, storage_path), and estimated chunks without updating Chroma",
    )
    args = parser.parse_args(argv)

    data_dir = args.data_dir or _resolve_source_dir()
    vectorstore_dir = args.vectorstore_dir or VECTORSTORE_DIR
    files = discover_curriculum_files(data_dir)
    if not files:
        raise SystemExit(f"No Markdown or PDF curriculum files found in {data_dir}")

    if args.dry_run:
        print(f"=== DRY RUN: Ingesting curriculum from {data_dir} ===")
        print(f"Discovered {len(files)} files:\n")
        total_estimated_chunks = 0
        chunks_by_subject: Dict[str, int] = Counter()
        for idx, source_file in enumerate(files, start=1):
            text = _read_source(source_file)
            metadata = infer_metadata(source_file, text)
            chunks = chunk_text(text)
            chunk_count = len(chunks)
            total_estimated_chunks += chunk_count
            subj = str(metadata["subject"])
            chunks_by_subject[subj] += chunk_count
            print(
                f"[{idx:02d}/{len(files):02d}] {source_file.name}\n"
                f"     storage_path:   {metadata['storage_path']}\n"
                f"     subject:        {metadata['subject']}\n"
                f"     quarter:        {metadata['quarter']}\n"
                f"     content_domain: {metadata['content_domain']}\n"
                f"     chunks:         {chunk_count}\n"
            )
        print("=== DRY RUN SUMMARY ===")
        print(f"Total discovered files: {len(files)}")
        print(f"Total estimated chunks: {total_estimated_chunks}")
        print(f"Chunks per subject:     {dict(chunks_by_subject)}")
        return

    vectorstore_dir.mkdir(parents=True, exist_ok=True)
    documents, metadatas, ids = build_documents(data_dir)
    if not documents:
        raise SystemExit("No text extracted from curriculum files")
    import chromadb
    from sentence_transformers import SentenceTransformer

    cache_file = vectorstore_dir / "embeddings_cache.npy"
    embeddings: List[List[float]] = []
    if cache_file.exists():
        try:
            import numpy as np
            cached_data = np.load(cache_file)
            if len(cached_data) == len(documents) and cached_data.shape[1] == 384:
                print(f"Loaded {len(cached_data)} cached embeddings from {cache_file}")
                embeddings = cached_data.tolist()
        except Exception:
            embeddings = []

    if not embeddings:
        embedder = SentenceTransformer(EMBED_MODEL_NAME)
        encoded = embedder.encode(
            documents,
            batch_size=64,
            normalize_embeddings=True,
            show_progress_bar=True,
        )
        try:
            import numpy as np
            np.save(cache_file, encoded)
        except Exception:
            pass
        embeddings = encoded.tolist()

    import sqlite3

    client = chromadb.PersistentClient(path=str(vectorstore_dir))
    chunk_count_before = 0
    sqlite_file = vectorstore_dir / "chroma.sqlite3"
    needs_recreate = False
    if sqlite_file.exists():
        try:
            with sqlite3.connect(str(sqlite_file)) as conn:
                row = conn.execute(
                    "SELECT dimension FROM collections WHERE name = ?", (COLLECTION_NAME,)
                ).fetchone()
                if row and row[0] is not None and row[0] != len(embeddings[0]):
                    print(
                        f"Dimension mismatch ({row[0]} != {len(embeddings[0])}); "
                        f"recreating collection {COLLECTION_NAME}..."
                    )
                    needs_recreate = True
        except Exception:
            pass

    if needs_recreate:
        try:
            existing_col = client.get_collection(COLLECTION_NAME)
            chunk_count_before = existing_col.count()
            client.delete_collection(COLLECTION_NAME)
        except Exception:
            pass
        collection = client.create_collection(
            name=COLLECTION_NAME, metadata={"hnsw:space": "cosine"}
        )
    else:
        try:
            collection = client.get_collection(COLLECTION_NAME)
            chunk_count_before = collection.count()
        except Exception:
            collection = client.create_collection(
                name=COLLECTION_NAME, metadata={"hnsw:space": "cosine"}
            )

    print(f"Chunk count before: {chunk_count_before}")

    existing_ids = set(collection.get(include=[])["ids"])
    new_ids = set(ids)
    stale_ids = list(existing_ids - new_ids)
    if stale_ids:
        print(f"Pruning {len(stale_ids)} stale chunks from collection...")
        for start in range(0, len(stale_ids), 500):
            collection.delete(ids=stale_ids[start : start + 500])

    for start in range(0, len(ids), 500):
        end = start + 500
        collection.upsert(
            ids=ids[start:end],
            documents=documents[start:end],
            metadatas=metadatas[start:end],
            embeddings=embeddings[start:end],
        )
    chunk_count_after = collection.count()
    print(f"Chunk count after: {chunk_count_after}")
    summary = {
        "lastIngested": datetime.now(timezone.utc).isoformat(),
        "totalChunks": len(documents),
        "chunkCountBefore": chunk_count_before,
        "chunkCountAfter": chunk_count_after,
        "sourceFiles": [path.as_posix() for path in files],
        "chunksPerSubject": dict(Counter(str(meta["subject"]) for meta in metadatas)),
    }
    (vectorstore_dir / "ingest_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(f"Total chunks: {len(documents)}")
    print(f"Source files: {len(files)}")


if __name__ == "__main__":
    main()
