import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))

import pytest
from rag.curriculum_rag import retrieve_lesson_pdf_context, retrieve_curriculum_context
from rag.firebase_storage_loader import infer_storage_metadata, PDF_METADATA


def test_infer_storage_metadata_sshs_curriculum():
    """Verify metadata inference parses subject, quarter (1-4), and resource types."""
    # LAS
    las_meta = infer_storage_metadata("curriculum/sshs_learning_resources/General Mathematics/Quarter 1/Learning Activity Sheets/PDF/SHS_GM_Q1_LAS1.pdf")
    assert las_meta["subject"] == "General Mathematics"
    assert las_meta["quarter"] == 1
    assert las_meta["type"] == "learning_activity_sheet"

    # LE
    le_meta = infer_storage_metadata("curriculum/sshs_learning_resources/General Mathematics/Quarter 2/Lesson Exemplars/PDF/SHS_GM_Q2_LE4.pdf")
    assert le_meta["subject"] == "General Mathematics"
    assert le_meta["quarter"] == 2
    assert le_meta["type"] == "lesson_exemplar"

    # Curriculum Guide
    guide_meta = infer_storage_metadata("curriculum/sshs_learning_resources/General Mathematics/Curriculum & Budget of Work/PDF/GENERAL-MATHEMATICS-1.pdf")
    assert guide_meta["subject"] == "General Mathematics"
    assert guide_meta["type"] == "curriculum_guide"

    # SDO Module
    sdo_meta = infer_storage_metadata("curriculum/general_math/genmath_q2_mod1_simpleandcompoundinterests_v2.pdf")
    assert sdo_meta["subject"] == "General Mathematics"
    assert sdo_meta["quarter"] == 2
    assert sdo_meta["type"] == "sdo_module"

    # Stat Prob
    stat_meta = infer_storage_metadata("curriculum/stat_prob/Full.pdf")
    assert stat_meta["subject"] == "Statistics and Probability"
    assert stat_meta["type"] == "sdo_module"

    # Finite Math 1 & 2
    fm1_meta = infer_storage_metadata("curriculum/sshs_learning_resources/Finite Mathematics/Finite Math 1/PDF/Finite Math 1_LAS.pdf")
    assert "Finite Mathematics" in fm1_meta["subject"]
    assert fm1_meta["quarter"] == 1
    assert fm1_meta["type"] == "learning_activity_sheet"

    fm2_meta = infer_storage_metadata("curriculum/sshs_learning_resources/Finite Mathematics/Finite Math 2/PDF/Finite Math 2_LE.pdf")
    assert "Finite Mathematics" in fm2_meta["subject"]
    assert fm2_meta["quarter"] == 2
    assert fm2_meta["type"] == "lesson_exemplar"


def test_exact_match_retrieval_full_path():
    """Exact match retrieval with full storage path."""
    full_path = "curriculum/sshs_learning_resources/General Mathematics/Quarter 1/Learning Activity Sheets/PDF/SHS_GM_Q1_LAS1.pdf"
    chunks, mode = retrieve_lesson_pdf_context(
        topic="functions and relations piecewise functions",
        subject="General Mathematics",
        quarter=1,
        storage_path=full_path,
        top_k=5,
    )
    assert len(chunks) > 0
    assert mode in ("exact", "hybrid")
    for chunk in chunks:
        assert chunk["storage_path"]
        assert chunk["source_file"]
        assert chunk["page"] >= 1
        assert chunk["score"] > 0.0
        assert chunk["content"]


def test_exact_match_retrieval_relative_path():
    """Exact match retrieval with relative storage path."""
    rel_path = "sshs_learning_resources/General Mathematics/Quarter 1/Learning Activity Sheets/PDF/SHS_GM_Q1_LAS1.pdf"
    chunks, mode = retrieve_lesson_pdf_context(
        topic="functions and relations piecewise functions",
        subject="General Mathematics",
        quarter=1,
        storage_path=rel_path,
        top_k=5,
    )
    assert len(chunks) > 0
    assert mode in ("exact", "hybrid")
    for chunk in chunks:
        assert chunk["storage_path"]
        assert chunk["source_file"]
        assert chunk["page"] >= 1
        assert chunk["score"] > 0.0
        assert chunk["content"]


def test_exact_match_retrieval_filename():
    """Exact match retrieval with filename only."""
    filename = "SHS_GM_Q1_LAS1.pdf"
    chunks, mode = retrieve_lesson_pdf_context(
        topic="functions and relations piecewise functions",
        subject="General Mathematics",
        quarter=1,
        storage_path=filename,
        top_k=5,
    )
    assert len(chunks) > 0
    assert mode in ("exact", "hybrid")
    for chunk in chunks:
        assert chunk["storage_path"]
        assert chunk["source_file"]
        assert chunk["page"] >= 1
        assert chunk["score"] > 0.0
        assert chunk["content"]


def test_exact_match_retrieval_with_quarter_fallback():
    """Exact match fallback when chunk in vectorstore has quarter 0 or 1."""
    chunks, mode = retrieve_lesson_pdf_context(
        topic="matrices system of linear equations",
        subject="Finite Mathematics",
        quarter=2,
        storage_path="Finite Math 2_LAS.pdf",
        top_k=5,
    )
    assert len(chunks) > 0
    assert mode in ("exact", "hybrid")
    for chunk in chunks:
        assert chunk["storage_path"]
        assert chunk["source_file"]
        assert chunk["page"] >= 1
        assert chunk["score"] > 0.0
        assert chunk["content"]


if __name__ == "__main__":
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