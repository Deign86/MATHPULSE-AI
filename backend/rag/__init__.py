"""Curriculum RAG package for DepEd-grounded retrieval utilities."""

from .curriculum_rag import (
    retrieve_curriculum_context,
    build_lesson_prompt,
    build_problem_generation_prompt,
    build_analysis_curriculum_context,
    build_lesson_query,
    format_retrieved_chunks,
    summarize_retrieval_confidence,
)
from .vectorstore_loader import reset_vectorstore_singleton

__all__ = [
    "retrieve_curriculum_context",
    "build_lesson_prompt",
    "build_problem_generation_prompt",
    "build_analysis_curriculum_context",
    "build_lesson_query",
    "format_retrieved_chunks",
    "summarize_retrieval_confidence",
    "reset_vectorstore_singleton",
]