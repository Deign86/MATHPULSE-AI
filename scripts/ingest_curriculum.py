from __future__ import annotations

import json
import os
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

import chromadb
import pdfplumber
from huggingface_hub import snapshot_download
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer

BASE_DIR = Path(__file__).resolve().parents[1]
CURRICULUM_DIR = BASE_DIR / "datasets" / "curriculum"
VECTORSTORE_DIR = BASE_DIR / "datasets" / "vectorstore"
COLLECTION_NAME = "curriculum_chunks"
EMBED_MODEL_NAME = "BAAI/bge-small-en-v1.5"
CURRICULUM_SOURCE_REPO_ID = os.getenv("CURRICULUM_SOURCE_REPO_ID", "").strip()
CURRICULUM_SOURCE_REPO_TYPE = os.getenv("CURRICULUM_SOURCE_REPO_TYPE", "dataset").strip() or "dataset"
CURRICULUM_SOURCE_REVISION = os.getenv("CURRICULUM_SOURCE_REVISION", "main").strip() or "main"

SUBJECT_MAP = {
    "SDO_Navotas_Gen.Math_SHS_1stSem.FV.pdf": "general_math",
    "GENERAL-MATHEMATICS-1-2.pdf": "general_math",
    "GENERAL-MATHEMATICS-1.pdf": "general_math",
    "SDO_Navotas_Bus.Math_SHS_1stSem.FV-5.pdf": "business_math",
    "SDO_Navotas_Bus.Math_SHS_1stSem.FV.pdf": "business_math",
    "SDO_Navotas_STAT_PROB_SHS_1stSem.FV-3.pdf": "stat_prob",
    "SDO_Navotas_STAT_PROB_SHS_1stSem.FV.pdf": "stat_prob",
    "SDO_Navotas_SHS_ABM_OrgAndMngt_FirstSem_FV-4.pdf": "org_management",
    "SDO_Navotas_SHS_ABM_OrgAndMngt_FirstSem_FV.pdf": "org_management",
}

QUARTER_HINTS = {
    1: ["q1", "quarter 1", "business", "finance", "arithmetic sequence", "geometric sequence", "series"],
    2: ["q2", "quarter 2", "measurement", "conversion", "functions", "piecewise", "statistics"],
    3: ["q3", "quarter 3", "trigonometry", "practical measurements", "random variable", "sampling"],
    4: ["q4", "quarter 4", "compound interest", "annuities", "loan", "hypothesis testing", "linear regression", "logic"],
}

DOMAIN_HINTS = {
    "NA": ["number", "algebra", "sequence", "series", "interest", "annuity", "loan", "logic"],
    "MG": ["measurement", "geometry", "trigonometry", "graph", "function", "piecewise"],
    "DP": ["data", "probability", "statistics", "random variable", "sampling", "hypothesis", "regression"],
}

CHUNK_TYPE_HINTS = {
    "learning_competency": ["learning competency", "code", "most essential learning", "melc", "competency"],
    "example_problem": ["example", "solve", "problem", "exercise", "activity"],
    "content_explanation": ["discussion", "content", "concept", "definition", "explain"],
}


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def infer_quarter(text: str) -> int:
    probe = _norm(text)
    for quarter, hints in QUARTER_HINTS.items():
        if any(h in probe for h in hints):
            return quarter
    return 1


def infer_domain(text: str) -> str:
    probe = _norm(text)
    scores: Dict[str, int] = {}
    for domain, hints in DOMAIN_HINTS.items():
        scores[domain] = sum(1 for hint in hints if hint in probe)
    return max(scores, key=scores.get) if any(scores.values()) else "NA"


def infer_chunk_type(text: str) -> str:
    probe = _norm(text)
    scores: Dict[str, int] = {}
    for chunk_type, hints in CHUNK_TYPE_HINTS.items():
        scores[chunk_type] = sum(1 for hint in hints if hint in probe)
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "content_explanation"


def extract_pdf_pages(pdf_path: Path) -> List[Dict[str, object]]:
    rows: List[Dict[str, object]] = []
    with pdfplumber.open(str(pdf_path)) as pdf:
        for page_index, page in enumerate(pdf.pages, start=1):
            page_text = page.extract_text() or ""
            table_lines: List[str] = []
            for table in page.extract_tables() or []:
                for row in table:
                    cells = [str(cell).strip() for cell in (row or []) if str(cell or "").strip()]
                    if cells:
                        table_lines.append(" | ".join(cells))
            combined = "\n".join([page_text, "\n".join(table_lines)]).strip()
            if combined:
                rows.append({"page": page_index, "text": combined})
    return rows


