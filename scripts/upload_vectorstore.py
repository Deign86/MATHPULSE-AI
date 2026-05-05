"""
Upload the vectorstore to Firebase Storage for HF Space download.
Run: python scripts/upload_vectorstore.py
"""
import os
import sys
import zipfile
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

def upload_vectorstore():
    try:
        import firebase_admin
        from firebase_admin import credentials, storage
    except ImportError:
        print("ERROR: firebase_admin not installed")
        return False
    
    sa_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    sa_file = os.getenv("FIREBASE_SERVICE_ACCOUNT_FILE", ".secrets/firebase-service-account.json")
    bucket_name = os.getenv("FIREBASE_STORAGE_BUCKET", "mathpulse-ai-2026.firebasestorage.app")
    
    try:
        if not firebase_admin._apps:
            if sa_json:
                import json
                creds = credentials.Certificate(json.loads(sa_json))
            elif Path(sa_file).exists():
                creds = credentials.Certificate(sa_file)
            else:
                print(f"ERROR: No service account found")
                return False
            
            firebase_admin.initialize_app(creds, {"storageBucket": bucket_name})
        
        bucket = storage.bucket()
        
        # Create zip of vectorstore
        vectorstore_dir = Path("datasets/vectorstore")
        zip_path = Path("datasets/vectorstore.zip")
        
        print(f"Creating zip of {vectorstore_dir}...")
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            for file_path in vectorstore_dir.rglob('*'):
                if file_path.is_file():
                    arcname = file_path.relative_to(vectorstore_dir)
                    zf.write(file_path, arcname)
        
        print(f"Zip created: {zip_path} ({zip_path.stat().st_size} bytes)")
        
        # Upload to Firebase Storage
        storage_path = "vectorstore/curriculum_vectorstore.zip"
        blob = bucket.blob(storage_path)
        
        print(f"Uploading to {storage_path}...")
        blob.upload_from_filename(str(zip_path))
        
        # Make it publicly readable
        blob.make_public()
        
        print(f"[UPLOADED] {zip_path} -> {storage_path}")
        print(f"Public URL: {blob.public_url}")
        
        # Clean up local zip
        zip_path.unlink()
        print("Cleaned up local zip file")
        
        return True
    except Exception as e:
        print(f"[ERROR] {e}")
        return False


if __name__ == "__main__":
    upload_vectorstore()
