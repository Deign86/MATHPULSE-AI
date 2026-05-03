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


def _resolve_dest_dir() -> Path:
    raw = os.getenv("CURRICULUM_VECTORSTORE_DIR") or os.getenv("VECTORSTORE_DIR")
    if raw:
        return Path(raw)
    return Path("/app/datasets/vectorstore")


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
            if local_path.exists() and blob.size is not None and local_path.stat().st_size == blob.size:
                logger.info("Skipped (already up-to-date): %s", blob.name)
                continue
            blob.download_to_filename(str(local_path))
            logger.info("Downloaded: %s (%d bytes)", blob.name, blob.size or 0)
            downloaded += 1
        except Exception as e:
            logger.error("Failed to download %s: %s", blob.name, e)
            errors += 1

    logger.info("Download complete: %d files downloaded, %d errors", downloaded, errors)
    return errors == 0


if __name__ == "__main__":
    import firebase_admin
    print("DEBUG: firebase_admin location:", firebase_admin.__file__)
    print("DEBUG: firebase_admin apps:", firebase_admin._apps)
    print("DEBUG: FIREBASE_SERVICE_ACCOUNT_JSON set:", bool(firebase_admin._GLOBAL_APP is None))
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    dest_dir = _resolve_dest_dir()
    print(f"INFO: Using vectorstore destination: {dest_dir}")
    print(f"INFO: CURRICULUM_VECTORSTORE_DIR env: {os.environ.get('CURRICULUM_VECTORSTORE_DIR', 'not set')}")
    print(f"INFO: VECTORSTORE_DIR env: {os.environ.get('VECTORSTORE_DIR', 'not set')}")
    print(f"INFO: FIREBASE_STORAGE_BUCKET env: {os.environ.get('FIREBASE_STORAGE_BUCKET', 'not set')}")
    print(f"INFO: FIREBASE_SERVICE_ACCOUNT_JSON length: {len(os.environ.get('FIREBASE_SERVICE_ACCOUNT_JSON', ''))}")
    result = download_vectorstore(dest_dir, REMOTE_PREFIX)
    if result:
        print("SUCCESS: Vectorstore download completed")
    else:
        print("FAILURE: Vectorstore download failed")
