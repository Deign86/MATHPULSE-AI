import sys
sys.path.insert(0, '.')

from rag.curriculum_rag import retrieve_lesson_pdf_context, retrieve_curriculum_context

# Test retrieval with the same params as the frontend
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
    for i, chunk in enumerate(chunks[:3]):
        print(f"  Chunk {i}: score={chunk.get('score')}, domain={chunk.get('content_domain')}, source={chunk.get('source_file')}")
        print(f"    Content: {chunk.get('content', '')[:100]}...")
except Exception as e:
    print(f"ERROR: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()

# Also test without module/lesson filters
try:
    chunks2 = retrieve_curriculum_context(
        query="Represent real-life relationships as functions and interpret domain/range.",
        subject="General Mathematics",
        quarter=2,
        top_k=8,
    )
    print(f"\nGeneral retrieval: {len(chunks2)} chunks")
except Exception as e:
    print(f"\nGeneral ERROR: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()