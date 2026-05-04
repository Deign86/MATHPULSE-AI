import firebase_admin
from firebase_admin import credentials, storage
import os
import sys

# Initialize Firebase with service account
sa_path = ".secrets/firebase-service-account.json"
if not os.path.exists(sa_path):
    print(f"ERROR: Service account not found at {sa_path}")
    sys.exit(1)

cred = credentials.Certificate(sa_path)
firebase_admin.initialize_app(cred, {
    "storageBucket": "mathpulse-ai-2026.firebasestorage.app"
})

bucket = storage.bucket()

# Upload SSHS PDFs
pdfs_to_upload = [
    ("documents/SSHS-SHAPING-PAPER-BCD-a_o-May-22.pdf", "rag-documents/sshs/SSHS-SHAPING-PAPER-BCD-a_o-May-22.pdf"),
    ("documents/SSHS-Key-Features.pdf", "rag-documents/sshs/SSHS-Key-Features.pdf"),
]

for local_path, storage_path in pdfs_to_upload:
    if not os.path.exists(local_path):
        print(f"ERROR: Local file not found: {local_path}")
        continue
    
    print(f"Uploading {local_path} -> gs://mathpulse-ai-2026.firebasestorage.app/{storage_path}")
    blob = bucket.blob(storage_path)
    blob.upload_from_filename(local_path)
    blob.make_public()
    print(f"  OK Uploaded: {blob.public_url}")

print("\nUpload complete!")
