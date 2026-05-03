"""
Download vectorstore directory from Firebase Storage at container startup.
Run: python -m backend.scripts.download_vectorstore_from_firebase
"""

from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

logger = logging.getLogger("mathpulse.download_vectorstore")

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend.rag.firebase_storage_loader import _init_firebase_storage

REMOTE_PREFIX = "vectorstore/"
LOCAL_DEST_DIR = Path("/app/datasets/vectorstore")


def download_vectorstore(dest_dir: Path, prefix: str = REMOTE_PREFIX):
    """Download all files under a prefix from Firebase Storage, preserving structure."""
    _, bucket = _init_firebase_storage()
    if bucket is None:
        logger.warning("Firebase Storage not available, vectorstore download skipped")
        return False

    dest_dir.mkdir(parents=True, exist_ok=True)

    blobs = list(bucket.list_blobs(prefix=prefix))
    if not blobs:
        logger.warning("No blobs found under prefix: %s", prefix)
        return False

    downloaded = 0
    errors = 0

    for blob in blobs:
        relative_path = blob.name[len(prefix):].lstrip("/")
        if not relative_path:
            continue

        local_path = dest_dir / relative_path
        local_path.parent.mkdir(parents=True, exist_ok=True)

        try:
            blob.download_to_filename(str(local_path))
            logger.info("Downloaded: %s (%d bytes)", blob.name, blob.size or 0)
            downloaded += 1
        except Exception as e:
            logger.error("Failed to download %s: %s", blob.name, e)
            errors += 1

    logger.info("Download complete: %d files downloaded, %d errors", downloaded, errors)
    return errors == 0


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    download_vectorstore(LOCAL_DEST_DIR, REMOTE_PREFIX)