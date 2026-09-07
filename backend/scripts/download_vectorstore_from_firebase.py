"""
Download vectorstore directory from Firebase Storage at container startup.
Run: python /app/scripts/download_vectorstore_from_firebase.py
"""

from __future__ import annotations

import json
import logging
import os
import sys
from pathlib import Path

logger = logging.getLogger("mathpulse.download_vectorstore")

REMOTE_PREFIX = "vectorstore/"
_FIREBASE_INITIALIZED = False


def _init_firebase() -> any | None:
    global _FIREBASE_INITIALIZED

    if _FIREBASE_INITIALIZED:
        try:
            from firebase_admin import storage as fb_storage
            return fb_storage.bucket()
        except Exception as e:
            logger.warning("Firebase storage unavailable: %s", e)
            _FIREBASE_INITIALIZED = False
            return None

    try:
        import firebase_admin
        from firebase_admin import credentials, storage
    except ImportError:
        logger.warning("firebase_admin not installed")
        return None

    if firebase_admin._apps:
        _FIREBASE_INITIALIZED = True
        try:
            return storage.bucket()
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
        _FIREBASE_INITIALIZED = True
        return storage.bucket()
    except Exception as e:
        logger.error("Firebase init failed: %s", e)
        return None


def _resolve_dest_dir() -> Path:
    raw = os.getenv("CURRICULUM_VECTORSTORE_DIR") or os.getenv("VECTORSTORE_DIR")
    if raw:
        return Path(raw)
    return Path("/app/datasets/vectorstore")


def download_via_gcloud(dest_dir: Path, bucket_name: str, prefix: str = REMOTE_PREFIX) -> bool:
    import shutil
    import subprocess
    gcloud_bin = shutil.which("gcloud") or "gcloud"
    src_uri = f"gs://{bucket_name}/{prefix}"
    logger.info("Executing gcloud storage rsync from %s to %s", src_uri, dest_dir)
    cmd = f'"{gcloud_bin}" storage rsync -r "{src_uri}" "{dest_dir}"'
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if res.returncode == 0:
        logger.info("gcloud storage download succeeded:\n%s", res.stdout)
        return True
    logger.error("gcloud storage download failed:\n%s\n%s", res.stdout, res.stderr)
    return False


def download_vectorstore(dest_dir: Path, prefix: str = REMOTE_PREFIX):
    bucket = _init_firebase()
    if bucket is None:
        bucket_name = os.getenv("FIREBASE_STORAGE_BUCKET", "mathpulse-ai-2026.firebasestorage.app")
        logger.info("Firebase admin unavailable; attempting gcloud storage fallback...")
        return download_via_gcloud(dest_dir, bucket_name, prefix)

    dest_dir.mkdir(parents=True, exist_ok=True)

    blobs = list(bucket.list_blobs(prefix=prefix))
    if not blobs:
        logger.warning("No blobs found under prefix: %s", prefix)
        return False

    downloaded = 0
    skipped = 0
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
                skipped += 1
                continue
            blob.download_to_filename(str(local_path))
            logger.info("Downloaded: %s (%d bytes)", blob.name, blob.size or 0)
            downloaded += 1
        except Exception as e:
            logger.error("Failed to download %s: %s", blob.name, e)
            errors += 1

    logger.info("Download complete: %d downloaded, %d skipped, %d errors", downloaded, skipped, errors)
    return errors == 0


if __name__ == "__main__":
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
