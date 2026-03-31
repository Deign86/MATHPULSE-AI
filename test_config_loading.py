#!/usr/bin/env python3
"""Test that config loads and routing setup is correct"""
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from services.inference_client import InferenceClient

print("Testing InferenceClient initialization...")
print()

client = InferenceClient()

print(f"Default model: {client.default_model}")
print()

print("Task model map:")
for task, model in client.task_model_map.items():
    print(f"  {task}: {model}")
print()

print("Chat task routing:")
chat_model = client.task_model_map.get('chat')
print(f"  Selected: {chat_model}")
if chat_model and ':featherless-ai' in chat_model:
    print(f"  ✅ Has :featherless-ai suffix (will route to Featherless)")
else:
    print(f"  ❌ Missing :featherless-ai suffix")
print()

print("Verify solution task routing:")
verify_model = client.task_model_map.get('verify_solution')
print(f"  Selected: {verify_model}")
if verify_model and ':featherless-ai' in verify_model:
    print(f"  ✅ Has :featherless-ai suffix (will route to Featherless)")
else:
    print(f"  ❌ Missing :featherless-ai suffix")
