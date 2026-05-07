"""
Upload vectorstore directory to Firebase Storage.
Run: python -m backend.scripts.upload_vectorstore_to_firebase
"""

from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

logger = logging.getLogger("mathpulse.upload_vectorstore")

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend.rag.firebase_storage_loader import _init_firebase_storage

VECTORSTORE_SOURCE_DIR = Path(__file__).resolve().parents[3] / "datasets" / "vectorstore"
REMOTE_PREFIX = "vectorstore/"


def upload_directory(local_dir: Path, bucket, prefix: str):
    """Recursively upload a local directory to Firebase Storage prefix."""
    uploaded = 0
    skipped = 0

    for root, dirs, files in os.walk(local_dir):
        for filename in files:
            local_path = Path(root) / filename
            relative_path = local_path.relative_to(local_dir)
            remote_path = f"{prefix}{relative_path.as_posix()}"

            try:
                blob = bucket.blob(remote_path)
                blob.upload_from_filename(str(local_path))
                logger.info("Uploaded: %s (%d bytes)", remote_path, local_path.stat().st_size)
                uploaded += 1
            except Exception as e:
                logger.error("Failed to upload %s: %s", remote_path, e)
                skipped += 1

    return uploaded, skipped


if __name__ == "__main__":
    import argparse

    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

    parser = argparse.ArgumentParser(description="Upload vectorstore to Firebase Storage")
    parser.add_argument("--source", type=str, default=str(VECTORSTORE_SOURCE_DIR),
                        help="Local vectorstore directory")
    parser.add_argument("--prefix", type=str, default=REMOTE_PREFIX,
                        help="Remote path prefix in Firebase Storage")
    args = parser.parse_args()

    source_dir = Path(args.source)
    if not source_dir.exists():
        logger.error("Source directory does not exist: %s", source_dir)
        sys.exit(1)

    _, bucket = _init_firebase_storage()
    if bucket is None:
        logger.error("Firebase Storage not available")
        sys.exit(1)

    logger.info("Uploading vectorstore from %s to gs://%s/%s",
                source_dir, bucket.name, args.prefix)
    uploaded, skipped = upload_directory(source_dir, bucket, args.prefix)
    logger.info("Upload complete: %d uploaded, %d skipped", uploaded, skipped)