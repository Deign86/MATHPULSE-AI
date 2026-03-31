#!/usr/bin/env python3
"""Test HF Inference API with actual token"""

import os
import sys
from pathlib import Path

# Load environment variables
from dotenv import load_dotenv
load_dotenv('.env.local')

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / 'backend'))

from services.inference_client import InferenceClient, InferenceRequest

def test_inference_api():
    """Test inference with HF token"""
    
    hf_token = os.getenv('HF_TOKEN')
    print(f"✅ HF_TOKEN loaded: {hf_token[:20]}..." if hf_token else "❌ HF_TOKEN not found")
    print()
    
    # Initialize client
    client = InferenceClient()
    print(f"✅ InferenceClient initialized")
    print()
    
    # Test message
    test_message = "Hello, what is 2+2?"
    print(f"🧪 Testing inference with message: '{test_message}'")
    print()
    
    try:
        req = InferenceRequest(
            messages=[{"role": "user", "content": test_message}],
            task_type="chat"
        )
        response = client.generate_from_messages(req)
        print(f"✅ Inference successful!")
        print(f"   Response: {response[:200]}...")
        return True
    except Exception as e:
        print(f"❌ Inference failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_inference_api()
    sys.exit(0 if success else 1)
