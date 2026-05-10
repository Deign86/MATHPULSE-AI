"""
Download vectorstore directory from Firebase Storage at container startup.
Run: python -m hf_space_test.scripts.download_vectorstore_from_firebase
"""

from __future__ import annotations

import logging
import os
import json
import sys
from pathlib import Path

logger = logging.getLogger("mathpulse.download_vectorstore")

def _init_firebase():
    if not hasattr(_init_firebase, '_FIREBASE_INITIALIZED'):
        _init_firebase._FIREBASE_INITIALIZED = False
    if _init_firebase._FIREBASE_INITIALIZED:
        try:
            from firebase_admin import storage as fb_storage
            bucket = fb_storage.bucket()
            return bucket
        except Exception as e:
            logger.warning("Firebase storage unavailable: %s", e)
            _init_firebase._FIREBASE_INITIALIZED = False
            return None

    try:
        import firebase_admin
        from firebase_admin import credentials, storage
    except ImportError:
        logger.warning("firebase_admin not installed")
        return None

    if firebase_admin._apps:
        _init_firebase._FIREBASE_INITIALIZED = True
        try:
            bucket = storage.bucket()
            return bucket
        except Exception as e:
            logger.warning("Firebase storage bucket unavailable: %s", e)
            return None

    sa_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    sa_file = os.getenv("FIREBASE_SERVICE_ACCOUNT_FILE")
    bucket_name = os.getenv("FIREBASE_STORAGE_BUCKET", "mathpulse-ai-2026.firebasestorage.app")

    try:
        if sa_json:
            creds = credentials.Certificate(json.loads(sa_json))
        elif sa_file and Path(sa_file).exists():
            creds = credentials.Certificate(sa_file)
        else:
            creds = credentials.ApplicationDefault()

        firebase_admin.initialize_app(creds, {"storageBucket": bucket_name})
        _init_firebase._FIREBASE_INITIALIZED = True
        bucket = storage.bucket()
        return bucket
    except Exception as e:
        logger.warning("Firebase init failed: %s", e)
        return None

REMOTE_PREFIX = "vectorstore/"
LOCAL_DEST_DIR = Path("/app/datasets/vectorstore")


def download_vectorstore(dest_dir: Path, prefix: str = REMOTE_PREFIX):
    """Download all files under a prefix from Firebase Storage, preserving structure."""
    bucket = _init_firebase()
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
