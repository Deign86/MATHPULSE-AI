#!/usr/bin/env python
"""Test if backend/main.py can start without errors."""
import sys
import os

# Make sure we're in the right directory and can import backend modules
sys.path.insert(0, '.')

print("=" * 60)
print("Testing backend startup...")
print("=" * 60)

try:
    print("\n[1/3] Importing FastAPI app...")
    from backend.main import app
    print("✅ FastAPI app imported")
    
    print("\n[2/3] Checking InferenceClient initialization...")
    from backend.services.inference_client import InferenceClient
    ic = InferenceClient()
    print(f"✅ InferenceClient ready")
    print(f"    Chat task model: {ic.task_model_map.get('chat')}")
    print(f"    Chat task provider: {ic.task_provider_map.get('chat', 'not set (uses defaults)')}")
    
    print("\n[3/3] Checking FastAPI routes...")
    routes = [route.path for route in app.routes]
    print(f"✅ App has {len(routes)} routes registered")
    for i, route in enumerate(routes[:5], 1):
        print(f"    {i}. {route}")
    
    print("\n" + "=" * 60)
    print("✅ All startup checks passed!")
    print("=" * 60)
    
except Exception as e:
    print(f"\n❌ ERROR: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
