#!/usr/bin/env python3
"""Test chat API to see if it fails"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load env
load_dotenv('.env.local')

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / 'backend'))

from services.inference_client import InferenceClient, InferenceRequest

def test_chat():
    """Test chat request"""
    client = InferenceClient()
    
    # Simple math question
    test_message = "What is 2+2?"
    print(f"🧪 Testing chat: '{test_message}'")
    print()
    
    try:
        req = InferenceRequest(
            messages=[{"role": "user", "content": test_message}],
            task_type="chat"
        )
        response = client.generate_from_messages(req)
        print(f"✅ Chat succeeded!")
        print(f"Response: {response}")
        return True
    except Exception as e:
        print(f"❌ Chat failed!")
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_chat()
    sys.exit(0 if success else 1)
