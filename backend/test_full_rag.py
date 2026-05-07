import sys
import os
sys.path.insert(0, 'backend')

# Set required env vars
os.environ['DEEPSEEK_API_KEY'] = os.getenv('DEEPSEEK_API_KEY', '')
os.environ['DEEPSEEK_BASE_URL'] = os.getenv('DEEPSEEK_BASE_URL', 'https://api.deepseek.com')

from rag.curriculum_rag import retrieve_lesson_pdf_context, build_lesson_prompt
from services.inference_client import InferenceClient, InferenceRequest

# Test retrieval
print("Testing retrieval...")
try:
    chunks, mode = retrieve_lesson_pdf_context(
        topic="Represent real-life relationships as functions and interpret domain/range.",
        subject="General Mathematics",
        quarter=2,
        lesson_title="Represent real-life relationships as functions and interpret domain/range.",
        module_id="gen-math",
        lesson_id="gm-q2-functions-graphs-l1",
        competency_code="GM11-FG-1",
        top_k=8,
    )
    print(f"Retrieved {len(chunks)} chunks, mode={mode}")
except Exception as e:
    print(f"Retrieval ERROR: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test prompt building
print("\nTesting prompt building...")
try:
    prompt = build_lesson_prompt(
        lesson_title="Represent real-life relationships as functions and interpret domain/range.",
        competency="Represent real-life relationships as functions and interpret domain/range.",
        grade_level="Grade 11-12",
        subject="General Mathematics",
        quarter=2,
        learner_level="Grade 11-12",
        module_unit="n/a",
        curriculum_chunks=chunks,
        competency_code="GM11-FG-1",
    )
    print(f"Prompt length: {len(prompt)} chars")
    print(f"Prompt preview: {prompt[:200]}...")
except Exception as e:
    print(f"Prompt building ERROR: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test inference (optional - might cost money)
print("\nTesting inference...")
try:
    client = InferenceClient()
    req = InferenceRequest(
        messages=[
            {"role": "system", "content": "You are a precise DepEd-aligned curriculum assistant."},
            {"role": "user", "content": prompt},
        ],
        task_type="lesson_generation",
        max_new_tokens=100,  # Small for testing
        temperature=0.2,
        top_p=0.9,
        enable_thinking=True,
    )
    result = client.generate_from_messages(req)
    print(f"Inference result: {result[:200]}...")
    print("SUCCESS!")
except Exception as e:
    print(f"Inference ERROR: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()