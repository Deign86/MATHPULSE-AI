import shutil, sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
SRC  = ROOT / "config" / "models.yaml"
DST  = ROOT / "backend" / "config" / "models.yaml"

if not SRC.exists():
    print(f"ERROR: Source not found: {SRC}")
    sys.exit(1)

DST.parent.mkdir(parents=True, exist_ok=True)
shutil.copy2(SRC, DST)
print(f"Synced: {SRC} → {DST}")