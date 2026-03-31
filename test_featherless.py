#!/usr/bin/env python3
"""Test if Featherless AI provider routing works via HF Inference API"""
import os
import requests
import json

hf_token = os.getenv('HF_TOKEN', '')
if not hf_token:
    print('❌ HF_TOKEN not set')
    exit(1)

print(f'✅ HF_TOKEN found ({len(hf_token)} chars)')
print()

# Test the exact model:featherless-ai syntax
model = 'Qwen/Qwen2.5-Math-7B-Instruct:featherless-ai'
print(f'Testing model: {model}')
print(f'Endpoint: https://router.huggingface.co/v1/chat/completions')
print()

try:
    resp = requests.post(
        'https://router.huggingface.co/v1/chat/completions',
        json={
            'model': model,
            'messages': [{'role': 'user', 'content': 'What is 2+2?'}],
            'max_tokens': 50,
            'temperature': 0.2,
        },
        headers={'Authorization': f'Bearer {hf_token}'},
        timeout=15
    )
    
    print(f'Status Code: {resp.status_code}')
    print()
    
    if resp.status_code == 200:
        print('✅ SUCCESS! Featherless AI routing works!')
        data = resp.json()
        msg = data['choices'][0]['message']['content']
        print(f'Response: {msg}')
    else:
        print('❌ ERROR')
        try:
            error = resp.json()
            print(f'Error: {json.dumps(error, indent=2)}')
        except:
            print(f'Response: {resp.text[:800]}')
            
except Exception as e:
    print(f'❌ Exception: {str(e)[:200]}')
