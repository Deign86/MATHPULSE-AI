"""
Merge DepEd lesson module PDFs and upload to Firebase Storage.
Run: python backend/scripts/upload_lesson_modules.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pypdf import PdfWriter, PdfReader

LOCAL_MODULES_DIR = Path(__file__).resolve().parents[1].parent / "datasets" / "lesson_modules"
FIREBASE_STORAGE_BUCKET = "mathpulse-ai-2026.firebasestorage.app"

# Upload plan
UPLOAD_JOBS = [
    {
        "id": "basic-calc-q3",
        "display_name": "Basic Calculus Q3",
        "subject": "Basic Calculus",
        "subjectId": "basic-calc",
        "quarter": 3,
        "storage_path": "curriculum/basic_calc/SDO_Navotas_BasicCalc_SHS_Q3.FV.pdf",
        "local_dir": LOCAL_MODULES_DIR / "basic_calculus_q3",
        "filename": "Basic Calculus-Q3-Module-{n}.pdf",
        "modules": list(range(1, 9)),  # Modules 1-8
    },
    {
        "id": "gen-math-q2",
        "display_name": "General Mathematics Q2",
        "subject": "General Mathematics",
        "subjectId": "gen-math",
        "quarter": 2,
        "storage_path": "curriculum/gen_math_q2/SDO_Navotas_GenMath_SHS_Q2.FV.pdf",
        "local_dir": LOCAL_MODULES_DIR / "genmath_q2",
        "filename": "genmath_q2_mod{n}_*.pdf",
        "modules": [2, 3],  # Modules 2 and 3 only
    },
]


def merge_pdfs(job: dict) -> Path | None:
    """Merge multiple PDFs into a single output file. Returns output path."""
    output_dir = LOCAL_MODULES_DIR / "merged"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"{job['id']}_merged.pdf"

    writer = PdfWriter()

    for mod_num in job["modules"]:
        if job["id"] == "basic-calc-q3":
            fname = job["filename"].format(n=mod_num)
        else:
            # GenMath modules have specific naming
            fname = None
            pattern = job["filename"].format(n=mod_num)
            for f in job["local_dir"].glob(pattern):
                fname = f.name
                break
            if fname is None:
                print(f"  [WARN] Could not find file for module {mod_num}")
                continue

        src_path = job["local_dir"] / fname
        if not src_path.exists():
            print(f"  [WARN] File not found: {src_path}")
            continue

        reader = PdfReader(str(src_path))
        print(f"  + {src_path.name} ({len(reader.pages)} pages)")
        for page in reader.pages:
            writer.add_page(page)

    print(f"  Writing {output_path.name} ({len(writer.pages)} total pages)")
    with open(output_path, "wb") as f:
        writer.write(f)

    return output_path


def upload_to_firebase(local_path: Path, storage_path: str) -> bool:
    """Upload a PDF file to Firebase Storage."""
    try:
        import firebase_admin
        from firebase_admin import credentials, storage
    except ImportError:
        print("  ERROR: firebase-admin not installed")
        return False

    sa_file = Path(__file__).resolve().parents[1].parent / ".secrets" / "firebase-service-account.json"
    if not sa_file.exists():
        print(f"  ERROR: Service account not found at {sa_file}")
        return False

    if not firebase_admin._apps:
        cred = credentials.Certificate(str(sa_file))
        firebase_admin.initialize_app(cred, {"storageBucket": FIREBASE_STORAGE_BUCKET})

    bucket = storage.bucket()
    blob = bucket.blob(storage_path)

    print(f"  Uploading to gs://{bucket.name}/{storage_path}")
    blob.upload_from_filename(str(local_path), content_type="application/pdf")
    print(f"  Upload complete!")
    return True


def main():
    print("=" * 60)
    print("MathPulse AI — Lesson Module PDF Uploader")
    print("=" * 60)

    for job in UPLOAD_JOBS:
        print(f"\n[{job['display_name']}]")
        print("-" * 40)

        # Step 1: Merge PDFs
        output_path = merge_pdfs(job)
        if not output_path or not output_path.exists():
            print(f"  [FAIL] Merge failed for {job['id']}")
            continue

        # Step 2: Upload to Firebase
        success = upload_to_firebase(output_path, job["storage_path"])
        if not success:
            print(f"  [FAIL] Upload failed for {job['id']}")
            continue

        print(f"\n  SUCCESS: {job['display_name']}")
        print(f"  Storage path: gs://{FIREBASE_STORAGE_BUCKET}/{job['storage_path']}")
        print(f"  Pages: {len(PdfReader(str(output_path)).pages)}")

    print("\n" + "=" * 60)
    print("Done!")


if __name__ == "__main__":
    main()