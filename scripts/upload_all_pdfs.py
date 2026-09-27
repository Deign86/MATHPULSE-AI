"""
Upload all curriculum PDFs from local documents/ folder to Firebase Storage.
Run: python scripts/upload_all_pdfs.py
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

def upload_pdf(local_path: str, storage_path: str):
    """Upload a PDF to Firebase Storage."""
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
                print(f"ERROR: No service account found. Checked: FIREBASE_SERVICE_ACCOUNT_JSON env var, {sa_file}")
                return False
            
            firebase_admin.initialize_app(creds, {"storageBucket": bucket_name})
        
        bucket = storage.bucket()
        blob = bucket.blob(storage_path)
        
        if blob.exists():
            print(f"[SKIP] {storage_path} already exists")
            return True
        
        blob.upload_from_filename(local_path)
        print(f"[UPLOADED] {local_path} -> {storage_path} ({os.path.getsize(local_path)} bytes)")
        return True
    except Exception as e:
        print(f"[ERROR] Failed to upload {local_path}: {e}")
        return False


def main():
    docs_dir = Path("documents")
    if not docs_dir.exists():
        print(f"ERROR: {docs_dir} not found")
        return
    
    # Map of local file -> Firebase Storage path
    uploads = {
        "GENERAL-MATHEMATICS-1.pdf": "curriculum/general_math/GENERAL-MATHEMATICS-1.pdf",
        "Finite-Mathematics-1-1.pdf": "curriculum/finite_math/Finite-Mathematics-1-1.pdf",
        "Finite-Mathematics-2-1.pdf": "curriculum/finite_math/Finite-Mathematics-2-1.pdf",
        "SDO_Navotas_Gen.Math_SHS_1stSem.FV.pdf": "curriculum/gen_math_sdo/SDO_Navotas_Gen.Math_SHS_1stSem.FV.pdf",
        "SDO_Navotas_Bus.Math_SHS_1stSem.FV.pdf": "curriculum/business_math/SDO_Navotas_Bus.Math_SHS_1stSem.FV.pdf",
        "SDO_Navotas_SHS_ABM_OrgAndMngt_FirstSem_FV.pdf": "curriculum/org_mgmt/SDO_Navotas_SHS_ABM_OrgAndMngt_FirstSem_FV.pdf",
        "SDO_Navotas_STAT_PROB_SHS_1stSem.FV.pdf": "curriculum/stat_prob/SDO_Navotas_STAT_PROB_SHS_1stSem.FV.pdf",
        "SSHS-SHAPING-PAPER-BCD-a_o-May-22.pdf": "rag-documents/sshs/SSHS-SHAPING-PAPER-BCD-a_o-May-22.pdf",
        "SSHS-Key-Features.pdf": "rag-documents/sshs/SSHS-Key-Features.pdf",
    }
    
    success = 0
    failed = 0
    skipped = 0
    
    for local_name, storage_path in uploads.items():
        local_path = docs_dir / local_name
        if not local_path.exists():
            print(f"[MISSING] {local_path}")
            failed += 1
            continue
        
        if upload_pdf(str(local_path), storage_path):
            success += 1
        else:
            failed += 1
    
    print(f"\n{'='*50}")
    print(f"Upload complete: {success} uploaded, {skipped} skipped, {failed} failed")


if __name__ == "__main__":
    main()