def chunk_text(page_text: str) -> List[str]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=2000,
        chunk_overlap=200,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    return [chunk.strip() for chunk in splitter.split_text(page_text) if chunk.strip()]


def _ensure_curriculum_pdfs() -> List[Path]:
    pdf_files = sorted(CURRICULUM_DIR.glob("*.pdf"))
    if pdf_files:
        return pdf_files

    if not CURRICULUM_SOURCE_REPO_ID:
        raise SystemExit(
            "No PDF files found in datasets/curriculum/ and CURRICULUM_SOURCE_REPO_ID is not set. "
            "Upload the PDFs to a Hugging Face repo and point CURRICULUM_SOURCE_REPO_ID at it."
        )

    snapshot_dir = Path(
        snapshot_download(
            repo_id=CURRICULUM_SOURCE_REPO_ID,
            repo_type=CURRICULUM_SOURCE_REPO_TYPE,
            revision=CURRICULUM_SOURCE_REVISION,
            allow_patterns=["*.pdf", "**/*.pdf"],
        )
    )

    source_pdfs = sorted(snapshot_dir.rglob("*.pdf"))
    if not source_pdfs:
        raise SystemExit(
            f"No PDF files found in Hugging Face repo {CURRICULUM_SOURCE_REPO_TYPE}:{CURRICULUM_SOURCE_REPO_ID}@{CURRICULUM_SOURCE_REVISION}."
        )

    CURRICULUM_DIR.mkdir(parents=True, exist_ok=True)
    for source_pdf in source_pdfs:
        target_pdf = CURRICULUM_DIR / source_pdf.name
        target_pdf.write_bytes(source_pdf.read_bytes())

    return sorted(CURRICULUM_DIR.glob("*.pdf"))


def main() -> None:
    if not CURRICULUM_DIR.exists():
        raise SystemExit(f"Missing curriculum directory: {CURRICULUM_DIR}")

    pdf_files = _ensure_curriculum_pdfs()
    if not pdf_files:
        raise SystemExit("No PDF files found in datasets/curriculum/")

    VECTORSTORE_DIR.mkdir(parents=True, exist_ok=True)

    documents: List[str] = []
    metadatas: List[Dict[str, object]] = []
    ids: List[str] = []

    per_subject = Counter()
    per_quarter = Counter()
    per_domain = Counter()

    for pdf_file in pdf_files:
        subject = SUBJECT_MAP.get(pdf_file.name, "general_math")
        page_rows = extract_pdf_pages(pdf_file)
        for page_row in page_rows:
            page_number = int(page_row["page"])
            text = str(page_row["text"])
            for idx, chunk in enumerate(chunk_text(text), start=1):
                quarter = infer_quarter(chunk)
                domain = infer_domain(chunk)
                chunk_type = infer_chunk_type(chunk)

                metadata = {
                    "subject": subject,
                    "quarter": quarter,
                    "content_domain": domain,
                    "chunk_type": chunk_type,
                    "source_file": pdf_file.name,
                    "page": page_number,
                }
                chunk_id = f"{pdf_file.stem}-{page_number}-{idx}"

                documents.append(chunk)
                metadatas.append(metadata)
                ids.append(chunk_id)

                per_subject[subject] += 1
                per_quarter[str(quarter)] += 1
                per_domain[domain] += 1

    embedder = SentenceTransformer(EMBED_MODEL_NAME)
    embeddings = embedder.encode(documents, show_progress_bar=True).tolist()

    client = chromadb.PersistentClient(path=str(VECTORSTORE_DIR))
    existing = [c.name for c in client.list_collections()]
    if COLLECTION_NAME in existing:
        client.delete_collection(COLLECTION_NAME)
    collection = client.create_collection(name=COLLECTION_NAME)
    collection.add(ids=ids, documents=documents, metadatas=metadatas, embeddings=embeddings)

    summary = {
        "lastIngested": datetime.now(timezone.utc).isoformat(),
        "totalChunks": len(documents),
        "chunksPerSubject": dict(per_subject),
        "chunksPerQuarter": dict(per_quarter),
        "chunksPerDomain": dict(per_domain),
        "sourceFiles": [pdf.name for pdf in pdf_files],
    }
    (VECTORSTORE_DIR / "ingest_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")

    print("=== Curriculum Ingestion Summary ===")
    print(f"Total chunks: {summary['totalChunks']}")
    print("Chunks per subject:")
    for subject, count in sorted(per_subject.items()):
        print(f"  - {subject}: {count}")
    print("Chunks per quarter:")
    for quarter, count in sorted(per_quarter.items()):
        print(f"  - Q{quarter}: {count}")
    print("Chunks per domain:")
    for domain, count in sorted(per_domain.items()):
        print(f"  - {domain}: {count}")


if __name__ == "__main__":
    main()
