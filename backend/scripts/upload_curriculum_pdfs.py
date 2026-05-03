"""
Upload DepEd curriculum PDFs to Firebase Storage.
Run once during initial setup: python scripts/upload_curriculum_pdfs.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Dict, List

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

LOCAL_PDF_DIR = r"C:\Users\Deign\Downloads\Documents"

PDF_METADATA: Dict[str, Dict[str, object]] = {
    "GENERAL-MATHEMATICS-1.pdf": {
        "subject": "General Mathematics",
        "type": "curriculum_guide",
        "strand": ["STEM", "ABM", "HUMSS", "GAS", "TVL"],
        "quarters": ["Q1", "Q2", "Q3", "Q4"],
        "storage_path": "curriculum/general_math/GENERAL-MATHEMATICS-1.pdf",
    },
    "GENERAL-MATHEMATICS-1-4.pdf": {
        "subject": "General Mathematics",
        "type": "curriculum_guide",
        "strand": ["STEM", "ABM", "HUMSS", "GAS", "TVL"],
        "quarters": ["Q1", "Q2", "Q3", "Q4"],
        "storage_path": "curriculum/general_math/GENERAL-MATHEMATICS-1-4.pdf",
    },
    "Finite-Mathematics-1-1-3.pdf": {
        "subject": "Finite Mathematics 1",
        "type": "curriculum_guide",
        "strand": ["STEM", "ABM"],
        "quarters": ["Q1", "Q2"],
        "storage_path": "curriculum/finite_math/Finite-Mathematics-1-1-3.pdf",
    },
    "Finite-Mathematics-2-1-2.pdf": {
        "subject": "Finite Mathematics 2",
        "type": "curriculum_guide",
        "strand": ["STEM", "ABM"],
        "quarters": ["Q1", "Q2"],
        "storage_path": "curriculum/finite_math/Finite-Mathematics-2-1-2.pdf",
    },
    "SDO_Navotas_Gen.Math_SHS_1stSem.FV-5.pdf": {
        "subject": "General Mathematics",
        "type": "sdo_module",
        "strand": ["STEM", "ABM", "HUMSS", "GAS", "TVL"],
        "quarters": ["Q1", "Q2"],
        "storage_path": "curriculum/gen_math_sdo/SDO_Navotas_Gen.Math_SHS_1stSem.FV-5.pdf",
    },
    "SDO_Navotas_Bus.Math_SHS_1stSem.FV-6.pdf": {
        "subject": "Business Mathematics",
        "type": "sdo_module",
        "strand": ["ABM"],
        "quarters": ["Q1", "Q2"],
        "storage_path": "curriculum/business_math/SDO_Navotas_Bus.Math_SHS_1stSem.FV-6.pdf",
    },
    "SDO_Navotas_SHS_ABM_OrgAndMngt_FirstSem_FV-7.pdf": {
        "subject": "Organization and Management",
        "type": "sdo_module",
        "strand": ["ABM"],
        "quarters": ["Q1", "Q2"],
        "storage_path": "curriculum/org_mgmt/SDO_Navotas_SHS_ABM_OrgAndMngt_FirstSem_FV-7.pdf",
    },
    "SDO_Navotas_STAT_PROB_SHS_1stSem_FV-8.pdf": {
        "subject": "Statistics and Probability",
        "type": "sdo_module",
        "strand": ["STEM", "ABM"],
        "quarters": ["Q1", "Q2"],
        "storage_path": "curriculum/stat_prob/SDO_Navotas_STAT_PROB_SHS_1stSem_FV-8.pdf",
    },
}


def chunk_text(text: str, chunk_size: int = 600, overlap: int = 100) -> List[str]:
    """Split text into overlapping chunks."""
    words = text.split()
    chunks: List[str] = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i : i + chunk_size])
        chunks.append(chunk)
        i += chunk_size - overlap
    return chunks


def upload_pdfs():
    """Upload PDFs from local directory to Firebase Storage."""
    try:
        import firebase_admin
        from firebase_admin import credentials, storage, firestore
    except ImportError:
        print("ERROR: firebase-admin not installed. Run: pip install firebase-admin")
        return

    service_account_path = Path(__file__).resolve().parents[1] / "serviceAccountKey.json"
    if not service_account_path.exists():
        print(f"ERROR: Service account key not found at {service_account_path}")
        return

    bucket_name = os.getenv("FIREBASE_STORAGE_BUCKET", "").strip()
    if not bucket_name:
        print("ERROR: FIREBASE_STORAGE_BUCKET not set in environment")
        return

    cred = credentials.Certificate(str(service_account_path))
    firebase_admin.initialize_app(cred, {"storageBucket": bucket_name})

    bucket = storage.bucket()
    db = firestore.client()

    print(f"Scanning: {LOCAL_PDF_DIR}")
    print("-" * 50)

    uploaded = 0
    skipped = 0

    for filename, meta in PDF_METADATA.items():
        local_path = Path(LOCAL_PDF_DIR) / filename

        if not local_path.exists():
            print(f"[SKIP] {filename} not found in {LOCAL_PDF_DIR}")
            skipped += 1
            continue

        doc_ref = db.collection("curriculumDocs").document(filename)
        if doc_ref.get().exists:
            print(f"[SKIP] {filename} already uploaded")
            skipped += 1
            continue

        try:
            blob = bucket.blob(meta["storage_path"])
            blob.upload_from_filename(str(local_path), content_type="application/pdf")

            doc_ref.set(
                {
                    "filename": filename,
                    "subject": meta["subject"],
                    "type": meta["type"],
                    "strand": meta["strand"],
                    "quarters": meta["quarters"],
                    "storage_path": meta["storage_path"],
                    "uploaded_at": firestore.SERVER_TIMESTAMP,
                    "indexed": False,
                }
            )

            print(f"[OK] Uploaded {filename}")
            uploaded += 1
        except Exception as e:
            print(f"[ERROR] {filename}: {e}")

    print("-" * 50)
    print(f"Upload complete: {uploaded} uploaded, {skipped} skipped")


def index_pdfs():
    """Extract text from PDFs, chunk, embed, and store in ChromaDB."""
    try:
        from pypdf import PdfReader
        import chromadb
        from sentence_transformers import SentenceTransformer
        from firebase_admin import firestore
    except ImportError:
        print("ERROR: Missing dependencies. Run: pip install pypdf chromadb sentence-transformers firebase-admin")
        return

    chroma_path = os.getenv("CHROMA_PERSIST_PATH", "./datasets/vectorstore")
    
    chroma_client = chromadb.PersistentClient(path=chroma_path)
    collection = chroma_client.get_or_create_collection(
        name="curriculum_chunks",
        metadata={"hnsw:space": "cosine"},
    )
    embedder = SentenceTransformer("BAAI/bge-base-en-v1.5")
    
    try:
        import firebase_admin
        from firebase_admin import firestore as FS
        db = FS.client()
    except Exception:
        db = None

    print(f"Indexing PDFs from: {LOCAL_PDF_DIR}")
    print("-" * 50)

    indexed = 0
    skipped = 0

    for filename, meta in PDF_METADATA.items():
        if db:
            doc_ref = db.collection("curriculumDocs").document(filename)
            doc = doc_ref.get()
            if doc and doc.to_dict().get("indexed", False):
                print(f"[SKIP] {filename} already indexed")
                skipped += 1
                continue

        local_path = Path(LOCAL_PDF_DIR) / filename
        if not local_path.exists():
            print(f"[SKIP] {filename} not found")
            skipped += 1
            continue

        try:
            reader = PdfReader(str(local_path))
            full_text = "\n".join(page.extract_text() or "" for page in reader.pages)

            if not full_text.strip():
                print(f"[WARN] {filename} has no extractable text")
                continue

            chunks = chunk_text(full_text)
            print(f"[INFO] {filename} -> {len(chunks)} chunks")

            for i, chunk in enumerate(chunks):
                chunk_id = f"{filename}_chunk_{i}"

                existing = collection.get(ids=[chunk_id])
                if existing and existing.get("ids"):
                    continue

                chunk_embedding = embedder.encode(
                    chunk,
                    normalize_embeddings=True,
                ).tolist()

                collection.add(
                    embeddings=[chunk_embedding],
                    documents=[chunk],
                    metadatas=[
                        {
                            "source_file": filename,
                            "subject": meta["subject"],
                            "strand": ",".join(meta["strand"]),
                            "quarter": ",".join(meta["quarters"]),
                            "chunk_index": i,
                            "type": meta["type"],
                        }
                    ],
                    ids=[chunk_id],
                )

            if db:
                doc_ref.update({"indexed": True})

            print(f"[OK] Indexed {filename}")
            indexed += 1
        except Exception as e:
            print(f"[ERROR] {filename}: {e}")

    print("-" * 50)
    print(f"Indexing complete: {indexed} indexed, {skipped} skipped")
    print(f"Total chunks in ChromaDB: {collection.count()}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Upload and index DepEd curriculum PDFs")
    parser.add_argument("action", choices=["upload", "index", "both"], help="Action to perform")
    args = parser.parse_args()

    if args.action in ("upload", "both"):
        upload_pdfs()

    if args.action in ("index", "both"):
        index_pdfs()