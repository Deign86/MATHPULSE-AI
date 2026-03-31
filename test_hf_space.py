#!/usr/bin/env python3
"""Test HF Space to verify config loads correctly"""

import os
import requests
import sys
from dotenv import load_dotenv

load_dotenv('.env.local')

HF_TOKEN = os.getenv('HF_TOKEN')
API_URL = 'https://deign86-mathpulse-api-v3test.hf.space'

if not HF_TOKEN:
    print("❌ HF_TOKEN not set in .env.local")
    sys.exit(1)

print(f"🧪 Testing HF Space API at {API_URL}")
print()

# Test chat endpoint
test_message = "What is 2+2?"
payload = {
    "message": test_message,
    "history": []
}

headers = {
    "Content-Type": "application/json"
}

try:
    print(f"📤 Sending chat request: '{test_message}'")
    response = requests.post(
        f"{API_URL}/api/chat",
        json=payload,
        headers=headers,
        timeout=60
    )
    
    print(f"📥 Response status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Chat successful!")
        print(f"   Response: {data.get('response', 'N/A')[:200]}...")
    else:
        print(f"❌ Error response:")
        print(f"   Status: {response.status_code}")
        print(f"   Body: {response.text}")
        
except Exception as e:
    print(f"❌ Request failed: {e}")
    sys.exit(1)
