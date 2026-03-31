#!/usr/bin/env python
import sys
sys.path.insert(0, '.')

print("Testing InferenceClient startup...")
try:
    from backend.services.inference_client import InferenceClient
    print("✅ Import successful")
    
    ic = InferenceClient()
    print("✅ InferenceClient initialized")
    print(f"   Default model: {ic.default_model}")
    print(f"   Chat model: {ic.task_model_map.get('chat', 'NOT SET')}")
    print(f"   Verify solution model: {ic.task_model_map.get('verify_solution', 'NOT SET')}")
    print(f"   Chat provider: {ic.task_provider_map.get('chat', 'NOT SET (will use default chain)')}")
    
except Exception as e:
    print(f"❌ Error: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
