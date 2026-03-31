#!/usr/bin/env python3
"""Quick test to verify config loads with :featherless-ai suffix in HF Space"""

import sys
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv('.env.local')

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / 'backend'))

from services.inference_client import InferenceClient

print("🧪 Testing InferenceClient config loading...\n")

client = InferenceClient()

# Check what model is being used for chat
print("✅ InferenceClient initialized")
print()

# The key test: is the :featherless-ai suffix present?
chat_model = client.task_model_map.get('chat')
print(f"Chat model: {chat_model}")

if ':featherless-ai' in chat_model:
    print("✅ Provider suffix IS preserved!")
else:
    print("❌ Provider suffix MISSING!")

print()
print(f"Full task_model_map: {client.task_model_map}")
