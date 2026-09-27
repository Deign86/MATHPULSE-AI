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

VECTORSTORE_SOURCE_DIR = Path(__file__).resolve().parents[2] / "datasets" / "vectorstore"
REMOTE_PREFIX = "vectorstore/"


def upload_directory(local_dir: Path, bucket, prefix: str):
    """Recursively upload a local directory to Firebase Storage prefix."""
    uploaded = 0
    skipped = 0

    for root, dirs, files in os.walk(local_dir):
        for filename in files:
            if filename.endswith(".npy"):
                continue
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


def upload_via_gcloud(source_dir: Path, bucket_name: str, prefix: str):
    """Fallback upload using gcloud storage CLI."""
    import subprocess
    import shutil

    gcloud_bin = shutil.which("gcloud") or "gcloud"
    dest_uri = f"gs://{bucket_name}/{prefix}"
    logger.info("Executing gcloud storage rsync from %s to %s", source_dir, dest_uri)
    cmd = f'"{gcloud_bin}" storage rsync -r "{source_dir}" "{dest_uri}"'
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if res.returncode == 0:
        logger.info("gcloud storage upload succeeded:\n%s", res.stdout)
        return True
    logger.error("gcloud storage upload failed:\n%s\n%s", res.stdout, res.stderr)
    return False


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

    bucket_name = os.getenv("FIREBASE_STORAGE_BUCKET", "mathpulse-ai-2026.firebasestorage.app")
    _, bucket = _init_firebase_storage()
    if bucket is not None:
        logger.info("Uploading vectorstore from %s to gs://%s/%s via firebase-admin",
                    source_dir, bucket.name, args.prefix)
        uploaded, skipped = upload_directory(source_dir, bucket, args.prefix)
        logger.info("Upload complete: %d uploaded, %d skipped", uploaded, skipped)
    else:
        logger.info("firebase_admin bucket not available; attempting gcloud storage fallback...")
        success = upload_via_gcloud(source_dir, bucket_name, args.prefix)
        if not success:
            sys.exit(1)